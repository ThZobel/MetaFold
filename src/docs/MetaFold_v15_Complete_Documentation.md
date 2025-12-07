# MetaFold v15 - Complete Development Documentation

**Version**: v15_UI_kategorien (Current)  
**Type**: Electron Desktop Application  
**Purpose**: Laboratory Data Management & Experiment Organization  
**Target**: Life Sciences, NFDI4BioImage  
**Language**: English (UI), German (Development Notes)  
**Last Updated**: January 2025

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Core Systems](#core-systems)
5. [Template System](#template-system)
6. [User Management](#user-management)
7. [Settings System](#settings-system)
8. [Integration Systems](#integration-systems)
9. [Development Guidelines](#development-guidelines)
10. [Known Issues & Solutions](#known-issues--solutions)

---

## Project Overview

MetaFold is an Electron-based desktop application for laboratory data management:

- **Automated Folder Structures**: Create standardized experiment directories
- **Metadata Management**: Configurable templates with dynamic forms
- **Integration Support**: elabFTW (electronic lab notebook) and OMERO (image management)
- **Multi-User Workflows**: User-specific and group-level settings
- **Project Discovery**: Scan and visualize existing projects
- **Secure Storage**: Multi-layer encryption for credentials

### Key Features v15

- **4 Template Categories**: Configurable categories with custom names, icons, and colors
- **User-Specific Settings**: Each user maintains independent category configurations
- **Group Standards**: Define category configurations at group level for new users
- **File-Based Storage**: Templates stored as individual files, not in localStorage
- **Password System**: Optional PBKDF2-encrypted user authentication

---

## Architecture

### Multi-Layer Architecture

```
Frontend UI (HTML/CSS/JavaScript)
    ↓
Electron Bridge (preload.js) - Secure IPC
    ↓
Electron Main Process (main.js) - File System, OS APIs
    ↓
External APIs (elabFTW REST API, OMERO Server)
```

### Core Principles

1. **Minimal Invasive Development**: Never rewrite entire files without necessity
2. **Modular Design**: Each feature has dedicated modules
3. **Function Name Preservation**: Never change existing function names
4. **Step-by-Step Implementation**: Large tasks broken into small steps
5. **Console Debugging First**: Test in browser console before final changes

---

## File Structure

### Main Files

```
MetaFold/v15_UI_kategorien/src/
├── index.html                  # Main UI (107KB)
├── main.js                     # Electron Main Process (37KB)
├── preload.js                  # IPC Bridge (15KB)
├── package.json                # Dependencies & Build Config
└── omero_proxy.py              # Python OMERO Proxy (Fallback)
```

### CSS Structure (~100KB total)

```
css/
├── base.css                    # Core layouts & containers
├── components.css              # UI components (buttons, forms)
├── modals.css                  # Modal dialogs
└── integrations.css            # elabFTW/OMERO UI styles
```

### JavaScript Structure (~1200KB total)

```
js/
├── app.js                      # Main app initialization
├── utils.js                    # Utility functions
├── storage.js                  # File-based storage system
│
├── User Management
│   ├── userManager.js          # User sessions & switching
│   ├── userManagementModal.js  # User admin interface
│   ├── loginModal.js           # Login dialog
│   ├── secureStorage.js        # Multi-layer encryption
│   └── securityUI.js           # Security management UI
│
├── Templates & Experiments
│   ├── templateManager.js      # Template CRUD operations
│   ├── templateModal.js        # Template creation dialog
│   ├── templateTypeManager.js  # Category management
│   ├── experimentForm.js       # Dynamic metadata forms
│   └── metadataEditor.js       # Schema editor
│
├── Project Management
│   ├── projectManager.js       # Project creation orchestration
│   └── projectScanner.js       # Project discovery & HTML export
│
├── Settings & Security
│   ├── settingsManager.js      # App settings & integrations
│   ├── proxyManager.js         # Node.js OMERO proxy
│   └── universityConfig.js     # University-specific configs
│
└── Integrations
    └── omero/                  # OMERO Integration (11 modules)
```

### OMERO Integration Modules

```
js/omero/
├── metaFoldOMEROIntegration.js    # Main OMERO integration
├── omeroAuth.js                   # Authentication & sessions
├── omeroAPI.js                    # API requests & testing
├── omeroUIIntegration.js          # UI controls & status
├── omeroGroups.js                 # Group management
├── omeroProjects.js               # Project & dataset handling
├── omeroAnnotations.js            # Map annotation creation
├── omeroDatasetCreation.js        # Dataset creation (legacy)
├── omeroDatasetCreation_fix.js    # Fixed dataset creation
└── omeroTestFunctions.js          # Integration testing
```

js/omero/
├── metaFoldOMEROIntegration.js    # Main OMERO integration
├── omeroAuth.js                   # Authentication & sessions
├── omeroAPI.js                    # API requests & testing
├── omeroUIIntegration.js          # UI controls & status
├── omeroGroups.js                 # Group management
├── omeroProjects.js               # Project & dataset handling
├── omeroAnnotations.js            # Map annotation creation
├── omeroDatasetCreation.js        # Dataset creation (legacy)
├── omeroDatasetCreation_fix.js    # Fixed dataset creation
└── omeroTestFunctions.js          # Integration testing
```

### Metadata Loader System

**File**: `js/metadataLoader.js`

**Purpose**: Load existing metadata JSON files and send them to integrations (elabFTW/OMERO) without creating new local folders.

**Key Features**:
- **Direct File Update**: Updates the loaded JSON file directly with integration links (no "Save As" dialog).
- **Unified UI**: "Send to Integrations" button located in the main footer for consistency.
- **Integration Handling**:
  - **elabFTW**: Automatic retry on 403 Forbidden errors (tries without category).
  - **OMERO**: Uses Right Sidebar for Group/Project selection.


## Core Systems

### Storage System

**File**: `js/storage.js`

**Storage Locations**:
- Templates: `C:\Users\[User]\MetaFold\Templates\[Group]\[User]\`
- Settings: localStorage with user-specific keys
- Secure credentials: Encrypted in localStorage

**Key Functions**:
- `loadTemplatesFromFilesOnly()` - File-only template loading
- `generateStableTemplateFilename()` - Creates stable filenames
- `deduplicateTemplates()` - Removes duplicates
- `getStorageKey(type)` - Returns user-specific storage key

**Storage Keys**:
- Global: `metafold_settings`
- User-specific: `metafold_[Group]_[User]_settings`
- Group categories: `metafold_group_[Group]_category_settings`

### User Management System

**File**: `js/userManager.js`

**Features**:
- Multi-user support with password protection
- User switching with automatic OMERO logout
- User-specific template and settings storage
- Group-based organization

**Key Functions**:
- `init()` - Initialize with user selection dialog
- `setCurrentUser(username, groupname)` - Switch current user
- `switchUser(username, groupname)` - Complete user switch with settings
- `autoLogoutOMERO()` - Automatic OMERO logout before switch

**User Switch Sequence**:
1. Auto OMERO logout (if active session)
2. Switch settings to new user (saves old, loads new)
3. Update storage prefix
4. Reinitialize file storage
5. Reload templates for new user
6. Update UI display

### Settings System

**File**: `js/settingsManager.js`

**Architecture**:
- User-specific settings with group-level defaults
- Multi-layer encryption for sensitive data
- Category configuration per user/group

**Key Functions**:
- `get(key)` - Get setting value (async)
- `set(key, value)` - Set setting value (async)
- `switchToUser(username, groupname)` - Switch settings context
- `saveAsGroupStandard(groupname)` - Save current settings as group default
- `applyGroupCategorySettings(groupname)` - Apply group defaults

**Settings Structure**:
```javascript
{
  'general.user_management_enabled': true,
  'general.theme': 'dark',
  
  'templates.category1_name': 'Main-Project',
  'templates.category1_icon': '🎯',
  'templates.category1_color': '#8b5cf6',
  // ... category2, category3, category4
  
  'templates.active_category': 'category1',
  
  'elabftw.enabled': false,
  'elabftw.server_url': '',
  'elabftw.overwrite_enabled': false,
  
  'omero.enabled': false,
  'omero.server_url': '',
  'omero.use_json_triplets': false
}
```

---

## Template System

### Template Structure

**File**: `js/templateManager.js`

Templates are stored as individual JSON files with stable filenames:
- Format: `[name]_[user]_[type].json`
- Example: `image_analysis_thomas_experiment.json`

**Template Object**:
```javascript
{
  name: "Image Analysis",
  description: "Template for image analysis projects",
  type: "experiment",
  category: "category1",  // NEW in v15
  structure: "Images/\n  Raw/\n  Processed/\nAnalysis/",
  metadata: {
    "Experiment Date": {
      type: "date",
      label: "Experiment Date",
      value: "",
      required: true
    },
    // ... more fields
  },
  createdBy: "thomas",
  createdByGroup: "MIN",
  createdAt: "2025-01-15T10:30:00.000Z",
  updatedAt: "2025-01-15T10:30:00.000Z"
}
```

### Template Categories (v15)

**File**: `js/templateTypeManager.js`

**Features**:
- 4 configurable categories (was 2 fixed categories in earlier versions)
- User-specific category names, icons, and colors
- Group-level defaults for consistent team configuration

**Default Categories**:
1. **category1**: Main-Project (🎯, purple)
2. **category2**: Sub-Project (📊, cyan)
3. **category3**: Action (⚡, green)
4. **category4**: Misc (📋, orange)

**Key Functions**:
- `switchType(category)` - Switch active category
- `updateUI()` - Update category buttons with current config
- `getCurrentType()` - Get active category
- `getAllCategories()` - Get all 4 categories

**UI Layout**: 2x2 grid of category buttons in sidebar

### Template Management

**Key Functions**:
- `add(template)` - Add new template with current category
- `update(index, template)` - Update existing template
- `getAllTemplates()` - Get templates filtered by active category
- `renderList()` - Render template list with category badges
- `getCategoryBadge(template)` - Get category badge HTML

**Template Filtering**:
Templates are filtered by the `category` field to match the active category. Each user sees only templates in the currently selected category.

---

## User Management

### Password System

**File**: `js/secureStorage.js`

**Security Features**:
- PBKDF2-SHA256 encryption (100,000 iterations)
- Multi-layer storage: Electron SafeStorage → Browser Crypto → Fallback
- Per-user encrypted passwords
- Admin account with default password

**Key Functions**:
- `storeUserPassword(username, password)` - Store encrypted password
- `verifyUserPassword(username, password)` - Verify password
- `hasUserPassword(username)` - Check if user has password
- `removeUserPassword(username)` - Remove user password

**Admin Account**:
- Username: `Admin`
- Default password: `admin`
- Can set/reset passwords for all users

### User-Specific Settings

**Critical Implementation Details**:

**Problem**: Settings were being saved to wrong user files during user switch.

**Solution**: Two-part fix implemented in v15:

1. **settingsManager.js** (Line ~215):
   - Clear `this.settings = {}` before loading new user settings
   - Prevents old user values from persisting in memory

2. **userManager.js** (Line ~154):
   - Call `settingsManager.switchToUser()` BEFORE changing storage prefix
   - Ensures old user settings are saved to correct file

**Correct User Switch Sequence**:
```javascript
// 1. Switch settings FIRST (saves old user to old file)
await settingsManager.switchToUser(newUser, newGroup);

// 2. THEN change storage prefix
storage.setUserPrefix('MIN_NewUser');

// 3. Load templates and update UI
```

**Storage Keys**:
- Settings: `metafold_[Group]_[User]_settings`
- Templates: File-based in `[HomeDir]\MetaFold\Templates\[Group]\[User]\`
- Secure credentials: `metafold_[Group]_[User]_secure_credentials`

---

## Settings System

### Category Settings

**Per-User Settings**:
Each user has independent category configuration:
- `templates.category1_name` through `templates.category4_name`
- `templates.category1_icon` through `templates.category4_icon`
- `templates.category1_color` through `templates.category4_color`
- `templates.active_category` (currently selected category)

**Group Standard Settings**:
Groups can define default category configuration:
- Stored in: `metafold_group_[GroupName]_category_settings`
- New users automatically inherit group defaults
- Users can customize after inheritance

**Key Functions**:
- `saveAsGroupStandard(groupname)` - Save current config as group default
- `applyGroupCategorySettings(groupname)` - Apply group defaults to current user
- `hasCustomCategorySettings(groupname)` - Check if user has custom settings

### Settings UI Integration

**Location**: Settings Modal → General Tab → Template Categories Section

**Features**:
- Edit all 4 category names, icons, and colors
- Live preview of category buttons
- Save as group standard (admin function)
- Apply group standard (revert to defaults)
- Status indicator (custom vs. group standard)

**Implementation**:
Settings UI is integrated into `index.html` with event handlers in `settingsManager.js`. The UI updates dynamically based on current user and group context.

---

## Integration Systems

### elabFTW Integration

**Files**: `js/settingsManager.js` (main functions)

**Features**:
- Experiment creation with metadata
- Conflict resolution (overwrite vs. versioning)
- Map annotations support
- Category assignment

**Key Functions**:
- `createElabFTWExperiment(name, metadata, structure)` - Create experiment
- `updateExistingElabFTWExperiment(id, metadata)` - Update with conflict resolution
- `testElabFTWConnection()` - Test connection

**Conflict Resolution**:
- **Safe Mode** (default): Create versioned fields (name_date, name_v2, etc.)
- **Overwrite Mode**: Replace existing fields

### OMERO Integration

**Files**: `js/omero/*.js` (11 modules)

**Architecture**:
```
Frontend → Electron Bridge → Node.js Proxy (Port 3000) → OMERO Server
```

**Features**:
- Multi-server support (public and internal servers)
- Session persistence with validation
- Dataset creation with map annotations
- Group and project management

**Key Functions**:
- `window.omeroUIIntegration.testConnection()` - Test OMERO connection
- `window.omeroUIIntegration.logout()` - Logout from OMERO
- `window.metaFoldOMEROIntegration.createDatasetForMetaFoldProject()` - Create dataset

**Proxy Management**:
- Built-in Node.js proxy in Electron app
- Fallback to external Python proxy if available
- Automatic SSL certificate handling

---

## Development Guidelines

### Adding New Features

**Step-by-Step Process**:

1. **Identify Affected Files**: Check this documentation and existing code
2. **Read Existing Functions**: Always read the target files before adding functions
3. **Search Project Knowledge**: Look for current versions of files
4. **Create Single Artifacts**: One function/feature per artifact
5. **Document Integration Points**: Explain exactly where to insert code

**Example: Adding a New Template Field Type**

Affected files:
- `js/metadataEditor.js` - Add field type to editor
- `js/experimentForm.js` - Add rendering for field type
- `js/templateManager.js` - Update validation if needed

### Debugging Workflow

**Console-First Approach**:

1. Test new functions in browser console before file changes
2. Use debug functions:
   - `window.storage.healthCheck()` - Storage system check
   - `window.templateManager.debugStatus()` - Template manager status
   - `window.userManager.debugPasswordSystem()` - Password system status
3. Check console logs for detailed operation traces
4. Verify localStorage keys match expected patterns

**Common Debug Commands**:
```javascript
// Check current user context
console.log(window.userManager.getCurrentUserInfo());

// Check storage keys
Object.keys(localStorage).filter(k => k.includes('settings'));

// Check category configuration
window.settingsManager.getAllCategories();

// Force reload settings
window.settingsManager.loadSettingsUserSpecific();
```

### Code Style Guidelines

**Naming Conventions**:
- Functions: `camelCase` (e.g., `loadTemplatesFromFiles`)
- Variables: `camelCase` (e.g., `currentUser`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_SETTINGS`)
- Files: `camelCase.js` (e.g., `templateManager.js`)

**Console Logging**:
- Use emoji prefixes for visibility: 🔧 (setup), ✅ (success), ❌ (error), ⚠️ (warning)
- Include context in log messages
- Log important state changes

**Function Structure**:
```javascript
async functionName(param1, param2) {
    console.log('🔧 Starting operation...');
    
    try {
        // Main logic
        console.log('✅ Operation completed');
        return result;
    } catch (error) {
        console.error('❌ Operation failed:', error);
        return { success: false, error: error.message };
    }
}
```

### Critical Development Rules

1. **Never Rewrite Entire Files**: Make targeted changes only
2. **Preserve Function Names**: Existing function names must not change
3. **Test Before Committing**: Use console debugging first
4. **Document Changes**: Update this documentation when adding features
5. **Handle Errors Gracefully**: Always include try-catch blocks
6. **Maintain Backward Compatibility**: Old data must still load correctly

---

## Known Issues & Solutions

### User Settings Overwrite Issue (FIXED in v15)

**Problem**: When switching users, settings from one user were saved to another user's file.

**Root Cause**: Storage prefix was changed before settings were saved, causing wrong file to be written.

**Solution**: 
1. In `userManager.js`: Call `settingsManager.switchToUser()` BEFORE changing storage prefix
2. In `settingsManager.js`: Clear `this.settings` object before loading new user settings

### Template Auto-Loop Issue (FIXED in v14)

**Problem**: Creating templates caused infinite reload loop.

**Root Cause**: Migration logic repeatedly tried to migrate templates.

**Solution**: Removed migration logic, implemented file-first loading with stable filenames.

### OMERO Session Timeout

**Current Behavior**: Sessions timeout after 10 minutes of inactivity.

**Workaround**: Automatic logout before user switch to prevent session conflicts.

**Future Enhancement**: Configurable session timeout in settings.

### Category UI Not Updating

**Issue**: Sometimes category buttons don't update after settings change.

**Solution**: Call `window.templateTypeManager.updateUI()` after settings change.

---

## Quick Reference

### Essential Console Commands

```javascript
// Storage
window.storage.getStorageStats()
window.storage.healthCheck()

// Templates
window.templateManager.getAllTemplates()
window.templateManager.refresh()

// Settings
await window.settingsManager.getAllCategories()
await window.settingsManager.get('templates.category1_name')
await window.settingsManager.set('templates.category1_name', 'New Name')

// User Management
window.userManager.getCurrentUserInfo()
window.userManager.debugPasswordSystem()

// OMERO
await window.omeroUIIntegration.testConnection()
await window.omeroUIIntegration.logout()
```

### File Locations

**User Data**:
- Templates: `C:\Users\[User]\MetaFold\Templates\[Group]\[User]\`
- App Data: `%APPDATA%\MetaFold\` (if used)

**Development**:
- Source: `C:\Users\Thomas Zobel\Documents\MetaFold\v15_UI_kategorien\src\`
- Node Modules: `C:\Users\Thomas Zobel\Documents\MetaFold\v15_UI_kategorien\node_modules\`

---

## Version History

### v15 (Current - January 2025)
- 4 configurable template categories (was 2 fixed)
- User-specific category settings
- Group-level category defaults
- Fixed user settings overwrite bug
- Enhanced category UI with live preview
- **Metadata Loader Improvements**:
  - Unified "Send to Integrations" button in footer
  - Direct JSON file update (no save prompt)
  - Automatic retry for elabFTW permission errors
  - Centralized integration controls in Right Sidebar

### v14
- Template file storage system
- Stable filename generation
- Removed auto-loop migration issue

### v13
- Complete password system implementation
- OMERO integration v13 with Node.js proxy
- ProjectScanner HTML export feature
- Multi-server OMERO support

### v12
- Basic OMERO integration (Python proxy)
- Project discovery and visualization
- Multi-user support (without passwords)

### v06 (Base)
- Core template system
- elabFTW integration
- Basic project creation
- Foundation architecture

---

## Development Roadmap

### Planned Enhancements

**Short-term**:
- Configurable session timeout for OMERO
- Enhanced template sharing within groups
- Batch template operations

**Medium-term**:
- Multi-Factor Authentication (MFA)
- LDAP/Enterprise authentication
- Advanced template conditionals

**Long-term**:
- Automated workflow triggers
- Enhanced analytics and reporting
- Cloud synchronization support

---

## Support & Resources

**Documentation**: This file serves as the primary development documentation.

**Console Debugging**: Most issues can be diagnosed using browser console commands.

**Architecture Questions**: Refer to the Architecture and File Structure sections.

**Adding Features**: Follow the Development Guidelines section step-by-step.

---

*This documentation reflects the current state of MetaFold v15 and serves as the primary reference for development and AI-assisted coding.*
