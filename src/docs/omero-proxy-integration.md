🎯 Plan: Node.js OMERO Proxy Integration
📋 Aktueller Stand (Analyse)

✅ Funktionierender Python Proxy (omero_proxy.py) für CSRF/CORS Handling
✅ OMERO Integration Module (11 JavaScript Module in js/omero/)
✅ Electron IPC bereits etabliert (main.js, preload.js)
❌ Problem: Separater Python Proxy-Start erforderlich → nicht benutzerfreundlich


🚀 Lösungsarchitektur
Neue Architektur (Target)
┌─────────────────┐
│   Frontend UI   │ ← OMERO Connection Button triggers proxy start
├─────────────────┤
│ Electron Bridge │ ← preload.js (IPC for proxy control)
├─────────────────┤
│ Electron Main   │ ← main.js + NEW: proxyManager.js
├─────────────────┤ 
│ Node.js Proxy   │ ← NEW: Built-in Node.js HTTP server
├─────────────────┤
│ OMERO Server    │ ← omero-imaging.uni-muenster.de
└─────────────────┘

📝 Schritt-für-Schritt Plan
Phase 1: Proxy Manager (Backend)
Dateien: main.js, preload.js, NEW: js/proxyManager.js

proxyManager.js erstellen

Node.js HTTP Server Implementation (basierend auf omero_proxy.py Logik)
CSRF/CORS Handling für OMERO
Server-Lifecycle Management (start/stop/status)
Port-Management (automatische Port-Findung falls 3000 belegt)


main.js erweitern

IPC Handler für Proxy-Kontrolle (start-omero-proxy, stop-omero-proxy, proxy-status)
Proxy-Server Integration beim App-Shutdown
Error Handling und Logging


preload.js erweitern

Neue API für Frontend: startOMEROProxy(), stopOMEROProxy(), getProxyStatus()



Phase 2: Frontend Integration (Client)
Dateien: js/omero/omeroUIIntegration.js

Smart Proxy Startup

Proxy-Check vor OMERO Connection
Automatischer Proxy-Start mit user-spezifischen Settings
Fallback auf Python Proxy (falls installiert)
Enhanced Status-Feedback im UI


Enhanced OMERO Connection Flow
javascript1. User klickt "Test OMERO Connection"
2. Check if Node.js proxy läuft
3. Wenn nicht: Start proxy mit aktuellen OMERO Settings  
4. Proceed mit OMERO Authentication
5. Bei Fehler: Stop proxy, show detailed error


Phase 3: Settings Integration
Dateien: js/settingsManager.js

Proxy-Settings hinzufügen

Proxy Mode: auto, manual, external-python
Port Configuration (default: 3000)
Auto-start Preferences
Debug/Logging Options




🔧 Technische Details
Node.js Proxy Implementation
javascript// In proxyManager.js
class OMEROProxyServer {
    constructor(port = 3000, omeroServerUrl) {
        this.port = port;
        this.omeroServerUrl = omeroServerUrl;
        this.server = null;
        this.status = 'stopped';
    }

    async start() {
        // HTTP Server mit CORS/CSRF Logic
        // Basierend auf omero_proxy.py Funktionalität
    }

    async stop() {
        // Graceful server shutdown
    }

    getStatus() {
        // Server status und performance metrics
    }
}
IPC Integration Pattern
javascript// main.js IPC Handlers
ipcMain.handle('start-omero-proxy', async (event, settings) => {
    return await proxyManager.startProxy(settings);
});

// preload.js API
startOMEROProxy: (settings) => 
    ipcRenderer.invoke('start-omero-proxy', settings)
Frontend Integration Point
javascript// omeroUIIntegration.js - Modified Connection Flow
async testConnection() {
    // 1. Check proxy status
    const proxyStatus = await this.checkProxyServer();
    
    // 2. Start proxy if needed
    if (!proxyStatus.running) {
        const settings = await this.getSettings();
        await window.electronAPI.startOMEROProxy(settings);
    }
    
    // 3. Proceed with OMERO authentication
    // ... existing logic
}

📂 Erforderliche Dateien/Änderungen
Neue Dateien

js/proxyManager.js - Node.js HTTP Server Implementation
js/omero/proxyController.js - High-level proxy control wrapper

Zu modifizierende Dateien

main.js - IPC Handler + Proxy Integration
preload.js - Neue Proxy-Control APIs
js/omero/omeroUIIntegration.js - Enhanced Connection Flow
js/settingsManager.js - Proxy Settings
package.json - Mögliche neue Dependencies


⚡ Nutzerfreundlichkeit Features
Automatisierung

🔄 Auto-Start: Proxy startet automatisch bei erster OMERO Connection
⚙️ Settings-Aware: Proxy verwendet aktuelle Server-Settings
🔍 Smart Detection: Erkennt ob Python Proxy bereits läuft
🛡️ Fallback: Nutzt externes Python Proxy als Backup

User Experience

📊 Status Indicator: Visual feedback über Proxy-Status
🎯 One-Click Setup: "Test OMERO Connection" startet alles automatisch
📝 Clear Messaging: Detaillierte Fehlermeldungen mit Lösungsvorschlägen
🔧 No Config Required: Funktioniert out-of-the-box


⏱️ Implementierungsreihenfolge
Sprint 1: Backend Foundation

proxyManager.js implementieren
main.js IPC Handler hinzufügen
preload.js APIs erweitern
Basic Testing

Sprint 2: Frontend Integration

omeroUIIntegration.js Connection Flow erweitern
Proxy Status UI hinzufügen
Error Handling verbessern
Integration Testing

Sprint 3: Polish & Settings

settingsManager.js Proxy-Settings
Advanced Fallback Logic
Performance Optimization
Documentation Update


🧪 Testing Strategy
Test Cases

✅ App Start: Proxy bleibt gestoppt bis OMERO Connection
✅ Auto-Start: Proxy startet bei erster OMERO Verwendung
✅ Settings Update: Proxy restart bei Server-URL Änderung
✅ Port Conflicts: Automatische Port-Findung
✅ Fallback: Python Proxy Detection und Nutzung
✅ App Shutdown: Proxy stoppt sauber mit App


Möchtest Du, dass ich mit der Implementierung dieses Plans beginne? Ich würde mit der proxyManager.js Datei starten und dann schrittweise die Integration entwickeln.