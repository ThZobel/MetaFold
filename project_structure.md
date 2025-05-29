# Refactored Electron App - Projekt-Struktur

## 📁 Neue Ordnerstruktur

```
project-root/
├── index.html                 # Haupt-HTML-Datei (vereinfacht)
├── main.js                    # Electron Main Process (erweitert)
├── preload.js                 # Electron Preload Script (erweitert)
├── package.json              # Bestehend
├── css/
│   └── styles.css            # Alle CSS-Styles ausgelagert
├── js/
│   ├── app.js               # Haupt-App-Controller
│   ├── utils.js             # Utility-Funktionen
│   ├── storage.js           # Lokaler Speicher-Manager
│   ├── templateManager.js   # Template-Verwaltung
│   ├── templateTypeManager.js # Folder/Experiment-Modi
│   ├── metadataEditor.js    # Metadaten-Editor
│   ├── experimentForm.js    # Experiment-Formular
│   ├── templateModal.js     # Modal-Verwaltung
│   └── projectManager.js    # Projekt-Erstellung
└── assets/                   # Bestehende Assets
    └── icon.png
```

## 🔧 Module-Übersicht

### **1. app.js** - Haupt-Controller
- App-Initialisierung
- Event-Listener-Setup
- Keyboard-Shortcuts
- Module-Koordination

### **2. utils.js** - Utility-Funktionen
- ID-Generierung für HTML-Elemente
- Default-Werte für verschiedene Typen
- Pfad-Vorschau-Updates
- Nachrichten-Anzeige (Error/Success)
- Plattform-spezifische Anpassungen

### **3. storage.js** - Speicher-Verwaltung
- Template-Loading/Saving
- LocalStorage-Interaktion
- Default-Templates
- CRUD-Operationen für Templates

### **4. templateManager.js** - Template-Verwaltung
- Template-Liste rendern
- Template-Auswahl
- Template hinzufügen/bearbeiten/löschen
- Aktuelle Template-Verwaltung

### **5. templateTypeManager.js** - Typ-Verwaltung
- Wechsel zwischen Folder/Experiment-Modus
- UI-State-Management für Template-Typen

### **6. metadataEditor.js** - Metadaten-Editor
- Dynamische Feld-Erstellung
- JSON-Schema-Support
- Field-Type-Management
- JSON-Import/Export

### **7. experimentForm.js** - Experiment-Formular
- Metadaten-Formular rendern
- Feld-Validierung
- Daten-Sammlung
- Verschachtelte Felder-Unterstützung

### **8. templateModal.js** - Modal-Verwaltung
- Modal öffnen/schließen
- Template-Erstellung/Bearbeitung
- Tab-Management (Struktur/Metadaten)

### **9. projectManager.js** - Projekt-Erstellung
- Pfad-Auswahl
- Projekt-Erstellung
- Electron-API-Interaktion

## 🚀 Verbesserungen

### **Modulare Architektur**
- Jedes Modul hat eine spezifische Verantwortlichkeit
- Klare Trennung von Concerns
- Einfache Wartung und Erweiterung

### **Erweiterte Main.js**
- Verbesserte Metadaten-Datei-Erstellung
- Automatische README-Generierung
- Bessere Error-Behandlung
- Erweiterte IPC-Handlers

### **Erweiterte Preload.js**
- Zusätzliche Utility-Funktionen
- Projekt-ID-Generierung
- Template-Statistiken
- Verbesserte Pfad-Utilities

### **CSS-Auslagerung**
- Alle Styles in separate CSS-Datei
- Bessere Wartbarkeit
- Einfachere Theme-Anpassungen

## 📝 Änderungen für AI-Optimierung

### **Kleinere, fokussierte Module**
- Jede Datei hat < 300 Zeilen Code
- Spezifische Funktionalitäten pro Modul
- Klare Schnittstellen zwischen Modulen

### **Verbesserte Namenskonventionen**
- Deskriptive Funktionsnamen
- Konsistente Modul-Pattern
- Klare Variablen-Namen

### **Dokumentation**
- Jedes Modul hat Header-Kommentare
- Funktions-Dokumentation
- Klare Code-Struktur

## 🔄 Migration von der alten Version

### **HTML-Änderungen**
- Entfernung des gesamten `<script>`-Blocks
- Hinzufügung der CSS-Link
- Hinzufügung der JavaScript-Module
- Anpassung der onclick-Handler

### **Funktions-Mapping**
```javascript
// Alt → Neu
switchTemplateType() → templateTypeManager.switchType()
showCreateModal() → templateModal.show()
selectTemplate() → templateManager.select()
createFolders() → projectManager.createProject()
editTemplate() → templateManager.editCurrent()
deleteTemplate() → templateManager.deleteCurrent()
addMetadataField() → metadataEditor.addField()
browsePath() → projectManager.browsePath()
```

## 💡 Vorteile für AI-Tools

### **1. Spezifische Änderungen**
- Nur relevante Module müssen bearbeitet werden
- Kleinere Kontext-Fenster
- Fokussierte Problemlösung

### **2. Bessere Verständlichkeit**
- Klare Modul-Verantwortlichkeiten
- Reduzierte Komplexität pro Datei
- Einfachere Debugging

### **3. Skalierbarkeit**
- Neue Features als neue Module
- Einfache Erweiterung bestehender Module
- Minimale Seiteneffekte bei Änderungen

## 🛠️ Setup-Anweisungen

1. **Ordnerstruktur erstellen:**
   ```bash
   mkdir css js
   ```

2. **Dateien erstellen:**
   - Alle JavaScript-Module in `js/` Ordner
   - CSS-Datei in `css/` Ordner
   - Bestehende `main.js` und `preload.js` ersetzen

3. **index.html aktualisieren:**
   - Neue HTML-Version verwenden
   - Styles und Scripts sind jetzt extern

4. **Testen:**
   - App starten und alle Funktionen testen
   - Sicherstellen, dass alle Module korrekt geladen werden

## 🔍 Debugging

### **Browser-Entwicklertools**
- Netzwerk-Tab: Überprüfen ob alle Module geladen werden
- Konsole: JavaScript-Fehler identifizieren
- Sources: Module-Code inspizieren

### **Electron-DevTools**
- `main.js` mit `--dev` Flag starten
- Renderer-Prozess debuggen
- IPC-Kommunikation überwachen

Die neue Struktur macht es viel einfacher, spezifische Funktionen zu erweitern oder zu reparieren, ohne die gesamte Anwendung zu verstehen oder zu modifizieren.