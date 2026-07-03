# Changelog

All notable changes to MetaFold will be documented in this file.

## [v15.1] - 2025-01-XX

### Added
- **RSpace Integration**: Full support for RSpace Electronic Lab Notebook
  - API connection and authentication
  - Folder browsing and document creation
  - Metadata synchronization with RSpace documents
  - Integration controls in Right Sidebar
- **Right Sidebar Panel**: New dedicated panel for integration management
  - Quick access to elabFTW, OMERO, and RSpace integrations
  - Real-time integration status display
  - Project path preview and copy functionality
  - Toggle integrations per project
- **OMERO Single Login**: Simplified authentication workflow
  - Persistent session management across user switches
  - Automatic session validation
  - Single sign-on capability for multi-project workflows

### Changed
- **New Layout**: Modernized three-column interface
  - Left Sidebar: Template selection and categories
  - Main Content: Project creation and metadata forms
  - Right Sidebar: Project info and integrations (new)
- **Settings Cleanup**: Reorganized settings structure
  - Clearer navigation with dedicated tabs
  - Improved settings modal organization
  - Better integration configuration workflow
  - Migrated plaintext credentials to secure storage

### Security
- **OMERO User Data Protection**: Enhanced credential security
  - Multi-layer encryption for OMERO credentials
  - Secure storage for API keys and passwords
  - Automatic migration from plaintext to encrypted storage
  - PBKDF2-SHA256 encryption (100,000 iterations)

### Fixed
- Multiple UI responsiveness improvements
- Settings manager stability and error handling
- Integration card visibility logic
- Template loading and file system operations
- User switching with proper settings context
- Console error handling and logging

### Technical
- Modularized component architecture
- Dynamic component loading system
- Improved separation of concerns
- Enhanced error recovery mechanisms
- Better debug logging with emoji indicators

---

## [v15.0] - 2025-01

### Added
- 4 configurable template categories (previously 2 fixed)
- User-specific category settings
- Group-level category defaults
- Enhanced category UI with live preview

### Fixed
- User settings overwrite bug during user switching
- Template auto-loop migration issue
- Storage prefix timing in user management

---

## [v14.0] - 2024

### Added
- Template file storage system
- Stable filename generation for templates
- Improved template deduplication

### Fixed
- Removed auto-loop migration issue

---

## [v13.0] - 2024

### Added
- Complete password system implementation
- OMERO integration v13 with Node.js proxy
- ProjectScanner HTML export feature
- Multi-server OMERO support

---

For earlier versions, see [GitHub Releases](https://github.com/ThZobel/MetaFold/releases)