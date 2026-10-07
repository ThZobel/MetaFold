# Specification Mining Report: MetaFold Community Templates (Phases 1–3)

**Miner:** Community Spec Miner (`survey_spec_miner_1`)  
**Target Codebase:** MetaFold (`c:\Users\Thomas\Documents\GitHub\MetaFold`)  
**Date:** 2026-10-06  
**Status:** Completed Analysis  
**Authoritative Sources Inspected:**  
- `COMMUNITY_TEMPLATES_PLAN.md` (Blueprint Version 1.0)
- `ORIGINAL_REQUEST.md` (Phase 1–3 Requirements & Acceptance Criteria)
- `SESSION_HANDOVER.md` (Implementation Status & Bug Tracking)
- `src/components/modals/template-modal.html` (Existing Template Editor Modal DOM)
- `src/js/templateModal.js` (Existing Template Modal Controller)
- `src/main.js` (Electron Menu Actions, Script Injections, README HTML Generation)
- `src/js/app.js` (Hub Orchestration, Lifecycle Handlers, Template Download Logic)
- `src/js/facetSearch.js` (Facet Search Engine, Tabulator Integration, Preview Drawer)
- `src/css/facetSearch.css` (Tabulator Theme Overrides & Styling)
- `src/components/modals/facet-search-modal.html` (Facet Search Modal DOM)
- `src/js/templateManager.js` (Local Template Storage, CRUD, File Sync)
- `src/js/experimentForm.js` (Experiment Form Renderer & Field Consumption)
- `src/js/projectManager.js` (Project Creation, Dynamic Folder Processing, Metadata Export)
- `templates/all_fields_template.json` & `templates/zeiss_lsm980_rdm4mic_import_test.json` (Existing Schema References)

---

## 1. Executive Summary

The Community Templates initiative elevates MetaFold templates from isolated local JSON files into a collaborative ecosystem backed by a central GitHub repository (`ThZobel/MetaFold-Templates`). 
Phases 1 through 3 address the end-to-end user experience within MetaFold:
1. **Phase 1 (Editor UX & JSON Schema):** Inverts the tab priority in the Template Editor to make "Metadata Fields" the primary view, folds folder structure configuration into an unobtrusive collapsible section, introduces a new "Community & Sharing" tab powered by `<datalist>`-backed taxonomies, and serializes community classifications into a root-level `community` object strictly isolated from runtime experiment fields.
2. **Phase 2 (Upload Workflow):** Replaces the prototype single-select dialog with a dedicated 2-step modal triggered by "Upload to Community", allowing users to select an installed template, review/edit taxonomy tags, optionally sync changes back to their local template file, and open a pre-filled GitHub Issue containing formatted Markdown and sanitized JSON.
3. **Phase 3 (Hub & Facet Search Integration):** Expands the Tabulator-powered Facet Search Hub (`openTemplateHub`) to index, filter, and display the new taxonomy dimensions (`collection`, `system`, `discipline`, `organism`, `tags`, `author`, `version`), completes the download and local installation lifecycle (`downloadAndInstallTemplate`), and fixes selection styling for Tabulator rows.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Phase 1 (UI) | Tab Inversion & Default Activation | Reorder tabs in `template-modal.html` so `[📋 Metadata Fields]` is the default first active tab instead of `[Structure]`. | Modal open event (`show()`, `openForEdit()`). | Active tab: `#metadataContent`; active tab header: Metadata. | Defaults gracefully to metadata tab if tab id not specified. | `COMMUNITY_TEMPLATES_PLAN.md` § 4, `templateModal.js:135` |
| 2 | Phase 1 (UI) | Collapsible Folder Structure Section | Embed Folder Structure textarea (`#experimentStructure`) and execution switches into a collapsible `<details>` or accordion panel inside the Metadata tab. | User toggle on collapsible panel. | Expand/collapse folder structure inputs without obscuring field editor. | Renders in collapsed state by default; inputs retain values regardless of fold state. | `COMMUNITY_TEMPLATES_PLAN.md` § 4 |
| 3 | Phase 1 (UI) | Execution Mode Switches in Fold Panel | House "Write files only" (`#templateWriteFilesOnly`) and "Multiple folders" (`#templateMultipleFolders`) switches inside the collapsible section. | User checkbox toggle. | Boolean flags saved to `template.options`. | Defaults to `false` if unchecked. | `COMMUNITY_TEMPLATES_PLAN.md` § 4, `template-modal.html:24-45` |
| 4 | Phase 1 (UI) | "Community & Sharing" Tab | Create a new secondary tab `[🌐 Community & Sharing (Optional)]` with header text explaining its purpose for GitHub sharing. | Tab click (`switchModalTab('community')`). | Displays taxonomy inputs and publishing metadata. | Non-blocking; all community fields are strictly optional. | `COMMUNITY_TEMPLATES_PLAN.md` § 4, `ORIGINAL_REQUEST.md` R1 |
| 5 | Phase 1 (Taxonomy) | System/Device `<datalist>` Input | HTML5 `<input type="text" id="communitySystem" list="communitySystemList">` with 18 predefined instruments/devices plus arbitrary free text. | Selected datalist option or custom text string. | String stored in `community.system`. | Sanitizes input; empty value serialized as empty string or omitted. | `COMMUNITY_TEMPLATES_PLAN.md` § 3.A |
| 6 | Phase 1 (Taxonomy) | Discipline/Domain `<datalist>` Input | HTML5 `<input type="text" id="communityDiscipline" list="communityDisciplineList">` with 15 predefined scientific disciplines plus free text. | Selected datalist option or custom text string. | String stored in `community.discipline`. | Sanitizes input; empty value serialized as empty string or omitted. | `COMMUNITY_TEMPLATES_PLAN.md` § 3.B |
| 7 | Phase 1 (Taxonomy) | Model Organism `<datalist>` Input | HTML5 `<input type="text" id="communityOrganism" list="communityOrganismList">` with 12 model organisms/systems plus free text. | Selected datalist option or custom text string. | String stored in `community.organism`. | Sanitizes input; empty value serialized as empty string or omitted. | `COMMUNITY_TEMPLATES_PLAN.md` § 3.C |
| 8 | Phase 1 (Taxonomy) | Freeform Tags Input | Comma-separated text input `#communityTags` for keywords (e.g. `Confocal, GFP, Time-lapse`). | Comma-delimited string. | Array of trimmed strings `community.tags`. | Splitting strips empty entries and trims excess whitespace. | `COMMUNITY_TEMPLATES_PLAN.md` § 3.D |
| 9 | Phase 1 (Taxonomy) | Author, Institution & ORCID Fields | Text inputs for template authorship, pre-filled with active user from `userManager`/`profileManager`. | Text inputs (`#communityAuthor`, `#communityInstitution`, `#communityOrcid`). | Strings stored in `community.author`, `community.institution`, `community.orcid`. | Falls back to current logged-in user or "Unknown" if blank. | `COMMUNITY_TEMPLATES_PLAN.md` § 4 |
| 10 | Phase 1 (Taxonomy) | License Selector | Select or datalist input (`#communityLicense`) supporting CC-BY-4.0, MIT, CC0-1.0, Apache-2.0, GPL-3.0, CC-BY-SA-4.0. | Dropdown selection or text. | String stored in `community.license`. | Defaults to `CC-BY-4.0`. | `COMMUNITY_TEMPLATES_PLAN.md` § 4 |
| 11 | Phase 1 (Schema) | Root-Level `community` Object Serialization | `templateModal.save()` and `saveAsNew()` serialize community inputs into root-level `template.community`. | Input values from Community tab. | `template.community = { system, discipline, organism, tags, author, institution, orcid, version, license }`. | Placed at root level, completely separated from `template.metadata.fields`. | `COMMUNITY_TEMPLATES_PLAN.md` § 2, `ORIGINAL_REQUEST.md` R1 |
| 12 | Phase 1 (Data Flow) | Community Field Population on Edit | `templateModal.populateForm(template)` reads `template.community` and fills all inputs. | Existing template object. | Inputs populated; tags joined with `, `. | If `template.community` is absent, inputs reset to defaults without error. | `templateModal.js:102-122` |
| 13 | Phase 1 (Data Flow) | Community Field Reset on Clear | `templateModal.clearForm()` resets all community inputs and defaults author. | Clear event. | Empty fields; default author. | Safe null checks on all DOM elements. | `templateModal.js:81-99` |
| 14 | Phase 1 (Isolation) | Downstream Form Isolation | `experimentForm.js` consumes only `template.metadata.fields`, ignoring `template.community`. | Active template selection. | Experiment creation forms ignore community tags. | Experiment forms never display community taxonomy fields. | `COMMUNITY_TEMPLATES_PLAN.md` § 2, `experimentForm.js:782` |
| 15 | Phase 1 (Isolation) | Export & README Filter Isolation | `generateReadmeHtmlWithMetadata` and project JSON assemblers strip `community` key. | Project metadata object. | Generated `README.html` and `ReadyToImport.json` omit `community`. | Explicit key filtering prevents leakage into lab notebooks. | `COMMUNITY_TEMPLATES_PLAN.md` § 2, `main.js:4407` |
| 16 | Phase 2 (Workflow) | "Upload to Community" Menu Action | Electron menu action `Templates -> Upload to Community` dispatches `menu-action: upload-template`. | Menu item click. | Triggers 2-step upload modal in renderer. | If no templates installed, alerts user to create or import one first. | `main.js:130-140`, `COMMUNITY_TEMPLATES_PLAN.md` § 5 |
| 17 | Phase 2 (Modal) | Dedicated 2-Step Upload Modal | Dedicated modal dialog (`uploadTemplateModal`) replacing the inline `main.js` prompt. | `upload-template` menu action or UI button. | Renders template selector and taxonomy review form. | Closes cleanly on Cancel without modifying any files. | `COMMUNITY_TEMPLATES_PLAN.md` § 5, `ORIGINAL_REQUEST.md` R2 |
| 18 | Phase 2 (Modal) | Step 1: Template Selection Dropdown | `<select id="uploadTemplateSelect">` listing all locally available templates. | Change event on select element. | Automatically extracts and pre-populates Step 2 taxonomy inputs. | Disables Proceed button if no valid template selected. | `COMMUNITY_TEMPLATES_PLAN.md` § 5 |
| 19 | Phase 2 (Modal) | Step 2: Taxonomy Tag Review & Edit | Inputs for System, Discipline, Organism, Tags, Author in the upload dialog. | Pre-filled values or user edits. | Confirmed metadata payload for GitHub Issue. | Allows user to customize tags even if omitted during template creation. | `COMMUNITY_TEMPLATES_PLAN.md` § 5 |
| 20 | Phase 2 (Sync) | Local Template Synchronization Toggle | Checkbox `[x] Update local template with these tags`. | Checkbox state on confirmation. | Calls `templateManager.update()` to write updated community tags to disk. | If unchecked, local file remains untouched while Issue receives edited tags. | `COMMUNITY_TEMPLATES_PLAN.md` § 5 |
| 21 | Phase 2 (Sanitization) | Runtime Property Cleansing | Strip internal properties (`_fileInfo`, `id`, `savedLocally`, `storageType`, etc.) before export. | Local template object. | Clean template object ready for public sharing. | Prevents local file paths and internal IDs from leaking to GitHub. | `main.js:187-190`, `COMMUNITY_TEMPLATES_PLAN.md` § 5 |
| 22 | Phase 2 (Payload) | GitHub Issue URL Generation | Formats Markdown issue body and constructs URL to `ThZobel/MetaFold-Templates/issues/new`. | Template metadata + sanitized JSON string. | External browser opened with pre-filled title and body. | Safely encodes components with `encodeURIComponent()`. | `main.js:193-210`, `COMMUNITY_TEMPLATES_PLAN.md` § 5 |
| 23 | Phase 3 (Hub) | Dynamic Index Mapping | `openTemplateHub()` maps `templates-index.json` items into `facetSearch.masterData`. | Index JSON array from GitHub. | Objects with `_type: 'template_hub'`, `name`, `path`, `flatMeta`. | Throws user notification on network or HTTP failure. | `app.js:433-477`, `COMMUNITY_TEMPLATES_PLAN.md` § 7 |
| 24 | Phase 3 (Hub) | Taxonomy Key Registration | Sets `facetSearch.allAvailableKeys` to `['collection', 'system', 'discipline', 'organism', 'tags', 'author', 'version']`. | Hub initialization in `openTemplateHub`. | Columns and filters available for all taxonomy categories. | Previous hardcoded keys (`category`, `type`, `description`) replaced. | `COMMUNITY_TEMPLATES_PLAN.md` § 7, `app.js:467` |
| 25 | Phase 3 (Hub) | Default Visible Columns Configuration | Sets `facetSearch.visibleColumns` to `['collection', 'system', 'discipline', 'organism', 'tags', 'author']`. | Hub initialization in `openTemplateHub`. | Tabulator displays taxonomy columns on initial load. | Columns can still be customized via Columns dropdown. | `COMMUNITY_TEMPLATES_PLAN.md` § 7, `app.js:468` |
| 26 | Phase 3 (Hub) | Filter Sidebar Categorization | Categorize taxonomy keys under a dedicated category header in `facetSearch.js` (`_getCategoryForKey`). | Metadata key strings. | Clean categorization in sidebar with collapsible sections. | Prevents taxonomy keys from defaulting to generic project metadata. | `facetSearch.js:463-485`, `COMMUNITY_TEMPLATES_PLAN.md` § 7 |
| 27 | Phase 3 (Hub) | Array Facet Aggregation | `getAvailableFacets()` correctly iterates over arrays in `flatMeta.tags`. | Array of string tags per template. | Filter chip for each individual tag with accurate count. | Empty or duplicate tags ignored; cascading counts stay accurate. | `facetSearch.js:389-404` |
| 28 | Phase 3 (Hub) | Template Detail Drawer | Slide-out drawer (`showTemplatePreview`) renders full template details, options, fields, and folder tree. | Row selection or "👁️ Preview" click. | Slide-out panel populated from cached/fetched template JSON. | Displays error notice if template JSON download fails. | `facetSearch.js:1222-1339` |
| 29 | Phase 3 (Install) | Template Download & Local Installation | `downloadAndInstallTemplate(repoPath)` downloads RAW JSON, assigns user ownership, and saves to local disk. | Template relative repository path. | File saved via `electronAPI.saveTemplateToFile()`; `templateManager` refreshed. | Shows success toast; catches and alerts on network or disk error. | `app.js:479-534`, `SESSION_HANDOVER.md` § 2 |
| 30 | Phase 3 (Styling) | Tabulator Row Selection CSS | CSS rule in `facetSearch.css` highlighting `.tabulator-row.tabulator-selected` with purple accent and active border. | User clicks or navigates table rows. | Visual feedback of currently selected template. | Highlighting survives row re-rendering and odd/even zebra stripes. | `SESSION_HANDOVER.md` § 1, `facetSearch.css:54-70` |

---

## 3. Edge Cases & Behavioral Verification

| # | Feature | Input Condition | Observed / Required Behavior |
|---|---------|-----------------|-------------------------------|
| 1 | `populateForm` | Legacy template without `community` object (e.g. `all_fields_template.json`) | Form initializes smoothly: System, Discipline, Organism, Tags, Institution, ORCID are empty; Author defaults to current user; License defaults to `CC-BY-4.0`. No `null` reference errors. |
| 2 | `save` | Template created with blank Community tab | `community` object is either omitted or serializes clean defaults without corrupting `metadata.fields`. `template.type` correctly defaults based on presence of form fields. |
| 3 | `tags` input | User enters commas, leading/trailing whitespace, and empty tokens: `",  Confocal , , GFP , Live-cell , "` | Token parser splits on `,`, trims each token, filters out empty tokens `""`, and serializes clean array `["Confocal", "GFP", "Live-cell"]`. |
| 4 | `tags` population | Template contains `tags` as string instead of array: `"Confocal, GFP"` | Display logic handles both array (`tags.join(', ')`) and string (`tags`) gracefully when populating input. |
| 5 | Special characters | Tags or Organism containing special characters: `CO₂, SEM/TEM, CC-BY-4.0, "Live" Cell` | HTML encoding preserves display; URI encoding (`encodeURIComponent`) ensures GitHub Issue URL remains valid without truncation. |
| 6 | Folder structure toggle | User creates metadata-only template and never expands folder structure panel | Folder structure string remains `""`; `options.writeFilesOnly` and `options.multipleFolders` default to `false`. |
| 7 | Legacy `switchModalTab` | External caller or test script executes `switchModalTab('structure')` | Modal controller redirects to `'metadata'` and expands the folder structure collapsible section, avoiding blank modal content. |
| 8 | Upload Modal Cancel | User opens Upload Modal, edits tags, then clicks "Cancel" or hits Escape | Modal closes; local template is NOT modified; no GitHub Issue is launched. |
| 9 | Upload Modal No Sync | User edits tags in Upload Modal but unchecks "Update local template" | GitHub Issue contains the edited tags and payload, but local template JSON on disk retains original values. |
| 10 | Internal Property Bleed | Template in memory has `_fileInfo.filePath = "C:\Users\..."`, `id = "template_123"`, `savedLocally = true` | Export sanitization strictly deletes `_fileInfo`, `id`, `savedLocally`, `storageType`, `userDisplayName` before generating JSON payload. |
| 11 | Large Template Payload | Template JSON exceeds typical URL length limits (>4KB) | URL encoding generates complete query string. System uses `window.electronAPI.openExternal(url)` to let OS browser handle URL. Markdown code block handles backtick escaping. |
| 12 | Hub Offline / Network Error | MetaFold opened without internet connection; user opens Template Hub | `fetch(repoUrl)` fails; error is caught; `app.showError('Failed to load templates: ...')` displayed; UI does not freeze. |
| 13 | Index Missing Fields | Template in `templates-index.json` lacks `system` or `organism` key | `flatMeta[key]` is `undefined`; Tabulator displays empty cell `""`; sidebar groups count occurrences without throwing error. |
| 14 | Name Collision on Install | Downloaded template has same name as an existing local template | Unique ID is generated (`Date.now()`); `saveTemplateToFile` handles versioning/naming per storage engine rules; `templateManager` refreshes. |
| 15 | Lab Notebook Pollution | Experiment project created from template containing `community` object | `experimentForm.js` collects only `metadata.fields`; `projectManager.js` writes only form metadata to `ReadyToImport.json`; `generateReadmeHtmlWithMetadata` ignores `community`. |

---

## 4. Phase 1: Template Editor UI Redesign Deep-Dive

### 4.1 DOM Architecture (`src/components/modals/template-modal.html`)
The existing template modal has two sibling tabs:
```html
<div class="tabs">
    <div class="tab active" onclick="switchModalTab('structure')">Structure</div>
    <div class="tab" onclick="switchModalTab('metadata')">Metadata</div>
</div>
```
Under the redesign, the tab order and naming change to:
```html
<div class="tabs">
    <div class="tab active" onclick="switchModalTab('metadata')">📋 Metadata Fields</div>
    <div class="tab" onclick="switchModalTab('community')">🌐 Community & Sharing</div>
</div>
```

Inside `#metadataContent` (the primary active tab):
1. **Field Management Toolbar:** Buttons `+ Add Field`, `📂 Load JSON`, and Knowledge Graph Lineage anchors (`🔑 Add Lineage ID`, `🔗 Add 'Derived From'`).
2. **Field Editor Container:** `<div id="metadataFields"></div>`.
3. **Collapsible Folder Structure Section:** An expandable `<details>` element or accordion placed cleanly beneath or above the fields container:
```html
<details id="folderStructureDetails" style="margin-top: 15px; border: 1px solid #404040; border-radius: 8px; background: #252526; padding: 10px;">
    <summary style="cursor: pointer; font-weight: 600; color: #a855f7; user-select: none;">
        📁 Folder Structure & Execution Mode (Optional)
    </summary>
    <div style="margin-top: 12px;">
        <div class="form-group" style="padding: 12px; background: #2d2d2d; border-radius: 6px; margin-bottom: 12px; border: 1px solid #404040;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <div>
                    <strong style="display: block; margin-bottom: 4px;">Write files only (Flag-File)</strong>
                    <span style="font-size: 0.85em; color: #9ca3af;">These files are not treated as a Project with metadata</span>
                </div>
                <label class="switch">
                    <input type="checkbox" id="templateWriteFilesOnly">
                    <span class="slider round"></span>
                </label>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <strong style="display: block; margin-bottom: 4px;">Multiple folders (Batch mode)</strong>
                    <span style="font-size: 0.85em; color: #9ca3af;">Select existing folders to write to (disables Project Name)</span>
                </div>
                <label class="switch">
                    <input type="checkbox" id="templateMultipleFolders">
                    <span class="slider round"></span>
                </label>
            </div>
        </div>
        <div class="form-group">
            <label for="experimentStructure">Folder Structure (optional):</label>
            <textarea id="experimentStructure" rows="6" placeholder="data/&#10;  raw/&#10;  processed/&#10;analysis/&#10;README.md"></textarea>
            <small style="color: #6b7280; margin-top: 5px; display: block;">
                💡 Tip: End lines with <code>/</code> for folders. Use 2 spaces indentation for subfolders.
            </small>
        </div>
    </div>
</details>
```

Inside `#communityContent` (the new secondary tab):
```html
<div id="communityContent" class="tab-content" style="display: none;">
    <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <h3 style="margin: 0 0 5px 0; color: #a855f7;">Publishing & Community Hub Metadata</h3>
        <p style="margin: 0; font-size: 0.85em; color: #9ca3af;">These optional metadata attributes classify your template when publishing to the community repository or searching in the Hub.</p>
    </div>

    <div class="form-group">
        <label for="communitySystem">System / Device:</label>
        <input type="text" id="communitySystem" list="communitySystemList" placeholder="e.g. Microscopy (Confocal / 2-Photon)">
        <datalist id="communitySystemList">
            <!-- 18 predefined device suggestions -->
        </datalist>
    </div>

    <div class="form-group">
        <label for="communityDiscipline">Discipline / Domain:</label>
        <input type="text" id="communityDiscipline" list="communityDisciplineList" placeholder="e.g. Plant Biology / Botany">
        <datalist id="communityDisciplineList">
            <!-- 15 predefined discipline suggestions -->
        </datalist>
    </div>

    <div class="form-group">
        <label for="communityOrganism">Biological System / Model Organism:</label>
        <input type="text" id="communityOrganism" list="communityOrganismList" placeholder="e.g. Arabidopsis thaliana">
        <datalist id="communityOrganismList">
            <!-- 12 predefined organism suggestions -->
        </datalist>
    </div>

    <div class="form-group">
        <label for="communityTags">Keywords / Tags (comma-separated):</label>
        <input type="text" id="communityTags" placeholder="e.g. Confocal, Live-cell, GFP, Time-Lapse">
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
            <label for="communityAuthor">Author / Creator:</label>
            <input type="text" id="communityAuthor" placeholder="Your Name or Working Group">
        </div>
        <div class="form-group">
            <label for="communityInstitution">Institution / Group:</label>
            <input type="text" id="communityInstitution" placeholder="e.g. University of Münster">
        </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
            <label for="communityOrcid">ORCID (optional):</label>
            <input type="text" id="communityOrcid" placeholder="0000-0002-XXXX-XXXX">
        </div>
        <div class="form-group">
            <label for="communityLicense">License:</label>
            <select id="communityLicense">
                <option value="CC-BY-4.0" selected>CC-BY-4.0 (Recommended)</option>
                <option value="CC0-1.0">CC0-1.0 (Public Domain)</option>
                <option value="MIT">MIT License</option>
                <option value="Apache-2.0">Apache 2.0</option>
                <option value="GPL-3.0">GPL 3.0</option>
                <option value="CC-BY-SA-4.0">CC-BY-SA-4.0</option>
            </select>
        </div>
    </div>
</div>
```

---

### 4.2 Comprehensive Taxonomy Enumeration

#### System / Device (`system`)
1. `Microscopy (Light / Widefield)`
2. `Microscopy (Confocal / 2-Photon)`
3. `Microscopy (Super-Resolution / STED / SIM / STORM)`
4. `Microscopy (Light Sheet / SPIM)`
5. `Microscopy (Electron / SEM / TEM / Cryo-EM)`
6. `Plate Reader / Spectrophotometer`
7. `Flow Cytometer / FACS`
8. `Sequencer (NGS / Illumina / Nanopore / PacBio)`
9. `Mass Spectrometer (Proteomics / Metabolomics)`
10. `Chromatography (HPLC / FPLC / GC)`
11. `Wet Lab: PCR / qPCR / Thermal Cycler`
12. `Wet Lab: Staining / Histology / Immunofluorescence`
13. `Wet Lab: Sample Prep / Extraction / Purification`
14. `Wet Lab: Gel Imaging / Western Blot`
15. `Wet Lab: Cell Culture / Incubator / Bioreactor`
16. `Wet Lab: General Bench Protocol`
17. `Data Analysis / Bioimage Analysis`
18. `Hardware / 3D Printing / Prototyping`
*(Plus arbitrary free text)*

#### Discipline / Domain (`discipline`)
1. `Plant Biology / Botany`
2. `Cell Biology`
3. `Neuroscience`
4. `Developmental Biology`
5. `Microbiology / Bacteriology`
6. `Virology`
7. `Immunology`
8. `Molecular Biology & Genetics`
9. `Biochemistry & Structural Biology`
10. `Biophysics`
11. `Pharmacology & Toxicology`
12. `Ecology & Evolution`
13. `Material Science & Physics`
14. `Chemistry & Synthesis`
15. `Computer Science & Data Engineering`
*(Plus arbitrary free text)*

#### Biological System / Specimen (`organism`)
1. `Arabidopsis thaliana`
2. `Danio rerio`
3. `Mus musculus`
4. `Rattus norvegicus`
5. `Drosophila melanogaster`
6. `Caenorhabditis elegans`
7. `Homo sapiens / Human Cell Lines`
8. `Saccharomyces cerevisiae / Yeast`
9. `Escherichia coli / Bacteria`
10. `Viruses / Phages`
11. `Organoids / 3D Tissues`
12. `Non-biological / In vitro / Synthetic`
*(Plus arbitrary free text)*

---

### 4.3 Template JSON Schema Specification

The `community` block must live at root-level in the template JSON:
```json
{
  "name": "Leica Stellaris - Live Plant Imaging",
  "description": "Konfokales Imaging-Protokoll für Wurzelwachstum in Arabidopsis",
  "type": "experiment",
  "category": "category1",

  "community": {
    "system": "Microscopy (Confocal / 2-Photon)",
    "discipline": "Plant Biology / Botany",
    "organism": "Arabidopsis thaliana",
    "tags": ["Confocal", "Live-cell", "GFP", "Time-Lapse", "Root Growth"],
    "author": "Dr. Thomas Zobel",
    "institution": "University of Münster",
    "orcid": "0000-0002-XXXX-XXXX",
    "version": "1.0.0",
    "license": "CC-BY-4.0"
  },

  "options": {
    "writeFilesOnly": false,
    "multipleFolders": false
  },
  "structure": "raw/\nprocessed/\nanalysis/\n",
  "metadata": {
    "fields": {
      "laser_power": {
        "type": "number",
        "label": "Laser Power (%)"
      }
    }
  }
}
```

### 4.4 Data Flow & Controller Modifications (`src/js/templateModal.js`)
1. `switchTab(tabName)`:
   - Supports `'metadata'` and `'community'`.
   - Maps legacy `'structure'` argument to `'metadata'` and expands `#folderStructureDetails`.
2. `populateForm(template)`:
   - Reads `template.community || {}`.
   - Fills `#communitySystem`, `#communityDiscipline`, `#communityOrganism`.
   - Formats `tags`: `Array.isArray(template.community.tags) ? template.community.tags.join(', ') : (template.community.tags || '')`.
   - Fills `#communityAuthor` with `template.community.author || template.createdBy || window.userManager?.currentUser || ''`.
   - Fills `#communityInstitution`, `#communityOrcid`, `#communityLicense`.
3. `clearForm()`:
   - Resets all community input elements to empty strings.
   - Resets `#communityAuthor` to `window.userManager?.currentUser || ''`.
   - Resets `#communityLicense` to `'CC-BY-4.0'`.
   - Collapses `#folderStructureDetails`.
4. `save()` / `saveAsNew()`:
   - Extracts trimmed values from all Community tab inputs.
   - Parses tags: `tagsInput.split(',').map(s => s.trim()).filter(Boolean)`.
   - Builds `community` object.
   - Attaches `template.community = community;` at the root level of the template before calling `templateManager.add()` or `templateManager.update()`.

---

## 5. Phase 2: Upload Workflow Deep-Dive

### 5.1 Architecture & Invocation
1. **Menu Trigger:** 
   In `src/main.js`:
   ```javascript
   {
       label: 'Upload to Community',
       click: () => {
           const win = BrowserWindow.getFocusedWindow() || mainWindow;
           if (win) {
               win.webContents.send('menu-action', 'upload-template');
               win.webContents.executeJavaScript(`
                   if (window.app && typeof window.app.openUploadTemplateModal === 'function') {
                       window.app.openUploadTemplateModal();
                   }
               `).catch(err => console.error(err));
           }
       }
   }
   ```
2. **Renderer Dispatch:**
   In `src/js/app.js`: Listen for `'upload-template'` in `window.electronAPI.onMenuAction` and trigger `window.app.openUploadTemplateModal()`.

### 5.2 2-Step Modal Workflow Specification
```
[User triggers "Upload to Community"]
                │
                ▼
┌──────────────────────────────────────────────────────────────┐
│                  Upload Community Template                   │
├──────────────────────────────────────────────────────────────┤
│ 1. Select Template to Publish:                               │
│    [ Leica Stellaris - Live Plant Imaging (v1.0.0)        ▼] │
│                                                              │
│ 2. Classification & Community Tags (Review / Edit):          │
│    System / Device:   [ Microscopy (Confocal / 2-Photon)  ▼] │
│    Discipline:        [ Plant Biology / Botany            ▼] │
│    Biological System: [ Arabidopsis thaliana              ▼] │
│    Tags (comma-sep):  [ Confocal, Live-cell, GFP, Root     ] │
│    Author:            [ Dr. Thomas Zobel                   ] │
│    License:           [ CC-BY-4.0                         ▼] │
│                                                              │
│ [x] Update local template with these tags                    │
├──────────────────────────────────────────────────────────────┤
│                     [ Cancel ]   [ Continue to GitHub ]      │
└──────────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────┐
│ Browser opens GitHub Issue with pre-formatted Markdown:     │
│ - Metadata summary table / fields                            │
│ - Sanitized JSON codeblock for automated review              │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 Local Template Synchronization Logic
When the user clicks "Continue to GitHub":
1. Read the selected template index from `uploadTemplateSelect`.
2. Extract the updated community values from the modal inputs.
3. If the checkbox `#uploadSyncLocal` is checked:
   ```javascript
   const template = window.templateManager.templates[selectedIndex];
   template.community = {
       system: document.getElementById('uploadSystem').value.trim(),
       discipline: document.getElementById('uploadDiscipline').value.trim(),
       organism: document.getElementById('uploadOrganism').value.trim(),
       tags: document.getElementById('uploadTags').value.split(',').map(s => s.trim()).filter(Boolean),
       author: document.getElementById('uploadAuthor').value.trim(),
       license: document.getElementById('uploadLicense').value
   };
   await window.templateManager.update(selectedIndex, template);
   ```

### 5.4 Public Export Sanitization
Before formatting the JSON codeblock for GitHub, clean all internal desktop environment properties:
```javascript
const exportTemplate = JSON.parse(JSON.stringify(template));
delete exportTemplate._fileInfo;
delete exportTemplate.id;
delete exportTemplate.savedLocally;
delete exportTemplate.storageType;
delete exportTemplate.storageDisplay;
delete exportTemplate.storageIcon;
delete exportTemplate.userDisplayName;
delete exportTemplate.groupDisplayName;
```

### 5.5 GitHub Issue Payload Format
- **Issue Title:** `New Template: ${exportTemplate.name}`
- **Issue Body Markdown:**
```markdown
### New Community Template Submission

**Template Name:** ${exportTemplate.name}
**Author:** ${exportTemplate.community?.author || exportTemplate.createdBy || 'Unknown'}
**System / Device:** ${exportTemplate.community?.system || 'Not specified'}
**Discipline:** ${exportTemplate.community?.discipline || 'Not specified'}
**Biological System:** ${exportTemplate.community?.organism || 'Not specified'}
**Tags:** ${Array.isArray(exportTemplate.community?.tags) ? exportTemplate.community.tags.join(', ') : (exportTemplate.community?.tags || 'None')}
**License:** ${exportTemplate.community?.license || 'CC-BY-4.0'}

**Description:**
${exportTemplate.description || 'No description provided.'}

#### Template JSON
Please review the following template. Once approved, it will be added to the community repository.

```json
${JSON.stringify(exportTemplate, null, 2)}
```
```
- **Issue URL:** `https://github.com/ThZobel/MetaFold-Templates/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`
- **Browser Execution:** Trigger via `window.electronAPI?.openExternal(url) || window.open(url, '_blank')`.

---

## 6. Phase 3: Hub & Facet Search Integration Deep-Dive

### 6.1 Hub Orchestration (`src/js/app.js`)
In `openTemplateHub()`:
1. Fetch repository index from `https://raw.githubusercontent.com/ThZobel/MetaFold-Templates/main/templates-index.json`.
2. Format each index item:
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
   ```
3. Set taxonomy keys:
   ```javascript
   window.facetSearch.masterData = formattedData;
   window.facetSearch.allAvailableKeys = [
       'collection',
       'system', 
       'discipline', 
       'organism', 
       'tags', 
       'author', 
       'version'
   ];
   window.facetSearch.visibleColumns = [
       'collection',
       'system', 
       'discipline', 
       'organism', 
       'tags', 
       'author'
   ];
   ```
4. Render UI and open modal:
   ```javascript
   window.facetSearch.updateUI();
   window.facetSearch.openModal();
   ```

### 6.2 Facet Grouping & Sidebar Chip Presentation (`src/js/facetSearch.js`)
1. **Category Mapping (`_getCategoryForKey`):**
   When `this.isTemplateHub` is `true`:
   Group `collection`, `system`, `discipline`, `organism`, `tags`, `author`, `version` under `'🌐 Community Taxonomy'` (or separate distinct categories) rather than letting them fall through to generic project metadata.
2. **Display Order (`categoryOrder`):**
   Add `'🌐 Community Taxonomy'` to the top of `categoryOrder` so it is prominently displayed when browsing templates.
3. **Chip Generation (`renderSidebar`):**
   - For `collection`: `[NFDI4Bioimage (12)]`, `[RDM4Mic (8)]`, `[General (15)]`
   - For `system`: `[Microscopy (14)]`, `[Wet Lab: PCR (5)]`, `[Sequencer (3)]`
   - For `discipline`: `[Plant Biology (6)]`, `[Neuroscience (8)]`
   - For `organism`: `[Arabidopsis thaliana (4)]`, `[Danio rerio (3)]`
   - For `tags`: `[Confocal (9)]`, `[Live-cell (7)]`, `[GFP (5)]`
4. **Interactive Filtering:**
   Clicking any chip toggles the filter in `this.activeFilters[key]`, re-filters `masterData`, recalculates cascading counts in `getAvailableFacets()`, and updates the Tabulator table instantly.

### 6.3 Template Installation Logic (`downloadAndInstallTemplate`)
In `src/js/app.js`:
```javascript
async downloadAndInstallTemplate(repoPath) {
    try {
        const baseUrl = (window.settingsManager?.settings?.['templates.repository_url'])
                        || 'https://raw.githubusercontent.com/ThZobel/MetaFold-Templates/main/templates-index.json';
        const rawBaseUrl = baseUrl.replace('/templates-index.json', '');
        const url = `${rawBaseUrl}/${repoPath}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Could not download template: ' + response.statusText);
        
        const templateData = await response.json();
        
        // Clean file info and assign fresh local identity
        delete templateData._fileInfo;
        templateData.id = 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        templateData.savedLocally = true;
        
        const userInfo = (window.storage?.getCurrentUserContext && window.storage.getCurrentUserContext()) || {
            username: window.userManager?.currentUser || 'User',
            groupname: window.userManager?.currentGroup || 'Default'
        };
        templateData.originalCreator = userInfo.username;
        templateData.originalGroup = userInfo.groupname;
        
        if (window.electronAPI?.saveTemplateToFile) {
            const result = await window.electronAPI.saveTemplateToFile(templateData, userInfo);
            if (result.success) {
                this.showSuccess(`Template "${templateData.name}" installed successfully!`);
                if (window.templateManager) {
                    if (typeof window.templateManager.refreshFromFiles === 'function') {
                        await window.templateManager.refreshFromFiles();
                    } else {
                        window.templateManager.templates = await window.templateManager.loadTemplates();
                        window.templateManager.renderList();
                    }
                }
            } else {
                this.showError('Failed to install template: ' + result.error);
            }
        }
    } catch (error) {
        console.error('Download Error:', error);
        this.showError('Download failed: ' + error.message);
    }
}
```

### 6.4 Tabulator Row Selection CSS Highlighting (`src/css/facetSearch.css`)
In `src/css/facetSearch.css`, add explicit styles to overcome Tabulator's dark theme overrides:
```css
/* Selected Row in Facet Search / Template Hub */
.tabulator .tabulator-tableholder .tabulator-table .tabulator-row.tabulator-selected,
.tabulator .tabulator-tableholder .tabulator-table .tabulator-row.tabulator-row-odd.tabulator-selected,
.tabulator .tabulator-tableholder .tabulator-table .tabulator-row.tabulator-row-even.tabulator-selected {
    background-color: rgba(124, 58, 237, 0.45) !important;
    border-left: 3px solid #a855f7 !important;
    color: #ffffff !important;
}
```

---

## 7. Acceptance Criteria & Verification Matrix

| # | Acceptance Criterion | Verification Mechanism | Validation Method / Evidence |
|---|----------------------|------------------------|------------------------------|
| AC1 | Metadata Fields tab is default active tab | DOM inspection on modal open | Check that `.tab[onclick="switchModalTab('metadata')"]` has class `.active` and `#metadataContent` has class `.active` when `templateModal.show()` is called. |
| AC2 | Folder structure is collapsible inside Metadata tab | DOM hierarchy inspection | Verify `#experimentStructure` and toggle switches are enclosed inside `<details>` / `#folderStructureDetails` within `#metadataContent`. |
| AC3 | Community & Sharing tab exists with datalists | DOM & attribute inspection | Verify `<input id="communitySystem" list="communitySystemList">`, `#communityDisciplineList`, `#communityOrganismList` exist with 18, 15, and 12 options respectively. |
| AC4 | Template saving serializes root-level `community` object | JSON assertion | Call `templateModal.save()` or inspect saved JSON: verify `template.community` exists with keys `system`, `discipline`, `organism`, `tags`, `author`, `license`, and `metadata.fields` contains NO community keys. |
| AC5 | Upload action triggers custom 2-step modal | DOM & event inspection | Trigger `upload-template` menu action: verify modal dialog `#uploadTemplateModal` appears with template selector and taxonomy review fields. |
| AC6 | Local template tag synchronization toggle | State & persistence verification | In upload modal, modify tags, check "Update local template", proceed: verify local template file reflects edited tags. Repeat with checkbox unchecked: verify local template file is untouched. |
| AC7 | Public payload is sanitized of desktop runtime properties | String inspection | Verify generated GitHub Issue body JSON codeblock does NOT contain `_fileInfo`, `id`, `savedLocally`, or `storageType`. |
| AC8 | Issue URL correctly generated | URL structure verification | Inspect generated URL: verify target is `ThZobel/MetaFold-Templates/issues/new`, title starts with `New Template:`, and body contains Markdown table/fields + JSON block. |
| AC9 | Hub registers taxonomy keys in `allAvailableKeys` | Runtime property assertion | Open Template Hub (`openTemplateHub`): assert `window.facetSearch.allAvailableKeys` includes `'collection'`, `'system'`, `'discipline'`, `'organism'`, `'tags'`, `'author'`, `'version'`. |
| AC10 | Facet Search renders taxonomy filter chips | DOM inspection | In Template Hub modal, inspect `#facetGroupsContainer`: assert chips exist for System, Discipline, Organism, Tags, Collection with item counts. |
| AC11 | Template download & install creates local copy | File system & memory verification | In preview drawer, click "Install Template": verify template file is created in user's templates folder, `templateManager.templates` increments, and success notification appears. |
| AC12 | Tabulator selected row visually highlighted | CSS computed style inspection | Select any row in Template Hub table: assert `.tabulator-row.tabulator-selected` background is styled with purple accent (`rgba(124, 58, 237, 0.45)`). |

---

*Report prepared and delivered by `survey_spec_miner_1`.*
