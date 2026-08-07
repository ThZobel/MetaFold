# MetaFold Architecture & Module Documentation

## Overview
This document outlines the architecture of the MetaFold application, focusing on its component-based structure, key JavaScript modules, and the dynamic loading system. The application was refactored from a monolithic `index.html` into a modular, component-driven Electron app.

---

## 1. File Structure

### Entry Point
- **`src/index.html`** — The main application shell. Defines layout containers (`.sidebar`, `.main-content`, `.right-sidebar`) and mount points for dynamically loaded components. Loads all CSS and JavaScript in the correct dependency order. Does **not** contain inline UI content.

### Component Directory (`src/components/`)
UI parts are separated into HTML files and injected at runtime:

#### `src/components/sidebars/`
| File | Description |
|------|-------------|
| `left-sidebar.html` | Template selection list and category navigation |
| `right-sidebar.html` | "Project Info" (path preview) and "Integrations" (elabFTW, OMERO, RSpace, n8n) panels |

#### `src/components/tabs/`
| File | Description |
|------|-------------|
| `create-project-tab.html` | Main project creation form (Metadata Editor) |
| `discover-projects-tab.html` | Project scanner and browser interface with trigger button for the Facet Search |
| `visualize-data-tab.html` | JSONCrack visualization tab |

#### `src/components/modals/`
| File | Description |
|------|-------------|
| `settings-modal.html` | Comprehensive settings dialog (General, elabFTW, OMERO, RSpace, n8n) |
| `login-modal.html` | User login / switch-user interface |
| `template-modal.html` | Modal for creating and editing templates |
| `omero-password-modal.html` | OMERO password prompt modal |
| `facet-search-modal.html` | Full-screen Facet Search modal (Filter Sidebar + Tabulator results table) |

#### `src/components/panels/`
| File | Description |
|------|-------------|
| `slide-out-panel.html` | Slide-out detail panel |

### CSS Directory (`src/css/`)
Key stylesheets:
| File | Scope |
|------|-------|
| `base.css` | Core design tokens and base styles (dark mode default) |
| `light-theme.css` | **Light Mode** overrides (activated via `.light-mode` on `<body>`) |
| `components.css`, `components-extra.css` | Component-level styles |
| `integrations.css` | Integration card styles (elabFTW, OMERO, RSpace, n8n) |
| `layout-override.css` | Forces full-width layout |
| `responsive.css` | Responsive adjustments |
| `projectScanner.css`, `project_navigator.css` | Discovery tab styles |
| `userManagement.css`, `login-modal.css` | User system styles |
| `dragDrop.css`, `experimentFormDrag.css` | Drag & drop interactions |
| `storageIndicator.css` | Storage usage indicator styles |
| `sidebar-resize.css` | Resizable sidebar logic |
| `sticky-actions.css` | Sticky action bar in project creation |
| `main-content-footer.css` | Footer area styling |
| `right-sidebar.css` | Right sidebar panels |
| `metadata-table.css` | Metadata display tables |
| `facetSearch.css` | Facet Search modal, Tabulator theme overrides (dark + light mode), filter chips, column selector |
| `fileScanner.css` | Styles for the File Sidecar Scanner wizard, progress bar, and results table |

---

## 2. Component Loading System

- **`src/js/componentLoader.js`** — Core logic for fetching HTML files (`loadComponent`) and injecting them into specific DOM mount points. Handles error logging.
- **`src/js/init_components.js`** — Orchestrates the loading sequence: Settings Modal → Left Sidebar → Tabs → Right Sidebar → Template Modal → Slide-out Panel → **Facet Search Modal**. Calls `componentLoader.loadComponent()` for each UI part and initialises the corresponding JavaScript logic *after* HTML injection (e.g. `facetSearch.init()` after the modal is loaded).

---

## 3. Key JavaScript Modules

### Core Logic
| Module | Purpose |
|--------|---------|
| `app.js` | Main application initialisation, startup sequence, and Admin account checks |
| `projectManager.js` | Project creation logic, path generation, file system interactions, batch file writing (`ReadyToImport.json`). Always injects user/group `provenance` metadata and `System.ProjectAbsolutePath` / `System.ProjectRelativePath` to guarantee consistent tracking, and triggers `README.html` generation containing this data. |
| `templateManager.js` | Template loading, saving, selection, rendering; dynamically toggles UI modes (e.g. `writeFilesOnly`, `multipleFolders`) |
| `experimentForm.js` | Dynamic metadata form, drag & drop field ordering, filename preview, integration toggle management. Supports advanced field types (e.g. `email` with validation, `rating` with 5-star UI) and groups fields under Accordion UIs. Outputs nested JSON payloads for hierarchical metadata export. |
| `metadataLoader.js` | Loads and parses existing project metadata files |

### Sidebar & Integrations
| Module | Purpose |
|--------|---------|
| `sidebarIntegration.js` | Manages Right Sidebar interactivity: shows/hides integration cards (elabFTW, OMERO, RSpace, n8n) based on settings, toggle switches, `loadRSpaceFolders()`, "Copy Path" |
| `elabftwCategoryManager.js` | Manages elabFTW experiment template selection dropdown; loads templates from API; saves/restores selected template ID per MetaFold template; patches `projectManager`, `templateManager`, `settingsManager` |
| `integrationOptionsFix.js` | Ensures integration options are correctly shown/hidden based on active category and global settings |
| `rspaceIntegration.js` | API communication with RSpace (fetching documents, creating content) |

### Settings & Configuration
| Module | Purpose |
|--------|---------|
| `settingsManager.js` | Central settings store using `localStorage`; secure credential storage (API keys, passwords) via DPAPI + user-specific entropy; n8n settings support |
| `globalHandlers.js` | Bridge between HTML `onclick` events and logic modules. Contains safety checks to prevent crash loops if managers aren't loaded yet |

### Security & User Profiles
| Module | Purpose |
|--------|---------|
| `secureStorage.js` | DPAPI-based encryption for sensitive credentials; auto-initializes Admin account on first launch |
| `securityGuard.js`, `securityUI.js` | Additional security layers and UI for credential management |
| `userManager.js` | Login logic, Admin account management, clears password cache on logout (delegates CRUD to profileManager). Bootstraps `profileManager` during initialization. |
| `profileManager.js` | RDM-compliant user/group profiles, ORCID validation, Provenance generation. Profiles are saved exclusively to `users.json` and `groups.json` in the central `Templates` directory. |
| `loginModal.js` | Login UI, caches user password for entropy after successful login |
| `userManagementModal.js` | Admin UI for managing users, groups, and RDM profile fields. Performs input validation (e.g., ORCID, Email). |
| `adminPasswordManager.js` | Admin-specific password operations |

### Project Discovery & Facet Search
| Module | Purpose |
|--------|---------|
| `projectScanner.js` | Scans the file system for existing MetaFold projects; extracts dynamic integration links; manages list/grid UI and generates the Summary JSON export |
| `fileScanner.js` | File Sidecar Scanner: wizard for finding microscopy files, inheriting parent metadata, and extracting OME-XML via BioFormats |
| `facetSearch.js` | **Stateful singleton** managing the entire Facet Search feature (see Section 4) |
| `visualizationManager.js` | Interactive data visualization for discovered projects (JSONCrack and D3-based graphs like Lineage Tree & Knowledge Graph) |
| `projectMetadataEnhancer.js` | Enriches scanned project data with additional metadata (complexity, completeness) |
| `projectValidation.js` | Validates project structure and metadata completeness |

### UI & UX
| Module | Purpose |
|--------|---------|
| `themeManager.js` | Light/Dark Mode toggle; persists choice in `localStorage`; applies `.light-mode` class to `<body>` on load to prevent FOUC |
| `templateModal.js` | Template creation/editing dialog logic |
| `metadataEditor.js` | Inline metadata editing within the form |
| `mainContentFooterManager.js`, `tabFooterControl.js` | Footer bar with action buttons |
| `footerMessagesManager.js` | Status messages and notifications in the footer area |
| `sidebarResizeManager.js` | Drag-to-resize for sidebars |
| `enhancedActions.js` | Extended action menu (import/export templates, bulk operations) |
| `settingsBulkOperations.js` | Bulk settings import/export |
| `debug.js` | Developer debug utilities |
| `utils.js` | Shared helper functions |

### Storage
| Module | Purpose |
|--------|---------|
| `storage.js` | Abstraction layer over Electron's file system and localStorage for user/group-scoped data paths |

---

## 4. Facet Search Module (`facetSearch.js`)

The Facet Search is a dedicated full-screen modal for searching and filtering projects across a MetaFold Summary JSON export.

### Architecture
`facetSearch` is a singleton object exposed as `window.facetSearch`. It manages all state internally and renders into the `facet-search-modal.html` component.

### State
| Property | Type | Description |
|----------|------|-------------|
| `masterData` | `Array` | All projects loaded from the Summary JSON (with `flatMeta` added) |
| `activeFilters` | `Object` | Currently active facet filters (`{ key: [value, ...] }`) |
| `visibleColumns` | `Array` | Metadata keys currently visible as table columns |
| `allAvailableKeys` | `Array` | All metadata keys found across all projects (sorted by frequency) |
| `tabulatorInstance` | `Tabulator\|null` | Live Tabulator.js table instance; `null` when modal is closed |
| `_resizeObserver` | `ResizeObserver\|null` | Watches container size changes to trigger Tabulator redraws |
| `hiddenKeys` | `Array` | Keys hidden by the user via the context menu or manage categories modal |
| `metadataTypes` | `Object` | Stores types of metadata fields (e.g. text, select) inferred from original metadata for display in the Manage Categories modal |

### Key Methods
| Method | Description |
|--------|-------------|
| `init()` | Registers ESC-key listener and document-level click listener to auto-close the column selector dropdown |
| `loadSummaryFile()` | Opens a file dialog, parses the Summary JSON, flattens metadata, builds `masterData`, then opens the modal |
| `openModal()` / `closeSearch()` | Shows/hides the modal overlay; `closeSearch()` disconnects ResizeObserver, destroys the Tabulator instance and resets state |
| `updateUI()` | Calls `renderSidebar()` + `renderResults()` — the single source of truth for UI re-renders |
| `renderSidebar(facets)` | Builds the filter chip groups in the left sidebar |
| `renderResults(results)` | Creates or updates the Tabulator table: first call builds a new instance, subsequent calls use `replaceData()` + double-`requestAnimationFrame` → `redraw(true)` |
| `toggleFilter(key, value)` | Activates/deactivates a facet filter and calls `updateUI()` |
| `toggleColumn(key)` | Shows/hides a column via Tabulator's `showColumn()`/`hideColumn()` — no table rebuild needed |
| `exportCsv()` | Triggers Tabulator's built-in CSV download (BOM-prefixed for Excel compatibility) |
| `handleOverlayClick(event)` | Closes modal when user clicks the dark backdrop |
| `_keyToField(key)` | Converts a metadata key (e.g. `Sample.Laser_Line`) to a safe Tabulator field name (`meta__Sample_Laser_Line`) |
| `_buildTableData(results)` | Transforms project objects into flat Tabulator row data; joins array values with `"; "` |
| `_extractUrls(project)` | Extracts OMERO and elabFTW URLs from multiple possible data structures (`integrations.*`, `flatMeta` HTTP-link fallback) |
| `_buildColumns()` | Builds Tabulator column definitions: fixed columns (Name, Path, Created) + dynamic metadata columns + hidden-but-downloadable URL columns (OMERO, elabFTW) + Actions column |

### Tabulator.js Integration
The results table uses **Tabulator.js 6.3** (loaded from cdnjs CDN) with the midnight dark theme.

- **Layout**: `fitColumns` — all columns fill the container width
- **Fixed row height**: `rowHeight: 38` — prevents rows from growing unpredictably after re-renders
- **Destroy + recreate on filter**: Every `renderResults()` call destroys the existing Tabulator instance and creates a fresh one. This is as fast as the first render and guarantees identical, consistent appearance after every filter click (`replaceData()` + `redraw(true)` caused cached row-height bugs and gray backgrounds)
- **No explicit height** — the container (`flex: 1; min-height: 0; overflow: auto`) handles scrolling
- **Column visibility**: toggled live without re-rendering data
- **CSV export**: Tabulator's native downloader; URL columns are `visible: false, download: true` so they appear only in the export file, not in the UI
- **Actions column**: `download: false` — shows folder-open and integration-link buttons in the table but is excluded from CSV
- **Theming**: CSS overrides in `facetSearch.css` apply MetaFold's dark navy/purple palette over the midnight base theme; full light-mode overrides included

### Data Flow
```
loadSummaryFile()
  └─► parse JSON → build masterData (with flatMeta)
  └─► build allAvailableKeys + visibleColumns
  └─► renderColumnSelector()
  └─► openModal()
  └─► updateUI()
        ├─► renderSidebar(facets)   — left panel: filter chips
        └─► renderResults(filtered) — right panel: Tabulator table

[Filter chip clicked]
  └─► toggleFilter(key, value) → updateUI()
        ├─► renderSidebar()         — sidebar re-renders
        └─► renderResults()         — replaceData() + double-RAF → redraw(true)

[Column checkbox toggled]
  └─► toggleColumn(key) → showColumn() / hideColumn()  (no data reload)

[Column header clicked]
  └─► Tabulator sorts natively (no custom logic needed)

[Export button clicked]
  └─► exportCsv() → Tabulator downloads CSV

[Close / ESC / backdrop click]
  └─► closeSearch() → ResizeObserver.disconnect() → destroy tabulatorInstance → reset state
```

| File | Role |
|------|------|
| `src/components/modals/facet-search-modal.html` | Modal HTML structure (overlay, header with action buttons, filter sidebar, results container) |
| `src/css/facetSearch.css` | All styling: Tabulator theme overrides (dark + light mode), modal layout, filter chips, column selector dropdown |
| `src/index.html` | Mounts Tabulator CDN (CSS + JS) before `facetSearch.js`; contains `#facet-search-modal-container` mount point |
| `src/js/init_components.js` | Loads `facet-search-modal.html` and calls `facetSearch.init()` |

---

## 5. Integrations

### elabFTW (Electronic Lab Notebook)
- **Settings tab**: Server URL, API Key, default template ID, overwrite/versioning options.
- **Right Sidebar card** (`#elabftwIntegration`):
  - Toggle switch (`#sendToElabFTW`) to enable per project.
  - **Template dropdown** (`#elabftwProjectCategory`): Fetches available experiment templates from the elabFTW API and displays them as a `<select>`. The selected template is saved per MetaFold template.
  - "🔄 Refresh Templates" link calls `loadElabFTWTemplates()`.
  - "Fetch next ID" checkbox for auto-numbering folder names.
  - "Update Existing ID" field for updating an existing experiment.

### OMERO (Image Data Management)
- **Settings tab**: Server URL, username, group, dataset options.
- **Right Sidebar card** (`#omeroIntegration`): Connect button, group/project dropdowns, metadata format toggle.
- **Core Logic**: Supports creating standalone Datasets OR full Projects. Key-Value annotations are dynamically attached via `/webclient/annotate_map/` depending on the target object type.
  - **Namespaces**: To keep annotations organized in OMERO, metadata is automatically split into distinct Map Annotations:
    - **Groups**: Fields belonging to a template group are uploaded under a namespace named exactly after the group (e.g., `Microscopy`). Internal metadata (`provenance`, `_metafold`) is safely ignored during group parsing.
    - **Flat Fields**: Template fields without an explicit group use the namespace `MetaFold Annotation`.
    - **System Metadata**: Post-upload integration links and paths (e.g., OMERO Link, elabFTW Link, Project Local Path) use the namespace `System Metadata by MetaFold`.

### RSpace (Electronic Lab Notebook)
- **Settings tab**: Server URL, API key.
- **Right Sidebar card** (`#rspaceIntegration`): Folder selector dropdown with refresh, document name, tags.

### n8n (Workflow Automation)
- **Settings tab** (`🤖 n8n`): Enable/disable toggle, Instance ID, Global Webhook URL, Authentication type (None / Bearer Token / Basic Auth), SSL verification toggle.
- **Right Sidebar card** (`#n8nIntegration`): Toggle switch (`#sendToN8n`), status text, auto-trigger info badge.
- **Integration logic** (`experimentForm.js`): Reads `#sendToN8n` toggle, includes it in `integrations.n8n`. Webhook fires on project creation.

### BioFormats / File Sidecar Scanner
- **Settings tab** (`🔌 Plugins`): Enable/disable toggles for the File Scanner and BioFormats OME-XML extraction. Configuration of searched file extensions and path to `showinf` / `showinf.bat` with auto-detect feature.
- **Discover Tab tile**: Trigger button to open the 3-step File Scanner wizard (hidden by default unless enabled).
- **Core Logic** (`fileScanner.js`): Recursively finds microscopy files, inherits project metadata (ISA) from parent directories, spawns a `showinf` background process to extract OME-XML, and writes a `.metafold-sidecar.json` next to each file.
- **IPC Handlers**: `list-files-recursive`, `bioformats-detect`, `bioformats-read-omexml` (uses direct `java` classpath execution when formats JARs are present to prevent Windows path quoting/space issues, falling back to batch file execution if needed).

---

## 6. Light Mode

- **Implementation**: CSS-class-based (`body.light-mode`).
- **File**: `src/css/light-theme.css` – ~549 lines of override rules covering all major UI regions.
- **Facet Search light mode**: `src/css/facetSearch.css` contains dedicated `body.light-mode` overrides for the modal window, header, sidebar, chips, group titles, column selector dropdown, close button, and the Tabulator table.
- **Persistence**: `localStorage.getItem('metafold_theme')` → `'light'` or `'dark'` (default).
- **Toggle**: `window.toggleTheme()` (exposed by `themeManager.js`), called from a button in the left sidebar with icon `#themeToggleIcon` (☀️ / 🌙).
- **FOUC prevention**: `ThemeManager.init()` runs immediately on script load, before `DOMContentLoaded`.

---

## 7. Security Architecture

| Layer | Mechanism |
|-------|-----------|
| Credential encryption | DPAPI (Windows) + User-specific entropy |
| Password cache | In-memory only, 30-minute TTL, never written to localStorage |
| Cache lifecycle | Set on login (`loginModal.js`), cleared on logout/user-switch (`userManager.js`, `settingsManager.switchToUser()`) |
| Admin auto-init | `secureStorage.js` creates Admin account on first `init()` if password system is enabled |
| Cross-user protection | Entropy mismatch blocks decryption with `ENTROPY_ERROR` |

---

## 8. User Profiles & RDM Provenance

MetaFold implements an RDM-compliant (Research Data Management) user and group system, heavily inspired by the ISA-JSON standard (Investigation, Study, Assay).

### Local Data Store
Instead of simple strings, users and groups are stored as rich objects in local JSON files via the `profileManager.js`:
- **`groups.json`**: Contains group metadata such as PI Name, PI ORCID, Institution, Department, ROR (Research Organization Registry), and Funding Info.
- **`users.json`**: Contains user metadata such as First/Last Name, Email, ORCID, Affiliation, and Role (e.g., PI, PostDoc, PhD Student), plus a reference to their primary group.

### Passwords & Security Separation
To maintain a secure, local-first architecture without a central database:
- **Passwords are never stored in the profile JSONs.**
- The `secureStorage.js` (DPAPI) manages authentication.
- When profiles are exported/imported across devices, they do not include passwords. Users must set a new password on the new device upon first login.

### Provenance Tracking (Self-Contained Data)
When a project is created via the UI, the `profileManager.js` generates a `provenance` block containing the current user's and group's metadata. 
This block is automatically injected into the `ReadyToImport.json`. 
- **Inheritance**: Subfolders created as part of the project structure do not need their own JSON files; they implicitly inherit the provenance from the parent project's `ReadyToImport.json`.
- **Sidecars**: For single-file extraction (e.g., File Sidecar Scanner), the provenance is injected into the `.metafold-sidecar.json`.
This ensures that every metadata file is self-contained and FAIR, retaining its creator context even if moved independently of the application.

---

## 9. External Dependencies (CDN)

All external libraries are loaded via CDN in `index.html`. No local bundling.

| Library | Version | Purpose |
|---------|---------|---------|
| Tabulator.js | 6.3.0 | Results table in Facet Search (sorting, column management, CSV export) |
| JSONCrack (via iframe) | — | Visualisation tab |
| React + ReactDOM | 18.3.1 | Used in specific sub-features |
| D3.js | 7.8.5 | Fallback visualization |

---

## 10. Data Linking & Lineage (Knowledge Graph)

MetaFold allows linking projects dynamically to create a comprehensive Knowledge Graph and Data Lineage representation.

### ID Dictionary & Autocomplete
To facilitate linking, the application scans existing projects for custom IDs and builds a dictionary for autocomplete.
- **Location**: The ID dictionary is saved within the user's specific template directory, typically:
  `C:\Users\Thomas Zobel\MetaFold\Templates\System\Admin\id_dictionary_admin.json` (or similar, depending on group/user).
- **Filtering**: The scanner extracts fields explicitly typed as `id_anchor` as well as the overarching `projectName`. It strictly ignores auto-generated UUIDs (like `metafold_project_id`) using regex, ensuring the autocomplete remains clean and relevant for researchers.
- **Data Structure**: Entries in the `id_dictionary` are saved as objects (e.g. `{ id: "BPAE-Cells", type: "project" }` or `{ id: "cell-42", type: "id_anchor" }`). If a project name collides with an explicitly assigned `id_anchor`, the `id_anchor` takes precedence.
- **UI Representation**: In the `derived_from` field, these options are presented via a native HTML `<datalist>`. They are visually distinguished using emojis in the `label` attribute (`📁 Projekt` vs `⚓ ID`), removing redundancy while ensuring the input captures the raw string.

### Metadata Linking Logic
Projects are linked via two specific metadata field types:
- **`id_anchor`**: Defines the unique identifier *provided* by the current project (e.g., `"cell-42"`).
- **`derived_from`**: An array or string of identifiers that this project *builds upon* (e.g., `"cell-42", "stain-01"`).
- **Lineage Extraction (`main.js`)**: A two-pass algorithm runs during folder scanning. Pass 1 maps absolute paths to their provided IDs. Pass 2 resolves all `derived_from` references into absolute paths to build the complete `lineage` object.

### Interactive Visualizations
- **D3.js integration**: Visualized as a hierarchical Lineage Tree or a semantic Knowledge Graph (`visualizationManager.js`).
- **Interactive Action Bar**: Clicking a node in either graph dynamically injects an Action Bar into the header, providing buttons for:
  - **View Details**: Opens the metadata inspector modal.
  - **Open Folder**: Opens Windows Explorer to the specific project path.
  - **Export Lineage**: (See below).

### Subgraph Extraction (Lineage Export)
- **`exportLineage`**: Clicking "Export Lineage" on a graph node opens a custom **Export Options Modal** offering two modes (Metadata Only vs Full Data Harvest) and two scopes:
  - **Direct Lineage Only**: Strictly traces upwards (ancestors) and downwards (descendants) from the selected project.
  - **Entire Connected Graph**: Uses a flood-fill algorithm to capture the entire weakly connected component, including siblings and cousins.
- **Dual Export (JSON & HTML)**: The feature creates an isolated JSON bundle of the graph dependency chain, alongside a rich, interactive HTML dashboard. The HTML view includes:
  - A Kahn's Algorithm-based **Topological Sort** to display projects chronologically from origin to end.
  - A **Mermaid.js Flowchart** at the top with clickable anchor nodes that scroll to detailed project cards. The flowchart is **color-coded**: the root project is highlighted, direct lineage nodes have a primary color, and indirect projects are muted.
  - Buttons for **"Copy Path"**, **"Open README"**, and direct integration links (OMERO/eLabFTW).
- **Full Data Harvest**: When selected, this mode automatically finds all subdirectories across the exported projects and presents a subfolder selection modal. It then physically copies all selected data into a new standalone directory, while dynamically rewriting internal HTML links to be portable relative paths.

---

## 11. How to Verify Key Features

### Faceted Search (Column Selector & Multi-Select Filters)
1. Export a scan summary as JSON (via **💾 Export Summary**).
2. Click **🏷️ Search Metadata** and load the exported JSON.
3. Filter by clicking chips in the sidebar — multiple chips per category are supported.
4. After filter clicks, the table should re-render with correct row heights and full-width columns.
5. Click **⚙️ Columns** to toggle which metadata fields appear as table columns.
6. Integration links (🔵 OMERO, 🟢 eLabFTW) are clickable in the Actions column.

### Light Mode
1. Click the ☀️/🌙 button in the left sidebar header.
2. Open the Facet Search modal — all elements (sidebar, chips, dropdown, table) should use light colours.

### ISA Metadata Inheritance
1. Create a parent project with metadata (e.g., `PI: Zobel`, `Organism: Mouse`).
2. Create a child project inside the parent folder with its own metadata.
3. Go to **Discover Projects** tab and check **🧬 Inherit parent metadata (ISA)**.
4. Click **Scan Projects** — the child project should contain both its own and inherited parent metadata.
5. `System.Level` should be `1` for the parent and `2` for the child.

### n8n Integration
1. Open **Settings** → **🤖 n8n** tab. Enable integration, enter Webhook URL and auth details.
2. The **n8n card** appears in the right sidebar.
3. Enable the toggle for a project and create it → webhook fires.

### elabFTW Template Dropdown
1. Open **Settings** → **elabFTW** tab, enable and configure.
2. In the right sidebar, the elabFTW card shows a **Template** dropdown.
3. Click **🔄 Refresh Templates** to load templates from the elabFTW API.
4. Select a template – it is saved per MetaFold template and restored on re-selection.

### File Sidecar Scanner & BioFormats
1. Enable the plugin in **Settings** → **🔌 Plugins**.
2. If BioFormats is installed (Java 8+ required), enable it and click **🔍 Auto-Detect**.
3. Go to the **Discover Projects** tab and click the new **🔬 File Sidecar Scanner** tile.
4. Follow the 3-step wizard to select a folder containing microscopy files (e.g., `.czi`, `.tif`) and a root folder for metadata inheritance.
5. Click **🚀 Scan starten**. The app will process the files and show a results table. Check the file system for `.metafold-sidecar.json` files next to your images.

---

## 12. Metadata Schema & Output Format

MetaFold dynamically creates `ReadyToImport.json` (oder `<ProjectName>-metadata.json`) alongside a `<ProjectName>-README.html` representation. AI Agents should be aware of these structural principles:

- **Nested Groups**: Fields placed under a "Group" element in the Template Editor (`experimentForm.js`) are output as nested JSON objects (using the group name as the parent key) in `collectData()`. This creates "Namespaces" compatible with OMERO and other hierarchical systems.
- **System Fields**: During JSON generation, `main.js` automatically injects `System.ProjectAbsolutePath`, `System.ProjectRelativePath`, `System.UpdateHistory`, `System.LastUpdatedBy`, and `System.LastUpdatedAt`. These fields track provenance, project location, and document modifications natively. They are displayed in the `README.html` under the "System Information" section.
- **Rating Fields**: Saved as integer values (1-5) in JSON, but are dynamically translated into visual 5-star SVGs in the Form UI and the generated `README.html`.
- **E-Mail Validation**: Handled both in user/group management (`userManagementModal.js`) and generic template fields (`experimentForm.js`).
- **Internal Keys**: Keys like `provenance`, `projectName`, `metafold_project_id`, `metafold_integration`, and `System.*` are deliberately hidden from standard metadata iterators in the UI/HTML rendering, ensuring the user only sees relevant experimental data.

---

## 13. Historical Fixes

### Sidebar & Settings
- **`src/index.html`**: Added missing `<script src="js/sidebarIntegration.js">`.
- **`src/js/settingsManager.js`**: Fixed critical syntax error; restored broken template literals.
- **`src/js/sidebarIntegration.js`**: Implemented `updateSidebarVisibilityFromSettings()` with retry; added `window.loadRSpaceFolders()`; integration cards hidden by default.
- **`src/js/globalHandlers.js`**: Added safety checks before accessing `settingsManager`.

### Facet Search – Modal Migration
- Moved Facet Search from inline tab content into a dedicated full-screen modal (`facet-search-modal.html`).
- Replaced manual DOM table construction with **Tabulator.js** for correct multi-value handling, native CSV export, sortable/resizable columns.
- Fixed CSV export: arrays joined with `"; "`, URLs extracted from multiple data-structure variants, BOM prefix for Excel compatibility.
- Fixed column-selector dropdown: closes on outside click (capture-phase document listener).

### Facet Search – Table Layout Fix (current session)
- **Root cause**: After `replaceData()`, Tabulator's `fitColumns` layout could not measure the container's settled size before `redraw(true)` ran, causing rows to have incorrect widths/heights.
- **Fix 1** (`facetSearch.js`): Replaced single `redraw(true)` call after `replaceData()` with a **double `requestAnimationFrame`** wrapper, ensuring the browser paints and the container settles before layout recalculation.
- **Fix 2** (`facetSearch.js`): Changed `layout: 'fitColumns'` → `layout: 'fitDataStretch'`, which handles dynamic resizing more robustly.
- **Fix 3** (`facetSearch.js`): Added `tableBuilt` callback that fires a single RAF-delayed `redraw(true)` on first render, and a **`ResizeObserver`** on the container that triggers `redraw(true)` on size changes (e.g. sidebar filter area toggling). Observer is disconnected in `closeSearch()`.
- **Fix 4** (`facetSearch.css`): Container now uses `display: flex; flex-direction: column` and the `.tabulator` itself gets `flex: 1; width: 100%` so it always fills the available space.
- **Fix 5** (`facetSearch.css` + `facet-search-modal.html`): Removed hardcoded dark inline styles from the column-selector dropdown `<div>`; moved all styling to `.column-selector-dropdown` CSS class with full dark/light-mode overrides.
- **Fix 6** (`facetSearch.css`): Added missing light-mode overrides for: facet chips (`.facet-chip`, `.facet-chip.active`), group titles (`.facet-group-title`), modal subtitle, close button, and active filter badge.

### Facet Search – Category Management (Current Session)
- **Hide Categories**: Added a context menu (right-click) to facet group titles to allow hiding specific metadata fields from the sidebar. Hidden state is persisted via `settingsManager` (`facetSearch.hiddenKeys`).
- **Manage Categories Modal**: Added an `👁️ Manage Categories` button that opens a centered modal displaying all available metadata fields (including their native data types inferred from `p.metadata`). Checkboxes allow users to easily toggle visibility, robustly handling keys that are missing in the current scan.
- **Header Badges & Clearing**: Added active filter count badges and `✖` clear buttons directly to category headers in the sidebar.
- **Admin Password Safety**: Implemented validation in `userManagementModal.js` to prevent clearing the Admin password, avoiding unintentional startup resets.

### Discovery & Integration (Current Session)
- **In-Memory Facet Search**: Added `🔍 Search Metadata` button to `projectScanner.js` that bypasses the file selection dialog and loads scanned projects directly from RAM via a new `loadFromProjects()` method in `facetSearch.js`.
- **In-Memory Visualisation**: Added `📊 Visualisation` button to instantly render the Knowledge Graph/Lineage Tree from scanned RAM data.
- **ID Dictionary Filtering**: Updated `main.js` to strictly ignore `metafold_project_id` and regex-match UUIDs during ID harvesting (`extractIdValues` & `extractLineage`), keeping the autocomplete clean. Restore string-split logic for array mapping in `derived_from_ids`.
- **Interactive Graphs**: Injected an Action Bar into `visualizationManager.js` headers (`#kg-action-bar` & `#lineage-action-bar`) which populates dynamically upon node click to offer "View Details", "Open Folder", and "Export Lineage".
- **Export Lineage Subgraph**: Implemented a recursive graph traversal algorithm (`window.exportLineage`) that captures the full ancestry and progeny of a selected project and saves it as an isolated JSON file.

### Lineage Export Enhancements (Current Session)
- **Path Resolution Sync**: Changed `visualizationManager.js` to rely entirely on the backend-resolved `lineage_links` rather than repeating the name-based ID lookup. This prevents graph disconnections caused by duplicate project names in nested folder structures.
- **Export Scope Selection**: Refactored `exportLineage` to calculate both a strictly vertical "Direct Lineage" (via `collectAncestors` and `collectDescendants`) and the full connected graph (via `collectDependencies`). 
- **Custom Export Modal**: Replaced the native Electron `showMessageBox` with a styled HTML overlay modal for selecting Export Mode (Metadata/Harvest) and Scope (Direct/Full).
- **Flowchart Color-Coding**: Injected CSS class definitions into the generated Mermaid diagram in `generateLineageHtml` to visually distinguish the root node (purple), direct lineage nodes (blue), and indirect lineage nodes (dark grey).
- **Harvest Subfolder Selector**: Added an interactive modal during Full Data Harvest that parses the directory tree of all exported projects and lets the user choose exactly which nested folders they want to physically copy over.

### Lineage Graph Connect Mode (Current Session)
- **Visual Node Linking**: Introduced a "Connect" button in the Lineage Tree Action Bar that activates an interactive connection mode. Users select a Source node, then a Target node, and the visualization establishes a new `derived_from` dependency link.
- **Strict Metadata Compliance**: When projects are connected visually, the logic bypasses `ReadyToImport.json` flag files in favor of the actual `*-metadata.json` payload files.
- **Object Formatting & Audit Trails**: Automatically structures the newly inserted `derived_from` field to match MetaFold's internal standards (`{ type: "derived_from", value: [...] }`). Furthermore, it mimics the native "Extend Metadata" behavior by tracking modification timestamps (`lastUpdatedAt`) and the editing user (`lastUpdatedBy`).
- **README Synchronization**: After writing the updated JSON via DPAPI handlers, the script immediately calls `regenerateReadmeHtml` to ensure the project's visual representation (which relies heavily on HTML rendering for performance during scans) is kept perfectly in sync with the backend graph data.

### Sidebar Metadata Viewer (Current Session)
- **Discovery Tab Preview**: Selecting a project in the Discovery list (or double-clicking a graph node) dynamically hides the Template view in the left sidebar and renders the selected project's full metadata in a dedicated container (`#sidebar-project-view`).
- **Recursive Metadata Rendering**: Upgraded `globalHandlers.js` to parse and render nested metadata categories (e.g., `Microscopy`, `Biological Sample`) recursively. Nested objects are formatted cleanly with folder icons and distinct borders instead of raw JSON stringification, maintaining the original type logic (URL highlighting, empty states) across all depths.
- **Active Selection Highlighting**: Clicking a project item adds an `.active` CSS state in `projectScanner.css`, visually highlighting the currently inspected row with a gradient background, border, and glow effect to indicate the active selection.

---

## 14. Version Control & Repository Structure

To ensure a clean repository and prevent issues with GitHub Actions (like missing build files or bloated repositories), the project uses a strict `.gitignore` configuration.

### Git Ignore Strategy
The following items are deliberately **excluded** from version control:
- **Build Artifacts:** `src/dist/`, `src/build/`, `dist/`, `out/`, `release/`. (Note: Built assets used by the app, like `build/jsoncrack-viewer.js`, must be included in the `package.json` `files` array to be packaged by `electron-builder`, but the build output folders themselves shouldn't be tracked in Git if they are generated by CI/CD).
- **Dependencies:** `node_modules/` (heavy and platform-specific).
- **Temporary Files & Scripts:** The `temp_files/` directory, scratch scripts (`patch.py`, `found_code.txt`), and `.log`/`.tmp` files. Temporary files should *always* be placed in `temp_files/` to ensure they aren't accidentally pushed to the repo.
- **Local Data:** `MetaFold-Projects-Data*.json` (local project databases) or local `templates/`.

### Best Practices for Agents & Developers
- Always place temporary notes, scratch HTML/MD files, and ad-hoc scripts in `temp_files/`.
- Never commit `node_modules` or `dist` folders.
- Ensure any new build steps (e.g., via Webpack) output to folders that are ignored by Git but explicitly included in `package.json`'s `files` array for `electron-builder`.
