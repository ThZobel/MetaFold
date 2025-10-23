# Combined elabFTW + OMERO Workflows

Using both elabFTW and OMERO integrations together creates a comprehensive research data management ecosystem. Your experiments are documented in your electronic lab notebook while your image data is organized and searchable in OMERO - all connected through MetaFold's structured approach.

![Combined Integrations Overview](images/combined-integrations-overview.png)

## Why Use Both Together?

### Complementary Strengths

**elabFTW Excellence**:
- ✅ **Documentation** - Rich text experiment documentation
- ✅ **Protocols** - Step-by-step procedure tracking
- ✅ **Collaboration** - Team sharing and commenting
- ✅ **Timeline** - Chronological experiment history
- ✅ **File Attachments** - Supporting documents and results

**OMERO Excellence**:
- ✅ **Image Management** - Large-scale image data organization
- ✅ **Metadata Search** - Powerful annotation-based discovery
- ✅ **Analysis Integration** - Built-in and third-party analysis tools
- ✅ **Visualization** - Advanced image viewing and manipulation
- ✅ **Data Preservation** - Long-term structured storage

**Together They Provide**:
- 🎯 **Complete Traceability** - From hypothesis to publication
- 🔗 **Seamless Linking** - Cross-references between systems
- 📊 **Rich Context** - Both narrative and structured metadata
- 👥 **Team Efficiency** - Centralized yet specialized access
- 🔍 **Powerful Search** - Find experiments by any parameter

![Integration Strengths](images/integration-strengths-comparison.png)

## Setup Requirements

### Prerequisites

Before using combined workflows, ensure both integrations are working:

- ✅ **[elabFTW Integration Configured](elabftw-integration.md)** - API key and connection tested
- ✅ **[OMERO Integration Working](omero-integration.md)** - Python proxy running and authenticated
- ✅ **Both Services Accessible** - Network connectivity to both servers
- ✅ **Sufficient Permissions** - Create experiments in elabFTW and datasets in OMERO

![Combined Prerequisites](images/combined-prerequisites.png)

### Template Design Considerations

When designing templates for both systems, consider:

**Shared Metadata Fields**:
- Core experimental information used by both systems
- Standardized naming conventions
- Essential search parameters

**System-Specific Fields**:
- elabFTW: Narrative documentation, protocol references
- OMERO: Image acquisition parameters, technical metadata

**Cross-Reference Fields**:
- Links between elabFTW experiments and OMERO datasets
- Project identifiers and batch numbers

![Template Design for Both Systems](images/template-design-combined.png)

## Combined Workflow Guide

### Step 1: Enable Both Integrations

1. **Open Create Project Tab**
   - Navigate to **🚀 Create Project**
   - Select your template

2. **Enable Both Integrations**
   - ✅ Check **"Sync with elabFTW"**
   - ✅ Check **"Sync with OMERO"**
   - Both integration panels should show green status

   ![Enable Both Integrations](images/enable-both-integrations.png)

3. **Configure Integration Settings**
   
   **elabFTW Settings**:
   - Experiment type: Choose appropriate type
   - Team: Select target team
   - Tags: Add relevant tags
   
   **OMERO Settings**:
   - Group: Select OMERO group
   - Project: Choose existing or create new
   - Dataset name: Customize if needed

   ![Configure Both Integrations](images/configure-both-integrations.png)

### Step 2: Create Integrated Project

1. **Fill Metadata Form**
   - Complete all metadata fields
   - Data will be shared between both systems
   - Pay special attention to cross-referencing fields

2. **Create Project**
   - Click **"Create Project"**
   - MetaFold orchestrates both integrations
   - Wait for completion (may take longer than single integration)

3. **Verify Success**
   - Check success message shows both integrations
   - Follow links to verify both elabFTW experiment and OMERO dataset

![Combined Creation Success](images/combined-creation-success.png)

### Step 3: Cross-Reference Setup

**In elabFTW Experiment**:
1. Copy OMERO dataset URL from MetaFold success message
2. Add OMERO link to experiment documentation
3. Reference OMERO dataset ID in experiment notes

**In OMERO Dataset**:
1. Copy elabFTW experiment URL
2. Add as map annotation: `elabFTW_URL`
3. Include experiment ID in dataset description

![Cross-Reference Setup](images/cross-reference-setup.png)

## Integrated Workflows

### Workflow 1: Microscopy Experiment

**Perfect for**: Cell biology, fluorescence microscopy, time-lapse imaging

**Template Design**:
```yaml
Folder Structure:
- protocols/
- samples/
  - preparation/
  - staining/
- imaging/
  - raw_images/
  - processed/
- analysis/
  - quantification/
  - statistics/
- documentation/

Metadata Fields:
- experiment_title (text) - Shared
- hypothesis (textarea) - elabFTW focused
- sample_type (dropdown) - Shared
- cell_line (dropdown) - Shared
- microscope_model (dropdown) - OMERO focused
- objective_magnification (number) - OMERO focused
- excitation_wavelength (number) - OMERO focused
- exposure_time (number) - OMERO focused
- protocol_reference (text) - elabFTW focused
- expected_outcomes (textarea) - elabFTW focused
```

**Workflow Steps**:

1. **Planning Phase** (elabFTW)
   - Document hypothesis and expected outcomes
   - Link to protocols and literature
   - Plan experimental timeline

2. **Preparation Phase** (Both)
   - Record sample preparation in elabFTW
   - Create MetaFold project with both integrations
   - Set up OMERO dataset for image collection

3. **Imaging Phase** (OMERO focused)
   - Acquire images directly into project folders
   - Upload to OMERO dataset with structured metadata
   - Use OMERO's image viewing for quality control

4. **Analysis Phase** (Both)
   - Analyze images using OMERO tools
   - Document analysis steps in elabFTW
   - Export results and link between systems

5. **Documentation Phase** (elabFTW focused)
   - Compile results in elabFTW experiment
   - Reference OMERO dataset for data access
   - Share findings with team through elabFTW

![Microscopy Workflow](images/microscopy-workflow-combined.png)

### Workflow 2: Multi-Day Experiment Series

**Perfect for**: Time-course studies, treatment comparisons, large datasets

**Template Design**:
```yaml
Folder Structure:
- planning/
- day_01/
  - protocols/
  - data/
  - images/
- day_02/
  - protocols/
  - data/  
  - images/
- [additional days...]
- analysis/
- final_report/

Metadata Fields:
- study_title (text) - Shared
- study_duration (number) - Shared
- treatment_groups (textarea) - Shared
- sampling_schedule (textarea) - elabFTW focused
- primary_endpoints (textarea) - elabFTW focused
- imaging_schedule (textarea) - OMERO focused
- data_collection_notes (textarea) - elabFTW focused
```

**Workflow Benefits**:
- **Temporal Organization**: Each day's data properly structured
- **Progress Tracking**: Real-time updates in elabFTW
- **Image Series Management**: OMERO handles large time-series datasets
- **Comprehensive Documentation**: Complete experimental narrative

![Multi-Day Workflow](images/multi-day-workflow-combined.png)

### Workflow 3: Collaborative Team Project

**Perfect for**: Multi-investigator studies, shared resources, standardized protocols

**Template Design with Team Focus**:
```yaml
Metadata Fields:
- project_lead (dropdown) - Team member list
- collaborators (textarea) - All involved researchers
- shared_protocols (text) - Reference to team protocols
- data_sharing_level (dropdown) - Public/Team/Private
- elabftw_team (dropdown) - Target elabFTW team
- omero_group (dropdown) - Target OMERO group
- cross_reference_id (text) - Unique project identifier
```

**Team Benefits**:
- **Standardized Structure**: All team members use same templates
- **Shared Access**: Both elabFTW and OMERO support team collaboration
- **Cross-System Search**: Find related work across both platforms
- **Knowledge Transfer**: New team members can quickly understand project organization

![Team Collaboration Workflow](images/team-collaboration-workflow.png)

## Advanced Integration Features

### Automated Cross-Referencing

MetaFold automatically creates cross-references between systems:

**In elabFTW Experiments**:
- OMERO dataset URL added as extra field
- OMERO project ID included in experiment metadata
- Direct links for easy navigation

**In OMERO Datasets**:
- elabFTW experiment URL stored as map annotation
- Experiment ID and title in dataset description
- Searchable references to lab notebook entries

![Automated Cross-Referencing](images/automated-cross-referencing.png)

### Bulk Operations

**Create Multiple Related Projects**:
1. Use same template for experiment series
2. Each project gets unique elabFTW experiment and OMERO dataset
3. All projects linked through consistent metadata
4. Enable powerful cross-experiment analysis

**Retroactive Integration**:
1. Use Project Scanner to find existing MetaFold projects
2. Bulk add elabFTW experiments for documentation
3. Bulk create OMERO datasets for image organization
4. Establish missing cross-references

### Search and Discovery

**Find Related Experiments**:

*In elabFTW*:
- Search by shared metadata fields
- Find experiments referencing same OMERO datasets
- Use tags to group related experiments

*In OMERO*:
- Search map annotations for experiment parameters
- Find datasets from same elabFTW experiments
- Group by project or researcher

*Cross-System Search*:
- Use Project Scanner for comprehensive discovery
- Search both systems using MetaFold metadata
- Visualize relationships between experiments and datasets

![Cross-System Search](images/cross-system-search.png)

## Data Lifecycle Management

### From Hypothesis to Publication

**Phase 1: Planning (elabFTW Heavy)**
- Document research questions and hypotheses
- Plan experimental approach and timeline
- Create MetaFold project structure

**Phase 2: Data Collection (Both Systems)**
- Real-time documentation in elabFTW
- Structured image storage in OMERO
- Consistent metadata across both platforms

**Phase 3: Analysis (OMERO Heavy, elabFTW Documentation)**
- Use OMERO analysis tools for image processing
- Document analysis steps and reasoning in elabFTW
- Store analysis results in both systems

**Phase 4: Interpretation (elabFTW Heavy)**
- Synthesize results in elabFTW experiments
- Reference OMERO datasets for data access
- Prepare manuscripts with linked supporting data

**Phase 5: Publication and Sharing**
- Export data from OMERO for publication
- Use elabFTW for manuscript preparation and review
- Maintain long-term access through both systems

![Data Lifecycle](images/data-lifecycle-combined.png)

### Long-Term Data Management

**Data Preservation**:
- elabFTW: Long-term experiment documentation and protocols
- OMERO: Structured image data with preserved metadata
- MetaFold: Original project organization and cross-references

**Access Management**:
- Control access at project level in both systems
- Use group permissions for team collaboration
- Maintain consistent access policies

**Migration and Backup**:
- Export templates and metadata from MetaFold
- Use elabFTW export features for documentation
- Leverage OMERO's data export and backup tools

## Troubleshooting Combined Workflows

### Common Issues

**❌ One Integration Succeeds, Other Fails**

*Symptoms*: Project partially created, only one system has data

*Solutions*:
- Check each integration individually
- Verify both services are accessible
- Review error messages for specific system issues
- Consider creating missing components manually

**❌ Cross-References Not Working**

*Symptoms*: Links between systems are broken or missing

*Solutions*:
- Verify URLs are correctly formatted
- Check permissions in both systems
- Manually add missing cross-references
- Update template cross-reference fields

**❌ Slow Performance**

*Symptoms*: Project creation takes very long time

*Solutions*:
- Check network connectivity to both servers
- Verify both services are responsive
- Consider creating projects during off-peak hours
- Use smaller metadata sets for testing

![Combined Troubleshooting](images/combined-troubleshooting.png)

### Sequential Failure Recovery

If one integration fails:

1. **Identify Which Failed**
   - Check error messages carefully
   - Test each integration individually
   - Verify service availability

2. **Complete Missing Integration**
   - Use Project Scanner to find incomplete projects
   - Manually trigger missing integration
   - Update cross-references

3. **Verify Consistency**
   - Check metadata matches in both systems
   - Ensure cross-references are working
   - Test search and discovery functions

### Best Practices for Reliability

**Network Considerations**:
- Ensure stable internet connection
- Test both services before creating important projects
- Consider offline workflows for critical experiments

**Template Testing**:
- Test templates with both integrations enabled
- Verify all metadata fields work correctly
- Check cross-reference generation

**Backup Strategies**:
- Regular exports from both systems
- Local copies of critical data
- Documented recovery procedures

## Performance Optimization

### Template Design for Speed

**Minimize Metadata Fields**:
- Include only essential fields for integration
- Use dropdown fields rather than free text where possible
- Group related fields efficiently

**Optimize Cross-References**:
- Use consistent naming conventions
- Minimize custom field mappings
- Test integration speed with realistic data

### System Configuration

**elabFTW Optimization**:
- Use appropriate experiment types
- Minimize required extra fields
- Configure team settings efficiently

**OMERO Optimization**:
- Choose appropriate groups for permissions
- Use existing projects when possible
- Minimize map annotation complexity

**MetaFold Configuration**:
- Keep proxy server running continuously
- Use stable network connections
- Monitor system resources during integration

## Integration Monitoring

### Success Metrics

**Track Integration Health**:
- Monitor success/failure rates for both systems
- Track creation times and performance
- Document common error patterns

**Usage Analytics**:
- Count projects using each integration
- Monitor cross-reference usage
- Track team adoption patterns

**Data Quality**:
- Verify metadata consistency between systems
- Check cross-reference accuracy
- Monitor search effectiveness

### Maintenance Tasks

**Regular Checks**:
- Test both integrations monthly
- Verify API credentials haven't expired
- Update proxy server and dependencies
- Review error logs for patterns

**System Updates**:
- Coordinate MetaFold updates with server upgrades
- Test integrations after system changes
- Update documentation for new features

## Next Steps

Now that you understand combined workflows:

- **[Explore Project Discovery](project-scanner.md)** to find and organize all your integrated projects
- **[Learn Data Visualization](data-visualization.md)** to see relationships between your experiments
- **[Advanced Template Design](templates.md)** optimized for multi-system workflows
- **[User Management](user-management.md)** for team-based integrated workflows

---

*With combined elabFTW and OMERO integration, you have a complete research data ecosystem that scales from individual experiments to large collaborative projects!*