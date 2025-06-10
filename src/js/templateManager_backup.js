// Template Manager (Complete - Enhanced with Search & Shared Templates Toggle, ALL original functions preserved)

const templateManager = {
    templates: [],
    currentTemplate: null,
    selectedIndex: -1,
    allTemplates: [],
    
    // NEW: Search and filter state with performance optimizations
    searchState: {
        query: '',
        results: [],
        showSharedTemplates: true,
        suggestions: [],
        isSearching: false,
        searchIndex: new Map(), // Pre-built search index
        searchCache: new Map(), // Cache for search results
        debounceTimer: null,
        lastQuery: '',
        suggestionCache: new Map()
    },

    // Performance settings
    performance: {
        debounceDelay: 300, // milliseconds
        maxCacheSize: 100,
        maxSuggestions: 8,
        renderBatchSize: 50, // For large template lists
        enableVirtualization: false // Auto-enabled for >200 templates
    },

    // ORIGINAL: Initialize template manager (enhanced with search features)
    init() {
        console.log('🔧 Initializing templateManager...');
        try {
            this.templates = window.storage ? window.storage.loadTemplates() : [];
            this.initializeSearchState(); // NEW
            this.renderList();
            this.updateTemplateInfo();
            this.buildSearchIndex(); // NEW
            console.log('✅ templateManager initialized with', this.templates.length, 'templates');
        } catch (error) {
            console.error('❌ Error in templateManager.init:', error);
            this.templates = [];
            this.initializeSearchState(); // NEW
            this.renderList();
        }
    },

    // NEW: Initialize search state
    initializeSearchState() {
        const searchInput = document.getElementById('templateSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        this.searchState.query = '';
        this.searchState.results = [];
        this.searchState.suggestions = [];
        this.searchState.isSearching = false;
        this.searchState.searchCache.clear();
        this.searchState.suggestionCache.clear();
    },

    // NEW: Build search index for fast searching
    buildSearchIndex() {
        console.log('🔍 Building search index...');
        this.searchState.searchIndex.clear();
        
        const allTemplates = this.getAllTemplates();
        
        allTemplates.forEach((template, index) => {
            const searchableContent = this.extractSearchableContent(template);
            this.searchState.searchIndex.set(index, {
                template,
                searchableText: searchableContent.join(' ').toLowerCase(),
                keywords: searchableContent
            });
        });
        
        console.log(`✅ Search index built for ${allTemplates.length} templates`);
    },

    // NEW: Extract all searchable content from a template
    extractSearchableContent(template) {
        const content = [];
        
        // Template name and description
        if (template.name) content.push(template.name);
        if (template.description) content.push(template.description);
        
        // Creator info
        if (template.createdBy) content.push(template.createdBy);
        if (template.createdByGroup) content.push(template.createdByGroup);
        
        // Template type
        content.push(template.type || 'folders');
        
        // Metadata content
        if (template.metadata) {
            this.extractMetadataContent(template.metadata, content);
        }
        
        return content;
    },

    // NEW: Extract searchable content from metadata recursively
    extractMetadataContent(metadata, content) {
        if (!metadata || typeof metadata !== 'object') return;
        
        for (const [key, value] of Object.entries(metadata)) {
            if (typeof value === 'object' && value !== null) {
                // Field properties
                if (value.label) content.push(value.label);
                if (value.value) content.push(String(value.value));
                if (value.description) content.push(value.description);
                if (value.type) content.push(value.type);
                
                // Dropdown options
                if (value.options && Array.isArray(value.options)) {
                    content.push(...value.options);
                }
            } else if (typeof value === 'string') {
                content.push(value);
            }
        }
    },

    // NEW: Handle search input with debouncing
    handleSearch() {
        const searchInput = document.getElementById('templateSearchInput');
        if (!searchInput) return;

        const query = searchInput.value.trim();
        
        // Clear previous debounce timer
        if (this.searchState.debounceTimer) {
            clearTimeout(this.searchState.debounceTimer);
        }

        // If query is empty, clear immediately
        if (query.length === 0) {
            this.clearSearch();
            return;
        }

        // Show searching status immediately
        this.showSearchingStatus();

        // Debounce the actual search
        this.searchState.debounceTimer = setTimeout(() => {
            this.performSearch(query);
        }, this.performance.debounceDelay);
    },

    // NEW: Show searching status
    showSearchingStatus() {
        const statusDiv = document.getElementById('searchStatus');
        if (statusDiv) {
            statusDiv.textContent = 'Searching...';
            statusDiv.className = 'searching';
            statusDiv.style.display = 'block';
        }
    },

    // NEW: Optimized search with caching
    performSearch(query) {
        const startTime = performance.now();
        
        try {
            this.searchState.query = query;
            this.searchState.isSearching = true;
            
            // Check cache first
            const cacheKey = `${query}_${this.searchState.showSharedTemplates}`;
            if (this.searchState.searchCache.has(cacheKey)) {
                console.log('🔍 Using cached search results for:', query);
                this.searchState.results = this.searchState.searchCache.get(cacheKey);
                this.renderList();
                this.updateSearchStatus();
                return;
            }

            // Perform search using index
            const queryLower = query.toLowerCase();
            const results = [];
            
            for (const [index, entry] of this.searchState.searchIndex.entries()) {
                if (this.matchesSearchQuery(entry, queryLower)) {
                    // Apply shared templates filter
                    if (!this.searchState.showSharedTemplates && !entry.template.isOwn) {
                        continue;
                    }
                    results.push(entry.template);
                }
            }
            
            this.searchState.results = results;
            
            // Cache results (with size limit)
            if (this.searchState.searchCache.size >= this.performance.maxCacheSize) {
                // Remove oldest entry
                const firstKey = this.searchState.searchCache.keys().next().value;
                this.searchState.searchCache.delete(firstKey);
            }
            this.searchState.searchCache.set(cacheKey, results);
            
            // Generate suggestions asynchronously
            this.generateSearchSuggestionsAsync(queryLower);
            
            const endTime = performance.now();
            console.log(`🔍 Search for "${query}": ${results.length} results in ${(endTime - startTime).toFixed(1)}ms`);
            
            this.renderList();
            this.updateSearchStatus();
            
        } catch (error) {
            console.error('Search error:', error);
            this.searchState.isSearching = false;
            this.updateSearchStatus();
        }
    },

    // NEW: Fast search matching using pre-indexed content
    matchesSearchQuery(entry, queryLower) {
        // Fast string includes check on pre-built searchable text
        return entry.searchableText.includes(queryLower);
    },

    // NEW: Generate search suggestions asynchronously with caching
    generateSearchSuggestionsAsync(query) {
        // Check suggestion cache
        if (this.searchState.suggestionCache.has(query)) {
            this.searchState.suggestions = this.searchState.suggestionCache.get(query);
            return;
        }

        // Use requestIdleCallback for non-blocking suggestion generation
        const generateSuggestions = () => {
            const suggestions = new Set();
            let count = 0;
            
            for (const [index, entry] of this.searchState.searchIndex.entries()) {
                if (count >= this.performance.maxSuggestions) break;
                
                // Find matching keywords
                for (const keyword of entry.keywords) {
                    const keywordLower = keyword.toLowerCase();
                    if (keywordLower.includes(query) && keywordLower !== query) {
                        suggestions.add(keyword);
                        count++;
                        if (count >= this.performance.maxSuggestions) break;
                    }
                }
            }
            
            const suggestionArray = Array.from(suggestions).slice(0, this.performance.maxSuggestions);
            
            // Cache suggestions
            this.searchState.suggestionCache.set(query, suggestionArray);
            this.searchState.suggestions = suggestionArray;
        };

        if (window.requestIdleCallback) {
            requestIdleCallback(generateSuggestions);
        } else {
            setTimeout(generateSuggestions, 0);
        }
    },

    // NEW: Show search suggestions with improved performance
    showSearchSuggestions() {
        const suggestionsDiv = document.getElementById('searchSuggestions');
        if (!suggestionsDiv || this.searchState.suggestions.length === 0) return;

        // Use DocumentFragment for efficient DOM manipulation
        const fragment = document.createDocumentFragment();
        
        this.searchState.suggestions.forEach(suggestion => {
            const suggestionDiv = document.createElement('div');
            suggestionDiv.className = 'search-suggestion';
            suggestionDiv.innerHTML = `
                <div class="search-suggestion-name">${this.escapeHtml(suggestion)}</div>
            `;
            suggestionDiv.addEventListener('click', () => {
                this.selectSuggestion(suggestion);
            });
            fragment.appendChild(suggestionDiv);
        });

        suggestionsDiv.innerHTML = '';
        suggestionsDiv.appendChild(fragment);
        suggestionsDiv.style.display = 'block';
    },

    // NEW: Hide search suggestions with delay
    hideSearchSuggestions() {
        setTimeout(() => {
            const suggestionsDiv = document.getElementById('searchSuggestions');
            if (suggestionsDiv) {
                suggestionsDiv.style.display = 'none';
            }
        }, 200);
    },

    // NEW: Select a search suggestion
    selectSuggestion(suggestion) {
        const searchInput = document.getElementById('templateSearchInput');
        if (searchInput) {
            searchInput.value = suggestion;
            this.performSearch(suggestion); // Direct search, no debounce
        }
        this.hideSearchSuggestions();
    },

    // NEW: Clear search
    clearSearch() {
        this.searchState.query = '';
        this.searchState.results = [];
        this.searchState.isSearching = false;
        this.renderList();
        this.updateSearchStatus();
    },

    // NEW: Update search status display
    updateSearchStatus() {
        const statusDiv = document.getElementById('searchStatus');
        if (!statusDiv) return;

        if (this.searchState.isSearching) {
            const resultCount = this.getFilteredTemplates().length;
            const totalCount = this.getAllTemplates().length;
            
            if (resultCount === 0) {
                statusDiv.textContent = `No templates found for "${this.searchState.query}"`;
                statusDiv.className = 'no-results';
                statusDiv.style.display = 'block';
            } else if (resultCount < totalCount) {
                statusDiv.textContent = `${resultCount} of ${totalCount} templates shown`;
                statusDiv.className = 'results-found';
                statusDiv.style.display = 'block';
            } else {
                statusDiv.style.display = 'none';
            }
        } else {
            statusDiv.style.display = 'none';
        }
    },

    // NEW: Toggle shared templates visibility
    toggleSharedTemplates() {
        const checkbox = document.getElementById('showSharedTemplates');
        if (!checkbox) return;

        this.searchState.showSharedTemplates = checkbox.checked;
        console.log('🤝 Shared templates toggle:', this.searchState.showSharedTemplates);
        
        // Clear cache as filter changed
        this.searchState.searchCache.clear();
        
        this.renderList();
        this.updateSearchStatus();
    },

    // NEW: Get filtered templates based on search and toggle state
    getFilteredTemplates() {
        let templates;

        if (this.searchState.isSearching) {
            // Use cached search results
            templates = this.searchState.results;
        } else {
            // Use all templates
            templates = this.getAllTemplates();
            
            // Apply shared templates filter only
            if (!this.searchState.showSharedTemplates) {
                templates = templates.filter(t => t.isOwn);
            }
        }

        return templates;
    },

    // NEW: Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // NEW: Escape regex special characters
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    // NEW: Highlight search matches in text (optimized)
    highlightSearchMatches(text, query) {
        if (!query || !text) return text;
        
        try {
            const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
            return text.replace(regex, '<span class="search-highlight">$1</span>');
        } catch (e) {
            // Fallback for invalid regex
            return text;
        }
    },

    // ORIGINAL: Add new template (enhanced with index rebuild)
    add(template) {
        console.log('➕ Adding template:', template);
        
        const enhancedTemplate = {
            ...template,
            createdBy: window.userManager?.currentUser || 'Unknown',
            createdByGroup: window.userManager?.currentGroup || 'Unknown',
            createdAt: new Date().toISOString()
        };
        
        this.templates.push(enhancedTemplate);
        
        if (window.storage) {
            const saved = window.storage.saveTemplates(this.templates);
            console.log('💾 Save result:', saved);
        }
        
        // NEW: Rebuild search index and clear cache
        this.buildSearchIndex();
        this.searchState.searchCache.clear();
        this.searchState.suggestionCache.clear();
        
        this.renderList();
        this.updateTemplateInfo();
        console.log('✅ Template added successfully');
    },

    // ORIGINAL: Update template (enhanced with index rebuild)
    update(index, template) {
        if (index >= 0 && index < this.templates.length) {
            const existingTemplate = this.templates[index];
            const updatedTemplate = {
                ...template,
                createdBy: existingTemplate.createdBy,
                createdByGroup: existingTemplate.createdByGroup,
                createdAt: existingTemplate.createdAt,
                updatedAt: new Date().toISOString()
            };
            
            this.templates[index] = updatedTemplate;
            
            if (window.storage) {
                window.storage.saveTemplates(this.templates);
            }
            
            // NEW: Rebuild search index and clear cache
            this.buildSearchIndex();
            this.searchState.searchCache.clear();
            this.searchState.suggestionCache.clear();
            
            this.renderList();
            this.updateTemplateInfo();
            console.log('✅ Template updated:', template.name);
        }
    },

    // ORIGINAL: Get current type safely
    getCurrentType() {
        if (window.templateTypeManager && window.templateTypeManager.currentType) {
            return window.templateTypeManager.currentType;
        }
        return 'folders';
    },

    // ORIGINAL: Get all templates (including group templates) - FIXED: No circular dependency
    getAllTemplates() {
        const currentType = this.getCurrentType();
        
        // Get own templates
        const ownTemplates = this.templates.filter(t => 
            (currentType === 'folders' && t.type !== 'experiment') ||
            (currentType === 'experiments' && t.type === 'experiment')
        );

        // Load group templates - FIXED to use current user's group
        let groupTemplates = [];
        try {
            const currentGroup = window.userManager?.currentGroup;
            if (window.storage && window.storage.loadGroupTemplates && currentGroup && currentGroup !== 'Unknown') {
                console.log(`📚 Loading group templates for group: "${currentGroup}"`);
                groupTemplates = window.storage.loadGroupTemplates(currentGroup)
                    .filter(t => 
                        ((currentType === 'folders' && t.type !== 'experiment') ||
                        (currentType === 'experiments' && t.type === 'experiment')) &&
                        t.createdBy !== window.userManager?.currentUser &&
                        t.createdBy !== 'System'
                    );
                console.log(`🤝 Found ${groupTemplates.length} shared templates from group "${currentGroup}"`);
            }
        } catch (error) {
            console.warn('Could not load group templates:', error);
            groupTemplates = [];
        }

        // Mark templates with proper indices and ownership
        const ownTemplatesMarked = ownTemplates.map((t, i) => ({ 
            ...t, 
            isOwn: true, 
            originalIndex: i
        }));
        
        const groupTemplatesMarked = groupTemplates.map(t => ({ 
            ...t, 
            isOwn: false, 
            originalIndex: -1,
            isShared: true
        }));

        this.allTemplates = [...ownTemplatesMarked, ...groupTemplatesMarked];
        console.log(`📋 Total templates: ${ownTemplatesMarked.length} own + ${groupTemplatesMarked.length} shared = ${this.allTemplates.length}`);
        
        // FIXED: Update toggle visibility WITHOUT causing circular dependency
        this.updateSharedToggleVisibility();
        
        return this.allTemplates;
    },

    // NEW: Update visibility of shared templates toggle (FIXED: No circular dependency)
    updateSharedToggleVisibility() {
        const toggleElement = document.getElementById('sharedTemplatesToggle');
        if (!toggleElement) return;

        // Show toggle only if user management is enabled and we have shared templates
        const userManagementEnabled = window.userManager?.isEnabled() || false;
        // FIXED: Use this.allTemplates directly instead of calling getAllTemplates()
        const hasSharedTemplates = this.allTemplates.some(t => !t.isOwn);
        
        if (userManagementEnabled && hasSharedTemplates) {
            toggleElement.style.display = 'block';
        } else {
            toggleElement.style.display = 'none';
        }
    },

    // ORIGINAL: Safe user color generation
    getUserColor(username) {
        if (window.userManager && window.userManager.generateUserColor) {
            return window.userManager.generateUserColor(username);
        }
        return '#7c3aed';
    },

    // ORIGINAL: Safe user initials
    getUserInitials(username) {
        if (window.userManager && window.userManager.getUserInitials) {
            return window.userManager.getUserInitials(username);
        }
        return username ? username.substring(0, 2).toUpperCase() : '??';
    },

    // ORIGINAL: Update template info display
    updateTemplateInfo() {
        const infoElement = document.getElementById('templateInfo');
        if (!infoElement) return;

        if (!this.currentTemplate) {
            infoElement.textContent = 'No template selected';
            infoElement.className = 'template-info';
            return;
        }

        const template = this.currentTemplate;
        const hasStructure = template.structure && template.structure.trim() !== '';
        const hasMetadata = template.metadata && Object.keys(template.metadata).length > 0;
        
        let infoText = template.name;
        let infoClass = 'template-info success';
        
        if (template.type === 'experiment') {
            if (!hasStructure && !hasMetadata) {
                infoText += ' (No structure or metadata defined)';
                infoClass = 'template-info warning';
            } else if (!hasStructure && hasMetadata) {
                infoText += ' (Metadata only - no folder structure)';
                infoClass = 'template-info info';
            } else if (hasStructure && !hasMetadata) {
                infoText += ' (Structure only - no metadata)';
                infoClass = 'template-info warning';
            } else {
                infoText += ' (Complete experiment template)';
                infoClass = 'template-info success';
            }
        } else {
            if (!hasStructure) {
                infoText += ' (No structure defined)';
                infoClass = 'template-info error';
            } else {
                infoText += ' (Folder template ready)';
                infoClass = 'template-info success';
            }
        }
        
        infoElement.textContent = infoText;
        infoElement.className = infoClass;
    },

    // ORIGINAL: Render template list with enhanced UI - ENHANCED with search and filtering
    renderList() {
        const listContainer = document.getElementById('templateList');
        if (!listContainer) {
            console.warn('templateList element not found');
            return;
        }

        // NEW: Use filtered templates instead of all templates
        const filteredTemplates = this.getFilteredTemplates();
        const currentType = this.getCurrentType();
        
        if (filteredTemplates.length === 0) {
            // NEW: Enhanced empty state messages
            let emptyMessage = 'No templates available yet.';
            
            if (this.searchState.isSearching) {
                emptyMessage = `No templates found for "${this.searchState.query}".`;
            } else if (!this.searchState.showSharedTemplates) {
                emptyMessage = 'No personal templates available yet.';
            }
            
            const typeLabel = currentType === 'folders' ? 'Folder Templates' : 'Experiment Templates';
            listContainer.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.6;">
                        ${this.searchState.isSearching ? '🔍' : (currentType === 'folders' ? '📁' : '🧪')}
                    </div>
                    <p style="font-weight: 500; margin-bottom: 0.5rem;">${emptyMessage}</p>
                    ${!this.searchState.isSearching ? '<p style="font-size: 0.9rem; opacity: 0.8;">Create your first template to get started!</p>' : ''}
                </div>
            `;
            return;
        }

        listContainer.innerHTML = filteredTemplates.map((template, index) => {
            const badge = template.type === 'experiment' ? 
                '<span class="template-badge experiment">🧪</span>' : 
                '<span class="template-badge">📁</span>';
            
            const color = this.getUserColor(template.createdBy);
            const initials = this.getUserInitials(template.createdBy);
            const isSelected = this.selectedIndex === index;
            
            const createdDate = new Date(template.createdAt).toLocaleDateString();
            const updatedDate = template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : null;
            
            // NEW: Highlight search matches
            const displayName = this.searchState.isSearching ? 
                this.highlightSearchMatches(template.name, this.searchState.query) : 
                this.escapeHtml(template.name);
            
            const displayDescription = this.searchState.isSearching && template.description ? 
                this.highlightSearchMatches(template.description, this.searchState.query) : 
                (template.description ? this.escapeHtml(template.description) : '');
            
            // ORIGINAL: Copy link for shared templates
            const copyLink = !template.isOwn && template.isShared ? 
                `<div style="margin-top: 8px;">
                    <span class="copy-link" data-template-index="${index}" 
                          style="color: #10b981; font-size: 0.8rem; text-decoration: underline; cursor: pointer; font-weight: 500;">
                        📋 Copy to my templates
                    </span>
                </div>` : '';
            
            // NEW: Search result styling
            const searchResultClass = this.searchState.isSearching ? 'search-result' : '';
            
            return `
                <div class="template-item ${isSelected ? 'active' : ''} ${searchResultClass}" 
                     data-is-own="${template.isOwn}"
                     data-template-index="${index}">
                    <div class="template-header">
                        <div class="template-avatar" style="background-color: ${color}">
                            ${initials}
                        </div>
                        <div class="template-info">
                            <h3>
                                ${displayName}
                                ${badge}
                                ${!template.isOwn ? '<span class="shared-badge">shared</span>' : ''}
                            </h3>
                            <div class="template-meta">
                                <span class="creator-info">by ${this.escapeHtml(template.createdBy)} (${this.escapeHtml(template.createdByGroup)})</span>
                                <span class="date-info">
                                    Created: ${createdDate}
                                    ${updatedDate ? ` • Updated: ${updatedDate}` : ''}
                                </span>
                            </div>
                            ${displayDescription ? `
                                <p class="template-description">${displayDescription}</p>
                            ` : ''}
                            ${copyLink}
                        </div>
                    </div>
                    ${template.isOwn ? `
                        <div class="owner-indicator" title="Your template"></div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // ORIGINAL: Attach event listeners (preserved)
        this.attachEventListeners();
        
        // NEW: Update search status
        this.updateSearchStatus();
    },

    // ORIGINAL: Safe event listener attachment (preserved)
    attachEventListeners() {
        const listContainer = document.getElementById('templateList');
        if (!listContainer) return;

        // Remove old listeners
        listContainer.removeEventListener('click', this.handleTemplateClick);
        
        // Template selection click
        this.handleTemplateClick = (event) => {
            const templateItem = event.target.closest('.template-item');
            if (!templateItem) return;

            // Handle copy link clicks
            if (event.target.classList.contains('copy-link')) {
                event.stopPropagation();
                const index = parseInt(templateItem.getAttribute('data-template-index'));
                if (!isNaN(index)) {
                    this.copyTemplate(index);
                }
                return;
            }

            // Handle template selection
            const index = parseInt(templateItem.getAttribute('data-template-index'));
            if (!isNaN(index)) {
                this.select(index);
            }
        };

        // Add new listener
        listContainer.addEventListener('click', this.handleTemplateClick);
    },

    // ORIGINAL: Enhanced copy template with better error handling (preserved)
    copyTemplate(index) {
        try {
            // NEW: Use filtered templates instead of allTemplates
            const filteredTemplates = this.getFilteredTemplates();
            const template = filteredTemplates[index];
            
            if (!template || template.isOwn) {
                console.warn('Cannot copy template: invalid or already owned');
                return;
            }

            const copiedTemplate = {
                ...template,
                name: `${template.name} (Copy)`,
                description: `${template.description || ''} (Copied from ${template.createdBy})`.trim(),
                createdBy: window.userManager?.currentUser || 'Unknown',
                createdByGroup: window.userManager?.currentGroup || 'Unknown',
                createdAt: new Date().toISOString(),
                originalCreatedBy: template.createdBy,
                originalCreatedByGroup: template.createdByGroup,
                copiedFrom: `${template.createdBy} (${template.createdByGroup})`,
                isOwn: true
            };

            // Clean up UI properties
            delete copiedTemplate.userColor;
            delete copiedTemplate.userInitials;
            delete copiedTemplate.originalIndex;
            delete copiedTemplate.isShared;

            this.templates.push(copiedTemplate);
            
            if (window.storage) {
                window.storage.saveTemplates(this.templates);
            }
            
            // NEW: Rebuild search index
            this.buildSearchIndex();
            this.searchState.searchCache.clear();
            
            this.renderList();
            this.updateTemplateInfo();
            
            // Show success message
            if (window.app && window.app.showSuccess) {
                window.app.showSuccess(`Template "${template.name}" copied to your collection!`);
            }
            
            console.log(`✅ Template "${template.name}" copied successfully`);
            
        } catch (error) {
            console.error('Error copying template:', error);
            if (window.app && window.app.showError) {
                window.app.showError('Failed to copy template: ' + error.message);
            }
        }
    },

    // ORIGINAL: Select template with enhanced feedback (preserved)
    select(index) {
        // NEW: Use filtered templates
        const filteredTemplates = this.getFilteredTemplates();
        const template = filteredTemplates[index];
        
        if (!template) return;

        this.selectedIndex = index;
        this.currentTemplate = template;
        
        this.renderList();
        this.updateTemplateInfo();
        
        // Safe DOM updates
        const detailsElement = document.getElementById('templateDetails');
        if (detailsElement) {
            detailsElement.style.display = 'block';
        }
        
        const preview = document.getElementById('folderPreview');
        if (preview) {
            const structure = this.currentTemplate.structure || 'No structure defined';
            preview.textContent = structure;
        }
        
        // Handle experiment form safely
        const experimentFormDiv = document.getElementById('experimentForm');
        if (experimentFormDiv) {
            if (this.currentTemplate.type === 'experiment' && this.currentTemplate.metadata) {
                experimentFormDiv.style.display = 'block';
                if (window.experimentForm && window.experimentForm.render) {
                    window.experimentForm.render(this.currentTemplate.metadata);
                }
            } else {
                experimentFormDiv.style.display = 'none';
            }
        }
        
        // Update action buttons
        this.updateActionButtons();
        
        console.log('✅ Template selected:', template.name);
    },

    // ORIGINAL: Update action buttons based on template ownership (preserved)
    updateActionButtons() {
        const editBtn = document.querySelector('.actions button[onclick*="editCurrentTemplate"]');
        const deleteBtn = document.querySelector('.actions button[onclick*="deleteCurrentTemplate"]');
        
        if (editBtn && deleteBtn) {
            const canEdit = this.currentTemplate && this.currentTemplate.isOwn;
            
            editBtn.disabled = !canEdit;
            deleteBtn.disabled = !canEdit;
            
            editBtn.style.opacity = canEdit ? '1' : '0.5';
            deleteBtn.style.opacity = canEdit ? '1' : '0.5';
            
            editBtn.title = canEdit ? 'Edit this template' : 'Can only edit your own templates';
            deleteBtn.title = canEdit ? 'Delete this template' : 'Can only delete your own templates';
        }
    },

    // ORIGINAL: Edit current template (preserved)
    editCurrent() {
        if (!this.currentTemplate || !this.currentTemplate.isOwn) {
            if (window.app && window.app.showError) {
                window.app.showError('You can only edit your own templates. Copy this template first to make changes.');
            }
            return;
        }
        
        if (window.templateModal) {
            const editingIndex = this.templates.findIndex(t => 
                t.name === this.currentTemplate.name && 
                t.createdBy === this.currentTemplate.createdBy
            );
            
            if (editingIndex >= 0) {
                window.templateModal.openForEdit(editingIndex, this.templates[editingIndex]);
            }
        }
    },

    // ORIGINAL: Delete current template (preserved)
    deleteCurrent() {
        if (!this.currentTemplate || !this.currentTemplate.isOwn) {
            if (window.app && window.app.showError) {
                window.app.showError('You can only delete your own templates.');
            }
            return;
        }
        
        if (confirm(`Delete template "${this.currentTemplate.name}"?\n\nThis action cannot be undone.`)) {
            const index = this.templates.findIndex(t => 
                t.name === this.currentTemplate.name && 
                t.createdBy === this.currentTemplate.createdBy
            );
            
            if (index >= 0) {
                this.templates.splice(index, 1);
                
                if (window.storage) {
                    window.storage.saveTemplates(this.templates);
                }
                
                // NEW: Rebuild search index
                this.buildSearchIndex();
                this.searchState.searchCache.clear();
                
                this.currentTemplate = null;
                this.selectedIndex = -1;
                
                const detailsElement = document.getElementById('templateDetails');
                if (detailsElement) {
                    detailsElement.style.display = 'none';
                }
                
                this.renderList();
                this.updateTemplateInfo();
                
                if (window.app && window.app.showSuccess) {
                    window.app.showSuccess('Template deleted successfully.');
                }
                
                console.log('✅ Template deleted');
            }
        }
    },
	
	// ENHANCED: React to template type changes
    onTemplateTypeChanged(newType) {
        console.log('🔄 Template type changed to:', newType);
        
        // Clear current selection
        this.currentTemplate = null;
        this.selectedIndex = -1;
        
        // Hide template details
        const detailsElement = document.getElementById('templateDetails');
        if (detailsElement) {
            detailsElement.style.display = 'none';
        }
        
        // Clear search if active
        if (this.searchState.isSearching) {
            const searchInput = document.getElementById('templateSearchInput');
            if (searchInput) {
                searchInput.value = '';
            }
            this.clearSearch();
        }
        
        // Force rebuild of templates for new type
        this.allTemplates = []; // Clear cache
        this.buildSearchIndex(); // This will call getAllTemplates() internally
        this.updateSharedToggleVisibility();
        
        // Re-render list
        this.renderList();
        this.updateTemplateInfo();
        
        console.log(`✅ Switched to ${newType}, showing ${this.getAllTemplates().length} templates`);
    },

    // ENHANCED: Manual refresh function for external calls
    refresh() {
        console.log('🔄 Manually refreshing template manager...');
        this.allTemplates = []; // Clear cache
        this.buildSearchIndex();
        this.updateSharedToggleVisibility();
        this.renderList();
        this.updateTemplateInfo();
    }
	
};

// ENHANCED: Override the global switchTemplateType function to notify templateManager
window.switchTemplateType = function(type) {
    console.log('🔄 switchTemplateType called with:', type);
    
    try {
        // Call original templateTypeManager if available
        if (window.templateTypeManager && window.templateTypeManager.switchType) {
            console.log('📞 Calling templateTypeManager.switchType:', type);
            window.templateTypeManager.switchType(type);


		} else {
					console.warn('⚠️ templateTypeManager not available - creating minimal fallback');
					
					// FALLBACK: Minimal template type management if templateTypeManager is missing
					if (!window.templateTypeManager) {
						window.templateTypeManager = {
							currentType: 'folders',
							switchType: function(newType) {
								console.log('📁 Fallback: Switching to', newType);
								this.currentType = newType;
								
								// Update button states
								const foldersBtn = document.getElementById('foldersTypeBtn');
								const experimentsBtn = document.getElementById('experimentsTypeBtn');
								
								if (foldersBtn && experimentsBtn) {
									foldersBtn.classList.toggle('active', newType === 'folders');
									experimentsBtn.classList.toggle('active', newType === 'experiments');
								}
							}
						};
					}
					
					window.templateTypeManager.switchType(type);
				}
        
        // Notify our enhanced templateManager
        if (window.templateManager && window.templateManager.onTemplateTypeChanged) {
            console.log('📞 Calling templateManager.onTemplateTypeChanged:', type);
            window.templateManager.onTemplateTypeChanged(type);
        } else {
            console.warn('⚠️ templateManager.onTemplateTypeChanged not available');
        }
        
        // Also try to refresh integration options
        if (window.updateIntegrationOptions) {
            window.updateIntegrationOptions();
        }
        
        console.log('✅ Template type switched to:', type);
        
    } catch (error) {
        console.error('❌ Error switching template type:', error);
    }
};

// DEBUG: Add debugging for templateTypeManager
if (window.templateTypeManager) {
    console.log('✅ templateTypeManager available:', window.templateTypeManager);
    console.log('Current type:', window.templateTypeManager.currentType);
} else {
    console.warn('⚠️ templateTypeManager NOT available - this might be the problem!');
}

// DEBUG: Test function to check what's happening
window.debugTemplateTypes = function() {
    console.log('=== TEMPLATE TYPE DEBUG ===');
    console.log('templateTypeManager available:', !!window.templateTypeManager);
    console.log('templateTypeManager.currentType:', window.templateTypeManager?.currentType);
    console.log('templateManager available:', !!window.templateManager);
    console.log('Current templates count:', window.templateManager?.getAllTemplates()?.length);
    console.log('All templates:', window.templateManager?.getAllTemplates());
    console.log('===========================');
};

window.templateManager = templateManager;
console.log('✅ Complete templateManager loaded (Enhanced with Search & Shared Templates Toggle, ALL original functions preserved)');