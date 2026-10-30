# Handoff Report: Template Editor UI & Community Taxonomy (Phase 1)

**Agent:** Survey Explorer UI (`teamwork_preview_explorer`)  
**Role:** Template UI Explorer  
**Working Directory:** `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_ui_1`  
**Handoff Type:** Hard (Task complete)  
**Deliverable Path:** `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_ui_1\report.md`

---

## 1. Observation

1. **`src/components/modals/template-modal.html:16–22`**:
   Currently, the modal contains two tabs where the first tab is "Structure":
   ```html
   <div id="experimentTab" class="tab-content">
       <div class="tabs">
           <div class="tab active" onclick="switchModalTab('structure')">Structure</div>
           <div class="tab" onclick="switchModalTab('metadata')">Metadata</div>
       </div>
       <div id="structureContent" class="tab-content active">
   ```
   Line 66: `<div id="metadataContent" class="tab-content">` is the second tab content.

2. **`src/js/templateModal.js:135–154`**:
   Tab switching logic is hardcoded to two tabs and uses positional child selectors:
   ```javascript
   switchTab(tabName) {
       document.querySelectorAll('#experimentTab .tab-content').forEach(content => {
           content.classList.remove('active');
       });
       document.querySelectorAll('#experimentTab .tab').forEach(tab => {
           tab.classList.remove('active');
       });

       if (tabName === 'structure') {
           document.getElementById('structureContent').classList.add('active');
           document.querySelector('#experimentTab .tab:first-child').classList.add('active');
       } else if (tabName === 'metadata') {
           document.getElementById('metadataContent').classList.add('active');
           document.querySelector('#experimentTab .tab:last-child').classList.add('active');
       }
   }
   ```
   In lines 7–33 (`show()`) and 36–63 (`openForEdit()`), `switchTab` is never invoked, so whatever tab was statically active in HTML or set previously remains active.

3. **`src/js/sidebarIntegration.js:662–667`**:
   External callers interact directly with the metadata tab via:
   ```javascript
   if (typeof window.switchModalTab === 'function') {
       window.switchModalTab('metadata');
   }
   ```

4. **`src/js/templateModal.js:336–365` & `725–736`**:
   The `save()` and `saveAsNewTemplate()` methods build the template JSON with `name`, `description`, `type`, `category`, `structure`, `createdBy`, `createdByGroup`, `createdAt`, `options` (lines 345–348), and `metadata` (lines 359–364):
   ```javascript
   if (type === 'experiment' && window.metadataEditor && window.metadataEditor.collectMetadata) {
       const metadata = window.metadataEditor.collectMetadata();
       if (metadata && Object.keys(metadata).length > 0) {
           template.metadata = metadata;
       }
   }
   ```
   No `community` object is collected, initialized, or saved.

5. **`src/js/metadataEditor.js:520–524`**:
   `metadataEditor.collectMetadata()` returns:
   ```javascript
   const enhancedMetadata = {
       fields: metadata,
       fieldOrder: fieldOrder,
       totalFields: fieldOrder.length
   };
   return enhancedMetadata;
   ```
   This confirms that template field definitions are stored under `template.metadata.fields`.

6. **`src/js/experimentForm.js:201, 791, 1019, 1250` & `src/js/projectManager.js:336–353`**:
   Project creation workflows exclusively consume `template.metadata.fields` through `experimentForm.collectData()`. `projectManager.js` writes only the output of `experimentForm.collectData()` to `ReadyToImport.json` and does not read or serialize `template.community`.

7. **`COMMUNITY_TEMPLATES_PLAN.md:70–133` & `ORIGINAL_REQUEST.md:18–20, 32–36`**:
   Requires Phase 1 to implement:
   - Metadata Fields as primary / default active tab.
   - Folder structure as a collapsible section (`<details>`).
   - "Community & Sharing" tab with `<datalist>` elements for `system` (18 options), `discipline` (15 options), `organism` (12 options), plus `tags`, `author`, `institution`, `orcid`, `version`, `license`.
   - Root-level serialization of `community` in template JSON.

---

## 2. Logic Chain

1. From **Observation 1**, "Structure" is currently tab 1 and statically marked active, while "Metadata" is tab 2. To satisfy Requirement R1 ("Make Metadata Fields the primary tab and default active tab"), the tab buttons in `template-modal.html` must be reordered so that `Metadata Fields` is the first element and given `class="tab active"`, and `#metadataContent` is given `class="tab-content active"`.
2. From **Observation 2**, `switchTab()` hardcodes `:first-child` for structure and `:last-child` for metadata, and `show()` / `openForEdit()` never explicitly activate a default tab. Therefore, replacing the tab structure requires rewriting `switchTab(tabName)` to select tabs by `data-tab` attribute or ID, and adding `this.switchTab('metadata')` inside `show()` and `openForEdit()`.
3. From **Observation 1 & 7**, moving the folder structure into an expandable `<details id="folderStructureDetails">` element inside `#metadataContent` frees up the top-level tab bar to host the new `[🌐 Community & Sharing]` tab (`#communityContent`), maintaining a 2-tab layout (`Metadata Fields` and `Community & Sharing`).
4. From **Observation 2 & 3**, to ensure backwards compatibility with any callers or users expecting `'structure'`, `switchTab('structure')` can be aliased to activate `'metadata'` and expand `#folderStructureDetails.open = true`.
5. From **Observation 4, 5, & 6**, `template.metadata` holds `{ fields, fieldOrder }`, which is consumed by the experiment form. By introducing `collectCommunityData()` in `templateModal.js` and assigning its result to `template.community`, the community taxonomy is stored cleanly at the root level, ensuring total isolation from `metadata.fields` and preventing any leakage into `README.html` or `ReadyToImport.json`.

---

## 3. Caveats

1. **Phase Scope:** This investigation is strictly scoped to Phase 1 (Template Editor UI, HTML templates, JavaScript modal controllers, CSS, and JSON serialization). Phase 2 (Upload Modal & GitHub Issue payload generation) and Phase 3 (Facet Search Hub column and filter updates) are handled in subsequent milestones.
2. **Browser `<datalist>` Rendering:** Standard HTML5 `<datalist>` dropdown styling is rendered natively by Chromium/Electron. Testing confirmed it allows both selecting predefined suggestions and typing custom free text without custom autocomplete libraries.
3. **No Automated Test Framework:** MetaFold currently does not contain a Jest/Mocha test runner in `package.json`. Verification of Phase 1 relies on DOM inspection, manual interaction in Electron, and JSON payload structural verification.

---

## 4. Conclusion

The Phase 1 Template Editor UI redesign is fully mapped and ready for implementation. The required modifications are isolated to two primary files:
1. `src/components/modals/template-modal.html`: Reorganizes tabs, nests folder structure into `<details>`, and adds `#communityContent` with 3 `<datalist>` taxonomies and sharing metadata fields.
2. `src/js/templateModal.js`: Modernizes `switchTab()`, enforces `'metadata'` default tab on open, adds `collectCommunityData()`, and handles serialization/deserialization of the root-level `community` object.

All specifications, code snippets, before-and-after diffs, and verification steps are fully detailed in `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_ui_1\report.md`.

---

## 5. Verification Method

Once implemented by the implementation agent, an independent verifier can verify Phase 1 using the following checks:

1. **DOM Inspection for Default Tab:**
   - Launch MetaFold: `npm start` in `src/`.
   - Open Template Editor (`templateModal.show()`).
   - Run in DevTools Console:
     ```javascript
     console.assert(document.getElementById('tabBtnMetadata').classList.contains('active'), 'Metadata tab button must be active');
     console.assert(document.getElementById('metadataContent').classList.contains('active'), 'Metadata content must be active');
     console.assert(!document.getElementById('communityContent').classList.contains('active'), 'Community content must not be active');
     ```
2. **DOM Inspection for Expandable Folder Structure:**
   - Inspect `#metadataContent details#folderStructureDetails`:
     ```javascript
     const details = document.getElementById('folderStructureDetails');
     console.assert(details !== null, 'folderStructureDetails must exist');
     console.assert(document.getElementById('experimentStructure') !== null, 'Folder structure textarea must be present');
     console.assert(document.getElementById('templateWriteFilesOnly') !== null, 'Write files only toggle must be present');
     ```
3. **Datalist Verification:**
   - Switch to Community tab: `window.switchModalTab('community')`.
   - Run in DevTools Console:
     ```javascript
     console.assert(document.querySelectorAll('#communitySystemList option').length === 18, 'System datalist must have 18 options');
     console.assert(document.querySelectorAll('#communityDisciplineList option').length === 15, 'Discipline datalist must have 15 options');
     console.assert(document.querySelectorAll('#communityOrganismList option').length === 12, 'Organism datalist must have 12 options');
     ```
4. **JSON Serialization Check:**
   - Fill in:
     - Name: `"Test Community Template"`
     - System: `"Microscopy (Confocal / 2-Photon)"`
     - Discipline: `"Plant Biology / Botany"`
     - Organism: `"Arabidopsis thaliana"`
     - Tags: `"Confocal, GFP, Live-cell"`
   - Trigger `save()`, inspect the saved template object from `templateManager.templates`:
     ```javascript
     const tpl = window.templateManager.templates.find(t => t.name === "Test Community Template");
     console.assert(typeof tpl.community === 'object', 'template.community must exist at root level');
     console.assert(tpl.community.system === 'Microscopy (Confocal / 2-Photon)', 'System must match');
     console.assert(Array.isArray(tpl.community.tags) && tpl.community.tags.length === 3, 'Tags must be an array of 3 items');
     console.assert(tpl.metadata !== undefined, 'Metadata object must exist separately');
     console.assert(tpl.community.laser_power === undefined, 'Community must not bleed into metadata');
     ```
5. **Project Creation Safety Check:**
   - Create a project with the test template.
   - Inspect output directory: verify `README.html` and `ReadyToImport.json` contain no `"community"` keys.
