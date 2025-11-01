// Admin Password Change System
// Ensures Admin password is changed from default on first use

const adminPasswordManager = {
    defaultPassword: 'admin',
    adminUsername: 'Admin',
    
    /**
     * Check if Admin is using default password
     * @returns {Promise<boolean>}
     */
    async isUsingDefaultPassword() {
        if (!window.secureStorage) return false;
        
        try {
            const hasAdmin = window.secureStorage.hasUserPassword(this.adminUsername);
            if (!hasAdmin) return false;
            
            // Try to verify with default password
            return await window.secureStorage.verifyUserPassword(
                this.adminUsername, 
                this.defaultPassword
            );
        } catch (error) {
            console.error('Failed to check default password:', error);
            return false;
        }
    },
    
    /**
     * Show mandatory password change dialog
     * @returns {Promise<boolean>} - True if password changed successfully
     */
    async showMandatoryPasswordChange() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.id = 'adminPasswordChangeModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                backdrop-filter: blur(10px);
            `;
            
            modal.innerHTML = `
                <div style="
                    background: linear-gradient(135deg, #1e1e2e, #2a2a40);
                    padding: 3rem;
                    border-radius: 16px;
                    max-width: 550px;
                    width: 90%;
                    box-shadow: 0 25px 80px rgba(0,0,0,0.8);
                    border: 3px solid #dc2626;
                ">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="
                            width: 80px;
                            height: 80px;
                            margin: 0 auto 1rem;
                            background: linear-gradient(135deg, #dc2626, #ef4444);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 3rem;
                        ">🔐</div>
                        <h2 style="margin: 0 0 0.5rem 0; color: #dc2626; font-size: 2rem;">
                            Mandatory Security Update
                        </h2>
                        <p style="margin: 0; color: #9ca3af; font-size: 1rem;">
                            Administrator Account Security
                        </p>
                    </div>
                    
                    <div style="
                        background: rgba(220, 38, 38, 0.1);
                        border: 1px solid #dc2626;
                        border-radius: 8px;
                        padding: 1.5rem;
                        margin-bottom: 2rem;
                    ">
                        <p style="margin: 0 0 1rem 0; color: #fca5a5; font-weight: bold;">
                            ⚠️ SECURITY NOTICE
                        </p>
                        <p style="margin: 0; color: #e0e0e0; line-height: 1.6;">
                            The Admin account is currently using the default password "<strong style="color: #dc2626;">admin</strong>".
                            <br><br>
                            For security reasons, you <strong>must</strong> change this password now before continuing.
                            <br><br>
                            This is a one-time requirement to protect your MetaFold installation.
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; color: #e0e0e0; margin-bottom: 0.5rem; font-weight: 500;">
                            Current Password:
                        </label>
                        <input 
                            type="password" 
                            id="adminCurrentPassword" 
                            value="admin"
                            readonly
                            style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 2px solid #4b5563;
                                border-radius: 8px;
                                background: rgba(0,0,0,0.3);
                                color: #9ca3af;
                                font-size: 1rem;
                                box-sizing: border-box;
                            ">
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; color: #e0e0e0; margin-bottom: 0.5rem; font-weight: 500;">
                            New Password: <span style="color: #dc2626;">*</span>
                        </label>
                        <div style="position: relative;">
                            <input 
                                type="password" 
                                id="adminNewPassword" 
                                placeholder="Enter a strong password"
                                style="
                                    width: 100%;
                                    padding: 0.75rem;
                                    padding-right: 3rem;
                                    border: 2px solid #dc2626;
                                    border-radius: 8px;
                                    background: rgba(0,0,0,0.3);
                                    color: white;
                                    font-size: 1rem;
                                    box-sizing: border-box;
                                ">
                            <button 
                                id="toggleNewPassword"
                                type="button"
                                style="
                                    position: absolute;
                                    right: 10px;
                                    top: 50%;
                                    transform: translateY(-50%);
                                    background: none;
                                    border: none;
                                    color: #9ca3af;
                                    cursor: pointer;
                                    font-size: 1.2rem;
                                    padding: 0.5rem;
                                ">👁️</button>
                        </div>
                        <div id="passwordStrength" style="
                            margin-top: 0.5rem;
                            padding: 0.5rem;
                            border-radius: 4px;
                            font-size: 0.875rem;
                            display: none;
                        "></div>
                    </div>
                    
                    <div style="margin-bottom: 2rem;">
                        <label style="display: block; color: #e0e0e0; margin-bottom: 0.5rem; font-weight: 500;">
                            Confirm New Password: <span style="color: #dc2626;">*</span>
                        </label>
                        <div style="position: relative;">
                            <input 
                                type="password" 
                                id="adminConfirmPassword" 
                                placeholder="Re-enter your password"
                                style="
                                    width: 100%;
                                    padding: 0.75rem;
                                    padding-right: 3rem;
                                    border: 2px solid #dc2626;
                                    border-radius: 8px;
                                    background: rgba(0,0,0,0.3);
                                    color: white;
                                    font-size: 1rem;
                                    box-sizing: border-box;
                                ">
                            <button 
                                id="toggleConfirmPassword"
                                type="button"
                                style="
                                    position: absolute;
                                    right: 10px;
                                    top: 50%;
                                    transform: translateY(-50%);
                                    background: none;
                                    border: none;
                                    color: #9ca3af;
                                    cursor: pointer;
                                    font-size: 1.2rem;
                                    padding: 0.5rem;
                                ">👁️</button>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 2rem;">
                        <div style="
                            background: rgba(59, 130, 246, 0.1);
                            border: 1px solid #3b82f6;
                            border-radius: 8px;
                            padding: 1rem;
                        ">
                            <p style="margin: 0; color: #93c5fd; font-size: 0.875rem; line-height: 1.5;">
                                💡 <strong>Password Requirements:</strong><br>
                                • Minimum 3 characters (8+ recommended)<br>
                                • Mix of letters, numbers, and symbols<br>
                                • Avoid common words or patterns<br>
                                • Different from default password
                            </p>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <button id="changePasswordBtn" style="
                            width: 100%;
                            padding: 1rem;
                            border: none;
                            border-radius: 8px;
                            background: linear-gradient(135deg, #dc2626, #ef4444);
                            color: white;
                            font-size: 1.1rem;
                            font-weight: bold;
                            cursor: pointer;
                            transition: all 0.3s;
                        ">🔐 Change Password & Continue</button>
                    </div>
                    
                    <div id="changePasswordError" style="
                        display: none;
                        padding: 1rem;
                        background: rgba(220, 38, 38, 0.2);
                        border: 1px solid #dc2626;
                        border-radius: 8px;
                        color: #fca5a5;
                        text-align: center;
                        margin-top: 1rem;
                    "></div>
                    
                    <p style="
                        margin: 1rem 0 0 0;
                        color: #6b7280;
                        font-size: 0.875rem;
                        text-align: center;
                    ">
                        This step is required for security. You cannot skip it.
                    </p>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Elements
            const newPasswordInput = document.getElementById('adminNewPassword');
            const confirmPasswordInput = document.getElementById('adminConfirmPassword');
            const changeBtn = document.getElementById('changePasswordBtn');
            const errorDiv = document.getElementById('changePasswordError');
            const strengthDiv = document.getElementById('passwordStrength');
            
            // Password visibility toggles
            document.getElementById('toggleNewPassword').addEventListener('click', () => {
                newPasswordInput.type = newPasswordInput.type === 'password' ? 'text' : 'password';
            });
            
            document.getElementById('toggleConfirmPassword').addEventListener('click', () => {
                confirmPasswordInput.type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
            });
            
            // Password strength indicator
            newPasswordInput.addEventListener('input', () => {
                const password = newPasswordInput.value;
                const strength = this.checkPasswordStrength(password);
                
                strengthDiv.style.display = 'block';
                strengthDiv.textContent = `Password Strength: ${strength.text}`;
                strengthDiv.style.background = strength.color;
                strengthDiv.style.color = strength.textColor;
            });
            
            // Change password handler
            const handlePasswordChange = async () => {
                const newPassword = newPasswordInput.value;
                const confirmPassword = confirmPasswordInput.value;
                
                // Validation
                if (!newPassword || newPassword.trim() === '') {
                    errorDiv.textContent = '❌ Please enter a new password';
                    errorDiv.style.display = 'block';
                    newPasswordInput.focus();
                    return;
                }
                
                if (newPassword === this.defaultPassword) {
                    errorDiv.textContent = '❌ New password cannot be the default password';
                    errorDiv.style.display = 'block';
                    newPasswordInput.focus();
                    return;
                }
                
                if (newPassword.length < 3) {
                    errorDiv.textContent = '❌ Password must be at least 3 characters long';
                    errorDiv.style.display = 'block';
                    newPasswordInput.focus();
                    return;
                }
                
                if (newPassword !== confirmPassword) {
                    errorDiv.textContent = '❌ Passwords do not match';
                    errorDiv.style.display = 'block';
                    confirmPasswordInput.focus();
                    return;
                }
                
                // Change password
                try {
                    changeBtn.disabled = true;
                    changeBtn.textContent = '🔄 Changing password...';
                    
                    // Use enhanced password storage if available
                    const storeFunction = window.secureStorage.storeUserPasswordEnhanced || 
                                         window.secureStorage.storeUserPassword;
                    
                    await storeFunction.call(window.secureStorage, this.adminUsername, newPassword);
                    
                    // Mark as changed
                    localStorage.setItem('metafold_admin_password_changed', 'true');
                    localStorage.setItem('metafold_admin_password_changed_at', new Date().toISOString());
                    
                    // Success
                    changeBtn.textContent = '✅ Password Changed!';
                    changeBtn.style.background = 'linear-gradient(135deg, #10b981, #34d399)';
                    
                    setTimeout(() => {
                        modal.remove();
                        resolve(true);
                    }, 1000);
                    
                } catch (error) {
                    console.error('Password change failed:', error);
                    errorDiv.textContent = `❌ Failed to change password: ${error.message}`;
                    errorDiv.style.display = 'block';
                    changeBtn.disabled = false;
                    changeBtn.textContent = '🔐 Change Password & Continue';
                }
            };
            
            changeBtn.addEventListener('click', handlePasswordChange);
            
            // Enter key on inputs
            newPasswordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') confirmPasswordInput.focus();
            });
            
            confirmPasswordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handlePasswordChange();
            });
            
            // Focus
            newPasswordInput.focus();
        });
    },
    
    /**
     * Check password strength
     * @param {string} password
     * @returns {Object}
     */
    checkPasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        
        if (strength === 0 || strength === 1) {
            return { 
                text: 'Weak ⚠️', 
                color: 'rgba(220, 38, 38, 0.2)',
                textColor: '#fca5a5'
            };
        } else if (strength === 2 || strength === 3) {
            return { 
                text: 'Medium 🔒', 
                color: 'rgba(234, 179, 8, 0.2)',
                textColor: '#fde047'
            };
        } else {
            return { 
                text: 'Strong 💪', 
                color: 'rgba(16, 185, 129, 0.2)',
                textColor: '#6ee7b7'
            };
        }
    },
    
    /**
     * Check if password change is needed and show dialog
     * @returns {Promise<boolean>}
     */
    async checkAndEnforcePasswordChange() {
        // Check if already changed
        const alreadyChanged = localStorage.getItem('metafold_admin_password_changed') === 'true';
        if (alreadyChanged) {
            console.log('✅ Admin password already changed');
            return true;
        }
        
        // Check if using default password
        const usingDefault = await this.isUsingDefaultPassword();
        if (!usingDefault) {
            // Mark as changed (might have been changed manually)
            localStorage.setItem('metafold_admin_password_changed', 'true');
            console.log('✅ Admin password is not default');
            return true;
        }
        
        // Show mandatory change dialog
        console.log('⚠️ Admin is using default password - showing change dialog');
        return await this.showMandatoryPasswordChange();
    },
    
    /**
     * Initialize - check on app start
     */
    async init() {
        console.log('🔐 Checking admin password security...');
        
        // Wait for dependencies
        let attempts = 0;
        while ((!window.secureStorage || !window.userManager) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.secureStorage || !window.userManager) {
            console.warn('⚠️ Dependencies not available, skipping admin password check');
            return false;
        }
        
        // Only check if Admin exists
        if (!window.secureStorage.hasUserPassword(this.adminUsername)) {
            console.log('ℹ️ Admin account not yet created');
            return true;
        }
        
        // Check and enforce password change
        return await this.checkAndEnforcePasswordChange();
    }
};

// Make available globally
window.adminPasswordManager = adminPasswordManager;
console.log('✅ Admin Password Manager loaded');
