'use strict';

const fs = require('fs');
const assert = require('assert');
const domHarness = require('../../../tests/e2e/helpers/dom_harness.js');

console.log('=== RUNNING ADVERSARIAL STRESS TESTS FOR ITERATION 2 ===\n');

// Stress Test 1: Ampersand preservation across save/populate cycle
console.log('Stress Test 1: Ampersand and special character round-trip...');
const env = domHarness.createMockEnvironment();
env.document.getElementById('communityDiscipline').value = 'Molecular Biology & Genetics';
env.document.getElementById('communityAuthor').value = 'Barnes & Noble & Co.';
env.document.getElementById('communityTags').value = 'R&D, C&D, &amp;';

const savedData = env.templateModal.collectCommunityData();
assert.strictEqual(savedData.discipline, 'Molecular Biology & Genetics');
assert.strictEqual(savedData.author, 'Barnes & Noble & Co.');
assert.deepStrictEqual(savedData.tags, ['R&D', 'C&D', '&amp;']);

// Simulate populating form with this template
env.templateModal.clearForm();
assert.strictEqual(env.document.getElementById('communityDiscipline').value, '');

env.templateModal.populateForm({ community: savedData });
assert.strictEqual(env.document.getElementById('communityDiscipline').value, 'Molecular Biology & Genetics');
assert.strictEqual(env.document.getElementById('communityAuthor').value, 'Barnes & Noble & Co.');
assert.strictEqual(env.document.getElementById('communityTags').value, 'R&D, C&D, &amp;');
console.log('-> Passed: Ampersands and special characters round-trip with zero loss or escaping.\n');

// Stress Test 2: Custom Free-Text License Handling
console.log('Stress Test 2: Custom Free-Text License Handling...');
env.templateModal.clearForm();
env.document.getElementById('communityLicense').value = 'BSD-3-Clause-Clear';
const customLicData = env.templateModal.collectCommunityData();
assert.strictEqual(customLicData.license, 'BSD-3-Clause-Clear');

env.templateModal.clearForm();
env.templateModal.populateForm({ community: { license: 'GPL-3.0-or-later' } });
assert.strictEqual(env.document.getElementById('communityLicense').value, 'GPL-3.0-or-later');
console.log('-> Passed: Custom licenses are supported seamlessly via combobox pattern.\n');

// Stress Test 3: Datalist Uniqueness & Integrity
console.log('Stress Test 3: Datalist Uniqueness & Count verification...');
const markup = domHarness.getTemplateModalMarkup();
const inspector = new domHarness.SimpleDomInspector(markup.content);

const lists = [
    { id: 'communitySystemList', expectedCount: 18 },
    { id: 'communityDisciplineList', expectedCount: 15 },
    { id: 'communityOrganismList', expectedCount: 12 },
    { id: 'communityLicenseList', expectedCount: 6 }
];

for (const list of lists) {
    const opts = inspector.getDatalistOptions(list.id);
    assert.strictEqual(opts.length, list.expectedCount, `${list.id} must have ${list.expectedCount} options`);
    const unique = new Set(opts);
    assert.strictEqual(unique.size, opts.length, `${list.id} contains duplicate options`);
}
console.log('-> Passed: All datalists contain unique, correctly-sized option sets.\n');

// Stress Test 4: Legacy structure tab alias and auto-expand details
console.log('Stress Test 4: Legacy structure tab alias & auto-expand details...');
env.templateModal.clearForm();
assert.strictEqual(env.document.getElementById('folderStructureDetails').open, false);

env.templateModal.switchTab('structure');
assert(env.document.getElementById('metadataContent').classList.contains('active'));
assert.strictEqual(env.document.getElementById('folderStructureDetails').open, true);
console.log('-> Passed: Legacy tab alias correctly activates metadata and opens details.\n');

console.log('=== ALL ITERATION 2 ADVERSARIAL STRESS TESTS PASSED ===');
