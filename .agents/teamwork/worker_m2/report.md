# Milestone 2 Implementation Report: Upload Workflow

**Worker:** Milestone 2 (`teamwork_preview_worker`)  
**Date:** 2026-10-06  
**Scope:** Features 11–17 of `PROJECT.md` & Phase 2 of `COMMUNITY_TEMPLATES_PLAN.md`

---

## 1. Executive Summary

Milestone 2 (Upload Workflow) has been fully implemented in strict adherence to all specifications in `DISPATCH.md`, `PROJECT.md`, `COMMUNITY_TEMPLATES_PLAN.md`, and the contract test suites in `tests/e2e/`.

The ad-hoc, inline DOM script embedded inside `src/main.js` has been eliminated in favor of a modern, modular 2-step component architecture integrated into MetaFold's dynamic component loader and UI panel system.

---

## 2. Files Modified & Created

### 2.1 `src/components/modals/upload-template-modal.html` (CREATED)
- **Container**: Dedicated `<div id="uploadTemplateModal" class="modal" style="display: none;">` matching the MetaFold modal styling.
- **Header**: Title `"Upload Community Template"`, informational subtitle, and close button `<span class="close" id="uploadCloseBtn">`.
- **Step 1 (Select Template)**:
  - `<div id="uploadStep1Section">` enclosing `<select id="uploadTemplateSelect">`.
  - Automatically populated with installed templates from `window.templateManager.templates`.
- **Step 2 (Classification & Community Tags Review/Edit)**:
  - `<div id="uploadStep2Section">` with clean card styling.
  - Curated `<datalist>` elements:
    - `#uploadSystemList`: Exactly 18 instrument/system options (`Microscopy (Confocal / 2-Photon)`, `Sequencer`, `Flow Cytometer`, etc.).
    - `#uploadDisciplineList`: Exactly 15 scientific disciplines containing literal `&` (`Plant Biology / Botany`, `Molecular Biology & Genetics`, etc.).
    - `#uploadOrganismList`: Exactly 12 model organisms (`Arabidopsis thaliana`, `Danio rerio`, `Mus musculus`, etc.).
    - `#uploadLicenseList`: 6 standard open licenses (`CC0-1.0`, `CC-BY-4.0`, `CC-BY-SA-4.0`, `MIT`, `Apache-2.0`, `Other`).
  - Inputs with attached datalists:
    - `#uploadSystem` (list `uploadSystemList`)
    - `#uploadDiscipline` (list `uploadDisciplineList`)
    - `#uploadOrganism` (list `uploadOrganismList`)
    - `#uploadTags` (comma-separated freeform tags)
    - `#uploadAuthor` (author name input)
    - `#uploadLicense` (select dropdown with standard license defaults)
    - Additional inputs for `#uploadInstitution`, `#uploadOrcid`, and `#uploadVersion`.
  - Local Synchronization Checkbox:
    - `<input type="checkbox" id="uploadSyncLocal" name="uploadSyncLocalCheckbox" checked>`
    - Default checked, allowing users to toggle synchronization back to their local template file.
- **Action Buttons**:
  - `#uploadBackBtn` (`onclick="window.uploadModal.goToStep(1)"`)
  - `#uploadNextBtn` (`onclick="window.uploadModal.goToStep(2)"`)
  - `#uploadCancelBtn` (`onclick="window.uploadModal.close()"`)
  - `#uploadConfirmBtn` (`data-id="btnSubmitUpload"`, `onclick="window.uploadModal.submit()"`) with label `"Continue to GitHub"`.

### 2.2 `src/js/uploadModal.js` (CREATED)
- **Controller Class**: `UploadModal`
  - `show(templateIndex = null)`:
    - Displays modal (`display = 'block'`).
    - Populates dropdown options with template names and versions (`${name} (v${version})`).
    - Handles empty template list gracefully with fallback warning without crashing.
    - Resolves target template index (defaults to current template or 0), preselects it, invokes `onTemplateSelected(targetIndex)`, and advances to Step 2.
  - `close()`: Hides modal (`display = 'none'`), idempotent.
  - `onTemplateSelected(index)`:
    - Safely validates template index bounds.
    - Pre-populates all Step 2 inputs from `template.community`.
    - Defaults Author to `template.createdBy` or active user (`userManager.currentUser`) if not defined.
    - Defaults License to `CC-BY-4.0` or existing template license.
  - `goToStep(step)`: Toggles display of `#uploadStep1Section` and `#uploadStep2Section` and adjusts footer button visibility.
  - `parseTags(rawTags)`: Splits comma-separated strings or arrays, trimming whitespace and filtering out empty elements.
  - `sanitizeTemplate(template)`:
    - Clones template object.
    - Strips internal runtime metadata: `_fileInfo`, `id`, `savedLocally`, `storageType`, `storageDisplay`, `storageIcon`, `userDisplayName`, `groupDisplayName`, `_uiState`, `_metafold`.
    - Preserves core properties (`name`, `description`, `type`, `category`, `structure`, `options`), `metadata.fields`, and `community`.
  - `formatIssueBody(template, taxonomy = {})`:
    - Generates standardized issue title: `New Template: <template.name>`.
    - Formats markdown body with taxonomy table (`**Template Name:**`, `**Author:**`, `**System / Device:**`, `**Discipline:**`, `**Biological System:**`, `**Tags:**`, `**License:**`), description, and fenced ````json ... ```` code block.
    - Encodes parameters into GitHub URL: `https://github.com/ThZobel/MetaFold-Templates/issues/new?title=...&body=...`.
    - Returns `{ title, body, url, sanitizedTemplate }`.
  - `submit()`:
    - Gathers edited taxonomy fields from DOM.
    - If `#uploadSyncLocal` is checked, updates `template.community` in memory and persists to disk via `window.storage.saveTemplateToFileImmediately(template)` or `window.electronAPI.saveTemplateToFile(template, userInfo)`.
    - Generates GitHub Issue payload.
    - Launches browser via `window.electronAPI.openExternal(url)` with fallback to `window.open(url, '_blank')`.
    - Closes modal and displays success notification.
- **Global & Menu Wiring**:
  - Instantiates global `window.uploadModal = new UploadModal()`.
  - Listens for `'upload-template'` menu action via `window.electronAPI.onMenuAction`.
  - Exposes `window.uploadCurrentTemplate()` helper for slide-out panel integration.
  - Exports for CommonJS / Node testing environments (`module.exports = { UploadModal, uploadModal }`).

### 2.3 `src/index.html` (MODIFIED)
- Added `<script src="js/uploadModal.js"></script>` to load the controller after `templateModal.js`.
- Added `<div id="upload-modal-container"></div>` container placeholder in the modal containers section.

### 2.4 `src/js/init_components.js` (MODIFIED)
- Registered dynamic loader:
  `await window.componentLoader.load('upload-modal-container', 'components/modals/upload-template-modal.html');`

### 2.5 `src/main.js` (MODIFIED)
- Replaced the 80-line inline DOM injection script in application menu item `Templates -> Upload` (line 130) with:
  ```javascript
  win.webContents.send('menu-action', 'upload-template');
  win.webContents.executeJavaScript(`
      if (window.uploadModal && typeof window.uploadModal.show === 'function') {
          window.uploadModal.show();
      }
  `).catch(err => console.error('executeJavaScript error:', err));
  ```

### 2.6 `src/components/panels/slide-out-panel.html` (MODIFIED)
- Added "Upload to Community" action button (`#uploadAction`) under Template Actions.
- Wired `onclick="uploadCurrentTemplate()"` which checks the currently selected template and calls `window.uploadModal.show(selectedIndex)`.
- Added script fallback implementation for `window.uploadCurrentTemplate`.

---

## 3. Feature Verification Matrix

| Feature | Description | Status | Verification Detail |
|---|---|---|---|
| **F11** | Upload Modal Component | PASSED | `#uploadTemplateModal`, header title, step 1 & 2 sections, cancel & confirm buttons |
| **F12** | Upload Step 1 Template Selection | PASSED | `#uploadTemplateSelect`, dynamic option list with versions, graceful empty handling |
| **F13** | Upload Step 2 Taxonomy Review | PASSED | Pre-population from `template.community`, 4 datalists (System: 18, Discipline: 15, Organism: 12, License: 6), Author default fallback |
| **F14** | Local Template Tag Sync | PASSED | `#uploadSyncLocal` checkbox (checked by default), persists tags to local file via storage save |
| **F15** | GitHub Issue Payload Formatting | PASSED | Title `New Template: <name>`, markdown taxonomy table, description, fenced json codeblock, URL encoding |
| **F16** | Payload Sanitization | PASSED | Strips `_fileInfo`, `id`, `savedLocally`, `storageType`, `userDisplayName`, etc. Preserves metadata fields and community block |
| **F17** | Upload Trigger Integration | PASSED | Application menu event sends `upload-template`, slide-out panel button `#uploadAction` triggers modal |

---

## 4. Conclusion

Milestone 2 implementation is complete, strictly scoped within the assigned file ownership boundaries, and fully verified against the contracts. Ready for Milestone 2 auditor and downstream Milestone 3 integration.
