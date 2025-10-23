/**
 * Sidebar Resize Manager - Continuous Resize Version
 * Allows smooth resizing with automatic 2-column layout when wide enough
 */

const sidebarResizeManager = {
    sidebar: null,
    resizeHandle: null,
    mainContent: null,
    isResizing: false,
    startX: 0,
    startWidth: 0,
    twoColumnBreakpoint: 550, // Switch to 2 columns at 550px
    
    /**
     * Initialize the resize manager
     */
    async init() {
        console.log('🔧 Initializing continuous sidebar resize...');
        
        this.sidebar = document.querySelector('.sidebar');
        this.mainContent = document.querySelector('.main-content');
        
        if (!this.sidebar) {
            console.warn('⚠️ Sidebar element not found');
            return;
        }
        
        // Add resize handle first
        this.addResizeHandle();
        
        // Load saved width BEFORE setting default
        const widthLoaded = await this.loadSavedWidth();
        
        // If no saved width was loaded, use default
        if (!widthLoaded) {
            const initialWidth = this.sidebar.offsetWidth || 380;
            console.log(`📏 No saved width found, using default: ${initialWidth}px`);
            this.sidebar.style.width = initialWidth + 'px';
            this.updateColumnLayout(initialWidth);
        }
        
        // Update main content width on window resize
        window.addEventListener('resize', () => this.updateMainContentWidth());
        
        // Initial layout update
        this.updateMainContentWidth();
        
        console.log('✅ Continuous sidebar resize initialized');
    },
    
    /**
     * Add resize handle to sidebar
     */
    addResizeHandle() {
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.className = 'sidebar-resize-handle';
        this.resizeHandle.title = 'Drag to resize sidebar';
        
        // Mouse events
        this.resizeHandle.addEventListener('mousedown', this.startResize.bind(this));
        
        this.sidebar.appendChild(this.resizeHandle);
    },
    
    /**
     * Start resizing
     */
    startResize(e) {
        console.log('🖱️ Starting sidebar resize...');
        
        this.isResizing = true;
        this.startX = e.clientX;
        this.startWidth = this.sidebar.offsetWidth;
        
        // Add resizing class
        document.body.classList.add('sidebar-resizing');
        this.resizeHandle.classList.add('resizing');
        
        // Add mouse move and up listeners
        document.addEventListener('mousemove', this.doResize.bind(this));
        document.addEventListener('mouseup', this.stopResize.bind(this));
        
        e.preventDefault();
    },
    
    /**
     * Perform resize during drag
     */
    doResize(e) {
        if (!this.isResizing) return;
        
        const delta = e.clientX - this.startX;
        let newWidth = this.startWidth + delta;
        
        // Constrain to min/max
        const minWidth = 320;
        const maxWidth = Math.min(900, window.innerWidth * 0.6);
        newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
        
        // Apply width
        this.setSidebarWidth(newWidth);
    },
    
    /**
     * Stop resizing
     */
    stopResize(e) {
        if (!this.isResizing) return;
        
        console.log('🖱️ Stopping sidebar resize...');
        
        this.isResizing = false;
        
        // Remove resizing class
        document.body.classList.remove('sidebar-resizing');
        this.resizeHandle.classList.remove('resizing');
        
        // Remove listeners
        document.removeEventListener('mousemove', this.doResize.bind(this));
        document.removeEventListener('mouseup', this.stopResize.bind(this));
        
        // Save width
        this.saveSidebarWidth();
        
        // Log column mode with support for 3 columns
        const width = this.sidebar.offsetWidth;
        let columnMode;
        if (width >= 750) {
            columnMode = '3 columns';
        } else if (width >= 550) {
            columnMode = '2 columns';
        } else {
            columnMode = '1 column';
        }
        console.log(`✅ Sidebar resize complete: ${width}px (${columnMode})`);
    },
    
    /**
     * Set sidebar width and update layout
     */
    setSidebarWidth(width) {
        this.sidebar.style.width = width + 'px';
        this.updateMainContentWidth();
        this.updateColumnLayout(width);
    },
    
    /**
     * Update main content width based on sidebar
     */
    updateMainContentWidth() {
        if (!this.mainContent || !this.sidebar) return;
        
        const sidebarWidth = this.sidebar.offsetWidth;
        this.mainContent.style.width = `calc(100vw - ${sidebarWidth}px)`;
    },
    
    /**
     * Update column layout based on width
     * Supports 1, 2, or 3 columns dynamically
     */
    updateColumnLayout(width) {
        // NEW: Three breakpoints for different column layouts
        const twoColumnBreakpoint = 550;   // Switch to 2 columns at 550px
        const threeColumnBreakpoint = 750; // Switch to 3 columns at 750px
        
        // Remove all column classes first
        this.sidebar.classList.remove('sidebar-wide', 'sidebar-extra-wide');
        
        // Determine which column mode to use
        if (width >= threeColumnBreakpoint) {
            // 3 columns mode (750px+)
            this.sidebar.classList.add('sidebar-wide', 'sidebar-extra-wide');
            console.log('📊 Sidebar layout: 3 columns');
        } else if (width >= twoColumnBreakpoint) {
            // 2 columns mode (550px - 749px)
            this.sidebar.classList.add('sidebar-wide');
            console.log('📊 Sidebar layout: 2 columns');
        } else {
            // 1 column mode (< 550px)
            console.log('📊 Sidebar layout: 1 column');
        }
    },

    
    /**
     * Save sidebar width to settings
     */
    async saveSidebarWidth() {
        try {
            const width = this.sidebar.offsetWidth;
            
            if (window.settingsManager) {
                await window.settingsManager.set('ui.sidebar_width', width);
                console.log(`💾 Sidebar width saved: ${width}px`);
            } else {
                // Fallback to localStorage
                localStorage.setItem('metafold_sidebar_width', width);
            }
        } catch (error) {
            console.warn('⚠️ Could not save sidebar width:', error);
        }
    },
    
    /**
     * Load saved sidebar width
     */
    async loadSavedWidth() {
        try {
            let savedWidth = null;
            
            console.log('🔍 Attempting to load saved sidebar width...');
            console.log('🔍 settingsManager available:', !!window.settingsManager);
            
            if (window.settingsManager) {
                savedWidth = await window.settingsManager.get('ui.sidebar_width');
                console.log('🔍 Retrieved from settingsManager:', savedWidth);
            } else {
                // Fallback to localStorage
                savedWidth = localStorage.getItem('metafold_sidebar_width');
                console.log('🔍 Retrieved from localStorage:', savedWidth);
            }
            
            if (savedWidth) {
                const width = parseInt(savedWidth);
                console.log('🔍 Parsed width:', width);
                
                if (!isNaN(width) && width >= 320 && width <= 900) {
                    console.log(`📂 Loading saved sidebar width: ${width}px`);
                    
                    // Set width immediately
                    this.sidebar.style.width = width + 'px';
                    this.updateMainContentWidth();
                    this.updateColumnLayout(width);
                    
                    console.log('✅ Sidebar width restored successfully');
                    
                    // Also update after a small delay to ensure templates are rendered
                    setTimeout(() => {
                        this.updateColumnLayout(width);
                    }, 500);
                    
                    return true; // Indicate success
                } else {
                    console.log('⚠️ Width out of range or invalid:', width);
                }
            } else {
                console.log('📋 No saved sidebar width found');
                return false; // Indicate no saved width
            }
        } catch (error) {
            console.warn('❌ Could not load sidebar width:', error);
            return false;
        }
        
        return false;
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        // Small delay to ensure templates are rendered and settingsManager is ready
        setTimeout(async () => {
            await sidebarResizeManager.init();
        }, 500);
    });
} else {
    setTimeout(async () => {
        await sidebarResizeManager.init();
    }, 500);
}

// CRITICAL: Reload sidebar width after user switch
// IMPORTANT: Listen on window, not document (event is dispatched on window)
window.addEventListener('UserSwitched', async (event) => {
    console.log('🔄 UserSwitched event received in sidebarResizeManager');
    console.log('👤 New user:', event.detail);
    
    // Wait a bit for settings to be fully loaded
    setTimeout(async () => {
        console.log('🔄 Reloading sidebar width for new user...');
        const widthLoaded = await sidebarResizeManager.loadSavedWidth();
        
        if (!widthLoaded) {
            console.log('📏 No saved width for new user, keeping current width');
        }
    }, 300);
});

// Export for global access
window.sidebarResizeManager = sidebarResizeManager;

console.log('✅ Continuous sidebar resize manager loaded');
