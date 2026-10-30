# Handoff Report: Hub, Upload Workflow & Test Infrastructure

**Agent:** Hub and Test Explorer (`teamwork_preview_explorer`)  
**Working Directory:** `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_hub_1`  
**Handoff Type:** Hard (Task complete)  
**Report Artifact:** `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_hub_1\report.md`

---

## 1. Observation

1. **Upload Trigger & Existing Implementation:**
   - In `src/main.js` (lines 130–220), menu item `Templates -> Upload` sends `win.webContents.send('menu-action', 'upload-template')` and runs `win.webContents.executeJavaScript`:
     ```javascript
     const selectHtml = window.templateManager.templates.map((t, i) => 
         '<option value="' + i + '">' + t.name + ' (v' + (t.version || '1.0') + ')</option>'
     ).join('');
     ...
     const issueTitle = encodeURIComponent('New Template: ' + template.name);
     const issueBody = encodeURIComponent(
         '### New Community Template Submission\n\n' +
         '**Template Name:** ' + template.name + '\n' +
         '**Author:** ' + (template.createdBy || 'Unknown') + '\n' +
         '**Description:** ' + (template.description || '') + '\n\n' +
         '#### Template JSON\n' +
         'Please review the following template. Once approved, it will be added to the community repository.\n\n' +
         '```json\n' +
         jsonString + '\n' +
         '```'
     );
     const githubUrl = 'https://github.com/ThZobel/MetaFold-Templates/issues/new?title=' + issueTitle + '&body=' + issueBody;
     window.open(githubUrl, '_blank');
     ```
   - No taxonomy inputs (`system`, `discipline`, `organism`, `tags`) exist in this dialog.
   - No option exists to write tags back to the local template JSON file.
   - No UI trigger exists in the renderer DOM (e.g., inside `src/components/panels/slide-out-panel.html` or sidebar).

2. **Modal Architecture Pattern:**
   - In `src/components/modals/`: contains `template-modal.html`, `facet-search-modal.html`, `settings-modal.html`, `login-modal.html`, `omero-password-modal.html`.
   - In `src/index.html`: contains container elements such as `<div id="templateModal"></div>` and `<div id="facet-search-modal-container"></div>`.
   - In `src/js/init_components.js`: loads HTML templates using `window.componentLoader.load(targetId, filePath)`.
   - In `src/preload.js` (line 74): `openExternal: (url) => ipcRenderer.invoke('open-external', url)`.

3. **Facet Search & Template Hub Mapping:**
   - In `src/js/app.js` (lines 433–477):
     ```javascript
     window.facetSearch.allAvailableKeys = ['category', 'type', 'tags', 'author', 'version', 'description'];
     window.facetSearch.visibleColumns = ['category', 'type', 'tags', 'author', 'description'];
     ```
     The keys `collection`, `system`, `discipline`, and `organism` are completely missing.
   - In `src/js/facetSearch.js`:
     - Line 463 (`_getCategoryForKey`): Only parses `OME.*`, `File.*`, `integrations.*`, `System.*`, and `Project.*`/`Sample.*`/`ISA.*`. Community taxonomy keys fallback into `'📋 Metadata Fields'`.
     - Lines 966–977 (`_buildColumns`): Dynamically builds Tabulator columns for `allAvailableKeys`.
     - Lines 1004–1005: Actions column displays `👁️ Preview` button when `facetSearch.isTemplateHub === true`.
     - Lines 1222–1320: `showTemplatePreview(data)` opens drawer displaying details and an `📥 Install Template` button that calls `window.app.downloadAndInstallTemplate(repoPath)`.
   - In `src/css/facetSearch.css`: `.tabulator-row.tabulator-selected` is missing styling (only `:hover` is styled).

4. **Download & Install Template:**
   - In `src/js/app.js` (lines 479–534): `downloadAndInstallTemplate(repoPath)` fetches template JSON, strips `_fileInfo`, sets `originalCreator`, `originalGroup`, `id`, and `savedLocally = true`, then calls `window.electronAPI.saveTemplateToFile(templateData, userInfo)` and triggers `window.templateManager.refreshFromFiles()`.
   - In `src/main.js` (line 749): `cleanTemplateForFileStorage(template)` does not delete `community`.
   - In `src/main.js` (line 4407): `generateReadmeHtmlWithMetadata` skips `provenance`, `projectName`, `metafold_project_id`, `metafold_integration`, and `System.*`, but does not yet explicitly exclude `community`.

5. **Test Infrastructure:**
   - Root has no `package.json`.
   - `src/package.json` contains:
     - `devDependencies`: `"electron": "^38.2.2"`, `"electron-builder": "^26.0.12"`.
     - `dependencies`: `{}`.
     - `scripts`: `"start"`, `"dev"`, `"build"`, `"dist"`, `"build-win"`, `"build-mac"`, `"build-linux"`.
     - No test script (`npm test` does not exist).
     - No test runner (Jest, Vitest, Playwright, Mocha) is installed.
   - No test directories exist in the repository (`tests/`, `test/`, `spec/`, etc.).
   - `.github/workflows/release.yml` only runs `npm ci` and `npx electron-builder` without running any test command.
   - Node.js v22.16.0 and npm 10.9.2 are installed on the system.

---

## 2. Logic Chain

1. **Phase 2 (Upload Workflow):**
   - Observations 1 and 2 show that the current upload workflow is an ad-hoc inline script directly in `src/main.js` that bypasses MetaFold's modular component architecture (`src/components/modals/` + `init_components.js`).
   - Because it lacks taxonomy inputs, the user cannot categorize their template before upload.
   - Because it has no sync mechanism, local template copies remain unaware of community taxonomy tags entered during upload.
   - Therefore, a modular component `src/components/modals/upload-template-modal.html` and controller `src/js/uploadModal.js` must replace the inline script. The controller must pre-fill tags from `template.community` (or defaults), offer `<datalist>` dropdowns for `system`, `discipline`, `organism`, `tags`, provide an `[x] Update local template with these tags` checkbox that calls `storage.saveTemplateToFileImmediately`, format the expanded markdown issue body, and open GitHub via `electronAPI.openExternal`.

2. **Phase 3 (Hub & Facet Search):**
   - Observation 3 shows that `app.js` line 467 sets outdated keys on `facetSearch.allAvailableKeys`. As a result, Tabulator columns and filter chips for `collection`, `system`, `discipline`, and `organism` are not created.
   - Furthermore, `_getCategoryForKey` in `facetSearch.js` lumps all unfamiliar keys into `📋 Metadata Fields`. Adding category mapping for community taxonomy keys (`collection`, `system`, `discipline`, `organism`, `tags`) will group them into dedicated filter sections in the sidebar.
   - Observation 4 shows that `downloadAndInstallTemplate` is largely functional, but needs to preserve `community`, default `category = 'category1'`, and prevent collisions.
   - In `facetSearch.css`, adding `.tabulator-row.tabulator-selected` provides the required visual feedback when a row is selected.
   - In `main.js` line 4407, adding `key === 'community'` guarantees strict separation so community metadata is never emitted into generated `README.html`.

3. **Test Infrastructure:**
   - Observation 5 confirms that the repository has zero existing test runners, suites, or CI test steps.
   - Node 22 is present in the environment and includes native test support (`node --test`), which can execute unit tests without installing external test packages.
   - For UI and integration acceptance verification, the project relies on the "Agent-as-Judge" protocol as mandated in `ORIGINAL_REQUEST.md`.

---

## 3. Caveats

- **Network Access during Execution:** Remote requests to `https://raw.githubusercontent.com/ThZobel/MetaFold-Templates/...` require an active internet connection. In offline environments or test suites, mock data or a local fixture must be used.
- **Repository URL Configuration:** `templates.repository_url` can be overridden in user settings (`window.settingsManager`). Implementations should always check `settingsManager` before falling back to the default URL.
- **Node Dependencies in Workspace:** `node_modules` was not pre-installed in the workspace root or `src/`. Running tests requiring npm packages would require `npm install` inside `src/`.

---

## 4. Conclusion

The path forward for Phases 2 and 3 is well-defined:
1. **Phase 2 Upload Modal:** Replace the inline `executeJavaScript` in `src/main.js` with a proper component modal (`upload-template-modal.html` + `uploadModal.js`), support `<datalist>` taxonomy selection, local template tag updates, and expanded GitHub Issue generation.
2. **Phase 3 Hub & Facet Search:** Update `app.js` to configure `facetSearch.allAvailableKeys` and `visibleColumns` with `['collection', 'system', 'discipline', 'organism', 'tags', 'author', 'version']`, unpack `item.community` in the index flattener, map categories in `facetSearch.js`, style `.tabulator-row.tabulator-selected` in `facetSearch.css`, and add `community` to the `generateReadmeHtmlWithMetadata` skip list in `src/main.js`.
3. **Test Infrastructure:** Use `node --test` for standalone unit tests of data serialization/URL generation, and apply "Agent-as-Judge" inspection for DOM and modal behavior.

---

## 5. Verification Method

To independently verify these findings:
1. **Inspect Upload Script:**
   ```powershell
   Get-Content -Path .\src\main.js | Select-String "upload-template" -Context 0,25
   ```
2. **Inspect Template Hub Keys:**
   ```powershell
   Get-Content -Path .\src\js\app.js | Select-String "openTemplateHub" -Context 0,35
   ```
3. **Inspect FacetSearch Categories & Columns:**
   ```powershell
   Get-Content -Path .\src\js\facetSearch.js | Select-String "_getCategoryForKey" -Context 0,25
   ```
4. **Inspect Test Scripts & Tooling:**
   ```powershell
   Get-Content -Path .\src\package.json
   ```
   Confirm that `scripts.test` is absent and no test runner is configured.
