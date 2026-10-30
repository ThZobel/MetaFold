'use strict';

/**
 * Challenger 2 Verification Suite: Downstream Isolation & Serialization Round-Trip Fidelity
 * Milestone 1 (Template Editor UI Redesign)
 *
 * This test suite loads and executes the REAL implementations of:
 * - src/js/templateModal.js
 * - src/js/experimentForm.js
 * - src/js/projectManager.js
 * - src/main.js (generateReadmeHtmlWithMetadata)
 *
 * Targets:
 * 1. Data round-trip fidelity with full community taxonomy.
 * 2. Data round-trip fidelity with legacy templates (no community block).
 * 3. Downstream isolation in experimentForm.js (collectData).
 * 4. Downstream isolation in projectManager.js (ReadyToImport.json in batch mode).
 * 5. Downstream isolation in projectManager.js & main.js (README.html in project creation).
 * 6. Adversarial boundaries: nulls, primitives, XSS strings, malformed tags, prototype pollution.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// Helper to normalize objects created across VM realms for deepStrictEqual
function toPlain(obj) {
    if (obj === undefined) return undefined;
    return JSON.parse(JSON.stringify(obj));
}

// Extract generateReadmeHtmlWithMetadata directly from src/main.js
function getReadmeGeneratorFunction() {
    const mainJsPath = path.join(PROJECT_ROOT, 'src', 'main.js');
    const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
    
    const startMarker = 'function generateReadmeHtmlWithMetadata(';
    const startIdx = mainJsContent.indexOf(startMarker);
    assert.ok(startIdx !== -1, 'generateReadmeHtmlWithMetadata must exist in src/main.js');
    
    const endMarker = '// Create metadata files - WITH PROJECT NAME IN FILENAMES';
    const endIdx = mainJsContent.indexOf(endMarker, startIdx);
    assert.ok(endIdx !== -1, 'End marker for generateReadmeHtmlWithMetadata must be found in src/main.js');
    
    const fnCode = mainJsContent.substring(startIdx, endIdx);
    const sandbox = {};
    vm.runInNewContext(fnCode + '\n; sandbox.generateReadmeHtmlWithMetadata = generateReadmeHtmlWithMetadata;', { sandbox });
    return sandbox.generateReadmeHtmlWithMetadata;
}

/**
 * Build a robust DOM and Window execution environment simulating the MetaFold renderer.
 */
function createProductionRuntimeEnvironment() {
    const listeners = {};
    const elements = new Map();

    function makeElement(id, tagName = 'div', initialProps = {}) {
        const elem = {
            id,
            tagName: tagName.toUpperCase(),
            value: initialProps.value !== undefined ? initialProps.value : '',
            checked: Boolean(initialProps.checked),
            style: { display: initialProps.display || 'block' },
            classList: {
                classes: new Set(initialProps.classes || []),
                add(...cls) { cls.forEach(c => this.classes.add(c)); },
                remove(...cls) { cls.forEach(c => this.classes.delete(c)); },
                contains(c) { return this.classes.has(c); }
            },
            open: Boolean(initialProps.open),
            innerHTML: initialProps.innerHTML || '',
            textContent: initialProps.textContent || '',
            attributes: {},
            children: [],
            setAttribute(k, v) { this.attributes[k] = v; },
            getAttribute(k) { return this.attributes[k] || ''; },
            removeAttribute(k) { delete this.attributes[k]; },
            addEventListener(ev, fn) {
                if (!listeners[id + ':' + ev]) listeners[id + ':' + ev] = [];
                listeners[id + ':' + ev].push(fn);
            },
            querySelector(sel) {
                return null;
            },
            querySelectorAll(sel) {
                return [];
            },
            closest(sel) {
                return null;
            },
            focus() {},
            appendChild(child) {
                this.children.push(child);
            }
        };

        elements.set(id, elem);
        return elem;
    }

    // Modal UI elements
    makeElement('templateModal', 'div', { display: 'none' });
    makeElement('modalTitle', 'h2', { textContent: 'Template' });
    makeElement('modalMessageContainer', 'div');
    makeElement('tabBtnMetadata', 'div', { classes: ['tab', 'active'] });
    makeElement('tabBtnCommunity', 'div', { classes: ['tab'] });
    makeElement('metadataContent', 'div', { classes: ['tab-content', 'active'] });
    makeElement('communityContent', 'div', { classes: ['tab-content'], display: 'none' });
    makeElement('experimentTab', 'div');
    makeElement('metadataFields', 'div');
    makeElement('folderStructureDetails', 'details', { open: false });
    makeElement('experimentStructure', 'textarea', { value: '' });
    makeElement('templateWriteFilesOnly', 'input', { checked: false });
    makeElement('templateMultipleFolders', 'input', { checked: false });
    makeElement('templateName', 'input', { value: '' });
    makeElement('templateDescription', 'input', { value: '' });
    makeElement('projectName', 'input', { value: 'TestProject' });
    makeElement('targetPath', 'input', { value: 'C:\\Research\\Data' });
    makeElement('createProjectBtn', 'button');
    makeElement('head', 'head');

    // Community taxonomy inputs
    makeElement('communitySystem', 'input', { value: '' });
    makeElement('communityDiscipline', 'input', { value: '' });
    makeElement('communityOrganism', 'input', { value: '' });
    makeElement('communityTags', 'input', { value: '' });
    makeElement('communityAuthor', 'input', { value: '' });
    makeElement('communityInstitution', 'input', { value: '' });
    makeElement('communityOrcid', 'input', { value: '' });
    makeElement('communityVersion', 'input', { value: '1.0.0' });
    makeElement('communityLicense', 'input', { value: 'CC-BY-4.0' });

    // Mock document object
    const docMock = {
        head: elements.get('head'),
        body: makeElement('body', 'body'),
        getElementById(id) {
            return elements.get(id) || null;
        },
        querySelector(selector) {
            if (selector.startsWith('#')) {
                const id = selector.substring(1).split(' ')[0];
                return elements.get(id) || null;
            }
            if (selector === '#templateModal input:not([disabled])') {
                return elements.get('templateName');
            }
            return null;
        },
        querySelectorAll(selector) {
            if (selector === '#experimentTab .tab-content') {
                return [elements.get('metadataContent'), elements.get('communityContent')].filter(Boolean);
            }
            if (selector === '#experimentTab .tab') {
                return [elements.get('tabBtnMetadata'), elements.get('tabBtnCommunity')].filter(Boolean);
            }
            if (selector === '[required]' || selector === 'input[type="email"]') {
                return [];
            }
            return [];
        },
        createElement(tagName) {
            const temp = makeElement('dynamic_' + Math.random().toString(36).substr(2, 9), tagName);
            return temp;
        }
    };

    // Tracking intercepted files and calls
    const intercepted = {
        writtenFiles: [],
        createdProjects: [],
        savedTemplates: [],
        updatedTemplates: []
    };

    const windowMock = {
        document: docMock,
        console: console,
        setTimeout: (fn) => { fn(); return 1; },
        clearTimeout: () => {},
        userManager: {
            currentUser: 'Dr. Thomas Zobel',
            currentGroup: 'Bioimaging Core Facility',
            getCurrentUser: () => 'Dr. Thomas Zobel'
        },
        profileManager: {
            isInitialized: true,
            getUserByUsername: (u) => ({
                fullName: 'Dr. Thomas Zobel',
                primaryGroupId: 'grp1',
                orcid: '0000-0002-1825-0097'
            }),
            getGroupById: (id) => ({
                name: 'Bioimaging Core Facility',
                institution: 'University of Münster'
            }),
            getProvenanceBlock: (username) => ({
                creator: username,
                group: 'Bioimaging Core Facility',
                schema_version: '1.0'
            })
        },
        templateTypeManager: {
            currentType: 'category1',
            typeNames: { category1: 'Microscopy' }
        },
        metadataEditor: {
            collectedMetadata: {},
            collectMetadata() {
                return this.collectedMetadata;
            },
            loadMetadataIntoEditor(m) {
                this.loadedMetadata = m;
            }
        },
        templateManager: {
            templates: [],
            currentTemplate: null,
            update: async function(index, tpl) {
                intercepted.updatedTemplates.push({ index, template: tpl });
                this.templates[index] = tpl;
            },
            add: async function(tpl) {
                intercepted.savedTemplates.push(tpl);
                this.templates.push(tpl);
            },
            refresh: async function() {},
            clearCurrentTemplate: function() {
                this.currentTemplate = null;
            }
        },
        settingsManager: {
            get: async (k) => {
                if (k === 'omero.enabled') return false;
                if (k === 'elabftw.enabled') return false;
                return null;
            }
        },
        electronAPI: {
            writeFile: async (filePath, content) => {
                intercepted.writtenFiles.push({ filePath, content });
                return { success: true };
            },
            createFolders: async (targetPath, structure) => {
                return { success: true };
            },
            createProject: async (basePath, projectName, structure, metadata, options) => {
                intercepted.createdProjects.push({ basePath, projectName, structure, metadata, options });
                return { success: true, message: 'Project created', projectPath: path.join(basePath, projectName) };
            },
            saveIdValues: async () => ({ success: true })
        }
    };

    // Mirror browser window globals
    windowMock.window = windowMock;
    windowMock.globalThis = windowMock;
    windowMock.settingsManager = windowMock.settingsManager;
    windowMock.projectName = elements.get('projectName');

    const vmContext = vm.createContext(windowMock);

    // Load actual implementation files
    const templateModalSource = fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'js', 'templateModal.js'), 'utf8') +
        '\n; globalThis.templateModal = templateModal;';
    vm.runInContext(templateModalSource, vmContext);

    const experimentFormSource = fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'js', 'experimentForm.js'), 'utf8') +
        '\n; globalThis.experimentForm = experimentForm;';
    vm.runInContext(experimentFormSource, vmContext);

    const projectManagerSource = fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'js', 'projectManager.js'), 'utf8') +
        '\n; globalThis.projectManager = projectManager;';
    vm.runInContext(projectManagerSource, vmContext);

    return {
        runtime: windowMock,
        elements,
        makeElement,
        intercepted,
        templateModal: windowMock.templateModal,
        experimentForm: windowMock.experimentForm,
        projectManager: windowMock.projectManager
    };
}

// =============================================================================
// TEST SUITE: Downstream Isolation & Serialization Round-Trip Fidelity
// =============================================================================

test.describe('Challenger 2 Suite: Serialization Fidelity & Downstream Isolation', () => {

    // -------------------------------------------------------------------------
    // 1. DATA ROUND-TRIP FIDELITY: FULL COMMUNITY TEMPLATES
    // -------------------------------------------------------------------------
    test.describe('1. Serialization Round-Trip Fidelity — Full Community Templates', () => {

        test('1.1: Full community taxonomy serializes and deserializes with exact deep equality', async () => {
            const env = createProductionRuntimeEnvironment();
            const originalTemplate = {
                id: 'tpl_sted_01',
                name: 'Super-Resolution STED Protocol',
                description: '3D pulsed STED imaging of fixed dendritic spines',
                type: 'experiment',
                category: 'category1',
                structure: 'raw/\nprocessed/\nanalysis/\n',
                options: { writeFilesOnly: false, multipleFolders: false },
                metadata: {
                    fields: {
                        laser_power: { type: 'number', label: 'Laser Power (%)', value: 45 },
                        depletion_laser: { type: 'text', label: 'Depletion Laser', value: '775nm' }
                    },
                    fieldOrder: ['laser_power', 'depletion_laser']
                },
                community: {
                    system: 'Microscopy (Super-Resolution / STED / SIM / STORM)',
                    discipline: 'Biochemistry & Structural Biology',
                    organism: 'Caenorhabditis elegans',
                    tags: ['STED', 'Super-Resolution', 'GFP', 'Live-cell', 'Dendritic Spines'],
                    author: 'Dr. Thomas Zobel',
                    institution: 'University of Münster',
                    orcid: '0000-0002-1825-0097',
                    version: '2.1.0',
                    license: 'CC-BY-SA-4.0'
                }
            };

            env.runtime.templateManager.templates = [originalTemplate];
            env.runtime.templateManager.currentTemplate = originalTemplate;

            // Step 1: Deserialize via populateForm
            env.templateModal.populateForm(originalTemplate);

            // Verify DOM values immediately after deserialization
            assert.equal(env.elements.get('communitySystem').value, originalTemplate.community.system);
            assert.equal(env.elements.get('communityDiscipline').value, originalTemplate.community.discipline);
            assert.equal(env.elements.get('communityOrganism').value, originalTemplate.community.organism);
            assert.equal(env.elements.get('communityTags').value, 'STED, Super-Resolution, GFP, Live-cell, Dendritic Spines');
            assert.equal(env.elements.get('communityAuthor').value, originalTemplate.community.author);
            assert.equal(env.elements.get('communityInstitution').value, originalTemplate.community.institution);
            assert.equal(env.elements.get('communityOrcid').value, originalTemplate.community.orcid);
            assert.equal(env.elements.get('communityVersion').value, originalTemplate.community.version);
            assert.equal(env.elements.get('communityLicense').value, originalTemplate.community.license);

            // Step 2: Re-serialize via collectCommunityData
            const collectedComm = env.templateModal.collectCommunityData();
            assert.deepStrictEqual(toPlain(collectedComm), originalTemplate.community, 'Collected community object must deeply match original');

            // Step 3: Full save cycle
            env.templateModal.editingIndex = 0;
            env.elements.get('templateName').value = originalTemplate.name;
            env.runtime.metadataEditor.collectedMetadata = originalTemplate.metadata;
            await env.templateModal.save();

            assert.equal(env.intercepted.updatedTemplates.length, 1);
            const savedTemplate = env.intercepted.updatedTemplates[0].template;

            // Assert root-level placement
            assert.ok(savedTemplate.community, 'Template must contain root-level community object');
            assert.deepStrictEqual(toPlain(savedTemplate.community), originalTemplate.community, 'Full community taxonomy must survive save cycle intact');
            assert.equal(savedTemplate.name, originalTemplate.name);
            assert.equal(savedTemplate.structure, originalTemplate.structure.trim());
        });

        test('1.2: saveAsNewTemplate preserves full community block on duplicated template', () => {
            const env = createProductionRuntimeEnvironment();
            const sourceTemplate = {
                name: 'Zeiss LSM980 AiryScan',
                description: 'Confocal with AiryScan detector',
                type: 'experiment',
                category: 'category1',
                structure: 'images/\n',
                options: { writeFilesOnly: false, multipleFolders: false },
                metadata: {
                    fields: { airy_mode: { type: 'text', label: 'AiryScan Mode', value: 'SR' } }
                },
                community: {
                    system: 'Microscopy (Confocal / 2-Photon)',
                    discipline: 'Cell Biology',
                    organism: 'Mus musculus',
                    tags: ['AiryScan', 'SR', 'Confocal'],
                    author: 'Dr. Jane Doe',
                    institution: 'Imaging Center',
                    orcid: '0000-0001-2345-6789',
                    version: '1.0.0',
                    license: 'MIT'
                }
            };

            env.runtime.templateManager.templates = [sourceTemplate];
            env.runtime.templateManager.currentTemplate = sourceTemplate;

            env.templateModal.populateForm(sourceTemplate);
            env.templateModal.saveAsNewTemplate();

            assert.equal(env.intercepted.savedTemplates.length, 1);
            const copiedTemplate = env.intercepted.savedTemplates[0];

            assert.equal(copiedTemplate.name, 'Zeiss LSM980 AiryScan (Copy)');
            assert.deepStrictEqual(toPlain(copiedTemplate.community), sourceTemplate.community, 'Community object must be cloned into new copy without loss');
        });

        test('1.3: Repeated serialization cycles (idempotency) maintain 100% data stability', async () => {
            const env = createProductionRuntimeEnvironment();
            const initialTemplate = {
                name: 'Idempotency Probe',
                type: 'experiment',
                category: 'category1',
                structure: 'data/',
                options: { writeFilesOnly: false, multipleFolders: false },
                metadata: { fields: {} },
                community: {
                    system: 'Plate Reader / Spectrophotometer',
                    discipline: 'Pharmacology & Toxicology',
                    organism: 'Homo sapiens / Human Cell Lines',
                    tags: ['Fluorescence', 'IC50', 'Assay'],
                    author: 'Bio Tester',
                    institution: 'Institute',
                    orcid: '0000-0003-9999-1111',
                    version: '3.0.1',
                    license: 'Apache-2.0'
                }
            };

            let currentTpl = initialTemplate;
            for (let cycle = 1; cycle <= 5; cycle++) {
                env.templateModal.populateForm(currentTpl);
                const collected = env.templateModal.collectCommunityData();
                assert.deepStrictEqual(toPlain(collected), initialTemplate.community, `Cycle ${cycle} community data must remain invariant`);
                currentTpl = Object.assign({}, currentTpl, { community: collected });
            }
        });
    });

    // -------------------------------------------------------------------------
    // 2. DATA ROUND-TRIP FIDELITY: LEGACY TEMPLATES (NO COMMUNITY BLOCK)
    // -------------------------------------------------------------------------
    test.describe('2. Serialization Round-Trip Fidelity — Legacy Templates', () => {

        test('2.1: Legacy template without community object populates without crashing and applies sensible defaults', async () => {
            const env = createProductionRuntimeEnvironment();
            const legacyTemplate = {
                id: 'tpl_legacy_99',
                name: 'Old Legacy Confocal Protocol',
                description: 'Created before Community Taxonomy was introduced',
                type: 'experiment',
                category: 'category1',
                structure: 'raw_data/\n',
                options: { writeFilesOnly: true, multipleFolders: false },
                metadata: {
                    fields: {
                        objective: { type: 'text', label: 'Objective Lens', value: '63x Plan-Apo' }
                    }
                }
            };
            assert.equal(legacyTemplate.community, undefined, 'Precondition: legacy template lacks community block');

            // Must NOT throw
            assert.doesNotThrow(() => {
                env.templateModal.populateForm(legacyTemplate);
            }, 'populateForm must not crash on legacy template');

            // Verify form inputs receive clean defaults
            assert.equal(env.elements.get('communitySystem').value, '');
            assert.equal(env.elements.get('communityDiscipline').value, '');
            assert.equal(env.elements.get('communityOrganism').value, '');
            assert.equal(env.elements.get('communityTags').value, '');
            assert.equal(env.elements.get('communityVersion').value, '1.0.0');
            assert.equal(env.elements.get('communityLicense').value, 'CC-BY-4.0');
            // Author and institution fall back to active user context
            assert.equal(env.elements.get('communityAuthor').value, 'Dr. Thomas Zobel');
            assert.equal(env.elements.get('communityInstitution').value, 'University of Münster');

            // Verify folder details auto-expands because structure / options exist
            const folderDetails = env.elements.get('folderStructureDetails');
            assert.equal(folderDetails.open, true, 'Folder structure details must auto-expand for legacy templates with structure/options');

            // Save legacy template
            env.runtime.templateManager.templates = [legacyTemplate];
            env.templateModal.editingIndex = 0;
            env.elements.get('templateName').value = legacyTemplate.name;
            env.runtime.metadataEditor.collectedMetadata = legacyTemplate.metadata;
            await env.templateModal.save();

            assert.equal(env.intercepted.updatedTemplates.length, 1);
            const savedLegacy = env.intercepted.updatedTemplates[0].template;

            // Core template fields preserved
            assert.equal(savedLegacy.name, legacyTemplate.name);
            assert.equal(savedLegacy.structure, legacyTemplate.structure.trim());
            assert.deepStrictEqual(toPlain(savedLegacy.metadata), legacyTemplate.metadata);
            // Options preserved
            assert.equal(savedLegacy.options.writeFilesOnly, true);
            // Clean community block attached
            assert.ok(savedLegacy.community, 'Saved legacy template now has clean community block');
            assert.equal(savedLegacy.community.version, '1.0.0');
            assert.equal(savedLegacy.community.license, 'CC-BY-4.0');
            assert.deepStrictEqual(toPlain(savedLegacy.community.tags), []);
        });

        test('2.2: Legacy switchTab("structure") alias routes to metadata and opens folder details', () => {
            const env = createProductionRuntimeEnvironment();
            env.templateModal.switchTab('structure');

            assert.ok(env.elements.get('metadataContent').classList.contains('active'), 'Metadata tab must be active');
            assert.ok(env.elements.get('tabBtnMetadata').classList.contains('active'), 'Metadata tab button must be active');
            assert.equal(env.elements.get('folderStructureDetails').open, true, 'folderStructureDetails must be opened by structure alias');
        });
    });

    // -------------------------------------------------------------------------
    // 3. DOWNSTREAM ISOLATION: EXPERIMENT FORM (experimentForm.js)
    // -------------------------------------------------------------------------
    test.describe('3. Downstream Isolation — Experiment Form (experimentForm.js)', () => {

        test('3.1: experimentForm.collectData strictly ignores template.community', () => {
            const env = createProductionRuntimeEnvironment();
            const template = {
                name: 'Plant Live Imaging',
                type: 'experiment',
                metadata: {
                    fields: {
                        laser_power: { type: 'number', label: 'Laser Power (%)', position: 1 },
                        pinhole_size: { type: 'number', label: 'Pinhole (AU)', position: 2 }
                    },
                    fieldOrder: ['laser_power', 'pinhole_size']
                },
                community: {
                    system: 'Microscopy (Confocal / 2-Photon)',
                    discipline: 'Plant Biology / Botany',
                    organism: 'Arabidopsis thaliana',
                    tags: ['Root', 'GFP', 'Live-cell'],
                    author: 'Dr. Thomas Zobel',
                    institution: 'University of Münster',
                    orcid: '0000-0002-1825-0097',
                    version: '1.0.0',
                    license: 'CC-BY-4.0'
                }
            };

            env.runtime.templateManager.currentTemplate = template;

            // Simulate form field DOM elements for experimentForm
            const f1 = env.makeElement('field_laser_power', 'input', { value: '35' });
            f1.type = 'number';
            const f2 = env.makeElement('field_pinhole_size', 'input', { value: '1.2' });
            f2.type = 'number';

            const experimentMetadata = env.experimentForm.collectData();

            assert.ok(experimentMetadata, 'collectData must return metadata object');
            assert.equal(experimentMetadata.laser_power.value, 35);
            assert.equal(experimentMetadata.pinhole_size.value, 1.2);

            // CRITICAL ISOLATION ASSERTIONS:
            assert.equal(experimentMetadata.community, undefined, 'experimentMetadata MUST NOT have community property');
            assert.equal(experimentMetadata.system, undefined, 'Taxonomy system MUST NOT bleed into experimentMetadata');
            assert.equal(experimentMetadata.discipline, undefined, 'Taxonomy discipline MUST NOT bleed into experimentMetadata');
            assert.equal(experimentMetadata.organism, undefined, 'Taxonomy organism MUST NOT bleed into experimentMetadata');
            assert.equal(experimentMetadata.tags, undefined, 'Taxonomy tags MUST NOT bleed into experimentMetadata');
            assert.equal(experimentMetadata.license, undefined, 'Taxonomy license MUST NOT bleed into experimentMetadata');
        });

        test('3.2: experimentForm ignores community even when metadata has grouped fields', () => {
            const env = createProductionRuntimeEnvironment();
            const template = {
                name: 'Grouped Template',
                type: 'experiment',
                metadata: {
                    fields: {
                        grp_acquisition: { type: 'group', label: 'Acquisition Parameters' },
                        frame_rate: { type: 'number', label: 'Frame Rate (fps)' }
                    },
                    fieldOrder: ['grp_acquisition', 'frame_rate']
                },
                community: {
                    system: 'Flow Cytometer / FACS',
                    discipline: 'Immunology',
                    organism: 'Homo sapiens / Human Cell Lines',
                    tags: ['FACS', 'CD4', 'CD8']
                }
            };

            env.runtime.templateManager.currentTemplate = template;
            const fRate = env.makeElement('field_frame_rate', 'input', { value: '60' });
            fRate.type = 'number';

            const result = env.experimentForm.collectData();
            assert.ok(result['Acquisition Parameters'], 'Group object should exist');
            assert.equal(result['Acquisition Parameters'].frame_rate.value, 60);
            assert.equal(result.community, undefined, 'No community leak in grouped metadata');
        });
    });

    // -------------------------------------------------------------------------
    // 4. DOWNSTREAM ISOLATION: PROJECT MANAGER (ReadyToImport.json)
    // -------------------------------------------------------------------------
    test.describe('4. Downstream Isolation — Batch File Writer (ReadyToImport.json)', () => {

        test('4.1: executeBatchFileWrite generates ReadyToImport.json completely devoid of community data', async () => {
            const env = createProductionRuntimeEnvironment();
            const template = {
                name: 'Batch Imaging Template',
                type: 'experiment',
                structure: 'raw/\n',
                options: { writeFilesOnly: true, multipleFolders: false },
                metadata: {
                    fields: {
                        exposure: { type: 'number', label: 'Exposure Time (ms)', position: 1 }
                    },
                    fieldOrder: ['exposure']
                },
                community: {
                    system: 'Microscopy (Light / Widefield)',
                    discipline: 'Developmental Biology',
                    organism: 'Danio rerio',
                    tags: ['Zebrafish', 'Embryo', 'Fluorescence'],
                    author: 'Zebrafish Lab',
                    institution: 'Münster',
                    orcid: '0000-0002-1825-0097',
                    version: '1.1.0',
                    license: 'MIT'
                }
            };

            env.runtime.templateManager.currentTemplate = template;

            // Experiment form input
            const expInput = env.makeElement('field_exposure', 'input', { value: '120' });
            expInput.type = 'number';

            // Target path and project name inputs for projectManager
            // In MetaFold Flag-File mode, projectName input defaults to ReadyToImport.json
            env.elements.get('projectName').value = 'ReadyToImport.json';
            env.elements.get('targetPath').value = 'C:\\Data\\Experiment_01';

            await env.projectManager.executeBatchFileWrite(template);

            assert.equal(env.intercepted.writtenFiles.length, 1, 'Exactly one file must be written');
            const written = env.intercepted.writtenFiles[0];

            assert.ok(written.filePath.endsWith('ReadyToImport.json'), `Written file must be ReadyToImport.json (was ${written.filePath})`);

            const parsedJson = JSON.parse(written.content);

            // Verify metadata is preserved
            assert.equal(parsedJson.exposure.value, 120);
            // Verify provenance block was injected
            assert.ok(parsedJson.provenance, 'Provenance block must exist');

            // CRITICAL ISOLATION ASSERTIONS:
            assert.equal(parsedJson.community, undefined, 'ReadyToImport.json MUST NOT contain "community" key');
            assert.equal(parsedJson.system, undefined, 'ReadyToImport.json MUST NOT contain "system" key');
            assert.equal(parsedJson.discipline, undefined, 'ReadyToImport.json MUST NOT contain "discipline" key');
            assert.equal(parsedJson.organism, undefined, 'ReadyToImport.json MUST NOT contain "organism" key');
            assert.equal(parsedJson.tags, undefined, 'ReadyToImport.json MUST NOT contain "tags" key');
            assert.equal(parsedJson.license, undefined, 'ReadyToImport.json MUST NOT contain "license" key');

            // Deep text inspection: Ensure no taxonomy values leaked anywhere into the file
            const rawString = written.content;
            assert.equal(rawString.includes('Microscopy (Light / Widefield)'), false, 'System name must not appear in ReadyToImport.json');
            assert.equal(rawString.includes('Developmental Biology'), false, 'Discipline must not appear in ReadyToImport.json');
            assert.equal(rawString.includes('Danio rerio'), false, 'Organism must not appear in ReadyToImport.json');
            assert.equal(rawString.includes('Zebrafish'), false, 'Tags must not appear in ReadyToImport.json');
        });

        test('4.2: executeBatchFileWrite with empty structure and empty filename falls back to ReadyToImport.json without community', async () => {
            const env = createProductionRuntimeEnvironment();
            const template = {
                name: 'Structureless Batch Template',
                type: 'experiment',
                structure: '',
                options: { writeFilesOnly: true, multipleFolders: false },
                metadata: {
                    fields: {
                        laser: { type: 'number', label: 'Laser', position: 1 }
                    },
                    fieldOrder: ['laser']
                },
                community: {
                    system: 'Sequencer (NGS / Illumina / Nanopore / PacBio)',
                    discipline: 'Molecular Biology & Genetics',
                    organism: 'Escherichia coli / Bacteria',
                    tags: ['NGS', 'RNA-Seq'],
                    author: 'Genomics Core'
                }
            };

            env.runtime.templateManager.currentTemplate = template;
            const expInput = env.makeElement('field_laser', 'input', { value: '50' });
            expInput.type = 'number';

            env.elements.get('projectName').value = ''; // Empty filename triggers ReadyToImport.json fallback
            env.elements.get('targetPath').value = 'C:\\Data\\Experiment_02';

            await env.projectManager.executeBatchFileWrite(template);

            assert.equal(env.intercepted.writtenFiles.length, 1);
            const written = env.intercepted.writtenFiles[0];
            assert.ok(written.filePath.endsWith('ReadyToImport.json'));
            const parsed = JSON.parse(written.content);
            assert.equal(parsed.community, undefined);
            assert.equal(parsed.laser.value, 50);
            assert.equal(written.content.includes('Sequencer'), false);
        });
    });

    // -------------------------------------------------------------------------
    // 5. DOWNSTREAM ISOLATION: PROJECT CREATION & README.HTML
    // -------------------------------------------------------------------------
    test.describe('5. Downstream Isolation — Project Creation & README.html', () => {

        test('5.1: projectManager.createProject passes clean metadata without community to electronAPI', async () => {
            const env = createProductionRuntimeEnvironment();
            const template = {
                name: 'Confocal Project Template',
                type: 'experiment',
                structure: 'raw/\nanalysis/\n',
                options: { writeFilesOnly: false, multipleFolders: false },
                metadata: {
                    fields: {
                        laser_wavelength: { type: 'text', label: 'Laser Wavelength', position: 1 }
                    },
                    fieldOrder: ['laser_wavelength']
                },
                community: {
                    system: 'Microscopy (Confocal / 2-Photon)',
                    discipline: 'Neuroscience',
                    organism: 'Rattus norvegicus',
                    tags: ['Hippocampus', 'Synapse'],
                    author: 'Neuro Team',
                    institution: 'WWU',
                    orcid: '0000-0002-1825-0097',
                    version: '1.0.0',
                    license: 'CC-BY-4.0'
                }
            };

            env.runtime.templateManager.currentTemplate = template;
            env.makeElement('field_laser_wavelength', 'input', { value: '488nm' });
            env.elements.get('projectName').value = 'Rat_Hippocampus_Project';
            env.elements.get('targetPath').value = 'C:\\Projects';

            // Mock checkDirectoryAndResolveConflicts on projectManager
            env.projectManager.checkDirectoryAndResolveConflicts = async () => ({
                proceed: true,
                wasRenamed: false,
                projectName: 'Rat_Hippocampus_Project',
                projectPath: 'C:\\Projects\\Rat_Hippocampus_Project'
            });

            await env.projectManager.createProject();

            assert.equal(env.intercepted.createdProjects.length, 1);
            const created = env.intercepted.createdProjects[0];

            assert.equal(created.projectName, 'Rat_Hippocampus_Project');
            assert.ok(created.metadata, 'Metadata must be passed');
            assert.equal(created.metadata.laser_wavelength.value, '488nm');

            // CRITICAL ISOLATION ASSERTIONS:
            assert.equal(created.metadata.community, undefined, 'Created project metadata MUST NOT contain community');
            assert.equal(created.metadata.system, undefined, 'Taxonomy system MUST NOT leak into project metadata');
            assert.equal(created.metadata.discipline, undefined, 'Taxonomy discipline MUST NOT leak into project metadata');
            assert.equal(created.metadata.organism, undefined, 'Taxonomy organism MUST NOT leak into project metadata');
            assert.equal(created.metadata.tags, undefined, 'Taxonomy tags MUST NOT leak into project metadata');
        });

        test('5.2: generateReadmeHtmlWithMetadata output produces zero community tables or taxonomy headers', () => {
            const generateReadmeHtml = getReadmeGeneratorFunction();

            // Metadata as delivered by createProject
            const experimentMetadata = {
                laser_wavelength: {
                    type: 'text',
                    label: 'Laser Wavelength',
                    value: '488nm',
                    templateName: 'Confocal Project Template'
                },
                pinhole: {
                    type: 'number',
                    label: 'Pinhole (AU)',
                    value: 1.0,
                    templateName: 'Confocal Project Template'
                },
                provenance: {
                    creator: 'Dr. Thomas Zobel',
                    group: 'Bioimaging Core Facility'
                }
            };

            const html = generateReadmeHtml(experimentMetadata, 'Rat_Neuron_Project');

            assert.ok(html.includes('488nm'), 'README must contain laser wavelength value');
            assert.ok(html.includes('Laser Wavelength'), 'README must contain field label');
            assert.ok(html.includes('Rat_Neuron_Project'), 'README must contain project name');

            // CRITICAL ISOLATION ASSERTIONS:
            assert.equal(html.includes('community'), false, 'README.html must not mention "community"');
            assert.equal(html.includes('Microscopy (Confocal / 2-Photon)'), false, 'System taxonomy must not appear in README');
            assert.equal(html.includes('Neuroscience'), false, 'Discipline taxonomy must not appear in README');
            assert.equal(html.includes('Rattus norvegicus'), false, 'Organism taxonomy must not appear in README');
            assert.equal(html.includes('Hippocampus'), false, 'Community tags must not appear in README');
            assert.equal(html.includes('Synapse'), false, 'Community tags must not appear in README');
        });
    });

    // -------------------------------------------------------------------------
    // 6. ADVERSARIAL STRESS TESTING & BOUNDARY VALUES
    // -------------------------------------------------------------------------
    test.describe('6. Adversarial Stress Testing & Boundary Values', () => {

        test('6.1: Corrupted community properties (null, primitives, boolean) handled gracefully without throwing', () => {
            const env = createProductionRuntimeEnvironment();
            const malformedTemplates = [
                { name: 'Null Comm', community: null },
                { name: 'String Comm', community: 'not an object' },
                { name: 'Number Comm', community: 12345 },
                { name: 'Boolean Comm', community: true },
                { name: 'Array Comm', community: ['unexpected'] }
            ];

            for (const tpl of malformedTemplates) {
                assert.doesNotThrow(() => {
                    env.templateModal.populateForm(tpl);
                }, `populateForm must survive corrupted community: ${typeof tpl.community}`);

                const collected = env.templateModal.collectCommunityData();
                assert.ok(typeof collected === 'object', 'collectCommunityData must always return an object');
                assert.ok(Array.isArray(collected.tags), 'tags must always be an array');
            }
        });

        test('6.2: Malformed tags field (null, numbers, boolean, untrimmed commas) normalized cleanly', () => {
            const env = createProductionRuntimeEnvironment();

            // Case A: Trailing, leading, duplicate commas and excessive spacing
            env.elements.get('communityTags').value = ' ,  tagA , ,  tagB , tagC ,  , ';
            const collectedA = env.templateModal.collectCommunityData();
            assert.deepStrictEqual(toPlain(collectedA.tags), ['tagA', 'tagB', 'tagC']);

            // Case B: populateForm with tags that is a raw string instead of an array
            env.templateModal.populateForm({ community: { tags: 'StringTag1, StringTag2' } });
            assert.equal(env.elements.get('communityTags').value, 'StringTag1, StringTag2');
            const collectedB = env.templateModal.collectCommunityData();
            assert.deepStrictEqual(toPlain(collectedB.tags), ['StringTag1', 'StringTag2']);

            // Case C: populateForm with tags as null
            env.templateModal.populateForm({ community: { tags: null } });
            assert.equal(env.elements.get('communityTags').value, '');
            const collectedC = env.templateModal.collectCommunityData();
            assert.deepStrictEqual(toPlain(collectedC.tags), []);
        });

        test('6.3: XSS and injection strings in community inputs are safely treated as raw data', () => {
            const env = createProductionRuntimeEnvironment();
            const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';

            env.elements.get('communitySystem').value = xssPayload;
            env.elements.get('communityDiscipline').value = xssPayload;
            env.elements.get('communityOrganism').value = xssPayload;
            env.elements.get('communityTags').value = `${xssPayload}, <b>test</b>`;

            const collected = env.templateModal.collectCommunityData();
            assert.equal(collected.system, xssPayload);
            assert.equal(collected.discipline, xssPayload);
            assert.equal(collected.organism, xssPayload);
            assert.equal(collected.tags[0], xssPayload);
            assert.equal(collected.tags[1], '<b>test</b>');
        });

        test('6.4: Unicode, non-Latin scripts, and scientific notations survive serialization round-trip', () => {
            const env = createProductionRuntimeEnvironment();
            const scientificTaxonomy = {
                system: 'Microscopy (Super-Resolution / STED / SIM / STORM)',
                discipline: 'Biochemistry & Structural Biology',
                organism: 'Schizosaccharomyces pombe (酵母)',
                tags: ['Ca²⁺-Flux', 'α-Synuclein', 'ΔF/F0', '37°C_Incubation', 'λ=561nm'],
                author: 'Dr. René Daubenton-Carafa',
                institution: 'Institut Curie, PSL Université',
                orcid: '0000-0002-1825-0097',
                version: '1.0.0-rc.1',
                license: 'CC-BY-4.0'
            };

            env.templateModal.populateForm({ community: scientificTaxonomy });
            const collected = env.templateModal.collectCommunityData();

            assert.deepStrictEqual(toPlain(collected), scientificTaxonomy, 'Scientific and international symbols must be preserved exactly');
        });
    });
});
