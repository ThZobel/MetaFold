# MetaFold – Architecture & Module Reference (AI Agent Guide)

This document serves as the structural and functional map of **MetaFold** for AI agents and developers. It describes the current runtime architecture, directory layout, module responsibilities, and core data workflows.

---

## 1. High-Level Architecture & Runtime Model

MetaFold is a modular, local-first **Electron** application for Research Data Management (RDM), experiment folder creation, metadata capture, data lineage visualization, and lab notebook/repository integration (eLabFTW, OMERO, RSpace, n8n).

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Electron Main Process (src/main.js)                                       │
│  ├─ File System, Project Creation, Recursive Scanner, 2-Pass Lineage      │
│  ├─ Project Metadata Store (src/js/main/projectMetadataStore.js)          │
│  ├─ README HTML Generator + Integration Links (src/js/main/integration*)  │
│  ├─ Native PKZIP Engine (zlib), BioFormats CLI Spawner, Webhook Sender    │
│  ├─ Electron safeStorage (DPAPI) Credential Encryption                    │
│  └─ Local OMERO Proxy Server (src/js/proxyManager.js)                     │
└───────────────────────────────────▲───────────────────────────────────────┘
                                    │ IPC (ContextBridge)
┌───────────────────────────────────▼───────────────────────────────────────┐
│ Preload Bridge (src/preload.js)                                           │
│  └─ Exposes window.electronAPI & window.utils                             │
└───────────────────────────────────▲───────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼───────────────────────────────────────┐
│ Renderer Process (src/index.html)                                         │
│  ├─ Dynamic HTML Component Loader (componentLoader.js + init_components)  │
│  ├─ Window-scoped Vanilla JS Modules (src/js/*.js)                        │
│  └─ Shared UMD Modules (src/js/shared/schemaVersion.js, markdownLite.js)  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles
1. **No Frontend Bundler**: Renderer scripts are loaded directly in `src/index.html` in dependency order and attach singletons to `window.*` (except the pre-built JSONCrack bundle in `src/build/`).
2. **Dynamic HTML Partials**: `src/index.html` is a shell. At `DOMContentLoaded`, `src/js/init_components.js` fetches all 10 HTML partials from `src/components/` in parallel via `window.componentLoader.load()` and then initializes the corresponding JS controllers.
3. **Shared UMD Modules (`src/js/shared/`)**: Modules in `src/js/shared/` use a UMD pattern so they run identically in Node.js (`require` in `main.js`) and in the browser (`window.*` in Renderer).
4. **Ignore Legacy Backup Files**: The repository contains legacy backup files (`src/js/backup/`, `src/js/omero/backup/`, `*_backup.js`, `*_old*.js`, `*_WITH_USER_ENTROPY.js`, `working-visualization-manager.js`). **Only files loaded in `src/index.html` or required by `src/main.js` are active.** Never edit backup files.

---

## 2. Directory & Component Structure

### 2.1 Entry Points & Packaging (`src/`)
| File | Role |
|------|------|
| `src/main.js` | Electron Main process entry point, native menus, and all `ipcMain.handle` endpoints. |
| `src/preload.js` | ContextBridge exposing `window.electronAPI` (IPC) and `window.utils` (path/template helpers). |
| `src/index.html` | Application shell, CSS imports, mount containers, and `<script>` load order. |
| `src/package.json` | Dependencies and standard `electron-builder` config (Electron 38 for Windows 10/11, macOS, Linux). |
| `src/electron-builder-win7.json` | Legacy build config pinning Electron `22.3.27` for Windows 7 SP1 (`npm run build-win7`). |

### 2.2 HTML Components (`src/components/`)
Injected at startup by `src/js/init_components.js`:

| Mount Container (`index.html`) | Component File | Purpose |
|--------------------------------|----------------|---------|
| `#left-sidebar-container` | `components/sidebars/left-sidebar.html` | User switch, 4 template categories, template list (`#sidebar-template-view`), and Discovery project preview (`#sidebar-project-view`). |
| `#right-sidebar-container` | `components/sidebars/right-sidebar.html` | Path preview ("Project Info") and integration cards (eLabFTW, OMERO, RSpace, n8n). |
| `#createTabContent` | `components/tabs/create-project-tab.html` | Target path, project name, dynamic metadata form, and folder structure preview. |
| `#discoverTabContent` | `components/tabs/discover-projects-tab.html` | Project scanner, Living User Index, Facet Search view, and File Sidecar Scanner wizard. |
| `#visualizeTabContent` | `components/tabs/visualize-data-tab.html` | Visualization container (Lineage Tree, Knowledge Graph, Metadata Graph, JSONCrack). |
| `#settings-modal-container` | `components/modals/settings-modal.html` | Settings tabs (General, Templates, eLabFTW, OMERO, RSpace, n8n, Plugins/BioFormats, RO-Crate, Security). |
| `#facet-search-modal-container` | `components/modals/facet-search-modal.html` | Full-screen Facet Search & Community Template Hub modal. |
| `#templateModal` | `components/modals/template-modal.html` | 3-tab modal for creating/editing templates (Metadata Fields, Folder Structure, Community & Sharing). |
| `#upload-modal-container` | `components/modals/upload-template-modal.html` | Assistant for publishing templates to the `MetaFold-Templates` GitHub repository. |
| `#slide-out-panel-container` | `components/panels/slide-out-panel.html` | Slide-out detail panel. |
| *(Loaded dynamically)* | `components/modals/login-modal.html` & `omero-password-modal.html` | User login dialog and OMERO password prompt. |

### 2.3 Stylesheets (`src/css/`)
- **Core & Layout**: `base.css` (dark theme defaults & tokens), `light-theme.css` (`body.light-mode` overrides), `components.css`, `components-extra.css`, `layout-override.css`, `responsive.css`, `sidebar-resize.css`, `right-sidebar.css`, `main-content-footer.css`, `sticky-actions.css`.
- **Feature-Specific**: `modals.css`, `login-modal.css`, `userManagement.css`, `integrations.css`, `experimentFormDrag.css`, `dragDrop.css`, `enhanced-actions.css`, `metadata-table.css`, `projectScanner.css`, `projectScanner-export.css`, `facetSearch.css`, `fileScanner.css`, `roCrate.css`.

---

## 3. JavaScript Module Reference

### 3.1 Main Process & Backend Modules
| File | Exposed / Exported | Responsibilities |
|------|--------------------|------------------|
| `src/main.js` | Main Process | Window lifecycle, file/folder creation, recursive project scanning (`scan-metafold-projects`), 2-pass lineage resolution, ID dictionary harvesting, Living User Index persistence (`user_index.json`), native PKZIP (`createZipBuffer`/`readZipBuffer`), BioFormats `showinf` execution, webhook dispatch, and `safeStorage` encryption. |
| `src/js/main/projectMetadataStore.js` | `createProjectMetadataStore` | Mutex-locked (`withProjectLock`) reading, diffing, patching, changelog calculation, atomic saving, README regeneration, and User Index sync for existing projects (`update-project-metadata` IPC). Automatically syncs `[[Project]]` mentions in notes/text with the `related_to` field. |
| `src/js/main/integrationLinks.js` | `integrationLinks` | Single source of truth for resolving and rendering the "Integration Links" block (eLabFTW, OMERO, RSpace) inside `<ProjectName>-README.html`. |
| `src/js/proxyManager.js` | `OMEROProxyServer` | Local HTTP proxy server bridging Renderer requests to OMERO webclient APIs; handles CSRF tokens, session cookies, and RFC 6454 `Origin`/`Referer` header sanitization. |

### 3.2 Shared Modules (Main + Renderer)
| File | Global / Export | Responsibilities |
|------|-----------------|------------------|
| `src/js/shared/schemaVersion.js` | `window.metafoldSchema` | Defines `SCHEMA_VERSION` (`"0.1"`), `SCHEMA_TYPES`, `RESERVED_PROJECT_KEYS`, `getSchemaVersion()` (`"0.0"` fallback), and `isReservedProjectKey()`. |
| `src/js/shared/markdownLite.js` | `window.markdownLite` | Safe, HTML-escaped micro-markdown parser/renderer supporting headings, lists, interactive task checkboxes (`- [ ]`), `#tags`, `[[Project Name]]` mentions, URLs, and clickable Windows/UNC paths. |

### 3.3 App Bootstrap, UI Shell & Utilities
| File | Global | Responsibilities |
|------|--------|------------------|
| `src/js/app.js` | `window.app` | Startup orchestration (`app.init()`), component initialization locking, user/storage bootstrap, and `openTemplateHub()`. |
| `src/js/componentLoader.js` | `window.componentLoader` | Fetches HTML files and injects them into DOM containers. |
| `src/js/init_components.js` | *(DOMContentLoaded)* | Parallel-loads all 10 HTML components and triggers `.init()` on UI controllers. |
| `src/js/globalHandlers.js` | `window.*` | Global `onclick` handlers (`switchMainTab`, `createProject`, `editCurrentTemplate`, recursive sidebar metadata rendering). |
| `src/js/themeManager.js` | `window.ThemeManager` | Toggles Dark/Light mode (`body.light-mode`), persists `metafold_theme` in `localStorage`. |
| `src/js/sidebarResizeManager.js` | `window.sidebarResizeManager` | Drag-to-resize behavior for left and right sidebars. |
| `src/js/mainContentFooterManager.js` | `window.mainContentFooterManager` | Manages the sticky action bar in the main content footer. |
| `src/js/footerMessagesManager.js` | `window.footerMessagesManager` | Displays/hides status, info, success, and error banners in the footer. |
| `src/js/tabFooterControl.js` | `window.tabFooterControl` | Shows/hides footer action buttons depending on the active main tab. |
| `src/js/utils.js` | `window.utils` | Shared frontend helper functions (DOM, string formatting, debounce). |
| `src/js/debug.js` | `window.debug` | Developer diagnostic helpers in DevTools console. |

### 3.4 Templates & Community Hub
| File | Global | Responsibilities |
|------|--------|------------------|
| `src/js/templateManager.js` | `window.templateManager` | Loads, saves, filters, and renders templates from `~/MetaFold/Templates/`; manages active template state and UI modes (`writeFilesOnly`, `multipleFolders`). |
| `src/js/templateTypeManager.js` | `window.templateTypeManager` | Manages the 4 customizable local template categories (`category1`–`category4`). |
| `src/js/templateModal.js` | `window.templateModal` | Controller for the 3-tab Template Editor modal (metadata fields, dynamic folder structure tags `[Field Label]`, community sharing metadata). |
| `src/js/communityManager.js` | `window.communityManager` | Fetches & caches `templates-index.json` from GitHub (`MetaFold-Templates`), manages the 4 fixed community categories (`Systems`, `Protocols`, `Experiments`, `Workflows`), collections, and `TagPicker`. |
| `src/js/uploadModal.js` | `window.uploadModal` | Validates and formats templates for one-click submission to GitHub Issues. |
| `src/js/enhancedActions.js` | `window.enhancedActions` | Bulk template import/export menus and template action helpers. |

### 3.5 Project Creation, Forms & Inline Editing
| File | Global | Responsibilities |
|------|--------|------------------|
| `src/js/projectManager.js` | `window.projectManager` | Orchestrates project creation, resolves dynamic `[Field]` folder placeholders (`processDynamicFolderStructure`), injects RDM provenance, writes `<ProjectName>-metadata.json` & `<ProjectName>-README.html`, and triggers active integrations. |
| `src/js/experimentForm.js` | `window.experimentForm` | Renders the dynamic metadata form from template definitions (text, number, date, dropdown, checkbox, email, 5-star `rating`, `id_anchor`, `derived_from`, `related_to`, and collapsible `group` accordions). Collects nested JSON payloads (`collectData()`). |
| `src/js/metadataEditor.js` | `window.metadataEditor` | Field builder and drag-and-drop ordering inside the Template Modal and form. |
| `src/js/codeScannerModal.js` | `window.codeScannerModal` | Webcam scanner for QR codes, DataMatrix, and 1D lab barcodes via native `BarcodeDetector` + `@zxing/library` (`src/js/vendor/zxing.min.js`). |
| `src/js/metadataLoader.js` | `window.metadataLoader` | Loads existing `<ProjectName>-metadata.json` files back into the Create Project form to update metadata or retroactively push to integrations. |
| `src/js/projectInlineEditor.js` | `window.projectInlineEditor` | In-place editing of project metadata, project renaming, field addition/deletion, and integration re-sync inside the Discovery Details Panel (`#facetRightPanel`). |
| `src/js/noteComposer.js` | `window.noteComposer` | Modal and micro-markdown toolbar for adding/editing categorized lab notes (`general`, `observation`, `deviation`, `retrospective`) with `#tag` and `[[Project]]` autocomplete and live task-checkbox toggling. |
| `src/js/projectValidation.js` | `window.projectValidation` | Input validation for project names, paths, and required metadata fields. |

### 3.6 Project Discovery, Facet Search & File Sidecar Scanner
| File | Global | Responsibilities |
|------|--------|------------------|
| `src/js/projectScanner.js` | `window.projectScanner` | UI controller for scanning directories, managing the Living User Index (`user_index.json`), ISA parent metadata inheritance toggle, and summary JSON exports. |
| `src/js/facetSearch.js` | `window.facetSearch` | Stateful singleton powering both the **Discover Projects** table/filter view (via **Tabulator.js 6.3**), the right-hand Project Details & Notes inspector (`#facetRightPanel`), and the **Community Template Hub** modal. |
| `src/js/fileScanner.js` | `window.fileScanner` | 3-step File Sidecar Scanner wizard: finds microscopy files recursively, inherits parent project metadata, extracts OME-XML via BioFormats `showinf`, and writes `.metafold-sidecar.json` files. |
| `src/js/projectMetadataEnhancer.js` | `window.projectMetadataEnhancer` | Computes metadata completeness and complexity metrics for scanned projects. |

### 3.7 Data Lineage, Visualization & RO-Crate Export
| File | Global | Responsibilities |
|------|--------|------------------|
| `src/js/visualizationManager.js` | `window.visualizationManager` | Orchestrates the Visualization view, node selection action bars (`#kg-action-bar`, `#lineage-action-bar`), interactive **Connect Mode** (visual linking of projects), and **Lineage Export** (Metadata JSON + offline HTML dashboard with pre-rendered Mermaid SVG via `src/js/vendor/mermaid.min.js`, or Full Data Harvest). |
| `src/js/lineageTree.js` | `window.MetaFoldLineageTree` | D3.js horizontal (left-to-right) collapsible tidy tree visualizing `derived_from` project ancestry and folder links. |
| `src/js/knowledgeGraph.js` | `window.MetaFoldKnowledgeGraph` | D3.js multi-view graph (Hierarchical Edge Bundling, Folder Tree, Arc Diagram, Lineage Tree). |
| `src/js/metadataGraph.js` | `window.MetaFoldMetadataGraph` | Interactive D3.js tree grouping projects by shared metadata keys and values. |
| `src/js/roCrateManager.js` | `window.roCrateManager` | Transforms projects and lineage subgraphs into **FAIR RO-Crate 1.1** (`ro-crate-metadata.json` + HTML preview) via a guided Pre-Flight Export Wizard. |
| `src/js/roCrateValidator.js` | `window.roCrateValidator` | In-memory structural validator checking RO-Crate 1.1 compliance (License, Dates, ORCID, connected lineage entities). |

### 3.8 Lab Integrations (eLabFTW, OMERO, RSpace, n8n)
| File | Global | Responsibilities |
|------|--------|------------------|
| `src/js/sidebarIntegration.js` | `window.sidebarIntegration` | Controls Right Sidebar integration cards, toggle switches, path copy, and RSpace folder loading. |
| `src/js/integrationOptionsFix.js` | *(Defer Script)* | Synchronizes integration card visibility with the active template category and global settings. |
| `src/js/metadataLinksManager.js` | `window.metadataLinksManager` | Records external URLs (`elabftw`, `omero`, `rspace`) in `metafold_integration.external_links` and triggers README link updates. |
| `src/js/elabftwCategoryManager.js` | `window.elabftwCategoryManager` | Fetches eLabFTW experiment templates via API, populates `#elabftwProjectCategory`, and persists template selection per MetaFold template. |
| `src/js/rspaceIntegration.js` | `window.rspaceIntegration` | Communicates with RSpace API (fetches folder trees, creates structured lab notebook documents). |
| `src/js/omeroPasswordPrompt.js` | `window.omeroPasswordPrompt` | Displays on-demand password prompt when connecting to OMERO without a stored password. |
| `src/js/omero/metaFoldOMEROIntegration.js` | `window.metaFoldOMEROIntegration` | High-level coordinator for OMERO project/dataset creation and map annotation upload. |
| `src/js/omero/omeroAuth.js` & `omeroAPI.js` | `window.omeroAuth`, `window.omeroAPI` | Session authentication (via local proxy + webclient fallback) and REST/webclient API calls. |
| `src/js/omero/omeroGroups.js`, `omeroProjects.js`, `omeroDatasetCreation.js` | `window.omeroGroups`, etc. | Fetches OMERO groups/projects and creates remote Projects and Datasets. |
| `src/js/omero/omeroAnnotations.js` & `omeroTemplateSync.js` | `window.omeroAnnotations`, etc. | Splits metadata into OMERO Map Annotation namespaces (Group names, `MetaFold Annotation` for flat fields, `System Metadata by MetaFold` for links/paths). |
| `src/js/omero/omeroUIIntegration.js`, `omeroEventHandlers.js`, `omeroPerformancePatch.js` | `window.omeroUIIntegration`, etc. | Binds OMERO dropdowns, connection buttons, and caching to the Right Sidebar and Settings UI. |

### 3.9 Users, Groups, RDM Provenance & Security
| File | Global | Responsibilities |
|------|--------|------------------|
| `src/js/storage.js` | `window.storage` | File-system and `localStorage` abstraction scoped to the active user and group (`~/MetaFold/Templates/`). |
| `src/js/profileManager.js` | `window.profileManager` | Manages RDM user/group profiles in `users.json` and `groups.json` (ORCID, ROR, Role, PI, Department), generates the `provenance` block for projects, and handles scoped `.zip` / `.json` profile + template export/import. |
| `src/js/userManager.js` | `window.userManager` | Manages active user session, login/logout lifecycle, and Admin checks. |
| `src/js/loginModal.js` | `window.loginModal` | Startup login modal with existing-user guard (`findExistingUser`) and in-memory password entropy caching. |
| `src/js/userManagementModal.js` | `window.userManagementModal` | Admin UI for creating/editing users & groups, validating ORCID/Email, and triggering individual or global exports. |
| `src/js/settingsManager.js` | `window.settingsManager` | Central settings store per user; coordinates with `secureStorage` to encrypt/decrypt API keys and passwords. |
| `src/js/secureStorage.js` & `secureIntegration.js` | `window.secureStorage`, `window.secureIntegration` | Wraps Electron `safeStorage` (Windows DPAPI / macOS Keychain) combined with user-specific password entropy (30-min in-memory TTL). |
| `src/js/securityGuard.js`, `securityUI.js`, `adminPasswordManager.js` | `window.securityGuard`, etc. | Enforces authentication gates, credential migration UI, and admin password management. |

---

## 4. Core Workflows & Mechanics

### 4.1 Project Creation & Metadata Structure
When `projectManager.createProject()` runs:
1. **Dynamic Folders**: `processDynamicFolderStructure()` replaces `[Field Label]` or `[fieldKey]` placeholders (plus `[User Name]`, `[Project Name]`, `[Date]`) in the template's folder structure with form values. Empty placeholders skip the subfolder line.
2. **Metadata Payload**: `experimentForm.collectData()` builds the metadata object. Fields inside a template **Group** are nested under their group key (`{ "Microscopy": { ... } }`).
3. **Envelope & Provenance**: `main.js` writes `<ProjectName>-metadata.json` (and `ReadyToImport.json` when applicable) using schema version `"0.1"` (`src/js/shared/schemaVersion.js`), injecting `provenance` (from `profileManager.js`) and `System.*` tracking fields (`System.ProjectAbsolutePath`, `System.UpdateHistory`, `System.LastUpdatedBy`, `System.LastUpdatedAt`).
4. **HTML README**: `main.js` generates `<ProjectName>-README.html` with formatted metadata tables, 5-star SVG ratings, rendered micro-markdown notes, and integration links (`src/js/main/integrationLinks.js`).
5. **Living User Index & ID Dictionary**: The new project is automatically upserted into `~/MetaFold/Templates/user_index.json` and any `id_anchor` / `projectName` is added to the user's `id_dictionary_<user>.json`.

### 4.2 Discovery, Inline Editing & Notes (`discover-projects-tab`)
- **Living User Index**: Opening the **Discover Projects** tab loads `user_index.json` directly into `facetSearch.js` without prompting for a file. Users can scan additional folders (`scan-metafold-projects` IPC) to merge projects into the index, optionally inheriting parent folder metadata (ISA hierarchy).
- **Facet Search & Tabulator**: `facetSearch.js` flattens project metadata into `flatMeta`, builds multi-select filter chips in the left panel, and renders the results table via **Tabulator.js**. Categories can be hidden/managed via context menu (`facetSearch.hiddenKeys`).
- **Right Inspector Panel (`#facetRightPanel`)**: Selecting a project in the table opens its details in the right panel:
  - **Inline Metadata Editing (`projectInlineEditor.js`)**: Edits fields, renames the project, adds/removes fields, and saves atomically via `window.electronAPI.updateProjectMetadata(projectPath, patch, options)` (`projectMetadataStore.js`).
  - **Categorized Notes & Tasks (`noteComposer.js` + `markdownLite.js`)**: Appends/edits timestamped notes in `notes_log`, supports interactive task checkboxes (`- [ ]` / `- [x]`), `#tags`, and `[[Project Name]]` mentions. Mentioning `[[Project X]]` automatically synchronizes `"Project X"` into the project's `related_to` metadata field.

### 4.3 Data Lineage, Connect Mode & Exports
- **Linking Fields**:
  - `id_anchor`: Unique identifier provided by a project (e.g., `"sample-01"`).
  - `derived_from`: Identifiers of upstream parent projects/samples this project builds upon.
  - `related_to`: Horizontal cross-references (also auto-populated from `[[Project]]` mentions in notes).
- **Two-Pass Resolution (`main.js`)**: During scanning, Pass 1 maps project paths to their `id_anchor` and `projectName` (ignoring UUIDs). Pass 2 resolves `derived_from` references into `lineage.lineage_links` containing exact `source_path` targets.
- **Visual Connect Mode (`visualizationManager.js`)**: In the Lineage Tree, clicking **Connect** lets users click a Source node and a Target node to write a new `derived_from` link directly into the target's `*-metadata.json`, append to `System.UpdateHistory`, and regenerate its `README.html`.
- **Lineage Export & Full Data Harvest**: Clicking **Export Lineage** offers:
  - *Scope*: **Direct Lineage Only** (ancestors + descendants) vs. **Entire Connected Graph** (weakly connected component).
  - *Mode*: **Metadata Only** (JSON + 100% offline HTML dashboard with a topologically sorted project list and a pre-rendered inline `<svg>` Mermaid flowchart) vs. **Full Data Harvest** (interactive subfolder selector that physically copies selected data directories and rewrites HTML links to relative paths).
- **RO-Crate 1.1 Export (`roCrateManager.js` + `roCrateValidator.js`)**: Validates FAIR metadata requirements and exports a standard `ro-crate-metadata.json` (JSON-LD) alongside an HTML preview.

### 4.4 Storage Layout & User/Group Portability
- **Persistent Data Root**: `~/MetaFold/Templates/` stores:
  - `users.json` & `groups.json` (RDM profiles, preferences; **never** contains passwords)
  - `user_index.json` (Living User Index of discovered/created projects)
  - `id_dictionary_<user>.json` (Autocomplete dictionary for `derived_from`)
  - `<Group>/<User>/*.json` (Template files)
- **Portability (`profileManager.js`)**: Users or groups (including their templates) can be exported and imported as a self-contained `.zip` archive (via the built-in `zlib` PKZIP engine in `main.js`), folder, or single `.json` bundle.
- **Credentials**: Passwords and API keys are encrypted locally in `%APPDATA%/MetaFold` via Electron `safeStorage` (DPAPI) + user password entropy.

---

## 5. JSON Schemas, Data Contracts & Testing

All JSON files read or written by MetaFold are formally specified in [`docs/schema/v0.1/`](docs/schema/v0.1/README.md) (JSON Schema Draft 2020-12).

| Schema File | `schemaType` | Target Files |
|-------------|--------------|--------------|
| [`project-metadata.schema.json`](docs/schema/v0.1/project-metadata.schema.json) | `metafold-project-metadata` | `<ProjectName>-metadata.json`, `ReadyToImport.json` |
| [`template.schema.json`](docs/schema/v0.1/template.schema.json) | `metafold-template` | `~/MetaFold/Templates/**/*.json` |
| [`sidecar.schema.json`](docs/schema/v0.1/sidecar.schema.json) | `metafold-sidecar` | `<File>.metafold-sidecar.json` |
| [`user-index.schema.json`](docs/schema/v0.1/user-index.schema.json) | `metafold-user-index` | `user_index.json` |
| [`profiles.schema.json`](docs/schema/v0.1/profiles.schema.json) | `metafold-users` / `metafold-groups` | `users.json`, `groups.json` |
| [`exports.schema.json`](docs/schema/v0.1/exports.schema.json) | `metafold-scan-summary`, `metafold-lineage-export`, `metafold-visualization-export`, `metafold-id-dictionary` | Scanner summaries, lineage/graph exports, ID dictionaries |

### Rules for AI Agents Modifying Data or UI
1. **Schema Constants**: Always use `src/js/shared/schemaVersion.js` (`SCHEMA_VERSION`, `SCHEMA_TYPES`, `RESERVED_PROJECT_KEYS`, `isReservedProjectKey()`) instead of hardcoding version strings or system key lists.
2. **Reserved Envelope Keys**: Any new top-level system property in `<ProjectName>-metadata.json` must be added to `RESERVED_PROJECT_KEYS` in `src/js/shared/schemaVersion.js` and `project-metadata.schema.json` (or prefixed with `System.`) so UI iterators and exporters do not treat it as an experimental metadata field.
3. **Legacy Compatibility (`"0.0"`)**: Files without `schemaVersion` default to `"0.0"` via `getSchemaVersion()` and must remain readable across all loaders and scanners.
4. **Theme Parity**: Any new UI component or modal must support both Dark Mode (default in `base.css`) and Light Mode (`body.light-mode` in `light-theme.css` or the feature's stylesheet).
5. **Verification & Tests**:
   - Schema contract tests: `node tests/schema-contract.test.js`
   - End-to-End & DOM harness tests: `node tests/e2e/test_runner.js`
   - Scratch/temporary files created during agent tasks must be placed in `temp_files/` (git-ignored) and cleaned up when done.
