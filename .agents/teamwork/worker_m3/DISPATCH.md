# Dispatch: Worker Milestone 3 (Hub & Facet Search Integration)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement Milestone 3: Hub & Facet Search Integration (Features 18–25 in PROJECT.md).

## Write Ownership
You EXCLUSIVELY own and may modify:
- `src/js/app.js`
- `src/js/facetSearch.js`
- `src/css/facetSearch.css`
- `src/main.js`
Do NOT modify any other files.

## Technical Specifications
1. **`src/js/app.js`**:
   - In `openTemplateHub()` (around line 460–475):
     - Configure `window.facetSearch.allAvailableKeys = ['collection', 'system', 'discipline', 'organism', 'tags', 'author', 'version']`.
     - Configure `window.facetSearch.visibleColumns = ['collection', 'system', 'discipline', 'organism', 'tags', 'author']`.
     - In the template index fetching / processing loop, unpack `item.community` fields to flat keys so Tabulator and FacetSearch receive them directly:
       ```javascript
       const community = item.community || {};
       item.system = community.system || item.system || '';
       item.discipline = community.discipline || item.discipline || '';
       item.organism = community.organism || item.organism || '';
       item.collection = item.collection || community.collection || 'Community';
       if (!item.tags && community.tags) item.tags = community.tags;
       if (!item.author && community.author) item.author = community.author;
       if (!item.version && community.version) item.version = community.version;
       ```
   - In `downloadAndInstallTemplate(repoPath)` (around line 480–540):
     - Ensure the fetched template JSON preserves `templateData.community`.
     - Clean `_fileInfo`, set `originalCreator`, `originalGroup`, assign a local `id`, set `savedLocally = true`.
     - Call `window.electronAPI.saveTemplateToFile(templateData, userInfo)` (or `storage.saveTemplateToFileImmediately`).
     - Trigger `window.templateManager.refreshFromFiles()`.
     - Display success notification.

2. **`src/js/facetSearch.js`**:
   - In `_getCategoryForKey(key)` (around line 460–480):
     - Map community taxonomy keys (`'collection'`, `'system'`, `'discipline'`, `'organism'`, `'tags'`) to a dedicated category header, e.g. `'🌐 Community Taxonomy'` (or `'Community Taxonomy'`), ensuring filter chips for these keys are generated and grouped under that category in the left sidebar.
   - Verify `_buildColumns` and `_renderCategoryFilters` work smoothly with the new keys.

3. **`src/css/facetSearch.css`**:
   - Add `.tabulator-row.tabulator-selected` styling (with prominent background color like `var(--primary-color-alpha, rgba(33, 150, 243, 0.2))` or `#e3f2fd` / dark mode equivalent and border) to ensure selected rows in the Tabulator table have clear visual feedback.

4. **`src/main.js`**:
   - In `generateReadmeHtmlWithMetadata` (around line 4405–4415):
     - Add `'community'` to the exclusion / skip list alongside `provenance`, `metafold_project_id`, etc.
     - Guarantees strict lab isolation so community taxonomy is never emitted into generated project `README.html`.

5. **Build & Test**:
   - Run Node syntax checks:
     `node -c src/js/app.js`
     `node -c src/js/facetSearch.js`
     `node -c src/main.js`
   - Run E2E tests:
     `node --test tests/e2e/tier1_feature_coverage.test.js`
     `node --test tests/e2e/test_runner.js`

## Required Reading
- ORIGINAL_REQUEST.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\PROJECT.md`
- COMMUNITY_TEMPLATES_PLAN.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\COMMUNITY_TEMPLATES_PLAN.md`
- Survey Hub Report: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_hub_1\report.md`

## Output
Write `report.md` and deliver `handoff.md` in `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\worker_m3`.
Notify parent via send_message.


## 2026-10-06T17:19:56Z
You are Worker Milestone 3 (teamwork_preview_worker) for MetaFold.
Working directory: c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\worker_m3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Read:
- ORIGINAL_REQUEST.md: c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\ORIGINAL_REQUEST.md
- DISPATCH.md: c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\worker_m3\DISPATCH.md
- PROJECT.md: c:\Users\Thomas\Documents\GitHub\MetaFold\PROJECT.md
- Survey Hub Report: c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_hub_1\report.md

You EXCLUSIVELY own and may modify:
- src/js/app.js
- src/js/facetSearch.js
- src/css/facetSearch.css
- src/main.js

Implement all specifications for Milestone 3:
1. In src/js/app.js: Update openTemplateHub() with allAvailableKeys and visibleColumns, unpack item.community in index processing, finish downloadAndInstallTemplate preserving community.
2. In src/js/facetSearch.js: Map community taxonomy keys to dedicated category in _getCategoryForKey.
3. In src/css/facetSearch.css: Add .tabulator-row.tabulator-selected styling.
4. In src/main.js: Add community to skip list in generateReadmeHtmlWithMetadata.
Run syntax and test checks to verify your work.
Write report.md and handoff.md in your working directory, then notify parent via send_message.
