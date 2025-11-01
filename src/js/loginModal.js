// Login Modal - FIXED Group Assignment

// Remove existing loginModal if already defined
if (window.loginModal) {
    console.log('🔧 Removing existing loginModal');
    delete window.loginModal;
}

const loginModal = {
    modal: null,
    usernameInput: null,
    userSuggestions: null,
    onConfirm: null,
    onCancel: null,

    show(requirePassword = false) {
        console.log('🔧 loginModal.show() called with password support:', requirePassword);
        this.passwordRequired = requirePassword; // Store password requirement
        
        return new Promise((resolve, reject) => {
            this.createModal();
            this.setupEventListeners();
            this.loadSuggestions();
            
            this.onConfirm = resolve;
            this.onCancel = reject;
            
            console.log('✅ Login modal displayed with password support');
        });
    },

    createModal() {
            // Passwort-Requirement aus dem gespeicherten State lesen
            const requirePassword = this.passwordRequired || false;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('loginModal');
            if (existingModal) {
                existingModal.remove();
            }

            // Get last user for pre-filling
            const lastUser = this.getLastUser();
            const hasLastUser = lastUser && lastUser.username && lastUser.username !== 'User';
            
            // Context-aware messaging
            const welcomeMessage = hasLastUser 
                ? `Welcome back! Continue as <strong>${lastUser.username}</strong> or select a different user:`
                : 'Enter your details to get started:';

            // Password field HTML (conditional) - ✅ ROBUSTERE VERSION
            const passwordFieldHTML = requirePassword ? `
                <div style="margin-bottom: 2rem;">
                    <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #a855f7; font-size: 1rem;">
                        🔒 Password:
                    </label>
                    <div style="position: relative;">
                        <input 
                            type="password" 
                            id="passwordInput" 
                            placeholder="Enter your password" 
                            autocomplete="current-password"
                            tabindex="2"
                            style="
                                width: 100%;
                                padding: 1rem;
                                padding-right: 3rem;
                                border: 1px solid rgba(255, 255, 255, 0.2);
                                border-radius: 8px;
                                font-size: 1rem;
                                box-sizing: border-box;
                                background: rgba(255, 255, 255, 0.05);
                                color: #e0e0e0;
                                font-family: inherit;
                                outline: none;
                                transition: border-color 0.3s ease;
                            ">
                        <button 
                            type="button" 
                            id="passwordToggle" 
                            tabindex="-1"
                            style="
                                position: absolute;
                                right: 0.75rem;
                                top: 50%;
                                transform: translateY(-50%);
                                background: none;
                                border: none;
                                color: #9ca3af;
                                cursor: pointer;
                                font-size: 1.2rem;
                                padding: 0;
                                outline: none;
                                user-select: none;
                                transition: color 0.3s ease;
                            "
                            onmouseover="this.style.color='#e0e0e0'"
                            onmouseout="this.style.color='#9ca3af'">👁️</button>
                    </div>
                    <small style="color: #9ca3af; margin-top: 0.75rem; display: block; font-size: 0.9rem;">
                        🔐 Password protection is enabled for this system
                    </small>
                </div>
            ` : '';

            const modalHTML = `
                <div id="loginModal" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    backdrop-filter: blur(5px);
                ">
                    <div style="
                        background: linear-gradient(135deg, #1e1e2e, #2a2a40);
                        padding: 2.5rem;
                        border-radius: 16px;
                        max-width: 450px;
                        width: 90%;
                        max-height: 85vh;
                        overflow-y: auto;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        color: #e0e0e0;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                            <h2 style="margin: 0; color: #7c3aed; font-size: 1.8rem;">
                                🚀 Welcome to MetaFold
                                ${requirePassword ? '<span style="font-size: 1.2rem; color: #f59e0b; margin-left: 0.5rem;">🔒</span>' : ''}
                            </h2>
                            <button onclick="loginModal.showUserManagement()" style="
                                background: linear-gradient(45deg, #059669, #10b981);
                                color: white;
                                border: none;
                                padding: 0.5rem 1rem;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 0.9rem;
                                transition: all 0.3s ease;
                                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                            " onmouseover="this.style.transform='translateY(-2px)'" 
                            onmouseout="this.style.transform='translateY(0)'">
                                👥 Manage Users
                            </button>
                        </div>
                        <p style="margin: 0 0 2rem 0; color: #9ca3af; text-align: center; font-size: 1.1rem;">
                            ${welcomeMessage}
                        </p>
                        
                        ${(() => {
                            // ✅ IMPROVED: Continue-Button nur anzeigen wenn weder requirePassword noch lastUser has password
                            if (requirePassword) return ''; // Global password requirement
                        if (!hasLastUser) return ''; // No last user
                        
                        // Check if last user has a password
                        const lastUserHasPassword = window.secureStorage && 
                                           window.secureStorage.hasUserPassword && 
                                               window.secureStorage.hasUserPassword(lastUser.username);
                        
                        if (lastUserHasPassword) {
                        // Show info but with password-required styling instead of Continue button
                        return `
                        <!-- Last User Info (Password Required) -->
                        <div style="margin-bottom: 2rem; padding: 1rem; background: rgba(5, 150, 105, 0.1); border-radius: 12px; border: 1px solid rgba(5, 150, 105, 0.3);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="color: #10b981; font-weight: 600; font-size: 1.1rem;">${lastUser.username} 🔐</div>
                                <div style="color: #9ca3af; font-size: 0.9rem;">${lastUser.groupname || 'Default'}</div>
                                <div style="color: #6b7280; font-size: 0.8rem; margin-top: 2px;">Last used: ${this.formatLastUsed(lastUser.timestamp)}</div>
                                </div>
                                <button onclick="loginModal.continueWithLastUser()" style="
                                background: linear-gradient(45deg, #059669, #10b981);
                                    color: white;
                                        border: none;
                                            padding: 0.75rem 1.5rem;
                                            border-radius: 10px;
                            cursor: pointer;
                            font-size: 1rem;
                            font-weight: 600;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
                        " onmouseover="this.style.transform='translateY(-2px)'"
                        onmouseout="this.style.transform='translateY(0)'">
                            ✅ Continue
                        </button>
                    </div>
                </div>
                `;
            } else {
                // Original continue button for users without password
                return `
                <!-- Quick Continue with Last User (no password required) -->
                <div style="margin-bottom: 2rem; padding: 1rem; background: rgba(124, 58, 237, 0.1); border-radius: 12px; border: 1px solid rgba(124, 58, 237, 0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="color: #a855f7; font-weight: 600; font-size: 1.1rem;">${lastUser.username}</div>
                            <div style="color: #9ca3af; font-size: 0.9rem;">${lastUser.groupname || 'Default'}</div>
                            <div style="color: #6b7280; font-size: 0.8rem; margin-top: 2px;">Last used: ${this.formatLastUsed(lastUser.timestamp)}</div>
                        </div>
                        <button onclick="loginModal.continueWithLastUser()" style="
                            background: linear-gradient(45deg, #059669, #10b981);
                            color: white;
                            border: none;
                            padding: 0.75rem 1.5rem;
                            border-radius: 10px;
                            cursor: pointer;
                            font-size: 1rem;
                            font-weight: 600;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
                        " onmouseover="this.style.transform='translateY(-2px)'"
                        onmouseout="this.style.transform='translateY(0)'">
                            ✅ Continue
                        </button>
                    </div>
                </div>
                `;
            }
        })()}
                        
                        <div style="margin-bottom: 2rem;">
                            <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #a855f7; font-size: 1rem;">
                                👤 ${hasLastUser ? 'Or select different user:' : 'Your Name:'}
                            </label>
                            <div style="position: relative;">
                                <input type="text" id="usernameInput" placeholder="${hasLastUser ? 'Enter different name or select from history' : 'e.g. Dr. Jane Smith'}" 
                                    autocomplete="username" style="
                                    width: 100%;
                                    padding: 1rem;
                                    border: 1px solid rgba(255, 255, 255, 0.2);
                                    border-radius: 8px;
                                    font-size: 1rem;
                                    box-sizing: border-box;
                                    background: rgba(255, 255, 255, 0.05);
                                    color: #e0e0e0;
                                    transition: all 0.3s ease;
                                " onfocus="this.style.borderColor='#7c3aed'; this.style.boxShadow='0 0 0 2px rgba(124, 58, 237, 0.2)'"
                                onblur="this.style.borderColor='rgba(255, 255, 255, 0.2)'; this.style.boxShadow='none'">
                                <div id="userSuggestions" style="
                                    position: absolute;
                                    top: 100%;
                                    left: 0;
                                    right: 0;
                                    background: linear-gradient(135deg, #2a2a40, #1e1e2e);
                                    border: 1px solid rgba(255, 255, 255, 0.2);
                                    border-radius: 8px;
                                    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                                    display: none;
                                    z-index: 1000;
                                    max-height: 200px;
                                    overflow-y: auto;
                                    margin-top: 4px;
                                "></div>
                            </div>
                            <small style="color: #9ca3af; margin-top: 0.75rem; display: block; font-size: 0.9rem;">
                                💡 Groups can be assigned in user management
                            </small>
                        </div>
                        
                        ${passwordFieldHTML}
                        
                        <div style="text-align: center;">
                            <button id="loginConfirm" style="
                                background: linear-gradient(45deg, #7c3aed, #a855f7);
                                color: white;
                                border: none;
                                padding: 1rem 2.5rem;
                                border-radius: 12px;
                                font-size: 1.1rem;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
                                min-width: 160px;
                            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(124, 58, 237, 0.4)'" 
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(124, 58, 237, 0.3)'">
                                ${requirePassword ? '🔓 Login' : '🚀 Let\'s Go!'}
                            </button>
                        </div>
                        
                        <div style="margin-top: 1.5rem; text-align: center;">
                            <small style="color: #6b7280; font-size: 0.85rem;">
                                ${requirePassword ? 'Passwords are securely encrypted 🔐' : 'Your data stays local in your browser 🔒'}
                            </small>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            this.modal = document.getElementById('loginModal');
            this.usernameInput = document.getElementById('usernameInput');
            this.passwordInput = document.getElementById('passwordInput'); // Kann null sein wenn kein Password-Field
            this.userSuggestions = document.getElementById('userSuggestions');
        },

    setupEventListeners() {
            // Auto-complete for username
            this.usernameInput.addEventListener('input', (e) => {
                this.showUserSuggestions(e.target.value);
            });

            // Hide suggestions when clicking outside or losing focus
            this.usernameInput.addEventListener('blur', (e) => {
                const suggestionsContainer = this.userSuggestions;
                const relatedTarget = e.relatedTarget;
                
                setTimeout(() => {
                    if (suggestionsContainer && 
                        (!relatedTarget || !suggestionsContainer.contains(relatedTarget))) {
                        suggestionsContainer.style.display = 'none';
                    }
                }, 300);
            });

            // Show suggestions on focus if there's text
            this.usernameInput.addEventListener('focus', () => {
                if (this.usernameInput.value.trim()) {
                    this.showUserSuggestions(this.usernameInput.value);
                }
            });

            // ✅ VERBESSERTE INPUT FIELD HANDLER
            // Focus/Blur für Username Input
            this.usernameInput.addEventListener('focus', (e) => {
                e.target.style.borderColor = '#7c3aed';
                e.target.style.boxShadow = '0 0 0 2px rgba(124, 58, 237, 0.2)';
            });
            
            this.usernameInput.addEventListener('blur', (e) => {
                if (e.target !== document.activeElement) {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.boxShadow = 'none';
                }
            });

            // Password Input Event Handlers (if exists)
            if (this.passwordInput) {
                // ✅ ROBUSTE FOCUS/BLUR HANDLER für Password
                this.passwordInput.addEventListener('focus', (e) => {
                    e.target.style.borderColor = '#7c3aed';
                    e.target.style.boxShadow = '0 0 0 2px rgba(124, 58, 237, 0.2)';
                    console.log('🔐 Password field focused');
                });
                
                this.passwordInput.addEventListener('blur', (e) => {
                    // Nur Style zurücksetzen wenn nicht aktiv
                    if (e.target !== document.activeElement) {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.boxShadow = 'none';
                    }
                });

                // ✅ VERHINDERE CURSOR-VERLUST bei Interaktion
                this.passwordInput.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                });

                this.passwordInput.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (e.target !== document.activeElement) {
                        e.target.focus();
                    }
                });

                // Enter key für Password
                this.passwordInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handleConfirm();
                    }
                });

                // ✅ PASSWORD TOGGLE BUTTON (robuster)
                const passwordToggle = document.getElementById('passwordToggle');
                if (passwordToggle) {
                    passwordToggle.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.togglePasswordVisibility();
                        // Nach Toggle wieder auf Password Input focussieren
                        setTimeout(() => {
                            if (this.passwordInput) {
                                this.passwordInput.focus();
                            }
                        }, 10);
                    });
                }
            }

            // Confirm button
            const confirmBtn = document.getElementById('loginConfirm');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    this.handleConfirm();
                });
            }

            // Enter key für Username
            this.usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (this.passwordInput && this.passwordRequired) {
                        // Focus auf Password field
                        this.passwordInput.focus();
                    } else {
                        this.handleConfirm();
                    }
                }
            });

            // ✅ GLOBAL ESCAPE KEY (robuster)
            const escapeHandler = (e) => {
                if (e.key === 'Escape' && this.modal) {
                    this.handleCancel();
                }
            };
            document.addEventListener('keydown', escapeHandler);
            
            // Store reference für cleanup
            this.escapeHandler = escapeHandler;

            // ✅ INITIAL FOCUS (verzögert und robust)
            setTimeout(() => {
                if (this.usernameInput && this.modal) {
                    try {
                        this.usernameInput.focus();
                        this.usernameInput.select();
                        console.log('✅ Initial focus set on username input');
                    } catch (error) {
                        console.warn('⚠️ Could not set initial focus:', error);
                        // Fallback: Focus ohne select
                        setTimeout(() => {
                            if (this.usernameInput) {
                                this.usernameInput.focus();
                            }
                        }, 100);
                    }
                }
            }, 200); // Längere Verzögerung für bessere Stabilität
        },


    loadSuggestions() {
        // Set placeholder based on existing users
        const users = window.userManager?.users || [];
        
        if (users.length > 0) {
            this.usernameInput.placeholder = `e.g. ${users[0]} or enter new name`;
        } else {
            this.usernameInput.placeholder = 'e.g. Dr. Jane Smith';
        }
    },

    showUserSuggestions(query) {
        if (!query || query.length < 1) {
            this.userSuggestions.style.display = 'none';
            return;
        }

        const users = window.userManager?.users || [];
        
        const suggestions = users
            .filter(user => user.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5);

        this.renderUserSuggestions(this.userSuggestions, suggestions, (user) => {
            console.log('🔄 User selected from suggestions:', user);
            
            if (this.usernameInput) {
                this.usernameInput.value = user;
            }
            
            setTimeout(() => {
                if (this.userSuggestions) {
                    this.userSuggestions.style.display = 'none';
                }
            }, 50);
            
            setTimeout(() => {
                if (this.usernameInput) {
                    this.usernameInput.focus();
                }
            }, 100);
        });
    },

    renderUserSuggestions(container, suggestions, onClick) {
        if (suggestions.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = suggestions
            .map((user, index) => {
                // FIXED: Get proper group from storage
                const group = this.getUserGroupFromStorage(user);
                const color = window.userManager?.generateUserColor(user) || '#7c3aed';
                const initials = window.userManager?.getUserInitials(user) || '??';
                
                return `<div class="suggestion-item" data-user="${user}" data-index="${index}" style="
                    padding: 0.75rem;
                    cursor: pointer;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    transition: all 0.2s ease;
                    user-select: none;
                ">
                    <div style="
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        background: ${color};
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 0.8rem;
                        margin-right: 0.75rem;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                        pointer-events: none;
                    ">${initials}</div>
                    <div style="pointer-events: none;">
                        <div style="font-weight: 600; color: #e0e0e0;">${user}</div>
                        <div style="color: #9ca3af; font-size: 0.85rem;">${group}</div>
                    </div>
                </div>`;
            })
            .join('');

        container.style.display = 'block';

        // Add click handlers
        container.querySelectorAll('.suggestion-item').forEach((item, index) => {
            const username = item.getAttribute('data-user');
            
            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(124, 58, 237, 0.1)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });
            
            const handleSelection = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                console.log('User suggestion selected:', username);
                container.style.display = 'none';
                onClick(username);
            };
            
            item.addEventListener('click', handleSelection, true);
            item.addEventListener('mousedown', handleSelection, true);
            item.addEventListener('touchstart', handleSelection, true);
        });

        container.addEventListener('click', (e) => {
            const suggestionItem = e.target.closest('.suggestion-item');
            if (suggestionItem) {
                const username = suggestionItem.getAttribute('data-user');
                if (username) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Container click - User selected:', username);
                    container.style.display = 'none';
                    onClick(username);
                }
            }
        }, true);
    },

    showUserManagement() {
        // ✅ FIXED: Null-Check für this.modal
        if (!this.modal) {
            console.warn('⚠️ Login modal not available');
            return;
        }
        
        this.modal.style.display = 'none';
        
        if (window.userManagementModal) {
            window.userManagementModal.show();
            
            // ✅ FIXED: Sichere originalClose mit Null-Check
            const originalClose = window.userManagementModal.close;
            window.userManagementModal.close = () => {
                // Call original close if exists
                if (originalClose && typeof originalClose === 'function') {
                    originalClose.call(window.userManagementModal);
                }
                
                // ✅ FIXED: Null-Check vor Style-Zugriff
                if (this.modal) {
                    this.modal.style.display = 'flex';
                    this.loadSuggestions();
                    if (this.usernameInput) {
                        this.usernameInput.focus();
                    }
                }
            };
        } else {
            console.warn('User management modal not available');
            if (this.modal) {
                this.modal.style.display = 'flex';
            }
        }
    },

    // ✅ MODAL-BASIERTE Continue-Funktion - Ersetzt prompt() mit Modal
    async continueWithLastUser() {
        const lastUser = this.getLastUser();
        if (!lastUser || !lastUser.username || lastUser.username === 'User') {
            this.showError('No valid last user found');
            return;
        }

        // Group aus Storage laden (wie bisher)
        const actualGroup = this.getUserGroupFromStorage(lastUser.username) || lastUser.groupname || 'Default';
        
        console.log(`🔄 Continue attempt for user: ${lastUser.username} (${actualGroup})`);
        
        // 🐛 DEBUG: Schaue was mit hasUserPassword passiert
        console.log('🐛 DEBUG secureStorage available:', !!window.secureStorage);
        console.log('🐛 DEBUG hasUserPassword function:', !!window.secureStorage?.hasUserPassword);
        
        // ✅ PASSWORT-CHECK: Nutze Modal statt prompt()!
        const hasPassword = window.secureStorage?.hasUserPassword?.(lastUser.username);
        console.log('🐛 DEBUG hasPassword result:', hasPassword);
        
        if (hasPassword) {
            console.log(`🔐 User ${lastUser.username} has password - requesting verification`);
            
            try {
                // ✅ VERWENDE MODAL STATT PROMPT() - wie in userManagementModal.js
                const password = await this.promptForPassword(lastUser.username);
                if (!password) {
                    console.log('❌ Continue cancelled - no password provided');
                    return;
                }
                
                const isValid = await window.secureStorage.verifyUserPassword(lastUser.username, password);
                if (!isValid) {
                    this.showError('Invalid password. Continue cancelled.');
                    console.log(`❌ Invalid password for continue: ${lastUser.username}`);
                    return;
                }
                
                console.log(`✅ Password verified for continue: ${lastUser.username}`);
                console.log('✅ Password verified for continue:', lastUser.username);

                // 🐛 DEBUG
                console.log('🐛 DEBUG: Trying to cache password...');
                console.log('🐛 window.settingsManager exists:', !!window.settingsManager);
                console.log('🐛 setUserPasswordForEntropy exists:', typeof window.settingsManager?.setUserPasswordForEntropy);

                // 🔐 NEW: Cache password for settings encryption
                if (window.settingsManager && window.settingsManager.setUserPasswordForEntropy) {
                    window.settingsManager.setUserPasswordForEntropy(lastUser.username, password);
                    console.log('🔐 Password cached for secure settings (continue)');
                }
                
            } catch (error) {
                console.error('❌ Password verification failed:', error);
                this.showError('Password verification failed. Please try again.');
                return;
            }
        } else {
            console.log('🔓 No password required for user:', lastUser.username);
        }
        
        // Erfolg - Continue wie bisher
        console.log(`✅ Continue with last user (${hasPassword ? 'password verified' : 'no password required'}): ${lastUser.username}`);
        this.close();
        this.onConfirm({ 
            username: lastUser.username, 
            groupname: actualGroup,
            isContinuation: true,
            passwordVerified: hasPassword // Info für Logging
        });
    },

    // ✅ NEUE HILFSFUNKTION: Modal-basierte Passwort-Abfrage (wie in userManagementModal.js)
    promptForPassword(username) {
        return new Promise((resolve) => {
            const promptHTML = `
                <div id="loginPasswordPrompt" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10003;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    backdrop-filter: blur(5px);
                ">
                    <div style="
                        background: linear-gradient(135deg, #1e1e2e, #2a2a40);
                        padding: 2.5rem;
                        border-radius: 16px;
                        max-width: 450px;
                        width: 90%;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.6);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        color: #e0e0e0;
                    ">
                        <h3 style="margin: 0 0 1.5rem 0; color: #7c3aed; text-align: center; font-size: 1.5rem;">
                            🔐 Password Required
                        </h3>
                        <p style="margin: 0 0 2rem 0; color: #9ca3af; text-align: center; font-size: 1.1rem;">
                            Enter password for <strong style="color: #a855f7;">${username}</strong>:
                        </p>
                        <div style="position: relative; margin-bottom: 2rem;">
                            <input type="password" id="loginPasswordInput" placeholder="Enter your password" style="
                                width: 100%;
                                padding: 1rem;
                                border: 1px solid rgba(255, 255, 255, 0.2);
                                border-radius: 12px;
                                font-size: 1.1rem;
                                box-sizing: border-box;
                                background: rgba(255, 255, 255, 0.05);
                                color: #e0e0e0;
                                font-family: inherit;
                                outline: none;
                                transition: border-color 0.3s ease;
                            " onfocus="this.style.borderColor='#7c3aed'; this.style.boxShadow='0 0 0 2px rgba(124, 58, 237, 0.2)'"
                               onblur="this.style.borderColor='rgba(255, 255, 255, 0.2)'; this.style.boxShadow='none'">
                            <button type="button" id="passwordToggleLogin" style="
                                position: absolute;
                                right: 1rem;
                                top: 50%;
                                transform: translateY(-50%);
                                background: none;
                                border: none;
                                color: #9ca3af;
                                cursor: pointer;
                                font-size: 1.2rem;
                                padding: 0;
                                outline: none;
                                transition: color 0.3s ease;
                            " onmouseover="this.style.color='#e0e0e0'"
                               onmouseout="this.style.color='#9ca3af'"
                               onclick="loginModal.togglePasswordVisibilityInPrompt()">👁️</button>
                        </div>
                        <div style="display: flex; gap: 1rem;">
                            <button onclick="
                                document.getElementById('loginPasswordPrompt').remove(); 
                                resolve(null);
                            " style="
                                flex: 1;
                                background: linear-gradient(45deg, #6b7280, #9ca3af);
                                color: white;
                                border: none;
                                padding: 1rem;
                                border-radius: 12px;
                                cursor: pointer;
                                font-weight: 600;
                                font-size: 1rem;
                                transition: all 0.3s ease;
                                box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
                            " onmouseover="this.style.transform='translateY(-2px)'"
                               onmouseout="this.style.transform='translateY(0)'">❌ Cancel</button>
                            <button onclick="
                                const pwd = document.getElementById('loginPasswordInput').value;
                                document.getElementById('loginPasswordPrompt').remove();
                                resolve(pwd);
                            " style="
                                flex: 1;
                                background: linear-gradient(45deg, #7c3aed, #a855f7);
                                color: white;
                                border: none;
                                padding: 1rem;
                                border-radius: 12px;
                                cursor: pointer;
                                font-weight: 600;
                                font-size: 1rem;
                                transition: all 0.3s ease;
                                box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
                            " onmouseover="this.style.transform='translateY(-2px)'"
                               onmouseout="this.style.transform='translateY(0)'">🔓 Continue</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', promptHTML);
            
            // Focus auf Password Input und Enter-Key-Support
            setTimeout(() => {
                const input = document.getElementById('loginPasswordInput');
                if (input) {
                    input.focus();
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            const pwd = input.value;
                            document.getElementById('loginPasswordPrompt').remove();
                            resolve(pwd);
                        }
                    });
                }
            }, 100);
        });
    },

    // ✅ HILFSFUNKTION: Toggle Password Visibility im Prompt
    togglePasswordVisibilityInPrompt() {
        const passwordInput = document.getElementById('loginPasswordInput');
        const toggleButton = document.getElementById('passwordToggleLogin');
        
        if (!passwordInput || !toggleButton) return;
        
        try {
            const cursorPosition = passwordInput.selectionStart;
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleButton.textContent = '🙈';
                toggleButton.title = 'Hide password';
            } else {
                passwordInput.type = 'password';
                toggleButton.textContent = '👁️';
                toggleButton.title = 'Show password';
            }
            
            // Cursor-Position wiederherstellen
            setTimeout(() => {
                passwordInput.setSelectionRange(cursorPosition, cursorPosition);
                passwordInput.focus();
            }, 10);
            
            console.log('✅ Password visibility toggled in prompt');
        } catch (error) {
            console.warn('⚠️ Password visibility toggle failed:', error);
        }
    },

    // NEW: Get user group from storage
    getUserGroupFromStorage(username) {
        try {
            const mapping = JSON.parse(localStorage.getItem('metafold_user_group_mapping') || '{}');
            const group = mapping[username];
            console.log(`🔧 getUserGroupFromStorage("${username}") → "${group || 'Default'}"`);
            return group || 'Default';
        } catch (error) {
            console.warn('Could not load user-group mapping:', error);
            return 'Default';
        }
    },

    // IMPROVED: Get last user helper
    getLastUser() {
        try {
            const stored = localStorage.getItem('metafold_last_user');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('Could not load last user:', error);
            return null;
        }
    },

    // IMPROVED: Format last used timestamp
    formatLastUsed(timestamp) {
        if (!timestamp) return 'Unknown';
        
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
            
            if (diffHours < 1) return 'Just now';
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            
            return date.toLocaleDateString();
        } catch (error) {
            return 'Unknown';
        }
    },

    // ✅ VERBESSERTE handleConfirm Funktion - Verhindert Passwort-Umgehung
    async handleConfirm() {
            const username = this.usernameInput.value.trim();
            const password = this.passwordInput ? this.passwordInput.value : '';

            // Basic validation
            if (!username) {
                this.showError('Please enter your name to continue.');
                this.usernameInput.focus();
                return;
            }

            if (username.length < 2) {
                this.showError('Name must be at least 2 characters long.');
                this.usernameInput.focus();
                return;
            }

            try {
                // Show loading state
                this.setLoadingState(true);
                
                // ✅ KRITISCHER FIX: IMMER Password-Check durchführen, nicht nur wenn passwordRequired
                console.log(`🔍 Checking if user "${username}" has password protection...`);
                
                // Prüfe ob User ein Passwort hat (unabhängig von passwordRequired flag)
                const userHasPassword = window.secureStorage?.hasUserPassword && 
                                      window.secureStorage.hasUserPassword(username);
                
                console.log(`🔍 User "${username}" has password: ${userHasPassword}`);
                
                if (userHasPassword) {
                    console.log(`🔐 Password required for user: ${username}`);
                    
                    // Wenn kein Passwort-Feld vorhanden ist, prompt-Modal verwenden
                    if (!this.passwordInput || !password) {
                        console.log('🔐 No password field visible, showing modal prompt...');
                        this.setLoadingState(false);
                        
                        // Verwende Modal-Passwort-Abfrage
                        const modalPassword = await this.promptForPassword(username);
                        if (!modalPassword) {
                            console.log('❌ Login cancelled - no password provided via modal');
                            return;
                        }
                        
                        // Verify modal password
                        const isValidModal = await window.secureStorage.verifyUserPassword(username, modalPassword);
                        if (!isValidModal) {
                            this.showError('Invalid password. Please try again.');
                            console.log(`❌ Invalid password for user: ${username}`);
                            return;
                        }
                        
                        console.log(`✅ Password verified via modal for user: ${username}`);
                    
                        

                     console.log(`✅ Password verified via modal for user: ${username}`);

                    // 🐛 DEBUG
                    console.log('🐛 DEBUG: Trying to cache password (modal)...');
                    console.log('🐛 window.settingsManager exists:', !!window.settingsManager);
                    console.log('🐛 setUserPasswordForEntropy exists:', typeof window.settingsManager?.setUserPasswordForEntropy);
                // 🔐 NEW: Cache password for settings encryption
                if (window.settingsManager && window.settingsManager.setUserPasswordForEntropy) {
                    window.settingsManager.setUserPasswordForEntropy(username, modalPassword);
                    console.log('🔐 Password cached for secure settings (modal)');
                }
            } else {
                        // Passwort-Feld ist sichtbar, verwende dessen Wert
                        if (!password) {
                            this.setLoadingState(false);
                            this.showError('Password is required for this user.');
                            if (this.passwordInput) this.passwordInput.focus();
                            return;
                        }
                        
                        // Verify field password
                        const isValidField = await window.secureStorage.verifyUserPassword(username, password);
                        if (!isValidField) {
                            this.setLoadingState(false);
                            this.showError('Invalid password.');
                            if (this.passwordInput) {
                                this.passwordInput.value = '';
                                this.passwordInput.focus();
                            }
                            return;
                        }
                        
                        console.log(`✅ Password verified via field for user: ${username}`);

                        // 🐛 DEBUG
                        console.log('🐛 DEBUG: Trying to cache password (field)...');
                        console.log('🐛 window.settingsManager exists:', !!window.settingsManager);
                        console.log('🐛 setUserPasswordForEntropy exists:', typeof window.settingsManager?.setUserPasswordForEntropy);


                        // 🔐 NEW: Cache password for settings encryption
                        if (window.settingsManager && window.settingsManager.setUserPasswordForEntropy) {
                            window.settingsManager.setUserPasswordForEntropy(username, password);
                            console.log('🐛 DEBUG: About to cache password via modal');
                            console.log('🐛 settingsManager exists:', !!window.settingsManager);
                            console.log('🐛 setUserPasswordForEntropy exists:', !!window.settingsManager?.setUserPasswordForEntropy);
                            console.log('🔐 Password cached for secure settings (field)');
                        }
                    }
                } else {
                    console.log(`🔓 No password required for user: ${username}`);
                }

                // Get group
                const groupname = this.getUserGroupFromStorage(username);

                console.log(`✅ Login confirmed: "${username}" in group: "${groupname}"`);
                this.close();
                this.onConfirm({ 
                    username, 
                    groupname, 
                    passwordVerified: userHasPassword // Korrekte Info für Logging
                });
                
            } catch (error) {
                console.error('❌ Login confirmation failed:', error);
                this.setLoadingState(false);
                this.showError('Login failed: ' + error.message);
            }
        },

    // =================== NEUE HILFSFUNKTIONEN (hinzufügen) ===================

        /**
         * Toggle password visibility (✅ VERBESSERTE VERSION)
         */
        togglePasswordVisibility() {
            const passwordInput = document.getElementById('passwordInput');
            const toggleButton = document.getElementById('passwordToggle');
            
            if (!passwordInput || !toggleButton) return;
            
            try {
                // Store current cursor position
                const cursorPosition = passwordInput.selectionStart;
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    toggleButton.textContent = '🙈';
                    toggleButton.title = 'Hide password';
                } else {
                    passwordInput.type = 'password';
                    toggleButton.textContent = '👁️';
                    toggleButton.title = 'Show password';
                }
                
                // Restore cursor position
                setTimeout(() => {
                    passwordInput.setSelectionRange(cursorPosition, cursorPosition);
                    passwordInput.focus();
                }, 10);
                
                console.log('✅ Password visibility toggled');
            } catch (error) {
                console.warn('⚠️ Password visibility toggle failed:', error);
            }
        },

        /**
         * Set loading state for login button
         * @param {boolean} loading - Whether to show loading state
         */
        setLoadingState(loading) {
            const button = document.getElementById('loginConfirm');
            if (!button) return;
            
            if (loading) {
                button.disabled = true;
                button.style.opacity = '0.7';
                button.innerHTML = '⏳ Verifying...';
                button.style.cursor = 'not-allowed';
            } else {
                button.disabled = false;
                button.style.opacity = '1';
                button.innerHTML = this.passwordRequired ? '🔓 Login' : '🚀 Let\'s Go!';
                button.style.cursor = 'pointer';
            }
        },





    handleCancel() {
        console.log('❌ Login cancelled');
        this.close();
        this.onCancel(new Error('Login cancelled'));
    },

    showError(message) {
        let errorDiv = this.modal.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.cssText = `
                background: linear-gradient(45deg, #dc2626, #ef4444);
                color: white;
                padding: 0.75rem;
                border-radius: 8px;
                margin: 1rem 0;
                border: 1px solid rgba(239, 68, 68, 0.3);
                text-align: center;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
            `;
            this.modal.querySelector('div > div').appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            if (errorDiv.style.display !== 'none') {
                errorDiv.style.display = 'none';
            }
        }, 4000);
    },

    close() {
        // ✅ Cleanup event listeners
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
        
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
            this.usernameInput = null;
            this.passwordInput = null;
            this.userSuggestions = null;
        }
        
        console.log('✅ Login modal closed and cleaned up');
    },

    // 🐛 DEBUG: Teste ob User ein Passwort hat
    async debugPasswordStatus() {
        console.log('🐛 === PASSWORD DEBUG SESSION ===');
        console.log('🐛 secureStorage available:', !!window.secureStorage);
        console.log('🐛 hasUserPassword function:', typeof window.secureStorage?.hasUserPassword);
        
        const testUser = 'Thomas';
        
        // Test hasUserPassword direkt
        if (window.secureStorage && window.secureStorage.hasUserPassword) {
            const hasPassword = window.secureStorage.hasUserPassword(testUser);
            console.log(`🐛 ${testUser} hasPassword (direct):`, hasPassword);
            
            // Test localStorage direkt
            const storageKey = `user_password_${testUser}`;
            const storedData = localStorage.getItem(storageKey);
            console.log(`🐛 ${testUser} raw localStorage:`, !!storedData);
            console.log(`🐛 ${testUser} raw data:`, storedData ? 'EXISTS' : 'MISSING');
        }
        
        // Test alle User im localStorage
        console.log('🐛 ALL localStorage keys with user_password:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes('user_password_')) {
                console.log(`🐛 Found password key: ${key}`);
            }
        }
        
        console.log('🐛 === END DEBUG SESSION ===');
    }
};

window.loginModal = loginModal;
console.log('✅ loginModal loaded (FIXED Group Assignment)');
// ✅ FIX: Auto-show removed - userManager.init() will show modal at correct time after Admin account check