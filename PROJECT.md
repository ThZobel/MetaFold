# Project: MetaFold Community Templates (Phases 1–3)

## Architecture
MetaFold is an Electron application for research data management, metadata capture, and experimental templating.
This project implements Phases 1–3 of the Community Templates Plan (`COMMUNITY_TEMPLATES_PLAN.md`):
- **Template Editor Modal (`src/components/modals/template-modal.html`, `src/js/templateModal.js`)**: Reorganized tab UI prioritizing Metadata Fields, embedding Folder Structure in a collapsible details section, and introducing a Community & Sharing tab with datalist-assisted taxonomy (`system`, `discipline`, `organism`, `tags`, author info, license). Root-level `community` JSON object serialized upon template save.
- **Upload Workflow (`src/components/modals/upload-template-modal.html`, `src/js/uploadModal.js`, `src/main.js`)**: 2-step modal allowing local template selection, community taxonomy review/editing, optional local file synchronization, and sanitization of template JSON into a pre-formatted GitHub Issue payload.
- **Facet Search & Template Hub (`src/js/app.js`, `src/js/facetSearch.js`, `src/css/facetSearch.css`, `src/main.js`)**: Configures `allAvailableKeys` and `visibleColumns` for community taxonomy keys (`collection`, `system`, `discipline`, `organism`, `tags`, `author`, `version`), groups them in sidebar filter chips, styles selected Tabulator rows, completes local installation via `downloadAndInstallTemplate`, and guarantees downstream isolation in `generateReadmeHtmlWithMetadata`.

```
                  ┌───────────────────────────────────────────────┐
                  │          Template Editor UI (M1)              │
                  │  - Metadata Tab (Default Active)              │
                  │  - Folder Structure (<details> Collapsible)   │
                  │  - Community & Sharing Tab (<datalist>)       │
                  └───────────────────────┬───────────────────────┘
                                          │ Saves root-level `community`
                                          ▼
                  ┌───────────────────────────────────────────────┐
                  │             Template JSON File                │
                  │  { name, type, metadata: {fields}, community }│
                  └───────────┬───────────────────────┬───────────┘
                              │                       │
           Upload Workflow (M2)│                       │ Consumed locally (M3)
                              ▼                       ▼
    ┌───────────────────────────────────┐   ┌───────────────────────────────────┐
    │     Upload Modal Component        │   │    Facet Search & Template Hub    │
    │  - Step 1: Select Template        │   │  - Unpack community taxonomy      │
    │  - Step 2: Edit Taxonomy Tags     │   │  - Filter chips in sidebar        │
    │  - [x] Sync to local template     │   │  - Tabulator columns & styling    │
    │  - GitHub Issue Markdown Payload  │   │  - downloadAndInstallTemplate     │
    └───────────────────────────────────┘   └───────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Metadata Tab Primary | "Metadata Fields" tab is the primary and default active tab when opening Template Editor | M1 | ORIGINAL_REQUEST § R1 |
| 2 | Collapsible Folder Structure | Folder structure textarea & toggles placed inside an expandable `<details>` section | M1 | ORIGINAL_REQUEST § R1 |
| 3 | Community & Sharing Tab | Add `[🌐 Community & Sharing]` tab (`#communityContent`) to template modal | M1 | ORIGINAL_REQUEST § R1 |
| 4 | System Datalist | Predefined `<datalist>` for 18 instruments/systems with free-text fallback | M1 | COMMUNITY_TEMPLATES_PLAN § 2.1 |
| 5 | Discipline Datalist | Predefined `<datalist>` for 15 scientific disciplines with free-text fallback | M1 | COMMUNITY_TEMPLATES_PLAN § 2.2 |
| 6 | Organism Datalist | Predefined `<datalist>` for 12 model organisms with free-text fallback | M1 | COMMUNITY_TEMPLATES_PLAN § 2.3 |
| 7 | Additional Community Fields | Inputs for tags, author, institution, orcid, version, and license | M1 | COMMUNITY_TEMPLATES_PLAN § 1.1 |
| 8 | Community JSON Serialization | Root-level `community` object serialized on save, separate from `metadata.fields` | M1 | ORIGINAL_REQUEST § R1 |
| 9 | Community JSON Deserialization | `populateForm` populates community inputs from existing `template.community` | M1 | COMMUNITY_TEMPLATES_PLAN § 1.1 |
| 10 | Downstream Lab Isolation | Ensure project creation (`ReadyToImport.json`, `experimentForm`) ignores `community` | M1 | COMMUNITY_TEMPLATES_PLAN § 1.2 |
| 11 | Upload Modal Component | Dedicated `upload-template-modal.html` and `uploadModal.js` replacing inline script | M2 | ORIGINAL_REQUEST § R2 |
| 12 | Upload Step 1 Template Selection | Dropdown selecting local template from `templateManager.templates` | M2 | ORIGINAL_REQUEST § R2 |
| 13 | Upload Step 2 Taxonomy Review | Form inputs populated from `template.community` with datalist suggestions | M2 | ORIGINAL_REQUEST § R2 |
| 14 | Local Template Tag Sync | Checkbox `[x] Update local template with these tags` saving changes locally | M2 | ORIGINAL_REQUEST § R2 |
| 15 | GitHub Issue Payload Formatting | Pre-formatted Issue title and Markdown body with taxonomy table and clean JSON | M2 | ORIGINAL_REQUEST § R2 |
| 16 | Payload Sanitization | Strip internal runtime fields (`_fileInfo`, `id`, `savedLocally`) from JSON payload | M2 | COMMUNITY_TEMPLATES_PLAN § 3.3 |
| 17 | Upload Trigger Integration | Wire upload action to application menu and slide-out panel | M2 | COMMUNITY_TEMPLATES_PLAN § 3.1 |
| 18 | Facet Search Key Configuration | `allAvailableKeys` configured for `collection`, `system`, `discipline`, `organism`, `tags`, `author`, `version` | M3 | ORIGINAL_REQUEST § R3 |
| 19 | Facet Search Visible Columns | `visibleColumns` configured for `collection`, `system`, `discipline`, `organism`, `tags`, `author` | M3 | COMMUNITY_TEMPLATES_PLAN § 4.1 |
| 20 | Template Index Unpacking | Unpack nested `item.community.*` into flat properties for Tabulator & FacetSearch | M3 | COMMUNITY_TEMPLATES_PLAN § 4.1 |
| 21 | Taxonomy Category Grouping | Map community taxonomy keys to dedicated category in `_getCategoryForKey` | M3 | ORIGINAL_REQUEST § R3 |
| 22 | Filter Chip Rendering | Render interactive filter chips for community taxonomy categories in sidebar | M3 | ORIGINAL_REQUEST § R3 |
| 23 | Tabulator Selection Styling | Add `.tabulator-row.tabulator-selected` rule in `facetSearch.css` | M3 | SESSION_HANDOVER § 3.2 |
| 24 | Download & Install Template | `downloadAndInstallTemplate` saves template locally and refreshes `templateManager` | M3 | ORIGINAL_REQUEST § R3 |
| 25 | Readme Generator Isolation | Add `community` to skip list in `generateReadmeHtmlWithMetadata` in `main.js` | M3 | COMMUNITY_TEMPLATES_PLAN § 1.2 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Template Editor UI Redesign | Features 1–10: Tab reorder, collapsible structure, community tab, datalists, JSON serialization & deserialization | none | DONE |
| M2 | Upload Workflow | Features 11–17: 2-step upload modal, taxonomy review/edit, local sync, sanitized GitHub issue payload | M1 | DONE |
| M3 | Hub & Facet Search Integration | Features 18–25: Facet keys & columns, index flattener, sidebar category grouping, CSS selection, install logic, Readme isolation | M1, M2 | DONE |
| M4 | E2E Test Suite & Adversarial Hardening | Phase 1 (100% pass of Tiers 1–4 test suite) + Phase 2 (Tier 5 adversarial hardening with Challenger & Auditor) | M1, M2, M3 | IN_PROGRESS |

## Interface Contracts

### `templateModal.js` ↔ `template.json`
- `collectCommunityData()`: Returns `{ system: string, discipline: string, organism: string, tags: string[], author: string, institution: string, orcid: string, version: string, license: string }`.
- When saved: `template.community` is set to the returned object.
- `template.metadata.fields`: Unaltered and separate.

### `uploadModal.js` ↔ `templateManager.js` & `storage.js`
- `uploadModal.show(templateIndex)`: Opens upload modal, populates step 1 select.
- `uploadModal.onTemplateSelected(index)`: Loads `template.community` fields into step 2 inputs.
- When `updateLocalTemplate` is checked: Calls `window.storage.saveTemplateToFileImmediately(template)` or `window.templateManager.updateTemplate(template)`.
- Issue generation: Builds URL `https://github.com/ThZobel/MetaFold-Templates/issues/new?title=...&body=...` and invokes `window.electronAPI.openExternal(url)`.

### `app.js` ↔ `facetSearch.js`
- In `openTemplateHub()`:
  - `window.facetSearch.allAvailableKeys = ['collection', 'system', 'discipline', 'organism', 'tags', 'author', 'version']`
  - `window.facetSearch.visibleColumns = ['collection', 'system', 'discipline', 'organism', 'tags', 'author']`
  - Flattened index items contain top-level properties: `item.system = item.community?.system || item.system || ''`, etc.
- In `facetSearch.js`: `_getCategoryForKey(key)` returns `'🌐 Community Taxonomy'` for `collection`, `system`, `discipline`, `organism`, `tags`.

## Code Layout
- `src/components/modals/template-modal.html`: Template Editor modal DOM markup
- `src/js/templateModal.js`: Template Editor controller
- `src/components/modals/upload-template-modal.html`: Upload to Community modal markup (NEW)
- `src/js/uploadModal.js`: Upload workflow controller (NEW)
- `src/js/init_components.js`: Component loader registry
- `src/index.html`: Modal container placeholders
- `src/js/app.js`: Application controller, template hub initialization, download & install logic
- `src/js/facetSearch.js`: Facet Search controller, category mapping, column rendering
- `src/css/facetSearch.css`: Facet Search styles including Tabulator selected row styling
- `src/main.js`: Main process menu actions, IPC handlers, README generator
- `tests/e2e/`: E2E test runner, fixtures, and test suites
