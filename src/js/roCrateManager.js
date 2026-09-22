/**
 * RO-Crate Manager Module
 * Transforms MetaFold projects/lineage into FAIR RO-Crate JSON-LD.
 * Provides the Guided Pre-Flight Wizard UI for zero-mental-load exporting.
 */

window.roCrateManager = {
    currentExportData: null,

    /**
     * Converts MetaFold flat metadata to RO-Crate properties
     */
    mapMetadataToProperties(metadata, mappingsContext) {
        const properties = [];
        if (!metadata) return properties;

        Object.entries(metadata).forEach(([key, value]) => {
            // Skip internal keys
            if (key.startsWith('_') || key === 'provenance' || key === 'projectName' || key === 'derived_from') return;
            if (key.startsWith('System.')) return;

            const valStr = (Array.isArray(value)) ? value.join(', ') : String(value);

            properties.push({
                '@type': 'PropertyValue',
                'name': key,
                'value': valStr
            });
        });
        return properties;
    },

    /**
     * Calculates the correct relative path for a project inside the RO-Crate,
     * taking into account if it's nested inside another exported project.
     */
    getCrateRelativePath(projPath, allProjects) {
        const ancestors = allProjects.filter(p => p.path !== projPath && projPath.toLowerCase().startsWith(p.path.toLowerCase() + '\\'));
        if (ancestors.length === 0) {
            const proj = allProjects.find(p => p.path === projPath);
            return (proj.name || proj.displayName) + '/'; // Top-level project
        }
        
        ancestors.sort((a, b) => a.path.length - b.path.length);
        const rootAncestor = ancestors[0];
        
        const rootAncestorName = rootAncestor.name || rootAncestor.displayName;
        const relativePath = projPath.substring(rootAncestor.path.length + 1).replace(/\\/g, '/');
        return `${rootAncestorName}/${relativePath}/`;
    },

    /**
     * Builds the RO-Crate @graph array from an array of MetaFold projects.
     * @param {Array} projects - Array of project objects
     * @param {Object} rootInfo - Info for the root dataset { name, description, license, author }
     */
    buildGraph(projects, rootInfo) {
        const graph = [];

        // 1. Descriptor
        graph.push({
            "@id": "ro-crate-metadata.json",
            "@type": "CreativeWork",
            "conformsTo": { "@id": "https://w3id.org/ro/crate/1.1" },
            "about": { "@id": "./" }
        });

        // Add author entity to graph
        let authorId = rootInfo.author.orcid ? `https://orcid.org/${rootInfo.author.orcid}` : `#author-${rootInfo.author.username}`;
        graph.push({
            "@id": authorId,
            "@type": "Person",
            "name": `${rootInfo.author.firstName} ${rootInfo.author.lastName}`.trim() || rootInfo.author.username,
            "affiliation": rootInfo.author.institution ? { "@id": "#institution" } : undefined
        });

        if (rootInfo.author.institution) {
            graph.push({
                "@id": "#institution",
                "@type": "Organization",
                "name": rootInfo.author.institution
            });
        }

        // MetaFold Software Entity
        graph.push({
            "@id": "#software-metafold",
            "@type": "SoftwareApplication",
            "name": "MetaFold",
            "version": "1.0.0"
        });

        // 2. Root Dataset
        const rootDataset = {
            "@id": "./",
            "@type": "Dataset",
            "name": rootInfo.name,
            "description": rootInfo.description || "",
            "datePublished": new Date().toISOString(),
            "license": { "@id": rootInfo.license },
            "author": { "@id": authorId },
            "hasPart": []
        };
        graph.push(rootDataset);

        // 3. Projects and Lineage
        projects.forEach(proj => {
            const projId = this.getCrateRelativePath(proj.path, projects);
            rootDataset.hasPart.push({ "@id": projId });

            const datasetEntity = {
                "@id": projId,
                "@type": "Dataset",
                "name": proj.name || proj.displayName,
                "dateCreated": proj.created || new Date().toISOString()
            };

            const extraProps = this.mapMetadataToProperties(proj.metadata || proj.flatMeta);
            if (extraProps.length > 0) {
                datasetEntity.additionalProperty = extraProps;
            }

            graph.push(datasetEntity);

            // Add CreateAction for lineage links where this project is the RESULT
            if (proj.lineage && proj.lineage.lineage_links) {
                proj.lineage.lineage_links.forEach((link, idx) => {
                    const sourceProj = projects.find(p => p.path === link.source_path);
                    if (sourceProj) {
                        const sourceId = this.getCrateRelativePath(sourceProj.path, projects);
                        graph.push({
                            "@id": `#action-${projId.replace(/[/\\]/g, '_')}-${idx}`,
                            "@type": "CreateAction",
                            "name": `Derivation of ${proj.name} from ${sourceProj.name}`,
                            "object": [{ "@id": sourceId }],
                            "result": [{ "@id": projId }],
                            "agent": { "@id": authorId },
                            "instrument": { "@id": "#software-metafold" },
                            "actionStatus": "http://schema.org/CompletedActionStatus"
                        });
                    }
                });
            }
        });

        return {
            "@context": "https://w3id.org/ro/crate/1.1/context",
            "@graph": graph
        };
    },

    /**
     * Generates a human-readable ro-crate-preview.html string
     */
    generateHtmlPreview(crateData) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RO-Crate Preview: ${crateData['@graph'].find(e => e['@id'] === './')?.name || 'Dataset'}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8f9fa; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #1e3a8a; }
        .badge { display: inline-block; padding: 4px 8px; background: #dbeafe; color: #1e40af; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .section { margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
        th { background: #f3f4f6; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📦 RO-Crate Preview</h1>
        <div id="metadata-summary">
            <p><strong>Dataset:</strong> ${crateData['@graph'].find(e => e['@id'] === './')?.name}</p>
            <p><strong>Description:</strong> ${crateData['@graph'].find(e => e['@id'] === './')?.description || 'N/A'}</p>
            <p><span class="badge">FAIR Research Object Crate 1.1</span></p>
        </div>
        
        <div class="section">
            <h2>Contents</h2>
            <table>
                <tr><th>ID</th><th>Type</th><th>Name</th></tr>
                ${crateData['@graph'].map(e => `<tr><td><code>${e['@id']}</code></td><td>${Array.isArray(e['@type']) ? e['@type'].join(', ') : e['@type']}</td><td>${e.name || ''}</td></tr>`).join('')}
            </table>
        </div>
    </div>
</body>
</html>`;
    },

    /**
     * Entry point for Lineage Export (Action Bar)
     */
    async exportLineageRoCrate(projectPath) {
        if (!window.projectScanner || !window.projectScanner.projects) {
            console.error("Scanner projects not available.");
            return;
        }
        
        const allProjects = window.projectScanner.projects;
        const rootProject = allProjects.find(p => p.path.replace(/\\/g, '\\\\') === projectPath.replace(/\\/g, '\\\\') || p.path === projectPath);
        
        if (!rootProject) {
            console.error("Project not found: " + projectPath);
            return;
        }

        // Calculate scope arrays
        const ancestorsSet = new Set();
        const descendantsSet = new Set();
        
        const collectAncestors = (proj) => {
            if (ancestorsSet.has(proj.path)) return;
            ancestorsSet.add(proj.path);
            const parentPaths = proj.lineage?.lineage_links?.map(l => l.source_path) || [];
            parentPaths.forEach(path => {
                const parent = allProjects.find(p => p.path === path);
                if (parent) collectAncestors(parent);
            });
        };
        const collectDescendants = (proj) => {
            if (descendantsSet.has(proj.path)) return;
            descendantsSet.add(proj.path);
            allProjects.forEach(child => {
                if (child.lineage?.lineage_links?.some(l => l.source_path === proj.path)) {
                    collectDescendants(child);
                }
            });
        };
        collectAncestors(rootProject);
        collectDescendants(rootProject);
        
        const fullSet = new Set();
        const collectDependencies = (proj) => {
            if (fullSet.has(proj.path)) return;
            fullSet.add(proj.path);
            const parentPaths = proj.lineage?.lineage_links?.map(l => l.source_path) || [];
            parentPaths.forEach(path => {
                const parent = allProjects.find(p => p.path === path);
                if (parent) collectDependencies(parent);
            });
            allProjects.forEach(child => {
                if (child.lineage?.lineage_links?.some(l => l.source_path === proj.path)) {
                    collectDependencies(child);
                }
            });
        };
        collectDependencies(rootProject);

        const directLineageProjects = Array.from(new Set([...ancestorsSet, ...descendantsSet])).map(path => allProjects.find(p => p.path === path));
        const fullGraphProjects = Array.from(fullSet).map(path => allProjects.find(p => p.path === path));

        this.currentExportData = {
            type: 'lineage',
            rootProject: rootProject,
            directProjects: directLineageProjects,
            fullProjects: fullGraphProjects
        };

        this.showWizardModal();
    },

    /**
     * Entry point for Scan Export (Discovery Tab)
     */
    async openScanExportWizard(selectedProjectPath = null) {
        if (!window.projectScanner || !window.projectScanner.projects || window.projectScanner.projects.length === 0) {
            alert("No projects scanned to export.");
            return;
        }

        let projectsToExport = window.projectScanner.projects;
        let rootName = 'Scanned Project Collection';
        let rootDesc = `Export of ${projectsToExport.length} projects.`;

        if (selectedProjectPath) {
            const selected = projectsToExport.find(p => p.path === selectedProjectPath);
            if (selected) {
                projectsToExport = [selected];
                // Also pull all children of this project
                const children = window.projectScanner.projects.filter(p => p.path !== selected.path && p.path.startsWith(selected.path));
                projectsToExport = [...projectsToExport, ...children];
                
                rootName = selected.name;
                rootDesc = `Export of project ${selected.name} and its ${children.length} sub-components.`;
            }
        }

        this.currentExportData = {
            type: 'scan',
            rootProject: { name: rootName, description: rootDesc },
            fullProjects: projectsToExport
        };

        this.showWizardModal();
    },

    /**
     * Renders the Pre-Flight Export Wizard Modal
     */
    async showWizardModal() {
        const overlay = document.createElement('div');
        overlay.id = 'ro-crate-wizard-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0'; overlay.style.left = '0';
        overlay.style.width = '100vw'; overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
        overlay.style.zIndex = '10000';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';

        // Fetch Author Details from Profile
        let authorInfo = { username: 'Unknown', firstName: '', lastName: '', orcid: '', institution: '' };
        if (window.userManager && window.profileManager) {
            const currentUser = window.userManager.getCurrentUser();
            if (currentUser !== 'Admin') {
                const user = window.profileManager.getUserByUsername(currentUser);
                if (user) {
                    authorInfo = { 
                        username: user.username,
                        firstName: user.firstName, 
                        lastName: user.lastName, 
                        orcid: user.orcid,
                        institution: user.primaryGroupId ? window.profileManager.getGroupById(user.primaryGroupId)?.institution : ''
                    };
                }
            }
        }

        // Fetch Default License
        let defaultLicense = 'https://creativecommons.org/licenses/by/4.0/';
        if (window.settingsManager) {
            const savedLicense = await window.settingsManager.get('rocrate.default_license');
            if (savedLicense) defaultLicense = savedLicense;
        }

        const isLineage = this.currentExportData.type === 'lineage';
        
        const modal = document.createElement('div');
        modal.className = 'ro-crate-modal';
        modal.innerHTML = `
            <div class="ro-crate-modal-header">
                <h2>📦 Export FAIR RO-Crate</h2>
                <button class="btn btn-secondary" onclick="document.getElementById('ro-crate-wizard-overlay').remove()">✕</button>
            </div>
            
            <div class="ro-crate-modal-body">
                <div class="ro-crate-step">
                    <h3>1. Dataset Information</h3>
                    <div class="ro-crate-form-group">
                        <label>Dataset Title</label>
                        <input type="text" id="rocrate-title" value="${this.currentExportData.rootProject.name} Lineage Export">
                    </div>
                    <div class="ro-crate-form-group">
                        <label>Description (Optional)</label>
                        <input type="text" id="rocrate-desc" value="${this.currentExportData.rootProject.description || ''}">
                    </div>
                    <div class="ro-crate-form-group">
                        <label>License</label>
                        <select id="rocrate-license">
                            <option value="https://creativecommons.org/licenses/by/4.0/" ${defaultLicense.includes('by/4.0') ? 'selected' : ''}>CC-BY 4.0 (Recommended)</option>
                            <option value="https://creativecommons.org/publicdomain/zero/1.0/" ${defaultLicense.includes('zero') ? 'selected' : ''}>CC0 1.0 (Public Domain)</option>
                            <option value="https://opensource.org/licenses/MIT" ${defaultLicense.includes('MIT') ? 'selected' : ''}>MIT License</option>
                            <option value="Proprietary" ${defaultLicense === 'Proprietary' ? 'selected' : ''}>Proprietary / All Rights Reserved</option>
                        </select>
                    </div>
                    <div style="font-size: 12px; color: #9ca3af; margin-top: 10px;">
                        <strong>Author:</strong> ${authorInfo.firstName} ${authorInfo.lastName} ${authorInfo.orcid ? `(ORCID: ${authorInfo.orcid})` : '(No ORCID)'}
                    </div>
                </div>

                <div class="ro-crate-step">
                    <h3>2. Scope & Packaging</h3>
                    ${isLineage ? `
                    <div class="ro-crate-form-group">
                        <label>Lineage Scope</label>
                        <select id="rocrate-scope">
                            <option value="direct">Direct Lineage Only (Ancestors & Descendants)</option>
                            <option value="full">Entire Connected Graph</option>
                        </select>
                    </div>` : ''}
                    <div class="ro-crate-form-group">
                        <label>Packaging Mode</label>
                        <select id="rocrate-mode">
                            <option value="metadata">Metadata Only (Lightweight Crate)</option>
                            <option value="harvest">Full Data Harvest (Copy all files)</option>
                        </select>
                    </div>
                </div>

                <div class="ro-crate-step">
                    <h3>3. Pre-Flight Check</h3>
                    <div id="rocrate-validation-status" class="validation-box">
                        Checking...
                    </div>
                </div>
            </div>

            <div class="ro-crate-modal-footer">
                <button class="btn btn-primary" onclick="window.roCrateManager.updateValidation()">🔄 Run Check</button>
                <button class="btn btn-success" id="rocrate-export-btn" onclick="window.roCrateManager.executeExport()">🚀 Export RO-Crate</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Bind author info so we can access it during validation/export
        this.currentExportData.authorInfo = authorInfo;

        // Auto-run validation
        this.updateValidation();

        // Listen for changes to re-validate
        document.getElementById('rocrate-title').addEventListener('input', () => this.updateValidation());
        document.getElementById('rocrate-desc').addEventListener('input', () => this.updateValidation());
        document.getElementById('rocrate-license').addEventListener('change', () => this.updateValidation());
        if(isLineage) document.getElementById('rocrate-scope').addEventListener('change', () => this.updateValidation());
    },

    updateValidation() {
        const title = document.getElementById('rocrate-title').value;
        const desc = document.getElementById('rocrate-desc').value;
        const license = document.getElementById('rocrate-license').value;
        const isLineage = this.currentExportData.type === 'lineage';
        
        let projectsToExport = this.currentExportData.fullProjects;
        if (isLineage) {
            const scope = document.getElementById('rocrate-scope').value;
            projectsToExport = scope === 'direct' ? this.currentExportData.directProjects : this.currentExportData.fullProjects;
        }

        // Build temporary graph for validation
        const rootInfo = { name: title, description: desc, license: license, author: this.currentExportData.authorInfo };
        const crateData = this.buildGraph(projectsToExport, rootInfo);

        // Run Validator
        let validationResult = { isValid: true, errors: [], warnings: [], stats: { entities: 0, actions: 0 } };
        if (window.roCrateValidator) {
            validationResult = window.roCrateValidator.validateCrate(crateData);
        }

        const statusBox = document.getElementById('rocrate-validation-status');
        const exportBtn = document.getElementById('rocrate-export-btn');

        let html = '';
        if (validationResult.isValid) {
            html += `<div class="badge-success">✅ Valid RO-Crate Payload</div>`;
            exportBtn.disabled = false;
            exportBtn.style.opacity = '1';
        } else {
            html += `<div class="badge-error">❌ Invalid Payload (Fix required)</div>`;
            exportBtn.disabled = true;
            exportBtn.style.opacity = '0.5';
        }

        html += `<div style="font-size: 12px; margin-top: 10px; color: #cdd6f4;">
            <strong>Entities:</strong> ${validationResult.stats.entities} | <strong>Lineage Actions:</strong> ${validationResult.stats.actions}
        </div>`;

        if (validationResult.errors.length > 0) {
            html += `<ul style="color: #f87171; font-size: 12px; margin-top: 10px; padding-left: 20px;">`;
            validationResult.errors.forEach(e => html += `<li>${e.message}</li>`);
            html += `</ul>`;
        }

        if (validationResult.warnings.length > 0) {
            html += `<ul style="color: #facc15; font-size: 12px; margin-top: 10px; padding-left: 20px;">`;
            validationResult.warnings.forEach(w => html += `<li>⚠️ ${w.message}</li>`);
            html += `</ul>`;
        }

        statusBox.innerHTML = html;
        this.currentExportData.validatedCrateData = crateData;
    },

    async executeExport() {
        if (!this.currentExportData.validatedCrateData) return;
        
        const mode = document.getElementById('rocrate-mode').value;
        const isHarvestMode = mode === 'harvest';
        
        let projectsToExport = this.currentExportData.fullProjects;
        if (this.currentExportData.type === 'lineage') {
            const scope = document.getElementById('rocrate-scope').value;
            projectsToExport = scope === 'direct' ? this.currentExportData.directProjects : this.currentExportData.fullProjects;
        }

        const safeName = document.getElementById('rocrate-title').value.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        document.getElementById('ro-crate-wizard-overlay').remove();

        const savePath = await window.electronAPI.showSaveDialog({
            title: isHarvestMode ? 'Select Harvest Destination for RO-Crate' : 'Export RO-Crate JSON-LD',
            defaultPath: `RO-Crate-${safeName}`,
            filters: [
                { name: isHarvestMode ? 'Export Folder Name' : 'Export Base Name', extensions: ['json', '*'] }
            ]
        });

        if (!savePath) {
            console.log('RO-Crate Export cancelled by user');
            return;
        }

        let basePath = savePath;
        if (basePath.toLowerCase().endsWith('.json')) basePath = basePath.substring(0, basePath.length - 5);

        let jsonPath = basePath + '/ro-crate-metadata.json';
        let htmlPath = basePath + '/ro-crate-preview.html';
        const escapedBasePath = basePath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        if (isHarvestMode) {
            const dirName = basePath.substring(Math.max(basePath.lastIndexOf('\\'), basePath.lastIndexOf('/')) + 1);
            
            // Only explicitly harvest top-level projects; nested sub-projects will be copied naturally 
            // as part of their parent's folders. This prevents duplicating nested lineage projects at the root.
            const topLevelProjects = projectsToExport.filter(proj => {
                const ancestors = projectsToExport.filter(p => p !== proj && proj.path.toLowerCase().startsWith(p.path.toLowerCase() + '\\'));
                return ancestors.length === 0;
            });
            
            const harvestData = [];
            
            for (const p of topLevelProjects) {
                const subfoldersResult = await window.electronAPI.getSubfolders([p.path]);
                const folders = (subfoldersResult.success && subfoldersResult.subfolders[p.path]) ? subfoldersResult.subfolders[p.path] : [];
                harvestData.push({
                    name: p.name || p.displayName,
                    path: p.path,
                    selectedFolders: folders
                });
            }
            
            if (window.projectScanner && window.projectScanner.showSuccess) {
                window.projectScanner.showSuccess("Copying data into Crate... This may take a while.");
            }
            
            const harvestResult = await window.electronAPI.harvestProjects(basePath, harvestData);
            if (!harvestResult.success) {
                if (window.projectScanner && window.projectScanner.showError) window.projectScanner.showError("Failed to copy data: " + harvestResult.message);
                return;
            }
        }
        const jsonContent = JSON.stringify(this.currentExportData.validatedCrateData, null, 2);
        
        let htmlContent = '';
        let generatePreview = true;
        if (window.settingsManager) {
            generatePreview = (await window.settingsManager.get('rocrate.generate_preview')) !== false;
        }
        if (generatePreview) {
            htmlContent = this.generateHtmlPreview(this.currentExportData.validatedCrateData);
        }
        
        const jsonResult = await window.electronAPI.writeFile(jsonPath, jsonContent);
        if (generatePreview) {
            await window.electronAPI.writeFile(htmlPath, htmlContent);
        }

        // --- EXPORT TRADITIONAL METAFOLD DASHBOARD AS WELL ---
        if (typeof window.generateLineageHtml === 'function') {
            const legacyData = {
                exportType: this.currentExportData.type === 'lineage' ? 'Lineage' : 'Scan',
                isHarvest: isHarvestMode,
                rootProject: this.currentExportData.rootProject.name,
                rootProjectPath: this.currentExportData.rootProject.path || '',
                directLineagePaths: this.currentExportData.directProjects ? this.currentExportData.directProjects.map(p => p.path) : [],
                timestamp: new Date().toISOString(),
                projects: projectsToExport
            };
            
            const legacyJsonPath = basePath + '/metafold-lineage-data.json';
            const legacyHtmlPath = basePath + '/metafold-dashboard.html';
            
            const legacyHtml = window.generateLineageHtml(legacyData);
            await window.electronAPI.writeFile(legacyJsonPath, JSON.stringify(legacyData, null, 2));
            await window.electronAPI.writeFile(legacyHtmlPath, legacyHtml);
        }

        if (jsonResult.success && window.projectScanner && window.projectScanner.showSuccess) {
            window.projectScanner.showSuccess(`✅ RO-Crate exported successfully! <br><br> <button class="btn btn-secondary btn-sm" onclick="window.electronAPI.openFolder('${escapedBasePath}')">📂 Open Folder</button>`);
        } else if (!jsonResult.success && window.projectScanner && window.projectScanner.showError) {
            window.projectScanner.showError("Failed to write RO-Crate: " + jsonResult.message);
        }
    }
};
