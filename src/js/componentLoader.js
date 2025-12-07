/**
 * Component Loader
 * Dynamically loads HTML components into the DOM.
 */
class ComponentLoader {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Load a component into a target element.
     * @param {string} targetId - The ID of the container element.
     * @param {string} filePath - Path to the HTML file (relative to src/ or absolute).
     * @returns {Promise<void>}
     */
    async load(targetId, filePath) {
        const target = document.getElementById(targetId);
        if (!target) {
            console.error(`ComponentLoader: Target element #${targetId} not found.`);
            return;
        }

        try {
            // Adjust path if needed. Assuming relative to index.html which is in src/
            // If filePath starts with 'components/', it's fine.
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load ${filePath}: ${response.statusText}`);
            }

            const html = await response.text();
            target.innerHTML = html;

            // Execute scripts found in the loaded HTML
            this.executeScripts(target);

            console.log(`✅ Component loaded: ${filePath} into #${targetId}`);
        } catch (error) {
            console.error(`❌ ComponentLoader error loading ${filePath}:`, error);
            target.innerHTML = `<div class="error">Failed to load component: ${error.message}</div>`;
        }
    }

    /**
     * Execute scripts found in the container.
     * innerHTML does not execute scripts, so we must do it manually.
     * @param {HTMLElement} container 
     */
    executeScripts(container) {
        const scripts = container.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');

            // Copy attributes
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });

            // Copy content
            newScript.textContent = oldScript.textContent;

            // Replace
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    }
}

// Initialize and expose
window.componentLoader = new ComponentLoader();
