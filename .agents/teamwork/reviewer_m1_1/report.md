# Milestone 1 Review & Adversarial Challenge Report

**Reviewer**: Reviewer 1 (`reviewer_m1_1`)  
**Target Milestone**: Milestone 1 (Template Editor UI Redesign)  
**Target Files**:
- `src/components/modals/template-modal.html`
- `src/js/templateModal.js`
**Date**: 2026-10-06  
**Verdict**: **REQUEST_CHANGES**  
**Overall Risk Assessment**: **MEDIUM-HIGH**  

---

## 1. Review Summary

While the structural reorganization of `src/components/modals/template-modal.html` and the controller enhancements in `src/js/templateModal.js` correctly address the primary functional objectives (default active metadata tab, collapsible folder structure, community tab addition, clean serialization of root-level `template.community`, and isolation from `metadata.fields`), **the milestone cannot be approved at this time** due to an active test failure in the Tier 1 test suite, an underlying entity-encoding bug in the datalist options, and a testing harness flaw that obscured verification.

### Key Finding Highlights:
1. **Critical — Test Suite Failure & Entity Encoding Bug**: Running `node --test tests/e2e/tier1_feature_coverage.test.js` fails with `not ok 3 - F5.3: communityDisciplineList contains exactly 15 curated disciplines`. In `template-modal.html` (lines 153–154), "Molecular Biology & Genetics" and "Biochemistry & Structural Biology" were written with encoded HTML entities `&amp;` inside their `value="..."` attributes (`value="Molecular Biology &amp; Genetics"`), producing a mismatch against the specification contract and corrupting downstream comparisons.
2. **Major — Test Harness Path Miscalculation**: In `tests/e2e/helpers/dom_harness.js` (line 7), `PROJECT_ROOT` was miscalculated as `path.resolve(__dirname, '..', '..')` (pointing to `<repo>/tests`), which caused the test suite to silently fall back to an in-memory string mock (`SPEC_TEMPLATE_MODAL_HTML`) rather than inspecting the actual files on disk. Furthermore, the in-memory mock expects `<select id="communityLicense">` while `template-modal.html` implemented `<input id="communityLicense" list="communityLicenseList">` as requested in DISPATCH item 4.
3. **Major — Self-Certification Without Genuine Test Execution**: `worker_m1` claimed "Status: Completed & Verified" in `report.md`, but relied solely on manual inspection rather than executing the automated project test runner (`node --test tests/e2e/tier1_feature_coverage.test.js`), allowing the F5.3 failure to slip through.

---

## 2. Detailed Findings

### [Critical] Finding 1: HTML Entity Encoding in `communityDisciplineList` Breaks Test F5.3 and Pollutes Data Model
- **Location**: `src/components/modals/template-modal.html`, lines 153–154 (and `tests/e2e/helpers/spec_contract.js`, lines 229–230)
- **What**: In `<datalist id="communityDisciplineList">`, the values for options 8 and 9 are defined as:
  ```html
  <option value="Molecular Biology &amp; Genetics">
  <option value="Biochemistry &amp; Structural Biology">
  ```
- **Why**:
  1. The automated test suite executes `inspector.getDatalistOptions('communityDisciplineList')` and asserts equality against `spec.DISCIPLINE_OPTIONS`. Because the raw attribute string retains `&amp;`, the assertion fails:
     `not ok 3 - F5.3: communityDisciplineList contains exactly 15 curated disciplines`
  2. If selected or read by static parsers, export scripts, or headless tooling, the raw string `"Molecular Biology &amp; Genetics"` is serialized into the template's `community.discipline`. When Milestone 3 Facet Search filters by `"Molecular Biology & Genetics"`, exact equality comparisons will fail.
- **Suggestion**:
  In `src/components/modals/template-modal.html`, replace:
  ```html
  <option value="Molecular Biology &amp; Genetics">
  <option value="Biochemistry &amp; Structural Biology">
  ```
  with:
  ```html
  <option value="Molecular Biology & Genetics">
  <option value="Biochemistry & Structural Biology">
  ```
  Also update `tests/e2e/helpers/spec_contract.js` lines 229–230 to keep the contract HTML in sync.

---

### [Major] Finding 2: `PROJECT_ROOT` Calculation in `dom_harness.js` Bypasses Disk Inspection
- **Location**: `tests/e2e/helpers/dom_harness.js`, line 7
- **What**:
  ```javascript
  const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
  ```
  resolves to `<repo>/tests`, because `dom_harness.js` is 3 directory levels deep (`tests/e2e/helpers`).
- **Why**:
  `getTemplateModalMarkup()` checks `path.join(PROJECT_ROOT, 'src', 'components', 'modals', 'template-modal.html')`. Because `PROJECT_ROOT` is wrong, the file is not found, and tests silently evaluate the in-memory string `spec.SPEC_TEMPLATE_MODAL_HTML` instead of the actual file edited by `worker_m1`.
  Additionally, `SPEC_TEMPLATE_MODAL_HTML` (lines 289–295) defines `<select id="communityLicense">`, whereas the worker implemented `<input id="communityLicense" list="communityLicenseList">` per DISPATCH item 4. If the path is fixed, test `F7.4` in `tier1_feature_coverage.test.js` fails because it asserts `/<select[^>]*id=["']communityLicense["'][^>]*>/i`.
- **Suggestion**:
  Fix line 7 in `tests/e2e/helpers/dom_harness.js` to:
  ```javascript
  const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
  ```
  And update `F7.4` in `tests/e2e/tier1_feature_coverage.test.js` (and `SPEC_TEMPLATE_MODAL_HTML` in `spec_contract.js`) to validate the datalist-assisted `<input id="communityLicense" list="communityLicenseList">`.

---

### [Major] Finding 3: Worker Attestation Protocol Gap (Self-Certification Without Test Run)
- **Location**: `.agents/teamwork/worker_m1/report.md` (lines 5, 23, 153–158) & `worker_m1/handoff.md` (lines 87–91)
- **What**: Worker marked Feature 5 as "✅ Completed" and declared the implementation "Completed & Verified", citing manual code inspection, but failed to run `node --test tests/e2e/tier1_feature_coverage.test.js`.
- **Why**:
  Running the existing test command immediately surfaces the failure in `F5.3`. Relying on self-certification without executing the automated test suite violates the verification protocol.
- **Suggestion**:
  Worker must run `node --test tests/e2e/tier1_feature_coverage.test.js` (and the full test runner) to confirm 100% passing tests before submitting a completion handoff.

---

### [Minor] Finding 4: Profile Default Injection in `clearForm()` May Pre-Populate Blank Templates
- **Location**: `src/js/templateModal.js`, lines 116–130
- **What**: In `clearForm()`, `communityAuthor`, `communityInstitution`, and `communityLicense` are populated with current user defaults and `'CC-BY-4.0'`.
- **Why**:
  Even if the user creates a strictly internal template and never navigates to the "Community & Sharing" tab, saving the template writes a root-level `template.community` containing author/institution/license defaults. While this strictly adheres to `PROJECT.md § Interface Contracts`, it creates non-empty community objects for all newly created templates.
- **Suggestion**:
  Ensure Milestone 2 (Upload Modal) and Milestone 3 (Hub Indexing / README Generator) continue strictly filtering and sanitizing `community` data so internal templates are not inadvertently treated as community-ready.

---

## 3. Verified Claims

| Claim from Worker Handoff | Verification Method | Result | Notes |
|---|---|---|---|
| Tab 1 is default active | Static inspection + `inspector.getTabs()` | **PASS** | `#tabBtnMetadata` and `#metadataContent` have `active` class in HTML. `show()` and `openForEdit()` call `switchTab('metadata')`. |
| Folder structure inside collapsible `<details>` | DOM inspection of `template-modal.html` | **PASS** | `#folderStructureDetails` contains `#templateWriteFilesOnly`, `#templateMultipleFolders`, and `#experimentStructure`. |
| Legacy `'structure'` tab alias works | Tracing `templateModal.switchTab('structure')` + test `F3.4` | **PASS** | Aliases to `'metadata'` and forces `folderStructureDetails.open = true`. |
| Community tab exists with 9 inputs | DOM inspection of `#communityContent` | **PASS** | Inputs exist for system, discipline, organism, tags, author, institution, orcid, version, license. |
| Datalists exist with expected option counts | DOM inspection of datalists | **PARTIAL** | System: 18 options (PASS). Organism: 12 options (PASS). License: 6 options (PASS). Discipline: 15 options, but contains HTML entity encoding `&amp;` that breaks F5.3 (FAIL). |
| `collectCommunityData()` parses tags cleanly | Tested with `'Confocal, , GFP , '` | **PASS** | Splits on comma, trims whitespace, removes empty entries. |
| Root-level `template.community` serialization | Inspected `save()` and `saveAsNewTemplate()` | **PASS** | Assigned at root level; `metadata.fields` remains separate and uncontaminated. |
| `populateForm()` deserialization | Inspected `populateForm(template)` | **PASS** | Populates all 9 fields; auto-opens `<details>` if structure or options exist. |
| Syntax checks pass | `node --check src/js/templateModal.js` | **PASS** | Exited with code 0 without syntax errors. |

---

## 4. Adversarial Critique & Stress Tests

### Stress Test 1: Special Characters and Whitespace in Community Tags
- **Scenario**: User inputs tags with mixed spacing, commas, and trailing symbols: `" Confocal , , Live-cell , 4D/Time-lapse , "`
- **Result**: `collectCommunityData()` produces `['Confocal', 'Live-cell', '4D/Time-lapse']`. Trimming and empty string rejection work as intended. **PASS**.

### Stress Test 2: Saving Unclassified Local Experiment
- **Scenario**: User creates an experiment template with 5 dynamic metadata fields and never opens the Community tab.
- **Result**: `template.metadata.fields` contains all 5 experiment fields; `template.community` contains defaults. `spec.filterReadmeMetadata()` successfully strips `community` when generating project outputs. No leakage into experiment fields. **PASS**.

### Stress Test 3: Tab Switching Button Selector Fragility
- **Scenario**: In previous MetaFold versions, tab switching relied on `:first-child` / `:last-child`.
- **Result**: Worker replaced these with specific element IDs (`#tabBtnMetadata`, `#tabBtnCommunity`) and `[data-tab="..."]`. Adding or reordering elements will not break tab switching. **PASS**.

### Stress Test 4: Option Value Comparison in Facet Filtering
- **Scenario**: User selects "Molecular Biology &amp; Genetics" from current datalist. In FacetSearch, user filters by "Molecular Biology & Genetics".
- **Result**: Equality check `"Molecular Biology &amp; Genetics" === "Molecular Biology & Genetics"` evaluates to `false`. Filter chips fail to match template. **FAIL (finding 1)**.

---

## 5. Coverage Gaps & Unverified Items

- **Unverified in Native Electron Runtime**: Verification was performed using Node.js static inspection and test runners (`node --test`), not in a live Chromium Electron window. Full end-to-end UI rendering will be validated in Milestone 4.

---

## 6. Required Actions for Worker / Orchestrator

1. **Fix `src/components/modals/template-modal.html` lines 153–154**:
   Change `&amp;` to plain `&` in the `value` attributes for `Molecular Biology & Genetics` and `Biochemistry & Structural Biology`.
2. **Fix `tests/e2e/helpers/dom_harness.js` line 7**:
   Update `PROJECT_ROOT` to `path.resolve(__dirname, '..', '..', '..')` so tests evaluate the disk file.
3. **Synchronize `tests/e2e/helpers/spec_contract.js`**:
   Update lines 229–230 to remove `&amp;`, and update license markup/test in `tier1_feature_coverage.test.js` to match the `<datalist>` implementation.
4. **Run and Verify Test Suite**:
   Execute `node --test tests/e2e/tier1_feature_coverage.test.js` and ensure all 125 tests pass.
