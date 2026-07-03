/**
 * Theme Manager
 * Handles the toggling between Light and Dark mode and persists the choice in localStorage.
 */

const ThemeManager = {
    init() {
        // Check if there is a saved preference
        const savedTheme = localStorage.getItem('metafold_theme');
        
        // Apply the saved theme or default to dark (no class)
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }

        // Wait for DOM to be ready to setup the toggle button
        document.addEventListener('DOMContentLoaded', () => {
            // Note: Since the sidebar is loaded dynamically, the button might not exist yet.
            // We expose a toggle function globally so the button can call it directly via onclick.
        });
    },

    toggleTheme() {
        const isLight = document.body.classList.toggle('light-mode');
        
        // Save preference
        localStorage.setItem('metafold_theme', isLight ? 'light' : 'dark');
        
        // Update button icon if it exists
        this.updateButtonIcon(isLight);
        
        console.log(`🌓 Theme toggled to: ${isLight ? 'Light' : 'Dark'} mode`);
    },

    updateButtonIcon(isLight) {
        const btnIcon = document.getElementById('themeToggleIcon');
        if (btnIcon) {
            btnIcon.textContent = isLight ? '🌙' : '☀️';
        }
    }
};

// Initialize early to prevent FOUC (Flash of Unstyled Content)
ThemeManager.init();

// Expose globally for the onclick handler
window.toggleTheme = () => ThemeManager.toggleTheme();
