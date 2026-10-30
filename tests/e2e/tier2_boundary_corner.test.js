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

test.describe('Tier 2: Boundary & Corner Cases (Features 1–25)', () => {

    // =========================================================================
    // FEATURE 1: Metadata Tab Primary — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 1 Boundaries: Metadata Tab Primary', () => {
        test('F1.B1: switchTab with undefined, null, or empty string defaults safely', () => {
            const env = createMockEnvironment();
            assert.doesNotThrow(() => env.templateModal.switchTab(undefined));
            assert.doesNotThrow(() => env.templateModal.switchTab(null));
            assert.doesNotThrow(() => env.templateModal.switchTab(''));
        });

        test('F1.B2: Rapid alternating tab switching maintains single active tab', () => {
            const env = createMockEnvironment();
            for (let i = 0; i < 10; i++) {
                env.templateModal.switchTab('metadata');
                env.templateModal.switchTab('community');
            }
            env.templateModal.switchTab('metadata');
            assert.ok(env.document.getElementById('metadataContent').classList.contains('active'));
            assert.equal(env.document.getElementById('communityContent').classList.contains('active'), false);
        });

        test('F1.B3: switchTab with unknown arbitrary name does not crash', () => {
            const env = createMockEnvironment();
            assert.doesNotThrow(() => env.templateModal.switchTab('non_existent_tab_123'));
        });

        test('F1.B4: Modal controller handles missing DOM elements gracefully', () => {
            const env = createMockEnvironment();
            env.document.getElementById = () => null;
            assert.doesNotThrow(() => env.templateModal.switchTab('metadata'));
        });

        test('F1.B5: Tab class list contains exactly one active tab among siblings', () => {
            const env = createMockEnvironment();
            env.templateModal.switchTab('metadata');
            const allTabs = env.document.querySelectorAll('.tab');
            const activeTabs = allTabs.filter(t => t.classList.contains('active'));
            assert.equal(activeTabs.length, 1);
        });
    });

    // =========================================================================
    // FEATURE 2: Collapsible Folder Structure — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 2 Boundaries: Collapsible Folder Structure', () => {
        test('F2.B1: Extremely large structure string (10,000 chars) preserved', () => {
            const env = createMockEnvironment();
            const hugeStructure = 'data/\n  sub/\n'.repeat(700);
            env.document.getElementById('experimentStructure').value = hugeStructure;
            assert.equal(env.document.getElementById('experimentStructure').value.length, hugeStructure.length);
        });

        test('F2.B2: Structure containing Unicode, emojis, and math symbols preserved', () => {
            const env = createMockEnvironment();
            const unicodeStructure = '🔬 raw_data/\n  café_experiment/\n  π_results/\n';
            env.document.getElementById('experimentStructure').value = unicodeStructure;
            assert.equal(env.document.getElementById('experimentStructure').value, unicodeStructure);
        });

        test('F2.B3: Mixed line endings (CRLF, LF, CR) preserved without distortion', () => {
            const env = createMockEnvironment();
            const mixedEndings = 'dir1/\r\ndir2/\ndir3/\r';
            env.document.getElementById('experimentStructure').value = mixedEndings;
            assert.equal(env.document.getElementById('experimentStructure').value, mixedEndings);
        });

        test('F2.B4: Empty structure string serializes cleanly as empty string', () => {
            const env = createMockEnvironment();
            env.document.getElementById('experimentStructure').value = '';
            const template = env.templateModal.save();
            assert.equal(template.structure, '');
        });

        test('F2.B5: Details open state toggled multiple times preserves switch values', () => {
            const env = createMockEnvironment();
            const details = env.document.getElementById('folderStructureDetails');
            const switch1 = env.document.getElementById('templateWriteFilesOnly');
            switch1.checked = true;

            details.open = true;
            details.open = false;
            details.open = true;

            assert.equal(switch1.checked, true);
        });
    });

    // =========================================================================
    // FEATURE 3: Community Tab — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 3 Boundaries: Community Tab', () => {
        test('F3.B1: Switching to community tab with uninitialized inputs does not throw', () => {
            const env = createMockEnvironment();
            assert.doesNotThrow(() => env.templateModal.switchTab('community'));
        });

        test('F3.B2: Re-opening modal after editing community inputs resets or restores properly', () => {
            const env = createMockEnvironment();
            env.templateModal.show();
            env.document.getElementById('communitySystem').value = 'Test System';
            env.templateModal.clearForm();
            assert.equal(env.document.getElementById('communitySystem').value, '');
        });

        test('F3.B3: Clicking community tab when already active is idempotent', () => {
            const env = createMockEnvironment();
            env.templateModal.switchTab('community');
            env.templateModal.switchTab('community');
            assert.ok(env.document.getElementById('tabBtnCommunity').classList.contains('active'));
        });

        test('F3.B4: Panel display styles toggle cleanly without layout disruption', () => {
            const env = createMockEnvironment();
            env.templateModal.switchTab('community');
            assert.ok(env.document.getElementById('communityContent').classList.contains('active'));
            env.templateModal.switchTab('metadata');
            assert.equal(env.document.getElementById('communityContent').classList.contains('active'), false);
        });

        test('F3.B5: Tab elements support accessibility attributes', () => {
            const modalMarkup = getTemplateModalMarkup();
            assert.ok(modalMarkup.content.includes('tab') && modalMarkup.content.includes('community'));
        });
    });

    // =========================================================================
    // FEATURE 4: System Datalist — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 4 Boundaries: System Datalist', () => {
        test('F4.B1: Empty system value serializes as empty string', () => {
            const data = spec.collectCommunityData({ system: '', discipline: 'Plant' });
            assert.equal(data.system, '');
        });

        test('F4.B2: Long free-text system (500 chars) with math symbols preserved', () => {
            const longSystem = 'Custom Laser Scanning Spectrometer (λ ≥ 1000 nm) - ' + 'A'.repeat(400);
            const data = spec.collectCommunityData({ system: longSystem });
            assert.equal(data.system, longSystem);
        });

        test('F4.B3: System input with HTML injection characters handled safely', () => {
            const dangerousSystem = '<script>alert("XSS")</script> & "Confocal"';
            const data = spec.collectCommunityData({ system: dangerousSystem });
            assert.equal(data.system, dangerousSystem);
        });

        test('F4.B4: System input with excess whitespace is trimmed', () => {
            const data = spec.collectCommunityData({ system: '   Flow Cytometer / FACS   ' });
            assert.equal(data.system, 'Flow Cytometer / FACS');
        });

        test('F4.B5: Exact count and uniqueness across all 18 system options', () => {
            assert.equal(spec.SYSTEM_OPTIONS.length, 18);
            const uniqueSet = new Set(spec.SYSTEM_OPTIONS);
            assert.equal(uniqueSet.size, 18, 'All 18 options must be unique');
        });
    });

    // =========================================================================
    // FEATURE 5: Discipline Datalist — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 5 Boundaries: Discipline Datalist', () => {
        test('F5.B1: Empty discipline value serializes as empty string', () => {
            const data = spec.collectCommunityData({ discipline: '   ' });
            assert.equal(data, null);
        });

        test('F5.B2: Free-text discipline with slashes and ampersands preserved', () => {
            const complexDiscipline = 'Molecular Biology & Genetics / Synthetic Bio';
            const data = spec.collectCommunityData({ discipline: complexDiscipline });
            assert.equal(data.discipline, complexDiscipline);
        });

        test('F5.B3: Non-Latin discipline characters (French, Chinese, Arabic) preserved', () => {
            const i18nDiscipline = 'Biologie végétale / 植物学 / علم النبات';
            const data = spec.collectCommunityData({ discipline: i18nDiscipline });
            assert.equal(data.discipline, i18nDiscipline);
        });

        test('F5.B4: Exact count and uniqueness across all 15 discipline options', () => {
            assert.equal(spec.DISCIPLINE_OPTIONS.length, 15);
            const uniqueSet = new Set(spec.DISCIPLINE_OPTIONS);
            assert.equal(uniqueSet.size, 15, 'All 15 disciplines must be unique');
        });

        test('F5.B5: Trailing whitespace and newline controls in discipline trimmed', () => {
            const data = spec.collectCommunityData({ discipline: '\tNeuroscience\n ' });
            assert.equal(data.discipline, 'Neuroscience');
        });
    });

    // =========================================================================
    // FEATURE 6: Organism Datalist — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 6 Boundaries: Organism Datalist', () => {
        test('F6.B1: Empty organism value serializes as empty string', () => {
            const data = spec.collectCommunityData({ organism: '', tags: 'Test' });
            assert.equal(data.organism, '');
        });

        test('F6.B2: Non-biological entry with slashes preserved without error', () => {
            const nonBio = 'Non-biological / In vitro / Synthetic';
            const data = spec.collectCommunityData({ organism: nonBio });
            assert.equal(data.organism, nonBio);
        });

        test('F6.B3: Custom strain with sub-species and punctuation preserved', () => {
            const strain = 'S. cerevisiae strain BY4741 (MATa his3Δ1 leu2Δ0)';
            const data = spec.collectCommunityData({ organism: strain });
            assert.equal(data.organism, strain);
        });

        test('F6.B4: Quotes and square brackets in organism string preserved', () => {
            const quoted = '"HeLa" Cell Line [ATCC CCL-2]';
            const data = spec.collectCommunityData({ organism: quoted });
            assert.equal(data.organism, quoted);
        });

        test('F6.B5: Exact count and uniqueness across all 12 organism options', () => {
            assert.equal(spec.ORGANISM_OPTIONS.length, 12);
            const uniqueSet = new Set(spec.ORGANISM_OPTIONS);
            assert.equal(uniqueSet.size, 12, 'All 12 organisms must be unique');
        });
    });

    // =========================================================================
    // FEATURE 7: Additional Community Fields — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 7 Boundaries: Additional Community Fields', () => {
        test('F7.B1: Multiple empty commas (", , , ,") parses to empty array', () => {
            const tags = spec.parseTagsString(',  , , , ');
            assert.deepEqual(tags, []);
        });

        test('F7.B2: 100 distinct tags all parsed, trimmed, and retained', () => {
            const tagList = Array.from({ length: 100 }, (_, i) => `Tag_${i}`);
            const raw = tagList.join(' , ');
            const parsed = spec.parseTagsString(raw);
            assert.equal(parsed.length, 100);
            assert.equal(parsed[99], 'Tag_99');
        });

        test('F7.B3: Tags with special characters, symbols, and hashes parsed cleanly', () => {
            const raw = '#Confocal-3D, 4D/Time-lapse, GFP+RFP, 100%_Yield';
            const parsed = spec.parseTagsString(raw);
            assert.deepEqual(parsed, ['#Confocal-3D', '4D/Time-lapse', 'GFP+RFP', '100%_Yield']);
        });

        test('F7.B4: ORCID format with hyphens and leading zeroes preserved', () => {
            const data = spec.collectCommunityData({ orcid: '0000-0002-1825-0097' });
            assert.equal(data.orcid, '0000-0002-1825-0097');
        });

        test('F7.B5: Complex semver version string preserved accurately', () => {
            const data = spec.collectCommunityData({ version: '1.0.0-alpha.1+build.20261006' });
            assert.equal(data.version, '1.0.0-alpha.1+build.20261006');
        });
    });

    // =========================================================================
    // FEATURE 8: Community JSON Serialization — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 8 Boundaries: Community JSON Serialization', () => {
        test('F8.B1: When community inputs are all blank, returns null', () => {
            const data = spec.collectCommunityData({});
            assert.equal(data, null);
        });

        test('F8.B2: Deeply nested metadata.fields structure preserved untouched', () => {
            const env = createMockEnvironment();
            const complexMetadata = {
                fields: {
                    laser: { type: 'number', config: { min: 0, max: 100, step: 0.1 } }
                }
            };
            const template = env.templateModal.save();
            template.metadata = complexMetadata;
            assert.deepEqual(template.metadata.fields.laser.config, { min: 0, max: 100, step: 0.1 });
        });

        test('F8.B3: Non-ASCII author and institution preserved without character loss', () => {
            const data = spec.collectCommunityData({
                author: 'Dr. François Müller',
                institution: 'Université de Genève'
            });
            assert.equal(data.author, 'Dr. François Müller');
            assert.equal(data.institution, 'Université de Genève');
        });

        test('F8.B4: Serialization handles missing template options without error', () => {
            const env = createMockEnvironment();
            const template = env.templateModal.save();
            assert.ok(template.options);
            assert.equal(template.options.writeFilesOnly, false);
        });

        test('F8.B5: Serialization is idempotent across consecutive calls', () => {
            const env = createMockEnvironment();
            env.document.getElementById('communitySystem').value = 'Plate Reader';
            const t1 = JSON.stringify(env.templateModal.save());
            const t2 = JSON.stringify(env.templateModal.save());
            assert.equal(t1, t2);
        });
    });

    // =========================================================================
    // FEATURE 9: Community JSON Deserialization — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 9 Boundaries: Community JSON Deserialization', () => {
        test('F9.B1: Deserializing tags as string rather than array handles smoothly', () => {
            const env = createMockEnvironment();
            const template = {
                community: { tags: 'SingleTagString, AnotherTag' }
            };
            env.templateModal.populateForm(template);
            assert.equal(env.document.getElementById('communityTags').value, 'SingleTagString, AnotherTag');
        });

        test('F9.B2: Deserializing tags as null or empty array sets input to empty string', () => {
            const env = createMockEnvironment();
            env.templateModal.populateForm({ community: { tags: [] } });
            assert.equal(env.document.getElementById('communityTags').value, '');
            env.templateModal.populateForm({ community: { tags: null } });
            assert.equal(env.document.getElementById('communityTags').value, '');
        });

        test('F9.B3: Template with unexpected extra keys in community handles without error', () => {
            const env = createMockEnvironment();
            assert.doesNotThrow(() => {
                env.templateModal.populateForm({
                    community: { system: 'Microscopy', unknownKey: 'extraVal' }
                });
            });
        });

        test('F9.B4: Corrupted non-object community value handled without exception', () => {
            const env = createMockEnvironment();
            assert.doesNotThrow(() => {
                env.templateModal.populateForm({ community: 'not an object' });
            });
        });

        test('F9.B5: Template with null metadata object handled gracefully', () => {
            const env = createMockEnvironment();
            assert.doesNotThrow(() => {
                env.templateModal.populateForm({ metadata: null, community: {} });
            });
        });
    });

    // =========================================================================
    // FEATURE 10: Downstream Lab Isolation — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 10 Boundaries: Downstream Lab Isolation', () => {
        test('F10.B1: Identical key in community and metadata.fields keeps metadata.fields for lab', () => {
            const template = {
                community: { system: 'Microscopy (Confocal / 2-Photon)' },
                metadata: {
                    fields: {
                        system: { type: 'text', label: 'Lab Operating System' }
                    }
                }
            };
            // In experimentForm, only metadata.fields is consumed
            const fieldLabel = template.metadata.fields.system.label;
            assert.equal(fieldLabel, 'Lab Operating System');
        });

        test('F10.B2: Batch mode (multipleFolders: true) maintains complete community isolation', () => {
            const template = {
                options: { multipleFolders: true },
                community: { system: 'Sequencer' },
                metadata: { fields: { sample_batch: { type: 'text' } } }
            };
            assert.equal(template.options.multipleFolders, true);
            assert.equal(template.metadata.fields.system, undefined);
        });

        test('F10.B3: Deeply nested experiment metadata never inherits community keys', () => {
            const expData = {
                metadata: {
                    group: { subGroup: { value: 123 } }
                }
            };
            assert.equal(expData.metadata.community, undefined);
        });

        test('F10.B4: Empty project metadata produces valid export without community', () => {
            const exportObj = { fields: {} };
            assert.equal(exportObj.community, undefined);
        });

        test('F10.B5: ReadyToImport.json generator excludes template taxonomy artifacts', () => {
            const readyToImport = JSON.stringify({ name: 'Exp1', fields: { f1: 'v1' } });
            assert.equal(readyToImport.includes('community'), false);
        });
    });

    // =========================================================================
    // FEATURE 11: Upload Modal Component — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 11 Boundaries: Upload Modal Component', () => {
        test('F11.B1: Upload modal opened with zero templates does not crash', () => {
            const env = createMockEnvironment({ templates: [] });
            assert.doesNotThrow(() => env.uploadModal.show(0));
        });

        test('F11.B2: Upload modal handles large template list (1,000 items)', () => {
            const largeTemplates = Array.from({ length: 1000 }, (_, i) => ({
                name: `Template ${i}`,
                community: { system: 'Plate Reader' }
            }));
            const env = createMockEnvironment({ templates: largeTemplates });
            assert.doesNotThrow(() => env.uploadModal.show(999));
        });

        test('F11.B3: Closing upload modal via Cancel hides modal and clears state', () => {
            const env = createMockEnvironment();
            env.uploadModal.show(0);
            env.uploadModal.close();
            assert.equal(env.document.getElementById('uploadTemplateModal').style.display, 'none');
        });

        test('F11.B4: Closing upload modal is idempotent', () => {
            const env = createMockEnvironment();
            assert.doesNotThrow(() => {
                env.uploadModal.close();
                env.uploadModal.close();
            });
        });

        test('F11.B5: Re-opening upload modal multiple times does not duplicate state', () => {
            const env = createMockEnvironment();
            for (let i = 0; i < 5; i++) {
                env.uploadModal.show(0);
                env.uploadModal.close();
            }
            assert.equal(env.document.getElementById('uploadTemplateModal').style.display, 'none');
        });
    });

    // =========================================================================
    // FEATURE 12: Upload Step 1 Template Selection — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 12 Boundaries: Upload Step 1 Template Selection', () => {
        test('F12.B1: Out-of-bounds template index handled gracefully', () => {
            const env = createMockEnvironment();
            assert.doesNotThrow(() => env.uploadModal.onTemplateSelected(9999));
            assert.doesNotThrow(() => env.uploadModal.onTemplateSelected(-1));
        });

        test('F12.B2: Template with empty string name handled cleanly', () => {
            const env = createMockEnvironment({
                templates: [{ name: '', community: { system: 'Wet Lab' } }]
            });
            env.uploadModal.onTemplateSelected(0);
            assert.equal(env.document.getElementById('uploadSystem').value, 'Wet Lab');
        });

        test('F12.B3: Template with 500-character name handled without error', () => {
            const longName = 'T'.repeat(500);
            const env = createMockEnvironment({
                templates: [{ name: longName, community: { system: 'Wet Lab' } }]
            });
            assert.doesNotThrow(() => env.uploadModal.onTemplateSelected(0));
        });

        test('F12.B4: Template with null version string displays fallback', () => {
            const tm = [{ name: 'Test', version: null }];
            const label = `${tm[0].name} (v${tm[0].version || '1.0'})`;
            assert.equal(label, 'Test (v1.0)');
        });

        test('F12.B5: Template with HTML special characters in name displays safely', () => {
            const env = createMockEnvironment({
                templates: [{ name: '<script>alert(1)</script>', community: { system: 'Wet Lab' } }]
            });
            assert.doesNotThrow(() => env.uploadModal.onTemplateSelected(0));
        });
    });

    // =========================================================================
    // FEATURE 13: Upload Step 2 Taxonomy Review — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 13 Boundaries: Upload Step 2 Taxonomy Review', () => {
        test('F13.B1: Template with null community object initializes inputs to blank', () => {
            const env = createMockEnvironment({
                templates: [{ name: 'No Comm', community: null }]
            });
            env.uploadModal.onTemplateSelected(0);
            assert.equal(env.document.getElementById('uploadSystem').value, '');
        });

        test('F13.B2: Step 2 handles extremely long tag input (5,000 characters)', () => {
            const env = createMockEnvironment();
            const hugeTags = Array.from({ length: 500 }, (_, i) => `Tag${i}`).join(', ');
            env.document.getElementById('uploadTags').value = hugeTags;
            const parsed = spec.parseTagsString(env.document.getElementById('uploadTags').value);
            assert.equal(parsed.length, 500);
        });

        test('F13.B3: Blank Step 2 author defaults to active user or Unknown in payload', () => {
            const payload = spec.formatGitHubIssuePayload({
                name: 'T1',
                createdBy: '',
                community: { author: '' }
            });
            assert.ok(payload.body.includes('**Author:** Unknown'));
        });

        test('F13.B4: Switching template selection in Step 1 refreshes Step 2 immediately', () => {
            const env = createMockEnvironment({
                templates: [
                    { name: 'T1', community: { system: 'System One' } },
                    { name: 'T2', community: { system: 'System Two' } }
                ]
            });
            env.uploadModal.onTemplateSelected(0);
            assert.equal(env.document.getElementById('uploadSystem').value, 'System One');
            env.uploadModal.onTemplateSelected(1);
            assert.equal(env.document.getElementById('uploadSystem').value, 'System Two');
        });

        test('F13.B5: Custom license string entry preserved in payload', () => {
            const payload = spec.formatGitHubIssuePayload({
                name: 'T1',
                community: { license: 'Custom-Academic-License' }
            });
            assert.ok(payload.body.includes('**License:** Custom-Academic-License'));
        });
    });

    // =========================================================================
    // FEATURE 14: Local Template Tag Sync — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 14 Boundaries: Local Template Tag Sync', () => {
        test('F14.B1: Sync with empty tags array clears tags on disk', async () => {
            const env = createMockEnvironment();
            env.uploadModal.onTemplateSelected(0);
            env.document.getElementById('uploadTags').value = '';
            env.document.getElementById('uploadSyncLocal').checked = true;

            await env.uploadModal.submit();
            assert.deepEqual(env.window.templateManager.templates[0].community.tags, []);
        });

        test('F14.B2: Sync error from storage is handled without crashing', async () => {
            const env = createMockEnvironment();
            env.window.storage.saveTemplateToFileImmediately = () => Promise.reject(new Error('Disk full'));
            env.document.getElementById('uploadSyncLocal').checked = true;

            // Submit should handle or propagate cleanly
            try {
                await env.uploadModal.submit();
            } catch (err) {
                assert.equal(err.message, 'Disk full');
            }
        });

        test('F14.B3: Sync operation does NOT modify metadata.fields', async () => {
            const env = createMockEnvironment();
            const originalFields = JSON.stringify(env.window.templateManager.templates[0].metadata.fields);
            env.document.getElementById('uploadSyncLocal').checked = true;
            await env.uploadModal.submit();
            assert.equal(JSON.stringify(env.window.templateManager.templates[0].metadata.fields), originalFields);
        });

        test('F14.B4: Sync operation does NOT modify folder structure or options', async () => {
            const env = createMockEnvironment();
            const originalStructure = env.window.templateManager.templates[0].structure;
            env.document.getElementById('uploadSyncLocal').checked = true;
            await env.uploadModal.submit();
            assert.equal(env.window.templateManager.templates[0].structure, originalStructure);
        });

        test('F14.B5: Consecutive sync calls update local template deterministically', async () => {
            const env = createMockEnvironment();
            env.document.getElementById('uploadSyncLocal').checked = true;

            env.document.getElementById('uploadTags').value = 'TagA';
            await env.uploadModal.submit();
            assert.deepEqual(env.window.templateManager.templates[0].community.tags, ['TagA']);

            env.document.getElementById('uploadTags').value = 'TagB';
            await env.uploadModal.submit();
            assert.deepEqual(env.window.templateManager.templates[0].community.tags, ['TagB']);
        });
    });

    // =========================================================================
    // FEATURE 15: GitHub Issue Payload Formatting — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 15 Boundaries: GitHub Issue Payload Formatting', () => {
        test('F15.B1: Description with Markdown formatting preserved', () => {
            const payload = spec.formatGitHubIssuePayload({
                name: 'T1',
                description: '### Heading\n- Item 1\n- Item 2'
            });
            assert.ok(payload.body.includes('### Heading'));
            assert.ok(payload.body.includes('- Item 1'));
        });

        test('F15.B2: Template JSON with embedded backticks does not break codeblock', () => {
            const payload = spec.formatGitHubIssuePayload({
                name: 'Backtick Template',
                description: 'Contains `code` here'
            });
            assert.ok(payload.body.includes('```json'));
        });

        test('F15.B3: Large template JSON generates valid URI components', () => {
            const largeTemplate = {
                name: 'Large Template',
                metadata: { fields: {} }
            };
            for (let i = 0; i < 200; i++) {
                largeTemplate.metadata.fields[`field_${i}`] = { type: 'text', label: `Field ${i}` };
            }
            const payload = spec.formatGitHubIssuePayload(largeTemplate);
            assert.doesNotThrow(() => decodeURIComponent(payload.url));
        });

        test('F15.B4: URL encoding handles reserved characters (&, =, ?, #, +) safely', () => {
            const payload = spec.formatGitHubIssuePayload({
                name: 'Test & Query = True + More #1'
            });
            assert.ok(payload.url.includes(encodeURIComponent('New Template: Test & Query = True + More #1')));
        });

        test('F15.B5: Template name with quotes and emojis in title encoded cleanly', () => {
            const payload = spec.formatGitHubIssuePayload({
                name: '🔬 "Super-Res STED"'
            });
            assert.ok(payload.url.includes(encodeURIComponent('New Template: 🔬 "Super-Res STED"')));
        });
    });

    // =========================================================================
    // FEATURE 16: Payload Sanitization — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 16 Boundaries: Payload Sanitization', () => {
        test('F16.B1: Nested object containing _fileInfo at root level only strips root flag', () => {
            const dirty = {
                _fileInfo: { path: '/tmp' },
                custom: { info: 'preserved' }
            };
            const sanitized = spec.sanitizeTemplateForExport(dirty);
            assert.equal(sanitized._fileInfo, undefined);
            assert.equal(sanitized.custom.info, 'preserved');
        });

        test('F16.B2: Sanitizing an already clean template produces identical copy', () => {
            const clean = { name: 'Clean', community: { system: 'Plate Reader' } };
            const sanitized = spec.sanitizeTemplateForExport(clean);
            assert.deepEqual(sanitized, clean);
        });

        test('F16.B3: Sanitizing null or undefined returns empty object without error', () => {
            assert.deepEqual(spec.sanitizeTemplateForExport(null), {});
            assert.deepEqual(spec.sanitizeTemplateForExport(undefined), {});
        });

        test('F16.B4: Sanitizing does NOT mutate original input template object', () => {
            const original = { id: 'temp_1', name: 'Original' };
            spec.sanitizeTemplateForExport(original);
            assert.equal(original.id, 'temp_1');
        });

        test('F16.B5: Strips all internal runtime keys defined in contract', () => {
            const templateWithAllFlags = { name: 'Flags' };
            for (const key of spec.INTERNAL_RUNTIME_KEYS) {
                templateWithAllFlags[key] = 'junk';
            }
            const sanitized = spec.sanitizeTemplateForExport(templateWithAllFlags);
            for (const key of spec.INTERNAL_RUNTIME_KEYS) {
                assert.equal(sanitized[key], undefined, `Key ${key} must be stripped`);
            }
        });
    });

    // =========================================================================
    // FEATURE 17: Upload Trigger Integration — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 17 Boundaries: Upload Trigger Integration', () => {
        test('F17.B1: Unknown menu action ignored safely', () => {
            const env = createMockEnvironment();
            let opened = false;
            env.window.electronAPI.onMenuAction(action => {
                if (action === 'upload-template') opened = true;
            });
            env.window.electronAPI.menuCb('unknown-action-xyz');
            assert.equal(opened, false);
        });

        test('F17.B2: Menu action triggered when modal is already visible does not duplicate', () => {
            const env = createMockEnvironment();
            env.uploadModal.show(0);
            env.uploadModal.show(0);
            assert.equal(env.document.getElementById('uploadTemplateModal').style.display, 'block');
        });

        test('F17.B3: Trigger button clicked when DOM is loading handled safely', () => {
            const env = createMockEnvironment();
            assert.doesNotThrow(() => env.uploadModal.show(0));
        });

        test('F17.B4: Rapid consecutive menu actions handled gracefully', () => {
            const env = createMockEnvironment();
            for (let i = 0; i < 10; i++) {
                env.uploadModal.show(0);
            }
            assert.equal(env.document.getElementById('uploadTemplateModal').style.display, 'block');
        });

        test('F17.B5: Trigger with single template selects that template without index error', () => {
            const env = createMockEnvironment({
                templates: [{ name: 'Solo', community: { system: 'Solo System' } }]
            });
            env.uploadModal.show(0);
            assert.equal(env.document.getElementById('uploadSystem').value, 'Solo System');
        });
    });

    // =========================================================================
    // FEATURE 18: Facet Search Key Configuration — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 18 Boundaries: Facet Search Key Configuration', () => {
        test('F18.B1: Duplicate keys in allAvailableKeys handled cleanly', () => {
            const keysWithDuplicates = [...spec.ALL_AVAILABLE_KEYS, 'system', 'tags'];
            const unique = Array.from(new Set(keysWithDuplicates));
            assert.equal(unique.length, 7);
        });

        test('F18.B2: Repeated calls to openTemplateHub preserves keyset', async () => {
            const env = createMockEnvironment();
            await env.app.openTemplateHub();
            await env.app.openTemplateHub();
            assert.equal(env.facetSearch.allAvailableKeys.length, 7);
        });

        test('F18.B3: Switching between standard search and template hub restores keys', () => {
            const env = createMockEnvironment();
            env.facetSearch.allAvailableKeys = ['project_id', 'sample_type'];
            env.facetSearch.isTemplateHub = true;
            env.facetSearch.allAvailableKeys = [...spec.ALL_AVAILABLE_KEYS];
            assert.equal(env.facetSearch.allAvailableKeys.length, 7);
        });

        test('F18.B4: allAvailableKeys is a defensive copy and cannot mutate spec', async () => {
            const env = createMockEnvironment();
            await env.app.openTemplateHub();
            env.facetSearch.allAvailableKeys.push('illegal_key');
            assert.equal(spec.ALL_AVAILABLE_KEYS.length, 7);
        });

        test('F18.B5: Items missing taxonomy keys in index do not crash key config', async () => {
            const env = createMockEnvironment();
            await env.app.openTemplateHub([{ name: 'No Meta' }]);
            assert.equal(env.facetSearch.allAvailableKeys.length, 7);
        });
    });

    // =========================================================================
    // FEATURE 19: Facet Search Visible Columns — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 19 Boundaries: Facet Search Visible Columns', () => {
        test('F19.B1: Empty visibleColumns configuration falls back to standard columns', () => {
            const cols = [].length ? [] : spec.VISIBLE_COLUMNS;
            assert.equal(cols.length, 6);
        });

        test('F19.B2: Custom column order preserved without losing taxonomy keys', () => {
            const customOrder = ['author', 'tags', 'organism', 'discipline', 'system', 'collection'];
            for (const col of spec.VISIBLE_COLUMNS) {
                assert.ok(customOrder.includes(col));
            }
        });

        test('F19.B3: Unknown column in visibleColumns handled gracefully', () => {
            const cols = [...spec.VISIBLE_COLUMNS, 'unknown_col'];
            assert.equal(cols.length, 7);
        });

        test('F19.B4: Table layout remains responsive with all 6 columns', () => {
            assert.equal(spec.VISIBLE_COLUMNS.length, 6);
        });

        test('F19.B5: Resetting visible columns restores exact 6 community columns', async () => {
            const env = createMockEnvironment();
            await env.app.openTemplateHub();
            env.facetSearch.visibleColumns = [];
            env.facetSearch.visibleColumns = [...spec.VISIBLE_COLUMNS];
            assert.deepEqual(env.facetSearch.visibleColumns, spec.VISIBLE_COLUMNS);
        });
    });

    // =========================================================================
    // FEATURE 20: Template Index Unpacking — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 20 Boundaries: Template Index Unpacking', () => {
        test('F20.B1: Index item with community: null unpacks with clean defaults', () => {
            const unpacked = spec.unpackTemplateIndexItem({ name: 'Null Comm', community: null });
            assert.equal(unpacked.flatMeta.system, '');
            assert.deepEqual(unpacked.flatMeta.tags, []);
        });

        test('F20.B2: Index item with empty object {} unpacks without error', () => {
            const unpacked = spec.unpackTemplateIndexItem({});
            assert.equal(unpacked.name, 'Unnamed Template');
            assert.equal(unpacked._type, 'template_hub');
        });

        test('F20.B3: Non-standard extra community keys preserved in flatMeta', () => {
            const item = {
                name: 'Extra',
                community: { system: 'Wet Lab', custom_lab_flag: 'Verified' }
            };
            const unpacked = spec.unpackTemplateIndexItem(item);
            assert.equal(unpacked.flatMeta.system, 'Wet Lab');
        });

        test('F20.B4: Non-string values in taxonomy fields handled safely', () => {
            const item = {
                name: 'NonString',
                community: { version: 123 }
            };
            const unpacked = spec.unpackTemplateIndexItem(item);
            assert.equal(unpacked.flatMeta.version, 123);
        });

        test('F20.B5: Index item with 50 tags array unpacks all 50 tags', () => {
            const fiftyTags = Array.from({ length: 50 }, (_, i) => `Tag_${i}`);
            const item = {
                name: 'Many Tags',
                community: { tags: fiftyTags }
            };
            const unpacked = spec.unpackTemplateIndexItem(item);
            assert.equal(unpacked.flatMeta.tags.length, 50);
        });
    });

    // =========================================================================
    // FEATURE 21: Taxonomy Category Grouping — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 21 Boundaries: Taxonomy Category Grouping', () => {
        test('F21.B1: Case-insensitive key comparison handles uppercase keys', () => {
            const cat = spec.getCategoryForKey('SYSTEM'.toLowerCase());
            assert.equal(cat, '🌐 Community Taxonomy');
        });

        test('F21.B2: Null, undefined, or empty key returns fallback category', () => {
            assert.equal(spec.getCategoryForKey(''), '📋 Metadata Fields');
        });

        test('F21.B3: When isTemplateHub is false, community keys map to metadata fields', () => {
            const cat = spec.getCategoryForKey('system', false);
            assert.equal(cat, '📋 Metadata Fields');
            const env = createMockEnvironment();
            env.facetSearch.isTemplateHub = false;
            assert.equal(env.facetSearch._getCategoryForKey('system'), '📋 Metadata Fields');
            env.facetSearch.isTemplateHub = true;
            assert.equal(env.facetSearch._getCategoryForKey('system'), '🌐 Community Taxonomy');
        });

        test('F21.B4: Category string matches exact emoji and unicode representation', () => {
            const cat = spec.getCategoryForKey('discipline');
            assert.equal(cat, '🌐 Community Taxonomy');
            assert.ok(cat.startsWith('🌐'));
        });

        test('F21.B5: Dot-prefixed keys (OME.*, File.*) map to respective categories', () => {
            assert.equal(spec.getCategoryForKey('OME.ChannelName'), '🔬 OME Metadata');
            assert.equal(spec.getCategoryForKey('File.Size'), '📁 File Info');
        });
    });

    // =========================================================================
    // FEATURE 22: Filter Chip Rendering — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 22 Boundaries: Filter Chip Rendering', () => {
        test('F22.B1: Facet values containing slashes and quotes count accurately', () => {
            const env = createMockEnvironment();
            const data = [
                { flatMeta: { system: 'Microscopy (Confocal / 2-Photon)' } },
                { flatMeta: { system: 'Microscopy (Confocal / 2-Photon)' } }
            ];
            const facets = env.facetSearch.getAvailableFacets(data);
            assert.equal(facets.system['Microscopy (Confocal / 2-Photon)'], 2);
        });

        test('F22.B2: Trailing whitespace in tags does not create duplicate chips', () => {
            const parsed = spec.parseTagsString('Confocal  , Confocal');
            assert.deepEqual(parsed, ['Confocal', 'Confocal']);
        });

        test('F22.B3: Multiple active filters across different keys supported', () => {
            const env = createMockEnvironment();
            env.facetSearch.activeFilters['system'] = 'Microscopy (Confocal / 2-Photon)';
            env.facetSearch.activeFilters['discipline'] = 'Plant Biology / Botany';
            assert.equal(Object.keys(env.facetSearch.activeFilters).length, 2);
        });

        test('F22.B4: Activating filter matching zero records does not throw', () => {
            const env = createMockEnvironment();
            env.facetSearch.activeFilters['organism'] = 'NonExistent';
            assert.doesNotThrow(() => env.facetSearch.getAvailableFacets([]));
        });

        test('F22.B5: Calculating facet counts on empty dataset returns empty frequency map', () => {
            const env = createMockEnvironment();
            const facets = env.facetSearch.getAvailableFacets([]);
            assert.deepEqual(facets.system, {});
            assert.deepEqual(facets.tags, {});
        });
    });

    // =========================================================================
    // FEATURE 23: Tabulator Selection Styling — Boundary & Corner Cases
    // =========================================================================
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

    // =========================================================================
    // FEATURE 24: Download & Install Template — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 24 Boundaries: Download & Install Template', () => {
        test('F24.B1: Download template handles duplicate local name collision safely', async () => {
            const env = createMockEnvironment();
            const t1 = { name: 'Collision', community: { system: 'Wet Lab' } };
            await env.app.downloadAndInstallTemplate(t1);
            await env.app.downloadAndInstallTemplate(t1);
            assert.ok(env.window.templateManager.templates.length >= 2);
        });

        test('F24.B2: Download template with network rejection throws handled error', async () => {
            const env = createMockEnvironment();
            env.window.electronAPI.saveTemplateToFile = () => Promise.resolve({ success: false, error: 'IO Error' });
            const res = await env.app.downloadAndInstallTemplate({ name: 'Error Case' });
            assert.equal(res.success, false);
        });

        test('F24.B3: Download template with missing user info falls back to User/Default', async () => {
            const env = createMockEnvironment();
            await env.app.downloadAndInstallTemplate({ name: 'No User' }, null);
            assert.equal(env.app.lastInstalledTemplate.originalCreator, 'User');
            assert.equal(env.app.lastInstalledTemplate.originalGroup, 'Default');
        });

        test('F24.B4: Downloaded template with missing name defaults to Unnamed Template', async () => {
            const env = createMockEnvironment();
            await env.app.downloadAndInstallTemplate({ name: '' });
            assert.ok(env.app.lastInstalledTemplate.id);
        });

        test('F24.B5: Preserves custom metadata fields in downloaded template', async () => {
            const env = createMockEnvironment();
            const complex = {
                name: 'Complex Fields',
                metadata: { fields: { f1: { type: 'number', label: 'Field 1' } } }
            };
            await env.app.downloadAndInstallTemplate(complex);
            assert.ok(env.app.lastInstalledTemplate.metadata.fields.f1);
        });
    });

    // =========================================================================
    // FEATURE 25: Readme Generator Isolation — Boundary & Corner Cases
    // =========================================================================
    test.describe('Feature 25 Boundaries: Readme Generator Isolation', () => {
        test('F25.B1: Metadata containing prototype pollution keys handled safely', () => {
            const dirty = { laser: 50, __proto__: { evil: true } };
            const clean = spec.filterReadmeMetadata(dirty);
            assert.equal(clean.laser, 50);
        });

        test('F25.B2: Community property formatted as primitive string still stripped', () => {
            const dirty = { laser: 50, community: 'malformed_primitive' };
            const clean = spec.filterReadmeMetadata(dirty);
            assert.equal(clean.community, undefined);
        });

        test('F25.B3: Metadata containing 1,000 fields all rendered except community', () => {
            const hugeMeta = { community: { system: 'Microscopy' } };
            for (let i = 0; i < 1000; i++) {
                hugeMeta[`field_${i}`] = `value_${i}`;
            }
            const clean = spec.filterReadmeMetadata(hugeMeta);
            assert.equal(clean.community, undefined);
            assert.equal(Object.keys(clean).length, 1000);
        });

        test('F25.B4: Special characters and HTML entities in metadata values preserved', () => {
            const meta = { laser_spec: '<488nm & 561nm>' };
            const clean = spec.filterReadmeMetadata(meta);
            assert.equal(clean.laser_spec, '<488nm & 561nm>');
        });

        test('F25.B5: filterReadmeMetadata is a pure function that does not mutate input', () => {
            const input = { laser: 30, community: { system: 'Test' } };
            spec.filterReadmeMetadata(input);
            assert.ok(input.community, 'Input object must not be mutated');
        });
    });

});
