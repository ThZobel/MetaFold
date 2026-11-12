/**
 * MetaFold Project Inline Editor
 *
 * Provides in-place editing of project metadata, project renaming,
 * field additions/deletions, and integration push prompts in the
 * Discovery Details Panel (#facetRightPanel).
 */
'use strict';

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.projectInlineEditor = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {

    const IGNORED_SYSTEM_KEYS = new Set([
        'metafold_project_id', 'projectName', 'provenance', 'templateInfo',
        'metafold_integration', 'integrations', 'System.UpdateHistory', 'System.Level',
        'System.hasReadme', 'System.TemplateCategory', 'changelog', 'notes_log',
        'notes_markdown', 'hypothesis_or_goal', 'previous_names', 'display_name'
    ]);

    const LINK_FIELD_KEYS = new Set(['id_anchor', 'derived_from', 'related_to']);

    function getWindow() {
        return typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
    }

    function getEsc() {
        const win = getWindow();
        return (win.markdownLite && win.markdownLite.escapeHtml) || (s => String(s || ''));
    }

    function getEscAttr() {
        const win = getWindow();
        return (win.markdownLite && win.markdownLite.escapeAttr) || (s => String(s || '').replace(/"/g, '&quot;'));
    }

    class ProjectInlineEditor {
        constructor() {
            this.isEditing = false;
            this.isDirty = false;
            this.currentProject = null;
            this.originalMetadata = null;
            this.expectedUpdatedAt = null;
            this.deletedFieldPaths = [];
            this.addedFields = [];
        }

        /**
         * Checks if there are unsaved changes and prompts the user if needed.
         * Returns true if safe to proceed, false if user cancelled.
         */
        confirmDiscardIfNeeded() {
            if (!this.isEditing || !this.isDirty) return true;
            return confirm('You have unsaved metadata changes. Discard them?');
        }

        /**
         * Cancels editing mode and restores regular read-only view.
         */
        cancel() {
            if (!this.confirmDiscardIfNeeded()) return;
            this.isEditing = false;
            this.isDirty = false;
            this.deletedFieldPaths = [];
            this.addedFields = [];
            if (this.currentProject && window.facetSearch) {
                window.facetSearch.showProjectDetails(this.currentProject);
            }
        }

        /**
         * Starts editing mode for the given project.
         */
        async startEdit(project) {
            if (!project) return;
            if (this.isEditing && this.isDirty) {
                if (!this.confirmDiscardIfNeeded()) return;
            }

            this.currentProject = project;
            this.isEditing = true;
            this.isDirty = false;
            this.deletedFieldPaths = [];
            this.addedFields = [];
            this.expectedUpdatedAt = project.updated_at || project.modified || null;

            // Clone metadata
            const rawMeta = project.metadata || project.flatMeta || {};
            this.originalMetadata = JSON.parse(JSON.stringify(rawMeta));

            this.render();
        }

        /**
         * Renders the editor interface inside #facetRightPanelContent.
         */
        render() {
            const contentArea = document.getElementById('facetRightPanelContent');
            if (!contentArea || !this.currentProject) return;

            const project = this.currentProject;
            const currentName = project.name || project.projectName || 'Project';
            const esc = getEsc();

            let html = `
                <div class="mf-inline-editor-header" style="margin-bottom: 12px; padding: 10px; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.35); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 700; color: #c4b5fd; font-size: 0.95rem;">✏️ Edit Project Metadata</span>
                        <div style="display: flex; gap: 6px;">
                            <button type="button" class="btn btn-secondary" id="mfEditorCancelBtn" style="padding: 4px 10px; font-size: 0.8rem;">
                                ✖ Cancel
                            </button>
                            <button type="button" class="btn btn-primary" id="mfEditorSaveBtn" style="padding: 4px 12px; font-size: 0.8rem; background: #10b981; border-color: #059669; font-weight: 600;">
                                💾 Save Changes
                            </button>
                        </div>
                    </div>
                    <div style="font-size: 0.74rem; color: #9ca3af;">
                        Modify fields, rename project, or add new keys. Updates will automatically sync README.html &amp; index.
                    </div>
                </div>

                <!-- Project Renaming Section -->
                <div class="mf-editor-section" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 10px; margin-bottom: 12px;">
                    <div style="font-size: 0.72rem; text-transform: uppercase; color: #a78bfa; font-weight: 600; margin-bottom: 6px;">Project Name</div>
                    <input type="text" id="mfEditorProjectName" class="form-control" value="${esc(currentName)}" style="width: 100%; font-size: 0.9rem; padding: 6px 10px; margin-bottom: 6px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.15); border-radius: 5px; color: #fff;">
                    
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.76rem; color: #d1d5db; cursor: pointer; user-select: none; margin-bottom: 4px;">
                        <input type="checkbox" id="mfEditorRenameFolder">
                        <span>📁 Also rename project folder on disk</span>
                    </label>
                    <div style="font-size: 0.7rem; color: #9ca3af; font-style: italic;">
                        ⚠️ Note: External experiment/dataset titles in OMERO or eLabFTW are not automatically renamed.
                    </div>
                </div>

                <!-- Fields Section -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: #a78bfa;">📋 Metadata Fields</div>
                    <button type="button" class="btn btn-secondary btn-sm" id="mfEditorAddFieldBtn" style="padding: 2px 8px; font-size: 0.75rem;">
                        ➕ Add Field
                    </button>
                </div>

                <form id="mfEditorForm" onsubmit="return false;">
                    <div id="mfEditorFieldsContainer" style="display: flex; flex-direction: column; gap: 8px;">
            `;

            // Render existing fields and groups
            const metaSource = this.originalMetadata || {};
            for (const [key, field] of Object.entries(metaSource)) {
                if (IGNORED_SYSTEM_KEYS.has(key) || key.startsWith('System.')) continue;
                html += this._renderFieldOrGroup(key, field, []);
            }

            html += `
                    </div>
                </form>
            `;

            contentArea.innerHTML = html;
            this._bindEvents();
        }

        _renderFieldOrGroup(key, field, pathPrefix = []) {
            const esc = getEsc();
            const fullPath = [...pathPrefix, key];
            const pathStr = fullPath.join('::');

            // Check if this path was marked for deletion
            if (this.deletedFieldPaths.includes(pathStr)) {
                return '';
            }

            // Group: nested object without type & value
            const isGroup = typeof field === 'object' && field !== null && !Array.isArray(field) && field.value === undefined && field.type === undefined;

            if (isGroup) {
                let groupHtml = `
                    <div class="mf-editor-group" data-group-path="${esc(pathStr)}" style="background: rgba(0,0,0,0.18); border-left: 3px solid #8b5cf6; border-radius: 6px; padding: 10px; margin-bottom: 6px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div style="font-size: 0.78rem; font-weight: 700; color: #c4b5fd; text-transform: uppercase;">📁 ${esc((field && field.label) || key.replace(/_/g, ' '))}</div>
                            <div style="display: flex; gap: 4px; align-items: center;">
                                <button type="button" class="btn btn-secondary btn-sm mf-editor-add-subfield-btn" data-group-path="${esc(pathStr)}" style="padding: 1px 6px; font-size: 0.7rem;" title="Add field to group">
                                    ➕ Add
                                </button>
                                <button type="button" class="btn btn-secondary btn-sm mf-editor-remove-field-btn" data-field-path="${esc(pathStr)}" style="padding: 0 4px; font-size: 0.68rem; line-height: 1.2; color: #f87171;" title="Delete this group">
                                    🗑️
                                </button>
                            </div>
                        </div>
                        <div class="mf-editor-group-content" style="display: flex; flex-direction: column; gap: 6px;">
                `;

                for (const [subKey, subField] of Object.entries(field)) {
                    if (IGNORED_SYSTEM_KEYS.has(subKey) || subKey.startsWith('System.') || subKey === 'label' || subKey === 'isGroup') continue;
                    groupHtml += this._renderFieldOrGroup(subKey, subField, fullPath);
                }

                groupHtml += `</div></div>`;
                return groupHtml;
            }

            // Normal field
            const value = (field && field.value !== undefined) ? field.value : field;
            const type = (field && field.type) ? field.type : (typeof value === 'boolean' ? 'checkbox' : (typeof value === 'number' ? 'number' : 'text'));
            const label = (field && field.label) ? field.label : key.replace(/_/g, ' ');
            const unit = (field && field.unit) ? field.unit : '';
            const options = Array.isArray(field && field.options)
                ? field.options
                : (typeof field?.options === 'string'
                    ? field.options.split(',').map(s => s.trim()).filter(Boolean)
                    : null);
            const isLinkField = LINK_FIELD_KEYS.has(key) || type === 'derived_from' || type === 'related_to';

            // Rich treatment for derived_from, related_to, tags, and URLs
            const lowerKey = key.toLowerCase();
            const lowerLabel = String((field && field.label) || '').toLowerCase();
            const isDerivedFrom = lowerKey === 'derived_from' ||
                lowerKey.endsWith('_derived_from') ||
                lowerKey.includes('derived_from') ||
                lowerKey.replace(/[\s_-]+/g, '') === 'derivedfrom' ||
                lowerLabel.includes('derived from') ||
                type === 'derived_from';

            const isRelatedTo = lowerKey === 'related_to' ||
                lowerKey.endsWith('_related_to') ||
                lowerKey.includes('related_to') ||
                lowerKey.replace(/[\s_-]+/g, '') === 'relatedto' ||
                lowerLabel.includes('related to') ||
                lowerLabel.includes('related project') ||
                lowerLabel.includes('related experiment') ||
                lowerKey.includes('related_project') ||
                lowerKey === 'parent_project' ||
                lowerLabel.includes('parent project') ||
                type === 'related_to';

            const isTags = !isDerivedFrom && !isRelatedTo && (
                lowerKey === 'tags' || lowerKey === 'tag' || lowerKey === 'keywords' ||
                lowerKey.endsWith('_tags') || type === 'tags' || type === 'array'
            );
            const isUrl = type === 'url' || (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://')));
            const isIdAnchor = type === 'id_anchor';

            if (isDerivedFrom) {
                return this._renderPillField(pathStr, label, unit, value, 'derived_from');
            }

            if (isRelatedTo) {
                return this._renderPillField(pathStr, label, unit, value, 'related_to');
            }

            if (isTags) {
                return this._renderPillField(pathStr, label, unit, value, 'tags');
            }

            if (isUrl) {
                return this._renderUrlField(pathStr, label, unit, value, type);
            }

            let inputHtml = '';

            if ((type === 'dropdown' || type === 'select') && options && options.length > 0) {
                inputHtml = `<select class="form-control mf-editor-input" data-field-path="${esc(pathStr)}" data-field-type="dropdown" style="width: 100%; padding: 5px 8px; font-size: 0.84rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #fff;">`;
                inputHtml += `<option value="">-- Select --</option>`;
                options.forEach(opt => {
                    const optVal = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    const selected = String(value) === String(optVal) ? 'selected' : '';
                    inputHtml += `<option value="${esc(optVal)}" ${selected}>${esc(optLabel)}</option>`;
                });
                inputHtml += `</select>`;
            } else if (type === 'multicheckbox') {
                const selectedList = Array.isArray(value)
                    ? value.map(String)
                    : (typeof value === 'string' && value.trim() ? value.split(',').map(s => s.trim()) : []);
                const opts = options || [];
                if (opts.length > 0) {
                    inputHtml = `
                        <div class="mf-multicheckbox-group" data-field-path="${esc(pathStr)}" data-field-type="multicheckbox" style="display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0;">
                            ${opts.map(opt => {
                        const optVal = typeof opt === 'object' ? opt.value : opt;
                        const optLabel = typeof opt === 'object' ? opt.label : opt;
                        const isChecked = selectedList.includes(String(optVal));
                        return `
                                    <label class="mf-mc-pill" style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.78rem; padding: 3px 8px; border-radius: 12px; cursor: pointer; border: 1px solid ${isChecked ? '#8b5cf6' : 'rgba(255,255,255,0.15)'}; background: ${isChecked ? 'rgba(139,92,246,0.25)' : 'rgba(0,0,0,0.2)'}; color: ${isChecked ? '#ede9fe' : '#9ca3af'}; user-select: none;">
                                        <input type="checkbox" class="mf-mc-checkbox" value="${esc(optVal)}" ${isChecked ? 'checked' : ''} style="margin: 0; cursor: pointer;">
                                        <span>${esc(optLabel)}</span>
                                    </label>
                                `;
                    }).join('')}
                        </div>
                    `;
                } else {
                    inputHtml = `<input type="text" class="form-control mf-editor-input" data-field-path="${esc(pathStr)}" data-field-type="multicheckbox" value="${esc(selectedList.join(', '))}" placeholder="Comma-separated options..." style="width: 100%; padding: 5px 8px; font-size: 0.84rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #fff;">`;
                }
            } else if (type === 'rating') {
                const ratingVal = parseInt(value, 10) || 0;
                inputHtml = `
                    <div class="mf-rating-group" data-field-path="${esc(pathStr)}" data-field-type="rating" data-value="${ratingVal}" style="display: flex; align-items: center; gap: 4px; padding: 2px 0;">
                        ${[1, 2, 3, 4, 5].map(i => `
                            <span class="mf-rating-star" data-star-value="${i}" style="cursor: pointer; font-size: 1.25rem; color: ${i <= ratingVal ? '#f59e0b' : '#4b5563'}; line-height: 1; transition: color 0.15s;" title="${i} Star${i > 1 ? 's' : ''}">★</span>
                        `).join('')}
                        <span class="mf-rating-value-label" style="font-size: 0.75rem; color: #9ca3af; margin-left: 6px;">${ratingVal ? `${ratingVal}/5` : 'No rating'}</span>
                    </div>
                `;
            } else if (isIdAnchor) {
                inputHtml = `
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <span style="background: rgba(245,158,11,0.18); border: 1px solid rgba(245,158,11,0.4); color: #fbbf24; border-radius: 4px; padding: 4px 7px; font-size: 0.78rem; font-weight: 600; white-space: nowrap;">⚓ ID</span>
                        <input type="text" class="form-control mf-editor-input" data-field-path="${esc(pathStr)}" data-field-type="id_anchor" value="${value !== null && value !== undefined ? esc(value) : ''}" placeholder="e.g. SAMPLE-001, EXP-2026-X" style="flex: 1; padding: 5px 8px; font-size: 0.84rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #fff;">
                    </div>
                    <div style="font-size: 0.68rem; color: #fbbf24; margin-top: 3px; font-style: italic;">
                        🔑 Own / Internal ID indexed in User Index for lineage and "Derived From" tracking.
                    </div>
                `;
            } else if (type === 'checkbox') {
                const checked = value === true || value === 'true' || value === 1 ? 'checked' : '';
                inputHtml = `
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.84rem; color: #e5e7eb; cursor: pointer;">
                        <input type="checkbox" class="mf-editor-input" data-field-path="${esc(pathStr)}" data-field-type="checkbox" ${checked}>
                        <span>${esc(label)}</span>
                    </label>
                `;
            } else if (type === 'notes' || type === 'markdown') {
                inputHtml = `
                    <div class="mf-textarea-wrapper" style="position: relative;">
                        <textarea class="form-control mf-editor-input" data-field-path="${esc(pathStr)}" data-field-type="notes" rows="3" style="width: 100%; padding: 5px 8px; font-size: 0.84rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 4px; color: #fff; resize: vertical;">${esc(value || '')}</textarea>
                        <div class="mf-textarea-preview mf-md" style="display: none; width: 100%; min-height: 75px; max-height: 220px; overflow-y: auto; padding: 6px 8px; background: rgba(0,0,0,0.35); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 4px; font-size: 0.84rem; line-height: 1.4; color: #e5e7eb; cursor: pointer;" title="Click anywhere to return to editing"></div>
                    </div>
                `;
            } else if (type === 'textarea') {
                inputHtml = `
                    <textarea class="form-control mf-editor-input" data-field-path="${esc(pathStr)}" data-field-type="textarea" rows="3" style="width: 100%; padding: 5px 8px; font-size: 0.84rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #fff; resize: vertical;">${esc(value || '')}</textarea>
                `;
            } else if (type === 'number') {
                inputHtml = `
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <input type="number" step="any" class="form-control mf-editor-input" data-field-path="${esc(pathStr)}" data-field-type="number" value="${value !== null && value !== undefined ? esc(value) : ''}" style="flex: 1; padding: 5px 8px; font-size: 0.84rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #fff;">
                        ${unit ? `<span style="font-size: 0.78rem; color: #9ca3af; white-space: nowrap;">${esc(unit)}</span>` : ''}
                    </div>
                `;
            } else if (type === 'date' || type === 'time' || type === 'email') {
                inputHtml = `<input type="${esc(type)}" class="form-control mf-editor-input" data-field-path="${esc(pathStr)}" data-field-type="${esc(type)}" value="${value !== null && value !== undefined ? esc(value) : ''}" style="width: 100%; padding: 5px 8px; font-size: 0.84rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #fff;">`;
            } else {
                inputHtml = `<input type="text" class="form-control mf-editor-input" data-field-path="${esc(pathStr)}" data-field-type="${esc(type)}" value="${value !== null && value !== undefined ? esc(value) : ''}" style="width: 100%; padding: 5px 8px; font-size: 0.84rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #fff;">`;
            }

            return `
                <div class="mf-editor-field-card" data-field-path="${esc(pathStr)}" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 5px; padding: 6px 9px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <div style="font-size: 0.7rem; color: #9ca3af; text-transform: uppercase; font-weight: 600;">
                            ${esc(label)} ${unit ? `<span style="color:#c4b5fd;">(${esc(unit)})</span>` : ''}
                        </div>
                        <div style="display: flex; gap: 4px; align-items: center;">
                            ${type === 'notes' || type === 'markdown' ? `
                                <button type="button" class="btn btn-secondary btn-sm mf-editor-preview-btn" style="padding: 0 6px; font-size: 0.68rem; line-height: 1.3; color: #c4b5fd;" title="Toggle Preview">
                                    👁️ Preview
                                </button>
                            ` : ''}
                            <button type="button" class="btn btn-secondary btn-sm mf-editor-remove-field-btn" data-field-path="${esc(pathStr)}" style="padding: 0 4px; font-size: 0.68rem; line-height: 1.2; color: #f87171;" title="Delete this field">
                                🗑️
                            </button>
                        </div>
                    </div>
                    ${inputHtml}
                    ${isLinkField ? `
                        <div style="font-size: 0.68rem; color: #fbbf24; margin-top: 3px; font-style: italic;">
                            ⚠️ Changing IDs or links affects lineage graph connections.
                        </div>
                    ` : ''}
                </div>
            `;
        }

        _renderPillField(pathStr, label, unit, value, mode) {
            const esc = getEsc();
            const isDerived = mode === 'derived_from';
            const isRelated = mode === 'related_to';
            const isLink = isDerived || isRelated;

            let items = [];
            if (Array.isArray(value)) {
                items = value;
            } else if (typeof value === 'string' && value.trim()) {
                const trimmed = value.trim();
                if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        if (Array.isArray(parsed)) items = parsed;
                        else items = [trimmed];
                    } catch (_) {
                        items = trimmed.replace(/^\[|\]$/g, '').split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
                    }
                } else {
                    items = trimmed.split(',').map(s => s.trim()).filter(Boolean);
                }
            }

            const masterData = (typeof window !== 'undefined' && window.facetSearch && Array.isArray(window.facetSearch.masterData)) ? window.facetSearch.masterData : [];

            let pillsHtml = '';
            for (const item of items) {
                const rawId = typeof item === 'object' && item !== null ? (item.id || item.name || '') : String(item || '').trim();
                const title = typeof item === 'object' && item !== null ? (item.name || item.id || '') : rawId;
                if (!rawId) continue;

                let linkedProj = null;
                if (isLink) {
                    linkedProj = masterData.find(p => p.name === rawId || p.path === rawId || (p.lineage && Array.isArray(p.lineage.provides_ids) && p.lineage.provides_ids.includes(rawId)));
                }

                if (isDerived) {
                    const safePath = linkedProj?.path ? linkedProj.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'") : '';
                    pillsHtml += `
                        <span class="mf-pill-item mf-pill-derived" data-field-path="${esc(pathStr)}" data-item-id="${esc(rawId)}" style="display:inline-flex; align-items:center; gap:5px; background:rgba(99,102,241,0.22); border:1px solid rgba(139,92,246,0.45); color:#c4b5fd; border-radius:14px; padding:2px 8px; font-size:0.75rem;">
                            <span>${linkedProj ? '📁' : '⚓'} <strong>${esc(linkedProj ? linkedProj.name : title)}</strong></span>
                            ${linkedProj ? `<a href="#" class="mf-pill-open-link" data-project-path="${esc(safePath)}" title="Open / inspect linked project: ${esc(linkedProj.name)}" style="color:#60a5fa; text-decoration:none; font-size:0.78rem; font-weight:bold; margin-left:2px;">↗</a>` : ''}
                            <span class="mf-pill-remove-btn" style="cursor:pointer; opacity:0.7; font-weight:bold; font-size:0.85rem; margin-left:3px; line-height:1;" title="Remove link">×</span>
                        </span>
                    `;
                } else if (isRelated) {
                    const safePath = linkedProj?.path ? linkedProj.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'") : '';
                    pillsHtml += `
                        <span class="mf-pill-item mf-pill-related" data-field-path="${esc(pathStr)}" data-item-id="${esc(rawId)}" style="display:inline-flex; align-items:center; gap:5px; background:rgba(56,189,248,0.2); border:1px solid rgba(56,189,248,0.45); color:#7dd3fc; border-radius:14px; padding:2px 8px; font-size:0.75rem;">
                            <span>${linkedProj ? '📁' : '🔀'} <strong>${esc(linkedProj ? linkedProj.name : title)}</strong></span>
                            ${linkedProj ? `<a href="#" class="mf-pill-open-link" data-project-path="${esc(safePath)}" title="Open / inspect linked project: ${esc(linkedProj.name)}" style="color:#38bdf8; text-decoration:none; font-size:0.78rem; font-weight:bold; margin-left:2px;">↗</a>` : ''}
                            <span class="mf-pill-remove-btn" style="cursor:pointer; opacity:0.7; font-weight:bold; font-size:0.85rem; margin-left:3px; line-height:1;" title="Remove link">×</span>
                        </span>
                    `;
                } else {
                    pillsHtml += `
                        <span class="mf-pill-item mf-pill-tag" data-field-path="${esc(pathStr)}" data-item-id="${esc(rawId)}" style="display:inline-flex; align-items:center; gap:5px; background:rgba(13,148,136,0.18); border:1px solid rgba(13,148,136,0.4); color:#2dd4bf; border-radius:14px; padding:2px 8px; font-size:0.75rem;">
                            <span>🏷️ ${esc(title)}</span>
                            <span class="mf-pill-remove-btn" style="cursor:pointer; opacity:0.7; font-weight:bold; font-size:0.85rem; margin-left:3px; line-height:1;" title="Remove tag">×</span>
                        </span>
                    `;
                }
            }

            const inputPlaceholder = isDerived
                ? 'Type project name, ID, or pick suggestion... (Enter to add)'
                : (isRelated ? 'Type related project or ID... (Enter to add)' : 'Add tag... (Enter, comma or + Add)');

            return `
                <div class="mf-editor-field-card" data-field-path="${esc(pathStr)}" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 5px; padding: 6px 9px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <div style="font-size: 0.7rem; color: #9ca3af; text-transform: uppercase; font-weight: 600;">
                            ${esc(label)} ${unit ? `<span style="color:#c4b5fd;">(${esc(unit)})</span>` : ''}
                        </div>
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <button type="button" class="btn btn-secondary btn-sm mf-editor-remove-field-btn" data-field-path="${esc(pathStr)}" style="padding: 0 4px; font-size: 0.68rem; line-height: 1.2; color: #f87171;" title="Delete this field">
                                🗑️
                            </button>
                        </div>
                    </div>
                    
                    <div class="mf-pill-container" data-field-path="${esc(pathStr)}" data-mode="${esc(mode)}" style="display:flex; flex-direction:column; gap:5px; position:relative;">
                        <div class="mf-pills-row" style="display:flex; flex-wrap:wrap; gap:4px; min-height:24px;">
                            ${pillsHtml}
                        </div>
                        <div class="mf-pill-input-row" style="position:relative; display:flex; gap:6px; align-items:center;">
                            <input type="text" class="form-control mf-editor-pill-input"
                                   data-field-path="${esc(pathStr)}"
                                   data-mode="${esc(mode)}"
                                   placeholder="${inputPlaceholder}"
                                   style="flex:1; padding:4px 8px; font-size:0.8rem; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff;"
                                   autocomplete="off">
                            ${isLink ? `
                            <button type="button" class="btn btn-secondary btn-sm mf-editor-browse-projs-btn" data-field-path="${esc(pathStr)}" style="padding:3px 8px; font-size:0.75rem; white-space:nowrap; color:#c4b5fd;" title="Browse table projects to link">
                                📁 Pick Project...
                            </button>` : `
                            <button type="button" class="btn btn-secondary btn-sm mf-editor-add-pill-btn" data-field-path="${esc(pathStr)}" style="padding:3px 10px; font-size:0.75rem; white-space:nowrap; color:#2dd4bf; border:1px solid rgba(13,148,136,0.4); background:rgba(13,148,136,0.15); border-radius:4px; cursor:pointer;" title="Add tag">
                                ➕ Add
                            </button>`}
                            <div class="mf-autocomplete-dropdown" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; z-index:1000; max-height:180px; overflow-y:auto; background:#1e1e2e; border:1px solid rgba(139,92,246,0.4); border-radius:5px; box-shadow:0 4px 14px rgba(0,0,0,0.6);"></div>
                        </div>
                    </div>

                    ${isLink ? `
                        <div style="font-size: 0.68rem; color: #fbbf24; margin-top: 3px; font-style: italic;">
                            ⚠️ Changing IDs or links affects lineage graph connections.
                        </div>
                    ` : ''}
                </div>
            `;
        }
        _renderUrlField(pathStr, label, unit, value, type) {
            const esc = getEsc();
            const currentVal = value !== null && value !== undefined ? String(value) : '';
            const hasUrl = currentVal.startsWith('http://') || currentVal.startsWith('https://');

            return `
                <div class="mf-editor-field-card" data-field-path="${esc(pathStr)}" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 5px; padding: 6px 9px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <div style="font-size: 0.7rem; color: #9ca3af; text-transform: uppercase; font-weight: 600;">
                            ${esc(label)} ${unit ? `<span style="color:#c4b5fd;">(${esc(unit)})</span>` : ''}
                        </div>
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <button type="button" class="btn btn-secondary btn-sm mf-editor-remove-field-btn" data-field-path="${esc(pathStr)}" style="padding: 0 4px; font-size: 0.68rem; line-height: 1.2; color: #f87171;" title="Delete this field">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <input type="url" class="form-control mf-editor-input mf-editor-url-input" data-field-path="${esc(pathStr)}" data-field-type="url" value="${esc(currentVal)}" placeholder="https://..." style="flex: 1; padding: 5px 8px; font-size: 0.84rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #fff;">
                        <button type="button" class="btn btn-secondary btn-sm mf-editor-open-url-btn" data-field-path="${esc(pathStr)}" style="padding: 4px 9px; font-size: 0.76rem; color: #34d399; white-space: nowrap; ${hasUrl ? '' : 'display:none;'}" title="Open link in default browser">
                            ↗ Open
                        </button>
                    </div>
                </div>
            `;
        }

        _addPillToContainer(container, rawId, mode) {
            const esc = getEsc();
            const isDerived = mode === 'derived_from';
            const isRelated = mode === 'related_to';
            const isLink = isDerived || isRelated;
            const pillsRow = container.querySelector('.mf-pills-row');
            if (!pillsRow || !rawId) return;

            // If tags and user passed comma-separated tags, split and add each
            if (!isLink && typeof rawId === 'string' && rawId.includes(',')) {
                const parts = rawId.split(',').map(s => s.trim()).filter(Boolean);
                parts.forEach(p => this._addPillToContainer(container, p, mode));
                return;
            }

            const cleanId = typeof rawId === 'string' ? rawId.trim() : rawId;
            if (!cleanId) return;

            const existing = Array.from(pillsRow.querySelectorAll('.mf-pill-item')).map(p => p.dataset.itemId);
            if (existing.includes(cleanId)) return;

            const masterData = (typeof window !== 'undefined' && window.facetSearch && Array.isArray(window.facetSearch.masterData)) ? window.facetSearch.masterData : [];
            let linkedProj = null;
            if (isLink) {
                linkedProj = masterData.find(p => p.name === cleanId || p.path === cleanId || (p.lineage && Array.isArray(p.lineage.provides_ids) && p.lineage.provides_ids.includes(cleanId)));
            }

            const pill = document.createElement('span');
            pill.className = `mf-pill-item ${isDerived ? 'mf-pill-derived' : (isRelated ? 'mf-pill-related' : 'mf-pill-tag')}`;
            pill.dataset.itemId = cleanId;

            if (isDerived) {
                pill.style.cssText = 'display:inline-flex; align-items:center; gap:5px; background:rgba(99,102,241,0.22); border:1px solid rgba(139,92,246,0.45); color:#c4b5fd; border-radius:14px; padding:2px 8px; font-size:0.75rem;';
                const safePath = linkedProj?.path ? linkedProj.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'") : '';
                pill.innerHTML = `
                    <span>${linkedProj ? '📁' : '⚓'} <strong>${esc(linkedProj ? linkedProj.name : cleanId)}</strong></span>
                    ${linkedProj ? `<a href="#" class="mf-pill-open-link" data-project-path="${esc(safePath)}" title="Open / inspect linked project: ${esc(linkedProj.name)}" style="color:#60a5fa; text-decoration:none; font-size:0.78rem; font-weight:bold; margin-left:2px;">↗</a>` : ''}
                    <span class="mf-pill-remove-btn" style="cursor:pointer; opacity:0.7; font-weight:bold; font-size:0.85rem; margin-left:3px; line-height:1;" title="Remove link">×</span>
                `;
            } else if (isRelated) {
                pill.style.cssText = 'display:inline-flex; align-items:center; gap:5px; background:rgba(56,189,248,0.2); border:1px solid rgba(56,189,248,0.45); color:#7dd3fc; border-radius:14px; padding:2px 8px; font-size:0.75rem;';
                const safePath = linkedProj?.path ? linkedProj.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'") : '';
                pill.innerHTML = `
                    <span>${linkedProj ? '📁' : '🔀'} <strong>${esc(linkedProj ? linkedProj.name : cleanId)}</strong></span>
                    ${linkedProj ? `<a href="#" class="mf-pill-open-link" data-project-path="${esc(safePath)}" title="Open / inspect linked project: ${esc(linkedProj.name)}" style="color:#38bdf8; text-decoration:none; font-size:0.78rem; font-weight:bold; margin-left:2px;">↗</a>` : ''}
                    <span class="mf-pill-remove-btn" style="cursor:pointer; opacity:0.7; font-weight:bold; font-size:0.85rem; margin-left:3px; line-height:1;" title="Remove link">×</span>
                `;
            } else {
                pill.style.cssText = 'display:inline-flex; align-items:center; gap:5px; background:rgba(13,148,136,0.18); border:1px solid rgba(13,148,136,0.4); color:#2dd4bf; border-radius:14px; padding:2px 8px; font-size:0.75rem;';
                pill.innerHTML = `
                    <span>🏷️ ${esc(cleanId)}</span>
                    <span class="mf-pill-remove-btn" style="cursor:pointer; opacity:0.7; font-weight:bold; font-size:0.85rem; margin-left:3px; line-height:1;" title="Remove tag">×</span>
                `;
            }

            pillsRow.appendChild(pill);
            this.isDirty = true;
        }

        _bindEvents() {
            const contentArea = document.getElementById('facetRightPanelContent');
            if (!contentArea) return;

            const cancelBtn = document.getElementById('mfEditorCancelBtn');
            if (cancelBtn) {
                cancelBtn.onclick = () => this.cancel();
            }

            const saveBtn = document.getElementById('mfEditorSaveBtn');
            if (saveBtn) {
                saveBtn.onclick = () => this.save();
            }

            const addFieldBtn = document.getElementById('mfEditorAddFieldBtn');
            if (addFieldBtn) {
                addFieldBtn.onclick = () => this.promptAddField();
            }

            // Remove field buttons
            contentArea.querySelectorAll('.mf-editor-remove-field-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const pathStr = btn.dataset.fieldPath;
                    if (pathStr && confirm(`Remove field "${pathStr.replace(/::/g, '.')}"?`)) {
                        this.deletedFieldPaths.push(pathStr);
                        this.isDirty = true;
                        const card = btn.closest('.mf-editor-field-card');
                        if (card) card.remove();
                    }
                };
            });

            // Add subfield buttons
            contentArea.querySelectorAll('.mf-editor-add-subfield-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const groupPath = btn.dataset.groupPath;
                    this.promptAddField(groupPath);
                };
            });

            // In-place preview toggle for textarea fields
            contentArea.querySelectorAll('.mf-editor-preview-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const card = btn.closest('.mf-editor-field-card');
                    const ta = card?.querySelector('textarea.mf-editor-input');
                    const preview = card?.querySelector('.mf-textarea-preview');
                    if (!ta || !preview) return;

                    if (ta.style.display === 'none') {
                        // Switch to Edit
                        ta.style.display = 'block';
                        preview.style.display = 'none';
                        btn.textContent = '👁️ Preview';
                        btn.style.color = '#c4b5fd';
                        ta.focus();
                    } else {
                        // Switch to Preview
                        const val = ta.value || '';
                        if (window.markdownLite) {
                            preview.innerHTML = val.trim()
                                ? window.markdownLite.render(val)
                                : '<em style="color:#6b7280; font-style:italic;">Nothing to preview yet. Click to write...</em>';
                        } else {
                            preview.textContent = val || 'Empty';
                        }
                        preview.style.minHeight = `${Math.max(75, ta.offsetHeight)}px`;
                        ta.style.display = 'none';
                        preview.style.display = 'block';
                        btn.textContent = '✏️ Edit';
                        btn.style.color = '#a78bfa';
                    }
                };
            });

            // Click anywhere on textarea preview swaps back to edit mode
            contentArea.querySelectorAll('.mf-textarea-preview').forEach(prev => {
                prev.onclick = () => {
                    const card = prev.closest('.mf-editor-field-card');
                    const btn = card?.querySelector('.mf-editor-preview-btn');
                    if (btn) btn.click();
                };
            });

            // Pill removal and link opening delegation
            contentArea.onclick = (e) => {
                const removeBtn = e.target.closest('.mf-pill-remove-btn');
                if (removeBtn) {
                    e.stopPropagation();
                    const pill = removeBtn.closest('.mf-pill-item');
                    if (pill) {
                        pill.remove();
                        this.isDirty = true;
                    }
                    return;
                }

                const linkBtn = e.target.closest('.mf-pill-open-link');
                if (linkBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const projPath = linkBtn.dataset.projectPath;
                    if (projPath && window.facetSearch) {
                        window.facetSearch.selectAndInspectProjectByPath(projPath);
                    }
                    return;
                }

                const urlBtn = e.target.closest('.mf-editor-open-url-btn');
                if (urlBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const input = urlBtn.closest('div')?.querySelector('.mf-editor-url-input');
                    const url = input ? input.value.trim() : '';
                    if (url && window.electronAPI?.openExternal) {
                        window.electronAPI.openExternal(url);
                    }
                    return;
                }
            };

            // Add pill button click (for tags)
            contentArea.querySelectorAll('.mf-editor-add-pill-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const container = btn.closest('.mf-pill-container');
                    const input = container?.querySelector('.mf-editor-pill-input');
                    const mode = input?.dataset.mode || 'tags';
                    if (container && input && input.value.trim()) {
                        this._addPillToContainer(container, input.value.trim(), mode);
                        input.value = '';
                        const dropdown = container.querySelector('.mf-autocomplete-dropdown');
                        if (dropdown) dropdown.style.display = 'none';
                        input.focus();
                    }
                };
            });

            // Autocomplete for pill inputs
            contentArea.querySelectorAll('.mf-editor-pill-input').forEach(input => {
                const container = input.closest('.mf-pill-container');
                const dropdown = container?.querySelector('.mf-autocomplete-dropdown');
                const mode = input.dataset.mode;
                if (!container || !dropdown) return;

                const esc = getEsc();
                const escAttr = getEscAttr();

                const renderSuggestions = (query = '') => {
                    const rawTyped = (input.value || '').trim();
                    const q = (query || '').toLowerCase().trim();
                    const isDerived = mode === 'derived_from';
                    const isRelated = mode === 'related_to';
                    const isLink = isDerived || isRelated;

                    if (isLink) {
                        const masterData = (typeof window !== 'undefined' && window.facetSearch && Array.isArray(window.facetSearch.masterData)) ? window.facetSearch.masterData : [];
                        const currentPath = this.currentProject?.path;
                        const existingPills = Array.from(container.querySelectorAll('.mf-pill-item')).map(p => p.dataset.itemId);

                        const matches = masterData
                            .filter(p => p.path !== currentPath)
                            .filter(p => !existingPills.includes(p.name) && !existingPills.includes(p.path))
                            .filter(p => {
                                if (!q) return true;
                                return (p.name && p.name.toLowerCase().includes(q)) ||
                                    (p.path && p.path.toLowerCase().includes(q)) ||
                                    (p.lineage?.provides_ids && p.lineage.provides_ids.some(id => String(id).toLowerCase().includes(q)));
                            })
                            .slice(0, 20);

                        let itemsHtml = '';
                        if (rawTyped) {
                            const badgeColor = isRelated ? '#38bdf8' : '#fbbf24';
                            const badgeBg = isRelated ? 'rgba(56,189,248,0.1)' : 'rgba(251,191,36,0.1)';
                            const badgeIcon = isRelated ? '🔀' : '⚓';
                            const badgeText = isRelated ? 'related project or ID' : 'ID anchor';
                            itemsHtml += `
                                <div class="mf-suggestion-item" data-item-id="${escAttr(rawTyped)}" style="padding: 6px 10px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 0.78rem; color: ${badgeColor}; background: ${badgeBg};">
                                    ${badgeIcon} Add "${esc(rawTyped)}" as ${badgeText}
                                </div>
                            `;
                        }

                        if (matches.length > 0) {
                            itemsHtml += matches.map(m => {
                                const escName = esc(m.name || 'Project');
                                const escPath = esc(m.path || '');
                                const textColor = isRelated ? '#7dd3fc' : '#c4b5fd';
                                return `
                                    <div class="mf-suggestion-item" data-item-id="${escAttr(m.name)}" style="padding: 6px 10px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.78rem;">
                                        <div style="color: ${textColor}; font-weight: 600;">📁 ${escName}</div>
                                        <div style="color: #9ca3af; font-size: 0.7rem; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escPath}</div>
                                    </div>
                                `;
                            }).join('');
                        } else if (!rawTyped) {
                            itemsHtml = `<div style="padding: 6px 10px; font-size: 0.74rem; color: #9ca3af; font-style: italic;">Type a project name or ID to link.</div>`;
                        }

                        dropdown.innerHTML = itemsHtml;
                        dropdown.style.display = 'block';
                    } else {
                        // Tags suggestions - use centralized tag harvester
                        const allTagsList = (typeof window !== 'undefined' && window.getAllKnownTags)
                            ? window.getAllKnownTags()
                            : [];
                        const existingPills = Array.from(container.querySelectorAll('.mf-pill-item')).map(p => p.dataset.itemId);
                        const tagList = allTagsList.filter(t => !existingPills.includes(t) && (!q || t.toLowerCase().includes(q))).slice(0, 15);

                        let itemsHtml = '';
                        if (rawTyped) {
                            itemsHtml += `
                                <div class="mf-suggestion-item" data-item-id="${escAttr(rawTyped)}" style="padding: 6px 10px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 0.78rem; color: #34d399; background: rgba(52,211,153,0.1);">
                                    ➕ Add tag: "<strong>${esc(rawTyped)}</strong>"
                                </div>
                            `;
                        }

                        if (tagList.length > 0) {
                            itemsHtml += tagList.map(t => {
                                const escTag = esc(t);
                                return `
                                    <div class="mf-suggestion-item" data-item-id="${escAttr(t)}" style="padding: 6px 10px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.78rem; color: #2dd4bf;">
                                        🏷️ ${escTag}
                                    </div>
                                `;
                            }).join('');
                        } else if (!rawTyped) {
                            itemsHtml = `<div style="padding: 6px 10px; font-size: 0.74rem; color: #9ca3af; font-style: italic;">Type tag name and press Enter, comma or click ➕ Add.</div>`;
                        }

                        dropdown.innerHTML = itemsHtml;
                        dropdown.style.display = 'block';
                    }

                    dropdown.querySelectorAll('.mf-suggestion-item').forEach(itemEl => {
                        itemEl.onmousedown = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            this._addPillToContainer(container, itemEl.dataset.itemId, mode);
                            input.value = '';
                            dropdown.style.display = 'none';
                            input.focus();
                        };
                    });
                };

                let blurTimer = null;
                input.onblur = () => {
                    blurTimer = setTimeout(() => {
                        dropdown.style.display = 'none';
                    }, 180);
                };

                input.onfocus = () => {
                    if (blurTimer) clearTimeout(blurTimer);
                    renderSuggestions(input.value);
                };

                input.oninput = () => renderSuggestions(input.value);

                input.onkeydown = (e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const val = input.value.trim().replace(/,$/, '');
                        if (val) {
                            this._addPillToContainer(container, val, mode);
                            input.value = '';
                            dropdown.style.display = 'none';
                        }
                    } else if (e.key === 'Backspace' && input.value === '') {
                        const pills = container.querySelectorAll('.mf-pill-item');
                        if (pills.length > 0) {
                            pills[pills.length - 1].remove();
                            this.isDirty = true;
                        }
                    } else if (e.key === 'Escape') {
                        dropdown.style.display = 'none';
                        e.stopPropagation();
                    }
                };
            });

            // Browse button for projects
            contentArea.querySelectorAll('.mf-editor-browse-projs-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const container = btn.closest('.mf-pill-container');
                    const input = container?.querySelector('.mf-editor-pill-input');
                    if (input) {
                        input.focus();
                        input.dispatchEvent(new Event('focus'));
                    }
                };
            });

            // URL input dynamic preview toggle
            contentArea.querySelectorAll('.mf-editor-url-input').forEach(input => {
                const row = input.closest('div');
                const btn = row?.querySelector('.mf-editor-open-url-btn');
                input.addEventListener('input', () => {
                    const val = (input.value || '').trim();
                    const isValidUrl = val.startsWith('http://') || val.startsWith('https://');
                    if (btn) {
                        btn.style.display = isValidUrl ? 'inline-flex' : 'none';
                    }
                });
            });

            // Close dropdowns when clicking outside or pressing Escape
            if (!this._globalDismissInstalled) {
                this._globalDismissInstalled = true;
                const dismissDropdowns = (e) => {
                    const pillContainer = e.target.closest ? e.target.closest('.mf-pill-container') : null;
                    document.querySelectorAll('.mf-autocomplete-dropdown').forEach(d => {
                        if (!pillContainer || !pillContainer.contains(d)) {
                            d.style.display = 'none';
                        }
                    });
                };
                // Capture phase ensures we intercept clicks before stopPropagation on .facet-modal-window
                document.addEventListener('click', dismissDropdowns, true);
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        document.querySelectorAll('.mf-autocomplete-dropdown').forEach(d => { d.style.display = 'none'; });
                    }
                }, true);
            }

            // Direct dismiss on panel content area as well
            contentArea.addEventListener('click', (e) => {
                const pillContainer = e.target.closest ? e.target.closest('.mf-pill-container') : null;
                contentArea.querySelectorAll('.mf-autocomplete-dropdown').forEach(d => {
                    if (!pillContainer || !pillContainer.contains(d)) {
                        d.style.display = 'none';
                    }
                });
            });

            // Multicheckbox pills change
            contentArea.querySelectorAll('.mf-mc-checkbox').forEach(cb => {
                cb.onchange = () => {
                    this.isDirty = true;
                    const pill = cb.closest('.mf-mc-pill');
                    if (pill) {
                        pill.style.border = cb.checked ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.15)';
                        pill.style.background = cb.checked ? 'rgba(139,92,246,0.25)' : 'rgba(0,0,0,0.2)';
                        pill.style.color = cb.checked ? '#ede9fe' : '#9ca3af';
                    }
                };
            });

            // Rating stars click
            contentArea.querySelectorAll('.mf-rating-group').forEach(group => {
                const stars = group.querySelectorAll('.mf-rating-star');
                const label = group.querySelector('.mf-rating-value-label');
                stars.forEach(star => {
                    star.onclick = (e) => {
                        e.stopPropagation();
                        const starVal = parseInt(star.dataset.starValue, 10);
                        const currentVal = parseInt(group.dataset.value, 10) || 0;
                        const newVal = (currentVal === starVal) ? 0 : starVal;
                        group.dataset.value = newVal;
                        this.isDirty = true;
                        stars.forEach(s => {
                            const sv = parseInt(s.dataset.starValue, 10);
                            s.style.color = sv <= newVal ? '#f59e0b' : '#4b5563';
                        });
                        if (label) {
                            label.textContent = newVal ? `${newVal}/5` : 'No rating';
                        }
                    };
                });
            });

            // Mark dirty on any change
            contentArea.querySelectorAll('.mf-editor-input, #mfEditorProjectName, #mfEditorRenameFolder').forEach(el => {
                el.addEventListener('input', () => { this.isDirty = true; });
                el.addEventListener('change', () => { this.isDirty = true; });
            });
        }

        /**
         * Prompts user to add a new custom field without window.prompt() (unsupported in Electron).
         */
        promptAddField(groupPathStr = null) {
            document.getElementById('mfAddFieldModal')?.remove();

            const modal = document.createElement('div');
            modal.id = 'mfAddFieldModal';
            modal.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(3px);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div style="background: #1e1e2f; border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 10px; width: 380px; max-width: 90vw; padding: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.6); display: flex; flex-direction: column; gap: 14px;">
                    <div style="font-weight: 700; color: #c4b5fd; font-size: 1rem; display: flex; justify-content: space-between; align-items: center;">
                        <span>➕ Add Field or Group</span>
                        <button type="button" id="mfAddFieldCloseBtn" style="background:none; border:none; color:#9ca3af; font-size:1.2rem; cursor:pointer;">&times;</button>
                    </div>

                    ${groupPathStr ? `<div style="font-size: 0.75rem; color: #9ca3af;">Adding inside: <strong style="color:#e5e7eb;">${groupPathStr.replace(/::/g, ' ❯ ')}</strong></div>` : ''}

                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label style="font-size: 0.75rem; color: #a78bfa; font-weight: 600; text-transform: uppercase;">Field Label / Name</label>
                        <input type="text" id="mfAddFieldNameInput" placeholder="e.g. Laser Line, Incubator, Status, Sample ID..." autofocus style="padding: 7px 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; color: #fff; font-size: 0.88rem; outline: none;">
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label style="font-size: 0.75rem; color: #a78bfa; font-weight: 600; text-transform: uppercase;">Field Type</label>
                        <select id="mfAddFieldTypeSelect" style="padding: 7px 10px; background: #262638; border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; color: #fff; font-size: 0.88rem; outline: none; cursor: pointer;">
                            <option value="text">Text (Single-line)</option>
                            <option value="number">Number (Numeric value)</option>
                            <option value="date">Date (Calendar date)</option>
                            <option value="textarea">Text Area (Plain text)</option>
                            <option value="notes">Markdown Notes &amp; Observations</option>
                            <option value="dropdown">Dropdown (Single-choice)</option>
                            <option value="checkbox">Checkbox (Yes / No)</option>
                            <option value="multicheckbox">Multi-Checkbox (Selectable pills)</option>
                            <option value="time">Time (Time of day)</option>
                            <option value="url">URL (Web Link)</option>
                            <option value="email">E-Mail (Email address)</option>
                            <option value="rating">Rating (1 to 5 stars)</option>
                            <option value="tags">Tags / IDs (Array of pills)</option>
                            <option value="id_anchor">Own / Internal ID (⚓ Sample ID / Barcode)</option>
                            <option value="derived_from">Derived From (Parent Link)</option>
                            <option value="related_to">Related To (Associative Link)</option>
                            <option value="group">Group (Section Header)</option>
                        </select>
                    </div>

                    <div id="mfAddFieldOptionsRow" style="display: none; flex-direction: column; gap: 6px;">
                        <label style="font-size: 0.75rem; color: #a78bfa; font-weight: 600; text-transform: uppercase;">Options (comma-separated)</label>
                        <input type="text" id="mfAddFieldOptionsInput" placeholder="Option 1, Option 2, Option 3..." style="padding: 7px 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; color: #fff; font-size: 0.88rem; outline: none;">
                    </div>

                    <div id="mfAddFieldUnitRow" style="display: none; flex-direction: column; gap: 6px;">
                        <label style="font-size: 0.75rem; color: #a78bfa; font-weight: 600; text-transform: uppercase;">Unit (optional)</label>
                        <input type="text" id="mfAddFieldUnitInput" placeholder="e.g. µl, °C, nm, mg/ml..." style="padding: 7px 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; color: #fff; font-size: 0.88rem; outline: none;">
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
                        <button type="button" class="btn btn-secondary btn-sm" id="mfAddFieldCancelBtn" style="padding: 6px 14px; font-size: 0.82rem;">Cancel</button>
                        <button type="button" class="btn btn-primary btn-sm" id="mfAddFieldConfirmBtn" style="padding: 6px 16px; font-size: 0.82rem; background: #8b5cf6; border-color: #8b5cf6;">Add Field</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const inputEl = document.getElementById('mfAddFieldNameInput');
            const selectEl = document.getElementById('mfAddFieldTypeSelect');
            const optionsRow = document.getElementById('mfAddFieldOptionsRow');
            const unitRow = document.getElementById('mfAddFieldUnitRow');
            const cancelBtn = document.getElementById('mfAddFieldCancelBtn');
            const closeBtn = document.getElementById('mfAddFieldCloseBtn');
            const confirmBtn = document.getElementById('mfAddFieldConfirmBtn');

            inputEl?.focus();

            const updateExtraRows = () => {
                const val = selectEl?.value;
                if (optionsRow) {
                    optionsRow.style.display = (val === 'dropdown' || val === 'multicheckbox') ? 'flex' : 'none';
                }
                if (unitRow) {
                    unitRow.style.display = (val === 'number') ? 'flex' : 'none';
                }
                if (confirmBtn) {
                    confirmBtn.textContent = val === 'group' ? 'Add Group' : 'Add Field';
                }
            };

            selectEl?.addEventListener('change', updateExtraRows);

            const closeModal = () => modal.remove();
            if (cancelBtn) cancelBtn.onclick = closeModal;
            if (closeBtn) closeBtn.onclick = closeModal;
            modal.onclick = (e) => { if (e.target === modal) closeModal(); };

            const handleConfirm = () => {
                const fieldLabel = inputEl?.value?.trim();
                if (!fieldLabel) {
                    inputEl?.focus();
                    return;
                }
                const fieldType = selectEl?.value || 'text';
                closeModal();

                const cleanLabel = fieldLabel;
                let cleanKey = cleanLabel.replace(/[^a-zA-Z0-9_]/g, '_');
                if (fieldType === 'derived_from') cleanKey = 'derived_from';
                else if (fieldType === 'related_to') cleanKey = 'related_to';

                const fullPath = groupPathStr ? [...groupPathStr.split('::'), cleanKey] : [cleanKey];

                let defaultValue;
                let options = null;
                let unit = null;

                if (fieldType === 'checkbox') {
                    defaultValue = false;
                } else if (fieldType === 'number') {
                    defaultValue = null;
                    unit = document.getElementById('mfAddFieldUnitInput')?.value?.trim() || '';
                } else if (fieldType === 'rating') {
                    defaultValue = 0;
                } else if (fieldType === 'dropdown') {
                    const rawOpts = document.getElementById('mfAddFieldOptionsInput')?.value || '';
                    options = rawOpts.split(',').map(s => s.trim()).filter(Boolean);
                    defaultValue = options[0] || '';
                } else if (fieldType === 'multicheckbox') {
                    const rawOpts = document.getElementById('mfAddFieldOptionsInput')?.value || '';
                    options = rawOpts.split(',').map(s => s.trim()).filter(Boolean);
                    defaultValue = [];
                } else if (fieldType === 'tags' || fieldType === 'derived_from' || fieldType === 'related_to') {
                    defaultValue = [];
                } else if (fieldType === 'group') {
                    defaultValue = undefined;
                } else {
                    defaultValue = '';
                }

                if (fieldType === 'group') {
                    this.addedFields.push({
                        path: fullPath,
                        isGroup: true,
                        field: {
                            label: cleanLabel
                        }
                    });
                } else {
                    this.addedFields.push({
                        path: fullPath,
                        field: {
                            label: cleanLabel,
                            type: fieldType,
                            value: defaultValue,
                            options,
                            unit
                        }
                    });
                }
                this.isDirty = true;

                // Re-render
                const container = document.getElementById('mfEditorFieldsContainer');
                if (container) {
                    const tempDiv = document.createElement('div');
                    const fieldObj = (fieldType === 'group')
                        ? {}
                        : { label: cleanLabel, type: fieldType, value: defaultValue, options, unit };
                    tempDiv.innerHTML = this._renderFieldOrGroup(cleanKey, fieldObj, groupPathStr ? groupPathStr.split('::') : []);

                    if (tempDiv.firstElementChild) {
                        if (groupPathStr) {
                            const targetGroupContent = document.querySelector(`.mf-editor-group[data-group-path="${groupPathStr}"] .mf-editor-group-content`);
                            if (targetGroupContent) {
                                targetGroupContent.appendChild(tempDiv.firstElementChild);
                            } else {
                                container.appendChild(tempDiv.firstElementChild);
                            }
                        } else {
                            container.appendChild(tempDiv.firstElementChild);
                        }
                        this._bindEvents();
                    }
                }
            };

            if (confirmBtn) confirmBtn.onclick = handleConfirm;
            inputEl?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                } else if (e.key === 'Escape') {
                    closeModal();
                }
            });
        }

        /**
         * Collects form inputs and saves changes to backend.
         */
        async save() {
            if (!this.currentProject) return;

            const saveBtn = document.getElementById('mfEditorSaveBtn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = '⏳ Saving...';
            }

            try {
                const projectPath = this.currentProject.path;
                const newName = document.getElementById('mfEditorProjectName')?.value?.trim();
                const renameFolder = document.getElementById('mfEditorRenameFolder')?.checked === true;

                const patch = {
                    set: [],
                    remove: []
                };

                // Rename check
                const currentName = this.currentProject.name || this.currentProject.projectName;
                if (newName && newName !== currentName) {
                    patch.rename = {
                        newName,
                        renameFolder
                    };
                }

                // 1. Collect modified and existing field inputs
                document.querySelectorAll('.mf-editor-input').forEach(input => {
                    const pathStr = input.dataset.fieldPath;
                    if (!pathStr) return;
                    if (input.closest('.mf-pill-container') || input.closest('.mf-multicheckbox-group') || input.closest('.mf-rating-group')) return;
                    const pathParts = pathStr.split('::');
                    const fieldType = input.dataset.fieldType;

                    let val;
                    if (fieldType === 'checkbox') {
                        val = input.checked;
                    } else if (fieldType === 'number') {
                        val = input.value === '' ? null : Number(input.value);
                    } else if (fieldType === 'array') {
                        val = input.value.split(',').map(s => s.trim()).filter(Boolean);
                    } else if (fieldType === 'id_anchor') {
                        val = input.value.trim();
                    } else {
                        val = input.value;
                    }

                    // Locate original field info if available to retain unit / label / options
                    let originalField = this.originalMetadata;
                    for (const p of pathParts) {
                        if (originalField && typeof originalField === 'object') {
                            originalField = originalField[p];
                        }
                    }

                    const originalVal = originalField && typeof originalField === 'object' && originalField.value !== undefined
                        ? originalField.value
                        : originalField;

                    const addedFieldInfo = this.addedFields.find(af => af.path.join('::') === pathStr)?.field;
                    const isNew = !!addedFieldInfo;
                    const isChanged = JSON.stringify(val) !== JSON.stringify(originalVal);

                    if (isNew || isChanged) {
                        const targetType = addedFieldInfo?.type || (fieldType === 'array' ? (originalField?.type || 'tags') : (originalField?.type || fieldType));
                        const targetOptions = addedFieldInfo?.options || originalField?.options || undefined;
                        const targetUnit = addedFieldInfo?.unit || originalField?.unit || undefined;

                        patch.set.push({
                            path: pathParts,
                            field: {
                                ...(typeof originalField === 'object' && originalField !== null ? originalField : {}),
                                ...(addedFieldInfo || {}),
                                label: originalField?.label || addedFieldInfo?.label || pathParts[pathParts.length - 1].replace(/_/g, ' '),
                                type: targetType,
                                value: val,
                                ...(targetOptions ? { options: targetOptions } : {}),
                                ...(targetUnit ? { unit: targetUnit } : {})
                            }
                        });
                    }
                });

                // 2. Collect multicheckbox fields
                document.querySelectorAll('.mf-multicheckbox-group').forEach(group => {
                    const pathStr = group.dataset.fieldPath;
                    if (!pathStr) return;
                    const pathParts = pathStr.split('::');
                    const selected = Array.from(group.querySelectorAll('.mf-mc-checkbox:checked')).map(cb => cb.value);

                    let originalField = this.originalMetadata;
                    for (const p of pathParts) {
                        if (originalField && typeof originalField === 'object') {
                            originalField = originalField[p];
                        }
                    }

                    const originalVal = originalField && typeof originalField === 'object' && originalField.value !== undefined
                        ? originalField.value
                        : originalField;
                    const normalizedOrig = Array.isArray(originalVal) ? originalVal : (typeof originalVal === 'string' && originalVal ? originalVal.split(',').map(s => s.trim()) : []);

                    const addedFieldInfo = this.addedFields.find(af => af.path.join('::') === pathStr)?.field;
                    const isNew = !!addedFieldInfo;
                    const isChanged = JSON.stringify(selected) !== JSON.stringify(normalizedOrig);

                    if (isNew || isChanged) {
                        patch.set.push({
                            path: pathParts,
                            field: {
                                ...(typeof originalField === 'object' && originalField !== null ? originalField : {}),
                                ...(addedFieldInfo || {}),
                                label: originalField?.label || addedFieldInfo?.label || pathParts[pathParts.length - 1].replace(/_/g, ' '),
                                type: 'multicheckbox',
                                options: originalField?.options || addedFieldInfo?.options || [],
                                value: selected
                            }
                        });
                    }
                });

                // 3. Collect rating fields
                document.querySelectorAll('.mf-rating-group').forEach(group => {
                    const pathStr = group.dataset.fieldPath;
                    if (!pathStr) return;
                    const pathParts = pathStr.split('::');
                    const val = parseInt(group.dataset.value, 10) || 0;

                    let originalField = this.originalMetadata;
                    for (const p of pathParts) {
                        if (originalField && typeof originalField === 'object') {
                            originalField = originalField[p];
                        }
                    }

                    const originalVal = originalField && typeof originalField === 'object' && originalField.value !== undefined
                        ? originalField.value
                        : originalField;
                    const numOrig = parseInt(originalVal, 10) || 0;

                    const addedFieldInfo = this.addedFields.find(af => af.path.join('::') === pathStr)?.field;
                    const isNew = !!addedFieldInfo;
                    const isChanged = val !== numOrig;

                    if (isNew || isChanged) {
                        patch.set.push({
                            path: pathParts,
                            field: {
                                ...(typeof originalField === 'object' && originalField !== null ? originalField : {}),
                                ...(addedFieldInfo || {}),
                                label: originalField?.label || addedFieldInfo?.label || pathParts[pathParts.length - 1].replace(/_/g, ' '),
                                type: 'rating',
                                value: val
                            }
                        });
                    }
                });

                // 4. Collect pill fields (derived_from, related_to, tags)
                document.querySelectorAll('.mf-pill-container').forEach(container => {
                    const pathStr = container.dataset.fieldPath;
                    if (!pathStr) return;
                    const pathParts = pathStr.split('::');
                    const mode = container.dataset.mode;

                    const pills = Array.from(container.querySelectorAll('.mf-pill-item'))
                        .map(p => p.dataset.itemId)
                        .filter(Boolean);

                    const pillInput = container.querySelector('.mf-editor-pill-input');
                    if (pillInput && pillInput.value && pillInput.value.trim()) {
                        const leftoverRaw = pillInput.value.trim().replace(/,$/, '');
                        const leftoverParts = (!mode.includes('derived') && !mode.includes('related') && leftoverRaw.includes(','))
                            ? leftoverRaw.split(',').map(s => s.trim()).filter(Boolean)
                            : [leftoverRaw];
                        leftoverParts.forEach(part => {
                            if (part && !pills.includes(part)) {
                                pills.push(part);
                            }
                        });
                    }

                    let originalField = this.originalMetadata;
                    for (const p of pathParts) {
                        if (originalField && typeof originalField === 'object') {
                            originalField = originalField[p];
                        }
                    }

                    const originalVal = originalField && typeof originalField === 'object' && originalField.value !== undefined
                        ? originalField.value
                        : originalField;

                    let normalizedOrig = [];
                    if (Array.isArray(originalVal)) {
                        normalizedOrig = originalVal.map(item => (typeof item === 'object' && item ? (item.id || item.name) : String(item)).trim()).filter(Boolean);
                    } else if (typeof originalVal === 'string' && originalVal.trim()) {
                        const trimmedOrig = originalVal.trim();
                        if (trimmedOrig.startsWith('[') && trimmedOrig.endsWith(']')) {
                            try {
                                const parsed = JSON.parse(trimmedOrig);
                                if (Array.isArray(parsed)) normalizedOrig = parsed.map(s => String(s).trim()).filter(Boolean);
                                else normalizedOrig = [trimmedOrig];
                            } catch (_) {
                                normalizedOrig = trimmedOrig.replace(/^\[|\]$/g, '').split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
                            }
                        } else {
                            normalizedOrig = trimmedOrig.split(',').map(s => s.trim()).filter(Boolean);
                        }
                    }

                    const addedFieldInfo = this.addedFields.find(af => af.path.join('::') === pathStr)?.field;
                    const isNew = !!addedFieldInfo;
                    const isChanged = JSON.stringify(pills) !== JSON.stringify(normalizedOrig);

                    if (isNew || isChanged) {
                        const targetType = mode === 'derived_from' ? 'derived_from' : (mode === 'related_to' ? 'related_to' : 'tags');
                        patch.set.push({
                            path: pathParts,
                            field: {
                                ...(typeof originalField === 'object' && originalField !== null ? originalField : {}),
                                ...(addedFieldInfo || {}),
                                label: originalField?.label || addedFieldInfo?.label || pathParts[pathParts.length - 1].replace(/_/g, ' '),
                                type: targetType,
                                value: pills
                            }
                        });
                    }
                });

                // 5. Empty newly added groups without subfields
                for (const af of this.addedFields) {
                    if (af.isGroup) {
                        const groupPathStr = af.path.join('::');
                        const hasSubfield = patch.set.some(item => item.path.join('::').startsWith(groupPathStr + '::'));
                        if (!hasSubfield) {
                            patch.set.push({
                                path: af.path,
                                field: {
                                    label: af.field?.label || af.path[af.path.length - 1].replace(/_/g, ' ')
                                }
                            });
                        }
                    }
                }

                // 6. Deleted fields
                for (const delPathStr of this.deletedFieldPaths) {
                    patch.remove.push({
                        path: delPathStr.split('::')
                    });
                }

                // Call backend IPC
                const userInfo = window.userManager?.getCurrentUserInfo?.() || null;
                const res = await window.electronAPI.updateProjectMetadata(projectPath, patch, {
                    userInfo,
                    expectedUpdatedAt: this.expectedUpdatedAt,
                    updateIndex: true,
                    action: 'Metadata Edited'
                });

                if (!res.success) {
                    if (res.conflict) {
                        const overwrite = confirm(`⚠️ Conflict Warning:\n${res.message}\n\nDo you want to force save and overwrite anyway?`);
                        if (overwrite) {
                            return this.saveWithForce();
                        }
                        return;
                    }
                    alert(`Failed to save metadata changes: ${res.message || 'Unknown error'}`);
                    return;
                }

                this.isDirty = false;
                this.isEditing = false;

                // Sync project in memory
                const updatedProj = res.project || {
                    ...this.currentProject,
                    path: res.projectPath || this.currentProject.path,
                    name: res.projectName || this.currentProject.name,
                    updated_at: res.updatedAt
                };

                if (window.facetSearch) {
                    // Update masterData
                    const idx = window.facetSearch.masterData.findIndex(p => p.path === this.currentProject.path);
                    if (idx >= 0) {
                        window.facetSearch.masterData[idx] = {
                            ...window.facetSearch.masterData[idx],
                            ...updatedProj
                        };
                    }
                    // Refresh Tabulator table data without full destruction if possible
                    if (window.facetSearch.tabulatorInstance) {
                        const row = window.facetSearch.tabulatorInstance.getRow(this.currentProject.path);
                        if (row) {
                            row.update(window.facetSearch._buildTableData([updatedProj])[0]);
                        }
                    }
                    // Show updated project in right panel
                    window.facetSearch.showProjectDetails(updatedProj);
                }

                // Check for external integration push prompt
                this._promptIntegrationPushIfNeeded(updatedProj, patch);

            } catch (err) {
                console.error('❌ Error saving project metadata:', err);
                alert(`Error saving metadata: ${err.message}`);
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = '💾 Save Changes';
                }
            }
        }

        async saveWithForce() {
            this.expectedUpdatedAt = null;
            return this.save();
        }

        /**
         * Checks if the project has eLabFTW or OMERO links and prompts the user
         * whether they would like to sync updated fields.
         */
        _promptIntegrationPushIfNeeded(project, patch) {
            if (!patch.set || patch.set.length === 0) return;
            const urls = (window.facetSearch && window.facetSearch._extractUrls(project)) || {};
            const hasElab = !!urls.elabUrl;
            const hasOmero = !!urls.omeroUrl;

            if (!hasElab && !hasOmero) return;

            const targets = [];
            if (hasElab) targets.push('eLabFTW');
            if (hasOmero) targets.push('OMERO');

            const shouldPush = confirm(`Project metadata saved successfully!\n\nThis project is linked to: ${targets.join(' & ')}.\nWould you like to send updated fields to these integrations now?`);
            if (!shouldPush) return;

            if (hasElab && window.projectManager?.addIntegrationFieldsToElabFTW) {
                console.log('🧪 Pushing updated fields to eLabFTW...');
            }
            if (hasOmero && window.metaFoldOMEROIntegration) {
                console.log('🔬 Pushing updated annotations to OMERO...');
            }
        }
    }

    return new ProjectInlineEditor();
});

