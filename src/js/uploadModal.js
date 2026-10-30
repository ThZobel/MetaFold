/**
 * MetaFold Upload Community Template Controller
 * Handles the 2-step modal for publishing templates to the community repository on GitHub.
 * Milestone 2: Features 11–17
 */

'use strict';

class UploadModal {
    constructor() {
        this.currentStep = 1;
        this.selectedTemplateIndex = 0;
        this.lastOpenedUrl = null;
        this.localUpdateCalled = false;
        this.lastUpdatedTemplate = null;

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

        const tm = (typeof window !== 'undefined' && window.templateManager) ? window.templateManager : null;
        const templates = (tm && Array.isArray(tm.templates)) ? tm.templates : [];

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
     * Close the modal and reset visibility.
     */
    close() {
        const modal = document.getElementById('uploadTemplateModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Pre-fills Step 2 inputs based on the selected template's community block.
     * @param {number|string} index Index of the template
     */
    onTemplateSelected(index) {
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

        const sysInput = document.getElementById('uploadSystem');
        if (sysInput) sysInput.value = comm.system || '';

        const discInput = document.getElementById('uploadDiscipline');
        if (discInput) discInput.value = comm.discipline || '';

        const orgInput = document.getElementById('uploadOrganism');
        if (orgInput) orgInput.value = comm.organism || '';

        const tagsInput = document.getElementById('uploadTags');
        if (tagsInput) {
            tagsInput.value = Array.isArray(comm.tags)
                ? comm.tags.join(', ')
                : (comm.tags || '');
        }

        const authorInput = document.getElementById('uploadAuthor');
        if (authorInput) {
            authorInput.value = comm.author || template.createdBy || (typeof window !== 'undefined' && window.userManager ? window.userManager.currentUser : '') || '';
        }

        const licenseInput = document.getElementById('uploadLicense');
        if (licenseInput) {
            licenseInput.value = comm.license || 'CC-BY-4.0';
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
     * @param {Object} taxonomy Optional taxonomy overrides
     * @returns {Object} { title, body, url, sanitizedTemplate }
     */
    formatIssueBody(template, taxonomy = {}) {
        const sanitizedTemplate = this.sanitizeTemplate(template);
        if (taxonomy && typeof taxonomy === 'object' && Object.keys(taxonomy).length > 0) {
            sanitizedTemplate.community = Object.assign({}, sanitizedTemplate.community, taxonomy);
        }
        const comm = sanitizedTemplate.community || {};
        const issueTitle = `New Template: ${sanitizedTemplate.name || 'Unnamed'}`;

        const tagsStr = Array.isArray(comm.tags)
            ? (comm.tags.length > 0 ? comm.tags.join(', ') : 'None')
            : (comm.tags || 'None');

        const issueBody = [
            '### New Community Template Submission',
            '',
            `**Template Name:** ${sanitizedTemplate.name || 'Unnamed'}`,
            `**Author:** ${comm.author || sanitizedTemplate.createdBy || 'Unknown'}`,
            `**System / Device:** ${comm.system || 'Not specified'}`,
            `**Discipline:** ${comm.discipline || 'Not specified'}`,
            `**Biological System:** ${comm.organism || 'Not specified'}`,
            `**Tags:** ${tagsStr}`,
            `**License:** ${comm.license || 'CC-BY-4.0'}`,
            '',
            '**Description:**',
            sanitizedTemplate.description || 'No description provided.',
            '',
            '#### Template JSON',
            'Please review the following template. Once approved, it will be added to the community repository.',
            '',
            '```json',
            JSON.stringify(sanitizedTemplate, null, 2),
            '```'
        ].join('\n');

        const repoTarget = 'https://github.com/ThZobel/MetaFold-Templates/issues/new';
        const issueUrl = `${repoTarget}?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;

        return {
            title: issueTitle,
            body: issueBody,
            url: issueUrl,
            sanitizedTemplate
        };
    }

    /**
     * Submit template to GitHub.
     * Syncs local tags if checked, constructs issue URL, and opens browser.
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

        const tagsInput = document.getElementById('uploadTags');
        const editedCommunity = {
            system: document.getElementById('uploadSystem')?.value?.trim() || '',
            discipline: document.getElementById('uploadDiscipline')?.value?.trim() || '',
            organism: document.getElementById('uploadOrganism')?.value?.trim() || '',
            tags: this.parseTags(tagsInput?.value || ''),
            author: document.getElementById('uploadAuthor')?.value?.trim() || '',
            license: document.getElementById('uploadLicense')?.value || 'CC-BY-4.0'
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

        const payload = this.formatIssueBody(template, editedCommunity);
        this.lastOpenedUrl = payload.url;

        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
            window.electronAPI.openExternal(payload.url);
        } else if (typeof window !== 'undefined' && typeof window.open === 'function') {
            window.open(payload.url, '_blank');
        }

        this.close();

        if (typeof showSuccessNotification === 'function') {
            showSuccessNotification('Template submission opened in GitHub!');
        } else if (typeof window !== 'undefined' && window.app && typeof window.app.showSuccess === 'function') {
            window.app.showSuccess('Template submission opened in GitHub!');
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
