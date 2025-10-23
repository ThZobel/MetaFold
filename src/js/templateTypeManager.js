// Template Type Manager - FIXED for 4 Categories

const templateTypeManager = {
    // FIXED: Support for 4 categories
    currentType: 'category1', // category1, category2, category3, or category4
    
    // FIXED: Get category configuration from settings - NOW SYNCHRONOUS
    getCategoryConfig(categoryId) {
        if (!window.settingsManager || !window.settingsManager.settings) {
            // Fallback defaults if settings not available
            const defaults = {
                category1: { name: 'Main-Project', icon: '🎯', color: '#8b5cf6', id: 'category1' },
                category2: { name: 'Sub-Project', icon: '📊', color: '#06b6d4', id: 'category2' },
                category3: { name: 'Action', icon: '⚡', color: '#10b981', id: 'category3' },
                category4: { name: 'Misc', icon: '📋', color: '#f59e0b', id: 'category4' }
            };
            return defaults[categoryId] || defaults.category1;
        }
        
        // FIXED: Direct synchronous access to settings
        const settings = window.settingsManager.settings;
        return {
            name: settings[`templates.${categoryId}_name`] || 'Unnamed',
            icon: settings[`templates.${categoryId}_icon`] || '📋',
            color: settings[`templates.${categoryId}_color`] || '#6b7280',
            id: categoryId
        };
    },
    
    // Get all categories
    getAllCategories() {
        return [
            this.getCategoryConfig('category1'),
            this.getCategoryConfig('category2'),
            this.getCategoryConfig('category3'),
            this.getCategoryConfig('category4')
        ];
    },

    // FIXED: Switch template type - properly handles categoryId
    switchType(categoryId) {
        const validCategories = ['category1', 'category2', 'category3', 'category4'];
        
        if (!validCategories.includes(categoryId)) {
            console.warn('Invalid category ID:', categoryId);
            return;
        }

        console.log(`🔧 Switching category: ${this.currentType} → ${categoryId}`);
        
        this.currentType = categoryId;
        
        // Save to settings
        if (window.settingsManager && window.settingsManager.set) {
            window.settingsManager.set('templates.active_category', categoryId);
        }
        
        this.updateUI();
        
        // IMPORTANT: Prevent automatic template creation
        if (window.templateManager) {
            // Clear current template selection SAFELY
            window.templateManager.currentTemplate = null;
            window.templateManager.selectedIndex = -1;
            
            // Clear experiment form to prevent auto-rendering
            const experimentFields = document.getElementById('experimentFields');
            if (experimentFields) {
                experimentFields.innerHTML = '';
            }
            
            // Clear template info display
            const templateInfo = document.getElementById('templateInfo');
            if (templateInfo) {
                templateInfo.textContent = 'No template selected';
                templateInfo.className = 'template-info';
            }
            
            // Clear all caches
            console.log('🔧 Clearing search index for category switch');
            window.templateManager.allTemplates = [];
            window.templateManager.searchState.searchCache.clear();
            window.templateManager.searchState.searchIndex.clear();
            
            // Clear search if active
            if (window.templateManager.searchState.isSearching) {
                const searchInput = document.getElementById('templateSearchInput');
                if (searchInput) {
                    searchInput.value = '';
                }
                window.templateManager.clearSearch();
            }
            
            // Re-render template list
            window.templateManager.renderList();
            
            // Rebuild search index after delay
            setTimeout(() => {
                console.log('🔧 Rebuilding search index for:', categoryId);
                const templates = window.templateManager.getAllTemplates();
                console.log(`📊 Got ${templates.length} templates`);
                
                window.templateManager.buildSearchIndex();
                console.log(`✅ Search index rebuilt with ${window.templateManager.searchState.searchIndex.size} entries`);
                
                // Re-render with updated index
                window.templateManager.renderList();
                window.templateManager.updateSharedToggleVisibility();
                window.templateManager.updateTemplateInfo();
            }, 100);
        }

        // Hide template details when switching
        const templateDetails = document.getElementById('templateDetails');
        if (templateDetails) {
            templateDetails.style.display = 'none';
        }

        // Update integration options visibility
        this.updateIntegrationVisibility();
        
        console.log(`✅ Category switched to: ${categoryId}`);
    },
    
    // FIXED: Update UI to reflect current category - now handles colors properly
    updateUI() {
        const categories = this.getAllCategories();
        
        // Update all 4 buttons
        categories.forEach(category => {
            const btnId = `${category.id}TypeBtn`;
            const btn = document.getElementById(btnId);
            
            if (btn) {
                const isActive = this.currentType === category.id;
                btn.classList.toggle('active', isActive);
                
                // Update button content
                btn.innerHTML = `${category.icon} ${category.name}`;
                
                // FIXED: Apply category color when active - ensure color is a string
                if (isActive && typeof category.color === 'string') {
                    const lighterColor = this.lightenColor(category.color, 20);
                    btn.style.background = `linear-gradient(135deg, ${category.color}, ${lighterColor})`;
                    btn.style.borderColor = `${category.color}80`;
                    btn.style.boxShadow = `0 2px 8px ${category.color}50`;
                } else {
                    // Reset to default inactive styles
                    btn.style.background = '';
                    btn.style.borderColor = '';
                    btn.style.boxShadow = '';
                }
            }
        });
    },
    
    // FIXED: Helper: Lighten a hex color - with validation
    lightenColor(hex, percent) {
        // FIXED: Validate input
        if (!hex || typeof hex !== 'string') {
            console.warn('Invalid hex color:', hex);
            return '#9ca3af'; // Fallback color
        }
        
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return '#' + (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        ).toString(16).slice(1);
    },

    // Update integration options visibility - async version
    async updateIntegrationVisibility() {
        console.log('🔄 Updating integration visibility for category:', this.currentType);
        
        if (window.updateIntegrationOptions) {
            await window.updateIntegrationOptions();
        }
    },

    // NEW: Compatibility method - replaces isExperimentMode
    isCategory(categoryId) {
        return this.currentType === categoryId;
    },
    
    // NEW: Check if current category is category1 (was "folders")
    isCategory1() {
        return this.currentType === 'category1';
    },
    
    // NEW: Check if current category is category2 (was "experiments")
    isCategory2() {
        return this.currentType === 'category2';
    },

    // Get current category configuration
    getCurrentCategoryConfig() {
        return this.getCategoryConfig(this.currentType);
    },

    // FIXED: Initialize - properly handle active category
    async init() {
        // Load active category from settings - SYNCHRONOUS
        if (window.settingsManager && window.settingsManager.settings) {
            const savedCategory = window.settingsManager.settings['templates.active_category'];
            this.currentType = savedCategory || 'category1';
        }
        
        this.updateUI();
        await this.updateIntegrationVisibility();
        console.log('✅ TemplateTypeManager initialized with 4 categories:', this.currentType);
    }
};

// Make globally available
window.templateTypeManager = templateTypeManager;
console.log('✅ Enhanced templateTypeManager loaded (4 categories support - FIXED)');