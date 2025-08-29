// Template Manager with File Storage Integration and Auto-Refresh Support

const templateManager = {
    templates: [],
    currentTemplate: null,
    selectedIndex: -1,
    allTemplates: [],
    
    // Auto-refresh properties
    autoRefreshInterval: null,
    
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

    // ENHANCED: Initialize template manager with auto-refresh
    async init() {
        console.log('🔄 Initializing template manager...');
        
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
            await this.renderList(); // FIXED: await async renderList
            this.updateTemplateInfo();
            
            // Check if migration notice should be shown
            this.checkMigrationNotice();
            
            // Build search index after templates are loaded
            setTimeout(async () => { // FIXED: async timeout
                console.log('📊 Building initial search index...');
                await this.buildSearchIndex(); // FIXED: await async buildSearchIndex
                console.log(`✅ Initial search index built with ${this.searchState.searchIndex.size} entries`);
            }, 100);
            
            // Start auto-refresh for file changes
            setTimeout(() => {
                this.startAutoRefresh();
            }, 2000);
            
            console.log('✅ templateManager initialized with', this.templates.length, 'templates');
        } catch (error) {
            console.error('❌ Error in templateManager.init:', error);
            this.templates = [];
            this.initializeSearchState();
            await this.renderList(); // FIXED: await async renderList
        }
    },

    // NEW: Auto-refresh templates from files
    async startAutoRefresh() {
        if (!window.storage || !window.storage.fileStorageEnabled) {
            return;
        }
        
        console.log('🔄 Starting auto-refresh for templates...');
        
        // Check for new templates every 5 seconds
        this.autoRefreshInterval = setInterval(async () => {
            try {
                await this.checkForNewTemplates();
            } catch (error) {
                console.warn('⚠️ Auto-refresh check failed:', error);
            }
        }, 5000);
        
        console.log('✅ Auto-refresh started');
    },

    // NEW: Stop auto-refresh
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            console.log('🔄 Auto-refresh stopped');
        }
    },

    // NEW: Check for new templates in file system
    async checkForNewTemplates() {
        if (!window.storage || !window.storage.fileStorageEnabled) {
            return;
        }
        
        try {
            // Get current template count
            const currentCount = this.templates.length;
            
            // Load fresh templates from files
            const freshTemplates = await window.storage.loadTemplates();
            
            // Compare counts
            if (freshTemplates.length !== currentCount) {
                console.log(`📂 Template count changed: ${currentCount} → ${freshTemplates.length}`);
                
                // Update templates
                this.templates = freshTemplates;
                this.invalidateCache();
                this.buildSearchIndex();
                this.renderList();
                this.updateTemplateInfo();
                
                // Show notification
                this.showAutoRefreshNotification(freshTemplates.length, currentCount);
            }
            
            // Also check for modified templates
            await this.checkForModifiedTemplates();
            
        } catch (error) {
            console.warn('⚠️ Error checking for new templates:', error);
        }
    },

    // NEW: Check for modified templates
    async checkForModifiedTemplates() {
        if (!window.storage || !window.storage.fileStorageEnabled) {
            return;
        }
        
        try {
            let hasChanges = false;
            
            // Check each template's file modification time
            for (const template of this.templates) {
                if (template._fileInfo && template._fileInfo.filePath) {
                    // This would require a new IPC call to check file modification time
                    // For now, we'll skip this feature
                }
            }
            
            if (hasChanges) {
                console.log('📄 Template files modified, refreshing...');
                await this.refreshFromFiles();
            }
            
        } catch (error) {
            console.warn('⚠️ Error checking for modified templates:', error);
        }
    },

    // NEW: Show auto-refresh notification
    showAutoRefreshNotification(newCount, oldCount) {
        const diff = newCount - oldCount;
        let message = '';
        
        if (diff > 0) {
            message = `📂 ${diff} new template${diff > 1 ? 's' : ''} detected and loaded!`;
        } else if (diff < 0) {
            message = `📂 ${Math.abs(diff)} template${Math.abs(diff) > 1 ? 's' : ''} removed from files.`;
        } else {
            message = '📂 Templates refreshed from files.';
        }
        
        // Show notification
        if (this.showTemporaryMessage) {
            this.showTemporaryMessage(message, 'info');
        } else {
            console.log('🔔 ' + message);
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

    // ENHANCED: Manual refresh with file reload
    async refresh() {
        console.log('🔄 Manually refreshing template manager...');
        
        try {
            // Reload templates from files
            this.templates = await this.loadTemplates();
            
            // Update UI
            this.invalidateCache();
            this.buildSearchIndex();
            this.updateSharedToggleVisibility();
            this.renderList();
            this.updateTemplateInfo();
            
            // Show success message
            this.showTemporaryMessage('✅ Templates refreshed from files!', 'success');
            
            console.log(`✅ Refresh completed with ${this.templates.length} templates`);
        } catch (error) {
            console.error('❌ Error refreshing templates:', error);
            this.showTemporaryMessage('❌ Failed to refresh templates', 'error');
        }
    },

    // Load templates with file storage support
    async loadTemplates() {
        if (!window.storage) {
            console.warn('⚠️ Storage not available');
            return [];
        }

        try {
            const templates = await window.storage.loadTemplates();
            
            // Filter out templates with problematic names
            const validTemplates = templates.filter(template => {
                // Nur wirklich ungültige Templates herausfiltern
                if (!template.name || 
                    template.name === 'undefined' || 
                    template.name.startsWith('undefined ')) {
                    console.warn('🗑️ Filtering out problematic template:', template.name);
                    return false;
                }
                return true;
            });
            
            // Enhance each template with display properties
            const enhancedTemplates = validTemplates.map(template => this.enhanceTemplateWithStatus(template));
            
            console.log(`📂 Loaded ${enhancedTemplates.length} templates (filtered from ${templates.length})`);
            
            return enhancedTemplates;
        } catch (error) {
            console.error('❌ Error loading templates:', error);
            return [];
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

    // Check and show migration notice if needed
    checkMigrationNotice() {
        if (window.storage && window.storage.shouldShowMigrationNotice()) {
            this.showMigrationNotice();
        }
    },

    // Show migration notice
    showMigrationNotice() {
        const noticeDiv = document.getElementById('migrationNotice');
        if (noticeDiv) {
            noticeDiv.innerHTML = `
                <div class="migration-notice">
                    <div class="migration-icon">📦</div>
                    <div class="migration-content">
                        <h4>Template Storage Migration Available</h4>
                        <p>You have templates stored in your browser that can be migrated to secure file storage.</p>
                        <button onclick="templateManager.migrateTemplates()" class="btn-primary">
                            Migrate Templates
                        </button>
                        <button onclick="templateManager.dismissMigrationNotice()" class="btn-secondary">
                            Dismiss
                        </button>
                    </div>
                </div>
            `;
            noticeDiv.style.display = 'block';
        }
    },

    // Migrate templates to file storage
    async migrateTemplates() {
        if (!window.storage) return;
        
        try {
            const result = await window.storage.migrateToFileStorage();
            
            if (result.success) {
                // Reload templates
                this.templates = await this.loadTemplates();
                this.invalidateCache();
                this.renderList();
                
                // Hide notice
                this.dismissMigrationNotice();
                
                if (window.app && window.app.showSuccess) {
                    window.app.showSuccess(result.message);
                }
            } else {
                if (window.app && window.app.showError) {
                    window.app.showError(result.message);
                }
            }
        } catch (error) {
            console.error('Migration failed:', error);
            if (window.app && window.app.showError) {
                window.app.showError('Migration failed: ' + error.message);
            }
        }
    },

    // Dismiss migration notice
    dismissMigrationNotice() {
        const noticeDiv = document.getElementById('migrationNotice');
        if (noticeDiv) {
            noticeDiv.style.display = 'none';
        }
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
    toggleSharedTemplates() {
        const checkbox = document.getElementById('showSharedTemplates');
        if (!checkbox) return;

        this.searchState.showSharedTemplates = checkbox.checked;
        console.log('🤝 Shared templates toggle:', this.searchState.showSharedTemplates);
        
        this.searchState.searchCache.clear();
        
        this.renderList();
        this.updateSearchStatus();
    },

    async getFilteredTemplates() {
        let templates;

        if (this.searchState.isSearching) {
            templates = this.searchState.results;
        } else {
            // FIXED: Await getAllTemplates since it's now async
            templates = await this.getAllTemplates();
            
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
        return 'folders';
    },

    async getAllTemplates() {
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
        
        const ownTemplates = this.templates.filter(t => 
            (currentType === 'folders' && t.type !== 'experiment') ||
            (currentType === 'experiments' && t.type === 'experiment')
        );

        // FIXED: Proper async handling for group templates
        let groupTemplates = [];
        try {
            const currentGroup = window.userManager?.currentGroup;
            if (window.storage && window.storage.loadGroupTemplates && currentGroup && currentGroup !== 'Unknown') {
                // FIXED: Await the Promise and handle it properly
                const groupTemplateResult = await window.storage.loadGroupTemplates(currentGroup);
                
                // Ensure we have an array
                if (Array.isArray(groupTemplateResult)) {
                    groupTemplates = groupTemplateResult.filter(t => 
                        ((currentType === 'folders' && t.type !== 'experiment') ||
                        (currentType === 'experiments' && t.type === 'experiment')) &&
                        t.createdBy !== window.userManager?.currentUser &&
                        t.createdBy !== 'System'
                    );
                } else {
                    console.warn('loadGroupTemplates did not return an array:', groupTemplateResult);
                    groupTemplates = [];
                }
            }
        } catch (error) {
            console.warn('Could not load group templates:', error);
            groupTemplates = [];
        }

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
        
        this.updateSharedToggleVisibility();
        
        return this.allTemplates;
    },

    // WICHTIG: buildSearchIndex muss auch async werden da es getAllTemplates aufruft
    async buildSearchIndex() {
        console.log('🔍 Building search index...');
        this.searchState.searchIndex.clear();
        
        // FIXED: Await getAllTemplates since it's now async
        const allTemplates = await this.getAllTemplates();
        
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
    async renderList() {
        const listContainer = document.getElementById('templateList');
        if (!listContainer) {
            console.warn('templateList element not found');
            return;
        }

        // FIXED: Await getFilteredTemplates since it's now async
        const filteredTemplates = await this.getFilteredTemplates();
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

        // Rest der Funktion bleibt gleich...
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

        this.selectedIndex = index;
        this.currentTemplate = template;
        
        this.renderList();
        this.updateTemplateInfo();
        
        const detailsElement = document.getElementById('templateDetails');
        if (detailsElement) {
            detailsElement.style.display = 'block';
        }
        
        const preview = document.getElementById('folderPreview');
        if (preview) {
            const structure = this.currentTemplate.structure || 'No structure defined';
            preview.textContent = structure;
        }
        
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
        
        this.updateActionButtons();
        
        console.log('✅ Template selected:', template.name);
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
        console.log('➕ Adding template with immediate file storage:', template);
        
        const enhancedTemplate = {
            ...template,
            createdBy: window.userManager?.currentUser || 'Unknown',
            createdByGroup: window.userManager?.currentGroup || 'Unknown',
            createdAt: new Date().toISOString()
        };
        
        // Add to memory array first
        this.templates.push(enhancedTemplate);
        
        // NEW: Immediately save to file if file storage is available
        if (window.storage && window.storage.fileStorageEnabled) {
            const saveSuccess = await window.storage.saveTemplateToFileImmediately(enhancedTemplate);
            if (saveSuccess) {
                console.log(`✅ Template "${enhancedTemplate.name}" saved immediately to file`);
            } else {
                console.warn(`⚠️ Failed to save template "${enhancedTemplate.name}" to file - keeping in memory`);
            }
        } else {
            // Fallback: Save all templates (browser mode)
            if (window.storage) {
                const saved = await window.storage.saveTemplates(this.templates);
                console.log('💾 Save result (fallback):', saved);
            }
        }
        
        this.invalidateCache();
        this.buildSearchIndex();
        
        this.renderList();
        this.updateTemplateInfo();
        console.log('✅ Template added successfully with file storage');
    },

    // UPDATED: Update template with immediate file storage
    async update(index, template) {
        if (index >= 0 && index < this.templates.length) {
            const existingTemplate = this.templates[index];
            const updatedTemplate = {
                ...template,
                createdBy: existingTemplate.createdBy,
                createdByGroup: existingTemplate.createdByGroup,
                createdAt: existingTemplate.createdAt,
                updatedAt: new Date().toISOString(),
                _fileInfo: existingTemplate._fileInfo // Preserve file info
            };
            
            // Update in memory
            this.templates[index] = updatedTemplate;
            
            // NEW: Immediately save to file if file storage is available
            if (window.storage && window.storage.fileStorageEnabled) {
                const saveSuccess = await window.storage.saveTemplateToFileImmediately(updatedTemplate);
                if (saveSuccess) {
                    console.log(`✅ Template "${updatedTemplate.name}" updated and saved to file`);
                } else {
                    console.warn(`⚠️ Failed to save updated template "${updatedTemplate.name}" to file`);
                }
            } else {
                // Fallback: Save all templates (browser mode)
                if (window.storage) {
                    await window.storage.saveTemplates(this.templates);
                }
            }
            
            this.invalidateCache();
            this.buildSearchIndex();
            
            this.renderList();
            this.updateTemplateInfo();
            console.log('✅ Template updated with file storage:', template.name);
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

    // Delete current template
    async deleteCurrent() {
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
                // If template has file, delete file too
                if (this.templates[index]._fileInfo && this.templates[index]._fileInfo.filePath) {
                    try {
                        await window.electronAPI.deleteTemplateFile(this.templates[index]._fileInfo.filePath);
                    } catch (error) {
                        console.warn('Could not delete template file:', error);
                    }
                }
                
                this.templates.splice(index, 1);
                
                if (window.storage) {
                    await window.storage.saveTemplates(this.templates);
                }
                
                this.invalidateCache();
                this.buildSearchIndex();
                
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
    }
};

window.templateManager = templateManager;
console.log('✅ Template manager loaded with auto-refresh support');