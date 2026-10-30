# Dispatch: Worker Milestone 2 (Upload Workflow)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement Milestone 2: Upload Workflow (Features 11–17 in PROJECT.md).

## Write Ownership
You EXCLUSIVELY own and may modify:
- `src/components/modals/upload-template-modal.html` (CREATE)
- `src/js/uploadModal.js` (CREATE)
- `src/index.html` (add upload modal container element)
- `src/js/init_components.js` (register component loader for upload modal)
- `src/main.js` (update template upload menu action around line 130 to trigger `uploadModal.show()`)
- `src/components/panels/slide-out-panel.html` (wire/add upload template trigger)

## Technical Specifications
1. **Modal Component (`upload-template-modal.html`)**:
   - Modern, 2-step modal structure matching MetaFold theme and modal patterns.
   - Step 1: Select Template from local templates (`<select id="uploadTemplateSelect">`), Next button.
   - Step 2: Review / Edit Community Taxonomy:
     - Datalists for System (18 options), Discipline (15 options with literal `&`), Organism (12 options), License (6 options).
     - Form inputs for: System, Discipline, Organism, Tags, Author, Institution, ORCID, Version, License.
     - Checkbox: `[x] Update local template with these tags` (`#uploadSyncLocalCheckbox`, default checked or user-toggleable).
     - Buttons: Back (to step 1), Cancel, and "Submit to Community (GitHub Issue)" (`#btnSubmitUpload`).
2. **Controller (`uploadModal.js`)**:
   - Class `UploadModal`:
     - `show(templateIndex)`: Populates template select options from `window.templateManager.templates`. If `templateIndex` is passed, preselects it and advances to step 2.
     - `onTemplateSelected(index)`: Pre-fills step 2 taxonomy inputs from selected `template.community` (or template fields / settings author info).
     - `goToStep(step)`: Toggles display of Step 1 vs Step 2 containers.
     - `formatIssueBody(template, taxonomy)`:
       - Strips internal fields (`_fileInfo`, `id`, `savedLocally`).
       - Formats Markdown issue body containing template details, taxonomy metadata table, and clean ` ```json ... ``` ` block.
     - `submit()`:
       - If `#uploadSyncLocalCheckbox` is checked, updates `template.community` and persists to local file via `window.storage.saveTemplateToFileImmediately(template)` or `window.electronAPI.saveTemplateToFile`.
       - Formats GitHub Issue URL `https://github.com/ThZobel/MetaFold-Templates/issues/new?title=...&body=...`.
       - Opens URL using `window.electronAPI.openExternal(url)` (with fallback to `window.open(url, '_blank')`).
       - Closes modal and shows success notification.
     - Global instance `window.uploadModal = new UploadModal();`.
3. **Integration**:
   - `src/index.html`: Container `<div id="uploadTemplateModal"></div>` or `<div id="upload-template-modal-container"></div>`.
   - `src/js/init_components.js`: Register component loader so `upload-template-modal.html` is automatically loaded into the container.
   - `src/main.js`: Replace legacy inline script in template upload menu item with `win.webContents.send('menu-action', 'upload-template')` and in renderer listen to `upload-template` to call `window.uploadModal.show()`.
4. **Build & Test**:
   - Run Node syntax check: `node -c src/js/uploadModal.js`
   - Run relevant E2E tests for Features 11–17 in `tests/e2e/tier1_feature_coverage.test.js`.

## Required Reading
- ORIGINAL_REQUEST.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\PROJECT.md`
- COMMUNITY_TEMPLATES_PLAN.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\COMMUNITY_TEMPLATES_PLAN.md`
- Survey Hub Report: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_hub_1\report.md`

## Output
Write `report.md` and deliver `handoff.md` in `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\worker_m2`.
Notify parent via send_message.

## 2026-10-06T16:57:12Z
You are Worker Milestone 2 (teamwork_preview_worker) for MetaFold.
Working directory: c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\worker_m2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Read:
- ORIGINAL_REQUEST.md: c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\ORIGINAL_REQUEST.md
- DISPATCH.md: c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\worker_m2\DISPATCH.md
- PROJECT.md: c:\Users\Thomas\Documents\GitHub\MetaFold\PROJECT.md
- Survey Hub Report: c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_hub_1\report.md

You EXCLUSIVELY own and may modify:
- src/components/modals/upload-template-modal.html (CREATE)
- src/js/uploadModal.js (CREATE)
- src/index.html (add container for upload modal)
- src/js/init_components.js (register upload modal loader)
- src/main.js (update template upload menu action to trigger uploadModal.show())
- src/components/panels/slide-out-panel.html (wire upload template action)

Implement all specifications for Milestone 2: 2-step upload modal, taxonomy review/edit with datalists, local template tag sync, sanitized Markdown GitHub issue payload formatting.
Run syntax and test checks to verify your work.
Write report.md and handoff.md in your working directory, then notify parent via send_message.

