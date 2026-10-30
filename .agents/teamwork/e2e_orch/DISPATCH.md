# Dispatch: E2E Testing Track Orchestrator

## Mission
Design and implement the complete opaque-box E2E test suite for MetaFold Community Templates (Phases 1–3) in accordance with `PROJECT.md` and `TEST_INFRA.md`.

## Requirements
Implement all 4 test tiers:
- **Tier 1 — Feature Coverage**: ≥5 tests per feature for all 25 features in `PROJECT.md § Feature Inventory` (125 tests total).
- **Tier 2 — Boundary & Corner Cases**: ≥5 tests per feature testing boundaries, empty inputs, extreme strings, special characters, missing properties, whitespace (125 tests total).
- **Tier 3 — Cross-Feature Combinations**: Pairwise combination tests covering feature interactions (≥25 tests).
- **Tier 4 — Real-World Application Scenarios**: ≥6 realistic multi-step user workflows (from `TEST_INFRA.md`).

## Test Architecture
- Test files located in `tests/e2e/`:
  - `tests/e2e/tier1_feature_coverage.test.js`
  - `tests/e2e/tier2_boundary_corner.test.js`
  - `tests/e2e/tier3_pairwise_combinations.test.js`
  - `tests/e2e/tier4_real_world_scenarios.test.js`
  - `tests/e2e/test_runner.js`
- Executable via standard Node: `node --test tests/e2e/test_runner.js` (or individual test files).
- Independent, opaque-box, requirement-driven assertions (validating DOM structure, HTML files, JSON schema serialization, GitHub Issue URL/body generation, FacetSearch keys & columns, download & install logic).
- When the test suite is ready and validated, publish `TEST_READY.md` at project root with coverage summary.

## Input Documents
- ORIGINAL_REQUEST.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\PROJECT.md`
- TEST_INFRA.md: `c:\Users\Thomas\Documents\GitHub\MetaFold\TEST_INFRA.md`
- Survey Reports: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_spec_miner_1\report.md`, `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_ui_1\report.md`, `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\survey_explorer_hub_1\report.md`

## Procedure
As E2E Testing Orchestrator, follow the Project Pattern procedure:
1. Maintain BRIEFING.md, progress.md, GATE_STATUS.md in your working directory.
2. Execute the iteration loop (Explorer -> Worker / Test Writer -> Reviewer -> Challenger -> Auditor -> Gate).
3. Publish `TEST_READY.md` at the project root when complete.
4. Deliver `handoff.md` and notify parent.
