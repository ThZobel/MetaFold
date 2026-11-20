/**
 * MetaFold Schema v0.1 Contract & Backward-Compatibility Test Suite
 *
 * Zero-dependency Node.js test runner that verifies:
 * 1. All JSON Schema files in docs/schema/v0.1/ are valid JSON and Draft 2020-12 compliant.
 * 2. All v0.1 and v0.0-legacy fixtures satisfy the schema contract rules.
 * 3. Shared helper (src/js/shared/schemaVersion.js) properly detects v0.1 vs. v0.0-legacy,
 *    identifies reserved envelope keys vs. user experiment fields, and builds template references.
 * 4. All modified JS source files pass Node syntax checking.
 *
 * Run with: node tests/schema-contract.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCHEMA_DIR = path.join(ROOT_DIR, 'docs', 'schema', 'v0.1');
const metafoldSchema = require('../src/js/shared/schemaVersion.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     ${err.message}`);
        failed++;
    }
}

console.log('\n🔬 Running MetaFold Schema v0.1 Contract Tests...\n');

// ---------------------------------------------------------------------------
// 1. JSON Schema Files Validation
// ---------------------------------------------------------------------------
const expectedSchemas = [
    'project-metadata.schema.json',
    'sidecar.schema.json',
    'template.schema.json',
    'user-index.schema.json',
    'profiles.schema.json',
    'exports.schema.json'
];

for (const filename of expectedSchemas) {
    test(`Schema file exists and is valid Draft 2020-12 JSON: ${filename}`, () => {
        const fullPath = path.join(SCHEMA_DIR, filename);
        assert.ok(fs.existsSync(fullPath), `Missing schema file: ${fullPath}`);
        const raw = fs.readFileSync(fullPath, 'utf8');
        const parsed = JSON.parse(raw);
        assert.strictEqual(
            parsed.$schema,
            'https://json-schema.org/draft/2020-12/schema',
            `Expected Draft 2020-12 $schema in ${filename}`
        );
        assert.ok(parsed.$id && parsed.$id.includes('/schema/v0.1/'), `Missing or invalid $id in ${filename}`);
        assert.ok(parsed.title, `Missing title in ${filename}`);
    });
}

// ---------------------------------------------------------------------------
// 2. Shared Helper (schemaVersion.js) Contract
// ---------------------------------------------------------------------------
test('schemaVersion helper constants and version detection', () => {
    assert.strictEqual(metafoldSchema.SCHEMA_VERSION, '0.1');
    assert.strictEqual(metafoldSchema.LEGACY_SCHEMA_VERSION, '0.0');

    // Legacy documents without schemaVersion -> "0.0"
    assert.strictEqual(metafoldSchema.getSchemaVersion({}), '0.0');
    assert.strictEqual(metafoldSchema.getSchemaVersion(null), '0.0');
    assert.strictEqual(metafoldSchema.getSchemaVersion({ projectName: 'Test' }), '0.0');

    // v0.1 documents -> "0.1"
    assert.strictEqual(metafoldSchema.getSchemaVersion({ schemaVersion: '0.1' }), '0.1');
    assert.strictEqual(
        metafoldSchema.getSchemaVersion({ metadata: { extra_fields: { schemaVersion: '0.1' } } }),
        '0.1'
    );
});

test('schemaVersion.isReservedProjectKey separates envelope keys from user experiment fields', () => {
    const reserved = [
        'schemaVersion',
        'schemaType',
        'metafold_project_id',
        'projectName',
        'created_at',
        'updated_at',
        'previous_names',
        'template',
        'templateInfo',
        'provenance',
        'metafold_integration',
        'integrations',
        'notes_markdown',
        'notes_log',
        'hypothesis_or_goal',
        'changelog',
        'System.ProjectAbsolutePath',
        'System.UpdateHistory',
        '_metafold'
    ];
    for (const key of reserved) {
        assert.strictEqual(
            metafoldSchema.isReservedProjectKey(key),
            true,
            `Expected "${key}" to be recognized as a reserved envelope key`
        );
    }

    const userFields = ['Sample_ID', 'Laser_Wavelength', 'Objective', 'Acquisition_Settings', 'derived_from'];
    for (const key of userFields) {
        assert.strictEqual(
            metafoldSchema.isReservedProjectKey(key),
            false,
            `Expected "${key}" to be treated as a user experiment field`
        );
    }
});

test('schemaVersion.buildTemplateRef builds human-readable template block without hash', () => {
    const ref = metafoldSchema.buildTemplateRef({
        id: 'template_1710000000_abc123',
        name: 'Confocal Microscopy',
        category: 'category1'
    });
    assert.deepStrictEqual(ref, {
        id: 'template_1710000000_abc123',
        name: 'Confocal Microscopy',
        category: 'category1'
    });
    assert.strictEqual('hash' in ref, false, 'Template reference must not require a hash');

    const refWithUuid = metafoldSchema.buildTemplateRef({
        id: 'template_1710000000_abc123',
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        derivedFromTemplateUuid: '11111111-1111-4111-8111-111111111111',
        name: 'Confocal Microscopy',
        category: 'category1'
    });
    assert.strictEqual(refWithUuid.uuid, '550e8400-e29b-41d4-a716-446655440000');
    assert.strictEqual(refWithUuid.derivedFromTemplateUuid, '11111111-1111-4111-8111-111111111111');
});

// ---------------------------------------------------------------------------
// 3. Fixture Validation (v0.1 & v0.0-legacy)
// ---------------------------------------------------------------------------
test('v0.1 project-metadata fixture satisfies envelope and self-describing field contract', () => {
    const fixturePath = path.join(SCHEMA_DIR, 'fixtures', 'v0.1', 'project-metadata.example.json');
    const doc = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    assert.strictEqual(metafoldSchema.getSchemaVersion(doc), '0.1');
    assert.strictEqual(doc.schemaType, metafoldSchema.SCHEMA_TYPES.PROJECT_METADATA);
    assert.ok(doc.metafold_project_id, 'Missing metafold_project_id');
    assert.ok(doc.projectName, 'Missing projectName');
    assert.ok(doc.created_at, 'Missing created_at');
    assert.ok(doc.updated_at, 'Missing updated_at');
    assert.ok(doc.template && doc.template.name, 'Missing template reference block');

    // Verify user fields (including nested groups) are self-describing and ontology term is supported
    assert.ok(doc.Microscopy && doc.Microscopy.Excitation_Wavelength, 'Missing nested Microscopy.Excitation_Wavelength');
    const wav = doc.Microscopy.Excitation_Wavelength;
    assert.strictEqual(wav.type, 'number');
    assert.strictEqual(wav.unit, 'nm');
    assert.ok(wav.term && wav.term.uri, 'Missing ontology term on Microscopy.Excitation_Wavelength');
    assert.strictEqual(doc.Microscopy.Quality_Rating.type, 'rating');
    assert.strictEqual(doc.Microscopy.Quality_Rating.value, 5);
});

test('v0.0-legacy project-metadata fixture is recognized as 0.0 and remains readable', () => {
    const fixturePath = path.join(SCHEMA_DIR, 'fixtures', 'v0.0-legacy', 'project-metadata.legacy.json');
    const doc = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    assert.strictEqual(metafoldSchema.getSchemaVersion(doc), '0.0');
    assert.strictEqual(doc.projectName, '2025-10-01_Legacy_Experiment');

    const userFieldKeys = Object.keys(doc).filter(k => !metafoldSchema.isReservedProjectKey(k));
    assert.deepStrictEqual(userFieldKeys, ['Organism']);
});

test('v0.1 sidecar, template, and user-index fixtures satisfy envelope contract', () => {
    const sidecar = JSON.parse(
        fs.readFileSync(path.join(SCHEMA_DIR, 'fixtures', 'v0.1', 'sidecar.example.json'), 'utf8')
    );
    assert.strictEqual(metafoldSchema.getSchemaVersion(sidecar), '0.1');
    assert.strictEqual(sidecar.schemaType, metafoldSchema.SCHEMA_TYPES.SIDECAR);
    assert.strictEqual(sidecar.metafold_version, '0.1');

    const template = JSON.parse(
        fs.readFileSync(path.join(SCHEMA_DIR, 'fixtures', 'v0.1', 'template.example.json'), 'utf8')
    );
    assert.strictEqual(metafoldSchema.getSchemaVersion(template), '0.1');
    assert.strictEqual(template.schemaType, metafoldSchema.SCHEMA_TYPES.TEMPLATE);
    assert.ok(template.id && template.name && template.metadata);

    const userIndex = JSON.parse(
        fs.readFileSync(path.join(SCHEMA_DIR, 'fixtures', 'v0.1', 'user-index.example.json'), 'utf8')
    );
    assert.strictEqual(metafoldSchema.getSchemaVersion(userIndex), '0.1');
    assert.strictEqual(userIndex.schemaType, metafoldSchema.SCHEMA_TYPES.USER_INDEX);
    assert.strictEqual(userIndex.version, '0.1');
    assert.ok(Array.isArray(userIndex.projects));
});

// ---------------------------------------------------------------------------
// 4. Syntax Validation of Modified JS Files
// ---------------------------------------------------------------------------
const modifiedJsFiles = [
    'src/js/shared/schemaVersion.js',
    'src/js/shared/templateUuid.js',
    'src/main.js',
    'src/preload.js',
    'src/js/main/projectMetadataStore.js',
    'src/js/main/templateFileLoader.js',
    'src/js/main/templateDefaultsFile.js',
    'src/js/storage.js',
    'src/js/settingsManager.js',
    'src/js/communityManager.js',
    'src/js/templateDefaultsStore.js',
    'src/js/templateResolver.js',
    'src/js/templateQrModal.js',
    'src/js/templateRepositoriesSettings.js',
    'src/js/experimentForm.js',
    'src/js/projectManager.js',
    'src/js/fileScanner.js',
    'src/js/profileManager.js',
    'src/js/templateManager.js',
    'src/js/templateModal.js',
    'src/js/enhancedActions.js',
    'src/js/uploadModal.js',
    'src/js/tabFooterControl.js',
    'src/js/app.js',
    'src/js/projectScanner.js',
    'src/js/visualizationManager.js',
    'src/js/facetSearch.js',
    'src/js/projectInlineEditor.js',
    'src/js/globalHandlers.js',
    'src/js/roCrateManager.js',
    'src/js/omero/metaFoldOMEROIntegration.js',
    'src/js/omero/omeroAnnotations.js'
];

for (const relPath of modifiedJsFiles) {
    test(`JS syntax check passes: ${relPath}`, () => {
        const fullPath = path.join(ROOT_DIR, relPath);
        execFileSync(process.execPath, ['--check', fullPath], { stdio: 'pipe' });
    });
}

console.log(`\n📊 Result: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
    process.exit(1);
}
