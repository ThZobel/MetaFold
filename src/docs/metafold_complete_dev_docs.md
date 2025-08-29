# MetaFold - Development Documentation v06

**Version**: v06 (Updated)  
**Type**: Electron Desktop Application  
**Purpose**: Laboratory Data Management & Experiment Organization  
**Target**: Life Sciences, NFDI4BioImage  
**Language**: English

---

## 🎯 **Project Overview**

MetaFold is an Electron-based desktop application for laboratories and life sciences to:
- **Create automated folder structures** for experiments
- **Manage metadata** with configurable templates
- **Integrate** with elabFTW (electronic lab notebook) and OMERO (image management)
- **Discover and visualize** existing projects
- **Support multi-user workflows** with secure credential storage

**Key Principles**:
- ✅ **Simple operation** - intuitive user interface
- ✅ **Modular architecture** - easy to extend and maintain
- ✅ **Minimal invasive development** - preserve existing functionality

---

## 📁 **Current File Structure**

```
MetaFold/v06/
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
├── 🎨 CSS/ (Styling - ~100KB total)
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
├── 💻 JS/ (Core JavaScript - ~600KB total)
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
│   ├── templateManager.js      # Template CRUD operations (37KB) ⭐ ENHANCED
│   ├── templateModal.js        # Template creation dialog (15KB)
│   ├── templateTypeManager.js  # Folder vs Experiment distinction (4KB)
│   ├── experimentForm.js       # Dynamic metadata forms (35KB) ⭐ ENHANCED
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
├── 🔬 JS/OMERO/ (OMERO Integration - ⭐ MAJOR ENHANCEMENT)
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

## 🆕 **Major Updates & New Features**

### ⭐ **Template File Storage System**
**Status**: ✅ Fully Implemented  
**Key Changes**:
- Templates are now **stored as individual files** instead of browser localStorage
- **Automatic file saving** when templates are created/updated
- **Better backup and sharing** capabilities
- **Migration tools** from localStorage to file storage

**Affected Files**:
- `templateManager.js` - Enhanced with file storage operations
- `storage.js` - Extended storage abstraction layer
- `main.js` - Added file system operations for templates
- `preload.js` - Extended APIs for file operations

### ⭐ **Clear & Save Template Functionality**
**Status**: ✅ Fully Implemented  
**New Features**:
- **Clear Template Button** - Resets all form values
- **Save Template Button** - Saves current form state to template
- **Clear Template Values** - Permanently clears saved values in template
- **Enhanced form state management**

**Key Functions**:
```javascript
// In experimentForm.js
saveTemplate()          // Save current form state
clearTemplate()         // Clear form values
clearTemplateValues()   // Permanently clear template values

// In templateManager.js
clearCurrentTemplate()  // Clear template values permanently
```

### ⭐ **OMERO Integration Enhancement**
**Status**: ✅ Fully Implemented  
**Major Expansion**:
- **11 OMERO-specific modules** with comprehensive functionality
- **Dataset creation** with metadata as map annotations
- **Group and project management**
- **Authentication and session handling**
- **Python proxy server** for CORS handling
- **Extensive testing framework**

**Key Modules**:
- `metaFoldOMEROIntegration.js` - Main orchestration
- `omeroAuth.js` - Authentication management
- `omeroAPI.js` - Low-level API handling
- `omeroUIIntegration.js` - UI integration
- `omeroAnnotations.js` - Metadata annotation system

---

## 🏗️ **Architecture & Development Guidelines**

### **Multi-Layer Architecture**
```
┌─────────────────┐
│   Frontend UI   │ ← HTML/CSS/JS (Vanilla JavaScript)
├─────────────────┤
│ Electron Bridge │ ← preload.js (Secure IPC Communication)
├─────────────────┤
│ Electron Main   │ ← main.js (File System, OS APIs)
├─────────────────┤
│ External APIs   │ ← elabFTW REST API
├─────────────────┤
│ Python Proxy    │ ← omero_proxy.py (OMERO CORS handling)
└─────────────────┘
```

### **Development Principles**
1. **Minimal Invasive Approach**: Never rewrite entire files - create targeted functions
2. **Modular Design**: Each feature has dedicated modules
3. **Preserve Existing Functions**: Never change existing function names
4. **File-by-File Development**: Create individual artifacts for each modification

### **Module Loading Order**
```html
<!-- Core Utilities -->
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

<!-- Settings -->
<script src="js/settingsManager.js"></script>

<!-- OMERO Integration (specific order important) -->
<script src="js/omero/omeroAuth.js"></script>
<script src="js/omero/omeroAPI.js"></script>
<script src="js/omero/omeroGroups.js"></script>
<script src="js/omero/omeroProjects.js"></script>
<script src="js/omero/omeroAnnotations.js"></script>
<script src="js/omero/omeroUIIntegration.js"></script>
<script src="js/omero/metaFoldOMEROIntegration.js"></script>

<!-- Main App -->
<script src="js/app.js"></script>
```

---

## 📋 **Core Functionality Reference**

### 🎯 **Template System**
**Files**: `templateManager.js`, `experimentForm.js`, `metadataEditor.js`

**Key Features**:
- ✅ **Folder Templates**: Create directory structures
- ✅ **Experiment Templates**: Folders + metadata forms
- ✅ **File Storage**: Templates saved as individual files
- ✅ **Clear/Save Functions**: Reset and save form states
- ✅ **User-specific Templates**: Multi-user support

**Common Operations**:
```javascript
// Template Management
templateManager.add(template)           // Add new template
templateManager.update(index, template) // Update existing
templateManager.clearCurrentTemplate()  // Clear template values

// Form Operations
experimentForm.saveTemplate()           // Save current form
experimentForm.clearTemplate()          // Clear form values
experimentForm.render(template)         // Generate form from template
```

### 🚀 **Project Creation**
**Files**: `projectManager.js`, `main.js`, `preload.js`

**Workflow**:
1. **Path Selection**: User selects target directory
2. **Template Application**: Apply folder structure and metadata
3. **Integration Processing**: Create entries in elabFTW/OMERO
4. **Success Handling**: Show links to created entries

### 🔬 **OMERO Integration**
**Files**: `js/omero/*.js`

**Main Functions**:
```javascript
// Dataset Creation
metaFoldOMEROIntegration.createDatasetForMetaFoldProject(projectData)

// Authentication
omeroAuth.login(credentials)
omeroAuth.logout()

// Metadata Management
omeroAnnotations.uploadMetadataAsMapAnnotations(datasetId, metadata)
```

### ⚙️ **Settings Management**
**Files**: `settingsManager.js`

**Configuration Areas**:
- **elabFTW Settings**: API URL, token, experiment types
- **OMERO Settings**: Server URL, credentials, project linking
- **User Management**: Multi-user configurations
- **Security Settings**: Encryption preferences

---

## 🛠️ **Development Workflow**

### **Step-by-Step Feature Development**
1. **Identify Required Files**: Check this documentation for affected modules
2. **Check for Existing Functions**: Never modify existing function names
3. **Create Individual Artifacts**: One function/feature per artifact
4. **Test Integration Points**: Ensure compatibility with existing code

### **Common Development Patterns**

#### **Adding Template Features**
**Required Files**: `templateManager.js`, `metadataEditor.js`, `experimentForm.js`
1. Add function to `templateManager.js`
2. Update form rendering in `experimentForm.js`
3. Extend metadata editor if needed

#### **Adding Integration Features**
**Required Files**: `settingsManager.js`, integration modules
1. Add settings configuration
2. Create or extend integration module
3. Update UI in `index.html`
4. Add CSS styling if needed

#### **Adding OMERO Features**
**Required Files**: Specific `js/omero/*.js` modules
1. Check which OMERO module handles the feature
2. Extend appropriate module
3. Update main integration if needed

### **Testing Points**
- **Template System**: Create/edit/delete templates, form generation
- **Project Creation**: Full workflow with integrations enabled
- **OMERO Integration**: Dataset creation, metadata annotation
- **File Storage**: Template saving and loading
- **User Management**: Multi-user workflows

---

## 📦 **Build & Deployment**

### **Dependencies** (`package.json`)
- **Electron**: Desktop app framework
- **Webpack**: Asset bundling for React components
- **Babel**: JavaScript transpilation
- **React**: For JSONCrack visualization

### **Build Targets**
- **Windows**: NSIS installer
- **macOS**: DMG package
- **Linux**: AppImage

### **Performance Monitoring**
- **Total Application**: ~1.2MB (excluding node_modules)
- **Largest Files**: `index.html` (107KB), `visualizationManager.js` (55KB)
- **OMERO Integration**: ~200KB total across all modules

---

## 🎯 **Quick Reference for Development**

### **Need to modify templates?**
**Files**: `templateManager.js`, `experimentForm.js`, `metadataEditor.js`

### **Need to modify OMERO integration?**
**Files**: `js/omero/metaFoldOMEROIntegration.js` (main), specific modules

### **Need to modify project creation?**
**Files**: `projectManager.js`, `main.js`, `preload.js`

### **Need to modify UI/UX?**
**Files**: `index.html`, corresponding CSS files, `enhancedActions.js`

### **Need to modify settings?**
**Files**: `settingsManager.js`, `secureStorage.js`

---

## ✅ **Current Status Summary**

**✅ Fully Implemented**:
- Template management with file storage
- Clear/Save template functionality
- Dynamic metadata forms
- Project creation with folder structures
- elabFTW integration (experiment creation)
- OMERO integration (dataset creation + map annotations)
- Project discovery and scanning
- Data visualization via JSONCrack
- Multi-user support
- Secure credential storage
- Responsive UI design

**🔄 Ready for Extension**:
- Additional visualization options
- More integration targets
- Advanced template features
- Enhanced security options

---

*This documentation provides complete coverage of MetaFold v06 for development and feature extension.*