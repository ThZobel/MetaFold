const fs = require('fs').promises;
const path = require('path');

const NON_TEMPLATE_JSON_FILES = new Set([
    'user_index.json',
    'users.json',
    'groups.json',
    'template_defaults.json'
]);

const NON_TEMPLATE_SCHEMA_TYPES = new Set([
    'metafold-user-index',
    'metafold-users',
    'metafold-groups',
    'metafold-id-dictionary',
    'metafold-sidecar',
    'metafold-project-metadata',
    'metafold-scan-summary',
    'metafold-lineage-export',
    'metafold-visualization-export',
    'metafold-template-defaults'
]);

/**
 * Sanitize a user, group, or file path segment safely.
 */
function sanitizeSegment(name) {
    return String(name || '').replace(/[<>:"/\\|?*]/g, '_').trim();
}

/**
 * Check if a template filename is stable (does not carry legacy timestamp suffixes).
 */
function isStableFilename(filename) {
    const timestampPattern = /_20\d{2}[01]\d[0-3]\d/;
    const longNumberPattern = /\d{10,}/;
    return !timestampPattern.test(filename) && !longNumberPattern.test(filename);
}

/**
 * Derive a human-readable template display name from its JSON filename.
 */
function generateEnhancedNameFromFilename(filename) {
    const base = String(filename || '').replace(/\.json$/i, '');

    return base
        .replace(/[_-]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/\bLsm\b/g, 'LSM')
        .replace(/\bRdm\b/g, 'RDM')
        .replace(/\bOmero\b/g, 'OMERO')
        .replace(/\bApi\b/g, 'API')
        .replace(/\bDna\b/g, 'DNA')
        .replace(/\bRna\b/g, 'RNA')
        .trim();
}

/**
 * Return true if the filename represents a template JSON file (not system state/index files).
 */
function isTemplateJsonFilename(filename) {
    const lower = String(filename || '').toLowerCase();
    return lower.endsWith('.json') &&
        !NON_TEMPLATE_JSON_FILES.has(lower) &&
        !lower.startsWith('id_dictionary_');
}

/**
 * Read, validate, and normalize a single template JSON file from disk.
 * Returns null when the JSON file is not a MetaFold template (e.g. non-template schemaType).
 */
async function parseTemplateFile({
    filePath,
    filename,
    directory,
    ownerUser = null,
    ownerGroup = null,
    isGroupTemplate = false,
    schemaVersion = '0.1',
    legacySchemaVersion = '0.0'
}) {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
    }

    if (parsed.schemaType && NON_TEMPLATE_SCHEMA_TYPES.has(parsed.schemaType)) {
        return null;
    }

    const template = parsed;
    template.originalName = template.name;
    template.sourceFilename = filename;

    let displayName = generateEnhancedNameFromFilename(filename);
    if (!displayName || displayName === 'undefined' || displayName.trim() === '') {
        displayName = filename.replace(/\.json$/i, '').replace(/[_-]/g, ' ').trim();
    }
    template.name = displayName;
    template.fileBasedNaming = true;
    template.nameSource = 'filename';
    template.lastFileUpdate = new Date().toISOString();

    if (!template.type) {
        template.type = template.metadata && Object.keys(template.metadata).length > 0 ? 'experiment' : 'folders';
    }

    if (isGroupTemplate) {
        if (ownerUser) {
            const hasMatchingCreator = typeof template.createdBy === 'string' &&
                template.createdBy.trim().toLowerCase() === ownerUser.toLowerCase();
            template.createdBy = hasMatchingCreator ? template.createdBy.trim() : ownerUser;
        } else {
            template.createdBy = (typeof template.createdBy === 'string' && template.createdBy.trim())
                ? template.createdBy.trim()
                : (ownerGroup || 'Group');
        }
        template.createdByGroup = ownerGroup || template.createdByGroup || 'Unknown';
    } else if (ownerUser || ownerGroup) {
        template.createdBy = ownerUser || template.createdBy || 'Manual';
        template.createdByGroup = ownerGroup || template.createdByGroup || 'Manual';
    }

    if (!template.createdAt) {
        template.createdAt = new Date().toISOString();
    }
    if (!template.updatedAt) {
        template.updatedAt = template.createdAt;
    }
    if (!template.id) {
        template.id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    const stats = await fs.stat(filePath);
    template.schemaVersion = template.schemaVersion || legacySchemaVersion;
    template._fileInfo = {
        ...(template._fileInfo || {}),
        filename,
        filePath,
        lastModified: stats.mtime.toISOString(),
        fileSize: stats.size,
        source: 'file',
        directory,
        stable: isStableFilename(filename),
        version: schemaVersion,
        ...(isGroupTemplate ? {
            isGroupTemplate: true,
            ownerUser: template.createdBy,
            ownerGroup: template.createdByGroup
        } : {})
    };

    delete template.migrationMetadata;
    delete template.savedLocally;
    delete template.storageType;
    delete template.storageDisplay;
    delete template.storageIcon;
    delete template.recoveredAt;

    return template;
}

/**
 * Load templates belonging to other users in the given group directory.
 * Scans ~/MetaFold/Templates/<groupName>/<otherUser>/*.json as well as direct group-level JSONs.
 */
async function loadGroupTemplatesFromBaseDir(baseTemplatesDir, groupName, userInfo = null, options = {}) {
    const schemaVersion = options.schemaVersion || '0.1';
    const legacySchemaVersion = options.legacySchemaVersion || '0.0';

    if (!groupName || typeof groupName !== 'string') {
        return { success: true, templates: [], loadedCount: 0, errorCount: 0, errors: [] };
    }

    const trimmedGroup = groupName.trim();
    if (!trimmedGroup || trimmedGroup === 'Default' || trimmedGroup === 'Unknown' || trimmedGroup === '.') {
        return { success: true, templates: [], loadedCount: 0, errorCount: 0, errors: [] };
    }

    if (/[/\\]|\.\./.test(groupName)) {
        return {
            success: false,
            error: 'Invalid group name',
            templates: [],
            loadedCount: 0,
            errorCount: 1,
            errors: [{ file: groupName, error: 'Invalid group name' }]
        };
    }

    const safeGroup = sanitizeSegment(trimmedGroup);
    if (!safeGroup || safeGroup === '.' || safeGroup === '..') {
        return {
            success: false,
            error: 'Invalid group name',
            templates: [],
            loadedCount: 0,
            errorCount: 1,
            errors: [{ file: groupName, error: 'Invalid group name' }]
        };
    }

    const resolvedBase = path.resolve(baseTemplatesDir);
    const groupDir = path.join(resolvedBase, safeGroup);
    const resolvedGroupDir = path.resolve(groupDir);

    if (!resolvedGroupDir.startsWith(resolvedBase + path.sep)) {
        return {
            success: false,
            error: 'Invalid group name',
            templates: [],
            loadedCount: 0,
            errorCount: 1,
            errors: [{ file: groupName, error: 'Invalid group name' }]
        };
    }

    try {
        await fs.access(resolvedGroupDir);
    } catch (_) {
        return {
            success: true,
            templates: [],
            directory: resolvedGroupDir,
            groupName: trimmedGroup,
            loadedCount: 0,
            errorCount: 0,
            errors: []
        };
    }

    const currentUsername = userInfo?.username ? String(userInfo.username).trim() : null;
    const currentUserLower = currentUsername ? currentUsername.toLowerCase() : null;
    const currentUserSanitizedLower = currentUsername ? sanitizeSegment(currentUsername).toLowerCase() : null;

    const templates = [];
    const errors = [];

    const entries = await fs.readdir(resolvedGroupDir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const entryLower = entry.name.toLowerCase();
            if (entry.name.startsWith('.') || entryLower === 'layouts') {
                continue;
            }
            if (currentUserLower && (entryLower === currentUserLower || entryLower === currentUserSanitizedLower)) {
                continue;
            }

            const userDir = path.join(resolvedGroupDir, entry.name);
            let subEntries = [];
            try {
                subEntries = await fs.readdir(userDir, { withFileTypes: true });
            } catch (dirErr) {
                errors.push({ file: entry.name, error: dirErr.message });
                continue;
            }

            for (const sub of subEntries) {
                if (!sub.isFile() || !isTemplateJsonFilename(sub.name)) continue;
                const filePath = path.join(userDir, sub.name);
                try {
                    const tpl = await parseTemplateFile({
                        filePath,
                        filename: sub.name,
                        directory: userDir,
                        ownerUser: entry.name,
                        ownerGroup: trimmedGroup,
                        isGroupTemplate: true,
                        schemaVersion,
                        legacySchemaVersion
                    });
                    if (tpl) {
                        templates.push(tpl);
                    }
                } catch (fileErr) {
                    errors.push({ file: path.join(entry.name, sub.name), error: fileErr.message });
                }
            }
        } else if (entry.isFile() && isTemplateJsonFilename(entry.name)) {
            const filePath = path.join(resolvedGroupDir, entry.name);
            try {
                const tpl = await parseTemplateFile({
                    filePath,
                    filename: entry.name,
                    directory: resolvedGroupDir,
                    ownerUser: null,
                    ownerGroup: trimmedGroup,
                    isGroupTemplate: true,
                    schemaVersion,
                    legacySchemaVersion
                });
                if (tpl) {
                    const creatorLower = tpl.createdBy ? String(tpl.createdBy).toLowerCase() : '';
                    if (currentUserLower && creatorLower === currentUserLower) {
                        continue;
                    }
                    templates.push(tpl);
                }
            } catch (fileErr) {
                errors.push({ file: entry.name, error: fileErr.message });
            }
        }
    }

    return {
        success: true,
        templates,
        directory: resolvedGroupDir,
        groupName: trimmedGroup,
        loadedCount: templates.length,
        errorCount: errors.length,
        errors
    };
}

module.exports = {
    NON_TEMPLATE_JSON_FILES,
    NON_TEMPLATE_SCHEMA_TYPES,
    sanitizeSegment,
    isStableFilename,
    generateEnhancedNameFromFilename,
    isTemplateJsonFilename,
    parseTemplateFile,
    loadGroupTemplatesFromBaseDir
};
