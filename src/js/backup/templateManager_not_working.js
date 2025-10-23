// Template Manager with enhanced file storage support and validation

const templateManager = {
    templates: [],
    filteredTemplates: [],
    currentTemplate: null,
    selectedIndex: -1,
    searchState: {
        query: '',
        isSearching: false,
        showSharedTemplates: false,
        searchIndex: new Map(),
        suggestions: [],
        cache: new Map()
    },
    autoRefreshInterval: null,

    // Initialize template manager
    async init() {
        console.log('🔧 Initializing template manager...');
        
        try {
            // Initialize storage first
            if (window.storage && window.storage.initFileStorage) {
                await window.storage.initFileStorage();
            }
            
            // Load templates with error handling
            this.templates = await this.loadTemplates();
            
            // Continue with normal initialization
            this.filteredTemplates = [...this.templates];
            this.initializeSearchState();
            this.renderList();
            this.updateTemplateInfo();
            this.updateSharedToggleVisibility();
            
            console.log(`✅ Template manager initialized with ${this.templates.length} templates`);
            
            // Show debug info
            if (this.templates.length === 0) {
                console.warn('⚠️ No templates loaded - checking storage status...');
                if (window.storage) {
                    const stats = window.storage.getStorageStats ? window.storage.getStorageStats() : {};
                    console.log('📊 Storage stats:', stats);
                }
            }
        } catch (error) {
            console.error('❌ Error initializing template manager:', error);
            this.showErrorMessage('Failed to initialize templates: ' + error.message);
            
            // Fallback: show empty state
            this.templates = [];
            this.filteredTemplates = [];
            this.renderList();
        }
    },

    // ENHANCED: Load templates with better validation and fallbacks
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
            
            // Show storage breakdown for debugging
            const storageBreakdown = enhancedTemplates.reduce((acc, t) => {
                const type = t.storageType || 'unknown';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
            console.log('📊 Storage breakdown:', storageBreakdown);
            
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
        template.isOwn = template.createdBy === (window.userManager?.currentUser || 'Unknown');
        template.userColor = this.getUserColor(template.createdBy);
        template.userInitials = this.getUserInitials(template.createdBy);
        
        return template;
    },

    // ENHANCED: Manual refresh with file reload
    async refresh() {
        console.log('🔄 Manually refreshing template manager...');
        
        try {
            // Force reload from files if file storage is enabled
            if (window.storage && window.storage.fileStorageEnabled) {
                console.log('📁 Refreshing from files...');
                await window.storage.refreshTemplatesFromFiles();
            }
            
            // Reload templates
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

    // NEW: Force refresh from files only
    async refreshFromFiles() {
        if (!window.storage || !window.storage.fileStorageEnabled) {
            console.warn('⚠️ File storage not available for refresh');
            this.showTemporaryMessage('⚠️ File storage not available', 'warning');
            return;
        }

        try {
            console.log('🔄 Refreshing templates from files...');
            
            // Use the new force reload function
            if (window.storage.forceCleanReload) {
                this.templates = await window.storage.forceCleanReload();
            } else {
                this.templates = await this.loadTemplates();
            }
            
            this.invalidateCache();
            this.buildSearchIndex();
            this.renderList();
            this.updateTemplateInfo();
            
            this.showTemporaryMessage(`✅ Loaded ${this.templates.length} templates from files!`, 'success');
            console.log('✅ Templates refreshed from files');
        } catch (error) {
            console.error('❌ Error refreshing from files:', error);
            this.showTemporaryMessage('❌ Failed to refresh from files', 'error');
        }
    },

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
            
            console.log(`✅ Template cleanup completed. Now showing ${this.templates.length} templates`);
            
            this.showTemporaryMessage(`🧹 Cleanup complete! ${this.templates.length} templates loaded`, 'success');
            
        } catch (error) {
            console.error('❌ Error during cleanup and reload:', error);
            this.showTemporaryMessage('❌ Cleanup failed', 'error');
        }
    },

    // Show loading state
    showLoadingState() {
        const listContainer = document.getElementById('templateList');
        if (listContainer) {
            listContainer.innerHTML = `
                <div class="loading-state" style="text-align: center; padding: 40px; color: #6b7280;">
                    <div style="font-size: 24px; margin-bottom: 10px;">⏳</div>
                    <div>Loading templates...</div>
                </div>
            `;
        }
    },

    // Show error message
    showErrorMessage(message) {
        const listContainer = document.getElementById('templateList');
        if (listContainer) {
            listContainer.innerHTML = `
                <div class="error-state" style="text-align: center; padding: 40px; color: #ef4444;">
                    <div style="font-size: 24px; margin-bottom: 10px;">❌</div>
                    <div>${message}</div>
                    <button onclick="templateManager.refresh()" 
                            style="margin-top: 15px; padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Try Again
                    </button>
                </div>
            `;
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

    // ENHANCED: Validate template before setting as current
    selectTemplate(index) {
        if (index < 0 || index >= this.filteredTemplates.length) {
            console.warn('Invalid template index:', index);
            return;
        }

        const template = this.filteredTemplates[index];
        
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
        
        // Update UI
        this.updateTemplateInfo();
        this.renderList(); // Re-render to update selection styling
        
        // Auto-load template into forms
        this.loadTemplateIntoForms(template);
        
        console.log('✅ Template selected:', template.name);
    },

    // Load template into forms
    loadTemplateIntoForms(template) {
        // Load into folder structure if it's a folder template
        if (template.type !== 'experiment' && template.structure) {
            const structureTextarea = document.getElementById('folderStructure');
            if (structureTextarea) {
                structureTextarea.value = template.structure;
            }
        }
        
        // Load into experiment form if it's an experiment template
        if (template.type === 'experiment') {
            if (template.structure) {
                const expStructureTextarea = document.getElementById('experimentStructure');
                if (expStructureTextarea) {
                    expStructureTextarea.value = template.structure;
                }
            }
            
            if (template.metadata && window.experimentForm) {
                window.experimentForm.render(template.metadata);
            }
        }
        
        // Update create button to show template name
        this.updateCreateButton(template);
    },

    // Update create button text
    updateCreateButton(template) {
        const createBtn = document.getElementById('createProjectBtn');
        if (createBtn && template) {
            createBtn.textContent = `Create "${template.name}"`;
            createBtn.disabled = false;
        }
    },

    // Initialize search functionality
    initializeSearchState() {
        this.buildSearchIndex();
        this.setupSearchEventListeners();
    },

    // Build search index for fast searching
    buildSearchIndex() {
        console.log('🔍 Building search index...');
        this.searchState.searchIndex.clear();
        
        this.templates.forEach((template, index) => {
            const searchableText = [
                template.name || '',
                template.description || '',
                template.createdBy || '',
                template.createdByGroup || '',
                template.type || '',
                Object.keys(template.metadata || {}).join(' ')
            ].join(' ').toLowerCase();
            
            this.searchState.searchIndex.set(index, searchableText);
        });
        
        console.log(`🔍 Search index built with ${this.searchState.searchIndex.size} entries`);
    },

    // Setup search event listeners
    setupSearchEventListeners() {
        const searchInput = document.getElementById('templateSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
            searchInput.addEventListener('focus', () => this.showSearchSuggestions());
            searchInput.addEventListener('blur', () => this.hideSearchSuggestions());
        }
    },

    // Handle search input
    handleSearch(query) {
        this.searchState.query = query.trim();
        this.searchState.isSearching = this.searchState.query.length > 0;
        
        if (this.searchState.isSearching) {
            this.performSearch();
            this.generateSearchSuggestions();
        } else {
            this.clearSearch();
        }
        
        this.renderList();
        this.updateSearchStatus();
    },

    // Perform search
    performSearch() {
        const query = this.searchState.query.toLowerCase();
        const matchingIndices = [];
        
        this.searchState.searchIndex.forEach((searchableText, index) => {
            if (searchableText.includes(query)) {
                matchingIndices.push(index);
            }
        });
        
        this.filteredTemplates = matchingIndices.map(index => this.templates[index]);
        console.log(`🔍 Search "${query}" found ${this.filteredTemplates.length} results`);
    },

    // Generate search suggestions
    generateSearchSuggestions() {
        const query = this.searchState.query.toLowerCase();
        const suggestions = new Set();
        
        // Add common search terms
        this.templates.forEach(template => {
            if (template.name && template.name.toLowerCase().includes(query)) {
                suggestions.add(template.name);
            }
            if (template.createdBy && template.createdBy.toLowerCase().includes(query)) {
                suggestions.add(template.createdBy);
            }
            if (template.type && template.type.toLowerCase().includes(query)) {
                suggestions.add(template.type);
            }
        });
        
        this.searchState.suggestions = Array.from(suggestions).slice(0, 5);
    },

    // Clear search
    clearSearch() {
        this.searchState.query = '';
        this.searchState.isSearching = false;
        this.filteredTemplates = [...this.templates];
        this.hideSearchSuggestions();
    },

    // Show search suggestions dropdown
    showSearchSuggestions() {
        const suggestionsDiv = document.getElementById('searchSuggestions');
        const searchInput = document.getElementById('templateSearchInput');
        
        if (!suggestionsDiv || !searchInput) {
            return;
        }
        
        const query = searchInput.value.trim().toLowerCase();
        
        if (query.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        
        if (this.searchState.suggestions.length > 0) {
            this.renderSearchSuggestions();
            suggestionsDiv.style.display = 'block';
        }
    },

    // Hide search suggestions dropdown
    hideSearchSuggestions() {
        setTimeout(() => {
            const suggestionsDiv = document.getElementById('searchSuggestions');
            if (suggestionsDiv) {
                suggestionsDiv.style.display = 'none';
            }
        }, 150);
    },

    // Render search suggestions
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
                 style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #e5e7eb;">
                ${this.escapeHtml(suggestion)}
            </div>
        `).join('');
        
        suggestionsDiv.innerHTML = suggestionsHTML;
    },

    // Apply search suggestion
    applySuggestion(suggestion) {
        const searchInput = document.getElementById('templateSearchInput');
        if (searchInput) {
            searchInput.value = suggestion;
            this.handleSearch(suggestion);
        }
        this.hideSearchSuggestions();
    },

    // Update search status
    updateSearchStatus() {
        const statusEl = document.getElementById('searchStatus');
        if (statusEl) {
            if (this.searchState.isSearching) {
                statusEl.textContent = `Found ${this.filteredTemplates.length} results for "${this.searchState.query}"`;
                statusEl.style.display = 'block';
            } else {
                statusEl.style.display = 'none';
            }
        }
    },

    // Get all templates (including filtered)
    getAllTemplates() {
        return this.searchState.isSearching ? this.filteredTemplates : this.templates;
    },

    // Get filtered templates based on current state
    getFilteredTemplates() {
        let templates = this.searchState.isSearching ? this.filteredTemplates : this.templates;
        
        // Filter by current type
        const currentType = this.getCurrentType();
        if (currentType === 'folders') {
            templates = templates.filter(template => template.type !== 'experiment');
        } else if (currentType === 'experiment') {
            templates = templates.filter(template => template.type === 'experiment');
        }
        
        // Filter by shared/personal preference
        if (!this.searchState.showSharedTemplates) {
            const currentUser = window.userManager?.currentUser || 'Unknown';
            templates = templates.filter(template => 
                template.createdBy === currentUser || 
                template.createdBy === 'System'
            );
        }
        
        return templates;
    },

    // Get current template type
    getCurrentType() {
        const foldersBtn = document.getElementById('foldersTypeBtn');
        const experimentsBtn = document.getElementById('experimentsTypeBtn');
        
        if (foldersBtn && foldersBtn.classList.contains('active')) {
            return 'folders';
        } else if (experimentsBtn && experimentsBtn.classList.contains('active')) {
            return 'experiment';
        }
        
        return 'folders'; // default
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
        
        // Render template list
        listContainer.innerHTML = filteredTemplates.map((template, index) => {
            const badge = template.type === 'experiment' ? 
                '<span class="template-badge experiment">🧪</span>' : 
                '<span class="template-badge">📁</span>';
            
            const color = template.userColor;
            const initials = template.userInitials;
            const isSelected = this.selectedIndex === index;
            
            const createdDate = new Date(template.createdAt).toLocaleDateString();
            const updatedDate = template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : null;
            
            const displayName = this.searchState.isSearching ? 
                this.highlightSearchMatches(template.name, this.searchState.query) : 
                this.escapeHtml(template.name);
            
            const displayDescription = this.searchState.isSearching && template.description ? 
                this.highlightSearchMatches(template.description, this.searchState.query) : 
                (template.description ? this.escapeHtml(template.description) : '');
            
            const storageIndicator = `
                <div class="storage-indicator" style="font-size: 0.75rem; color: #6b7280; margin-top: 4px;">
                    ${template.storageIcon} ${template.storageDisplay}
                </div>
            `;
            
            const copyLink = template.createdBy !== 'System' && !template.isOwn ? `
                <button class="copy-template-btn" onclick="templateManager.copyTemplate(${index})" 
                        style="font-size: 0.7rem; padding: 2px 6px; margin-top: 4px; 
                               background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 3px; cursor: pointer;">
                    Copy to My Templates
                </button>
            ` : '';
            
            return `
                <div class="template-item ${isSelected ? 'selected' : ''} ${template.isOwn ? 'own-template' : ''}" 
                     onclick="templateManager.selectTemplate(${index})" style="position: relative;">
                    <div class="template-content">
                        <div class="template-header">
                            ${badge}
                            <div class="template-title">
                                <h3>${displayName}</h3>
                                <span class="template-dates" style="font-size: 0.75rem; color: #6b7280;">
                                    Created: ${createdDate}${updatedDate ? ` • Updated: ${updatedDate}` : ''}
                                </span>
                            </div>
                            ${displayDescription ? `
                                <p class="template-description">${displayDescription}</p>
                            ` : ''}
                            ${storageIndicator}
                            ${copyLink}
                        </div>
                        <div class="template-user" style="background-color: ${color};">
                            ${initials}
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

    // Attach event listeners to template items
    attachEventListeners() {
        // Re-attach any necessary event listeners here
    },

    // Copy template to user's templates
    async copyTemplate(index) {
        const template = this.filteredTemplates[index];
        if (!template) return;
        
        try {
            const copiedTemplate = {
                ...template,
                id: this.generateTemplateId(),
                name: `${template.name} (Copy)`,
                createdBy: window.userManager?.currentUser || 'Unknown',
                createdByGroup: window.userManager?.currentGroup || 'Unknown',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Remove source-specific info
            delete copiedTemplate._fileInfo;
            delete copiedTemplate.isOwn;
            delete copiedTemplate.savedLocally;
            
            // Add to templates
            this.templates.push(copiedTemplate);
            
            // Save to storage
            if (window.storage) {
                await window.storage.saveTemplates(this.templates);
            }
            
            // Refresh UI
            this.invalidateCache();
            this.buildSearchIndex();
            this.renderList();
            
            this.showTemporaryMessage(`✅ Template "${template.name}" copied to your templates!`, 'success');
            console.log('✅ Template copied:', copiedTemplate.name);
            
        } catch (error) {
            console.error('❌ Error copying template:', error);
            this.showTemporaryMessage('❌ Failed to copy template', 'error');
        }
    },

    // Delete current template
    async deleteCurrent() {
        if (!this.currentTemplate) {
            console.warn('No template selected for deletion');
            return;
        }
        
        if (!this.validateTemplateForOperation(this.currentTemplate, 'deletion')) {
            console.warn('Template deletion prevented: Invalid template');
            return;
        }
        
        try {
            // Find template in main templates array
            const templateIndex = this.templates.findIndex(t => 
                t.name === this.currentTemplate.name && 
                t.createdBy === this.currentTemplate.createdBy
            );
            
            if (templateIndex >= 0) {
                this.templates.splice(templateIndex, 1);
                
                // Save to storage
                if (window.storage) {
                    await window.storage.saveTemplates(this.templates);
                }
                
                // Clear current selection
                this.currentTemplate = null;
                this.selectedIndex = -1;
                
                // Refresh UI
                this.invalidateCache();
                this.buildSearchIndex();
                this.renderList();
                this.updateTemplateInfo();
                
                console.log('✅ Template deleted');
            }
        } catch (error) {
            console.error('❌ Error deleting template:', error);
            throw error;
        }
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

    // Update shared toggle visibility
    updateSharedToggleVisibility() {
        const toggleEl = document.getElementById('showSharedToggle');
        if (!toggleEl) return;
        
        // Show toggle if there are shared templates
        const hasSharedTemplates = this.templates.some(template => 
            template.createdBy !== (window.userManager?.currentUser || 'Unknown') && 
            template.createdBy !== 'System'
        );
        
        toggleEl.style.display = hasSharedTemplates ? 'block' : 'none';
    },

    // Toggle shared templates visibility
    toggleSharedTemplates() {
        this.searchState.showSharedTemplates = !this.searchState.showSharedTemplates;
        this.renderList();
        
        const toggleEl = document.getElementById('showSharedToggle');
        if (toggleEl) {
            toggleEl.textContent = this.searchState.showSharedTemplates ? 
                'Hide Shared Templates' : 'Show Shared Templates';
        }
    },

    // Utility functions
    getUserColor(username) {
        if (!username || username === 'System') return '#6b7280';
        
        const colors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];
        const hash = username.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return colors[Math.abs(hash) % colors.length];
    },

    getUserInitials(username) {
        if (!username || username === 'System') return 'SY';
        return username.length >= 2 ? username.substring(0, 2).toUpperCase() : '??';
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    highlightSearchMatches(text, query) {
        if (!query) return this.escapeHtml(text);
        
        const escapedText = this.escapeHtml(text);
        const escapedQuery = this.escapeHtml(query);
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return escapedText.replace(regex, '<mark>$1</mark>');
    },

    generateTemplateId() {
        return 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    invalidateCache() {
        this.searchState.cache.clear();
    },

    // Show temporary message
    showTemporaryMessage(message, type = 'info') {
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

    // Auto-refresh functions
    startAutoRefresh() {
        if (this.autoRefreshInterval) {
            console.log('⚠️ Auto-refresh already running');
            return;
        }
        
        this.autoRefreshInterval = setInterval(async () => {
            console.log('🔄 Auto-refreshing templates...');
            await this.refresh();
        }, 30000); // Every 30 seconds
        
        console.log('▶️ Auto-refresh started (30s interval)');
    },

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            console.log('🛑 Auto-refresh stopped');
        }
    }
};

window.templateManager = templateManager;
console.log('✅ Template manager loaded with file storage support');