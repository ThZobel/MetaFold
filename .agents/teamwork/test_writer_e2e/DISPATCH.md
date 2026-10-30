# Dispatch: Test Writer E2E Test Suite

## Mission
Construct the complete, opaque-box E2E test suite for MetaFold Community Templates (Phases 1–3).

## Write Ownership
You EXCLUSIVELY own and may create/modify files under:
- `tests/e2e/` (e.g. `tests/e2e/tier1_feature_coverage.test.js`, `tests/e2e/tier2_boundary_corner.test.js`, `tests/e2e/tier3_pairwise_combinations.test.js`, `tests/e2e/tier4_real_world_scenarios.test.js`, `tests/e2e/test_runner.js`)
- `TEST_READY.md` (publish when suite is validated)
Do NOT modify any source files in `src/`.

## Architecture & Requirements
1. The test suite must run using native Node.js test runner:
   `node --test tests/e2e/test_runner.js`
2. Implement all 4 tiers from `TEST_INFRA.md`:
   - **Tier 1 (Feature Coverage)**: ≥5 test cases per feature for all 25 features in `PROJECT.md § Feature Inventory` (125 tests).
   - **Tier 2 (Boundary & Corner Cases)**: ≥5 test cases per feature testing empty values, boundary limits, missing objects, edge-case characters, long strings (125 tests).
   - **Tier 3 (Cross-Feature Combinations)**: ≥25 pairwise interaction tests.
   - **Tier 4 (Real-World Application Scenarios)**: ≥6 realistic multi-step workflow scenarios.
3. Test implementation details:
   - Tests should inspect and validate the actual HTML DOM structures (`template-modal.html`, `upload-template-modal.html`), JS functions, serialization logic, datalists, issue payload generation, FacetSearch keys, and isolation guarantees.
   - For components not yet implemented by workers (e.g. Phase 2 or Phase 3), design tests so they check against the specified requirement contracts in `PROJECT.md` and `COMMUNITY_TEMPLATES_PLAN.md`.
4. Validate that `node --test` runs cleanly and reports individual test results.
5. Create `TEST_READY.md` at project root summarizing runner command, counts, and coverage.

## Required Reading
- ORIGINAL_REQUEST.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\PROJECT.md`
- TEST_INFRA.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\TEST_INFRA.md`
- Survey Reports: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_spec_miner_1\report.md`, `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_ui_1\report.md`, `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_hub_1\report.md`

## Output
Write `report.md` and deliver `handoff.md` in `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\test_writer_e2e`.
Publish `TEST_READY.md` at project root.
Send message to parent when complete.


## 2026-10-06T15:43:45Z
You are the E2E Test Writer (teamwork_preview_test_writer) for MetaFold.
Your working directory is: c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\test_writer_e2e

You MUST read:
1. ORIGINAL_REQUEST.md at c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\ORIGINAL_REQUEST.md
2. DISPATCH.md at c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\test_writer_e2e\DISPATCH.md
3. PROJECT.md at c:\Users\Thomas\Documents\GitHub\MetaFold\PROJECT.md
4. TEST_INFRA.md at c:\Users\Thomas\Documents\GitHub\MetaFold\TEST_INFRA.md

You EXCLUSIVELY own and may create files under:
- tests/e2e/ (tier1_feature_coverage.test.js, tier2_boundary_corner.test.js, tier3_pairwise_combinations.test.js, tier4_real_world_scenarios.test.js, test_runner.js)
- TEST_READY.md (publish at project root when complete)
Do NOT modify any source code under src/.

Construct the full 4-tier E2E test suite (125 Tier 1 tests, 125 Tier 2 tests, ≥25 Tier 3 tests, ≥6 Tier 4 scenarios) using native node --test.
Verify that tests execute via node --test.
Write report.md and handoff.md in your working directory, publish TEST_READY.md, then notify your parent via send_message.
