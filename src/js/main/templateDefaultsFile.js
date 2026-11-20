/**
 * MetaFold Per-User Template Defaults File Store
 *
 * Pure Node CommonJS helper storing personal field/path/integration defaults keyed by template UUID
 * under `<metafoldDir>/user_defaults/<sanitizedUsername>.json`, keeping defaults outside `Templates/`
 * so shared group templates and repository templates stay untouched.
 */
'use strict';

const fs = require('fs').promises;
const path = require('path');

const SCHEMA_VERSION = '0.1';
const SCHEMA_TYPE = 'metafold-template-defaults';

function sanitizeSegment(name) {
    return String(name || '')
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\.+/g, '_')
        .trim();
}

function resolveDefaultsFilePath(metafoldDir, username) {
    if (!metafoldDir || typeof metafoldDir !== 'string') {
        throw new Error('Base MetaFold directory is required');
    }
    const baseDir = path.resolve(metafoldDir);
    const defaultsDir = path.resolve(path.join(baseDir, 'user_defaults'));
    if (!defaultsDir.startsWith(baseDir + path.sep)) {
        throw new Error('Invalid user_defaults path');
    }

    const rawUser = (typeof username === 'string' && username.trim()) ? username.trim() : 'default';
    if (/[/\\]|\.\./.test(rawUser)) {
        throw new Error('Invalid username');
    }
    const safeUser = sanitizeSegment(rawUser) || 'default';
    const filePath = path.resolve(path.join(defaultsDir, `${safeUser}.json`));
    if (!filePath.startsWith(defaultsDir + path.sep)) {
        throw new Error('Resolved defaults file path escapes user_defaults directory');
    }

    return { defaultsDir, filePath, safeUser };
}

async function loadUserTemplateDefaults(metafoldDir, username) {
    try {
        const { filePath } = resolveDefaultsFilePath(metafoldDir, username);
        const content = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && parsed.defaults && typeof parsed.defaults === 'object' && !Array.isArray(parsed.defaults)) {
            return {
                schemaVersion: parsed.schemaVersion || SCHEMA_VERSION,
                schemaType: SCHEMA_TYPE,
                username: parsed.username || username || 'default',
                updatedAt: parsed.updatedAt || null,
                defaults: parsed.defaults
            };
        }
        return {
            schemaVersion: SCHEMA_VERSION,
            schemaType: SCHEMA_TYPE,
            username: username || 'default',
            updatedAt: null,
            defaults: {}
        };
    } catch (_) {
        return {
            schemaVersion: SCHEMA_VERSION,
            schemaType: SCHEMA_TYPE,
            username: username || 'default',
            updatedAt: null,
            defaults: {}
        };
    }
}

async function saveUserTemplateDefaults(metafoldDir, username, defaultsMap) {
    const { defaultsDir, filePath, safeUser } = resolveDefaultsFilePath(metafoldDir, username);
    await fs.mkdir(defaultsDir, { recursive: true });

    const cleanDefaults = (defaultsMap && typeof defaultsMap === 'object' && !Array.isArray(defaultsMap))
        ? defaultsMap
        : {};

    const payload = {
        schemaVersion: SCHEMA_VERSION,
        schemaType: SCHEMA_TYPE,
        username: (typeof username === 'string' && username.trim()) ? username.trim() : safeUser,
        updatedAt: new Date().toISOString(),
        defaults: cleanDefaults
    };

    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(payload, null, 2), 'utf8');
    await fs.rename(tempPath, filePath);

    return {
        success: true,
        filePath,
        count: Object.keys(cleanDefaults).length,
        updatedAt: payload.updatedAt
    };
}

async function upsertTemplateDefault(metafoldDir, username, uuid, entry) {
    if (!uuid || typeof uuid !== 'string' || !uuid.trim()) {
        throw new Error('Template UUID is required');
    }
    const key = uuid.trim().toLowerCase();
    const existingDoc = await loadUserTemplateDefaults(metafoldDir, username);
    const nextDefaults = { ...(existingDoc.defaults || {}) };
    nextDefaults[key] = {
        ...(entry && typeof entry === 'object' ? entry : {}),
        updatedAt: new Date().toISOString()
    };
    return await saveUserTemplateDefaults(metafoldDir, username, nextDefaults);
}

async function deleteTemplateDefault(metafoldDir, username, uuid) {
    if (!uuid || typeof uuid !== 'string' || !uuid.trim()) {
        return { success: false, message: 'Template UUID is required' };
    }
    const key = uuid.trim().toLowerCase();
    const existingDoc = await loadUserTemplateDefaults(metafoldDir, username);
    const nextDefaults = { ...(existingDoc.defaults || {}) };
    const existed = Object.prototype.hasOwnProperty.call(nextDefaults, key);
    delete nextDefaults[key];
    const res = await saveUserTemplateDefaults(metafoldDir, username, nextDefaults);
    return { ...res, deleted: existed };
}

module.exports = {
    SCHEMA_VERSION,
    SCHEMA_TYPE,
    sanitizeSegment,
    resolveDefaultsFilePath,
    loadUserTemplateDefaults,
    saveUserTemplateDefaults,
    upsertTemplateDefault,
    deleteTemplateDefault
};
