// CSRF Debug Tool für MetaFold OMERO Integration
// Führen Sie dies in der Browser-Konsole aus: testOMEROCSRF('username', 'password')

async function testOMEROCSRF(username, password) {
    console.log('🔬 === COMPREHENSIVE CSRF DEBUG TEST ===');
    console.log('Based on DeepResearch findings and OMERO documentation');
    
    // Step 1: Initial State Analysis
    console.log('\n📊 Step 1: Initial State Analysis');
    console.log('🍪 Initial cookies:', document.cookie || 'NONE');
    console.log('🌐 Current URL:', window.location.href);
    console.log('🌐 Origin:', window.location.origin);
    console.log('📡 OMERO Client status:', window.omeroClient ? 'Available' : 'Not Available');
    
    if (!window.omeroClient) {
        console.error('❌ OMERO Client not found! Make sure the CSRF-fixed omeroClient.js is loaded.');
        return;
    }
    
    // Step 2: Proxy Server Check
    console.log('\n📊 Step 2: Proxy Server Check');
    try {
        const proxyResponse = await fetch('http://localhost:3000/proxy-status');
        if (proxyResponse.ok) {
            const proxyData = await proxyResponse.json();
            console.log('✅ Proxy server running:', proxyData);
            
            if (proxyData.csrf_fixes_applied) {
                console.log('✅ CSRF fixes confirmed:', proxyData.csrf_fixes_applied);
            }
        } else {
            console.error('❌ Proxy server not responding properly');
            return;
        }
    } catch (proxyError) {
        console.error('❌ Proxy server not running:', proxyError.message);
        console.log('🔧 Start proxy with: python omero_proxy_fixed.py');
        return;
    }
    
    // Step 3: Client Initialization
    console.log('\n📊 Step 3: Client Initialization');
    window.omeroClient.init('http://localhost:3000/omero-api');
    console.log('✅ Client initialized with proxy URL');
    
    // Step 4: CSRF Token Test
    console.log('\n📊 Step 4: CSRF Token Acquisition');
    try {
        const tokenBefore = window.omeroClient.session?.csrfToken;
        console.log('🔑 Token before request:', tokenBefore || 'None');
        
        const csrfToken = await window.omeroClient.getCSRFToken();
        
        const tokenAfter = window.omeroClient.session?.csrfToken;
        const cookieToken = window.omeroClient.getCSRFTokenFromCookie();
        
        console.log('🔑 Token after request (API):', csrfToken.substring(0, 15) + '...');
        console.log('🔑 Token after request (Session):', tokenAfter ? tokenAfter.substring(0, 15) + '...' : 'None');
        console.log('🔑 Token from cookie:', cookieToken ? cookieToken.substring(0, 15) + '...' : 'None');
        console.log('🍪 Cookies after token request:', document.cookie);
        
        // Token validation
        console.log('🔄 Token Validation:');
        console.log('   API == Session:', csrfToken === tokenAfter);
        console.log('   Session == Cookie:', tokenAfter === cookieToken);
        console.log('   All match:', csrfToken === tokenAfter && tokenAfter === cookieToken);
        
        if (csrfToken !== cookieToken) {
            console.warn('⚠️ Token mismatch detected - this can cause CSRF errors');
        }
        
    } catch (error) {
        console.error('❌ CSRF Token acquisition failed:', error);
        return;
    }
    
    // Step 5: Authentication Test
    console.log('\n📊 Step 5: Authentication Test');
    
    if (!username || !password) {
        console.log('⏭️ Skipping authentication test (no credentials provided)');
        console.log('💡 Call with credentials: testOMEROCSRF("username", "password")');
    } else {
        try {
            console.log('🔐 Attempting login with CSRF-fixed client...');
            const loginResult = await window.omeroClient.loginWithCredentials(username, password);
            
            if (loginResult.success) {
                console.log('✅ LOGIN SUCCESSFUL!');
                console.log('📊 Login details:', loginResult);
                console.log('🔐 Authentication method:', loginResult.loginMethod);
                console.log('📁 Projects accessible:', loginResult.projectCount);
                
                // Test API access
                console.log('\n📊 Step 6: API Access Test');
                try {
                    const projects = await window.omeroClient.getProjects();
                    console.log('✅ API access confirmed');
                    console.log('📁 Projects found:', projects.length);
                    console.log('📋 First few projects:', projects.slice(0, 3).map(p => p.Name || p.name));
                } catch (apiError) {
                    console.error('❌ API access failed:', apiError);
                }
            } else {
                console.error('❌ Login failed:', loginResult);
            }
            
        } catch (loginError) {
            console.error('❌ Login error:', loginError);
            
            // CSRF-specific error analysis
            if (loginError.message.includes('CSRF')) {
                console.log('\n🔍 CSRF Error Analysis:');
                
                if (loginError.message.includes('Origin checking failed')) {
                    console.log('❌ Origin checking failed');
                    console.log('🔧 Fix: Origin/Referer headers not matching OMERO server');
                    console.log('💡 Solution: Ensure proxy sets correct Origin/Referer headers');
                } else if (loginError.message.includes('CSRF token missing')) {
                    console.log('❌ CSRF token missing');
                    console.log('🔧 Fix: Token not included in request');
                    console.log('💡 Solution: Check X-CSRFToken header and csrfmiddlewaretoken body param');
                } else if (loginError.message.includes('CSRF token incorrect')) {
                    console.log('❌ CSRF token incorrect');
                    console.log('🔧 Fix: Token doesn\'t match server expectation');
                    console.log('💡 Solution: Ensure token freshness and cookie consistency');
                } else {
                    console.log('❌ Generic CSRF error');
                    console.log('🔧 Check: All CSRF requirements (token, headers, cookies)');
                }
                
                // Additional debugging
                console.log('\n🔍 Current CSRF State:');
                window.omeroClient.debugCSRF();
            }
        }
    }
    
    // Step 6: Public Group Test (fallback)
    console.log('\n📊 Step 6: Public Group Access Test');
    try {
        const publicResult = await window.omeroClient.loginPublicGroup();
        if (publicResult.success) {
            console.log('✅ Public group access successful');
            console.log('📁 Public projects:', publicResult.projectCount);
        }
    } catch (publicError) {
        console.error('❌ Public group access failed:', publicError);
    }
    
    // Step 7: Comprehensive Analysis
    console.log('\n📊 Step 7: Enhanced Connection Test');
    try {
        const enhancedTest = await window.omeroClient.testConnectionEnhanced();
        console.log('🔬 Enhanced test results:', enhancedTest);
        
        if (enhancedTest.success) {
            console.log('✅ Connection test passed');
            console.log('🔧 Applied fixes:', enhancedTest.fixes_applied);
        } else {
            console.log('❌ Connection test failed');
            console.log('🔍 Check these areas:', enhancedTest);
        }
    } catch (testError) {
        console.error('❌ Enhanced test failed:', testError);
    }
    
    // Step 8: Summary and Recommendations
    console.log('\n📊 Step 8: Summary and Recommendations');
    
    const hasProxy = await fetch('http://localhost:3000/proxy-status').then(r => r.ok).catch(() => false);
    const hasCSRFToken = !!window.omeroClient.getBestCSRFToken();
    const hasSession = !!window.omeroClient.session?.isAuthenticated;
    
    console.log('📋 Status Summary:');
    console.log('   Proxy Running:', hasProxy ? '✅' : '❌');
    console.log('   CSRF Token:', hasCSRFToken ? '✅' : '❌');
    console.log('   Authenticated Session:', hasSession ? '✅' : '❌');
    
    if (!hasProxy) {
        console.log('\n🔧 RECOMMENDED ACTIONS:');
        console.log('1. Start the CSRF-fixed proxy server:');
        console.log('   python omero_proxy_fixed.py');
    } else if (!hasCSRFToken) {
        console.log('\n🔧 RECOMMENDED ACTIONS:');
        console.log('1. Check CSRF token acquisition');
        console.log('2. Verify proxy CSRF handling');
        console.log('3. Check browser cookies');
    } else if (!hasSession) {
        console.log('\n🔧 RECOMMENDED ACTIONS:');
        console.log('1. Check username/password');
        console.log('2. Verify OMERO server accessibility');
        console.log('3. Check Django CSRF configuration on OMERO server');
    } else {
        console.log('\n🎉 ALL SYSTEMS WORKING!');
        console.log('MetaFold OMERO integration is ready to use.');
    }
    
    console.log('\n💡 Additional Debug Resources:');
    console.log('- Proxy Status: http://localhost:3000/proxy-status');
    console.log('- CSRF Debug: http://localhost:3000/csrf-debug');
    console.log('- OMERO Client Debug: window.omeroClient.debugCSRF()');
}

// Quick CSRF status check
async function quickCSRFCheck() {
    console.log('🔬 === QUICK CSRF STATUS CHECK ===');
    
    if (!window.omeroClient) {
        console.error('❌ OMERO Client not available');
        return false;
    }
    
    // Check proxy
    const proxyOK = await fetch('http://localhost:3000/proxy-status').then(r => r.ok).catch(() => false);
    console.log('Proxy Status:', proxyOK ? '✅ Running' : '❌ Not Running');
    
    if (!proxyOK) {
        console.log('🔧 Start proxy: python omero_proxy_fixed.py');
        return false;
    }
    
    // Initialize and get token
    window.omeroClient.init('http://localhost:3000/omero-api');
    
    try {
        const token = await window.omeroClient.getCSRFToken();
        const cookieToken = window.omeroClient.getCSRFTokenFromCookie();
        
        console.log('CSRF Token (API):', token ? '✅ Received' : '❌ Missing');
        console.log('CSRF Token (Cookie):', cookieToken ? '✅ Present' : '❌ Missing');
        console.log('Token Match:', token === cookieToken ? '✅ Yes' : '❌ No');
        
        return token && cookieToken && (token === cookieToken);
    } catch (error) {
        console.error('❌ CSRF check failed:', error.message);
        return false;
    }
}

// Test specific CSRF scenarios
async function testCSRFScenarios() {
    console.log('🔬 === CSRF SCENARIO TESTS ===');
    
    const scenarios = [
        {
            name: 'Missing Origin Header',
            test: async () => {
                const response = await fetch('http://localhost:3000/omero-api/api/v0/token/', {
                    headers: { 'Accept': 'application/json' }
                });
                return response.ok;
            }
        },
        {
            name: 'Wrong Origin Header',
            test: async () => {
                const response = await fetch('http://localhost:3000/omero-api/api/v0/token/', {
                    headers: { 
                        'Accept': 'application/json',
                        'Origin': window.location.origin
                    }
                });
                return response.ok;
            }
        }
    ];
    
    for (const scenario of scenarios) {
        try {
            console.log(`\n🧪 Testing: ${scenario.name}`);
            const result = await scenario.test();
            console.log(`   Result: ${result ? '✅ Passed' : '❌ Failed'}`);
        } catch (error) {
            console.log(`   Result: ❌ Error - ${error.message}`);
        }
    }
}

// Export functions to global scope
window.testOMEROCSRF = testOMEROCSRF;
window.quickCSRFCheck = quickCSRFCheck;
window.testCSRFScenarios = testCSRFScenarios;

console.log('🔬 CSRF Debug Tools loaded!');
console.log('Available functions:');
console.log('- testOMEROCSRF("username", "password") - Full CSRF test');
console.log('- quickCSRFCheck() - Quick status check');
console.log('- testCSRFScenarios() - Test different CSRF scenarios');
console.log('- window.omeroClient.debugCSRF() - Debug current CSRF state');
                        'Origin': 'https://wrong-origin.com'
                    }
                });
                return response.ok;
            }
        },
        {
            name: 'Correct Origin Header',
            test: async () => {
                const response = await fetch('http://localhost:3000/omero-api/api/v0/token/', {
                    headers: { 
                        'Accept': 'application/json',