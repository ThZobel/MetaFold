# Dispatch: Worker M4 Remediation (Integrity Violation Fix)

## Mission
You are the Remediation Worker (`worker_m4_remediation`, teamwork_preview_worker) for Milestone 4 Iteration 2.
Your working directory is: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\worker_m4_remediation`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read:
1. `ORIGINAL_REQUEST.md`: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\ORIGINAL_REQUEST.md`
2. `PROJECT.md`: `c:\Users\Thomas\Documents\GitHub\MetaFold\PROJECT.md`
3. Full Forensic Audit Report: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\auditor_m4\report.md`
4. Explorer 1 Handoff: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\explorer_m4_it2_1\handoff.md`
5. Explorer 2 Handoff: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\explorer_m4_it2_2\handoff.md`
6. Explorer 3 Handoff: `c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\explorer_m4_it2_3\handoff.md`

## Files You Exclusively Own and May Modify:
- `tests/e2e/tier1_feature_coverage.test.js`
- `tests/e2e/tier2_boundary_corner.test.js`
- `tests/e2e/tier3_pairwise_combinations.test.js` (optional hardening of P23)

Do NOT modify any files in `src/` (the application code is 100% authentic and already passes all requirements).

## Exact Tasks:
1. In `tests/e2e/tier1_feature_coverage.test.js` (lines 1058–1085):
   Replace the tautological assertions for Feature 23 (F23.1–F23.5) with direct, unmasked checks against `cssContent`:
   ```javascript
   test('F23.1: CSS rule for .tabulator-row.tabulator-selected is specified', () => {
       assert.ok(cssContent.includes('.tabulator-row.tabulator-selected'), 'Selected row styling must be defined in facetSearch.css');
   });

   test('F23.2: Rule applies purple accent background color', () => {
       assert.ok(cssContent.includes('rgba(124, 58, 237, 0.35)'), 'Rule must specify rgba(124, 58, 237, 0.35)');
   });

   test('F23.3: Rule applies distinct border-left highlight (3px solid #a855f7)', () => {
       assert.ok(cssContent.includes('border-left: 3px solid #a855f7'), 'Rule must specify border-left: 3px solid #a855f7');
   });

   test('F23.4: Rule ensures high-contrast white text color', () => {
       assert.ok(cssContent.includes('color: #ffffff') || cssContent.includes('color: #fff'), 'Rule must specify white text color');
   });

   test('F23.5: Specificity overrides odd and even striped rows', () => {
       assert.ok(
           cssContent.includes('.tabulator-row-odd.tabulator-selected') &&
           cssContent.includes('.tabulator-row-even.tabulator-selected'),
           'Specificity must override both odd and even row zebra striping'
       );
   });
   ```

2. In `tests/e2e/tier2_boundary_corner.test.js` (lines 939–959):
   Replace the 5 empty `assert.ok(true);` calls in Feature 23 Boundaries with authentic property checks against `src/css/facetSearch.css`:
   ```javascript
   test.describe('Feature 23 Boundaries: Tabulator Selection Styling', () => {
       const cssPath = path.join(PROJECT_ROOT, 'src', 'css', 'facetSearch.css');
       const cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

       test('F23.B1: Styling specifies !important flag to ensure override precedence', () => {
           assert.ok(cssContent.includes('background-color: rgba(124, 58, 237, 0.35) !important'), 'Background override must use !important');
           assert.ok(cssContent.includes('border-left: 3px solid #a855f7 !important'), 'Border override must use !important');
       });

       test('F23.B2: Light-mode theme variant provides high-contrast selection styling', () => {
           assert.ok(cssContent.includes('body.light-mode .tabulator-row.tabulator-selected'), 'Light mode selected row styling must exist');
           assert.ok(cssContent.includes('rgba(124, 58, 237, 0.2)'), 'Light mode background color must be defined');
       });

       test('F23.B3: Frozen column cells separator maintains border styling without collision', () => {
           assert.ok(cssContent.includes('.tabulator-cell.tabulator-frozen-left'), 'Frozen column separator rule must exist');
       });

       test('F23.B4: Tableholder scrollbar styling is integrated with theme', () => {
           assert.ok(cssContent.includes('.tabulator-tableholder::-webkit-scrollbar-thumb'), 'Scrollbar styling must be customized');
       });

       test('F23.B5: Light-mode border-left specifies appropriate contrast purple', () => {
           assert.ok(cssContent.includes('border-left: 3px solid #7c3aed !important'), 'Light-mode border must use #7c3aed');
       });
   });
   ```

3. Run verification commands:
   - `node --test tests/e2e/test_runner.js`
   - `node --test tests/e2e/tier1_feature_coverage.test.js`
   - `node --test tests/e2e/tier2_boundary_corner.test.js`
   - `node --test tests/e2e/challenger_m1_empirical.test.js`
   - `node --test tests/e2e/challenger_m1_roundtrip_isolation.test.js`
   Confirm 100% pass across all tests with ZERO tautologies.

## Output
Write `report.md` and deliver `handoff.md` in your working directory.
Notify parent via `send_message`.


## 2026-10-06T21:54:15Z
[Message] timestamp=2026-10-06T21:54:15Z sender=70f1e2cf-0ea3-4149-b78b-82fb8014c634 priority=MESSAGE_PRIORITY_HIGH
You are the Remediation Worker (teamwork_preview_worker) for Milestone 4 Iteration 2.
Your working directory is: c:\Users\Thomas\Documents\GitHub\MetaFold\.agents\teamwork\worker_m4_remediation
Tasks:
1. Apply the exact unmasked assertions to tests/e2e/tier1_feature_coverage.test.js (F23.1–F23.5) and tests/e2e/tier2_boundary_corner.test.js (F23.B1–F23.B5) as specified in DISPATCH.md.
2. Run node --test tests/e2e/test_runner.js, node --test tests/e2e/challenger_m1_empirical.test.js, and node --test tests/e2e/challenger_m1_roundtrip_isolation.test.js.
3. Confirm 100% pass across all 333 tests with zero tautologies.
4. Deliver report.md and handoff.md in your working directory, then notify parent via send_message.
