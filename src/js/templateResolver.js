/**
 * MetaFold Offline-First Template UUID Resolver
 *
 * Lookup order for scanned/entered template UUIDs or URIs (`metafold:tpl:<uuid>`):
 * 1. Local own templates (offline)
 * 2. Local shared group templates (offline)
 * 3. Configured custom repositories (in configured order) -> official MetaFold community repo
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.templateResolver = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const templateResolver = {
        _getUuidHelper() {
            if (typeof window !== 'undefined' && window.metafoldTemplateUuid) {
                return window.metafoldTemplateUuid;
            }
            if (typeof require === 'function') {
                try {
                    return require('./shared/templateUuid.js');
                } catch (_) {}
            }
            return null;
        },

        _notify(message, type = 'info') {
            if (typeof window === 'undefined') return;
            if (type === 'error' && window.app && typeof window.app.showError === 'function') {
                window.app.showError(message);
                return;
            }
            if (type === 'success' && window.app && typeof window.app.showSuccess === 'function') {
                window.app.showSuccess(message);
                return;
            }
            if (type === 'info' && window.appUtils && typeof window.appUtils.showInfo === 'function') {
                window.appUtils.showInfo(message);
                return;
            }
            if (window.app && typeof window.app.showSuccess === 'function') {
                window.app.showSuccess(message);
            }
        },

        _matchesUuid(template, targetUuid, helper) {
            if (!template || typeof template !== 'object') return false;
            const norm = helper ? helper.normalizeUuid(template.uuid) : String(template.uuid || '').trim().toLowerCase();
            if (norm && norm === targetUuid) return true;
            const idNorm = helper ? helper.normalizeUuid(template.id) : String(template.id || '').trim().toLowerCase();
            return Boolean(idNorm && idNorm === targetUuid);
        },

        /**
         * Select a specific template object in templateManager across categories/search state.
         * @param {Object} template
         * @returns {boolean}
         */
        selectTemplateObject(template) {
            const tm = (typeof window !== 'undefined') ? window.templateManager : null;
            if (!tm || !template) return false;

            const helper = this._getUuidHelper();
            const targetUuid = helper ? helper.normalizeUuid(template.uuid) : String(template.uuid || '').trim().toLowerCase();

            // Clear active search so filteredTemplates shows the target category cleanly
            if (tm.searchState && tm.searchState.isSearching) {
                const searchInput = (typeof document !== 'undefined') ? document.getElementById('templateSearchInput') : null;
                if (searchInput) searchInput.value = '';
                tm.searchState.query = '';
                tm.searchState.results = [];
                tm.searchState.isSearching = false;
            }

            // Ensure shared templates are visible if opening a shared group template
            if (template.isOwn === false && tm.searchState && !tm.searchState.showSharedTemplates) {
                tm.searchState.showSharedTemplates = true;
                const sharedCb = (typeof document !== 'undefined') ? document.getElementById('showSharedTemplates') : null;
                if (sharedCb) sharedCb.checked = true;
            }

            // Switch category tab if needed
            const targetCategory = template.category || 'category1';
            if (typeof window !== 'undefined' && window.templateTypeManager && window.templateTypeManager.currentType !== targetCategory) {
                window.templateTypeManager.currentType = targetCategory;
                if (window.settingsManager && typeof window.settingsManager.set === 'function') {
                    window.settingsManager.set('templates.active_category', targetCategory);
                }
                if (typeof window.templateTypeManager.updateUI === 'function') {
                    window.templateTypeManager.updateUI();
                }
                if (typeof window.templateTypeManager.updateIntegrationVisibility === 'function') {
                    window.templateTypeManager.updateIntegrationVisibility();
                }
            }

            if (typeof tm.invalidateCache === 'function') {
                tm.invalidateCache();
            }

            const filtered = typeof tm.getFilteredTemplates === 'function' ? tm.getFilteredTemplates() : (tm.templates || []);
            const idx = filtered.findIndex(t => {
                if (targetUuid && this._matchesUuid(t, targetUuid, helper)) {
                    if (template.isOwn !== undefined && Boolean(t.isOwn) !== Boolean(template.isOwn)) {
                        return false;
                    }
                    return true;
                }
                if (template.id && t.id === template.id && (!template.createdBy || t.createdBy === template.createdBy)) {
                    return true;
                }
                return t.name === template.name && t.createdBy === template.createdBy;
            });

            if (idx >= 0 && typeof tm.select === 'function') {
                // Force re-selection even if index happened to match previous selectedIndex
                if (tm.selectedIndex === idx && tm.currentTemplate) {
                    tm.selectedIndex = -1;
                }
                tm.select(idx);
                return true;
            }

            return false;
        },

        /**
         * Resolve a scanned/entered template code offline-first and open it.
         * @param {string} rawCode
         * @param {Object} [options={}]
         * @returns {Promise<Object>}
         */
        async resolveAndOpen(rawCode, options = {}) {
            const helper = this._getUuidHelper();
            if (!helper) {
                return { success: false, reason: 'missing_helper', message: 'Template UUID helper not loaded.' };
            }

            const parsed = helper.parseTemplateCode(rawCode);
            if (!parsed.matched || !parsed.uuid) {
                const msg = 'Code contains no valid MetaFold Template UUID (expected metafold:tpl:<uuid> or UUID).';
                if (!options.silent) this._notify(msg, 'error');
                return { success: false, reason: 'invalid_code', message: msg };
            }

            const targetUuid = parsed.uuid;
            const tm = (typeof window !== 'undefined') ? window.templateManager : null;

            // Ensure personal per-UUID defaults are loaded before selecting
            if (typeof window !== 'undefined' && window.templateDefaultsStore && !window.templateDefaultsStore.isInitialized) {
                try {
                    await window.templateDefaultsStore.init();
                } catch (_) {}
            }

            // 1. Offline Lookup: Local Own Templates
            if (tm && Array.isArray(tm.templates)) {
                const ownMatch = tm.templates.find(t => this._matchesUuid(t, targetUuid, helper));
                if (ownMatch) {
                    const marked = { ...ownMatch, isOwn: true };
                    this.selectTemplateObject(marked);
                    const msg = `Opened local template "${ownMatch.name}" (offline)`;
                    if (!options.silent) this._notify(msg, 'success');
                    return { success: true, source: 'local_own', uuid: targetUuid, template: ownMatch };
                }
            }

            // 2. Offline Lookup: Local Group Shared Templates
            if (tm) {
                if ((!Array.isArray(tm.groupTemplates) || tm.groupTemplates.length === 0) && typeof tm.loadGroupTemplates === 'function') {
                    try {
                        await tm.loadGroupTemplates();
                    } catch (_) {}
                }
                if (Array.isArray(tm.groupTemplates)) {
                    const groupMatch = tm.groupTemplates.find(t => this._matchesUuid(t, targetUuid, helper));
                    if (groupMatch) {
                        const marked = { ...groupMatch, isOwn: false, isShared: true };
                        this.selectTemplateObject(marked);
                        const msg = `Opened shared group template "${groupMatch.name}" (offline)`;
                        if (!options.silent) this._notify(msg, 'success');
                        return { success: true, source: 'local_group', uuid: targetUuid, template: groupMatch };
                    }
                }
            }

            // 3. Remote Lookup: Configured Repositories (custom repos first, then official community)
            const cm = (typeof window !== 'undefined') ? window.communityManager : null;
            const app = (typeof window !== 'undefined') ? window.app : null;

            if (!cm || typeof cm.findTemplateByUuid !== 'function') {
                const msg = `Template UUID ${targetUuid} was not found locally (no repository client available).`;
                if (!options.silent) this._notify(msg, 'error');
                return { success: false, reason: 'not_found', uuid: targetUuid, message: msg };
            }

            try {
                const { item, repo, statuses } = await cm.findTemplateByUuid(targetUuid, { allowRefresh: true });
                if (item && repo) {
                    const displayName = item.name || targetUuid;
                    if (!options.silent) {
                        this._notify(`Downloading "${displayName}" from ${repo.name}...`, 'info');
                    }

                    const downloaded = await cm.fetchTemplateJson(item.path, {
                        repoId: repo.id,
                        repoName: repo.name,
                        rawBaseUrl: repo.normalized?.rawBaseUrl
                    });

                    if (!downloaded || typeof downloaded !== 'object') {
                        throw new Error('Downloaded template payload is empty or invalid');
                    }

                    downloaded.uuid = targetUuid;

                    if (app && typeof app.downloadAndInstallTemplate === 'function') {
                        const installRes = await app.downloadAndInstallTemplate(downloaded);
                        if (installRes && installRes.success === false) {
                            throw new Error(installRes.error || 'Failed to install downloaded template');
                        }
                    } else if (tm && typeof tm.add === 'function') {
                        await tm.add(downloaded);
                    }

                    let installedTemplate = downloaded;
                    if (tm && Array.isArray(tm.templates)) {
                        const foundLocal = tm.templates.find(t => this._matchesUuid(t, targetUuid, helper));
                        if (foundLocal) {
                            installedTemplate = foundLocal;
                        }
                    }

                    this.selectTemplateObject({ ...installedTemplate, isOwn: true });
                    if (!options.silent) {
                        this._notify(`Installed & opened "${installedTemplate.name}" from ${repo.name}`, 'success');
                    }
                    return {
                        success: true,
                        source: 'repository',
                        repository: repo.name,
                        uuid: targetUuid,
                        template: installedTemplate
                    };
                }

                const anyOk = Array.isArray(statuses) && statuses.some(s => s.ok);
                const enabledCount = Array.isArray(statuses) ? statuses.length : 0;
                const reason = (enabledCount > 0 && !anyOk) ? 'offline' : 'not_found';
                const msg = reason === 'offline'
                    ? `Offline — template ${targetUuid} not found locally and configured repositories could not be reached.`
                    : `Template UUID ${targetUuid} was not found locally or in any configured repository.`;

                if (!options.silent) this._notify(msg, 'error');
                return { success: false, reason, uuid: targetUuid, statuses, message: msg };
            } catch (error) {
                const msg = `Could not resolve template ${targetUuid}: ${error.message}`;
                if (!options.silent) this._notify(msg, 'error');
                return { success: false, reason: 'error', uuid: targetUuid, message: msg };
            }
        }
    };

    return templateResolver;
}));
