'use strict';

/**
 * MetaFold Community Templates (Phases 1–3)
 * Specification Contracts & Authoritative Reference Data
 * Sources: COMMUNITY_TEMPLATES_PLAN.md, PROJECT.md, ORIGINAL_REQUEST.md
 */

const SYSTEM_OPTIONS = [
    'Microscopy (Light / Widefield)',
    'Microscopy (Confocal / 2-Photon)',
    'Microscopy (Super-Resolution / STED / SIM / STORM)',
    'Microscopy (Light Sheet / SPIM)',
    'Microscopy (Electron / SEM / TEM / Cryo-EM)',
    'Plate Reader / Spectrophotometer',
    'Flow Cytometer / FACS',
    'Sequencer (NGS / Illumina / Nanopore / PacBio)',
    'Mass Spectrometer (Proteomics / Metabolomics)',
    'Chromatography (HPLC / FPLC / GC)',
    'Wet Lab: PCR / qPCR / Thermal Cycler',
    'Wet Lab: Staining / Histology / Immunofluorescence',
    'Wet Lab: Sample Prep / Extraction / Purification',
    'Wet Lab: Gel Imaging / Western Blot',
    'Wet Lab: Cell Culture / Incubator / Bioreactor',
    'Wet Lab: General Bench Protocol',
    'Data Analysis / Bioimage Analysis',
    'Hardware / 3D Printing / Prototyping'
];

const DISCIPLINE_OPTIONS = [
    'Plant Biology / Botany',
    'Cell Biology',
    'Neuroscience',
    'Developmental Biology',
    'Microbiology / Bacteriology',
    'Virology',
    'Immunology',
    'Molecular Biology & Genetics',
    'Biochemistry & Structural Biology',
    'Biophysics',
    'Pharmacology & Toxicology',
    'Ecology & Evolution',
    'Material Science & Physics',
    'Chemistry & Synthesis',
    'Computer Science & Data Engineering'
];

const ORGANISM_OPTIONS = [
    'Arabidopsis thaliana',
    'Danio rerio',
    'Mus musculus',
    'Rattus norvegicus',
    'Drosophila melanogaster',
    'Caenorhabditis elegans',
    'Homo sapiens / Human Cell Lines',
    'Saccharomyces cerevisiae / Yeast',
    'Escherichia coli / Bacteria',
    'Viruses / Phages',
    'Organoids / 3D Tissues',
    'Non-biological / In vitro / Synthetic'
];

const LICENSE_OPTIONS = [
    'CC0-1.0',
    'CC-BY-4.0',
    'CC-BY-SA-4.0',
    'MIT',
    'Apache-2.0',
    'Other'
];

const ALL_AVAILABLE_KEYS = [
    'collection',
    'system',
    'discipline',
    'organism',
    'tags',
    'author',
    'version'
];

const VISIBLE_COLUMNS = [
    'collection',
    'system',
    'discipline',
    'organism',
    'tags',
    'author'
];

const INTERNAL_RUNTIME_KEYS = [
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

const SPEC_TEMPLATE_MODAL_HTML = `<div class="modal-content">
    <span class="close" onclick="closeTemplateModal()">&times;</span>
    <h2 id="modalTitle">Create New Template</h2>

    <div class="form-group">
        <label for="templateName">Template Name:</label>
        <input type="text" id="templateName" placeholder="e.g. Web Project, Photo Shoot, etc.">
    </div>

    <div class="form-group">
        <label for="templateDescription">Description (optional):</label>
        <input type="text" id="templateDescription" placeholder="Brief description of the template">
    </div>

    <!-- Experiment Tab -->
    <div id="experimentTab" class="tab-content" style="display: block;">
        <div class="tabs">
            <div class="tab active" data-tab="metadata" id="tabBtnMetadata" onclick="switchModalTab('metadata')">📋 Metadata Fields</div>
            <div class="tab" data-tab="community" id="tabBtnCommunity" onclick="switchModalTab('community')">🌐 Community &amp; Sharing</div>
        </div>

        <!-- Tab 1: Metadata Fields (Default Active) -->
        <div id="metadataContent" class="tab-content active">
            <div class="form-group">
                <label>Metadata Fields:</label>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                    <button class="btn btn-secondary btn-small" onclick="addMetadataField()">+ Add Field</button>
                    <button class="btn btn-secondary btn-small" onclick="loadJsonMetadata()">📂 Load JSON</button>
                </div>
            </div>

            <!-- Lineage Quick-Actions -->
            <div style="background: rgba(124, 58, 237, 0.08); border: 1px solid rgba(124, 58, 237, 0.25); border-radius: 8px; padding: 12px 14px; margin-bottom: 14px;">
                <div style="font-size: 11px; font-weight: 600; color: #a855f7; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;">🔗 Knowledge Graph – Lineage Fields</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-small" onclick="metadataEditor.addLineageIdField()">🔑 Add Lineage ID (Anchor)</button>
                    <button class="btn btn-small" onclick="metadataEditor.addDerivedFromField()">🔗 Add 'Derived From' (Link)</button>
                </div>
            </div>

            <div id="metadataFields"></div>

            <!-- Collapsible Folder Structure Section -->
            <details id="folderStructureDetails" style="margin-top: 20px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 12px 16px;">
                <summary style="cursor: pointer; font-weight: 600; color: #e0e0e0; user-select: none; display: flex; align-items: center; gap: 8px;">
                    <span>📁</span> Folder Structure &amp; Execution Mode (Optional)
                </summary>
                <div style="margin-top: 15px;">
                    <div class="form-group" style="padding: 15px; background: #2d2d2d; border-radius: 8px; margin-bottom: 15px; border: 1px solid #404040;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                            <div>
                                <strong style="display: block; margin-bottom: 4px;">Write files only (Flag-File)</strong>
                                <span style="font-size: 0.85em; color: #9ca3af;">These files are not treated as a Project with metadata</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" id="templateWriteFilesOnly">
                                <span class="slider round"></span>
                            </label>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <strong style="display: block; margin-bottom: 4px;">Multiple folders (Batch mode)</strong>
                                <span style="font-size: 0.85em; color: #9ca3af;">Select existing folders to write to (disables Project Name)</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" id="templateMultipleFolders">
                                <span class="slider round"></span>
                            </label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="experimentStructure">Folder Structure (optional):</label>
                        <textarea id="experimentStructure" placeholder="Experiment folder structure"></textarea>
                    </div>
                </div>
            </details>
        </div>

        <!-- Tab 2: Community & Sharing (Optional) -->
        <div id="communityContent" class="tab-content">
            <div style="background: rgba(124, 58, 237, 0.08); border: 1px solid rgba(124, 58, 237, 0.25); border-radius: 8px; padding: 12px 14px; margin-bottom: 18px;">
                <div style="font-size: 13px; font-weight: 600; color: #a855f7; margin-bottom: 4px;">
                    🌐 Publishing &amp; Community Hub Metadata (Optional)
                </div>
            </div>

            <!-- System / Device -->
            <div class="form-group">
                <label for="communitySystem">System / Device:</label>
                <input type="text" id="communitySystem" list="communitySystemList" placeholder="e.g. Microscopy (Confocal / 2-Photon)">
                <datalist id="communitySystemList">
                    <option value="Microscopy (Light / Widefield)">
                    <option value="Microscopy (Confocal / 2-Photon)">
                    <option value="Microscopy (Super-Resolution / STED / SIM / STORM)">
                    <option value="Microscopy (Light Sheet / SPIM)">
                    <option value="Microscopy (Electron / SEM / TEM / Cryo-EM)">
                    <option value="Plate Reader / Spectrophotometer">
                    <option value="Flow Cytometer / FACS">
                    <option value="Sequencer (NGS / Illumina / Nanopore / PacBio)">
                    <option value="Mass Spectrometer (Proteomics / Metabolomics)">
                    <option value="Chromatography (HPLC / FPLC / GC)">
                    <option value="Wet Lab: PCR / qPCR / Thermal Cycler">
                    <option value="Wet Lab: Staining / Histology / Immunofluorescence">
                    <option value="Wet Lab: Sample Prep / Extraction / Purification">
                    <option value="Wet Lab: Gel Imaging / Western Blot">
                    <option value="Wet Lab: Cell Culture / Incubator / Bioreactor">
                    <option value="Wet Lab: General Bench Protocol">
                    <option value="Data Analysis / Bioimage Analysis">
                    <option value="Hardware / 3D Printing / Prototyping">
                </datalist>
            </div>

            <!-- Discipline / Domain -->
            <div class="form-group">
                <label for="communityDiscipline">Discipline / Domain:</label>
                <input type="text" id="communityDiscipline" list="communityDisciplineList" placeholder="e.g. Plant Biology / Botany">
                <datalist id="communityDisciplineList">
                    <option value="Plant Biology / Botany">
                    <option value="Cell Biology">
                    <option value="Neuroscience">
                    <option value="Developmental Biology">
                    <option value="Microbiology / Bacteriology">
                    <option value="Virology">
                    <option value="Immunology">
                    <option value="Molecular Biology & Genetics">
                    <option value="Biochemistry & Structural Biology">
                    <option value="Biophysics">
                    <option value="Pharmacology & Toxicology">
                    <option value="Ecology & Evolution">
                    <option value="Material Science & Physics">
                    <option value="Chemistry & Synthesis">
                    <option value="Computer Science & Data Engineering">
                </datalist>
            </div>

            <!-- Biological System / Model -->
            <div class="form-group">
                <label for="communityOrganism">Biological System / Specimen:</label>
                <input type="text" id="communityOrganism" list="communityOrganismList" placeholder="e.g. Arabidopsis thaliana">
                <datalist id="communityOrganismList">
                    <option value="Arabidopsis thaliana">
                    <option value="Danio rerio">
                    <option value="Mus musculus">
                    <option value="Rattus norvegicus">
                    <option value="Drosophila melanogaster">
                    <option value="Caenorhabditis elegans">
                    <option value="Homo sapiens / Human Cell Lines">
                    <option value="Saccharomyces cerevisiae / Yeast">
                    <option value="Escherichia coli / Bacteria">
                    <option value="Viruses / Phages">
                    <option value="Organoids / 3D Tissues">
                    <option value="Non-biological / In vitro / Synthetic">
                </datalist>
            </div>

            <!-- Tags -->
            <div class="form-group">
                <label for="communityTags">Tags (comma-separated):</label>
                <input type="text" id="communityTags" placeholder="e.g. Confocal, Live-cell, GFP, Time-Lapse">
            </div>

            <!-- Author & Institution Row -->
            <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                <div style="flex: 1;">
                    <label for="communityAuthor">Author:</label>
                    <input type="text" id="communityAuthor" placeholder="e.g. Dr. Thomas Zobel">
                </div>
                <div style="flex: 1;">
                    <label for="communityInstitution">Institution / Lab:</label>
                    <input type="text" id="communityInstitution" placeholder="e.g. University of Münster">
                </div>
            </div>

            <!-- ORCID, Version, License Row -->
            <div style="display: flex; gap: 15px;">
                <div style="flex: 1;">
                    <label for="communityOrcid">ORCID (optional):</label>
                    <input type="text" id="communityOrcid" placeholder="0000-0002-XXXX-XXXX">
                </div>
                <div style="flex: 0.8;">
                    <label for="communityVersion">Version:</label>
                    <input type="text" id="communityVersion" placeholder="1.0.0" value="1.0.0">
                </div>
                <div style="flex: 1.2;">
                    <label for="communityLicense">License:</label>
                    <input type="text" id="communityLicense" list="communityLicenseList" placeholder="CC-BY-4.0" value="CC-BY-4.0">
                    <datalist id="communityLicenseList">
                        <option value="CC0-1.0">
                        <option value="CC-BY-4.0">
                        <option value="CC-BY-SA-4.0">
                        <option value="MIT">
                        <option value="Apache-2.0">
                        <option value="Other">
                    </datalist>
                </div>
            </div>
        </div>
    </div>

    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
        <button class="btn btn-secondary" onclick="closeTemplateModal()">Cancel</button>
        <button class="btn" onclick="saveTemplate()">Save</button>
    </div>
</div>`;

const SPEC_UPLOAD_MODAL_HTML = `<div id="uploadTemplateModal" class="modal" style="display: none;">
    <div class="modal-content" style="max-width: 650px;">
        <span class="close" id="uploadCloseBtn">&times;</span>
        <h2 style="margin-top:0; color: #a855f7;">Upload Community Template</h2>
        <p style="color: #9ca3af; font-size: 0.9em; margin-bottom: 20px;">
            Publish a template to the MetaFold community repository on GitHub.
        </p>

        <!-- Step 1: Select Template -->
        <div class="form-group" style="margin-bottom: 20px;">
            <label for="uploadTemplateSelect" style="font-weight: 600; color: #e0e0e0;">
                1. Select Template to Publish:
            </label>
            <select id="uploadTemplateSelect" style="width: 100%; padding: 10px; background: #2d2d2d; color: #fff; border: 1px solid #404040; border-radius: 6px;">
                <option value="">-- Choose an installed template --</option>
            </select>
        </div>

        <!-- Step 2: Classification & Community Tags Review/Edit -->
        <div id="uploadStep2Section" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; font-size: 1.05em; color: #a855f7; margin-bottom: 12px;">
                2. Classification &amp; Community Tags (Review / Edit)
            </h3>

            <div class="form-group" style="margin-bottom: 12px;">
                <label for="uploadSystem">System / Device:</label>
                <input type="text" id="uploadSystem" list="uploadSystemList" placeholder="e.g. Microscopy (Confocal / 2-Photon)">
                <datalist id="uploadSystemList">
                    ${SYSTEM_OPTIONS.map(opt => `<option value="${opt}">`).join('\n')}
                </datalist>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
                <label for="uploadDiscipline">Discipline / Domain:</label>
                <input type="text" id="uploadDiscipline" list="uploadDisciplineList" placeholder="e.g. Plant Biology / Botany">
                <datalist id="uploadDisciplineList">
                    ${DISCIPLINE_OPTIONS.map(opt => `<option value="${opt}">`).join('\n')}
                </datalist>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
                <label for="uploadOrganism">Biological System / Model:</label>
                <input type="text" id="uploadOrganism" list="uploadOrganismList" placeholder="e.g. Arabidopsis thaliana">
                <datalist id="uploadOrganismList">
                    ${ORGANISM_OPTIONS.map(opt => `<option value="${opt}">`).join('\n')}
                </datalist>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
                <label for="uploadTags">Tags (comma-separated):</label>
                <input type="text" id="uploadTags" placeholder="e.g. Confocal, Live-cell, GFP, Time-Lapse">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                <div class="form-group">
                    <label for="uploadAuthor">Author:</label>
                    <input type="text" id="uploadAuthor" placeholder="Your Name">
                </div>
                <div class="form-group">
                    <label for="uploadLicense">License:</label>
                    <select id="uploadLicense">
                        ${LICENSE_OPTIONS.map(lic => `<option value="${lic}">${lic}</option>`).join('\n')}
                    </select>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; margin-top: 15px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);">
                <input type="checkbox" id="uploadSyncLocal" checked style="cursor: pointer;">
                <label for="uploadSyncLocal" style="cursor: pointer; font-size: 0.9em; color: #e0e0e0;">
                    Update local template with these tags
                </label>
            </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button id="uploadCancelBtn" class="btn btn-secondary" style="padding: 8px 16px;">Cancel</button>
            <button id="uploadConfirmBtn" class="btn" style="padding: 8px 16px; background: #7c3aed; color: #fff;">Continue to GitHub</button>
        </div>
    </div>
</div>`;

// Core Contract Functions

function sanitizeTemplateForExport(template) {
    if (!template || typeof template !== 'object') return {};
    const cloned = JSON.parse(JSON.stringify(template));
    for (const key of INTERNAL_RUNTIME_KEYS) {
        delete cloned[key];
    }
    return cloned;
}

function parseTagsString(rawTags) {
    if (!rawTags) return [];
    if (Array.isArray(rawTags)) {
        return rawTags.map(t => String(t).trim()).filter(Boolean);
    }
    return String(rawTags)
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
}

function collectCommunityData(fields) {
    const system = (fields.system || '').trim();
    const discipline = (fields.discipline || '').trim();
    const organism = (fields.organism || '').trim();
    const tags = parseTagsString(fields.tags);
    const author = (fields.author || '').trim();
    const institution = (fields.institution || '').trim();
    const orcid = (fields.orcid || '').trim();
    const version = (fields.version || '1.0.0').trim();
    const license = (fields.license || 'CC-BY-4.0').trim();

    const hasAnyContent = Boolean(
        system || discipline || organism || tags.length > 0 || author || institution || orcid
    );

    if (!hasAnyContent) {
        return null;
    }

    return {
        system,
        discipline,
        organism,
        tags,
        author,
        institution,
        orcid,
        version,
        license
    };
}

function formatGitHubIssuePayload(template, options = {}) {
    const exportTemplate = sanitizeTemplateForExport(template);
    if (options.communityOverrides) {
        exportTemplate.community = Object.assign({}, exportTemplate.community, options.communityOverrides);
    }
    const comm = exportTemplate.community || {};
    const issueTitle = `New Template: ${exportTemplate.name || 'Unnamed'}`;

    const tagsStr = Array.isArray(comm.tags)
        ? comm.tags.join(', ')
        : (comm.tags || 'None');

    const issueBody = [
        '### New Community Template Submission',
        '',
        `**Template Name:** ${exportTemplate.name || 'Unnamed'}`,
        `**Author:** ${comm.author || exportTemplate.createdBy || 'Unknown'}`,
        `**System / Device:** ${comm.system || 'Not specified'}`,
        `**Discipline:** ${comm.discipline || 'Not specified'}`,
        `**Biological System:** ${comm.organism || 'Not specified'}`,
        `**Tags:** ${tagsStr}`,
        `**License:** ${comm.license || 'CC-BY-4.0'}`,
        '',
        '**Description:**',
        exportTemplate.description || 'No description provided.',
        '',
        '#### Template JSON',
        'Please review the following template. Once approved, it will be added to the community repository.',
        '',
        '```json',
        JSON.stringify(exportTemplate, null, 2),
        '```'
    ].join('\n');

    const repoTarget = options.repoTarget || 'https://github.com/ThZobel/MetaFold-Templates/issues/new';
    const issueUrl = `${repoTarget}?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;

    return {
        title: issueTitle,
        body: issueBody,
        url: issueUrl,
        sanitizedTemplate: exportTemplate
    };
}

function unpackTemplateIndexItem(item) {
    if (!item || typeof item !== 'object') return {};
    const comm = item.community || {};
    const flatMeta = {};

    Object.keys(item).forEach(key => {
        if (key !== 'id' && key !== 'path' && key !== 'fields' && key !== 'community') {
            flatMeta[key] = item[key];
        }
    });

    // Unpack community fields if present
    const keysToUnpack = ['collection', 'system', 'discipline', 'organism', 'tags', 'author', 'version'];
    for (const key of keysToUnpack) {
        if (comm[key] !== undefined) {
            flatMeta[key] = comm[key];
        } else if (item[key] !== undefined) {
            flatMeta[key] = item[key];
        } else {
            flatMeta[key] = key === 'tags' ? [] : '';
        }
    }

    return {
        _type: 'template_hub',
        id: item.id,
        name: item.name || 'Unnamed Template',
        path: item.path,
        flatMeta,
        rawFields: item.fields || []
    };
}

function getCategoryForKey(key, isTemplateHub = true) {
    if (isTemplateHub) {
        const communityKeys = ['collection', 'system', 'discipline', 'organism', 'tags', 'author', 'version'];
        if (communityKeys.includes(key)) {
            return '🌐 Community Taxonomy';
        }
    }
    if (key.startsWith('OME.')) return '🔬 OME Metadata';
    if (key.startsWith('File.')) return '📁 File Info';
    if (key.startsWith('integrations.')) return '🔗 Integrations';
    return '📋 Metadata Fields';
}

function filterReadmeMetadata(metadataObj) {
    if (!metadataObj || typeof metadataObj !== 'object') return {};
    const clean = {};
    for (const [key, val] of Object.entries(metadataObj)) {
        if (key === 'community' || key.startsWith('_')) {
            continue;
        }
        clean[key] = val;
    }
    return clean;
}

module.exports = {
    SYSTEM_OPTIONS,
    DISCIPLINE_OPTIONS,
    ORGANISM_OPTIONS,
    LICENSE_OPTIONS,
    ALL_AVAILABLE_KEYS,
    VISIBLE_COLUMNS,
    INTERNAL_RUNTIME_KEYS,
    SPEC_TEMPLATE_MODAL_HTML,
    SPEC_UPLOAD_MODAL_HTML,
    sanitizeTemplateForExport,
    parseTagsString,
    collectCommunityData,
    formatGitHubIssuePayload,
    unpackTemplateIndexItem,
    getCategoryForKey,
    filterReadmeMetadata
};
