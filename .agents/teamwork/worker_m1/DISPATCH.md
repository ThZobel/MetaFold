# Dispatch: Worker Milestone 1 (Template Editor UI Redesign)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement Milestone 1: Template Editor UI Redesign (Features 1–10 in PROJECT.md).

## Write Ownership
You EXCLUSIVELY own and may modify:
- `src/components/modals/template-modal.html`
- `src/js/templateModal.js`
Do NOT modify any other files.

## Technical Specifications
1. In `src/components/modals/template-modal.html`:
   - Reorder the tabs so "Metadata Fields" is the primary / first tab and active by default (`tab active`), and `#metadataContent` is `tab-content active`.
   - Embed the "Folder Structure" textarea and toggles into a collapsible `<details id="folderStructureDetails">` section inside `#metadataContent`.
   - Add a new tab `[🌐 Community & Sharing]` with button and content container `#communityContent`.
   - In `#communityContent`, add `<datalist>` dropdowns:
     - `system` (`#communitySystemList` with 18 options)
     - `discipline` (`#communityDisciplineList` with 15 options)
     - `organism` (`#communityOrganismList` with 12 options)
     - `license` (`#communityLicenseList` with CC0-1.0, CC-BY-4.0, CC-BY-SA-4.0, MIT, Apache-2.0, Other)
     - Form inputs for: System, Discipline, Organism, Tags (comma-separated), Author, Institution, ORCID, Version, License.
2. In `src/js/templateModal.js`:
   - Refactor `switchTab(tabName)`: Select tab buttons and content by data-tab or ID, removing fragile `:first-child`/`:last-child` selectors. Support `'structure'` as an alias that activates `'metadata'` and opens `#folderStructureDetails`.
   - Enforce default tab: In `show()` and `openForEdit()`, ensure `'metadata'` is explicitly activated.
   - Implement `collectCommunityData()` returning `{ system, discipline, organism, tags, author, institution, orcid, version, license }` where `tags` is parsed as an array of trimmed strings.
   - In `save()` and `saveAsNewTemplate()`: Save `template.community = this.collectCommunityData()`.
   - In `populateForm(template)`: Populate community inputs if `template.community` exists.
   - In `clearForm()`: Clear all community inputs.
   - Guarantee strict separation: `template.metadata.fields` must remain completely untouched by community data.

3. Build & Test:
   - Run tests or verification to prove your changes work, syntax is valid, and no regressions are introduced.

## Required Reading
- ORIGINAL_REQUEST.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\PROJECT.md`
- UI Survey Report: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_ui_1\report.md`
- Spec Miner Report: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_spec_miner_1\report.md`

## Output
Write `report.md` and deliver `handoff.md` in `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\worker_m1`.
Send message to parent when complete.


## 2026-10-06T15:43:45Z
You are the Milestone 1 Worker (teamwork_preview_worker) for MetaFold.
Your working directory is: c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\worker_m1

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read:
1. ORIGINAL_REQUEST.md at c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\ORIGINAL_REQUEST.md
2. DISPATCH.md at c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\worker_m1\DISPATCH.md
3. PROJECT.md at c:\Users\Thomas\Documents\GitHub\MetaFold\PROJECT.md
4. Survey reports in c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_ui_1\report.md and survey_spec_miner_1\report.md

You EXCLUSIVELY own and may modify:
- src/components/modals/template-modal.html
- src/js/templateModal.js

Implement all technical specifications from DISPATCH.md (tab reordering, collapsible folder structure, community tab, datalists, community serialization & deserialization, strict separation).
Run verification to ensure your changes work properly.
Write report.md and deliver handoff.md in your working directory, then notify your parent via send_message.
