# Data Visualization

MetaFold's visualization system transforms your research data into interactive, explorable visual representations. Whether you're analyzing project metadata, exploring relationships discovered by the Project Scanner, or presenting research organization to stakeholders, the visualization tools help you see patterns and insights that aren't obvious in raw data.

![Data Visualization Overview](images/data-visualization-overview.png)

## Visualization Capabilities

### What You Can Visualize

🌐 **Project Networks**
- Interactive graphs showing relationships between projects
- Color-coded nodes based on templates, dates, or metadata
- Connection strength based on shared attributes
- Cluster detection for related research areas

📊 **Template Schemas**
- Metadata field structures and relationships
- Template complexity and field usage patterns
- Cross-template comparisons and compatibility
- Schema evolution over time

🔍 **Project Scanner Results**
- Comprehensive views of discovered project ecosystems
- Statistical dashboards with research metrics
- Timeline views of research activity
- Integration status and adoption patterns

📈 **Custom JSON Data**
- Import external datasets for visualization
- Flexible data structure support
- Research collaboration networks
- Publication and citation relationships

![Visualization Types](images/visualization-types.png)

### Visualization Engines

**JSONCrack (Default)**
- Interactive JSON data exploration
- Automatic layout and organization
- Real-time data filtering and search
- Export capabilities for sharing

**D3.js Integration** (Advanced)
- Custom chart types and layouts
- Statistical visualizations
- Time-series analysis
- Publication-quality graphics

**Future Engines**
- React Flow for workflow visualization
- Cytoscape for complex network analysis
- Plotly for scientific plotting

## Getting Started

### Accessing Visualizations

1. **Navigate to Visualize Tab**
   - Click **📊 Visualize Data** tab in MetaFold
   - You'll see the visualization interface

   ![Visualization Interface](images/visualization-interface.png)

2. **Choose Data Source**
   - **Template Data**: Visualize your template schemas
   - **Scanned Projects**: Use Project Scanner results
   - **Load JSON**: Import custom data files
   - **Recent Projects**: Quick access to recent work

   ![Data Source Selection](images/data-source-selection.png)

### Your First Visualization

**Method 1: Visualize Template Data**

1. **Select "Template Data" Source**
2. **Choose Templates to Include**
   - Select specific templates or "All Templates"
   - Filter by template type (folder vs experiment)
3. **Generate Visualization**
   - Click "Visualize Templates"
   - Interactive schema view appears
4. **Explore Structure**
   - Click nodes to see field details
   - Expand/collapse template sections
   - Use search to find specific fields

![Template Visualization](images/template-visualization.png)

**Method 2: Visualize Project Scanner Results**

1. **Run Project Scanner First** (if not done)
   - Go to **🔍 Discover Projects** tab
   - Scan your research directories
2. **Return to Visualize Tab**
3. **Select "Scanned Projects" Source**
4. **Choose Visualization Type**
   - Network view for project relationships
   - Timeline view for temporal patterns
   - Statistical dashboard for metrics
5. **Explore Interactive Results**

![Scanner Visualization](images/scanner-visualization.png)

## Working with Visualizations

### Navigation and Interaction

**Basic Controls**:
- **Zoom**: Mouse wheel or pinch gesture
- **Pan**: Click and drag background
- **Select**: Click nodes or edges for details
- **Search**: Use search box to find elements
- **Reset**: Return to default view

**Advanced Interactions**:
- **Multi-select**: Hold Ctrl/Cmd while clicking
- **Context menus**: Right-click for additional options
- **Keyboard shortcuts**: Arrow keys for navigation
- **Touch support**: Full mobile and tablet compatibility

![Visualization Controls](images/visualization-controls.png)

### Customization Options

**Visual Appearance**:
- **Color Schemes**: Choose from predefined palettes
- **Node Sizes**: Based on data attributes or fixed
- **Layout Algorithms**: Force-directed, hierarchical, circular
- **Labels**: Show/hide, font size, positioning

**Data Filtering**:
- **Date Ranges**: Focus on specific time periods
- **Template Types**: Show only folders or experiments
- **Integration Status**: Highlight elabFTW/OMERO projects
- **Metadata Values**: Filter by specific field values

**Layout Options**:
- **Automatic Layout**: Let algorithm organize elements
- **Manual Positioning**: Drag nodes to custom positions
- **Grid Layout**: Organized rows and columns
- **Hierarchical**: Tree-like structure for related elements

![Customization Options](images/customization-options.png)

## Visualization Types in Detail

### Project Network Graphs

**Purpose**: Show relationships and connections between research projects

**Best For**:
- Understanding collaboration patterns
- Identifying research clusters and themes
- Finding related or similar experiments
- Visualizing research group structure

**How to Read**:
- **Nodes**: Individual projects
- **Edges**: Relationships (shared metadata, temporal connections, etc.)
- **Colors**: Template types, researchers, or dates
- **Size**: Project complexity, file count, or importance
- **Clusters**: Groups of related projects

![Project Network Graph](images/project-network-graph.png)

**Interaction Features**:
- Click nodes to see project details
- Follow edges to understand relationships
- Use zoom to focus on specific clusters
- Search for projects by name or metadata

### Template Schema Views

**Purpose**: Visualize metadata structure and field relationships

**Best For**:
- Understanding template complexity
- Comparing different template designs
- Identifying common fields across templates
- Planning template improvements

**How to Read**:
- **Root Nodes**: Template names
- **Child Nodes**: Metadata fields
- **Connections**: Field groups and dependencies
- **Colors**: Field types (text, number, date, etc.)
- **Shapes**: Required vs optional fields

![Template Schema View](images/template-schema-view.png)

**Design Insights**:
- Identify overly complex templates
- Find commonly used field patterns
- Spot opportunities for template consolidation
- Understand field usage across projects

### Timeline Visualizations

**Purpose**: Show research activity and project evolution over time

**Best For**:
- Tracking research productivity
- Identifying busy periods and gaps
- Understanding research progression
- Planning future work based on historical patterns

**How to Read**:
- **X-axis**: Time (days, months, years)
- **Y-axis**: Activity level or project count
- **Points**: Individual projects or milestones
- **Colors**: Different researchers, templates, or project types
- **Patterns**: Trends, cycles, and anomalies

![Timeline Visualization](images/timeline-visualization.png)

### Statistical Dashboards

**Purpose**: Provide quantitative overview of research data organization

**Best For**:
- Lab management and reporting
- Understanding template adoption
- Monitoring integration usage
- Identifying areas for improvement

**Key Metrics**:
- Project count by template type
- Integration adoption percentages
- Metadata completeness scores
- Researcher activity levels
- Temporal distribution patterns

![Statistical Dashboard](images/statistical-dashboard.png)

## Advanced Visualization Features

### Multi-Layer Analysis

**Combining Data Sources**:
- Overlay Project Scanner results with template data
- Show integration status alongside project relationships
- Combine temporal data with network analysis
- Multi-dimensional filtering and exploration

**Cross-System Visualization**:
- Display elabFTW experiment connections
- Show OMERO dataset relationships
- Visualize cross-platform data flows
- Integration health monitoring

![Multi-Layer Analysis](images/multi-layer-analysis.png)

### Custom Data Import

**Supported Formats**:
- JSON (structured data with any schema)
- CSV (converted to JSON internally)
- Excel files (multiple sheets supported)
- XML (research data formats)

**Example Use Cases**:
- Publication and citation networks
- Collaboration matrices from grant databases
- Equipment usage and scheduling data
- External research information systems

**Import Process**:
1. Click "Load JSON" or "Import Data"
2. Select file or paste JSON data
3. Configure data mapping and structure
4. Choose visualization type
5. Customize appearance and layout

![Custom Data Import](images/custom-data-import.png)

### Export and Sharing

**Image Export**:
- High-resolution PNG for presentations
- SVG format for scalable graphics
- PDF export with multiple pages
- Print-optimized layouts

**Interactive Export**:
- Standalone HTML files for web sharing
- Embedded visualizations for websites
- Interactive PDFs with clickable elements
- PowerPoint integration

**Data Export**:
- Processed data in JSON format
- Analysis results as CSV
- Statistical summaries
- Relationship matrices

![Export Options](images/visualization-export-options.png)

## Practical Applications

### Research Group Management

**Use Case**: Lab manager wants to understand group research organization

**Workflow**:
1. **Run Project Scanner** on lab shared storage
2. **Create Network Visualization** showing all projects
3. **Color-code by Researcher** to see individual contributions
4. **Identify Clusters** of related work
5. **Generate Report** with visual insights

**Insights Gained**:
- Research collaboration patterns
- Individual vs collaborative projects
- Research theme identification
- Resource sharing opportunities

![Research Group Visualization](images/research-group-visualization.png)

### Template Design Optimization

**Use Case**: Researcher wants to improve template designs

**Workflow**:
1. **Visualize All Templates** using schema view
2. **Compare Complexity** across different templates
3. **Identify Common Patterns** in successful templates
4. **Find Unused Fields** or redundant structures
5. **Design Improved Templates** based on insights

**Optimization Results**:
- Simplified templates with better usability
- Standardized field names across templates
- Reduced metadata burden on users
- Improved template adoption rates

### Publication and Presentation

**Use Case**: Researcher preparing conference presentation on data management

**Workflow**:
1. **Create Timeline View** of research activities
2. **Generate Network Graph** showing project relationships
3. **Export High-Resolution Images** for slides
4. **Create Interactive Demo** for audience exploration
5. **Prepare Data Stories** with visual narratives

**Presentation Benefits**:
- Visual evidence of organized research approach
- Clear demonstration of data management practices
- Engaging audience interaction possibilities
- Professional appearance for grant applications

![Presentation Visualization](images/presentation-visualization.png)

## Troubleshooting

### Common Issues

**❌ Empty or Minimal Visualization**

*Symptoms*: Visualization shows few or no elements

*Solutions*:
- Ensure data source contains sufficient information
- Check filters aren't excluding too much data
- Verify Project Scanner has run successfully
- Use "Show All" option to see complete dataset

**❌ Performance Issues with Large Datasets**

*Symptoms*: Slow loading, unresponsive interface

*Solutions*:
- Apply filters to reduce dataset size
- Use statistical sampling for very large datasets
- Close other browser tabs to free memory
- Try different visualization engines

**❌ Unclear or Confusing Layouts**

*Symptoms*: Overlapping elements, unclear relationships

*Solutions*:
- Try different layout algorithms
- Adjust node spacing and size
- Use hierarchical layout for structured data
- Apply clustering to group related elements

**❌ Export Problems**

*Symptoms*: Cannot export or poor quality exports

*Solutions*:
- Check browser permissions for downloads
- Try different export formats
- Adjust resolution settings for images
- Use "Save As" for alternative save methods

![Visualization Troubleshooting](images/visualization-troubleshooting.png)

### Performance Optimization

**Browser Optimization**:
- Use modern browsers with WebGL support
- Close unnecessary tabs and applications
- Ensure sufficient RAM for large visualizations
- Update browser to latest version

**Data Optimization**:
- Filter data to focus on relevant subsets
- Use sampling for exploratory analysis
- Cache frequently used datasets
- Optimize JSON structure for faster loading

## Best Practices

### Effective Visualization Design

**Choose Appropriate Visualizations**:
- Network graphs for relationships and connections
- Timeline views for temporal patterns
- Statistical charts for quantitative analysis
- Schema views for structural understanding

**Optimize for Audience**:
- Simple layouts for general audiences
- Detailed views for technical users
- Interactive elements for exploratory analysis
- Static exports for formal presentations

**Tell Data Stories**:
- Start with overview, then zoom to details
- Use color and size to highlight key insights
- Provide clear legends and labels
- Include context and interpretation

![Visualization Best Practices](images/visualization-best-practices.png)

### Integration with Research Workflow

**Regular Visualization Reviews**:
- Monthly visualization of project progress
- Quarterly analysis of research organization
- Annual reviews for reporting and planning
- Real-time monitoring for active projects

**Team Collaboration**:
- Shared visualizations for team meetings
- Collaborative analysis sessions
- Visual project planning and coordination
- Cross-team knowledge sharing

**Documentation and Archiving**:
- Save visualizations with research documentation
- Include in grant applications and reports
- Archive key insights for future reference
- Share with collaborators and supervisors

## Future Developments

### Planned Features

**Enhanced Interactivity**:
- Real-time collaborative editing
- Annotation and commenting systems
- Version control for visualizations
- Integration with presentation tools

**Advanced Analytics**:
- Machine learning pattern detection
- Predictive analytics for research trends
- Statistical significance testing
- Correlation analysis automation

**Extended Data Sources**:
- Direct integration with research databases
- Real-time data feeds from lab equipment
- Social network analysis from collaboration tools
- Publication and citation network integration

**Improved Export Options**:
- Virtual reality visualization export
- Augmented reality overlay capabilities
- 3D printing of network structures
- Integration with data analysis software

## Next Steps

Now that you understand data visualization:

- **[Explore User Management](user-management.md)** for team-based visualization workflows
- **[Learn Security Features](security.md)** for protecting sensitive research data
- **[Advanced Template Design](templates.md)** optimized for visualization and analysis
- **[Integration Workflows](combined-integrations.md)** for comprehensive data visualization

---

*Transform your research data into compelling visual stories that reveal hidden patterns and drive scientific insights!*