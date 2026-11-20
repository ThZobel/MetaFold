/**
 * MetaFold Per-UUID Template Defaults Store
 *
 * Manages per-user local defaults (field values, targetPath/projectName, integrations)
 * keyed by stable template UUID so shared or repository templates preserve each user's own defaults.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.templateDefaultsStore = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const templateDefaultsStore = {
        defaultsByUuid: {},
        loadedForUser: null,
        isInitialized: false,

        _resolveUserContext() {
            if (typeof window !== 'undefined' && window.storage && typeof window.storage.getCurrentUserContext === 'function') {
                return window.storage.getCurrentUserContext();
            }
            if (typeof window !== 'undefined' && window.userManager) {
                return {
                    username: window.userManager.currentUser || 'default',
                    groupname: window.userManager.currentGroup || 'Default'
                };
            }
            return { username: 'default', groupname: 'Default' };
        },

        _getLocalStorageKey() {
            if (typeof window !== 'undefined' && window.storage && typeof window.storage.getStorageKey === 'function') {
                return window.storage.getStorageKey('template_defaults');
            }
            const user = this._resolveUserContext().username || 'default';
            return `metafold_${user}_template_defaults`;
        },

        _normalizeUuid(uuid) {
            if (typeof window !== 'undefined' && window.metafoldTemplateUuid && typeof window.metafoldTemplateUuid.normalizeUuid === 'function') {
                const n = window.metafoldTemplateUuid.normalizeUuid(uuid);
                if (n) return n;
            }
            if (typeof uuid === 'string' && uuid.trim()) {
                return uuid.trim().toLowerCase();
            }
            return null;
        },

        _deepClone(obj) {
            if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
            return JSON.parse(JSON.stringify(obj));
        },

        async init() {
            const userInfo = this._resolveUserContext();
            let loadedMap = {};

            try {
                if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.loadTemplateDefaults === 'function') {
                    const res = await window.electronAPI.loadTemplateDefaults(userInfo);
                    if (res && res.success && res.defaults && typeof res.defaults === 'object') {
                        loadedMap = res.defaults;
                    }
                } else if (typeof localStorage !== 'undefined') {
                    const raw = localStorage.getItem(this._getLocalStorageKey());
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && typeof parsed === 'object') {
                            loadedMap = parsed.defaults && typeof parsed.defaults === 'object' ? parsed.defaults : parsed;
                        }
                    }
                }
            } catch (error) {
                console.warn('⚠️ templateDefaultsStore init error:', error.message);
                loadedMap = {};
            }

            this.defaultsByUuid = loadedMap || {};
            this.loadedForUser = userInfo.username || 'default';
            this.isInitialized = true;
            return this.defaultsByUuid;
        },

        getDefaults(uuid) {
            const key = this._normalizeUuid(uuid);
            if (!key) return null;
            const entry = this.defaultsByUuid[key];
            return entry ? this._deepClone(entry) : null;
        },

        hasDefaults(uuid) {
            const key = this._normalizeUuid(uuid);
            return Boolean(key && this.defaultsByUuid[key]);
        },

        async _persist() {
            const userInfo = this._resolveUserContext();
            if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.saveTemplateDefaults === 'function') {
                return await window.electronAPI.saveTemplateDefaults(this.defaultsByUuid, userInfo);
            }
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this._getLocalStorageKey(), JSON.stringify({
                    schemaVersion: '0.1',
                    schemaType: 'metafold-template-defaults',
                    username: userInfo.username || 'default',
                    updatedAt: new Date().toISOString(),
                    defaults: this.defaultsByUuid
                }));
                return { success: true };
            }
            return { success: false, error: 'No storage backend available' };
        },

        async saveDefaults(uuid, payload = {}) {
            const key = this._normalizeUuid(uuid);
            if (!key) {
                return { success: false, error: 'Template UUID is required' };
            }

            if (!this.isInitialized) {
                await this.init();
            }

            const existing = this.defaultsByUuid[key] || {};
            const entry = {
                ...existing,
                templateName: payload.templateName !== undefined ? payload.templateName : existing.templateName,
                fields: payload.fields !== undefined ? this._deepClone(payload.fields) : (existing.fields || {}),
                projectDefaults: payload.projectDefaults !== undefined ? this._deepClone(payload.projectDefaults) : (existing.projectDefaults || {}),
                integrations: payload.integrations !== undefined ? this._deepClone(payload.integrations) : (existing.integrations || {}),
                updatedAt: new Date().toISOString()
            };

            this.defaultsByUuid[key] = entry;
            const persistRes = await this._persist();
            return { success: persistRes?.success !== false, entry: this._deepClone(entry) };
        },

        async clearDefaults(uuid) {
            const key = this._normalizeUuid(uuid);
            if (!key) return { success: false };

            if (!this.isInitialized) {
                await this.init();
            }

            const existed = Object.prototype.hasOwnProperty.call(this.defaultsByUuid, key);
            delete this.defaultsByUuid[key];
            if (existed) {
                await this._persist();
            }
            return { success: true, deleted: existed };
        }
    };

    return templateDefaultsStore;
}));
