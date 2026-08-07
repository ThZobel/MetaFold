// Knowledge Graph with 3 Views (Bundling, Folder Tree, Arc)
class MetaFoldKnowledgeGraph {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.currentView = 'bundling'; // default view
    }

    render(data) {
        if (!this.container) return;
        this.data = data;
        this.projects = data.projects || [];
        
        if (this.projects.length === 0) {
            this.container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9ca3af;">No project data available.</div>';
            return;
        }

        this.container.innerHTML = `
            <div style="height: 100%; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <div>
                        <h4 style="margin: 0; color: #e0e0e0; font-size: 16px;">🌌 Knowledge Graph</h4>
                        <p style="margin: 2px 0 0 0; color: #9ca3af; font-size: 12px;" id="kg-view-desc">Physical folder structure and logical lineage</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div id="kg-tree-actions" style="display: ${this.currentView === 'tree' ? 'flex' : 'none'}; gap: 5px; margin-right: 15px;">
                            <button id="kg-btn-expand" class="btn btn-sm btn-secondary" style="padding: 4px 8px; font-size: 12px; background: #374151; color: #fff; border: 1px solid #4b5563; cursor: pointer;">Expand All</button>
                            <button id="kg-btn-collapse" class="btn btn-sm btn-secondary" style="padding: 4px 8px; font-size: 12px; background: #374151; color: #fff; border: 1px solid #4b5563; cursor: pointer;">Collapse All</button>
                        </div>
                        <span style="color: #9ca3af; font-size: 13px;">View Mode:</span>
                        <select id="kg-view-selector" class="form-control" style="background: #374151; color: #fff; border: 1px solid #4b5563; border-radius: 4px; padding: 6px 12px; font-size: 13px; cursor: pointer; outline: none;">
                            <option value="bundling" ${this.currentView === 'bundling' ? 'selected' : ''}>Combined Graph (Hierarchical Edge Bundling)</option>
                            <option value="tree" ${this.currentView === 'tree' ? 'selected' : ''}>Project Structure (Folder Hierarchy)</option>
                            <option value="arc" ${this.currentView === 'arc' ? 'selected' : ''}>Chronological Lineage (Arc Diagram)</option>
                        </select>
                    </div>
                </div>
                <div id="kg-svg-container" style="flex: 1; position: relative; overflow: hidden; background: #111827;"></div>
            </div>
        `;

        const selector = document.getElementById('kg-view-selector');
        selector.addEventListener('change', (e) => {
            this.currentView = e.target.value;
            this.drawView();
        });

        this.drawView();
    }

    // Helper: Build folder hierarchy from paths
    buildFolderHierarchy() {
        const sorted = [...this.projects].sort((a, b) => (a.path || "").length - (b.path || "").length);
        const rootNodes = [];
        const nodeMap = {};

        sorted.forEach(p => {
            const node = {
                name: p.displayName || p.name,
                _project: p,
                path: p.path,
                children: []
            };
            nodeMap[p.path] = node;
            
            let parentPath = null;
            let maxPrefixLen = 0;
            for (const possibleParent in nodeMap) {
                if (possibleParent !== p.path && p.path.startsWith(possibleParent) && possibleParent.length > maxPrefixLen) {
                    const separator = p.path.charAt(possibleParent.length);
                    if (separator === '\\' || separator === '/') {
                        parentPath = possibleParent;
                        maxPrefixLen = possibleParent.length;
                    }
                }
            }

            if (parentPath) {
                nodeMap[parentPath].children.push(node);
            } else {
                rootNodes.push(node);
            }
        });

        if (rootNodes.length === 1) {
            return rootNodes[0];
        } else {
            return {
                name: "Workspace",
                _isDummyRoot: true,
                children: rootNodes
            };
        }
    }

    // Helper: Build derived_from links
    buildLineageLinks() {
        const links = [];
        this.projects.forEach(p => {
            if (p.lineage && p.lineage.lineage_links) {
                p.lineage.lineage_links.forEach(l => {
                    links.push({ source: l.source_path, target: p.path });
                });
            }
        });
        return links;
    }

    updateActionBar(project) {
        const actionBar = document.getElementById('kg-action-bar');
        if (actionBar && project) {
            const escapedPath = project.path.replace(/\\/g, '\\\\').replace(/"/g, '&quot;');
            actionBar.innerHTML = `
                <span style="color: #9ca3af; font-size: 13px; align-self: center;">Selected: <strong>${project.displayName || project.name}</strong></span>
                <button class="btn btn-sm btn-secondary" onclick="window.projectScanner.showProjectDetailsModal(window.projectScanner.projects.find(p => p.path === '${escapedPath}'))" style="padding: 4px 8px; font-size: 12px;">View Details</button>
                <button class="btn btn-sm btn-secondary" onclick="window.electronAPI.openFolder('${escapedPath}')" style="padding: 4px 8px; font-size: 12px;">Open Folder</button>
                <button class="btn btn-sm btn-primary" onclick="window.exportLineage('${escapedPath}')" style="padding: 4px 8px; font-size: 12px;">Export Lineage</button>
            `;
        }
    }

    drawView() {
        const svgContainer = document.getElementById('kg-svg-container');
        if (!svgContainer) return;
        svgContainer.innerHTML = '';
        
        const descEl = document.getElementById('kg-view-desc');
        const actionDiv = document.getElementById('kg-tree-actions');
        if (actionDiv) actionDiv.style.display = this.currentView === 'tree' ? 'flex' : 'none';

        if (this.currentView === 'bundling') {
            if(descEl) descEl.innerText = "Folder hierarchy mapped circularly, lineage shown as central curves";
            this.drawEdgeBundling(svgContainer);
        } else if (this.currentView === 'tree') {
            if(descEl) descEl.innerText = "Interactive folder structure (Click to expand/collapse)";
            this.drawCollapsibleTree(svgContainer);
        } else if (this.currentView === 'arc') {
            if(descEl) descEl.innerText = "Chronological project timeline with lineage arcs";
            this.drawArcDiagram(svgContainer);
        }
    }

    drawEdgeBundling(container) {
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 800;
        const radius = Math.min(width, height) / 2 - 140;

        const svg = d3.select(container).append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("cursor", "grab");
            
        const g = svg.append("g");

        const zoom = d3.zoom().scaleExtent([0.1, 5]).on('zoom', (event) => g.attr('transform', event.transform));
        svg.call(zoom);
        
        // Initial center
        svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2));

        const hierarchyData = this.buildFolderHierarchy();
        const root = d3.hierarchy(hierarchyData);
        
        const cluster = d3.cluster().size([360, radius]);
        cluster(root);

        const nodeByPath = {};
        root.descendants().forEach(d => {
            if (d.data.path) nodeByPath[d.data.path] = d;
        });

        const lineageLinks = this.buildLineageLinks();
        const bundleLinks = [];
        lineageLinks.forEach(l => {
            const sourceNode = nodeByPath[l.source];
            const targetNode = nodeByPath[l.target];
            if (sourceNode && targetNode) {
                bundleLinks.push({ source: sourceNode, target: targetNode, path: sourceNode.path(targetNode) });
            }
        });

        const line = d3.lineRadial()
            .curve(d3.curveBundle.beta(0.85))
            .radius(d => d.y)
            .angle(d => d.x * Math.PI / 180);

        // Draw Links
        const link = g.append("g").selectAll(".link")
            .data(bundleLinks)
            .enter().append("path")
            .attr("class", "link")
            .attr("d", d => line(d.path))
            .style("fill", "none")
            .style("stroke", "#60a5fa") // Blue for lineage
            .style("stroke-width", "2px")
            .style("stroke-opacity", 0.6)
            .style("mix-blend-mode", "screen");

        // Draw Nodes
        const node = g.append("g").selectAll(".node")
            .data(root.descendants().filter(d => !d.data._isDummyRoot))
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `rotate(${d.x - 90})translate(${d.y},0)`)
            .style("cursor", "pointer")
            .on("mouseover", function(e, d) {
                // Highlight connected links
                link.style("stroke-opacity", l => (l.source === d || l.target === d) ? 1 : 0.1)
                    .style("stroke", l => (l.source === d || l.target === d) ? "#f472b6" : "#60a5fa")
                    .style("stroke-width", l => (l.source === d || l.target === d) ? "3px" : "2px");
                d3.select(this).select("text").style("font-weight", "bold").style("fill", "#fff");
            })
            .on("mouseout", function(e, d) {
                link.style("stroke-opacity", 0.6).style("stroke", "#60a5fa").style("stroke-width", "2px");
                d3.select(this).select("text").style("font-weight", "normal").style("fill", "#9ca3af");
            })
            .on("click", (e, d) => {
                if(d.data._project) {
                    this.updateActionBar(d.data._project);
                    if(typeof window.showProjectMetadataInSidebar === 'function') window.showProjectMetadataInSidebar(d.data._project.path);
                }
            })
            .on("dblclick", (e, d) => {
                if (d.data._project && window.projectScanner) {
                    window.projectScanner.showProjectDetailsModal(window.projectScanner.projects.find(p => p.path === d.data._project.path));
                }
            });

        node.append("circle")
            .attr("r", 5)
            .style("fill", "#10b981");

        node.append("text")
            .attr("dy", "0.31em")
            .attr("x", d => d.x < 180 ? 8 : -8)
            .attr("text-anchor", d => d.x < 180 ? "start" : "end")
            .attr("transform", d => d.x >= 180 ? "rotate(180)" : null)
            .text(d => d.data.name)
            .style("font-size", "12px")
            .style("fill", "#9ca3af")
            .style("pointer-events", "none");
    }

    drawCollapsibleTree(container) {
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;

        const svg = d3.select(container).append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("cursor", "grab");
            
        const g = svg.append("g").attr("transform", "translate(80,40)");

        const zoom = d3.zoom().scaleExtent([0.15, 5]).on('zoom', (event) => g.attr('transform', event.transform));
        svg.call(zoom);

        const hierarchyData = this.buildFolderHierarchy();
        const root = d3.hierarchy(hierarchyData);
        
        // Collapse all but first level
        root.descendants().forEach(d => {
            if (d.depth >= 1 && d.children) {
                d._children = d.children;
                d.children = null;
            }
        });

        const treeLayout = d3.tree().size([height - 100, width - 200]);
        let i = 0;
        const duration = 500;

        const expandAll = () => {
            root.descendants().forEach(d => {
                if (d._children) {
                    d.children = d._children;
                    d._children = null;
                }
            });
            update(root);
        };

        const collapseAll = () => {
            root.descendants().forEach(d => {
                if (d.depth >= 1 && d.children) {
                    d._children = d.children;
                    d.children = null;
                }
            });
            update(root);
        };

        const btnExpand = document.getElementById('kg-btn-expand');
        const btnCollapse = document.getElementById('kg-btn-collapse');
        if (btnExpand) btnExpand.onclick = expandAll;
        if (btnCollapse) btnCollapse.onclick = collapseAll;

        const allLineageLinks = this.buildLineageLinks();

        const update = (source) => {
            let nodeCount = 0;
            root.eachBefore(d => { nodeCount++; });
            const dynamicHeight = Math.max(height - 100, nodeCount * 30);
            treeLayout.size([dynamicHeight, width - 200]);

            const treeData = treeLayout(root);
            const nodes = treeData.descendants();
            const links = treeData.links();

            nodes.forEach(d => d.y = d.depth * 250);

            const nodeSel = g.selectAll('g.node')
                .data(nodes, d => d.id || (d.id = ++i));

            const nodeEnter = nodeSel.enter().append('g')
                .attr('class', 'node')
                .attr('transform', d => `translate(${source.y0 || root.y},${source.x0 || root.x})`)
                .style('cursor', 'pointer')
                .on('click', (e, d) => {
                    if (d.data._project) {
                        this.updateActionBar(d.data._project);
                        if(typeof window.showProjectMetadataInSidebar === 'function') window.showProjectMetadataInSidebar(d.data._project.path);
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
                .on("dblclick", (e, d) => {
                    if (d.data._project && window.projectScanner) {
                        window.projectScanner.showProjectDetailsModal(window.projectScanner.projects.find(p => p.path === d.data._project.path));
                    }
                })
                .on("mouseover", function(e, d) {
                    if (d.data.path) {
                        g.selectAll('path.lineage-link')
                         .style('stroke-opacity', l => (l.source === d.data.path || l.target === d.data.path) ? 1 : 0.1)
                         .style('stroke-width', l => (l.source === d.data.path || l.target === d.data.path) ? '3px' : '1.5px');
                    }
                    d3.select(this).select("circle").style("stroke", "#fff").style("stroke-width", "3px");
                    d3.select(this).select("text").style("font-weight", "bold").style("fill", "#fff");
                })
                .on("mouseout", function(e, d) {
                    g.selectAll('path.lineage-link')
                     .style('stroke-opacity', 0.6)
                     .style('stroke-width', '1.5px');
                    
                    d3.select(this).select("circle").style("stroke", n => (n.children || n._children) ? '#f3f4f6' : 'none').style("stroke-width", "2px");
                    d3.select(this).select("text").style("font-weight", "normal").style("fill", "#e5e7eb");
                });

            nodeEnter.append('circle')
                .attr('r', 1e-6)
                .attr('fill', d => d.data._isDummyRoot ? '#f59e0b' : d._children ? '#8b5cf6' : '#10b981')
                .style('stroke', d => (d.children || d._children) ? '#f3f4f6' : 'none')
                .style('stroke-width', '2px');

            nodeEnter.append('text')
                .attr('dy', '.31em')
                .attr('x', d => d.children || d._children ? -12 : 12)
                .attr('text-anchor', d => d.children || d._children ? 'end' : 'start')
                .text(d => d.data.name)
                .style('fill', '#e5e7eb')
                .style('font-size', '13px')
                .style('pointer-events', 'none');

            // Badge
            nodeEnter.append('text')
                .attr('class', 'kg-badge')
                .attr('dy', '-0.8em')
                .attr('x', d => d.children || d._children ? -12 : 12)
                .attr('text-anchor', d => d.children || d._children ? 'end' : 'start')
                .text(d => d._children ? `+${d._children.length}` : '')
                .style('fill', '#9ca3af')
                .style('font-size', '10px');

            const linkSel = g.selectAll('path.link')
                .data(links, d => d.target.id);

            const linkEnter = linkSel.enter().insert('path', 'g')
                .attr('class', 'link')
                .style('fill', 'none')
                .style('stroke', 'rgba(107,114,128,0.4)')
                .style('stroke-width', '2px')
                .attr('d', d => {
                    const o = {x: source.x0 || root.x, y: source.y0 || root.y};
                    return d3.linkHorizontal().x(d => d.y).y(d => d.x)({source: o, target: o});
                });

            const linkUpdate = linkEnter.merge(linkSel);
            linkUpdate.transition().duration(duration)
                .attr('d', d3.linkHorizontal().x(d => d.y).y(d => d.x));

            linkSel.exit().transition().duration(duration)
                .attr('d', d => {
                    const o = {x: source.x, y: source.y};
                    return d3.linkHorizontal().x(d => d.y).y(d => d.x)({source: o, target: o});
                })
                .remove();

            const nodeUpdate = nodeEnter.merge(nodeSel);
            nodeUpdate.transition().duration(duration)
                .attr('transform', d => `translate(${d.y},${d.x})`);
                
            nodeUpdate.select('circle').transition().duration(duration)
                .attr('r', 7)
                .attr('fill', d => d.data._isDummyRoot ? '#f59e0b' : d._children ? '#8b5cf6' : '#10b981');
                
            nodeUpdate.select('.kg-badge')
                .text(d => d._children ? `+${d._children.length}` : '');

            const nodeExit = nodeSel.exit().transition().duration(duration)
                .attr('transform', `translate(${source.y},${source.x})`).remove();
            nodeExit.select('circle').attr('r', 0);

            // --- Draw Lineage Links (Dashed) ---
            const allNodesMap = {};
            nodes.forEach(n => {
                if (n.data.path) allNodesMap[n.data.path] = n;
            });
            
            const activeLineageLinks = allLineageLinks.filter(l => allNodesMap[l.source] && allNodesMap[l.target]);
            
            const lineageSel = g.selectAll('path.lineage-link')
                .data(activeLineageLinks, d => d.source + '-' + d.target);

            const lineageEnter = lineageSel.enter().insert('path', '.node') // insert before nodes so they don't cover clicks
                .attr('class', 'lineage-link')
                .style('fill', 'none')
                .style('stroke', '#f472b6')
                .style('stroke-width', '1.5px')
                .style('stroke-dasharray', '4,4')
                .style('stroke-opacity', 0)
                .attr('d', d => {
                    const s = allNodesMap[d.source];
                    const t = allNodesMap[d.target];
                    const dx = t.y - s.y;
                    const dy = t.x - s.x;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    // Variable bulge based on node names so overlapping lines spread out
                    const factor = 0.6 + ((d.source.length + d.target.length) % 15) * 0.05;
                    const dr = dist * factor;
                    const sweep = s.x < t.x ? 1 : 0;
                    return `M ${s.y},${s.x} A ${dr},${dr} 0 0,${sweep} ${t.y},${t.x}`;
                });

            const lineageUpdate = lineageEnter.merge(lineageSel);
            lineageUpdate.transition().duration(duration)
                .style('stroke-opacity', 0.6)
                .attr('d', d => {
                    const s = allNodesMap[d.source];
                    const t = allNodesMap[d.target];
                    const dx = t.y - s.y;
                    const dy = t.x - s.x;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const factor = 0.6 + ((d.source.length + d.target.length) % 15) * 0.05;
                    const dr = dist * factor;
                    const sweep = s.x < t.x ? 1 : 0;
                    return `M ${s.y},${s.x} A ${dr},${dr} 0 0,${sweep} ${t.y},${t.x}`;
                });

            lineageSel.exit().transition().duration(duration)
                .style('stroke-opacity', 0)
                .remove();

            nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
        };

        root.x0 = height / 2;
        root.y0 = 0;
        update(root);
    }

    drawArcDiagram(container) {
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        
        // Use a wide margin on bottom for rotated labels
        const margin = {top: 50, right: 100, bottom: 200, left: 100};
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        const svg = d3.select(container).append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("cursor", "grab");
            
        const zoomG = svg.append("g");
        
        // Panning and zooming
        const zoom = d3.zoom().scaleExtent([0.5, 5]).on('zoom', (event) => zoomG.attr('transform', event.transform));
        svg.call(zoom);

        const g = zoomG.append("g").attr("transform", `translate(${margin.left},${margin.top + h/2})`);

        // Sort projects chronologically
        const timeNodes = [...this.projects].sort((a, b) => {
            const da = a.created ? new Date(a.created).getTime() : 0;
            const db = b.created ? new Date(b.created).getTime() : 0;
            return da - db;
        });

        // Minimum width to avoid squishing if lots of projects
        const effectiveW = Math.max(w, timeNodes.length * 40);

        const x = d3.scalePoint()
            .domain(timeNodes.map(d => d.path))
            .range([0, effectiveW])
            .padding(0.5);

        const lineageLinks = this.buildLineageLinks().filter(l => x(l.source) !== undefined && x(l.target) !== undefined);

        // Draw Folder Links (Parent-Child) below baseline
        const hierarchyData = this.buildFolderHierarchy();
        const root = d3.hierarchy(hierarchyData);
        const folderLinks = [];
        root.descendants().forEach(d => {
            if (d.parent && d.data.path && d.parent.data.path) {
                folderLinks.push({ source: d.parent.data.path, target: d.data.path });
            }
        });

        const folderLinksSel = g.selectAll(".folderLink")
            .data(folderLinks.filter(l => x(l.source) !== undefined && x(l.target) !== undefined))
            .enter().append("path")
            .attr("class", "folderLink")
            .style("fill", "none")
            .style("stroke", "rgba(107,114,128,0.6)")
            .style("stroke-width", "3px")
            .style("stroke-opacity", 0.8)
            .attr("d", d => {
                const x1 = x(d.source);
                const x2 = x(d.target);
                const rx = Math.abs(x2 - x1) / 2;
                const ry = rx;
                // Draw arc below the line
                return `M ${x1},0 A ${rx},${ry} 0 0,${x1 < x2 ? 0 : 1} ${x2},0`;
            });

        // Draw Lineage Links
        const links = g.selectAll(".arcLink")
            .data(lineageLinks)
            .enter().append("path")
            .attr("class", "arcLink")
            .style("fill", "none")
            .style("stroke", "#f472b6")
            .style("stroke-width", "2px")
            .style("stroke-opacity", 0.6)
            .attr("d", d => {
                const x1 = x(d.source);
                const x2 = x(d.target);
                const rx = Math.abs(x2 - x1) / 2;
                const ry = rx;
                // Draw arc above the line
                return `M ${x1},0 A ${rx},${ry} 0 0,${x1 < x2 ? 1 : 0} ${x2},0`;
            });

        // Draw Nodes
        const nodes = g.selectAll(".arcNode")
            .data(timeNodes)
            .enter().append("g")
            .attr("class", "arcNode")
            .attr("transform", d => `translate(${x(d.path)},0)`)
            .style("cursor", "pointer")
            .on("mouseover", function(e, d) {
                // Highlight connected arcs
                links.style("stroke-opacity", l => (l.source === d.path || l.target === d.path) ? 1 : 0.1)
                     .style("stroke-width", l => (l.source === d.path || l.target === d.path) ? "4px" : "2px");
                     
                folderLinksSel.style("stroke-opacity", l => (l.source === d.path || l.target === d.path) ? 1 : 0.1)
                     .style("stroke-width", l => (l.source === d.path || l.target === d.path) ? "4px" : "3px")
                     .style("stroke", l => (l.source === d.path || l.target === d.path) ? "#60a5fa" : "rgba(107,114,128,0.6)");
                     
                d3.select(this).select("circle").style("fill", "#fff").attr("r", 8);
                d3.select(this).select("text").style("fill", "#fff").style("font-weight", "bold");
            })
            .on("mouseout", function(e, d) {
                links.style("stroke-opacity", 0.6).style("stroke-width", "2px");
                folderLinksSel.style("stroke-opacity", 0.8).style("stroke-width", "3px").style("stroke", "rgba(107,114,128,0.6)");
                
                d3.select(this).select("circle").style("fill", "#10b981").attr("r", 5);
                d3.select(this).select("text").style("fill", "#9ca3af").style("font-weight", "normal");
            })
            .on("click", (e, d) => {
                const instance = this;
                if (instance.updateActionBar) instance.updateActionBar(d);
                if(typeof window.showProjectMetadataInSidebar === 'function') window.showProjectMetadataInSidebar(d.path);
            })
            .on("dblclick", (e, d) => {
                if (window.projectScanner) {
                    window.projectScanner.showProjectDetailsModal(window.projectScanner.projects.find(p => p.path === d.path));
                }
            });

        nodes.append("circle")
            .attr("r", 5)
            .style("fill", "#10b981")
            .style("stroke", "#111827")
            .style("stroke-width", "2px");

        nodes.append("text")
            .attr("y", 15)
            .attr("x", 5)
            .attr("transform", "rotate(45)")
            .text(d => d.displayName || d.name)
            .style("text-anchor", "start")
            .style("font-size", "12px")
            .style("fill", "#9ca3af")
            .style("pointer-events", "none");
            
        // Add timeline baseline
        g.insert("line", ":first-child")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", effectiveW)
            .attr("y2", 0)
            .style("stroke", "rgba(255,255,255,0.1)")
            .style("stroke-width", "2px");
    }
}

window.renderMetaFoldKnowledgeGraph = (containerId, data) => {
    const graph = new MetaFoldKnowledgeGraph(containerId);
    graph.render(data);
};
