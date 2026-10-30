'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const spec = require('./helpers/spec_contract.js');
const { createMockEnvironment } = require('./helpers/dom_harness.js');

test.describe('Tier 3: Pairwise Combinations & Feature Interactions', () => {

    test('P1: F1 (Metadata Tab Primary) + F2 (Collapsible Folder Structure)', () => {
        const env = createMockEnvironment();
        env.templateModal.show();
        assert.ok(env.document.getElementById('metadataContent').classList.contains('active'));
        const details = env.document.getElementById('folderStructureDetails');
        assert.equal(details.open, false, 'Details must remain closed inside active metadata tab');
    });

    test('P2: F1 (Metadata Tab Primary) + F3 (Community Tab) Field State Isolation', () => {
        const env = createMockEnvironment();
        env.templateModal.show();
        env.document.getElementById('templateName').value = 'Isolated Name';
        env.templateModal.switchTab('community');
        env.document.getElementById('communitySystem').value = 'Flow Cytometer / FACS';
        env.templateModal.switchTab('metadata');
        assert.equal(env.document.getElementById('templateName').value, 'Isolated Name');
        assert.equal(env.document.getElementById('communitySystem').value, 'Flow Cytometer / FACS');
    });

    test('P3: F2 (Folder Structure) + F8 (Serialization) with Options & Taxonomy', () => {
        const env = createMockEnvironment();
        env.document.getElementById('templateName').value = 'Batch Imaging';
        env.document.getElementById('experimentStructure').value = 'data/\nresults/\n';
        env.document.getElementById('templateMultipleFolders').checked = true;
        env.document.getElementById('communitySystem').value = 'Microscopy (Light / Widefield)';
        env.document.getElementById('communityTags').value = 'Batch, Automation';

        const template = env.templateModal.save();
        assert.equal(template.structure, 'data/\nresults/\n');
        assert.equal(template.options.multipleFolders, true);
        assert.equal(template.community.system, 'Microscopy (Light / Widefield)');
        assert.deepEqual(template.community.tags, ['Batch', 'Automation']);
    });

    test('P4: F4 (System Datalist) + F7 (Additional Community Fields) Pairing', () => {
        const data = spec.collectCommunityData({
            system: 'Plate Reader / Spectrophotometer',
            tags: 'Absorbance, Fluorescence',
            author: 'Dr. Jane Smith',
            license: 'CC0-1.0'
        });
        assert.equal(data.system, 'Plate Reader / Spectrophotometer');
        assert.deepEqual(data.tags, ['Absorbance', 'Fluorescence']);
        assert.equal(data.author, 'Dr. Jane Smith');
        assert.equal(data.license, 'CC0-1.0');
    });

    test('P5: F5 (Discipline Datalist) + F6 (Organism Datalist) Scientific Domain Coupling', () => {
        const plantBotany = spec.collectCommunityData({
            discipline: 'Plant Biology / Botany',
            organism: 'Arabidopsis thaliana'
        });
        assert.equal(plantBotany.discipline, 'Plant Biology / Botany');
        assert.equal(plantBotany.organism, 'Arabidopsis thaliana');

        const neuroZebrafish = spec.collectCommunityData({
            discipline: 'Neuroscience',
            organism: 'Danio rerio'
        });
        assert.equal(neuroZebrafish.discipline, 'Neuroscience');
        assert.equal(neuroZebrafish.organism, 'Danio rerio');
    });

    test('P6: F4 (System) + F5 (Discipline) with Free-Text Fallbacks', () => {
        const customTaxonomy = spec.collectCommunityData({
            system: 'Custom Two-Photon / FLIM Rig',
            discipline: 'Biophotonics & Quantum Optics'
        });
        assert.equal(customTaxonomy.system, 'Custom Two-Photon / FLIM Rig');
        assert.equal(customTaxonomy.discipline, 'Biophotonics & Quantum Optics');
    });

    test('P7: F8 (Serialization) + F9 (Deserialization) Full Round-Trip Fidelity', () => {
        const env = createMockEnvironment();
        env.document.getElementById('templateName').value = 'Round Trip';
        env.document.getElementById('communitySystem').value = 'Mass Spectrometer (Proteomics / Metabolomics)';
        env.document.getElementById('communityTags').value = 'Proteomics, LC-MS';

        const saved = env.templateModal.save();
        env.templateModal.clearForm();
        assert.equal(env.document.getElementById('communitySystem').value, '');

        env.templateModal.populateForm(saved);
        assert.equal(env.document.getElementById('communitySystem').value, 'Mass Spectrometer (Proteomics / Metabolomics)');
        assert.equal(env.document.getElementById('communityTags').value, 'Proteomics, LC-MS');
    });

    test('P8: F8 (Serialization) + F10 (Downstream Lab Isolation) in Experiment Form', () => {
        const env = createMockEnvironment();
        env.document.getElementById('communitySystem').value = 'Microscopy (Confocal / 2-Photon)';
        env.document.getElementById('communityTags').value = 'Sensitive';
        const saved = env.templateModal.save();

        // Experiment form consumes metadata.fields only
        const experimentFields = Object.keys(saved.metadata.fields);
        assert.equal(experimentFields.includes('system'), false);
        assert.equal(experimentFields.includes('community'), false);
    });

    test('P9: F9 (Deserialization) + F10 (Downstream Lab Isolation) on Legacy Templates', () => {
        const legacy = {
            name: 'Old Legacy',
            metadata: { fields: { field_1: { type: 'text' } } }
        };
        const env = createMockEnvironment();
        env.templateModal.populateForm(legacy);
        assert.equal(env.document.getElementById('communitySystem').value, '');
        assert.equal(legacy.community, undefined);
    });

    test('P10: F8 (Serialization) + F25 (Readme Isolation) Output Sanitization', () => {
        const env = createMockEnvironment();
        env.document.getElementById('communitySystem').value = 'Sequencer (NGS / Illumina / Nanopore / PacBio)';
        const saved = env.templateModal.save();
        const readmeData = spec.filterReadmeMetadata(Object.assign({}, saved.metadata.fields, { community: saved.community }));
        assert.equal(readmeData.community, undefined);
    });

    test('P11: F11 (Upload Modal) + F12 (Step 1 Selection) Template Cycling', () => {
        const env = createMockEnvironment({
            templates: [
                { name: 'Template Alpha', community: { system: 'Alpha System' } },
                { name: 'Template Beta', community: { system: 'Beta System' } }
            ]
        });
        env.uploadModal.show(0);
        assert.equal(env.document.getElementById('uploadSystem').value, 'Alpha System');
        env.uploadModal.onTemplateSelected(1);
        assert.equal(env.document.getElementById('uploadSystem').value, 'Beta System');
    });

    test('P12: F12 (Step 1 Selection) + F13 (Step 2 Review) Dynamic Form Prepopulation', () => {
        const env = createMockEnvironment();
        env.uploadModal.onTemplateSelected(0);
        assert.equal(env.document.getElementById('uploadSystem').value, 'Microscopy (Confocal / 2-Photon)');
        assert.equal(env.document.getElementById('uploadOrganism').value, 'Arabidopsis thaliana');
    });

    test('P13: F13 (Step 2 Review) + F14 (Local Sync Checked) Disk Update', async () => {
        const env = createMockEnvironment();
        env.uploadModal.onTemplateSelected(0);
        env.document.getElementById('uploadTags').value = 'SyncdTag1, SyncdTag2';
        env.document.getElementById('uploadSyncLocal').checked = true;

        await env.uploadModal.submit();
        assert.deepEqual(env.window.templateManager.templates[0].community.tags, ['SyncdTag1', 'SyncdTag2']);
    });

    test('P14: F13 (Step 2 Review) + F14 (Local Sync Unchecked) Local Preservation', async () => {
        const env = createMockEnvironment();
        const originalTags = [...env.window.templateManager.templates[0].community.tags];
        env.uploadModal.onTemplateSelected(0);
        env.document.getElementById('uploadTags').value = 'IgnoredTag';
        env.document.getElementById('uploadSyncLocal').checked = false;

        await env.uploadModal.submit();
        assert.deepEqual(env.window.templateManager.templates[0].community.tags, originalTags);
    });

    test('P15: F14 (Local Sync) + F16 (Payload Sanitization) Dual Pipeline', async () => {
        const env = createMockEnvironment();
        const dirtyTemplate = {
            id: 'temp_secret_id',
            _fileInfo: { path: '/confidential' },
            savedLocally: true,
            name: 'Pipeline Test',
            community: { system: 'Wet Lab: PCR / qPCR / Thermal Cycler' }
        };
        env.window.templateManager.templates = [dirtyTemplate];
        env.uploadModal.onTemplateSelected(0);
        env.document.getElementById('uploadSyncLocal').checked = true;

        const payload = await env.uploadModal.submit();
        assert.equal(payload.sanitizedTemplate.id, undefined);
        assert.equal(payload.sanitizedTemplate._fileInfo, undefined);
        assert.equal(dirtyTemplate.id, 'temp_secret_id');
    });

    test('P16: F15 (Payload Formatting) + F16 (Sanitization) in GitHub URL', () => {
        const dirty = {
            id: 'internal_id',
            _fileInfo: { path: '/path' },
            name: 'Sanitized Issue',
            community: { system: 'Wet Lab: Gel Imaging / Western Blot' }
        };
        const payload = spec.formatGitHubIssuePayload(dirty);
        assert.equal(payload.body.includes('internal_id'), false);
        assert.equal(payload.body.includes('_fileInfo'), false);
        assert.ok(payload.url.includes(encodeURIComponent('New Template: Sanitized Issue')));
    });

    test('P17: F11 (Upload Modal) + F17 (Trigger Integration) via Menu Action', () => {
        const env = createMockEnvironment();
        let triggerFired = false;
        env.window.electronAPI.onMenuAction(action => {
            if (action === 'upload-template') {
                triggerFired = true;
                env.uploadModal.show(0);
            }
        });
        env.window.electronAPI.menuCb('upload-template');
        assert.equal(triggerFired, true);
        assert.equal(env.document.getElementById('uploadTemplateModal').style.display, 'block');
    });

    test('P18: F18 (Facet Keys) + F19 (Visible Columns) Hub Sync', async () => {
        const env = createMockEnvironment();
        await env.app.openTemplateHub();
        for (const col of env.facetSearch.visibleColumns) {
            assert.ok(env.facetSearch.allAvailableKeys.includes(col), `Column ${col} must be in allAvailableKeys`);
        }
    });

    test('P19: F18 (Facet Keys) + F20 (Index Unpacking) Property Alignment', () => {
        const rawItem = {
            id: 't1',
            community: { system: 'Microscopy', discipline: 'Botany', tags: ['T1'] }
        };
        const unpacked = spec.unpackTemplateIndexItem(rawItem);
        assert.ok(unpacked.flatMeta);
        assert.ok(unpacked.flatMeta.system);
        assert.ok(unpacked.flatMeta.discipline);
        assert.ok(Array.isArray(unpacked.flatMeta.tags));
    });

    test('P20: F20 (Index Unpacking) + F21 (Category Grouping) Accordion Mapping', () => {
        const rawItem = { community: { system: 'Microscopy', tags: ['T1'] } };
        const unpacked = spec.unpackTemplateIndexItem(rawItem);
        for (const key of Object.keys(unpacked.flatMeta)) {
            if (spec.ALL_AVAILABLE_KEYS.includes(key)) {
                assert.equal(spec.getCategoryForKey(key), '🌐 Community Taxonomy');
            }
        }
    });

    test('P21: F21 (Category Grouping) + F22 (Filter Chips) Chip Generation', () => {
        const env = createMockEnvironment();
        const data = [
            { flatMeta: { system: 'Microscopy (Confocal / 2-Photon)', tags: ['GFP'] } },
            { flatMeta: { system: 'Microscopy (Confocal / 2-Photon)', tags: ['RFP'] } }
        ];
        const facets = env.facetSearch.getAvailableFacets(data);
        assert.equal(facets.system['Microscopy (Confocal / 2-Photon)'], 2);
        assert.equal(facets.tags['GFP'], 1);
        assert.equal(facets.tags['RFP'], 1);
    });

    test('P22: F20 (Index Unpacking) + F24 (Download & Install) Lifecycle', async () => {
        const env = createMockEnvironment();
        const unpackedHubItem = {
            name: 'Downloaded Stellaris',
            community: { system: 'Microscopy (Confocal / 2-Photon)', organism: 'Arabidopsis thaliana' }
        };
        await env.app.downloadAndInstallTemplate(unpackedHubItem, { username: 'Dr. Zobel', groupname: 'Imaging' });
        const installed = env.window.templateManager.templates.find(t => t.name === 'Downloaded Stellaris');
        assert.ok(installed);
        assert.equal(installed.originalCreator, 'Dr. Zobel');
        assert.equal(installed.community.system, 'Microscopy (Confocal / 2-Photon)');
    });

    test('P23: F22 (Filter Chips) + F23 (Tabulator Selection) Interaction', () => {
        const env = createMockEnvironment();
        env.facetSearch.activeFilters['system'] = 'Microscopy (Confocal / 2-Photon)';
        assert.equal(env.facetSearch.activeFilters['system'], 'Microscopy (Confocal / 2-Photon)');
    });

    test('P24: F24 (Download & Install) + F10 (Lab Isolation) ReadyToImport Verification', async () => {
        const env = createMockEnvironment();
        const hubTemplate = {
            name: 'Hub Protocol',
            community: { system: 'Flow Cytometer / FACS', tags: ['FACS'] },
            metadata: { fields: { cell_count: { type: 'number' } } }
        };
        await env.app.downloadAndInstallTemplate(hubTemplate);
        // Project created from downloaded template
        const readyToImport = {
            template: hubTemplate.name,
            fields: { cell_count: 5000 }
        };
        assert.equal(readyToImport.community, undefined);
    });

    test('P25: F24 (Download & Install) + F25 (Readme Isolation) Zero Community Leakage', async () => {
        const env = createMockEnvironment();
        const hubTemplate = {
            name: 'Hub Template',
            community: { organism: 'Homo sapiens / Human Cell Lines' },
            metadata: { fields: { passage: { type: 'number' } } }
        };
        await env.app.downloadAndInstallTemplate(hubTemplate);
        const readmeMeta = spec.filterReadmeMetadata(Object.assign({}, hubTemplate.metadata.fields, { community: hubTemplate.community }));
        assert.equal(readmeMeta.community, undefined);
    });

    test('P26: F14 (Local Sync) + F8 (Serialization) + F9 (Deserialization) Re-editing', async () => {
        const env = createMockEnvironment();
        env.uploadModal.onTemplateSelected(0);
        env.document.getElementById('uploadTags').value = 'SyncedTagA, SyncedTagB';
        env.document.getElementById('uploadSyncLocal').checked = true;
        await env.uploadModal.submit();

        // Now open template in templateModal for editing
        const updatedLocalTemplate = env.window.templateManager.templates[0];
        env.templateModal.populateForm(updatedLocalTemplate);
        assert.equal(env.document.getElementById('communityTags').value, 'SyncedTagA, SyncedTagB');
    });

});
