# MetaFold - Program Documentation

## 📋 Overview

An Electron app for creating and managing project templates with two modes:
- **Folder Templates**: Simple folder structures
- **Experiment Templates**: Folder structures + metadata forms

## 🏗️ Architecture

### **Electron Structure**
```
project-root/
├── main.js              # Electron Main Process
├── preload.js           # Electron Preload Script  
├── index.html           # Main UI
├── package.json         # Dependencies
├── css/
│   └── styles.css       # All UI styles
├── js/                  # JavaScript Modules
└── assets/
    └── icon.png
```

### **Modular JavaScript Architecture**
- Each module is independent and has specific responsibilities
- Modules communicate through global `window.*` objects
- No direct dependencies between frontend modules

## 📁 File Overview

### **🖥️ Electron Backend**

#### **main.js** (Electron Main Process)
- **Purpose**: Main process, window management, IPC handlers
- **Important Functions**:
  - `createWindow()`: Creates main window
  - `ipcMain.handle('create-project')`: Project creation
  - `ipcMain.handle('select-folder')`: Folder dialog
  - `ipcMain.handle('open-folder')`: Open folder in explorer
  - `createFolderStructure()`: Create folder structure from string
  - `createMetadataFiles()`: JSON + README for experiments
- **Special Features**: Path normalization with `path.resolve()`, error handling

#### **preload.js** (Electron Preload Script)
- **Purpose**: Secure bridge between Main and Renderer Process
- **API**: `window.electronAPI.*` and `window.utils.*`
- **Important Objects**:
  - `electronAPI`: IPC functions (createProject, selectFolder, etc.)
  - `utils`: Platform utilities (paths, validation, etc.)

### **🎨 Frontend Core**

#### **index.html** 
- **Purpose**: Main UI layout
- **Structure**: Sidebar (templates) + Main Content (project setup)
- **Important Elements**:
  - Template type buttons (Folders/Experiments)
  - Template list (`#templateList`)
  - Project setup form (`#targetPath`, `#projectName`)
  - Modal for template creation (`#templateModal`)
  - Experiment form (`#experimentForm`)

#### **css/styles.css**
- **Purpose**: All UI styles
- **Features**: Responsive design, dark theme, button styles, modal styles

### **⚙️ JavaScript Modules**

#### **js/app.js** (Main Controller)
- **Purpose**: App initialization and coordination
- **Functions**:
  - `init()`: Initialize modules, DOM-ready handling
  - `setupEventListeners()`: Global events (ESC, Ctrl+N, modal clicks)
- **Special Features**: Waits for DOM and module availability

#### **js/utils.js** (Utilities)
- **Purpose**: Helper functions for frontend
- **Important Functions**:
  - `createSafeId()`: Generate HTML-safe IDs
  - `getDefaultValueForType()`: Default values for form types
  - `updatePathPreview()`: Update path preview
  - `showError()` / `showSuccess()`: Show messages
  - `applyPlatformStyles()`: Platform-specific UI adjustments
- **Global**: `window.appUtils`

#### **js/storage.js** (Storage Manager)
- **Purpose**: LocalStorage management for templates
- **Functions**:
  - `loadTemplates()`: Load templates from LocalStorage
  - `saveTemplates()`: Save templates to LocalStorage
  - `getDefaultTemplates()`: Example templates on first start
- **Special Features**: Fallback when LocalStorage not available
- **Global**: `window.storage`

#### **js/templateTypeManager.js** (Type Management)
- **Purpose**: Switch between Folder/Experiment modes
- **Properties**:
  - `currentType`: 'folders' or 'experiments'
- **Functions**:
  - `switchType()`: Switch between modes, update UI
  - `isExperimentMode()` / `isFolderMode()`: Type checks
- **Global**: `window.templateTypeManager`

#### **js/templateManager.js** (Template Management)
- **Purpose**: CRUD operations for templates
- **Properties**:
  - `templates[]`: Array of all templates
  - `currentTemplate`: Currently selected template
- **Functions**:
  - `init()`: Load templates, render UI
  - `renderList()`: Filter template list by current type
  - `select(index)`: Select template, show details
  - `add()` / `update()` / `delete()`: CRUD operations
  - `editCurrent()` / `deleteCurrent()`: Actions for selected template
- **Special Features**: Filters templates by `templateTypeManager.currentType`
- **Global**: `window.templateManager`

### **🧪 Experiment-Specific**

#### **js/metadataEditor.js** (Metadata Editor)
- **Purpose**: Dynamic editor for experiment metadata in modal
- **Functions**:
  - `addField()`: Add new metadata field
  - `updateFieldType()`: Change field type (Text, Number, Dropdown, etc.)
  - `updateJsonPreview()`: Update live JSON preview
  - `loadFromJson()`: Import JSON/JSON Schema
  - `convertElabFTWToMetadata()`: Convert JSON Schema
  - `collectMetadata()`: Collect all fields for template saving
- **Special Features**: Supports nested groups, JSON Schema import
- **Global**: `window.metadataEditor`

#### **js/experimentForm.js** (Experiment Form)
- **Purpose**: Fillable form for experiment metadata
- **Properties**:
  - `savedFieldValues{}`: Cache for field values
- **Functions**:
  - `render(metadata)`: Generate form from template metadata
  - `renderField()` / `renderGroupHeader()`: Render individual fields
  - `validate()`: Required field validation
  - `collectData()`: Collect filled data
  - `saveFieldValue()` / `getSavedFieldValue()`: Cache values temporarily
- **Special Features**: Supports all field types, groups, validation
- **Global**: `window.experimentForm`

#### **js/templateModal.js** (Modal Management)
- **Purpose**: Modal for template creation/editing
- **Properties**:
  - `editingIndex`: Index of template being edited (-1 = new)
- **Functions**:
  - `show()`: Open modal for new template
  - `openForEdit(index, template)`: Open modal for editing
  - `toggleTypeContent()`: Switch between Folder/Experiment tabs
  - `switchTab()`: Switch between Structure/Metadata tabs
  - `save()`: Save template (new or update)
  - `close()`: Close modal
- **Special Features**: Supports both template types, tab navigation
- **Global**: `window.templateModal`

#### **js/projectManager.js** (Project Creation)
- **Purpose**: Project creation from templates
- **Functions**:
  - `browsePath()`: Open folder dialog
  - `createProject()`: Main function - create project
  - `updatePathPreview()`: Update path preview
  - `showError()` / `showSuccess()`: Messages (local copies)
  - `openCreatedFolder()`: Open created folder
- **Special Features**: 
  - Validates experiment metadata before creation
  - Escaping for Windows paths in HTML
  - Local copies of utils functions
- **Global**: `window.projectManager`

## 🔄 Data Flow

### **Template Creation**
1. User clicks "New Template" → `templateModal.show()`
2. User fills data, chooses type
3. For experiments: `metadataEditor` creates fields
4. User clicks "Save" → `templateModal.save()`
5. → `templateManager.add()` → `storage.saveTemplates()`
6. → `templateManager.renderList()` updates UI

### **Project Creation**
1. User selects template → `templateManager.select()`
2. For experiments: `experimentForm.render()` shows metadata form
3. User fills project data
4. User clicks "Create Project" → `projectManager.createProject()`
5. → `experimentForm.validate()` (for experiments)
6. → `experimentForm.collectData()` (for experiments)
7. → `electronAPI.createProject()` → IPC to Main Process
8. → `main.js` creates folders + files
9. → Success message with "Open" button

## 🐛 Known Peculiarities

### **Name Conflict Resolution**
- `utils` in `preload.js` vs. Frontend → Solution: `appUtils` in frontend
- Each module has local copies of critical utils functions

### **Path Escaping**
- Windows paths must be escaped for HTML onclick handlers
- `result.projectPath.replace(/\\/g, '\\\\')` in `projectManager.js`

### **Module Order**
Important loading order in `index.html`:
```html
<script src="js/utils.js"></script>      <!-- Utils first -->
<script src="js/storage.js"></script>       <!-- Storage -->
<script src="js/templateManager.js"></script> <!-- Core Manager -->
<script src="js/templateTypeManager.js"></script>
<script src="js/metadataEditor.js"></script>
<script src="js/experimentForm.js"></script>
<script src="js/templateModal.js"></script>
<script src="js/projectManager.js"></script>
<script src="js/app.js"></script>           <!-- App last -->
```

### **LocalStorage Fallback**
- Templates are stored in LocalStorage
- On errors: In-memory storage with warning

## 🎯 Common Change Scenarios

### **UI Changes**
- **Affected**: `index.html`, `css/styles.css`
- **Also check**: Module files if new IDs/classes are used

### **New Template Types**
- **Affected**: `templateTypeManager.js`, `templateManager.js`, `templateModal.js`
- **Also check**: `index.html` (new buttons), `storage.js` (default templates)

### **New Metadata Field Types**
- **Affected**: `metadataEditor.js`, `experimentForm.js`
- **Also check**: `utils.js` (getDefaultValueForType), `main.js` (getDefaultValueForType)

### **New Project Actions**
- **Affected**: `projectManager.js`, `main.js` (new IPC handlers), `preload.js` (new API)

### **Storage Changes**
- **Affected**: `storage.js`, `templateManager.js`
- **Migration**: May need template format migration

### **Electron Updates**
- **Affected**: `main.js`, `preload.js`, `package.json`
- **Also check**: All modules if APIs change

## 📝 Debugging Tips

### **Frontend Debugging**
- Browser DevTools: Network tab for module loading
- Console: Check module availability (`window.templateManager`)
- Set breakpoints in module functions

### **Electron Debugging**
- `--dev` flag: Opens DevTools automatically
- Main Process: Node.js debugging
- IPC Communication: Check console of both processes

### **Common Errors**
- "X is not defined": Module order or `window.*` problem
- "Cannot read property": Null checks in template/element access
- Path problems: OS-specific separator handling

## 🔧 Development Workflow

### **Adding New Feature**
1. **Analyze**: Which modules are affected?
2. **Plan**: Define new functions/properties
3. **Implement**: Extend modules individually
4. **Test**: All interactions between modules
5. **Document**: Update this file

### **Bug Fix**
1. **Reproduce**: Which module has the error?
2. **Isolate**: Does it affect other modules?
3. **Fix**: Minimal changes
4. **Test**: Complete app functionality

---
*Last Updated: May 2025*
*Version: 1.0 - Stable modular architecture*