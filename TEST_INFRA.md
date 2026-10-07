# E2E Test Infra: MetaFold Community Templates

## Test Philosophy
- **Opaque-box, requirement-driven**: Tests derive directly from `ORIGINAL_REQUEST.md` and `COMMUNITY_TEMPLATES_PLAN.md`, independent of internal implementation details.
- **Methodology**: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing across 4 tiers.
- **Verification Engine**: Native Node.js test runner (`node --test tests/e2e/runner.test.js`) and programmatic DOM/contract assertions (using Node 22 built-ins and regex/DOM parse checks).

## Feature Inventory & Test Mapping
| # | Feature | Source | Tier 1 (Count) | Tier 2 (Count) | Tier 3 (Pairwise) |
|---|---------|--------|:--------------:|:--------------:|:-----------------:|
| 1 | Metadata Tab Primary | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ |
| 2 | Collapsible Folder Structure | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ |
| 3 | Community & Sharing Tab | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ |
| 4 | System Datalist | COMMUNITY_TEMPLATES_PLAN § 2.1 | 5 | 5 | ✓ |
| 5 | Discipline Datalist | COMMUNITY_TEMPLATES_PLAN § 2.2 | 5 | 5 | ✓ |
| 6 | Organism Datalist | COMMUNITY_TEMPLATES_PLAN § 2.3 | 5 | 5 | ✓ |
| 7 | Additional Community Fields | COMMUNITY_TEMPLATES_PLAN § 1.1 | 5 | 5 | ✓ |
| 8 | Community JSON Serialization | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ |
| 9 | Community JSON Deserialization | COMMUNITY_TEMPLATES_PLAN § 1.1 | 5 | 5 | ✓ |
| 10 | Downstream Lab Isolation | COMMUNITY_TEMPLATES_PLAN § 1.2 | 5 | 5 | ✓ |
| 11 | Upload Modal Component | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ |
| 12 | Upload Step 1 Selection | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ |
| 13 | Upload Step 2 Taxonomy Review | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ |
| 14 | Local Template Tag Sync | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ |
| 15 | GitHub Issue Payload Formatting | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ |
| 16 | Payload Sanitization | COMMUNITY_TEMPLATES_PLAN § 3.3 | 5 | 5 | ✓ |
| 17 | Upload Trigger Integration | COMMUNITY_TEMPLATES_PLAN § 3.1 | 5 | 5 | ✓ |
| 18 | Facet Search Key Config | ORIGINAL_REQUEST § R3 | 5 | 5 | ✓ |
| 19 | Facet Search Visible Columns | COMMUNITY_TEMPLATES_PLAN § 4.1 | 5 | 5 | ✓ |
| 20 | Template Index Unpacking | COMMUNITY_TEMPLATES_PLAN § 4.1 | 5 | 5 | ✓ |
| 21 | Taxonomy Category Grouping | ORIGINAL_REQUEST § R3 | 5 | 5 | ✓ |
| 22 | Filter Chip Rendering | ORIGINAL_REQUEST § R3 | 5 | 5 | ✓ |
| 23 | Tabulator Selection Styling | SESSION_HANDOVER § 3.2 | 5 | 5 | ✓ |
| 24 | Download & Install Template | ORIGINAL_REQUEST § R3 | 5 | 5 | ✓ |
| 25 | Readme Generator Isolation | COMMUNITY_TEMPLATES_PLAN § 1.2 | 5 | 5 | ✓ |

## Test Architecture
- **Location**: `tests/e2e/`
- **Invocation**: `node --test tests/e2e/test_runner.js`
- **Pass/Fail Semantics**: Process exits with code 0 on all tests passing, non-zero on failure.
- **Directory Layout**:
  - `tests/e2e/tier1_feature_coverage.test.js`: Feature-by-feature isolated verification
  - `tests/e2e/tier2_boundary_corner.test.js`: Boundary, empty, special characters, whitespace, long input tests
  - `tests/e2e/tier3_pairwise_combinations.test.js`: Cross-feature combinations and interaction tests
  - `tests/e2e/tier4_real_world_scenarios.test.js`: End-to-end user workflows
  - `tests/e2e/test_runner.js`: Master suite aggregator

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Create new confocal microscopy template, save with full taxonomy, verify root `community` object and metadata isolation | F1, F2, F3, F4, F5, F6, F7, F8, F10 | Medium |
| 2 | Open existing template in editor, modify community tags, save as new template, verify data persistence and non-bleed | F1, F3, F8, F9, F10 | Medium |
| 3 | Upload local template to community, edit taxonomy in modal, sync to local template file, verify GitHub issue URL & body markdown | F11, F12, F13, F14, F15, F16, F17 | High |
| 4 | Open Template Hub, filter by Discipline ("Neuroscience") and System ("2-Photon"), verify facet search filter chips and columns | F18, F19, F20, F21, F22, F23 | High |
| 5 | Download & install community template from Hub, verify local file save, template manager refresh, and project creation isolation | F20, F24, F25, F8, F10 | High |
| 6 | Full lifecycle: Create template -> Upload with new tags -> Install from hub -> Verify complete data integrity across all layers | F1-F25 | Very High |

## Coverage Thresholds
- Tier 1: ≥5 test cases per feature (125 tests total)
- Tier 2: ≥5 test cases per feature (125 boundary/corner tests)
- Tier 3: ≥25 pairwise combination tests covering major feature interactions
- Tier 4: ≥6 realistic end-to-end application scenarios
- Acceptance Gate: 100% tests passing in all tiers
