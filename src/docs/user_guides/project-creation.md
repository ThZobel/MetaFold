# Creating Projects

Project creation is where your templates come to life as organized research structures. This guide covers everything from basic project creation to advanced workflows, batch operations, and integration with laboratory systems.

![Project Creation Overview](images/project-creation-overview.png)

## Understanding Project Creation

### What Happens During Project Creation

When you create a MetaFold project, the system:

1. **Generates Folder Structure** - Creates directories based on template
2. **Collects Metadata** - Captures information through dynamic forms
3. **Creates Metadata File** - Stores project information as `elabftw-metadata.json`
4. **Triggers Integrations** - Creates entries in elabFTW and/or OMERO
5. **Establishes Links** - Connects local project with external systems

![Project Creation Process](images/project-creation-process-detailed.png)

### Project Types

**Simple Projects (Folder Templates)**
- Basic directory structure
- Minimal metadata collection
- No external integrations
- Perfect for file organization

**Experiment Projects (Experiment Templates)**
- Rich metadata schemas
- Laboratory system integration
- Advanced validation and workflows
- Designed for scientific research

![Project Types](images/project-types-creation.png)

## Basic Project Creation Workflow

### Step 1: Template Selection

**Access Project Creation**
1. Navigate to **🚀 Create Project** tab
2. Review available templates
3. Use template preview to understand structure
4. Consider integration requirements

**Template Preview Features**
- **Folder Structure** - Visual tree of directories to be created
- **Metadata Fields** - Preview of form fields and requirements
- **Integration Status** - Which systems will be connected
- **Template Information** - Description, author, last updated

![Template Selection](images/template-selection-creation.png)

**Choosing the Right Template**
- **Project Complexity** - Match template sophistication to project needs
- **Integration Requirements** - Consider whether you need elabFTW/OMERO
- **Metadata Completeness** - Ensure you can provide required information
- **Team Standards** - Use templates consistent with group practices

### Step 2: Location and Naming

**Project Location Selection**
1. **Browse Button** - Open directory selection dialog
2. **Path Validation** - Verify write permissions and space
3. **Location Memory** - System remembers recent locations
4. **Network Drives** - Support for shared and network storage

![Location Selection](images/location-selection-creation.png)

**Project Naming Best Practices**
- **Descriptive Names** - Clear indication of project purpose
- **Consistent Format** - Follow naming conventions
- **Date Integration** - Include dates for chronological organization
- **Avoid Special Characters** - Use alphanumeric, hyphens, and underscores

**Example Naming Patterns**
```
2025-06-13_Cell_Migration_Assay
Experiment_001_Microscopy_Analysis
Smith_Lab_Protein_Expression_Study
Temperature_Effect_Bacterial_Growth_2025Q2
```

### Step 3: Metadata Form Completion

**Dynamic Form Generation**
- Forms are generated automatically from template metadata schema
- Field types determine input validation and interface elements
- Required fields are clearly marked and enforced
- Help text provides guidance for each field

![Metadata Form](images/metadata-form-creation.png)

**Field Types and Interfaces**

**Text Fields**
- Single-line text input
- Character limits and validation
- Autocomplete based on previous entries
- Pattern matching for structured data

**Textarea Fields**
- Multi-line text input
- Rich text editing capabilities
- Word count and character limits
- Markdown support for formatting

**Date Fields**
- Calendar picker interface
- Date format validation
- Range restrictions (past/future limits)
- Relative date options (today, yesterday, etc.)

**Dropdown Fields**
- Predefined option selection
- Search and filter capabilities
- Custom option addition (if enabled)
- Hierarchical option structures

**Checkbox and Radio Fields**
- Boolean true/false selection
- Multiple choice selection
- Visual grouping of related options
- Conditional logic triggering

![Field Types](images/field-types-creation.png)

### Step 4: Integration Configuration

**Integration Options Panel**
When integrations are available, you'll see configuration options for:

**elabFTW Integration**
- **Experiment Type** - Choose appropriate elabFTW experiment category
- **Team Selection** - Target team for experiment creation
- **Tags** - Add relevant tags for organization
- **Visibility** - Public, team, or private experiment

**OMERO Integration**
- **Group Selection** - Choose OMERO group for dataset
- **Project Linking** - Connect to existing OMERO project or create new
- **Dataset Name** - Customize dataset name (defaults to project name)
- **Permissions** - Set appropriate access permissions

![Integration Configuration](images/integration-configuration-creation.png)

### Step 5: Review and Create

**Pre-Creation Review**
- **Template Summary** - Confirm selected template and configuration
- **Project Details** - Verify name, location, and metadata
- **Integration Status** - Check that all integrations are properly configured
- **Validation Results** - Ensure all requirements are met

**Creation Process**
1. **Click "Create Project"** - Initiate the creation workflow
2. **Progress Monitoring** - Watch real-time progress indicators
3. **Error Handling** - Address any issues that arise during creation
4. **Completion Confirmation** - Receive success message and project links

![Review and Create](images/review-create-process.png)

## Advanced Project Creation Features

### Batch Project Creation

**Use Cases for Batch Creation**
- Multiple similar experiments in a series
- Template testing and validation
- Large-scale research initiatives
- Standardized project rollouts

**Batch Creation Interface**
1. **Enable Batch Mode** - Toggle batch creation option
2. **Project List** - Define multiple projects with variations
3. **Common Settings** - Shared configuration across all projects
4. **Individual Customization** - Project-specific modifications

![Batch Creation](images/batch-creation-interface.png)

**Batch Configuration Options**

**Naming Patterns**
```
Base Pattern: "Experiment_{counter}_Analysis"
Results: 
- Experiment_001_Analysis
- Experiment_002_Analysis
- Experiment_003_Analysis
```

**Metadata Variations**
- **Shared Fields** - Common values across all projects
- **Variable Fields** - Different values for each project
- **Auto-increment** - Automatic numbering or date progression
- **Template Substitution** - Pattern-based field population

**Sequential Creation**
- **Creation Order** - Control the sequence of project creation
- **Dependency Handling** - Wait for integration success before next project
- **Error Recovery** - Continue batch creation despite individual failures
- **Progress Tracking** - Monitor batch completion status

### Template Customization During Creation

**On-the-Fly Modifications**
Sometimes you need to modify a template for a specific project:

**Folder Structure Adjustments**
- **Add Folders** - Include additional directories for this project
- **Remove Folders** - Skip unnecessary directories
- **Rename Folders** - Customize folder names for specific needs
- **Nested Modifications** - Adjust subfolder structures

**Metadata Field Modifications**
- **Add Fields** - Include additional metadata for this project
- **Modify Options** - Change dropdown options or validation rules
- **Field Requirements** - Make optional fields required or vice versa
- **Default Values** - Override template defaults with project-specific values

![Template Customization](images/template-customization-creation.png)

**Saving Customizations**
- **One-time Use** - Apply changes only to current project
- **Save as New Template** - Create new template with modifications
- **Update Existing Template** - Modify the original template
- **Template Variants** - Create related template variations

### Advanced Integration Workflows

**Multi-System Integration**
When using both elabFTW and OMERO integrations:

**Workflow Coordination**
1. **Sequential Creation** - Create elabFTW experiment first, then OMERO dataset
2. **Cross-Reference** - Automatically link elabFTW and OMERO entries
3. **Metadata Synchronization** - Ensure consistent metadata across systems
4. **Error Recovery** - Handle partial integration failures gracefully

**Custom Field Mapping**
- **Field Translation** - Map MetaFold fields to system-specific fields
- **Data Transformation** - Convert data formats between systems
- **Selective Sync** - Choose which fields sync to which systems
- **Validation Rules** - Ensure data meets system requirements

![Multi-System Integration](images/multi-system-integration.png)

**Integration Error Handling**
- **Retry Logic** - Automatic retry of failed integration operations
- **Partial Success** - Handle cases where local creation succeeds but integration fails
- **Manual Recovery** - Tools to complete failed integrations later
- **Integration Health Monitoring** - Real-time status of all integrations

## Metadata Management During Creation

### Metadata Quality Assurance

**Real-time Validation**
- **Field Validation** - Immediate feedback on field completion
- **Cross-field Validation** - Ensure logical consistency between fields
- **Format Validation** - Check data formats and patterns
- **Business Logic** - Apply domain-specific validation rules

**Auto-completion and Suggestions**
- **History-based Suggestions** - Options based on previous entries
- **Template Defaults** - Smart defaults from template configuration
- **User Preferences** - Personal default values for common fields
- **Context-aware Suggestions** - Recommendations based on other field values

![Metadata Quality](images/metadata-quality-creation.png)

### Metadata Persistence and Recovery

**Auto-save Functionality**
- **Periodic Auto-save** - Automatic saving of form progress
- **Draft Management** - Preserve incomplete forms for later completion
- **Recovery Mechanisms** - Restore forms after unexpected application closure
- **Version History** - Track changes during form completion

**Metadata Templates**
- **Personal Templates** - Save commonly used metadata combinations
- **Team Templates** - Share metadata patterns within research groups
- **Smart Templates** - AI-suggested metadata based on project type
- **Quick Fill** - Rapidly populate forms with template data

### Metadata Export and Import

**Import Sources**
- **Previous Projects** - Copy metadata from existing projects
- **CSV Files** - Bulk import from spreadsheet data
- **JSON Schema** - Import from standardized schema formats
- **Integration Systems** - Pull metadata from elabFTW or OMERO

**Export Formats**
- **JSON** - Machine-readable format for programmatic use
- **CSV** - Spreadsheet-compatible format for analysis
- **XML** - Structured format for system integration
- **PDF** - Human-readable format for documentation

![Metadata Import Export](images/metadata-import-export.png)

## Project Organization Strategies

### Directory Structure Best Practices

**Hierarchical Organization**
```
Project_Root/
├── 01_Planning/
│   ├── protocols/
│   ├── literature/
│   └── notes/
├── 02_Data_Collection/
│   ├── raw_data/
│   ├── processed_data/
│   └── quality_control/
├── 03_Analysis/
│   ├── scripts/
│   ├── results/
│   └── figures/
├── 04_Documentation/
│   ├── reports/
│   ├── presentations/
│   └── manuscripts/
└── 05_Archive/
    ├── backups/
    └── deprecated/
```

**Functional Organization**
```
Project_Root/
├── data/
│   ├── raw/
│   ├── processed/
│   └── external/
├── code/
│   ├── analysis/
│   ├── visualization/
│   └── utilities/
├── docs/
│   ├── protocols/
│   ├── reports/
│   └── references/
├── results/
│   ├── figures/
│   ├── tables/
│   └── statistics/
└── admin/
    ├── correspondence/
    ├── permissions/
    └── metadata/
```

![Directory Organization](images/directory-organization-strategies.png)

### Project Naming Conventions

**Date-based Naming**
- `YYYY-MM-DD_Project_Description`
- `2025-06-13_Cell_Migration_Assay`
- Advantages: Chronological ordering, clear timeline

**Identifier-based Naming**
- `ProjectID_Description_Version`
- `CMG001_Cell_Migration_Assay_v1.2`
- Advantages: Unique identification, version tracking

**Hierarchical Naming**
- `Department_Lab_Project_Experiment`
- `Biology_SmithLab_CellMigration_TempEffect`
- Advantages: Clear organizational structure, searchability

**Functional Naming**
- `ProjectType_Method_Target_Condition`
- `Experiment_Microscopy_HeLaCells_TempStress`
- Advantages: Descriptive, method-focused

## Quality Control and Validation

### Pre-Creation Validation

**Template Validation**
- **Structure Integrity** - Verify template folder structure is valid
- **Metadata Schema** - Check metadata field definitions
- **Integration Compatibility** - Ensure template works with enabled integrations
- **Dependency Checking** - Verify all required components are available

**Environment Validation**
- **Disk Space** - Ensure sufficient storage for project creation
- **Permissions** - Verify write access to target location
- **Network Connectivity** - Check integration server accessibility
- **System Resources** - Confirm adequate CPU and memory

![Quality Control](images/quality-control-validation.png)

### Post-Creation Verification

**Structure Verification**
- **Folder Creation** - Confirm all directories were created correctly
- **File Permissions** - Verify appropriate access permissions
- **Metadata File** - Check metadata file integrity and completeness
- **Integration Success** - Confirm external system entries were created

**Integration Verification**
- **elabFTW Verification** - Check experiment creation and metadata population
- **OMERO Verification** - Confirm dataset creation and annotation
- **Cross-Reference** - Verify links between systems are correct
- **Accessibility** - Test access to integrated system entries

### Error Prevention and Recovery

**Common Creation Errors**
- **Insufficient Permissions** - Cannot write to target directory
- **Duplicate Names** - Project name conflicts with existing project
- **Integration Failures** - External system authentication or creation errors
- **Template Errors** - Invalid template structure or metadata schema

**Recovery Strategies**
- **Automatic Retry** - Retry failed operations with exponential backoff
- **Partial Recovery** - Complete local creation even if integrations fail
- **Manual Intervention** - Provide tools for manual error resolution
- **Rollback Capability** - Undo partial project creation if needed

![Error Recovery](images/error-recovery-strategies.png)

## Performance Optimization

### Large Project Handling

**Performance Considerations**
- **Directory Count** - Optimize for large numbers of directories
- **File System** - Consider file system limitations and performance
- **Network Storage** - Handle latency for network-attached storage
- **Concurrent Access** - Manage multiple users creating projects simultaneously

**Optimization Strategies**
- **Lazy Loading** - Create directories only when needed
- **Asynchronous Operations** - Non-blocking integration operations
- **Caching** - Cache frequently used templates and metadata
- **Resource Monitoring** - Track system resource usage during creation

### Batch Operation Optimization

**Batch Size Management**
- **Optimal Batch Sizes** - Balance throughput with resource usage
- **Memory Management** - Prevent memory exhaustion during large batches
- **Progress Tracking** - Provide detailed progress feedback
- **Error Isolation** - Prevent single failures from affecting entire batch

**Parallel Processing**
- **Concurrent Creation** - Multiple projects created simultaneously
- **Integration Queuing** - Queue integration operations for optimal throughput
- **Resource Allocation** - Balance CPU, memory, and network resources
- **Throttling** - Prevent overwhelming external systems

![Performance Optimization](images/performance-optimization-creation.png)

## Integration-Specific Creation Workflows

### elabFTW-Optimized Creation

**Pre-Creation Setup**
- **Team Selection** - Choose appropriate elabFTW team
- **Experiment Types** - Select relevant experiment category
- **Tag Strategy** - Plan tag usage for organization
- **Permission Model** - Understand sharing and visibility settings

**During Creation**
- **Metadata Mapping** - Map MetaFold fields to elabFTW extra fields
- **File Attachments** - Prepare any initial file attachments
- **Protocol Linking** - Connect to relevant elabFTW protocols
- **Status Setting** - Set appropriate initial experiment status

**Post-Creation Integration**
- **Experiment Enhancement** - Add additional content in elabFTW
- **Collaboration Setup** - Share with team members and collaborators
- **Workflow Integration** - Connect to broader elabFTW workflows
- **Documentation** - Add detailed experimental procedures

![elabFTW Creation Workflow](images/elabftw-creation-workflow.png)

### OMERO-Optimized Creation

**Pre-Creation Setup**
- **Group and Permissions** - Configure OMERO group settings
- **Project Hierarchy** - Plan OMERO project and dataset organization
- **Annotation Strategy** - Design map annotation approach
- **Storage Planning** - Consider data storage and organization

**During Creation**
- **Dataset Configuration** - Set up OMERO dataset with appropriate metadata
- **Map Annotations** - Transfer MetaFold metadata to OMERO annotations
- **Project Linking** - Connect to existing OMERO projects if applicable
- **Permission Setting** - Configure appropriate access permissions

**Post-Creation Workflow**
- **Image Import** - Prepare for image data import to dataset
- **Analysis Planning** - Set up for OMERO analysis workflows
- **Sharing Configuration** - Configure sharing for collaboration
- **Integration Testing** - Verify all connections work correctly

## Troubleshooting Project Creation

### Common Issues and Solutions

**Template-Related Issues**
- **Invalid Template Structure** - Fix folder path syntax and hierarchy
- **Metadata Schema Errors** - Correct field definitions and validation rules
- **Integration Conflicts** - Resolve template incompatibilities with integrations
- **Permission Problems** - Address template access and sharing issues

**Location and Storage Issues**
- **Path Too Long** - Shorten project names or move to higher directory level
- **Insufficient Space** - Free disk space or choose different location
- **Network Timeouts** - Use local storage or improve network connection
- **Permission Denied** - Check directory permissions and user access rights

**Integration Issues**
- **Authentication Failures** - Verify API keys and login credentials
- **Server Unavailable** - Check server status and network connectivity
- **Data Validation Errors** - Fix metadata to meet external system requirements
- **Rate Limiting** - Space out creation operations to avoid overwhelming servers

![Troubleshooting Guide](images/troubleshooting-creation.png)

### Diagnostic Tools

**Built-in Diagnostics**
- **Connection Testing** - Test integration connections before creation
- **Template Validation** - Verify template integrity and compatibility
- **Permission Checking** - Validate file system access rights
- **Resource Monitoring** - Monitor system resources during creation

**Log Analysis**
- **Creation Logs** - Detailed logs of project creation process
- **Integration Logs** - Specific logs for external system interactions
- **Error Logs** - Comprehensive error reporting and stack traces
- **Performance Logs** - Timing and performance metrics

## Best Practices for Project Creation

### Template Selection Best Practices

**Choose Appropriate Complexity**
- Start with simpler templates for new users
- Use complex templates only when features are needed
- Consider maintenance overhead of complex metadata schemas
- Balance standardization with flexibility

**Consider Integration Requirements**
- Plan integration needs before template selection
- Understand integration limitations and requirements
- Test integration workflows before widespread deployment
- Document integration setup for team members

![Best Practices](images/best-practices-creation.png)

### Metadata Best Practices

**Complete and Accurate Metadata**
- Fill all required fields completely and accurately
- Use consistent terminology and formats
- Include sufficient detail for future understanding
- Consider searchability and discoverability

**Forward-Thinking Metadata**
- Include information that may be needed later
- Use standardized vocabularies when possible
- Consider integration with institutional systems
- Plan for long-term data management and preservation

### Team Collaboration Best Practices

**Standardization**
- Use consistent templates across team members
- Establish naming conventions and follow them
- Share templates and best practices within the team
- Regular review and update of templates and workflows

**Communication and Coordination**
- Document project creation workflows
- Provide training for new team members
- Establish support channels for problems and questions
- Regular team meetings to discuss improvements and issues

## Next Steps

Now that you understand project creation:

1. **[Metadata Guide](metadata-guide.md)** - Master metadata design and management
2. **[elabFTW Integration](elabftw-integration.md)** - Connect with electronic lab notebooks
3. **[OMERO Integration](omero-integration.md)** - Integrate with image data management
4. **[Project Discovery](project-scanner.md)** - Find and analyze your created projects

---

*Master project creation to transform your research from chaos to organized, reproducible science!*