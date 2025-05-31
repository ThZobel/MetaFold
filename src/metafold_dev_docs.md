# MetaFold - Entwickler Dokumentation

## 📋 Überblick

MetaFold ist eine Web-Anwendung zum Erstellen und Verwalten von Projekt-Templates mit Multi-User-Support und Gruppen-Funktionalität.

## 🏗️ Architektur

### Kern-Module

#### 1. **app.js** - Hauptanwendung
```javascript
const app = {
    initialized: false,
    async init(),
    initializeAvailableModules(),
    setupEventListeners(),
    showSuccess(message),
    showError(message),
    showMessage(message, type)
}
```

#### 2. **storage.js** - Datenverwaltung
```javascript
const storage = {
    userPrefix: 'default',
    isAvailable: true,
    
    // Methoden
    setUserPrefix(prefix),
    getStorageKey(key),
    getDefaultTemplates(),      // Nur für ersten User
    loadTemplates(),            // User-spezifische Templates
    saveTemplates(templates),
    addTemplateMetadata(templates),
    loadGroupTemplates(groupName),
    
    // Legacy Support
    addTemplate(template, templates),
    updateTemplate(index, template, templates),
    deleteTemplate(index, templates)
}
```

#### 3. **userManager.js** - Benutzerverwaltung
```javascript
const userManager = {
    currentUser: null,
    currentGroup: null,
    users: [],
    groups: [],
    userGroupMappings: {},      // User -> Group Zuordnung
    
    // Methoden
    async init(),
    async showLoginModal(),
    setCurrentUser(username, groupname),
    addUserToHistory(username, groupname),
    updateStoragePrefix(),
    loadUsersAndGroups(),
    saveUsersAndGroups(),
    getUserGroup(username),
    updateUserGroup(username, groupname),
    generateUserColor(username),
    getUserInitials(username)
}
```

#### 4. **loginModal.js** - Login Interface
```javascript
const loginModal = {
    modal: null,
    usernameInput: null,
    userSuggestions: null,
    onConfirm: null,
    onCancel: null,
    
    // Methoden
    show(),                     // Returns Promise
    createModal(),
    setupEventListeners(),
    loadSuggestions(),
    showUserSuggestions(query),
    renderUserSuggestions(container, suggestions, onClick),
    showUserManagement(),
    handleConfirm(),
    showError(message),
    close()
}
```

#### 5. **templateManager.js** - Template-Verwaltung
```javascript
const templateManager = {
    templates: [],              // Eigene Templates
    currentTemplate: null,
    selectedIndex: -1,
    allTemplates: [],          // Eigene + geteilte Templates
    
    // Methoden
    init(),
    add(template),
    update(index, template),
    getCurrentType(),           // 'folders' oder 'experiments'
    getAllTemplates(),          // Kombiniert eigene + Gruppen-Templates
    getUserColor(username),
    getUserInitials(username),
    renderList(),
    copyTemplate(index),
    select(index),
    editCurrent(),
    deleteCurrent()
}
```

### Zusätzliche Module

#### 6. **templateModal.js** - Template Editor
- Öffnet Modal zum Erstellen/Bearbeiten
- Unterstützt Folder- und Experiment-Templates
- Metadata-Editor für Experimente

#### 7. **userManagementModal.js** - Benutzerverwaltung
- User-Group Zuordnungen verwalten
- Benutzer löschen/bearbeiten
- Gruppen erstellen

#### 8. **templateTypeManager.js** - Template-Typ Wechsel
```javascript
const templateTypeManager = {
    currentType: 'folders',    // oder 'experiments'
    init(),
    switchTo(type),
    updateUI()
}
```

#### 9. **experimentForm.js** - Experiment Metadaten
- Dynamische Formulare für Experiment-Templates
- Unterstützt: text, textarea, date, dropdown
- Validierung und Speicherung

## 💾 Datenstruktur

### Template Objekt
```javascript
{
    name: "Template Name",
    description: "Beschreibung",
    type: "folders" | "experiment",
    structure: "folder1/\n  file1.txt\n...",
    metadata: {                 // Nur bei type: "experiment"
        "field_name": {
            type: "text|textarea|date|dropdown",
            label: "Anzeigename",
            value: "",
            required: true|false,
            options: []         // Nur bei dropdown
        }
    },
    createdBy: "Username",
    createdByGroup: "Gruppenname",
    createdAt: "2025-01-01T12:00:00.000Z",
    
    // UI Properties (temporär)
    isOwn: true|false,
    originalIndex: number
}
```

### Storage Schema
```
localStorage:
  metafold_global_users: ["User1", "User2"]
  metafold_global_groups: ["Group1", "Group2"]
  metafold_global_user_group_mappings: {"User1": "Group1"}
  metafold_{GROUP}_{USER}_templates: [Template...]
```

## 🔄 Initialisierungsablauf

1. **app.init()** startet
2. **userManager.init()** → zeigt Login
3. **storage.setUserPrefix()** nach Login
4. Andere Module werden initialisiert
5. **templateManager.init()** lädt Templates

## 🎨 UI Patterns

### Template Liste
- **Eigene Templates**: Normale Darstellung mit Edit/Delete
- **Geteilte Templates**: Badge "📋 Geteilt" + Kopieren-Button
- **Farbkodierung**: Basierend auf Ersteller-Name
- **Badges**: "Folder" vs "Exp" für Template-Typ

### Modals
- **templateModal**: Template erstellen/bearbeiten
- **loginModal**: Benutzer-Login
- **userManagementModal**: User/Group Verwaltung

### Nachrichten
- **Erfolg**: Grüne Benachrichtigung (5s)
- **Fehler**: Rote Benachrichtigung (15s)
- **Position**: Oben rechts, automatisches Verschwinden

## 🔧 Entwickler-Hinweise

### Module hinzufügen
1. Neues JS-Modul in `/js/` erstellen
2. In `index.html` einbinden
3. In `app.initializeAvailableModules()` registrieren

### Template-Typen erweitern
1. In `templateTypeManager` neuen Typ hinzufügen
2. UI-Filter in `templateManager.getAllTemplates()` erweitern
3. Template-Struktur bei Bedarf anpassen

### Storage erweitern
- Neue Datentypen: `storage.getStorageKey()` nutzen
- Gruppendaten: Naming Convention befolgen
- Migration: In `loadTemplates()` implementieren

### Fehlerbehandlung
- Alle async Operationen mit try/catch
- Fallbacks für fehlende Module (`window.module?.method`)
- Console-Logging für Debugging

## 🐛 Bekannte Limitierungen

1. **localStorage Größe**: Begrenzt auf ~5-10MB
2. **Keine Echtzeit-Sync**: Änderungen anderer User nicht live
3. **Browser-abhängig**: Daten nicht zwischen Browsern geteilt
4. **Keine Versionierung**: Templates werden überschrieben

## 🚀 Erweiterungsmöglichkeiten

- **Cloud Storage**: Integration von Firebase/AWS
- **Live Collaboration**: WebSocket-basierte Updates
- **Template Versionierung**: Git-ähnliche Historie
- **Import/Export**: JSON/ZIP Template-Austausch
- **Erweiterte Permissions**: Lese-/Schreibrechte pro Template