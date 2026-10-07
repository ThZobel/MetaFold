# Handoff Report: Community Templates Spec Mining (Phases 1–3)

**Agent:** Community Spec Miner (`survey_spec_miner_1`)  
**Parent Agent:** `70f1e2cf-0ea3-4149-b78b-82fb8014c634`  
**Working Directory:** `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_spec_miner_1`  
**Handoff Type:** Hard (Task Complete)  

---

## 1. Observation

1. **`COMMUNITY_TEMPLATES_PLAN.md`**:
   - Lines 31–61: Defines the standard root-level `community` JSON object containing `system`, `discipline`, `organism`, `tags`, `author`, `institution`, `orcid`, `version`, `license`.
   - Lines 63–67: Mandates strict separation: `experimentForm.js`, `generateReadmeHtml`, and project assemblers must strictly ignore or filter out `community`.
   - Lines 70–133: Details the 4 categories for `<datalist>` inputs: 18 systems/devices, 15 disciplines, 12 model organisms, plus free text tags.
   - Lines 136–161: Specifies UI inversion for `template-modal.html`: Metadata Fields tab becomes primary, Folder Structure is embedded as a collapsible `<details>` section, and a new "Community & Sharing" tab is added.
   - Lines 164–201: Details the 2-step Upload Workflow dialog in MetaFold with template selection, taxonomy review/edit, optional local template sync, and pre-formatted GitHub Issue opening.
   - Lines 251–270: Specifies Facet Search keys for `openTemplateHub()`: `allAvailableKeys = ['collection', 'system', 'discipline', 'organism', 'tags', 'author', 'version']` and `visibleColumns = ['collection', 'system', 'discipline', 'organism', 'tags', 'author']`.
   - Lines 282–299: Implementation checklist for Phases 1–3.

2. **`ORIGINAL_REQUEST.md`**:
   - Requirements R1–R3 and Acceptance Criteria confirm the exact scope: Phase 1 (Editor UI redesign & `community` object), Phase 2 (2-step upload modal & GitHub Issue payload), Phase 3 (Hub & Facet Search integration & template installation).

3. **Existing Template Editor (`src/components/modals/template-modal.html` and `src/js/templateModal.js`)**:
   - `template-modal.html:17-20`: Currently orders tabs `[Structure]` followed by `[Metadata]`.
   - `template-modal.html:22-64`: Houses folder structure textarea and switches in `#structureContent` outside of the metadata tab.
   - `templateModal.js:102-122`: `populateForm` does not load or touch `template.community`.
   - `templateModal.js:336-366`: `save()` builds `template` without extracting community inputs or writing `template.community`.
   - `templateModal.js:725-744`: `saveAsNew()` also omits `community`.

4. **Upload Menu Action (`src/main.js:130-219`)**:
   - Menu item `Upload` sends `menu-action: upload-template` and executes inline JS creating a single-step dialog.
   - Lines 187–190: Strips `_fileInfo` and `id`, formats GitHub Issue Markdown body, and opens `https://github.com/ThZobel/MetaFold-Templates/issues/new`.
   - Does NOT yet support taxonomy review/edit or local template tag updating.

5. **Hub & Facet Search (`src/js/app.js`, `src/js/facetSearch.js`, `src/css/facetSearch.css`)**:
   - `app.js:467-468`: Currently configures old keys `['category', 'type', 'tags', 'author', 'version', 'description']`.
   - `app.js:479-534`: Contains drafted `downloadAndInstallTemplate` using `electronAPI.saveTemplateToFile` and refreshing `templateManager`.
   - `facetSearch.css:54-70`: Styles odd/even rows with `!important` backgrounds, but lacks `.tabulator-row.tabulator-selected` styling, causing selected row highlight to be invisible.
   - `SESSION_HANDOVER.md:30-41`: Confirms `.tabulator-row.tabulator-selected` styling and `downloadAndInstallTemplate` completion are known priorities.

6. **Downstream Isolation (`src/js/experimentForm.js:782-787` & `src/main.js:4405-4410`)**:
   - `experimentForm.js` consumes only `template.metadata.fields`.
   - `main.js:4407` strips internal fields (`provenance`, `metafold_project_id`, `System.*`); adding `community` ensures lab READMEs remain completely clean.

---

## 2. Logic Chain

1. **Phase 1 Tab Reorganization & Collapsible Section:**
   - In `template-modal.html`, placing `[📋 Metadata Fields]` first and adding `#folderStructureDetails` directly fulfills R1 and user workflow ergonomics where 80% of templates only need metadata.
   - Adding `<div id="communityContent">` with `<datalist>` elements provides standard suggestions while permitting free text.
   - Updating `templateModal.js` `switchTab()`, `populateForm()`, `clearForm()`, `save()`, and `saveAsNew()` ensures `template.community` is loaded and saved cleanly at the root level, preserving data integrity across edit cycles.

2. **Phase 2 Upload Workflow:**
   - Moving the upload modal logic from inline `main.js` execution to a structured renderer component provides access to full DOM templates, datalists, and `window.templateManager`.
   - Step 1 selects the template and auto-fills taxonomy inputs in Step 2.
   - The checkbox `[x] Update local template with these tags` allows updating the local file before publishing.
   - Deleting `_fileInfo`, `id`, `savedLocally`, and internal properties ensures clean public GitHub issues.

3. **Phase 3 Hub & Facet Search Integration:**
   - Setting `facetSearch.allAvailableKeys = ['collection', 'system', 'discipline', 'organism', 'tags', 'author', 'version']` and `visibleColumns = ['collection', 'system', 'discipline', 'organism', 'tags', 'author']` enables instant filtering by all taxonomy dimensions.
   - Categorizing taxonomy keys under a dedicated category header in `_getCategoryForKey()` ensures filter chips appear prominently in the sidebar.
   - Adding `.tabulator-row.tabulator-selected` in `facetSearch.css` guarantees visual selection feedback.
   - Invoking `downloadAndInstallTemplate()` and refreshing `templateManager` completes the installation loop.

---

## 3. Caveats

1. **GitHub Issue URL Length**: Extremely large templates (>4KB) with extensive metadata fields might produce lengthy URLs when encoded in `?body=`. While desktop browsers generally handle URLs up to 8KB–32KB, implementations should monitor URL generation.
2. **Offline Mode**: Browsing the Hub requires network connectivity to GitHub Raw. The UI must cleanly handle offline fetch failures without freezing.
3. No other caveats.

---

## 4. Conclusion

All specifications, taxonomy terms, JSON schemas, DOM layouts, data flows, and acceptance criteria for Phases 1–3 are fully probed, documented, and cross-referenced with existing MetaFold code.
The complete findings are delivered in `report.md`.

---

## 5. Verification Method

To verify these findings:
1. **Report Inspection:**
   Read `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_spec_miner_1\report.md`.
2. **Specification Cross-Check:**
   Compare the taxonomy lists and schema in `report.md` § 4.2–4.3 against `COMMUNITY_TEMPLATES_PLAN.md` § 2–3.
3. **DOM & Code Cross-Check:**
   - Inspect `src/components/modals/template-modal.html` lines 17–65 to confirm existing structure.
   - Inspect `src/js/templateModal.js` lines 102–122 and 336–366 to confirm absence of `community` logic.
   - Inspect `src/main.js` lines 130–215 to confirm prototype upload dialog.
   - Inspect `src/js/app.js` lines 467–468 to confirm existing hardcoded keys.
   - Inspect `src/css/facetSearch.css` lines 54–70 to confirm missing `.tabulator-row.tabulator-selected`.
