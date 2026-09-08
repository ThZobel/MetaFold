// Template Manager with File Storage Integration and Cache Management

const templateManager = {
    templates: [],
    currentTemplate: null,
    selectedIndex: -1,
    allTemplates: [],

    // Search and filter state
    searchState: {
        query: '',
        results: [],
        showSharedTemplates: true,
        suggestions: [],
        isSearching: false,
        searchIndex: new Map(),
        searchCache: new Map(),
        debounceTimer: null,
        lastQuery: '',
        suggestionCache: new Map()
    },

    // Performance settings
    performance: {
        debounceDelay: 300,
        maxCacheSize: 100,
        maxSuggestions: 8,
        renderBatchSize: 50,
        enableVirtualization: false
    },

    // Initialize template manager
    async init() {
        console.log('🔧 Initializing templateManager (file-only mode)...');
        try {
            // Initialize storage first
            if (window.storage) {
                await window.storage.initFileStorage();
            }

            // Load templates
            this.templates = await this.loadTemplates();

            // Initialize search state
            this.initializeSearchState();

            // Clear cache
            this.allTemplates = [];

            // Render the list
            this.renderList();
            this.updateTemplateInfo();

            // NO MIGRATION CHECK - removed!
            // this.checkMigrationNotice(); // <-- DIESE ZEILE ENTFERNEN

            // Build search index after templates are loaded
            setTimeout(() => {
                console.log('📊 Building initial search index...');
                this.buildSearchIndex();
                console.log(`✅ Initial search index built with ${this.searchState.searchIndex.size} entries`);
            }, 100);

            console.log('✅ templateManager initialized with', this.templates.length, 'templates');
        } catch (error) {
            console.error('❌ Error in templateManager.init:', error);
            this.templates = [];
            this.initializeSearchState();
            this.renderList();
        }
    },

    // Enhance template with storage status
    enhanceTemplateWithStatus(template) {
        // Determine storage type based on _fileInfo
        if (template._fileInfo && template._fileInfo.filePath) {
            template.savedLocally = true;
            template.storageType = 'file';
            template.storageDisplay = 'Saved as file';
            template.storageIcon = '📁';
        } else if (template.storageType === 'default' || template.createdBy === 'System') {
            template.savedLocally = false;
            template.storageType = 'default';
            template.storageDisplay = 'System template';
            template.storageIcon = '⚙️';
        } else {
            template.savedLocally = false;
            template.storageType = 'localStorage';
            template.storageDisplay = 'Stored in browser';
            template.storageIcon = '💾';
        }

        // Add user display info
        template.userDisplayName = template.createdBy || 'Unknown';
        template.groupDisplayName = template.createdByGroup || 'Unknown';

        return template;
    },

    // Initialize search state
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

    // Force cache invalidation
    invalidateCache() {
        console.log('🔄 Invalidating template cache...');
        this.allTemplates = [];
        this.searchState.searchCache.clear();
        this.searchState.suggestionCache.clear();
    },

    // Build search index
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

    // Extract searchable content from template
    extractSearchableContent(template) {
        const content = [];

        if (template.name) content.push(template.name);
        if (template.description) content.push(template.description);
        if (template.createdBy) content.push(template.createdBy);
        if (template.createdByGroup) content.push(template.createdByGroup);

        content.push(template.type || 'folders');

        if (template.metadata) {
            this.extractMetadataContent(template.metadata, content);
        }

        return content;
    },

    // Extract metadata content
    extractMetadataContent(metadata, content) {
        if (!metadata || typeof metadata !== 'object') return;

        for (const [key, value] of Object.entries(metadata)) {
            if (typeof value === 'object' && value !== null) {
                if (value.label) content.push(value.label);
                if (value.value) content.push(String(value.value));
                if (value.description) content.push(value.description);
                if (value.type) content.push(value.type);

                if (value.options && Array.isArray(value.options)) {
                    content.push(...value.options);
                }
            } else if (typeof value === 'string') {
                content.push(value);
            }
        }
    },

    // Handle search input
    handleSearch() {
        const searchInput = document.getElementById('templateSearchInput');
        if (!searchInput) return;

        const query = searchInput.value.trim();

        if (this.searchState.debounceTimer) {
            clearTimeout(this.searchState.debounceTimer);
        }

        if (query.length === 0) {
            this.clearSearch();
            return;
        }

        this.showSearchingStatus();

        this.searchState.debounceTimer = setTimeout(() => {
            this.performSearch(query);
        }, this.performance.debounceDelay);
    },

    // Füge diese Funktionen zur templateManager.js hinzu
    // Suche nach der Stelle wo die anderen Search-Funktionen sind (z.B. nach handleSearch)

    // Show search suggestions dropdown
    showSearchSuggestions() {
        console.log('🔍 Showing search suggestions...');

        const suggestionsDiv = document.getElementById('searchSuggestions');
        const searchInput = document.getElementById('templateSearchInput');

        if (!suggestionsDiv || !searchInput) {
            console.warn('⚠️ Search suggestions elements not found');
            return;
        }

        const query = searchInput.value.trim().toLowerCase();

        // Don't show suggestions if query is empty or too short
        if (query.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        // Generate suggestions if we have them
        if (this.searchState.suggestions.length > 0) {
            this.renderSearchSuggestions();
            suggestionsDiv.style.display = 'block';
        } else {
            // Generate suggestions for current query
            this.generateSearchSuggestionsAsync(query);
            // Show them after a short delay
            setTimeout(() => {
                if (this.searchState.suggestions.length > 0) {
                    this.renderSearchSuggestions();
                    suggestionsDiv.style.display = 'block';
                }
            }, 100);
        }
    },

    // Hide search suggestions dropdown
    hideSearchSuggestions() {
        console.log('🔍 Hiding search suggestions...');

        // Add a small delay to allow for suggestion clicks
        setTimeout(() => {
            const suggestionsDiv = document.getElementById('searchSuggestions');
            if (suggestionsDiv) {
                suggestionsDiv.style.display = 'none';
            }
        }, 150);
    },

    // Render search suggestions in dropdown
    renderSearchSuggestions() {
        const suggestionsDiv = document.getElementById('searchSuggestions');
        if (!suggestionsDiv) return;

        if (this.searchState.suggestions.length === 0) {
            suggestionsDiv.innerHTML = '<div style="padding: 12px; color: #9ca3af; text-align: center; font-size: 0.85rem;">No suggestions</div>';
            return;
        }

        const suggestionsHTML = this.searchState.suggestions.map(suggestion => `
			<div class="search-suggestion-item" 
				 onclick="templateManager.applySuggestion('${this.escapeHtml(suggestion)}')"
				 style="
					 padding: 10px 12px;
					 cursor: pointer;
					 border-bottom: 1px solid rgba(255, 255, 255, 0.1);
					 transition: background-color 0.2s ease;
					 font-size: 0.9rem;
					 color: #e0e0e0;
				 "
				 onmouseover="this.style.backgroundColor='rgba(124, 58, 237, 0.2)'"
				 onmouseout="this.style.backgroundColor='transparent'">
				<span style="color: #a855f7;">🔍</span> ${this.escapeHtml(suggestion)}
			</div>
		`).join('');

        suggestionsDiv.innerHTML = suggestionsHTML;
    },

    // Apply suggestion to search input
    applySuggestion(suggestion) {
        console.log('🔍 Applying suggestion:', suggestion);

        const searchInput = document.getElementById('templateSearchInput');
        if (searchInput) {
            searchInput.value = suggestion;

            // Trigger search
            this.handleSearch();

            // Hide suggestions
            this.hideSearchSuggestions();

            // Focus back on input
            searchInput.focus();
        }
    },

    // Helper function to escape HTML (if not already present)
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },



    // Show searching status
    showSearchingStatus() {
        const statusDiv = document.getElementById('searchStatus');
        if (statusDiv) {
            statusDiv.textContent = 'Searching...';
            statusDiv.className = 'searching';
            statusDiv.style.display = 'block';
        }
    },

    // Perform search
    performSearch(query) {
        const startTime = performance.now();

        try {
            this.searchState.query = query;
            this.searchState.isSearching = true;

            const cacheKey = `${query}_${this.searchState.showSharedTemplates}`;
            if (this.searchState.searchCache.has(cacheKey)) {
                console.log('🔍 Using cached search results for:', query);
                this.searchState.results = this.searchState.searchCache.get(cacheKey);
                this.renderList();
                this.updateSearchStatus();
                return;
            }

            const queryLower = query.toLowerCase();
            const results = [];

            for (const [index, entry] of this.searchState.searchIndex.entries()) {
                if (this.matchesSearchQuery(entry, queryLower)) {
                    if (!this.searchState.showSharedTemplates && !entry.template.isOwn) {
                        continue;
                    }
                    results.push(entry.template);
                }
            }

            this.searchState.results = results;

            if (this.searchState.searchCache.size >= this.performance.maxCacheSize) {
                const firstKey = this.searchState.searchCache.keys().next().value;
                this.searchState.searchCache.delete(firstKey);
            }
            this.searchState.searchCache.set(cacheKey, results);

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

    // Match search query
    matchesSearchQuery(entry, queryLower) {
        return entry.searchableText.includes(queryLower);
    },

    // Generate search suggestions
    generateSearchSuggestionsAsync(query) {
        if (this.searchState.suggestionCache.has(query)) {
            this.searchState.suggestions = this.searchState.suggestionCache.get(query);
            return;
        }

        const generateSuggestions = () => {
            const suggestions = new Set();
            let count = 0;

            for (const [index, entry] of this.searchState.searchIndex.entries()) {
                if (count >= this.performance.maxSuggestions) break;

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

            this.searchState.suggestionCache.set(query, suggestionArray);
            this.searchState.suggestions = suggestionArray;
        };

        if (window.requestIdleCallback) {
            requestIdleCallback(generateSuggestions);
        } else {
            setTimeout(generateSuggestions, 0);
        }
    },

    // Clear search
    clearSearch() {
        this.searchState.query = '';
        this.searchState.results = [];
        this.searchState.isSearching = false;
        this.renderList();
        this.updateSearchStatus();
    },

    // Update search status
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

    // Toggle shared templates
    async toggleSharedTemplates() {
        const checkbox = document.getElementById('showSharedTemplates');
        if (!checkbox) return;

        const newValue = checkbox.checked;
        this.searchState.showSharedTemplates = newValue;

        console.log('🤝 Shared templates toggle:', newValue);

        // NEUE FUNKTION: Userspezifisch speichern
        try {
            if (window.settingsManager) {
                await window.settingsManager.set('general.show_shared_templates', newValue);
                console.log('💾 Shared templates preference saved for user:', newValue);
            }
        } catch (error) {
            console.error('❌ Error saving shared templates preference:', error);
        }

        // Cache leeren und neu rendern
        this.searchState.searchCache.clear();
        this.renderList();
        this.updateSearchStatus();
    },

    async loadSharedTemplatesPreference() {
        try {
            if (!window.settingsManager) {
                console.warn('⚠️ Settings manager not available, using default');
                return;
            }

            // Standard: true (Shared Templates anzeigen)
            const showShared = await window.settingsManager.get('general.show_shared_templates');
            const finalValue = showShared !== undefined ? showShared : true;

            console.log('📂 Loading shared templates preference for user:', finalValue);

            // Checkbox Status setzen
            const checkbox = document.getElementById('showSharedTemplates');
            if (checkbox) {
                checkbox.checked = finalValue;
            }

            // Internen Status setzen
            this.searchState.showSharedTemplates = finalValue;

            console.log('✅ Shared templates preference loaded:', finalValue);

        } catch (error) {
            console.error('❌ Error loading shared templates preference:', error);
            // Fallback auf Standard-Wert
            this.searchState.showSharedTemplates = true;
            const checkbox = document.getElementById('showSharedTemplates');
            if (checkbox) {
                checkbox.checked = true;
            }
        }
    },

    async refreshUserPreferences() {
        console.log('👥 Refreshing user-specific preferences...');
        await this.loadSharedTemplatesPreference();

        // Liste neu rendern mit neuen Einstellungen
        this.renderList();
        this.updateSearchStatus();
    },

    // Get filtered templates
    getFilteredTemplates() {
        let templates;

        if (this.searchState.isSearching) {
            templates = this.searchState.results;
        } else {
            templates = this.getAllTemplates();

            if (!this.searchState.showSharedTemplates) {
                templates = templates.filter(t => t.isOwn);
            }
        }

        return templates;
    },

    // Get current type
    getCurrentType() {
        if (window.templateTypeManager && window.templateTypeManager.currentType) {
            return window.templateTypeManager.currentType;
        }
        return 'category1'; // Default fallback for 4-category system
    },


    // Get all templates (ENHANCED for better Group Template Loading)
    getAllTemplates() {
        const currentType = this.getCurrentType();

        if (this.allTemplates.length > 0) {
            const firstTemplate = this.allTemplates[0];
            const cacheValidForType = (currentType === 'folders' && firstTemplate.type !== 'experiment') ||
                (currentType === 'experiments' && firstTemplate.type === 'experiment');

            if (cacheValidForType) {
                return this.allTemplates;
            } else {
                this.allTemplates = [];
            }
        }

        // 1. Get own templates first (ENHANCED: Filter by category)
        const ownTemplates = this.templates.filter(t => {
            // Templates without category field are treated as 'category1' for backward compatibility
            const templateCategory = t.category || 'category1';
            return templateCategory === currentType;
        });

        // 2. Load group templates with enhanced error handling
        let groupTemplates = [];
        try {
            // ENHANCED: Better user context checking
            const currentUser = window.userManager?.currentUser;
            const currentGroup = window.userManager?.currentGroup;
            const userManagementEnabled = window.userManager?.isEnabled();

            console.log(`👤 Group template context: ${currentUser} (${currentGroup}), Enabled: ${userManagementEnabled}`);

            if (userManagementEnabled && currentUser && currentUser !== 'Unknown' && currentUser !== 'User' &&
                currentGroup && currentGroup !== 'Unknown' && currentGroup !== 'Default') {

                console.log(`🤝 Loading group templates for group: ${currentGroup}`);

                // Load from storage with better error handling
                if (window.storage && typeof window.storage.loadGroupTemplates === 'function') {
                    const rawGroupTemplates = window.storage.loadGroupTemplates(currentGroup);

                    // Filter out current user's templates and invalid templates
                    groupTemplates = rawGroupTemplates.filter(t => {
                        if (!t || !t.name || t.name === 'undefined') {
                            console.log('🗑️ Filtered out invalid group template:', t);
                            return false;
                        }
                        if (t.createdBy === currentUser || t.createdBy === 'System') {
                            return false;
                        }

                        // ENHANCED: Apply category filter
                        const templateCategory = t.category || 'category1';
                        if (templateCategory !== currentType) {
                            return false;
                        }

                        return true;
                    });

                    console.log(`🤝 Loaded ${groupTemplates.length} group templates after filtering`);
                } else {
                    console.warn('⚠️ loadGroupTemplates function not available');
                }
            } else {
                console.log('🚫 Group template loading skipped - invalid user context or disabled');
            }
        } catch (error) {
            console.warn('Could not load group templates:', error);
            groupTemplates = [];
        }

        // 3. Mark templates with ownership and enhance metadata
        const ownTemplatesMarked = ownTemplates.map((t, i) => ({
            ...t,
            isOwn: true,
            originalIndex: i,
            userDisplayName: t.createdBy || window.userManager?.currentUser || 'Unknown',
            groupDisplayName: t.createdByGroup || window.userManager?.currentGroup || 'Unknown',
            category: t.category || 'category1'  // Ensure category field exists
        }));

        const groupTemplatesMarked = groupTemplates.map(t => ({
            ...t,
            isOwn: false,
            originalIndex: -1,
            isShared: true,
            userDisplayName: t.createdBy || 'Unknown',
            groupDisplayName: t.createdByGroup || window.userManager?.currentGroup || 'Unknown',
            category: t.category || 'category1'  // Ensure category field exists
        }));

        // 4. Combine and cache
        this.allTemplates = [...ownTemplatesMarked, ...groupTemplatesMarked];

        console.log(`📂 Total templates loaded: ${this.allTemplates.length} (${ownTemplatesMarked.length} own + ${groupTemplatesMarked.length} shared)`);

        // 5. Update UI elements
        this.updateSharedToggleVisibility();

        return this.allTemplates;
    },

    // ENHANCED: Better template type detection (füge diese Funktion hinzu falls sie fehlt)
    getCurrentTemplateType() {
        try {
            // Check if templateTypeManager is available
            if (window.templateTypeManager && window.templateTypeManager.currentType) {
                return window.templateTypeManager.currentType;
            }

            // Check active tab in UI
            const folderTab = document.getElementById('folderTemplatesTab');
            const experimentTab = document.getElementById('experimentTemplatesTab');

            if (folderTab && folderTab.classList.contains('active')) {
                return 'folders';
            }
            if (experimentTab && experimentTab.classList.contains('active')) {
                return 'experiments';
            }

            // Default fallback
            return 'experiments';
        } catch (error) {
            console.warn('Error getting current template type:', error);
            return 'experiments';
        }
    },

    // NEW: Get category badge HTML for template list rendering
    getCategoryBadge(template) {
        const category = template.category || 'category1';
        const categoryConfig = window.templateTypeManager.getCategoryConfig(category);

        return `<span class="template-badge ${category}" style="background: ${categoryConfig.color};">
            ${categoryConfig.icon}
        </span>`;
    },

    // Update shared toggle visibility
    updateSharedToggleVisibility() {
        const toggleElement = document.getElementById('sharedTemplatesToggle');
        if (!toggleElement) return;

        const userManagementEnabled = window.userManager?.isEnabled() || false;

        if (userManagementEnabled) {
            toggleElement.style.display = 'block';
        } else {
            toggleElement.style.display = 'none';
        }
    },

    // Safe user color generation
    getUserColor(username) {
        if (window.userManager && window.userManager.generateUserColor) {
            return window.userManager.generateUserColor(username);
        }
        return '#7c3aed';
    },

    // Safe user initials
    getUserInitials(username) {
        if (window.userManager && window.userManager.getUserInitials) {
            return window.userManager.getUserInitials(username);
        }
        return username ? username.substring(0, 2).toUpperCase() : '??';
    },

    // Update template info display
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

    // Render template list
    renderList() {
        const listContainer = document.getElementById('templateList');
        if (!listContainer) {
            console.warn('templateList element not found');
            return;
        }

        const filteredTemplates = this.getFilteredTemplates();
        const currentType = this.getCurrentType();

        if (filteredTemplates.length === 0) {
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
            // ENHANCED: Use category badge instead of type badge
            const badge = this.getCategoryBadge(template);

            const color = this.getUserColor(template.createdBy);
            const initials = this.getUserInitials(template.createdBy);
            const isSelected = this.selectedIndex === index;

            const createdDate = new Date(template.createdAt).toLocaleDateString();
            const updatedDate = template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : null;

            const displayName = this.searchState.isSearching ?
                this.highlightSearchMatches(template.name, this.searchState.query) :
                this.escapeHtml(template.name);

            const displayDescription = this.searchState.isSearching && template.description ?
                this.highlightSearchMatches(template.description, this.searchState.query) :
                (template.description ? this.escapeHtml(template.description) : '');

            // Storage indicator
            const storageIndicator = `
                <div class="storage-indicator ${template.storageType}" title="${template.storageDisplay}">
                    <span class="storage-icon">${template.storageIcon}</span>
                    <span class="storage-text">${template.storageDisplay}</span>
                </div>
            `;

            // Copy link for shared templates
            const copyLink = !template.isOwn && template.isShared ?
                `<div style="margin-top: 8px;">
                    <span class="copy-link" data-template-index="${index}" 
                          style="color: #10b981; font-size: 0.8rem; text-decoration: underline; cursor: pointer; font-weight: 500;">
                        📋 Copy to my templates
                    </span>
                </div>` : '';

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
                            ${storageIndicator}
                            ${copyLink}
                        </div>
                    </div>
                    ${template.isOwn ? `
                        <div class="owner-indicator" title="Your template"></div>
                    ` : ''}
                </div>
            `;
        }).join('');

        this.attachEventListeners();
        this.updateSearchStatus();
    },

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Escape regex
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    // Highlight search matches
    highlightSearchMatches(text, query) {
        if (!query || !text) return text;

        try {
            const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
            return text.replace(regex, '<span class="search-highlight">$1</span>');
        } catch (e) {
            return text;
        }
    },

    // Attach event listeners
    attachEventListeners() {
        const listContainer = document.getElementById('templateList');
        if (!listContainer) return;

        listContainer.removeEventListener('click', this.handleTemplateClick);

        this.handleTemplateClick = (event) => {
            const templateItem = event.target.closest('.template-item');
            if (!templateItem) return;

            if (event.target.classList.contains('copy-link')) {
                event.stopPropagation();
                const index = parseInt(templateItem.getAttribute('data-template-index'));
                if (!isNaN(index)) {
                    this.copyTemplate(index);
                }
                return;
            }

            const index = parseInt(templateItem.getAttribute('data-template-index'));
            if (!isNaN(index)) {
                this.select(index);
            }
        };

        listContainer.addEventListener('click', this.handleTemplateClick);
    },

    // Copy template
    copyTemplate(index) {
        try {
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
            delete copiedTemplate._fileInfo; // Remove file info for new copy

            this.templates.push(copiedTemplate);

            if (window.storage) {
                window.storage.saveTemplates(this.templates);
            }

            this.invalidateCache();
            this.buildSearchIndex();

            this.renderList();
            this.updateTemplateInfo();

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

    // Select template
    select(index) {
        const filteredTemplates = this.getFilteredTemplates();
        const template = filteredTemplates[index];

        if (!template) return;

        console.log(`🔄 Selecting template: ${template.name}`);

        // CRITICAL FIX: Reset form completely before switching templates
        if (window.experimentForm && window.experimentForm.resetFormForNewTemplate) {
            console.log('🧹 Resetting form before template switch...');
            window.experimentForm.resetFormForNewTemplate();
        }

        this.selectedIndex = index;
        this.currentTemplate = template;

        this.renderList();
        this.updateTemplateInfo();

        const detailsElement = document.getElementById('templateDetails');
        const placeholderElement = document.getElementById('templatePlaceholder');

        if (detailsElement) {
            detailsElement.style.display = 'block';
        }

        if (placeholderElement) {
            placeholderElement.style.display = 'none';
        }

        const preview = document.getElementById('folderPreview');
        if (preview) {
            const structure = this.currentTemplate.structure || '';
            if (structure.trim()) {
                preview.innerHTML = this.parseAndRenderFolderTree(structure);
            } else {
                preview.textContent = 'No structure defined';
            }
        }

        const experimentFormDiv = document.getElementById('experimentForm');
        if (experimentFormDiv) {
            if (this.currentTemplate.type === 'experiment' && this.currentTemplate.metadata) {
                experimentFormDiv.style.display = 'block';

                // Now render the new template with clean form
                if (window.experimentForm && window.experimentForm.render) {
                    console.log(`📋 Rendering template: ${template.name}`);
                    window.experimentForm.render(this.currentTemplate.metadata);
                }
            } else {
                experimentFormDiv.style.display = 'none';
            }
        }

        // Toggle UI for template options
        const baseDirSection = document.getElementById('baseDirectorySection');
        const multiFolderSection = document.getElementById('multiFolderSection');
        const projectNameSection = document.getElementById('projectNameSection');
        const btnCreateProject = document.getElementById('createProjectBtn');

        const isMultiFolder = template.options?.multipleFolders;
        const isWriteFilesOnly = template.options?.writeFilesOnly;

        if (baseDirSection) baseDirSection.style.display = isMultiFolder ? 'none' : 'block';
        if (multiFolderSection) multiFolderSection.style.display = isMultiFolder ? 'block' : 'none';
        
        const onlyIntegrationsContainer = document.getElementById('onlyIntegrationsContainer');
        if (onlyIntegrationsContainer) {
            onlyIntegrationsContainer.style.display = isWriteFilesOnly ? 'none' : 'flex';
        }
        
        // projectNameSection is ALWAYS visible, but its label changes
        if (projectNameSection) {
            projectNameSection.style.display = 'block';
            const titleElement = projectNameSection.querySelector('h4');
            const subtitleElement = projectNameSection.querySelector('.section-subtitle');
            const inputElement = document.getElementById('projectName');
            
            if (isWriteFilesOnly || isMultiFolder) {
                if (titleElement) titleElement.textContent = 'Filename';
                if (subtitleElement) subtitleElement.textContent = 'Name of the file to write';
                if (inputElement) {
                    inputElement.placeholder = 'ReadyToImport.json';
                    inputElement.title = 'Enter a filename';
                    if (!inputElement.value || inputElement.value === 'My_Experiment_2024') {
                        inputElement.value = 'ReadyToImport.json';
                    }
                }
            } else {
                if (titleElement) titleElement.textContent = 'Project Name';
                if (subtitleElement) subtitleElement.textContent = 'Name for your experiment/project';
                if (inputElement) {
                    inputElement.placeholder = 'My_Experiment_2024...';
                    inputElement.title = 'Enter a name for your project';
                    if (inputElement.value === 'ReadyToImport.json') {
                        inputElement.value = '';
                    }
                }
            }
        }
        
        if (btnCreateProject) {
            btnCreateProject.innerHTML = (isWriteFilesOnly || isMultiFolder) ? '<span>📝</span> Write Files' : '<span>🚀</span> Create Project';
        }

        // NEW: Load elabFTW category and settings from template
        if (this.currentTemplate.integrations?.elabftw) {
            console.log(`📂 Loading elabFTW category from template: ${this.currentTemplate.integrations.elabftw.defaultCategory}`);
            this.setElabFTWCategoryInUI(this.currentTemplate.integrations.elabftw.defaultCategory);
            
            const fetchNextIdInput = document.getElementById('elabftwFetchNextId');
            if (fetchNextIdInput) {
                fetchNextIdInput.checked = this.currentTemplate.integrations.elabftw.fetchNextId || false;
            }
        } else if (this.currentTemplate.elabftwCategory !== undefined) {
            // Legacy support for direct property
            console.log(`📂 Loading legacy elabFTW category from template: ${this.currentTemplate.elabftwCategory}`);
            this.setElabFTWCategoryInUI(this.currentTemplate.elabftwCategory);
            
            const fetchNextIdInput = document.getElementById('elabftwFetchNextId');
            if (fetchNextIdInput) fetchNextIdInput.checked = false;
        } else {
            // Clear category field if template has no specific category
            this.setElabFTWCategoryInUI('');
            const fetchNextIdInput = document.getElementById('elabftwFetchNextId');
            if (fetchNextIdInput) fetchNextIdInput.checked = false;
        }

        // NEW: Restore Project Defaults (Path & Name)
        if (this.currentTemplate.projectDefaults) {
            const targetPathEl = document.getElementById('targetPath');
            const projectNameEl = document.getElementById('projectName');
            
            if (targetPathEl && this.currentTemplate.projectDefaults.targetPath !== undefined) {
                targetPathEl.value = this.currentTemplate.projectDefaults.targetPath;
                // Dispatch input event to update previews
                targetPathEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (projectNameEl && this.currentTemplate.projectDefaults.projectName !== undefined) {
                projectNameEl.value = this.currentTemplate.projectDefaults.projectName;
                projectNameEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        this.updateActionButtons();

        // NEW: Dispatch event for other modules (e.g. sidebarIntegration)
        window.dispatchEvent(new CustomEvent('templateSelected', {
            detail: { template: this.currentTemplate }
        }));

        console.log('✅ Template selected:', template.name);
    },

    // NEW: Parse and render folder structure into an HTML tree
    parseAndRenderFolderTree(structure) {
        if (!structure || structure.trim() === '') {
            return '<div class="empty-state">No structure defined</div>';
        }

        const lines = structure.split('\n').filter(line => line.trim().length > 0);
        
        let html = '<ul>';
        let currentIndent = -1;
        let indentStack = [];
        
        lines.forEach(line => {
            const spacesMatch = line.match(/^(\s*)/);
            const spaces = spacesMatch ? spacesMatch[0].length : 0;
            const name = line.trim();
            
            // Clean up trailing slashes
            const cleanName = name.replace(/\/$/, '');
            const isFile = cleanName.includes('.') && !cleanName.endsWith('/');
            const icon = isFile ? '📄' : '📁';

            if (currentIndent === -1) {
                // First item
                html += `<li><span class="folder-item"><span class="folder-icon">${icon}</span> ${this.escapeHtml(cleanName)}</span>`;
                indentStack.push(spaces);
                currentIndent = spaces;
            } else if (spaces > currentIndent) {
                // Child item
                html += `<ul><li><span class="folder-item"><span class="folder-icon">${icon}</span> ${this.escapeHtml(cleanName)}</span>`;
                indentStack.push(spaces);
                currentIndent = spaces;
            } else if (spaces === currentIndent) {
                // Sibling item
                html += `</li><li><span class="folder-item"><span class="folder-icon">${icon}</span> ${this.escapeHtml(cleanName)}</span>`;
            } else {
                // Ancestor item (dedent)
                while (indentStack.length > 0 && indentStack[indentStack.length - 1] > spaces) {
                    html += `</li></ul>`;
                    indentStack.pop();
                }
                html += `</li><li><span class="folder-item"><span class="folder-icon">${icon}</span> ${this.escapeHtml(cleanName)}</span>`;
                
                // Keep stack synchronized
                if (indentStack.length === 0 || indentStack[indentStack.length - 1] !== spaces) {
                    indentStack.push(spaces);
                }
                currentIndent = spaces;
            }
        });
        
        while (indentStack.length > 0) {
            html += `</li></ul>`;
            indentStack.pop();
        }
        
        return html;
    },

    // NEW: Get elabFTW Category from UI input
    getElabFTWCategoryFromUI() {
        const categoryInput = document.getElementById('elabftwProjectCategory');
        const categoryValue = categoryInput?.value?.trim();

        if (categoryValue && categoryValue !== '' && !isNaN(parseInt(categoryValue))) {
            return parseInt(categoryValue);
        }

        return null; // No specific category set
    },

    // NEW: Set elabFTW Category in UI when template is loaded
    setElabFTWCategoryInUI(category) {
        const categoryInput = document.getElementById('elabftwProjectCategory');
        if (categoryInput) {
            const val = category !== null && category !== undefined ? String(category) : '';
            if (categoryInput.tagName === 'SELECT' && val !== '') {
                const exists = Array.from(categoryInput.options).some(opt => opt.value === val);
                if (!exists) {
                    const option = document.createElement('option');
                    option.value = val;
                    option.textContent = `Template ID ${val} (Loading...)`;
                    categoryInput.appendChild(option);
                }
            }
            categoryInput.value = val;
            console.log(`📂 elabFTW category field set to: ${category}`);
        }
    },

    // NEW: Save current template with elabFTW category and project defaults
    async saveCurrentTemplateWithElabFTWCategory() {
        if (!this.currentTemplate) {
            console.warn('⚠️ No current template to save category to');
            return false;
        }

        if (!this.currentTemplate.isOwn) {
            console.log('ℹ️ Cannot save category to shared template');
            return false;
        }

        const elabftwCategory = this.getElabFTWCategoryFromUI();
        
        const fetchNextIdInput = document.getElementById('elabftwFetchNextId');
        const fetchNextId = fetchNextIdInput ? fetchNextIdInput.checked : false;

        const targetPathInput = document.getElementById('targetPath');
        const projectNameInput = document.getElementById('projectName');

        try {
            // Find the template index
            const templateIndex = this.templates.findIndex(t =>
                t.name === this.currentTemplate.name &&
                t.createdBy === this.currentTemplate.createdBy &&
                t.createdAt === this.currentTemplate.createdAt
            );

            if (templateIndex < 0) {
                throw new Error('Template not found for saving defaults');
            }

            // Create updated template
            const updatedTemplate = {
                ...this.currentTemplate,
                updatedAt: new Date().toISOString()
            };

            // Initialize integrations structure if needed
            if (!updatedTemplate.integrations) {
                updatedTemplate.integrations = {};
            }

            if (!updatedTemplate.integrations.elabftw || typeof updatedTemplate.integrations.elabftw !== 'object') {
                updatedTemplate.integrations.elabftw = {};
            }

            // Store category and fetchNextId in template
            updatedTemplate.integrations.elabftw.defaultCategory = elabftwCategory;
            updatedTemplate.integrations.elabftw.fetchNextId = fetchNextId;

            // Store project defaults
            if (!updatedTemplate.projectDefaults) {
                updatedTemplate.projectDefaults = {};
            }
            if (targetPathInput) updatedTemplate.projectDefaults.targetPath = targetPathInput.value;
            if (projectNameInput) updatedTemplate.projectDefaults.projectName = projectNameInput.value;

            // Update the template
            await this.update(templateIndex, updatedTemplate);
            this.currentTemplate = updatedTemplate;

            console.log(`✅ Template defaults saved to template "${this.currentTemplate.name}"`);
            return true;

        } catch (error) {
            console.error('❌ Error saving defaults to template:', error);
            return false;
        }
    },

    // Update action buttons
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

    // UPDATED: Add new template with immediate file storage

    async add(template) {
        console.log('➕ Adding template (fixed version):', template.name);

        try {
            // Prepare template with user context AND category
            const currentCategory = window.templateTypeManager ?
                window.templateTypeManager.currentType : 'category1';

            const enhancedTemplate = {
                ...template,
                id: template.id || `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                createdBy: window.userManager?.currentUser || 'Unknown',
                createdByGroup: window.userManager?.currentGroup || 'Unknown',
                createdAt: template.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                category: template.category || currentCategory  // NEW: Add category field
            };

            // Check for duplicates before adding
            const existing = this.templates.find(t =>
                t.name === enhancedTemplate.name &&
                t.createdBy === enhancedTemplate.createdBy &&
                t.type === enhancedTemplate.type
            );

            if (existing) {
                console.warn(`⚠️ Template "${enhancedTemplate.name}" already exists for user ${enhancedTemplate.createdBy}`);
                throw new Error(`Template "${enhancedTemplate.name}" already exists. Please choose a different name.`);
            }

            // Add to memory first
            this.templates.push(enhancedTemplate);

            // Save to file using the stable method
            if (window.storage && window.storage.saveTemplateToFileImmediately) {
                const saveResult = await window.storage.saveTemplateToFileImmediately(enhancedTemplate);

                if (saveResult.success) {
                    // Update template with file info
                    enhancedTemplate._fileInfo = {
                        filename: saveResult.filename,
                        filePath: saveResult.filePath,
                        savedAt: new Date().toISOString(),
                        source: 'file',
                        stable: true
                    };
                    console.log(`✅ Template "${enhancedTemplate.name}" saved to stable file`);
                } else {
                    console.error(`❌ Failed to save template to file: ${saveResult.message}`);
                    // Remove from memory if file save failed
                    const index = this.templates.indexOf(enhancedTemplate);
                    if (index >= 0) {
                        this.templates.splice(index, 1);
                    }
                    throw new Error(`Failed to save template: ${saveResult.message}`);
                }
            } else {
                console.warn('⚠️ File storage not available, template only in memory');
            }

            // Update UI
            this.invalidateCache();
            this.buildSearchIndex();
            this.renderList();
            this.updateTemplateInfo();

            console.log(`✅ Template "${enhancedTemplate.name}" added successfully`);
            return enhancedTemplate;

        } catch (error) {
            console.error('❌ Error adding template:', error);
            throw error;
        }
    },

    // UPDATED: Update template with immediate file storage (FIXED: Rename support)
    async update(index, updatedTemplate) {
        console.log('📝 Updating template (rename-aware version):', updatedTemplate.name);

        try {
            if (index < 0 || index >= this.templates.length) {
                throw new Error('Invalid template index');
            }

            const existingTemplate = this.templates[index];
            const oldTemplateName = existingTemplate.name;
            const newTemplateName = updatedTemplate.name;

            // ===== DETECT TEMPLATE RENAME =====
            const isRename = oldTemplateName !== newTemplateName;
            if (isRename) {
                console.log(`🏷️ Template rename detected: "${oldTemplateName}" -> "${newTemplateName}"`);
            }

            // Preserve original metadata but update content
            const finalTemplate = {
                ...updatedTemplate,
                id: existingTemplate.id,                    // Keep original ID
                createdBy: existingTemplate.createdBy,      // Keep original creator
                createdByGroup: existingTemplate.createdByGroup, // Keep original group
                createdAt: existingTemplate.createdAt,      // Keep original creation time
                updatedAt: new Date().toISOString(),        // Update modification time
                _fileInfo: existingTemplate._fileInfo       // Preserve file info (will be updated by storage)
            };

            // Update in memory first
            this.templates[index] = finalTemplate;

            // Save to file using stable method (will handle rename automatically)
            if (window.storage && window.storage.saveTemplateToFileImmediately) {
                const saveResult = await window.storage.saveTemplateToFileImmediately(finalTemplate);

                if (saveResult.success) {
                    // Update file info with new information from storage
                    finalTemplate._fileInfo = {
                        ...(finalTemplate._fileInfo || {}),
                        filename: saveResult.filename,
                        filePath: saveResult.filePath,
                        savedAt: new Date().toISOString(),
                        stable: true,
                        wasRenamed: saveResult.wasRenamed || false
                    };

                    if (saveResult.wasRenamed) {
                        console.log(`✅ Template renamed and saved: "${oldTemplateName}" -> "${newTemplateName}"`);
                    } else {
                        console.log(`✅ Template "${finalTemplate.name}" updated in file`);
                    }
                } else {
                    console.error(`❌ Failed to save updated template: ${saveResult.message}`);
                    // Revert memory change if file save failed
                    this.templates[index] = existingTemplate;
                    throw new Error(`Failed to update template: ${saveResult.message}`);
                }
            } else {
                console.warn('⚠️ File storage not available, template updated in memory only');
            }

            // ===== UPDATE CURRENT TEMPLATE IF IT'S THE ONE BEING EDITED =====
            if (this.currentTemplate &&
                this.currentTemplate.name === oldTemplateName &&
                this.currentTemplate.createdBy === finalTemplate.createdBy) {
                // Update the current template reference with the new name
                this.currentTemplate = finalTemplate;
                console.log(`🔄 Updated current template reference for: "${newTemplateName}"`);
            }

            // FORCE: Update selected index to point to the renamed template
            if (isRename && this.selectedIndex >= 0 && this.selectedIndex < this.templates.length) {
                const selectedTemplate = this.templates[this.selectedIndex];
                if (selectedTemplate && selectedTemplate.name === finalTemplate.name &&
                    selectedTemplate.createdBy === finalTemplate.createdBy) {
                    // Keep the same selectedIndex - it's still the same template
                    console.log(`🎯 Maintaining selection on renamed template at index: ${this.selectedIndex}`);
                }
            }

            // Update UI
            this.invalidateCache();
            this.buildSearchIndex();
            this.renderList();
            this.updateTemplateInfo();

            console.log(`✅ Template update completed: "${finalTemplate.name}"`);
            return finalTemplate;

        } catch (error) {
            console.error('❌ Error updating template:', error);
            throw error;
        }
    },


    // NEW: Clear template values (reset all field values to empty)
    clearCurrentTemplate() {
        if (!this.currentTemplate) {
            alert('No template selected to clear.');
            return;
        }

        if (!this.currentTemplate.isOwn) {
            alert('You can only clear your own templates. Please copy this template first.');
            return;
        }

        // NO CONFIRM - confirmation already handled by menu

        try {
            // Find template index
            const templateIndex = this.templates.findIndex(t =>
                t.name === this.currentTemplate.name &&
                t.createdBy === this.currentTemplate.createdBy &&
                t.createdAt === this.currentTemplate.createdAt
            );

            if (templateIndex < 0) {
                throw new Error('Template not found');
            }

            // Create deep copy and clear all values
            const clearedTemplate = this.createDeepCopy(this.templates[templateIndex]);

            // Clear values from metadata fields
            this.clearTemplateValues(clearedTemplate);

            // Clear project defaults
            if (clearedTemplate.projectDefaults) {
                clearedTemplate.projectDefaults = {};
            }

            clearedTemplate.updatedAt = new Date().toISOString();

            // Update template
            this.update(templateIndex, clearedTemplate);
            this.currentTemplate = clearedTemplate;

            // Refresh the form if it's showing
            if (document.getElementById('experimentForm').style.display !== 'none') {
                if (window.experimentForm && window.experimentForm.render) {
                    window.experimentForm.render(clearedTemplate.metadata);
                }
            }

            // Clear project paths in UI
            const targetPathEl = document.getElementById('targetPath');
            const projectNameEl = document.getElementById('projectName');
            if (targetPathEl) targetPathEl.value = '';
            if (projectNameEl) projectNameEl.value = '';

            alert(`✅ Template "${clearedTemplate.name}" has been cleared successfully!`);
            console.log('✅ Template values cleared successfully');

        } catch (error) {
            console.error('❌ Error clearing template:', error);
            alert('Error clearing template: ' + error.message);
        }
    },

    // NEW: Clear all values from template metadata
    clearTemplateValues(template) {
        if (!template.metadata) return;

        const clearFields = (fieldsObject) => {
            Object.keys(fieldsObject).forEach(fieldName => {
                const field = fieldsObject[fieldName];
                if (field && typeof field === 'object') {
                    if (field.type === 'group') {
                        // Skip groups
                        return;
                    }

                    // Clear the value based on field type
                    switch (field.type) {
                        case 'checkbox':
                            field.value = false;
                            break;
                        case 'number':
                            field.value = '';
                            break;
                        default:
                            field.value = '';
                    }
                }
            });
        };

        // Handle both enhanced and legacy metadata formats
        if (template.metadata.fields) {
            // Enhanced format
            clearFields(template.metadata.fields);
        } else {
            // Legacy format
            clearFields(template.metadata);
        }

        console.log('🧹 Template values cleared from metadata');
    },

    // NEW: Deep copy utility function for template operations
    createDeepCopy(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.createDeepCopy(item));
        }

        if (typeof obj === 'object') {
            const copy = {};
            Object.keys(obj).forEach(key => {
                copy[key] = this.createDeepCopy(obj[key]);
            });
            return copy;
        }

        return obj;
    },

    // NEW: Batch operations for file storage
    async saveAllTemplatesToFiles() {
        if (!window.storage || !window.storage.fileStorageEnabled) {
            console.warn('⚠️ File storage not available for batch save');
            return false;
        }

        try {
            console.log('💾 Starting batch save of all templates to files...');
            const userTemplates = this.templates.filter(t => !window.storage.isDefaultTemplate(t));

            let successCount = 0;
            for (const template of userTemplates) {
                const success = await window.storage.saveTemplateToFileImmediately(template);
                if (success) successCount++;
            }

            console.log(`✅ Batch save completed: ${successCount}/${userTemplates.length} templates saved`);
            return successCount === userTemplates.length;
        } catch (error) {
            console.error('❌ Error in batch save:', error);
            return false;
        }
    },

    // NEW: Force refresh from files
    async refreshFromFiles() {
        if (!window.storage || !window.storage.fileStorageEnabled) {
            console.warn('⚠️ File storage not available for refresh');
            return;
        }

        try {
            console.log('🔄 Refreshing templates from files...');
            this.templates = await this.loadTemplates();
            this.invalidateCache();
            this.buildSearchIndex();
            this.renderList();
            this.updateTemplateInfo();
            console.log('✅ Templates refreshed from files');
        } catch (error) {
            console.error('❌ Error refreshing from files:', error);
        }
    },
    // Edit current template
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

    // Delete current template (ROBUST VERSION - works even without _fileInfo)
    async deleteCurrent() {
        if (!this.currentTemplate || !this.currentTemplate.isOwn) {
            if (window.app && window.app.showError) {
                window.app.showError('You can only delete your own templates.');
            }
            return;
        }

        try {
            // Find template index
            const templateIndex = this.templates.findIndex(t =>
                t.name === this.currentTemplate.name &&
                t.createdBy === this.currentTemplate.createdBy &&
                t.createdAt === this.currentTemplate.createdAt
            );

            if (templateIndex < 0) {
                throw new Error('Template not found in list');
            }

            const templateToDelete = this.templates[templateIndex];

            // ===== ENHANCED CONFIRMATION DIALOG =====
            const confirmMessage = `⚠️ Delete Template: "${templateToDelete.name}"?\n\n` +
                `Type: ${templateToDelete.type === 'experiment' ? 'Experiment' : 'Folder'}\n` +
                `Created: ${templateToDelete.createdAt ? new Date(templateToDelete.createdAt).toLocaleDateString() : 'Unknown'}\n` +
                `Creator: ${templateToDelete.createdBy} (${templateToDelete.createdByGroup})\n` +
                `Storage: ${templateToDelete._fileInfo ? 'File' : 'Auto-detect'}\n\n` +
                `⚠️ This action cannot be undone!\n\n` +
                `Continue with deletion?`;

            if (!confirm(confirmMessage)) {
                console.log('🚫 Template deletion cancelled by user');
                return;
            }

            console.log(`🗑️ Deleting template: ${templateToDelete.name} by ${templateToDelete.createdBy}`);

            // ===== ROBUST FILE DELETION APPROACH =====
            let fileDeleteAttempted = false;
            let fileDeleteSuccessful = false;
            let deleteError = null;

            // METHOD 1: Use existing _fileInfo if available
            if (templateToDelete._fileInfo && templateToDelete._fileInfo.filePath && window.electronAPI.deleteTemplateFile) {
                try {
                    console.log(`🗂️ Method 1: Using existing _fileInfo: ${templateToDelete._fileInfo.filePath}`);
                    const deleteResult = await window.electronAPI.deleteTemplateFile(templateToDelete._fileInfo.filePath);
                    fileDeleteAttempted = true;

                    if (deleteResult.success) {
                        console.log(`✅ File deleted successfully via _fileInfo`);
                        fileDeleteSuccessful = true;
                    } else {
                        console.warn(`⚠️ Method 1 failed: ${deleteResult.message}`);
                        deleteError = deleteResult.message;
                    }
                } catch (error) {
                    console.warn('⚠️ Method 1 error:', error);
                    deleteError = error.message;
                }
            }

            // METHOD 2: Calculate expected file path and try to delete
            if (!fileDeleteSuccessful && window.storage && window.storage.generateStableTemplateFilename && window.electronAPI) {
                try {
                    console.log('🗂️ Method 2: Calculating expected file path...');
                    const expectedFilename = window.storage.generateStableTemplateFilename(templateToDelete);
                    console.log(`📁 Expected filename: ${expectedFilename}`);

                    // Get templates directory and calculate full path
                    const userInfo = {
                        username: templateToDelete.createdBy,
                        groupname: templateToDelete.createdByGroup
                    };

                    const dirResult = await window.electronAPI.getTemplatesDirectory(userInfo);
                    if (dirResult.success) {
                        const separator = dirResult.directory.includes('\\') ? '\\' : '/';
                        const calculatedPath = dirResult.directory + separator + expectedFilename;

                        console.log(`🗂️ Attempting to delete calculated path: ${calculatedPath}`);

                        const deleteResult = await window.electronAPI.deleteTemplateFile(calculatedPath);
                        fileDeleteAttempted = true;

                        if (deleteResult.success) {
                            console.log(`✅ File deleted successfully via calculated path`);
                            fileDeleteSuccessful = true;
                        } else {
                            console.warn(`⚠️ Method 2 failed: ${deleteResult.message}`);
                            if (!deleteError) deleteError = deleteResult.message;
                        }
                    } else {
                        console.warn(`⚠️ Could not get templates directory: ${dirResult.message}`);
                        if (!deleteError) deleteError = dirResult.message;
                    }
                } catch (error) {
                    console.warn('⚠️ Method 2 error:', error);
                    if (!deleteError) deleteError = error.message;
                }
            }

            // ===== HANDLE FILE DELETION RESULTS =====
            if (fileDeleteAttempted && !fileDeleteSuccessful && deleteError) {
                // File deletion was attempted but failed
                const continueMessage = `⚠️ File deletion failed: ${deleteError}\n\n` +
                    `The template file could not be deleted from the filesystem.\n` +
                    `This may happen if the file was already deleted manually\n` +
                    `or if there are permission issues.\n\n` +
                    `Do you want to remove the template from the list anyway?\n\n` +
                    `(You may need to delete the file manually later)`;

                if (!confirm(continueMessage)) {
                    console.log('🚫 Template deletion aborted due to file deletion failure');
                    return; // Cancel deletion if user doesn't want to continue
                }

                console.log('⚠️ Continuing with template deletion despite file deletion failure');
            } else if (!fileDeleteAttempted) {
                console.log('ℹ️ No file deletion attempted (template might be memory-only)');
            } else if (fileDeleteSuccessful) {
                console.log('✅ Template file deleted successfully');
            }

            // ===== REMOVE FROM MEMORY =====
            this.templates.splice(templateIndex, 1);
            console.log(`✅ Template removed from memory: ${templateToDelete.name}`);

            // ===== UI CLEANUP =====
            // Clear current selection
            this.currentTemplate = null;
            this.selectedIndex = -1;

            // Update UI
            this.invalidateCache();
            this.buildSearchIndex();
            this.renderList();
            this.updateTemplateInfo();

            // Hide template details
            const templateDetails = document.getElementById('templateDetails');
            if (templateDetails) {
                templateDetails.style.display = 'none';
            }

            // Success message
            const successMessage = fileDeleteSuccessful ?
                `Template "${templateToDelete.name}" and its file deleted successfully!` :
                `Template "${templateToDelete.name}" removed from list!`;

            if (window.app && window.app.showSuccess) {
                window.app.showSuccess(successMessage);
            }

            console.log(`✅ Template "${templateToDelete.name}" deletion completed`);

        } catch (error) {
            console.error('❌ Error deleting template:', error);

            // Enhanced error message for user
            let errorMessage = `Failed to delete template: ${error.message}`;

            if (error.message.includes('file') || error.message.includes('path')) {
                errorMessage += `\n\nThe template file may still exist on the filesystem.`;
            }

            if (window.app && window.app.showError) {
                window.app.showError(errorMessage);
            } else {
                alert(errorMessage);
            }
        }
    },

    // NEW: Validate template before operations to prevent "undefined" templates
    validateTemplateForOperation(template, operation = 'operation') {
        if (!template) {
            console.warn(`⚠️ ${operation} prevented: No template provided`);
            return false;
        }

        // NUR wirklich problematische Namen herausfiltern
        if (!template.name || template.name.trim() === '') {
            console.warn(`⚠️ ${operation} prevented: Empty template name`);
            return false;
        }

        // NUR Templates mit 'undefined' am Anfang herausfiltern (aber nicht "(Copy)" erlauben)
        if (template.name === 'undefined' || template.name.startsWith('undefined ')) {
            console.warn(`⚠️ ${operation} prevented: Invalid template name:`, template.name);
            return false;
        }

        // Templates mit 'Unknown' User sind OK wenn sie aus Dateien kommen
        // NUR komplett fehlende User-Info ist problematisch
        if (!template.createdBy) {
            console.warn(`⚠️ ${operation} prevented: Missing creator`);
            return false;
        }

        if (!template.createdByGroup) {
            console.warn(`⚠️ ${operation} prevented: Missing group`);
            return false;
        }

        // ALLES ANDERE IST OK - auch "Unknown" User sind erlaubt
        return true;
    },
    // ENHANCED: Update template list rendering to filter out invalid templates
    renderList() {
        const listContainer = document.getElementById('templateList');
        if (!listContainer) {
            console.warn('templateList element not found');
            return;
        }

        let filteredTemplates = this.getFilteredTemplates();
        const currentType = this.getCurrentType();

        // SANFTE FILTERUNG: Nur wirklich problematische Templates herausfiltern
        const validTemplates = filteredTemplates.filter(template => {
            // Nur wirklich ungültige Templates herausfiltern
            if (!template.name ||
                template.name === 'undefined' ||
                template.name.startsWith('undefined ')) {
                console.warn('🗑️ Filtering out problematic template:', template.name);
                return false;
            }
            return true; // ALLES ANDERE IST OK
        });

        // Use validTemplates instead of filteredTemplates for the rest of the function
        filteredTemplates = validTemplates;

        if (filteredTemplates.length === 0) {
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
                    <h3 style="color: #6b7280; margin-bottom: 0.5rem;">${typeLabel}</h3>
                    <p style="color: #9ca3af; margin-bottom: 1.5rem;">${emptyMessage}</p>
                    ${!this.searchState.isSearching ? `
                        <button onclick="document.getElementById('createTemplateBtn').click()" 
                                style="background: #8b5cf6; color: white; border: none; padding: 12px 24px; 
                                    border-radius: 8px; cursor: pointer; font-weight: 500;">
                            + Create ${currentType === 'folders' ? 'Folder' : 'Experiment'} Template
                        </button>
                    ` : ''}
                </div>
            `;
            this.updateTemplateInfo();
            return;
        }

        // CONTINUE with original renderList logic...
        listContainer.innerHTML = filteredTemplates.map((template, index) => {
            const badge = template.type === 'experiment' ?
                '<span class="template-badge experiment">🧪</span>' :
                '<span class="template-badge">📁</span>';

            const color = this.getUserColor(template.createdBy);
            const initials = this.getUserInitials(template.createdBy);
            const isSelected = this.selectedIndex === index;

            const createdDate = new Date(template.createdAt).toLocaleDateString();
            const updatedDate = template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : null;

            const displayName = this.searchState.isSearching ?
                this.highlightSearchMatches(template.name, this.searchState.query) :
                this.escapeHtml(template.name);

            const displayDescription = this.searchState.isSearching && template.description ?
                this.highlightSearchMatches(template.description, this.searchState.query) :
                (template.description ? this.escapeHtml(template.description) : '');

            // Storage indicator
            const storageIndicator = `
                <div class="storage-indicator ${template.storageType}" title="${template.storageDisplay}">
                    <span class="storage-icon">${template.storageIcon}</span>
                    <span class="storage-text">${template.storageDisplay}</span>
                </div>
            `;

            // Copy link for shared templates
            const copyLink = !template.isOwn && template.isShared ?
                `<div style="margin-top: 8px;">
                    <span class="copy-link" data-template-index="${index}" 
                        style="color: #10b981; font-size: 0.8rem; text-decoration: underline; cursor: pointer; font-weight: 500;">
                        📋 Copy to my templates
                    </span>
                </div>` : '';

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
                            ${storageIndicator}
                            ${copyLink}
                        </div>
                    </div>
                    ${template.isOwn ? `
                        <div class="owner-indicator" title="Your template"></div>
                    ` : ''}
                </div>
            `;
        }).join('');

        this.attachEventListeners();
        this.updateSearchStatus();
    },
    // ENHANCED: Validate template before setting as current
    selectTemplate(index) {
        if (index < 0 || index >= this.templates.length) {
            console.warn('Invalid template index:', index);
            return;
        }

        const template = this.templates[index];

        // VALIDATION: Check if template is valid before selecting
        if (!this.validateTemplateForOperation(template, 'selection')) {
            console.warn('⚠️ Template selection prevented: Invalid template');

            // Show error message to user
            const templateInfo = document.getElementById('templateInfo');
            if (templateInfo) {
                templateInfo.textContent = 'Invalid template - cannot select';
                templateInfo.className = 'template-info error';
            }

            return;
        }

        // Continue with original selectTemplate logic if validation passes...
        this.currentTemplate = template;
        this.selectedIndex = index;

        // Rest of original selectTemplate function...
    },

    // ENHANCED: Clean templates on load to remove any invalid ones
    async loadTemplates() {
        if (!window.storage) {
            console.warn('⚠️ Storage not available');
            return [];
        }

        try {
            const templates = await window.storage.loadTemplates();

            // NUR problematische Templates herausfiltern
            let filteredTemplates = templates;
            if (window.storage.storageMode === 'files') {
                filteredTemplates = templates.filter(template => {
                    // Nur wirklich problematische Templates herausfiltern
                    if (!template.name ||
                        template.name === 'undefined' ||
                        template.name.startsWith('undefined ')) {
                        console.log(`🗑️ Filtering out problematic template: "${template.name}"`);
                        return false;
                    }
                    return true; // ALLES ANDERE IST OK
                });
            }

            // Enhance each template with display properties
            const enhancedTemplates = filteredTemplates.map(template => this.enhanceTemplateWithStatus(template));

            console.log(`📂 Loaded ${enhancedTemplates.length} templates (filtered from ${templates.length})`);

            return enhancedTemplates;
        } catch (error) {
            console.error('❌ Error loading templates:', error);
            return [];
        }
    },

    // ENHANCED: Refresh function with error handling and UI updates (FIXED: Keep selection)
    async refresh() {
        console.log('🔄 Manually refreshing template manager...');

        // Remember current template for re-selection
        const currentTemplateName = this.currentTemplate?.name;
        const currentTemplateCreator = this.currentTemplate?.createdBy;

        try {
            // 1. Clear all caches
            this.invalidateCache();

            // 2. Reload own templates from storage
            this.templates = await this.loadTemplates();
            console.log(`📂 Reloaded ${this.templates.length} own templates`);

            // 3. Force update shared toggle visibility
            this.updateSharedToggleVisibility();

            // 4. Rebuild search index with fresh data
            this.buildSearchIndex();

            // 5. Re-render the list (will include group templates via getAllTemplates)
            this.renderList();

            // 6. Try to re-select the previously selected template (FIXED: Better matching)
            if (currentTemplateName && currentTemplateCreator) {
                const allTemplates = this.getAllTemplates();

                // Try multiple strategies to find the template
                let templateIndex = -1;

                // Strategy 1: Exact name and creator match
                templateIndex = allTemplates.findIndex(t =>
                    t.name === currentTemplateName && t.createdBy === currentTemplateCreator
                );

                // Strategy 2: If renamed, try with original name from memory
                if (templateIndex < 0 && this.currentTemplate && this.currentTemplate.id) {
                    templateIndex = allTemplates.findIndex(t => t.id === this.currentTemplate.id);
                }

                // Strategy 3: Fuzzy match by similar name (for renames)
                if (templateIndex < 0) {
                    const nameLower = currentTemplateName.toLowerCase();
                    templateIndex = allTemplates.findIndex(t =>
                        t.createdBy === currentTemplateCreator &&
                        (t.name.toLowerCase().includes(nameLower.substring(0, 10)) ||
                            nameLower.includes(t.name.toLowerCase().substring(0, 10)))
                    );
                }

                if (templateIndex >= 0) {
                    const foundTemplate = allTemplates[templateIndex];
                    console.log(`🎯 Re-selecting template: ${foundTemplate.name} (was: ${currentTemplateName})`);
                    this.select(templateIndex);
                } else {
                    console.log(`⚠️ Could not re-select template "${currentTemplateName}" - not found`);
                    // Clear selection if template no longer exists
                    this.currentTemplate = null;
                    this.selectedIndex = -1;
                    this.updateTemplateInfo();
                }
            } else {
                // 7. Update template info if no template was selected
                this.updateTemplateInfo();
            }

            console.log('✅ Template manager refresh completed');

        } catch (error) {
            console.error('❌ Error during template refresh:', error);

            // Show error to user if possible
            if (window.app && window.app.showError) {
                window.app.showError('Template refresh failed: ' + error.message);
            }
        }
    },

    // FORCE REFRESH with Group Template Re-sharing (neue Funktion hinzufügen)
    async forceRefreshWithGroupSync() {
        console.log('🔄 Force refreshing with group synchronization...');

        try {
            // 1. Normal refresh first
            await this.refresh();

            // 2. Force re-share current user templates to group storage
            if (window.storage && typeof window.storage.saveToGroupStorage === 'function') {
                const userTemplates = this.templates.filter(t => !window.storage.isDefaultTemplate?.(t));
                if (userTemplates.length > 0) {
                    window.storage.saveToGroupStorage(userTemplates);
                    console.log(`🤝 Re-shared ${userTemplates.length} templates to group storage`);
                }
            }

            // 3. Clear cache again to force reload of group templates
            this.invalidateCache();

            // 4. Final render
            this.renderList();
            this.updateTemplateInfo();

            console.log('✅ Force refresh with group sync completed');

        } catch (error) {
            console.error('❌ Error during force refresh:', error);
        }
    },

    // Add these new functions to templateManager.js

    // NEW: Force cleanup of localStorage templates and reload from files only
    async forceCleanupAndReload() {
        try {
            console.log('🧹 Starting template cleanup and reload...');

            // Show loading indicator
            this.showLoadingState();

            // Use storage cleanup function
            if (window.storage && window.storage.forceCleanReload) {
                this.templates = await window.storage.forceCleanReload();
            } else {
                console.warn('⚠️ Storage cleanup not available');
                this.templates = await this.loadTemplates();
            }

            // Update UI
            this.invalidateCache();
            this.buildSearchIndex();
            this.renderList();
            this.updateTemplateInfo();

            console.log(`✅ Template cleanup completed. Now showing ${this.templates.length} templates.`);

            // Show success message
            this.showCleanupSuccessMessage(this.templates.length);

        } catch (error) {
            console.error('❌ Error during template cleanup:', error);
            this.showErrorMessage('Cleanup failed: ' + error.message);
        }
    },

    // NEW: Show loading state during cleanup
    showLoadingState() {
        const container = document.getElementById('templatesContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading-state" style="text-align: center; padding: 40px;">
                    <div style="font-size: 24px; margin-bottom: 10px;">🧹</div>
                    <div>Cleaning up templates...</div>
                    <div style="font-size: 14px; color: #666; margin-top: 10px;">
                        Removing localStorage duplicates
                    </div>
                </div>
            `;
        }
    },

    // NEW: Show cleanup success message
    showCleanupSuccessMessage(templateCount) {
        const message = `✅ Templates cleaned! Now showing ${templateCount} file-based templates only.`;

        // Try to use existing notification system
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else if (window.enhancedActions && window.enhancedActions.showNotification) {
            window.enhancedActions.showNotification(message, 'success');
        } else {
            // Fallback: console + temporary div
            console.log(message);
            this.showTemporaryMessage(message, 'success');
        }
    },

    // NEW: Show temporary message overlay
    showTemporaryMessage(message, type = 'info') {
        // Create temporary message element
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
            border-radius: 4px;
            padding: 12px 20px;
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            max-width: 300px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        messageEl.textContent = message;

        document.body.appendChild(messageEl);

        // Remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 5000);
    },

    // NEW: Check for localStorage templates and offer cleanup
    async checkForLocalStorageTemplates() {
        try {
            // Only check if we're in files mode
            if (!window.storage || window.storage.storageMode !== 'files') {
                return false;
            }

            // Check if localStorage contains any template data
            let hasLocalStorageTemplates = false;
            const keysToCheck = [
                'folderTemplates',
                'experimentTemplates',
                window.storage.getStorageKey('templates')
            ];

            keysToCheck.forEach(key => {
                if (localStorage.getItem(key)) {
                    hasLocalStorageTemplates = true;
                }
            });

            // Also check for any metafold_ or group keys
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('metafold_') || key.includes('_group_')) && key.includes('templates')) {
                    hasLocalStorageTemplates = true;
                    break;
                }
            }

            if (hasLocalStorageTemplates) {
                console.log('⚠️ Found localStorage templates in files-only mode');
                this.showCleanupPrompt();
                return true;
            }

            return false;
        } catch (error) {
            console.warn('Error checking localStorage templates:', error);
            return false;
        }
    },

    // NEW: Show cleanup prompt to user
    showCleanupPrompt() {
        const promptHtml = `
            <div class="cleanup-prompt" style="
                background: #fff3cd; 
                border: 1px solid #ffeaa7; 
                border-radius: 4px; 
                padding: 15px; 
                margin: 10px 0;
                position: relative;
            ">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">🧹</span>
                    <div>
                        <strong>Duplicate Templates Detected</strong>
                        <div style="font-size: 14px; color: #856404; margin-top: 5px;">
                            Old localStorage templates found. Clean them up to remove duplicates?
                        </div>
                    </div>
                </div>
                <div style="margin-top: 10px; display: flex; gap: 10px;">
                    <button onclick="window.templateManager.forceCleanupAndReload()" 
                            style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        🧹 Clean Up Now
                    </button>
                    <button onclick="document.querySelector('.cleanup-prompt').style.display='none'" 
                            style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        Later
                    </button>
                </div>
            </div>
        `;

        // Insert prompt at the top of templates container
        const container = document.getElementById('templatesContainer');
        if (container) {
            const promptEl = document.createElement('div');
            promptEl.innerHTML = promptHtml;
            container.insertBefore(promptEl, container.firstChild);
        }
    },

    // ENHANCED: Modified init function to check for cleanup needs
    async init() {
        console.log('🔄 Initializing template manager...');

        try {
            // Load templates
            this.templates = await this.loadTemplates();

            // Check for localStorage cleanup needs
            await this.checkForLocalStorageTemplates();

            // Continue with normal initialization
            this.filteredTemplates = [...this.templates];
            this.initializeSearchState();
            await this.loadSharedTemplatesPreference();
            this.renderList();
            this.updateTemplateInfo();
            this.updateSharedToggleVisibility();

            console.log(`✅ Template manager initialized with ${this.templates.length} templates`);
        } catch (error) {
            console.error('❌ Error initializing template manager:', error);
            this.showErrorMessage('Failed to initialize templates: ' + error.message);
        }
    },

    // ENHANCED: Modified loadTemplates to filter out Unknown templates
    async loadTemplates() {
        console.log('📂 Loading templates (fixed version)...');

        try {
            let templates = [];

            // Use the new file-only loading method
            if (window.storage && window.storage.loadTemplates) {
                templates = await window.storage.loadTemplates();
                console.log(`📂 Loaded ${templates.length} templates from storage`);
            } else {
                console.warn('⚠️ No storage method available');
                return [];
            }

            // Filter out problematic templates
            const validTemplates = templates.filter(template => {
                // Basic validation
                if (!template.name || template.name === 'undefined') {
                    console.log(`🗑️ Filtering out invalid template: ${template.name}`);
                    return false;
                }

                return true;
            });

            // Enhance templates with display properties
            const enhancedTemplates = validTemplates.map(template => this.enhanceTemplateWithStatus(template));

            console.log(`📂 Loaded ${enhancedTemplates.length} valid templates (filtered from ${templates.length})`);
            return enhancedTemplates;

        } catch (error) {
            console.error('❌ Error loading templates:', error);
            return [];
        }
    },




    /**
     * MIGRATION: Migrate old templates to category system
     * Converts old 'type' field to 'category' field
     */
    async migrateOldTemplatesToCategories() {
        console.log('🔄 Migrating old templates to category system...');

        let migratedCount = 0;
        let changed = false;

        for (let i = 0; i < this.templates.length; i++) {
            const template = this.templates[i];

            // Check if template has old 'type' field but no 'category' field
            if (!template.category && template.type) {
                // Migrate based on old type
                if (template.type === 'experiment') {
                    template.category = 'category2'; // Sub-Project
                } else {
                    template.category = 'category1'; // Main-Project
                }

                migratedCount++;
                changed = true;
                console.log(`🔄 Migrated template "${template.name}" to category ${template.category}`);
            } else if (!template.category) {
                // No type and no category - default to category1
                template.category = 'category1';
                migratedCount++;
                changed = true;
            }
        }

        if (changed) {
            // Save migrated templates
            if (window.storage) {
                await window.storage.saveTemplates(this.templates);
            }

            console.log(`✅ Migration completed: ${migratedCount} templates migrated`);

            // Refresh UI
            this.invalidateCache();
            this.buildSearchIndex();
            this.renderList();
        } else {
            console.log('ℹ️ No migration needed - all templates have categories');
        }

        return migratedCount;
    }

};

window.templateManager = templateManager;
console.log('✅ Template manager loaded with file storage support');