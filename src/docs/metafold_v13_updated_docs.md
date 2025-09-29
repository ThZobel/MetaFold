# MetaFold v13 - Consolidated Development Documentation

**Version**: v13 (Latest)  
**Type**: Electron Desktop Application  
**Purpose**: Laboratory Data Management & Experiment Organization  
**Target**: Life Sciences, NFDI4BioImage  
**Language**: English (UI), German (Development)

---

## 🎯 **Project Overview**

MetaFold ist eine Electron-basierte Desktop-Anwendung für Labore und Lebenswissenschaften:
- **Automatisierte Ordnerstrukturen** für Experimente erstellen
- **Metadaten-Management** mit konfigurierbaren Templates
- **Integration** mit elabFTW (elektronisches Laborbuch) und OMERO (Bildverwaltung)
- **Projekt-Discovery und Visualisierung**
- **Multi-User-Workflows** mit sicherer Credential-Speicherung
- **⭐ NEU v13: Vollständiges Password-System** für individuelle User-Sicherheit
- **⭐ NEU v13: Überarbeitete OMERO Integration** mit Node.js Proxy
- **⭐ NEU v13: ProjectScanner HTML Export** für standalone Navigation

**Entwicklungsprinzipien**:
- ✅ **Einfache Bedienung** - intuitive Benutzeroberfläche
- ✅ **Modulare Architektur** - leicht erweiterbar und wartbar
- ✅ **Minimal invasive Entwicklung** - bestehende Funktionen erhalten
- ✅ **Enterprise Security** - PBKDF2 Verschlüsselung, Multi-Layer Storage

---

## 📁 **Aktuelle Dateistruktur v13**

```
MetaFold/v13_project-scanner/
├── 📄 HAUPT-DATEIEN
│   ├── index.html              # Haupt-UI (erweitert) - User Management Integration
│   ├── main.js                 # Electron Main Process (enhanced) - Node.js Proxy Integration
│   ├── preload.js              # IPC Bridge (erweitert) - Password System Support
│   ├── package.json            # Dependencies & Build Config
│   ├── omero_proxy.py          # Legacy Python Proxy (Fallback)
│   ├── readme.html             # Auto-generated Project README
│   └── webpack.config.js       # Build-Konfiguration
│
├── 🎨 CSS/ (Styling - erweitert)
│   ├── base.css                # Core Layouts & Container
│   ├── components.css          # UI-Komponenten (Buttons, Forms)
│   ├── modals.css              # Modal-Dialoge (Password UI)
│   ├── integrations.css        # elabFTW/OMERO UI-Styles
│   └── projectScanner-export.css # Export styling für HTML Navigator
│
├── 💻 JS/ (Core JavaScript - ~1200KB total)
│   ├── app.js                  # Haupt-App-Initialisierung (erweitert)
│   ├── utils.js                # Utility-Funktionen
│   ├── storage.js              # Storage-Management (File Storage)
│   │
│   ├── 👥 USER MANAGEMENT (✅ v13 MAJOR UPDATE)
│   ├── userManager.js          # User-Sessions & Password Support (25KB) ⭐ ENHANCED
│   ├── userManagementModal.js  # User-Admin-Interface (100KB+) ⭐ MAJOR ENHANCED
│   ├── loginModal.js           # Login-Dialog mit Password Support (30KB) ⭐ ENHANCED
│   ├── secureStorage.js        # Multi-Layer-Verschlüsselung (35KB) ⭐ NEW FEATURES
│   ├── securityUI.js           # Sicherheits-Management-UI
│   │
│   ├── 📋 TEMPLATES & EXPERIMENTE
│   ├── templateManager.js      # Template CRUD Operations (stable)
│   ├── templateModal.js        # Template-Erstellungsdialog
│   ├── templateTypeManager.js  # Folder vs Experiment Unterscheidung
│   ├── experimentForm.js       # Dynamische Metadaten-Formulare
│   ├── metadataEditor.js       # Schema-Editor für Templates
│   │
│   ├── 🚀 PROJECT MANAGEMENT
│   ├── projectManager.js       # Projekt-Erstellung & Orchestrierung
│   ├── projectScanner.js       # Projekt-Discovery & HTML Export (50KB) ⭐ ENHANCED
│   │
│   ├── ⚙️ SETTINGS & SICHERHEIT
│   ├── settingsManager.js      # App-Einstellungen & Password Config (45KB) ⭐ ENHANCED
│   ├── proxyManager.js         # Node.js OMERO Proxy Manager (25KB) ⭐ NEW
│   ├── universityConfig.js     # Universitätsspezifische Configs
│   │
│   └── 🔗 INTEGRATIONEN
│       └── omero/              # OMERO Integration Module (v13 überarbeitet)
│
└── 🔬 JS/OMERO/ (OMERO Integration v13 - ⭐ COMPLETELY REBUILT)
    ├── metaFoldOMEROIntegration.js    # 🌟 Haupt-OMERO-Integration
    ├── omeroAuth.js                   # Authentication & Sessions ⭐ ENHANCED
    ├── omeroAPI.js                    # API-Requests & Testing
    ├── omeroUIIntegration.js          # UI-Controls & Status ⭐ ENHANCED
    ├── omeroGroups.js                 # Gruppen-Management
    ├── omeroProjects.js               # Projekt & Dataset-Handling
    ├── omeroAnnotations.js            # Map-Annotation-Erstellung
    ├── omeroDatasetCreation.js        # Dataset-Erstellung (Legacy)
    ├── omeroDatasetCreation_fix.js    # Fixed Dataset-Erstellung
    └── omeroTestFunctions.js          # Integration-Testing
```

---

## 🆕 **Major Updates v13 - Was ist neu?**

### ⭐ **1. Complete Password System Implementation**
**Status**: ✅ Vollständig implementiert und produktionsreif

**Enterprise-Level Security Features**:
- 🔐 **PBKDF2-SHA256** Verschlüsselung (100.000 Iterationen)
- 🛡️ **Multi-Layer Storage**: Electron SafeStorage → Browser Crypto → Fallback
- 👑 **Admin-Account**: Automatische Erstellung (`Admin` / `admin`)
- 🔒 **User-spezifische Passwörter**: Individuelle Verschlüsselung pro User
- ⚙️ **Konfigurierbare Settings**: Min-Length, Auto-Logout, Password-Strength-Indikator

**Neue UI Features**:
- Password-Indikatoren (🔒 Protected, 👑 Admin)
- Benutzerfreundliche Password-Validierung mit Live-Feedback
- Admin-Funktionen: Set/Reset Password für alle User
- Auto-Logout bei User-Switch (OMERO Session Protection)

**Key Files Enhanced**:
- `secureStorage.js` - PBKDF2 implementation, encrypted storage
- `userManager.js` - Password-aware user switching
- `userManagementModal.js` - Complete admin interface overhaul
- `loginModal.js` - Conditional password fields
- `settingsManager.js` - Password system configuration

### ⭐ **2. OMERO Integration v13 - Complete Rebuild**
**Status**: ✅ Funktioniert mit beiden Servern

**Major Architecture Change**:
```
Old v12: Frontend UI → Python Proxy → OMERO Server
New v13: Frontend UI → Electron Bridge → Node.js Proxy → OMERO Server
```

**Key Improvements**:
- ✅ **Built-in Node.js Proxy**: Keine externe Python-Abhängigkeit mehr
- ✅ **Multi-Server Support**: Funktioniert mit `uni-muenster.de` und `10.14.28.44`
- ✅ **Enhanced SSL Handling**: Akzeptiert selbstsignierte Zertifikate
- ✅ **CSRF/CORS Fixes**: Korrekte Domain-Header und Token-Management
- ✅ **Session Persistence**: Robustes Session-Management
- ✅ **Auto-Start**: Proxy startet automatisch mit der App

**Critical Fixes Applied**:
1. **URL-Konstruktion**: Verhindert doppelte Slashes (`//api/`)
2. **CSRF-Domain-Matching**: Headers matchen OMERO-Server Domain
3. **SSL-Verifikation**: Deaktiviert für Development-Server

**Key Files**:
- `proxyManager.js` - ⭐ **NEU**: Node.js HTTP Proxy Server
- `omeroAuth.js` - Enhanced authentication mit domain fixes
- `omeroUIIntegration.js` - Improved status management

### ⭐ **3. ProjectScanner HTML Export Feature**
**Status**: ✅ Vollständig implementiert

**Revolutionary Export Capability**:
- 📄 **Standalone HTML Navigator**: Vollständig funktionsfähiger Project Browser
- 🎨 **Inline CSS**: Keine externen Abhängigkeiten
- 📊 **Interactive Features**: Klickbare Projektliste, README.html Integration
- 💾 **JSON Export**: Maschinenlesbare Daten für weitere Analyse
- 📱 **Responsive Design**: Funktioniert auf Desktop und Mobile

**Export Features**:
- Projektnavi mit Sidebar-Navigation
- README.html Iframe-Integration
- Projekt-Statistiken und Metadaten-Analyse
- Cross-platform File-URL handling
- Fehlerbehandlung für fehlende README-Dateien

**Key Functions Added**:
- `exportScanResults()` - Main export orchestration
- `generateProjectSummaryHTML()` - Complete HTML generation
- `generateNavigatorCSS()` - Inline styling (genau wie README.html)
- `generateNavigationScript()` - Interactive JavaScript

### ⭐ **4. Minor Fixes & Improvements**
- 🗑️ **Delete User Fix**: Minimal-invasiv repariert (1 Zeichen entfernt!)
- 📝 **Template File Storage**: Stabile Dateinamen ohne Auto-Loop
- 🔧 **Settings Integration**: Password-System vollständig in Settings integriert
- 🚀 **Performance**: Optimierte User-Switch-Logik

---

## 🔐 **Password System - Complete Implementation Details**

### **System Architecture**
```
User Input → Validation → PBKDF2 Hashing → Multi-Layer Encryption → Storage
                ↓
         Live Feedback UI ← Password Strength Check ← Requirements Validation
```

### **Security Layers**
1. **Frontend Validation**: Live password requirements checking
2. **PBKDF2-SHA256**: 100,000 iterations mit random salt
3. **Multi-Layer Storage**: 
   - Primary: Electron SafeStorage (OS-level encryption)
   - Secondary: Browser SubtleCrypto (WebCrypto API)
   - Fallback: Base64 encoding für Development

### **User Workflows**

#### **Admin Workflow**
1. **System Initialization**: Admin-Account wird automatisch erstellt
2. **User Management**: Vollzugriff auf alle User-Funktionen
3. **Password Management**: Kann Passwörter für alle User setzen/zurücksetzen
4. **System Configuration**: Zugriff auf alle Password-System-Einstellungen

#### **Protected User Workflow**
1. **Login**: Password-Dialog wenn Passwort gesetzt
2. **User Switch**: Passwort erforderlich für Wechsel zu geschützten Accounts
3. **Own Password**: Kann eigenes Passwort ändern
4. **Auto-Logout**: Automatischer OMERO-Logout bei User-Switch

#### **Standard User Workflow**
1. **Free Access**: Kein Passwort erforderlich (wie bisher)
2. **Optional Protection**: Admin kann nachträglich Passwort setzen
3. **Upgrade Path**: Einfache Migration zu geschütztem Account

### **Configuration Options**
```javascript
// Available in settingsManager.js
DEFAULT_SETTINGS = {
    'security.password_system_enabled': true,        // Master switch
    'security.require_admin_password': true,         // Admin protection
    'security.password_min_length': 6,               // Min length
    'security.auto_logout_minutes': 30,              // Session timeout
    'security.show_password_strength': true,         // Live validation
    'security.allow_password_reset': true           // Reset capability
}
```

---

## 🔬 **OMERO Integration v13 - Technical Details**

### **Proxy Architecture**
```
MetaFold App (Electron)
    ↓ IPC Bridge
Electron Main Process
    ↓ HTTP Server
Node.js Proxy Server (localhost:3000)
    ↓ HTTPS + CSRF Fixes
OMERO Server (uni-muenster.de oder 10.14.28.44)
```

### **CSRF/CORS Solutions Applied**
1. **Origin Header**: Set to OMERO server domain
2. **Referer Header**: Set to OMERO webclient/login/
3. **Cookie Handling**: Preserve CSRF tokens across requests
4. **SSL Certificate**: Accept self-signed certificates
5. **Domain Matching**: Ensure headers match target server

### **Multi-Server Support**
- ✅ **Public Server**: `omero-imaging.uni-muenster.de`
- ✅ **Internal Server**: `https://10.14.28.44/` (with self-signed cert)
- 🔧 **Auto-Detection**: Proxy adapts URL handling per server
- ⚙️ **Configurable**: Server URL in settings

### **Session Management**
```javascript
// Enhanced session structure
window.omeroAuth.session = {
    csrfToken: "...",
    loginTime: 1754029677949,
    username: "authenticated_user",
    isAuthenticated: true,
    loginMethod: "Form-based Login",
    serverUrl: "https://10.14.28.44/"
}
```

---

## 📊 **ProjectScanner Export - Features & Usage**

### **Export Output Structure**
```
📁 Export Directory/
├── 📄 MetaFold-Projects-Summary-2025-01-15-14-30-00.html  # Interactive Navigator
├── 📊 MetaFold-Projects-Data-2025-01-15-14-30-00.json     # Machine-readable data
└── (CSS is inline in HTML - no external files needed)
```

### **HTML Navigator Features**
- **Sidebar Navigation**: Projekt-Explorer mit README-Indikatoren
- **Interactive Loading**: Click to load README.html in iframe
- **Error Handling**: Graceful handling für fehlende README-Dateien
- **Responsive Design**: Mobile-friendly sidebar collapse
- **Keyboard Shortcuts**: ESC (zurück), Arrow Keys (Navigation)

### **JSON Export Data Structure**
```javascript
{
    exportInfo: { timestamp, version, scannedPath, totalProjects },
    scanStatistics: { /* Scan results */ },
    directoryTree: { /* Nested structure */ },
    projects: [ /* Enhanced project data */ ],
    aggregatedMetadata: { /* Field analysis */ },
    projectRelationships: { /* Dependencies */ }
}
```

### **Use Cases**
- **Laboratory Documentation**: Vollständige Projekt-Übersicht für Reports
- **Offline Navigation**: Standalone Browse ohne MetaFold App
- **Data Analysis**: JSON für weitere Analyse in R/Python
- **Sharing**: Send HTML file to colleagues for project overview
- **Archiving**: Long-term documentation of project states

---

## 🛠️ **Development Workflow v13**

### **Password System Development**
1. **Alle Password-Features sind implementiert** - keine weiteren Änderungen nötig
2. **Testing**: Console commands für Password-System-Debugging verfügbar
3. **Configuration**: Vollständig in Settings-UI integriert

### **OMERO Integration Development**
1. **Proxy läuft automatisch** - kein manueller Start erforderlich
2. **Multi-Server**: Konfiguration über Settings
3. **Debugging**: Console-Tests für Connection/Logout verfügbar

### **ProjectScanner Development**
1. **Export funktioniert vollständig** - HTML + JSON Generation
2. **README Integration**: Automatische README.html Detection
3. **Cross-platform**: File-URL handling für Windows/Mac/Linux

### **Debugging Commands**
```javascript
// Password System
await window.userManager.debugPasswordSystem();
window.secureStorage.getPasswordSystemStatus();

// OMERO Integration
await window.omeroUIIntegration.testConnection();
await window.omeroUIIntegration.logout();

// Project Scanner
await projectScanner.exportScanResults();
projectScanner.scanDirectory();
```

---

## ✅ **Current Status v13**

### **✅ Fully Implemented & Production Ready**
- **Complete Password System** (Enterprise-level security)
- **OMERO Integration v13** (Works with multiple servers)
- **ProjectScanner HTML Export** (Standalone navigation)
- **Multi-User Support** with password protection
- **Template File Storage** (stable, no auto-loop)
- **All Core Features** (Project creation, metadata management)

### **🔧 Configuration Required**
- **OMERO Server URL**: Set in Settings → Integrations
- **Password System**: Enable/disable in Settings → Security
- **Admin Password**: Set via User Management (recommended: `admin`)

### **📝 Ready for Extension**
- Additional visualization options
- Enhanced security features (MFA, LDAP)
- More integration targets
- Advanced template features
- Automated workflow triggers

---

## 🎯 **Quick Reference für Entwicklung v13**

### **Password System modifizieren?**
**Dateien**: `secureStorage.js`, `userManager.js`, `userManagementModal.js`, `settingsManager.js`

### **OMERO Integration modifizieren?**
**Dateien**: `proxyManager.js` (new!), `js/omero/omeroAuth.js`, `js/omero/omeroUIIntegration.js`

### **ProjectScanner Export modifizieren?**
**Dateien**: `projectScanner.js` (exportScanResults, generateProjectSummaryHTML functions)

### **User Management modifizieren?**
**Dateien**: `userManagementModal.js`, `loginModal.js`

### **Template System modifizieren?**
**Dateien**: `templateManager.js`, `storage.js`, `experimentForm.js`

---

## 📮 **Version History**

### **v13 (Current) - January 2025**
- ⭐ Complete Password System implementation
- ⭐ OMERO Integration v13 with Node.js Proxy
- ⭐ ProjectScanner HTML Export feature
- 🔧 Delete User fix (minimal-invasive)
- 🔧 Enhanced error handling and debugging

### **v12 (Previous)**
- Template File Storage system
- Basic OMERO Integration (Python Proxy)
- Project Discovery and Visualization
- Multi-User Support (without passwords)

### **v06 (Base)**
- Core template system
- elabFTW Integration
- Basic project creation
- Foundation architecture

---

## 🔮 **Known Limitations & Future Enhancements**

### **Current Limitations**
- **Single OMERO Server**: Nur ein Server gleichzeitig (konfigurierbar)
- **Session Timeout**: Fixed 30-minute timeout (könnte konfigurierbar sein)
- **Local Admin**: Kein LDAP/Enterprise Authentication (yet)

### **Planned Enhancements**
- **Multi-Factor Authentication**: TOTP/SMS Integration
- **Enterprise LDAP**: External authentication support
- **Advanced Templates**: Conditional fields, dependencies
- **Automated Workflows**: Trigger-based actions
- **Enhanced Analytics**: Advanced metadata analysis

---

## 🚀 **Getting Started with v13**

### **First-Time Setup**
1. **Start MetaFold v13**
2. **User Management Modal** öffnet automatisch
3. **Set Admin Password**: Empfohlen für Sicherheit
4. **Configure OMERO**: Settings → Integrations → OMERO Server URL
5. **Create First User**: Mit oder ohne Passwort
6. **Create First Project**: Templates sind verfügbar

### **Password System Setup**
1. **Enable**: Settings → Security → Password System Enabled
2. **Admin Password**: User Management → Set Password for Admin
3. **User Passwords**: Admin kann für alle User Passwörter setzen
4. **Testing**: Login mit Password-protected User

### **OMERO Integration Setup**
1. **Server URL**: Settings → Integrations → OMERO Server
2. **Test Connection**: OMERO Tab → Connect Button
3. **Multi-Server**: Wechsel über Settings möglich
4. **Debugging**: Console-Tests für Troubleshooting

### **Project Export**
1. **Scan Directory**: Visualization Tab → Project Scanner
2. **Export Results**: Export Summary Button
3. **HTML Navigator**: Öffne generierte HTML-Datei
4. **JSON Analysis**: Nutze JSON für weitere Analyse

---

**MetaFold v13 ist die bisher umfassendste und sicherste Version mit Enterprise-Features und vollständiger Integration-Unterstützung!** 🎉

*Letzte Aktualisierung: Januar 2025 - v13 Complete Implementation*