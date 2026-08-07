class MetaFoldMetadataGraph {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
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
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <span style="color: #e0e0e0; font-size: 14px; font-weight: bold;">🏷️ Metadata Tree</span>
                        <span style="color: #9ca3af; font-size: 12px; margin-left: 10px;">Expand keys to see their values and connected projects.</span>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button id="mg-btn-expand" class="btn btn-sm btn-secondary" style="padding: 4px 8px; font-size: 12px; background: #374151; color: #fff; border: 1px solid #4b5563; cursor: pointer;">Expand All</button>
                        <button id="mg-btn-collapse" class="btn btn-sm btn-secondary" style="padding: 4px 8px; font-size: 12px; background: #374151; color: #fff; border: 1px solid #4b5563; cursor: pointer;">Collapse All</button>
                    </div>
                </div>
                <div id="mg-svg-container" style="flex: 1; position: relative; overflow: hidden; background: #111827;"></div>
                <div id="mg-action-bar" style="display: flex; justify-content: flex-end; gap: 10px; padding: 10px 20px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.1); min-height: 40px;"></div>
            </div>
        `;

        this.drawTree();

        document.getElementById('mg-btn-expand').addEventListener('click', () => {
            this.expandAll(this.root);
            this.updateTree(this.root);
        });
        document.getElementById('mg-btn-collapse').addEventListener('click', () => {
            this.collapseAll(this.root);
            this.updateTree(this.root);
        });
    }

    flattenMetadata(obj, prefix = '') {
        let flattened = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const newKey = prefix ? `${prefix}.${key}` : key;
                const value = obj[key];
                
                if (value && typeof value === 'object' && value.hasOwnProperty('value')) {
                    flattened[newKey] = value.value;
                } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                    Object.assign(flattened, this.flattenMetadata(value, newKey));
                } else {
                    flattened[newKey] = value;
                }
            }
        }
        return flattened;
    }

    buildHierarchy() {
        const root = {
            name: "Metadata Fields",
            _type: "root",
            children: []
        };
        
        // Group by Key -> Value -> Projects
        const metadataGroups = {};
        
        this.projects.forEach(p => {
            if (p.metadata) {
                const flatMeta = this.flattenMetadata(p.metadata);
                Object.entries(flatMeta).forEach(([key, val]) => {
                    // Ignore system fields from tree usually
                    if (key.startsWith('System.') || key.startsWith('extra_fields.')) {
                        // Actually, if it starts with extra_fields., we should probably keep it but strip the prefix
                        key = key.replace(/^extra_fields\./, '');
                    }
                    if (key.startsWith('System.')) return;
                    
                    const valueStr = val !== undefined && val !== null && val !== '' ? String(val) : "Unspecified";
                    
                    // Skip empty or unspecified values as requested
                    if (valueStr === "Unspecified") return;
                    
                    if (!metadataGroups[key]) metadataGroups[key] = {};
                    if (!metadataGroups[key][valueStr]) metadataGroups[key][valueStr] = [];
                    metadataGroups[key][valueStr].push(p);
                });
            }
        });
        
        // Build the tree nodes
        for (const [key, valuesObj] of Object.entries(metadataGroups)) {
            const categoryNode = {
                name: key.replace(/_/g, ' '),
                _type: "category",
                children: []
            };
            
            for (const [val, projs] of Object.entries(valuesObj)) {
                categoryNode.children.push({
                    name: val,
                    _type: "value",
                    children: projs.map(p => ({
                        name: p.displayName || p.name,
                        _type: "project",
                        _project: p
                    }))
                });
            }
            // Only add categories that actually have values
            if (categoryNode.children.length > 0) {
                root.children.push(categoryNode);
            }
        }
        
        return root;
    }

    expandAll(d) {
        if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        if (d.children) {
            d.children.forEach(c => this.expandAll(c));
        }
    }

    collapseAll(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(c => this.collapseAll(c));
            d.children = null;
        }
    }

    buildLineageLinks(nodesByPath) {
        const links = [];
        this.projects.forEach(p => {
            if (p.lineage && p.lineage.lineage_links) {
                p.lineage.lineage_links.forEach(l => {
                    const sourceNodes = nodesByPath[l.source_path] || [];
                    const targetNodes = nodesByPath[p.path] || [];
                    
                    // Draw a link between EVERY visible instance of the source project
                    // and EVERY visible instance of the target project
                    sourceNodes.forEach(sourceNode => {
                        targetNodes.forEach(targetNode => {
                            links.push({ source: sourceNode, target: targetNode });
                        });
                    });
                });
            }
        });
        return links;
    }

    drawTree() {
        const svgContainer = document.getElementById('mg-svg-container');
        if (!svgContainer) return;
        svgContainer.innerHTML = '';
        
        const hierarchyData = this.buildHierarchy();

        const width = svgContainer.clientWidth || 800;
        const height = svgContainer.clientHeight || 800;

        const svg = d3.select(svgContainer).append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("cursor", "grab");
            
        this.svgGroup = svg.append("g").attr('transform', `translate(80, 40)`);
        const g = this.svgGroup;

        this.zoom = d3.zoom().scaleExtent([0.15, 5]).on('zoom', (event) => g.attr('transform', event.transform));
        svg.call(this.zoom);

        this.root = d3.hierarchy(hierarchyData);
        this.root.x0 = height / 2;
        this.root.y0 = 0;

        // Auto-collapse logic: Collapse category and value nodes to save space initially
        this.root.descendants().forEach(d => {
            if (d.depth > 0) { // Collapse everything under root initially
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                }
            }
        });

        this.i = 0;
        this.treeLayout = d3.tree().size([height - 100, width - 200]);
        
        // Groups for drawing layers
        this.linksLayer = g.append("g").attr("class", "links-layer");
        this.lineageLayer = g.append("g").attr("class", "lineage-layer");
        this.nodesLayer = g.append("g").attr("class", "nodes-layer");

        this.updateTree(this.root);

        // Center tree
        const scale = 0.85;
        const tx = 80;
        const ty = height / 2;
        svg.call(this.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }

    updateTree(source) {
        const duration = 500;
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 800;

        // Compute dynamic height based on expanded nodes
        let nodeCount = 0;
        this.root.eachBefore(d => { nodeCount++; }); // only visible nodes
        const dynamicHeight = Math.max(height - 100, nodeCount * 30);
        this.treeLayout.size([dynamicHeight, width - 300]);

        const treeData = this.treeLayout(this.root);
        const nodes = treeData.descendants();
        const links = treeData.links();

        // Fixed horizontal spacing
        nodes.forEach(d => d.y = d.depth * 250);

        // -- Nodes --
        const nodeSel = this.nodesLayer.selectAll('g.node')
            .data(nodes, d => d.id || (d.id = ++this.i));

        const nodeEnter = nodeSel.enter().append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${source.y0 || this.root.y},${source.x0 || this.root.x})`)
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
                    this.updateTree(d);
                }
            })
            .on('dblclick', (e, d) => {
                if (d.data._project && window.projectScanner) {
                    const proj = window.projectScanner.projects.find(p => p.path === d.data._project.path);
                    if (proj) window.projectScanner.showProjectDetailsModal(proj);
                }
            })
            // Highlighting
            .on('mouseover', (e, d) => {
                if (d.data._type === 'project') {
                    // Highlight lineage links for this project
                    // For ANY instance of this project in the tree!
                    const projPath = d.data._project.path;
                    this.lineageLayer.selectAll('.lineage-link')
                        .style('stroke-opacity', l => (l.source.data._project.path === projPath || l.target.data._project.path === projPath) ? 1 : 0.1)
                        .style('stroke', l => (l.source.data._project.path === projPath || l.target.data._project.path === projPath) ? '#3b82f6' : '#4b5563');
                }
            })
            .on('mouseout', () => {
                this.lineageLayer.selectAll('.lineage-link')
                    .style('stroke-opacity', 0.4)
                    .style('stroke', '#6b7280');
            });

        // Colors based on type
        const getColor = (d) => {
            if (d.data._type === 'root') return '#f59e0b'; // Amber
            if (d.data._type === 'category') return '#3b82f6'; // Blue
            if (d.data._type === 'value') return '#ec4899'; // Pink
            return d._children ? '#8b5cf6' : '#10b981'; // Project
        };

        nodeEnter.append('circle')
            .attr('r', 1e-6)
            .attr('fill', d => getColor(d))
            .style('stroke', d => (d.children || d._children) ? '#f3f4f6' : 'none')
            .style('stroke-width', '2px');

        nodeEnter.append('text')
            .attr('dy', '.31em')
            .attr('x', d => d.children || d._children ? -12 : 12)
            .attr('text-anchor', d => d.children || d._children ? 'end' : 'start')
            .text(d => d.data.name)
            .style('fill', '#e5e7eb')
            .style('font-size', d => d.data._type === 'root' ? '16px' : '13px')
            .style('font-weight', d => d.data._type === 'root' || d.data._type === 'category' ? '600' : 'normal')
            .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)')
            .style('pointer-events', 'none');

        nodeEnter.append('text')
            .attr('class', 'mg-badge')
            .attr('dy', '-0.8em')
            .attr('x', d => d.children || d._children ? -12 : 12)
            .attr('text-anchor', d => d.children || d._children ? 'end' : 'start')
            .text(d => d._children ? `+${d._children.length} ${d.data._type === 'value' ? 'Projects' : ''}` : '')
            .style('fill', '#9ca3af')
            .style('font-size', '10px');

        // -- Links --
        const linkSel = this.linksLayer.selectAll('path.link')
            .data(links, d => d.target.id);

        const linkEnter = linkSel.enter().insert('path', 'g')
            .attr('class', 'link')
            .style('fill', 'none')
            .style('stroke', 'rgba(107,114,128,0.4)')
            .style('stroke-width', '2px')
            .attr('d', d => {
                const o = {x: source.x0 || this.root.x, y: source.y0 || this.root.y};
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

        // Updates
        const nodeUpdate = nodeEnter.merge(nodeSel);
        nodeUpdate.transition().duration(duration)
            .attr('transform', d => `translate(${d.y},${d.x})`);
            
        nodeUpdate.select('circle').transition().duration(duration)
            .attr('r', d => d.data._type === 'root' ? 10 : d.data._type === 'category' ? 8 : 6)
            .attr('fill', d => getColor(d));
            
        nodeUpdate.select('.mg-badge')
            .text(d => d._children ? `+${d._children.length} ${d.data._type === 'value' ? 'Projects' : ''}` : '');

        const nodeExit = nodeSel.exit().transition().duration(duration)
            .attr('transform', `translate(${source.y},${source.x})`).remove();
        nodeExit.select('circle').attr('r', 0);

        nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
        
        // -- Lineage Links --
        this.updateLineageLinks(nodes, duration);
    }
    
    updateLineageLinks(nodes, duration) {
        // Build map of ALL visible project nodes by their actual project path
        const nodesByPath = {};
        nodes.forEach(d => {
            if (d.data._project && d.data._project.path) {
                if (!nodesByPath[d.data._project.path]) {
                    nodesByPath[d.data._project.path] = [];
                }
                nodesByPath[d.data._project.path].push(d);
            }
        });
        
        const lineageLinksData = this.buildLineageLinks(nodesByPath);
        
        const lineageSel = this.lineageLayer.selectAll('.lineage-link')
            .data(lineageLinksData, d => d.source.id + '-' + d.target.id);
            
        // Calculate arc
        const drawArc = (d) => {
            const dx = d.target.y - d.source.y,
                  dy = d.target.x - d.source.x,
                  dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // multiplier controls arc curve
            return `M${d.source.y},${d.source.x}A${dr},${dr} 0 0,1 ${d.target.y},${d.target.x}`;
        };

        const lineageEnter = lineageSel.enter().append('path')
            .attr('class', 'lineage-link')
            .style('fill', 'none')
            .style('stroke', '#6b7280') // gray
            .style('stroke-width', '1.5px')
            .style('stroke-dasharray', '4,4')
            .style('stroke-opacity', 0)
            .attr('d', drawArc)
            .style('pointer-events', 'none'); // Let pointer events fall through to nodes below
            
        const lineageUpdate = lineageEnter.merge(lineageSel);
        
        lineageUpdate.transition().duration(duration)
            .style('stroke-opacity', 0.4)
            .attr('d', drawArc);
            
        lineageSel.exit().transition().duration(duration)
            .style('stroke-opacity', 0)
            .remove();
    }

    updateActionBar(project) {
        const actionBar = document.getElementById('mg-action-bar');
        if (actionBar && project) {
            const escapedPath = project.path.replace(/\\/g, '\\\\').replace(/"/g, '&quot;');
            actionBar.innerHTML = `
                <span style="color: #9ca3af; font-size: 13px; align-self: center; margin-right: auto;">Selected: <strong>${project.displayName || project.name}</strong></span>
                <button class="btn btn-sm btn-secondary" onclick="window.projectScanner.showProjectDetailsModal(window.projectScanner.projects.find(p => p.path === '${escapedPath}'))" style="padding: 4px 8px; font-size: 12px;">View Details</button>
                <button class="btn btn-sm btn-secondary" onclick="window.electronAPI.openFolder('${escapedPath}')" style="padding: 4px 8px; font-size: 12px;">Open Folder</button>
                <button class="btn btn-sm btn-primary" onclick="window.exportLineage('${escapedPath}')" style="padding: 4px 8px; font-size: 12px;">Export Lineage</button>
            `;
        }
    }
}

window.renderMetaFoldMetadataGraph = (containerId, data) => {
    const graph = new MetaFoldMetadataGraph(containerId);
    graph.render(data);
};
