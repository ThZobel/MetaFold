# MetaFold v06 - Consolidated Development Documentation

**Version**: v06 (Latest)  
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

**Entwicklungsprinzipien**:
- ✅ **Einfache Bedienung** - intuitive Benutzeroberfläche
- ✅ **Modulare Architektur** - leicht erweiterbar und wartbar
- ✅ **Minimal invasive Entwicklung** - bestehende Funktionen erhalten

---

## 📁 **Aktuelle Dateistruktur**

```
MetaFold/v06/
├── 📄 HAUPT-DATEIEN
│   ├── index.html              # Haupt-UI (107KB) - Komplette Anwendungsoberfläche
│   ├── main.js                 # Electron Main Process (37KB) - Backend-Logik
│   ├── preload.js              # IPC Bridge (15KB) - Sicherheitsschicht
│   ├── package.json            # Dependencies & Build Config
│   ├── omero_proxy.py          # Python OMERO Proxy Server (19KB)
│   └── webpack.config.js       # Build-Konfiguration
│
├── 🎨 CSS/ (Styling - ~100KB total)
│   ├── base.css                # Core Layouts & Container
│   ├── components.css          # UI-Komponenten (Buttons, Forms)
│   ├── modals.css              # Modal-Dialoge
│   ├── integrations.css        # elabFTW/OMERO UI-Styles
│   └── [weitere CSS-Dateien...]
│
├── 💻 JS/ (Core JavaScript - ~600KB total)
│   ├── app.js                  # Haupt-App-Initialisierung (9KB)
│   ├── utils.js                # Utility-Funktionen (3KB)
│   ├── storage.js              # Storage-Management (8KB) ⭐ ENHANCED
│   │
│   ├── 👥 USER MANAGEMENT
│   ├── userManager.js          # User-Sessions & Management (12KB)
│   ├── userManagementModal.js  # User-Admin-Interface (36KB)
│   ├── loginModal.js           # Login-Dialog (21KB)
│   │
│   ├── 📋 TEMPLATES & EXPERIMENTE
│   ├── templateManager.js      # Template CRUD Operations (37KB) ⭐ ENHANCED
│   ├── templateModal.js        # Template-Erstellungsdialog (15KB)
│   ├── templateTypeManager.js  # Folder vs Experiment Unterscheidung (4KB)
│   ├── experimentForm.js       # Dynamische Metadaten-Formulare (35KB) ⭐ ENHANCED
│   ├── metadataEditor.js       # Schema-Editor für Templates (35KB)
│   │
│   ├── 🚀 PROJECT MANAGEMENT
│   ├── projectManager.js       # Projekt-Erstellung & Orchestrierung (19KB)
│   ├── projectScanner.js       # Projekt-Discovery & Analyse (23KB)
│   │
│   ├── ⚙️ SETTINGS & SICHERHEIT
│   ├── settingsManager.js      # App-Einstellungen & Integrationen (38KB)
│   ├── secureStorage.js        # Multi-Layer-Verschlüsselung (20KB)
│   ├── securityUI.js           # Sicherheits-Management-UI (18KB)
│   │
│   └── 🔗 INTEGRATIONEN
│       ├── universityConfig.js # Universitätsspezifische Configs (5KB)
│       └── omero/              # OMERO Integration Module (siehe unten)
│
└── 🔬 JS/OMERO/ (OMERO Integration - ⭐ MAJOR ENHANCEMENT)
    ├── metaFoldOMEROIntegration.js    # 🌟 Haupt-OMERO-Integration (24KB)
    ├── omeroAuth.js                   # Authentication & Sessions (23KB) ⭐ KEY
    ├── omeroAPI.js                    # API-Requests & Testing (18KB)
    ├── omeroUIIntegration.js          # UI-Controls & Status (31KB) ⭐ KEY
    ├── omeroGroups.js                 # Gruppen-Management (16KB)
    ├── omeroProjects.js               # Projekt & Dataset-Handling (27KB)
    ├── omeroAnnotations.js            # Map-Annotation-Erstellung (16KB)
    ├── omeroDatasetCreation.js        # Dataset-Erstellung (Legacy) (23KB)
    ├── omeroDatasetCreation_fix.js    # Fixed Dataset-Erstellung (16KB)
    └── omeroTestFunctions.js          # Integration-Testing (24KB)
```

---

## 🆕 **Major Updates & Neue Features**

### ⭐ **Template File Storage System**
**Status**: ✅ Vollständig implementiert  
**Problem gelöst**: Auto-Loop bei Template-Erstellung durch Migration

**Wichtige Änderungen**:
- Templates werden als **individuelle Dateien** gespeichert (nicht mehr localStorage)
- **Home Directory Storage**: `C:\Users\[User]\MetaFold\Templates\[Group]\[User]\`
- **Filename-basierte Template-Namen**: Eindeutige Namen basierend auf Dateinamen
- **Stabile Dateinamen**: Keine Zeitstempel mehr, Updates überschreiben bestehende Dateien

**Betroffene Dateien**:
- `storage.js` - Komplette Bereinigung, File-First Loading
- `templateManager.js` - Migration entfernt, File Storage Integration
- `main.js` - Enhanced Template Loading mit Deduplication

### ⭐ **OMERO Integration v06**
**Status**: ✅ Vollständig implementiert & getestet

**Neue Proxy-Architektur**:
```
Frontend UI → Electron Bridge → Electron Main → Node.js Proxy → OMERO Server
```

**Key Improvements**:
- ✅ **Automatischer Proxy-Start**: Kein manueller Python-Proxy erforderlich
- ✅ **Built-in Node.js Proxy**: Integriert in Electron Main Process
- ✅ **Smart Fallback**: Fallback auf externen Python-Proxy wenn verfügbar
- ✅ **Session Persistenz**: Robustes Session-Management mit Validierung
- ✅ **UI Integration**: Echtzeit Connect/Logout Button-Status

**Authentication System**:
1. **Strategy 1**: Credential-basiertes Login (Username/Password)
2. **Strategy 2**: Session Cookie Recovery
3. **Strategy 3**: Public Group Fallback

**Ultra-Simple Logout Strategy**:
```javascript
// Basierend auf Console-Tests: Lokale Session-Bereinigung
async logout() {
    window.omeroAuth.session = null;  // Lokale Bereinigung (funktioniert immer)
    this.resetUIAfterLogout();
    return { success: true };
}
```

### ⭐ **Auto-Logout bei User Switch**
**Status**: ✅ Implementiert  
**Datei**: `userManager.js`

```javascript
async switchUser(username, groupname) {
    // STEP 1: Auto OMERO Logout vor User Switch
    await this.autoLogoutOMERO(username, groupname);
    // STEP 2-4: Normaler User Switch
}
```

---

## 🏗️ **Architektur & Entwicklungsrichtlinien**

### **Multi-Layer-Architektur**
```
┌─────────────────┐
│   Frontend UI   │ ← HTML/CSS/JS (Vanilla JavaScript)
├─────────────────┤
│ Electron Bridge │ ← preload.js (Sichere IPC-Kommunikation)
├─────────────────┤
│ Electron Main   │ ← main.js (Dateisystem, OS APIs, Proxy Manager)
├─────────────────┤
│ Node.js Proxy   │ ← Eingebauter HTTP-Server (Port 3000)
├─────────────────┤
│ External APIs   │ ← elabFTW REST API, OMERO Server
├─────────────────┤
│ Python Proxy    │ ← omero_proxy.py (Fallback für OMERO CORS Handling)
└─────────────────┘
```

### **Entwicklungsprinzipien**
1. **Minimal Invasiv**: Niemals ganze Dateien neu schreiben
2. **Modulares Design**: Jede Funktion hat dedizierte Module
3. **Funktionsnamen erhalten**: Niemals bestehende Funktionsnamen ändern
4. **Datei-für-Datei Entwicklung**: Individuelle Artifacts für jede Änderung
5. **Schritt-für-Schritt**: Große Aufgaben in kleine Schritte zerlegen

### **Wichtige Anweisung für Entwicklung**
- **Immer zuerst `*.js` Dateien lesen**, bevor Funktionen hinzugefügt werden
- **Im Projektwissen nach aktuellen Dateien suchen**
- **Neue Funktionen als einzelnes Artifact erstellen** mit detaillierter Erklärung der Einfügung
- **Browser Console für Debugging** nutzen vor finalen Änderungen

---

## 📋 **Core Functionality Reference**

### 🎯 **Template System**
**Hauptdateien**: `templateManager.js`, `experimentForm.js`, `storage.js`

**Key Features**:
- ✅ **Folder Templates**: Verzeichnisstrukturen erstellen
- ✅ **Experiment Templates**: Ordner + Metadaten-Formulare
- ✅ **File Storage**: Templates als individuelle Dateien
- ✅ **Filename-basierte Namen**: Eindeutige Namen ohne Kollisionen
- ✅ **Stabile Dateinamen**: `templatename_user_type.json`

**Template-Speicherung**:
```
Alte Methode (Problem):
template_Image_Analysis_template_1753689284618_9vv2i8uc8_2025-07-28T07-54-44-616Z.json

Neue Methode (Lösung):
image_analysis_thomas_experiment.json
```

**Wichtige Funktionen**:
```javascript
// Template Management
templateManager.add(template)              // Neues Template hinzufügen
templateManager.update(index, template)    // Bestehendes aktualisieren
templateManager.clearCurrentTemplate()     // Template-Werte löschen

// Storage Operations
storage.loadTemplatesFromFilesOnly()       // File-only Loading
storage.generateStableTemplateFilename()   // Stabiler Dateiname
storage.deduplicateTemplates()            // Duplikate entfernen
```

### 🔬 **OMERO Integration**
**Hauptdateien**: `js/omero/*.js` (11 Module)

**Wichtigste Module**:
- `omeroUIIntegration.js` - UI Integration, Connect/Logout Logic ⭐
- `omeroAuth.js` - Session Management, Login Strategies ⭐
- `metaFoldOMEROIntegration.js` - Haupt-Orchestrierung
- `omeroAPI.js` - Low-Level API Wrapper

**Proxy Management**:
```javascript
// Automatischer Proxy-Start
async ensureProxyIsRunning() {
    // Method 1: Built-in Node.js Proxy (Electron App)
    // Method 2: External Python Proxy (localhost:3000)
    // Method 3: Fallback mit Guidance
}
```

**Session Management**:
```javascript
window.omeroAuth.session = {
    csrfToken: "...",
    loginTime: 1754029677949,
    username: "authenticated_user",
    isAuthenticated: true,
    loginMethod: "Form-based Login"
}
```

**Testing & Debugging**:
```javascript
// Console-Test-Funktionen
await window.omeroUIIntegration.testConnection()  // Connection Test
await window.omeroUIIntegration.logout()          // Logout Test
window.omeroAuth.isSessionValid()                 // Session Check
```

### 🚀 **Project Creation**
**Hauptdateien**: `projectManager.js`, `main.js`, `preload.js`

**Workflow**:
1. **Pfad-Auswahl**: User wählt Zielverzeichnis
2. **Template-Anwendung**: Ordnerstruktur und Metadaten anwenden
3. **Integration Processing**: Einträge in elabFTW/OMERO erstellen
4. **Success Handling**: Links zu erstellten Einträgen anzeigen

---

## 🛠️ **Development Workflow**

### **Feature-Entwicklung Schritt-für-Schritt**
1. **Betroffene Dateien identifizieren**: Diese Dokumentation konsultieren
2. **Bestehende Funktionen prüfen**: Niemals bestehende Funktionsnamen ändern
3. **Projektwissen durchsuchen**: Nach aktuellen Dateien suchen
4. **Einzelne Artifacts erstellen**: Eine Funktion/Feature pro Artifact
5. **Integration Points testen**: Kompatibilität mit bestehendem Code sicherstellen

### **Debugging-Workflow**
1. **Browser Console zuerst**: Debugging vor finalen Dateiänderungen
2. **Projektwissen durchsuchen**: Aktuelle Dateien finden
3. **Bestehende Dateien lesen**: Vor Hinzufügung neuer Funktionen
4. **Minimal invasive Änderungen**: Nur notwendige Modifikationen

### **Häufige Entwicklungsmuster**

#### **Template-Features hinzufügen**
**Benötigte Dateien**: `templateManager.js`, `storage.js`, `experimentForm.js`
1. Storage-Funktion in `storage.js` hinzufügen
2. Template-Management in `templateManager.js` erweitern
3. Form-Rendering in `experimentForm.js` aktualisieren

#### **OMERO-Features hinzufügen**
**Benötigte Dateien**: Spezifische `js/omero/*.js` Module
1. Prüfen, welches OMERO-Modul das Feature behandelt
2. Entsprechendes Modul erweitern
3. Haupt-Integration aktualisieren wenn nötig

---

## 🧪 **Testing & Debugging**

### **Console Test Functions**
```javascript
// OMERO Testing
await window.omeroUIIntegration.testConnection()   // Connection Test
await window.omeroUIIntegration.logout()           // Logout Test
window.omeroAuth.session                           // Session Status

// Template Testing
window.storage.getStorageStats()                   // Storage Status
window.storage.healthCheck()                       // File Storage Test
window.templateManager.refresh()                   // Templates neu laden

// Cleanup Functions
window.quickTemplateCleanup()                      // localStorage bereinigen
window.storage.forceCleanReload()                  // Vollständige Reparatur
```

### **Common Issues & Solutions**

#### **OMERO Proxy Problems**
```javascript
// Proxy Status prüfen
const proxyStatus = await window.omeroUIIntegration.checkProxyServer();
fetch('http://localhost:3000/proxy-status').then(r => r.json()).then(console.log);
```

#### **Template Loading Issues**
```javascript
// Template Status debugging
window.storage.loadTemplatesFromFilesOnly();
console.log('Templates loaded:', window.templateManager.templates.length);
```

---

## ✅ **Aktueller Status & Verfügbare Features**

**✅ Vollständig implementiert**:
- Template-Management mit File Storage (ohne Auto-Loop Problem)
- OMERO Integration mit automatischem Proxy (v06)
- Multi-Strategy Authentication (Credentials, Cookies, Public Group)
- Ultra-Simple Logout System (lokale Bereinigung)
- Auto-Logout bei User Switch
- Filename-basierte Template-Namen
- Project Creation mit Ordnerstrukturen
- elabFTW Integration
- Projekt-Discovery und -Scanning
- Multi-User-Support
- Sichere Credential-Speicherung

**🔄 Bereit für Erweiterung**:
- Zusätzliche Visualisierungsoptionen
- Weitere Integration-Ziele
- Erweiterte Template-Features
- Enhanced Security Options

---

## 🎯 **Quick Reference für Entwicklung**

### **Template-System modifizieren?**
**Dateien**: `templateManager.js`, `storage.js`, `experimentForm.js`

### **OMERO Integration modifizieren?**
**Dateien**: `js/omero/omeroUIIntegration.js` (main), spezifische Module

### **Project Creation modifizieren?**
**Dateien**: `projectManager.js`, `main.js`, `preload.js`

### **UI/UX modifizieren?**
**Dateien**: `index.html`, entsprechende CSS-Dateien

### **Settings modifizieren?**
**Dateien**: `settingsManager.js`, `secureStorage.js`

---

## 🔮 **Bekannte Limitierungen**

- **Server-side Logout**: Nicht unterstützt durch aktuellen Proxy (nur lokale Bereinigung)
- **Session Timeout**: Feste 10-Minuten-Timeout (könnte konfigurierbar sein)
- **Single Server**: Derzeit nur ein OMERO-Server gleichzeitig
- **Template Migration**: Keine automatische Migration mehr (manuell wenn nötig)

---

*Diese konsolidierte Dokumentation spiegelt den aktuellen Stand von MetaFold v06 wider und dient als Hauptreferenz für die Entwicklung neuer Features.*