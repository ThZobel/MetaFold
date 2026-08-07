// Lineage Tree using D3.js (Collapsible Tidy-Tree)
class MetaFoldLineageTree {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    render(data) {
        if (!this.container) return;
        this.container.innerHTML = '';

        const projects = data.projects || [];
        if (projects.length === 0) {
            this.container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9ca3af;">No project data available for the lineage tree.</div>';
            return;
        }

        // Build hierarchical tree from DAG
        // Root -> projects without derived_from_ids -> their children
        
        // 1. Build a map of projects
        const projectMap = {};
        projects.forEach(p => {
            projectMap[p.path] = p;
        });

        // 2. Find children for each project
        const childrenMap = {}; // parentPath -> [ { project, linkId } ]
        projects.forEach(p => {
            childrenMap[p.path] = [];
        });

        const showFolderLinks = document.getElementById('showFolderLinksToggle')?.checked;

        projects.forEach(p => {
            // Process explicit derived_from lineages
            if (p.lineage && p.lineage.lineage_links) {
                p.lineage.lineage_links.forEach(link => {
                    const parentPath = link.source_path;
                    if (childrenMap[parentPath]) {
                        childrenMap[parentPath].push({ project: p, linkId: link.id });
                    } else {
                        childrenMap[parentPath] = [{ project: p, linkId: link.id }];
                    }
                });
            }

            // Process virtual folder hierarchies if toggled on
            if (showFolderLinks) {
                // Find the closest parent project (longest path that is a prefix)
                let closestParent = null;
                projects.forEach(potentialParent => {
                    if (p.path !== potentialParent.path && p.path.startsWith(potentialParent.path)) {
                        if (!closestParent || potentialParent.path.length > closestParent.path.length) {
                            closestParent = potentialParent;
                        }
                    }
                });
                
                if (closestParent) {
                    const linkId = 'Folder';
                    if (childrenMap[closestParent.path]) {
                        // avoid duplicate link if already connected explicitly
                        if (!childrenMap[closestParent.path].some(c => c.project.path === p.path)) {
                            childrenMap[closestParent.path].push({ project: p, linkId: linkId });
                        }
                    } else {
                        childrenMap[closestParent.path] = [{ project: p, linkId: linkId }];
                    }
                }
            }
        });

        // 3. Find root projects (projects that are not a child of any existing project)
        const allChildrenPaths = new Set();
        projects.forEach(p => {
            if (p.lineage && p.lineage.lineage_links) {
                p.lineage.lineage_links.forEach(link => {
                    if (projectMap[link.source_path]) {
                        allChildrenPaths.add(p.path);
                    }
                });
            }
        });

        const rootProjects = projects.filter(p => !allChildrenPaths.has(p.path));

        // 4. Recursive function to build tree data
        function buildTree(project, linkId = null, visited = new Set()) {
            if (visited.has(project.path)) {
                // Prevent infinite loops from cyclic dependencies
                return { 
                    name: (project.displayName || project.name) + " (Cycle)", 
                    _type: 'cycle', 
                    _project: project,
                    _linkId: linkId
                };
            }
            const newVisited = new Set(visited);
            newVisited.add(project.path);

            const children = (childrenMap[project.path] || []).map(child => buildTree(child.project, child.linkId, newVisited));
            
            return {
                name: project.displayName || project.name,
                _type: 'project',
                _project: project,
                _linkId: linkId,
                children: children.length > 0 ? children : undefined
            };
        }

        const treeData = {
            name: `All Lineages (${projects.length} Projects)`,
            _type: 'root',
            children: rootProjects.map(rp => buildTree(rp))
        };

        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;

        const root = d3.hierarchy(treeData);

        // Initially collapse deep nodes
        root.descendants().forEach(d => {
            if (d.depth >= 2 && d.children) {
                d._children = d.children;
                d.children = null;
            }
        });

        const svg = d3.select(this.container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .style('background', '#111827')
            .style('cursor', 'grab')
            .style('border-radius', '8px');

        const g = svg.append('g').attr('transform', `translate(100, 40)`);

        // Zoom + Pan
        const zoom = d3.zoom().scaleExtent([0.15, 5]).on('zoom', (event) => g.attr('transform', event.transform));
        svg.call(zoom);

        const treeLayout = d3.tree().size([width - 100, height - 200]);
        let i = 0;
        const duration = 500;

        const update = (source) => {
            let nodeCount = 0;
            root.eachBefore(d => { nodeCount++; }); // count only visible
            const dynamicWidth = Math.max(width - 100, nodeCount * 120);
            treeLayout.size([dynamicWidth, height - 200]);

            const treeData = treeLayout(root);
            const nodes = treeData.descendants();
            const links = treeData.links();

            // Normalize for fixed-depth (give more vertical space for link labels)
            nodes.forEach(d => d.y = d.depth * 180);

            // -- Nodes --
            const nodeSel = g.selectAll('g.node')
                .data(nodes, d => d.id || (d.id = ++i));

            const nodeEnter = nodeSel.enter().append('g')
                .attr('class', 'node')
                .attr('transform', d => `translate(${source.x0 || root.x},${source.y0 || root.y})`)
                .style('cursor', 'pointer')
                .on('click', (e, d) => {
                    // Node Highlighting
                    d3.selectAll('g.node circle').style('stroke', null).style('stroke-width', null);
                    d3.select(e.currentTarget).select('circle').style('stroke', '#eab308').style('stroke-width', '4px');

                    if (d.data._project) {
                        if(typeof window.showProjectMetadataInSidebar === 'function') window.showProjectMetadataInSidebar(d.data._project.path);
                        // Handle Connect Mode logic if active
                        if (window.isConnectingLineage && window.connectSourceNode) {
                            if (window.connectSourceNode.path === d.data._project.path) {
                                alert("Source and Target cannot be the same.");
                                window.endConnectMode();
                                return;
                            }
                            window.executeConnection(d.data._project, d.data.name);
                            return; // Stop further click handling
                        }

                        // Update Action Bar if it's a project node
                        const actionBar = document.getElementById('lineage-action-bar');
                        if (actionBar) {
                            const escapedPath = d.data._project.path.replace(/\\/g, '\\\\').replace(/"/g, '&quot;');
                            const escapedTitle = (d.data.name || '').replace(/'/g, "\\'");
                            
                            let connectHtml = '';
                            if (window.isConnectingLineage) {
                                if (window.connectSourceNode && window.connectSourceNode.path === d.data._project.path) {
                                    connectHtml = `
                                    <div id="connect-mode-container" style="display: flex; flex-direction: column; align-items: flex-start; margin-left: 10px;">
                                        <button class="btn btn-sm btn-info" onclick="window.endConnectMode()" style="padding: 4px 8px; font-size: 12px; background: #0ea5e9; border: none; display: flex; align-items: center; gap: 5px;">
                                            Connecting... Cancel <span style="font-size: 14px; font-weight: bold;">✕</span>
                                        </button>
                                        <span style="color: #9ca3af; font-size: 11px; margin-top: 4px;">Source: <strong>${window.connectSourceNode.title}</strong> ➜ Click Target (Result)</span>
                                    </div>`;
                                } else {
                                    connectHtml = `
                                    <div id="connect-mode-container" style="display: flex; flex-direction: column; align-items: flex-start; margin-left: 10px;">
                                        <button class="btn btn-sm btn-secondary" onclick="window.endConnectMode()" style="padding: 4px 8px; font-size: 12px; opacity: 0.5; border: none; display: flex; align-items: center; gap: 5px;">
                                            Cancel Connect <span style="font-size: 14px; font-weight: bold;">✕</span>
                                        </button>
                                    </div>`;
                                }
                            } else {
                                connectHtml = `<button id="btn-connect-project" class="btn btn-sm btn-info" onclick="window.startConnectMode('${escapedPath}', '${escapedTitle}')" style="padding: 4px 8px; font-size: 12px; margin-left: 10px; background: #0ea5e9; border: none;">Connect with other project</button>`;
                            }

                            actionBar.innerHTML = `
                                <span style="color: #9ca3af; font-size: 13px; align-self: center;">Selected: <strong>${d.data.name}</strong></span>
                                <button class="btn btn-sm btn-secondary" onclick="window.projectScanner.showProjectDetailsModal(window.projectScanner.projects.find(p => p.path === '${escapedPath}'))" style="padding: 4px 8px; font-size: 12px;">View Details</button>
                                <button class="btn btn-sm btn-secondary" onclick="window.electronAPI.openFolder('${escapedPath}')" style="padding: 4px 8px; font-size: 12px;">Open Folder</button>
                                <button class="btn btn-sm btn-primary" onclick="window.exportLineage('${escapedPath}')" style="padding: 4px 8px; font-size: 12px;">Export Lineage</button>
                                ${connectHtml}
                            `;
                            
                            if (!window.isConnectingLineage) {
                                window.originalConnectButtonHtml = connectHtml;
                            }
                        }
                    }

                    if (d.children || d._children) {
                        if (d.children) {
                            d._children = d.children;
                            d.children = null;
                        } else {
                            d.children = d._children;
                            d._children = null;
                        }
                        update(d);
                    }
                })
                .on('dblclick', (e, d) => {
                    if (d.data._project && window.projectScanner) {
                        const proj = window.projectScanner.projects.find(p => p.path === d.data._project.path);
                        if (proj) window.projectScanner.showProjectDetailsModal(proj);
                    }
                });

            // Add circles
            nodeEnter.append('circle')
                .attr('r', 1e-6)
                .attr('fill', d => d.data._type === 'root' ? '#f59e0b' : d._children ? '#8b5cf6' : '#10b981')
                .style('stroke', d => (d.children || d._children) ? '#f3f4f6' : 'none')
                .style('stroke-width', '2px');

            // Add project name labels
            nodeEnter.append('text')
                .attr('dy', d => (d.children || d._children) ? '-1.5em' : '2.0em')
                .attr('x', 0)
                .attr('text-anchor', 'middle')
                .text(d => d.data.name)
                .style('fill', '#e5e7eb')
                .style('font-size', d => d.data._type === 'root' ? '16px' : '14px')
                .style('font-weight', d => d.data._type === 'root' ? '600' : 'normal')
                .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)')
                .style('pointer-events', 'none');

            // We place this above the link
            nodeEnter.append('text')
                .attr('class', 'link-label')
                .attr('dy', '-1.5em')
                .attr('x', -10)
                .attr('text-anchor', 'end')
                .text(d => d.data._linkId ? `🔗 ${d.data._linkId}` : '')
                .style('fill', '#60a5fa') // light blue to highlight the relationship
                .style('font-size', '11px')
                .style('font-style', 'italic')
                .style('opacity', 0)
                .style('pointer-events', 'none');

            // Add badge for children count
            nodeEnter.append('text')
                .attr('class', 'kg-badge')
                .attr('dy', '2.8em')
                .attr('x', 0)
                .attr('text-anchor', 'middle')
                .text(d => d._children ? `+${d._children.length} derived` : '')
                .style('fill', '#9ca3af')
                .style('font-size', '10px');

            // -- Links --
            const linkSel = g.selectAll('path.link')
                .data(links, d => d.target.id);

            const linkEnter = linkSel.enter().insert('path', 'g')
                .attr('class', 'link')
                .style('fill', 'none')
                .style('stroke', 'rgba(107,114,128,0.5)')
                .style('stroke-width', '2px')
                .attr('d', d => {
                    const o = {x: source.x0 || root.x, y: source.y0 || root.y};
                    return d3.linkVertical().x(d => d.x).y(d => d.y)({source: o, target: o});
                });

            const linkUpdate = linkEnter.merge(linkSel);
            linkUpdate.transition().duration(duration)
                .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y));

            linkSel.exit().transition().duration(duration)
                .attr('d', d => {
                    const o = {x: source.x, y: source.y};
                    return d3.linkVertical().x(d => d.x).y(d => d.y)({source: o, target: o});
                })
                .remove();

            // Node updates
            const nodeUpdate = nodeEnter.merge(nodeSel);
            nodeUpdate.transition().duration(duration)
                .attr('transform', d => `translate(${d.x},${d.y})`);
                
            nodeUpdate.select('circle').transition().duration(duration)
                .attr('r', d => d.depth === 0 ? 10 : d.data._type === 'cycle' ? 6 : 8)
                .attr('fill', d => d.data._type === 'root' ? '#f59e0b' : d._children ? '#8b5cf6' : '#10b981');
                
            nodeUpdate.select('.kg-badge')
                .text(d => d._children ? `+${d._children.length} derived` : '');
                
            nodeUpdate.select('.link-label').transition().duration(duration)
                .style('opacity', 1);

            const nodeExit = nodeSel.exit().transition().duration(duration)
                .attr('transform', `translate(${source.x},${source.y})`).remove();
            nodeExit.select('circle').attr('r', 0);
            nodeExit.select('.link-label').style('opacity', 0);

            nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
        };

        root.x0 = width / 2;
        root.y0 = 0;
        update(root);

        // Center tree
        const allNodes = root.descendants();
        if (allNodes.length > 0) {
            const xExtent = d3.extent(allNodes, d => d.x);
            const yExtent = d3.extent(allNodes, d => d.y);
            const treeW = (xExtent[1] - xExtent[0]) + 150;
            const treeH = (yExtent[1] - yExtent[0]) + 250;
            const scale = Math.min(width / (treeW || 1), height / (treeH || 1), 1) * 0.85;
            const tx = width / 2 - (xExtent[0] + xExtent[1]) / 2 * scale;
            const ty = 100;
            svg.transition().duration(600).call(
                zoom.transform,
                d3.zoomIdentity.translate(tx, ty).scale(scale)
            );
        }
        
        // Expose variables for external focusing
        window.__lastLineageTreeRoot = root;
        window.__lastLineageTreeSvg = svg;
        window.__lastLineageTreeZoom = zoom;
        window.__lastLineageTreeWidth = width;
        window.__lastLineageTreeHeight = height;
        window.__lastLineageTreeUpdate = update;
    }
}

window.lineageTreeFocusNode = (projectPath) => {
    if (!window.__lastLineageTreeRoot || !window.__lastLineageTreeSvg) return;
    
    const root = window.__lastLineageTreeRoot;
    let targetNode = null;
    
    function findNode(node) {
        if (targetNode) return;
        if (node.data && node.data._project && node.data._project.path === projectPath) {
            targetNode = node;
            return;
        }
        if (node.children) node.children.forEach(findNode);
        if (node._children) node._children.forEach(findNode);
    }
    
    findNode(root);

    if (targetNode) {
        // Expand all parents
        let parent = targetNode.parent;
        let needsUpdate = false;
        while (parent) {
            if (parent._children) {
                parent.children = parent._children;
                parent._children = null;
                needsUpdate = true;
            }
            parent = parent.parent;
        }
        
        if (needsUpdate && window.__lastLineageTreeUpdate) {
            window.__lastLineageTreeUpdate(root);
        }

        // Highlight
        d3.selectAll('g.node circle').style('stroke', null).style('stroke-width', null);
        const targetSelection = d3.selectAll('g.node').filter(d => d === targetNode);
        targetSelection.select('circle').style('stroke', '#ef4444').style('stroke-width', '4px');

        // Zoom and center
        const scale = 2.0; // Stronger zoom
        const width = window.__lastLineageTreeWidth || 800;
        const height = window.__lastLineageTreeHeight || 600;
        const tx = width / 2 - targetNode.x * scale;
        const ty = height / 2 - targetNode.y * scale;
        
        window.__lastLineageTreeSvg.transition().duration(800).call(
            window.__lastLineageTreeZoom.transform,
            d3.zoomIdentity.translate(tx, ty).scale(scale)
        );
        
        // Trigger click event to open action bar (if node exists in DOM)
        const nodeEl = targetSelection.node();
        if (nodeEl) {
            setTimeout(() => {
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                nodeEl.dispatchEvent(event);
            }, 100);
        }
    }
};

window.renderMetaFoldLineageTree = (containerId, data) => {
    const tree = new MetaFoldLineageTree(containerId);
    tree.render(data);
};

// --- Connection Mode Logic ---
window.isConnectingLineage = false;
window.connectSourceNode = null;

window.startConnectMode = (sourcePath, sourceTitle) => {
    window.isConnectingLineage = true;
    window.connectSourceNode = { path: sourcePath, title: sourceTitle };
    
    const connectBtn = document.getElementById('btn-connect-project');
    if (connectBtn) {
        window.originalConnectButtonHtml = connectBtn.outerHTML;
        connectBtn.outerHTML = `
            <div id="connect-mode-container" style="display: flex; flex-direction: column; align-items: flex-start; margin-left: 10px;">
                <button class="btn btn-sm btn-info" onclick="window.endConnectMode()" style="padding: 4px 8px; font-size: 12px; background: #0ea5e9; border: none; display: flex; align-items: center; gap: 5px;">
                    Connecting... Cancel <span style="font-size: 14px; font-weight: bold;">✕</span>
                </button>
                <span style="color: #9ca3af; font-size: 11px; margin-top: 4px;">Source: <strong>${sourceTitle}</strong> ➜ Click Target (Result)</span>
            </div>
        `;
    }
};

window.endConnectMode = () => {
    window.isConnectingLineage = false;
    window.connectSourceNode = null;
    
    const container = document.getElementById('connect-mode-container');
    if (container && window.originalConnectButtonHtml) {
        container.outerHTML = window.originalConnectButtonHtml;
    }
};

window.executeConnection = async (targetProject, targetTitle) => {
    try {
        const targetPath = targetProject.path;
        // Find metadata file in target directory
        const dirFiles = await window.electronAPI.listDirFiles(targetPath);
        if (!dirFiles.success) throw new Error(dirFiles.message || 'Failed to list directory');
        
        let metadataFile = dirFiles.files.find(f => f.endsWith('-metadata.json'));
        if (!metadataFile) {
            metadataFile = dirFiles.files.find(f => f === 'ReadyToImport.json');
        }
        
        if (!metadataFile) {
            alert('Could not find metadata file in target project.');
            window.endConnectMode();
            return;
        }

        const separator = targetPath.includes('\\') ? '\\' : '/';
        const fullPath = targetPath.endsWith(separator) ? targetPath + metadataFile : targetPath + separator + metadataFile;
        
        const content = await window.electronAPI.readFile(fullPath);
        let metadata = JSON.parse(content);

        // Find existing derived_from field. It could be flat, or nested in a group.
        let derivedUpdated = false;
        
        let currentUser = 'Unknown User';
        if (window.userManager && typeof window.userManager.getCurrentUserInfo === 'function') {
            const ui = window.userManager.getCurrentUserInfo();
            if (ui && ui.username) currentUser = ui.username;
        }
        const currentDate = new Date().toISOString();

        function upgradeDerivedFrom(existingValue, newValue) {
            let mergedValues = [newValue];
            if (existingValue) {
                if (typeof existingValue === 'object' && Array.isArray(existingValue.value)) {
                    mergedValues = [...existingValue.value, newValue];
                } else if (Array.isArray(existingValue)) {
                    mergedValues = [...existingValue, newValue];
                } else if (typeof existingValue === 'string') {
                    mergedValues = [...existingValue.split(',').map(s=>s.trim()), newValue];
                }
            }
            // Dedup
            mergedValues = [...new Set(mergedValues.filter(Boolean))];
            
            return {
                label: "Derived From (Link)",
                type: "derived_from",
                value: mergedValues,
                isModified: true,
                lastUpdatedBy: currentUser,
                lastUpdatedAt: currentDate
            };
        }
        
        // 1. Check root level
        if (metadata.derived_from !== undefined) {
            metadata.derived_from = upgradeDerivedFrom(metadata.derived_from, window.connectSourceNode.title);
            derivedUpdated = true;
        } else {
            // 2. Check within groups
            for (let key in metadata) {
                if (metadata[key] && typeof metadata[key] === 'object' && metadata[key].derived_from !== undefined) {
                    metadata[key].derived_from = upgradeDerivedFrom(metadata[key].derived_from, window.connectSourceNode.title);
                    derivedUpdated = true;
                    break; // Update first found
                }
            }
        }

        // 3. Fallback: create it at root level if not found anywhere
        if (!derivedUpdated) {
            metadata.derived_from = upgradeDerivedFrom(null, window.connectSourceNode.title);
        }

        // Save the updated JSON
        await window.electronAPI.saveJsonFile(metadata, fullPath);
        
        // Also regenerate the README.html so the changes are visible there too
        if (window.electronAPI.regenerateReadmeHtml) {
            await window.electronAPI.regenerateReadmeHtml(targetPath, metadata, targetTitle);
        }
        
        alert(`Successfully connected! Target project now derives from '${window.connectSourceNode.title}'. Please re-scan projects to update the visualization.`);
        window.endConnectMode();
        
    } catch (error) {
        console.error('Error connecting projects:', error);
        alert('Error connecting projects: ' + error.message);
        window.endConnectMode();
    }
};



