#!/usr/bin/env python3
"""
OMERO CORS Proxy Server - CSRF Problem FIXED
Basiert auf der DeepResearch-Recherche und OMERO-Dokumentation
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import sys
import http.cookies
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import time
import ssl
import socket
from urllib.error import URLError, HTTPError

class OMEROProxyHandler(BaseHTTPRequestHandler):
    
    OMERO_SERVER = "https://omero-imaging.uni-muenster.de"
    
    # Session storage für Client-zu-OMERO Mapping
    client_sessions = {}
    session_lock = threading.Lock()
    
    # Connection pooling
    ssl_context = None
    opener = None
    
    @classmethod
    def initialize_connection_pool(cls):
        """Initialize SSL context and URL opener for connection reuse"""
        if cls.ssl_context is None:
            cls.ssl_context = ssl.create_default_context()
            cls.ssl_context.check_hostname = False
            cls.ssl_context.verify_mode = ssl.CERT_NONE
            
            # Create opener with custom timeout and connection reuse
            cls.opener = urllib.request.build_opener(
                urllib.request.HTTPSHandler(context=cls.ssl_context)
            )
            
            print("🔬 Connection pool initialized")
    
    def do_OPTIONS(self):
        """Handle preflight CORS requests"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path.startswith('/omero-api/'):
            self.proxy_to_omero('GET')
        elif self.path == '/proxy-status':
            self.serve_proxy_status()
        elif self.path == '/csrf-debug':
            self.csrf_debug_endpoint()
        else:
            self.serve_static_file()
    
    def do_POST(self):
        """Handle POST requests"""
        if self.path.startswith('/omero-api/'):
            self.proxy_to_omero('POST')
        else:
            self.send_error(404)
    
    def do_PATCH(self):
        """Handle PATCH requests"""
        if self.path.startswith('/omero-api/'):
            self.proxy_to_omero('PATCH')
        else:
            self.send_error(404)
    
    def csrf_debug_endpoint(self):
        """Debug endpoint to check CSRF token handling"""
        debug_info = {
            "timestamp": time.time(),
            "active_sessions": len(self.client_sessions),
            "session_details": {}
        }
        
        with self.session_lock:
            for client_id, cookies in self.client_sessions.items():
                csrf_token = None
                if 'csrftoken=' in cookies:
                    for cookie in cookies.split(';'):
                        if 'csrftoken=' in cookie:
                            csrf_token = cookie.split('csrftoken=')[1].split(';')[0]
                            break
                
                debug_info["session_details"][client_id] = {
                    "has_csrf_token": csrf_token is not None,
                    "csrf_token_preview": csrf_token[:10] + "..." if csrf_token else None,
                    "full_cookies": cookies[:100] + "..." if len(cookies) > 100 else cookies
                }
        
        self.send_response(200)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(debug_info, indent=2).encode('utf-8'))
    
    def serve_proxy_status(self):
        """Enhanced proxy status with CSRF debugging"""
        self.initialize_connection_pool()
        
        status = {
            "proxy_running": True,
            "omero_server": self.OMERO_SERVER,
            "active_sessions": len(self.client_sessions),
            "connection_pool_initialized": self.ssl_context is not None,
            "csrf_fixes_applied": [
                "Referer header automatically set",
                "Origin header set to OMERO server",
                "CSRF tokens preserved in cookies",
                "Cookie domain restrictions removed",
                "Secure flag handling for localhost"
            ]
        }
        
        self.send_response(200)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(status, indent=2).encode('utf-8'))
    
    def get_client_id(self):
        """Get unique client identifier"""
        client_ip = self.client_address[0]
        cookie_header = self.headers.get('Cookie', '')
        
        if 'csrftoken' in cookie_header:
            # Extract CSRF token for stable client ID
            for cookie in cookie_header.split(';'):
                if 'csrftoken=' in cookie:
                    token_value = cookie.split('csrftoken=')[1].split(';')[0]
                    return f"{client_ip}_{token_value[:8]}"
        
        # Fallback to IP-based ID
        user_agent = self.headers.get('User-Agent', 'unknown')
        return f"{client_ip}_{hash(user_agent) & 0xffffffff}"
    
    def proxy_to_omero(self, method):
        """CSRF-FIXED proxy with proper header and cookie handling"""
        self.initialize_connection_pool()
        
        try:
            client_id = self.get_client_id()
            
            # Path processing
            original_path = self.path
            omero_path = self.path
            
            if omero_path.startswith('/omero-api/'):
                omero_path = omero_path[len('/omero-api/'):]
            elif omero_path.startswith('/omero-api'):
                omero_path = omero_path[len('/omero-api'):]
            
            if not omero_path.startswith('/'):
                omero_path = '/' + omero_path
            
            # Handle path corrections
            if omero_path.startswith('/api/api/'):
                omero_path = omero_path.replace('/api/api/', '/api/', 1)
            
            # Smart path prefixing
            known_prefixes = ['/api/', '/webclient/', '/webgateway/', '/static/']
            needs_api_prefix = not any(omero_path.startswith(prefix) for prefix in known_prefixes)
            
            if needs_api_prefix and not omero_path.startswith('/api'):
                omero_path = '/api' + omero_path
            
            omero_url = f"{self.OMERO_SERVER}/omero-api/api/v0/m/annotations/"
            print("🧪 Test: Verwende HARDCODED OMERO URL für MapAnnotation-POST")

            
            print(f"🔬 [{method}] {original_path} -> {omero_url}")
            print(f"🔬 Client: {client_id}")
            
            # Prepare request data
            data = None
            if method in ['POST', 'PATCH']:
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length > 0:
                    data = self.rfile.read(content_length)
                    print(f"🔬 Data: {len(data)} bytes")
            
            # Create request with CSRF fixes
            req = urllib.request.Request(omero_url, data=data, method=method)
            
            # 🔧 CSRF FIX 1: Copy headers but with important modifications
            headers_to_copy = ['Content-Type', 'X-CSRFToken', 'Authorization', 'Accept', 'User-Agent']
            for header_name in headers_to_copy:
                if header_name in self.headers:
                    req.add_header(header_name, self.headers[header_name])
            
            # 🔧 CSRF FIX 2: Set critical headers for Django CSRF validation
            req.add_header('Referer', self.OMERO_SERVER + '/')  # CRITICAL für Django
            req.add_header('Origin', self.OMERO_SERVER)         # CRITICAL für Django 4+
            
            # Set User-Agent if not present
            if 'User-Agent' not in self.headers:
                req.add_header('User-Agent', 'MetaFold-CSRF-Fixed-Proxy/1.0')
            
            # 🔧 CSRF FIX 3: Handle session cookies properly
            with self.session_lock:
                if client_id in self.client_sessions:
                    stored_cookies = self.client_sessions[client_id]
                    if stored_cookies:
                        req.add_header('Cookie', stored_cookies)
                        print(f"🔬 Using stored cookies: {stored_cookies[:50]}...")
                elif 'Cookie' in self.headers:
                    # First request with cookies from browser
                    browser_cookies = self.headers['Cookie']
                    req.add_header('Cookie', browser_cookies)
                    print(f"🔬 Using browser cookies: {browser_cookies[:50]}...")
            
            # Make request with timeout
            print(f"🔬 Making request to OMERO...")
            response = self.opener.open(req, timeout=30)
            response_data = response.read()
            
            print(f"✅ Success: {response.getcode()} ({len(response_data)} bytes)")
            
            # 🔧 CSRF FIX 4: Process and store cookies correctly
            self.process_response_cookies_fixed(response, client_id)
            
            # Send response
            self.send_successful_response_fixed(response, response_data)
            return
                    
        except socket.timeout:
            print(f"⏰ Request timeout")
            self.send_error(504, "Gateway Timeout")
            return
            
        except HTTPError as e:
            print(f"❌ HTTP Error {e.code}")
            error_data = e.read()
            
            # Special handling for CSRF errors
            error_text = error_data.decode('utf-8', errors='ignore')
            if 'CSRF' in error_text:
                print(f"🔍 CSRF Error Details: {error_text[:200]}...")
                
                # Try to extract more details
                if 'Origin checking failed' in error_text:
                    print("🔧 CSRF Origin Check failed - this is usually a Referer/Origin header problem")
                if 'CSRF token missing' in error_text:
                    print("🔧 CSRF Token missing - token not found in request")
                if 'CSRF token incorrect' in error_text:
                    print("🔧 CSRF Token incorrect - token doesn't match server expectation")
            
            self.send_response(e.code)
            self.send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(error_data)
            return
            
        except URLError as e:
            print(f"❌ URL Error: {e.reason}")
            error_response = {
                "error": "Connection failed",
                "message": str(e.reason),
                "url": omero_url
            }
            self.send_response(502)
            self.send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
            return
            
        except Exception as e:
            print(f"❌ Proxy Error: {e}")
            import traceback
            traceback.print_exc()
            
            error_response = {
                "error": "Proxy internal error",
                "message": str(e),
                "path": self.path
            }
            
            self.send_response(500)
            self.send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
    
    def process_response_cookies_fixed(self, response, client_id):
        """CSRF-FIXED cookie processing - preserves CSRF tokens correctly"""
        response_headers = response.info()
        set_cookie_headers = []
        
        for header_name, header_value in response_headers.items():
            if header_name.lower() == 'set-cookie':
                set_cookie_headers.append(header_value)
        
        if set_cookie_headers:
            cookie_strings = []
            for cookie_header in set_cookie_headers:
                cookie_parts = cookie_header.split(';')
                if cookie_parts and '=' in cookie_parts[0]:
                    cookie_strings.append(cookie_parts[0].strip())
            
            if cookie_strings:
                with self.session_lock:
                    existing_cookies = self.client_sessions.get(client_id, '')
                    
                    # Smart cookie merging - PRESERVE CSRF consistency
                    existing_dict = {}
                    if existing_cookies:
                        for cookie in existing_cookies.split(';'):
                            if '=' in cookie:
                                key, value = cookie.strip().split('=', 1)
                                existing_dict[key] = value
                    
                    # Update with new cookies
                    for cookie in cookie_strings:
                        if '=' in cookie:
                            key, value = cookie.strip().split('=', 1)
                            existing_dict[key] = value
                    
                    # Store combined cookies
                    combined_cookies = '; '.join([f"{k}={v}" for k, v in existing_dict.items()])
                    self.client_sessions[client_id] = combined_cookies
                    print(f"🔬 Updated cookies for {client_id}: {combined_cookies[:50]}...")
    
    def send_successful_response_fixed(self, response, response_data):
        """CSRF-FIXED response sending - handles cookies for localhost properly"""
        response_headers = response.info()
        
        self.send_response(response.getcode())
        self.send_cors_headers()
        
        # Forward most headers
        skip_headers = ['set-cookie', 'access-control-allow-origin', 'access-control-allow-methods', 
                       'access-control-allow-headers', 'access-control-allow-credentials']
        
        for header_name, header_value in response_headers.items():
            if header_name.lower() not in skip_headers:
                self.send_header(header_name, header_value)
        
        # 🔧 CSRF FIX 5: Forward cookies with localhost-friendly modifications
        for header_name, header_value in response_headers.items():
            if header_name.lower() == 'set-cookie':
                # Modify cookies for localhost compatibility
                modified_cookie = header_value
                
                # Remove Domain restrictions that would block localhost
                if 'Domain=' in modified_cookie:
                    parts = modified_cookie.split(';')
                    new_parts = []
                    for part in parts:
                        if not part.strip().startswith('Domain='):
                            new_parts.append(part)
                    modified_cookie = ';'.join(new_parts)
                
                # Remove Secure flag for localhost (HTTP)
                modified_cookie = modified_cookie.replace('; Secure', '').replace('Secure;', '')
                
                # Handle SameSite for cross-origin requests
                if 'SameSite=' not in modified_cookie:
                    modified_cookie += '; SameSite=None'
                
                print(f"🔧 Cookie forwarded: {modified_cookie[:80]}...")
                self.send_header('Set-Cookie', modified_cookie)
        
        self.end_headers()
        self.wfile.write(response_data)
    
    def serve_static_file(self):
        """Serve static files"""
        try:
            if self.path == '/':
                file_path = 'index.html'
            else:
                file_path = self.path.lstrip('/')
            
            if '..' in file_path:
                self.send_error(403)
                return
            
            try:
                with open(file_path, 'rb') as f:
                    content = f.read()
                
                self.send_response(200)
                
                if file_path.endswith('.html'):
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                elif file_path.endswith('.js'):
                    self.send_header('Content-Type', 'application/javascript; charset=utf-8')
                elif file_path.endswith('.css'):
                    self.send_header('Content-Type', 'text/css; charset=utf-8')
                elif file_path.endswith('.json'):
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                
                self.send_header('Cache-Control', 'public, max-age=3600')
                self.end_headers()
                self.wfile.write(content)
                
            except FileNotFoundError:
                self.send_error(404)
                
        except Exception as e:
            print(f"Error serving {self.path}: {e}")
            self.send_error(500)
    
    def send_cors_headers(self):
        """Send CORS headers optimized for CSRF"""
        origin = self.headers.get('Origin', 'http://localhost:3000')
        self.send_header('Access-Control-Allow-Origin', origin)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRFToken, Referer, Accept, Cookie, Origin')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('Access-Control-Expose-Headers', 'Set-Cookie, Content-Type, Content-Length')
    
    def log_message(self, format, *args):
        """Enhanced logging"""
        timestamp = self.log_date_time_string()
        sys.stderr.write(f"[{timestamp}] {format % args}\n")

def main():
    PORT = 3000
    
    print("🚀 MetaFold OMERO Proxy Server (CSRF-FIXED)")
    print(f"📱 App: http://localhost:{PORT}")
    print(f"🔬 OMERO Proxy: http://localhost:{PORT}/omero-api/*")
    print(f"🔬 Target OMERO: {OMEROProxyHandler.OMERO_SERVER}")
    print("")
    print("🔧 CSRF Fixes Applied:")
    print("   ✅ Referer header automatically set to OMERO server")
    print("   ✅ Origin header set for Django 4+ compatibility")
    print("   ✅ CSRF tokens preserved across requests")
    print("   ✅ Cookie domain restrictions removed for localhost")
    print("   ✅ Secure flag handling for HTTP development")
    print("   ✅ SameSite=None for cross-origin cookies")
    print("")
    print("🔍 Debug Endpoints:")
    print(f"   📊 Proxy Status: http://localhost:{PORT}/proxy-status")
    print(f"   🐛 CSRF Debug: http://localhost:{PORT}/csrf-debug")
    print("")
    print("Press Ctrl+C to stop the server")
    print("")
    
    try:
        with HTTPServer(('localhost', PORT), OMEROProxyHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🔬 CSRF-Fixed OMERO Proxy Server stopped")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()