/**
 * MetaFold Project Metadata Store (main process).
 *
 * Handles reading, patching, changelog calculation, atomic saving,
 * README regeneration, and User Index synchronization for existing projects.
 */
'use strict';

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const markdownLite = require('../shared/markdownLite.js');
const integrationLinks = require('./integrationLinks.js');

// Mutex queues per project path to serialize concurrent writes (e.g. rapid task checkbox clicks)
const projectLocks = new Map();

function withProjectLock(projectPath, fn) {
    const key = path.resolve(projectPath).toLowerCase();
    const prev = projectLocks.get(key) || Promise.resolve();
    const next = prev.then(() => fn()).finally(() => {
        if (projectLocks.get(key) === next) {
            projectLocks.delete(key);
        }
    });
    projectLocks.set(key, next);
    return next;
}

/**
 * Finds the metadata file in a project folder.
 */
async function findMetadataFileInDirectory(projectPath) {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });
    let file = entries.find(e => e.isFile() && e.name.endsWith('-metadata.json') && !e.name.startsWith('.'));
    if (!file) {
        file = entries.find(e => e.isFile() && e.name === 'ReadyToImport.json');
    }
    return file ? file.name : null;
}

/**
 * Reads project metadata from disk.
 * Supports both flat format and the elabFTW envelope format ({ extra_fields, ... }).
 */
async function readProjectMetadataFromDisk(projectPath) {
    const metadataFilename = await findMetadataFileInDirectory(projectPath);
    if (!metadataFilename) {
        throw new Error(`No metadata JSON file found in "${projectPath}"`);
    }

    const metadataPath = path.join(projectPath, metadataFilename);
    const content = await fs.readFile(metadataPath, 'utf8');
    const rawDoc = JSON.parse(content);

    const isEnvelope = !!(rawDoc && rawDoc.extra_fields && typeof rawDoc.extra_fields === 'object');
    const metadata = isEnvelope ? rawDoc.extra_fields : rawDoc;

    // Resolve project name (from document or filename or folder)
    let projectName = rawDoc.projectName || metadata.projectName || null;
    if (!projectName && metadataFilename.endsWith('-metadata.json')) {
        projectName = metadataFilename.slice(0, -'-metadata.json'.length);
    }
    if (!projectName) {
        projectName = path.basename(projectPath);
    }

    const updatedAt = rawDoc.updated_at || metadata.updated_at || null;
    const createdAt = rawDoc.created_at || metadata.created_at || null;

    return {
        projectPath,
        metadataPath,
        metadataFilename,
        rawDoc,
        isEnvelope,
        metadata,
        projectName,
        updatedAt,
        createdAt
    };
}

/**
 * Atomically writes a JSON file:
 * 1. Creates a backup file (.name.bak)
 * 2. Writes to a temporary file (.name.tmp.<pid>)
 * 3. Renames temporary file to target
 */
async function atomicWriteJsonFile(targetPath, data) {
    const dir = path.dirname(targetPath);
    const base = path.basename(targetPath);
    const backupPath = path.join(dir, `.${base}.bak`);
    const tempPath = path.join(dir, `.${base}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

    const jsonString = JSON.stringify(data, null, 2);

    // If target exists, copy to backup first
    try {
        if (fsSync.existsSync(targetPath)) {
            await fs.copyFile(targetPath, backupPath);
        }
    } catch (e) {
        console.warn(`⚠️ Could not create metadata backup at ${backupPath}:`, e.message);
    }

    // Write temp file and atomically replace target
    await fs.writeFile(tempPath, jsonString, 'utf8');
    try {
        await fs.rename(tempPath, targetPath);
    } catch (renameErr) {
        // Windows fallback if target is temporarily locked
        try {
            await fs.copyFile(tempPath, targetPath);
            await fs.unlink(tempPath);
        } catch (copyErr) {
            throw new Error(`Failed to write metadata file ${targetPath}: ${renameErr.message} / ${copyErr.message}`);
        }
    }
}

/**
 * Synchronizes [[Project Name]] mentions in notes with the related_to links array.
 */
function syncMentionsWithRelatedTo(metadata, allNotesText) {
    const mentions = markdownLite.extractMentions(allNotesText || '');

    // Locate related_to container (root or first group containing it)
    let container = metadata;
    let targetKey = 'related_to';

    if (metadata.related_to === undefined) {
        for (const [k, v] of Object.entries(metadata)) {
            if (v && typeof v === 'object' && v.related_to !== undefined) {
                container = v;
                break;
            }
        }
    }

    let existingField = container[targetKey];
    let list = [];

    if (existingField && typeof existingField === 'object' && Array.isArray(existingField.value)) {
        list = existingField.value;
    } else if (Array.isArray(existingField)) {
        list = existingField;
    } else if (existingField && typeof existingField.value === 'string' && existingField.value.trim()) {
        list = [existingField.value.trim()];
    }

    // Normalize list items
    const normalized = [];
    for (const item of list) {
        if (!item) continue;
        if (typeof item === 'string') {
            normalized.push({ id: item, name: item });
        } else if (typeof item === 'object') {
            normalized.push({ ...item });
        }
    }

    // Remove old note mentions that are no longer in the notes text
    const mentionsSet = new Set(mentions.map(m => m.toLowerCase()));
    const filtered = normalized.filter(item => {
        if (item.origin === 'note') {
            const name = (item.name || item.id || '').toLowerCase();
            return mentionsSet.has(name);
        }
        return true;
    });

    // Add newly found mentions
    const existingNames = new Set(filtered.map(i => (i.name || i.id || '').toLowerCase()));
    for (const mention of mentions) {
        if (!existingNames.has(mention.toLowerCase())) {
            filtered.push({
                id: mention,
                name: mention,
                origin: 'note',
                relation_note: 'Mentioned in note'
            });
            existingNames.add(mention.toLowerCase());
        }
    }

    if (existingField && typeof existingField === 'object') {
        existingField.value = filtered;
        existingField.isModified = true;
    } else {
        container[targetKey] = {
            label: 'Related To (Link)',
            type: 'related_to',
            value: filtered,
            isModified: true
        };
    }
}

/**
 * Main update function called by IPC handler.
 */
async function updateProjectMetadata(projectPath, patch, options = {}, context = {}) {
    return withProjectLock(projectPath, async () => {
        const normProjectPath = path.resolve(projectPath);
        if (!fsSync.existsSync(normProjectPath)) {
            return { success: false, message: `Project directory does not exist: ${projectPath}` };
        }

        const readResult = await readProjectMetadataFromDisk(normProjectPath);
        let {
            metadataPath,
            metadataFilename,
            rawDoc,
            isEnvelope,
            metadata,
            projectName
        } = readResult;

        // Optimistic Locking Check
        if (options.expectedUpdatedAt && readResult.updatedAt) {
            const expectedTime = new Date(options.expectedUpdatedAt).getTime();
            const actualTime = new Date(readResult.updatedAt).getTime();
            if (!isNaN(expectedTime) && !isNaN(actualTime) && Math.abs(expectedTime - actualTime) > 1000) {
                const lastUser = metadata['System.LastUpdatedBy']?.value || rawDoc['System.LastUpdatedBy']?.value || 'Another user';
                return {
                    success: false,
                    conflict: {
                        expectedUpdatedAt: options.expectedUpdatedAt,
                        currentUpdatedAt: readResult.updatedAt,
                        lastUpdatedBy: lastUser
                    },
                    message: `Conflict: This project was modified on disk by ${lastUser} at ${readResult.updatedAt}.`
                };
            }
        }

        const nowIso = new Date().toISOString();
        const currentUser = options.userInfo?.username || 'Unknown';
        const currentGroup = options.userInfo?.groupname || 'System';
        const changes = [];

        // 1. Project Renaming
        let finalProjectName = projectName;
        let currentProjectPath = normProjectPath;

        if (patch.rename && patch.rename.newName) {
            const newName = String(patch.rename.newName).trim();
            if (newName && newName !== projectName) {
                const oldName = projectName;
                finalProjectName = newName;

                // Track previous names
                if (!Array.isArray(metadata.previous_names)) metadata.previous_names = [];
                if (!metadata.previous_names.includes(oldName)) {
                    metadata.previous_names.push(oldName);
                }
                if (isEnvelope) {
                    if (!Array.isArray(rawDoc.previous_names)) rawDoc.previous_names = [];
                    if (!rawDoc.previous_names.includes(oldName)) {
                        rawDoc.previous_names.push(oldName);
                    }
                }

                metadata.projectName = newName;
                if (isEnvelope) rawDoc.projectName = newName;

                changes.push({
                    field: 'projectName',
                    from: oldName,
                    to: newName,
                    op: 'renamed'
                });

                // Rename files if needed
                const sanitizedOld = oldName.replace(/[<>:"/\\|?*]/g, '_').trim();
                const sanitizedNew = newName.replace(/[<>:"/\\|?*]/g, '_').trim();

                const oldMetaFile = path.join(currentProjectPath, `${sanitizedOld}-metadata.json`);
                const newMetaFile = path.join(currentProjectPath, `${sanitizedNew}-metadata.json`);
                if (fsSync.existsSync(oldMetaFile) && oldMetaFile !== newMetaFile) {
                    await fs.rename(oldMetaFile, newMetaFile);
                    metadataPath = newMetaFile;
                    metadataFilename = `${sanitizedNew}-metadata.json`;
                }

                const oldReadmeFile = path.join(currentProjectPath, `${sanitizedOld}-README.html`);
                const newReadmeFile = path.join(currentProjectPath, `${sanitizedNew}-README.html`);
                if (fsSync.existsSync(oldReadmeFile) && oldReadmeFile !== newReadmeFile) {
                    await fs.rename(oldReadmeFile, newReadmeFile);
                }

                // Optional folder rename
                if (patch.rename.renameFolder === true) {
                    const parentDir = path.dirname(currentProjectPath);
                    const targetFolder = path.join(parentDir, sanitizedNew);
                    if (targetFolder !== currentProjectPath && !fsSync.existsSync(targetFolder)) {
                        await fs.rename(currentProjectPath, targetFolder);
                        currentProjectPath = targetFolder;
                        metadataPath = path.join(currentProjectPath, metadataFilename);
                        changes.push({
                            field: 'ProjectFolderPath',
                            from: normProjectPath,
                            to: currentProjectPath,
                            op: 'folder_renamed'
                        });
                    }
                }
            }
        }

        // 2. Metadata Field Patches (set & remove)
        if (Array.isArray(patch.set)) {
            for (const item of patch.set) {
                if (!item || !item.field) continue;
                const pathParts = Array.isArray(item.path) ? item.path : [String(item.path)];
                if (pathParts.length === 0 || !pathParts[0]) continue;

                let targetObj = metadata;
                for (let i = 0; i < pathParts.length - 1; i++) {
                    const groupKey = pathParts[i];
                    if (!targetObj[groupKey] || typeof targetObj[groupKey] !== 'object') {
                        targetObj[groupKey] = {};
                    }
                    targetObj = targetObj[groupKey];
                }

                const leafKey = pathParts[pathParts.length - 1];
                const oldVal = targetObj[leafKey];
                const oldDisplay = oldVal && typeof oldVal === 'object' && oldVal.value !== undefined ? oldVal.value : oldVal;

                targetObj[leafKey] = {
                    ...(typeof oldVal === 'object' && oldVal !== null && !Array.isArray(oldVal) ? oldVal : {}),
                    ...item.field,
                    isModified: true,
                    lastUpdatedBy: currentUser,
                    lastUpdatedAt: nowIso
                };

                const newDisplay = item.field.value !== undefined ? item.field.value : item.field;
                changes.push({
                    field: pathParts.join('.'),
                    from: oldDisplay !== undefined ? oldDisplay : null,
                    to: newDisplay,
                    op: oldVal !== undefined ? 'modified' : 'added'
                });
            }
        }

        if (Array.isArray(patch.remove)) {
            for (const item of patch.remove) {
                const pathParts = Array.isArray(item.path) ? item.path : [String(item.path)];
                if (pathParts.length === 0 || !pathParts[0]) continue;

                let targetObj = metadata;
                for (let i = 0; i < pathParts.length - 1; i++) {
                    const groupKey = pathParts[i];
                    if (!targetObj[groupKey] || typeof targetObj[groupKey] !== 'object') {
                        targetObj = null;
                        break;
                    }
                    targetObj = targetObj[groupKey];
                }

                if (targetObj) {
                    const leafKey = pathParts[pathParts.length - 1];
                    const oldVal = targetObj[leafKey];
                    if (oldVal !== undefined) {
                        delete targetObj[leafKey];
                        changes.push({
                            field: pathParts.join('.'),
                            from: oldVal && typeof oldVal === 'object' && oldVal.value !== undefined ? oldVal.value : oldVal,
                            to: null,
                            op: 'removed'
                        });
                    }
                }
            }
        }

        // 3. Notes Markdown
        if (patch.notes_markdown !== undefined) {
            const oldNotes = metadata.notes_markdown || '';
            const newNotes = String(patch.notes_markdown || '');
            if (oldNotes !== newNotes) {
                metadata.notes_markdown = newNotes;
                changes.push({
                    field: 'notes_markdown',
                    from: oldNotes.slice(0, 100),
                    to: newNotes.slice(0, 100),
                    op: 'modified'
                });
            }
        }

        // 4. Hypothesis / Goal
        if (patch.hypothesis_or_goal !== undefined) {
            const oldGoal = metadata.hypothesis_or_goal || '';
            const newGoal = String(patch.hypothesis_or_goal || '').trim();
            if (oldGoal !== newGoal) {
                metadata.hypothesis_or_goal = newGoal;
                changes.push({
                    field: 'hypothesis_or_goal',
                    from: oldGoal,
                    to: newGoal,
                    op: 'modified'
                });
            }
        }

        // 5. Notes Log (add, update, remove)
        if (!Array.isArray(metadata.notes_log)) {
            metadata.notes_log = [];
        }

        if (patch.notes_log) {
            // Add notes
            if (Array.isArray(patch.notes_log.add)) {
                for (const n of patch.notes_log.add) {
                    if (!n || !n.text) continue;
                    const newNote = {
                        id: n.id || `note_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
                        category: n.category || 'general',
                        text: String(n.text).trim(),
                        timestamp: n.timestamp || nowIso,
                        user: currentUser
                    };
                    metadata.notes_log.push(newNote);
                    changes.push({
                        field: 'notes_log',
                        action: `Note Added${newNote.category ? ` (${newNote.category})` : ''}`,
                        category: newNote.category,
                        text: newNote.text.slice(0, 80),
                        to: newNote.text.slice(0, 80),
                        op: 'added'
                    });
                }
            }

            // Update notes
            if (Array.isArray(patch.notes_log.update)) {
                for (const u of patch.notes_log.update) {
                    if (!u || !u.id) continue;
                    const idx = metadata.notes_log.findIndex(n => n.id === u.id);
                    if (idx >= 0) {
                        const existingNote = metadata.notes_log[idx];
                        const oldText = existingNote.text;
                        metadata.notes_log[idx] = {
                            ...existingNote,
                            category: u.category !== undefined ? u.category : existingNote.category,
                            text: u.text !== undefined ? String(u.text).trim() : existingNote.text,
                            edited_at: nowIso,
                            edited_by: currentUser
                        };
                        changes.push({
                            field: 'notes_log',
                            action: 'Note Edited',
                            id: u.id,
                            from: oldText ? oldText.slice(0, 80) : '',
                            to: metadata.notes_log[idx].text.slice(0, 80),
                            op: 'modified'
                        });
                    }
                }
            }

            // Remove notes
            if (Array.isArray(patch.notes_log.remove)) {
                for (const remId of patch.notes_log.remove) {
                    const idx = metadata.notes_log.findIndex(n => n.id === remId);
                    if (idx >= 0) {
                        const removed = metadata.notes_log.splice(idx, 1)[0];
                        changes.push({
                            field: 'notes_log',
                            action: 'Note Removed',
                            id: remId,
                            from: removed?.text ? removed.text.slice(0, 80) : '',
                            text: removed?.text ? removed.text.slice(0, 80) : '',
                            op: 'removed'
                        });
                    }
                }
            }
        }

        // 6. Sync [[Project]] Mentions with related_to
        const allNotesText = [
            metadata.notes_markdown || '',
            ...(metadata.notes_log || []).map(n => n.text || '')
        ].join('\n');
        syncMentionsWithRelatedTo(metadata, allNotesText);

        // 7. Update Audit History & Changelog
        metadata.updated_at = nowIso;
        if (!metadata.created_at) {
            metadata.created_at = readResult.createdAt || nowIso;
        }

        if (changes.length > 0) {
            if (!Array.isArray(metadata.changelog)) {
                metadata.changelog = [];
            }
            metadata.changelog.unshift({
                timestamp: nowIso,
                user: currentUser,
                action: options.action || (patch.notes_log?.add?.length ? 'Note Added' : 'Metadata Updated'),
                changes: changes
            });
            if (metadata.changelog.length > 100) {
                metadata.changelog = metadata.changelog.slice(0, 100);
            }

            // System Update History
            if (!metadata['System.UpdateHistory']) {
                metadata['System.UpdateHistory'] = { value: [], type: 'history' };
            }
            const historyList = Array.isArray(metadata['System.UpdateHistory'].value)
                ? metadata['System.UpdateHistory'].value
                : [];
            historyList.push({
                date: nowIso,
                user: currentUser,
                group: currentGroup,
                action: options.action || 'Metadata Updated'
            });
            metadata['System.UpdateHistory'] = { value: historyList, type: 'history' };
            metadata['System.LastUpdatedBy'] = { value: currentUser, type: 'user' };
            metadata['System.LastUpdatedAt'] = { value: nowIso, type: 'date' };
        }

        // 8. Prepare full JSON document for writing
        let fullDocument;
        if (isEnvelope) {
            rawDoc.extra_fields = metadata;
            rawDoc.updated_at = nowIso;
            if (metadata.previous_names) rawDoc.previous_names = metadata.previous_names;
            if (metadata.notes_markdown !== undefined) rawDoc.notes_markdown = metadata.notes_markdown;
            if (metadata.notes_log !== undefined) rawDoc.notes_log = metadata.notes_log;
            if (metadata.hypothesis_or_goal !== undefined) rawDoc.hypothesis_or_goal = metadata.hypothesis_or_goal;
            if (metadata.changelog) rawDoc.changelog = metadata.changelog;
            fullDocument = rawDoc;
        } else {
            fullDocument = metadata;
        }

        // 9. Atomic save to disk
        await atomicWriteJsonFile(metadataPath, fullDocument);
        console.log(`💾 Atomic metadata save completed: ${metadataPath}`);

        // 10. Regenerate README.html with preserved integration links
        try {
            const resolvedLinks = await integrationLinks.resolveIntegrationLinksForProject(currentProjectPath, fullDocument);
            // Also write resolved links back into doc if it was missing them (recovering legacy links)
            if (integrationLinks.persistIntegrationLinksIntoDocument(fullDocument, resolvedLinks)) {
                await atomicWriteJsonFile(metadataPath, fullDocument);
            }

            const readmeHtml = context.generateReadmeHtmlWithMetadata
                ? context.generateReadmeHtmlWithMetadata(fullDocument, finalProjectName, null, null, { integrationLinks: resolvedLinks })
                : null;

            if (readmeHtml) {
                const sanitizedFinal = finalProjectName.replace(/[<>:"/\\|?*]/g, '_').trim();
                const readmePath = path.join(currentProjectPath, `${sanitizedFinal}-README.html`);
                await fs.writeFile(readmePath, readmeHtml, 'utf8');
                console.log(`📄 README updated with preserved integration links: ${readmePath}`);
            }
        } catch (readmeErr) {
            console.warn(`⚠️ README regeneration warning for ${currentProjectPath}:`, readmeErr.message);
        }

        // 11. Living User Index Upsert (unless skipped, e.g. for temporary scans)
        let upsertedProject = null;
        if (options.updateIndex !== false && typeof context.upsertSingleProjectInUserIndex === 'function') {
            try {
                const upRes = await context.upsertSingleProjectInUserIndex(currentProjectPath, null, options.userInfo);
                if (upRes && upRes.success) {
                    upsertedProject = upRes.project;
                }
            } catch (idxErr) {
                console.warn('⚠️ user_index.json update warning:', idxErr.message);
            }
        }

        // If not in index, re-parse project directly for frontend response
        if (!upsertedProject && typeof context.parseMetaFoldProject === 'function') {
            try {
                upsertedProject = await context.parseMetaFoldProject(currentProjectPath, metadataFilename);
            } catch (_) {}
        }

        return {
            success: true,
            projectPath: currentProjectPath,
            projectName: finalProjectName,
            updatedAt: nowIso,
            changes,
            project: upsertedProject
        };
    });
}

function createProjectMetadataStore(context = {}) {
    return {
        updateProjectMetadata: (projectPath, patch, options) => updateProjectMetadata(projectPath, patch, options, context),
        readProjectMetadataFromDisk,
        findMetadataFileInDirectory
    };
}

module.exports = {
    createProjectMetadataStore,
    updateProjectMetadata,
    readProjectMetadataFromDisk,
    findMetadataFileInDirectory
};

