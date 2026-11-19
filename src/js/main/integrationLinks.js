/**
 * MetaFold Integration Links (main process only).
 *
 * Single source of truth for the "Integration Links" block (eLabFTW, OMERO, RSpace)
 * in <ProjectName>-README.html.
 *
 * Background: historically the links were injected into an already written README
 * via string manipulation (`insert-links-into-readme`). Any later full README
 * regeneration (metadata edit, lineage connect, extend metadata) silently dropped
 * them. This module makes the README generator render the block itself and
 * resolves links from (in priority order):
 *   1. explicit overrides passed by the caller (fresh upload results)
 *   2. the project's metadata JSON (`metafold_integration.external_links`, `integrations`)
 *   3. the currently existing README.html (legacy projects whose links only live there)
 */
'use strict';

const fs = require('fs').promises;
const path = require('path');
const markdownLite = require('../shared/markdownLite.js');

const LINK_KEYS = ['elabftw', 'omero', 'rspace'];
const MARKER_START = '<!-- metafold:integration-links:start -->';
const MARKER_END = '<!-- metafold:integration-links:end -->';

const INTEGRATION_LINKS_CSS = `
        /* Integration Links Styles */
        .integration-section {
            background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05));
            border: 1px solid rgba(34, 197, 94, 0.2);
            border-left: 4px solid #22c55e;
        }
        .integration-links { display: flex; flex-direction: column; gap: 12px; }
        .integration-link {
            display: flex; align-items: center; padding: 15px 20px;
            background: rgba(0, 0, 0, 0.2); border-radius: 12px; text-decoration: none;
            color: #e0e0e0; transition: all 0.3s ease; border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .integration-link:hover {
            background: rgba(34, 197, 94, 0.1); transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2); border-color: rgba(34, 197, 94, 0.3);
        }
        .integration-link:visited { color: #e0e0e0; }
        .link-icon { font-size: 1.5rem; margin-right: 15px; min-width: 30px; }
        .link-text { font-size: 1rem; font-weight: 500; }`;

function emptyLinks() {
    return { elabftw: null, omero: null, rspace: null };
}

function cleanUrl(url) {
    if (!url || typeof url !== 'string') return null;
    return markdownLite.sanitizeUrl(url.trim());
}

function linkFromAny(obj) {
    if (!obj) return null;
    if (typeof obj === 'string') {
        const url = cleanUrl(obj);
        return url ? { url } : null;
    }
    if (typeof obj === 'object') {
        const url = cleanUrl(obj.url || obj.link || obj.webUrl || obj.documentUrl);
        if (!url) return null;
        const link = { url };
        if (obj.group_name || obj.groupName) link.group_name = String(obj.group_name || obj.groupName);
        if (obj.uploaded_at || obj.uploadedAt || obj.last_synced_at) {
            link.uploaded_at = String(obj.uploaded_at || obj.uploadedAt || obj.last_synced_at);
        }
        if (obj.user_name || obj.userName || obj.sent_by) {
            link.user_name = String(obj.user_name || obj.userName || obj.sent_by);
        }
        if (obj.experiment_id || obj.experimentId) link.experiment_id = String(obj.experiment_id || obj.experimentId);
        if (obj.dataset_id || obj.datasetId) link.dataset_id = String(obj.dataset_id || obj.datasetId);
        if (obj.project_id || obj.projectId) link.project_id = String(obj.project_id || obj.projectId);
        if (obj.document_id || obj.documentId) link.document_id = String(obj.document_id || obj.documentId);
        if (obj.object_type || obj.objectType) link.object_type = String(obj.object_type || obj.objectType);
        return link;
    }
    return null;
}

/**
 * Extracts integration links from a metadata object (flat or elabFTW envelope).
 */
function normalizeIntegrationLinks(metadata) {
    const links = emptyLinks();
    if (!metadata || typeof metadata !== 'object') return links;

    const candidates = [metadata];
    if (metadata.extra_fields && typeof metadata.extra_fields === 'object') {
        candidates.push(metadata.extra_fields);
    }

    for (const src of candidates) {
        const ext = src.metafold_integration && src.metafold_integration.external_links;
        const legacy = src.integrations;
        const sources = [ext, legacy].filter(s => s && typeof s === 'object');
        for (const s of sources) {
            if (!links.elabftw) links.elabftw = linkFromAny(s.elabftw || s.elabFTW || s.eLabFTW);
            if (!links.omero) links.omero = linkFromAny(s.omero || s.OMERO);
            if (!links.rspace) links.rspace = linkFromAny(s.rspace || s.RSpace);
        }
    }
    return links;
}

/**
 * Merges several link objects; earlier arguments win.
 */
function mergeIntegrationLinks(...linkSets) {
    const extraFields = ['group_name', 'uploaded_at', 'user_name', 'experiment_id', 'dataset_id', 'project_id', 'document_id', 'object_type'];
    const merged = emptyLinks();
    for (const set of linkSets) {
        if (!set) continue;
        for (const key of LINK_KEYS) {
            if (!merged[key] && set[key] && set[key].url) {
                merged[key] = { ...set[key] };
            } else if (merged[key] && set[key] && (!set[key].url || merged[key].url === set[key].url)) {
                for (const field of extraFields) {
                    if (!merged[key][field] && set[key][field]) {
                        merged[key][field] = set[key][field];
                    }
                }
            }
        }
    }
    return merged;
}

function hasAnyLink(links) {
    return !!(links && LINK_KEYS.some(k => links[k] && links[k].url));
}

function decodeHtmlEntities(str) {
    return String(str || '')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

/**
 * Parses integration links out of an existing README.html (legacy + current markup).
 */
function extractIntegrationLinksFromReadmeHtml(html) {
    const links = emptyLinks();
    if (!html || typeof html !== 'string') return links;

    const anchorRe = /<a\s+[^>]*class="integration-link"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = anchorRe.exec(html)) !== null) {
        const tag = match[0];
        const inner = match[1];
        const hrefMatch = /href="([^"]*)"/i.exec(tag);
        if (!hrefMatch) continue;
        const url = cleanUrl(decodeHtmlEntities(hrefMatch[1]));
        if (!url) continue;

        const text = inner.replace(/<[^>]+>/g, ' ');
        let key = null;
        if (/elab\s*ftw/i.test(text)) key = 'elabftw';
        else if (/omero/i.test(text)) key = 'omero';
        else if (/rspace/i.test(text)) key = 'rspace';
        if (!key || links[key]) continue;

        links[key] = { url };
        if (key === 'omero') {
            const grp = /\(Group:\s*([^)]+)\)/i.exec(text);
            if (grp) links.omero.group_name = decodeHtmlEntities(grp[1].trim());
        }
    }
    return links;
}

/**
 * Reads every *-README.html in the project folder and extracts links.
 */
async function readIntegrationLinksFromExistingReadmes(projectPath, preferredProjectName = null) {
    try {
        const entries = await fs.readdir(projectPath, { withFileTypes: true });
        let readmes = entries.filter(e => e.isFile() && /-README\.html$/i.test(e.name));
        if (preferredProjectName) {
            const sanitized = preferredProjectName.replace(/[<>:"/\\|?*]/g, '_').trim();
            const expectedName = `${sanitized}-README.html`.toLowerCase();
            readmes = readmes.filter(e => e.name.toLowerCase() === expectedName);
        }
        let merged = emptyLinks();
        for (const entry of readmes) {
            try {
                const html = await fs.readFile(path.join(projectPath, entry.name), 'utf8');
                merged = mergeIntegrationLinks(merged, extractIntegrationLinksFromReadmeHtml(html));
            } catch (_) { /* unreadable README – ignore */ }
        }
        return merged;
    } catch (_) {
        return emptyLinks();
    }
}

/**
 * Resolves the final links for a README (overrides > metadata JSON > existing README).
 */
async function resolveIntegrationLinksForProject(projectPath, metadata, overrides = null, preferredProjectName = null) {
    const fromMeta = normalizeIntegrationLinks(metadata);
    const fromReadme = projectPath ? await readIntegrationLinksFromExistingReadmes(projectPath, preferredProjectName) : emptyLinks();
    return mergeIntegrationLinks(overrides, fromMeta, fromReadme);
}

/**
 * Builds overrides from positional (legacy IPC) arguments.
 */
function linksFromArgs({ elabftwUrl = null, omeroUrl = null, rspaceUrl = null, omeroGroupName = null, uploadedAt = null } = {}) {
    const links = emptyLinks();
    const ts = uploadedAt || new Date().toISOString();
    if (cleanUrl(elabftwUrl)) links.elabftw = { url: cleanUrl(elabftwUrl), uploaded_at: ts };
    if (cleanUrl(omeroUrl)) {
        links.omero = { url: cleanUrl(omeroUrl), uploaded_at: ts };
        if (omeroGroupName) links.omero.group_name = String(omeroGroupName);
    }
    if (cleanUrl(rspaceUrl)) links.rspace = { url: cleanUrl(rspaceUrl), uploaded_at: ts };
    return links;
}

function formatSentTimestamp(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return String(isoStr);
        return d.toLocaleString();
    } catch (_) {
        return String(isoStr);
    }
}

/**
 * Renders the Integration Links section (wrapped in markers). Empty string if no links.
 */
function renderIntegrationLinksSection(links) {
    if (!hasAnyLink(links)) return '';
    const esc = markdownLite.escapeHtml;
    let html = `
            ${MARKER_START}
            <section class="section integration-section">
                <h2 class="section-title">
                    <span class="section-icon">🔗</span>
                    Integration Links
                </h2>
                <div class="integration-links">`;

    if (links.elabftw && links.elabftw.url) {
        const metaParts = [];
        if (links.elabftw.experiment_id) metaParts.push(`ID: ${esc(links.elabftw.experiment_id)}`);
        if (links.elabftw.user_name) metaParts.push(`by ${esc(links.elabftw.user_name)}`);
        if (links.elabftw.uploaded_at) metaParts.push(`🕒 Sent: ${esc(formatSentTimestamp(links.elabftw.uploaded_at))}`);
        const metaHtml = metaParts.length > 0
            ? `<span class="link-meta" style="font-size: 0.85em; opacity: 0.8;">${metaParts.join(' · ')}</span>`
            : '';
        html += `
                    <a href="${esc(links.elabftw.url)}" class="integration-link" target="_blank" rel="noopener noreferrer">
                        <span class="link-icon">🧪</span>
                        <div class="link-content" style="display:flex; flex-direction:column;">
                            <span class="link-text">Open in elabFTW</span>
                            ${metaHtml}
                        </div>
                    </a>`;
    }
    if (links.omero && links.omero.url) {
        const metaParts = [];
        if (links.omero.group_name) metaParts.push(`(Group: ${esc(links.omero.group_name)})`);
        const omeroId = links.omero.dataset_id || links.omero.project_id;
        if (omeroId) metaParts.push(`ID: ${esc(omeroId)}`);
        if (links.omero.user_name) metaParts.push(`by ${esc(links.omero.user_name)}`);
        if (links.omero.uploaded_at) metaParts.push(`🕒 Sent: ${esc(formatSentTimestamp(links.omero.uploaded_at))}`);
        const metaHtml = metaParts.length > 0
            ? `<span class="link-meta" style="font-size: 0.85em; opacity: 0.8;">${metaParts.join(' · ')}</span>`
            : '';
        html += `
                    <a href="${esc(links.omero.url)}" class="integration-link" target="_blank" rel="noopener noreferrer">
                        <span class="link-icon">🔵</span>
                        <div class="link-content" style="display:flex; flex-direction:column;">
                            <span class="link-text">Open in OMERO</span>
                            ${metaHtml}
                        </div>
                    </a>`;
    }
    if (links.rspace && links.rspace.url) {
        const metaParts = [];
        if (links.rspace.document_id) metaParts.push(`ID: ${esc(links.rspace.document_id)}`);
        if (links.rspace.user_name) metaParts.push(`by ${esc(links.rspace.user_name)}`);
        if (links.rspace.uploaded_at) metaParts.push(`🕒 Sent: ${esc(formatSentTimestamp(links.rspace.uploaded_at))}`);
        const metaHtml = metaParts.length > 0
            ? `<span class="link-meta" style="font-size: 0.85em; opacity: 0.8;">${metaParts.join(' · ')}</span>`
            : '';
        html += `
                    <a href="${esc(links.rspace.url)}" class="integration-link" target="_blank" rel="noopener noreferrer">
                        <span class="link-icon">📝</span>
                        <div class="link-content" style="display:flex; flex-direction:column;">
                            <span class="link-text">Open in RSpace</span>
                            ${metaHtml}
                        </div>
                    </a>`;
    }
    html += `
                </div>
            </section>
            ${MARKER_END}`;
    return html;
}

/**
 * Replaces (or inserts) the Integration Links block inside an existing README string.
 * Removes all previous blocks (marker-delimited and legacy unmarked ones) to avoid duplicates.
 */
function replaceIntegrationLinksInHtml(html, links) {
    let out = String(html || '');
    // 1. Remove marker-delimited blocks
    const markerRe = new RegExp(`${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}`, 'g');
    out = out.replace(markerRe, '');
    // 2. Remove legacy unmarked sections (sections contain no nested <section>)
    out = out.replace(/<section class="section integration-section">[\s\S]*?<\/section>/g, '');

    // 3. Ensure CSS exists (older READMEs)
    if (!out.includes('.integration-section')) {
        out = out.replace('</style>', INTEGRATION_LINKS_CSS + '\n        </style>');
    }

    // 4. Insert fresh block at the top of <main class="content">
    const section = renderIntegrationLinksSection(links);
    if (section) {
        const contentStart = out.indexOf('<main class="content">');
        if (contentStart !== -1) {
            const insertPos = out.indexOf('>', contentStart) + 1;
            out = out.slice(0, insertPos) + section + out.slice(insertPos);
        }
    }
    return out;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Writes links into a metadata document under metafold_integration.external_links
 * (only fills missing entries – never overwrites richer existing info).
 * Returns true if the document was modified.
 */
function persistIntegrationLinksIntoDocument(doc, links) {
    if (!doc || typeof doc !== 'object' || !hasAnyLink(links)) return false;
    let modified = false;
    if (!doc.metafold_integration || typeof doc.metafold_integration !== 'object') {
        doc.metafold_integration = { created_at: new Date().toISOString(), external_links: {} };
        modified = true;
    }
    if (!doc.metafold_integration.external_links || typeof doc.metafold_integration.external_links !== 'object') {
        doc.metafold_integration.external_links = {};
        modified = true;
    }
    const ext = doc.metafold_integration.external_links;
    for (const key of LINK_KEYS) {
        if (links[key] && links[key].url && !(ext[key] && (ext[key].url || ext[key].link))) {
            ext[key] = { ...links[key], status: 'recovered_from_readme', recovered_at: new Date().toISOString() };
            modified = true;
        }
    }
    return modified;
}

module.exports = {
    INTEGRATION_LINKS_CSS,
    MARKER_START,
    MARKER_END,
    emptyLinks,
    hasAnyLink,
    linksFromArgs,
    normalizeIntegrationLinks,
    mergeIntegrationLinks,
    extractIntegrationLinksFromReadmeHtml,
    readIntegrationLinksFromExistingReadmes,
    resolveIntegrationLinksForProject,
    renderIntegrationLinksSection,
    replaceIntegrationLinksInHtml,
    persistIntegrationLinksIntoDocument
};

