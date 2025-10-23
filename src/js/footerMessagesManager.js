/**
 * Footer Messages Manager - Improved
 * ✨ Zeigt Footer NUR an, wenn Nachrichten tatsächlich Inhalt haben
 * ✨ Bessere Erkennung von leeren Nachrichten (auch mit HTML-Tags)
 */

(function() {
    'use strict';
    
    console.log('🔧 Initializing Footer Messages Manager (Improved)...');
    
    /**
     * ✨ NEU: Prüft, ob ein Element tatsächlich sichtbaren Text-Inhalt hat
     * @param {HTMLElement} element - Das zu prüfende Element
     * @returns {boolean} - true wenn sichtbarer Inhalt vorhanden
     */
    function hasActualContent(element) {
        if (!element) return false;
        
        // Prüfe display style
        if (element.style.display === 'none') return false;
        
        // Prüfe textContent (entfernt automatisch HTML-Tags)
        const textContent = element.textContent || '';
        const hasText = textContent.trim() !== '';
        
        return hasText;
    }
    
    // Wait for DOM to be ready
    function init() {
        const messagesContainer = document.getElementById('footerMessagesContainer');
        if (!messagesContainer) {
            console.warn('⚠️ Footer messages container not found');
            return;
        }
        
        const successMessage = document.getElementById('successMessage');
        const errorMessage = document.getElementById('errorMessage');
        const infoMessage = document.getElementById('infoMessage');
        
        if (!successMessage || !errorMessage || !infoMessage) {
            console.warn('⚠️ Message divs not found');
            return;
        }
        
        /**
         * ✨ VERBESSERT: Update container visibility
         * Zeigt Container NUR an, wenn mindestens eine Nachricht tatsächlich Inhalt hat
         */
        function updateContainerVisibility() {
            const hasVisibleMessage = 
                hasActualContent(successMessage) ||
                hasActualContent(errorMessage) ||
                hasActualContent(infoMessage);
            
            if (hasVisibleMessage) {
                messagesContainer.classList.add('active');
                console.log('📢 Footer messages visible');
            } else {
                messagesContainer.classList.remove('active');
                console.log('🔇 Footer messages hidden (no content)');
            }
        }
        
        // Create MutationObservers for each message div
        const observerConfig = {
            attributes: true,
            attributeFilter: ['style'],
            childList: true,
            subtree: true,
            characterData: true // ✨ NEU: Beobachte auch Text-Änderungen
        };
        
        const observer = new MutationObserver(() => {
            // ✨ VERBESSERT: Kleine Verzögerung, damit DOM sich aktualisieren kann
            setTimeout(updateContainerVisibility, 10);
        });
        
        observer.observe(successMessage, observerConfig);
        observer.observe(errorMessage, observerConfig);
        observer.observe(infoMessage, observerConfig);
        
        // Initial check mit Verzögerung
        setTimeout(updateContainerVisibility, 100);
        
        console.log('✅ Footer Messages Manager initialized (Improved)');
        
        // ✨ NEU: Debugging-Funktion für Entwickler
        window.debugFooterMessages = function() {
            console.log('🔍 Footer Messages Debug:');
            console.log('  Success:', hasActualContent(successMessage), '|', successMessage.textContent);
            console.log('  Error:', hasActualContent(errorMessage), '|', errorMessage.textContent);
            console.log('  Info:', hasActualContent(infoMessage), '|', infoMessage.textContent);
            console.log('  Container active:', messagesContainer.classList.contains('active'));
        };
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
