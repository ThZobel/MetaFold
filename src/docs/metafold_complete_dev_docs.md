# MetaFold - Complete Developer Documentation

**Version**: v05  
**Type**: Electron Desktop Application  
**Purpose**: Laboratory Data Management & Experiment Organization  
**Target**: Life Sciences, NFDI4BioImage  

---

## 🎯 **Project Overview**

MetaFold ist eine Electron-basierte Desktop-Anwendung für Labore und Lebenswissenschaften zur:
- **Automatisierte Ordnerstruktur-Erstellung** für Experimente
- **Metadaten-Management** mit konfigurierbaren Templates
- **Integration** mit elabFTW (elektronisches Laborbuch) und OMERO (Bildmanagement)
- **Projekt-Discovery** und **Visualisierung** bestehender Experimente
- **Multi-User-Support** mit sicherer Credential-Speicherung

**Sprache**: Englisch  
**Architecture**: Frontend (HTML/CSS/JS) + Electron Backend + Python Proxy

---

## 📁 **Complete File Structure**

```
MetaFold/v05/
├── 📄 MAIN FILES
│   ├── index.html              # Main UI (107KB) - Complete application interface
│   ├── main.js                 # Electron main process (37KB) - Backend logic
│   ├── preload.js              # IPC bridge (15KB) - Security layer
│   ├── package.json            # Dependencies & build config
│   ├── package-lock.json       # Locked dependencies (335KB)
│   ├── omero_proxy.py          # Python OMERO proxy server (19KB)
│   ├── webpack.config.js       # Build configuration
│   └── .babelrc                # JavaScript transpilation
│
├── 🎨 CSS/ (Styling)
│   ├── base.css                # Core layouts & containers (13KB)
│   ├── components.css          # UI components (buttons, forms) (7KB)
│   ├── modals.css              # Modal dialogs (6KB)
│   ├── responsive.css          # Mobile/tablet responsiveness (14KB)
│   ├── integrations.css        # elabFTW/OMERO UI styles (17KB)
│   ├── projectScanner.css      # Project discovery UI (14KB)
│   ├── dragDrop.css            # Drag & drop functionality (11KB)
│   ├── experimentFormDrag.css  # Draggable experiment forms (11KB)
│   ├── enhanced-actions.css    # Enhanced action buttons (7KB)
│   └── layout-override.css     # Layout overrides (1KB)
│
├── 💻 JS/ (Core JavaScript)
│   ├── app.js                  # Main app initialization (9KB)
│   ├── utils.js                # Utility functions (3KB)
│   ├── storage.js              # LocalStorage management (8KB)
│   │
│   ├── 👥 USER MANAGEMENT
│   ├── userManager.js          # User sessions & management (12KB)
│   ├── userManagementModal.js  # User admin interface (36KB)
│   ├── loginModal.js           # Login dialog (21KB)
│   │
│   ├── 📋 TEMPLATES & EXPERIMENTS
│   ├── templateManager.js      # Template CRUD operations (37KB)
│   ├── templateModal.js        # Template creation dialog (15KB)
│   ├── templateTypeManager.js  # Folder vs Experiment distinction (4KB)
│   ├── experimentForm.js       # Dynamic metadata forms (35KB)
│   ├── metadataEditor.js       # Schema editor for templates (35KB)
│   │
│   ├── 🚀 PROJECT MANAGEMENT
│   ├── projectManager.js       # Project creation & orchestration (19KB)
│   ├── projectScanner.js       # Project discovery & analysis (23KB)
│   │
│   ├── ⚙️ SETTINGS & SECURITY
│   ├── settingsManager.js      # App settings & integrations (38KB)
│   ├── secureStorage.js        # Multi-layer encryption (20KB)
│   ├── securityUI.js           # Security management UI (18KB)
│   ├── secureIntegration.js    # Security coordination (15KB)
│   │
│   ├── 📊 VISUALIZATION
│   ├── visualizationManager.js # Data visualization engine (55KB)
│   ├── enhancedActions.js      # Enhanced UI actions (13KB)
│   │
│   └── 🔗 INTEGRATIONS
│       ├── universityConfig.js # University-specific configs (5KB)
│       └── omero/              # OMERO integration modules (see below)
│
├── 🔬 JS/OMERO/ (OMERO Integration)
│   ├── metaFoldOMEROIntegration.js    # 🌟 Main OMERO integration (24KB)
│   ├── omeroAuth.js                   # Authentication & sessions (23KB)
│   ├── omeroAPI.js                    # API requests & testing (18KB)
│   ├── omeroUIIntegration.js          # UI controls & status (31KB)
│   ├── omeroGroups.js                 # Group management (16KB)
│   ├── omeroProjects.js               # Project & dataset handling (27KB)
│   ├── omeroAnnotations.js            # Map annotation creation (16KB)
│   ├── omeroDatasetCreation.js        # Dataset creation (legacy) (23KB)
│   ├── omeroDatasetCreation_fix.js    # Fixed dataset creation (16KB)
│   ├── omeroTestFunctions.js          # Integration testing (24KB)
│   ├── omeroIntegrationTest.js        # Step-by-step tests (13KB)
│   └── omeroStepByStepTest.js         # Detailed testing (10KB)
│
├── ⚛️ SRC/ (React Components)
│   └── components/
│       └── JSONCrackViewer.jsx        # JSONCrack visualization (10KB)
│
└── 🔨 BUILD/ (Compiled Assets)
    ├── jsoncrack-viewer.js            # Compiled JSONCrack bundle (6KB)
    ├── 346.jsoncrack-viewer.js        # Chunk 346 (4KB)
    ├── 481.jsoncrack-viewer.js        # Chunk 481 (15KB)
    ├── 590.jsoncrack-viewer.js        # Chunk 590 (7KB)
    └── *.map files                    # Source maps for debugging
```

---

## 🏗️ **Architecture Overview**

### **Multi-Layer Architecture:**
```
┌─────────────────┐
│   Frontend UI   │ ← HTML/CSS/JS (Vanilla)
├─────────────────┤
│ Electron Bridge │ ← preload.js (IPC Communication)
├─────────────────┤
│ Electron Main   │ ← main.js (File System, OS APIs)
├─────────────────┤
│ External APIs   │ ← elabFTW REST API
├─────────────────┤
│ Python Proxy    │ ← omero_proxy.py (OMERO CORS handling)
└─────────────────┘
```

### **Key Features:**
- ✅ **Template-based Project Creation** (Folders + Experiments)
- ✅ **Dynamic Metadata Forms** with validation
- ✅ **Multi-User Support** with secure credential storage
- ✅ **Project Discovery** (recursive scanning of existing projects)
- ✅ **Data Visualization** via JSONCrack integration
- ✅ **elabFTW Integration** (experiment creation, metadata sync)
- ✅ **OMERO Integration** (dataset creation, map annotations)
- ✅ **Drag & Drop UI** for enhanced user experience
- ✅ **Responsive Design** for different screen sizes

---

## 📋 **Main Application Modules**

### 🎯 **Core Entry Points**

#### `index.html` (107KB)
**Purpose**: Complete application interface  
**Key Components**:
- **Tab Navigation**: Templates, Create Project, Discover Projects, Visualize, Settings
- **Template Management**: Folder vs Experiment templates with preview
- **Project Creation**: Path browser, metadata forms, integration options
- **Project Discovery**: Recursive scanning with statistics and filtering
- **Data Visualization**: JSONCrack integration with multiple data sources
- **Settings**: elabFTW/OMERO configuration, user management, security

**Script Load Order**:
```html
<!-- Utilities & Storage -->
<script src="js/utils.js"></script>
<script src="js/storage.js"></script>

<!-- Security Layer -->
<script src="js/secureStorage.js"></script>
<script src="js/securityUI.js"></script>
<script src="js/secureIntegration.js"></script>

<!-- User Management -->
<script src="js/userManager.js"></script>

<!-- Templates & Experiments -->
<script src="js/templateTypeManager.js"></script>
<script src="js/metadataEditor.js"></script>
<script src="js/experimentForm.js"></script>
<script src="js/templateManager.js"></script>

<!-- Project Management -->
<script src="js/projectManager.js"></script>
<script src="js/projectScanner.js"></script>

<!-- Visualization -->
<script src="js/visualizationManager.js"></script>
<script src="js/enhancedActions.js"></script>

<!-- Settings & Configuration -->
<script src="js/settingsManager.js"></script>

<!-- OMERO Integration -->
<script src="js/omero/omeroAuth.js"></script>
<script src="js/omero/omeroAPI.js"></script>
<!-- ... other OMERO modules ... -->
<script src="js/omero/metaFoldOMEROIntegration.js"></script>

<!-- Main App Initialization -->
<script src="js/app.js"></script>
```

#### `main.js` (37KB) - Electron Main Process
**Purpose**: Backend file system operations and IPC handling  
**Key APIs**:
- `select-folder`: Open folder selection dialog
- `create-project`: Create folder structure with metadata
- `open-folder`: Open folder in system file explorer
- `load-json-file` / `save-json-file`: JSON import/export
- `scan-metafold-projects`: Recursive project discovery
- `encrypt-data` / `decrypt-data`: Secure credential storage
- `store-secure-credential` / `get-secure-credential`: Keychain integration

**File Operations**:
- Directory creation with nested structures
- JSON metadata file writing (`elabftw-metadata.json`)
- Recursive directory scanning with filtering
- File system permission handling

#### `preload.js` (15KB) - Security Bridge
**Purpose**: Secure IPC communication between frontend and backend  
**Exposed APIs**:
```javascript
window.electronAPI = {
    // File operations
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    createProject: (projectData) => ipcRenderer.invoke('create-project', projectData),
    
    // Project discovery
    scanMetaFoldProjects: (basePath, maxDepth) => ipcRenderer.invoke('scan-metafold-projects', basePath, maxDepth),
    
    // Security
    encryptData: (data) => ipcRenderer.invoke('encrypt-data', data),
    storeSecureCredential: (key, value) => ipcRenderer.invoke('store-secure-credential', key, value),
    
    // Utilities
    openFolder: (path) => ipcRenderer.invoke('open-folder', path)
};

window.utils = {
    join: (...paths) => path.join(...paths),
    basename: (path) => path.basename(path),
    formatProjectPath: (fullPath, basePath) => /* formatting logic */
};
```

---

## 👥 **User Management System**

### `userManager.js` (12KB)
**Purpose**: Multi-user session management  
**Key Functions**:
- `login(username)`: Switch user context
- `getCurrentUser()`: Get active user
- `isUserManagementEnabled()`: Check if multi-user mode active
- `getUserTemplates()`: User-specific template access

### `userManagementModal.js` (36KB)
**Purpose**: User administration interface  
**Features**:
- Add/remove users with validation
- Group assignment and management
- User template sharing controls
- Import/export user configurations

### `loginModal.js` (21KB)
**Purpose**: User authentication dialog  
**Features**:
- Autocomplete user suggestions
- Group-based user filtering
- Session restoration
- New user quick creation

---

## 📋 **Template & Experiment System**

### `templateManager.js` (37KB)
**Purpose**: Template CRUD operations and rendering  
**Key Functions**:
- `loadTemplates()`: Load user-specific templates
- `addTemplate(templateData)`: Create new template
- `updateTemplate(id, updates)`: Modify existing template
- `deleteTemplate(id)`: Remove template
- `renderTemplateList()`: Generate template UI
- `exportTemplate(id)`: JSON export functionality

**Template Structure**:
```javascript
{
    id: "unique-id",
    name: "Template Name",
    type: "folder|experiment",
    folderStructure: ["folder1", "folder2/subfolder"],
    metadata: {
        title: { type: "text", required: true },
        description: { type: "textarea", required: false },
        date: { type: "date", required: true }
    },
    integrations: {
        elabftw: { enabled: true, experimentType: "default" },
        omero: { enabled: false }
    }
}
```

### `templateTypeManager.js` (4KB)
**Purpose**: Distinguish between folder and experiment templates  
**Key Functions**:
- `switchType(type)`: Switch between "folders" and "experiments"
- `isExperimentMode()`: Check current mode
- `getActiveType()`: Get current template type

### `templateModal.js` (15KB)
**Purpose**: Template creation and editing dialog  
**Features**:
- Folder structure input with validation
- Metadata schema editor integration
- Template type selection (folder/experiment)
- Import from JSON Schema or elabFTW

### `metadataEditor.js` (35KB)
**Purpose**: Dynamic metadata schema editor  
**Field Types**:
- `text`: Single-line text input
- `textarea`: Multi-line text
- `number`: Numeric input with validation
- `date`: Date picker
- `dropdown`: Select from options
- `checkbox`: Boolean values
- `group`: Grouped fields for organization

**Key Functions**:
- `addField(type)`: Add new metadata field
- `removeField(index)`: Delete field
- `loadFromJson(jsonSchema)`: Import external schema
- `exportSchema()`: Generate JSON schema
- `validateSchema()`: Check schema consistency

### `experimentForm.js` (35KB)
**Purpose**: Dynamic form generation from metadata schemas  
**Key Functions**:
- `render(template)`: Generate form from template metadata
- `collectData()`: Extract form values with validation
- `validate()`: Check required fields and data types
- `saveAsTemplate()`: Create template from current form state
- `loadFromJson(data)`: Pre-populate form from existing data

**Form Features**:
- Real-time validation with error highlighting
- Conditional field display based on user input
- Auto-save functionality (if enabled)
- Drag & drop field reordering
- Template value suggestions

---

## 🚀 **Project Management**

### `projectManager.js` (19KB)
**Purpose**: Orchestrate project creation and integration workflow  
**Key Functions**:
- `createProject(projectData)`: Main project creation workflow
- `browsePath()`: File system navigation
- `validateProjectData(data)`: Pre-creation validation
- `handleSuccess(response)`: Post-creation success handling

**Workflow**:
1. **Validate Input**: Check path, template, and metadata
2. **Create Structure**: Generate folders and files via `main.js`
3. **Integration Processing**: 
   - elabFTW: Create experiment with metadata as extra fields
   - OMERO: Create dataset with map annotations
4. **Success Handling**: Show success message with external links
5. **Error Recovery**: Handle integration failures gracefully

### `projectScanner.js` (23KB)
**Purpose**: Discover and analyze existing MetaFold projects  
**Key Functions**:
- `scanDirectory(basePath, maxDepth)`: Recursive project discovery
- `analyzeProjects(projects)`: Generate statistics and relationships
- `filterProjects(projects, criteria)`: Filter by various criteria
- `exportAggregatedData()`: Export scan results

**Scan Results Structure**:
```javascript
{
    overview: {
        totalProjects: 42,
        scannedPath: "/path/to/root",
        scanDuration: "2.3s",
        lastScan: "2025-06-13T10:30:00Z"
    },
    projects: [
        {
            path: "/full/path/to/project",
            name: "Project Name",
            metadata: { /* parsed from elabftw-metadata.json */ },
            created: "2025-01-15T09:00:00Z",
            template: "experiment-template-v2"
        }
    ],
    statistics: {
        byTemplate: { "template-a": 15, "template-b": 27 },
        byDate: { "2025-01": 10, "2025-02": 32 },
        completion: { complete: 38, incomplete: 4 }
    },
    relationships: {
        hierarchical: [ /* parent-child relationships */ ],
        temporal: [ /* time-based connections */ ],
        metadata: [ /* similar metadata patterns */ ]
    }
}
```

---

## ⚙️ **Settings & Configuration**

### `settingsManager.js` (38KB)
**Purpose**: Application settings and integration management  
**Settings Categories**:

#### **General Settings**:
- `theme`: Light/Dark mode
- `autoSave`: Auto-save templates and forms
- `userManagement`: Enable/disable multi-user support
- `defaultPath`: Default project creation path

#### **elabFTW Integration**:
- `server`: elabFTW server URL
- `apiKey`: API authentication key
- `autoSync`: Automatic synchronization
- `experimentType`: Default experiment type

#### **OMERO Integration**:
- `server`: OMERO.web server URL
- `username` / `password`: Authentication credentials
- `autoSync`: Automatic dataset creation
- `defaultGroup`: Default OMERO group

**Key Functions**:
- `get(key)` / `set(key, value)`: Setting access with defaults
- `testElabFTWConnection()`: Validate elabFTW connectivity
- `testOMEROConnection()`: Validate OMERO connectivity
- `exportSettings()` / `importSettings()`: Backup/restore configuration

### Security Layer (`secureStorage.js`, `securityUI.js`, `secureIntegration.js`)
**Purpose**: Multi-layer encryption for sensitive credentials  

**Encryption Layers**:
1. **Electron safeStorage**: OS-native keychain (macOS/Windows/Linux)
2. **Browser Crypto API**: AES-GCM 256-bit encryption
3. **Base64 + Salt**: Obfuscation fallback

**Features**:
- Automatic encryption level detection
- Migration from plaintext to encrypted storage
- Secure credential management UI
- Integration testing and validation

---

## 📊 **Visualization System**

### `visualizationManager.js` (55KB)
**Purpose**: Data visualization engine with multiple backends  
**Supported Visualizations**:
- **JSONCrack**: Network graphs, tree views, interactive exploration
- **D3.js**: Custom charts and graphs (future)
- **React Flow**: Node-based diagrams (future)

**Data Sources**:
- **Template Data**: Visualize template metadata schemas
- **Project Scanner Results**: Show project networks and relationships
- **Custom JSON**: Load external data files

**Key Functions**:
- `loadDataSource(source, data)`: Load data for visualization
- `switchVisualization(type)`: Change visualization method
- `exportVisualization()`: Save visualization as image/data
- `resetView()`: Return to default view state

### `enhancedActions.js` (13KB)
**Purpose**: Enhanced UI interactions and animations  
**Features**:
- Smooth transitions between tabs
- Loading states and progress indicators
- Drag & drop visual feedback
- Success/error animations

---

## 🔗 **Integration Systems**

### elabFTW Integration
**Purpose**: Electronic lab notebook integration  
**Workflow**:
1. **Authentication**: API key validation
2. **Experiment Creation**: POST to `/api/v2/experiments`
3. **Metadata Sync**: Set extra fields with metadata values
4. **Success Handling**: Provide direct link to created experiment

**Configuration**: Via `settingsManager.js` elabFTW section

### OMERO Integration (Multi-Module System)

#### `metaFoldOMEROIntegration.js` (24KB) - Main Module
**Purpose**: Primary OMERO integration orchestration  
**Key Functions**:
- `createDatasetForMetaFoldProject(projectData)`: Main workflow
- `uploadMetadataAsMapAnnotations(datasetId, metadata)`: Attach metadata
- `linkToExistingProject(projectId)`: Link to OMERO projects

#### `omeroAuth.js` (23KB)
**Purpose**: Authentication and session management  
**Features**:
- Login/logout with credentials
- Session token management
- CSRF token handling
- Connection validation

#### `omeroAPI.js` (18KB)
**Purpose**: Low-level API request handling  
**Features**:
- HTTP request wrapper with error handling
- Response parsing and validation
- Rate limiting and retry logic
- CORS handling via Python proxy

#### `omeroUIIntegration.js` (31KB)
**Purpose**: UI controls and status updates  
**Features**:
- Real-time connection status display
- Integration progress indicators
- Error message handling
- Success confirmation dialogs

#### `omeroGroups.js` (16KB), `omeroProjects.js` (27KB)
**Purpose**: OMERO data structure management  
**Features**:
- Group selection and management
- Project and dataset discovery
- Hierarchy navigation
- Permission checking

#### `omeroAnnotations.js` (16KB)
**Purpose**: Map annotation creation and management  
**Features**:
- Convert MetaFold metadata to OMERO map annotations
- Batch annotation operations
- Annotation search and filtering
- Metadata validation

### Python Proxy Server (`omero_proxy.py`, 19KB)
**Purpose**: Handle CORS issues with OMERO.web API  
**Features**:
- Proxy HTTP requests to OMERO.web
- Session token forwarding
- Error handling and logging
- Support for all OMERO API endpoints

**Usage**:
```bash
python omero_proxy.py --port 8000 --omero-server https://omero.example.com
```

---

## ⚛️ **React Components**

### `JSONCrackViewer.jsx` (10KB)
**Purpose**: JSONCrack integration for data visualization  
**Features**:
- Interactive JSON visualization
- Network graph rendering
- Zoom and pan controls
- Export functionality

**Build Process**: Compiled via webpack to `build/jsoncrack-viewer.js`

---

## 🎨 **Styling Architecture**

### Core CSS Files:
- **`base.css`**: Layout foundations, container systems
- **`components.css`**: Reusable UI components (buttons, forms, cards)
- **`modals.css`**: Modal dialogs and overlays
- **`responsive.css`**: Mobile and tablet adaptations

### Feature-Specific CSS:
- **`integrations.css`**: elabFTW/OMERO UI styling
- **`projectScanner.css`**: Project discovery interface
- **`dragDrop.css`**: Drag & drop interactions
- **`experimentFormDrag.css`**: Draggable form elements
- **`enhanced-actions.css`**: Action button enhancements

### Design System:
- **Color Scheme**: Blue primary (#007bff), success green, warning orange, error red
- **Layout**: Fixed sidebar (380px) + flexible main content
- **Typography**: System fonts with clear hierarchy
- **Spacing**: 8px base unit for consistent spacing
- **Animations**: Subtle transitions for enhanced UX

---

## 🔧 **Development Workflows**

### Adding New Features:
1. **Identify Required Files**: Use this documentation to determine which modules need modification
2. **Check Dependencies**: Ensure all required modules are loaded in correct order
3. **Update Multiple Layers**: 
   - Backend APIs (`main.js`, `preload.js`)
   - Frontend modules (appropriate `js/*.js` files)
   - UI styling (`css/*.css` files)
   - HTML integration (`index.html`)

### Common Development Patterns:
- **New Template Features**: Modify `templateManager.js`, `metadataEditor.js`, `experimentForm.js`
- **Integration Features**: Add to `settingsManager.js`, create new integration modules
- **UI Enhancements**: Update corresponding CSS files and `enhancedActions.js`
- **Security Features**: Work with `secureStorage.js`, `securityUI.js`, `secureIntegration.js`

### Testing Integration Points:
- **Template System**: Create/edit/delete templates, form generation
- **Project Creation**: Full workflow with integrations enabled
- **Project Discovery**: Scan directories with various project structures
- **Data Visualization**: Load different data sources, test all visualization modes
- **User Management**: Multi-user workflows, template sharing
- **Security**: Credential storage, encryption/decryption

---

## 📦 **Build & Deployment**

### Dependencies (`package.json`):
- **Electron**: Desktop app framework
- **Webpack**: Asset bundling for React components  
- **Babel**: JavaScript transpilation
- **React**: For advanced UI components (JSONCrack)

### Build Targets:
- **Windows**: NSIS installer
- **macOS**: DMG package
- **Linux**: AppImage

### File Sizes (for Performance Monitoring):
- **Total Application**: ~1.2MB (excluding node_modules)
- **Largest Files**: `index.html` (107KB), `visualizationManager.js` (55KB), `main.js` (37KB)
- **CSS Total**: ~100KB across all stylesheets
- **JavaScript Total**: ~600KB across all modules

---

## 🎯 **For AI Assistants: Quick File Reference**

### **Need to add new template features?**
**Required files**: `templateManager.js`, `metadataEditor.js`, `experimentForm.js`, `templateModal.js`

### **Need to modify project creation?**
**Required files**: `projectManager.js`, `main.js`, `preload.js`, potentially integration modules

### **Need to enhance visualizations?**
**Required files**: `visualizationManager.js`, `src/components/JSONCrackViewer.jsx`, related CSS

### **Need to add new integrations?**
**Required files**: `settingsManager.js`, `main.js`, `preload.js`, new integration module, `integrations.css`

### **Need to modify UI/UX?**
**Required files**: `index.html`, appropriate CSS files, `enhancedActions.js`

### **Need to add security features?**
**Required files**: `secureStorage.js`, `securityUI.js`, `secureIntegration.js`, `main.js`, `preload.js`

### **Need to modify OMERO integration?**
**Required files**: `js/omero/metaFoldOMEROIntegration.js` (main), other `js/omero/*.js` modules, `settingsManager.js`

### **Need to modify elabFTW integration?**
**Required files**: `settingsManager.js`, `projectManager.js`

### **Need to enhance project discovery?**
**Required files**: `projectScanner.js`, `main.js`, `preload.js`, `projectScanner.css`

---

## ✅ **Status Summary**

**✅ Fully Implemented Features**:
- Template management (folders + experiments)
- Dynamic metadata forms
- Project creation with folder structure
- elabFTW integration (experiment creation)
- OMERO integration (dataset creation + map annotations)
- Project discovery and scanning
- Data visualization via JSONCrack
- Multi-user support
- Secure credential storage
- Responsive UI design

**🔄 Work in Progress**:
- Advanced visualization options (D3, React Flow)
- Machine learning-based template recommendations
- Real-time project monitoring

**📋 Future Enhancements**:
- Collaborative project sharing
- Advanced analytics and reporting
- Mobile companion app
- Cloud synchronization

---

*This documentation provides complete coverage of the MetaFold v05 codebase for AI assistant understanding and development assistance.*