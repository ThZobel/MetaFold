'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs').promises;
const path = require('node:path');
const vm = require('node:vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const templateFileLoader = require(path.join(ROOT_DIR, 'src', 'js', 'main', 'templateFileLoader.js'));

function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function createMockLocalStorage() {
    const store = new Map();
    return {
        get length() {
            return store.size;
        },
        key(index) {
            return Array.from(store.keys())[index] ?? null;
        },
        getItem(k) {
            return store.has(k) ? store.get(k) : null;
        },
        setItem(k, v) {
            store.set(k, String(v));
        },
        removeItem(k) {
            store.delete(k);
        },
        clear() {
            store.clear();
        }
    };
}

function createMockDOM() {
    const elements = new Map();

    function makeEl(id, tagName = 'div', props = {}) {
        let _text = props.textContent || '';
        let _innerHtml = props.innerHTML || '';
        const el = {
            id,
            tagName: tagName.toUpperCase(),
            value: props.value !== undefined ? props.value : '',
            checked: props.checked !== undefined ? Boolean(props.checked) : false,
            disabled: Boolean(props.disabled),
            title: props.title || '',
            className: props.className || '',
            style: { display: props.display || 'block', ...(props.style || {}) },
            classList: {
                _set: new Set(props.classes || []),
                add(...cls) { cls.forEach(c => this._set.add(c)); },
                remove(...cls) { cls.forEach(c => this._set.delete(c)); },
                contains(c) { return this._set.has(c); },
                toggle(c, force) {
                    if (force === undefined) {
                        if (this._set.has(c)) { this._set.delete(c); return false; }
                        this._set.add(c); return true;
                    }
                    if (force) this._set.add(c); else this._set.delete(c);
                    return Boolean(force);
                }
            },
            get textContent() { return _text; },
            set textContent(v) {
                _text = String(v ?? '');
                _innerHtml = escapeHtml(_text);
            },
            get innerHTML() { return _innerHtml; },
            set innerHTML(v) { _innerHtml = String(v ?? ''); },
            options: [],
            listeners: {},
            addEventListener(ev, fn) {
                if (!this.listeners[ev]) this.listeners[ev] = [];
                this.listeners[ev].push(fn);
            },
            removeEventListener(ev, fn) {
                if (!this.listeners[ev]) return;
                this.listeners[ev] = this.listeners[ev].filter(f => f !== fn);
            },
            dispatchEvent() {},
            querySelector() { return null; },
            querySelectorAll() { return []; },
            appendChild() {},
            insertBefore() {},
            closest() { return null; }
        };
        if (id) elements.set(id, el);
        return el;
    }

    makeEl('showSharedTemplates', 'input', { checked: true });
    makeEl('sharedTemplatesToggle', 'div', { display: 'none' });
    makeEl('templateSearchInput', 'input', { value: '' });
    makeEl('searchSuggestions', 'div', { display: 'none' });
    makeEl('searchStatus', 'div', { display: 'none' });
    makeEl('templateList', 'div');
    makeEl('templateInfo', 'div');
    makeEl('rsProjectDates', 'div', { display: 'none' });
    makeEl('templateDetails', 'div', { display: 'none' });
    makeEl('templatePlaceholder', 'div', { display: 'block' });
    makeEl('folderPreview', 'div');
    makeEl('experimentForm', 'div', { display: 'none' });
    makeEl('createTabContent', 'div', { classes: ['active'] });
    makeEl('baseDirectorySection', 'div');
    makeEl('multiFolderSection', 'div', { display: 'none' });
    makeEl('projectNameSection', 'div');
    makeEl('createProjectBtn', 'button');
    makeEl('onlyIntegrationsContainer', 'div');
    makeEl('targetPath', 'input', { value: '' });
    makeEl('projectName', 'input', { value: '' });
    makeEl('editTemplateBtn', 'button', { disabled: false });
    makeEl('templatesContainer', 'div');

    return {
        elements,
        document: {
            body: makeEl('body', 'body'),
            getElementById(id) {
                return elements.get(id) || null;
            },
            querySelector(selector) {
                if (selector.includes('editCurrentTemplate')) {
                    return elements.get('editTemplateBtn') || null;
                }
                if (selector.includes('deleteCurrentTemplate')) {
                    return null;
                }
                if (selector.startsWith('#')) {
                    return elements.get(selector.slice(1)) || null;
                }
                return null;
            },
            querySelectorAll() {
                return [];
            },
            createElement(tag) {
                return makeEl(null, tag);
            }
        }
    };
}

function createRendererRuntime(baseTemplatesDir, initialUser = { username: 'Tom', groupname: 'MIN' }) {
    const localStorage = createMockLocalStorage();
    const { document, elements } = createMockDOM();
    const userSettings = new Map();
    const savedCalls = [];

    const profiles = {
        groups: [
            { id: 'grp_min', name: 'MIN' },
            { id: 'grp_bio', name: 'BioImaging' }
        ],
        users: [
            { id: 'usr_tom', username: 'Tom', groupIds: ['grp_min'], primaryGroupId: 'grp_min' },
            { id: 'usr_jon', username: 'Jon', groupIds: ['grp_min'], primaryGroupId: 'grp_min' },
            { id: 'usr_thomas', username: 'Thomas', groupIds: ['grp_min', 'grp_bio'], primaryGroupId: 'grp_min' }
        ]
    };

    const quietConsole = {
        log() {},
        info() {},
        warn() {},
        error() {}
    };

    const windowObj = {
        localStorage,
        document,
        setTimeout,
        clearTimeout,
        console: quietConsole,
        performance: { now: () => Date.now() },
        Event: class Event { constructor(name) { this.type = name; } },
        CustomEvent: class CustomEvent { constructor(name, init) { this.type = name; this.detail = init?.detail; } },
        dispatchEvent() {},
        utils: {
            cleanTemplateForStorage(template) {
                const clean = { ...template };
                delete clean.isOwn;
                delete clean.isShared;
                delete clean.originalIndex;
                delete clean.userDisplayName;
                delete clean.groupDisplayName;
                return clean;
            }
        },
        profileManager: {
            isInitialized: true,
            getUserByUsername(username) {
                return profiles.users.find(u => u.username === username) || null;
            },
            getGroupById(gid) {
                return profiles.groups.find(g => g.id === gid) || null;
            },
            getUserPrimaryGroupName(username) {
                const u = this.getUserByUsername(username);
                if (!u || !u.primaryGroupId) return 'Default';
                const g = this.getGroupById(u.primaryGroupId);
                return g ? g.name : 'Default';
            }
        },
        userManager: {
            currentUser: initialUser.username,
            currentGroup: initialUser.groupname,
            isInitialized: true,
            isEnabled() {
                return true;
            }
        },
        settingsManager: {
            settings: {
                'general.user_management_enabled': true,
                'general.show_shared_templates': true,
                'templates.active_category': 'category1'
            },
            async get(key) {
                const userKey = `${windowObj.userManager.currentUser}:${key}`;
                if (userSettings.has(userKey)) return userSettings.get(userKey);
                if (key === 'general.show_shared_templates') return true;
                return this.settings[key];
            },
            async set(key, value) {
                const userKey = `${windowObj.userManager.currentUser}:${key}`;
                userSettings.set(userKey, value);
                this.settings[key] = value;
                return true;
            }
        },
        templateTypeManager: {
            currentType: 'category1',
            getCategoryConfig(catId) {
                return { id: catId, name: catId, icon: '🎯', color: '#8b5cf6' };
            },
            updateUI() {},
            updateIntegrationVisibility() {}
        },
        experimentForm: {
            resetFormForNewTemplate() {},
            render() {}
        },
        app: {
            successes: [],
            errors: [],
            showSuccess(msg) { this.successes.push(msg); },
            showError(msg) { this.errors.push(msg); }
        },
        electronAPI: {
            async getTemplatesDirectory(userInfo) {
                const grp = userInfo?.groupname && userInfo.groupname !== 'Default' ? userInfo.groupname : '';
                const usr = userInfo?.username && userInfo.username !== 'User' ? userInfo.username : '';
                const dir = path.join(baseTemplatesDir, grp, usr);
                await fsp.mkdir(dir, { recursive: true });
                return { success: true, directory: dir };
            },
            async loadAllTemplates(userInfo) {
                const grp = userInfo?.groupname && userInfo.groupname !== 'Default' ? userInfo.groupname : '';
                const usr = userInfo?.username && userInfo.username !== 'User' ? userInfo.username : '';
                const userDir = path.join(baseTemplatesDir, grp, usr);
                try {
                    const entries = await fsp.readdir(userDir, { withFileTypes: true });
                    const loaded = [];
                    for (const e of entries) {
                        if (!e.isFile() || !templateFileLoader.isTemplateJsonFilename(e.name)) continue;
                        const tpl = await templateFileLoader.parseTemplateFile({
                            filePath: path.join(userDir, e.name),
                            filename: e.name,
                            directory: userDir,
                            ownerUser: usr,
                            ownerGroup: grp,
                            isGroupTemplate: false
                        });
                        if (tpl) loaded.push(tpl);
                    }
                    return { success: true, templates: loaded, directory: userDir };
                } catch (_) {
                    return { success: true, templates: [], directory: userDir };
                }
            },
            async loadGroupTemplates(groupName, userInfo) {
                return await templateFileLoader.loadGroupTemplatesFromBaseDir(baseTemplatesDir, groupName, userInfo);
            },
            async saveTemplateToFile(template, userInfo) {
                const grp = userInfo?.groupname && userInfo.groupname !== 'Default' ? userInfo.groupname : '';
                const usr = userInfo?.username && userInfo.username !== 'User' ? userInfo.username : '';
                const userDir = path.join(baseTemplatesDir, grp, usr);
                await fsp.mkdir(userDir, { recursive: true });
                const filename = template._fileInfo?.filename ||
                    `${String(template.name || 'template').replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_').toLowerCase()}.json`;
                const filePath = path.join(userDir, filename);
                await fsp.writeFile(filePath, JSON.stringify(template, null, 2), 'utf8');
                savedCalls.push({ filePath, template });
                return {
                    success: true,
                    filePath,
                    filename,
                    directory: userDir,
                    savedAt: new Date().toISOString()
                };
            }
        }
    };

    windowObj.window = windowObj;
    const context = vm.createContext({
        window: windowObj,
        document,
        localStorage,
        console: quietConsole,
        setTimeout,
        clearTimeout,
        performance: windowObj.performance,
        Event: windowObj.Event,
        CustomEvent: windowObj.CustomEvent,
        process: { env: {}, platform: process.platform }
    });

    for (const rel of ['src/js/storage.js', 'src/js/templateManager.js', 'src/js/loginModal.js']) {
        const code = fs.readFileSync(path.join(ROOT_DIR, rel), 'utf8');
        vm.runInContext(code, context, { filename: rel });
    }

    return { window: windowObj, elements, localStorage, userSettings, savedCalls, profiles };
}

test('Suite 1: templateFileLoader filesystem group template discovery', async (t) => {
    const tempBase = path.join(ROOT_DIR, 'temp_files', `shared_templates_test_${process.pid}`);
    await fsp.rm(tempBase, { recursive: true, force: true });

    t.after(async () => {
        await fsp.rm(tempBase, { recursive: true, force: true });
    });

    const minDir = path.join(tempBase, 'MIN');
    const jonDir = path.join(minDir, 'Jon');
    const thomasDir = path.join(minDir, 'Thomas');
    const tomDir = path.join(minDir, 'Tom');
    const layoutsDir = path.join(minDir, 'layouts');
    const bioDir = path.join(tempBase, 'BioImaging', 'Alice');

    await Promise.all([
        fsp.mkdir(jonDir, { recursive: true }),
        fsp.mkdir(thomasDir, { recursive: true }),
        fsp.mkdir(tomDir, { recursive: true }),
        fsp.mkdir(layoutsDir, { recursive: true }),
        fsp.mkdir(bioDir, { recursive: true })
    ]);

    await fsp.writeFile(path.join(jonDir, 'all_fields_template.json'), JSON.stringify({
        name: 'All Fields Template',
        type: 'experiment',
        category: 'category1',
        createdBy: 'Admin',
        createdByGroup: 'System',
        metadata: { fields: { sample: { type: 'text', label: 'Sample' } } }
    }), 'utf8');

    await fsp.writeFile(path.join(jonDir, 'retrospective_copy.json'), JSON.stringify({
        name: 'Retrospective Copy',
        type: 'experiment',
        category: 'category4',
        createdBy: 'Jon',
        createdByGroup: 'MIN',
        metadata: { fields: { note: { type: 'text', label: 'Note' } } }
    }), 'utf8');

    await fsp.writeFile(path.join(thomasDir, 'test_template.json'), JSON.stringify({
        name: 'Test Template',
        type: 'folders',
        category: 'category1',
        structure: 'raw/',
        createdBy: 'Thomas',
        createdByGroup: 'MIN'
    }), 'utf8');

    await fsp.writeFile(path.join(tomDir, 'tom_own.json'), JSON.stringify({
        name: 'Tom Own',
        type: 'folders',
        category: 'category1',
        structure: 'tom/',
        createdBy: 'Tom',
        createdByGroup: 'MIN'
    }), 'utf8');

    await fsp.writeFile(path.join(minDir, 'group_wide.json'), JSON.stringify({
        name: 'Group Wide',
        type: 'folders',
        category: 'category1',
        structure: 'shared/',
        createdBy: 'LabLead',
        createdByGroup: 'MIN'
    }), 'utf8');

    // System & non-template files that MUST be ignored
    await fsp.writeFile(path.join(jonDir, 'user_index.json'), JSON.stringify({ projects: [] }), 'utf8');
    await fsp.writeFile(path.join(jonDir, 'id_dictionary_jon.json'), JSON.stringify({ ids: [] }), 'utf8');
    await fsp.writeFile(path.join(jonDir, 'project_meta.json'), JSON.stringify({
        schemaType: 'metafold-project-metadata',
        name: 'Not A Template'
    }), 'utf8');
    await fsp.writeFile(path.join(minDir, 'users.json'), JSON.stringify({ users: [] }), 'utf8');
    await fsp.writeFile(path.join(minDir, 'groups.json'), JSON.stringify({ groups: [] }), 'utf8');
    await fsp.writeFile(path.join(layoutsDir, 'layout1.json'), JSON.stringify({ name: 'Layout' }), 'utf8');

    await fsp.writeFile(path.join(bioDir, 'confocal_bio.json'), JSON.stringify({
        name: 'Confocal Bio',
        type: 'experiment',
        category: 'category1',
        createdBy: 'Alice',
        createdByGroup: 'BioImaging',
        metadata: { fields: { laser: { type: 'text', label: 'Laser' } } }
    }), 'utf8');

    await t.test('Tom loads Jon, Thomas, and group-root templates while skipping system files and layouts', async () => {
        const res = await templateFileLoader.loadGroupTemplatesFromBaseDir(tempBase, 'MIN', {
            username: 'Tom',
            groupname: 'MIN'
        });
        assert.equal(res.success, true);
        assert.equal(res.errorCount, 0);
        assert.equal(res.loadedCount, 4);

        const names = res.templates.map(tpl => tpl.name).sort();
        assert.deepEqual(names, ['All Fields Template', 'Group Wide', 'Retrospective Copy', 'Test Template']);

        const allFields = res.templates.find(tpl => tpl.name === 'All Fields Template');
        assert.equal(allFields.createdBy, 'Jon', 'folder owner should be used when file carries stale original creator');
        assert.equal(allFields.createdByGroup, 'MIN');
        assert.equal(allFields._fileInfo.isGroupTemplate, true);
        assert.equal(allFields._fileInfo.ownerUser, 'Jon');
        assert.equal(allFields._fileInfo.ownerGroup, 'MIN');
    });

    await t.test('Thomas excludes own directory case-insensitively and sees Jon, Tom, and group-root templates', async () => {
        const res = await templateFileLoader.loadGroupTemplatesFromBaseDir(tempBase, 'MIN', {
            username: 'thomas',
            groupname: 'MIN'
        });
        assert.equal(res.success, true);
        const names = res.templates.map(tpl => tpl.name).sort();
        assert.deepEqual(names, ['All Fields Template', 'Group Wide', 'Retrospective Copy', 'Tom Own']);
    });

    await t.test('Invalid/traversal group names are rejected and nonexistent groups return empty cleanly', async () => {
        const bad1 = await templateFileLoader.loadGroupTemplatesFromBaseDir(tempBase, '../System', { username: 'Tom' });
        assert.equal(bad1.success, false);
        assert.equal(bad1.loadedCount, 0);

        const bad2 = await templateFileLoader.loadGroupTemplatesFromBaseDir(tempBase, 'foo/bar', { username: 'Tom' });
        assert.equal(bad2.success, false);
        assert.equal(bad2.loadedCount, 0);

        const missing = await templateFileLoader.loadGroupTemplatesFromBaseDir(tempBase, 'DoesNotExist', { username: 'Tom' });
        assert.equal(missing.success, true);
        assert.equal(missing.loadedCount, 0);
        assert.deepEqual(missing.templates, []);
    });
});

test('Suite 2: storage.js + templateManager.js + loginModal.js integration', async (t) => {
    const tempBase = path.join(ROOT_DIR, 'temp_files', `shared_templates_vm_${process.pid}`);
    await fsp.rm(tempBase, { recursive: true, force: true });

    t.after(async () => {
        await fsp.rm(tempBase, { recursive: true, force: true });
    });

    const minDir = path.join(tempBase, 'MIN');
    const bioDir = path.join(tempBase, 'BioImaging');
    await Promise.all([
        fsp.mkdir(path.join(minDir, 'Tom'), { recursive: true }),
        fsp.mkdir(path.join(minDir, 'Jon'), { recursive: true }),
        fsp.mkdir(path.join(minDir, 'Thomas'), { recursive: true }),
        fsp.mkdir(path.join(bioDir, 'Alice'), { recursive: true })
    ]);

    await fsp.writeFile(path.join(minDir, 'Tom', 'tom_local.json'), JSON.stringify({
        id: 'tpl_tom_1',
        name: 'Tom Local',
        type: 'folders',
        category: 'category1',
        structure: 'tom/',
        createdBy: 'Tom',
        createdByGroup: 'MIN'
    }), 'utf8');

    await fsp.writeFile(path.join(minDir, 'Jon', 'jon_shared.json'), JSON.stringify({
        id: 'tpl_jon_1',
        name: 'Jon Shared',
        description: 'Confocal setup from Jon',
        type: 'experiment',
        category: 'category1',
        createdBy: 'Jon',
        createdByGroup: 'MIN',
        metadata: { fields: { laser: { type: 'text', label: 'Laser' } } }
    }), 'utf8');

    await fsp.writeFile(path.join(minDir, 'Thomas', 'thomas_shared.json'), JSON.stringify({
        id: 'tpl_thomas_1',
        name: 'Thomas Shared',
        type: 'folders',
        category: 'category1',
        structure: 'thomas/',
        createdBy: 'Thomas',
        createdByGroup: 'MIN'
    }), 'utf8');

    await fsp.writeFile(path.join(bioDir, 'Alice', 'alice_bio.json'), JSON.stringify({
        id: 'tpl_alice_1',
        name: 'Alice Bio',
        type: 'folders',
        category: 'category1',
        structure: 'alice/',
        createdBy: 'Alice',
        createdByGroup: 'BioImaging'
    }), 'utf8');

    await t.test('File-storage init loads own and shared templates and renders shared UI markers', async () => {
        const env = createRendererRuntime(tempBase, { username: 'Tom', groupname: 'MIN' });
        await env.window.storage.initFileStorage();
        await env.window.templateManager.init();

        const filtered = env.window.templateManager.getFilteredTemplates();
        assert.equal(filtered.length, 3);
        assert.equal(filtered.filter(x => x.isOwn).length, 1);
        assert.equal(filtered.filter(x => !x.isOwn && x.isShared).length, 2);

        const html = env.elements.get('templateList').innerHTML;
        assert.ok(html.includes('shared-badge'), 'rendered list must contain shared-badge');
        assert.ok(html.includes('by Jon (MIN)'), 'rendered list must show creator and group');
        assert.ok(html.includes('copy-link'), 'rendered list must contain Copy to my templates link');
    });

    await t.test('Toggling showSharedTemplates OFF and ON updates list, search, selection, and setting', async () => {
        const env = createRendererRuntime(tempBase, { username: 'Tom', groupname: 'MIN' });
        await env.window.storage.initFileStorage();
        await env.window.templateManager.init();

        // Select a shared template first (index 1 is Jon Shared)
        const listBefore = env.window.templateManager.getFilteredTemplates();
        const sharedIndex = listBefore.findIndex(x => !x.isOwn && x.name === 'Jon Shared');
        assert.ok(sharedIndex >= 0);
        env.window.templateManager.select(sharedIndex);
        assert.equal(env.window.templateManager.currentTemplate.name, 'Jon Shared');

        // Start a search matching Jon Shared
        env.window.templateManager.performSearch('Jon');
        assert.equal(env.window.templateManager.getFilteredTemplates().length, 1);

        // Toggle OFF
        const cb = env.elements.get('showSharedTemplates');
        cb.checked = false;
        await env.window.templateManager.toggleSharedTemplates();

        assert.equal(env.userSettings.get('Tom:general.show_shared_templates'), false);
        assert.equal(env.window.templateManager.currentTemplate, null, 'active shared template must be deselected when hidden');
        assert.equal(env.window.templateManager.getFilteredTemplates().length, 0, 'active search should exclude hidden shared template');

        env.window.templateManager.clearSearch();
        assert.deepEqual(
            Array.from(env.window.templateManager.getFilteredTemplates(), x => x.name),
            ['Tom Local']
        );

        // Toggle ON again
        cb.checked = true;
        env.window.templateManager.performSearch('Jon');
        assert.equal(env.window.templateManager.getFilteredTemplates().length, 0);

        await env.window.templateManager.toggleSharedTemplates();
        assert.equal(env.userSettings.get('Tom:general.show_shared_templates'), true);
        assert.equal(env.window.templateManager.getFilteredTemplates().length, 1, 're-enabling shared templates updates active search results');
    });

    await t.test('User switch clears allTemplates cache and loads new user context cleanly', async () => {
        const env = createRendererRuntime(tempBase, { username: 'Tom', groupname: 'MIN' });
        await env.window.storage.initFileStorage();
        await env.window.templateManager.init();

        const tomNames = Array.from(env.window.templateManager.getFilteredTemplates(), x => x.name).sort();
        assert.deepEqual(tomNames, ['Jon Shared', 'Thomas Shared', 'Tom Local']);

        // Switch to Jon (same group MIN)
        env.window.userManager.currentUser = 'Jon';
        env.window.userManager.currentGroup = 'MIN';
        await env.window.storage.initFileStorage();
        await env.window.templateManager.init();

        const jonFiltered = Array.from(env.window.templateManager.getFilteredTemplates());
        const jonOwn = jonFiltered.filter(x => x.isOwn).map(x => x.name);
        const jonShared = jonFiltered.filter(x => !x.isOwn).map(x => x.name).sort();
        assert.deepEqual(jonOwn, ['Jon Shared']);
        assert.deepEqual(jonShared, ['Thomas Shared', 'Tom Local']);
    });

    await t.test('Multi-group membership loads shared templates from all groups without duplicates', async () => {
        const env = createRendererRuntime(tempBase, { username: 'Thomas', groupname: 'MIN' });
        await env.window.storage.initFileStorage();
        await env.window.templateManager.init();

        const filtered = Array.from(env.window.templateManager.getFilteredTemplates());
        const names = filtered.map(x => x.name).sort();
        assert.deepEqual(names, ['Alice Bio', 'Jon Shared', 'Thomas Shared', 'Tom Local']);
        assert.equal(filtered.filter(x => x.isOwn).length, 1);
        assert.equal(filtered.filter(x => !x.isOwn).length, 3);
    });

    await t.test('copyTemplate saves copied template to current user file and updateActionButtons disables Edit for shared', async () => {
        const env = createRendererRuntime(tempBase, { username: 'Tom', groupname: 'MIN' });
        await env.window.storage.initFileStorage();
        await env.window.templateManager.init();

        const list = env.window.templateManager.getFilteredTemplates();
        const sharedIdx = list.findIndex(x => x.name === 'Jon Shared');
        assert.ok(sharedIdx >= 0);

        // Select shared template and verify #editTemplateBtn is disabled even without a delete button in .actions
        env.window.templateManager.select(sharedIdx);
        assert.equal(env.elements.get('editTemplateBtn').disabled, true);

        await env.window.templateManager.copyTemplate(sharedIdx);
        assert.equal(env.savedCalls.length, 1);
        assert.ok(env.savedCalls[0].filePath.includes(path.join('MIN', 'Tom')));
        assert.ok(fs.existsSync(env.savedCalls[0].filePath));

        const ownNames = env.window.templateManager.templates.map(x => x.name);
        assert.ok(ownNames.includes('Jon Shared (Copy)'));
    });

    await t.test('Browser localStorage fallback still loads group templates when fileStorageEnabled is false', async () => {
        const env = createRendererRuntime(tempBase, { username: 'Tom', groupname: 'MIN' });
        env.window.electronAPI = null;
        env.window.storage.fileStorageEnabled = false;
        env.window.storage.storageMode = 'localStorage';
        env.localStorage.setItem('metafold_group_MIN_templates', JSON.stringify([
            {
                id: 'ls_shared_1',
                name: 'LocalStorage Shared',
                type: 'folders',
                category: 'category1',
                structure: 'ls/',
                createdBy: 'Jon',
                createdByGroup: 'MIN'
            }
        ]));

        const loaded = await env.window.storage.loadGroupTemplates('MIN');
        assert.equal(loaded.length, 1);
        assert.equal(loaded[0].name, 'LocalStorage Shared');

        await env.window.templateManager.init();
        const names = env.window.templateManager.getFilteredTemplates().map(x => x.name);
        assert.ok(names.includes('LocalStorage Shared'));
    });

    await t.test('loginModal.getUserGroupFromStorage resolves group from profileManager when localStorage mapping is empty', () => {
        const env = createRendererRuntime(tempBase, { username: 'Tom', groupname: 'MIN' });
        assert.equal(env.localStorage.getItem('metafold_user_group_mapping'), null);
        assert.equal(env.window.loginModal.getUserGroupFromStorage('Jon'), 'MIN');
        assert.equal(env.window.loginModal.getUserGroupFromStorage('Thomas'), 'MIN');
        assert.equal(env.window.loginModal.getUserGroupFromStorage('UnknownUser'), 'Default');
    });
});
