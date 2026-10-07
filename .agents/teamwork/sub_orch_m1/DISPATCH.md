# Dispatch: Sub-Orchestrator Milestone 1 (Template Editor UI Redesign)

## Scope
Implement Milestone 1: Template Editor UI Redesign (Features 1–10 in PROJECT.md).
- Reorganize `src/components/modals/template-modal.html`:
  - Make "Metadata Fields" the primary and default active tab.
  - Nest "Folder Structure" textarea and toggles inside a collapsible `<details id="folderStructureDetails">` section within the metadata tab.
  - Create a new "Community & Sharing" tab (`#communityContent`) containing `<datalist>` inputs for:
    - `system` (18 options: Confocal, 2-Photon, Widefield, TIRF, Lightsheet, STED, STORM/PALM, Cryo-EM, TEM, SEM, AFM, Flow Cytometry, Mass Spectrometry, NMR, Micro-CT, High-Content Screening, Western Blot Imager, Other)
    - `discipline` (15 options: Cell Biology, Molecular Biology, Neuroscience, Developmental Biology, Immunology, Microbiology, Plant Biology / Botany, Biophysics, Pharmacology / Drug Discovery, Cancer Biology, Genetics / Genomics, Structural Biology, Pathology / Histology, Bioengineering, Other)
    - `organism` (12 options: Mus musculus (Mouse), Rattus norvegicus (Rat), Danio rerio (Zebrafish), Drosophila melanogaster (Fruit fly), Caenorhabditis elegans (Nematode), Arabidopsis thaliana (Thale cress), Saccharomyces cerevisiae (Yeast), Homo sapiens (Human), Xenopus laevis (African clawed frog), Escherichia coli (E. coli), Dictyostelium discoideum (Slime mold), Other)
    - Additional fields: tags (comma-separated), author, institution, orcid, version, license (with datalist: CC0-1.0, CC-BY-4.0, CC-BY-SA-4.0, MIT, Apache-2.0, Other).
- Update `src/js/templateModal.js`:
  - Update `switchTab(tabName)`: Select tabs by data-tab/ID rather than positional :first-child/:last-child. Ensure switching to 'structure' activates 'metadata' and expands `#folderStructureDetails`.
  - In `show()` and `openForEdit()`: Always activate `'metadata'` as default tab.
  - Implement `collectCommunityData()` returning a clean object `{ system, discipline, organism, tags, author, institution, orcid, version, license }`.
  - In `save()` and `saveAsNewTemplate()`: Write root-level `template.community = this.collectCommunityData()`.
  - In `populateForm(template)`: Populate community fields if `template.community` exists.
  - In `clearForm()`: Reset community inputs.
  - Maintain strict separation: do NOT modify `template.metadata.fields` format or inject community data into metadata fields.

## Input Documents
- ORIGINAL_REQUEST.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\PROJECT.md`
- Survey UI Report: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_ui_1\report.md`
- Survey Spec Miner Report: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_spec_miner_1\report.md`

## Procedure
As Sub-Orchestrator, follow the Project Pattern procedure:
1. Maintain BRIEFING.md, progress.md, GATE_STATUS.md in your working directory.
2. Execute the iteration loop (Explorer -> Worker -> Reviewer -> Challenger -> Forensic Auditor -> Gate).
3. Ensure Worker adheres to integrity warning (no cheating, genuine logic).
4. All gate criteria must pass (Build/tests pass, Reviewers approve, Challengers confirm, Auditor CLEAN).
5. When complete, deliver `handoff.md` and notify parent.
