'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const MODAL_HTML_PATH = path.join(PROJECT_ROOT, 'src', 'components', 'modals', 'template-modal.html');
const MODAL_JS_PATH = path.join(PROJECT_ROOT, 'src', 'js', 'templateModal.js');

// Helper to decode basic HTML entities
function decodeHtmlEntities(str) {
    if (!str) return '';
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

// Helper to normalize objects/arrays across VM boundary
function toHost(val) {
    if (val === undefined) return undefined;
    return JSON.parse(JSON.stringify(val));
}

// Helper to parse HTML datalist options from raw HTML
function parseDatalistOptions(html, datalistId) {
    const regex = new RegExp(`<datalist[^>]*id=["']${datalistId}["'][^>]*>([\\s\\S]*?)<\\/datalist>`, 'i');
    const match = html.match(regex);
    if (!match) return { raw: [], decoded: [] };
    const inner = match[1];
    const optRegex = /<option[^>]*value=["']([^"']*)["'][^>]*>/gi;
    const raw = [];
    const decoded = [];
    let m;
    while ((m = optRegex.exec(inner)) !== null) {
        raw.push(m[1]);
        decoded.push(decodeHtmlEntities(m[1]));
    }
    return { raw, decoded };
}

// Create an execution environment that runs the ACTUAL templateModal.js code
function createRealTemplateModalEnvironment(initialValues = {}) {
    const rawHtml = fs.readFileSync(MODAL_HTML_PATH, 'utf8');
    const jsCode = fs.readFileSync(MODAL_JS_PATH, 'utf8');

    const elements = new Map();

    function makeElement(id, tag, props = {}) {
        const classSet = new Set(props.classes || []);
        const elem = {
            id,
            tagName: tag.toUpperCase(),
            value: props.value !== undefined ? props.value : '',
            checked: Boolean(props.checked),
            style: { display: props.display || 'block' },
            classList: {
                add(...classes) { classes.forEach(c => classSet.add(c)); },
                remove(...classes) { classes.forEach(c => classSet.delete(c)); },
                contains(c) { return classSet.has(c); },
                toggle(c) { if (classSet.has(c)) classSet.delete(c); else classSet.add(c); }
            },
            open: Boolean(props.open),
            innerHTML: props.innerHTML || '',
            textContent: props.textContent || '',
            children: [],
            parentElement: null,
            nextSibling: {},
            closest(sel) { return elem; },
            insertAdjacentHTML(pos, html) {},
            querySelector(sel) { return null; },
            querySelectorAll(sel) { return []; },
            setAttribute(k, v) { elem[k] = v; },
            getAttribute(k) { return elem[k]; },
            appendChild(child) { if (child) child.parentElement = elem; elem.children.push(child); return child; },
            removeChild(child) { const i = elem.children.indexOf(child); if (i !== -1) elem.children.splice(i, 1); return child; },
            focus() { elem._focused = true; },
            select() { elem._selected = true; }
        };
        elements.set(id, elem);
        return elem;
    }

    // Initialize DOM elements reflecting template-modal.html
    makeElement('templateModal', 'div', { display: 'none' });
    makeElement('modalTitle', 'h2', { textContent: 'Create New Template' });
    makeElement('templateName', 'input', { value: initialValues.templateName || '' });
    makeElement('templateDescription', 'input', { value: initialValues.templateDescription || '' });
    makeElement('experimentTab', 'div', { display: 'block' });
    makeElement('tabBtnMetadata', 'div', { classes: ['tab', 'active'] });
    makeElement('tabBtnCommunity', 'div', { classes: ['tab'] });
    makeElement('metadataContent', 'div', { classes: ['tab-content', 'active'] });
    makeElement('communityContent', 'div', { classes: ['tab-content'] });
    makeElement('folderStructureDetails', 'details', { open: false });
    makeElement('templateWriteFilesOnly', 'input', { checked: Boolean(initialValues.writeFilesOnly) });
    makeElement('templateMultipleFolders', 'input', { checked: Boolean(initialValues.multipleFolders) });
    makeElement('experimentStructure', 'textarea', { value: initialValues.experimentStructure || '' });

    // Community elements
    makeElement('communitySystem', 'input', { value: initialValues.communitySystem || '' });
    makeElement('communityDiscipline', 'input', { value: initialValues.communityDiscipline || '' });
    makeElement('communityOrganism', 'input', { value: initialValues.communityOrganism || '' });
    makeElement('communityTags', 'input', { value: initialValues.communityTags || '' });
    makeElement('communityAuthor', 'input', { value: initialValues.communityAuthor || '' });
    makeElement('communityInstitution', 'input', { value: initialValues.communityInstitution || '' });
    makeElement('communityOrcid', 'input', { value: initialValues.communityOrcid || '' });
    makeElement('communityVersion', 'input', { value: initialValues.communityVersion || '1.0.0' });
    makeElement('communityLicense', 'input', { value: initialValues.communityLicense || 'CC-BY-4.0' });

    const documentMock = {
        getElementById(id) {
            return elements.get(id) || null;
        },
        querySelector(sel) {
            if (sel.startsWith('#')) return elements.get(sel.slice(1)) || null;
            if (sel.includes('data-tab="metadata"')) return elements.get('tabBtnMetadata');
            if (sel.includes('data-tab="community"')) return elements.get('tabBtnCommunity');
            if (sel.includes('input:not([disabled])')) return elements.get('templateName');
            return null;
        },
        querySelectorAll(sel) {
            if (sel.includes('.tab-content')) {
                return [elements.get('metadataContent'), elements.get('communityContent')].filter(Boolean);
            }
            if (sel.includes('.tab')) {
                return [elements.get('tabBtnMetadata'), elements.get('tabBtnCommunity')].filter(Boolean);
            }
            return [];
        },
        createElement(tag) {
            return makeElement('elem_' + Math.random().toString(36).substring(2), tag);
        },
        head: makeElement('head', 'head'),
        body: makeElement('body', 'body')
    };

    const windowMock = {
        userManager: {
            currentUser: 'Dr. Thomas Zobel',
            currentGroup: 'Imaging Core Facility'
        },
        profileManager: {
            isInitialized: true,
            getUserByUsername(username) {
                return {
                    username,
                    fullName: 'Dr. Thomas Zobel',
                    primaryGroupId: 'group1',
                    orcid: '0000-0002-1825-0097'
                };
            },
            getGroupById(id) {
                return {
                    id,
                    institution: 'University of Münster'
                };
            }
        },
        templateTypeManager: { currentType: 'category1' },
        metadataEditor: {
            collectMetadata() {
                return initialValues.mockMetadata || {
                    fields: { sample_name: { type: 'text', label: 'Sample' } }
                };
            },
            clearFields() {},
            loadMetadataIntoEditor() {}
        },
        templateManager: {
            currentTemplate: null,
            templates: [],
            async update(idx, t) { this.savedTemplate = t; },
            async refresh() {},
            async save() {}
        }
    };

    const sandbox = {
        window: windowMock,
        document: documentMock,
        console: { log: () => {}, warn: () => {}, error: () => {} },
        setTimeout: (fn) => fn(),
        Date: Date,
        JSON: JSON,
        Array: Array,
        Object: Object,
        String: String,
        Boolean: Boolean,
        Set: Set,
        Map: Map,
        RegExp: RegExp
    };
    sandbox.window.document = documentMock;
    sandbox.window.window = windowMock;

    vm.createContext(sandbox);
    vm.runInContext(jsCode, sandbox);

    return {
        templateModal: sandbox.window.templateModal,
        elements,
        document: documentMock,
        window: windowMock
    };
}

// =============================================================================
// TEST SUITE: Milestone 1 Empirical Verification & Adversarial Stress Testing
// =============================================================================

test.describe('Milestone 1 Empirical Challenger Suite', () => {

    const htmlContent = fs.readFileSync(MODAL_HTML_PATH, 'utf8');

    // -------------------------------------------------------------------------
    // 1. DOM MARKUP & STRUCTURAL INVARIANTS
    // -------------------------------------------------------------------------
    test.describe('1. DOM Markup & Structural Invariants (template-modal.html)', () => {

        test('1.1: Element existence for tab headers and panels', () => {
            assert.ok(htmlContent.includes('id="tabBtnMetadata"'), '#tabBtnMetadata must exist');
            assert.ok(htmlContent.includes('id="tabBtnCommunity"'), '#tabBtnCommunity must exist');
            assert.ok(htmlContent.includes('id="metadataContent"'), '#metadataContent must exist');
            assert.ok(htmlContent.includes('id="communityContent"'), '#communityContent must exist');
        });

        test('1.2: Metadata tab is active by default in HTML', () => {
            const metaBtnMatch = htmlContent.match(/<div[^>]*\bid=["']tabBtnMetadata["'][^>]*>/i);
            assert.ok(metaBtnMatch, '#tabBtnMetadata tag must exist');
            assert.ok(/class=["'][^"']*\bactive\b[^"']*["']/.test(metaBtnMatch[0]), '#tabBtnMetadata must have class "active"');

            const metaContentMatch = htmlContent.match(/<div[^>]*\bid=["']metadataContent["'][^>]*>/i);
            assert.ok(metaContentMatch, '#metadataContent tag must exist');
            assert.ok(/class=["'][^"']*\bactive\b[^"']*["']/.test(metaContentMatch[0]), '#metadataContent must have class "active"');
        });

        test('1.3: Community tab is NOT active by default in HTML', () => {
            const commBtnMatch = htmlContent.match(/<div[^>]*\bid=["']tabBtnCommunity["'][^>]*>/i);
            assert.ok(commBtnMatch, '#tabBtnCommunity tag must exist');
            assert.equal(/class=["'][^"']*\bactive\b[^"']*["']/.test(commBtnMatch[0]), false, '#tabBtnCommunity must NOT have class "active"');

            const commContentMatch = htmlContent.match(/<div[^>]*\bid=["']communityContent["'][^>]*>/i);
            assert.ok(commContentMatch, '#communityContent tag must exist');
            assert.equal(/class=["'][^"']*\bactive\b[^"']*["']/.test(commContentMatch[0]), false, '#communityContent must NOT have class "active"');
        });

        test('1.4: Folder structure section is enclosed in <details id="folderStructureDetails">', () => {
            assert.ok(htmlContent.includes('<details id="folderStructureDetails"'), '<details id="folderStructureDetails"> must exist');
            
            // Extract the details block
            const detailsMatch = htmlContent.match(/<details[^>]*id=["']folderStructureDetails["'][^>]*>([\s\S]*?)<\/details>/i);
            assert.ok(detailsMatch, 'Must find closing </details> for folderStructureDetails');
            const inner = detailsMatch[1];

            assert.ok(inner.includes('id="templateWriteFilesOnly"'), 'templateWriteFilesOnly must be inside details');
            assert.ok(inner.includes('id="templateMultipleFolders"'), 'templateMultipleFolders must be inside details');
            assert.ok(inner.includes('id="experimentStructure"'), 'experimentStructure must be inside details');
        });

        test('1.5: <details id="folderStructureDetails"> is strictly nested within #metadataContent', () => {
            const metaContentMatch = htmlContent.match(/<div[^>]*id=["']metadataContent["'][^>]*>([\s\S]*?)<\/div>\s*<!-- Tab 2/i);
            assert.ok(metaContentMatch, 'Must locate #metadataContent container boundary');
            assert.ok(metaContentMatch[1].includes('id="folderStructureDetails"'), 'folderStructureDetails must be inside #metadataContent');
        });

        test('1.6: All 9 community input elements exist with correct IDs and attributes', () => {
            assert.ok(htmlContent.includes('id="communitySystem"'), '#communitySystem exists');
            assert.ok(htmlContent.includes('list="communitySystemList"'), '#communitySystem links to datalist');

            assert.ok(htmlContent.includes('id="communityDiscipline"'), '#communityDiscipline exists');
            assert.ok(htmlContent.includes('list="communityDisciplineList"'), '#communityDiscipline links to datalist');

            assert.ok(htmlContent.includes('id="communityOrganism"'), '#communityOrganism exists');
            assert.ok(htmlContent.includes('list="communityOrganismList"'), '#communityOrganism links to datalist');

            assert.ok(htmlContent.includes('id="communityTags"'), '#communityTags exists');
            assert.ok(htmlContent.includes('id="communityAuthor"'), '#communityAuthor exists');
            assert.ok(htmlContent.includes('id="communityInstitution"'), '#communityInstitution exists');
            assert.ok(htmlContent.includes('id="communityOrcid"'), '#communityOrcid exists');
            assert.ok(htmlContent.includes('id="communityVersion"'), '#communityVersion exists');
            assert.ok(htmlContent.includes('id="communityLicense"'), '#communityLicense exists');
            assert.ok(htmlContent.includes('list="communityLicenseList"'), '#communityLicense links to datalist');
        });
    });

    // -------------------------------------------------------------------------
    // 2. DATALIST TAXONOMY COUNTS & CONTENT
    // -------------------------------------------------------------------------
    test.describe('2. Datalist Option Counts and Values', () => {

        test('2.1: communitySystemList contains exactly 18 options', () => {
            const opts = parseDatalistOptions(htmlContent, 'communitySystemList');
            assert.equal(opts.raw.length, 18, 'System datalist must contain exactly 18 options');
            assert.ok(opts.raw.includes('Microscopy (Light / Widefield)'));
            assert.ok(opts.raw.includes('Microscopy (Confocal / 2-Photon)'));
            assert.ok(opts.raw.includes('Microscopy (Super-Resolution / STED / SIM / STORM)'));
            assert.ok(opts.raw.includes('Microscopy (Light Sheet / SPIM)'));
            assert.ok(opts.raw.includes('Microscopy (Electron / SEM / TEM / Cryo-EM)'));
            assert.ok(opts.raw.includes('Plate Reader / Spectrophotometer'));
            assert.ok(opts.raw.includes('Flow Cytometer / FACS'));
            assert.ok(opts.raw.includes('Sequencer (NGS / Illumina / Nanopore / PacBio)'));
            assert.ok(opts.raw.includes('Mass Spectrometer (Proteomics / Metabolomics)'));
            assert.ok(opts.raw.includes('Chromatography (HPLC / FPLC / GC)'));
            assert.ok(opts.raw.includes('Wet Lab: PCR / qPCR / Thermal Cycler'));
            assert.ok(opts.raw.includes('Wet Lab: Staining / Histology / Immunofluorescence'));
            assert.ok(opts.raw.includes('Wet Lab: Sample Prep / Extraction / Purification'));
            assert.ok(opts.raw.includes('Wet Lab: Gel Imaging / Western Blot'));
            assert.ok(opts.raw.includes('Wet Lab: Cell Culture / Incubator / Bioreactor'));
            assert.ok(opts.raw.includes('Wet Lab: General Bench Protocol'));
            assert.ok(opts.raw.includes('Data Analysis / Bioimage Analysis'));
            assert.ok(opts.raw.includes('Hardware / 3D Printing / Prototyping'));
        });

        test('2.2: communityDisciplineList contains exactly 15 options (Decoded & Raw Analysis)', () => {
            const opts = parseDatalistOptions(htmlContent, 'communityDisciplineList');
            assert.equal(opts.raw.length, 15, 'Discipline datalist must contain exactly 15 options');

            // Verify decoded values match the canonical scientific domains
            const expectedDecoded = [
                'Plant Biology / Botany',
                'Cell Biology',
                'Neuroscience',
                'Developmental Biology',
                'Microbiology / Bacteriology',
                'Virology',
                'Immunology',
                'Molecular Biology & Genetics',
                'Biochemistry & Structural Biology',
                'Biophysics',
                'Pharmacology & Toxicology',
                'Ecology & Evolution',
                'Material Science & Physics',
                'Chemistry & Synthesis',
                'Computer Science & Data Engineering'
            ];
            assert.deepEqual([...opts.decoded].sort(), [...expectedDecoded].sort());

            // Verified: HTML source uses clean literal '&' rather than entity-encoded '&amp;'
            const ampOptions = opts.raw.filter(o => o.includes('&amp;'));
            assert.equal(ampOptions.length, 0, 'No HTML entity-encoded ampersands should be present in discipline options');
        });

        test('2.3: communityOrganismList contains exactly 12 options', () => {
            const opts = parseDatalistOptions(htmlContent, 'communityOrganismList');
            assert.equal(opts.raw.length, 12, 'Organism datalist must contain exactly 12 options');
            assert.ok(opts.raw.includes('Arabidopsis thaliana'));
            assert.ok(opts.raw.includes('Danio rerio'));
            assert.ok(opts.raw.includes('Mus musculus'));
            assert.ok(opts.raw.includes('Rattus norvegicus'));
            assert.ok(opts.raw.includes('Drosophila melanogaster'));
            assert.ok(opts.raw.includes('Caenorhabditis elegans'));
            assert.ok(opts.raw.includes('Homo sapiens / Human Cell Lines'));
            assert.ok(opts.raw.includes('Saccharomyces cerevisiae / Yeast'));
            assert.ok(opts.raw.includes('Escherichia coli / Bacteria'));
            assert.ok(opts.raw.includes('Viruses / Phages'));
            assert.ok(opts.raw.includes('Organoids / 3D Tissues'));
            assert.ok(opts.raw.includes('Non-biological / In vitro / Synthetic'));
        });

        test('2.4: communityLicenseList contains exactly 6 options', () => {
            const opts = parseDatalistOptions(htmlContent, 'communityLicenseList');
            assert.equal(opts.raw.length, 6, 'License datalist must contain exactly 6 options');
            assert.deepEqual(opts.raw.sort(), ['Apache-2.0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'CC0-1.0', 'MIT', 'Other'].sort());
        });
    });

    // -------------------------------------------------------------------------
    // 3. CONTROLLER TAB SWITCHING & BACKWARD COMPATIBILITY
    // -------------------------------------------------------------------------
    test.describe('3. Controller Tab Switching Mechanics (templateModal.js)', () => {

        test('3.1: switchTab("community") activates community tab and deactivates metadata tab', () => {
            const env = createRealTemplateModalEnvironment();
            env.templateModal.switchTab('community');

            assert.ok(env.elements.get('communityContent').classList.contains('active'), 'communityContent must have active');
            assert.ok(env.elements.get('tabBtnCommunity').classList.contains('active'), 'tabBtnCommunity must have active');
            assert.equal(env.elements.get('metadataContent').classList.contains('active'), false, 'metadataContent must NOT have active');
            assert.equal(env.elements.get('tabBtnMetadata').classList.contains('active'), false, 'tabBtnMetadata must NOT have active');
        });

        test('3.2: switchTab("metadata") returns to metadata tab cleanly', () => {
            const env = createRealTemplateModalEnvironment();
            env.templateModal.switchTab('community');
            env.templateModal.switchTab('metadata');

            assert.ok(env.elements.get('metadataContent').classList.contains('active'), 'metadataContent must have active');
            assert.ok(env.elements.get('tabBtnMetadata').classList.contains('active'), 'tabBtnMetadata must have active');
            assert.equal(env.elements.get('communityContent').classList.contains('active'), false, 'communityContent must NOT have active');
            assert.equal(env.elements.get('tabBtnCommunity').classList.contains('active'), false, 'tabBtnCommunity must NOT have active');
        });

        test('3.3: switchTab("structure") aliases to metadata and auto-expands folder structure', () => {
            const env = createRealTemplateModalEnvironment();
            const details = env.elements.get('folderStructureDetails');
            details.open = false;

            env.templateModal.switchTab('structure');

            assert.ok(env.elements.get('metadataContent').classList.contains('active'), 'metadataContent must be active for legacy structure');
            assert.ok(env.elements.get('tabBtnMetadata').classList.contains('active'), 'tabBtnMetadata must be active for legacy structure');
            assert.equal(details.open, true, 'folderStructureDetails must be auto-expanded');
        });

        test('3.4: show() enforces metadata tab as default active', async () => {
            const env = createRealTemplateModalEnvironment();
            // Start with community active
            env.templateModal.switchTab('community');

            await env.templateModal.show();

            assert.ok(env.elements.get('metadataContent').classList.contains('active'));
            assert.ok(env.elements.get('tabBtnMetadata').classList.contains('active'));
            assert.equal(env.elements.get('communityContent').classList.contains('active'), false);
        });

        test('3.5: openForEdit() enforces metadata tab as default active', async () => {
            const env = createRealTemplateModalEnvironment();
            env.templateModal.switchTab('community');

            await env.templateModal.openForEdit(0, { name: 'Test Template', community: {} });

            assert.ok(env.elements.get('metadataContent').classList.contains('active'));
            assert.ok(env.elements.get('tabBtnMetadata').classList.contains('active'));
            assert.equal(env.elements.get('communityContent').classList.contains('active'), false);
        });

        test('3.6: switchTab with invalid tabName deactivates all tabs without throwing', () => {
            const env = createRealTemplateModalEnvironment();
            assert.doesNotThrow(() => {
                env.templateModal.switchTab('non_existent_tab');
            });
            assert.equal(env.elements.get('metadataContent').classList.contains('active'), false);
            assert.equal(env.elements.get('communityContent').classList.contains('active'), false);
        });
    });

    // -------------------------------------------------------------------------
    // 4. DATA COLLECTION (collectCommunityData) & STRESS TESTING
    // -------------------------------------------------------------------------
    test.describe('4. collectCommunityData() Logic & Extreme Input Stress Testing', () => {

        test('4.1: Standard happy path data collection', () => {
            const env = createRealTemplateModalEnvironment({
                communitySystem: 'Microscopy (Confocal / 2-Photon)',
                communityDiscipline: 'Neuroscience',
                communityOrganism: 'Mus musculus',
                communityTags: 'Live-cell, GFP, 2-Photon',
                communityAuthor: 'Dr. Jane Doe',
                communityInstitution: 'Max Planck Institute',
                communityOrcid: '0000-0001-2345-6789',
                communityVersion: '1.2.0',
                communityLicense: 'MIT'
            });

            const data = env.templateModal.collectCommunityData();

            assert.equal(data.system, 'Microscopy (Confocal / 2-Photon)');
            assert.equal(data.discipline, 'Neuroscience');
            assert.equal(data.organism, 'Mus musculus');
            assert.deepEqual(toHost(data.tags), ['Live-cell', 'GFP', '2-Photon']);
            assert.equal(data.author, 'Dr. Jane Doe');
            assert.equal(data.institution, 'Max Planck Institute');
            assert.equal(data.orcid, '0000-0001-2345-6789');
            assert.equal(data.version, '1.2.0');
            assert.equal(data.license, 'MIT');
        });

        test('4.2: Empty inputs produce valid schema with empty strings and defaults', () => {
            const env = createRealTemplateModalEnvironment({
                communitySystem: '',
                communityDiscipline: '',
                communityOrganism: '',
                communityTags: '',
                communityAuthor: '',
                communityInstitution: '',
                communityOrcid: '',
                communityVersion: '',
                communityLicense: ''
            });

            const data = env.templateModal.collectCommunityData();

            assert.equal(data.system, '');
            assert.equal(data.discipline, '');
            assert.equal(data.organism, '');
            assert.deepEqual(toHost(data.tags), []);
            assert.equal(data.author, '');
            assert.equal(data.institution, '');
            assert.equal(data.orcid, '');
            assert.equal(data.version, '1.0.0'); // defaults
            assert.equal(data.license, 'CC-BY-4.0'); // defaults
        });

        test('4.3: Whitespace trimming on text inputs and tags parsing', () => {
            const env = createRealTemplateModalEnvironment({
                communitySystem: '   Microscopy (Light Sheet / SPIM)   ',
                communityDiscipline: '   Plant Biology / Botany   ',
                communityOrganism: '   Arabidopsis thaliana   ',
                communityTags: '  Root ,  ,  GFP  , ,   Time-Lapse  ,  ',
                communityAuthor: '   Prof. Smith   ',
                communityInstitution: '   WWU Münster   ',
                communityOrcid: '   0000-0002-9999-0000   ',
                communityVersion: '   2.0.1   ',
                communityLicense: '   Apache-2.0   '
            });

            const data = env.templateModal.collectCommunityData();

            assert.equal(data.system, 'Microscopy (Light Sheet / SPIM)');
            assert.equal(data.discipline, 'Plant Biology / Botany');
            assert.equal(data.organism, 'Arabidopsis thaliana');
            assert.deepEqual(toHost(data.tags), ['Root', 'GFP', 'Time-Lapse']);
            assert.equal(data.author, 'Prof. Smith');
            assert.equal(data.institution, 'WWU Münster');
            assert.equal(data.orcid, '0000-0002-9999-0000');
            assert.equal(data.version, '2.0.1');
            assert.equal(data.license, 'Apache-2.0');
        });

        test('4.4: Boundary: Tags with consecutive commas, whitespace-only tags, and special characters', () => {
            const env = createRealTemplateModalEnvironment({
                communityTags: ',,,,   , tag-with-dash, tag_with_underscore, tag.with.dots, #Hashtag, 100%_Yield, 4D/5D, '
            });

            const data = env.templateModal.collectCommunityData();

            assert.deepEqual(toHost(data.tags), [
                'tag-with-dash',
                'tag_with_underscore',
                'tag.with.dots',
                '#Hashtag',
                '100%_Yield',
                '4D/5D'
            ]);
        });

        test('4.5: Unicode, Multilingual, and Emoji handling', () => {
            const env = createRealTemplateModalEnvironment({
                communitySystem: '🔬 Mikroskopie (Lichtblatt / Konfokal)',
                communityDiscipline: '生物学 / 細胞生物学',
                communityOrganism: 'Caenorhabditis elegans (線虫)',
                communityTags: '🧬 CRISPR-Cas9, 🧪 PCR, 🌟 GFP, عربي, עברית, Deutsch-ÄÖÜß',
                communityAuthor: 'Dr. René François Müller',
                communityInstitution: 'Institut Curie & Universität zu Köln',
                communityOrcid: '0000-0002-1825-0097'
            });

            const data = env.templateModal.collectCommunityData();

            assert.equal(data.system, '🔬 Mikroskopie (Lichtblatt / Konfokal)');
            assert.equal(data.discipline, '生物学 / 細胞生物学');
            assert.equal(data.organism, 'Caenorhabditis elegans (線虫)');
            assert.deepEqual(toHost(data.tags), ['🧬 CRISPR-Cas9', '🧪 PCR', '🌟 GFP', 'عربي', 'עברית', 'Deutsch-ÄÖÜß']);
            assert.equal(data.author, 'Dr. René François Müller');
            assert.equal(data.institution, 'Institut Curie & Universität zu Köln');
        });

        test('4.6: Adversarial: XSS, SQLi, and HTML injection payloads are preserved safely as strings', () => {
            const xssPayload = '<script>alert("XSS")</script>';
            const imgPayload = '<img src=x onerror=alert(document.cookie)>';
            const sqliPayload = "'; DROP TABLE Templates; --";
            const htmlPayload = '<div style="background:red">Attack</div>';

            const env = createRealTemplateModalEnvironment({
                communitySystem: xssPayload,
                communityDiscipline: sqliPayload,
                communityOrganism: htmlPayload,
                communityTags: `${xssPayload}, ${imgPayload}, normalTag`,
                communityAuthor: imgPayload
            });

            const data = env.templateModal.collectCommunityData();

            assert.equal(data.system, xssPayload);
            assert.equal(data.discipline, sqliPayload);
            assert.equal(data.organism, htmlPayload);
            assert.deepEqual(toHost(data.tags), [xssPayload, imgPayload, 'normalTag']);
            assert.equal(data.author, imgPayload);
        });

        test('4.7: Extreme input scale: 10,000 characters and 500 tags', () => {
            const hugeString = 'X'.repeat(10000);
            const manyTags = Array.from({ length: 500 }, (_, i) => `tag_${i}`).join(', ');

            const env = createRealTemplateModalEnvironment({
                communityAuthor: hugeString,
                communityTags: manyTags
            });

            const data = env.templateModal.collectCommunityData();

            assert.equal(data.author.length, 10000);
            assert.equal(data.tags.length, 500);
            assert.equal(data.tags[499], 'tag_499');
        });

        test('4.8: Complex semver version formats', () => {
            const semvers = [
                '1.0.0-alpha.1+build.20261006',
                '0.0.1-rc-3',
                '2.1.0-beta.12',
                '1.0.0-0.3.7',
                'v2.0.0'
            ];

            for (const sv of semvers) {
                const env = createRealTemplateModalEnvironment({ communityVersion: sv });
                const data = env.templateModal.collectCommunityData();
                assert.equal(data.version, sv);
            }
        });
    });

    // -------------------------------------------------------------------------
    // 5. DESERIALIZATION (populateForm) & FORM LIFECYCLE
    // -------------------------------------------------------------------------
    test.describe('5. populateForm() Deserialization & Form Lifecycle', () => {

        test('5.1: populateForm unrolls community object into inputs correctly', () => {
            const env = createRealTemplateModalEnvironment();
            const template = {
                name: 'Airyscan Protocol',
                description: 'Fast super-res',
                type: 'experiment',
                category: 'category1',
                structure: '',
                community: {
                    system: 'Microscopy (Super-Resolution / STED / SIM / STORM)',
                    discipline: 'Cell Biology',
                    organism: 'Homo sapiens / Human Cell Lines',
                    tags: ['Airyscan', 'HeLa', 'Nuclear Pore'],
                    author: 'Dr. Jane Researcher',
                    institution: 'Charité Berlin',
                    orcid: '0000-0003-4567-8901',
                    version: '2.1.0',
                    license: 'CC0-1.0'
                }
            };

            env.templateModal.populateForm(template);

            assert.equal(env.elements.get('communitySystem').value, 'Microscopy (Super-Resolution / STED / SIM / STORM)');
            assert.equal(env.elements.get('communityDiscipline').value, 'Cell Biology');
            assert.equal(env.elements.get('communityOrganism').value, 'Homo sapiens / Human Cell Lines');
            assert.equal(env.elements.get('communityTags').value, 'Airyscan, HeLa, Nuclear Pore');
            assert.equal(env.elements.get('communityAuthor').value, 'Dr. Jane Researcher');
            assert.equal(env.elements.get('communityInstitution').value, 'Charité Berlin');
            assert.equal(env.elements.get('communityOrcid').value, '0000-0003-4567-8901');
            assert.equal(env.elements.get('communityVersion').value, '2.1.0');
            assert.equal(env.elements.get('communityLicense').value, 'CC0-1.0');
        });

        test('5.2: populateForm handles legacy template with missing community object gracefully', () => {
            const env = createRealTemplateModalEnvironment();
            const legacyTemplate = {
                name: 'Old Legacy Template',
                description: 'Created before Phase 1',
                type: 'experiment',
                structure: 'data/\nraw/'
            };

            env.templateModal.populateForm(legacyTemplate);

            assert.equal(env.elements.get('communitySystem').value, '');
            assert.equal(env.elements.get('communityDiscipline').value, '');
            assert.equal(env.elements.get('communityOrganism').value, '');
            assert.equal(env.elements.get('communityTags').value, '');
            assert.equal(env.elements.get('communityAuthor').value, 'Dr. Thomas Zobel'); // Profile default
            assert.equal(env.elements.get('communityInstitution').value, 'University of Münster'); // Profile default
            assert.equal(env.elements.get('communityOrcid').value, '0000-0002-1825-0097'); // Profile default
            assert.equal(env.elements.get('communityVersion').value, '1.0.0');
            assert.equal(env.elements.get('communityLicense').value, 'CC-BY-4.0');
        });

        test('5.3: populateForm auto-expands folder structure details when structure is present', () => {
            const env = createRealTemplateModalEnvironment();
            const templateWithStructure = {
                name: 'Structured Experiment',
                structure: 'raw/\nprocessed/\nresults/'
            };

            env.templateModal.populateForm(templateWithStructure);
            assert.equal(env.elements.get('folderStructureDetails').open, true);
        });

        test('5.4: populateForm auto-expands folder structure details when options are set', () => {
            const env = createRealTemplateModalEnvironment();
            const templateWithOptions = {
                name: 'Batch Template',
                structure: '',
                options: { multipleFolders: true }
            };

            env.templateModal.populateForm(templateWithOptions);
            assert.equal(env.elements.get('folderStructureDetails').open, true);
        });

        test('5.5: populateForm keeps folder structure collapsed when no structure or options present', () => {
            const env = createRealTemplateModalEnvironment();
            const simpleTemplate = {
                name: 'Simple Template',
                structure: '',
                options: { writeFilesOnly: false, multipleFolders: false }
            };

            env.templateModal.populateForm(simpleTemplate);
            assert.equal(env.elements.get('folderStructureDetails').open, false);
        });

        test('5.6: clearForm() resets all community inputs and closes folder structure details', () => {
            const env = createRealTemplateModalEnvironment({
                communitySystem: 'Flow Cytometer / FACS',
                communityDiscipline: 'Immunology',
                communityTags: 'FACS, CD4',
                experimentStructure: 'data/'
            });
            env.elements.get('folderStructureDetails').open = true;

            env.templateModal.clearForm();

            assert.equal(env.elements.get('communitySystem').value, '');
            assert.equal(env.elements.get('communityDiscipline').value, '');
            assert.equal(env.elements.get('communityOrganism').value, '');
            assert.equal(env.elements.get('communityTags').value, '');
            assert.equal(env.elements.get('communityVersion').value, '1.0.0');
            assert.equal(env.elements.get('communityLicense').value, 'CC-BY-4.0');
            assert.equal(env.elements.get('communityAuthor').value, 'Dr. Thomas Zobel');
            assert.equal(env.elements.get('communityInstitution').value, 'University of Münster');
            assert.equal(env.elements.get('folderStructureDetails').open, false);
        });
    });

    // -------------------------------------------------------------------------
    // 6. SERIALIZATION (save / saveAsNewTemplate) & DOWNSTREAM ISOLATION
    // -------------------------------------------------------------------------
    test.describe('6. Serialization & Downstream Lab Isolation (templateModal.js)', () => {

        test('6.1: save() attaches community object at root level, completely isolated from metadata', async () => {
            const env = createRealTemplateModalEnvironment({
                templateName: 'Confocal Imaging',
                templateDescription: 'Standard protocol',
                communitySystem: 'Microscopy (Confocal / 2-Photon)',
                communityDiscipline: 'Neuroscience',
                communityOrganism: 'Mus musculus',
                communityTags: 'Confocal, Brain, GFP',
                communityAuthor: 'Dr. Thomas Zobel',
                communityVersion: '1.0.0',
                communityLicense: 'CC-BY-4.0',
                mockMetadata: {
                    fields: {
                        laser_power: { type: 'number', label: 'Laser Power (%)', value: 15 },
                        objective: { type: 'text', label: 'Objective', value: '63x Oil' }
                    }
                }
            });

            // Set editing mode
            env.templateModal.editingIndex = 0;
            await env.templateModal.save();

            const saved = env.window.templateManager.savedTemplate;
            assert.ok(saved, 'Template must be saved');

            // Root-level community object
            assert.ok(saved.community, 'saved.community must exist at root level');
            assert.equal(saved.community.system, 'Microscopy (Confocal / 2-Photon)');
            assert.equal(saved.community.discipline, 'Neuroscience');
            assert.equal(saved.community.organism, 'Mus musculus');
            assert.deepEqual(toHost(saved.community.tags), ['Confocal', 'Brain', 'GFP']);

            // Metadata isolation: community keys must NOT exist in metadata.fields
            assert.ok(saved.metadata, 'saved.metadata must exist');
            assert.ok(saved.metadata.fields, 'saved.metadata.fields must exist');
            assert.ok(saved.metadata.fields.laser_power, 'laser_power field preserved');
            assert.ok(saved.metadata.fields.objective, 'objective field preserved');

            const communityKeys = ['system', 'discipline', 'organism', 'tags', 'author', 'institution', 'orcid', 'version', 'license'];
            for (const key of communityKeys) {
                assert.equal(key in saved.metadata.fields, false, `Community key "${key}" must NOT leak into metadata.fields`);
            }
        });

        test('6.2: saveAsNewTemplate() preserves community object and appends "(Copy)"', async () => {
            const env = createRealTemplateModalEnvironment({
                templateName: 'Base Template',
                communitySystem: 'Plate Reader / Spectrophotometer',
                communityDiscipline: 'Biochemistry & Structural Biology',
                communityOrganism: 'Escherichia coli / Bacteria',
                communityTags: 'OD600, Growth'
            });

            env.window.templateManager.add = async function (tmpl) {
                this.addedTemplate = tmpl;
            };

            await env.templateModal.saveAsNewTemplate();

            const added = env.window.templateManager.addedTemplate;
            assert.ok(added, 'New template must be added');
            assert.equal(added.name, 'Base Template (Copy)');
            assert.ok(added.community, 'added.community must exist');
            assert.equal(added.community.system, 'Plate Reader / Spectrophotometer');
            assert.equal(added.community.discipline, 'Biochemistry & Structural Biology');
            assert.equal(added.community.organism, 'Escherichia coli / Bacteria');
            assert.deepEqual(toHost(added.community.tags), ['OD600', 'Growth']);
        });

        test('6.3: Serialization round-trip fidelity (save -> populate -> save)', async () => {
            const env = createRealTemplateModalEnvironment({
                templateName: 'Roundtrip Test',
                communitySystem: 'Flow Cytometer / FACS',
                communityDiscipline: 'Immunology',
                communityOrganism: 'Mus musculus',
                communityTags: 'CD4, CD8, FACS',
                communityAuthor: 'Immunologist',
                communityInstitution: 'Uni Münster',
                communityOrcid: '0000-0002-1111-2222',
                communityVersion: '1.5.0',
                communityLicense: 'MIT'
            });

            env.templateModal.editingIndex = 1;
            await env.templateModal.save();
            const firstSave = JSON.parse(JSON.stringify(env.window.templateManager.savedTemplate));

            // Now re-populate from that saved template
            env.templateModal.populateForm(firstSave);

            // Save again
            await env.templateModal.save();
            const secondSave = JSON.parse(JSON.stringify(env.window.templateManager.savedTemplate));

            // Deep equality on community
            assert.deepEqual(secondSave.community, firstSave.community);
        });

        test('6.4: JSON stringify / parse survives intact with special chars and quotes', async () => {
            const env = createRealTemplateModalEnvironment({
                templateName: 'Escaping_Quotes_Test',
                communitySystem: 'Microscopy (Super-Resolution / STED / SIM / STORM)',
                communityDiscipline: 'Molecular Biology & Genetics',
                communityTags: 'RNA-seq, 3\' End, 5\' Cap, "quoted-tag", \\backslash',
                communityAuthor: 'O\'Connor & Sons'
            });

            env.templateModal.editingIndex = 0;
            await env.templateModal.save();
            const saved = env.window.templateManager.savedTemplate;

            const jsonString = JSON.stringify(saved);
            const parsed = JSON.parse(jsonString);

            assert.equal(parsed.community.system, 'Microscopy (Super-Resolution / STED / SIM / STORM)');
            assert.equal(parsed.community.discipline, 'Molecular Biology & Genetics');
            assert.deepEqual(parsed.community.tags, ['RNA-seq', "3' End", "5' Cap", '"quoted-tag"', '\\backslash']);
            assert.equal(parsed.community.author, "O'Connor & Sons");
        });
    });

    // -------------------------------------------------------------------------
    // 7. CONTRACT DISCREPANCIES & FINDINGS AUDIT
    // -------------------------------------------------------------------------
    test.describe('7. Contract & Test Suite Discrepancies Audit', () => {

        test('7.1: Verify literal ampersands in template-modal.html datalist options (0 &amp; entities)', () => {
            const opts = parseDatalistOptions(htmlContent, 'communityDisciplineList');
            const ampOpts = opts.raw.filter(o => o.includes('&amp;'));
            // Findings check: 0 options in communityDisciplineList have raw '&amp;', literal '&' verified
            assert.equal(ampOpts.length, 0, 'No HTML entity-encoded ampersands should be present in discipline options');
            assert.ok(opts.raw.includes('Molecular Biology & Genetics'));
            assert.ok(opts.raw.includes('Biochemistry & Structural Biology'));
            assert.ok(opts.raw.includes('Pharmacology & Toxicology'));
            assert.ok(opts.raw.includes('Ecology & Evolution'));
            assert.ok(opts.raw.includes('Material Science & Physics'));
            assert.ok(opts.raw.includes('Chemistry & Synthesis'));
            assert.ok(opts.raw.includes('Computer Science & Data Engineering'));
        });

        test('7.2: Verify entity decoding aligns datalist options with COMMUNITY_TEMPLATES_PLAN § 2.2', () => {
            const opts = parseDatalistOptions(htmlContent, 'communityDisciplineList');
            const decoded = opts.decoded;
            assert.ok(decoded.includes('Molecular Biology & Genetics'));
            assert.ok(decoded.includes('Biochemistry & Structural Biology'));
            assert.ok(decoded.includes('Pharmacology & Toxicology'));
            assert.ok(decoded.includes('Ecology & Evolution'));
            assert.ok(decoded.includes('Material Science & Physics'));
            assert.ok(decoded.includes('Chemistry & Synthesis'));
            assert.ok(decoded.includes('Computer Science & Data Engineering'));
        });
    });
});
