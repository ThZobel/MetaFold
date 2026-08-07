// MetaFold Faceted Search Logic

const facetSearch = {
    masterData: [],
    activeFilters: {},
    visibleColumns: [],
    allAvailableKeys: [],
    tabulatorInstance: null,   // Tabulator.js table instance
    _hasFileSidecars: false,   // true when any project has file sidecars
    hiddenKeys: [],            // Keys hidden by the user via context menu
    metadataTypes: {},         // Stores types of metadata fields (e.g. text, select)
    

    // Initialize the module
    init() {
        console.log('🏷️ Facet Search initialized');

        // Close modal with ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('facetSearchModal');
                if (modal && modal.style.display !== 'none') {
                    this.closeSearch();
                }
            }
        });

        // Close column-selector dropdown when clicking anywhere outside it
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('columnSelectorDropdown');
            const btn = document.getElementById('columnSelectorBtn');
            if (!dropdown || dropdown.style.display === 'none') return;
            // If the click was NOT inside the dropdown and NOT on the toggle button, close it
            if (!dropdown.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        }, true); // capture phase so it runs before stopPropagation in children
    },

    // Internal flatten function to be used by both loaders
    flattenObject(obj, prefix = '') {
        let flattened = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const newKey = prefix ? `${prefix}.${key}` : key;
                const value = obj[key];
                
                // Handle metadata field structure (value/type/description objects)
                if (value && typeof value === 'object' && value.hasOwnProperty('value')) {
                    flattened[key] = value.value;
                } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                    Object.assign(flattened, this.flattenObject(value, newKey));
                } else {
                    flattened[newKey] = value;
                }
            }
        }
        return flattened;
    },

    // Extract metadata types for the Manage Categories modal
    _extractTypes(obj) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                if (value && typeof value === 'object' && value.hasOwnProperty('value')) {
                    if (value.type) {
                        this.metadataTypes[key] = value.type;
                    }
                } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                    this._extractTypes(value);
                }
            }
        }
    },

    // 1. Load from scanned projects directly (RAM)
    async loadFromProjects(projects) {
        try {
            console.log('Loading projects from RAM into facet search...');
            if (!projects || projects.length === 0) {
                console.warn("No projects provided to loadFromProjects");
                return;
            }

            this._hasFileSidecars = false;
            this.metadataTypes = {};
            
            this.masterData = projects.map(p => {
                let flatMeta = p.flattenedMetadata || {};
                
                if (Object.keys(flatMeta).length === 0 && p.metadata) {
                    flatMeta = this.flattenObject(p.metadata);
                }
                
                flatMeta['System.hasReadme'] = p.hasReadme ? 'Yes' : 'No';
                
                const entry = {
                    ...p,
                    id: p.path,
                    _type: 'project',
                    flatMeta: flatMeta
                };
                
                if (p.fileSidecars && p.fileSidecars.length > 0) {
                    this._hasFileSidecars = true;
                    entry._sidecarChildren = p.fileSidecars.map(sc => {
                        const scFlatMeta = { ...(sc.flattenedOmeMetadata || {}) };
                        if (sc.file) {
                            if (sc.file.extension) scFlatMeta['File.Extension'] = sc.file.extension;
                            if (sc.file.size_bytes) scFlatMeta['File.Size'] = sc.file.size_bytes;
                            if (sc.file.modified) scFlatMeta['File.Modified'] = sc.file.modified;
                        }
                        return {
                            id: sc.sidecar_id || (sc.file && sc.file.path) || Math.random().toString(36),
                            name: sc.file ? sc.file.name : 'Unknown File',
                            path: sc.file ? sc.file.path : '',
                            _type: 'file_sidecar',
                            _parentProjectName: p.name,
                            _parentProjectPath: p.path,
                            flatMeta: scFlatMeta
                        };
                    });
                }
                if (entry._type === 'project' && entry.metadata) {
                    this._extractTypes(entry.metadata);
                }
                
                return entry;
            });

            console.log('✅ Facet Search initialized with', this.masterData.length, 'projects');

            this.activeFilters = {};
            
            // Determine all available keys from BOTH projects and sidecars
            let keyCounts = {};
            this.masterData.forEach(p => {
                for (let key in p.flatMeta) {
                    if (key.startsWith('System.')) continue;
                    keyCounts[key] = (keyCounts[key] || 0) + 1;
                }
                // Also count keys from sidecar children
                if (p._sidecarChildren) {
                    p._sidecarChildren.forEach(sc => {
                        for (let key in sc.flatMeta) {
                            keyCounts[key] = (keyCounts[key] || 0) + 1;
                        }
                    });
                }
            });
            this.allAvailableKeys = Object.keys(keyCounts).sort((a,b) => keyCounts[b] - keyCounts[a]);
            this.visibleColumns = this.allAvailableKeys.slice(0, 3);
            
            if (this._hasFileSidecars) {
                const totalSidecars = this.masterData.reduce((sum, p) => sum + (p._sidecarChildren ? p._sidecarChildren.length : 0), 0);
                console.log(`📄 Loaded ${totalSidecars} file sidecars across ${this.masterData.filter(p => p._sidecarChildren).length} projects (tree mode enabled)`);
            }

            this.renderColumnSelector();
            
            // Load hidden keys from settings
            const hiddenKeysStr = await window.settingsManager.get('facetSearch.hiddenKeys');
            if (hiddenKeysStr) {
                try {
                    this.hiddenKeys = JSON.parse(hiddenKeysStr);
                } catch(e) {
                    this.hiddenKeys = [];
                }
            } else {
                this.hiddenKeys = [];
            }
            
            // Open the dedicated modal window
            this.openModal();
            this.updateUI();
        } catch (error) {
            console.error('Error loading projects from RAM:', error);
        }
    },

    // 2. Visualize Selection
    visualizeSelection() {
        if (!window.visualizationManager) {
            console.error('visualizationManager is not available');
            return;
        }
        
        const filteredData = this.getFilteredData();
        if (filteredData.length === 0) {
            alert("No projects to visualize. Please adjust your filters.");
            return;
        }
        
        // Map filtered flat data back to the full project objects
        const fullProjects = filteredData.map(item => {
            return window.projectScanner.projects.find(p => p.path === item.path);
        }).filter(Boolean);
        
        // Pass to visualization manager
        window.visualizationManager.visualizeFilteredProjects(fullProjects, this.activeFilters);
        
        // Close modal and switch tab
        this.closeSearch();
        if (window.switchMainTab) {
            window.switchMainTab('visualize');
        }
    },

    // 3. Load the exported Summary JSON from file
    async loadSummaryFile() {
        try {
            console.log('Loading summary file...');
            
            const result = await window.electronAPI.loadJsonFile();

            if (!result || !result.success || !result.content) {
                console.log('No file selected or error loading file.');
                return;
            }

            const exportData = result.content;

            if (!exportData || !exportData.projects) {
                throw new Error("Invalid summary file format. Missing 'projects' array.");
            }

            this._hasFileSidecars = false;

            this.masterData = exportData.projects.map(p => {
                let flatMeta = p.flattenedMetadata || {};
                
                if (Object.keys(flatMeta).length === 0 && p.metadata) {
                    flatMeta = this.flattenObject(p.metadata);
                }

                flatMeta['System.hasReadme'] = p.hasReadme ? 'Yes' : 'No';

                const entry = {
                    ...p,
                    id: p.path, // Use path as unique ID
                    _type: 'project',
                    flatMeta: flatMeta
                };

                // Build child entries for file sidecars
                if (p.fileSidecars && p.fileSidecars.length > 0) {
                    this._hasFileSidecars = true;
                    entry._sidecarChildren = p.fileSidecars.map(sc => {
                        // The flat metadata for a sidecar is its OME data + file info
                        const scFlatMeta = { ...(sc.flattenedOmeMetadata || {}) };
                        // Add file-level metadata with File. prefix
                        if (sc.file) {
                            if (sc.file.extension) scFlatMeta['File.Extension'] = sc.file.extension;
                            if (sc.file.size_bytes) scFlatMeta['File.Size'] = sc.file.size_bytes;
                            if (sc.file.modified) scFlatMeta['File.Modified'] = sc.file.modified;
                        }
                        return {
                            id: sc.sidecar_id || (sc.file && sc.file.path) || Math.random().toString(36),
                            name: sc.file ? sc.file.name : 'Unknown File',
                            path: sc.file ? sc.file.path : '',
                            _type: 'file_sidecar',
                            _parentProjectName: p.name,
                            _parentProjectPath: p.path,
                            flatMeta: scFlatMeta
                        };
                    });
                }

                return entry;
            });

            this.activeFilters = {};
            
            // Determine all available keys from BOTH projects and sidecars
            let keyCounts = {};
            this.masterData.forEach(p => {
                for (let key in p.flatMeta) {
                    if (key.startsWith('System.')) continue;
                    keyCounts[key] = (keyCounts[key] || 0) + 1;
                }
                // Also count keys from sidecar children
                if (p._sidecarChildren) {
                    p._sidecarChildren.forEach(sc => {
                        for (let key in sc.flatMeta) {
                            keyCounts[key] = (keyCounts[key] || 0) + 1;
                        }
                    });
                }
            });
            this.allAvailableKeys = Object.keys(keyCounts).sort((a,b) => keyCounts[b] - keyCounts[a]);
            this.visibleColumns = this.allAvailableKeys.slice(0, 3);
            
            if (this._hasFileSidecars) {
                const totalSidecars = this.masterData.reduce((sum, p) => sum + (p._sidecarChildren ? p._sidecarChildren.length : 0), 0);
                console.log(`📄 Loaded ${totalSidecars} file sidecars across ${this.masterData.filter(p => p._sidecarChildren).length} projects (tree mode enabled)`);
            }

            this.renderColumnSelector();
            
            // Load hidden keys from settings
            const hiddenKeysStr = await window.settingsManager.get('facetSearch.hiddenKeys');
            if (hiddenKeysStr) {
                try {
                    this.hiddenKeys = JSON.parse(hiddenKeysStr);
                } catch(e) {
                    this.hiddenKeys = [];
                }
            } else {
                this.hiddenKeys = [];
            }
            
            // Open the dedicated modal window
            this.openModal();

            this.updateUI();

        } catch (error) {
            console.error('❌ Error loading summary file:', error);
            if (window.showError) {
                window.showError(`Error loading summary file: ${error.message}`);
            } else {
                alert(`Error loading summary file: ${error.message}`);
            }
        }
    },

    // 2. Filter the data based on active filters
    // When file sidecars exist, a project matches if either the project itself
    // OR any of its sidecar children match the filter. Matching sidecar children
    // are preserved in _sidecarChildren so only relevant files appear in the tree.
    getFilteredData() {
        const matchesFilters = (flatMeta) => {
            for (let key in this.activeFilters) {
                const itemValue = flatMeta[key];
                const selectedFilters = this.activeFilters[key];
                if (!selectedFilters || selectedFilters.length === 0) continue;

                let isMatch = false;
                if (Array.isArray(itemValue)) {
                    isMatch = selectedFilters.every(filterVal => itemValue.includes(filterVal));
                } else {
                    isMatch = selectedFilters.includes(itemValue);
                }
                if (!isMatch) return false;
            }
            return true;
        };

        return this.masterData.filter(item => {
            const projectMatches = matchesFilters(item.flatMeta);

            if (!item._sidecarChildren || item._sidecarChildren.length === 0) {
                return projectMatches;
            }

            // Filter sidecar children that match
            const matchingChildren = item._sidecarChildren.filter(sc => matchesFilters(sc.flatMeta));

            // Project is included if it matches OR any child matches
            if (projectMatches || matchingChildren.length > 0) {
                // Temporarily store filtered children for rendering
                item._filteredSidecarChildren = projectMatches
                    ? item._sidecarChildren   // project matches → show all children
                    : matchingChildren;        // only children match → show matching ones
                return true;
            }

            return false;
        });
    },

    // 3. Calculate remaining available facets (cascading)
    // Includes metadata from both project-level AND sidecar-level entries
    getAvailableFacets(filteredData) {
        let facets = {};

        // Helper: add all keys/values from a flatMeta object to facets
        const addToFacets = (flatMeta) => {
            for (let key in flatMeta) {
                if (!facets[key]) facets[key] = new Set();
                const itemValue = flatMeta[key];
                if (Array.isArray(itemValue)) {
                    itemValue.forEach(val => {
                        if (val !== undefined && val !== null && val.toString().trim() !== '') {
                            facets[key].add(val);
                        }
                    });
                } else if (['string', 'number', 'boolean'].includes(typeof itemValue)) {
                    if (itemValue.toString().trim() !== '') {
                        facets[key].add(itemValue);
                    }
                }
            }
        };
        
        // Collect facets from projects AND their sidecar children
        filteredData.forEach(item => {
            addToFacets(item.flatMeta);
            const children = item._filteredSidecarChildren || item._sidecarChildren || [];
            children.forEach(sc => addToFacets(sc.flatMeta));
        });

        // Count occurrences (across projects + sidecars)
        const allEntries = [];
        filteredData.forEach(item => {
            allEntries.push(item);
            const children = item._filteredSidecarChildren || item._sidecarChildren || [];
            children.forEach(sc => allEntries.push(sc));
        });

        let facetCounts = {};
        for (let key in facets) {
            let valuesArray = [];
            facets[key].forEach(val => {
                let count = allEntries.filter(entry => {
                    const iVal = entry.flatMeta[key];
                    if (Array.isArray(iVal)) return iVal.includes(val);
                    return iVal === val;
                }).length;
                valuesArray.push({ value: val, count: count });
            });
            valuesArray.sort((a, b) => b.count - a.count);
            facetCounts[key] = valuesArray;
        }

        let sortedKeys = Object.keys(facetCounts).sort((a, b) => {
            let totalA = facetCounts[a].reduce((sum, v) => sum + v.count, 0);
            let totalB = facetCounts[b].reduce((sum, v) => sum + v.count, 0);
            return totalB - totalA;
        });

        let sortedFacets = {};
        sortedKeys.forEach(key => {
            sortedFacets[key] = facetCounts[key];
        });

        return sortedFacets;
    },

    // Update the entire UI
    updateUI() {
        const currentResults = this.getFilteredData();
        const nextAvailableTags = this.getAvailableFacets(currentResults);

        this.renderSidebar(nextAvailableTags);
        this.renderResults(currentResults);
    },

    _collapsedCategories: {},   // tracks collapsed state per category header

    // Map a metadata key (e.g. OME.Pixels.SizeX, File.Extension, Project.Condition) to a category name
    _getCategoryForKey(key) {
        if (key.startsWith('OME.')) {
            const parts = key.split('.');
            if (parts.length >= 2) {
                const sub = parts[1].replace(/\[\d+\]/g, '');
                return `🔬 OME ${sub}`;
            }
            return '🔬 OME Metadata';
        }
        if (key.startsWith('File.')) {
            return '📄 File Properties';
        }
        if (key.startsWith('integrations.') || key.toLowerCase().includes('omero') || key.toLowerCase().includes('elabftw') || key.toLowerCase().includes('rspace')) {
            return '🔗 Integrations';
        }
        if (key.startsWith('System.')) {
            return '⚙️ System';
        }
        if (key.startsWith('Project.') || key.startsWith('Sample.') || key.startsWith('ISA.')) {
            return '📁 Project & ISA';
        }
        return '📋 Metadata Fields';
    },

    _isCategoryCollapsed(categoryName) {
        if (this._collapsedCategories[categoryName] !== undefined) {
            return this._collapsedCategories[categoryName];
        }
        return false;
    },

    _toggleCategoryCollapse(categoryName) {
        this._collapsedCategories[categoryName] = !this._isCategoryCollapsed(categoryName);
        this.updateUI();
    },

    // Render the sidebar with categorized, collapsible facet groups and chips
    renderSidebar(facets) {
        const container = document.getElementById('facetGroupsContainer');
        container.innerHTML = '';

        // Group active facet keys by category
        const categoryGroups = {};
        for (let key in facets) {
            if (facets[key].length === 0) continue;
            const cat = this._getCategoryForKey(key);
            if (!categoryGroups[cat]) categoryGroups[cat] = [];
            categoryGroups[cat].push(key);
        }

        // Preferred display order for categories
        const categoryOrder = [
            '📋 Metadata Fields',
            '📁 Project & ISA',
            '📄 File Properties',
            '🔬 OME Pixels',
            '🔬 OME Channel',
            '🔬 OME Instrument',
            '🔬 OME Image',
            '🔬 OME Metadata',
            '🔗 Integrations',
            '⚙️ System'
        ];

        const sortedCategories = Object.keys(categoryGroups).sort((a, b) => {
            let idxA = categoryOrder.indexOf(a);
            let idxB = categoryOrder.indexOf(b);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            if (idxA !== idxB) return idxA - idxB;
            return a.localeCompare(b);
        });

        sortedCategories.forEach(catName => {
            const keys = categoryGroups[catName];

            // Calculate active filters in this category
            let activeFilterCount = 0;
            keys.forEach(k => {
                if (this.activeFilters[k] && this.activeFilters[k].length > 0) {
                    activeFilterCount += this.activeFilters[k].length;
                }
            });

            // Collapse category if toggled off (force expand if it has active filters)
            const isCollapsed = activeFilterCount === 0 && this._isCategoryCollapsed(catName);

            const catSection = document.createElement('div');
            catSection.className = `facet-category-section ${isCollapsed ? 'collapsed' : 'expanded'}`;

            const catHeader = document.createElement('div');
            catHeader.className = 'facet-category-header';
            catHeader.onclick = () => this._toggleCategoryCollapse(catName);

            const toggleIcon = document.createElement('span');
            toggleIcon.className = 'facet-category-toggle-icon';
            toggleIcon.textContent = isCollapsed ? '▶' : '▼';

            const catTitle = document.createElement('span');
            catTitle.className = 'facet-category-title';
            catTitle.textContent = catName;

            catHeader.appendChild(toggleIcon);
            catHeader.appendChild(catTitle);

            if (activeFilterCount > 0) {
                const activeBadge = document.createElement('span');
                activeBadge.className = 'facet-category-active-badge';
                activeBadge.textContent = `${activeFilterCount} active`;
                catHeader.appendChild(activeBadge);
            }

            const clearCatBtn = document.createElement('span');
            clearCatBtn.innerHTML = '✖';
            clearCatBtn.className = 'facet-category-clear';
            clearCatBtn.title = 'Clear all active filters in this category';
            clearCatBtn.onclick = (e) => {
                e.stopPropagation();
                keys.forEach(k => {
                    if (this.activeFilters[k]) {
                        delete this.activeFilters[k];
                    }
                });
                this.updateUI();
            };
            catHeader.appendChild(clearCatBtn);

            const catBody = document.createElement('div');
            catBody.className = 'facet-category-body';
            if (isCollapsed) {
                catBody.style.display = 'none';
            }

            keys.forEach(key => {
                if (this.hiddenKeys.includes(key)) return;

                const groupDiv = document.createElement('div');
                groupDiv.className = 'facet-group';

                const titleDiv = document.createElement('div');
                titleDiv.className = 'facet-group-title';
                titleDiv.title = 'Right-click to hide this category';

                titleDiv.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.showContextMenu(e.pageX, e.pageY, key);
                });

                let displayTitle = key.split('.').pop().replace(/_/g, ' ');
                titleDiv.textContent = displayTitle;

                if (this.activeFilters[key]) {
                    const clearBtn = document.createElement('span');
                    clearBtn.innerHTML = ' ✖';
                    clearBtn.style.cursor = 'pointer';
                    clearBtn.title = 'Clear filter for ' + displayTitle;
                    clearBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.toggleFilter(key, null);
                    };
                    titleDiv.appendChild(clearBtn);
                }

                const chipsDiv = document.createElement('div');
                chipsDiv.className = 'facet-chips';

                facets[key].forEach(facetVal => {
                    const isActive = this.activeFilters[key] && this.activeFilters[key].includes(facetVal.value);

                    const chip = document.createElement('div');
                    chip.className = `facet-chip ${isActive ? 'active' : ''}`;
                    chip.onclick = () => this.toggleFilter(key, facetVal.value);

                    const valSpan = document.createElement('span');
                    let displayVal = facetVal.value.toString();
                    if (displayVal.length > 30) displayVal = displayVal.substring(0, 30) + '...';
                    valSpan.textContent = displayVal;

                    const countSpan = document.createElement('span');
                    countSpan.className = 'count';
                    countSpan.textContent = `(${facetVal.count})`;

                    chip.appendChild(valSpan);
                    if (!isActive) chip.appendChild(countSpan);

                    chipsDiv.appendChild(chip);
                });

                groupDiv.appendChild(titleDiv);
                groupDiv.appendChild(chipsDiv);
                catBody.appendChild(groupDiv);
            });

            catSection.appendChild(catHeader);
            catSection.appendChild(catBody);
            container.appendChild(catSection);
        });
    },

    // ─── Context Menu Helpers ─────────────────────────────────────────────

    showContextMenu(x, y, targetKey) {
        this.closeContextMenu();

        const menu = document.createElement('div');
        menu.className = 'facet-context-menu';
        menu.id = 'facetContextMenu';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        const hideBtn = document.createElement('div');
        hideBtn.className = 'facet-context-menu-item';
        hideBtn.textContent = 'Hide Category';
        hideBtn.onclick = async () => {
            if (!this.hiddenKeys.includes(targetKey)) {
                this.hiddenKeys.push(targetKey);
                await window.settingsManager.set('facetSearch.hiddenKeys', JSON.stringify(this.hiddenKeys));
            }
            this.closeContextMenu();
            this.updateUI();
        };

        const showAllBtn = document.createElement('div');
        showAllBtn.className = 'facet-context-menu-item';
        showAllBtn.textContent = 'Show all Categories';
        showAllBtn.onclick = async () => {
            this.hiddenKeys = [];
            await window.settingsManager.set('facetSearch.hiddenKeys', JSON.stringify(this.hiddenKeys));
            this.closeContextMenu();
            this.updateUI();
        };

        const manageBtn = document.createElement('div');
        manageBtn.className = 'facet-context-menu-item';
        manageBtn.textContent = 'Manage Categories...';
        manageBtn.onclick = () => {
            this.closeContextMenu();
            this.showManageCategoriesModal();
        };

        const cancelBtn = document.createElement('div');
        cancelBtn.className = 'facet-context-menu-item';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => {
            this.closeContextMenu();
        };

        menu.appendChild(hideBtn);
        menu.appendChild(showAllBtn);
        menu.appendChild(manageBtn);
        menu.appendChild(cancelBtn);

        document.body.appendChild(menu);

        setTimeout(() => {
            document.addEventListener('click', this._contextMenuListener);
        }, 10);
    },

    closeContextMenu() {
        const menu = document.getElementById('facetContextMenu');
        if (menu) {
            menu.remove();
        }
        document.removeEventListener('click', this._contextMenuListener);
    },

    // ─── Manage Categories Modal ──────────────────────────────────────────

    showManageCategoriesModal() {
        const modal = document.getElementById('facetManageCategoriesModal');
        const listContainer = document.getElementById('facetManageCategoriesList');
        if (!modal || !listContainer) return;

        listContainer.innerHTML = '';
        
        // Gather all unique keys from masterData
        const allFacets = this.getAvailableFacets(this.masterData);
        const allKeys = Object.keys(allFacets).sort((a, b) => {
            if (a === '📋 Metadata Fields') return -1;
            if (b === '📋 Metadata Fields') return 1;
            return a.localeCompare(b);
        });

        // Also add keys that are in hiddenKeys but might not be in current facetData
        this.hiddenKeys.forEach(key => {
            if (!allKeys.includes(key)) {
                allKeys.push(key);
            }
        });

        allKeys.forEach(key => {
            const isHidden = this.hiddenKeys.includes(key);
            const isMissing = !allFacets[key];
            let displayTitle = key.split('.').pop().replace(/_/g, ' ');

            const itemDiv = document.createElement('div');
            itemDiv.className = 'manage-categories-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = !isHidden;
            checkbox.dataset.key = key;

            const label = document.createElement('label');
            label.textContent = displayTitle;
            label.style.flex = '1';
            label.style.cursor = 'pointer';
            
            // Add type indicator if available
            const baseKey = key.split('.').pop();
            const type = this.metadataTypes[baseKey];
            if (type) {
                label.innerHTML += ` <span style="color:#9ca3af; font-size:0.85em; font-style:italic; margin-left:6px;">(${type})</span>`;
            }

            if (isMissing) {
                label.innerHTML += ' <span style="color:#ef4444; font-size:0.85em; font-style:italic; margin-left:6px;">(Not in current scan)</span>';
            }

            itemDiv.onclick = (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
            };

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            listContainer.appendChild(itemDiv);
        });

        modal.style.display = 'flex';
    },

    closeManageCategoriesModal() {
        const modal = document.getElementById('facetManageCategoriesModal');
        if (modal) modal.style.display = 'none';
    },

    handleManageCategoriesOverlayClick(e) {
        if (e.target.id === 'facetManageCategoriesModal') {
            this.closeManageCategoriesModal();
        }
    },

    async saveManageCategories() {
        const listContainer = document.getElementById('facetManageCategoriesList');
        if (!listContainer) return;

        const checkboxes = listContainer.querySelectorAll('input[type="checkbox"]');
        const newHiddenKeys = [];

        checkboxes.forEach(cb => {
            if (!cb.checked) {
                newHiddenKeys.push(cb.dataset.key);
            }
        });

        this.hiddenKeys = newHiddenKeys;
        await window.settingsManager.set('facetSearch.hiddenKeys', JSON.stringify(this.hiddenKeys));
        
        this.closeManageCategoriesModal();
        this.updateUI();
    },

    // ─── Data Flow ────────────────────────────────────────────────────────

    _contextMenuListener: function(e) {
        if (!e.target.closest('.facet-context-menu')) {
            if (window.facetSearch) window.facetSearch.closeContextMenu();
        }
    },

    // ─── Tabulator helpers ────────────────────────────────────────────────

    // Convert a metadata key like "Sample.Laser_Line" → safe Tabulator field name
    _keyToField(key) {
        return 'meta__' + key.replace(/[^a-zA-Z0-9]/g, '_');
    },

    // Extract integration URLs from a project object (searches multiple locations)
    _extractUrls(project) {
        let omeroUrl = '';
        let elabUrl  = '';

        // Primary source: integrations object
        if (project.integrations) {
            const o = project.integrations.omero || project.integrations.OMERO || {};
            omeroUrl = o.url || o.link || o.webUrl || '';

            const e = project.integrations.elabftw || project.integrations.elabFTW || {};
            elabUrl = e.url || e.link || '';
        }

        // Fallback: scan flatMeta for http links containing 'omero'
        if (!omeroUrl && project.flatMeta) {
            for (const k in project.flatMeta) {
                const v = project.flatMeta[k];
                if (typeof v === 'string' && v.startsWith('http') && k.toLowerCase().includes('omero')) {
                    omeroUrl = v;
                    break;
                }
            }
        }

        return { omeroUrl, elabUrl };
    },

    // Build row objects for Tabulator from a results array.
    // When file sidecars are present, project rows get a `_children` array
    // so Tabulator's dataTree can render them as expandable parent rows.
    _buildTableData(results) {
        const self = this;

        const buildRow = (item, type) => {
            const { omeroUrl, elabUrl } = type === 'project'
                ? self._extractUrls(item)
                : { omeroUrl: '', elabUrl: '' };

            const row = {
                _path:    item.path  || '',
                _type:    type,
                name:     item.name  || (type === 'project' ? 'Unknown Project' : 'Unknown File'),
                path:     item.path  || '',
                created:  item.created || null,
                omero_url: omeroUrl,
                elab_url:  elabUrl,
            };

            // All metadata keys → safe field names
            self.allAvailableKeys.forEach(key => {
                const val = item.flatMeta ? item.flatMeta[key] : undefined;
                if (val === undefined || val === null) {
                    row[self._keyToField(key)] = '';
                } else if (Array.isArray(val)) {
                    row[self._keyToField(key)] = val.join('; ');
                } else {
                    row[self._keyToField(key)] = String(val);
                }
            });

            return row;
        };

        return results.map(project => {
            const row = buildRow(project, 'project');

            // Build child rows from file sidecars
            const children = project._filteredSidecarChildren || project._sidecarChildren || [];
            if (children.length > 0) {
                row._children = children.map(sc => buildRow(sc, 'file_sidecar'));
            }

            return row;
        });
    },

    // Build Tabulator column definitions
    _buildColumns() {
        const self = this;

        const cols = [
            {
                title: 'Name',
                field: 'name',
                minWidth: 200,
                sorter: 'string',
                frozen: true,
                formatter: (cell) => {
                    const row = cell.getRow().getData();
                    const type = row._type || 'project';
                    const icon = type === 'file_sidecar' ? '📄' : '📁';
                    const label = cell.getValue() || '';
                    if (type === 'file_sidecar') {
                        return `<span style="color:#9ca3af;">${icon} ${label}</span>`;
                    }
                    return `<strong>${icon} ${label}</strong>`;
                },
            },
            {
                title: 'Path',
                field: 'path',
                minWidth: 220,
                sorter: 'string',
                formatter: (cell) => {
                    const v = cell.getValue() || '';
                    return `<span title="${v}" style="font-size:0.8rem;font-family:monospace;color:#9ca3af;">${v}</span>`;
                },
            },
            {
                title: 'Created',
                field: 'created',
                width: 105,
                sorter: 'alphanum',
                formatter: (cell) => {
                    const v = cell.getValue();
                    return v ? new Date(v).toLocaleDateString() : '—';
                },
                // For CSV: export the formatted date string
                accessorDownload: (val) => val ? new Date(val).toLocaleDateString() : '',
            },
        ];

        // Dynamic metadata columns
        this.allAvailableKeys.forEach(key => {
            let title = key.split('.').pop().replace(/_/g, ' ');
            title = title.charAt(0).toUpperCase() + title.slice(1);
            cols.push({
                title,
                field: this._keyToField(key),
                visible: this.visibleColumns.includes(key),
                minWidth: 120,
                sorter: 'string',
            });
        });

        // Hidden URL columns – visible: false but download: true → appear only in CSV
        cols.push({
            title: 'OMERO Link',
            field: 'omero_url',
            visible: false,
            download: true,
        });
        cols.push({
            title: 'elabFTW Link',
            field: 'elab_url',
            visible: false,
            download: true,
        });

        // Actions column – shown in table, excluded from CSV
        cols.push({
            title: 'Actions',
            field: '_actions',
            download: false,
            headerSort: false,
            width: 110,
            formatter: (cell) => {
                const row = cell.getRow().getData();
                const path = (row.path || '').replace(/"/g, '&quot;');
                let html = `<button class="btn btn-small facet-act-open" data-path="${path}" title="Open Folder">📂</button>`;
                if (row.omero_url) {
                    const u = row.omero_url.replace(/"/g, '&quot;');
                    html += ` <a class="integration-icon-link facet-act-link" href="#" data-url="${u}" title="Open in OMERO">🔵</a>`;
                }
                if (row.elab_url) {
                    const u = row.elab_url.replace(/"/g, '&quot;');
                    html += ` <a class="integration-icon-link facet-act-link" href="#" data-url="${u}" title="Open in eLabFTW">🟢</a>`;
                }
                return html;
            },
            cellClick: (e, cell) => {
                const target = e.target.closest('.facet-act-open, .facet-act-link');
                if (!target) return;
                e.preventDefault();
                e.stopPropagation();
                if (target.classList.contains('facet-act-open')) {
                    const p = target.dataset.path;
                    if (p && window.electronAPI?.openFolder) window.electronAPI.openFolder(p);
                } else {
                    const url = target.dataset.url;
                    if (url) {
                        if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
                        else window.open(url, '_blank');
                    }
                }
            },
        });

        return cols;
    },

    // ─── Render results via Tabulator ────────────────────────────────────

    renderResults(results) {
        // Count total items (projects + visible sidecar children)
        const sidecarCount = results.reduce((sum, p) => {
            const children = p._filteredSidecarChildren || p._sidecarChildren || [];
            return sum + children.length;
        }, 0);
        const countLabel = sidecarCount > 0
            ? `${results.length} Project${results.length !== 1 ? 's' : ''} · ${sidecarCount} File${sidecarCount !== 1 ? 's' : ''}`
            : `${results.length} Project${results.length !== 1 ? 's' : ''}`;
        document.getElementById('facetResultsCount').textContent = countLabel;

        const container = document.getElementById('facetResultsContainer');
        container.className = 'facet-results-table-container';

        const data = this._buildTableData(results);

        // Always destroy and recreate the Tabulator instance.
        if (this.tabulatorInstance) {
            this.tabulatorInstance.destroy();
            this.tabulatorInstance = null;
        }

        container.innerHTML = '';

        // Build Tabulator options — enable dataTree when sidecars are present
        const tabulatorOptions = {
            data,
            columns: this._buildColumns(),
            layout: 'fitColumns',
            rowHeight: 38,
            placeholder: '<div style="color:#9ca3af;padding:40px;text-align:center;">No projects match the selected filters.</div>',
            movableColumns: true,
            resizableColumns: 'header',
            columnHeaderSortMulti: true,
            downloadConfig: {
                columnHeaders: true,
            },
        };

        // Enable tree mode when file sidecars exist
        if (this._hasFileSidecars) {
            tabulatorOptions.dataTree = true;
            tabulatorOptions.dataTreeStartExpanded = false;
            tabulatorOptions.dataTreeChildField = '_children';
            tabulatorOptions.dataTreeElementColumn = 'name';
        }

        this.tabulatorInstance = new Tabulator(container, tabulatorOptions);
    },

    // Column Selector functions
    toggleColumnSelector() {
        const dropdown = document.getElementById('columnSelectorDropdown');
        if (!dropdown) return;
        const isOpen = dropdown.style.display !== 'none';
        dropdown.style.display = isOpen ? 'none' : 'block';
    },

    // Export current filtered view as CSV via Tabulator's built-in downloader
    exportCsv() {
        if (!this.tabulatorInstance) {
            alert('No data loaded. Please load a summary file first.');
            return;
        }
        const timestamp = new Date().toISOString().slice(0, 10);
        // bom: true → UTF-8 BOM so Excel opens umlauts correctly
        this.tabulatorInstance.download('csv', `metafold-export-${timestamp}.csv`, { bom: true });
    },

    // Toggle a metadata column visibility in the Tabulator instance
    toggleColumn(key) {
        const index = this.visibleColumns.indexOf(key);
        if (index > -1) {
            this.visibleColumns.splice(index, 1);
            if (this.tabulatorInstance) {
                this.tabulatorInstance.hideColumn(this._keyToField(key));
            }
        } else {
            this.visibleColumns.push(key);
            if (this.tabulatorInstance) {
                this.tabulatorInstance.showColumn(this._keyToField(key));
            }
        }
        // No renderResults call needed – Tabulator updates instantly
    },

    renderColumnSelector() {
        const container = document.getElementById('columnSelectorDropdown');
        if (!container) return;

        container.innerHTML = '<div style="margin-bottom: 8px; font-weight: bold; border-bottom: 1px solid rgba(139, 92, 246, 0.3); padding-bottom: 6px;">⚙️ Select Columns</div>';

        const categoryGroups = {};
        this.allAvailableKeys.forEach(key => {
            const cat = this._getCategoryForKey(key);
            if (!categoryGroups[cat]) categoryGroups[cat] = [];
            categoryGroups[cat].push(key);
        });

        for (const catName in categoryGroups) {
            const catHeader = document.createElement('div');
            catHeader.style.cssText = 'font-weight: 600; font-size: 0.75rem; text-transform: uppercase; color: #a78bfa; margin: 10px 0 4px 0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 2px; opacity: 0.9;';
            catHeader.textContent = catName;
            container.appendChild(catHeader);

            categoryGroups[catName].forEach(key => {
                const isChecked = this.visibleColumns.includes(key);
                let displayTitle = key.split('.').pop().replace(/_/g, ' ');
                displayTitle = displayTitle.charAt(0).toUpperCase() + displayTitle.slice(1);

                const label = document.createElement('label');
                label.style.cssText = 'display: flex; align-items: center; font-size: 0.85rem; margin-bottom: 4px; cursor: pointer; color: inherit;';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = isChecked;
                checkbox.style.marginRight = '8px';
                checkbox.style.accentColor = '#8b5cf6';
                checkbox.onchange = () => this.toggleColumn(key);

                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(displayTitle));
                container.appendChild(label);
            });
        }
    },

    // Toggle a filter on or off
    toggleFilter(key, value) {
        if (value === null) {
            // Remove filter completely
            delete this.activeFilters[key];
        } else {
            if (!this.activeFilters[key]) {
                this.activeFilters[key] = [];
            }
            
            const index = this.activeFilters[key].indexOf(value);
            if (index > -1) {
                // If already selected, toggle it off
                this.activeFilters[key].splice(index, 1);
                // If array is empty, remove the key entirely
                if (this.activeFilters[key].length === 0) {
                    delete this.activeFilters[key];
                }
            } else {
                // Set the new filter value
                this.activeFilters[key].push(value);
            }
        }
        
        this.updateUI();
    },

    // Reset all filters
    resetFilters() {
        this.activeFilters = {};
        this.updateUI();
    },

    // Open the facet search modal
    openModal() {
        const modal = document.getElementById('facetSearchModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    },

    // Close the facet search modal and clean up Tabulator
    closeSearch() {
        const modal = document.getElementById('facetSearchModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
        // Destroy Tabulator instance so it rebuilds fresh on next open
        if (this.tabulatorInstance) {
            this.tabulatorInstance.destroy();
            this.tabulatorInstance = null;
        }
        this.masterData = [];
        this.activeFilters = {};
        this._hasFileSidecars = false;
    },

    // Close on overlay click (outside modal window)
    handleOverlayClick(event) {
        if (event.target === document.getElementById('facetSearchModal')) {
            this.closeSearch();
        }
    }
};

// Export to window
window.facetSearch = facetSearch;
