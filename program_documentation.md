# Ordner & Experiment Manager - Programm-Dokumentation

## 📋 Überblick

Eine Electron-App zum Erstellen und Verwalten von Projektvorlagen mit zwei Modi:
- **Ordner-Vorlagen**: Einfache Ordnerstrukturen
- **Experiment-Vorlagen**: Ordnerstrukturen + Metadaten-Formulare

## 🏗️ Architektur

### **Electron-Struktur**
```
project-root/
├── main.js              # Electron Main Process
├── preload.js           # Electron Preload Script  
├── index.html           # Haupt-UI
├── package.json         # Dependencies
├── css/
│   └── styles.css       # Alle UI-Styles
├── js/                  # JavaScript Module
└── assets/
    └── icon.png
```

### **Modulare JavaScript-Architektur**
- Jedes Modul ist eigenständig und hat spezifische Verantwortlichkeiten
- Module kommunizieren über globale `window.*` Objekte
- Keine direkten Abhängigkeiten zwischen Frontend-Modulen

## 📁 Datei-Übersicht

### **🖥️ Electron Backend**

#### **main.js** (Electron Main Process)
- **Zweck**: Hauptprozess, Window-Management, IPC-Handler
- **Wichtige Funktionen**:
  - `createWindow()`: Erstellt Hauptfenster
  - `ipcMain.handle('create-project')`: Projekt-Erstellung
  - `ipcMain.handle('select-folder')`: Ordner-Dialog
  - `ipcMain.handle('open-folder')`: Ordner im Explorer öffnen
  - `createFolderStructure()`: Ordnerstruktur aus String erstellen
  - `createMetadataFiles()`: JSON + README für Experimente
- **Besonderheiten**: Pfad-Normalisierung mit `path.resolve()`, Error-Handling

#### **preload.js** (Electron Preload Script)
- **Zweck**: Sichere Brücke zwischen Main und Renderer Process
- **API**: `window.electronAPI.*` und `window.utils.*`
- **Wichtige Objekte**:
  - `electronAPI`: IPC-Funktionen (createProject, selectFolder, etc.)
  - `utils`: Plattform-Utilities (Pfade, Validierung, etc.)

### **🎨 Frontend Core**

#### **index.html** 
- **Zweck**: Haupt-UI-Layout
- **Struktur**: Sidebar (Vorlagen) + Main Content (Projekt-Setup)
- **Wichtige Elemente**:
  - Template-Type-Buttons (Ordner/Experimente)
  - Template-Liste (`#templateList`)
  - Projekt-Setup Form (`#targetPath`, `#projectName`)
  - Modal für Template-Erstellung (`#templateModal`)
  - Experiment-Form (`#experimentForm`)

#### **css/styles.css**
- **Zweck**: Alle UI-Styles
- **Features**: Responsive Design, Dark Theme, Button-Styles, Modal-Styles

### **⚙️ JavaScript Module**

#### **js/app.js** (Haupt-Controller)
- **Zweck**: App-Initialisierung und Koordination
- **Funktionen**:
  - `init()`: Module initialisieren, DOM-Ready-Handling
  - `setupEventListeners()`: Globale Events (ESC, Ctrl+N, Modal-Clicks)
- **Besonderheiten**: Wartet auf DOM und Module-Verfügbarkeit

#### **js/appUtils.js** (Utilities)
- **Zweck**: Hilfsfunktionen für Frontend
- **Wichtige Funktionen**:
  - `createSafeId()`: HTML-sichere IDs generieren
  - `getDefaultValueForType()`: Default-Werte für Formular-Typen
  - `updatePathPreview()`: Pfad-Vorschau aktualisieren
  - `showError()` / `showSuccess()`: Nachrichten anzeigen
  - `applyPlatformStyles()`: Plattform-spezifische UI-Anpassungen
- **Global**: `window.appUtils`

#### **js/storage.js** (Speicher-Manager)
- **Zweck**: LocalStorage-Verwaltung für Templates
- **Funktionen**:
  - `loadTemplates()`: Templates aus LocalStorage laden
  - `saveTemplates()`: Templates in LocalStorage speichern
  - `getDefaultTemplates()`: Beispiel-Templates beim ersten Start
- **Besonderheiten**: Fallback wenn LocalStorage nicht verfügbar
- **Global**: `window.storage`

#### **js/templateTypeManager.js** (Typ-Verwaltung)
- **Zweck**: Wechsel zwischen Ordner/Experiment-Modus
- **Eigenschaften**:
  - `currentType`: 'folders' oder 'experiments'
- **Funktionen**:
  - `switchType()`: Zwischen Modi wechseln, UI aktualisieren
  - `isExperimentMode()` / `isFolderMode()`: Typ-Checks
- **Global**: `window.templateTypeManager`

#### **js/templateManager.js** (Template-Verwaltung)
- **Zweck**: CRUD-Operationen für Templates
- **Eigenschaften**:
  - `templates[]`: Array aller Templates
  - `currentTemplate`: Aktuell ausgewähltes Template
- **Funktionen**:
  - `init()`: Templates laden, UI rendern
  - `renderList()`: Template-Liste nach aktuellem Typ filtern
  - `select(index)`: Template auswählen, Details anzeigen
  - `add()` / `update()` / `delete()`: CRUD-Operationen
  - `editCurrent()` / `deleteCurrent()`: Aktionen für ausgewähltes Template
- **Besonderheiten**: Filtert Templates nach `templateTypeManager.currentType`
- **Global**: `window.templateManager`

### **🧪 Experiment-Spezifisch**

#### **js/metadataEditor.js** (Metadaten-Editor)
- **Zweck**: Dynamischer Editor für Experiment-Metadaten im Modal
- **Funktionen**:
  - `addField()`: Neues Metadaten-Feld hinzufügen
  - `updateFieldType()`: Field-Type ändern (Text, Number, Dropdown, etc.)
  - `updateJsonPreview()`: Live JSON-Vorschau aktualisieren
  - `loadFromJson()`: JSON/JSON Schema importieren
  - `convertJsonSchemaToMetadata()`: JSON Schema konvertieren
  - `collectMetadata()`: Alle Felder sammeln für Template-Speicherung
- **Besonderheiten**: Unterstützt verschachtelte Gruppen, JSON Schema Import
- **Global**: `window.metadataEditor`

#### **js/experimentForm.js** (Experiment-Formular)
- **Zweck**: Ausfüllbares Formular für Experiment-Metadaten
- **Eigenschaften**:
  - `savedFieldValues{}`: Zwischenspeicher für Feldwerte
- **Funktionen**:
  - `render(metadata)`: Formular aus Template-Metadaten generieren
  - `renderField()` / `renderGroupHeader()`: Einzelne Felder rendern
  - `validate()`: Pflichtfeld-Validierung
  - `collectData()`: Ausgefüllte Daten sammeln
  - `saveFieldValue()` / `getSavedFieldValue()`: Werte zwischenspeichern
- **Besonderheiten**: Unterstützt alle Field-Types, Gruppen, Validierung
- **Global**: `window.experimentForm`

#### **js/templateModal.js** (Modal-Verwaltung)
- **Zweck**: Modal für Template-Erstellung/Bearbeitung
- **Eigenschaften**:
  - `editingIndex`: Index des zu bearbeitenden Templates (-1 = neu)
- **Funktionen**:
  - `show()`: Modal für neues Template öffnen
  - `openForEdit(index, template)`: Modal für Bearbeitung öffnen
  - `toggleTypeContent()`: Zwischen Ordner/Experiment-Tabs wechseln
  - `switchTab()`: Zwischen Struktur/Metadaten-Tabs wechseln
  - `save()`: Template speichern (neu oder aktualisieren)
  - `close()`: Modal schließen
- **Besonderheiten**: Unterstützt beide Template-Typen, Tab-Navigation
- **Global**: `window.templateModal`

#### **js/projectManager.js** (Projekt-Erstellung)
- **Zweck**: Projekt-Erstellung aus Templates
- **Funktionen**:
  - `browsePath()`: Ordner-Dialog öffnen
  - `createProject()`: Hauptfunktion - Projekt erstellen
  - `updatePathPreview()`: Pfad-Vorschau aktualisieren
  - `showError()` / `showSuccess()`: Nachrichten (lokale Kopien)
  - `openCreatedFolder()`: Erstellten Ordner öffnen
- **Besonderheiten**: 
  - Validiert Experiment-Metadaten vor Erstellung
  - Escaping für Windows-Pfade im HTML
  - Lokale Kopien von Utils-Funktionen
- **Global**: `window.projectManager`

## 🔄 Datenfluss

### **Template-Erstellung**
1. User klickt "Neue Vorlage" → `templateModal.show()`
2. User füllt Daten aus, wählt Typ
3. Bei Experiment: `metadataEditor` erstellt Felder
4. User klickt "Speichern" → `templateModal.save()`
5. → `templateManager.add()` → `storage.saveTemplates()`
6. → `templateManager.renderList()` aktualisiert UI

### **Projekt-Erstellung**
1. User wählt Template → `templateManager.select()`
2. Bei Experiment: `experimentForm.render()` zeigt Metadaten-Form
3. User füllt Projekt-Daten aus
4. User klickt "Projekt erstellen" → `projectManager.createProject()`
5. → `experimentForm.validate()` (bei Experiment)
6. → `experimentForm.collectData()` (bei Experiment)
7. → `electronAPI.createProject()` → IPC zu Main Process
8. → `main.js` erstellt Ordner + Dateien
9. → Success-Message mit "Öffnen"-Button

## 🐛 Bekannte Besonderheiten

### **Namenskonflikt-Lösung**
- `utils` in `preload.js` vs. Frontend → Lösung: `appUtils` im Frontend
- Jedes Modul hat lokale Kopien kritischer Utils-Funktionen

### **Pfad-Escaping**
- Windows-Pfade müssen für HTML-onclick-Handler escaped werden
- `result.projectPath.replace(/\\/g, '\\\\')` in `projectManager.js`

### **Module-Reihenfolge**
Wichtige Lade-Reihenfolge in `index.html`:
```html
<script src="js/appUtils.js"></script>      <!-- Utils zuerst -->
<script src="js/storage.js"></script>       <!-- Storage -->
<script src="js/templateManager.js"></script> <!-- Core Manager -->
<script src="js/templateTypeManager.js"></script>
<script src="js/metadataEditor.js"></script>
<script src="js/experimentForm.js"></script>
<script src="js/templateModal.js"></script>
<script src="js/projectManager.js"></script>
<script src="js/app.js"></script>           <!-- App zuletzt -->
```

### **LocalStorage-Fallback**
- Templates werden in LocalStorage gespeichert
- Bei Fehlern: In-Memory-Speicherung mit Warnung

## 🎯 Häufige Änderungs-Szenarien

### **UI-Änderungen**
- **Betroffen**: `index.html`, `css/styles.css`
- **Zusätzlich prüfen**: Modul-Dateien wenn neue IDs/Klassen verwendet werden

### **Neue Template-Typen**
- **Betroffen**: `templateTypeManager.js`, `templateManager.js`, `templateModal.js`
- **Zusätzlich prüfen**: `index.html` (neue Buttons), `storage.js` (Default-Templates)

### **Neue Metadaten-Field-Types**
- **Betroffen**: `metadataEditor.js`, `experimentForm.js`
- **Zusätzlich prüfen**: `appUtils.js` (getDefaultValueForType), `main.js` (getDefaultValueForType)

### **Neue Projekt-Aktionen**
- **Betroffen**: `projectManager.js`, `main.js` (neue IPC-Handler), `preload.js` (neue API)

### **Storage-Änderungen**
- **Betroffen**: `storage.js`, `templateManager.js`
- **Migration**: Eventuell Template-Format-Migration nötig

### **Electron-Updates**
- **Betroffen**: `main.js`, `preload.js`, `package.json`
- **Zusätzlich prüfen**: Alle Module falls sich APIs ändern

## 📝 Debugging-Tipps

### **Frontend-Debugging**
- Browser DevTools: Netzwerk-Tab für Module-Loading
- Konsole: Module-Verfügbarkeit prüfen (`window.templateManager`)
- Breakpoints in Module-Funktionen setzen

### **Electron-Debugging**
- `--dev` Flag: Öffnet DevTools automatisch
- Main Process: Node.js Debugging
- IPC-Kommunikation: Konsole beider Prozesse prüfen

### **Häufige Fehler**
- "X is not defined": Modul-Reihenfolge oder `window.*` Problem
- "Cannot read property": Null-Checks in Template/Element-Zugriffen
- Pfad-Probleme: OS-spezifische Separator-Behandlung

## 🔧 Entwicklung-Workflow

### **Neues Feature hinzufügen**
1. **Analysieren**: Welche Module sind betroffen?
2. **Planen**: Neue Funktionen/Properties definieren
3. **Implementieren**: Module einzeln erweitern
4. **Testen**: Alle Interaktionen zwischen Modulen
5. **Dokumentieren**: Diese Datei aktualisieren

### **Bug-Fix**
1. **Reproduzieren**: In welchem Modul tritt der Fehler auf?
2. **Isolieren**: Betrifft es andere Module?
3. **Fixen**: Minimale Änderungen
4. **Testen**: Vollständige App-Funktionalität prüfen

---
*Letzte Aktualisierung: Mai 2025*
*Version: 1.0 - Stabile modulare Architektur*