/**
 * MetaFold Community Manager
 * Central service for Community Templates:
 * - Dynamic retrieval and caching of templates-index.json from GitHub
 * - 4 Fixed Categories (Systems, Protocols, Experiments, Workflows)
 * - Dynamic collection extraction and new collection proposals
 * - Tag extraction, deduplication, and case-insensitive normalization
 * - Automatic GitHub repository path calculation
 * - Reusable interactive Tag-Picker UI component (search, suggestions, chips)
 */

'use strict';

class CommunityManager {
    constructor() {
        this.DEFAULT_OFFICIAL_REPO_URL = 'https://raw.githubusercontent.com/ThZobel/MetaFold-Templates/main/templates-index.json';
        this.CATEGORIES = [
            { id: 'Systems', label: 'Systems', description: 'Laboratory systems, equipment, microscopes, software and technical setups' },
            { id: 'Protocols', label: 'Protocols', description: 'Individual laboratory protocols and procedures' },
            { id: 'Experiments', label: 'Experiments', description: 'Complete experimental setups and experiment templates' },
            { id: 'Workflows', label: 'Workflows', description: 'Multi-step workflows combining different processes or operations' }
        ];

        this.DEFAULT_COLLECTIONS = [
            { id: 'General', name: 'General', description: 'Universal community templates collection' }
        ];

        this.cachedIndex = null;
        this.cachedIndexByRepo = new Map();
        this.lastRepoStatuses = [];
        this.lastFetchTime = 0;
        this.cacheTTL = 10 * 60 * 1000; // 10 minutes cache
        this.cachedTags = [];
        this.cachedCollections = [];
        this.isFetching = false;
    }

    /**
     * Normalize a GitHub repo URL, raw GitHub URL, or generic JSON index/base URL.
     * Supports:
     * - https://github.com/<owner>/<repo>
     * - https://github.com/<owner>/<repo>/tree/<branch>[/<subpath>]
     * - https://raw.githubusercontent.com/<owner>/<repo>/<branch>/templates-index.json
     * - Direct HTTP(S) URL to templates-index.json or base directory
     *
     * @param {string} rawUrl
     * @param {string} [branchOverride='']
     * @returns {Object} Normalized URL descriptor
     */
    normalizeRepositoryUrl(rawUrl, branchOverride = '') {
        const input = String(rawUrl || '').trim();
        const explicitBranch = String(branchOverride || '').trim();
        if (!input) {
            return {
                valid: false,
                error: 'Repository URL is required',
                kind: 'generic',
                branch: explicitBranch || 'main',
                indexUrl: '',
                rawBaseUrl: '',
                issuesUrl: null,
                apiContentsBaseUrl: null,
                displayUrl: ''
            };
        }

        let urlObj;
        try {
            urlObj = new URL(input);
        } catch (_) {
            return {
                valid: false,
                error: 'Invalid URL format',
                kind: 'generic',
                branch: explicitBranch || 'main',
                indexUrl: '',
                rawBaseUrl: '',
                issuesUrl: null,
                apiContentsBaseUrl: null,
                displayUrl: input
            };
        }

        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            return {
                valid: false,
                error: 'Only http:// and https:// URLs are supported',
                kind: 'generic',
                branch: explicitBranch || 'main',
                indexUrl: '',
                rawBaseUrl: '',
                issuesUrl: null,
                apiContentsBaseUrl: null,
                displayUrl: input
            };
        }

        const host = urlObj.hostname.toLowerCase();
        const segments = urlObj.pathname.split('/').filter(Boolean);

        // 1. Standard GitHub web URL: https://github.com/<owner>/<repo>[/tree/<branch>[/<subpath>]]
        if ((host === 'github.com' || host === 'www.github.com') && segments.length >= 2) {
            const owner = segments[0];
            const repo = segments[1].replace(/\.git$/i, '');
            let branch = 'main';
            let subParts = [];

            if ((segments[2] === 'tree' || segments[2] === 'blob') && segments[3]) {
                branch = segments[3];
                if (segments.length > 4) {
                    const tail = segments.slice(4);
                    if (tail[tail.length - 1] && tail[tail.length - 1].toLowerCase().endsWith('.json')) {
                        tail.pop();
                    }
                    subParts = tail;
                }
            }

            if (explicitBranch) {
                branch = explicitBranch;
            }

            const subPath = subParts.join('/');
            const rawBaseUrl = subPath
                ? `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${subPath}`
                : `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;
            const apiContentsBaseUrl = subPath
                ? `https://api.github.com/repos/${owner}/${repo}/contents/${subPath}`
                : `https://api.github.com/repos/${owner}/${repo}/contents`;

            return {
                valid: true,
                kind: 'github',
                owner,
                repo,
                branch,
                subPath,
                indexUrl: `${rawBaseUrl}/templates-index.json`,
                rawBaseUrl,
                issuesUrl: `https://github.com/${owner}/${repo}/issues/new`,
                apiContentsBaseUrl,
                displayUrl: `https://github.com/${owner}/${repo}`
            };
        }

        // 2. Raw GitHub URL: https://raw.githubusercontent.com/<owner>/<repo>/<branch>/...
        if (host === 'raw.githubusercontent.com' && segments.length >= 3) {
            const owner = segments[0];
            const repo = segments[1];
            let rest = segments.slice(2);
            let branchFromUrl = 'main';

            if (rest[0] === 'refs' && rest[1] === 'heads' && rest[2]) {
                branchFromUrl = rest[2];
                rest = rest.slice(3);
            } else {
                branchFromUrl = rest[0] || 'main';
                rest = rest.slice(1);
            }

            const branch = explicitBranch || branchFromUrl || 'main';
            let indexFile = 'templates-index.json';
            if (rest.length > 0 && rest[rest.length - 1].toLowerCase().endsWith('.json')) {
                indexFile = rest.pop();
            }
            const subPath = rest.join('/');
            const rawBaseUrl = subPath
                ? `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${subPath}`
                : `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;
            const apiContentsBaseUrl = subPath
                ? `https://api.github.com/repos/${owner}/${repo}/contents/${subPath}`
                : `https://api.github.com/repos/${owner}/${repo}/contents`;

            return {
                valid: true,
                kind: 'github',
                owner,
                repo,
                branch,
                subPath,
                indexUrl: `${rawBaseUrl}/${indexFile}`,
                rawBaseUrl,
                issuesUrl: `https://github.com/${owner}/${repo}/issues/new`,
                apiContentsBaseUrl,
                displayUrl: `https://github.com/${owner}/${repo}`
            };
        }

        // 3. Generic HTTP(S) URL (e.g., intranet hub, GitLab/Gitea raw URL, local server)
        const cleanHref = `${urlObj.origin}${urlObj.pathname}`.replace(/\/+$/, '');
        let indexUrl = '';
        let rawBaseUrl = '';
        if (urlObj.pathname.toLowerCase().endsWith('.json')) {
            indexUrl = `${cleanHref}${urlObj.search || ''}`;
            const lastSlash = cleanHref.lastIndexOf('/');
            rawBaseUrl = lastSlash > urlObj.origin.length ? cleanHref.slice(0, lastSlash) : urlObj.origin;
        } else {
            rawBaseUrl = cleanHref;
            indexUrl = `${rawBaseUrl}/templates-index.json`;
        }

        return {
            valid: true,
            kind: 'generic',
            owner: null,
            repo: null,
            branch: explicitBranch || 'main',
            subPath: '',
            indexUrl,
            rawBaseUrl,
            issuesUrl: null,
            apiContentsBaseUrl: null,
            displayUrl: indexUrl
        };
    }

    /**
     * Get configured template repositories (never exposes tokens in returned objects).
     * Falls back to legacy `templates.repository_url` or built-in MetaFold Community repository.
     * @returns {Array<Object>}
     */
    getRepositories() {
        const settings = (typeof window !== 'undefined' && window.settingsManager && window.settingsManager.settings)
            ? window.settingsManager.settings
            : {};

        const legacyUrl = (settings['templates.repository_url'] && String(settings['templates.repository_url']).trim())
            ? String(settings['templates.repository_url']).trim()
            : this.DEFAULT_OFFICIAL_REPO_URL;

        let parsedList = null;
        const rawRepos = settings['templates.repositories'];
        if (Array.isArray(rawRepos)) {
            parsedList = rawRepos;
        } else if (typeof rawRepos === 'string' && rawRepos.trim()) {
            try {
                const candidate = JSON.parse(rawRepos);
                if (Array.isArray(candidate)) {
                    parsedList = candidate;
                }
            } catch (err) {
                console.warn('⚠️ CommunityManager: Invalid templates.repositories JSON:', err.message);
            }
        }

        if (!parsedList || parsedList.length === 0) {
            parsedList = [{
                id: 'official',
                name: 'MetaFold Community',
                url: legacyUrl,
                branch: 'main',
                enabled: true,
                isOfficial: true
            }];
        }

        return parsedList
            .filter(entry => entry && typeof entry === 'object' && String(entry.url || '').trim())
            .map((entry, idx) => {
                const branch = String(entry.branch || 'main').trim() || 'main';
                const normalized = this.normalizeRepositoryUrl(entry.url, branch);
                const isOfficial = entry.isOfficial === true || entry.id === 'official';
                return {
                    id: String(entry.id || (isOfficial ? 'official' : `repo_${idx + 1}`)).trim(),
                    name: String(entry.name || (isOfficial ? 'MetaFold Community' : `Custom Repo ${idx + 1}`)).trim(),
                    url: String(entry.url).trim(),
                    branch: normalized.branch || branch,
                    enabled: entry.enabled !== false,
                    isOfficial,
                    normalized
                };
            });
    }

    /**
     * Enabled repositories ordered by lookup priority:
     * custom repositories first (top-to-bottom), then official repository(ies).
     * @returns {Array<Object>}
     */
    getRepositoriesInLookupOrder() {
        const all = this.getRepositories().filter(r => r.enabled && r.normalized && r.normalized.valid);
        const custom = all.filter(r => !r.isOfficial);
        const official = all.filter(r => r.isOfficial);
        return [...custom, ...official];
    }

    /**
     * Persist sanitized repository list to settings (never stores tokens in plaintext).
     * Keeps `templates.repository_url` synced for backward compatibility.
     * @param {Array<Object>} repos
     * @returns {Promise<boolean>}
     */
    async saveRepositories(repos) {
        if (!Array.isArray(repos)) return false;

        const cleanRepos = repos
            .filter(r => r && typeof r === 'object' && String(r.url || '').trim())
            .map((r, idx) => {
                const isOfficial = r.isOfficial === true || r.id === 'official';
                return {
                    id: String(r.id || (isOfficial ? 'official' : `repo_${Date.now()}_${idx}`)).trim(),
                    name: String(r.name || (isOfficial ? 'MetaFold Community' : 'Custom Repository')).trim(),
                    url: String(r.url).trim(),
                    branch: String(r.branch || 'main').trim() || 'main',
                    enabled: r.enabled !== false,
                    isOfficial
                };
            });

        const official = cleanRepos.find(r => r.isOfficial) || cleanRepos[0];
        const normalizedOfficial = official ? this.normalizeRepositoryUrl(official.url, official.branch) : null;
        const compatUrl = (normalizedOfficial && normalizedOfficial.valid)
            ? normalizedOfficial.indexUrl
            : this.DEFAULT_OFFICIAL_REPO_URL;

        this.cachedIndex = null;
        this.cachedIndexByRepo.clear();
        this.lastFetchTime = 0;

        if (typeof window !== 'undefined' && window.settingsManager && typeof window.settingsManager.set === 'function') {
            await window.settingsManager.set('templates.repositories', JSON.stringify(cleanRepos));
            await window.settingsManager.set('templates.repository_url', compatUrl);
            return true;
        }
        return false;
    }

    /**
     * Get the primary/official repository index URL (backward-compatible helper).
     * @returns {string}
     */
    getIndexUrl() {
        const repos = this.getRepositories();
        const official = repos.find(r => r.isOfficial) || repos[0];
        if (official && official.normalized && official.normalized.valid && official.normalized.indexUrl) {
            return official.normalized.indexUrl;
        }
        if (typeof window !== 'undefined' && window.settingsManager && window.settingsManager.settings && window.settingsManager.settings['templates.repository_url']) {
            return window.settingsManager.settings['templates.repository_url'];
        }
        return this.DEFAULT_OFFICIAL_REPO_URL;
    }

    /**
     * Fetch a JSON document from a configured repository (index JSON or single template JSON).
     * Routes authenticated GitHub requests through api.github.com/contents with raw media type,
     * and routes through Electron IPC when available to avoid browser CORS limits.
     *
     * @param {Object} repoConfig
     * @param {string|null} [relativePath=null]
     * @param {Object} [options={}]
     * @returns {Promise<any>}
     */
    async fetchJsonFromRepo(repoConfig, relativePath = null, options = {}) {
        const normalized = (repoConfig && repoConfig.normalized && repoConfig.normalized.valid)
            ? repoConfig.normalized
            : this.normalizeRepositoryUrl(repoConfig?.url || this.getIndexUrl(), repoConfig?.branch || 'main');

        if (!normalized.valid) {
            throw new Error(normalized.error || 'Invalid repository configuration');
        }

        let token = '';
        if (options.tokenOverride !== undefined && options.tokenOverride !== null) {
            token = String(options.tokenOverride).trim();
        } else if (repoConfig && repoConfig.id && typeof window !== 'undefined' && window.settingsManager && typeof window.settingsManager.getTemplateRepoToken === 'function') {
            token = await window.settingsManager.getTemplateRepoToken(repoConfig.id);
        }

        const cleanRel = relativePath ? String(relativePath).replace(/\\/g, '/').replace(/^\/+/, '') : '';
        let requestUrl = '';
        const headers = {};

        if (normalized.kind === 'github' && token) {
            const pathPart = cleanRel || 'templates-index.json';
            const encodedPath = pathPart.split('/').filter(Boolean).map(encodeURIComponent).join('/');
            const ref = encodeURIComponent(normalized.branch || 'main');
            requestUrl = `${normalized.apiContentsBaseUrl}/${encodedPath}?ref=${ref}`;
            headers['Accept'] = 'application/vnd.github.raw+json';
            headers['Authorization'] = `Bearer ${token}`;
            headers['X-GitHub-Api-Version'] = '2022-11-28';
        } else {
            requestUrl = cleanRel
                ? `${normalized.rawBaseUrl}/${cleanRel}`
                : normalized.indexUrl;
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.fetchRepoJson === 'function') {
            const res = await window.electronAPI.fetchRepoJson(requestUrl, { headers });
            if (!res || !res.success) {
                throw new Error(res?.error || `Failed fetching ${requestUrl}`);
            }
            return res.data;
        }

        if (typeof fetch !== 'function') {
            throw new Error('HTTP client is not available in this environment');
        }

        const response = await fetch(requestUrl, Object.keys(headers).length > 0 ? { headers } : undefined);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} fetching repository data`);
        }
        return await response.json();
    }

    /**
     * Test connectivity and inspect index stats for a single repository.
     * @param {Object} repoConfig
     * @param {string|null} [tokenOverride=null]
     * @returns {Promise<Object>}
     */
    async testRepository(repoConfig, tokenOverride = undefined) {
        const normalized = this.normalizeRepositoryUrl(repoConfig?.url, repoConfig?.branch);
        if (!normalized.valid) {
            return {
                success: false,
                error: normalized.error || 'Invalid repository URL',
                normalized
            };
        }

        try {
            const data = await this.fetchJsonFromRepo(
                { ...repoConfig, normalized },
                null,
                tokenOverride !== undefined ? { tokenOverride } : {}
            );
            if (!Array.isArray(data)) {
                return {
                    success: false,
                    error: 'templates-index.json did not return a JSON array',
                    normalized
                };
            }
            const uuidCount = data.filter(item => item && typeof item.uuid === 'string' && item.uuid.trim().length > 0).length;
            return {
                success: true,
                count: data.length,
                uuidCount,
                normalized
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Connection failed',
                normalized
            };
        }
    }

    /**
     * Fetch templates-index.json across all enabled repositories (with caching and per-repo resilience).
     * @param {boolean} [forceRefresh=false]
     * @returns {Promise<Array>} Combined array of index items
     */
    async fetchAllIndexes(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && this.cachedIndex !== null && (now - this.lastFetchTime < this.cacheTTL)) {
            return this.cachedIndex;
        }

        const repos = this.getRepositoriesInLookupOrder();
        if (repos.length === 0) {
            this.lastRepoStatuses = [];
            this.cachedIndex = [];
            this.cachedIndexByRepo.clear();
            this._extractMetadata([]);
            return [];
        }

        this.isFetching = true;
        try {
            const settled = await Promise.allSettled(
                repos.map(async (repo) => {
                    const data = await this.fetchJsonFromRepo(repo, null);
                    if (!Array.isArray(data)) {
                        throw new Error('Index response is not an array');
                    }
                    return { repo, data };
                })
            );

            const combined = [];
            const nextByRepo = new Map();
            const statuses = [];
            let successCount = 0;

            settled.forEach((result, idx) => {
                const repo = repos[idx];
                if (result.status === 'fulfilled') {
                    successCount++;
                    const tagged = result.value.data.map(item => ({
                        ...item,
                        _repoId: repo.id,
                        _repoName: repo.name,
                        _repoRawBaseUrl: repo.normalized.rawBaseUrl,
                        _repoIsOfficial: !!repo.isOfficial,
                        repository: item.repository || repo.name
                    }));
                    nextByRepo.set(repo.id, tagged);
                    combined.push(...tagged);
                    statuses.push({
                        id: repo.id,
                        name: repo.name,
                        ok: true,
                        count: tagged.length,
                        error: null
                    });
                } else {
                    const msg = result.reason?.message || 'Fetch failed';
                    console.warn(`⚠️ CommunityManager: Repository "${repo.name}" failed (${msg})`);
                    const previous = this.cachedIndexByRepo.get(repo.id);
                    if (Array.isArray(previous) && previous.length > 0) {
                        nextByRepo.set(repo.id, previous);
                        combined.push(...previous);
                    }
                    statuses.push({
                        id: repo.id,
                        name: repo.name,
                        ok: false,
                        count: Array.isArray(previous) ? previous.length : 0,
                        error: msg
                    });
                }
            });

            this.lastRepoStatuses = statuses;

            if (successCount > 0 || combined.length > 0 || !this.cachedIndex) {
                this.cachedIndexByRepo = nextByRepo;
                this.cachedIndex = combined;
                if (successCount > 0) {
                    this.lastFetchTime = now;
                }
                this._extractMetadata(this.cachedIndex);
            }

            return this.cachedIndex || [];
        } catch (error) {
            console.warn('⚠️ CommunityManager: Failed to fetch online indexes, using cached or fallback data:', error.message);
            if (!this.cachedIndex) {
                this._extractMetadata([]);
            }
            return this.cachedIndex || [];
        } finally {
            this.isFetching = false;
        }
    }

    /**
     * Fetch templates-index.json from configured repositories (delegates to fetchAllIndexes).
     * @param {boolean} forceRefresh
     * @returns {Promise<Array>} Array of index items
     */
    async fetchIndex(forceRefresh = false) {
        return await this.fetchAllIndexes(forceRefresh);
    }

    /**
     * Fetch a single template JSON from a repository path and optional repository context.
     * @param {string} repoPath
     * @param {Object|null} [repoContext=null]
     * @returns {Promise<Object>}
     */
    async fetchTemplateJson(repoPath, repoContext = null) {
        if (!repoPath || typeof repoPath !== 'string') {
            throw new Error('Missing template path in repository');
        }
        const repos = this.getRepositories();
        let targetRepo = null;
        if (repoContext && repoContext.repoId) {
            targetRepo = repos.find(r => r.id === repoContext.repoId) || null;
        }
        if (!targetRepo && repoContext && repoContext.rawBaseUrl) {
            targetRepo = repos.find(r => r.normalized && r.normalized.rawBaseUrl === repoContext.rawBaseUrl) || null;
        }
        if (!targetRepo && repoContext && repoContext.rawBaseUrl) {
            targetRepo = {
                id: repoContext.repoId || 'custom',
                name: repoContext.repoName || 'Repository',
                url: repoContext.rawBaseUrl,
                branch: 'main'
            };
        }
        if (!targetRepo) {
            targetRepo = this.getRepositoriesInLookupOrder()[0] || repos[0] || {
                id: 'official',
                name: 'MetaFold Community',
                url: this.DEFAULT_OFFICIAL_REPO_URL,
                branch: 'main'
            };
        }
        return await this.fetchJsonFromRepo(targetRepo, repoPath);
    }

    /**
     * Find a template entry by UUID across enabled repositories (custom repos checked before official).
     * @param {string} uuid
     * @param {Object} [options={}]
     * @returns {Promise<{ item: Object|null, repo: Object|null, statuses: Array }>}
     */
    async findTemplateByUuid(uuid, options = {}) {
        const targetUuid = (typeof window !== 'undefined' && window.metafoldTemplateUuid?.normalizeUuid)
            ? window.metafoldTemplateUuid.normalizeUuid(uuid)
            : String(uuid || '').trim().toLowerCase();

        if (!targetUuid) {
            return { item: null, repo: null, statuses: this.lastRepoStatuses || [] };
        }

        const searchCachedByPriority = () => {
            const orderedRepos = this.getRepositoriesInLookupOrder();
            for (const repo of orderedRepos) {
                const items = this.cachedIndexByRepo.get(repo.id);
                if (!Array.isArray(items)) continue;
                const found = items.find(entry => {
                    if (!entry || typeof entry !== 'object') return false;
                    const entryUuid = entry.uuid ? String(entry.uuid).trim().toLowerCase() : '';
                    const entryId = entry.id ? String(entry.id).trim().toLowerCase() : '';
                    return entryUuid === targetUuid || entryId === targetUuid;
                });
                if (found) {
                    return { item: found, repo };
                }
            }
            return null;
        };

        if (this.cachedIndexByRepo.size > 0) {
            const cachedHit = searchCachedByPriority();
            if (cachedHit) {
                return { ...cachedHit, statuses: this.lastRepoStatuses || [] };
            }
        }

        if (options.allowRefresh !== false) {
            await this.fetchAllIndexes(true);
            const refreshedHit = searchCachedByPriority();
            if (refreshedHit) {
                return { ...refreshedHit, statuses: this.lastRepoStatuses || [] };
            }
        }

        return { item: null, repo: null, statuses: this.lastRepoStatuses || [] };
    }

    /**
     * Extract collection name from repository file path.
     * Handles:
     * - Communities/<Collection>/template.json -> <Collection>
     * - templates/Communities/<Collection>/template.json -> <Collection>
     * - templates/General/template.json -> General
     * - General/template.json -> General
     * - <Collection>/template.json -> <Collection>
     * @param {string} filePath
     * @returns {string} Collection name
     */
    extractCollectionFromPath(filePath) {
        if (!filePath || typeof filePath !== 'string') return 'General';
        const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
        if (parts[0] && parts[0].toLowerCase() === 'templates') {
            parts.shift();
        }
        if (parts.length === 0) return 'General';
        if (parts.length === 1) return 'General';
        if (parts[0].toLowerCase() === 'communities' && parts.length > 1) {
            return parts[1];
        }
        return parts[0] || 'General';
    }

    /**
     * Extract unique collections and tags from loaded index items.
     * @private
     */
    _extractMetadata(items) {
        const collectionsMap = new Map();
        // Seed default collections
        this.DEFAULT_COLLECTIONS.forEach(col => {
            collectionsMap.set(col.id.toLowerCase(), { ...col });
        });

        const tagSet = new Map(); // lowercase -> original display string

        // Prepopulate standard base tags
        const baseTags = [
            'Microscopy', 'Confocal', 'Widefield', 'STED', 'FLIM', 'Super-Resolution',
            'Live-Cell', 'High-Content', 'RNA-Seq', 'Proteomics', 'Bioimage Analysis',
            'ImageJ / Fiji', 'OMERO', 'Cell Culture', 'Histology', 'FACS'
        ];
        baseTags.forEach(t => tagSet.set(t.toLowerCase(), t));

        if (Array.isArray(items)) {
            items.forEach(item => {
                // Extract collection
                let colName = null;
                if (item.collection) {
                    colName = String(item.collection).trim();
                } else if (item.collectionName) {
                    colName = String(item.collectionName).trim();
                } else if (item.path) {
                    colName = this.extractCollectionFromPath(item.path);
                }

                if (colName && colName.length > 0) {
                    const key = colName.toLowerCase();
                    if (!collectionsMap.has(key)) {
                        collectionsMap.set(key, {
                            id: colName,
                            name: colName,
                            description: `Community collection ${colName}`
                        });
                    }
                }

                // Extract tags
                const comm = item.community || {};
                const itemTags = item.tags || comm.tags || [];
                const rawList = Array.isArray(itemTags)
                    ? itemTags
                    : String(itemTags).split(',').map(s => s.trim());

                rawList.forEach(rawTag => {
                    if (rawTag && typeof rawTag === 'string') {
                        const trimmed = rawTag.trim();
                        if (trimmed.length > 0) {
                            const normalized = this.normalizeTag(trimmed);
                            tagSet.set(normalized.toLowerCase(), normalized);
                        }
                    }
                });
            });
        }

        this.cachedCollections = Array.from(collectionsMap.values());
        this.cachedTags = Array.from(tagSet.values()).sort((a, b) => a.localeCompare(b));
    }

    /**
     * Get list of all known collections.
     * @returns {Array<{id: string, name: string, description?: string}>}
     */
    getCollections() {
        if (!this.cachedCollections || this.cachedCollections.length === 0) {
            this._extractMetadata(this.cachedIndex || []);
        }
        return this.cachedCollections;
    }

    /**
     * Get list of all known tags from index and defaults.
     * @returns {string[]}
     */
    getTags() {
        if (!this.cachedTags || this.cachedTags.length === 0) {
            this._extractMetadata(this.cachedIndex || []);
        }
        return this.cachedTags;
    }

    /**
     * Normalize a tag:
     * - Trim whitespace
     * - Title-Case each word unless already containing purposeful uppercase (e.g. 'STED', 'FLIM', 'GFP', 'qPCR')
     * - Discard empty strings
     * @param {string} tag
     * @returns {string}
     */
    normalizeTag(tag) {
        if (!tag || typeof tag !== 'string') return '';
        const trimmed = tag.trim();
        if (trimmed.length === 0) return '';

        // If tag is already an acronym or has deliberate mixed casing (e.g. 'GFP', 'RNA-Seq', 'Live-cell')
        if (/[A-Z]{2,}/.test(trimmed) || /-[a-zA-Z]/.test(trimmed)) {
            return trimmed;
        }

        // Title Case first letter of words
        return trimmed.replace(/\b\w/g, char => char.toUpperCase());
    }

    /**
     * Compute the automatic GitHub repository path for a template.
     * - If collection is 'General' or a proposed new collection: General/<slug>.json
     * - If collection is an approved community: Communities/<Collection>/<slug>.json
     * @param {string} templateName
     * @param {string} collection
     * @param {boolean} isProposed
     * @returns {string}
     */
    computeRepositoryPath(templateName, collection = 'General', isProposed = false) {
        const safeName = (templateName || 'unnamed_template')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'unnamed_template';

        const filename = `${safeName}.json`;

        const col = (collection || 'General').trim();
        if (isProposed || !col || col.toLowerCase() === 'general') {
            return `General/${filename}`;
        }

        // Clean collection folder name
        const safeCol = col.replace(/[^a-zA-Z0-9_-]/g, '_');
        return `Communities/${safeCol}/${filename}`;
    }

    /**
     * Mounts an interactive searchable multi-select Tag Picker component into a DOM container.
     * @param {Object} options
     * @param {HTMLElement|string} options.container Container element or selector
     * @param {string[]} [options.initialTags=[]] Initial list of tags
     * @param {Function} [options.onChange] Callback fired with array of string tags when changed
     * @returns {Object} Controller object with getTags(), setTags(), and destroy()
     */
    createTagPicker(options) {
        const container = typeof options.container === 'string'
            ? document.querySelector(options.container)
            : options.container;

        if (!container) {
            console.error('CommunityManager: Tag picker container not found');
            return null;
        }

        const initialTags = Array.isArray(options.initialTags)
            ? options.initialTags.map(t => this.normalizeTag(t)).filter(Boolean)
            : [];

        let currentTags = [...new Set(initialTags)];
        const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};

        // Build DOM structure
        container.innerHTML = `
            <div class="mf-tag-picker-wrap" style="position: relative; width: 100%;">
                <div class="mf-tag-picker-box" style="
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 10px;
                    background: #202020;
                    border: 1px solid #404040;
                    border-radius: 6px;
                    min-height: 42px;
                    cursor: text;
                ">
                    <div class="mf-tag-chips" style="display: contents;"></div>
                    <input type="text" class="mf-tag-input" placeholder="Add or search tags (press Enter)..." style="
                        flex: 1;
                        min-width: 140px;
                        background: transparent;
                        border: none;
                        outline: none;
                        color: #ffffff;
                        font-size: 0.9em;
                        padding: 4px 0;
                    " autocomplete="off" />
                </div>
                <div class="mf-tag-suggestions" style="
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: #252528;
                    border: 1px solid #555;
                    border-radius: 6px;
                    margin-top: 4px;
                    max-height: 180px;
                    overflow-y: auto;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                "></div>
                <small style="display: block; margin-top: 4px; color: #888; font-size: 0.78em;">
                    💡 Select existing tags or type a new one and press <kbd>Enter</kbd> or <kbd>,</kbd>.
                </small>
            </div>
        `;

        const box = container.querySelector('.mf-tag-picker-box');
        const chipsContainer = container.querySelector('.mf-tag-chips');
        const input = container.querySelector('.mf-tag-input');
        const suggestionsBox = container.querySelector('.mf-tag-suggestions');

        const renderChips = () => {
            chipsContainer.innerHTML = '';
            currentTags.forEach((tag, idx) => {
                const chip = document.createElement('span');
                chip.className = 'mf-tag-chip';
                chip.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 3px 8px;
                    background: rgba(124, 58, 237, 0.25);
                    border: 1px solid rgba(168, 85, 247, 0.5);
                    color: #d8b4fe;
                    border-radius: 12px;
                    font-size: 0.82em;
                    font-weight: 500;
                `;
                chip.textContent = tag;

                const removeBtn = document.createElement('span');
                removeBtn.innerHTML = '&times;';
                removeBtn.title = 'Remove tag';
                removeBtn.style.cssText = `
                    cursor: pointer;
                    font-weight: bold;
                    margin-left: 2px;
                    color: #e9d5ff;
                    font-size: 1.1em;
                    line-height: 1;
                `;
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentTags.splice(idx, 1);
                    renderChips();
                    onChange(currentTags);
                });

                chip.appendChild(removeBtn);
                chipsContainer.appendChild(chip);
            });
        };

        const addTag = (raw) => {
            const normalized = this.normalizeTag(raw);
            if (!normalized) return;

            // Case-insensitive duplicate check
            const exists = currentTags.some(t => t.toLowerCase() === normalized.toLowerCase());
            if (!exists) {
                currentTags.push(normalized);
                renderChips();
                onChange(currentTags);
            }
            input.value = '';
            hideSuggestions();
        };

        const hideSuggestions = () => {
            if (suggestionsBox) {
                suggestionsBox.style.display = 'none';
                suggestionsBox.innerHTML = '';
            }
        };

        const showSuggestions = (filterText = '') => {
            const allAvailableTags = this.getTags();
            const query = (filterText || '').trim().toLowerCase();

            // Filter out already selected tags
            const unselected = allAvailableTags.filter(t =>
                !currentTags.some(ct => ct.toLowerCase() === t.toLowerCase())
            );

            const matches = query.length === 0
                ? unselected.slice(0, 10)
                : unselected.filter(t => t.toLowerCase().includes(query)).slice(0, 10);

            suggestionsBox.innerHTML = '';

            // If there's an active query and it doesn't match an exact tag, offer "Add new tag: ..."
            const exactMatch = allAvailableTags.some(t => t.toLowerCase() === query);
            if (query.length > 0 && !exactMatch) {
                const addNewItem = document.createElement('div');
                addNewItem.style.cssText = `
                    padding: 8px 12px;
                    cursor: pointer;
                    color: #a855f7;
                    font-weight: 600;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    background: rgba(124, 58, 237, 0.1);
                `;
                addNewItem.textContent = '➕ Create new tag: "';
                const strong = document.createElement('strong');
                strong.textContent = this.normalizeTag(query);
                addNewItem.appendChild(strong);
                addNewItem.append('"');
                addNewItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    addTag(query);
                    input.focus();
                });
                suggestionsBox.appendChild(addNewItem);
            }

            if (matches.length > 0) {
                matches.forEach(tag => {
                    const item = document.createElement('div');
                    item.style.cssText = `
                        padding: 7px 12px;
                        cursor: pointer;
                        color: #e0e0e0;
                        font-size: 0.88em;
                        transition: background 0.15s;
                    `;
                    item.textContent = tag;
                    item.addEventListener('mouseenter', () => {
                        item.style.background = 'rgba(124, 58, 237, 0.3)';
                    });
                    item.addEventListener('mouseleave', () => {
                        item.style.background = 'transparent';
                    });
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        addTag(tag);
                        input.focus();
                    });
                    suggestionsBox.appendChild(item);
                });
            }

            if (suggestionsBox.children.length > 0) {
                suggestionsBox.style.display = 'block';
            } else {
                hideSuggestions();
            }
        };

        // Event listeners
        box.addEventListener('click', () => {
            input.focus();
            showSuggestions(input.value);
        });

        input.addEventListener('focus', () => {
            showSuggestions(input.value);
        });

        input.addEventListener('input', () => {
            const val = input.value;
            if (val.includes(',')) {
                const parts = val.split(',');
                parts.forEach(p => addTag(p));
                input.value = '';
                showSuggestions('');
            } else {
                showSuggestions(val);
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (input.value.trim()) {
                    addTag(input.value);
                }
            } else if (e.key === 'Backspace' && input.value === '' && currentTags.length > 0) {
                currentTags.pop();
                renderChips();
                onChange(currentTags);
            } else if (e.key === 'Escape') {
                hideSuggestions();
            }
        });

        // Close dropdown on outside click
        const onDocClick = (e) => {
            if (!container.contains(e.target)) {
                hideSuggestions();
            }
        };
        document.addEventListener('click', onDocClick);

        // Initial render
        renderChips();

        return {
            getTags: () => [...currentTags],
            setTags: (tags) => {
                currentTags = Array.isArray(tags)
                    ? [...new Set(tags.map(t => this.normalizeTag(t)).filter(Boolean))]
                    : [];
                renderChips();
                onChange(currentTags);
            },
            clear: () => {
                currentTags = [];
                renderChips();
                if (input) input.value = '';
                hideSuggestions();
                onChange(currentTags);
            },
            destroy: () => {
                document.removeEventListener('click', onDocClick);
                container.innerHTML = '';
            }
        };
    }
}

// Global initialization
if (typeof window !== 'undefined') {
    window.CommunityManager = CommunityManager;
    window.communityManager = new CommunityManager();
    // Warm up index cache asynchronously
    setTimeout(() => {
        if (window.communityManager) {
            window.communityManager.fetchIndex().catch(() => {});
        }
    }, 1500);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CommunityManager,
        communityManager: (typeof window !== 'undefined' && window.communityManager)
            ? window.communityManager
            : new CommunityManager()
    };
}

