/**
 * MetaFold Template Repositories Settings Controller
 *
 * Manages Settings -> General -> Template Repositories UI:
 * - Configure the official repository and 0..N custom GitHub/HTTP repositories
 * - Toggle enable/disable, reorder custom repository lookup priority
 * - Save/clear encrypted Access Tokens via settingsManager.setTemplateRepoToken()
 * - Test repository connectivity and inspect template/UUID counts
 */
(function () {
    'use strict';

    function esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async function renderRepositoriesList() {
        const container = document.getElementById('templateRepositoriesList');
        const cm = window.communityManager;
        const sm = window.settingsManager;
        if (!container || !cm) return;

        const repos = cm.getRepositories();
        const tokenFlags = {};
        if (sm && typeof sm.getTemplateRepoToken === 'function') {
            await Promise.all(repos.map(async (r) => {
                try {
                    const tok = await sm.getTemplateRepoToken(r.id);
                    tokenFlags[r.id] = Boolean(tok && tok.trim().length > 0);
                } catch (_) {
                    tokenFlags[r.id] = false;
                }
            }));
        }

        const customRepos = repos.filter(r => !r.isOfficial);

        container.innerHTML = repos.map((repo) => {
            const hasToken = Boolean(tokenFlags[repo.id]);
            const customIdx = customRepos.findIndex(c => c.id === repo.id);
            const canMoveUp = !repo.isOfficial && customIdx > 0;
            const canMoveDown = !repo.isOfficial && customIdx >= 0 && customIdx < customRepos.length - 1;
            const kindLabel = repo.isOfficial ? 'Official Default' : 'Custom Repository';
            const normUrl = repo.normalized?.valid ? repo.normalized.indexUrl : (repo.normalized?.error || 'Invalid URL');

            return `
                <div class="mf-repo-card" data-repo-id="${esc(repo.id)}">
                    <div class="mf-repo-card-header">
                        <label class="mf-repo-toggle-label">
                            <input type="checkbox" ${repo.enabled ? 'checked' : ''}
                                onchange="window.templateRepoSettings.toggleRepoEnabled('${esc(repo.id)}', this.checked)">
                            <strong>${esc(repo.name)}</strong>
                        </label>
                        <div class="mf-repo-badges">
                            <span class="mf-repo-badge ${repo.isOfficial ? 'official' : 'custom'}">${kindLabel}</span>
                            ${hasToken ? '<span class="mf-repo-badge token-set">🔒 Token stored</span>' : ''}
                        </div>
                    </div>

                    <div class="mf-repo-fields-grid">
                        <div>
                            <label class="mf-repo-field-label">Name</label>
                            <input type="text" class="mf-repo-input" id="repoName_${esc(repo.id)}" value="${esc(repo.name)}"
                                onchange="window.templateRepoSettings.updateRepoField('${esc(repo.id)}', 'name', this.value)">
                        </div>
                        <div>
                            <label class="mf-repo-field-label">GitHub Repo URL or templates-index.json URL</label>
                            <input type="text" class="mf-repo-input" id="repoUrl_${esc(repo.id)}" value="${esc(repo.url)}"
                                placeholder="https://github.com/Org/Repo or .../templates-index.json"
                                onchange="window.templateRepoSettings.updateRepoField('${esc(repo.id)}', 'url', this.value)">
                        </div>
                        <div>
                            <label class="mf-repo-field-label">Branch</label>
                            <input type="text" class="mf-repo-input" id="repoBranch_${esc(repo.id)}" value="${esc(repo.branch || 'main')}"
                                placeholder="main"
                                onchange="window.templateRepoSettings.updateRepoField('${esc(repo.id)}', 'branch', this.value)">
                        </div>
                    </div>

                    <div class="mf-repo-resolved-hint">
                        Resolved index: <code>${esc(normUrl)}</code>
                    </div>

                    <div class="mf-repo-token-row">
                        <input type="password" class="mf-repo-input" id="repoToken_${esc(repo.id)}" value=""
                            placeholder="${hasToken ? 'Token saved (enter new token to replace)' : 'Optional GitHub Access Token (private repos — stored encrypted)'}"
                            autocomplete="off">
                        <button type="button" class="btn btn-secondary btn-small"
                            onclick="window.templateRepoSettings.saveRepoToken('${esc(repo.id)}')">
                            💾 Save Token
                        </button>
                        ${hasToken ? `
                            <button type="button" class="btn btn-secondary btn-small"
                                onclick="window.templateRepoSettings.clearRepoToken('${esc(repo.id)}')">
                                🔓 Clear Token
                            </button>
                        ` : ''}
                    </div>

                    <div class="mf-repo-card-actions">
                        ${!repo.isOfficial ? `
                            <button type="button" class="btn btn-secondary btn-small" ${canMoveUp ? '' : 'disabled'}
                                onclick="window.templateRepoSettings.moveCustomRepo('${esc(repo.id)}', -1)"
                                title="Increase lookup priority">
                                ⬆️ Priority
                            </button>
                            <button type="button" class="btn btn-secondary btn-small" ${canMoveDown ? '' : 'disabled'}
                                onclick="window.templateRepoSettings.moveCustomRepo('${esc(repo.id)}', 1)"
                                title="Decrease lookup priority">
                                ⬇️ Priority
                            </button>
                        ` : ''}
                        <button type="button" class="btn btn-secondary btn-small"
                            onclick="window.templateRepoSettings.testExistingRepo('${esc(repo.id)}')">
                            🔌 Test Connection
                        </button>
                        <span class="mf-repo-test-status" id="repoTestStatus_${esc(repo.id)}"></span>
                        ${!repo.isOfficial ? `
                            <button type="button" class="btn btn-secondary btn-small mf-repo-remove-btn"
                                onclick="window.templateRepoSettings.removeRepo('${esc(repo.id)}')"
                                style="margin-left: auto;">
                                🗑️ Remove
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    const templateRepoSettings = {
        async init() {
            await renderRepositoriesList();
        },

        async toggleRepoEnabled(repoId, enabled) {
            const cm = window.communityManager;
            if (!cm) return;
            const repos = cm.getRepositories().map(r => r.id === repoId ? { ...r, enabled: Boolean(enabled) } : r);
            await cm.saveRepositories(repos);
        },

        async updateRepoField(repoId, field, value) {
            const cm = window.communityManager;
            if (!cm) return;
            const trimmed = String(value || '').trim();
            if (field === 'url' && trimmed) {
                const check = cm.normalizeRepositoryUrl(trimmed, document.getElementById(`repoBranch_${repoId}`)?.value || 'main');
                if (!check.valid) {
                    const statusEl = document.getElementById(`repoTestStatus_${repoId}`);
                    if (statusEl) {
                        statusEl.textContent = `⚠️ ${check.error}`;
                        statusEl.className = 'mf-repo-test-status err';
                    }
                    return;
                }
            }
            const repos = cm.getRepositories().map(r => r.id === repoId ? { ...r, [field]: trimmed || (field === 'branch' ? 'main' : r[field]) } : r);
            await cm.saveRepositories(repos);
            await renderRepositoriesList();
        },

        async saveRepoToken(repoId) {
            const input = document.getElementById(`repoToken_${repoId}`);
            const statusEl = document.getElementById(`repoTestStatus_${repoId}`);
            const token = input ? input.value.trim() : '';
            if (!token) {
                if (statusEl) {
                    statusEl.textContent = '⚠️ Enter a token before saving (or use Clear Token).';
                    statusEl.className = 'mf-repo-test-status err';
                }
                return;
            }
            if (window.settingsManager?.setTemplateRepoToken) {
                await window.settingsManager.setTemplateRepoToken(repoId, token);
                window.communityManager && (window.communityManager.cachedIndex = null);
                await renderRepositoriesList();
                const updatedStatus = document.getElementById(`repoTestStatus_${repoId}`);
                if (updatedStatus) {
                    updatedStatus.textContent = '🔒 Encrypted token saved.';
                    updatedStatus.className = 'mf-repo-test-status ok';
                }
            }
        },

        async clearRepoToken(repoId) {
            if (window.settingsManager?.setTemplateRepoToken) {
                await window.settingsManager.setTemplateRepoToken(repoId, '');
                window.communityManager && (window.communityManager.cachedIndex = null);
                await renderRepositoriesList();
                const updatedStatus = document.getElementById(`repoTestStatus_${repoId}`);
                if (updatedStatus) {
                    updatedStatus.textContent = '🔓 Token removed.';
                    updatedStatus.className = 'mf-repo-test-status';
                }
            }
        },

        async testExistingRepo(repoId) {
            const cm = window.communityManager;
            const statusEl = document.getElementById(`repoTestStatus_${repoId}`);
            if (!cm || !statusEl) return;

            const name = document.getElementById(`repoName_${repoId}`)?.value?.trim() || repoId;
            const url = document.getElementById(`repoUrl_${repoId}`)?.value?.trim() || '';
            const branch = document.getElementById(`repoBranch_${repoId}`)?.value?.trim() || 'main';
            const unsavedToken = document.getElementById(`repoToken_${repoId}`)?.value?.trim();

            statusEl.textContent = '⏳ Testing...';
            statusEl.className = 'mf-repo-test-status';

            const res = await cm.testRepository(
                { id: repoId, name, url, branch },
                unsavedToken ? unsavedToken : undefined
            );

            if (res.success) {
                statusEl.textContent = `✅ Connected: ${res.count} templates (${res.uuidCount} with UUID)`;
                statusEl.className = 'mf-repo-test-status ok';
            } else {
                statusEl.textContent = `❌ ${res.error}`;
                statusEl.className = 'mf-repo-test-status err';
            }
        },

        async testNewRepo() {
            const cm = window.communityManager;
            const statusEl = document.getElementById('newRepoTestStatus');
            if (!cm || !statusEl) return;

            const name = document.getElementById('newRepoName')?.value?.trim() || 'New Repository';
            const url = document.getElementById('newRepoUrl')?.value?.trim() || '';
            const branch = document.getElementById('newRepoBranch')?.value?.trim() || 'main';
            const token = document.getElementById('newRepoToken')?.value?.trim() || '';

            statusEl.textContent = '⏳ Testing...';
            statusEl.className = 'mf-repo-test-status';

            const res = await cm.testRepository({ id: 'new_preview', name, url, branch }, token);
            if (res.success) {
                statusEl.textContent = `✅ Connected: ${res.count} templates (${res.uuidCount} with UUID)`;
                statusEl.className = 'mf-repo-test-status ok';
            } else {
                statusEl.textContent = `❌ ${res.error}`;
                statusEl.className = 'mf-repo-test-status err';
            }
        },

        async addCustomRepo() {
            const cm = window.communityManager;
            const statusEl = document.getElementById('newRepoTestStatus');
            if (!cm) return;

            const nameEl = document.getElementById('newRepoName');
            const urlEl = document.getElementById('newRepoUrl');
            const branchEl = document.getElementById('newRepoBranch');
            const tokenEl = document.getElementById('newRepoToken');

            const url = urlEl?.value?.trim() || '';
            const branch = branchEl?.value?.trim() || 'main';
            const norm = cm.normalizeRepositoryUrl(url, branch);
            if (!norm.valid) {
                if (statusEl) {
                    statusEl.textContent = `❌ ${norm.error}`;
                    statusEl.className = 'mf-repo-test-status err';
                }
                return;
            }

            const defaultName = norm.repo ? `${norm.owner}/${norm.repo}` : 'Custom Repository';
            const name = nameEl?.value?.trim() || defaultName;
            const token = tokenEl?.value?.trim() || '';
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'repo';
            const id = `custom_${slug}_${Date.now().toString(36)}`;

            const repos = cm.getRepositories();
            // Insert custom repos before official default so lookup priority is clear
            const officialIdx = repos.findIndex(r => r.isOfficial);
            const newEntry = {
                id,
                name,
                url,
                branch: norm.branch || branch,
                enabled: true,
                isOfficial: false
            };

            if (officialIdx >= 0) {
                repos.splice(officialIdx, 0, newEntry);
            } else {
                repos.push(newEntry);
            }

            if (token && window.settingsManager?.setTemplateRepoToken) {
                await window.settingsManager.setTemplateRepoToken(id, token);
            }
            await cm.saveRepositories(repos);

            if (nameEl) nameEl.value = '';
            if (urlEl) urlEl.value = '';
            if (branchEl) branchEl.value = 'main';
            if (tokenEl) tokenEl.value = '';
            if (statusEl) {
                statusEl.textContent = `✅ Added repository "${name}"`;
                statusEl.className = 'mf-repo-test-status ok';
            }

            await renderRepositoriesList();
        },

        async moveCustomRepo(repoId, delta) {
            const cm = window.communityManager;
            if (!cm) return;
            const all = cm.getRepositories();
            const custom = all.filter(r => !r.isOfficial);
            const official = all.filter(r => r.isOfficial);
            const idx = custom.findIndex(r => r.id === repoId);
            const targetIdx = idx + delta;
            if (idx < 0 || targetIdx < 0 || targetIdx >= custom.length) return;

            const [moved] = custom.splice(idx, 1);
            custom.splice(targetIdx, 0, moved);

            await cm.saveRepositories([...custom, ...official]);
            await renderRepositoriesList();
        },

        async removeRepo(repoId) {
            const cm = window.communityManager;
            if (!cm) return;
            const repos = cm.getRepositories().filter(r => r.id !== repoId || r.isOfficial);
            if (window.settingsManager?.setTemplateRepoToken) {
                await window.settingsManager.setTemplateRepoToken(repoId, '');
            }
            await cm.saveRepositories(repos);
            await renderRepositoriesList();
        },

        async resetOfficialDefault() {
            const cm = window.communityManager;
            if (!cm) return;
            const repos = cm.getRepositories();
            const hasOfficial = repos.some(r => r.isOfficial);
            const next = hasOfficial
                ? repos.map(r => r.isOfficial ? {
                    ...r,
                    id: 'official',
                    name: 'MetaFold Community',
                    url: cm.DEFAULT_OFFICIAL_REPO_URL,
                    branch: 'main',
                    enabled: true
                } : r)
                : [...repos, {
                    id: 'official',
                    name: 'MetaFold Community',
                    url: cm.DEFAULT_OFFICIAL_REPO_URL,
                    branch: 'main',
                    enabled: true,
                    isOfficial: true
                }];

            await cm.saveRepositories(next);
            await renderRepositoriesList();
        }
    };

    window.templateRepoSettings = templateRepoSettings;
    window.initializeTemplateRepositoriesSettings = () => templateRepoSettings.init();
})();
