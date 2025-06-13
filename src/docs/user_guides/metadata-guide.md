# Working with Metadata

Metadata is the foundation of organized, discoverable research. This comprehensive guide covers metadata design principles, field types, validation strategies, and best practices for creating rich, searchable project documentation that enhances research reproducibility and collaboration.

![Metadata Guide Overview](images/metadata-guide-overview.png)

## Understanding Metadata in Research

### What is Research Metadata?

**Definition**: Metadata is "data about data" - structured information that describes, explains, and makes it easier to retrieve, use, and manage research information.

**In MetaFold Context**:
- **Descriptive Information** - What the experiment is about
- **Technical Parameters** - How the experiment was conducted
- **Contextual Details** - When, where, and by whom
- **Relationship Information** - How it connects to other work
- **Quality Indicators** - Completeness, accuracy, validation status

![Metadata Concept](images/metadata-concept-research.png)

### Why Metadata Matters

**For Individual Researchers**:
- **Future Self** - Understand your own work months or years later
- **Reproducibility** - Repeat experiments with confidence
- **Analysis** - Enable sophisticated data mining and pattern recognition
- **Publication** - Provide complete experimental details for papers

**For Research Teams**:
- **Collaboration** - Share detailed experimental context
- **Standardization** - Ensure consistent data collection across team
- **Knowledge Transfer** - Onboard new team members effectively
- **Resource Sharing** - Find and reuse relevant experimental setups

**For the Scientific Community**:
- **Reproducible Science** - Enable others to reproduce and build upon work
- **Meta-analysis** - Combine data across studies for broader insights
- **FAIR Principles** - Findable, Accessible, Interoperable, Reusable data
- **Open Science** - Transparent, searchable research documentation

![Metadata Importance](images/metadata-importance.png)

## Metadata Field Types and Design

### Core Field Types

**Text Fields**
- **Single-line Text** - Names, titles, identifiers
- **Multi-line Textarea** - Descriptions, protocols, notes
- **Email** - Contact information with validation
- **URL** - Links to resources, protocols, papers

```yaml
experiment_title:
  type: text
  required: true
  max_length: 200
  help_text: "Concise, descriptive title for your experiment"

detailed_description:
  type: textarea
  required: false
  max_length: 2000
  help_text: "Detailed experimental description and objectives"
```

![Text Field Types](images/text-field-types-metadata.png)

**Numeric Fields**
- **Integer** - Counts, quantities, whole numbers
- **Decimal** - Measurements, ratios, precise values
- **Range** - Min/max value selection
- **Scientific Notation** - Very large or very small numbers

```yaml
sample_count:
  type: integer
  required: true
  minimum: 1
  maximum: 10000
  help_text: "Number of samples in this experiment"

temperature_celsius:
  type: decimal
  required: true
  minimum: -273.15
  maximum: 1000
  precision: 2
  help_text: "Experimental temperature in Celsius"
```

**Temporal Fields**
- **Date** - Calendar dates with picker interface
- **Time** - Time of day with hour/minute selection
- **DateTime** - Combined date and time
- **Duration** - Time spans and intervals

```yaml
experiment_date:
  type: date
  required: true
  default: today
  minimum: "2020-01-01"
  help_text: "Date when experiment was conducted"

start_time:
  type: time
  required: false
  format: "24hr"
  help_text: "Experiment start time"
```

![Numeric and Temporal Fields](images/numeric-temporal-fields.png)

**Selection Fields**
- **Dropdown** - Single selection from predefined options
- **Radio Buttons** - Single selection with visible options
- **Checkboxes** - Multiple selections
- **Multi-select** - Multiple selections from long lists

```yaml
cell_line:
  type: dropdown
  required: true
  options: ["HeLa", "HEK293", "CHO", "Primary", "Other"]
  help_text: "Cell line used in experiment"

experimental_conditions:
  type: checkbox_group
  required: false
  options: 
    - "Serum-free medium"
    - "CO2 incubation"
    - "Temperature control"
    - "pH monitoring"
  help_text: "Select all applicable experimental conditions"
```

### Advanced Field Types

**Conditional Fields**
Fields that appear based on other field values:

```yaml
sample_type:
  type: dropdown
  options: ["Cell Culture", "Tissue Sample", "Blood Sample"]

# Conditional fields based on sample_type
cell_line:
  type: text
  condition:
    field: sample_type
    equals: "Cell Culture"

tissue_origin:
  type: dropdown
  options: ["Brain", "Heart", "Liver", "Kidney"]
  condition:
    field: sample_type
    equals: "Tissue Sample"

blood_type:
  type: dropdown
  options: ["A", "B", "AB", "O"]
  condition:
    field: sample_type
    equals: "Blood Sample"
```

![Conditional Fields](images/conditional-fields-metadata.png)

**Calculated Fields**
Fields that compute values automatically:

```yaml
start_date:
  type: date
  required: true

end_date:
  type: date
  required: true

experiment_duration:
  type: calculated
  formula: "end_date - start_date"
  unit: "days"
  display_format: "{value} days"
```

**File Reference Fields**
Link to files within the project:

```yaml
protocol_file:
  type: file_reference
  required: false
  allowed_types: [".pdf", ".docx", ".txt"]
  search_directories: ["protocols/", "documentation/"]
  help_text: "Link to the experimental protocol file"

data_files:
  type: file_reference_multiple
  required: false
  allowed_types: [".csv", ".xlsx", ".txt", ".json"]
  search_directories: ["data/"]
  help_text: "Link to relevant data files"
```

**Lookup Fields**
Reference external databases or APIs:

```yaml
gene_symbol:
  type: lookup
  source: "ncbi_gene_database"
  search_field: "symbol"
  display_field: "symbol (description)"
  help_text: "Enter gene symbol for automatic lookup"

pubmed_reference:
  type: lookup
  source: "pubmed_api"
  search_field: "pmid"
  return_fields: ["title", "authors", "journal", "year"]
  help_text: "Enter PubMed ID for automatic citation"
```

![Advanced Field Types](images/advanced-field-types-metadata.png)

## Metadata Schema Design

### Schema Design Principles

**Start Simple, Evolve Gradually**
- Begin with essential fields only
- Add complexity based on actual usage
- Test schemas with real experiments
- Gather feedback from users before expanding

**User-Centered Design**
- Consider who will fill out the metadata
- Minimize required fields to truly essential information
- Provide clear help text and examples
- Use familiar terminology and concepts

**Future-Proofing**
- Design for long-term usability and understanding
- Consider how metadata will be used in 5-10 years
- Plan for integration with institutional systems
- Follow established standards where possible

![Schema Design Principles](images/schema-design-principles.png)

### Field Organization Strategies

**Logical Grouping**
Organize related fields into coherent sections:

```yaml
# Basic Information Group
basic_info:
  title: "Basic Information"
  fields:
    - experiment_title
    - description
    - principal_investigator
    - experiment_date

# Sample Information Group  
sample_info:
  title: "Sample Information"
  fields:
    - sample_type
    - sample_count
    - sample_preparation
    - storage_conditions

# Technical Parameters Group
technical_params:
  title: "Technical Parameters"
  fields:
    - instrument_model
    - software_version
    - calibration_date
    - measurement_settings
```

**Progressive Disclosure**
Reveal complexity gradually:

```yaml
# Always visible - essential information
core_fields:
  - experiment_title
  - experiment_date
  - principal_investigator

# Expandable section - detailed information
detailed_section:
  title: "Detailed Parameters"
  collapsible: true
  initially_collapsed: true
  fields:
    - technical_specifications
    - environmental_conditions
    - quality_control_measures
```

![Field Organization](images/field-organization-metadata.png)

### Validation and Quality Control

**Field-Level Validation**
- **Data Type Validation** - Ensure numeric fields contain numbers
- **Range Validation** - Check values fall within acceptable ranges
- **Pattern Validation** - Use regular expressions for structured data
- **Required Field Validation** - Ensure essential information is provided

```yaml
sample_id:
  type: text
  required: true
  pattern: "^[A-Z]{2}[0-9]{4}$"
  validation_message: "Sample ID must be 2 letters followed by 4 numbers (e.g., AB1234)"

temperature:
  type: decimal
  required: true
  minimum: -80
  maximum: 100
  validation_message: "Temperature must be between -80°C and 100°C"
```

**Cross-Field Validation**
Ensure logical consistency between related fields:

```yaml
validation_rules:
  - name: "Date consistency"
    rule: "end_date >= start_date"
    message: "End date must be after start date"
    
  - name: "Sample count consistency"
    rule: "analyzed_samples <= total_samples"
    message: "Cannot analyze more samples than collected"
    
  - name: "Equipment compatibility"
    rule: "if microscope_type == 'Confocal' then laser_wavelengths required"
    message: "Laser wavelengths required for confocal microscopy"
```

![Validation Strategies](images/validation-strategies-metadata.png)

## Domain-Specific Metadata Examples

### Cell Biology Experiments

**Core Metadata Schema**:
```yaml
cell_biology_metadata:
  basic_info:
    experiment_title: {type: text, required: true}
    experiment_date: {type: date, required: true}
    principal_investigator: {type: text, required: true}
    lab_notebook_reference: {type: text, required: false}
    
  cell_information:
    cell_line: 
      type: dropdown
      options: ["HeLa", "HEK293", "CHO", "Primary", "iPSC", "Other"]
      required: true
    passage_number: {type: integer, minimum: 1, required: true}
    culture_medium: {type: text, required: true}
    seeding_density: {type: decimal, unit: "cells/cm²", required: true}
    
  experimental_conditions:
    incubation_temperature: {type: decimal, default: 37, unit: "°C"}
    co2_concentration: {type: decimal, default: 5, unit: "%"}
    humidity: {type: decimal, default: 95, unit: "%"}
    treatment_compounds: {type: text, required: false}
    treatment_concentrations: {type: text, required: false}
    
  data_collection:
    measurement_timepoints: {type: text, required: true}
    technical_replicates: {type: integer, minimum: 1, required: true}
    biological_replicates: {type: integer, minimum: 1, required: true}
    data_types: 
      type: checkbox_group
      options: ["Microscopy", "Flow Cytometry", "Western Blot", "PCR", "Other"]
```

![Cell Biology Metadata](images/cell-biology-metadata.png)

### Microscopy Experiments

**Technical Metadata Schema**:
```yaml
microscopy_metadata:
  instrument_info:
    microscope_model: 
      type: dropdown
      options: ["Zeiss LSM 880", "Leica SP8", "Nikon A1R", "Olympus FV3000", "Other"]
      required: true
    objective_lens:
      type: dropdown
      options: ["10x/0.3", "20x/0.8", "40x/1.3 Oil", "63x/1.4 Oil", "100x/1.4 Oil"]
      required: true
    detector_type: {type: text, required: true}
    
  imaging_parameters:
    excitation_wavelengths: {type: text, required: true}
    emission_filters: {type: text, required: true}
    pixel_size_x: {type: decimal, unit: "μm", required: true}
    pixel_size_y: {type: decimal, unit: "μm", required: true}
    z_step_size: {type: decimal, unit: "μm", required: false}
    frame_rate: {type: decimal, unit: "fps", required: false}
    
  sample_preparation:
    fixation_method: {type: text, required: true}
    permeabilization: {type: text, required: false}
    primary_antibodies: {type: textarea, required: false}
    secondary_antibodies: {type: textarea, required: false}
    mounting_medium: {type: text, required: true}
    
  acquisition_settings:
    image_format: 
      type: dropdown
      options: [".lsm", ".czi", ".nd2", ".oib", ".tiff"]
      required: true
    bit_depth: 
      type: dropdown
      options: ["8-bit", "12-bit", "16-bit"]
      required: true
    averaging: {type: integer, minimum: 1, required: true}
    gain_settings: {type: text, required: false}
```

### Environmental Studies

**Field Research Metadata**:
```yaml
environmental_metadata:
  location_info:
    site_name: {type: text, required: true}
    gps_coordinates: 
      type: text
      pattern: "^-?\d+\.\d+,\s*-?\d+\.\d+$"
      help_text: "Format: latitude, longitude (e.g., 40.7128, -74.0060)"
      required: true
    elevation: {type: decimal, unit: "m", required: false}
    habitat_type: 
      type: dropdown
      options: ["Forest", "Grassland", "Wetland", "Desert", "Urban", "Agricultural"]
      required: true
      
  environmental_conditions:
    air_temperature: {type: decimal, unit: "°C", required: true}
    humidity: {type: decimal, unit: "%", required: true}
    wind_speed: {type: decimal, unit: "m/s", required: false}
    precipitation: {type: decimal, unit: "mm", required: false}
    cloud_cover: 
      type: dropdown
      options: ["Clear", "Partly cloudy", "Overcast", "Stormy"]
      required: false
      
  sampling_info:
    sampling_method: {type: text, required: true}
    sample_size: {type: integer, required: true}
    sampling_effort: {type: text, required: true}
    equipment_used: {type: textarea, required: true}
    
  data_quality:
    data_completeness: 
      type: dropdown
      options: ["Complete", "Minor gaps", "Major gaps", "Incomplete"]
      required: true
    quality_control_notes: {type: textarea, required: false}
    reviewer: {type: text, required: false}
```

![Domain-Specific Examples](images/domain-specific-metadata.png)

## Metadata Standards and Interoperability

### Common Metadata Standards

**Dublin Core**
Basic descriptive metadata for digital resources:
```yaml
dublin_core_mapping:
  title: dc:title
  creator: dc:creator
  subject: dc:subject
  description: dc:description
  publisher: dc:publisher
  date: dc:date
  type: dc:type
  format: dc:format
  identifier: dc:identifier
  source: dc:source
  language: dc:language
  coverage: dc:coverage
  rights: dc:rights
```

**DataCite Metadata Schema**
For research data citation and discovery:
```yaml
datacite_mapping:
  title: datacite:title
  creator: datacite:creator
  publication_year: datacite:publicationYear
  resource_type: datacite:resourceType
  identifier: datacite:identifier
  description: datacite:description
  subject: datacite:subject
  contributor: datacite:contributor
  date: datacite:date
  related_identifier: datacite:relatedIdentifier
```

**OME (Open Microscopy Environment)**
Standardized metadata for microscopy:
```yaml
ome_metadata_mapping:
  instrument: ome:Instrument
  objective: ome:Objective
  detector: ome:Detector
  light_source: ome:LightSource
  image: ome:Image
  pixels: ome:Pixels
  channel: ome:Channel
  plane: ome:Plane
```

![Metadata Standards](images/metadata-standards.png)

### FAIR Data Principles

**Findable**
- **Unique Identifiers** - Persistent identifiers for each project
- **Rich Metadata** - Comprehensive descriptive information
- **Searchable Repositories** - Integration with discovery systems
- **Clear Organization** - Logical file and folder structures

**Accessible**
- **Open Protocols** - Standard access methods
- **Authentication** - Clear access control when needed
- **Long-term Availability** - Preservation strategies
- **Multiple Formats** - Various export and access options

**Interoperable**
- **Standard Formats** - Use widely accepted data formats
- **Controlled Vocabularies** - Consistent terminology
- **API Integration** - Machine-readable access
- **Cross-platform Compatibility** - Work across different systems

**Reusable**
- **Complete Documentation** - Thorough experimental descriptions
- **License Information** - Clear usage rights
- **Provenance** - Track data origin and processing
- **Quality Assessment** - Data quality indicators and validation

![FAIR Principles](images/fair-principles-metadata.png)

## Metadata Workflows and Best Practices

### Data Entry Workflows

**Pre-Experiment Planning**
1. **Select Appropriate Template** - Choose template that matches experiment type
2. **Review Metadata Requirements** - Understand what information will be needed
3. **Prepare Standard Information** - Gather common metadata elements
4. **Plan Data Collection** - Organize how metadata will be captured

**During Experiment**
1. **Real-time Entry** - Fill metadata as experiment progresses
2. **Document Deviations** - Record any protocol changes or issues
3. **Quality Control** - Verify accuracy of entered information
4. **Backup Critical Information** - Ensure metadata is preserved

**Post-Experiment**
1. **Complete Missing Fields** - Fill any incomplete metadata
2. **Quality Review** - Check for accuracy and completeness
3. **Add Analysis Information** - Document data processing and analysis
4. **Final Validation** - Ensure metadata meets quality standards

![Metadata Workflows](images/metadata-workflows.png)

### Quality Assurance Strategies

**Automated Quality Checks**
- **Completeness Checking** - Identify missing required fields
- **Consistency Validation** - Check for logical contradictions
- **Format Validation** - Ensure data follows expected patterns
- **Range Checking** - Verify values fall within reasonable limits

**Manual Review Processes**
- **Peer Review** - Have colleagues review metadata for accuracy
- **Domain Expert Review** - Subject matter experts validate technical details
- **Standardization Review** - Ensure compliance with institutional standards
- **Long-term Review** - Periodic review of older metadata for continued relevance

**Continuous Improvement**
- **Usage Analytics** - Track which fields are used most/least
- **Error Analysis** - Identify common metadata entry errors
- **User Feedback** - Collect input from metadata creators and users
- **Template Evolution** - Update templates based on experience and needs

### Team Coordination

**Standardization Strategies**
- **Common Templates** - Use consistent templates across team
- **Training Programs** - Ensure all team members understand metadata requirements
- **Quality Guidelines** - Establish clear standards for metadata quality
- **Regular Reviews** - Periodic team discussions about metadata practices

**Collaboration Tools**
- **Template Sharing** - Share successful templates within team
- **Metadata Libraries** - Maintain common vocabularies and controlled terms
- **Review Systems** - Implement peer review for important projects
- **Documentation** - Maintain clear documentation of metadata practices

![Team Coordination](images/team-coordination-metadata.png)

## Advanced Metadata Features

### Metadata Inheritance and Templates

**Template Hierarchies**
Create sophisticated template relationships:

```yaml
# Base template for all biology experiments
base_biology_template:
  core_fields:
    - experiment_title
    - principal_investigator
    - experiment_date
    - institutional_approval

# Specialized cell culture template
cell_culture_template:
  inherits: base_biology_template
  additional_fields:
    - cell_line
    - passage_number
    - culture_conditions

# Highly specialized microscopy template
microscopy_cell_culture_template:
  inherits: cell_culture_template
  additional_fields:
    - microscope_settings
    - imaging_parameters
    - image_analysis_software
```

**Dynamic Metadata Generation**
- **Context-Aware Suggestions** - Metadata suggestions based on experiment type
- **Auto-population** - Automatic filling of common fields
- **Smart Defaults** - Intelligent default values based on user history
- **Adaptive Forms** - Forms that change based on user input

### Integration with External Systems

**Laboratory Information Management Systems (LIMS)**
- **Bidirectional Sync** - Keep metadata synchronized with LIMS
- **Sample Tracking** - Link metadata to physical sample management
- **Workflow Integration** - Connect metadata to laboratory workflows
- **Quality Control** - Automated quality checks from LIMS data

**Research Information Systems**
- **Grant Information** - Link projects to funding sources
- **Publication Tracking** - Connect metadata to resulting publications
- **Collaboration Networks** - Track research partnerships and collaborations
- **Impact Assessment** - Monitor research outcomes and impact

**Data Repositories**
- **Automated Deposition** - Submit metadata to public repositories
- **Compliance Checking** - Ensure metadata meets repository requirements
- **Version Control** - Track metadata changes and updates
- **Citation Generation** - Automatic citation formatting for datasets

![External System Integration](images/external-system-integration.png)

## Metadata Analytics and Discovery

### Search and Discovery

**Full-text Search**
- **Comprehensive Indexing** - Search across all metadata fields
- **Relevance Ranking** - Results ranked by relevance and quality
- **Boolean Operators** - Complex search expressions with AND, OR, NOT
- **Wildcard Support** - Partial matching and pattern searches

**Faceted Search**
- **Field-Specific Filters** - Filter by individual metadata fields
- **Date Range Filtering** - Search by temporal criteria
- **Categorical Browsing** - Browse by predefined categories
- **Hierarchical Navigation** - Drill down through nested categories

**Similarity Search**
- **Content-Based Similarity** - Find experiments with similar metadata
- **Temporal Similarity** - Identify related experiments over time
- **Methodological Similarity** - Group experiments by techniques used
- **Outcome Similarity** - Connect experiments with similar results

![Search and Discovery](images/search-discovery-metadata.png)

### Analytics and Visualization

**Metadata Statistics**
- **Completion Rates** - Track metadata completeness over time
- **Field Usage** - Identify most and least used metadata fields
- **Quality Metrics** - Measure metadata accuracy and consistency
- **Trend Analysis** - Monitor changes in metadata patterns

**Relationship Analysis**
- **Collaboration Networks** - Visualize research collaborations
- **Method Evolution** - Track changes in experimental approaches
- **Resource Utilization** - Analyze equipment and facility usage
- **Knowledge Networks** - Map connections between research areas

**Predictive Analytics**
- **Success Prediction** - Identify factors associated with successful experiments
- **Resource Planning** - Predict future resource needs based on trends
- **Quality Prediction** - Identify experiments likely to have quality issues
- **Collaboration Opportunities** - Suggest potential research partnerships

## Troubleshooting Metadata Issues

### Common Metadata Problems

**Incomplete Metadata**
- **Problem**: Required fields left empty or partially filled
- **Solutions**: 
  - Implement better validation and user guidance
  - Provide clear examples and help text
  - Use progressive disclosure to make forms less overwhelming
  - Set up automatic reminders for incomplete metadata

**Inconsistent Metadata**
- **Problem**: Same information entered differently across projects
- **Solutions**:
  - Use controlled vocabularies and dropdown fields
  - Implement autocomplete with previous entries
  - Provide clear guidelines and training
  - Set up automated consistency checking

**Overly Complex Metadata**
- **Problem**: Metadata schemas that are too detailed or complicated
- **Solutions**:
  - Start simple and add complexity gradually
  - Use conditional fields to hide irrelevant options
  - Group related fields logically
  - Provide different levels of detail for different users

![Troubleshooting Metadata](images/troubleshooting-metadata.png)

### Metadata Migration and Updates

**Schema Evolution**
- **Backward Compatibility** - Ensure old projects work with new schemas
- **Migration Tools** - Automated tools to update existing metadata
- **Validation Updates** - Update validation rules without breaking existing data
- **Deprecation Strategies** - Gracefully retire outdated metadata fields

**Data Cleanup**
- **Duplicate Detection** - Identify and merge duplicate metadata entries
- **Format Standardization** - Standardize data formats across projects
- **Quality Improvement** - Systematic improvement of metadata quality
- **Missing Data Recovery** - Strategies to recover missing metadata

## Future of Research Metadata

### Emerging Trends

**Artificial Intelligence Integration**
- **Automated Metadata Generation** - AI systems that generate metadata from experimental data
- **Quality Assessment** - Machine learning for metadata quality evaluation
- **Semantic Enhancement** - AI-powered linking to external knowledge bases
- **Predictive Metadata** - Systems that predict needed metadata based on context

**Linked Data and Knowledge Graphs**
- **Semantic Web Integration** - Metadata as part of the global knowledge graph
- **Ontology Integration** - Deep integration with domain-specific ontologies
- **Cross-Domain Linking** - Connections between different research domains
- **Automated Reasoning** - Inference and discovery from linked metadata

**Real-time Metadata**
- **IoT Integration** - Automatic metadata capture from smart laboratory equipment
- **Continuous Monitoring** - Real-time updating of environmental and technical parameters
- **Stream Processing** - Handling high-velocity metadata from automated systems
- **Edge Computing** - Local processing of metadata at the point of generation

![Future Trends](images/future-trends-metadata.png)

### Preparing for the Future

**Skills Development**
- **Data Literacy** - Understanding data management principles
- **Metadata Standards** - Knowledge of relevant standards and best practices
- **Technology Awareness** - Staying current with metadata technology developments
- **Interdisciplinary Collaboration** - Working across domains for metadata interoperability

**Infrastructure Planning**
- **Scalable Systems** - Metadata systems that can grow with research needs
- **Interoperability** - Systems that work well with others
- **Sustainability** - Long-term maintenance and preservation strategies
- **Security** - Protecting sensitive metadata while enabling sharing

## Next Steps

Now that you understand metadata design and management:

1. **[Template Management](templates.md)** - Apply metadata principles to template design
2. **[Project Creation](project-creation.md)** - Use metadata effectively during project creation
3. **[Data Visualization](data-visualization.md)** - Leverage metadata for rich visualizations
4. **[Integration Workflows](elabftw-integration.md)** - Sync metadata with laboratory systems

---

*Master metadata design to unlock the full potential of organized, discoverable, and reproducible research!*