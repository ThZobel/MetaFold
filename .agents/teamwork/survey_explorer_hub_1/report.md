# MetaFold Investigation Report: Hub, Upload Workflow & Test Infrastructure

**Date:** 2026-10-06  
**Investigator:** Hub and Test Explorer (`teamwork_preview_explorer`)  
**Scope:** Phase 2 (Upload Workflow), Phase 3 (Hub & Facet Search), and Test Infrastructure  
**Reference Docs:** `COMMUNITY_TEMPLATES_PLAN.md`, `ORIGINAL_REQUEST.md`, `ARCHITECTURE_AND_MODULES.md`

---

## Executive Summary

1. **Phase 2 (Upload Workflow):**
   - The current upload mechanism is an ad-hoc inline DOM script inside `src/main.js` (lines 130–220) invoked from the application menu (`Templates -> Upload`).
   - It only asks for a template name in a basic `<select>` and formats a simplistic GitHub Issue link containing only `Name`, `Author`, `Description`, and the raw JSON. It lacks all community taxonomy classifications (`system`, `discipline`, `organism`, `tags`), does not support updating local templates, and is not integrated into MetaFold's standard component modal architecture.
   - Recommended solution: Build a dedicated modal component (`src/components/modals/upload-template-modal.html`) with a renderer controller (`src/js/uploadModal.js`), integrate it into `src/index.html` and `init_components.js`, support pre-population from `template.community`, provide a checkbox to save tags back to the local file, format the expanded GitHub Issue body, and add triggers both in the native menu and in the "Templ. Options" slide-out panel (`slide-out-panel.html`).

2. **Phase 3 (Hub & Facet Search):**
   - `openTemplateHub` in `src/js/app.js` (lines 433–477) currently configures outdated keys (`category`, `type`, `tags`, `author`, `version`, `description`) on `window.facetSearch.allAvailableKeys` and `visibleColumns`.
   - The flattener in `app.js` needs to unpack `item.community` if present in the index items, and map `collection`, `system`, `discipline`, `organism`, `tags`, `author`, and `version`.
   - In `src/js/facetSearch.js`, `_getCategoryForKey` (line 463) does not categorize community taxonomy keys (they fall back into `'📋 Metadata Fields'`). Adding category mapping or template hub specific grouping enables cleanly separated category accordions.
   - `downloadAndInstallTemplate` in `src/js/app.js` (lines 479–534) is functional via `electronAPI.saveTemplateToFile`, but must ensure `templateData.community` is preserved cleanly, prevent silent overwrite collisions, and default `category` properly.
   - `src/css/facetSearch.css` lacks styling for `.tabulator-row.tabulator-selected`.

3. **Test Infrastructure:**
   - MetaFold's `package.json` is located in `src/package.json` (not in the repository root).
   - Currently, there are **no test scripts, no test runners (Jest, Vitest, Playwright, Mocha), and no test directories** in the repository.
   - CI (`.github/workflows/release.yml`) builds installers directly via `npm ci` and `npx electron-builder` without running tests.
   - Node.js v22.16.0 is available on the machine. Unit tests can be written immediately using Node's native test runner (`node --test`) without external dependencies, or via lightweight test runners. For integration and acceptance verification, an "Agent-as-Judge" inspection mechanism is specified.

---

## 1. Phase 2: Upload Workflow Investigation

### 1.1 Existing Upload Trigger & Implementation
- **File & Location:** `src/main.js` lines 130–220.
- **Trigger:** Application menu item `Templates -> Upload`.
- **Current Behavior:**
  1. Sends IPC message: `win.webContents.send('menu-action', 'upload-template')`.
  2. Executes an inline JavaScript string via `win.webContents.executeJavaScript`:
     - Checks `window.templateManager.templates`. If empty, shows browser `alert()`.
     - Dynamically generates `<div style="position:fixed; ...">` as an overlay.
     - Renders a `<select id="uploadTemplateSelect">` populating `window.templateManager.templates`.
     - Has `Cancel` and `Continue to GitHub` buttons.
  3. On confirmation:
     - Retrieves `template = window.templateManager.templates[select.value]`.
     - Clones template and deletes `_fileInfo` and `id`.
     - Serializes with `JSON.stringify(exportTemplate, null, 2)`.
     - Constructs URL:
       ```
       https://github.com/ThZobel/MetaFold-Templates/issues/new?title=New%20Template:%20...&body=...
       ```
     - Body only contains:
       - `### New Community Template Submission`
       - `**Template Name:**`
       - `**Author:**`
       - `**Description:**`
       - `#### Template JSON` (fenced json block)
     - Calls `window.open(githubUrl, '_blank')` and removes modal element from DOM.

### 1.2 Modal Architectural Patterns in MetaFold
MetaFold employs a standardized dynamic component loading model:
- **Component Files:** In `src/components/modals/`:
  - `template-modal.html`
  - `facet-search-modal.html`
  - `settings-modal.html`
  - `login-modal.html`
  - `omero-password-modal.html`
- **DOM Injection:** In `src/index.html`:
  - Dedicated containers: `<div id="templateModal"></div>`, `<div id="settings-modal-container"></div>`, `<div id="facet-search-modal-container"></div>`.
- **Loader:** `src/js/init_components.js` uses `window.componentLoader.load(containerId, filePath)`.
- **Controller Object:** Each modal has a dedicated controller object (`templateModal`, `facetSearch`, `settingsManager`, `loginModal`) with standard `show()`, `close()`, and validation/submission logic.

### 1.3 Gaps & Deficiencies in Current Upload Implementation
1. **Missing Community Taxonomy:**
   - The user cannot specify or review `system`, `discipline`, `organism`, `tags`, or `author`.
2. **Missing Local Synchronization:**
   - No checkbox or ability to write edited tags back to `template.community` in the local template file.
3. **Architectural Non-Compliance:**
   - Inline `executeJavaScript` string in `main.js` bypasses the modular component architecture, violates separation of concerns, and is difficult to maintain and style.
4. **Missing UI Trigger:**
   - There is no button in MetaFold's main UI (e.g. within `slide-out-panel.html` under "Templ. Options" or within the sidebar) to trigger upload; only the native OS/Electron menu has it.
5. **Issue URL Formatting:**
   - Does not match the schema required by `COMMUNITY_TEMPLATES_PLAN.md` Section 5.

### 1.4 Recommended Implementation Plan for Phase 2
1. **Create HTML Component:** `src/components/modals/upload-template-modal.html`:
   - Step 1: Template selection `<select id="uploadModalTemplateSelect">`.
   - Step 2: Community fields with `<datalist>` elements:
     - System / Device (`#uploadModalSystem` with `#systemDatalist`)
     - Discipline (`#uploadModalDiscipline` with `#disciplineDatalist`)
     - Biological System / Specimen (`#uploadModalOrganism` with `#organismDatalist`)
     - Tags (`#uploadModalTags`)
     - Author (`#uploadModalAuthor`)
     - Checkbox: `[x] Update local template with these tags` (`#uploadModalSyncLocal`)
   - Footer: `Cancel` and `Continue to GitHub` buttons.
2. **Create Controller:** `src/js/uploadModal.js`:
   - `show(selectedTemplateIndex = null)`
   - `populateFromTemplate(template)`: checks `template.community` and pre-fills taxonomy fields; defaults author to `userManager.currentUser`.
   - `submit()`:
     - Strips internal properties (`_fileInfo`, `id`, `_uiState`, etc.).
     - Populates root-level `community` object in payload.
     - If `#uploadModalSyncLocal` is checked, updates `template.community` and invokes `window.storage.saveTemplateToFileImmediately(template)` or `window.electronAPI.saveTemplateToFile(template, userInfo)`.
     - Formats markdown issue body with all taxonomy headers and JSON codeblock.
     - Opens URL via `window.electronAPI.openExternal(url)`.
3. **Register Component & Triggers:**
   - Add `<div id="upload-modal-container"></div>` to `src/index.html`.
   - Add loader call to `src/js/init_components.js`.
   - In `src/main.js`: Replace inline DOM code with `window.uploadModal.show()`.
   - In `src/js/app.js`: Listen for `'upload-template'` in `window.electronAPI.onMenuAction`.
   - In `src/components/panels/slide-out-panel.html`: Add an "Upload to Community" button under Template Actions.

---

## 2. Phase 3: Hub & Facet Search Integration

### 2.1 Current Implementation in `src/js/app.js`
- **Function:** `openTemplateHub()` (lines 433–477).
- **Index URL:** Defaults to `https://raw.githubusercontent.com/ThZobel/MetaFold-Templates/main/templates-index.json` (configurable in settings).
- **Current Data Mapping:**
  ```javascript
  const formattedData = indexData.map(item => {
      const flatMeta = {};
      Object.keys(item).forEach(key => {
          if (key !== 'id' && key !== 'path' && key !== 'fields') {
              flatMeta[key] = item[key];
          }
      });
      return {
          _type: 'template_hub',
          name: item.name || 'Unnamed Template',
          path: item.path,
          flatMeta: flatMeta,
          rawFields: item.fields || []
      };
  });
  window.facetSearch.masterData = formattedData;
  window.facetSearch.allAvailableKeys = ['category', 'type', 'tags', 'author', 'version', 'description'];
  window.facetSearch.visibleColumns = ['category', 'type', 'tags', 'author', 'description'];
  ```
- **Identified Gap:**
  - `allAvailableKeys` and `visibleColumns` are hardcoded to old attributes.
  - If `templates-index.json` contains taxonomy under `item.community`, `flatMeta` needs to unpack `item.community` to top-level keys.

### 2.2 Current Implementation in `src/js/facetSearch.js`
- **State Property:** `isTemplateHub` (boolean, set to `true` by `openTemplateHub`).
- **Facet Calculation:** `getAvailableFacets(filteredData)` (lines 383–449):
  - Iterates over all keys in each item's `flatMeta`.
  - Supports string, number, boolean, and arrays (e.g. `tags: ["Confocal", "Live-cell"]` correctly expands into individual tag chips).
  - Calculates frequencies and sorts values by count descending.
- **Sidebar Rendering:** `renderSidebar(facets)` (lines 500–660):
  - Uses `_getCategoryForKey(key)` to group keys into accordion headers.
  - Generates `.facet-chip` elements with value and count badges.
  - Clicking toggles active filters in `facetSearch.activeFilters[key]`.
- **Category Grouping (`_getCategoryForKey`):**
  - Line 463:
    - Currently only recognizes `OME.*`, `File.*`, `integrations.*`, `System.*`, and `Project.*`/`Sample.*`/`ISA.*`.
    - Community keys (`collection`, `system`, `discipline`, `organism`, `tags`) all fall into `'📋 Metadata Fields'`.
    - To match `COMMUNITY_TEMPLATES_PLAN.md` Section 7, `_getCategoryForKey` should group community taxonomy keys into distinct categories:
      - `collection` -> `📁 Collections`
      - `system` -> `🔬 System / Device`
      - `discipline` -> `🧬 Discipline`
      - `organism` -> `🌱 Biological Model`
      - `tags` -> `🏷️ Tags`
- **Table Columns (`_buildColumns`):**
  - Lines 921–1045:
    - Base columns: `Name` (frozen), `Path`, `Created`.
    - Dynamic columns: Created for each key in `allAvailableKeys`, visible if in `visibleColumns`.
    - Actions column: If `isTemplateHub` is true, displays `👁️ Preview` button (`.facet-act-preview`).
- **Preview Modal (`showTemplatePreview`):**
  - Lines 1222–1320:
    - Slides out a right drawer (`#facetTemplatePreviewModal`).
    - Fetches the individual template JSON using `repoPath`.
    - Displays template name, description, fields, and an `📥 Install Template` button that calls `window.app.downloadAndInstallTemplate(repoPath)`.

### 2.3 `downloadAndInstallTemplate` Analysis
- **Location:** `src/js/app.js` lines 479–534.
- **Current Flow:**
  1. Computes URL from `baseUrl` and `repoPath`.
  2. Fetches template JSON.
  3. Determines user context via `window.storage.getCurrentUserContext()` or `window.userManager`.
  4. Strips `templateData._fileInfo`.
  5. Sets `originalCreator`, `originalGroup`, `id = 'template_' + Date.now() + ...`, `savedLocally = true`.
  6. Calls `window.electronAPI.saveTemplateToFile(templateData, userInfo)`.
  7. On success, calls `window.templateManager.refreshFromFiles()` and `this.showSuccess()`.
- **Evaluated Correctness & Needed Refinements:**
  - `cleanTemplateForFileStorage` in `main.js` (line 749) correctly preserves the root `community` object.
  - Potential collision check: If a template with `templateData.name` already exists in `templateManager.templates`, it should either append ` (Community)` or prompt/overwrite gracefully rather than failing or creating ambiguity.
  - Template category defaulting: ensure `templateData.category = templateData.category || 'category1'`.

### 2.4 CSS Selection Highlight
- **File:** `src/css/facetSearch.css`.
- **Finding:** While row hover (`.tabulator-row:hover`) is styled with `rgba(139, 92, 246, 0.18)`, there is **no rule for `.tabulator-row.tabulator-selected`**.
- **Required addition:**
  ```css
  .tabulator .tabulator-tableholder .tabulator-table .tabulator-row.tabulator-selected {
      background-color: rgba(124, 58, 237, 0.35) !important;
      border-left: 3px solid #a855f7 !important;
      color: #ffffff !important;
  }
  ```

---

## 3. Test Infrastructure Investigation

### 3.1 Project Layout & Package Structure
- **Package Manifest:** `src/package.json` (MetaFold does not use a root-level `package.json`).
- **Installed Tooling:**
  - `dependencies`: `{}`
  - `devDependencies`:
    - `"electron": "^38.2.2"`
    - `"electron-builder": "^26.0.12"`
  - `scripts`: Only contains lifecycle and builder commands (`start`, `dev`, `build`, `dist`, `build-win`, `build-mac`, `build-linux`).
  - **No test script** (`npm test` does not exist).
- **Environment:**
  - Node.js `v22.16.0` and npm `10.9.2` are installed on the development machine.
  - `node_modules` is not currently present in `src/` or workspace root.

### 3.2 Existing Test Assets
- A scan of the entire repository confirms:
  - **No test suites, unit tests, or test frameworks exist.**
  - No `tests/`, `test/`, `spec/`, or `__tests__/` directory.
  - Files with `test` in their name are limited to backup integration scripts (`metaFoldOMEROIntegration_latest.js`) and sample template JSON (`templates/zeiss_lsm980_rdm4mic_import_test.json`).
- GitHub Actions CI (`.github/workflows/release.yml`):
  - Matrix builds for Ubuntu, Windows, and macOS.
  - Executes `npm ci` followed by `npx electron-builder`.
  - Does not execute any test suite or linting step.

### 3.3 Recommended Testing Strategy
1. **Unit Tests (Taxonomy, Serialization, URL generation):**
   - Since Node.js v22.16.0 is available, tests can be executed natively using Node's built-in test runner:
     ```powershell
     node --test test/**/*.test.js
     ```
   - No external testing dependencies are strictly required to verify:
     - Community metadata serialization/deserialization.
     - Clean separation (ensuring `community` is stripped from README generation).
     - GitHub Issue title and body markdown formatting.
     - FacetSearch flattening and key extraction logic.
2. **End-to-End & Acceptance Verification:**
   - As established in `ORIGINAL_REQUEST.md`:
     > "Verification Mechanism: Agent-as-Judge  
     > The implementing team must use an independent agent to verify the following criteria by inspecting the code, DOM structures, and generated JSON structures."
   - Verification agent checks:
     - Tab DOM structure in `template-modal.html` and `upload-template-modal.html`.
     - Presence of `<datalist>` elements for `system`, `discipline`, `organism`.
     - Output JSON from template save containing root-level `community` object.
     - Issue generation URL parameters.
     - Facet search keys in `app.js` and chip rendering in `facetSearch.js`.

---

## 4. Key Cross-Module Dependency Matrix

| Phase | Target Module | File Paths | Key Interdependencies |
|---|---|---|---|
| **Phase 1** | Template Editor UI | `src/components/modals/template-modal.html`, `src/js/templateModal.js` | Must serialize `community` object at root. Must not leak `community` into `metadata.fields`. |
| **Phase 2** | Upload Workflow | `src/components/modals/upload-template-modal.html`, `src/js/uploadModal.js`, `src/main.js`, `src/components/panels/slide-out-panel.html` | Reads `template.community` populated in Phase 1. Saves back to template file via `storage.js` / `electronAPI`. Formats GitHub Issue URL and opens via `electronAPI.openExternal`. |
| **Phase 3** | Hub & Facet Search | `src/js/app.js`, `src/js/facetSearch.js`, `src/css/facetSearch.css` | `app.js:openTemplateHub` configures `allAvailableKeys` and `visibleColumns` (`collection`, `system`, `discipline`, `organism`, `tags`, etc.). `facetSearch.js` categorizes keys and renders filter chips. `downloadAndInstallTemplate` saves local template copy. |
| **Cross-cutting** | Readme Generation & Export | `src/main.js` (lines 4405–4410), `src/js/projectManager.js` | Must explicitly ignore the `community` key so community metadata never appears in `README.html` or project JSON exports. |

---

## 5. Concrete Action Items for Implementers

1. **Phase 2 Implementation:**
   - Create `src/components/modals/upload-template-modal.html` with 2-step layout, datalists, and local sync checkbox.
   - Create `src/js/uploadModal.js` with template selection, tag pre-population, validation, sync-back logic, and GitHub Issue URL construction.
   - Inject modal into `src/index.html` and `src/js/init_components.js`.
   - Update `src/main.js` to trigger `window.uploadModal.show()`.
   - Add trigger in `src/components/panels/slide-out-panel.html`.

2. **Phase 3 Implementation:**
   - Update `openTemplateHub` in `src/js/app.js`:
     - Unpack `item.community` in flattener.
     - Set `allAvailableKeys = ['collection', 'system', 'discipline', 'organism', 'tags', 'author', 'version']`.
     - Set `visibleColumns = ['collection', 'system', 'discipline', 'organism', 'tags', 'author']`.
   - Update `_getCategoryForKey` in `src/js/facetSearch.js` to map community keys to clean sidebar group headers.
   - Add `.tabulator-row.tabulator-selected` styling in `src/css/facetSearch.css`.
   - In `downloadAndInstallTemplate` in `src/js/app.js`, preserve `templateData.community`, ensure category defaulting, and verify local reload.

3. **Protection / Separation:**
   - In `src/main.js` line 4407 (`generateReadmeHtmlWithMetadata`), add `key === 'community'` to the exclusion list.
