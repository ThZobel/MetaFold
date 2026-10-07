'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING INDEPENDENT FORENSIC AUDIT VERIFICATION ===\n');

// 1. File paths
const htmlPath = path.resolve('src/components/modals/template-modal.html');
const jsPath = path.resolve('src/js/templateModal.js');

assert(fs.existsSync(htmlPath), 'template-modal.html must exist');
assert(fs.existsSync(jsPath), 'templateModal.js must exist');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const jsContent = fs.readFileSync(jsPath, 'utf8');

console.log('1. Checking template-modal.html DOM structure:');

// Tab order
const tabBtnMetaMatch = htmlContent.match(/<div[^>]*id=["']tabBtnMetadata["'][^>]*>([\s\S]*?)<\/div>/i);
assert(tabBtnMetaMatch, '#tabBtnMetadata must exist');
assert(tabBtnMetaMatch[0].includes('class="tab active"'), '#tabBtnMetadata must be active by default');

const tabBtnCommMatch = htmlContent.match(/<div[^>]*id=["']tabBtnCommunity["'][^>]*>([\s\S]*?)<\/div>/i);
assert(tabBtnCommMatch, '#tabBtnCommunity must exist');
assert(!tabBtnCommMatch[0].includes('active'), '#tabBtnCommunity must not be active by default');

// Tab contents
const metaContentMatch = htmlContent.match(/<div[^>]*id=["']metadataContent["'][^>]*class=["']([^"']*)["']/i);
assert(metaContentMatch, '#metadataContent must exist');
assert(metaContentMatch[1].includes('tab-content') && metaContentMatch[1].includes('active'), '#metadataContent must have classes tab-content active');

const commContentMatch = htmlContent.match(/<div[^>]*id=["']communityContent["'][^>]*class=["']([^"']*)["']/i);
assert(commContentMatch, '#communityContent must exist');
assert(commContentMatch[1].includes('tab-content') && !commContentMatch[1].includes('active'), '#communityContent must have class tab-content and not active');

// Collapsible folder structure
const detailsMatch = htmlContent.match(/<details[^>]*id=["']folderStructureDetails["'][\s\S]*?<\/details>/i);
assert(detailsMatch, '<details id="folderStructureDetails"> must exist');
assert(detailsMatch[0].includes('id="templateWriteFilesOnly"'), 'templateWriteFilesOnly must be inside folderStructureDetails');
assert(detailsMatch[0].includes('id="templateMultipleFolders"'), 'templateMultipleFolders must be inside folderStructureDetails');
assert(detailsMatch[0].includes('id="experimentStructure"'), 'experimentStructure must be inside folderStructureDetails');

// Datalists
function getOptions(listId) {
    const listRegex = new RegExp(`<datalist[^>]*id=["']${listId}["'][^>]*>([\\s\\S]*?)<\\/datalist>`, 'i');
    const match = htmlContent.match(listRegex);
    if (!match) return [];
    const optRegex = /<option[^>]*value=["']([^"']*)["'][^>]*>/gi;
    const opts = [];
    let m;
    while ((m = optRegex.exec(match[1])) !== null) {
        opts.push(m[1]);
    }
    return opts;
}

const sysOpts = getOptions('communitySystemList');
console.log(`- communitySystemList options count: ${sysOpts.length}`);
assert.strictEqual(sysOpts.length, 18, 'communitySystemList must have 18 options');

const discOpts = getOptions('communityDisciplineList');
console.log(`- communityDisciplineList options count: ${discOpts.length}`);
assert.strictEqual(discOpts.length, 15, 'communityDisciplineList must have 15 options');

const orgOpts = getOptions('communityOrganismList');
console.log(`- communityOrganismList options count: ${orgOpts.length}`);
assert.strictEqual(orgOpts.length, 12, 'communityOrganismList must have 12 options');

const licOpts = getOptions('communityLicenseList');
console.log(`- communityLicenseList options count: ${licOpts.length}`);
assert.strictEqual(licOpts.length, 6, 'communityLicenseList must have 6 options');

// 9 Form inputs
const requiredInputs = [
    'communitySystem',
    'communityDiscipline',
    'communityOrganism',
    'communityTags',
    'communityAuthor',
    'communityInstitution',
    'communityOrcid',
    'communityVersion',
    'communityLicense'
];
for (const id of requiredInputs) {
    assert(htmlContent.includes(`id="${id}"`), `Input #${id} must exist in template-modal.html`);
}
console.log('-> DOM markup verified successfully.\n');

console.log('2. Checking templateModal.js implementation:');

// Check for forbidden facade patterns
assert(!jsContent.includes('throw new Error("Not implemented")'), 'No NotImplementedError');
assert(!/function\s+collectCommunityData[^{]*{\s*return\s*[{}]\s*;?\s*}/.test(jsContent), 'collectCommunityData is not an empty stub');

// Evaluate templateModal with a mock DOM environment
const domState = {
    elements: {},
    reset() {
        this.elements = {
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
                    if (sel.includes('.tab-content')) return [this.elements.metadataContent, this.elements.communityContent];
                    if (sel.includes('.tab')) return [this.elements.tabBtnMetadata, this.elements.tabBtnCommunity];
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
        };
        // Add classList polyfill
        for (const el of Object.values(this.elements)) {
            if (el.classList) {
                el.classList.add = function(c) { Set.prototype.add.call(this, c); };
                el.classList.remove = function(c) { Set.prototype.delete.call(this, c); };
                el.classList.contains = function(c) { return Set.prototype.has.call(this, c); };
            }
        }
    }
};

domState.reset();

// Setup global mock
global.document = {
    getElementById: (id) => domState.elements[id] || null,
    querySelector: (sel) => null,
    querySelectorAll: (sel) => {
        if (sel.includes('#experimentTab .tab-content')) return [domState.elements.metadataContent, domState.elements.communityContent];
        if (sel.includes('#experimentTab .tab')) return [domState.elements.tabBtnMetadata, domState.elements.tabBtnCommunity];
        return [];
    },
    body: { focus: () => {} },
    createElement: () => ({ style: {}, appendChild: () => {} })
};

global.window = {
    userManager: { currentUser: 'TestUser', currentGroup: 'TestGroup' },
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
};

// Load templateModal.js
const vm = require('vm');
const context = vm.createContext({
    console,
    document: global.document,
    window: global.window,
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

assert(modal, 'templateModal object must be exported/defined');

console.log('- Testing switchTab behavior:');
modal.switchTab('community');
assert(domState.elements.communityContent.classList.contains('active'), 'communityContent must be active');
assert(!domState.elements.metadataContent.classList.contains('active'), 'metadataContent must not be active');

modal.switchTab('metadata');
assert(domState.elements.metadataContent.classList.contains('active'), 'metadataContent must be active');
assert(!domState.elements.communityContent.classList.contains('active'), 'communityContent must not be active');

// Test legacy structure alias
modal.switchTab('community');
domState.elements.folderStructureDetails.open = false;
modal.switchTab('structure');
assert(domState.elements.metadataContent.classList.contains('active'), 'metadataContent must be active on structure alias');
assert(domState.elements.folderStructureDetails.open === true, 'folderStructureDetails must be opened on structure alias');
console.log('  -> switchTab behaves correctly.');

console.log('- Testing collectCommunityData:');
domState.elements.communitySystem.value = '  Microscopy (Confocal)  ';
domState.elements.communityDiscipline.value = 'Cell Biology';
domState.elements.communityOrganism.value = 'Arabidopsis';
domState.elements.communityTags.value = ' GFP, Live-cell , , Time-lapse ';
domState.elements.communityAuthor.value = ' Alice ';
domState.elements.communityInstitution.value = ' Uni Münster ';
domState.elements.communityOrcid.value = ' 0000-0001 ';
domState.elements.communityVersion.value = ' 2.0.0 ';
domState.elements.communityLicense.value = ' MIT ';

const collected = modal.collectCommunityData();
assert.strictEqual(collected.system, 'Microscopy (Confocal)');
assert.strictEqual(collected.discipline, 'Cell Biology');
assert.strictEqual(collected.organism, 'Arabidopsis');
assert.strictEqual(JSON.stringify(collected.tags), JSON.stringify(['GFP', 'Live-cell', 'Time-lapse']));
assert.strictEqual(collected.author, 'Alice');
assert.strictEqual(collected.institution, 'Uni Münster');
assert.strictEqual(collected.orcid, '0000-0001');
assert.strictEqual(collected.version, '2.0.0');
assert.strictEqual(collected.license, 'MIT');
console.log('  -> collectCommunityData trims and parses correctly.');

console.log('- Testing populateForm deserialization:');
const sampleTemplate = {
    name: 'Sample Test',
    description: 'A sample description',
    structure: 'data/\nraw/\n',
    community: {
        system: 'Flow Cytometer',
        discipline: 'Immunology',
        organism: 'Mus musculus',
        tags: ['FACS', 'CD4', 'T-Cell'],
        author: 'Bob',
        institution: 'Lab B',
        orcid: '0000-0002',
        version: '1.2.0',
        license: 'Apache-2.0'
    }
};

modal.populateForm(sampleTemplate);
assert.strictEqual(domState.elements.templateName.value, 'Sample Test');
assert.strictEqual(domState.elements.experimentStructure.value, 'data/\nraw/\n');
assert.strictEqual(domState.elements.communitySystem.value, 'Flow Cytometer');
assert.strictEqual(domState.elements.communityDiscipline.value, 'Immunology');
assert.strictEqual(domState.elements.communityOrganism.value, 'Mus musculus');
assert.strictEqual(domState.elements.communityTags.value, 'FACS, CD4, T-Cell');
assert.strictEqual(domState.elements.communityAuthor.value, 'Bob');
assert.strictEqual(domState.elements.communityInstitution.value, 'Lab B');
assert.strictEqual(domState.elements.communityOrcid.value, '0000-0002');
assert.strictEqual(domState.elements.communityVersion.value, '1.2.0');
assert.strictEqual(domState.elements.communityLicense.value, 'Apache-2.0');
assert.strictEqual(domState.elements.folderStructureDetails.open, true, 'Folder structure details must auto-expand when structure exists');
console.log('  -> populateForm correctly unpacked community data and expanded details.');

console.log('- Testing clearForm:');
modal.clearForm();
assert.strictEqual(domState.elements.communitySystem.value, '');
assert.strictEqual(domState.elements.communityDiscipline.value, '');
assert.strictEqual(domState.elements.communityOrganism.value, '');
assert.strictEqual(domState.elements.communityTags.value, '');
assert.strictEqual(domState.elements.communityVersion.value, '1.0.0');
assert.strictEqual(domState.elements.communityLicense.value, 'CC-BY-4.0');
assert.strictEqual(domState.elements.folderStructureDetails.open, false);
console.log('  -> clearForm correctly resets fields and closes details.');

console.log('\n=== ALL FORENSIC CHECKS PASSED EMPIRICALLY ===');
