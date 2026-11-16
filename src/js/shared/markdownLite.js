/**
 * MetaFold Markdown-Lite — safe micro-markdown renderer shared by the
 * Electron main process (README.html generation) and the renderer
 * (Discovery details panel, note composer).
 *
 * Security model:
 *   - ALL input text is HTML-escaped first. Markup is only produced by this
 *     module from a strict whitelist; no raw HTML from user input survives.
 *   - Links are only emitted for whitelisted schemes (http, https, mailto, file).
 *   - Interactive elements (task checkboxes, project mentions, local paths) are
 *     emitted with data-* attributes only (no inline event handlers), so callers
 *     must use event delegation.
 *
 * Supported syntax (intentionally small):
 *   # / ## / ###  Heading          (requires a space after the hashes)
 *   - item / * item / • item        Bullet list
 *   1. item                         Ordered list
 *   - [ ] task / - [x] task         Task list (checkbox)
 *   **bold**, *italic*, `code`
 *   [label](https://url)            Markdown link
 *   https://bare.url                Auto-link
 *   C:\path\to\data, \\server\share  Local path (clickable in the app)
 *   #tag                            Tag chip
 *   [[Project Name]]                Project mention
 *
 * Exposed as `window.markdownLite` in the browser and via `module.exports` in Node.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (typeof window !== 'undefined') {
        window.markdownLite = api;
    } else if (root) {
        root.markdownLite = api;
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:', 'file:'];

    // Regex building blocks (kept in one place so extraction and rendering stay consistent)
    const URL_RE = /\bhttps?:\/\/[^\s<>"'`\]\)]+[^\s<>"'`\]\).,;:!?]/g;
    const WIN_PATH_RE = /(?:^|[\s(])((?:[A-Za-z]:\\|\\\\[^\s\\]+\\)[^\s<>"|?*]*[^\s<>"|?*.,;:!)])/g;
    const MENTION_RE = /\[\[([^\[\]\n]{1,200})\]\]/g;
    const TAG_RE = /(^|[\s(])#([A-Za-z0-9\u00C0-\u024F][\w\u00C0-\u024F\-\/]{0,63})/g;
    const MD_LINK_RE = /\[([^\[\]\n]{1,300})\]\(([^()\s]{1,2000})\)/g;
    const TASK_LINE_RE = /^(\s*)(?:[-*•])\s+\[( |x|X)\]\s?(.*)$/;

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Attribute values use the same escaping (double + single quotes are encoded).
    const escapeAttr = escapeHtml;

    /**
     * Returns a normalized, safe URL string or null if the scheme is not allowed.
     */
    function sanitizeUrl(url) {
        if (!url || typeof url !== 'string') return null;
        const trimmed = url.trim();
        // Reject control characters and whitespace inside URLs
        if (/[\u0000-\u001F\u007F\s]/.test(trimmed)) return null;
        try {
            const parsed = new URL(trimmed);
            if (!ALLOWED_SCHEMES.includes(parsed.protocol)) return null;
            return parsed.href;
        } catch (_) {
            return null;
        }
    }

    /** Converts a Windows/UNC path to a file:/// URL (used for static README output). */
    function pathToFileUrl(p) {
        if (!p) return null;
        let normalized = String(p).replace(/\\/g, '/');
        if (normalized.startsWith('//')) {
            normalized = 'file:' + normalized; // UNC → file://server/share
        } else {
            normalized = 'file:///' + normalized;
        }
        return sanitizeUrl(encodeURI(normalized));
    }

    // ------------------------------------------------------------------
    // Inline rendering
    // ------------------------------------------------------------------

    /**
     * Renders inline markup. Works on RAW text: tokens are extracted first,
     * the remaining text is escaped, then tokens are re-inserted as safe HTML.
     */
    function renderInline(rawText, options = {}) {
        const opts = Object.assign({ mode: 'app' }, options);
        const tokens = [];
        const placeholder = (html) => {
            tokens.push(html);
            return `\u0000${tokens.length - 1}\u0000`;
        };

        let text = String(rawText === null || rawText === undefined ? '' : rawText);
        // Strip any placeholder characters the user might have typed
        text = text.replace(/\u0000/g, '');

        // 1. Inline code (content is literal)
        text = text.replace(/`([^`\n]{1,500})`/g, (m, code) => placeholder(`<code class="mf-md-code">${escapeHtml(code)}</code>`));

        // 2. Markdown links [label](url)
        text = text.replace(MD_LINK_RE, (m, label, url) => {
            const safe = sanitizeUrl(url);
            if (!safe) return m;
            return placeholder(renderLinkHtml(safe, label, opts));
        });

        // 3. Project mentions [[Name]]
        text = text.replace(MENTION_RE, (m, name) => {
            const clean = name.trim();
            if (!clean) return m;
            if (opts.mode === 'readme') {
                return placeholder(`<span class="mf-md-mention">🔗 ${escapeHtml(clean)}</span>`);
            }
            return placeholder(`<a href="#" class="mf-md-mention" data-mf-project="${escapeAttr(clean)}" title="Related project (related_to): ${escapeAttr(clean)} — click to open or filter">🔗 ${escapeHtml(clean)}</a>`);
        });

        // 4. Bare URLs
        text = text.replace(URL_RE, (m) => {
            const safe = sanitizeUrl(m);
            return safe ? placeholder(renderLinkHtml(safe, m, opts)) : m;
        });

        // 5. Local Windows / UNC paths
        text = text.replace(WIN_PATH_RE, (m, p) => {
            const prefix = m.slice(0, m.length - p.length);
            if (opts.mode === 'readme') {
                const fileUrl = pathToFileUrl(p);
                const inner = fileUrl
                    ? `<a href="${escapeAttr(fileUrl)}" class="mf-md-path">📁 ${escapeHtml(p)}</a>`
                    : `<span class="mf-md-path">📁 ${escapeHtml(p)}</span>`;
                return prefix + placeholder(inner);
            }
            return prefix + placeholder(`<a href="#" class="mf-md-path" data-mf-path="${escapeAttr(p)}" title="Show in Explorer">📁 ${escapeHtml(p)}</a>`);
        });

        // 6. Tags (#tag) — after URLs so URL fragments are already tokenized
        text = text.replace(TAG_RE, (m, lead, tag) => {
            if (opts.mode === 'readme') {
                return lead + placeholder(`<span class="mf-md-tag">#${escapeHtml(tag)}</span>`);
            }
            return lead + placeholder(`<a href="#" class="mf-md-tag" data-mf-tag="${escapeAttr(tag)}" title="Filter table by tag #${escapeAttr(tag)}">🏷️ #${escapeHtml(tag)}</a>`);
        });

        // 7. Escape the rest
        text = escapeHtml(text);

        // 8. Emphasis on escaped text (no HTML can be injected here anymore)
        text = text.replace(/\*\*([^*\n]{1,500})\*\*/g, '<strong>$1</strong>');
        text = text.replace(/(^|[^*\w])\*([^*\n]{1,500})\*(?!\*)/g, '$1<em>$2</em>');

        // 9. Restore tokens
        text = text.replace(/\u0000(\d+)\u0000/g, (m, idx) => tokens[Number(idx)] || '');
        return text;
    }

    function renderLinkHtml(safeUrl, label, opts) {
        const safeLabel = escapeHtml(label);
        if (opts.mode === 'readme') {
            return `<a href="${escapeAttr(safeUrl)}" class="mf-md-link" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
        }
        return `<a href="#" class="mf-md-link" data-mf-url="${escapeAttr(safeUrl)}" title="${escapeAttr(safeUrl)}">${safeLabel}</a>`;
    }

    // ------------------------------------------------------------------
    // Block rendering
    // ------------------------------------------------------------------

    /**
     * Renders micro-markdown to safe HTML.
     * @param {string} markdown
     * @param {Object} [options]
     * @param {'app'|'readme'} [options.mode='app'] - 'readme' emits static, self-contained HTML
     * @param {boolean} [options.interactiveTasks=false] - emit enabled checkboxes with data-mf-task-index
     * @param {string} [options.taskScope=''] - value for data-mf-task-scope (e.g. 'notes_markdown' or 'note:<id>')
     */
    function render(markdown, options = {}) {
        const opts = Object.assign({ mode: 'app', interactiveTasks: false, taskScope: '' }, options);
        if (markdown === null || markdown === undefined) return '';
        const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');

        const out = [];
        let listType = null; // 'ul' | 'ol'
        let paragraph = [];
        let taskIndex = 0;

        const flushParagraph = () => {
            if (paragraph.length) {
                out.push(`<p class="mf-md-p">${paragraph.map(l => renderInline(l, opts)).join('<br>')}</p>`);
                paragraph = [];
            }
        };
        const closeList = () => {
            if (listType) {
                out.push(`</${listType}>`);
                listType = null;
            }
        };
        const openList = (type) => {
            if (listType !== type) {
                closeList();
                out.push(type === 'ul' ? '<ul class="mf-md-list">' : '<ol class="mf-md-list">');
                listType = type;
            }
        };

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed) {
                flushParagraph();
                closeList();
                continue;
            }

            const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
            if (heading) {
                flushParagraph();
                closeList();
                const level = heading[1].length + 2; // h3..h5 to stay subordinate to the surrounding UI
                out.push(`<h${level} class="mf-md-h">${renderInline(heading[2], opts)}</h${level}>`);
                continue;
            }

            const task = TASK_LINE_RE.exec(line);
            if (task) {
                flushParagraph();
                openList('ul');
                const checked = task[2].toLowerCase() === 'x';
                const idx = taskIndex++;
                const attrs = opts.interactiveTasks
                    ? `data-mf-task-index="${idx}" data-mf-task-scope="${escapeAttr(opts.taskScope)}"`
                    : 'disabled';
                out.push(`<li class="mf-md-task${checked ? ' done' : ''}"><label><input type="checkbox" class="mf-md-task-box" ${checked ? 'checked' : ''} ${attrs}> <span>${renderInline(task[3], opts)}</span></label></li>`);
                continue;
            }

            const bullet = /^\s*[-*•]\s+(.+)$/.exec(line);
            if (bullet) {
                flushParagraph();
                openList('ul');
                out.push(`<li>${renderInline(bullet[1], opts)}</li>`);
                continue;
            }

            const ordered = /^\s*\d{1,4}[.)]\s+(.+)$/.exec(line);
            if (ordered) {
                flushParagraph();
                openList('ol');
                out.push(`<li>${renderInline(ordered[1], opts)}</li>`);
                continue;
            }

            closeList();
            paragraph.push(line);
        }
        flushParagraph();
        closeList();

        return `<div class="mf-md">${out.join('')}</div>`;
    }

    // ------------------------------------------------------------------
    // Task list manipulation
    // ------------------------------------------------------------------

    /**
     * Toggles (or sets) the n-th task checkbox in a markdown string.
     * Returns { text, changed, label, checked }.
     */
    function toggleTask(markdown, index, forceChecked) {
        const src = String(markdown || '');
        const eol = src.includes('\r\n') ? '\r\n' : '\n';
        const lines = src.split(/\r?\n/);
        let current = -1;
        for (let i = 0; i < lines.length; i++) {
            const m = TASK_LINE_RE.exec(lines[i]);
            if (!m) continue;
            current++;
            if (current !== Number(index)) continue;
            const wasChecked = m[2].toLowerCase() === 'x';
            const nowChecked = typeof forceChecked === 'boolean' ? forceChecked : !wasChecked;
            if (wasChecked === nowChecked) {
                return { text: src, changed: false, label: m[3], checked: nowChecked };
            }
            lines[i] = lines[i].replace(/\[( |x|X)\]/, nowChecked ? '[x]' : '[ ]');
            return { text: lines.join(eol), changed: true, label: m[3], checked: nowChecked };
        }
        return { text: src, changed: false, label: null, checked: null };
    }

    // ------------------------------------------------------------------
    // Extraction helpers
    // ------------------------------------------------------------------

    function extractMentions(text) {
        const names = [];
        const seen = new Set();
        String(text || '').replace(MENTION_RE, (m, name) => {
            const clean = name.trim();
            const key = clean.toLowerCase();
            if (clean && !seen.has(key)) {
                seen.add(key);
                names.push(clean);
            }
            return m;
        });
        return names;
    }

    function extractTags(text) {
        const tags = [];
        const seen = new Set();
        // Remove URLs first so "#fragment" parts of links are not mistaken for tags
        const cleaned = String(text || '').replace(URL_RE, ' ');
        cleaned.replace(TAG_RE, (m, lead, tag) => {
            const key = tag.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                tags.push(tag);
            }
            return m;
        });
        return tags;
    }

    /**
     * Extracts all links from a text.
     * @returns {Array<{type: 'url'|'path'|'mention', value: string, label: string}>}
     */
    function extractLinks(text) {
        const src = String(text || '');
        const results = [];
        const seen = new Set();
        const push = (type, value, label) => {
            const key = `${type}::${value}`.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            results.push({ type, value, label: label || value });
        };

        src.replace(MD_LINK_RE, (m, label, url) => {
            const safe = sanitizeUrl(url);
            if (safe) push('url', safe, label);
            return m;
        });
        src.replace(MD_LINK_RE, ' ').replace(URL_RE, (m) => {
            const safe = sanitizeUrl(m);
            if (safe) push('url', safe, m);
            return m;
        });
        src.replace(WIN_PATH_RE, (m, p) => {
            push('path', p, p);
            return m;
        });
        extractMentions(src).forEach(name => push('mention', name, name));
        return results;
    }

    /** Small, dependency-free stylesheet for README output (dark theme, matches MetaFold). */
    const README_CSS = `
            .mf-md { line-height: 1.55; }
            .mf-md-p { margin: 0 0 8px 0; }
            .mf-md-h { margin: 10px 0 6px 0; color: #c4b5fd; }
            .mf-md-list { margin: 4px 0 8px 22px; }
            .mf-md-task { list-style: none; margin-left: -18px; }
            .mf-md-task.done span { text-decoration: line-through; opacity: 0.7; }
            .mf-md-code { background: rgba(0,0,0,0.35); padding: 1px 5px; border-radius: 4px; font-family: Consolas, monospace; font-size: 0.9em; }
            .mf-md-link, .mf-md-path { color: #a855f7; text-decoration: underline; word-break: break-all; }
            .mf-md-tag { display: inline-block; background: rgba(139,92,246,0.18); color: #c4b5fd; padding: 0 6px; border-radius: 10px; font-size: 0.85em; }
            .mf-md-mention { display: inline-block; background: rgba(59,130,246,0.18); color: #93c5fd; padding: 0 6px; border-radius: 10px; font-size: 0.9em; }`;

    return {
        escapeHtml,
        escapeAttr,
        sanitizeUrl,
        pathToFileUrl,
        renderInline,
        render,
        toggleTask,
        extractLinks,
        extractMentions,
        extractTags,
        README_CSS
    };
});

