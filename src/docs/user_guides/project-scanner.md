# Project Discovery & Scanner

The Project Scanner is one of MetaFold's most powerful features, designed to discover, analyze, and visualize your existing research projects. Whether you have dozens or hundreds of MetaFold projects, the scanner helps you understand patterns, find relationships, and maintain organized research data across your entire research ecosystem.

![Project Scanner Overview](images/project-scanner-overview.png)

## What Project Scanner Does

### Core Capabilities

🔍 **Recursive Discovery**
- Scans any directory tree for MetaFold projects
- Finds all `elabftw-metadata.json` files automatically
- Respects file permissions and handles access errors gracefully
- Configurable depth limits for large directory structures

📊 **Comprehensive Analysis**
- Aggregates metadata from all discovered projects
- Calculates statistics and identifies patterns
- Maps relationships between projects
- Tracks temporal evolution of your research

📈 **Rich Visualizations**
- Interactive network graphs of project relationships
- Timeline views of research progress
- Template usage analysis and patterns
- Export capabilities for presentations and reports

🔗 **Integration Discovery**
- Identifies projects with elabFTW integration
- Finds OMERO-linked datasets
- Maps cross-system relationships
- Highlights incomplete integrations

![Scanner Capabilities](images/scanner-capabilities.png)

### Use Cases

**Individual Researchers**:
- Rediscover old projects and their organization
- Understand your research evolution over time
- Find related experiments across different time periods
- Identify template usage patterns

**Research Teams**:
- Discover all team projects across shared storage
- Identify collaboration patterns and relationships
- Find gaps in documentation or integration
- Standardize project organization across team members

**Lab Managers**:
- Audit research data organization across the lab
- Identify best practices and common templates
- Monitor integration usage and completeness
- Generate reports on research data management

**Institutional Data Managers**:
- Assess MetaFold adoption across research groups
- Identify training needs and support requirements
- Monitor compliance with data management policies
- Generate institutional research data reports

## Getting Started with Project Scanner

### Accessing the Scanner

1. **Open MetaFold**
2. **Navigate to Discover Projects Tab**
   - Click the **🔍 Discover Projects** tab
   - You'll see the main scanner interface

   ![Scanner Interface](images/scanner-interface.png)

3. **Interface Overview**
   - **Scan Controls**: Directory selection and scan options
   - **Results Panel**: Discovered projects and statistics
   - **Filter and Search**: Tools to find specific projects
   - **Actions**: Export, visualize, and management options

### Your First Scan

1. **Select Directory to Scan**
   - Click **"Select Directory"** button
   - Choose root directory containing your MetaFold projects
   - Can be any level (home directory, research folder, etc.)

   ![Select Directory](images/scanner-select-directory.png)

2. **Configure Scan Options**
   - **Max Depth**: How deep to scan (default: 5 levels)
   - **Include Hidden**: Whether to scan hidden directories
   - **Performance Mode**: Fast scan vs detailed analysis

   ![Scan Options](images/scanner-options.png)

3. **Start Scan**
   - Click **"Start Scan"** button
   - Progress indicator shows scan status
   - Large directories may take several seconds

   ![Scan Progress](images/scanner-progress.png)

4. **Review Results**
   - Scan overview with total projects found
   - Project list with key information
   - Statistics and analysis summary

   ![Scan Results](images/scanner-results.png)

## Understanding Scan Results

### Overview Panel

The overview provides high-level statistics about your discovered projects:

**Basic Statistics**:
- **Total Projects**: Number of MetaFold projects found
- **Scanned Path**: Root directory that was scanned
- **Scan Duration**: Time taken to complete scan
- **Last Scan**: Timestamp of current scan

**Distribution Analysis**:
- **By Template**: Which templates are used most frequently
- **By Date Range**: Project creation timeline
- **By Integration**: elabFTW vs OMERO vs both vs neither
- **By Completion**: Projects with complete vs incomplete metadata

![Overview Panel](images/scanner-overview-panel.png)

### Project List

Each discovered project shows:

**Basic Information**:
- **Project Name**: Extracted from metadata or folder name
- **Path**: Relative path from scan root
- **Created**: Project creation date
- **Template**: Template used (if identified)

**Integration Status**:
- 🟢 **elabFTW**: Green if elabFTW integration detected
- 🔵 **OMERO**: Blue if OMERO integration detected
- 🔗 **Links**: Direct links to integrated systems

**Metadata Summary**:
- Key metadata fields and values
- Completion percentage
- Special fields (researcher, sample type, etc.)

![Project List](images/scanner-project-list.png)

### Quick Actions

For each project, you can:

**📂 Open Project Folder**
- Opens project directory in file explorer
- Quick access to project files and data

**📄 View Metadata**
- Shows complete metadata in popup
- JSON view with syntax highlighting
- Copy metadata for analysis

**🔗 Open Integrations**
- Direct links to elabFTW experiments
- Quick access to OMERO datasets
- Status indicators for integration health

**📊 Visualize Project**
- Add project to visualization queue
- Include in network analysis
- Show project relationships

![Project Actions](images/scanner-project-actions.png)

## Advanced Analysis Features

### Statistical Analysis

**Template Usage Analysis**:
- Which templates are most popular
- Template evolution over time
- Template complexity metrics
- Unused or abandoned templates

**Temporal Patterns**:
- Project creation frequency over time
- Seasonal research patterns
- Research intensity periods
- Long-term trends

**Integration Adoption**:
- Percentage of projects using elabFTW
- OMERO adoption rates
- Combined integration usage
- Integration success rates

![Statistical Analysis](images/scanner-statistical-analysis.png)

### Relationship Discovery

**Hierarchical Relationships**:
- Parent-child project relationships
- Nested project structures
- Project families and series

**Metadata Relationships**:
- Projects with similar metadata
- Shared researcher collaborations
- Common experimental parameters
- Related sample types or methods

**Temporal Relationships**:
- Sequential experiments
- Time-series project groups
- Follow-up studies
- Longitudinal research patterns

**Integration Relationships**:
- Projects linked through elabFTW experiments
- OMERO dataset families
- Cross-system project networks

![Relationship Discovery](images/scanner-relationship-discovery.png)

### Search and Filtering

**Text Search**:
- Search project names, descriptions, and metadata
- Full-text search across all discovered content
- Regular expression support for advanced users
- Highlight search terms in results

**Metadata Filtering**:
- Filter by specific metadata field values
- Date range filtering for project creation
- Template type filtering (folder vs experiment)
- Integration status filtering

**Advanced Filters**:
- Complex filter combinations (AND/OR logic)
- Saved filter presets for common searches
- Exclude patterns for unwanted results
- Custom filter expressions

![Search and Filtering](images/scanner-search-filtering.png)

## Data Visualization

### Visualization Options

The Project Scanner integrates with MetaFold's visualization system to provide multiple views of your data:

**Network Graph View**:
- Projects as nodes, relationships as edges
- Color-coded by template type or date
- Interactive exploration with zoom and pan
- Cluster detection for related projects

**Timeline View**:
- Chronological project layout
- Research activity over time
- Project milestone tracking
- Trend identification

**Hierarchy View**:
- Tree structure of nested projects
- Parent-child relationships
- Folder organization visualization
- Department or team structure

**Statistical Charts**:
- Template usage pie charts
- Integration adoption bar charts
- Timeline histograms
- Correlation matrices

![Visualization Options](images/scanner-visualization-options.png)

### Creating Visualizations

1. **Select Projects for Visualization**
   - Use checkboxes to select interesting projects
   - Apply filters to focus on specific subsets
   - Choose "Select All" for complete overview

2. **Choose Visualization Type**
   - Click **"Visualize Selected"** button
   - Select preferred visualization method
   - Configure visualization parameters

3. **Explore Interactive Visualization**
   - Pan, zoom, and interact with the visualization
   - Click nodes/elements for detailed information
   - Export visualization as image or data

![Creating Visualizations](images/scanner-creating-visualizations.png)

### Interpretation Tips

**Network Graphs**:
- **Dense Clusters**: Indicate related research areas or intensive collaboration
- **Isolated Nodes**: May represent unique experiments or new research directions
- **Bridge Nodes**: Projects connecting different research areas
- **Central Hubs**: Core projects with many relationships

**Timeline Views**:
- **Activity Peaks**: Periods of intensive research activity
- **Gaps**: Potential breaks in research or data management
- **Trends**: Evolution of research focus over time
- **Cycles**: Recurring research patterns or seasonal work

## Export and Reporting

### Export Options

**Raw Data Export**:
- CSV format with all project metadata
- JSON format for programmatic analysis
- Excel format with multiple sheets for different analyses
- XML format for institutional systems

**Visualization Export**:
- High-resolution images (PNG, SVG) for presentations
- Interactive HTML for web sharing
- PDF reports with embedded visualizations
- PowerPoint-compatible formats

**Summary Reports**:
- Executive summary of research data organization
- Detailed statistical analysis reports
- Integration usage and compliance reports
- Template usage and effectiveness analysis

![Export Options](images/scanner-export-options.png)

### Report Generation

**Automatic Report Types**:

1. **Research Overview Report**
   - Total projects and timeline
   - Template usage statistics
   - Integration adoption metrics
   - Key findings and recommendations

2. **Compliance Report**
   - Data management policy adherence
   - Integration completeness assessment
   - Missing metadata identification
   - Recommended improvements

3. **Collaboration Analysis**
   - Cross-researcher project relationships
   - Team collaboration patterns
   - Shared resource usage
   - Knowledge transfer opportunities

4. **Template Effectiveness Report**
   - Template usage frequency and success
   - Metadata completeness by template
   - User satisfaction indicators
   - Template optimization recommendations

![Report Types](images/scanner-report-types.png)

## Practical Use Cases

### Use Case 1: Lab Audit and Organization

**Scenario**: Lab manager wants to understand current data organization

**Workflow**:
1. **Full Lab Scan**: Scan entire lab shared storage
2. **Identify Patterns**: Analyze template usage and project organization
3. **Find Gaps**: Identify projects missing integrations or metadata
4. **Generate Report**: Create comprehensive lab data management report
5. **Plan Improvements**: Use findings to improve lab data practices

**Expected Findings**:
- Most popular templates and their effectiveness
- Integration adoption rates across lab members
- Projects needing better organization
- Opportunities for standardization

![Lab Audit Use Case](images/scanner-lab-audit.png)

### Use Case 2: Personal Research Review

**Scenario**: Individual researcher preparing for annual review

**Workflow**:
1. **Personal Project Scan**: Scan personal research directories
2. **Timeline Analysis**: Review research activity over review period
3. **Productivity Metrics**: Analyze project completion and output
4. **Create Visualizations**: Generate network graphs showing research connections
5. **Export Summary**: Create report for review documentation

**Expected Outputs**:
- Visual representation of research activities
- Statistics on project completion and methodology
- Evidence of research productivity and organization
- Basis for future research planning

### Use Case 3: Collaboration Discovery

**Scenario**: Research team wants to identify collaboration opportunities

**Workflow**:
1. **Team Directory Scan**: Scan shared team storage
2. **Relationship Analysis**: Identify projects with overlapping metadata
3. **Researcher Network**: Map collaboration patterns
4. **Resource Sharing**: Find common methodologies and tools
5. **Plan Collaboration**: Use findings to plan future joint projects

**Expected Benefits**:
- Discover hidden research connections
- Identify potential collaboration partners
- Find opportunities for resource sharing
- Improve team research coordination

![Collaboration Discovery](images/scanner-collaboration-discovery.png)

## Advanced Features

### Automated Scanning

**Scheduled Scans**:
- Set up automatic daily or weekly scans
- Monitor research activity continuously
- Track changes in project organization over time
- Alert on new projects or missing integrations

**Watch Directories**:
- Monitor specific directories for new MetaFold projects
- Automatic integration checking for new projects
- Real-time updates to scan results
- Notification of project creation or changes

### Integration with External Systems

**Institutional Repositories**:
- Export project metadata to institutional systems
- Connect with research information management systems
- Support for standard metadata formats (Dublin Core, DataCite)
- Integration with ORCID and researcher profiles

**Analysis Tools**:
- Export data for R, Python, or MATLAB analysis
- API endpoints for custom analysis scripts
- Integration with statistical analysis packages
- Support for machine learning and data mining

### Custom Analysis Scripts

**Metadata Analysis**:
- Custom scripts for domain-specific metadata analysis
- Pattern recognition in research methodologies
- Automated quality assessment of project organization
- Predictive analytics for research trends

**Template Optimization**:
- Analyze template effectiveness and usage patterns
- Recommend template improvements based on usage data
- Identify opportunities for template consolidation
- Suggest new templates based on common patterns

## Troubleshooting

### Common Issues

**❌ No Projects Found**

*Symptoms*: Scan completes but shows zero projects

*Solutions*:
- Verify you're scanning directories that contain MetaFold projects
- Check that `elabftw-metadata.json` files exist in project folders
- Increase scan depth if projects are deeply nested
- Verify file permissions allow reading project directories

**❌ Scan Takes Too Long**

*Symptoms*: Scan never completes or takes excessively long

*Solutions*:
- Reduce scan depth to limit directory traversal
- Exclude large irrelevant directories (system folders, backups)
- Use performance mode for faster scanning
- Scan smaller directory subsets

**❌ Incomplete Project Information**

*Symptoms*: Projects found but missing metadata or details

*Solutions*:
- Check that metadata files are valid JSON
- Verify metadata files have proper read permissions
- Look for corrupted or partial metadata files
- Re-scan with detailed analysis mode enabled

**❌ Visualization Errors**

*Symptoms*: Cannot create visualizations or they appear incorrect

*Solutions*:
- Ensure sufficient projects selected for meaningful visualization
- Check that relationship data is available
- Try different visualization types
- Reduce dataset size for complex visualizations

![Scanner Troubleshooting](images/scanner-troubleshooting.png)

### Performance Optimization

**Large Dataset Handling**:
- Use progressive scanning for very large directories
- Enable caching for frequently scanned locations
- Optimize filter criteria to reduce processing
- Consider batch processing for institutional-scale scans

**Memory Management**:
- Monitor system memory during large scans
- Close other applications during intensive scanning
- Use streaming processing for very large datasets
- Configure appropriate scan batch sizes

## Best Practices

### Effective Scanning Strategy

**Regular Maintenance Scans**:
- Schedule weekly or monthly scans of active research directories
- Monitor changes in project organization over time
- Track integration adoption and compliance
- Identify projects needing attention or updates

**Strategic Analysis**:
- Focus scans on specific research questions or time periods
- Use filters to isolate relevant project subsets
- Combine multiple scan results for comprehensive analysis
- Document findings and track improvements over time

### Data Quality Management

**Metadata Consistency**:
- Use scanner results to identify inconsistent metadata
- Standardize field naming and value formats
- Implement quality checks based on scan findings
- Monitor metadata completeness across projects

**Integration Health**:
- Regular monitoring of integration success rates
- Identify and fix broken integration links
- Track adoption of new integration features
- Maintain up-to-date integration configurations

### Institutional Implementation

**Rollout Strategy**:
- Start with pilot scans in individual labs
- Expand to department-wide analysis
- Implement institutional reporting and monitoring
- Provide training based on common usage patterns

**Policy Development**:
- Use scan results to inform data management policies
- Establish standards based on observed best practices
- Monitor compliance with institutional requirements
- Adapt policies based on usage analytics

## Next Steps

Now that you understand Project Scanner:

- **[Learn Data Visualization](data-visualization.md)** to create compelling visuals of your research data
- **[Explore User Management](user-management.md)** for team-based project discovery
- **[Advanced Template Design](templates.md)** optimized for discovery and analysis
- **[Security Features](security.md)** for protecting sensitive project information

---

*The Project Scanner transforms MetaFold from a project creation tool into a comprehensive research data observatory!*