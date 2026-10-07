'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const spec = require('./helpers/spec_contract.js');
const { createMockEnvironment } = require('./helpers/dom_harness.js');

test.describe('Tier 4: Real-World Application Scenarios (Workflows 1–6)', () => {

    // =========================================================================
    // SCENARIO 1: Create new confocal microscopy template
    // =========================================================================
    test('Scenario 1: Create new confocal microscopy template with full taxonomy and metadata isolation', () => {
        const env = createMockEnvironment();

        // 1. User clicks "New Template" -> templateModal opens with Metadata tab active
        env.templateModal.show();
        assert.ok(env.document.getElementById('metadataContent').classList.contains('active'));
        assert.equal(env.document.getElementById('folderStructureDetails').open, false);

        // 2. User fills in template basic info
        env.document.getElementById('templateName').value = 'Leica Stellaris - Live Plant Imaging';
        env.document.getElementById('templateDescription').value = 'Confocal imaging protocol for root growth';

        // 3. User configures folder structure in collapsible section
        env.document.getElementById('folderStructureDetails').open = true;
        env.document.getElementById('experimentStructure').value = 'raw/\nprocessed/\nanalysis/\n';
        env.document.getElementById('templateWriteFilesOnly').checked = false;
        env.document.getElementById('templateMultipleFolders').checked = false;

        // 4. User navigates to Community & Sharing tab
        env.templateModal.switchTab('community');
        assert.ok(env.document.getElementById('communityContent').classList.contains('active'));

        // 5. User enters taxonomy using datalists
        env.document.getElementById('communitySystem').value = 'Microscopy (Confocal / 2-Photon)';
        env.document.getElementById('communityDiscipline').value = 'Plant Biology / Botany';
        env.document.getElementById('communityOrganism').value = 'Arabidopsis thaliana';
        env.document.getElementById('communityTags').value = 'Confocal, Live-cell, GFP, Time-Lapse, Root Growth';
        env.document.getElementById('communityAuthor').value = 'Dr. Thomas Zobel';
        env.document.getElementById('communityInstitution').value = 'University of Münster';
        env.document.getElementById('communityOrcid').value = '0000-0002-1234-5678';
        env.document.getElementById('communityVersion').value = '1.0.0';
        env.document.getElementById('communityLicense').value = 'CC-BY-4.0';

        // 6. User clicks Save
        const savedTemplate = env.templateModal.save();

        // 7. Verify JSON structure
        assert.equal(savedTemplate.name, 'Leica Stellaris - Live Plant Imaging');
        assert.equal(savedTemplate.structure, 'raw/\nprocessed/\nanalysis/\n');
        assert.ok(savedTemplate.community, 'Root community object must exist');
        assert.equal(savedTemplate.community.system, 'Microscopy (Confocal / 2-Photon)');
        assert.equal(savedTemplate.community.discipline, 'Plant Biology / Botany');
        assert.equal(savedTemplate.community.organism, 'Arabidopsis thaliana');
        assert.deepEqual(savedTemplate.community.tags, ['Confocal', 'Live-cell', 'GFP', 'Time-Lapse', 'Root Growth']);
        assert.equal(savedTemplate.community.license, 'CC-BY-4.0');

        // 8. Verify metadata isolation (no taxonomy fields inside metadata.fields)
        assert.equal(savedTemplate.metadata.fields.system, undefined);
        assert.equal(savedTemplate.metadata.fields.organism, undefined);
        assert.equal(savedTemplate.metadata.fields.community, undefined);
    });

    // =========================================================================
    // SCENARIO 2: Open existing template, modify tags, save as new template
    // =========================================================================
    test('Scenario 2: Open existing template in editor, modify community tags, save as new template', () => {
        const env = createMockEnvironment();

        const baseTemplate = {
            name: 'Base Widefield',
            description: 'Routine Widefield protocol',
            structure: 'images/\nlogs/\n',
            options: { writeFilesOnly: false, multipleFolders: false },
            metadata: { fields: { exposure: { type: 'number', label: 'Exposure (ms)' } } },
            community: {
                system: 'Microscopy (Light / Widefield)',
                discipline: 'Cell Biology',
                organism: 'Danio rerio',
                tags: ['Fluorescence', 'Widefield'],
                author: 'Dr. Jane Doe',
                version: '1.0.0',
                license: 'CC-BY-4.0'
            }
        };

        // 1. Open editor for editing base template
        env.templateModal.openForEdit(baseTemplate);

        // 2. Verify form inputs populated from community object
        assert.equal(env.document.getElementById('templateName').value, 'Base Widefield');
        assert.equal(env.document.getElementById('communitySystem').value, 'Microscopy (Light / Widefield)');
        assert.equal(env.document.getElementById('communityTags').value, 'Fluorescence, Widefield');

        // 3. User modifies name and adds new tags
        env.document.getElementById('templateName').value = 'Enhanced Widefield - Zebrafish Brain';
        env.document.getElementById('communityTags').value = 'Fluorescence, Widefield, Brain, In vivo';
        env.document.getElementById('communityVersion').value = '1.1.0';

        // 4. User saves as new template
        const newTemplate = env.templateModal.save();

        // 5. Verify new template has modified values without altering original template in memory
        assert.equal(newTemplate.name, 'Enhanced Widefield - Zebrafish Brain');
        assert.deepEqual(newTemplate.community.tags, ['Fluorescence', 'Widefield', 'Brain', 'In vivo']);
        assert.equal(newTemplate.community.version, '1.1.0');
        assert.deepEqual(baseTemplate.community.tags, ['Fluorescence', 'Widefield']);
    });

    // =========================================================================
    // SCENARIO 3: Upload local template to community workflow
    // =========================================================================
    test('Scenario 3: Upload local template to community, edit taxonomy, sync locally, verify GitHub Issue payload', async () => {
        const env = createMockEnvironment();

        // 1. User launches upload from Menu or UI
        env.uploadModal.show(0);
        assert.equal(env.document.getElementById('uploadTemplateModal').style.display, 'block');

        // 2. Step 1 has template selected and Step 2 fields are pre-populated
        assert.equal(env.document.getElementById('uploadSystem').value, 'Microscopy (Confocal / 2-Photon)');
        assert.equal(env.document.getElementById('uploadOrganism').value, 'Arabidopsis thaliana');

        // 3. User reviews and augments tags in Step 2
        env.document.getElementById('uploadTags').value = 'Confocal, GFP, Auxin Signaling, Root';
        env.document.getElementById('uploadAuthor').value = 'Dr. Thomas Zobel & Lab';

        // 4. User keeps sync checkbox enabled
        env.document.getElementById('uploadSyncLocal').checked = true;

        // 5. User clicks "Continue to GitHub"
        const payload = await env.uploadModal.submit();

        // 6. Verify local template file was synchronized
        const localTemplate = env.window.templateManager.templates[0];
        assert.deepEqual(localTemplate.community.tags, ['Confocal', 'GFP', 'Auxin Signaling', 'Root']);
        assert.equal(localTemplate.community.author, 'Dr. Thomas Zobel & Lab');

        // 7. Verify GitHub Issue Title, Body markdown, and URL
        assert.equal(payload.title, 'New Template: Confocal Base');
        assert.ok(payload.body.includes('**System / Device:** Microscopy (Confocal / 2-Photon)'));
        assert.ok(payload.body.includes('**Tags:** Confocal, GFP, Auxin Signaling, Root'));
        assert.ok(payload.body.includes('```json'));
        assert.ok(payload.url.startsWith('https://github.com/ThZobel/MetaFold-Templates/issues/new?'));

        // 8. Verify internal runtime properties are stripped from payload JSON
        assert.equal(payload.sanitizedTemplate._fileInfo, undefined);
        assert.equal(payload.sanitizedTemplate.id, undefined);

        // 9. Verify modal closed
        assert.equal(env.document.getElementById('uploadTemplateModal').style.display, 'none');
    });

    // =========================================================================
    // SCENARIO 4: Open Template Hub, filter by taxonomy chips & columns
    // =========================================================================
    test('Scenario 4: Open Template Hub, filter by Discipline and System, verify facet chips and columns', async () => {
        const env = createMockEnvironment();

        const hubIndex = [
            {
                id: 't-neuro-2photon',
                name: '2-Photon Cortical Imaging',
                collection: 'NeuroImage',
                community: {
                    system: 'Microscopy (Confocal / 2-Photon)',
                    discipline: 'Neuroscience',
                    organism: 'Mus musculus',
                    tags: ['2-Photon', 'In vivo', 'Cortex'],
                    author: 'Neuro Lab'
                }
            },
            {
                id: 't-plant-confocal',
                name: 'Plant Root Time-Lapse',
                collection: 'PlantBio',
                community: {
                    system: 'Microscopy (Confocal / 2-Photon)',
                    discipline: 'Plant Biology / Botany',
                    organism: 'Arabidopsis thaliana',
                    tags: ['Confocal', 'GFP'],
                    author: 'Botany Lab'
                }
            },
            {
                id: 't-pcr-general',
                name: 'General qPCR Run',
                collection: 'Molecular',
                community: {
                    system: 'Wet Lab: PCR / qPCR / Thermal Cycler',
                    discipline: 'Molecular Biology & Genetics',
                    organism: 'Non-biological / In vitro / Synthetic',
                    tags: ['qPCR', 'TaqMan'],
                    author: 'Genetics Core'
                }
            }
        ];

        // 1. User opens Template Hub
        const formatted = await env.app.openTemplateHub(hubIndex);
        assert.equal(formatted.length, 3);

        // 2. FacetSearch configured with all 7 keys and 6 visible columns
        assert.equal(env.facetSearch.allAvailableKeys.length, 7);
        assert.equal(env.facetSearch.visibleColumns.length, 6);

        // 3. Category grouping maps taxonomy keys
        for (const col of env.facetSearch.visibleColumns) {
            assert.equal(env.facetSearch._getCategoryForKey(col), '🌐 Community Taxonomy');
        }

        // 4. User views sidebar chips
        const facets = env.facetSearch.getAvailableFacets(formatted);
        assert.equal(facets.system['Microscopy (Confocal / 2-Photon)'], 2);
        assert.equal(facets.discipline['Neuroscience'], 1);
        assert.equal(facets.discipline['Plant Biology / Botany'], 1);

        // 5. User clicks filter chip [Neuroscience (1)]
        env.facetSearch.activeFilters['discipline'] = 'Neuroscience';
        const filteredData = formatted.filter(item => item.flatMeta.discipline === 'Neuroscience');
        assert.equal(filteredData.length, 1);
        assert.equal(filteredData[0].name, '2-Photon Cortical Imaging');
    });

    // =========================================================================
    // SCENARIO 5: Download & install community template from Hub
    // =========================================================================
    test('Scenario 5: Download & install community template from Hub, verify local file save & isolation', async () => {
        const env = createMockEnvironment();

        const remoteTemplate = {
            name: 'STED Super-Resolution Membrane Assay',
            description: 'Nanoscale imaging of plasma membrane receptors',
            structure: 'raw_sted/\ndeconvolved/\n',
            options: { writeFilesOnly: false, multipleFolders: false },
            metadata: {
                fields: {
                    depletion_laser_power: { type: 'number', label: '775nm STED Laser (%)' }
                }
            },
            community: {
                system: 'Microscopy (Super-Resolution / STED / SIM / STORM)',
                discipline: 'Biophysics',
                organism: 'Homo sapiens / Human Cell Lines',
                tags: ['STED', 'Super-Resolution', 'Membrane'],
                author: 'Dr. Stefan Hell Team',
                license: 'CC-BY-4.0'
            }
        };

        const initialLocalCount = env.window.templateManager.templates.length;

        // 1. User clicks "Install Template" in Hub Preview
        const installResult = await env.app.downloadAndInstallTemplate(remoteTemplate, {
            username: 'Thomas Zobel',
            groupname: 'Bioimaging Core'
        });

        // 2. Verify install succeeded and local templates updated
        assert.equal(installResult.success, true);
        assert.equal(env.window.templateManager.templates.length, initialLocalCount + 1);

        // 3. Inspect newly installed template
        const installed = env.window.templateManager.templates[env.window.templateManager.templates.length - 1];
        assert.equal(installed.name, 'STED Super-Resolution Membrane Assay');
        assert.equal(installed.originalCreator, 'Thomas Zobel');
        assert.equal(installed.savedLocally, true);
        assert.ok(installed.id.startsWith('template_'));

        // 4. Verify community taxonomy preserved in local copy
        assert.equal(installed.community.system, 'Microscopy (Super-Resolution / STED / SIM / STORM)');
        assert.deepEqual(installed.community.tags, ['STED', 'Super-Resolution', 'Membrane']);

        // 5. Downstream isolation: Creating a lab project from installed template
        const labProjectMetadata = {
            depletion_laser_power: 80
        };
        const readmeExport = spec.filterReadmeMetadata(Object.assign({}, labProjectMetadata, { community: installed.community }));
        assert.equal(readmeExport.community, undefined);
        assert.equal(readmeExport.depletion_laser_power, 80);
    });

    // =========================================================================
    // SCENARIO 6: Complete end-to-end lifecycle across all layers
    // =========================================================================
    test('Scenario 6: Full Lifecycle (Create -> Upload with tags -> Hub Index -> Download -> Lab Project)', async () => {
        const env = createMockEnvironment();

        // Step A: Create template in editor
        env.templateModal.show();
        env.document.getElementById('templateName').value = 'Full Lifecycle Assay';
        env.templateModal.switchTab('community');
        env.document.getElementById('communitySystem').value = 'Plate Reader / Spectrophotometer';
        env.document.getElementById('communityDiscipline').value = 'Biochemistry & Structural Biology';
        env.document.getElementById('communityOrganism').value = 'Escherichia coli / Bacteria';
        env.document.getElementById('communityTags').value = 'Enzyme, Kinetics, 96-well';
        const createdTemplate = env.templateModal.save();
        env.window.templateManager.templates.push(createdTemplate);

        // Step B: Upload to community with tag update
        const uploadIndex = env.window.templateManager.templates.length - 1;
        env.uploadModal.show(uploadIndex);
        env.document.getElementById('uploadTags').value = 'Enzyme, Kinetics, 96-well, High-Throughput';
        env.document.getElementById('uploadSyncLocal').checked = true;
        const uploadPayload = await env.uploadModal.submit();
        assert.ok(uploadPayload.url.includes('New%20Template:%20Full%20Lifecycle%20Assay'));

        // Step C: Hub indexes the uploaded template
        const hubIndexItem = {
            id: 'hub_lifecycle_01',
            name: uploadPayload.sanitizedTemplate.name,
            collection: 'General',
            path: 'templates/General/lifecycle.json',
            community: uploadPayload.sanitizedTemplate.community
        };
        const hubItems = await env.app.openTemplateHub([hubIndexItem]);
        assert.equal(hubItems[0].flatMeta.system, 'Plate Reader / Spectrophotometer');
        assert.ok(hubItems[0].flatMeta.tags.includes('High-Throughput'));

        // Step D: Second lab downloads and installs from hub
        const downloadedResult = await env.app.downloadAndInstallTemplate(uploadPayload.sanitizedTemplate, {
            username: 'Collaborator Lab',
            groupname: 'Partner Institute'
        });
        assert.equal(downloadedResult.success, true);
        const collaboratorTemplate = env.app.lastInstalledTemplate;
        assert.equal(collaboratorTemplate.originalCreator, 'Collaborator Lab');

        // Step E: Project created in lab with downstream isolation
        const projectReadme = spec.filterReadmeMetadata(Object.assign({}, collaboratorTemplate.metadata?.fields, {
            community: collaboratorTemplate.community,
            substrate_conc: '5 mM'
        }));
        assert.equal(projectReadme.community, undefined);
        assert.equal(projectReadme.substrate_conc, '5 mM');
    });

});
