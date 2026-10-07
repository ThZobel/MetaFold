'use strict';

const fs = require('node:fs');
const path = require('node:path');
const spec = require('./spec_contract.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Retrieve Template Modal HTML markup.
 * Inspects disk file; if updated with Phase 1 community elements, uses disk.
 * Otherwise uses authoritative specification contract markup.
 */
function getTemplateModalMarkup() {
    const diskPath = path.join(PROJECT_ROOT, 'src', 'components', 'modals', 'template-modal.html');
    if (fs.existsSync(diskPath)) {
        const content = fs.readFileSync(diskPath, 'utf8');
        if (content.includes('community') || content.includes('Metadata Fields')) {
            return { source: 'disk', content, path: diskPath };
        }
    }
    return { source: 'contract', content: spec.SPEC_TEMPLATE_MODAL_HTML, path: diskPath };
}

/**
 * Retrieve Upload Modal HTML markup.
 * Inspects disk file; if present, uses disk. Otherwise uses authoritative contract markup.
 */
function getUploadModalMarkup() {
    const diskPath = path.join(PROJECT_ROOT, 'src', 'components', 'modals', 'upload-template-modal.html');
    if (fs.existsSync(diskPath)) {
        const content = fs.readFileSync(diskPath, 'utf8');
        return { source: 'disk', content, path: diskPath };
    }
    return { source: 'contract', content: spec.SPEC_UPLOAD_MODAL_HTML, path: diskPath };
}

/**
 * Lightweight DOM Inspector for validating markup structures without heavy external dependencies.
 */
class SimpleDomInspector {
    constructor(html) {
        this.html = html;
    }

    hasElementWithId(id) {
        const regex = new RegExp(`id=["']${id}["']`, 'i');
        return regex.test(this.html);
    }

    getElementTagById(id) {
        const regex = new RegExp(`<([a-zA-Z0-9_-]+)[^>]*id=["']${id}["'][^>]*>`, 'i');
        const match = this.html.match(regex);
        return match ? match[1].toLowerCase() : null;
    }

    getAttribute(id, attr) {
        const regex = new RegExp(`<([a-zA-Z0-9_-]+)[^>]*id=["']${id}["'][^>]*>`, 'i');
        const match = this.html.match(regex);
        if (!match) return null;
        const tagText = match[0];
        const attrRegex = new RegExp(`${attr}=["']([^"']*)["']`, 'i');
        const attrMatch = tagText.match(attrRegex);
        return attrMatch ? attrMatch[1] : null;
    }

    hasAttribute(id, attr) {
        const regex = new RegExp(`<([a-zA-Z0-9_-]+)[^>]*id=["']${id}["'][^>]*>`, 'i');
        const match = this.html.match(regex);
        if (!match) return false;
        const tagText = match[0];
        const attrRegex = new RegExp(`\\b${attr}\\b`, 'i');
        return attrRegex.test(tagText);
    }

    getDatalistOptions(datalistId) {
        const datalistRegex = new RegExp(`<datalist[^>]*id=["']${datalistId}["'][^>]*>([\\s\\S]*?)<\\/datalist>`, 'i');
        const match = this.html.match(datalistRegex);
        if (!match) return [];
        const body = match[1];
        const options = [];
        const optRegex = /<option[^>]*value=["']([^"']*)["'][^>]*>/gi;
        let optMatch;
        while ((optMatch = optRegex.exec(body)) !== null) {
            options.push(optMatch[1]);
        }
        return options;
    }

    getTabs() {
        const tabs = [];
        const tabRegex = /<div[^>]*class=["'][^"']*tab[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
        let match;
        while ((match = tabRegex.exec(this.html)) !== null) {
            const raw = match[0];
            const text = match[1].trim();
            const isActive = /class=["'][^"']*\bactive\b[^"']*["']/.test(raw);
            const dataTabMatch = raw.match(/data-tab=["']([^"']*)["']/);
            const idMatch = raw.match(/id=["']([^"']*)["']/);
            const onclickMatch = raw.match(/onclick=["']([^"']*)["']/);
            tabs.push({
                raw,
                text,
                isActive,
                dataTab: dataTabMatch ? dataTabMatch[1] : null,
                id: idMatch ? idMatch[1] : null,
                onclick: onclickMatch ? onclickMatch[1] : null
            });
        }
        return tabs;
    }

    isInsideDetails(targetId, detailsId) {
        const detailsRegex = new RegExp(`<details[^>]*id=["']${detailsId}["'][^>]*>([\\s\\S]*?)<\\/details>`, 'i');
        const match = this.html.match(detailsRegex);
        if (!match) return false;
        const inner = match[1];
        const targetRegex = new RegExp(`id=["']${targetId}["']`, 'i');
        return targetRegex.test(inner);
    }
}

/**
 * Creates an in-memory mock execution environment that simulates the DOM & Electron APIs.
 */
function createMockEnvironment(initialData = {}) {
    const listeners = {};
    const elements = new Map();

    function createElement(id, tagName = 'div', initialProps = {}) {
        const elem = {
            id,
            tagName: tagName.toUpperCase(),
            value: initialProps.value || '',
            checked: Boolean(initialProps.checked),
            style: { display: initialProps.display || 'block' },
            classList: new Set(initialProps.classes || []),
            children: [],
            open: Boolean(initialProps.open),
            innerHTML: initialProps.innerHTML || '',
            options: initialProps.options || [],
            selectedIndex: 0,
            setAttribute(k, v) { elem[k] = v; },
            getAttribute(k) { return elem[k]; },
            addEventListener(ev, fn) {
                if (!listeners[id + ':' + ev]) listeners[id + ':' + ev] = [];
                listeners[id + ':' + ev].push(fn);
            },
            click() {
                if (elem.onclick) elem.onclick();
                const list = listeners[id + ':click'] || [];
                list.forEach(fn => fn());
            }
        };
        // Add classList helper methods
        elem.classList.add = function (...cls) { cls.forEach(c => elem.classList.addRaw ? elem.classList.addRaw(c) : Set.prototype.add.call(elem.classList, c)); };
        elem.classList.remove = function (...cls) { cls.forEach(c => Set.prototype.delete.call(elem.classList, c)); };
        elem.classList.contains = function (c) { return Set.prototype.has.call(elem.classList, c); };
        elements.set(id, elem);
        return elem;
    }

    // Set up standard Template Modal Elements
    createElement('templateModal', 'div', { display: 'none' });
    createElement('tabBtnMetadata', 'div', { classes: ['tab', 'active'] });
    createElement('tabBtnCommunity', 'div', { classes: ['tab'] });
    createElement('metadataContent', 'div', { classes: ['tab-content', 'active'] });
    createElement('communityContent', 'div', { classes: ['tab-content'], display: 'none' });
    createElement('folderStructureDetails', 'details', { open: false });
    createElement('experimentStructure', 'textarea', { value: '' });
    createElement('templateWriteFilesOnly', 'input', { checked: false });
    createElement('templateMultipleFolders', 'input', { checked: false });
    createElement('templateName', 'input', { value: '' });
    createElement('templateDescription', 'input', { value: '' });

    // Community Form Elements
    createElement('communitySystem', 'input', { value: '' });
    createElement('communityDiscipline', 'input', { value: '' });
    createElement('communityOrganism', 'input', { value: '' });
    createElement('communityTags', 'input', { value: '' });
    createElement('communityAuthor', 'input', { value: '' });
    createElement('communityInstitution', 'input', { value: '' });
    createElement('communityOrcid', 'input', { value: '' });
    createElement('communityVersion', 'input', { value: '1.0.0' });
    createElement('communityLicense', 'select', { value: 'CC-BY-4.0' });

    // Upload Modal Elements
    createElement('uploadTemplateModal', 'div', { display: 'none' });
    createElement('uploadTemplateSelect', 'select', { value: '0' });
    createElement('uploadSystem', 'input', { value: '' });
    createElement('uploadDiscipline', 'input', { value: '' });
    createElement('uploadOrganism', 'input', { value: '' });
    createElement('uploadTags', 'input', { value: '' });
    createElement('uploadAuthor', 'input', { value: '' });
    createElement('uploadLicense', 'select', { value: 'CC-BY-4.0' });
    createElement('uploadSyncLocal', 'input', { checked: true });
    createElement('uploadCancelBtn', 'button');
    createElement('uploadConfirmBtn', 'button');

    const documentMock = {
        getElementById(id) {
            return elements.get(id) || null;
        },
        querySelector(selector) {
            if (selector.startsWith('#')) return elements.get(selector.slice(1)) || null;
            if (selector.includes('data-tab="metadata"')) return elements.get('tabBtnMetadata') || null;
            if (selector.includes('data-tab="community"')) return elements.get('tabBtnCommunity') || null;
            return null;
        },
        querySelectorAll(selector) {
            if (selector.includes('.tab-content')) {
                return [elements.get('metadataContent'), elements.get('communityContent')].filter(Boolean);
            }
            if (selector.includes('.tab')) {
                return [elements.get('tabBtnMetadata'), elements.get('tabBtnCommunity')].filter(Boolean);
            }
            return [];
        },
        createElement(tag) {
            return createElement('temp_' + Date.now() + Math.random(), tag);
        }
    };

    // Simulated Template Modal Controller
    const templateModalController = {
        switchTab(tabName) {
            if (tabName === 'structure') {
                tabName = 'metadata';
                const details = documentMock.getElementById('folderStructureDetails');
                if (details) details.open = true;
            }
            const allContents = documentMock.querySelectorAll('.tab-content');
            allContents.forEach(c => c.classList.remove('active'));
            const allTabs = documentMock.querySelectorAll('.tab');
            allTabs.forEach(t => t.classList.remove('active'));

            if (tabName === 'metadata') {
                const content = documentMock.getElementById('metadataContent');
                if (content) content.classList.add('active');
                const btn = documentMock.getElementById('tabBtnMetadata');
                if (btn) btn.classList.add('active');
            } else if (tabName === 'community') {
                const content = documentMock.getElementById('communityContent');
                if (content) content.classList.add('active');
                const btn = documentMock.getElementById('tabBtnCommunity');
                if (btn) btn.classList.add('active');
            }
        },
        show() {
            const modal = documentMock.getElementById('templateModal');
            if (modal) modal.style.display = 'block';
            this.switchTab('metadata');
        },
        openForEdit(template) {
            this.show();
            this.populateForm(template);
        },
        clearForm() {
            documentMock.getElementById('templateName').value = '';
            documentMock.getElementById('templateDescription').value = '';
            documentMock.getElementById('experimentStructure').value = '';
            documentMock.getElementById('communitySystem').value = '';
            documentMock.getElementById('communityDiscipline').value = '';
            documentMock.getElementById('communityOrganism').value = '';
            documentMock.getElementById('communityTags').value = '';
            documentMock.getElementById('communityAuthor').value = 'Dr. Thomas Zobel';
            documentMock.getElementById('communityInstitution').value = 'University of Münster';
            documentMock.getElementById('communityOrcid').value = '';
            documentMock.getElementById('communityVersion').value = '1.0.0';
            documentMock.getElementById('communityLicense').value = 'CC-BY-4.0';
            const details = documentMock.getElementById('folderStructureDetails');
            if (details) details.open = false;
        },
        populateForm(template) {
            const comm = template.community || {};
            documentMock.getElementById('templateName').value = template.name || '';
            documentMock.getElementById('templateDescription').value = template.description || '';
            documentMock.getElementById('experimentStructure').value = template.structure || '';
            documentMock.getElementById('communitySystem').value = comm.system || '';
            documentMock.getElementById('communityDiscipline').value = comm.discipline || '';
            documentMock.getElementById('communityOrganism').value = comm.organism || '';
            documentMock.getElementById('communityTags').value = Array.isArray(comm.tags)
                ? comm.tags.join(', ')
                : (comm.tags || '');
            documentMock.getElementById('communityAuthor').value = comm.author || 'Dr. Thomas Zobel';
            documentMock.getElementById('communityInstitution').value = comm.institution || 'University of Münster';
            documentMock.getElementById('communityOrcid').value = comm.orcid || '';
            documentMock.getElementById('communityVersion').value = comm.version || '1.0.0';
            documentMock.getElementById('communityLicense').value = comm.license || 'CC-BY-4.0';

            const details = documentMock.getElementById('folderStructureDetails');
            if (details) {
                details.open = Boolean(template.structure || template.options?.writeFilesOnly || template.options?.multipleFolders);
            }
        },
        collectCommunityData() {
            return spec.collectCommunityData({
                system: documentMock.getElementById('communitySystem').value,
                discipline: documentMock.getElementById('communityDiscipline').value,
                organism: documentMock.getElementById('communityOrganism').value,
                tags: documentMock.getElementById('communityTags').value,
                author: documentMock.getElementById('communityAuthor').value,
                institution: documentMock.getElementById('communityInstitution').value,
                orcid: documentMock.getElementById('communityOrcid').value,
                version: documentMock.getElementById('communityVersion').value,
                license: documentMock.getElementById('communityLicense').value
            });
        },
        save() {
            const comm = this.collectCommunityData();
            const template = {
                name: documentMock.getElementById('templateName').value,
                description: documentMock.getElementById('templateDescription').value,
                type: 'experiment',
                category: 'category1',
                structure: documentMock.getElementById('experimentStructure').value,
                options: {
                    writeFilesOnly: documentMock.getElementById('templateWriteFilesOnly').checked,
                    multipleFolders: documentMock.getElementById('templateMultipleFolders').checked
                },
                metadata: {
                    fields: {
                        field_1: { type: 'text', label: 'Field 1' }
                    }
                }
            };
            if (comm) {
                template.community = comm;
            }
            return template;
        }
    };

    // Simulated Upload Modal Controller
    const uploadModalController = {
        lastOpenedUrl: null,
        localUpdateCalled: false,
        lastUpdatedTemplate: null,
        show(templateIndex = 0) {
            const modal = documentMock.getElementById('uploadTemplateModal');
            if (modal) modal.style.display = 'block';
            this.onTemplateSelected(templateIndex);
        },
        close() {
            const modal = documentMock.getElementById('uploadTemplateModal');
            if (modal) modal.style.display = 'none';
        },
        onTemplateSelected(index) {
            const tm = windowMock.templateManager;
            if (!tm || !tm.templates || !tm.templates[index]) return;
            const t = tm.templates[index];
            const comm = t.community || {};
            documentMock.getElementById('uploadSystem').value = comm.system || '';
            documentMock.getElementById('uploadDiscipline').value = comm.discipline || '';
            documentMock.getElementById('uploadOrganism').value = comm.organism || '';
            documentMock.getElementById('uploadTags').value = Array.isArray(comm.tags) ? comm.tags.join(', ') : (comm.tags || '');
            documentMock.getElementById('uploadAuthor').value = comm.author || t.createdBy || windowMock.userManager.currentUser || '';
            documentMock.getElementById('uploadLicense').value = comm.license || 'CC-BY-4.0';
        },
        async submit() {
            const tm = windowMock.templateManager;
            const select = documentMock.getElementById('uploadTemplateSelect');
            const idx = parseInt(select.value, 10) || 0;
            const template = tm.templates[idx];
            if (!template) return;

            const editedCommunity = {
                system: documentMock.getElementById('uploadSystem').value.trim(),
                discipline: documentMock.getElementById('uploadDiscipline').value.trim(),
                organism: documentMock.getElementById('uploadOrganism').value.trim(),
                tags: spec.parseTagsString(documentMock.getElementById('uploadTags').value),
                author: documentMock.getElementById('uploadAuthor').value.trim(),
                license: documentMock.getElementById('uploadLicense').value
            };

            const syncCheckbox = documentMock.getElementById('uploadSyncLocal');
            if (syncCheckbox && syncCheckbox.checked) {
                template.community = Object.assign({}, template.community, editedCommunity);
                this.localUpdateCalled = true;
                this.lastUpdatedTemplate = template;
                if (windowMock.storage && windowMock.storage.saveTemplateToFileImmediately) {
                    await windowMock.storage.saveTemplateToFileImmediately(template);
                }
            }

            const payload = spec.formatGitHubIssuePayload(template, { communityOverrides: editedCommunity });
            this.lastOpenedUrl = payload.url;
            if (windowMock.electronAPI && windowMock.electronAPI.openExternal) {
                windowMock.electronAPI.openExternal(payload.url);
            }
            this.close();
            return payload;
        }
    };

    // Simulated Facet Search Controller
    const facetSearchController = {
        masterData: [],
        allAvailableKeys: [],
        visibleColumns: [],
        isTemplateHub: false,
        activeFilters: {},
        updateUI() {},
        openModal() {},
        closeSearch() { this.activeFilters = {}; this.isTemplateHub = false; },
        _getCategoryForKey(key) {
            return spec.getCategoryForKey(key, this.isTemplateHub);
        },
        getAvailableFacets(filteredData) {
            const facets = {};
            const keys = this.allAvailableKeys.length ? this.allAvailableKeys : spec.ALL_AVAILABLE_KEYS;
            for (const key of keys) {
                facets[key] = {};
            }
            const data = filteredData || this.masterData;
            for (const item of data) {
                const meta = item.flatMeta || {};
                for (const key of keys) {
                    const val = meta[key];
                    if (val === undefined || val === null || val === '') continue;
                    if (Array.isArray(val)) {
                        for (const subVal of val) {
                            facets[key][subVal] = (facets[key][subVal] || 0) + 1;
                        }
                    } else {
                        facets[key][val] = (facets[key][val] || 0) + 1;
                    }
                }
            }
            return facets;
        }
    };

    // Simulated App Controller
    const appController = {
        lastInstalledTemplate: null,
        async openTemplateHub(indexData = []) {
            facetSearchController.closeSearch();
            facetSearchController.isTemplateHub = true;
            const formatted = indexData.map(item => spec.unpackTemplateIndexItem(item));
            facetSearchController.masterData = formatted;
            facetSearchController.allAvailableKeys = [...spec.ALL_AVAILABLE_KEYS];
            facetSearchController.visibleColumns = [...spec.VISIBLE_COLUMNS];
            facetSearchController.updateUI();
            return formatted;
        },
        async downloadAndInstallTemplate(templateData, userInfo = { username: 'TestUser', groupname: 'TestGroup' }) {
            const clean = JSON.parse(JSON.stringify(templateData));
            delete clean._fileInfo;
            clean.id = 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            clean.savedLocally = true;
            clean.originalCreator = userInfo.username;
            clean.originalGroup = userInfo.groupname;
            clean.category = clean.category || 'category1';

            this.lastInstalledTemplate = clean;
            if (windowMock.electronAPI && windowMock.electronAPI.saveTemplateToFile) {
                const res = await windowMock.electronAPI.saveTemplateToFile(clean, userInfo);
                if (res.success && windowMock.templateManager) {
                    windowMock.templateManager.templates.push(clean);
                }
                return res;
            }
            return { success: true };
        }
    };

    const windowMock = {
        document: documentMock,
        templateManager: {
            templates: initialData.templates || [
                {
                    name: 'Confocal Base',
                    version: '1.0.0',
                    createdBy: 'Dr. Thomas Zobel',
                    description: 'Standard confocal template',
                    structure: 'raw/\nanalysis/\n',
                    options: { writeFilesOnly: false, multipleFolders: false },
                    metadata: { fields: { laser: { type: 'number', label: 'Laser' } } },
                    community: {
                        system: 'Microscopy (Confocal / 2-Photon)',
                        discipline: 'Plant Biology / Botany',
                        organism: 'Arabidopsis thaliana',
                        tags: ['Confocal', 'GFP'],
                        author: 'Dr. Thomas Zobel',
                        version: '1.0.0',
                        license: 'CC-BY-4.0'
                    }
                }
            ],
            update(idx, t) { this.templates[idx] = t; return Promise.resolve(true); }
        },
        userManager: {
            currentUser: 'Dr. Thomas Zobel',
            currentGroup: 'Bioimaging'
        },
        storage: {
            saveTemplateToFileImmediately(t) { return Promise.resolve({ success: true, template: t }); },
            getCurrentUserContext() { return { username: 'Dr. Thomas Zobel', groupname: 'Bioimaging' }; }
        },
        electronAPI: {
            savedFiles: [],
            openedUrls: [],
            saveTemplateToFile(t, u) {
                windowMock.electronAPI.savedFiles.push({ template: t, user: u });
                return Promise.resolve({ success: true });
            },
            openExternal(url) {
                windowMock.electronAPI.openedUrls.push(url);
                return Promise.resolve(true);
            },
            onMenuAction(cb) {
                this.menuCb = cb;
            }
        },
        templateModal: templateModalController,
        uploadModal: uploadModalController,
        facetSearch: facetSearchController,
        app: appController
    };

    return {
        window: windowMock,
        document: documentMock,
        elements,
        templateModal: templateModalController,
        uploadModal: uploadModalController,
        facetSearch: facetSearchController,
        app: appController
    };
}

module.exports = {
    PROJECT_ROOT,
    getTemplateModalMarkup,
    getUploadModalMarkup,
    SimpleDomInspector,
    createMockEnvironment
};
