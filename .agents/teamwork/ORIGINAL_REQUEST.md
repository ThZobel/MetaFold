# Original User Request

## Initial Request — 2026-10-06T15:08:56Z

# Teamwork Project Prompt — Draft

> Status: Step 5/6 — Drafting Requirements & Verification
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full Agent Team

Implement Phases 1-3 of the Community Templates Plan (`COMMUNITY_TEMPLATES_PLAN.md`) in MetaFold. This includes reorganizing the Template Editor UI, building a 2-step upload workflow, and integrating the new taxonomy into the Facet Search Hub.

Working directory: `c:\Users\Thomas\Documents\GitHub\MetaFold`
Integrity mode: development

## Requirements

### R1. Template Editor UI Redesign (Phase 1)
Reorganize the template modal (`template-modal.html`, `templateModal.js`). Make "Metadata Fields" the primary tab and include an expandable section for Folder Structure. Create a new "Community & Sharing" tab containing `<datalist>` inputs for taxonomy (System, Discipline, Organism, Tags, etc.). Ensure saving the template writes these fields to a `community` object in the template JSON.

### R2. Upload Workflow (Phase 2)
Implement a 2-step upload modal triggered by the "Upload to Community" action. The modal must allow the user to select a template, review/edit the community tags, and optionally save these tags back to the local template. It should then format a GitHub Issue body containing the tags and the template JSON.

### R3. Hub & Facet Search Integration (Phase 3)
Update `app.js` and `facetSearch.js` to map and display the new community taxonomy fields (`collection`, `system`, `discipline`, `organism`, `tags`, etc.) as filters in the left sidebar and columns in the table. Finish the `downloadAndInstallTemplate` logic to save templates locally.

## Acceptance Criteria

### Verification Mechanism: Agent-as-Judge
The implementing team must use an independent agent to verify the following criteria by inspecting the code, DOM structures, and generated JSON structures.

### Editor & JSON Structure
- [ ] The "Metadata Fields" tab is the default active tab when opening the Template Editor.
- [ ] The "Community & Sharing" tab exists and uses `<datalist>` elements for System, Discipline, and Organism.
- [ ] Saving a template correctly serializes the Community tab inputs into a root-level `community` JSON object, separate from `metadata.fields`.

### Upload Workflow
- [ ] The upload action triggers a custom modal (not just a direct browser link).
- [ ] The generated GitHub issue payload correctly includes the taxonomy fields and the full JSON string.

### Facet Search Hub
- [ ] Opening the Template Hub configures `facetSearch.allAvailableKeys` to include the new taxonomy fields (`system`, `discipline`, etc.).
- [ ] The Facet Search UI successfully renders filter chips for these new categories.
