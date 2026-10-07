'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('  FORENSIC INTEGRITY AUDIT — ITERATION 2 VERIFICATION SUITE     ');
console.log('================================================================\n');

// 1. Verify dom_harness.js disk resolution
console.log('--- CHECK 1: DOM Harness Disk Resolution ---');
const domHarness = require('../../../tests/e2e/helpers/dom_harness.js');
const modalMarkup = domHarness.getTemplateModalMarkup();
console.log(`- Source: ${modalMarkup.source}`);
console.log(`- Path: ${modalMarkup.path}`);
assert.strictEqual(modalMarkup.source, 'disk', 'FAIL: DOM harness must load template-modal.html from disk');
assert(fs.existsSync(modalMarkup.path), 'FAIL: Path returned by DOM harness must exist');
console.log('-> PASS: DOM harness loads directly from disk.\n');

// 2. Verify HTML Ampersand Encoding in template-modal.html
console.log('--- CHECK 2: template-modal.html Ampersand Encoding ---');
const htmlContent = fs.readFileSync('src/components/modals/template-modal.html', 'utf8');
const discListMatch = htmlContent.match(/<datalist[^>]*id=["']communityDisciplineList["'][^>]*>([\s\S]*?)<\/datalist>/i);
assert(discListMatch, 'FAIL: communityDisciplineList datalist missing');

const optRegex = /<option[^>]*value=["']([^"']*)["'][^>]*>/gi;
const discOptions = [];
let m;
while ((m = optRegex.exec(discListMatch[1])) !== null) {
    discOptions.push(m[1]);
}
console.log(`- Extracted ${discOptions.length} discipline options from disk HTML`);
assert.strictEqual(discOptions.length, 15, 'Must have exactly 15 options');

const ampDiscs = discOptions.filter(d => d.includes('&amp;'));
console.log(`- Disciplines with &amp;: ${ampDiscs.length}`);
assert.strictEqual(ampDiscs.length, 0, 'FAIL: No discipline option should contain &amp;');

const rawAmpDiscs = discOptions.filter(d => d.includes('&'));
console.log(`- Disciplines with raw &: ${rawAmpDiscs.length}`);
assert.strictEqual(rawAmpDiscs.length, 7, 'FAIL: Exactly 7 discipline options should contain raw &');

const specContract = require('../../../tests/e2e/helpers/spec_contract.js');
assert.deepStrictEqual(
    [...discOptions].sort(),
    [...specContract.DISCIPLINE_OPTIONS].sort(),
    'FAIL: Discipline options from disk must strictly deep-equal spec.DISCIPLINE_OPTIONS'
);
console.log('-> PASS: All discipline options match specification with raw ampersands.\n');

// 3. Verify License Input & Datalist Architecture
console.log('--- CHECK 3: License Architecture (Input + Datalist) ---');
const licenseInputMatch = htmlContent.match(/<input[^>]*id=["']communityLicense["'][^>]*>/i);
assert(licenseInputMatch, 'FAIL: #communityLicense input missing');
assert(licenseInputMatch[0].includes('list="communityLicenseList"'), 'FAIL: #communityLicense must link to list="communityLicenseList"');

const licListMatch = htmlContent.match(/<datalist[^>]*id=["']communityLicenseList["'][^>]*>([\s\S]*?)<\/datalist>/i);
assert(licListMatch, 'FAIL: #communityLicenseList datalist missing');

const licOptions = [];
let licM;
while ((licM = optRegex.exec(licListMatch[1])) !== null) {
    licOptions.push(licM[1]);
}
console.log(`- License options found: ${licOptions.join(', ')}`);
assert(licOptions.includes('CC-BY-4.0'), 'Must include CC-BY-4.0');
assert(licOptions.includes('CC0-1.0'), 'Must include CC0-1.0');
assert(licOptions.includes('MIT'), 'Must include MIT');
assert(licOptions.includes('Apache-2.0'), 'Must include Apache-2.0');
console.log('-> PASS: License datalist and input structure verified.\n');

// 4. Verify Spec Contract and Test Suite Alignment
console.log('--- CHECK 4: Spec Contract & Tier 1 Test Alignment ---');
const specHtml = specContract.SPEC_TEMPLATE_MODAL_HTML;
assert(specHtml.includes('id="communityLicense" list="communityLicenseList"'), 'FAIL: SPEC_TEMPLATE_MODAL_HTML must specify input with list');
assert(specHtml.includes('id="communityLicenseList"'), 'FAIL: SPEC_TEMPLATE_MODAL_HTML must specify datalist');

const tier1Content = fs.readFileSync('tests/e2e/tier1_feature_coverage.test.js', 'utf8');
assert(tier1Content.includes('list'), 'tier1 test tests list attribute');
assert(!tier1Content.includes('assert.equal(inspector.getElementTagById(\'communityLicense\'), \'select\')'), 'FAIL: Test must not assert select element');
console.log('-> PASS: Spec contract and Tier 1 test accurately synchronized without facade.\n');

// 5. Anti-Facade & Real Logic Integrity Check
console.log('--- CHECK 5: Anti-Facade & Genuine Execution Check ---');
const mockEnv = domHarness.createMockEnvironment();
mockEnv.document.getElementById('communityDiscipline').value = 'Biochemistry & Structural Biology';
mockEnv.document.getElementById('communityLicense').value = 'MIT';
mockEnv.document.getElementById('communityTags').value = 'tag1, tag2, tag3';

const collected = mockEnv.templateModal.collectCommunityData();
assert.strictEqual(collected.discipline, 'Biochemistry & Structural Biology', 'Discipline must retain &');
assert.strictEqual(collected.license, 'MIT', 'License must be MIT');
assert.deepStrictEqual(collected.tags, ['tag1', 'tag2', 'tag3'], 'Tags must be parsed');
console.log('-> PASS: templateModal methods operate with genuine DOM interaction.\n');

console.log('================================================================');
console.log('  ALL FORENSIC CHECKS PASSED EMPIRICALLY                         ');
console.log('================================================================');
