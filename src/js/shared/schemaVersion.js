/**
 * MetaFold Schema Version & Envelope Helper (v0.1)
 *
 * Shared between Electron main process (CommonJS) and renderer process (window.metafoldSchema).
 * Defines schema version constants, schemaType identifiers, reserved envelope keys,
 * and backward-compatible version detection ("0.0" for legacy files without schemaVersion).
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.metafoldSchema = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const SCHEMA_VERSION = '0.1';
    const LEGACY_SCHEMA_VERSION = '0.0';

    const SCHEMA_TYPES = Object.freeze({
        PROJECT_METADATA: 'metafold-project-metadata',
        SIDECAR: 'metafold-sidecar',
        TEMPLATE: 'metafold-template',
        USER_INDEX: 'metafold-user-index',
        USERS: 'metafold-users',
        GROUPS: 'metafold-groups',
        SCAN_SUMMARY: 'metafold-scan-summary',
        LINEAGE_EXPORT: 'metafold-lineage-export',
        VISUALIZATION_EXPORT: 'metafold-visualization-export',
        ID_DICTIONARY: 'metafold-id-dictionary',
        TEMPLATE_DEFAULTS: 'metafold-template-defaults'
    });

    /**
     * Reserved top-level keys in <ProjectName>-metadata.json and ReadyToImport.json
     * that belong to the system envelope and must NEVER be rendered or exported
     * as user experiment fields.
     */
    const RESERVED_PROJECT_KEYS = Object.freeze([
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
        'community',
        'extra_fields',
        'metadata',
        'elabftw',
        '_metafold'
    ]);

    const RESERVED_PROJECT_KEY_SET = new Set(RESERVED_PROJECT_KEYS);

    /**
     * Returns the schemaVersion of a parsed JSON document, or "0.0" if missing (legacy).
     * Also checks nested metadata.extra_fields for eLabFTW envelope documents.
     *
     * @param {Object} doc - Parsed JSON object
     * @returns {string} Schema version string (e.g. "0.1" or "0.0")
     */
    function getSchemaVersion(doc) {
        if (!doc || typeof doc !== 'object') {
            return LEGACY_SCHEMA_VERSION;
        }
        if (typeof doc.schemaVersion === 'string' && doc.schemaVersion.trim().length > 0) {
            return doc.schemaVersion.trim();
        }
        if (
            doc.metadata &&
            doc.metadata.extra_fields &&
            typeof doc.metadata.extra_fields.schemaVersion === 'string' &&
            doc.metadata.extra_fields.schemaVersion.trim().length > 0
        ) {
            return doc.metadata.extra_fields.schemaVersion.trim();
        }
        return LEGACY_SCHEMA_VERSION;
    }

    /**
     * Checks whether a top-level key in a project metadata object is a reserved
     * system/envelope key (as opposed to a user experiment field).
     *
     * @param {string} key
     * @returns {boolean}
     */
    function isReservedProjectKey(key) {
        if (!key || typeof key !== 'string') return true;
        if (RESERVED_PROJECT_KEY_SET.has(key)) return true;
        if (key.startsWith('System.') || key.startsWith('_')) return true;
        return false;
    }

    /**
     * Builds the standardized v0.1 human-readable template reference block
     * for <ProjectName>-metadata.json.
     *
     * @param {Object} [template]
     * @param {string} [fallbackName]
     * @returns {{ id: string|null, uuid?: string|null, name: string, category: string|null, derivedFromTemplateId?: string, derivedFromTemplateUuid?: string }}
     */
    function buildTemplateRef(template, fallbackName) {
        const tpl = template && typeof template === 'object' ? template : {};
        const ref = {
            id: tpl.id || null,
            name: tpl.name || fallbackName || 'Unknown Template',
            category: tpl.category || null
        };
        if (tpl.uuid) {
            ref.uuid = tpl.uuid;
        }
        if (tpl.derivedFromTemplateId) {
            ref.derivedFromTemplateId = tpl.derivedFromTemplateId;
        }
        if (tpl.derivedFromTemplateUuid) {
            ref.derivedFromTemplateUuid = tpl.derivedFromTemplateUuid;
        }
        return ref;
    }

    return {
        SCHEMA_VERSION,
        LEGACY_SCHEMA_VERSION,
        SCHEMA_TYPES,
        RESERVED_PROJECT_KEYS,
        getSchemaVersion,
        isReservedProjectKey,
        buildTemplateRef
    };
}));
