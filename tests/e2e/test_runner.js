'use strict';

/**
 * MetaFold Community Templates (Phases 1–3)
 * Master E2E Test Suite Runner
 *
 * Invocation: node --test tests/e2e/test_runner.js
 *
 * Test Suites:
 * - Tier 1: Feature Coverage (125 tests, 5 per feature across Features 1-25)
 * - Tier 2: Boundary & Corner Cases (125 tests, 5 per feature across Features 1-25)
 * - Tier 3: Pairwise Combinations (26 tests covering cross-feature interactions)
 * - Tier 4: Real-World Scenarios (6 multi-step workflows)
 *
 * Total Test Count: 282 tests
 */

console.log('================================================================');
console.log('  MetaFold Community Templates E2E Test Suite (Tiers 1–4)      ');
console.log('================================================================');
console.log('Loading Tier 1: Feature Coverage (125 tests)...');
require('./tier1_feature_coverage.test.js');

console.log('Loading Tier 2: Boundary & Corner Cases (125 tests)...');
require('./tier2_boundary_corner.test.js');

console.log('Loading Tier 3: Pairwise Combinations (26 tests)...');
require('./tier3_pairwise_combinations.test.js');

console.log('Loading Tier 4: Real-World Application Scenarios (6 scenarios)...');
require('./tier4_real_world_scenarios.test.js');

console.log('All 4 tiers loaded successfully. Executing test runner...');
