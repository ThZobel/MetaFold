/**
 * MetaFold Note Composer & Micro-Markdown Toolbar
 *
 * Provides a clean note-taking modal with category pills,
 * 7-button micro-markdown formatting bar, autocomplete shortcuts (#tags, [[projects]]),
 * and instant interactive task list toggling.
 */
'use strict';

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.noteComposer = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {

    const CATEGORIES = [
        { id: 'general', label: 'General', icon: '📝' },
        { id: 'observation', label: 'Observation', icon: '🔍' },
        { id: 'deviation', label: 'Deviation', icon: '⚠️' },
        { id: 'retrospective', label: 'Retrospective', icon: '🔁' }
    ];

    class NoteComposer {
        constructor() {
            this.modalEl = null;
            this.currentProject = null;
            this.editingNoteId = null;
            this.selectedCategory = 'general';
            this.autocompleteActive = false;
        }

        init() {
            this._ensureModalHtml();
            this._bindGlobalEvents();
        }

        _ensureModalHtml() {
            if (document.getElementById('noteComposerModal')) return;

            const modalHtml = `
                <div id="noteComposerModal" class="mf-modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); z-index: 10000; align-items: center; justify-content: center;">
                    <div class="mf-modal-container" style="width: 580px; max-width: 94vw; background: #1e1e2f; border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); overflow: visible; display: flex; flex-direction: column;">
                        
                        <!-- Header -->
                        <div style="padding: 14px 18px; background: rgba(139, 92, 246, 0.12); border-bottom: 1px solid rgba(139, 92, 246, 0.2); border-top-left-radius: 12px; border-top-right-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                            <div style="font-weight: 700; color: #c4b5fd; font-size: 1rem;" id="noteComposerTitle">➕ Add Note</div>
                            <button type="button" class="btn-close" id="noteComposerCloseBtn" style="background: none; border: none; color: #9ca3af; font-size: 1.2rem; cursor: pointer;">&times;</button>
                        </div>

                        <!-- Body -->
                        <div style="padding: 18px; display: flex; flex-direction: column; gap: 12px; position: relative;">
                            
                            <!-- Project Badge -->
                            <div style="font-size: 0.78rem; color: #9ca3af; display: flex; align-items: center; gap: 6px;">
                                <span>Project:</span>
                                <strong id="noteComposerProjectName" style="color: #e5e7eb;">—</strong>
                            </div>

                            <!-- 1-Click Category Pills -->
                            <div>
                                <div style="font-size: 0.72rem; text-transform: uppercase; color: #a78bfa; font-weight: 600; margin-bottom: 6px;">Category</div>
                                <div id="noteComposerPills" style="display: flex; flex-wrap: wrap; gap: 6px;">
                                    ${CATEGORIES.map(cat => `
                                        <button type="button" class="mf-category-pill" data-cat="${cat.id}" style="border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color: #d1d5db; padding: 4px 10px; border-radius: 999px; font-size: 0.8rem; cursor: pointer; transition: all 0.15s ease;">
                                            ${cat.icon} ${cat.label}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Textarea & In-Place Preview -->
                            <div style="position: relative;">
                                <textarea id="noteComposerText" rows="7" placeholder="Write observation, anomaly, hypothesis, or note... Use #tags or [[Project Name]]" style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #fff; font-family: inherit; font-size: 0.88rem; line-height: 1.5; resize: vertical; outline: none;"></textarea>
                                
                                <div id="noteComposerPreview" class="mf-md" style="display: none; width: 100%; min-height: 175px; max-height: 320px; overflow-y: auto; padding: 10px; background: rgba(0,0,0,0.35); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 6px; font-size: 0.88rem; line-height: 1.5; color: #e5e7eb; cursor: pointer;" title="Click anywhere to return to editing"></div>

                                <!-- Autocomplete Dropdown List -->
                                <div id="noteComposerAutocomplete" style="display: none; position: absolute; left: 10px; top: calc(100% + 4px); max-height: 200px; width: 280px; overflow-y: auto; background: #262638; border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 6px; box-shadow: 0 10px 25px rgba(0,0,0,0.7); z-index: 10005;"></div>
                            </div>

                            <!-- 7-Button Micro-Markdown Toolbar + In-Place Preview Toggle -->
                            <div id="noteComposerToolbar" style="display: flex; gap: 4px; align-items: center; background: rgba(255,255,255,0.04); padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
                                <button type="button" class="btn btn-secondary btn-sm mf-tb-btn" data-action="h" title="Heading (### )" style="padding: 2px 7px; font-size: 0.78rem; font-weight: bold;">H</button>
                                <button type="button" class="btn btn-secondary btn-sm mf-tb-btn" data-action="bullet" title="Bullet List (- )" style="padding: 2px 7px; font-size: 0.78rem;">•</button>
                                <button type="button" class="btn btn-secondary btn-sm mf-tb-btn" data-action="number" title="Numbered List (1. )" style="padding: 2px 7px; font-size: 0.78rem;">1.</button>
                                <button type="button" class="btn btn-secondary btn-sm mf-tb-btn" data-action="task" title="Task Checkbox (- [ ] )" style="padding: 2px 7px; font-size: 0.78rem;">☑️</button>
                                <span style="width: 1px; height: 16px; background: rgba(255,255,255,0.15); margin: 0 2px;"></span>
                                <button type="button" class="btn btn-secondary btn-sm mf-tb-btn" data-action="tag" title="Tag (#tag)" style="padding: 2px 7px; font-size: 0.78rem;">#</button>
                                <button type="button" class="btn btn-secondary btn-sm mf-tb-btn" data-action="link" title="Link or [[Project]]" style="padding: 2px 7px; font-size: 0.78rem;">🔗</button>
                                <button type="button" class="btn btn-secondary btn-sm mf-tb-btn" data-action="time" title="Insert Timestamp" style="padding: 2px 7px; font-size: 0.78rem;">📅</button>
                                
                                <span style="flex: 1;"></span>
                                <button type="button" class="btn btn-secondary btn-sm" id="noteComposerTogglePreviewBtn" title="Switch between Write and Preview mode" style="padding: 2px 9px; font-size: 0.78rem; color: #c4b5fd; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.35); border-radius: 4px; cursor: pointer;">👁️ Preview</button>
                                <span style="font-size: 0.7rem; color: #6b7280; margin-left: 6px;">Ctrl+Enter</span>
                            </div>
                            <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 4px; display: flex; align-items: center; gap: 6px; padding: 0 2px;">
                                <span>💡</span>
                                <span><code>[[Project Name]]</code> links automatically as <strong>Related To</strong> (associative, keeps parent lineage clean) · <code>#tag</code> adds a clickable filter tag</span>
                            </div>

                        </div>

                        <!-- Footer -->
                        <div style="padding: 12px 18px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: flex-end; gap: 8px;">
                            <button type="button" class="btn btn-secondary" id="noteComposerCancelBtn" style="font-size: 0.82rem; padding: 5px 12px;">Cancel</button>
                            <button type="button" class="btn btn-primary" id="noteComposerSaveBtn" style="font-size: 0.82rem; padding: 5px 16px; background: #8b5cf6; border-color: #7c3aed; font-weight: 600;">Save Note</button>
                        </div>
                    </div>
                </div>
            `;

            const wrapper = document.createElement('div');
            wrapper.innerHTML = modalHtml;
            document.body.appendChild(wrapper.firstElementChild);
            this.modalEl = document.getElementById('noteComposerModal');
        }

        _bindGlobalEvents() {
            const modal = document.getElementById('noteComposerModal');
            if (!modal) return;

            const close = () => this.close();
            document.getElementById('noteComposerCloseBtn').onclick = close;
            document.getElementById('noteComposerCancelBtn').onclick = close;
            modal.onclick = (e) => {
                if (e.target === modal) close();
            };

            // Category pills click
            modal.querySelectorAll('.mf-category-pill').forEach(pill => {
                pill.onclick = () => {
                    const cat = pill.dataset.cat;
                    this.setCategory(cat);
                };
            });

            // Toolbar buttons
            modal.querySelectorAll('.mf-tb-btn').forEach(btn => {
                btn.onclick = () => {
                    const action = btn.dataset.action;
                    this.applyToolbarAction(action);
                };
            });

            // Save button
            document.getElementById('noteComposerSaveBtn').onclick = () => this.save();

            // Toggle live preview button and in-place preview swap
            const togglePreviewBtn = document.getElementById('noteComposerTogglePreviewBtn');
            const previewEl = document.getElementById('noteComposerPreview');
            const textarea = document.getElementById('noteComposerText');
            const toolbar = document.getElementById('noteComposerToolbar');

            const setPreviewMode = (showPreview) => {
                if (!previewEl || !textarea) return;
                if (showPreview) {
                    const raw = textarea.value || '';
                    if (window.markdownLite) {
                        previewEl.innerHTML = raw.trim()
                            ? window.markdownLite.render(raw)
                            : '<em style="color:#6b7280; font-style:italic;">Nothing to preview yet. Click to write...</em>';
                    } else {
                        previewEl.textContent = raw || 'Empty';
                    }
                    previewEl.style.minHeight = `${Math.max(160, textarea.offsetHeight)}px`;
                    textarea.style.display = 'none';
                    previewEl.style.display = 'block';
                    if (togglePreviewBtn) {
                        togglePreviewBtn.innerHTML = '✏️ Edit';
                        togglePreviewBtn.style.background = '#8b5cf6';
                        togglePreviewBtn.style.color = '#fff';
                    }
                    if (toolbar) {
                        toolbar.querySelectorAll('.mf-tb-btn').forEach(b => {
                            b.disabled = true;
                            b.style.opacity = '0.35';
                            b.style.pointerEvents = 'none';
                        });
                    }
                } else {
                    previewEl.style.display = 'none';
                    textarea.style.display = 'block';
                    if (togglePreviewBtn) {
                        togglePreviewBtn.innerHTML = '👁️ Preview';
                        togglePreviewBtn.style.background = 'rgba(139, 92, 246, 0.15)';
                        togglePreviewBtn.style.color = '#c4b5fd';
                    }
                    if (toolbar) {
                        toolbar.querySelectorAll('.mf-tb-btn').forEach(b => {
                            b.disabled = false;
                            b.style.opacity = '1';
                            b.style.pointerEvents = 'auto';
                        });
                    }
                    textarea.focus();
                }
            };

            this._setPreviewMode = setPreviewMode;

            if (togglePreviewBtn) {
                togglePreviewBtn.onclick = () => {
                    const inPreview = previewEl && previewEl.style.display !== 'none';
                    setPreviewMode(!inPreview);
                };
            }

            if (previewEl) {
                previewEl.onclick = () => {
                    setPreviewMode(false);
                };
            }

            // Textarea input and live shortcuts
            if (textarea) {
                this._acIndex = -1;

                textarea.addEventListener('keydown', (e) => {
                    const dropdown = document.getElementById('noteComposerAutocomplete');
                    const isOpen = dropdown && dropdown.style.display !== 'none';

                    if (isOpen) {
                        const items = dropdown.querySelectorAll('.mf-ac-item');
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            this._acIndex = (this._acIndex + 1) % items.length;
                            this._updateAcHighlight(items);
                            return;
                        } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            this._acIndex = (this._acIndex - 1 + items.length) % items.length;
                            this._updateAcHighlight(items);
                            return;
                        } else if (e.key === 'Enter' || e.key === 'Tab') {
                            if (this._acIndex >= 0 && items[this._acIndex]) {
                                e.preventDefault();
                                items[this._acIndex].click();
                                return;
                            }
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            this._hideAutocomplete();
                            return;
                        }
                    }

                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        this.save();
                    }
                });

                textarea.addEventListener('input', () => {
                    this._checkShortcutsAndAutocomplete(textarea);
                });
            }

            // Outside click to dismiss note composer autocomplete (Capture phase)
            document.addEventListener('click', (e) => {
                const dropdown = document.getElementById('noteComposerAutocomplete');
                if (dropdown && dropdown.style.display !== 'none') {
                    if (!e.target.closest('#noteComposerAutocomplete') && e.target.id !== 'noteComposerText') {
                        this._hideAutocomplete();
                    }
                }
            }, true);

            // Interactive task checkboxes delegated click in #facetRightPanel
            document.addEventListener('change', (e) => {
                if (e.target && e.target.classList.contains('mf-md-task-box') && e.target.dataset.mfTaskIndex !== undefined) {
                    this._handlePanelTaskToggle(e.target);
                }
            });
        }

        setCategory(catId) {
            this.selectedCategory = catId;
            const pills = document.querySelectorAll('#noteComposerPills .mf-category-pill');
            pills.forEach(p => {
                if (p.dataset.cat === catId) {
                    p.style.background = '#8b5cf6';
                    p.style.borderColor = '#a78bfa';
                    p.style.color = '#fff';
                    p.style.fontWeight = '600';
                } else {
                    p.style.background = 'rgba(255,255,255,0.05)';
                    p.style.borderColor = 'rgba(255,255,255,0.15)';
                    p.style.color = '#d1d5db';
                    p.style.fontWeight = 'normal';
                }
            });
        }

        /**
         * Opens note composer for adding a note.
         */
        open(project) {
            this.init();
            if (!project) return;
            this.currentProject = project;
            this.editingNoteId = null;

            document.getElementById('noteComposerTitle').textContent = '➕ Add Note';
            document.getElementById('noteComposerProjectName').textContent = project.name || project.projectName || 'Project';
            document.getElementById('noteComposerText').value = '';
            this.setCategory('general');

            this.modalEl.style.display = 'flex';
            if (typeof this._setPreviewMode === 'function') this._setPreviewMode(false);
            setTimeout(() => document.getElementById('noteComposerText').focus(), 50);
        }

        /**
         * Opens note composer for editing an existing note.
         */
        editNote(project, note) {
            this.init();
            if (!project || !note) return;
            this.currentProject = project;
            this.editingNoteId = note.id;

            document.getElementById('noteComposerTitle').textContent = '✏️ Edit Note';
            document.getElementById('noteComposerProjectName').textContent = project.name || project.projectName || 'Project';
            document.getElementById('noteComposerText').value = note.text || '';
            this.setCategory(note.category || 'general');

            this.modalEl.style.display = 'flex';
            if (typeof this._setPreviewMode === 'function') this._setPreviewMode(false);
            setTimeout(() => document.getElementById('noteComposerText').focus(), 50);
        }

        /**
         * Prompts and deletes a note from project.
         */
        async deleteNote(project, noteId) {
            if (!project || !noteId) return;
            if (!confirm('Are you sure you want to delete this note?')) return;

            try {
                const userInfo = window.userManager?.getCurrentUserInfo?.() || null;
                const res = await window.electronAPI.updateProjectMetadata(project.path, {
                    notes_log: { remove: [noteId] }
                }, { userInfo, action: 'Note Deleted' });

                if (res.success && window.facetSearch) {
                    const idx = window.facetSearch.masterData.findIndex(p => p.path === project.path);
                    if (idx >= 0 && res.project) {
                        window.facetSearch.masterData[idx] = { ...window.facetSearch.masterData[idx], ...res.project };
                    }
                    window.facetSearch.showProjectDetails(res.project || project);
                }
            } catch (err) {
                console.error('❌ Error deleting note:', err);
                alert(`Error deleting note: ${err.message}`);
            }
        }

        close() {
            if (this.modalEl) {
                this.modalEl.style.display = 'none';
            }
            this._hideAutocomplete();
        }

        applyToolbarAction(action) {
            const ta = document.getElementById('noteComposerText');
            if (!ta) return;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const text = ta.value;
            const selected = text.slice(start, end);

            let insert = '';
            let newCursor = start;

            switch (action) {
                case 'h':
                    insert = `### ${selected || 'Heading'}`;
                    newCursor = start + insert.length;
                    break;
                case 'bullet':
                    insert = `- ${selected || 'List item'}`;
                    newCursor = start + insert.length;
                    break;
                case 'number':
                    insert = `1. ${selected || 'Step'}`;
                    newCursor = start + insert.length;
                    break;
                case 'task':
                    insert = `- [ ] ${selected || 'Task'}`;
                    newCursor = start + insert.length;
                    break;
                case 'tag':
                    if (selected) {
                        insert = `#${selected} `;
                        newCursor = start + insert.length;
                    } else {
                        insert = '#';
                        newCursor = start + 1;
                    }
                    break;
                case 'link':
                    if (selected) {
                        insert = `[${selected}](https://)`;
                        newCursor = start + insert.length;
                    } else {
                        insert = '[[';
                        newCursor = start + 2;
                    }
                    break;
                case 'time':
                    const now = new Date();
                    const stamp = `[${now.toISOString().replace('T', ' ').slice(0, 16)}] `;
                    insert = stamp;
                    newCursor = start + insert.length;
                    break;
            }

            ta.value = text.slice(0, start) + insert + text.slice(end);
            ta.focus();
            ta.setSelectionRange(newCursor, newCursor);
            this._updateLivePreview();

            // Trigger autocomplete immediately when inserting bare shortcut
            if (action === 'tag' && !selected) {
                this._showTagAutocomplete('', ta, start);
            } else if (action === 'link' && !selected) {
                this._showProjectAutocomplete('', ta, start);
            }
        }

        _checkShortcutsAndAutocomplete(textarea) {
            const text = textarea.value;
            const cursor = textarea.selectionStart;

            // Live shortcut: *[] + space -> - [ ]
            const beforeCursor = text.slice(0, cursor);
            if (beforeCursor.endsWith('*[] ')) {
                const replaced = beforeCursor.slice(0, -4) + '- [ ] ';
                textarea.value = replaced + text.slice(cursor);
                textarea.setSelectionRange(replaced.length, replaced.length);
                return;
            }

            // Tag Autocomplete: #...
            const tagMatch = /(?:^|\s)#([a-zA-Z0-9_\-]{0,20})$/.exec(beforeCursor);
            if (tagMatch) {
                const query = tagMatch[1].toLowerCase();
                this._showTagAutocomplete(query, textarea, cursor - query.length - 1);
                return;
            }

            // Project Mention Autocomplete: [[... or [...
            const mentionMatch = /(?:\[\[|(?:\s|^)\[)([^\[\]\n]{0,35})$/.exec(beforeCursor);
            if (mentionMatch) {
                const query = mentionMatch[1].toLowerCase();
                const isDouble = beforeCursor.endsWith('[[' + mentionMatch[1]);
                const prefixLen = isDouble ? 2 : 1;
                this._showProjectAutocomplete(query, textarea, cursor - query.length - prefixLen);
                return;
            }

            this._hideAutocomplete();
        }

        _updateAcHighlight(items) {
            items.forEach((item, idx) => {
                item.style.background = idx === this._acIndex ? 'rgba(139, 92, 246, 0.28)' : 'transparent';
            });
        }

        _showTagAutocomplete(query, textarea, tokenStart) {
            const dropdown = document.getElementById('noteComposerAutocomplete');
            if (!dropdown) return;

            // Collect all known tags using centralized harvester
            const allTags = (typeof window !== 'undefined' && window.getAllKnownTags)
                ? window.getAllKnownTags()
                : [];

            const q = (query || '').toLowerCase().trim();
            const matches = allTags.filter(t => !q || t.toLowerCase().includes(q)).slice(0, 10);
            if (matches.length === 0) {
                this._hideAutocomplete();
                return;
            }

            const tagHeaderHtml = `<div style="padding: 4px 10px; font-size: 0.68rem; font-weight: 700; color: #c4b5fd; background: rgba(139, 92, 246, 0.14); border-bottom: 1px solid rgba(139, 92, 246, 0.3); text-transform: uppercase; letter-spacing: 0.03em;">🏷️ Add tag (#tag)</div>`;
            dropdown.innerHTML = tagHeaderHtml + matches.map(m => `
                <div class="mf-ac-item" style="padding: 6px 10px; cursor: pointer; font-size: 0.8rem; color: #c4b5fd; border-bottom: 1px solid rgba(255,255,255,0.05);" data-val="${m}">
                    🏷️ #${m}
                </div>
            `).join('');

            const items = dropdown.querySelectorAll('.mf-ac-item');
            this._acIndex = 0;
            this._updateAcHighlight(items);

            items.forEach((item, idx) => {
                item.onmouseenter = () => {
                    this._acIndex = idx;
                    this._updateAcHighlight(items);
                };
                item.onmousedown = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const tagVal = item.dataset.val;
                    const text = textarea.value;
                    const end = textarea.selectionStart;
                    textarea.value = text.slice(0, tokenStart) + `#${tagVal} ` + text.slice(end);
                    const newPos = tokenStart + tagVal.length + 2;
                    textarea.focus();
                    textarea.setSelectionRange(newPos, newPos);
                    this._hideAutocomplete();
                    this._updateLivePreview();
                };
            });

            dropdown.style.display = 'block';
        }

        _updateLivePreview() {}

        _showProjectAutocomplete(query, textarea, tokenStart) {
            const dropdown = document.getElementById('noteComposerAutocomplete');
            if (!dropdown) return;

            const esc = (str) => window.markdownLite?.escapeHtml
                ? window.markdownLite.escapeHtml(str)
                : String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const escAttr = (str) => window.markdownLite?.escapeAttr
                ? window.markdownLite.escapeAttr(str)
                : esc(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

            const seenLower = new Set();
            const allProjects = [];
            const pushCandidate = (rawName) => {
                const trimmed = String(rawName || '').trim();
                if (!trimmed) return;
                const key = trimmed.toLowerCase();
                if (seenLower.has(key)) return;
                seenLower.add(key);
                allProjects.push(trimmed);
            };

            if (window.facetSearch && Array.isArray(window.facetSearch.masterData)) {
                window.facetSearch.masterData.forEach(p => pushCandidate(p.name));
            }
            if (window.projectScanner && Array.isArray(window.projectScanner.projects)) {
                window.projectScanner.projects.forEach(p => pushCandidate(p.name));
            }
            if (window.experimentForm && Array.isArray(window.experimentForm._idDictionaryItems)) {
                window.experimentForm._idDictionaryItems.forEach(item => {
                    if (typeof item === 'string') {
                        pushCandidate(item);
                    } else if (item && typeof item === 'object') {
                        pushCandidate(item.projectName || item.name || item.title || item.id);
                    }
                });
            }

            const q = (query || '').toLowerCase().trim();
            const matches = allProjects.filter(name => !q || name.toLowerCase().includes(q)).slice(0, 10);
            if (matches.length === 0) {
                this._hideAutocomplete();
                return;
            }

            const headerHtml = `<div style="padding: 4px 10px; font-size: 0.68rem; font-weight: 700; color: #7dd3fc; background: rgba(56, 189, 248, 0.1); border-bottom: 1px solid rgba(56, 189, 248, 0.25); text-transform: uppercase; letter-spacing: 0.03em;">🔀 Link related projects ([[Project]])</div>`;
            dropdown.innerHTML = headerHtml + matches.map(m => `
                <div class="mf-ac-item" style="padding: 6px 10px; cursor: pointer; font-size: 0.8rem; color: #93c5fd; border-bottom: 1px solid rgba(255,255,255,0.05);" data-val="${escAttr(m)}">
                    📁 ${esc(m)}
                </div>
            `).join('');

            const items = dropdown.querySelectorAll('.mf-ac-item');
            this._acIndex = 0;
            this._updateAcHighlight(items);

            items.forEach((item, idx) => {
                item.onmouseenter = () => {
                    this._acIndex = idx;
                    this._updateAcHighlight(items);
                };
                item.onmousedown = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const projName = item.dataset.val;
                    const text = textarea.value;
                    const end = textarea.selectionStart;
                    textarea.value = text.slice(0, tokenStart) + `[[${projName}]] ` + text.slice(end);
                    const newPos = tokenStart + projName.length + 5;
                    textarea.focus();
                    textarea.setSelectionRange(newPos, newPos);
                    this._hideAutocomplete();
                    this._updateLivePreview();
                };
            });

            dropdown.style.display = 'block';
        }

        _hideAutocomplete() {
            const dropdown = document.getElementById('noteComposerAutocomplete');
            if (dropdown) dropdown.style.display = 'none';
            this._acIndex = -1;
        }

        async save() {
            if (!this.currentProject) return;
            const text = document.getElementById('noteComposerText')?.value?.trim();
            if (!text) {
                alert('Please enter note text.');
                return;
            }

            const saveBtn = document.getElementById('noteComposerSaveBtn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';
            }

            try {
                const patch = { notes_log: {} };
                if (this.editingNoteId) {
                    patch.notes_log.update = [{
                        id: this.editingNoteId,
                        category: this.selectedCategory,
                        text: text
                    }];
                } else {
                    patch.notes_log.add = [{
                        category: this.selectedCategory,
                        text: text
                    }];
                }

                const userInfo = window.userManager?.getCurrentUserInfo?.() || null;
                const res = await window.electronAPI.updateProjectMetadata(this.currentProject.path, patch, {
                    userInfo,
                    action: this.editingNoteId ? 'Note Edited' : 'Note Added'
                });

                if (!res.success) {
                    alert(`Failed to save note: ${res.message || 'Unknown error'}`);
                    return;
                }

                this.close();

                // Refresh in facetSearch
                if (window.facetSearch) {
                    const idx = window.facetSearch.masterData.findIndex(p => p.path === this.currentProject.path);
                    if (idx >= 0 && res.project) {
                        window.facetSearch.masterData[idx] = {
                            ...window.facetSearch.masterData[idx],
                            ...res.project
                        };
                    }
                    window.facetSearch.showProjectDetails(res.project || this.currentProject);
                }

            } catch (err) {
                console.error('❌ Error saving note:', err);
                alert(`Error: ${err.message}`);
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save Note';
                }
            }
        }

        /**
         * Handles clicking a task checkbox rendered directly in the right panel.
         */
        async _handlePanelTaskToggle(checkboxEl) {
            const index = Number(checkboxEl.dataset.mfTaskIndex);
            const scope = checkboxEl.dataset.mfTaskScope;
            const isChecked = checkboxEl.checked;

            if (!window.facetSearch || !window.facetSearch.selectedProjectPath) return;
            const projectPath = window.facetSearch.selectedProjectPath;
            const project = window.facetSearch.masterData.find(p => p.path === projectPath);
            if (!project) return;

            try {
                let patch = {};
                if (scope === 'notes_markdown') {
                    const currentMd = project.notes_markdown || (project.metadata && project.metadata.notes_markdown) || '';
                    const toggled = window.markdownLite.toggleTask(currentMd, index, isChecked);
                    if (!toggled.changed) return;
                    patch.notes_markdown = toggled.text;
                } else if (scope.startsWith('note:')) {
                    const noteId = scope.slice(5);
                    const notesLog = Array.isArray(project.notes_log) ? project.notes_log : (project.metadata?.notes_log || []);
                    const note = notesLog.find(n => n.id === noteId);
                    if (!note) return;
                    const toggled = window.markdownLite.toggleTask(note.text, index, isChecked);
                    if (!toggled.changed) return;
                    patch.notes_log = {
                        update: [{ id: noteId, text: toggled.text }]
                    };
                }

                const userInfo = window.userManager?.getCurrentUserInfo?.() || null;
                const res = await window.electronAPI.updateProjectMetadata(projectPath, patch, {
                    userInfo,
                    action: `Task ${isChecked ? 'Completed' : 'Reopened'}`
                });

                if (res.success && res.project) {
                    const idx = window.facetSearch.masterData.findIndex(p => p.path === projectPath);
                    if (idx >= 0) {
                        window.facetSearch.masterData[idx] = {
                            ...window.facetSearch.masterData[idx],
                            ...res.project
                        };
                    }
                    // Visual feedback: toggle done class on parent li
                    const li = checkboxEl.closest('.mf-md-task');
                    if (li) {
                        if (isChecked) li.classList.add('done');
                        else li.classList.remove('done');
                    }
                }

            } catch (err) {
                console.warn('⚠️ Could not toggle task box:', err.message);
            }
        }
    }

    return new NoteComposer();
});

