/**
 * MetaFold Upload Community Template Controller
 * Handles the simplified modal for publishing templates to the community repository on GitHub.
 * Conforms to MetaFold Community Templates Specification:
 * - 4 Fixed Categories (Systems, Protocols, Experiments, Workflows)
 * - Dynamic collection retrieval & proposed new collection handling
 * - Searchable multi-select tag picker with autocomplete & chips
 * - Mandatory description validation
 * - Automatic GitHub repository path calculation
 */

'use strict';

class UploadModal {
    constructor() {
        this.currentStep = 1;
        this.selectedTemplateIndex = 0;
        this.lastOpenedUrl = null;
        this.localUpdateCalled = false;
        this.lastUpdatedTemplate = null;
        this.tagPicker = null;

        this.internalRuntimeKeys = [
            '_fileInfo',
            'id',
            'savedLocally',
            'storageType',
            'storageDisplay',
            'storageIcon',
            'userDisplayName',
            'groupDisplayName',
            '_uiState',
            '_metafold'
        ];
    }

    /**
     * Display the upload modal.
     * @param {number|null} templateIndex Optional index of the template to preselect
     */
    show(templateIndex = null) {
        const modal = document.getElementById('uploadTemplateModal');
        if (modal) {
            modal.style.display = 'block';
        }

        this.ensureCommunityUI();

        const tm = (typeof window !== 'undefined' && window.templateManager) ? window.templateManager : null;
        const templates = (tm && Array.isArray(tm.templates)) ? tm.templates : [];

        // Populate target GitHub repository selector
        this.populateTargetRepositories();

        // Populate dropdown
        const select = document.getElementById('uploadTemplateSelect');
        if (select) {
            select.innerHTML = '';
            if (templates.length === 0) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = '-- No installed templates found --';
                select.appendChild(opt);
            } else {
                templates.forEach((t, i) => {
                    const opt = document.createElement('option');
                    opt.value = String(i);
                    const vStr = t.version ? `v${t.version}` : 'v1.0';
                    opt.textContent = `${t.name || 'Unnamed'} (${vStr})`;
                    select.appendChild(opt);
                });
            }
        }

        if (templates.length === 0) {
            console.warn('⚠️ No templates available for upload.');
            this.goToStep(1);
            return;
        }

        let targetIndex = 0;
        if (typeof templateIndex === 'number' && templateIndex >= 0 && templateIndex < templates.length) {
            targetIndex = templateIndex;
        } else if (typeof templateIndex === 'number') {
            targetIndex = 0;
        } else if (tm && tm.currentTemplate) {
            const curIdx = templates.findIndex(t => (t.id && t.id === tm.currentTemplate.id) || t.name === tm.currentTemplate.name);
            if (curIdx >= 0) {
                targetIndex = curIdx;
            }
        }

        if (select) {
            select.value = String(targetIndex);
        }

        this.onTemplateSelected(targetIndex);
        this.goToStep(2);
    }

    /**
     * Populate Target GitHub Repository dropdown from CommunityManager repositories.
     */
    populateTargetRepositories() {
        const repoSelect = document.getElementById('uploadTargetRepo');
        if (!repoSelect) return;

        const defaultIssuesUrl = 'https://github.com/ThZobel/MetaFold-Templates/issues/new';
        const repos = (typeof window !== 'undefined' && window.communityManager && typeof window.communityManager.getRepositories === 'function')
            ? window.communityManager.getRepositories().filter(r => r.enabled !== false && r.normalized && r.normalized.issuesUrl)
            : [];

        const prev = repoSelect.value;
        repoSelect.innerHTML = '';

        if (repos.length === 0) {
            const opt = document.createElement('option');
            opt.value = defaultIssuesUrl;
            opt.textContent = 'MetaFold Community (ThZobel/MetaFold-Templates)';
            repoSelect.appendChild(opt);
            return;
        }

        repos.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.normalized.issuesUrl;
            opt.textContent = `${r.name}${r.normalized.owner && r.normalized.repo ? ` (${r.normalized.owner}/${r.normalized.repo})` : ''}`;
            repoSelect.appendChild(opt);
        });

        if (prev && [...repoSelect.options].some(o => o.value === prev)) {
            repoSelect.value = prev;
        }
    }

    /**
     * Close the modal and reset visibility.
     */
    close() {
        const modal = document.getElementById('uploadTemplateModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Ensure TagPicker and Collection UI are initialized.
     */
    ensureCommunityUI() {
        const container = document.getElementById('uploadTagsContainer');
        if (container && !this.tagPicker && typeof window !== 'undefined' && window.communityManager) {
            this.tagPicker = window.communityManager.createTagPicker({
                container: container,
                onChange: (tags) => {
                    const hidden = document.getElementById('uploadTags');
                    if (hidden) hidden.value = tags.join(', ');
                }
            });
        }

        const colSelect = document.getElementById('uploadCollection');
        if (colSelect && typeof window !== 'undefined' && window.communityManager) {
            const currentVal = colSelect.value || 'General';
            const collections = window.communityManager.getCollections();
            colSelect.innerHTML = '';
            collections.forEach(col => {
                const opt = document.createElement('option');
                opt.value = col.id;
                opt.textContent = col.name + (col.id === 'General' ? ' (Default Collection)' : '');
                colSelect.appendChild(opt);
            });
            const proposeOpt = document.createElement('option');
            proposeOpt.value = '__propose_new__';
            proposeOpt.textContent = '➕ Propose new collection...';
            colSelect.appendChild(proposeOpt);

            if ([...colSelect.options].some(o => o.value === currentVal)) {
                colSelect.value = currentVal;
            } else {
                colSelect.value = 'General';
            }
        }
    }

    /**
     * Handle collection dropdown change.
     * @param {string} val Selected collection id
     */
    onCollectionChange(val) {
        const box = document.getElementById('uploadProposedCollectionBox');
        if (box) {
            box.style.display = (val === '__propose_new__') ? 'block' : 'none';
        }
        this.updateTargetPathBadge();
    }

    /**
     * Update target repository path badge dynamically.
     */
    updateTargetPathBadge() {
        const tm = (typeof window !== 'undefined' && window.templateManager) ? window.templateManager : null;
        const templates = tm && Array.isArray(tm.templates) ? tm.templates : [];
        const template = templates[this.selectedTemplateIndex];
        const templateName = template?.name || 'unnamed_template';

        const colSelect = document.getElementById('uploadCollection');
        const colVal = colSelect?.value || 'General';
        const isProposed = (colVal === '__propose_new__');

        let colName = colVal;
        if (isProposed) {
            const pInput = document.getElementById('uploadProposedName');
            colName = pInput?.value?.trim() || 'ProposedCollection';
        }

        const pathTextEl = document.getElementById('uploadTargetPathText');
        if (pathTextEl && typeof window !== 'undefined' && window.communityManager) {
            const path = window.communityManager.computeRepositoryPath(templateName, colName, isProposed);
            pathTextEl.textContent = path;
        }
    }

    /**
     * Pre-fills Step 2 inputs based on the selected template's community block.
     * @param {number|string} index Index of the template
     */
    onTemplateSelected(index) {
        this.ensureCommunityUI();

        const tm = (typeof window !== 'undefined' && window.templateManager) ? window.templateManager : null;
        if (!tm || !Array.isArray(tm.templates)) {
            return;
        }

        const idx = typeof index === 'number' ? index : parseInt(index, 10);
        if (isNaN(idx) || idx < 0 || idx >= tm.templates.length) {
            return;
        }

        const template = tm.templates[idx];
        if (!template) {
            return;
        }

        this.selectedTemplateIndex = idx;
        const comm = template.community || {};

        // Category (Fixed: Systems, Protocols, Experiments, Workflows)
        const catSelect = document.getElementById('uploadCategory');
        if (catSelect) {
            const rawCat = comm.category || comm.type || template.type || 'Experiments';
            const matched = ['Systems', 'Protocols', 'Experiments', 'Workflows'].find(
                c => c.toLowerCase() === String(rawCat).toLowerCase()
            ) || 'Experiments';
            catSelect.value = matched;
        }

        // Collection & Proposed collection
        const colSelect = document.getElementById('uploadCollection');
        if (colSelect) {
            if (comm.proposedCollection && comm.proposedCollection.name) {
                colSelect.value = '__propose_new__';
                this.onCollectionChange('__propose_new__');
                const pName = document.getElementById('uploadProposedName');
                const pLab = document.getElementById('uploadProposedLab');
                const pDesc = document.getElementById('uploadProposedDesc');
                const pWeb = document.getElementById('uploadProposedWebsite');
                if (pName) pName.value = comm.proposedCollection.name || '';
                if (pLab) pLab.value = comm.proposedCollection.institution || '';
                if (pDesc) pDesc.value = comm.proposedCollection.description || '';
                if (pWeb) pWeb.value = comm.proposedCollection.website || '';
            } else {
                const col = comm.collection || 'General';
                if (![...colSelect.options].some(o => o.value === col)) {
                    const opt = document.createElement('option');
                    opt.value = col;
                    opt.textContent = col;
                    colSelect.insertBefore(opt, colSelect.lastElementChild);
                }
                colSelect.value = col;
                this.onCollectionChange(col);
            }
        }

        // Description
        const descInput = document.getElementById('uploadDescription');
        if (descInput) {
            descInput.value = template.description || comm.description || '';
        }

        // Tags
        let tags = [];
        if (Array.isArray(comm.tags)) {
            tags = comm.tags;
        } else if (comm.tags) {
            tags = String(comm.tags).split(',').map(t => t.trim()).filter(Boolean);
        }
        if (this.tagPicker) {
            this.tagPicker.setTags(tags);
        }
        const tagsInput = document.getElementById('uploadTags');
        if (tagsInput) {
            tagsInput.value = tags.join(', ');
        }

        // Author, License, Institution, Orcid, Version
        const authorInput = document.getElementById('uploadAuthor');
        if (authorInput) {
            authorInput.value = comm.author || template.createdBy || (typeof window !== 'undefined' && window.userManager ? window.userManager.currentUser : '') || '';
        }

        const licenseInput = document.getElementById('uploadLicense');
        if (licenseInput) {
            licenseInput.value = (comm.license === 'CC-BY-4.0') ? 'CC-BY-4.0' : 'CC0-1.0';
        }

        const instInput = document.getElementById('uploadInstitution');
        if (instInput) {
            instInput.value = comm.institution || (typeof window !== 'undefined' && window.userManager ? window.userManager.currentGroup : '') || '';
        }

        const orcidInput = document.getElementById('uploadOrcid');
        if (orcidInput) {
            orcidInput.value = comm.orcid || '';
        }

        const verInput = document.getElementById('uploadVersion');
        if (verInput) {
            verInput.value = comm.version || template.version || '1.0.0';
        }

        // Legacy compatibility inputs
        const sysInput = document.getElementById('uploadSystem');
        if (sysInput) sysInput.value = comm.system || '';
        const discInput = document.getElementById('uploadDiscipline');
        if (discInput) discInput.value = comm.discipline || '';
        const orgInput = document.getElementById('uploadOrganism');
        if (orgInput) orgInput.value = comm.organism || '';

        this.updateTargetPathBadge();
    }

    /**
     * Toggle visibility between Step 1 and Step 2.
     * @param {number} step Step number (1 or 2)
     */
    goToStep(step) {
        this.currentStep = step;
        const step1 = document.getElementById('uploadStep1Section');
        const step2 = document.getElementById('uploadStep2Section');
        const nextBtn = document.getElementById('uploadNextBtn');
        const backBtn = document.getElementById('uploadBackBtn');
        const confirmBtn = document.getElementById('uploadConfirmBtn') || document.getElementById('btnSubmitUpload');

        if (step === 1) {
            if (step1) step1.style.display = 'block';
            if (step2) step2.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'inline-block';
            if (backBtn) backBtn.style.display = 'none';
            if (confirmBtn) confirmBtn.style.display = 'none';
        } else {
            if (step1) step1.style.display = 'block';
            if (step2) step2.style.display = 'block';
            if (nextBtn) nextBtn.style.display = 'none';
            if (backBtn) backBtn.style.display = 'inline-block';
            if (confirmBtn) confirmBtn.style.display = 'inline-block';
            this.ensureCommunityUI();
            this.updateTargetPathBadge();
        }
    }

    /**
     * Parse tag string or array into trimmed array of tags.
     * @param {string|string[]} rawTags
     * @returns {string[]}
     */
    parseTags(rawTags) {
        if (!rawTags) return [];
        if (Array.isArray(rawTags)) {
            return rawTags.map(t => String(t).trim()).filter(Boolean);
        }
        return String(rawTags)
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
    }

    /**
     * Strips internal runtime metadata from template prior to export.
     * @param {Object} template
     * @returns {Object} Clean copy
     */
    sanitizeTemplate(template) {
        if (!template || typeof template !== 'object') return {};
        const cloned = JSON.parse(JSON.stringify(template));
        for (const key of this.internalRuntimeKeys) {
            delete cloned[key];
        }
        return cloned;
    }

    /**
     * Formats Markdown issue body and constructs GitHub issue URL.
     * @param {Object} template
     * @param {Object} [taxonomy={}] Optional taxonomy overrides
     * @param {Object} [options={}] Optional upload target overrides
     * @returns {Object} { title, body, url, sanitizedTemplate }
     */
    formatIssueBody(template, taxonomy = {}, options = {}) {
        const sanitizedTemplate = this.sanitizeTemplate(template);
        sanitizedTemplate.community = Object.assign({}, sanitizedTemplate.community || {}, taxonomy);
        const comm = sanitizedTemplate.community;

        const rawCat = comm.category || comm.type || sanitizedTemplate.type || 'Experiments';
        const category = ['Systems', 'Protocols', 'Experiments', 'Workflows'].find(
            c => c.toLowerCase() === String(rawCat).toLowerCase()
        ) || 'Experiments';

        const isProposed = Boolean(comm.proposedCollection && comm.proposedCollection.name);
        const proposed = isProposed ? comm.proposedCollection : null;
        const collection = isProposed ? 'General' : (comm.collection || 'General');

        const templateName = sanitizedTemplate.name || 'Unnamed';
        let targetPath = '';
        if (typeof window !== 'undefined' && window.communityManager) {
            targetPath = window.communityManager.computeRepositoryPath(templateName, collection, isProposed);
        } else {
            const slug = (templateName).toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
            targetPath = (isProposed || collection.toLowerCase() === 'general')
                ? `General/${slug}.json`
                : `Communities/${collection}/${slug}.json`;
        }

        sanitizedTemplate.path = targetPath;
        sanitizedTemplate.community.path = targetPath;
        sanitizedTemplate.community.category = category;
        sanitizedTemplate.community.type = category.toLowerCase();
        sanitizedTemplate.community.collection = collection;

        let issueTitle = `New Template: ${templateName}`;
        if (isProposed && proposed && proposed.name) {
            issueTitle = `[New Collection Proposal] ${proposed.name}: ${templateName}`;
        }

        const tagsStr = Array.isArray(comm.tags)
            ? (comm.tags.length > 0 ? comm.tags.join(', ') : 'None')
            : (comm.tags || 'None');

        const bodyLines = [
            '### New Community Template Submission',
            ''
        ];

        if (isProposed && proposed) {
            bodyLines.push(
                '> [!IMPORTANT]',
                `> **New Collection Proposal: ${proposed.name}**`,
                `> - **Description:** ${proposed.description || 'Not specified'}`,
                `> - **Institution / Community:** ${proposed.institution || 'Not specified'}`,
                `> - **Website:** ${proposed.website || 'Not specified'}`,
                `> - **Initial Target Location:** \`${targetPath}\` (placed in General pending maintainer review)`,
                ''
            );
        }

        bodyLines.push(
            `**Template Name:** ${templateName}`,
            `**Category:** ${category}`,
            `**Collection:** ${isProposed ? `General (Proposed: ${proposed.name})` : collection}`,
            `**Target Repository Path:** \`${targetPath}\``,
            `**Author:** ${comm.author || sanitizedTemplate.createdBy || 'Unknown'}`,
            `**License:** ${comm.license || 'CC0-1.0'}`
        );

        if (comm.version) {
            bodyLines.push(`**Version:** ${comm.version}`);
        }
        if (sanitizedTemplate.uuid) {
            bodyLines.push(`**Template UUID:** \`${sanitizedTemplate.uuid}\``);
        }

        // Include legacy system/discipline/organism if present for backward compatibility
        if (comm.system) bodyLines.push(`**System / Device:** ${comm.system}`);
        if (comm.discipline) bodyLines.push(`**Discipline:** ${comm.discipline}`);
        if (comm.organism) bodyLines.push(`**Biological System:** ${comm.organism}`);

        const jsonFormatted = JSON.stringify(sanitizedTemplate, null, 2);

        bodyLines.push(
            `**Tags:** ${tagsStr}`,
            '',
            '**Description:**',
            sanitizedTemplate.description || comm.description || 'No description provided.',
            '',
            '#### Template JSON',
            'Please review the following template. Once approved, it will be added to the community repository.',
            '',
            '```json',
            jsonFormatted,
            '```'
        );

        const issueBody = bodyLines.join('\n');
        const repoSelectEl = (typeof document !== 'undefined') ? document.getElementById('uploadTargetRepo') : null;
        const repoTarget = (options && options.repoIssuesUrl)
            || (repoSelectEl && repoSelectEl.value ? repoSelectEl.value : '')
            || 'https://github.com/ThZobel/MetaFold-Templates/issues/new';
        let issueUrl = `${repoTarget}?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;
        let isTruncated = false;

        // GitHub HTTP server rejects requests > ~8KB with "Your request URL is too long" (HTTP 414).
        // Standard safe limit across browsers, proxies, and OS shell launch handlers is ~3500-4000 characters.
        const MAX_SAFE_URL_LENGTH = 3500;
        if (issueUrl.length > MAX_SAFE_URL_LENGTH) {
            isTruncated = true;
            const safeBodyLines = [
                '### New Community Template Submission',
                ''
            ];

            if (isProposed && proposed) {
                safeBodyLines.push(
                    '> [!IMPORTANT]',
                    `> **New Collection Proposal: ${proposed.name}**`,
                    `> - **Description:** ${proposed.description || 'Not specified'}`,
                    `> - **Institution / Community:** ${proposed.institution || 'Not specified'}`,
                    `> - **Website:** ${proposed.website || 'Not specified'}`,
                    `> - **Initial Target Location:** \`${targetPath}\` (placed in General pending maintainer review)`,
                    ''
                );
            }

            safeBodyLines.push(
                `**Template Name:** ${templateName}`,
                `**Category:** ${category}`,
                `**Collection:** ${isProposed ? `General (Proposed: ${proposed.name})` : collection}`,
                `**Target Repository Path:** \`${targetPath}\``,
                `**Author:** ${comm.author || sanitizedTemplate.createdBy || 'Unknown'}`,
                `**License:** ${comm.license || 'CC0-1.0'}`
            );

            if (comm.version) {
                safeBodyLines.push(`**Version:** ${comm.version}`);
            }
            if (sanitizedTemplate.uuid) {
                safeBodyLines.push(`**Template UUID:** \`${sanitizedTemplate.uuid}\``);
            }

            if (comm.system) safeBodyLines.push(`**System / Device:** ${comm.system}`);
            if (comm.discipline) safeBodyLines.push(`**Discipline:** ${comm.discipline}`);
            if (comm.organism) safeBodyLines.push(`**Biological System:** ${comm.organism}`);

            safeBodyLines.push(
                `**Tags:** ${tagsStr}`,
                '',
                '**Description:**',
                sanitizedTemplate.description || comm.description || 'No description provided.',
                '',
                '#### Template JSON',
                '> 📋 **Notice:** The template JSON was too large for GitHub\'s URL limit and has been **automatically copied to your clipboard**.',
                '> 👉 **Please paste (`Ctrl+V` / `Cmd+V`) the JSON between the code fences below:**',
                '',
                '```json',
                '',
                '```'
            );

            const safeBody = safeBodyLines.join('\n');
            issueUrl = `${repoTarget}?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(safeBody)}`;
        }

        return {
            title: issueTitle,
            body: issueBody,
            url: issueUrl,
            targetPath,
            sanitizedTemplate,
            isTruncated,
            jsonFormatted
        };
    }

    /**
     * Copy text to clipboard safely across Electron and browser.
     * @param {string} text
     * @returns {Promise<boolean>}
     */
    async copyToClipboard(text) {
        if (!text) return false;
        try {
            if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.copyToClipboard === 'function') {
                await window.electronAPI.copyToClipboard(text);
                return true;
            }
            if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(text);
                return true;
            }
            if (typeof document !== 'undefined') {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                ta.style.top = '-9999px';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                return ok;
            }
        } catch (err) {
            console.warn('⚠️ Clipboard copy failed:', err);
        }
        return false;
    }

    /**
     * Manually copy the current template JSON to clipboard from the modal.
     */
    async copyCurrentJson() {
        const tm = (typeof window !== 'undefined' && window.templateManager) ? window.templateManager : null;
        const select = document.getElementById('uploadTemplateSelect');
        const idx = select ? (parseInt(select.value, 10) || 0) : this.selectedTemplateIndex;
        const templates = tm && Array.isArray(tm.templates) ? tm.templates : [];
        const template = templates[idx];
        if (!template) {
            const msg = 'No template selected to copy.';
            if (typeof window !== 'undefined' && window.app && typeof window.app.showError === 'function') {
                window.app.showError(msg);
            } else if (typeof alert === 'function') {
                alert(msg);
            }
            return;
        }

        const sanitized = this.sanitizeTemplate(template);
        const jsonString = JSON.stringify(sanitized, null, 2);
        await this.copyToClipboard(jsonString);

        const btn = document.getElementById('uploadCopyJsonBtn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Copied!';
            setTimeout(() => { btn.innerHTML = originalText; }, 2000);
        }

        const msg = `Template "${template.name || 'Template'}" JSON copied to clipboard!`;
        if (typeof showSuccessNotification === 'function') {
            showSuccessNotification(msg);
        } else if (typeof window !== 'undefined' && window.app && typeof window.app.showSuccess === 'function') {
            window.app.showSuccess(msg);
        }
    }

    /**
     * Submit template to GitHub.
     * Validates mandatory description, syncs local tags if checked, constructs issue URL, and opens browser.
     */
    async submit() {
        const tm = (typeof window !== 'undefined' && window.templateManager) ? window.templateManager : null;
        const select = document.getElementById('uploadTemplateSelect');
        const idx = select ? (parseInt(select.value, 10) || 0) : this.selectedTemplateIndex;

        const templates = tm && Array.isArray(tm.templates) ? tm.templates : [];
        const template = templates[idx];
        if (!template) {
            console.warn('⚠️ No valid template selected for upload.');
            return null;
        }

        // Validate mandatory description
        const descInput = document.getElementById('uploadDescription');
        const description = descInput ? descInput.value.trim() : (template.description || '');
        if (!description) {
            const msg = 'Please enter a description for this template before uploading.';
            if (typeof window !== 'undefined' && window.app && typeof window.app.showError === 'function') {
                window.app.showError(msg);
            } else if (typeof alert === 'function') {
                alert(msg);
            }
            if (descInput) descInput.focus();
            return null;
        }

        // Collection & Proposed collection validation
        const colSelect = document.getElementById('uploadCollection');
        const colVal = colSelect?.value || 'General';
        const isProposed = (colVal === '__propose_new__');

        let proposedCollection = null;
        if (isProposed) {
            const pName = document.getElementById('uploadProposedName')?.value?.trim() || '';
            if (!pName) {
                const msg = 'Please enter a name for the proposed collection.';
                if (typeof window !== 'undefined' && window.app && typeof window.app.showError === 'function') {
                    window.app.showError(msg);
                } else if (typeof alert === 'function') {
                    alert(msg);
                }
                const pInput = document.getElementById('uploadProposedName');
                if (pInput) pInput.focus();
                return null;
            }
            proposedCollection = {
                name: pName,
                institution: document.getElementById('uploadProposedLab')?.value?.trim() || '',
                description: document.getElementById('uploadProposedDesc')?.value?.trim() || '',
                website: document.getElementById('uploadProposedWebsite')?.value?.trim() || ''
            };
        }

        // Tags
        let tags = [];
        if (this.tagPicker) {
            tags = this.tagPicker.getTags();
        } else {
            const tagsInput = document.getElementById('uploadTags');
            tags = this.parseTags(tagsInput?.value || '');
        }

        const category = document.getElementById('uploadCategory')?.value || 'Experiments';

        const editedCommunity = {
            category,
            type: category.toLowerCase(),
            collection: isProposed ? 'General' : colVal,
            proposedCollection,
            tags,
            description,
            author: document.getElementById('uploadAuthor')?.value?.trim() || '',
            license: document.getElementById('uploadLicense')?.value || 'CC0-1.0',
            system: document.getElementById('uploadSystem')?.value?.trim() || '',
            discipline: document.getElementById('uploadDiscipline')?.value?.trim() || '',
            organism: document.getElementById('uploadOrganism')?.value?.trim() || ''
        };

        const instInput = document.getElementById('uploadInstitution');
        if (instInput && instInput.value.trim()) {
            editedCommunity.institution = instInput.value.trim();
        }

        const orcidInput = document.getElementById('uploadOrcid');
        if (orcidInput && orcidInput.value.trim()) {
            editedCommunity.orcid = orcidInput.value.trim();
        }

        const verInput = document.getElementById('uploadVersion');
        if (verInput && verInput.value.trim()) {
            editedCommunity.version = verInput.value.trim();
        }

        // Update template description and ensure UUID exists for upload & sharing
        template.description = description;
        if (!template.uuid && typeof window !== 'undefined' && window.metafoldTemplateUuid && typeof window.metafoldTemplateUuid.generateTemplateUuid === 'function') {
            template.uuid = window.metafoldTemplateUuid.generateTemplateUuid();
        }

        const syncCheckbox = document.getElementById('uploadSyncLocal') || document.getElementById('uploadSyncLocalCheckbox');
        if (syncCheckbox && syncCheckbox.checked) {
            template.community = Object.assign({}, template.community, editedCommunity);
            this.localUpdateCalled = true;
            this.lastUpdatedTemplate = template;

            if (typeof window !== 'undefined' && window.storage && typeof window.storage.saveTemplateToFileImmediately === 'function') {
                await window.storage.saveTemplateToFileImmediately(template);
            } else if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.saveTemplateToFile === 'function') {
                const userInfo = (window.storage && typeof window.storage.getCurrentUserContext === 'function')
                    ? window.storage.getCurrentUserContext()
                    : { username: window.userManager?.currentUser || 'Unknown', groupname: window.userManager?.currentGroup || 'Default' };
                await window.electronAPI.saveTemplateToFile(template, userInfo);
            }
        }

        const repoSelectEl = (typeof document !== 'undefined') ? document.getElementById('uploadTargetRepo') : null;
        const repoIssuesUrl = (repoSelectEl && repoSelectEl.value) ? repoSelectEl.value : undefined;
        const payload = this.formatIssueBody(template, editedCommunity, { repoIssuesUrl });
        this.lastOpenedUrl = payload.url;

        // Automatically copy template JSON to clipboard
        if (payload.jsonFormatted) {
            await this.copyToClipboard(payload.jsonFormatted);
        }

        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
            window.electronAPI.openExternal(payload.url);
        } else if (typeof window !== 'undefined' && typeof window.open === 'function') {
            window.open(payload.url, '_blank');
        }

        this.close();

        const successMsg = payload.isTruncated
            ? 'Template opened in GitHub! 📋 The template JSON was copied to your clipboard — please paste it (Ctrl+V) into the issue body.'
            : 'Template submission opened in GitHub!';

        if (typeof showSuccessNotification === 'function') {
            showSuccessNotification(successMsg);
        } else if (typeof window !== 'undefined' && window.app && typeof window.app.showSuccess === 'function') {
            window.app.showSuccess(successMsg);
        }

        return payload;
    }
}

// Global initialization
if (typeof window !== 'undefined') {
    window.UploadModal = UploadModal;
    window.uploadModal = new UploadModal();

    // Trigger upload from slide-out panel
    window.uploadCurrentTemplate = function () {
        if (typeof closeMoreMenu === 'function') {
            closeMoreMenu();
        }
        const tm = window.templateManager;
        let selectedIdx = 0;
        if (tm && tm.currentTemplate && Array.isArray(tm.templates)) {
            const idx = tm.templates.findIndex(t => (t.id && t.id === tm.currentTemplate.id) || t.name === tm.currentTemplate.name);
            if (idx >= 0) selectedIdx = idx;
        }
        if (window.uploadModal) {
            window.uploadModal.show(selectedIdx);
        }
    };

    // Menu action listener
    if (window.electronAPI && window.electronAPI.onMenuAction) {
        window.electronAPI.onMenuAction((action) => {
            if (action === 'upload-template') {
                if (window.uploadModal) {
                    window.uploadModal.show();
                }
            }
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UploadModal,
        uploadModal: (typeof window !== 'undefined' && window.uploadModal) ? window.uploadModal : new UploadModal()
    };
}
