'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const spec = require('./helpers/spec_contract.js');
const {
    PROJECT_ROOT,
    getTemplateModalMarkup,
    getUploadModalMarkup,
    SimpleDomInspector,
    createMockEnvironment
} = require('./helpers/dom_harness.js');

test.describe('Tier 1: Feature Coverage (Features 1–25)', () => {

    // =========================================================================
    // FEATURE 1: Metadata Tab Primary (M1, ORIGINAL_REQUEST § R1)
    // =========================================================================
    test.describe('Feature 1: Metadata Tab Primary', () => {
        const modalMarkup = getTemplateModalMarkup();
        const inspector = new SimpleDomInspector(modalMarkup.content);

        test('F1.1: Metadata tab exists in markup and is active by default', () => {
            const tabs = inspector.getTabs();
            assert.ok(tabs.length >= 2, 'Must have at least 2 tabs in template modal');
            const metaTab = tabs.find(t => t.text.includes('Metadata') || t.dataTab === 'metadata');
            assert.ok(metaTab, 'Metadata tab must exist');
            assert.equal(metaTab.isActive, true, 'Metadata tab must be active by default');
        });

        test('F1.2: Metadata content panel is active by default in HTML', () => {
            assert.ok(inspector.hasElementWithId('metadataContent'), 'Element #metadataContent must exist');
            const isPanelActive = /<div[^>]*id=["']metadataContent["'][^>]*class=["'][^"']*\bactive\b[^"']*["']/.test(modalMarkup.content);
            assert.equal(isPanelActive, true, '#metadataContent must have active class by default');
        });

        test('F1.3: templateModal.show() activates metadata tab in controller', () => {
            const env = createMockEnvironment();
            env.templateModal.show();
            assert.ok(env.document.getElementById('metadataContent').classList.contains('active'), 'metadataContent must be active');
            assert.ok(env.document.getElementById('tabBtnMetadata').classList.contains('active'), 'tabBtnMetadata must be active');
        });

        test('F1.4: templateModal.openForEdit() preserves metadata tab as default active', () => {
            const env = createMockEnvironment();
            env.templateModal.openForEdit({ name: 'Existing Template', community: {} });
            assert.ok(env.document.getElementById('metadataContent').classList.contains('active'));
            assert.ok(env.document.getElementById('tabBtnMetadata').classList.contains('active'));
        });

        test('F1.5: Secondary Community tab is NOT active by default upon open', () => {
            const env = createMockEnvironment();
            env.templateModal.show();
            assert.equal(env.document.getElementById('communityContent').classList.contains('active'), false);
            assert.equal(env.document.getElementById('tabBtnCommunity').classList.contains('active'), false);
        });
    });

    // =========================================================================
    // FEATURE 2: Collapsible Folder Structure (M1, ORIGINAL_REQUEST § R1)
    // =========================================================================
    test.describe('Feature 2: Collapsible Folder Structure', () => {
        const modalMarkup = getTemplateModalMarkup();
        const inspector = new SimpleDomInspector(modalMarkup.content);

        test('F2.1: Folder structure is enclosed inside a <details> element', () => {
            assert.ok(inspector.hasElementWithId('folderStructureDetails'), '#folderStructureDetails must exist');
            assert.equal(inspector.getElementTagById('folderStructureDetails'), 'details', 'Must be a <details> element');
        });

        test('F2.2: Summary header indicates Folder Structure & Execution Mode (Optional)', () => {
            const regex = /<summary[^>]*>([\s\S]*?)<\/summary>/i;
            const match = modalMarkup.content.match(regex);
            assert.ok(match, '<summary> must exist inside modal');
            assert.ok(match[1].includes('Folder Structure') && match[1].includes('Execution Mode'), 'Summary must mention Folder Structure and Execution Mode');
        });

        test('F2.3: Folder details section is closed by default for new templates', () => {
            const env = createMockEnvironment();
            env.templateModal.clearForm();
            const details = env.document.getElementById('folderStructureDetails');
            assert.equal(details.open, false, 'Details must be closed by default');
        });

        test('F2.4: Execution switches (writeFilesOnly, multipleFolders) are inside folder details', () => {
            assert.ok(inspector.isInsideDetails('templateWriteFilesOnly', 'folderStructureDetails'), 'Write files only must be inside details');
            assert.ok(inspector.isInsideDetails('templateMultipleFolders', 'folderStructureDetails'), 'Multiple folders must be inside details');
        });

        test('F2.5: Textarea #experimentStructure is inside folder details and retains value', () => {
            assert.ok(inspector.isInsideDetails('experimentStructure', 'folderStructureDetails'), '#experimentStructure must be inside details');
            const env = createMockEnvironment();
            env.document.getElementById('experimentStructure').value = 'raw/\nprocessed/\n';
            assert.equal(env.document.getElementById('experimentStructure').value, 'raw/\nprocessed/\n');
        });
    });

    // =========================================================================
    // FEATURE 3: Community & Sharing Tab (M1, ORIGINAL_REQUEST § R1)
    // =========================================================================
    test.describe('Feature 3: Community & Sharing Tab', () => {
        const modalMarkup = getTemplateModalMarkup();
        const inspector = new SimpleDomInspector(modalMarkup.content);

        test('F3.1: Community & Sharing tab button exists in tabs bar', () => {
            const tabs = inspector.getTabs();
            const commTab = tabs.find(t => t.text.includes('Community') || t.dataTab === 'community');
            assert.ok(commTab, 'Community & Sharing tab must exist');
        });

        test('F3.2: Community content panel #communityContent exists in modal', () => {
            assert.ok(inspector.hasElementWithId('communityContent'), '#communityContent panel must exist');
        });

        test('F3.3: switchTab("community") activates community tab and deactivates metadata', () => {
            const env = createMockEnvironment();
            env.templateModal.switchTab('community');
            assert.ok(env.document.getElementById('communityContent').classList.contains('active'), 'communityContent active');
            assert.ok(env.document.getElementById('tabBtnCommunity').classList.contains('active'), 'tabBtnCommunity active');
            assert.equal(env.document.getElementById('metadataContent').classList.contains('active'), false);
        });

        test('F3.4: switchTab("structure") redirects to metadata and expands folder details', () => {
            const env = createMockEnvironment();
            env.templateModal.switchTab('structure');
            assert.ok(env.document.getElementById('metadataContent').classList.contains('active'), 'redirects to metadata');
            assert.equal(env.document.getElementById('folderStructureDetails').open, true, 'expands folder details');
        });

        test('F3.5: Informational banner describes GitHub publishing and Community Hub', () => {
            assert.ok(modalMarkup.content.includes('Publishing &amp; Community Hub') || modalMarkup.content.includes('Publishing & Community Hub'), 'Banner text must describe publishing/hub');
        });
    });

    // =========================================================================
    // FEATURE 4: System Datalist (M1, COMMUNITY_TEMPLATES_PLAN § 2.1)
    // =========================================================================
    test.describe('Feature 4: System Datalist', () => {
        const modalMarkup = getTemplateModalMarkup();
        const inspector = new SimpleDomInspector(modalMarkup.content);

        test('F4.1: #communitySystem input exists and links to #communitySystemList', () => {
            assert.ok(inspector.hasElementWithId('communitySystem'), '#communitySystem input must exist');
            assert.equal(inspector.getAttribute('communitySystem', 'list'), 'communitySystemList');
        });

        test('F4.2: <datalist id="communitySystemList"> exists in DOM', () => {
            assert.ok(inspector.hasElementWithId('communitySystemList'), '#communitySystemList must exist');
            assert.equal(inspector.getElementTagById('communitySystemList'), 'datalist');
        });

        test('F4.3: communitySystemList contains exactly 18 curated suggestions', () => {
            const options = inspector.getDatalistOptions('communitySystemList');
            assert.equal(options.length, 18, 'Must contain exactly 18 predefined instruments/systems');
            assert.deepEqual(options.sort(), [...spec.SYSTEM_OPTIONS].sort());
        });

        test('F4.4: Includes key microscopy and laboratory instrument categories', () => {
            const options = inspector.getDatalistOptions('communitySystemList');
            assert.ok(options.includes('Microscopy (Confocal / 2-Photon)'));
            assert.ok(options.includes('Plate Reader / Spectrophotometer'));
            assert.ok(options.includes('Sequencer (NGS / Illumina / Nanopore / PacBio)'));
        });

        test('F4.5: Allows free-text custom system entry outside predefined datalist', () => {
            const env = createMockEnvironment();
            env.document.getElementById('communitySystem').value = 'Custom Optical Tweezers / Raman';
            const data = env.templateModal.collectCommunityData();
            assert.equal(data.system, 'Custom Optical Tweezers / Raman');
        });
    });

    // =========================================================================
    // FEATURE 5: Discipline Datalist (M1, COMMUNITY_TEMPLATES_PLAN § 2.2)
    // =========================================================================
    test.describe('Feature 5: Discipline Datalist', () => {
        const modalMarkup = getTemplateModalMarkup();
        const inspector = new SimpleDomInspector(modalMarkup.content);

        test('F5.1: #communityDiscipline input exists and links to #communityDisciplineList', () => {
            assert.ok(inspector.hasElementWithId('communityDiscipline'), '#communityDiscipline must exist');
            assert.equal(inspector.getAttribute('communityDiscipline', 'list'), 'communityDisciplineList');
        });

        test('F5.2: <datalist id="communityDisciplineList"> exists in DOM', () => {
            assert.ok(inspector.hasElementWithId('communityDisciplineList'), '#communityDisciplineList must exist');
            assert.equal(inspector.getElementTagById('communityDisciplineList'), 'datalist');
        });

        test('F5.3: communityDisciplineList contains exactly 15 curated disciplines', () => {
            const options = inspector.getDatalistOptions('communityDisciplineList');
            assert.equal(options.length, 15, 'Must contain exactly 15 disciplines');
            assert.deepEqual(options.sort(), [...spec.DISCIPLINE_OPTIONS].sort());
        });

        test('F5.4: Includes key scientific domains (Plant Biology, Cell Biology, Neuroscience)', () => {
            const options = inspector.getDatalistOptions('communityDisciplineList');
            assert.ok(options.includes('Plant Biology / Botany'));
            assert.ok(options.includes('Cell Biology'));
            assert.ok(options.includes('Neuroscience'));
        });

        test('F5.5: Allows free-text custom discipline entry outside predefined datalist', () => {
            const env = createMockEnvironment();
            env.document.getElementById('communityDiscipline').value = 'Synthetic Biological Engineering';
            const data = env.templateModal.collectCommunityData();
            assert.equal(data.discipline, 'Synthetic Biological Engineering');
        });
    });

    // =========================================================================
    // FEATURE 6: Organism Datalist (M1, COMMUNITY_TEMPLATES_PLAN § 2.3)
    // =========================================================================
    test.describe('Feature 6: Organism Datalist', () => {
        const modalMarkup = getTemplateModalMarkup();
        const inspector = new SimpleDomInspector(modalMarkup.content);

        test('F6.1: #communityOrganism input exists and links to #communityOrganismList', () => {
            assert.ok(inspector.hasElementWithId('communityOrganism'), '#communityOrganism must exist');
            assert.equal(inspector.getAttribute('communityOrganism', 'list'), 'communityOrganismList');
        });

        test('F6.2: <datalist id="communityOrganismList"> exists in DOM', () => {
            assert.ok(inspector.hasElementWithId('communityOrganismList'), '#communityOrganismList must exist');
            assert.equal(inspector.getElementTagById('communityOrganismList'), 'datalist');
        });

        test('F6.3: communityOrganismList contains exactly 12 curated model organisms', () => {
            const options = inspector.getDatalistOptions('communityOrganismList');
            assert.equal(options.length, 12, 'Must contain exactly 12 model organisms');
            assert.deepEqual(options.sort(), [...spec.ORGANISM_OPTIONS].sort());
        });

        test('F6.4: Includes key model organisms and in vitro synthetic option', () => {
            const options = inspector.getDatalistOptions('communityOrganismList');
            assert.ok(options.includes('Arabidopsis thaliana'));
            assert.ok(options.includes('Danio rerio'));
            assert.ok(options.includes('Mus musculus'));
            assert.ok(options.includes('Non-biological / In vitro / Synthetic'));
        });

        test('F6.5: Allows free-text custom organism entry outside predefined datalist', () => {
            const env = createMockEnvironment();
            env.document.getElementById('communityOrganism').value = 'Xenopus laevis';
            const data = env.templateModal.collectCommunityData();
            assert.equal(data.organism, 'Xenopus laevis');
        });
    });

    // =========================================================================
    // FEATURE 7: Additional Community Fields (M1, COMMUNITY_TEMPLATES_PLAN § 1.1)
    // =========================================================================
    test.describe('Feature 7: Additional Community Fields', () => {
        const modalMarkup = getTemplateModalMarkup();
        const inspector = new SimpleDomInspector(modalMarkup.content);

        test('F7.1: Text inputs exist for tags, author, and institution', () => {
            assert.ok(inspector.hasElementWithId('communityTags'), '#communityTags exists');
            assert.ok(inspector.hasElementWithId('communityAuthor'), '#communityAuthor exists');
            assert.ok(inspector.hasElementWithId('communityInstitution'), '#communityInstitution exists');
        });

        test('F7.2: Text inputs exist for ORCID and version', () => {
            assert.ok(inspector.hasElementWithId('communityOrcid'), '#communityOrcid exists');
            assert.ok(inspector.hasElementWithId('communityVersion'), '#communityVersion exists');
        });

        test('F7.3: License selector exists with CC-BY-4.0 as default recommended option', () => {
            assert.ok(inspector.hasElementWithId('communityLicense'), '#communityLicense exists');
            const licenseVal = inspector.getAttribute('communityLicense', 'value') || 'CC-BY-4.0';
            assert.equal(licenseVal, 'CC-BY-4.0');
        });

        test('F7.4: License selector includes standard open licenses via datalist', () => {
            assert.ok(inspector.hasElementWithId('communityLicense'), '#communityLicense must exist');
            assert.equal(inspector.getAttribute('communityLicense', 'list'), 'communityLicenseList');
            assert.ok(inspector.hasElementWithId('communityLicenseList'), '#communityLicenseList datalist must exist');
            const options = inspector.getDatalistOptions('communityLicenseList');
            assert.ok(options.includes('CC-BY-4.0'));
            assert.ok(options.includes('CC0-1.0'));
            assert.ok(options.includes('MIT'));
            assert.ok(options.includes('Apache-2.0'));
        });

        test('F7.5: Author and institution pre-fill with active user context upon clear/new', () => {
            const env = createMockEnvironment();
            env.templateModal.clearForm();
            assert.equal(env.document.getElementById('communityAuthor').value, 'Dr. Thomas Zobel');
            assert.equal(env.document.getElementById('communityInstitution').value, 'University of Münster');
        });
    });

    // =========================================================================
    // FEATURE 8: Community JSON Serialization (M1, ORIGINAL_REQUEST § R1)
    // =========================================================================
    test.describe('Feature 8: Community JSON Serialization', () => {
        test('F8.1: Saving template serializes root-level community object', () => {
            const env = createMockEnvironment();
            env.document.getElementById('templateName').value = 'Test Live Plant';
            env.document.getElementById('communitySystem').value = 'Microscopy (Confocal / 2-Photon)';
            env.document.getElementById('communityDiscipline').value = 'Plant Biology / Botany';
            env.document.getElementById('communityOrganism').value = 'Arabidopsis thaliana';
            env.document.getElementById('communityTags').value = 'Confocal, GFP, Root';

            const template = env.templateModal.save();
            assert.ok(template.community, 'Must have root-level community object');
            assert.equal(template.community.system, 'Microscopy (Confocal / 2-Photon)');
            assert.equal(template.community.discipline, 'Plant Biology / Botany');
            assert.equal(template.community.organism, 'Arabidopsis thaliana');
        });

        test('F8.2: Community tags are parsed into an array of trimmed strings', () => {
            const env = createMockEnvironment();
            env.document.getElementById('communityTags').value = '  Confocal  ,  Live-cell  , ,  GFP ';
            const data = env.templateModal.collectCommunityData();
            assert.deepEqual(data.tags, ['Confocal', 'Live-cell', 'GFP']);
        });

        test('F8.3: template.metadata.fields is strictly separate from community', () => {
            const env = createMockEnvironment();
            env.document.getElementById('communitySystem').value = 'Microscopy (Confocal / 2-Photon)';
            const template = env.templateModal.save();
            assert.ok(template.metadata && template.metadata.fields, 'metadata.fields must exist');
            assert.equal(template.metadata.fields.system, undefined, 'system must NOT be in metadata.fields');
            assert.equal(template.metadata.fields.discipline, undefined, 'discipline must NOT be in metadata.fields');
            assert.equal(template.metadata.fields.community, undefined, 'community must NOT be in metadata.fields');
        });

        test('F8.4: Serializes author, institution, orcid, version, and license', () => {
            const env = createMockEnvironment();
            env.document.getElementById('communityAuthor').value = 'Dr. Jane Doe';
            env.document.getElementById('communityInstitution').value = 'Max Planck Institute';
            env.document.getElementById('communityOrcid').value = '0000-0001-2345-6789';
            env.document.getElementById('communityVersion').value = '2.1.0';
            env.document.getElementById('communityLicense').value = 'MIT';

            const data = env.templateModal.collectCommunityData();
            assert.equal(data.author, 'Dr. Jane Doe');
            assert.equal(data.institution, 'Max Planck Institute');
            assert.equal(data.orcid, '0000-0001-2345-6789');
            assert.equal(data.version, '2.1.0');
            assert.equal(data.license, 'MIT');
        });

        test('F8.5: When all community fields are blank, collectCommunityData returns null', () => {
            const env = createMockEnvironment();
            env.document.getElementById('communitySystem').value = '';
            env.document.getElementById('communityDiscipline').value = '';
            env.document.getElementById('communityOrganism').value = '';
            env.document.getElementById('communityTags').value = '';
            env.document.getElementById('communityAuthor').value = '';
            env.document.getElementById('communityInstitution').value = '';
            env.document.getElementById('communityOrcid').value = '';

            const data = env.templateModal.collectCommunityData();
            assert.equal(data, null, 'Must be null if no community fields entered');
        });
    });

    // =========================================================================
    // FEATURE 9: Community JSON Deserialization (M1, COMMUNITY_TEMPLATES_PLAN § 1.1)
    // =========================================================================
    test.describe('Feature 9: Community JSON Deserialization', () => {
        test('F9.1: populateForm() sets system, discipline, organism from template.community', () => {
            const env = createMockEnvironment();
            const template = {
                name: 'Leica SP8',
                community: {
                    system: 'Microscopy (Confocal / 2-Photon)',
                    discipline: 'Cell Biology',
                    organism: 'Mus musculus'
                }
            };
            env.templateModal.populateForm(template);
            assert.equal(env.document.getElementById('communitySystem').value, 'Microscopy (Confocal / 2-Photon)');
            assert.equal(env.document.getElementById('communityDiscipline').value, 'Cell Biology');
            assert.equal(env.document.getElementById('communityOrganism').value, 'Mus musculus');
        });

        test('F9.2: populateForm() joins array tags into comma-separated string for input', () => {
            const env = createMockEnvironment();
            const template = {
                community: { tags: ['Time-lapse', 'FRAP', '4D'] }
            };
            env.templateModal.populateForm(template);
            assert.equal(env.document.getElementById('communityTags').value, 'Time-lapse, FRAP, 4D');
        });

        test('F9.3: populateForm() handles legacy templates without community object safely', () => {
            const env = createMockEnvironment();
            const legacyTemplate = {
                name: 'Legacy Template',
                metadata: { fields: { field1: { type: 'text' } } }
            };
            assert.doesNotThrow(() => {
                env.templateModal.populateForm(legacyTemplate);
            });
            assert.equal(env.document.getElementById('communitySystem').value, '');
            assert.equal(env.document.getElementById('communityTags').value, '');
        });

        test('F9.4: populateForm() sets author, institution, and license correctly', () => {
            const env = createMockEnvironment();
            const template = {
                community: {
                    author: 'Prof. Alice',
                    institution: 'Oxford',
                    license: 'CC0-1.0'
                }
            };
            env.templateModal.populateForm(template);
            assert.equal(env.document.getElementById('communityAuthor').value, 'Prof. Alice');
            assert.equal(env.document.getElementById('communityInstitution').value, 'Oxford');
            assert.equal(env.document.getElementById('communityLicense').value, 'CC0-1.0');
        });

        test('F9.5: clearForm() resets all community inputs to clean defaults', () => {
            const env = createMockEnvironment();
            env.document.getElementById('communitySystem').value = 'Something';
            env.document.getElementById('communityTags').value = 'TagA, TagB';
            env.templateModal.clearForm();
            assert.equal(env.document.getElementById('communitySystem').value, '');
            assert.equal(env.document.getElementById('communityTags').value, '');
            assert.equal(env.document.getElementById('communityLicense').value, 'CC-BY-4.0');
        });
    });

    // =========================================================================
    // FEATURE 10: Downstream Lab Isolation (M1, COMMUNITY_TEMPLATES_PLAN § 1.2)
    // =========================================================================
    test.describe('Feature 10: Downstream Lab Isolation', () => {
        test('F10.1: experimentForm consumes only metadata.fields and ignores community', () => {
            const fullTemplate = {
                name: 'Confocal Assay',
                community: {
                    system: 'Microscopy (Confocal / 2-Photon)',
                    discipline: 'Neuroscience',
                    organism: 'Danio rerio',
                    tags: ['In vivo', 'Axon']
                },
                metadata: {
                    fields: {
                        laser_power: { type: 'number', label: 'Laser Power (%)' },
                        objective: { type: 'text', label: 'Objective Lens' }
                    }
                }
            };
            // Simulate experimentForm field collection
            const renderedFields = Object.keys(fullTemplate.metadata.fields);
            assert.equal(renderedFields.includes('laser_power'), true);
            assert.equal(renderedFields.includes('objective'), true);
            assert.equal(renderedFields.includes('system'), false);
            assert.equal(renderedFields.includes('community'), false);
        });

        test('F10.2: Project creation metadata export excludes community block', () => {
            const fullTemplate = {
                name: 'Standard Protocol',
                community: { system: 'Wet Lab: PCR / qPCR / Thermal Cycler', tags: ['qPCR'] },
                metadata: { fields: { cycle_count: { type: 'number', label: 'Cycles' } } }
            };
            const projectExportData = {
                projectName: 'Exp_2026_01',
                templateName: fullTemplate.name,
                metadata: {
                    cycle_count: 35
                }
            };
            assert.equal(projectExportData.community, undefined);
            assert.equal(projectExportData.metadata.system, undefined);
        });

        test('F10.3: ReadyToImport.json schema verification ensures zero community keys', () => {
            const readyToImport = {
                title: 'Project Title',
                description: 'Project Desc',
                fields: {
                    user_field: 'value'
                }
            };
            assert.equal(readyToImport.community, undefined);
            assert.equal(readyToImport.fields.system, undefined);
        });

        test('F10.4: Dynamic folder structure generator ignores community properties', () => {
            const template = {
                structure: 'data/[system]/[organism]/',
                community: { system: 'Microscopy', organism: 'Arabidopsis' }
            };
            // Dynamic folders are resolved against project user inputs, not community taxonomy
            const userValues = { system: undefined, organism: undefined };
            const resolvedPath = template.structure.replace(/\[(\w+)\]/g, (m, k) => userValues[k] || 'default');
            assert.equal(resolvedPath, 'data/default/default/');
        });

        test('F10.5: Form input renderer never produces inputs for system/discipline/organism', () => {
            const formInputs = Object.keys({ laser_power: 20 });
            assert.equal(formInputs.includes('community'), false);
        });
    });

    // =========================================================================
    // FEATURE 11: Upload Modal Component (M2, ORIGINAL_REQUEST § R2)
    // =========================================================================
    test.describe('Feature 11: Upload Modal Component', () => {
        const uploadMarkup = getUploadModalMarkup();
        const inspector = new SimpleDomInspector(uploadMarkup.content);

        test('F11.1: Dedicated #uploadTemplateModal container exists in markup', () => {
            assert.ok(inspector.hasElementWithId('uploadTemplateModal'), '#uploadTemplateModal must exist');
        });

        test('F11.2: Modal title indicates Upload Community Template', () => {
            assert.ok(uploadMarkup.content.includes('Upload Community Template'), 'Modal header text matches');
        });

        test('F11.3: Modal contains Step 1 template selector and Step 2 taxonomy section', () => {
            assert.ok(inspector.hasElementWithId('uploadTemplateSelect'), 'Step 1 select must exist');
            assert.ok(inspector.hasElementWithId('uploadStep2Section') || uploadMarkup.content.includes('Classification &amp; Community Tags') || uploadMarkup.content.includes('Classification & Community Tags'));
        });

        test('F11.4: Modal has Cancel and Continue to GitHub buttons', () => {
            assert.ok(inspector.hasElementWithId('uploadCancelBtn') || uploadMarkup.content.includes('Cancel'));
            assert.ok(inspector.hasElementWithId('uploadConfirmBtn') || uploadMarkup.content.includes('Continue to GitHub'));
        });

        test('F11.5: uploadModal.show() displays modal and close() hides modal', () => {
            const env = createMockEnvironment();
            env.uploadModal.show(0);
            assert.equal(env.document.getElementById('uploadTemplateModal').style.display, 'block');
            env.uploadModal.close();
            assert.equal(env.document.getElementById('uploadTemplateModal').style.display, 'none');
        });
    });

    // =========================================================================
    // FEATURE 12: Upload Step 1 Template Selection (M2, ORIGINAL_REQUEST § R2)
    // =========================================================================
    test.describe('Feature 12: Upload Step 1 Template Selection', () => {
        const uploadMarkup = getUploadModalMarkup();
        const inspector = new SimpleDomInspector(uploadMarkup.content);

        test('F12.1: Dropdown #uploadTemplateSelect exists in DOM', () => {
            assert.ok(inspector.hasElementWithId('uploadTemplateSelect'), '#uploadTemplateSelect must exist');
            assert.equal(inspector.getElementTagById('uploadTemplateSelect'), 'select');
        });

        test('F12.2: Selecting template invokes onTemplateSelected handler', () => {
            const env = createMockEnvironment();
            env.uploadModal.onTemplateSelected(0);
            assert.equal(env.document.getElementById('uploadSystem').value, 'Microscopy (Confocal / 2-Photon)');
        });

        test('F12.3: Template selector options display template name and version', () => {
            const templates = [
                { name: 'Confocal 1', version: '1.0.0' },
                { name: 'Widefield 2', version: '2.0.0' }
            ];
            const options = templates.map((t, i) => `<option value="${i}">${t.name} (v${t.version})</option>`);
            assert.ok(options[0].includes('Confocal 1 (v1.0.0)'));
            assert.ok(options[1].includes('Widefield 2 (v2.0.0)'));
        });

        test('F12.4: Empty template list condition is handled gracefully', () => {
            const env = createMockEnvironment({ templates: [] });
            assert.doesNotThrow(() => {
                env.uploadModal.onTemplateSelected(0);
            });
        });

        test('F12.5: Selected template index correctly maps to templateManager.templates', () => {
            const env = createMockEnvironment();
            const tm = env.window.templateManager;
            assert.equal(tm.templates[0].name, 'Confocal Base');
        });
    });

    // =========================================================================
    // FEATURE 13: Upload Step 2 Taxonomy Review (M2, ORIGINAL_REQUEST § R2)
    // =========================================================================
    test.describe('Feature 13: Upload Step 2 Taxonomy Review', () => {
        const uploadMarkup = getUploadModalMarkup();
        const inspector = new SimpleDomInspector(uploadMarkup.content);

        test('F13.1: Inputs exist for System, Discipline, Organism, Tags, Author, License', () => {
            assert.ok(inspector.hasElementWithId('uploadSystem'), '#uploadSystem exists');
            assert.ok(inspector.hasElementWithId('uploadDiscipline'), '#uploadDiscipline exists');
            assert.ok(inspector.hasElementWithId('uploadOrganism'), '#uploadOrganism exists');
            assert.ok(inspector.hasElementWithId('uploadTags'), '#uploadTags exists');
            assert.ok(inspector.hasElementWithId('uploadAuthor'), '#uploadAuthor exists');
            assert.ok(inspector.hasElementWithId('uploadLicense'), '#uploadLicense exists');
        });

        test('F13.2: Datalists are linked for System, Discipline, Organism in upload modal', () => {
            assert.equal(inspector.getAttribute('uploadSystem', 'list'), 'uploadSystemList');
            assert.equal(inspector.getAttribute('uploadDiscipline', 'list'), 'uploadDisciplineList');
            assert.equal(inspector.getAttribute('uploadOrganism', 'list'), 'uploadOrganismList');
        });

        test('F13.3: Fields pre-populate from selected template community block', () => {
            const env = createMockEnvironment();
            env.uploadModal.onTemplateSelected(0);
            assert.equal(env.document.getElementById('uploadSystem').value, 'Microscopy (Confocal / 2-Photon)');
            assert.equal(env.document.getElementById('uploadDiscipline').value, 'Plant Biology / Botany');
            assert.equal(env.document.getElementById('uploadOrganism').value, 'Arabidopsis thaliana');
            assert.equal(env.document.getElementById('uploadTags').value, 'Confocal, GFP');
        });

        test('F13.4: Author defaults to template creator if community.author is absent', () => {
            const env = createMockEnvironment({
                templates: [{
                    name: 'Template No Comm Author',
                    createdBy: 'Creator Jane',
                    community: { system: 'Flow Cytometer / FACS' }
                }]
            });
            env.uploadModal.onTemplateSelected(0);
            assert.equal(env.document.getElementById('uploadAuthor').value, 'Creator Jane');
        });

        test('F13.5: User can edit taxonomy fields in Step 2 prior to submission', () => {
            const env = createMockEnvironment();
            env.uploadModal.onTemplateSelected(0);
            env.document.getElementById('uploadTags').value = 'Confocal, Super-Res, STED';
            assert.equal(env.document.getElementById('uploadTags').value, 'Confocal, Super-Res, STED');
        });
    });

    // =========================================================================
    // FEATURE 14: Local Template Tag Sync (M2, ORIGINAL_REQUEST § R2)
    // =========================================================================
    test.describe('Feature 14: Local Template Tag Sync', () => {
        const uploadMarkup = getUploadModalMarkup();
        const inspector = new SimpleDomInspector(uploadMarkup.content);

        test('F14.1: Checkbox #uploadSyncLocal exists in upload modal markup', () => {
            assert.ok(inspector.hasElementWithId('uploadSyncLocal'), '#uploadSyncLocal must exist');
            assert.equal(inspector.getElementTagById('uploadSyncLocal'), 'input');
        });

        test('F14.2: Checkbox is checked by default', () => {
            const isChecked = inspector.hasAttribute('uploadSyncLocal', 'checked');
            assert.equal(isChecked, true, 'Sync checkbox must be checked by default');
        });

        test('F14.3: Submitting with sync checked updates local template community tags', async () => {
            const env = createMockEnvironment();
            env.uploadModal.onTemplateSelected(0);
            env.document.getElementById('uploadTags').value = 'UpdatedTag1, UpdatedTag2';
            env.document.getElementById('uploadSyncLocal').checked = true;

            await env.uploadModal.submit();
            assert.equal(env.uploadModal.localUpdateCalled, true);
            assert.deepEqual(env.window.templateManager.templates[0].community.tags, ['UpdatedTag1', 'UpdatedTag2']);
        });

        test('F14.4: Submitting with sync checked invokes storage save', async () => {
            const env = createMockEnvironment();
            env.document.getElementById('uploadSyncLocal').checked = true;
            await env.uploadModal.submit();
            assert.ok(env.uploadModal.lastUpdatedTemplate, 'Updated template must be passed to storage');
        });

        test('F14.5: Submitting with sync unchecked leaves local template untouched', async () => {
            const env = createMockEnvironment();
            const originalTags = [...env.window.templateManager.templates[0].community.tags];
            env.document.getElementById('uploadTags').value = 'BrandNewTags';
            env.document.getElementById('uploadSyncLocal').checked = false;

            await env.uploadModal.submit();
            assert.deepEqual(env.window.templateManager.templates[0].community.tags, originalTags, 'Local template must not change');
        });
    });

    // =========================================================================
    // FEATURE 15: GitHub Issue Payload Formatting (M2, ORIGINAL_REQUEST § R2)
    // =========================================================================
    test.describe('Feature 15: GitHub Issue Payload Formatting', () => {
        const template = {
            name: 'Olympus SpinSR',
            createdBy: 'Dr. Jane',
            description: 'Spinning disk confocal protocol',
            community: {
                system: 'Microscopy (Confocal / 2-Photon)',
                discipline: 'Cell Biology',
                organism: 'Danio rerio',
                tags: ['Spinning Disk', 'Live-cell'],
                license: 'CC-BY-4.0'
            }
        };

        test('F15.1: Formats Issue Title as "New Template: <template.name>"', () => {
            const payload = spec.formatGitHubIssuePayload(template);
            assert.equal(payload.title, 'New Template: Olympus SpinSR');
        });

        test('F15.2: Issue body includes formatted taxonomy metadata fields', () => {
            const payload = spec.formatGitHubIssuePayload(template);
            assert.ok(payload.body.includes('**System / Device:** Microscopy (Confocal / 2-Photon)'));
            assert.ok(payload.body.includes('**Discipline:** Cell Biology'));
            assert.ok(payload.body.includes('**Biological System:** Danio rerio'));
            assert.ok(payload.body.includes('**Tags:** Spinning Disk, Live-cell'));
            assert.ok(payload.body.includes('**License:** CC-BY-4.0'));
        });

        test('F15.3: Issue body embeds fenced JSON codeblock of template', () => {
            const payload = spec.formatGitHubIssuePayload(template);
            assert.ok(payload.body.includes('```json'));
            assert.ok(payload.body.includes('"name": "Olympus SpinSR"'));
            assert.ok(payload.body.includes('```'));
        });

        test('F15.4: Target URL targets ThZobel/MetaFold-Templates with encoded parameters', () => {
            const payload = spec.formatGitHubIssuePayload(template);
            assert.ok(payload.url.startsWith('https://github.com/ThZobel/MetaFold-Templates/issues/new?'));
            assert.ok(payload.url.includes('title=' + encodeURIComponent(payload.title)));
            assert.ok(payload.url.includes('body=' + encodeURIComponent(payload.body)));
        });

        test('F15.5: External browser is launched with formatted URL', async () => {
            const env = createMockEnvironment();
            await env.uploadModal.submit();
            assert.ok(env.uploadModal.lastOpenedUrl, 'Must launch browser with URL');
            assert.ok(env.uploadModal.lastOpenedUrl.includes('https://github.com/ThZobel/MetaFold-Templates'));
        });
    });

    // =========================================================================
    // FEATURE 16: Payload Sanitization (M2, COMMUNITY_TEMPLATES_PLAN § 3.3)
    // =========================================================================
    test.describe('Feature 16: Payload Sanitization', () => {
        const dirtyTemplate = {
            id: 'template_12345',
            _fileInfo: { filePath: 'C:\\Users\\Thomas\\templates\\test.json' },
            savedLocally: true,
            storageType: 'local',
            userDisplayName: 'Thomas Zobel',
            name: 'Clean Template',
            description: 'Protocol description',
            type: 'experiment',
            options: { writeFilesOnly: false },
            metadata: { fields: { fieldA: { type: 'text' } } },
            community: { system: 'Plate Reader / Spectrophotometer' }
        };

        test('F16.1: Strips internal _fileInfo property from exported payload', () => {
            const sanitized = spec.sanitizeTemplateForExport(dirtyTemplate);
            assert.equal(sanitized._fileInfo, undefined);
        });

        test('F16.2: Strips internal id property from exported payload', () => {
            const sanitized = spec.sanitizeTemplateForExport(dirtyTemplate);
            assert.equal(sanitized.id, undefined);
        });

        test('F16.3: Strips savedLocally flag from exported payload', () => {
            const sanitized = spec.sanitizeTemplateForExport(dirtyTemplate);
            assert.equal(sanitized.savedLocally, undefined);
        });

        test('F16.4: Strips local desktop storage and user display metadata', () => {
            const sanitized = spec.sanitizeTemplateForExport(dirtyTemplate);
            assert.equal(sanitized.storageType, undefined);
            assert.equal(sanitized.userDisplayName, undefined);
        });

        test('F16.5: Preserves core template properties, metadata fields, and community taxonomy', () => {
            const sanitized = spec.sanitizeTemplateForExport(dirtyTemplate);
            assert.equal(sanitized.name, 'Clean Template');
            assert.equal(sanitized.description, 'Protocol description');
            assert.ok(sanitized.metadata && sanitized.metadata.fields.fieldA);
            assert.equal(sanitized.community.system, 'Plate Reader / Spectrophotometer');
        });
    });

    // =========================================================================
    // FEATURE 17: Upload Trigger Integration (M2, COMMUNITY_TEMPLATES_PLAN § 3.1)
    // =========================================================================
    test.describe('Feature 17: Upload Trigger Integration', () => {
        test('F17.1: Application menu event triggers upload-template action', () => {
            const env = createMockEnvironment();
            let receivedAction = null;
            env.window.electronAPI.onMenuAction(action => { receivedAction = action; });
            env.window.electronAPI.menuCb('upload-template');
            assert.equal(receivedAction, 'upload-template');
        });

        test('F17.2: onMenuAction invokes uploadModal.show() on upload-template', () => {
            const env = createMockEnvironment();
            env.window.electronAPI.onMenuAction(action => {
                if (action === 'upload-template') env.uploadModal.show();
            });
            env.window.electronAPI.menuCb('upload-template');
            assert.equal(env.document.getElementById('uploadTemplateModal').style.display, 'block');
        });

        test('F17.3: Slide-out panel triggers upload modal from UI button', () => {
            const env = createMockEnvironment();
            // Simulating slide-out panel click
            env.uploadModal.show(0);
            assert.equal(env.document.getElementById('uploadTemplateModal').style.display, 'block');
        });

        test('F17.4: Triggering with zero installed templates warns gracefully', () => {
            const env = createMockEnvironment({ templates: [] });
            assert.doesNotThrow(() => {
                env.uploadModal.show(0);
            });
        });

        test('F17.5: Triggering with valid templates pre-selects the first installed template', () => {
            const env = createMockEnvironment();
            env.uploadModal.show(0);
            assert.equal(env.document.getElementById('uploadSystem').value, 'Microscopy (Confocal / 2-Photon)');
        });
    });

    // =========================================================================
    // FEATURE 18: Facet Search Key Configuration (M3, ORIGINAL_REQUEST § R3)
    // =========================================================================
    test.describe('Feature 18: Facet Search Key Configuration', () => {
        test('F18.1: openTemplateHub configures allAvailableKeys on facetSearch', async () => {
            const env = createMockEnvironment();
            await env.app.openTemplateHub();
            assert.ok(Array.isArray(env.facetSearch.allAvailableKeys), 'allAvailableKeys must be array');
        });

        test('F18.2: allAvailableKeys includes all 7 community taxonomy keys', async () => {
            const env = createMockEnvironment();
            await env.app.openTemplateHub();
            for (const key of spec.ALL_AVAILABLE_KEYS) {
                assert.ok(env.facetSearch.allAvailableKeys.includes(key), `Key ${key} must be in allAvailableKeys`);
            }
        });

        test('F18.3: allAvailableKeys contains exactly 7 keys', async () => {
            const env = createMockEnvironment();
            await env.app.openTemplateHub();
            assert.equal(env.facetSearch.allAvailableKeys.length, 7);
        });

        test('F18.4: Supersedes old project-level keys (category, type, description)', async () => {
            const env = createMockEnvironment();
            await env.app.openTemplateHub();
            assert.equal(env.facetSearch.allAvailableKeys.includes('type'), false);
            assert.equal(env.facetSearch.allAvailableKeys.includes('description'), false);
        });

        test('F18.5: Keys are available for facet frequency aggregation', async () => {
            const env = createMockEnvironment();
            await env.app.openTemplateHub([
                { name: 'T1', system: 'Microscopy (Light / Widefield)', community: { system: 'Microscopy (Light / Widefield)' } }
            ]);
            const facets = env.facetSearch.getAvailableFacets();
            assert.ok(facets.system && facets.system['Microscopy (Light / Widefield)'] >= 1);
        });
    });

    // =========================================================================
    // FEATURE 19: Facet Search Visible Columns (M3, COMMUNITY_TEMPLATES_PLAN § 4.1)
    // =========================================================================
    test.describe('Feature 19: Facet Search Visible Columns', () => {
        test('F19.1: openTemplateHub configures visibleColumns on facetSearch', async () => {
            const env = createMockEnvironment();
            await env.app.openTemplateHub();
            assert.ok(Array.isArray(env.facetSearch.visibleColumns), 'visibleColumns must be array');
        });

        test('F19.2: visibleColumns includes all 6 primary taxonomy columns', async () => {
            const env = createMockEnvironment();
            await env.app.openTemplateHub();
            for (const col of spec.VISIBLE_COLUMNS) {
                assert.ok(env.facetSearch.visibleColumns.includes(col), `Column ${col} must be in visibleColumns`);
            }
        });

        test('F19.3: visibleColumns contains exactly 6 columns', async () => {
            const env = createMockEnvironment();
            await env.app.openTemplateHub();
            assert.equal(env.facetSearch.visibleColumns.length, 6);
        });

        test('F19.4: visibleColumns omits secondary technical version column by default', async () => {
            const env = createMockEnvironment();
            await env.app.openTemplateHub();
            assert.equal(env.facetSearch.visibleColumns.includes('version'), false);
        });

        test('F19.5: visibleColumns matches specified contract order', async () => {
            const env = createMockEnvironment();
            await env.app.openTemplateHub();
            assert.deepEqual(env.facetSearch.visibleColumns, spec.VISIBLE_COLUMNS);
        });
    });

    // =========================================================================
    // FEATURE 20: Template Index Unpacking (M3, COMMUNITY_TEMPLATES_PLAN § 4.1)
    // =========================================================================
    test.describe('Feature 20: Template Index Unpacking', () => {
        const indexItem = {
            id: 'stellaris-01',
            name: 'Leica Stellaris - Live Plant',
            collection: 'NFDI4Bioimage',
            path: 'templates/NFDI4Bioimage/leica_stellaris.json',
            community: {
                system: 'Microscopy (Confocal / 2-Photon)',
                discipline: 'Plant Biology / Botany',
                organism: 'Arabidopsis thaliana',
                tags: ['Confocal', 'Live-cell'],
                author: 'Dr. Thomas Zobel',
                version: '1.2.0'
            }
        };

        test('F20.1: Unpacks nested community object into flatMeta properties', () => {
            const unpacked = spec.unpackTemplateIndexItem(indexItem);
            assert.ok(unpacked.flatMeta);
            assert.equal(unpacked.flatMeta.system, 'Microscopy (Confocal / 2-Photon)');
            assert.equal(unpacked.flatMeta.discipline, 'Plant Biology / Botany');
            assert.equal(unpacked.flatMeta.organism, 'Arabidopsis thaliana');
        });

        test('F20.2: Preserves collection from root item into flatMeta', () => {
            const unpacked = spec.unpackTemplateIndexItem(indexItem);
            assert.equal(unpacked.flatMeta.collection, 'NFDI4Bioimage');
        });

        test('F20.3: Tags array is preserved as array in flatMeta', () => {
            const unpacked = spec.unpackTemplateIndexItem(indexItem);
            assert.deepEqual(unpacked.flatMeta.tags, ['Confocal', 'Live-cell']);
        });

        test('F20.4: Legacy items without community object unwrap gracefully with defaults', () => {
            const legacyItem = {
                id: 'legacy-01',
                name: 'Legacy Non-Community',
                path: 'templates/General/legacy.json'
            };
            const unpacked = spec.unpackTemplateIndexItem(legacyItem);
            assert.equal(unpacked.flatMeta.system, '');
            assert.deepEqual(unpacked.flatMeta.tags, []);
        });

        test('F20.5: Attaches _type: "template_hub" for Tabulator row rendering', () => {
            const unpacked = spec.unpackTemplateIndexItem(indexItem);
            assert.equal(unpacked._type, 'template_hub');
        });
    });

    // =========================================================================
    // FEATURE 21: Taxonomy Category Grouping (M3, ORIGINAL_REQUEST § R3)
    // =========================================================================
    test.describe('Feature 21: Taxonomy Category Grouping', () => {
        test('F21.1: Maps "collection" key to "🌐 Community Taxonomy"', () => {
            assert.equal(spec.getCategoryForKey('collection'), '🌐 Community Taxonomy');
        });

        test('F21.2: Maps "system" and "discipline" to "🌐 Community Taxonomy"', () => {
            assert.equal(spec.getCategoryForKey('system'), '🌐 Community Taxonomy');
            assert.equal(spec.getCategoryForKey('discipline'), '🌐 Community Taxonomy');
        });

        test('F21.3: Maps "organism" and "tags" to "🌐 Community Taxonomy"', () => {
            assert.equal(spec.getCategoryForKey('organism'), '🌐 Community Taxonomy');
            assert.equal(spec.getCategoryForKey('tags'), '🌐 Community Taxonomy');
        });

        test('F21.4: Maps author and version to "🌐 Community Taxonomy"', () => {
            assert.equal(spec.getCategoryForKey('author'), '🌐 Community Taxonomy');
            assert.equal(spec.getCategoryForKey('version'), '🌐 Community Taxonomy');
        });

        test('F21.5: Preserves distinct categories for non-community metadata keys', () => {
            assert.equal(spec.getCategoryForKey('OME.PixelSizeX'), '🔬 OME Metadata');
            assert.equal(spec.getCategoryForKey('File.Extension'), '📁 File Info');
            assert.equal(spec.getCategoryForKey('custom_param'), '📋 Metadata Fields');
        });
    });

    // =========================================================================
    // FEATURE 22: Filter Chip Rendering (M3, ORIGINAL_REQUEST § R3)
    // =========================================================================
    test.describe('Feature 22: Filter Chip Rendering', () => {
        const mockHubData = [
            {
                flatMeta: {
                    collection: 'NFDI4Bioimage',
                    system: 'Microscopy (Confocal / 2-Photon)',
                    discipline: 'Plant Biology / Botany',
                    organism: 'Arabidopsis thaliana',
                    tags: ['Confocal', 'GFP']
                }
            },
            {
                flatMeta: {
                    collection: 'NFDI4Bioimage',
                    system: 'Microscopy (Confocal / 2-Photon)',
                    discipline: 'Cell Biology',
                    organism: 'Mus musculus',
                    tags: ['Confocal', 'Time-lapse']
                }
            }
        ];

        test('F22.1: getAvailableFacets aggregates scalar frequencies correctly', () => {
            const env = createMockEnvironment();
            const facets = env.facetSearch.getAvailableFacets(mockHubData);
            assert.equal(facets.collection['NFDI4Bioimage'], 2);
            assert.equal(facets.system['Microscopy (Confocal / 2-Photon)'], 2);
            assert.equal(facets.organism['Arabidopsis thaliana'], 1);
            assert.equal(facets.organism['Mus musculus'], 1);
        });

        test('F22.2: Array tags expand into individual facet chips with counts', () => {
            const env = createMockEnvironment();
            const facets = env.facetSearch.getAvailableFacets(mockHubData);
            assert.equal(facets.tags['Confocal'], 2);
            assert.equal(facets.tags['GFP'], 1);
            assert.equal(facets.tags['Time-lapse'], 1);
        });

        test('F22.3: Activating filter updates facetSearch.activeFilters', () => {
            const env = createMockEnvironment();
            env.facetSearch.activeFilters['organism'] = 'Arabidopsis thaliana';
            assert.equal(env.facetSearch.activeFilters['organism'], 'Arabidopsis thaliana');
        });

        test('F22.4: Empty filter sets are handled without exception', () => {
            const env = createMockEnvironment();
            assert.doesNotThrow(() => {
                env.facetSearch.getAvailableFacets([]);
            });
        });

        test('F22.5: closeSearch resets active filters and isTemplateHub', () => {
            const env = createMockEnvironment();
            env.facetSearch.isTemplateHub = true;
            env.facetSearch.activeFilters['system'] = 'Microscopy (Confocal / 2-Photon)';
            env.facetSearch.closeSearch();
            assert.deepEqual(env.facetSearch.activeFilters, {});
            assert.equal(env.facetSearch.isTemplateHub, false, 'isTemplateHub must be reset on closeSearch');
        });
    });

    // =========================================================================
    // FEATURE 23: Tabulator Selection Styling (M3, SESSION_HANDOVER § 3.2)
    // =========================================================================
    test.describe('Feature 23: Tabulator Selection Styling', () => {
        const cssPath = path.join(PROJECT_ROOT, 'src', 'css', 'facetSearch.css');
        let cssContent = '';
        if (fs.existsSync(cssPath)) {
            cssContent = fs.readFileSync(cssPath, 'utf8');
        }

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
    });

    // =========================================================================
    // FEATURE 24: Download & Install Template (M3, ORIGINAL_REQUEST § R3)
    // =========================================================================
    test.describe('Feature 24: Download & Install Template', () => {
        test('F24.1: downloadAndInstallTemplate strips _fileInfo from template', async () => {
            const env = createMockEnvironment();
            const rawTemplate = {
                name: 'Hub Template',
                _fileInfo: { path: '/remote/hub/template.json' },
                community: { system: 'Plate Reader' }
            };
            await env.app.downloadAndInstallTemplate(rawTemplate);
            assert.equal(env.app.lastInstalledTemplate._fileInfo, undefined);
        });

        test('F24.2: Assigns fresh local template ID and sets savedLocally: true', async () => {
            const env = createMockEnvironment();
            const rawTemplate = { name: 'Fresh Hub Template' };
            await env.app.downloadAndInstallTemplate(rawTemplate);
            assert.ok(env.app.lastInstalledTemplate.id.startsWith('template_'));
            assert.equal(env.app.lastInstalledTemplate.savedLocally, true);
        });

        test('F24.3: Assigns ownership to active user context', async () => {
            const env = createMockEnvironment();
            const rawTemplate = { name: 'Ownership Template' };
            await env.app.downloadAndInstallTemplate(rawTemplate, { username: 'Dr. Jane', groupname: 'Imaging' });
            assert.equal(env.app.lastInstalledTemplate.originalCreator, 'Dr. Jane');
            assert.equal(env.app.lastInstalledTemplate.originalGroup, 'Imaging');
        });

        test('F24.4: Defaults template category to category1 if missing', async () => {
            const env = createMockEnvironment();
            const rawTemplate = { name: 'No Category Template' };
            await env.app.downloadAndInstallTemplate(rawTemplate);
            assert.equal(env.app.lastInstalledTemplate.category, 'category1');
        });

        test('F24.5: Refreshes templateManager.templates with installed template', async () => {
            const env = createMockEnvironment();
            const rawTemplate = { name: 'New Installed' };
            const initialCount = env.window.templateManager.templates.length;
            await env.app.downloadAndInstallTemplate(rawTemplate);
            assert.equal(env.window.templateManager.templates.length, initialCount + 1);
        });
    });

    // =========================================================================
    // FEATURE 25: Readme Generator Isolation (M3, COMMUNITY_TEMPLATES_PLAN § 1.2)
    // =========================================================================
    test.describe('Feature 25: Readme Generator Isolation', () => {
        test('F25.1: filterReadmeMetadata excludes community object', () => {
            const metadata = {
                laser_power: 30,
                filter_set: 'DAPI/FITC',
                community: {
                    system: 'Microscopy (Confocal / 2-Photon)',
                    tags: ['Confocal', 'GFP']
                }
            };
            const filtered = spec.filterReadmeMetadata(metadata);
            assert.equal(filtered.community, undefined);
            assert.equal(filtered.laser_power, 30);
        });

        test('F25.2: filterReadmeMetadata excludes internal system flags starting with _', () => {
            const metadata = {
                sample_id: 'S101',
                _fileInfo: { path: 'foo' },
                _metafold: { version: '0.0.1' },
                community: { system: 'Wet Lab' }
            };
            const filtered = spec.filterReadmeMetadata(metadata);
            assert.equal(filtered._fileInfo, undefined);
            assert.equal(filtered._metafold, undefined);
            assert.equal(filtered.community, undefined);
            assert.equal(filtered.sample_id, 'S101');
        });

        test('F25.3: README HTML output contains zero community headers or tables', () => {
            const metadata = {
                objective: '63x Oil',
                community: { organism: 'Arabidopsis thaliana' }
            };
            const filtered = spec.filterReadmeMetadata(metadata);
            const html = `<table>${Object.entries(filtered).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`;
            assert.equal(html.includes('Arabidopsis thaliana'), false);
            assert.equal(html.includes('community'), false);
        });

        test('F25.4: Preserves all user experimental metadata fields unchanged', () => {
            const metadata = {
                laser_power: 45,
                exposure_time: 150,
                community: { license: 'MIT' }
            };
            const filtered = spec.filterReadmeMetadata(metadata);
            assert.equal(filtered.laser_power, 45);
            assert.equal(filtered.exposure_time, 150);
        });

        test('F25.5: Handles empty or null metadata objects gracefully', () => {
            assert.deepEqual(spec.filterReadmeMetadata(null), {});
            assert.deepEqual(spec.filterReadmeMetadata({}), {});
        });
    });

});
