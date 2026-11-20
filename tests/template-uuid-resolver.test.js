'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs').promises;
const path = require('node:path');
const vm = require('node:vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const templateUuid = require(path.join(ROOT_DIR, 'src', 'js', 'shared', 'templateUuid.js'));
const templateDefaultsFile = require(path.join(ROOT_DIR, 'src', 'js', 'main', 'templateDefaultsFile.js'));
const templateFileLoader = require(path.join(ROOT_DIR, 'src', 'js', 'main', 'templateFileLoader.js'));
const { CommunityManager } = require(path.join(ROOT_DIR, 'src', 'js', 'communityManager.js'));
const templateResolver = require(path.join(ROOT_DIR, 'src', 'js', 'templateResolver.js'));
const templateQrModal = require(path.join(ROOT_DIR, 'src', 'js', 'templateQrModal.js'));
const { UploadModal } = require(path.join(ROOT_DIR, 'src', 'js', 'uploadModal.js'));
const templateDefaultsStore = require(path.join(ROOT_DIR, 'src', 'js', 'templateDefaultsStore.js'));

const quietConsole = {
    log() {},
    info() {},
    warn() {},
    error() {},
    debug() {}
};

function createTempDir(prefix) {
    const dir = path.join(ROOT_DIR, 'temp_files', `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

test('templateUuid generates valid RFC 4122 v4 UUIDs and parses compact URIs / URLs', () => {
    const id1 = templateUuid.generateTemplateUuid();
    const id2 = templateUuid.generateTemplateUuid();
    assert.notEqual(id1, id2);
    assert.equal(templateUuid.isValidUuid(id1), true);
    assert.equal(templateUuid.normalizeUuid(`  ${id1.toUpperCase()}  `), id1);

    const uri = templateUuid.formatTemplateUri(id1);
    assert.equal(uri, `metafold:tpl:${id1}`);

    assert.deepEqual(templateUuid.parseTemplateCode(uri), {
        matched: true,
        uuid: id1,
        format: 'uri'
    });
    assert.deepEqual(templateUuid.parseTemplateCode(`MetaFold:TPL:${id1.toUpperCase()}`), {
        matched: true,
        uuid: id1,
        format: 'uri'
    });
    assert.deepEqual(templateUuid.parseTemplateCode(`metafold://template/${id1}`), {
        matched: true,
        uuid: id1,
        format: 'uri'
    });
    assert.deepEqual(templateUuid.parseTemplateCode(id1.toUpperCase()), {
        matched: true,
        uuid: id1,
        format: 'raw'
    });
    assert.deepEqual(templateUuid.parseTemplateCode(`https://pwa.example.org/?templateUuid=${id1}&src=qr`), {
        matched: true,
        uuid: id1,
        format: 'url'
    });
    assert.deepEqual(templateUuid.parseTemplateCode('not-a-uuid-or-search-term'), {
        matched: false,
        uuid: null,
        format: null
    });
});

test('templateDefaultsFile persists per-UUID defaults outside Templates/ and blocks traversal', async (t) => {
    const baseDir = createTempDir('defaults_file');
    t.after(async () => {
        await fsp.rm(baseDir, { recursive: true, force: true });
    });

    const initial = await templateDefaultsFile.loadUserTemplateDefaults(baseDir, 'Thomas');
    assert.deepEqual(initial.defaults, {});

    const sampleUuid = '550e8400-e29b-41d4-a716-446655440000';
    await templateDefaultsFile.upsertTemplateDefault(baseDir, 'Thomas', sampleUuid.toUpperCase(), {
        templateName: 'Confocal Standard',
        fields: { Operator: 'Thomas', Objective: '63x Oil' },
        projectDefaults: { targetPath: 'D:/Data/Microscopy', basePath: 'D:/Data/Microscopy', projectName: 'Exp_1' }
    });

    const loaded = await templateDefaultsFile.loadUserTemplateDefaults(baseDir, 'Thomas');
    assert.equal(loaded.schemaType, 'metafold-template-defaults');
    assert.equal(loaded.defaults[sampleUuid].fields.Operator, 'Thomas');
    assert.equal(loaded.defaults[sampleUuid].projectDefaults.targetPath, 'D:/Data/Microscopy');

    // Separate user has isolated store
    const otherUser = await templateDefaultsFile.loadUserTemplateDefaults(baseDir, 'Alice');
    assert.deepEqual(otherUser.defaults, {});

    // Delete works
    const delRes = await templateDefaultsFile.deleteTemplateDefault(baseDir, 'Thomas', sampleUuid);
    assert.equal(delRes.deleted, true);
    const afterDelete = await templateDefaultsFile.loadUserTemplateDefaults(baseDir, 'Thomas');
    assert.deepEqual(afterDelete.defaults, {});

    // Path traversal rejected
    await assert.rejects(
        () => templateDefaultsFile.saveUserTemplateDefaults(baseDir, '../evil', {}),
        /Invalid username/
    );

    // templateFileLoader skips template_defaults.json
    assert.equal(templateFileLoader.isTemplateJsonFilename('template_defaults.json'), false);
});

test('CommunityManager normalizes GitHub & generic URLs and enforces custom-first repo priority with token auth', async (t) => {
    const origWindow = global.window;
    const origFetch = global.fetch;
    t.after(() => {
        global.window = origWindow;
        global.fetch = origFetch;
    });

    const settingsStore = {
        'templates.repositories': '',
        'templates.repository_url': 'https://raw.githubusercontent.com/ThZobel/MetaFold-Templates/main/templates-index.json'
    };
    const tokenStore = { lab1: 'ghp_secret_lab_token_123' };

    global.window = {
        metafoldTemplateUuid: templateUuid,
        settingsManager: {
            settings: settingsStore,
            async set(k, v) { settingsStore[k] = v; return true; },
            async getTemplateRepoToken(id) { return tokenStore[id] || ''; },
            async setTemplateRepoToken(id, tok) { tokenStore[id] = tok; return true; }
        }
    };

    const cm = new CommunityManager();

    const ghWeb = cm.normalizeRepositoryUrl('https://github.com/MyLab/Lab-Templates');
    assert.equal(ghWeb.valid, true);
    assert.equal(ghWeb.kind, 'github');
    assert.equal(ghWeb.indexUrl, 'https://raw.githubusercontent.com/MyLab/Lab-Templates/main/templates-index.json');
    assert.equal(ghWeb.issuesUrl, 'https://github.com/MyLab/Lab-Templates/issues/new');

    const ghTree = cm.normalizeRepositoryUrl('https://github.com/MyLab/Lab-Templates.git/tree/dev/microscopy');
    assert.equal(ghTree.branch, 'dev');
    assert.equal(ghTree.indexUrl, 'https://raw.githubusercontent.com/MyLab/Lab-Templates/dev/microscopy/templates-index.json');
    assert.equal(ghTree.apiContentsBaseUrl, 'https://api.github.com/repos/MyLab/Lab-Templates/contents/microscopy');

    const generic = cm.normalizeRepositoryUrl('http://intranet.local:8080/metafold/templates');
    assert.equal(generic.valid, true);
    assert.equal(generic.kind, 'generic');
    assert.equal(generic.indexUrl, 'http://intranet.local:8080/metafold/templates/templates-index.json');
    assert.equal(generic.issuesUrl, null);

    // Save custom + failing repo + official repo and confirm tokens are NEVER leaked into settings
    await cm.saveRepositories([
        {
            id: 'lab1',
            name: 'Lab Private Repo',
            url: 'https://github.com/MyLab/Private-Templates',
            branch: 'main',
            enabled: true,
            isOfficial: false,
            token: 'SHOULD_BE_STRIPPED'
        },
        {
            id: 'broken_intranet',
            name: 'Offline Intranet Hub',
            url: 'http://offline.local/templates-index.json',
            enabled: true,
            isOfficial: false
        },
        {
            id: 'official',
            name: 'MetaFold Community',
            url: cm.DEFAULT_OFFICIAL_REPO_URL,
            branch: 'main',
            enabled: true,
            isOfficial: true
        }
    ]);

    assert.equal(settingsStore['templates.repositories'].includes('SHOULD_BE_STRIPPED'), false);

    const sharedUuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const seenRequests = [];

    global.window.electronAPI = {
        async fetchRepoJson(url, opts) {
            seenRequests.push({ url, headers: opts?.headers || {} });
            if (url.startsWith('https://api.github.com/repos/MyLab/Private-Templates/contents/templates-index.json')) {
                return {
                    success: true,
                    status: 200,
                    data: [{ uuid: sharedUuid, name: 'Lab Version', path: 'General/lab.json' }]
                };
            }
            if (url.startsWith('https://raw.githubusercontent.com/ThZobel/MetaFold-Templates/')) {
                return {
                    success: true,
                    status: 200,
                    data: [{ uuid: sharedUuid, name: 'Community Version', path: 'General/comm.json' }]
                };
            }
            return { success: false, status: 0, error: 'ECONNREFUSED' };
        }
    };

    const hit = await cm.findTemplateByUuid(sharedUuid, { allowRefresh: true });
    assert.equal(hit.item?.name, 'Lab Version');
    assert.equal(hit.repo?.id, 'lab1');
    assert.equal(cm.lastRepoStatuses.find(s => s.id === 'broken_intranet')?.ok, false);

    const authReq = seenRequests.find(r => r.url.includes('api.github.com/repos/MyLab/Private-Templates'));
    assert.ok(authReq, 'Expected private GitHub repo to use GitHub Contents API');
    assert.equal(authReq.headers.Authorization, 'Bearer ghp_secret_lab_token_123');
    assert.equal(authReq.headers.Accept, 'application/vnd.github.raw+json');
});

test('templateResolver performs offline-first lookup (local own -> group -> remote install preserving UUID)', async (t) => {
    const origWindow = global.window;
    t.after(() => {
        global.window = origWindow;
    });

    const ownUuid = '11111111-1111-4111-8111-111111111111';
    const groupUuid = '22222222-2222-4222-8222-222222222222';
    const remoteUuid = '33333333-3333-4333-8333-333333333333';

    let networkCalls = 0;
    let selectedTemplates = [];
    let installedTemplates = [];
    const notifications = [];

    const ownTpl = { id: 'own_1', uuid: ownUuid, name: 'Own Template', category: 'category1', isOwn: true, createdBy: 'Tom' };
    const groupTpl = { id: 'grp_1', uuid: groupUuid, name: 'Shared Group Template', category: 'category2', isOwn: false, isShared: true, createdBy: 'Jon' };

    const tm = {
        templates: [ownTpl],
        groupTemplates: [groupTpl],
        selectedIndex: -1,
        currentTemplate: null,
        searchState: { query: '', results: [], isSearching: false, showSharedTemplates: false },
        invalidateCache() {},
        getFilteredTemplates() {
            const cat = global.window.templateTypeManager.currentType;
            const list = [...this.templates, ...(this.searchState.showSharedTemplates ? this.groupTemplates : [])];
            return list.filter(t => (t.category || 'category1') === cat);
        },
        select(idx) {
            const list = this.getFilteredTemplates();
            this.selectedIndex = idx;
            this.currentTemplate = list[idx];
            selectedTemplates.push(this.currentTemplate);
        },
        async loadGroupTemplates() { return this.groupTemplates; }
    };

    global.window = {
        metafoldTemplateUuid: templateUuid,
        templateManager: tm,
        templateTypeManager: { currentType: 'category1', updateUI() {}, updateIntegrationVisibility() {} },
        settingsManager: { async set() {} },
        templateDefaultsStore: { isInitialized: true, async init() {}, getDefaults() { return null; } },
        app: {
            showSuccess(msg) { notifications.push({ type: 'success', msg }); },
            showError(msg) { notifications.push({ type: 'error', msg }); },
            async downloadAndInstallTemplate(tplObj) {
                const saved = { ...tplObj, id: 'tpl_installed', isOwn: true, createdBy: 'Tom' };
                tm.templates.push(saved);
                installedTemplates.push(saved);
                return { success: true, template: saved };
            }
        },
        appUtils: { showInfo(msg) { notifications.push({ type: 'info', msg }); } },
        communityManager: {
            async findTemplateByUuid(uuid) {
                networkCalls++;
                if (uuid === remoteUuid) {
                    return {
                        item: { uuid: remoteUuid, name: 'Remote Template', path: 'General/remote.json' },
                        repo: { id: 'custom1', name: 'Lab Repo', normalized: { rawBaseUrl: 'https://raw.example/repo' } },
                        statuses: [{ id: 'custom1', name: 'Lab Repo', ok: true, count: 1 }]
                    };
                }
                return { item: null, repo: null, statuses: [{ id: 'custom1', name: 'Lab Repo', ok: true, count: 1 }] };
            },
            async fetchTemplateJson(repoPath) {
                networkCalls++;
                assert.equal(repoPath, 'General/remote.json');
                return { name: 'Remote Template', category: 'category3', metadata: { fields: {} } };
            }
        }
    };

    // 1. Own local hit -> 0 network calls
    const res1 = await templateResolver.resolveAndOpen(`metafold:tpl:${ownUuid}`);
    assert.equal(res1.success, true);
    assert.equal(res1.source, 'local_own');
    assert.equal(networkCalls, 0);
    assert.equal(tm.currentTemplate?.name, 'Own Template');

    // 2. Shared group hit -> 0 network calls + enables shared templates + switches category
    const res2 = await templateResolver.resolveAndOpen(`metafold:tpl:${groupUuid}`);
    assert.equal(res2.success, true);
    assert.equal(res2.source, 'local_group');
    assert.equal(networkCalls, 0);
    assert.equal(tm.searchState.showSharedTemplates, true);
    assert.equal(tm.currentTemplate?.name, 'Shared Group Template');

    // 3. Remote repo hit -> downloads, preserves exact UUID, installs locally, and opens
    const res3 = await templateResolver.resolveAndOpen(`metafold:tpl:${remoteUuid}`);
    assert.equal(res3.success, true);
    assert.equal(res3.source, 'repository');
    assert.equal(networkCalls, 2);
    assert.equal(installedTemplates.length, 1);
    assert.equal(installedTemplates[0].uuid, remoteUuid);
    assert.equal(tm.currentTemplate?.name, 'Remote Template');

    // 4. Subsequent scan of remoteUuid is now a local offline hit (0 additional network calls!)
    const callsBefore = networkCalls;
    const res4 = await templateResolver.resolveAndOpen(remoteUuid);
    assert.equal(res4.success, true);
    assert.equal(res4.source, 'local_own');
    assert.equal(networkCalls, callsBefore);

    // 5. Missing remote UUID -> clean error
    const missing = await templateResolver.resolveAndOpen('44444444-4444-4444-8444-444444444444');
    assert.equal(missing.success, false);
    assert.equal(missing.reason, 'not_found');
});

test('templateQrModal generates valid offline SVG for both QR Code and DataMatrix payloads', () => {
    const uri = 'metafold:tpl:550e8400-e29b-41d4-a716-446655440000';
    const qrMatrix = templateQrModal.encodeMatrix(uri, 'qr');
    const qrSvg = templateQrModal.renderMatrixSvg(qrMatrix);
    assert.ok(qrSvg.startsWith('<svg '), 'QR output should be SVG');
    assert.ok(qrSvg.includes('<path d="M'), 'QR SVG should contain module path');

    const dmMatrix = templateQrModal.encodeMatrix(uri, 'datamatrix');
    const dmSvg = templateQrModal.renderMatrixSvg(dmMatrix);
    assert.ok(dmSvg.startsWith('<svg '), 'DataMatrix output should be SVG');
    assert.ok(dmSvg.includes('<path d="M'), 'DataMatrix SVG should contain module path');
});

test('UploadModal strips runtime id, preserves uuid, and respects custom target repo Issues URL', () => {
    const modal = new UploadModal();
    const tpl = {
        id: 'template_runtime_id',
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Confocal Demo',
        description: 'Test template',
        type: 'experiment',
        _fileInfo: { filePath: '/tmp/confocal.json' },
        savedLocally: true,
        metadata: { fields: {} }
    };

    const payload = modal.formatIssueBody(
        tpl,
        { category: 'Experiments', collection: 'General', tags: ['Confocal'], author: 'Thomas', license: 'CC-BY-4.0' },
        { repoIssuesUrl: 'https://github.com/MyLab/Custom-Templates/issues/new' }
    );

    assert.equal(payload.sanitizedTemplate.id, undefined);
    assert.equal(payload.sanitizedTemplate.uuid, '550e8400-e29b-41d4-a716-446655440000');
    assert.ok(payload.url.startsWith('https://github.com/MyLab/Custom-Templates/issues/new?'));
    assert.ok(payload.body.includes('550e8400-e29b-41d4-a716-446655440000'));
});

test('templateDefaultsStore saves and restores personal defaults by UUID via IPC/localStorage', async (t) => {
    const origWindow = global.window;
    const baseDir = createTempDir('defaults_store_ipc');
    t.after(async () => {
        global.window = origWindow;
        await fsp.rm(baseDir, { recursive: true, force: true });
    });

    global.window = {
        metafoldTemplateUuid: templateUuid,
        userManager: { currentUser: 'Tom', currentGroup: 'MIN' },
        electronAPI: {
            async loadTemplateDefaults(userInfo) {
                const doc = await templateDefaultsFile.loadUserTemplateDefaults(baseDir, userInfo.username);
                return { success: true, ...doc };
            },
            async saveTemplateDefaults(map, userInfo) {
                return await templateDefaultsFile.saveUserTemplateDefaults(baseDir, userInfo.username, map);
            }
        }
    };

    await templateDefaultsStore.init();
    const uid = '77777777-7777-4777-8777-777777777777';
    await templateDefaultsStore.saveDefaults(uid, {
        templateName: 'Shared Microscope',
        fields: { Operator: 'Tom', Laser: '488nm' },
        projectDefaults: { targetPath: 'D:/TomData', basePath: 'D:/TomData', projectName: 'MyRun' },
        integrations: { elabftw: { defaultCategory: '42', fetchNextId: true } }
    });

    // Re-init fresh store state from disk and verify restore
    templateDefaultsStore.defaultsByUuid = {};
    templateDefaultsStore.isInitialized = false;
    await templateDefaultsStore.init();

    const restored = templateDefaultsStore.getDefaults(uid.toUpperCase());
    assert.ok(restored);
    assert.equal(restored.fields.Operator, 'Tom');
    assert.equal(restored.projectDefaults.targetPath, 'D:/TomData');
    assert.equal(restored.integrations.elabftw.fetchNextId, true);

    await templateDefaultsStore.clearDefaults(uid);
    assert.equal(templateDefaultsStore.hasDefaults(uid), false);
});

test('templateQrModal generates valid Zebra ZPL II for 60mm @ 203 dpi (QR & DataMatrix, UTF-8 + escaping)', () => {
    const uid = '550e8400-e29b-41d4-a716-446655440000';
    const uri = `metafold:tpl:${uid}`;

    // Default 60x30 mm @ 203 dpi (8 dots/mm -> 480x240)
    const qrZpl = templateQrModal.generateZpl({
        uri,
        uuid: uid,
        name: 'Confocal ^Test~\\München',
        format: 'qr',
        includeLabel: true,
        preset: '60x30',
        dpi: 203
    });

    assert.ok(qrZpl.startsWith('^XA\n'));
    assert.ok(qrZpl.includes('^CI28'));
    assert.ok(qrZpl.includes('^PW480'));
    assert.ok(qrZpl.includes('^LL240'));
    assert.ok(qrZpl.includes(`^FDMA,${uri}^FS`));
    assert.ok(qrZpl.includes('^BQN,2,'));
    assert.ok(qrZpl.includes('Confocal \\5ETest\\7E\\5CMünchen'));
    assert.ok(qrZpl.includes('MetaFold · 550e8400'));
    assert.ok(qrZpl.trimEnd().endsWith('^XZ'));

    // DataMatrix mode @ 203 dpi
    const dmZpl = templateQrModal.generateZpl({
        uri,
        uuid: uid,
        name: 'Widefield',
        format: 'datamatrix',
        includeLabel: true,
        preset: '60x30',
        dpi: 203
    });
    assert.ok(dmZpl.includes(',200^FD' + uri + '^FS'));
    assert.ok(dmZpl.includes('^BXN,'));

    // includeLabel: false omits text fields and centers code
    const codeOnlyZpl = templateQrModal.generateZpl({
        uri,
        uuid: uid,
        name: 'ShouldNotAppear',
        format: 'qr',
        includeLabel: false,
        preset: '60x30',
        dpi: 203
    });
    assert.equal(codeOnlyZpl.includes('ShouldNotAppear'), false);
    assert.equal(codeOnlyZpl.includes('^A0N'), false);

    // 300 dpi scaling (12 dots/mm -> 720x360)
    const dpi300Zpl = templateQrModal.generateZpl({
        uri,
        uuid: uid,
        name: 'HiRes',
        format: 'datamatrix',
        includeLabel: true,
        preset: '60x30',
        dpi: 300
    });
    assert.ok(dpi300Zpl.includes('^PW720'));
    assert.ok(dpi300Zpl.includes('^LL360'));
});

test('templateUuid project helpers parse metafold:proj URIs and stay disjoint from template URIs', () => {
    const pid = templateUuid.generateTemplateUuid();
    const projUri = templateUuid.formatProjectUri(pid);
    assert.equal(projUri, `metafold:proj:${pid}`);

    assert.deepEqual(templateUuid.parseProjectCode(projUri), {
        matched: true,
        uuid: pid,
        format: 'uri'
    });
    assert.deepEqual(templateUuid.parseProjectCode(`MetaFold:Proj:${pid.toUpperCase()}`), {
        matched: true,
        uuid: pid,
        format: 'uri'
    });
    assert.deepEqual(templateUuid.parseProjectCode(`metafold://project/${pid}`), {
        matched: true,
        uuid: pid,
        format: 'uri'
    });
    assert.deepEqual(templateUuid.parseProjectCode(`https://pwa.example.org/?proj=${pid}`), {
        matched: true,
        uuid: pid,
        format: 'url'
    });
    assert.deepEqual(templateUuid.parseProjectCode(`https://pwa.example.org/?projectUuid=${pid.toUpperCase()}`), {
        matched: true,
        uuid: pid,
        format: 'url'
    });
    assert.deepEqual(templateUuid.parseProjectCode(pid.toUpperCase()), {
        matched: true,
        uuid: pid,
        format: 'raw'
    });

    // Strict prefix separation between templates and projects
    assert.deepEqual(templateUuid.parseProjectCode(`metafold:tpl:${pid}`), {
        matched: false,
        uuid: null,
        format: null
    });
    assert.deepEqual(templateUuid.parseTemplateCode(projUri), {
        matched: false,
        uuid: null,
        format: null
    });

    // extractProjectRefId strips URIs to canonical UUID while preserving non-UUID IDs/names
    assert.equal(templateUuid.extractProjectRefId(`  ${projUri}  `), pid);
    assert.equal(templateUuid.extractProjectRefId(`metafold://project/${pid.toUpperCase()}`), pid);
    assert.equal(templateUuid.extractProjectRefId(pid.toUpperCase()), pid);
    assert.equal(templateUuid.extractProjectRefId('  Sample_A-01  '), 'Sample_A-01');
});

test('templateQrModal openForProject configures project ZPL/QR mode and handles missing UUIDs cleanly', (t) => {
    const origWindow = global.window;
    const errors = [];
    t.after(() => {
        global.window = origWindow;
        templateQrModal._entityType = 'template';
        templateQrModal._entityName = '';
        templateQrModal._currentTemplate = null;
        templateQrModal._currentUuid = null;
        templateQrModal._currentUri = '';
        templateQrModal._isOpen = false;
    });

    global.window = {
        metafoldTemplateUuid: templateUuid,
        app: {
            showError(msg) { errors.push(msg); }
        }
    };

    const pid = '990e8400-e29b-41d4-a716-446655440099';
    templateQrModal.openForProject({
        name: '2026-11-20_HeLa_Control',
        metafold_project_id: pid.toUpperCase()
    });

    assert.equal(templateQrModal._entityType, 'project');
    assert.equal(templateQrModal._entityName, '2026-11-20_HeLa_Control');
    assert.equal(templateQrModal._currentUuid, pid);
    assert.equal(templateQrModal._currentUri, `metafold:proj:${pid}`);

    const qrZpl = templateQrModal.generateZpl({ format: 'qr', preset: '60x30', dpi: 203 });
    assert.ok(qrZpl.includes(`^FDMA,metafold:proj:${pid}^FS`));
    assert.ok(qrZpl.includes('2026-11-20_HeLa_Control'));
    assert.ok(qrZpl.includes('MetaFold · 990e8400'));

    const dmZpl = templateQrModal.generateZpl({ format: 'datamatrix', preset: '60x30', dpi: 203 });
    assert.ok(dmZpl.includes(`^BXN,`));
    assert.ok(dmZpl.includes(`,200^FDmetafold:proj:${pid}^FS`));

    // Missing/invalid UUID triggers showError without throwing
    templateQrModal.openForProject({ name: 'Legacy No UUID' });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /Project UUID/i);
});

test('README.html generator embeds offline inline QR SVG for projects with metafold_project_id and omits when absent', () => {
    const mainSrc = fs.readFileSync(path.join(ROOT_DIR, 'src', 'main.js'), 'utf8');
    const startIdx = mainSrc.indexOf('function renderProjectQrSvgForReadme(');
    const endIdx = mainSrc.indexOf('// Create metadata files - WITH PROJECT NAME IN FILENAMES');
    assert.ok(startIdx >= 0 && endIdx > startIdx, 'Expected renderProjectQrSvgForReadme and generateReadmeHtmlWithMetadata in src/main.js');

    const { createRequire } = require('node:module');
    const mainRequire = createRequire(path.join(ROOT_DIR, 'src', 'main.js'));
    const metafoldSchema = mainRequire('./js/shared/schemaVersion.js');
    const markdownLite = mainRequire('./js/shared/markdownLite.js');

    const sandbox = {
        require: mainRequire,
        metafoldTemplateUuid: templateUuid,
        metafoldSchema,
        markdownLite,
        console: quietConsole,
        resultFn: null
    };
    const snippet = mainSrc.slice(startIdx, endIdx) + '\nresultFn = generateReadmeHtmlWithMetadata;';
    vm.runInNewContext(snippet, sandbox);
    assert.equal(typeof sandbox.resultFn, 'function');

    const pid = '550e8400-e29b-41d4-a716-446655440000';
    const htmlWithQr = sandbox.resultFn(
        {
            metafold_project_id: pid,
            Sample_Name: { label: 'Sample Name', type: 'text', value: 'HeLa-01' }
        },
        '2026-11-20_HeLa_01'
    );
    assert.ok(htmlWithQr.includes('class="header header-has-qr"'), 'Header should include QR layout class');
    assert.ok(htmlWithQr.includes('class="header-qr-card"'), 'Header should embed QR card');
    assert.ok(htmlWithQr.includes('<svg xmlns="http://www.w3.org/2000/svg"'), 'Header should contain inline offline SVG');
    assert.ok(htmlWithQr.includes(`metafold:proj:${pid}`), 'QR card tooltip should carry metafold:proj URI');
    assert.ok(htmlWithQr.includes(`🆔 ${pid}`), 'Header should show Project UUID pill');

    const htmlWithoutQr = sandbox.resultFn(
        {
            Sample_Name: { label: 'Sample Name', type: 'text', value: 'Legacy' }
        },
        'Legacy_Project'
    );
    assert.equal(htmlWithoutQr.includes('class="header-qr-card"'), false, 'Should omit QR card cleanly when project UUID is absent');
    assert.equal(htmlWithoutQr.includes('<header class="header">'), true, 'Should preserve standard centered header fallback');
});
