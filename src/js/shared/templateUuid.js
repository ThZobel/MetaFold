/**
 * MetaFold Template UUID & Compact QR/DataMatrix URI Helper
 *
 * Shared between Electron main process (CommonJS) and renderer process (window.metafoldTemplateUuid).
 * Provides RFC 4122 UUID v4 generation, normalization, validation, and compact URI parsing
 * (`metafold:tpl:<uuid>`, `metafold://template/<uuid>`, raw UUID, or query/hash UUID params).
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.metafoldTemplateUuid = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const TEMPLATE_URI_PREFIX = 'metafold:tpl:';
    const PROJECT_URI_PREFIX = 'metafold:proj:';
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const EMBEDDED_UUID_REGEX = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i;

    /**
     * Check whether a value is a valid RFC 4122 UUID (v1-v5).
     * @param {*} value
     * @returns {boolean}
     */
    function isValidUuid(value) {
        return typeof value === 'string' && UUID_REGEX.test(value.trim());
    }

    /**
     * Return canonical lowercase UUID string or null when invalid.
     * @param {*} value
     * @returns {string|null}
     */
    function normalizeUuid(value) {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim().toLowerCase();
        return UUID_REGEX.test(trimmed) ? trimmed : null;
    }

    /**
     * Generate a new RFC 4122 v4 UUID string (lowercase).
     * @returns {string}
     */
    function generateTemplateUuid() {
        try {
            if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
                return globalThis.crypto.randomUUID().toLowerCase();
            }
        } catch (_) {
            // Fall through to Node crypto or PRNG fallback
        }

        try {
            if (typeof require === 'function') {
                const nodeCrypto = require('crypto');
                if (nodeCrypto && typeof nodeCrypto.randomUUID === 'function') {
                    return nodeCrypto.randomUUID().toLowerCase();
                }
            }
        } catch (_) {
            // Fall through
        }

        const bytes = new Uint8Array(16);
        try {
            if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
                globalThis.crypto.getRandomValues(bytes);
            } else {
                for (let i = 0; i < 16; i++) {
                    bytes[i] = Math.floor(Math.random() * 256);
                }
            }
        } catch (_) {
            for (let i = 0; i < 16; i++) {
                bytes[i] = Math.floor(Math.random() * 256);
            }
        }

        bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant

        const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0'));
        return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
    }

    /**
     * Return the template's normalized UUID if valid, or generate a new one.
     * Does not mutate the input object.
     * @param {Object} [template]
     * @returns {string}
     */
    function ensureTemplateUuid(template) {
        if (template && typeof template === 'object') {
            const existing = normalizeUuid(template.uuid);
            if (existing) return existing;
        }
        return generateTemplateUuid();
    }

    /**
     * Return a shallow/updated copy or mutate in place with a valid uuid.
     * @param {Object} template
     * @param {boolean} [forceNew=false]
     * @returns {string} Assigned UUID
     */
    function assignTemplateUuid(template, forceNew = false) {
        if (!template || typeof template !== 'object') {
            return generateTemplateUuid();
        }
        const nextUuid = forceNew ? generateTemplateUuid() : ensureTemplateUuid(template);
        template.uuid = nextUuid;
        return nextUuid;
    }

    /**
     * Format compact MetaFold URI for QR/DataMatrix encoding.
     * @param {string} uuid
     * @returns {string|null}
     */
    function formatTemplateUri(uuid) {
        const normalized = normalizeUuid(uuid);
        return normalized ? `${TEMPLATE_URI_PREFIX}${normalized}` : null;
    }

    /**
     * Parse scanned/entered template codes into canonical UUID.
     * Supports:
     * - `metafold:tpl:<uuid>`
     * - `metafold://template/<uuid>`
     * - bare `<uuid>`
     * - URLs containing `templateUuid=<uuid>` or `tpl=<uuid>` (query or hash)
     *
     * @param {*} rawInput
     * @returns {{ matched: boolean, uuid: string|null, format: 'uri'|'raw'|'url'|null }}
     */
    function parseTemplateCode(rawInput) {
        if (typeof rawInput !== 'string') {
            return { matched: false, uuid: null, format: null };
        }
        const trimmed = rawInput.trim();
        if (!trimmed) {
            return { matched: false, uuid: null, format: null };
        }

        // 1. Compact MetaFold URI: metafold:tpl:<uuid>
        const tplUriMatch = trimmed.match(/^metafold:tpl:([^\s?#]+)/i);
        if (tplUriMatch) {
            const uuid = normalizeUuid(tplUriMatch[1]);
            if (uuid) {
                return { matched: true, uuid, format: 'uri' };
            }
        }

        // 2. Deep-link scheme: metafold://template/<uuid>
        const schemeMatch = trimmed.match(/^metafold:\/\/template\/([^\s?#]+)/i);
        if (schemeMatch) {
            const uuid = normalizeUuid(schemeMatch[1]);
            if (uuid) {
                return { matched: true, uuid, format: 'uri' };
            }
        }

        // 3. Bare UUID string
        const rawUuid = normalizeUuid(trimmed);
        if (rawUuid) {
            return { matched: true, uuid: rawUuid, format: 'raw' };
        }

        // 4. URL query or hash parameter (?templateUuid=... / ?tpl=... / #tpl=...)
        const paramMatch = trimmed.match(/(?:[?&#](?:templateUuid|tpl)=)([^&#\s]+)/i);
        if (paramMatch) {
            let candidate = paramMatch[1];
            try {
                candidate = decodeURIComponent(candidate);
            } catch (_) {
                // Use raw captured token
            }
            const extracted = candidate.match(EMBEDDED_UUID_REGEX);
            const uuid = extracted ? normalizeUuid(extracted[1]) : normalizeUuid(candidate);
            if (uuid) {
                return { matched: true, uuid, format: 'url' };
            }
        }

        return { matched: false, uuid: null, format: null };
    }

    /**
     * Format compact MetaFold Project URI for QR/DataMatrix encoding.
     * @param {string} uuid
     * @returns {string|null}
     */
    function formatProjectUri(uuid) {
        const normalized = normalizeUuid(uuid);
        return normalized ? `${PROJECT_URI_PREFIX}${normalized}` : null;
    }

    /**
     * Parse scanned/entered project codes into canonical UUID.
     * Strictly ignores template URIs (`metafold:tpl:...`, `metafold://template/...`).
     * Supports:
     * - `metafold:proj:<uuid>`
     * - `metafold://project/<uuid>`
     * - bare `<uuid>`
     * - URLs containing `projectUuid=<uuid>` or `proj=<uuid>` (query or hash)
     *
     * @param {*} rawInput
     * @returns {{ matched: boolean, uuid: string|null, format: 'uri'|'raw'|'url'|null }}
     */
    function parseProjectCode(rawInput) {
        if (typeof rawInput !== 'string') {
            return { matched: false, uuid: null, format: null };
        }
        const trimmed = rawInput.trim();
        if (!trimmed) {
            return { matched: false, uuid: null, format: null };
        }

        // 1. Compact MetaFold Project URI: metafold:proj:<uuid>
        const projUriMatch = trimmed.match(/^metafold:proj:([^\s?#]+)/i);
        if (projUriMatch) {
            const uuid = normalizeUuid(projUriMatch[1]);
            if (uuid) {
                return { matched: true, uuid, format: 'uri' };
            }
        }

        // 2. Deep-link scheme: metafold://project/<uuid>
        const schemeMatch = trimmed.match(/^metafold:\/\/project\/([^\s?#]+)/i);
        if (schemeMatch) {
            const uuid = normalizeUuid(schemeMatch[1]);
            if (uuid) {
                return { matched: true, uuid, format: 'uri' };
            }
        }

        // 3. Bare UUID string
        const rawUuid = normalizeUuid(trimmed);
        if (rawUuid) {
            return { matched: true, uuid: rawUuid, format: 'raw' };
        }

        // 4. URL query or hash parameter (?projectUuid=... / ?proj=... / #proj=...)
        const paramMatch = trimmed.match(/(?:[?&#](?:projectUuid|proj)=)([^&#\s]+)/i);
        if (paramMatch) {
            let candidate = paramMatch[1];
            try {
                candidate = decodeURIComponent(candidate);
            } catch (_) {
                // Use raw captured token
            }
            const extracted = candidate.match(EMBEDDED_UUID_REGEX);
            const uuid = extracted ? normalizeUuid(extracted[1]) : normalizeUuid(candidate);
            if (uuid) {
                return { matched: true, uuid, format: 'url' };
            }
        }

        return { matched: false, uuid: null, format: null };
    }

    /**
     * Extract canonical project UUID from a scanned URI/code, or return trimmed input unchanged
     * for non-UUID sample IDs, project names, and anchors.
     * @param {*} rawInput
     * @returns {*}
     */
    function extractProjectRefId(rawInput) {
        if (typeof rawInput !== 'string') {
            return rawInput;
        }
        const trimmed = rawInput.trim();
        if (!trimmed) {
            return trimmed;
        }
        const parsed = parseProjectCode(trimmed);
        if (parsed.matched && parsed.uuid) {
            return parsed.uuid;
        }
        return trimmed;
    }

    return {
        TEMPLATE_URI_PREFIX,
        PROJECT_URI_PREFIX,
        UUID_REGEX,
        isValidUuid,
        normalizeUuid,
        generateTemplateUuid,
        ensureTemplateUuid,
        assignTemplateUuid,
        formatTemplateUri,
        parseTemplateCode,
        formatProjectUri,
        parseProjectCode,
        extractProjectRefId
    };
}));
