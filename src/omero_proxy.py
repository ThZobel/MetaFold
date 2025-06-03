#!/usr/bin/env python3
"""
Robust OMERO CORS Proxy Server with connection pooling and retry logic
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
        elif self.path == '/test-omero-robust':
            self.test_robust_connection()
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
    
    def test_robust_connection(self):
        """Test OMERO connection with retry logic"""
        results = {
            "timestamp": time.time(),
            "tests": {}
        }
        
        # Test critical endpoints with retries
        critical_endpoints = [
            '/api/v0/token/',
            '/api/v0/m/projects/',
            '/api/v0/m/datasets/',
            '/api/v0/servers/'
        ]
        
        for endpoint in critical_endpoints:
            print(f"🔬 Testing {endpoint} with retries...")
            
            success_count = 0
            total_attempts = 3
            response_times = []
            
            for attempt in range(total_attempts):
                start_time = time.time()
                try:
                    success = self.test_single_endpoint(endpoint)
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000  # ms
                    
                    if success:
                        success_count += 1
                        response_times.append(response_time)
                        print(f"  ✅ Attempt {attempt + 1}: {response_time:.0f}ms")
                    else:
                        print(f"  ❌ Attempt {attempt + 1}: Failed")
                    
                    # Brief delay between attempts
                    if attempt < total_attempts - 1:
                        time.sleep(0.5)
                        
                except Exception as e:
                    print(f"  ❌ Attempt {attempt + 1}: {e}")
            
            # Calculate reliability
            reliability = (success_count / total_attempts) * 100
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            
            results["tests"][endpoint] = {
                "success_rate": f"{reliability:.1f}%",
                "successful_attempts": success_count,
                "total_attempts": total_attempts,
                "avg_response_time_ms": round(avg_response_time),
                "is_reliable": reliability >= 80,
                "recommendation": "OK" if reliability >= 80 else "UNSTABLE"
            }
            
            print(f"  📊 {endpoint}: {reliability:.1f}% success rate")
        
        # Overall assessment
        reliable_endpoints = sum(1 for test in results["tests"].values() if test["is_reliable"])
        total_endpoints = len(results["tests"])
        
        results["overall"] = {
            "reliable_endpoints": reliable_endpoints,
            "total_endpoints": total_endpoints,
            "overall_reliability": f"{(reliable_endpoints / total_endpoints) * 100:.1f}%",
            "status": "STABLE" if reliable_endpoints >= total_endpoints * 0.8 else "UNSTABLE"
        }
        
        self.send_response(200)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(results, indent=2).encode('utf-8'))
    
    def test_single_endpoint(self, endpoint):
        """Test a single endpoint with timeout"""
        try:
            url = f"{self.OMERO_SERVER}{endpoint}"
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'MetaFold-Robust-Test/1.0')
            req.add_header('Accept', 'application/json')
            
            with self.opener.open(req, timeout=10) as response:
                return response.getcode() == 200
                
        except Exception:
            return False
    
    def serve_proxy_status(self):
        """Enhanced proxy status with connection health"""
        # Initialize connection pool if needed
        self.initialize_connection_pool()
        
        status = {
            "proxy_running": True,
            "omero_server": self.OMERO_SERVER,
            "active_sessions": len(self.client_sessions),
            "connection_pool_initialized": self.ssl_context is not None,
            "session_details": {
                client_id: cookies[:30] + "..." if len(cookies) > 30 else cookies 
                for client_id, cookies in self.client_sessions.items()
            }
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
        """Robust proxy with retry logic and better error handling"""
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
            
            omero_url = f"{self.OMERO_SERVER}{omero_path}"
            
            print(f"🔬 [{method}] {original_path} -> {omero_url}")
            print(f"🔬 Client: {client_id}")
            
            # Prepare request data
            data = None
            if method in ['POST', 'PATCH']:
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length > 0:
                    data = self.rfile.read(content_length)
                    print(f"🔬 Data: {len(data)} bytes")
            
            # Retry logic for request
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    print(f"🔬 Attempt {attempt + 1}/{max_retries}")
                    
                    # Create fresh request for each attempt
                    req = urllib.request.Request(omero_url, data=data, method=method)
                    
                    # Copy headers
                    headers_to_copy = ['Content-Type', 'X-CSRFToken', 'Authorization', 'Accept']
                    for header_name in headers_to_copy:
                        if header_name in self.headers:
                            req.add_header(header_name, self.headers[header_name])
                    
                    # Add session cookies
                    with self.session_lock:
                        if client_id in self.client_sessions:
                            stored_cookies = self.client_sessions[client_id]
                            if stored_cookies:
                                req.add_header('Cookie', stored_cookies)
                                print(f"🔬 Using cookies: {stored_cookies[:50]}...")
                    
                    # Add OMERO headers
                    req.add_header('Referer', self.OMERO_SERVER + '/')
                    req.add_header('Origin', self.OMERO_SERVER)
                    req.add_header('User-Agent', 'MetaFold-Robust-Proxy/1.0')
                    
                    # Make request with progressive timeout
                    timeout = 15 + (attempt * 5)  # 15s, 20s, 25s
                    print(f"🔬 Timeout: {timeout}s")
                    
                    response = self.opener.open(req, timeout=timeout)
                    response_data = response.read()
                    
                    print(f"✅ Success: {response.getcode()} ({len(response_data)} bytes)")
                    
                    # Process cookies
                    self.process_response_cookies(response, client_id)
                    
                    # Send response
                    self.send_successful_response(response, response_data)
                    return
                    
                except socket.timeout:
                    print(f"⏰ Timeout on attempt {attempt + 1}")
                    if attempt == max_retries - 1:
                        self.send_error(504, f"Gateway Timeout after {max_retries} attempts")
                        return
                    
                except HTTPError as e:
                    print(f"❌ HTTP Error {e.code} on attempt {attempt + 1}")
                    if attempt == max_retries - 1:
                        error_data = e.read()
                        self.send_response(e.code)
                        self.send_cors_headers()
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(error_data)
                        return
                    
                except URLError as e:
                    print(f"❌ URL Error on attempt {attempt + 1}: {e.reason}")
                    if attempt == max_retries - 1:
                        error_response = {
                            "error": "Connection failed after retries",
                            "message": str(e.reason),
                            "url": omero_url,
                            "attempts": max_retries
                        }
                        self.send_response(502)
                        self.send_cors_headers()
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps(error_response).encode('utf-8'))
                        return
                
                # Brief delay before retry
                if attempt < max_retries - 1:
                    time.sleep(1)
                    
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
    
    def process_response_cookies(self, response, client_id):
        """Process and store response cookies"""
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
                    
                    # Smart cookie merging
                    if existing_cookies:
                        existing_dict = {}
                        for cookie in existing_cookies.split(';'):
                            if '=' in cookie:
                                key, value = cookie.strip().split('=', 1)
                                existing_dict[key] = value
                        
                        for cookie in cookie_strings:
                            if '=' in cookie:
                                key, value = cookie.strip().split('=', 1)
                                existing_dict[key] = value
                        
                        combined_cookies = '; '.join([f"{k}={v}" for k, v in existing_dict.items()])
                    else:
                        combined_cookies = '; '.join(cookie_strings)
                    
                    self.client_sessions[client_id] = combined_cookies
                    print(f"🔬 Updated cookies: {combined_cookies[:50]}...")
    
    def send_successful_response(self, response, response_data):
        """Send successful response to client"""
        response_headers = response.info()
        
        self.send_response(response.getcode())
        self.send_cors_headers()
        
        # Forward headers (excluding problematic ones)
        skip_headers = ['set-cookie', 'access-control-allow-origin', 'access-control-allow-methods', 
                       'access-control-allow-headers', 'access-control-allow-credentials']
        
        for header_name, header_value in response_headers.items():
            if header_name.lower() not in skip_headers:
                self.send_header(header_name, header_value)
        
        # Forward cookies with localhost modifications
        for header_name, header_value in response_headers.items():
            if header_name.lower() == 'set-cookie':
                modified_cookie = header_value
                if 'Domain=' in modified_cookie:
                    parts = modified_cookie.split(';')
                    new_parts = [part for part in parts if not part.strip().startswith('Domain=')]
                    modified_cookie = ';'.join(new_parts)
                
                modified_cookie = modified_cookie.replace('; Secure', '').replace('Secure;', '')
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
        """Send CORS headers"""
        origin = self.headers.get('Origin', 'http://localhost:3000')
        self.send_header('Access-Control-Allow-Origin', origin)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRFToken, Referer, Accept, Cookie')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('Access-Control-Expose-Headers', 'Set-Cookie, Content-Type, Content-Length')
    
    def log_message(self, format, *args):
        """Enhanced logging"""
        timestamp = self.log_date_time_string()
        sys.stderr.write(f"[{timestamp}] {format % args}\n")

def main():
    PORT = 3000
    
    print("🚀 MetaFold OMERO Proxy Server (Robust & Reliable)")
    print(f"📱 App: http://localhost:{PORT}")
    print(f"🔬 OMERO Proxy: http://localhost:{PORT}/omero-api/*")
    print(f"🔬 Target OMERO: {OMEROProxyHandler.OMERO_SERVER}")
    print("")
    print("🔧 Robust Features:")
    print("   ✅ Connection Pooling & Reuse")
    print("   ✅ Automatic Retry Logic (3 attempts)")
    print("   ✅ Progressive Timeouts (15s→20s→25s)")
    print("   ✅ Smart Cookie Management")
    print("   ✅ Enhanced Error Handling")
    print("")
    print("🔍 Test Endpoints:")
    print(f"   📊 Proxy Status: http://localhost:{PORT}/proxy-status")
    print(f"   🌐 Robust Test: http://localhost:{PORT}/test-omero-robust")
    print("")
    print("Press Ctrl+C to stop the server")
    print("")
    
    try:
        with HTTPServer(('localhost', PORT), OMEROProxyHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🔬 Robust OMERO Proxy Server stopped")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()