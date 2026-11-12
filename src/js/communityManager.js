/**
 * MetaFold Community Manager
 * Central service for Community Templates:
 * - Dynamic retrieval and caching of templates-index.json from GitHub
 * - 4 Fixed Categories (Systems, Protocols, Experiments, Workflows)
 * - Dynamic collection extraction and new collection proposals
 * - Tag extraction, deduplication, and case-insensitive normalization
 * - Automatic GitHub repository path calculation
 * - Reusable interactive Tag-Picker UI component (search, suggestions, chips)
 */

'use strict';

class CommunityManager {
    constructor() {
        this.CATEGORIES = [
            { id: 'Systems', label: 'Systems', description: 'Laboratory systems, equipment, microscopes, software and technical setups' },
            { id: 'Protocols', label: 'Protocols', description: 'Individual laboratory protocols and procedures' },
            { id: 'Experiments', label: 'Experiments', description: 'Complete experimental setups and experiment templates' },
            { id: 'Workflows', label: 'Workflows', description: 'Multi-step workflows combining different processes or operations' }
        ];

        this.DEFAULT_COLLECTIONS = [
            { id: 'General', name: 'General', description: 'Universal community templates collection' }
        ];

        this.cachedIndex = null;
        this.lastFetchTime = 0;
        this.cacheTTL = 10 * 60 * 1000; // 10 minutes cache
        this.cachedTags = [];
        this.cachedCollections = [];
        this.isFetching = false;
    }

    /**
     * Get the configured repository index URL.
     * @returns {string}
     */
    getIndexUrl() {
        if (typeof window !== 'undefined' && window.settingsManager && window.settingsManager.settings && window.settingsManager.settings['templates.repository_url']) {
            return window.settingsManager.settings['templates.repository_url'];
        }
        return 'https://raw.githubusercontent.com/ThZobel/MetaFold-Templates/main/templates-index.json';
    }

    /**
     * Fetch templates-index.json from GitHub with memory caching and offline fallback.
     * @param {boolean} forceRefresh
     * @returns {Promise<Array>} Array of index items
     */
    async fetchIndex(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && this.cachedIndex && (now - this.lastFetchTime < this.cacheTTL)) {
            return this.cachedIndex;
        }

        const url = this.getIndexUrl();
        try {
            this.isFetching = true;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} fetching templates index`);
            }
            const data = await response.json();
            if (Array.isArray(data)) {
                this.cachedIndex = data;
                this.lastFetchTime = now;
                this._extractMetadata(data);
                return this.cachedIndex;
            }
            throw new Error('Index response is not an array');
        } catch (error) {
            console.warn('⚠️ CommunityManager: Failed to fetch online index, using cached or fallback data:', error.message);
            if (!this.cachedIndex) {
                // Initialize fallbacks
                this._extractMetadata([]);
            }
            return this.cachedIndex || [];
        } finally {
            this.isFetching = false;
        }
    }

    /**
     * Extract collection name from repository file path.
     * Handles:
     * - Communities/<Collection>/template.json -> <Collection>
     * - templates/Communities/<Collection>/template.json -> <Collection>
     * - templates/General/template.json -> General
     * - General/template.json -> General
     * - <Collection>/template.json -> <Collection>
     * @param {string} filePath
     * @returns {string} Collection name
     */
    extractCollectionFromPath(filePath) {
        if (!filePath || typeof filePath !== 'string') return 'General';
        const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
        if (parts[0] && parts[0].toLowerCase() === 'templates') {
            parts.shift();
        }
        if (parts.length === 0) return 'General';
        if (parts.length === 1) return 'General';
        if (parts[0].toLowerCase() === 'communities' && parts.length > 1) {
            return parts[1];
        }
        return parts[0] || 'General';
    }

    /**
     * Extract unique collections and tags from loaded index items.
     * @private
     */
    _extractMetadata(items) {
        const collectionsMap = new Map();
        // Seed default collections
        this.DEFAULT_COLLECTIONS.forEach(col => {
            collectionsMap.set(col.id.toLowerCase(), { ...col });
        });

        const tagSet = new Map(); // lowercase -> original display string

        // Prepopulate standard base tags
        const baseTags = [
            'Microscopy', 'Confocal', 'Widefield', 'STED', 'FLIM', 'Super-Resolution',
            'Live-Cell', 'High-Content', 'RNA-Seq', 'Proteomics', 'Bioimage Analysis',
            'ImageJ / Fiji', 'OMERO', 'Cell Culture', 'Histology', 'FACS'
        ];
        baseTags.forEach(t => tagSet.set(t.toLowerCase(), t));

        if (Array.isArray(items)) {
            items.forEach(item => {
                // Extract collection
                let colName = null;
                if (item.collection) {
                    colName = String(item.collection).trim();
                } else if (item.collectionName) {
                    colName = String(item.collectionName).trim();
                } else if (item.path) {
                    colName = this.extractCollectionFromPath(item.path);
                }

                if (colName && colName.length > 0) {
                    const key = colName.toLowerCase();
                    if (!collectionsMap.has(key)) {
                        collectionsMap.set(key, {
                            id: colName,
                            name: colName,
                            description: `Community collection ${colName}`
                        });
                    }
                }

                // Extract tags
                const comm = item.community || {};
                const itemTags = item.tags || comm.tags || [];
                const rawList = Array.isArray(itemTags)
                    ? itemTags
                    : String(itemTags).split(',').map(s => s.trim());

                rawList.forEach(rawTag => {
                    if (rawTag && typeof rawTag === 'string') {
                        const trimmed = rawTag.trim();
                        if (trimmed.length > 0) {
                            const normalized = this.normalizeTag(trimmed);
                            tagSet.set(normalized.toLowerCase(), normalized);
                        }
                    }
                });
            });
        }

        this.cachedCollections = Array.from(collectionsMap.values());
        this.cachedTags = Array.from(tagSet.values()).sort((a, b) => a.localeCompare(b));
    }

    /**
     * Get list of all known collections.
     * @returns {Array<{id: string, name: string, description?: string}>}
     */
    getCollections() {
        if (!this.cachedCollections || this.cachedCollections.length === 0) {
            this._extractMetadata(this.cachedIndex || []);
        }
        return this.cachedCollections;
    }

    /**
     * Get list of all known tags from index and defaults.
     * @returns {string[]}
     */
    getTags() {
        if (!this.cachedTags || this.cachedTags.length === 0) {
            this._extractMetadata(this.cachedIndex || []);
        }
        return this.cachedTags;
    }

    /**
     * Normalize a tag:
     * - Trim whitespace
     * - Title-Case each word unless already containing purposeful uppercase (e.g. 'STED', 'FLIM', 'GFP', 'qPCR')
     * - Discard empty strings
     * @param {string} tag
     * @returns {string}
     */
    normalizeTag(tag) {
        if (!tag || typeof tag !== 'string') return '';
        const trimmed = tag.trim();
        if (trimmed.length === 0) return '';

        // If tag is already an acronym or has deliberate mixed casing (e.g. 'GFP', 'RNA-Seq', 'Live-cell')
        if (/[A-Z]{2,}/.test(trimmed) || /-[a-zA-Z]/.test(trimmed)) {
            return trimmed;
        }

        // Title Case first letter of words
        return trimmed.replace(/\b\w/g, char => char.toUpperCase());
    }

    /**
     * Compute the automatic GitHub repository path for a template.
     * - If collection is 'General' or a proposed new collection: General/<slug>.json
     * - If collection is an approved community: Communities/<Collection>/<slug>.json
     * @param {string} templateName
     * @param {string} collection
     * @param {boolean} isProposed
     * @returns {string}
     */
    computeRepositoryPath(templateName, collection = 'General', isProposed = false) {
        const safeName = (templateName || 'unnamed_template')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'unnamed_template';

        const filename = `${safeName}.json`;

        const col = (collection || 'General').trim();
        if (isProposed || !col || col.toLowerCase() === 'general') {
            return `General/${filename}`;
        }

        // Clean collection folder name
        const safeCol = col.replace(/[^a-zA-Z0-9_-]/g, '_');
        return `Communities/${safeCol}/${filename}`;
    }

    /**
     * Mounts an interactive searchable multi-select Tag Picker component into a DOM container.
     * @param {Object} options
     * @param {HTMLElement|string} options.container Container element or selector
     * @param {string[]} [options.initialTags=[]] Initial list of tags
     * @param {Function} [options.onChange] Callback fired with array of string tags when changed
     * @returns {Object} Controller object with getTags(), setTags(), and destroy()
     */
    createTagPicker(options) {
        const container = typeof options.container === 'string'
            ? document.querySelector(options.container)
            : options.container;

        if (!container) {
            console.error('CommunityManager: Tag picker container not found');
            return null;
        }

        const initialTags = Array.isArray(options.initialTags)
            ? options.initialTags.map(t => this.normalizeTag(t)).filter(Boolean)
            : [];

        let currentTags = [...new Set(initialTags)];
        const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};

        // Build DOM structure
        container.innerHTML = `
            <div class="mf-tag-picker-wrap" style="position: relative; width: 100%;">
                <div class="mf-tag-picker-box" style="
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 10px;
                    background: #202020;
                    border: 1px solid #404040;
                    border-radius: 6px;
                    min-height: 42px;
                    cursor: text;
                ">
                    <div class="mf-tag-chips" style="display: contents;"></div>
                    <input type="text" class="mf-tag-input" placeholder="Add or search tags (press Enter)..." style="
                        flex: 1;
                        min-width: 140px;
                        background: transparent;
                        border: none;
                        outline: none;
                        color: #ffffff;
                        font-size: 0.9em;
                        padding: 4px 0;
                    " autocomplete="off" />
                </div>
                <div class="mf-tag-suggestions" style="
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: #252528;
                    border: 1px solid #555;
                    border-radius: 6px;
                    margin-top: 4px;
                    max-height: 180px;
                    overflow-y: auto;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                "></div>
                <small style="display: block; margin-top: 4px; color: #888; font-size: 0.78em;">
                    💡 Select existing tags or type a new one and press <kbd>Enter</kbd> or <kbd>,</kbd>.
                </small>
            </div>
        `;

        const box = container.querySelector('.mf-tag-picker-box');
        const chipsContainer = container.querySelector('.mf-tag-chips');
        const input = container.querySelector('.mf-tag-input');
        const suggestionsBox = container.querySelector('.mf-tag-suggestions');

        const renderChips = () => {
            chipsContainer.innerHTML = '';
            currentTags.forEach((tag, idx) => {
                const chip = document.createElement('span');
                chip.className = 'mf-tag-chip';
                chip.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 3px 8px;
                    background: rgba(124, 58, 237, 0.25);
                    border: 1px solid rgba(168, 85, 247, 0.5);
                    color: #d8b4fe;
                    border-radius: 12px;
                    font-size: 0.82em;
                    font-weight: 500;
                `;
                chip.textContent = tag;

                const removeBtn = document.createElement('span');
                removeBtn.innerHTML = '&times;';
                removeBtn.title = 'Remove tag';
                removeBtn.style.cssText = `
                    cursor: pointer;
                    font-weight: bold;
                    margin-left: 2px;
                    color: #e9d5ff;
                    font-size: 1.1em;
                    line-height: 1;
                `;
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentTags.splice(idx, 1);
                    renderChips();
                    onChange(currentTags);
                });

                chip.appendChild(removeBtn);
                chipsContainer.appendChild(chip);
            });
        };

        const addTag = (raw) => {
            const normalized = this.normalizeTag(raw);
            if (!normalized) return;

            // Case-insensitive duplicate check
            const exists = currentTags.some(t => t.toLowerCase() === normalized.toLowerCase());
            if (!exists) {
                currentTags.push(normalized);
                renderChips();
                onChange(currentTags);
            }
            input.value = '';
            hideSuggestions();
        };

        const hideSuggestions = () => {
            if (suggestionsBox) {
                suggestionsBox.style.display = 'none';
                suggestionsBox.innerHTML = '';
            }
        };

        const showSuggestions = (filterText = '') => {
            const allAvailableTags = this.getTags();
            const query = (filterText || '').trim().toLowerCase();

            // Filter out already selected tags
            const unselected = allAvailableTags.filter(t =>
                !currentTags.some(ct => ct.toLowerCase() === t.toLowerCase())
            );

            const matches = query.length === 0
                ? unselected.slice(0, 10)
                : unselected.filter(t => t.toLowerCase().includes(query)).slice(0, 10);

            suggestionsBox.innerHTML = '';

            // If there's an active query and it doesn't match an exact tag, offer "Add new tag: ..."
            const exactMatch = allAvailableTags.some(t => t.toLowerCase() === query);
            if (query.length > 0 && !exactMatch) {
                const addNewItem = document.createElement('div');
                addNewItem.style.cssText = `
                    padding: 8px 12px;
                    cursor: pointer;
                    color: #a855f7;
                    font-weight: 600;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    background: rgba(124, 58, 237, 0.1);
                `;
                addNewItem.innerHTML = `➕ Create new tag: "<strong>${this.normalizeTag(query)}</strong>"`;
                addNewItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    addTag(query);
                    input.focus();
                });
                suggestionsBox.appendChild(addNewItem);
            }

            if (matches.length > 0) {
                matches.forEach(tag => {
                    const item = document.createElement('div');
                    item.style.cssText = `
                        padding: 7px 12px;
                        cursor: pointer;
                        color: #e0e0e0;
                        font-size: 0.88em;
                        transition: background 0.15s;
                    `;
                    item.textContent = tag;
                    item.addEventListener('mouseenter', () => {
                        item.style.background = 'rgba(124, 58, 237, 0.3)';
                    });
                    item.addEventListener('mouseleave', () => {
                        item.style.background = 'transparent';
                    });
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        addTag(tag);
                        input.focus();
                    });
                    suggestionsBox.appendChild(item);
                });
            }

            if (suggestionsBox.children.length > 0) {
                suggestionsBox.style.display = 'block';
            } else {
                hideSuggestions();
            }
        };

        // Event listeners
        box.addEventListener('click', () => {
            input.focus();
            showSuggestions(input.value);
        });

        input.addEventListener('focus', () => {
            showSuggestions(input.value);
        });

        input.addEventListener('input', () => {
            const val = input.value;
            if (val.includes(',')) {
                const parts = val.split(',');
                parts.forEach(p => addTag(p));
                input.value = '';
                showSuggestions('');
            } else {
                showSuggestions(val);
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (input.value.trim()) {
                    addTag(input.value);
                }
            } else if (e.key === 'Backspace' && input.value === '' && currentTags.length > 0) {
                currentTags.pop();
                renderChips();
                onChange(currentTags);
            } else if (e.key === 'Escape') {
                hideSuggestions();
            }
        });

        // Close dropdown on outside click
        const onDocClick = (e) => {
            if (!container.contains(e.target)) {
                hideSuggestions();
            }
        };
        document.addEventListener('click', onDocClick);

        // Initial render
        renderChips();

        return {
            getTags: () => [...currentTags],
            setTags: (tags) => {
                currentTags = Array.isArray(tags)
                    ? [...new Set(tags.map(t => this.normalizeTag(t)).filter(Boolean))]
                    : [];
                renderChips();
                onChange(currentTags);
            },
            clear: () => {
                currentTags = [];
                renderChips();
                if (input) input.value = '';
                hideSuggestions();
                onChange(currentTags);
            },
            destroy: () => {
                document.removeEventListener('click', onDocClick);
                container.innerHTML = '';
            }
        };
    }
}

// Global initialization
if (typeof window !== 'undefined') {
    window.CommunityManager = CommunityManager;
    window.communityManager = new CommunityManager();
    // Warm up index cache asynchronously
    setTimeout(() => {
        if (window.communityManager) {
            window.communityManager.fetchIndex().catch(() => {});
        }
    }, 1500);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CommunityManager,
        communityManager: (typeof window !== 'undefined' && window.communityManager)
            ? window.communityManager
            : new CommunityManager()
    };
}

