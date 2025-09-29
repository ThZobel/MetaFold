/**
 * OMERO Proxy Manager - Node.js HTTP Server für CSRF/CORS Handling
 * Basierend auf der omero_proxy.py Logik, integriert in Electron
 * Phase 1: Backend Foundation
 */

const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');

class OMEROProxyServer {
    constructor(port = 3000, omeroServerUrl = null) {
        if (!omeroServerUrl) {
            throw new Error('OMERO server URL is required for proxy initialization');
        }
        this.port = port;
        this.omeroServerUrl = omeroServerUrl;
        this.server = null;
        this.status = 'stopped';
        
        // Session storage für Client-zu-OMERO Mapping (wie im Python Proxy)
        this.clientSessions = new Map();
        
        // Connection pooling
        this.httpsAgent = new https.Agent({
            keepAlive: true,
            rejectUnauthorized: false // Wie im Python Proxy für Development
        });
        
        console.log('🔬 OMERO Proxy Manager initialized');
    }

    /**
     * Start the proxy server
     * @param {Object} settings - OMERO settings from settingsManager
     * @returns {Promise<Object>} Start result
     */
    async start(settings = {}) {
        if (this.status === 'running') {
            return {
                success: true,
                message: 'Proxy server already running',
                port: this.port,
                status: this.status
            };
        }

        // Update OMERO server URL if provided in settings
        if (settings.serverUrl) {
            this.omeroServerUrl = settings.serverUrl;
        }

        // Find available port if specified port is in use
        const availablePort = await this.findAvailablePort(this.port);
        this.port = availablePort;

        return new Promise((resolve, reject) => {
            try {
                this.server = http.createServer((req, res) => {
                    this.handleRequest(req, res);
                });

                this.server.on('error', (error) => {
                    console.error('❌ Proxy server error:', error);
                    this.status = 'error';
                    reject({
                        success: false,
                        message: `Failed to start proxy server: ${error.message}`,
                        error: error
                    });
                });

                this.server.listen(this.port, 'localhost', () => {
                    this.status = 'running';
                    console.log(`🚀 OMERO Proxy Server started on http://localhost:${this.port}`);
                    console.log(`🔬 Target OMERO: ${this.omeroServerUrl}`);
                    console.log('🔧 CSRF/CORS fixes applied for MetaFold integration');
                    
                    resolve({
                        success: true,
                        message: 'Proxy server started successfully',
                        port: this.port,
                        omeroServer: this.omeroServerUrl,
                        status: this.status
                    });
                });

            } catch (error) {
                console.error('❌ Failed to create proxy server:', error);
                this.status = 'error';
                reject({
                    success: false,
                    message: `Failed to create proxy server: ${error.message}`,
                    error: error
                });
            }
        });
    }

    /**
     * Stop the proxy server
     * @returns {Promise<Object>} Stop result
     */
    async stop() {
        if (this.status === 'stopped') {
            return {
                success: true,
                message: 'Proxy server already stopped',
                status: this.status
            };
        }

        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    this.status = 'stopped';
                    console.log('🔬 OMERO Proxy Server stopped');
                    resolve({
                        success: true,
                        message: 'Proxy server stopped successfully',
                        status: this.status
                    });
                });
            } else {
                this.status = 'stopped';
                resolve({
                    success: true,
                    message: 'Proxy server stopped',
                    status: this.status
                });
            }
        });
    }

    /**
     * Get proxy server status
     * @returns {Object} Current status information
     */
    getStatus() {
        return {
            running: this.status === 'running',
            status: this.status,
            port: this.port,
            omeroServer: this.omeroServerUrl,
            activeSessions: this.clientSessions.size,
            proxyUrl: `http://localhost:${this.port}/omero-api`,
            debugEndpoints: {
                status: `http://localhost:${this.port}/proxy-status`,
                csrf: `http://localhost:${this.port}/csrf-debug`
            }
        };
    }

    /**
     * Main request handler - routes requests to appropriate handlers
     */
    handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const path = parsedUrl.pathname;

        // Set CORS headers for all responses
        this.setCorsHeaders(req, res);

        // Handle preflight OPTIONS requests
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        // Route requests
        if (path.startsWith('/omero-api/')) {
            this.proxyToOMERO(req, res);
        } else if (path === '/proxy-status') {
            this.serveProxyStatus(req, res);
        } else if (path === '/csrf-debug') {
            this.serveCsrfDebug(req, res);
        } else {
            // Handle other requests (404)
            res.writeHead(404, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({
                error: 'Not Found',
                message: 'Endpoint not found',
                availableEndpoints: ['/omero-api/*', '/proxy-status', '/csrf-debug']
            }));
        }
    }

    /**
     * Proxy requests to OMERO server with CSRF/CORS fixes
     */
    async proxyToOMERO(req, res) {
        try {
            const clientId = this.getClientId(req);
            
            // Process path (remove /omero-api prefix)
            let omeroPath = req.url.replace(/^\/omero-api\/?/, '/');
            
            // Apply path corrections (like in Python proxy)
            if (omeroPath.startsWith('/api/api/')) {
                omeroPath = omeroPath.replace('/api/api/', '/api/');
            }
            
            // Smart API prefix handling
            const knownPrefixes = ['/api/', '/webclient/', '/webgateway/', '/static/'];
            const needsApiPrefix = !knownPrefixes.some(prefix => omeroPath.startsWith(prefix));
            
            if (needsApiPrefix && !omeroPath.startsWith('/api')) {
                omeroPath = '/api' + omeroPath;
            }

            const omeroUrl = this.omeroServerUrl + omeroPath;
            
            console.log(`🔬 [${req.method}] ${req.url} -> ${omeroUrl}`);
            console.log(`🔬 Client: ${clientId}`);

            // Prepare request options
            const requestOptions = {
                method: req.method,
                headers: this.processRequestHeaders(req, clientId),
                agent: this.httpsAgent
            };

            // Create the proxied request
            const proxyReq = https.request(omeroUrl, requestOptions, (proxyRes) => {
                this.handleProxyResponse(req, res, proxyRes, clientId);
            });

            // Handle request errors
            proxyReq.on('error', (error) => {
                console.error('❌ Proxy request error:', error);
                res.writeHead(502, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({
                    error: 'Bad Gateway',
                    message: `Failed to connect to OMERO server: ${error.message}`,
                    omeroServer: this.omeroServerUrl
                }));
            });

            // Pipe request body for POST/PATCH requests
            if (req.method === 'POST' || req.method === 'PATCH') {
                req.pipe(proxyReq);
            } else {
                proxyReq.end();
            }

        } catch (error) {
            console.error('❌ Proxy error:', error);
            res.writeHead(500, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({
                error: 'Internal Server Error',
                message: error.message
            }));
        }
    }

    /**
     * Process request headers with CSRF fixes (like Python proxy)
     */
    processRequestHeaders(req, clientId) {
        const headers = { ...req.headers };
        
        // Remove problematic headers
        delete headers.host;
        delete headers['content-length']; // Will be set automatically
        
        // CSRF FIX 1: Set proper Referer header
        headers.referer = this.omeroServerUrl + '/';
        
        // CSRF FIX 2: Set Origin header for Django 4+ compatibility
        headers.origin = this.omeroServerUrl;
        
        // CSRF FIX 3: Ensure proper cookie handling
        if (this.clientSessions.has(clientId)) {
            headers.cookie = this.clientSessions.get(clientId);
        }
        
        console.log(`🔧 Headers for ${clientId}:`, {
            referer: headers.referer,
            origin: headers.origin,
            hasCookies: !!headers.cookie
        });
        
        return headers;
    }

    /**
     * Handle response from OMERO server
     */
    handleProxyResponse(req, res, proxyRes, clientId) {
        // Process response cookies (preserve CSRF tokens)
        this.processResponseCookies(proxyRes, clientId);
        
        // Set response headers
        res.writeHead(proxyRes.statusCode, {
            ...proxyRes.headers,
            'Access-Control-Allow-Origin': req.headers.origin || 'http://localhost:3000',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Expose-Headers': 'Set-Cookie, Content-Type, Content-Length'
        });
        
        // Pipe response body
        proxyRes.pipe(res);
        
        // Log response
        console.log(`✅ Response ${proxyRes.statusCode} for ${clientId}`);
    }

    /**
     * Process response cookies to preserve CSRF tokens
     */
    processResponseCookies(proxyRes, clientId) {
        const setCookieHeaders = proxyRes.headers['set-cookie'];
        if (!setCookieHeaders) return;

        let existingCookies = this.clientSessions.get(clientId) || '';
        const cookieMap = new Map();
        
        // Parse existing cookies
        if (existingCookies) {
            existingCookies.split(';').forEach(cookie => {
                const [name, value] = cookie.trim().split('=');
                if (name && value) {
                    cookieMap.set(name, value);
                }
            });
        }
        
        // Process new cookies
        setCookieHeaders.forEach(cookie => {
            const [nameValue] = cookie.split(';');
            const [name, value] = nameValue.split('=');
            if (name && value) {
                cookieMap.set(name.trim(), value.trim());
                
                // Log CSRF token updates
                if (name.trim() === 'csrftoken') {
                    console.log(`🔧 CSRF token updated for ${clientId}: ${value.trim().substring(0, 8)}...`);
                }
            }
        });
        
        // Update session cookies
        const updatedCookies = Array.from(cookieMap.entries())
            .map(([name, value]) => `${name}=${value}`).join('; ');
        
        this.clientSessions.set(clientId, updatedCookies);
    }

    /**
     * Generate unique client ID (like Python proxy)
     */
    getClientId(req) {
        const clientIp = req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        // Try to use CSRF token for stable client ID
        const cookies = req.headers.cookie || '';
        if (cookies.includes('csrftoken=')) {
            const csrfMatch = cookies.match(/csrftoken=([^;]+)/);
            if (csrfMatch) {
                return `${clientIp}_${csrfMatch[1].substring(0, 8)}`;
            }
        }
        
        // Fallback to IP + hash of user agent
        const hash = this.simpleHash(userAgent);
        return `${clientIp}_${hash}`;
    }

    /**
     * Set CORS headers
     */
    setCorsHeaders(req, res) {
        const origin = req.headers.origin || 'http://localhost:3000';
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRFToken, Referer, Accept, Cookie, Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Content-Type, Content-Length');
    }

    /**
     * Serve proxy status endpoint
     */
    serveProxyStatus(req, res) {
        const status = {
            proxy_running: true,
            omero_server: this.omeroServerUrl,
            active_sessions: this.clientSessions.size,
            port: this.port,
            csrf_fixes_applied: [
                'Referer header automatically set',
                'Origin header set to OMERO server', 
                'CSRF tokens preserved in cookies',
                'Cookie domain restrictions handled',
                'Cross-origin credentials enabled'
            ]
        };
        
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(status, null, 2));
    }

    /**
     * Serve CSRF debug endpoint
     */
    serveCsrfDebug(req, res) {
        const debugInfo = {
            timestamp: new Date().toISOString(),
            active_sessions: this.clientSessions.size,
            session_details: {}
        };
        
        // Add session details (without exposing full tokens for security)
        this.clientSessions.forEach((cookies, clientId) => {
            const hasCSRF = cookies.includes('csrftoken=');
            let csrfPreview = null;
            
            if (hasCSRF) {
                const csrfMatch = cookies.match(/csrftoken=([^;]+)/);
                if (csrfMatch) {
                    csrfPreview = csrfMatch[1].substring(0, 10) + '...';
                }
            }
            
            debugInfo.session_details[clientId] = {
                has_csrf_token: hasCSRF,
                csrf_token_preview: csrfPreview,
                cookie_count: cookies.split(';').length
            };
        });
        
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(debugInfo, null, 2));
    }

    /**
     * Find available port starting from specified port
     */
    async findAvailablePort(startPort) {
        const net = require('net');
        
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.listen(startPort, 'localhost', () => {
                const port = server.address().port;
                server.close(() => resolve(port));
            });
            
            server.on('error', () => {
                // Port is in use, try next one
                this.findAvailablePort(startPort + 1).then(resolve);
            });
        });
    }

    /**
     * Simple hash function for client ID generation
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16).substring(0, 8);
    }
}

module.exports = OMEROProxyServer;