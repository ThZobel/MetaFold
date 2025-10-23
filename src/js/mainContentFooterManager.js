/**
 * Main Content Footer Manager
 * Manages the fixed footer area with actions bar and success messages
 */

const mainContentFooterManager = {
    initialized: false,
    footer: null,
    actionsContainer: null,
    messagesContainer: null,

    /**
     * Initialize the footer manager
     * This should be called after DOM is loaded
     */
    init() {
        if (this.initialized) return;
        
        console.log('🔧 Initializing Main Content Footer Manager...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    },

    /**
     * Setup the footer structure
     */
    setup() {
        console.log('📐 Setting up footer structure...');
        
        // Find main-content
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error('❌ .main-content not found');
            return;
        }

        // Wrap existing content in a wrapper
        const existingHeader = mainContent.querySelector('.header');
        const existingTabs = mainContent.querySelector('.main-tabs');
        const existingTabContents = mainContent.querySelectorAll('.main-tab-content');

        // Create wrapper for scrollable content
        const wrapper = document.createElement('div');
        wrapper.className = 'main-content-wrapper';
        
        // Move existing content to wrapper
        if (existingHeader) wrapper.appendChild(existingHeader);
        if (existingTabs) wrapper.appendChild(existingTabs);
        existingTabContents.forEach(tab => wrapper.appendChild(tab));

        // Find existing actions div and messages
        const existingActions = document.querySelector('.actions');
        const successMessage = document.getElementById('successMessage');
        const errorMessage = document.getElementById('errorMessage');
        const infoMessage = document.getElementById('infoMessage');

        // Create footer structure
        const footer = document.createElement('div');
        footer.className = 'main-content-footer';
        footer.innerHTML = `
            <div class="footer-actions-container">
                <!-- Actions will be moved here -->
            </div>
            <div class="footer-messages-container" id="footerMessagesContainer">
                <!-- Messages will be moved here -->
            </div>
        `;

        // Clear main-content and rebuild structure
        mainContent.innerHTML = '';
        mainContent.appendChild(wrapper);
        mainContent.appendChild(footer);

        // Store references
        this.footer = footer;
        this.actionsContainer = footer.querySelector('.footer-actions-container');
        this.messagesContainer = footer.querySelector('.footer-messages-container');

        // Move actions to footer
        if (existingActions && this.actionsContainer) {
            this.actionsContainer.appendChild(existingActions);
            console.log('✅ Actions moved to footer');
        }

        // Move messages to footer
        if (successMessage && this.messagesContainer) {
            this.messagesContainer.appendChild(successMessage);
        }
        if (errorMessage && this.messagesContainer) {
            this.messagesContainer.appendChild(errorMessage);
        }
        if (infoMessage && this.messagesContainer) {
            this.messagesContainer.appendChild(infoMessage);
        }

        // Setup message observers
        this.setupMessageObservers();

        this.initialized = true;
        console.log('✅ Main Content Footer Manager initialized');
    },

    /**
     * Setup observers to show/hide messages container
     */
    setupMessageObservers() {
        if (!this.messagesContainer) return;

        const messageDivs = this.messagesContainer.querySelectorAll('.success-message, .error-message, .info-message');
        
        // Create mutation observer for each message div
        messageDivs.forEach(messageDiv => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        this.updateMessagesContainerVisibility();
                    }
                });
            });

            observer.observe(messageDiv, {
                attributes: true,
                attributeFilter: ['style']
            });
        });

        // Also observe innerHTML changes
        const contentObserver = new MutationObserver(() => {
            this.updateMessagesContainerVisibility();
        });

        messageDivs.forEach(messageDiv => {
            contentObserver.observe(messageDiv, {
                childList: true,
                subtree: true
            });
        });

        console.log('👁️ Message observers setup');
    },

    /**
     * Update messages container visibility based on message content
     */
    updateMessagesContainerVisibility() {
        if (!this.messagesContainer) return;

        const successMessage = this.messagesContainer.querySelector('#successMessage');
        const errorMessage = this.messagesContainer.querySelector('#errorMessage');
        const infoMessage = this.messagesContainer.querySelector('#infoMessage');

        const hasVisibleMessage = 
            (successMessage && successMessage.style.display !== 'none' && successMessage.innerHTML.trim() !== '') ||
            (errorMessage && errorMessage.style.display !== 'none' && errorMessage.innerHTML.trim() !== '') ||
            (infoMessage && infoMessage.style.display !== 'none' && infoMessage.innerHTML.trim() !== '');

        if (hasVisibleMessage) {
            this.messagesContainer.classList.add('active');
        } else {
            this.messagesContainer.classList.remove('active');
        }
    },

    /**
     * Show a message in the footer
     * @param {string} message - The message to display
     * @param {string} type - Type of message ('success', 'error', 'info')
     */
    showMessage(message, type = 'success') {
        const messageDiv = document.getElementById(`${type}Message`);
        if (!messageDiv) return;

        messageDiv.innerHTML = message;
        messageDiv.style.display = 'block';

        // Auto-hide after timeout (except errors)
        if (type !== 'error') {
            setTimeout(() => {
                messageDiv.style.display = 'none';
                this.updateMessagesContainerVisibility();
            }, 10000);
        }

        this.updateMessagesContainerVisibility();
    },

    /**
     * Hide a specific message
     * @param {string} type - Type of message to hide
     */
    hideMessage(type) {
        const messageDiv = document.getElementById(`${type}Message`);
        if (messageDiv) {
            messageDiv.style.display = 'none';
            this.updateMessagesContainerVisibility();
        }
    },

    /**
     * Hide all messages
     */
    hideAllMessages() {
        this.hideMessage('success');
        this.hideMessage('error');
        this.hideMessage('info');
    }
};

// Auto-initialize when script loads
mainContentFooterManager.init();

// Make available globally
window.mainContentFooterManager = mainContentFooterManager;

console.log('✅ mainContentFooterManager script loaded');
