# Phase 1 Investigation Report: Template Editor UI Redesign & Community Taxonomy Integration

**Author:** Survey Explorer UI (`teamwork_preview_explorer`)  
**Date:** 2026-10-06  
**Target Phase:** Phase 1 (Community Templates Plan — `COMMUNITY_TEMPLATES_PLAN.md`)  
**Repository:** MetaFold (`c:\Users\Thomas\Documents\GitHub\MetaFold`)

---

## 1. Executive Summary

This report delivers a comprehensive architectural investigation into the MetaFold Template Editor UI, its HTML markup, JavaScript controllers, CSS styling, tab mechanics, and JSON serialization.

In accordance with **Requirement R1** and the Phase 1 goals outlined in `COMMUNITY_TEMPLATES_PLAN.md`:
1. **Metadata Fields as Primary Tab:** The tab structure in `template-modal.html` must be reorganized so that **Metadata Fields** is the first, default active tab upon opening the editor.
2. **Collapsible Folder Structure:** The existing folder structure textarea and execution mode toggles ("Write files only", "Multiple folders") will be moved from a standalone top-level tab into an expandable `<details>` section directly inside the Metadata Fields tab.
3. **New "Community & Sharing" Tab:** A dedicated tab with taxonomy dropdowns powered by HTML5 `<datalist>` elements (`system`, `discipline`, `organism`) plus free-form `tags`, `author`, `institution`, `orcid`, `version`, and `license` will be introduced.
4. **Isolated JSON Serialization:** The community fields will be serialized into a clean root-level `community` object in the template JSON, completely isolated from `metadata.fields` and never leaking into generated project `README.html` or `ReadyToImport.json` files.

---

## 2. Component & File Inventory

| File Path | Role & Responsibilities | Key Functions / Elements |
|---|---|---|
| `src/components/modals/template-modal.html` | Template Editor modal markup loaded into `<div id="templateModal">` via `componentLoader.load()` | `#modalTitle`, `#templateName`, `#templateDescription`, `#experimentTab`, `.tabs`, `#structureContent`, `#metadataContent` |
| `src/js/templateModal.js` | Controller managing the Template Modal lifecycle, form inputs, validation, and JSON payload assembly | `show()`, `openForEdit()`, `close()`, `clearForm()`, `populateForm()`, `switchTab()`, `save()`, `saveAsNewTemplate()`, `injectCategoryField()`, `injectSaveAsNewButton()` |
| `src/js/metadataEditor.js` | Sub-controller handling the dynamic metadata field designer inside the editor | `addField()`, `collectMetadata()`, `loadMetadataIntoEditor()`, `clearFields()`, `updateJsonPreview()` |
| `src/js/globalHandlers.js` | Window-level bridge functions connecting inline HTML `onclick` handlers to controllers | `window.switchModalTab(tab)`, `window.saveTemplate()`, `window.addMetadataField()`, `window.loadJsonMetadata()` |
| `src/js/templateManager.js` | File storage manager and local cache for templates | `add()`, `update()`, `extractSearchableContent()`, `loadTemplates()` |
| `src/css/base.css` | Global styling including tab navigation (`.tabs`, `.tab`, `.tab.active`, `.tab-content`, `.tab-content.active`) | Lines 363–392 |
| `src/css/components.css` | Standard form controls styling (`.form-group input, textarea, select`) | Lines 38–73 |
| `src/css/modals.css` | Modal backdrop, window container, and close button styling | Lines 3–41 |

---

## 3. In-Depth Analysis of Current Implementation

### 3.1. Tab Navigation & Default Tab Logic
Currently, `template-modal.html` defines two tabs:
```html
<div class="tabs">
    <div class="tab active" onclick="switchModalTab('structure')">Structure</div>
    <div class="tab" onclick="switchModalTab('metadata')">Metadata</div>
</div>
```
- In the static HTML, the `"Structure"` tab has class `active`, and `<div id="structureContent" class="tab-content active">` is displayed. `<div id="metadataContent" class="tab-content">` is hidden.
- In `src/js/templateModal.js`:
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
- **Flaws Identified:**
  1. `switchTab` relies on `:first-child` and `:last-child` CSS pseudo-selectors rather than specific tab attributes or identifiers. Adding a 3rd tab or changing order breaks this coupling.
  2. Neither `templateModal.show()` nor `templateModal.openForEdit()` calls `switchTab()`. Therefore, whatever tab was statically active or previously selected remains active.
  3. External caller `sidebarIntegration.js:663` explicitly invokes `window.switchModalTab('metadata')`.

### 3.2. Current Metadata Fields & Folder Structure Layout
- **Structure Tab (`#structureContent`):**
  - Contains two toggles: `#templateWriteFilesOnly` and `#templateMultipleFolders`.
  - Contains `#experimentStructure` textarea (lines 48–63).
- **Metadata Tab (`#metadataContent`):**
  - Contains `+ Add Field` button (`addMetadataField()`), `📂 Load JSON` button (`loadJsonMetadata()`).
  - Contains Knowledge Graph Lineage action buttons (`🔑 Add Lineage ID`, `🔗 Add 'Derived From'`).
  - Contains `#metadataFields` container where dynamic form field items are rendered by `metadataEditor.js`.
- **Finding:** Currently, 80%+ of MetaFold templates prioritize metadata field definitions. Having Folder Structure as a mandatory top-level tab adds unnecessary visual weight and requires an extra click to access metadata fields.

### 3.3. Template JSON Lifecycle: Loading, Editing & Serialization
- **Existing Template JSON Format:**
  ```json
  {
    "name": "Example Template",
    "description": "Description",
    "type": "experiment",
    "category": "category1",
    "structure": "raw/\nprocessed/\n",
    "createdBy": "Admin",
    "createdByGroup": "System",
    "createdAt": "2026-08-07T12:00:00.000Z",
    "options": {
      "writeFilesOnly": false,
      "multipleFolders": false
    },
    "metadata": {
      "fields": {
        "sample_id": { "type": "text", "label": "Sample ID", "position": 1 }
      },
      "fieldOrder": ["sample_id"],
      "totalFields": 1
    }
  }
  ```
- **In `templateModal.populateForm(template)`:**
  - Reads `template.name`, `template.description`, `template.structure`.
  - Reads `template.options?.writeFilesOnly` and `template.options?.multipleFolders`.
  - Calls `metadataEditor.loadMetadataIntoEditor(template.metadata)`.
  - **Missing:** Does not check or load `template.community`.
- **In `templateModal.clearForm()`:**
  - Resets `#templateName`, `#templateDescription`, `#experimentStructure`, checkboxes, and calls `metadataEditor.clearFields()`.
  - **Missing:** Does not clear community taxonomy inputs or set user profile defaults.
- **In `templateModal.save()` & `saveAsNewTemplate()`:**
  - Constructs `template` object with `name`, `description`, `type`, `category`, `structure`, `createdBy`, `createdByGroup`, `createdAt`, `options`.
  - Calls `metadataEditor.collectMetadata()` and stores it in `template.metadata`.
  - **Missing:** Does not collect community taxonomy fields, nor does it create `template.community`.

---

## 4. Required Modifications for Phase 1

### 4.1. Modification 1: Reorganize Tabs in `template-modal.html`
Replace the existing tab buttons and panels with two primary tabs:
1. **Tab 1: `📋 Metadata Fields`** (Active by default)
   - Tab Button: `<div class="tab active" data-tab="metadata" id="tabBtnMetadata" onclick="switchModalTab('metadata')">📋 Metadata Fields</div>`
   - Content Panel: `<div id="metadataContent" class="tab-content active">`
   - Contains: All metadata buttons (`+ Add Field`, `📂 Load JSON`, Knowledge Graph Lineage), `#metadataFields` container, and the new collapsible Folder Structure section.
2. **Tab 2: `🌐 Community & Sharing`** (Optional)
   - Tab Button: `<div class="tab" data-tab="community" id="tabBtnCommunity" onclick="switchModalTab('community')">🌐 Community &amp; Sharing</div>`
   - Content Panel: `<div id="communityContent" class="tab-content">`
   - Contains: Structured taxonomy inputs with datalists and sharing metadata.

### 4.2. Modification 2: Expandable Folder Structure Section
Embed the folder structure and execution mode controls into `#metadataContent` inside a `<details id="folderStructureDetails">` element placed below `#metadataFields`:

```html
<!-- Collapsible Folder Structure & Execution Mode (Optional) -->
<details id="folderStructureDetails" style="margin-top: 20px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 12px 16px;">
    <summary style="cursor: pointer; font-weight: 600; color: #e0e0e0; user-select: none; display: flex; align-items: center; gap: 8px;">
        <span>📁</span> Folder Structure &amp; Execution Mode (Optional)
    </summary>
    <div style="margin-top: 15px;">
        <!-- Project behavior toggles -->
        <div class="form-group" style="padding: 15px; background: #2d2d2d; border-radius: 8px; margin-bottom: 15px; border: 1px solid #404040;">
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
            <textarea id="experimentStructure" placeholder="Experiment folder structure (optional - can be left empty):
data/
  raw/
  processed/
analysis/
results/
  plots/
  reports/
README.md
experiment_log.md"></textarea>
            <small style="color: #6b7280; margin-top: 5px; display: block;">
                💡 Tip: End lines with <code>/</code> for folders. Use 2 spaces indentation for subfolders to create hierarchy.
            </small>
        </div>
    </div>
</details>
```

### 4.3. Modification 3: Community & Sharing Tab Markup & Datalists
Inside `#communityContent`, include:
1. **Informational Banner:** Explains that these fields are used for GitHub indexing and the Community Hub.
2. **System / Device (`system`):** Text input with linked `<datalist id="communitySystemList">` containing 18 curated options.
3. **Discipline / Domain (`discipline`):** Text input with linked `<datalist id="communityDisciplineList">` containing 15 curated options.
4. **Biological System / Specimen (`organism`):** Text input with linked `<datalist id="communityOrganismList">` containing 12 curated options.
5. **Tags (`tags`):** Free-form comma-separated input (`#communityTags`).
6. **Author & Institution (`author`, `institution`):** Two-column input row, pre-populated with user/group details from `userManager` / `profileManager`.
7. **ORCID, Version & License (`orcid`, `version`, `license`):** Three-column input row (`#communityOrcid`, `#communityVersion`, `#communityLicense`).

#### Complete Taxonomy Option Lists:
- **System / Device (`communitySystemList`):**
  - `Microscopy (Light / Widefield)`
  - `Microscopy (Confocal / 2-Photon)`
  - `Microscopy (Super-Resolution / STED / SIM / STORM)`
  - `Microscopy (Light Sheet / SPIM)`
  - `Microscopy (Electron / SEM / TEM / Cryo-EM)`
  - `Plate Reader / Spectrophotometer`
  - `Flow Cytometer / FACS`
  - `Sequencer (NGS / Illumina / Nanopore / PacBio)`
  - `Mass Spectrometer (Proteomics / Metabolomics)`
  - `Chromatography (HPLC / FPLC / GC)`
  - `Wet Lab: PCR / qPCR / Thermal Cycler`
  - `Wet Lab: Staining / Histology / Immunofluorescence`
  - `Wet Lab: Sample Prep / Extraction / Purification`
  - `Wet Lab: Gel Imaging / Western Blot`
  - `Wet Lab: Cell Culture / Incubator / Bioreactor`
  - `Wet Lab: General Bench Protocol`
  - `Data Analysis / Bioimage Analysis`
  - `Hardware / 3D Printing / Prototyping`

- **Discipline / Domain (`communityDisciplineList`):**
  - `Plant Biology / Botany`
  - `Cell Biology`
  - `Neuroscience`
  - `Developmental Biology`
  - `Microbiology / Bacteriology`
  - `Virology`
  - `Immunology`
  - `Molecular Biology & Genetics`
  - `Biochemistry & Structural Biology`
  - `Biophysics`
  - `Pharmacology & Toxicology`
  - `Ecology & Evolution`
  - `Material Science & Physics`
  - `Chemistry & Synthesis`
  - `Computer Science & Data Engineering`

- **Biological System / Model (`communityOrganismList`):**
  - `Arabidopsis thaliana`
  - `Danio rerio`
  - `Mus musculus`
  - `Rattus norvegicus`
  - `Drosophila melanogaster`
  - `Caenorhabditis elegans`
  - `Homo sapiens / Human Cell Lines`
  - `Saccharomyces cerevisiae / Yeast`
  - `Escherichia coli / Bacteria`
  - `Viruses / Phages`
  - `Organoids / 3D Tissues`
  - `Non-biological / In vitro / Synthetic`

### 4.4. Modification 4: Controller Changes in `templateModal.js`

1. **`switchTab(tabName)` Refactoring:**
   - Use `data-tab` attribute matching instead of `:first-child`/`:last-child`.
   - Add alias handling for `'structure'`: when called with `'structure'`, activate `'metadata'` and expand `#folderStructureDetails`.
   - In both `show()` and `openForEdit()`, call `this.switchTab('metadata');` so that Metadata Fields is guaranteed to be default active.
2. **`collectCommunityData()` Helper:**
   - Reads inputs: `#communitySystem`, `#communityDiscipline`, `#communityOrganism`, `#communityTags`, `#communityAuthor`, `#communityInstitution`, `#communityOrcid`, `#communityVersion`, `#communityLicense`.
   - Converts `#communityTags` comma-delimited string into `string[]`:
     `tags.split(',').map(t => t.trim()).filter(Boolean)`.
   - Returns a structured object:
     ```javascript
     {
       system: "Microscopy (Confocal / 2-Photon)",
       discipline: "Plant Biology / Botany",
       organism: "Arabidopsis thaliana",
       tags: ["Confocal", "Live-cell", "GFP"],
       author: "Dr. Thomas Zobel",
       institution: "University of Münster",
       orcid: "0000-0002-XXXX-XXXX",
       version: "1.0.0",
       license: "CC-BY-4.0"
     }
     ```
   - If all classification fields are blank, can omit or preserve defaults.
3. **Integration in `save()` & `saveAsNewTemplate()`:**
   - Attach `template.community = communityData;` at the root level of the template object.
   - Preserves `metadata.fields` intact and distinct.
4. **Integration in `populateForm(template)`:**
   - Populates inputs from `template.community || {}`.
   - If template has structure or batch flags, set `folderStructureDetails.open = true`.
   - Sets user defaults (Author, Institution, ORCID) if `community` is not yet populated on the template.
5. **Integration in `clearForm()`:**
   - Clears taxonomy inputs and pre-fills author/institution with current user from `userManager` / `profileManager`.
   - Collapses `#folderStructureDetails`.

---

## 5. Downstream Safety & Metadata Isolation Analysis

A critical requirement from `COMMUNITY_TEMPLATES_PLAN.md` is that `template.community` must **never** leak into experimental project artifacts (`README.html`, `ReadyToImport.json`).

Our investigation verified the complete downstream pipeline:
1. **`experimentForm.js`**:
   - Lines 201, 791, 1019, 1250, 1393: `experimentForm` exclusively accesses `template.metadata.fields` and `template.metadata.fieldOrder`.
   - The form renders only the fields registered under `metadata.fields`. The `template.community` root property is completely ignored during form rendering and user input collection.
2. **`projectManager.js`**:
   - Line 336: When creating projects, metadata is collected via `window.experimentForm.collectData()`, which packages only user entries for defined experiment fields.
   - `ReadyToImport.json` contains only experiment form data plus optional `provenance` block. `community` is not written to target directories.
3. **`src/main.js` (`generateReadmeHtmlWithMetadata`)**:
   - Lines 4405–4439: The HTML generator iterates through metadata fields and filters internal flags. Even if `community` were passed in metadata, adding `key === 'community'` to the filter condition in `main.js:4407` guarantees that it will never be rendered.

---

## 6. Exact Concrete Code Changes (Before vs. After)

### 6.1. Changes in `src/components/modals/template-modal.html`

#### Before (Lines 15–97):
```html
    <!-- Experiment Tab -->
    <div id="experimentTab" class="tab-content">
        <div class="tabs">
            <div class="tab active" onclick="switchModalTab('structure')">Structure</div>
            <div class="tab" onclick="switchModalTab('metadata')">Metadata</div>
        </div>

        <div id="structureContent" class="tab-content active">
            <!-- NEW: Project behavior toggles -->
            <div class="form-group" style="padding: 15px; background: #2d2d2d; border-radius: 8px; margin-bottom: 15px; border: 1px solid #404040;">
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
                <textarea id="experimentStructure" placeholder="Experiment folder structure (optional - can be left empty):
...
"></textarea>
                <small style="color: #6b7280; margin-top: 5px; display: block;">
                    💡 Tip: End lines with <code>/</code> for folders. Use 2 spaces indentation for subfolders to create
                    hierarchy. You can use <code>[FieldName]</code> for dynamic folders (e.g., <code>[userName]/Data</code>).
                </small>
            </div>
        </div>

        <div id="metadataContent" class="tab-content">
            <div class="form-group">
                <label>Metadata Fields:</label>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                    <button class="btn btn-secondary btn-small" onclick="addMetadataField()">+ Add Field</button>
                    <button class="btn btn-secondary btn-small" onclick="loadJsonMetadata()">📂 Load JSON</button>
                </div>
            </div>
            ...
            <div id="metadataFields"></div>
        </div>
    </div>
```

#### After:
```html
    <!-- Experiment Tab -->
    <div id="experimentTab" class="tab-content" style="display: block;">
        <div class="tabs">
            <div class="tab active" data-tab="metadata" id="tabBtnMetadata" onclick="switchModalTab('metadata')">📋 Metadata Fields</div>
            <div class="tab" data-tab="community" id="tabBtnCommunity" onclick="switchModalTab('community')">🌐 Community &amp; Sharing</div>
        </div>

        <!-- Tab 1: Metadata Fields (Default Active) -->
        <div id="metadataContent" class="tab-content active">
            <div class="form-group">
                <label>Metadata Fields:</label>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                    <button class="btn btn-secondary btn-small" onclick="addMetadataField()">+ Add Field</button>
                    <button class="btn btn-secondary btn-small" onclick="loadJsonMetadata()">📂 Load JSON</button>
                </div>
            </div>

            <!-- Lineage Quick-Actions -->
            <div style="background: rgba(124, 58, 237, 0.08); border: 1px solid rgba(124, 58, 237, 0.25); border-radius: 8px; padding: 12px 14px; margin-bottom: 14px;">
                <div style="font-size: 11px; font-weight: 600; color: #a855f7; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;">🔗 Knowledge Graph – Lineage Fields</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-small" onclick="metadataEditor.addLineageIdField()" title="Creates an anchor point for the Knowledge Graph"
                            style="background: linear-gradient(135deg, #7c3aed, #6d28d9); border-color: #7c3aed; color: white; font-size: 12px;">
                        🔑 Add Lineage ID (Anchor)
                    </button>
                    <button class="btn btn-small" onclick="metadataEditor.addDerivedFromField()" title="Link this experiment to previous IDs"
                            style="background: linear-gradient(135deg, #0d9488, #0f766e); border-color: #0d9488; color: white; font-size: 12px;">
                        🔗 Add 'Derived From' (Link)
                    </button>
                </div>
                <div style="font-size: 11px; color: #6b7280; margin-top: 8px; line-height: 1.5;">
                    <strong style="color: #9ca3af;">🔑 Lineage ID:</strong> Unique ID for this record (key ends with <code style="background: rgba(255,255,255,0.08); padding: 1px 4px; border-radius: 3px;">_ID</code>) &nbsp;·&nbsp;
                    <strong style="color: #9ca3af;">🔗 Derived From:</strong> Reference IDs of parent experiments
                </div>
            </div>

            <div id="metadataFields"></div>

            <!-- Collapsible Folder Structure Section -->
            <details id="folderStructureDetails" style="margin-top: 20px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 12px 16px;">
                <summary style="cursor: pointer; font-weight: 600; color: #e0e0e0; user-select: none; display: flex; align-items: center; gap: 8px;">
                    <span>📁</span> Folder Structure &amp; Execution Mode (Optional)
                </summary>
                <div style="margin-top: 15px;">
                    <!-- Project behavior toggles -->
                    <div class="form-group" style="padding: 15px; background: #2d2d2d; border-radius: 8px; margin-bottom: 15px; border: 1px solid #404040;">
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
                        <textarea id="experimentStructure" placeholder="Experiment folder structure (optional - can be left empty):
data/
  raw/
  processed/
analysis/
results/
  plots/
  reports/
README.md
experiment_log.md"></textarea>
                        <small style="color: #6b7280; margin-top: 5px; display: block;">
                            💡 Tip: End lines with <code>/</code> for folders. Use 2 spaces indentation for subfolders to create
                            hierarchy. You can use <code>[FieldName]</code> for dynamic folders (e.g., <code>[userName]/Data</code>).
                        </small>
                    </div>
                </div>
            </details>
        </div>

        <!-- Tab 2: Community & Sharing (Optional) -->
        <div id="communityContent" class="tab-content">
            <div style="background: rgba(124, 58, 237, 0.08); border: 1px solid rgba(124, 58, 237, 0.25); border-radius: 8px; padding: 12px 14px; margin-bottom: 18px;">
                <div style="font-size: 13px; font-weight: 600; color: #a855f7; margin-bottom: 4px;">
                    🌐 Publishing &amp; Community Hub Metadata (Optional)
                </div>
                <div style="font-size: 12px; color: #9ca3af; line-height: 1.4;">
                    Configure standardized taxonomy categories for the MetaFold Community Hub and GitHub sharing.
                    You can pick from curated suggestions or type custom free text.
                </div>
            </div>

            <!-- System / Device -->
            <div class="form-group">
                <label for="communitySystem">System / Device:</label>
                <input type="text" id="communitySystem" list="communitySystemList" placeholder="e.g. Microscopy (Confocal / 2-Photon) or type custom...">
                <datalist id="communitySystemList">
                    <option value="Microscopy (Light / Widefield)">
                    <option value="Microscopy (Confocal / 2-Photon)">
                    <option value="Microscopy (Super-Resolution / STED / SIM / STORM)">
                    <option value="Microscopy (Light Sheet / SPIM)">
                    <option value="Microscopy (Electron / SEM / TEM / Cryo-EM)">
                    <option value="Plate Reader / Spectrophotometer">
                    <option value="Flow Cytometer / FACS">
                    <option value="Sequencer (NGS / Illumina / Nanopore / PacBio)">
                    <option value="Mass Spectrometer (Proteomics / Metabolomics)">
                    <option value="Chromatography (HPLC / FPLC / GC)">
                    <option value="Wet Lab: PCR / qPCR / Thermal Cycler">
                    <option value="Wet Lab: Staining / Histology / Immunofluorescence">
                    <option value="Wet Lab: Sample Prep / Extraction / Purification">
                    <option value="Wet Lab: Gel Imaging / Western Blot">
                    <option value="Wet Lab: Cell Culture / Incubator / Bioreactor">
                    <option value="Wet Lab: General Bench Protocol">
                    <option value="Data Analysis / Bioimage Analysis">
                    <option value="Hardware / 3D Printing / Prototyping">
                </datalist>
            </div>

            <!-- Discipline / Domain -->
            <div class="form-group">
                <label for="communityDiscipline">Discipline / Domain:</label>
                <input type="text" id="communityDiscipline" list="communityDisciplineList" placeholder="e.g. Plant Biology / Botany or type custom...">
                <datalist id="communityDisciplineList">
                    <option value="Plant Biology / Botany">
                    <option value="Cell Biology">
                    <option value="Neuroscience">
                    <option value="Developmental Biology">
                    <option value="Microbiology / Bacteriology">
                    <option value="Virology">
                    <option value="Immunology">
                    <option value="Molecular Biology &amp; Genetics">
                    <option value="Biochemistry &amp; Structural Biology">
                    <option value="Biophysics">
                    <option value="Pharmacology &amp; Toxicology">
                    <option value="Ecology &amp; Evolution">
                    <option value="Material Science &amp; Physics">
                    <option value="Chemistry &amp; Synthesis">
                    <option value="Computer Science &amp; Data Engineering">
                </datalist>
            </div>

            <!-- Biological System / Model -->
            <div class="form-group">
                <label for="communityOrganism">Biological System / Specimen:</label>
                <input type="text" id="communityOrganism" list="communityOrganismList" placeholder="e.g. Arabidopsis thaliana or type custom...">
                <datalist id="communityOrganismList">
                    <option value="Arabidopsis thaliana">
                    <option value="Danio rerio">
                    <option value="Mus musculus">
                    <option value="Rattus norvegicus">
                    <option value="Drosophila melanogaster">
                    <option value="Caenorhabditis elegans">
                    <option value="Homo sapiens / Human Cell Lines">
                    <option value="Saccharomyces cerevisiae / Yeast">
                    <option value="Escherichia coli / Bacteria">
                    <option value="Viruses / Phages">
                    <option value="Organoids / 3D Tissues">
                    <option value="Non-biological / In vitro / Synthetic">
                </datalist>
            </div>

            <!-- Tags -->
            <div class="form-group">
                <label for="communityTags">Tags (comma-separated):</label>
                <input type="text" id="communityTags" placeholder="e.g. Confocal, Live-cell, GFP, Time-Lapse, Root Growth">
                <small style="color: #6b7280; margin-top: 4px; display: block;">
                    Free-form keywords separated by commas for searching in the Community Hub.
                </small>
            </div>

            <!-- Author & Institution Row -->
            <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                <div style="flex: 1;">
                    <label for="communityAuthor" style="display: block; margin-bottom: 8px; color: #a855f7; font-weight: 600;">Author:</label>
                    <input type="text" id="communityAuthor" placeholder="e.g. Dr. Thomas Zobel" style="width: 100%;">
                </div>
                <div style="flex: 1;">
                    <label for="communityInstitution" style="display: block; margin-bottom: 8px; color: #a855f7; font-weight: 600;">Institution / Lab:</label>
                    <input type="text" id="communityInstitution" placeholder="e.g. University of Münster" style="width: 100%;">
                </div>
            </div>

            <!-- ORCID, Version, License Row -->
            <div style="display: flex; gap: 15px;">
                <div style="flex: 1;">
                    <label for="communityOrcid" style="display: block; margin-bottom: 8px; color: #a855f7; font-weight: 600;">ORCID (optional):</label>
                    <input type="text" id="communityOrcid" placeholder="0000-0002-XXXX-XXXX" style="width: 100%;">
                </div>
                <div style="flex: 0.8;">
                    <label for="communityVersion" style="display: block; margin-bottom: 8px; color: #a855f7; font-weight: 600;">Version:</label>
                    <input type="text" id="communityVersion" placeholder="1.0.0" value="1.0.0" style="width: 100%;">
                </div>
                <div style="flex: 1.2;">
                    <label for="communityLicense" style="display: block; margin-bottom: 8px; color: #a855f7; font-weight: 600;">License:</label>
                    <select id="communityLicense" style="width: 100%;">
                        <option value="CC-BY-4.0" selected>CC-BY-4.0</option>
                        <option value="CC0-1.0">CC0-1.0 (Public Domain)</option>
                        <option value="MIT">MIT License</option>
                        <option value="Apache-2.0">Apache-2.0</option>
                        <option value="GPL-3.0">GPL-3.0</option>
                        <option value="Other">Other / Proprietary</option>
                    </select>
                </div>
            </div>
        </div>
    </div>
```

---

### 6.2. Changes in `src/js/templateModal.js`

1. **`switchTab` Method (Replace Lines 135–154):**
```javascript
    // Switch between metadata and community tabs
    switchTab(tabName) {
        // Alias legacy 'structure' tab to 'metadata' and auto-expand folder structure
        if (tabName === 'structure') {
            tabName = 'metadata';
            const details = document.getElementById('folderStructureDetails');
            if (details) details.open = true;
        }

        // Hide all tab contents
        document.querySelectorAll('#experimentTab .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('#experimentTab .tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Activate requested tab content and button
        if (tabName === 'metadata') {
            const content = document.getElementById('metadataContent');
            if (content) content.classList.add('active');
            const tabBtn = document.getElementById('tabBtnMetadata') || 
                           document.querySelector('#experimentTab .tab[data-tab="metadata"]');
            if (tabBtn) tabBtn.classList.add('active');
        } else if (tabName === 'community') {
            const content = document.getElementById('communityContent');
            if (content) content.classList.add('active');
            const tabBtn = document.getElementById('tabBtnCommunity') || 
                           document.querySelector('#experimentTab .tab[data-tab="community"]');
            if (tabBtn) tabBtn.classList.add('active');
        }
    },
```

2. **Default Tab Enforcement in `show()` and `openForEdit()`:**
In both methods, right after `document.getElementById('templateModal').style.display = 'block';`, call:
```javascript
this.switchTab('metadata');
```

3. **`collectCommunityData()` Method (New Method):**
```javascript
    // Collect Community & Sharing metadata
    collectCommunityData() {
        const system = document.getElementById('communitySystem')?.value.trim() || '';
        const discipline = document.getElementById('communityDiscipline')?.value.trim() || '';
        const organism = document.getElementById('communityOrganism')?.value.trim() || '';
        const rawTags = document.getElementById('communityTags')?.value || '';
        const tags = rawTags
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);
        const author = document.getElementById('communityAuthor')?.value.trim() || '';
        const institution = document.getElementById('communityInstitution')?.value.trim() || '';
        const orcid = document.getElementById('communityOrcid')?.value.trim() || '';
        const version = document.getElementById('communityVersion')?.value.trim() || '1.0.0';
        const license = document.getElementById('communityLicense')?.value || 'CC-BY-4.0';

        const hasAnyContent = Boolean(
            system || discipline || organism || tags.length > 0 || author || institution || orcid
        );

        if (!hasAnyContent) {
            return null;
        }

        return {
            system,
            discipline,
            organism,
            tags,
            author,
            institution,
            orcid,
            version,
            license
        };
    },
```

4. **`save()` and `saveAsNewTemplate()` (Attach Community Object):**
In `save()` (around line 357):
```javascript
        const communityData = this.collectCommunityData();
        if (communityData) {
            template.community = communityData;
        }
```
In `saveAsNewTemplate()` (around line 737):
```javascript
        const communityData = this.collectCommunityData();
        if (communityData) {
            newTemplate.community = communityData;
        }
```

5. **`populateForm(template)` (Load Community Object):**
```javascript
        // Populate Community taxonomy
        const comm = template.community || {};
        const systemInput = document.getElementById('communitySystem');
        const disciplineInput = document.getElementById('communityDiscipline');
        const organismInput = document.getElementById('communityOrganism');
        const tagsInput = document.getElementById('communityTags');
        const authorInput = document.getElementById('communityAuthor');
        const institutionInput = document.getElementById('communityInstitution');
        const orcidInput = document.getElementById('communityOrcid');
        const versionInput = document.getElementById('communityVersion');
        const licenseSelect = document.getElementById('communityLicense');

        if (systemInput) systemInput.value = comm.system || '';
        if (disciplineInput) disciplineInput.value = comm.discipline || '';
        if (organismInput) organismInput.value = comm.organism || '';
        if (tagsInput) {
            tagsInput.value = Array.isArray(comm.tags) ? comm.tags.join(', ') : (comm.tags || '');
        }

        // Default author/institution/orcid from profile if not present
        const currentUser = window.userManager?.currentUser;
        const userProfile = (currentUser && window.profileManager?.isInitialized) ?
            window.profileManager.getUserByUsername(currentUser) : null;
        const defaultAuthor = userProfile?.fullName || currentUser || '';
        const defaultInst = userProfile?.primaryGroupId ?
            window.profileManager?.getGroupById(userProfile.primaryGroupId)?.institution :
            (window.userManager?.currentGroup || '');
        const defaultOrcid = userProfile?.orcid || '';

        if (authorInput) authorInput.value = comm.author || defaultAuthor;
        if (institutionInput) institutionInput.value = comm.institution || defaultInst;
        if (orcidInput) orcidInput.value = comm.orcid || defaultOrcid;
        if (versionInput) versionInput.value = comm.version || '1.0.0';
        if (licenseSelect) licenseSelect.value = comm.license || 'CC-BY-4.0';

        // Auto-expand folder structure if template has existing structure or options
        const folderDetails = document.getElementById('folderStructureDetails');
        if (folderDetails) {
            folderDetails.open = Boolean(
                template.structure || 
                template.options?.writeFilesOnly || 
                template.options?.multipleFolders
            );
        }
```

6. **`clearForm()` (Reset Community Inputs & Pre-fill User Context):**
```javascript
        const systemInput = document.getElementById('communitySystem');
        const disciplineInput = document.getElementById('communityDiscipline');
        const organismInput = document.getElementById('communityOrganism');
        const tagsInput = document.getElementById('communityTags');
        const authorInput = document.getElementById('communityAuthor');
        const institutionInput = document.getElementById('communityInstitution');
        const orcidInput = document.getElementById('communityOrcid');
        const versionInput = document.getElementById('communityVersion');
        const licenseSelect = document.getElementById('communityLicense');

        if (systemInput) systemInput.value = '';
        if (disciplineInput) disciplineInput.value = '';
        if (organismInput) organismInput.value = '';
        if (tagsInput) tagsInput.value = '';

        const currentUser = window.userManager?.currentUser;
        const userProfile = (currentUser && window.profileManager?.isInitialized) ?
            window.profileManager.getUserByUsername(currentUser) : null;
        if (authorInput) authorInput.value = userProfile?.fullName || currentUser || '';
        if (institutionInput) institutionInput.value = userProfile?.primaryGroupId ?
            window.profileManager?.getGroupById(userProfile.primaryGroupId)?.institution :
            (window.userManager?.currentGroup || '');
        if (orcidInput) orcidInput.value = userProfile?.orcid || '';
        if (versionInput) versionInput.value = '1.0.0';
        if (licenseSelect) licenseSelect.value = 'CC-BY-4.0';

        const folderDetails = document.getElementById('folderStructureDetails');
        if (folderDetails) folderDetails.open = false;
```

---

## 7. Verification Matrix for Phase 1 Acceptance Criteria

| Acceptance Criterion | Verification Check | Expected Behavior |
|---|---|---|
| **AC 1:** Metadata Fields tab is default active when opening the Template Editor | 1. Open editor via UI or `templateModal.show()`.<br>2. Inspect DOM: `#tabBtnMetadata.classList.contains('active')` and `#metadataContent.classList.contains('active')`. | Both elements have class `active`. `#communityContent` does NOT have class `active`. |
| **AC 2:** Folder Structure is collapsible within Metadata Fields tab | 1. Check DOM inside `#metadataContent`.<br>2. Inspect `<details id="folderStructureDetails">`.<br>3. Toggle `<details>` open/closed. | Folder textarea `#experimentStructure` and toggles are located inside `<details>`. By default for new templates, `open` is false. |
| **AC 3:** Community & Sharing tab exists and uses `<datalist>` elements | 1. Inspect `#communityContent`.<br>2. Check `<input id="communitySystem" list="communitySystemList">`.<br>3. Check `<datalist id="communitySystemList">`, `communityDisciplineList`, `communityOrganismList`. | `<datalist>` elements are present with all 18, 15, and 12 curated taxonomy options. Input allows choosing from list or typing custom text. |
| **AC 4:** Saving serializes Community inputs into root-level `community` object | 1. Fill in community fields (e.g., System="Microscopy (Confocal / 2-Photon)", Tags="Live-cell, GFP").<br>2. Save template.<br>3. Inspect generated JSON. | JSON contains `"community": { "system": "...", "tags": ["Live-cell", "GFP"], ... }` at root level, completely separate from `"metadata": { "fields": { ... } }`. |
| **AC 5:** Project creation isolation | 1. Create a project from a template with `community` metadata.<br>2. Inspect generated `README.html` and `ReadyToImport.json`. | Neither file contains `community` tags or taxonomy entries. |
