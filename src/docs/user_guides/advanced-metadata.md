# Tutorial: Advanced Metadata Schemas

This advanced tutorial teaches you to create sophisticated metadata schemas with conditional logic, external data integration, and complex validation rules. You'll build a comprehensive template for multi-modal microscopy experiments with advanced metadata features.

![Advanced Metadata Tutorial](images/tutorials/advanced-metadata-tutorial.png)

## Tutorial Overview

**What You'll Learn:**
- Design complex conditional metadata schemas
- Implement cross-field validation and dependencies
- Integrate external databases and APIs
- Create calculated and derived fields
- Build hierarchical field relationships
- Implement advanced validation patterns

**What You'll Build:**
A sophisticated microscopy experiment template featuring:
- Multi-level conditional logic
- External equipment database integration
- Automated calculations and validations
- Complex field relationships
- Quality control workflows

**Prerequisites:**
- Completed [Basic Experiment Tutorial](basic-experiment.md)
- Understanding of metadata principles
- Familiarity with JSON schema concepts
- Basic knowledge of microscopy (helpful but not required)

**Time Required:** 60-90 minutes

![Tutorial Prerequisites](images/tutorials/advanced-metadata-prerequisites.png)

## Part 1: Advanced Template Architecture

### Understanding Complex Metadata Needs

**Research Scenario:**
Multi-modal fluorescence microscopy study examining protein localization across different cell types, treatments, and imaging conditions.

**Complexity Requirements:**
- **Conditional Fields** - Different metadata based on microscope type
- **Cross-validation** - Ensure consistent parameters across related fields
- **External Integration** - Equipment databases, protocol repositories
- **Automated Calculations** - Pixel sizes, field of view calculations
- **Quality Control** - Automated validation of imaging parameters

**Template Structure Overview:**
```
Advanced Microscopy Template
├── Basic Information (always visible)
├── Sample Preparation (expandable)
├── Microscope Configuration (conditional on equipment)
├── Imaging Parameters (validated against equipment specs)
├── Analysis Settings (dependent on imaging mode)
├── Quality Control (automated checks)
└── External References (API-integrated)
```

![Complex Metadata Architecture](images/tutorials/complex-metadata-architecture.png)

### Step 1: Create the Advanced Template Foundation

**Template Setup:**
1. Go to **📋 Templates** tab
2. Click **"Create New Template"**
3. Choose **"Experiment Template"**

**Basic Information:**
- **Name:** `Advanced Microscopy Experiment`
- **Description:** `Comprehensive template for multi-modal fluorescence microscopy with advanced validation and conditional logic`
- **Type:** Experiment Template

**Advanced Features to Enable:**
- ✅ Conditional field logic
- ✅ Cross-field validation
- ✅ External API integration
- ✅ Calculated fields
- ✅ Quality control automation

![Template Foundation](images/tutorials/template-foundation-advanced.png)

### Step 2: Design the Folder Structure

**Hierarchical Organization:**
```
01_planning/
├── protocols/
├── sample_prep/
└── equipment_booking/

02_sample_preparation/
├── cell_culture/
├── staining/
├── mounting/
└── quality_control/

03_imaging/
├── raw_images/
│   ├── condition_1/
│   ├── condition_2/
│   └── condition_3/
├── metadata/
├── calibration/
└── equipment_logs/

04_analysis/
├── preprocessing/
├── segmentation/
├── quantification/
├── statistics/
└── visualization/

05_results/
├── figures/
├── tables/
├── processed_data/
└── publication_materials/

06_documentation/
├── daily_logs/
├── troubleshooting/
├── protocol_modifications/
└── final_report/

07_quality_control/
├── calibration_checks/
├── control_experiments/
├── validation_data/
└── audit_trail/
```

![Advanced Folder Structure](images/tutorials/advanced-folder-structure.png)

## Part 2: Conditional Metadata Schema Design

### Step 3: Basic Information with Smart Defaults

**Core Identification Fields:**
```yaml
# Basic Information Group
experiment_id:
  type: text
  required: true
  pattern: "^[A-Z]{3}[0-9]{4}[A-Z]{2}$"
  help_text: "Format: XXX0000XX (e.g., MIC2025AB)"
  validation_message: "ID must be 3 letters, 4 numbers, 2 letters"

experiment_title:
  type: text
  required: true
  max_length: 200
  help_text: "Descriptive title including main protein/process studied"

principal_investigator:
  type: text
  required: true
  autocomplete_source: "user_database"
  help_text: "Primary researcher responsible for experiment"

experiment_date:
  type: date
  required: true
  default: "today"
  validation:
    minimum: "2020-01-01"
    maximum: "today + 30 days"
  help_text: "Experiment start date"

lab_notebook_page:
  type: text
  pattern: "^(NB|LAB)[0-9]{2}-[0-9]{3}$"
  help_text: "Lab notebook reference (e.g., NB05-123)"
```

**Research Context Fields:**
```yaml
research_project:
  type: dropdown
  required: true
  options_source: "active_projects_api"
  help_text: "Link to broader research project"

hypothesis:
  type: textarea
  required: true
  max_length: 1000
  help_text: "Clear statement of experimental hypothesis"

expected_outcomes:
  type: textarea
  required: false
  max_length: 500
  help_text: "Predicted results and success criteria"
```

![Basic Information Advanced](images/tutorials/basic-information-advanced.png)

### Step 4: Conditional Sample Preparation Schema

**Sample Type with Cascading Options:**
```yaml
sample_type:
  type: dropdown
  required: true
  options: ["Fixed Cells", "Live Cells", "Tissue Sections", "Organoids", "Other"]
  help_text: "Primary sample type for imaging"

# Conditional fields based on sample_type
cell_line:
  type: dropdown
  required: true
  condition:
    field: sample_type
    operator: "in"
    values: ["Fixed Cells", "Live Cells"]
  options_source: "cell_line_database"
  help_text: "Cell line used in experiment"

passage_number:
  type: integer
  required: true
  condition:
    field: sample_type
    operator: "in"
    values: ["Fixed Cells", "Live Cells"]
  minimum: 1
  maximum: 200
  help_text: "Cell passage number"

tissue_type:
  type: dropdown
  required: true
  condition:
    field: sample_type
    equals: "Tissue Sections"
  options: ["Brain", "Heart", "Liver", "Kidney", "Lung", "Muscle", "Other"]
  help_text: "Type of tissue used"

section_thickness:
  type: decimal
  required: true
  condition:
    field: sample_type
    equals: "Tissue Sections"
  unit: "μm"
  minimum: 1
  maximum: 100
  help_text: "Tissue section thickness"

organoid_type:
  type: text
  required: true
  condition:
    field: sample_type
    equals: "Organoids"
  help_text: "Type of organoid (e.g., brain, intestinal)"

culture_age:
  type: integer
  required: true
  condition:
    field: sample_type
    equals: "Organoids"
  unit: "days"
  minimum: 1
  help_text: "Age of organoid culture"
```

**Staining Protocol with Complex Dependencies:**
```yaml
primary_stain_count:
  type: integer
  required: true
  minimum: 1
  maximum: 5
  help_text: "Number of primary stains used"

# Dynamic fields based on stain count
primary_stain_1:
  type: group
  required: true
  condition:
    field: primary_stain_count
    operator: ">="
    value: 1
  fields:
    antibody_name:
      type: text
      required: true
      help_text: "Primary antibody name/catalog number"
    target_protein:
      type: text
      required: true
      help_text: "Target protein or structure"
    concentration:
      type: text
      required: true
      help_text: "Antibody concentration used"
    incubation_time:
      type: decimal
      required: true
      unit: "hours"
      help_text: "Primary antibody incubation time"

# Repeat for additional stains...
primary_stain_2:
  type: group
  required: false
  condition:
    field: primary_stain_count
    operator: ">="
    value: 2
  fields: [same as primary_stain_1]

# Secondary antibody configuration
secondary_antibodies:
  type: textarea
  required: true
  help_text: "List all secondary antibodies with concentrations and fluorophores"

counterstain:
  type: dropdown
  required: false
  options: ["DAPI", "Hoechst", "DRAQ5", "Propidium Iodide", "None"]
  help_text: "Nuclear counterstain used"
```

![Conditional Sample Preparation](images/tutorials/conditional-sample-preparation.png)

### Step 5: Equipment-Dependent Imaging Parameters

**Microscope Selection with Dynamic Configuration:**
```yaml
microscope_system:
  type: dropdown
  required: true
  options_source: "equipment_database_api"
  help_text: "Select available microscope system"

# Equipment-specific fields
objective_lens:
  type: dropdown
  required: true
  options_source: 
    api: "equipment_database_api"
    filter_by: "microscope_system"
    endpoint: "objectives"
  help_text: "Available objectives for selected microscope"

illumination_source:
  type: dropdown
  required: true
  condition:
    field: microscope_system
    operator: "contains"
    value: "confocal"
  options_source:
    api: "equipment_database_api"
    filter_by: "microscope_system"
    endpoint: "light_sources"
  help_text: "Available light sources"

laser_lines:
  type: checkbox_group
  required: true
  condition:
    field: illumination_source
    operator: "contains"
    value: "laser"
  options_source:
    api: "equipment_database_api"
    filter_by: "microscope_system"
    endpoint: "laser_lines"
  help_text: "Select laser lines used"

filter_sets:
  type: text
  required: true
  condition:
    field: microscope_system
    operator: "contains"
    value: "widefield"
  help_text: "Filter sets used for widefield imaging"
```

**Calculated Imaging Parameters:**
```yaml
pixel_size_x:
  type: calculated
  formula: "objective_magnification * camera_pixel_size / total_magnification"
  unit: "nm"
  dependencies: ["objective_lens", "camera_type"]
  help_text: "Calculated pixel size in X dimension"

pixel_size_y:
  type: calculated
  formula: "objective_magnification * camera_pixel_size / total_magnification"
  unit: "nm"
  dependencies: ["objective_lens", "camera_type"]
  help_text: "Calculated pixel size in Y dimension"

field_of_view_x:
  type: calculated
  formula: "camera_width_pixels * pixel_size_x"
  unit: "μm"
  dependencies: ["camera_type", "pixel_size_x"]
  help_text: "Calculated field of view width"

field_of_view_y:
  type: calculated
  formula: "camera_height_pixels * pixel_size_y"
  unit: "μm"
  dependencies: ["camera_type", "pixel_size_y"]
  help_text: "Calculated field of view height"
```

![Equipment-Dependent Parameters](images/tutorials/equipment-dependent-parameters.png)

## Part 3: Cross-Field Validation and Quality Control

### Step 6: Advanced Validation Rules

**Parameter Consistency Validation:**
```yaml
validation_rules:
  - name: "Excitation/Emission Compatibility"
    rule: "validate_fluorophore_compatibility(fluorophores, laser_lines, filters)"
    severity: "error"
    message: "Selected fluorophores incompatible with laser lines and filters"
    
  - name: "Objective NA vs Immersion"
    rule: "if objective_na > 1.0 then immersion_medium required"
    severity: "error"
    message: "High NA objectives require immersion medium specification"
    
  - name: "Sampling Rate Adequacy"
    rule: "pixel_size <= (emission_wavelength / (2 * objective_na * 2.3))"
    severity: "warning"
    message: "Pixel size may not satisfy Nyquist sampling criterion"
    
  - name: "Exposure Time vs Photobleaching"
    rule: "if live_imaging and exposure_time > 100 then photobleaching_risk = high"
    severity: "warning"
    message: "Long exposure times may cause photobleaching in live samples"
    
  - name: "Z-step Size Optimization"
    rule: "z_step_size <= (emission_wavelength / (2 * objective_na^2))"
    severity: "warning"
    message: "Z-step size may be too large for optimal axial resolution"
```

**Data Quality Checks:**
```yaml
quality_control_fields:
  signal_to_noise_ratio:
    type: decimal
    required: false
    minimum: 2.0
    validation_message: "SNR below 2.0 may indicate poor image quality"
    
  background_subtraction:
    type: dropdown
    required: true
    options: ["None", "Rolling ball", "Gaussian blur", "Manual ROI", "Other"]
    help_text: "Background subtraction method used"
    
  calibration_standard:
    type: dropdown
    required: true
    options: ["Fluorescent beads", "Calibration slide", "Known standard", "None"]
    help_text: "Calibration standard used for this session"
    
  control_samples:
    type: checkbox_group
    required: true
    options: 
      - "Negative control (no primary antibody)"
      - "Secondary only control"
      - "Autofluorescence control"
      - "Positive control"
    help_text: "Control samples included in experiment"
```

![Advanced Validation](images/tutorials/advanced-validation.png)

### Step 7: External Database Integration

**Equipment Database Integration:**
```yaml
equipment_apis:
  microscope_database:
    endpoint: "https://lab-equipment.institution.edu/api/microscopes"
    authentication: "api_key"
    cache_duration: 3600  # 1 hour
    fields:
      - microscope_id
      - model
      - manufacturer
      - available_objectives
      - light_sources
      - detectors
      
  objective_database:
    endpoint: "https://lab-equipment.institution.edu/api/objectives"
    authentication: "api_key"
    fields:
      - objective_id
      - magnification
      - numerical_aperture
      - immersion_medium
      - working_distance
      - manufacturer
      
  protocol_repository:
    endpoint: "https://protocols.institution.edu/api/protocols"
    authentication: "oauth2"
    search_fields: ["title", "tags", "author"]
    return_fields: ["protocol_id", "title", "version", "url"]
```

**Literature and Standards Integration:**
```yaml
external_references:
  pubmed_integration:
    type: lookup
    api_endpoint: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
    search_field: "pmid"
    return_fields: ["title", "authors", "journal", "year", "doi"]
    help_text: "Enter PubMed ID for automatic citation"
    
  antibody_database:
    type: lookup
    api_endpoint: "https://antibodyregistry.org/api/"
    search_field: "rrid"
    return_fields: ["antibody_name", "target", "host", "clonality"]
    help_text: "Enter RRID for antibody validation"
    
  gene_ontology:
    type: lookup
    api_endpoint: "http://api.geneontology.org/"
    search_field: "term"
    return_fields: ["go_id", "term_name", "definition"]
    help_text: "Link to Gene Ontology terms"
```

![External Database Integration](images/tutorials/external-database-integration.png)

## Part 4: Advanced Field Types and Relationships

### Step 8: Hierarchical Field Relationships

**Imaging Condition Groups:**
```yaml
imaging_conditions:
  type: field_group_array
  min_items: 1
  max_items: 10
  help_text: "Define each imaging condition as a separate group"
  
  group_template:
    condition_name:
      type: text
      required: true
      help_text: "Descriptive name for this imaging condition"
      
    channels:
      type: field_array
      min_items: 1
      max_items: 5
      help_text: "Configure each imaging channel"
      
      item_template:
        channel_name:
          type: text
          required: true
          help_text: "Channel identifier (e.g., DAPI, FITC, Cy3)"
          
        excitation_wavelength:
          type: integer
          required: true
          unit: "nm"
          minimum: 300
          maximum: 800
          help_text: "Excitation wavelength"
          
        emission_filter:
          type: text
          required: true
          help_text: "Emission filter specification"
          
        exposure_time:
          type: decimal
          required: true
          unit: "ms"
          minimum: 0.1
          maximum: 10000
          help_text: "Exposure time per channel"
          
        gain:
          type: decimal
          required: false
          minimum: 1.0
          maximum: 100.0
          help_text: "Camera gain setting"
          
    z_stack_settings:
      type: group
      required: false
      fields:
        z_range:
          type: decimal
          unit: "μm"
          help_text: "Total Z-range to capture"
          
        z_step_size:
          type: decimal
          unit: "μm"
          help_text: "Distance between Z-planes"
          
        z_step_count:
          type: calculated
          formula: "z_range / z_step_size"
          help_text: "Calculated number of Z-steps"
          
    time_lapse_settings:
      type: group
      required: false
      condition:
        field: "../../sample_type"
        equals: "Live Cells"
      fields:
        total_duration:
          type: decimal
          unit: "hours"
          help_text: "Total imaging duration"
          
        time_interval:
          type: decimal
          unit: "minutes"
          help_text: "Time between acquisitions"
          
        number_of_timepoints:
          type: calculated
          formula: "(total_duration * 60) / time_interval"
          help_text: "Calculated number of timepoints"
```

![Hierarchical Field Relationships](images/tutorials/hierarchical-field-relationships.png)

### Step 9: Dynamic Analysis Configuration

**Analysis Pipeline Configuration:**
```yaml
analysis_pipeline:
  type: conditional_group
  condition_field: "analysis_required"
  
  preprocessing_steps:
    type: checkbox_group
    options:
      - "Deconvolution"
      - "Noise reduction"
      - "Background subtraction"
      - "Chromatic aberration correction"
      - "Photobleaching correction"
    help_text: "Select preprocessing steps to apply"
    
  segmentation_method:
    type: dropdown
    required: true
    condition:
      field: "preprocessing_steps"
      operator: "contains"
      value: "Background subtraction"
    options: ["Manual", "Threshold-based", "Machine learning", "Watershed", "Other"]
    help_text: "Primary segmentation approach"
    
  segmentation_parameters:
    type: dynamic_group
    condition_field: "segmentation_method"
    
    threshold_parameters:
      type: group
      condition:
        field: "segmentation_method"
        equals: "Threshold-based"
      fields:
        threshold_method:
          type: dropdown
          options: ["Otsu", "Li", "Manual", "Adaptive"]
        threshold_value:
          type: decimal
          condition:
            field: "threshold_method"
            equals: "Manual"
            
    ml_parameters:
      type: group
      condition:
        field: "segmentation_method"
        equals: "Machine learning"
      fields:
        model_name:
          type: text
          required: true
        model_version:
          type: text
          required: true
        confidence_threshold:
          type: decimal
          minimum: 0.1
          maximum: 1.0
          
  quantification_metrics:
    type: checkbox_group
    required: true
    options:
      - "Cell count"
      - "Cell area"
      - "Fluorescence intensity"
      - "Colocalization"
      - "Shape parameters"
      - "Spatial distribution"
    help_text: "Measurements to extract from images"
```

![Dynamic Analysis Configuration](images/tutorials/dynamic-analysis-configuration.png)

## Part 5: Quality Control and Automation

### Step 10: Automated Quality Checks

**Image Quality Assessment:**
```yaml
quality_metrics:
  automated_checks:
    focus_quality:
      type: calculated
      formula: "calculate_focus_score(image_variance, edge_sharpness)"
      threshold: 0.7
      warning_message: "Images may be out of focus (score < 0.7)"
      
    saturation_check:
      type: calculated
      formula: "percentage_saturated_pixels(image_histogram)"
      threshold: 5.0
      warning_message: "More than 5% of pixels are saturated"
      
    signal_distribution:
      type: calculated
      formula: "coefficient_of_variation(signal_intensities)"
      threshold: 0.3
      info_message: "Signal variation within expected range"
      
  manual_quality_scores:
    overall_image_quality:
      type: dropdown
      required: true
      options: ["Excellent", "Good", "Acceptable", "Poor", "Unusable"]
      help_text: "Overall assessment of image quality"
      
    focus_assessment:
      type: dropdown
      required: true
      options: ["Sharp", "Slightly soft", "Out of focus", "Motion blur"]
      help_text: "Visual assessment of image focus"
      
    artifact_presence:
      type: checkbox_group
      options:
        - "Dust/debris"
        - "Optical aberrations"
        - "Photobleaching"
        - "Sample drift"
        - "Stage vibration"
        - "None observed"
      help_text: "Visible artifacts in images"
```

**Experimental Controls Validation:**
```yaml
controls_validation:
  negative_control_assessment:
    background_level:
      type: decimal
      required: true
      help_text: "Background fluorescence in negative control"
      
    signal_to_background:
      type: calculated
      formula: "experimental_signal / background_level"
      minimum_threshold: 3.0
      warning_message: "Signal-to-background ratio below recommended 3:1"
      
  positive_control_assessment:
    expected_signal_present:
      type: dropdown
      required: true
      options: ["Yes", "No", "Weak", "Variable"]
      help_text: "Presence of expected signal in positive control"
      
    signal_intensity:
      type: dropdown
      required: true
      options: ["Strong", "Moderate", "Weak", "Absent"]
      help_text: "Intensity of positive control signal"
```

![Quality Control Automation](images/tutorials/quality-control-automation.png)

### Step 11: Workflow State Management

**Experiment Progress Tracking:**
```yaml
workflow_status:
  experiment_phase:
    type: dropdown
    required: true
    options: ["Planning", "Sample Prep", "Imaging", "Analysis", "Complete"]
    default: "Planning"
    help_text: "Current phase of experiment"
    
  completion_checklist:
    type: dynamic_checklist
    depends_on: "experiment_phase"
    
    planning_checklist:
      condition:
        field: "experiment_phase"
        equals: "Planning"
      items:
        - "Hypothesis formulated"
        - "Sample preparation protocol finalized"
        - "Imaging parameters optimized"
        - "Analysis pipeline planned"
        - "Controls defined"
        
    sample_prep_checklist:
      condition:
        field: "experiment_phase"
        equals: "Sample Prep"
      items:
        - "Samples prepared according to protocol"
        - "Staining completed and validated"
        - "Controls prepared"
        - "Sample quality checked"
        
    imaging_checklist:
      condition:
        field: "experiment_phase"
        equals: "Imaging"
      items:
        - "Microscope calibrated"
        - "Imaging parameters set"
        - "All conditions imaged"
        - "Controls imaged"
        - "Image quality verified"
        
  data_completeness:
    type: calculated
    formula: "calculate_data_completeness(planned_conditions, completed_conditions)"
    display_format: "{value}% complete"
    
  next_steps:
    type: textarea
    required: false
    help_text: "Notes on next actions needed"
```

![Workflow State Management](images/tutorials/workflow-state-management.png)

## Part 6: Testing and Validation

### Step 12: Template Testing

**Create Test Project:**
1. Save your advanced template
2. Go to **🚀 Create Project** tab
3. Select the advanced microscopy template
4. Fill out the form to test all conditional logic:

**Test Scenarios:**
```yaml
Test Case 1: Fixed Cell Confocal Imaging
- Sample Type: "Fixed Cells"
- Cell Line: "HeLa"
- Microscope: "Zeiss LSM 880"
- Objective: "63x/1.4 Oil"
- Stains: 3 primary antibodies
- Analysis: "Machine learning segmentation"

Test Case 2: Live Cell Widefield Imaging
- Sample Type: "Live Cells"
- Cell Line: "U2OS"
- Microscope: "Nikon Eclipse Ti"
- Objective: "40x/0.6"
- Time-lapse: "2 hours, 5-minute intervals"
- Analysis: "Threshold-based segmentation"

Test Case 3: Tissue Section Super-Resolution
- Sample Type: "Tissue Sections"
- Tissue: "Brain"
- Microscope: "Zeiss Airyscan"
- Section thickness: "20 μm"
- Stains: "DAPI + 2 primary antibodies"
```

**Validation Checklist:**
- ✅ Conditional fields appear/disappear correctly
- ✅ Calculated fields update automatically
- ✅ Validation rules trigger appropriately
- ✅ External API lookups function (if configured)
- ✅ Quality control checks activate
- ✅ Workflow progress tracking works

![Template Testing](images/tutorials/template-testing.png)

### Step 13: Error Handling and Edge Cases

**Common Issues and Solutions:**

**Circular Dependencies:**
```yaml
# Problem: Field A depends on Field B, which depends on Field A
# Solution: Redesign dependencies or use intermediate calculations

# Instead of:
field_a:
  type: calculated
  formula: "field_b * 2"
  
field_b:
  type: calculated
  formula: "field_a / 2"

# Use:
base_value:
  type: number
  required: true
  
field_a:
  type: calculated
  formula: "base_value * 2"
  
field_b:
  type: calculated
  formula: "base_value"
```

**API Timeout Handling:**
```yaml
equipment_lookup:
  type: lookup
  api_endpoint: "https://equipment.lab.edu/api"
  timeout: 10  # seconds
  fallback_behavior: "manual_entry"
  fallback_message: "Equipment database unavailable. Please enter manually."
  cache_results: true
  retry_attempts: 3
```

**Complex Validation Edge Cases:**
```yaml
validation_rules:
  - name: "Wavelength compatibility with zero tolerance"
    rule: "abs(excitation_wavelength - laser_wavelength) <= wavelength_tolerance"
    parameters:
      wavelength_tolerance: 5  # nm
    fallback: "if wavelength_tolerance undefined then wavelength_tolerance = 10"
    
  - name: "Handle missing equipment specifications"
    rule: "if objective_na is null then skip_nyquist_validation = true"
    message: "Nyquist validation skipped due to missing objective specifications"
```

![Error Handling](images/tutorials/error-handling.png)

## Part 7: Advanced Integration and Customization

### Step 14: Custom Field Types

**Creating Domain-Specific Fields:**
```yaml
# Custom field for microscopy filter specifications
filter_specification:
  type: custom_filter_field
  validation_pattern: "^[0-9]{3}/[0-9]{2}[m|x]$"
  example: "488/10x"
  help_text: "Format: center_wavelength/bandwidth followed by 'm' or 'x'"
  
# Custom field for spatial coordinates
roi_coordinates:
  type: custom_coordinate_field
  coordinate_system: "stage_coordinates"
  units: "μm"
  validation:
    x_range: [-50000, 50000]
    y_range: [-50000, 50000]
    z_range: [-1000, 1000]
    
# Custom field for color specifications
fluorophore_color:
  type: custom_color_field
  color_space: "emission_spectrum"
  validation_against: "available_detection_filters"
```

**Integration with Institution-Specific Systems:**
```yaml
institutional_integrations:
  grant_database:
    endpoint: "https://grants.institution.edu/api"
    authentication: "institutional_sso"
    fields: ["grant_number", "pi_name", "title", "budget_code"]
    
  equipment_booking:
    endpoint: "https://booking.institution.edu/api"
    authentication: "api_key"
    actions: ["check_availability", "create_booking", "get_booking_info"]
    
  sample_tracking:
    endpoint: "https://lims.institution.edu/api"
    authentication: "oauth2"
    bidirectional_sync: true
    fields: ["sample_id", "preparation_date", "storage_location"]
```

![Custom Field Types](images/tutorials/custom-field-types.png)

### Step 15: Template Inheritance and Versioning

**Create Template Hierarchy:**
```yaml
# Base microscopy template
base_microscopy_template:
  name: "Microscopy Base Template"
  version: "1.0"
  core_fields:
    - experiment_identification
    - basic_sample_info
    - microscope_selection
    - image_acquisition_basics
    
# Specialized confocal template
confocal_microscopy_template:
  name: "Confocal Microscopy Template"
  inherits: "base_microscopy_template"
  version: "1.1"
  additional_fields:
    - laser_configuration
    - pinhole_settings
    - scanning_parameters
    - advanced_optics
    
# Super-specialized live cell confocal template
live_cell_confocal_template:
  name: "Live Cell Confocal Template"
  inherits: "confocal_microscopy_template"
  version: "1.0"
  additional_fields:
    - environmental_control
    - time_lapse_settings
    - photobleaching_optimization
    - cell_viability_monitoring
```

**Version Control System:**
```yaml
template_versioning:
  version_tracking: true
  backward_compatibility: true
  migration_rules:
    - from_version: "1.0"
      to_version: "1.1"
      field_mappings:
        old_field_name: "new_field_name"
      new_fields:
        - field_name: "new_required_field"
          default_value: "auto_detect"
      deprecated_fields:
        - field_name: "obsolete_field"
          migration_strategy: "ignore"
```

![Template Inheritance](images/tutorials/template-inheritance.png)

## Part 8: Performance and Scalability

### Step 16: Optimization for Large Datasets

**Performance Considerations:**
```yaml
performance_settings:
  lazy_loading:
    enabled: true
    threshold: 50  # fields
    priority_fields: ["experiment_id", "title", "date"]
    
  api_optimization:
    batch_requests: true
    cache_duration: 3600  # seconds
    request_throttling: 10  # requests per second
    
  validation_optimization:
    async_validation: true
    client_side_validation: true
    server_side_validation: true
    validation_debounce: 500  # milliseconds
    
  ui_optimization:
    progressive_disclosure: true
    collapsible_sections: true
    field_grouping: true
    auto_save_interval: 30  # seconds
```

**Scalability Planning:**
```yaml
scalability_features:
  multi_user_support:
    concurrent_editing: false
    user_isolation: true
    shared_lookups: true
    
  enterprise_features:
    ldap_integration: true
    audit_logging: true
    backup_automation: true
    compliance_reporting: true
    
  api_scalability:
    rate_limiting: true
    horizontal_scaling: true
    caching_strategy: "redis"
    database_optimization: true
```

![Performance Optimization](images/tutorials/performance-optimization.png)

## Part 9: Deployment and Maintenance

### Step 17: Template Deployment Strategy

**Team Deployment:**
1. **Template Testing**
   - Test with pilot users
   - Collect feedback and iterate
   - Validate all conditional logic
   - Check performance with real data

2. **Training Materials**
   - Create user guides for complex features
   - Record video tutorials for conditional logic
   - Develop troubleshooting documentation
   - Plan training sessions

3. **Rollout Plan**
   - Phase 1: Core team members
   - Phase 2: Extended research group
   - Phase 3: Department-wide deployment
   - Phase 4: Institution-wide availability

4. **Support Structure**
   - Designate template maintainers
   - Establish feedback collection system
   - Create issue tracking system
   - Plan regular template reviews

![Deployment Strategy](images/tutorials/deployment-strategy.png)

### Step 18: Maintenance and Evolution

**Template Maintenance Workflow:**
```yaml
maintenance_schedule:
  weekly_tasks:
    - Monitor template usage statistics
    - Review user feedback and issues
    - Check external API functionality
    - Update cache and optimize performance
    
  monthly_tasks:
    - Analyze metadata quality and completeness
    - Review and update validation rules
    - Update equipment database integrations
    - Collect suggestions for improvements
    
  quarterly_tasks:
    - Major template updates and new features
    - Version migration planning
    - User training and documentation updates
    - Performance optimization and scaling
    
  annual_tasks:
    - Complete template architecture review
    - Integration with new institutional systems
    - Compliance and audit requirement updates
    - Long-term roadmap planning
```

**Quality Monitoring:**
```yaml
quality_metrics:
  user_experience:
    completion_rate: ">95%"
    average_completion_time: "<20 minutes"
    user_satisfaction_score: ">4.0/5.0"
    error_rate: "<5%"
    
  data_quality:
    metadata_completeness: ">90%"
    validation_failure_rate: "<10%"
    data_consistency_score: ">95%"
    integration_success_rate: ">98%"
    
  system_performance:
    template_load_time: "<3 seconds"
    api_response_time: "<2 seconds"
    validation_response_time: "<1 second"
    system_availability: ">99.5%"
```

![Maintenance and Evolution](images/tutorials/maintenance-evolution.png)

## Summary and Next Steps

### What You've Accomplished

**✅ Advanced Template Design:**
- Created sophisticated conditional metadata schemas
- Implemented cross-field validation and dependencies
- Integrated external databases and APIs
- Built complex hierarchical field relationships

**✅ Quality Control Systems:**
- Automated validation and quality checks
- Workflow state management
- Error handling and edge case management
- Performance optimization strategies

**✅ Enterprise-Ready Features:**
- Template inheritance and versioning
- Scalability and performance considerations
- Deployment and maintenance planning
- Quality monitoring and metrics

**✅ Integration Capabilities:**
- External API integration patterns
- Custom field type development
- Institution-specific system connections
- Multi-system data synchronization

![Tutorial Accomplishments](images/tutorials/advanced-accomplishments.png)

### Key Takeaways

**Design Principles:**
- Start with user needs and workflow requirements
- Build complexity gradually with clear hierarchies
- Always plan for future maintenance and evolution
- Balance functionality with usability

**Technical Excellence:**
- Implement robust validation and error handling
- Optimize for performance and scalability
- Plan for integration with external systems
- Design with security and compliance in mind

**Operational Success:**
- Involve users in design and testing
- Create comprehensive documentation and training
- Establish maintenance and support workflows
- Monitor quality and continuously improve

### Advanced Applications

**Research Data Management:**
- Implement FAIR data principles
- Connect with institutional repositories
- Enable automated compliance reporting
- Support long-term data preservation

**Laboratory Information Systems:**
- Integrate with LIMS and equipment booking
- Automate sample tracking and chain of custody
- Connect with inventory management
- Enable real-time resource allocation

**Collaborative Research:**
- Support multi-institutional projects
- Enable secure data sharing
- Implement role-based access control
- Facilitate remote collaboration

### Continuing Your Journey

**Next Tutorials:**
- **[Integration Workflows](integration-workflows.md)** - Complex multi-system workflows
- **[Multi-User Setup](multi-user-setup.md)** - Team collaboration and management

**Advanced Topics:**
- Machine learning integration for metadata prediction
- Real-time data validation and quality monitoring
- Advanced analytics and reporting systems
- Custom integration development

**Community Engagement:**
- Share templates with the research community
- Contribute to open source development
- Participate in standards development
- Mentor other researchers in data management

---

**Congratulations!** You've mastered advanced metadata schema design in MetaFold. These skills will enable you to create sophisticated, maintainable, and scalable research data management systems that grow with your research needs.

*Advanced metadata schemas are the foundation of truly intelligent research data management. Use these patterns to build systems that not only organize your data but actively improve your research workflow.*