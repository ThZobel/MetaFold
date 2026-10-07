'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('=== RUNNING ADVERSARIAL STRESS TESTS ===\n');

const jsPath = path.resolve('src/js/templateModal.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');

const domState = {
    elements: {
        templateModal: { style: { display: 'none' } },
        modalTitle: { textContent: '' },
        templateName: { value: '', focus: () => {}, select: () => {} },
        templateDescription: { value: '' },
        experimentStructure: { value: '' },
        templateWriteFilesOnly: { checked: false },
        templateMultipleFolders: { checked: false },
        folderStructureDetails: { open: false },
        experimentTab: {
            style: { display: 'none' },
            querySelectorAll: (sel) => {
                if (sel.includes('.tab-content')) return [domState.elements.metadataContent, domState.elements.communityContent];
                if (sel.includes('.tab')) return [domState.elements.tabBtnMetadata, domState.elements.tabBtnCommunity];
                return [];
            }
        },
        tabBtnMetadata: { classList: new Set(['tab', 'active']), dataset: { tab: 'metadata' } },
        tabBtnCommunity: { classList: new Set(['tab']), dataset: { tab: 'community' } },
        metadataContent: { classList: new Set(['tab-content', 'active']) },
        communityContent: { classList: new Set(['tab-content']) },
        communitySystem: { value: '' },
        communityDiscipline: { value: '' },
        communityOrganism: { value: '' },
        communityTags: { value: '' },
        communityAuthor: { value: '' },
        communityInstitution: { value: '' },
        communityOrcid: { value: '' },
        communityVersion: { value: '' },
        communityLicense: { value: '' }
    }
};

for (const el of Object.values(domState.elements)) {
    if (el.classList) {
        el.classList.add = function(c) { Set.prototype.add.call(this, c); };
        el.classList.remove = function(c) { Set.prototype.delete.call(this, c); };
        el.classList.contains = function(c) { return Set.prototype.has.call(this, c); };
    }
}

const context = vm.createContext({
    console,
    document: {
        getElementById: (id) => domState.elements[id] || null,
        querySelector: () => null,
        querySelectorAll: (sel) => {
            if (sel.includes('#experimentTab .tab-content')) return [domState.elements.metadataContent, domState.elements.communityContent];
            if (sel.includes('#experimentTab .tab')) return [domState.elements.tabBtnMetadata, domState.elements.tabBtnCommunity];
            return [];
        },
        body: { focus: () => {} },
        createElement: () => ({ style: {}, appendChild: () => {} })
    },
    window: {
        userManager: { currentUser: 'Adversary', currentGroup: 'RedTeam' },
        profileManager: { isInitialized: false },
        templateTypeManager: { currentType: 'category1' },
        templateManager: {
            templates: [],
            add: async (t) => {},
            update: async (i, t) => {},
            refresh: async () => {}
        },
        metadataEditor: {
            collectMetadata: () => ({ fields: { testField: { type: 'text' } } }),
            loadMetadataIntoEditor: () => {},
            clearFields: () => {}
        }
    },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    Date: Date,
    Boolean: Boolean,
    Array: Array,
    Object: Object,
    String: String,
    JSON: JSON
});

vm.runInContext(jsContent + '\n; globalThis.testedModal = templateModal;', context);
const modal = context.testedModal;

// Stress Test 1: Empty / whitespace tags
console.log('Stress Test 1: Extreme tag formatting (spaces, commas only, weird characters)...');
domState.elements.communityTags.value = '   ,  , ,  ';
let data = modal.collectCommunityData();
assert.strictEqual(data.tags.length, 0, 'Tags with only commas and whitespace must result in empty array');

domState.elements.communityTags.value = 'Tag1,   Tag2  ,  <script>alert(1)</script> , 12345';
data = modal.collectCommunityData();
assert.strictEqual(data.tags.length, 4);
assert.strictEqual(data.tags[0], 'Tag1');
assert.strictEqual(data.tags[1], 'Tag2');
assert.strictEqual(data.tags[2], '<script>alert(1)</script>');
assert.strictEqual(data.tags[3], '12345');
console.log('-> Passed.');

// Stress Test 2: Null / undefined community on populateForm
console.log('Stress Test 2: populateForm with missing / corrupted community object...');
modal.populateForm({ name: 'Corrupt 1' }); // no community
assert.strictEqual(domState.elements.communitySystem.value, '');
assert.strictEqual(domState.elements.communityVersion.value, '1.0.0');
assert.strictEqual(domState.elements.communityLicense.value, 'CC-BY-4.0');

modal.populateForm({ name: 'Corrupt 2', community: null });
assert.strictEqual(domState.elements.communitySystem.value, '');

modal.populateForm({ name: 'Corrupt 3', community: { tags: 'legacy string' } });
assert.strictEqual(domState.elements.communityTags.value, 'legacy string');

modal.populateForm({ name: 'Corrupt 4', community: { tags: null } });
assert.strictEqual(domState.elements.communityTags.value, '');
console.log('-> Passed.');

// Stress Test 3: Tab switching with unknown tab names
console.log('Stress Test 3: switchTab with invalid / undefined tab names...');
modal.switchTab('unknownTab');
assert(!domState.elements.metadataContent.classList.contains('active'), 'metadataContent inactive');
assert(!domState.elements.communityContent.classList.contains('active'), 'communityContent inactive');

modal.switchTab(null);
assert(!domState.elements.metadataContent.classList.contains('active'));
assert(!domState.elements.communityContent.classList.contains('active'));
console.log('-> Passed.');

// Stress Test 4: Verify non-bleed into metadata.fields
console.log('Stress Test 4: Ensuring complete isolation from metadata.fields...');
const meta = context.window.metadataEditor.collectMetadata();
assert(!meta.fields.community, 'No community inside metadata.fields');
assert(!meta.fields.system, 'No system inside metadata.fields');
console.log('-> Passed.');

console.log('\n=== ALL ADVERSARIAL STRESS TESTS COMPLETED WITH PASS ===');
