# Tutorial: Integration Workflows

This comprehensive tutorial demonstrates advanced integration workflows combining elabFTW and OMERO with MetaFold. You'll learn to create seamless multi-system workflows that span from project planning to data publication, with automated synchronization and cross-system data management.

![Integration Workflows Tutorial](images/tutorials/integration-workflows-tutorial.png)

## Tutorial Overview

**What You'll Learn:**
- Design integrated workflows across MetaFold, elabFTW, and OMERO
- Set up automated data synchronization between systems
- Create cross-system project tracking and management
- Implement quality control workflows spanning multiple platforms
- Build publication-ready data packages with complete provenance

**What You'll Build:**
A complete multi-modal imaging workflow featuring:
- Coordinated project creation across all three systems
- Automated metadata synchronization
- Cross-system data validation and quality control
- Integrated analysis and reporting workflows
- Publication-ready data organization

**Prerequisites:**
- Completed [Basic Experiment Tutorial](basic-experiment.md)
- Access to elabFTW server with API permissions
- Access to OMERO server with dataset creation rights
- Understanding of microscopy workflows (helpful)
- Basic knowledge of research data management principles

**Time Required:** 90-120 minutes

![Tutorial Prerequisites](images/tutorials/integration-prerequisites.png)

## Part 1: Integration Architecture Overview

### Understanding the Integration Ecosystem

**System Roles and Responsibilities:**

**MetaFold - Project Organization Hub**
- Central project structure and metadata management
- Template-driven standardization
- Cross-system coordination and synchronization
- Local file organization and workflow management

**elabFTW - Documentation and Protocol Management**
- Detailed experimental protocols and procedures
- Daily notes, observations, and troubleshooting
- Team collaboration and knowledge sharing
- Compliance and audit trail documentation

**OMERO - Image Data Management and Analysis**
- Large-scale image storage and organization
- Advanced image analysis and processing
- Collaborative image viewing and annotation
- Integration with analysis software and pipelines

![Integration Ecosystem](images/tutorials/integration-ecosystem.png)

### Workflow Design Principles

**Data Flow Architecture:**
```
MetaFold (Project Creation)
    ↓
├── elabFTW (Protocol & Documentation)
│   ├── Experiment entries
│   ├── Protocol attachments
│   └── Progress tracking
│
└── OMERO (Image Management)
    ├── Dataset creation
    ├── Map annotations
    └── Analysis workflows
    
Cross-System Synchronization
├── Metadata consistency
├── Status updates
├── File references
└── Quality control
```

**Integration Patterns:**
- **Sequential Integration** - Systems activated in logical order
- **Parallel Integration** - Simultaneous system activation
- **Conditional Integration** - Systems activated based on criteria
- **Bidirectional Sync** - Two-way data synchronization
- **Event-Driven Updates** - System responses to state changes

![Integration Patterns](images/tutorials/integration-patterns.png)

## Part 2: Setting Up the Integration Environment

### Step 1: System Configuration and Testing

**elabFTW Setup Verification:**
1. **Test API Access**
   - Go to Settings > elabFTW in MetaFold
   - Enter server URL: `https://your-elabftw-server.com`
   - Enter API key (with write permissions)
   - Click "Test Connection"
   - Verify green success status

2. **Team and Permission Setup**
   - Ensure you belong to appropriate elabFTW team
   - Verify experiment creation permissions
   - Check extra field creation capabilities
   - Test manual experiment creation in elabFTW web interface

![elabFTW Setup](images/tutorials/elabftw-setup-verification.png)

**OMERO Setup Verification:**
1. **Start Python Proxy Server**
   ```bash
   cd /path/to/MetaFold
   python omero_proxy.py --port 8000 --omero-server https://your-omero-server.com
   ```

2. **Test OMERO Connection**
   - Go to Settings > OMERO in MetaFold
   - Enter server URL: `https://your-omero-server.com`
   - Enter username and password
   - Click "Test Connection"
   - Verify group access and permissions

3. **Verify Dataset Creation Rights**
   - Test manual dataset creation in OMERO.web
   - Check map annotation creation permissions
   - Verify group permissions for collaboration

![OMERO Setup](images/tutorials/omero-setup-verification.png)

### Step 2: Create Integrated Template

**Template Design for Multi-System Workflow:**
1. **Create New Template**
   - Go to Templates tab in MetaFold
   - Click "Create New Template"
   - Name: "Multi-Modal Imaging Workflow"
   - Type: Experiment Template

2. **Enhanced Folder Structure for Integration**
   ```
   01_project_management/
   ├── protocols/
   ├── elabftw_exports/
   ├── omero_metadata/
   └── integration_logs/
   
   02_sample_preparation/
   ├── preparation_protocols/
   ├── quality_control/
   ├── preparation_images/
   └── batch_records/
   
   03_imaging/
   ├── acquisition_protocols/
   ├── raw_images/
   │   ├── condition_1/
   │   ├── condition_2/
   │   └── controls/
   ├── omero_import_logs/
   └── calibration_data/
   
   04_analysis/
   ├── omero_analysis/
   ├── external_analysis/
   ├── results/
   └── quality_metrics/
   
   05_documentation/
   ├── elabftw_exports/
   ├── daily_notes/
   ├── troubleshooting/
   └── final_reports/
   
   06_publication/
   ├── figures/
   ├── supplementary_data/
   ├── metadata_packages/
   └── data_availability/
   ```

![Integrated Template Structure](images/tutorials/integrated-template-structure.png)

3. **Integration-Optimized Metadata Schema**
   ```yaml
   # Project Identification (shared across systems)
   project_identifier:
     type: text
     required: true
     pattern: "^[A-Z]{3}[0-9]{6}$"
     help_text: "Unique project ID (e.g., IMG123456)"
   
   experiment_title:
     type: text
     required: true
     max_length: 200
     help_text: "Title used across all systems"
   
   principal_investigator:
     type: text
     required: true
     help_text: "PI name for all system entries"
   
   # Integration Control
   enable_elabftw:
     type: checkbox
     default: true
     help_text: "Create elabFTW experiment entry"
   
   enable_omero:
     type: checkbox
     default: true
     help_text: "Create OMERO dataset"
   
   # elabFTW-specific fields
   elabftw_experiment_type:
     type: dropdown
     condition:
       field: enable_elabftw
       equals: true
     options: ["Microscopy", "Cell Culture", "Biochemistry", "Other"]
     help_text: "elabFTW experiment category"
   
   elabftw_tags:
     type: text
     condition:
       field: enable_elabftw
       equals: true
     help_text: "Comma-separated tags for elabFTW"
   
   # OMERO-specific fields
   omero_group:
     type: dropdown
     condition:
       field: enable_omero
       equals: true
     options_source: "omero_groups_api"
     help_text: "Target OMERO group"
   
   omero_project_link:
     type: dropdown
     condition:
       field: enable_omero
       equals: true
     options: ["Create New", "Link to Existing"]
     help_text: "OMERO project connection strategy"
   
   # Shared experimental metadata
   research_question:
     type: textarea
     required: true
     help_text: "Central research question (shared in all systems)"
   
   experimental_approach:
     type: textarea
     required: true
     help_text: "Overall experimental strategy"
   
   expected_outcomes:
     type: textarea
     required: false
     help_text: "Predicted results and success criteria"
   
   # Sample information (synchronized across systems)
   sample_type:
     type: dropdown
     required: true
     options: ["Fixed Cells", "Live Cells", "Tissue", "Other"]
   
   sample_preparation_protocol:
     type: text
     required: true
     help_text: "Reference to preparation protocol"
   
   # Imaging parameters (for OMERO metadata)
   imaging_modality:
     type: dropdown
     required: true
     options: ["Confocal", "Widefield", "Super-resolution", "Light sheet"]
   
   microscope_system:
     type: text
     required: true
     help_text: "Microscope model and configuration"
   
   # Data management and sharing
   data_sharing_level:
     type: dropdown
     required: true
     options: ["Private", "Group", "Institution", "Public"]
     help_text: "Intended data sharing scope"
   
   publication_plan:
     type: dropdown
     required: false
     options: ["No publication", "Conference", "Journal", "Preprint"]
     help_text: "Planned publication outlet"
   ```

![Integration Metadata Schema](images/tutorials/integration-metadata-schema.png)

## Part 3: Creating an Integrated Project

### Step 3: Project Creation with Full Integration

**Create Multi-System Project:**
1. **Navigate to Create Project**
   - Go to 🚀 Create Project tab
   - Select "Multi-Modal Imaging Workflow" template

2. **Complete Metadata Form**
   ```yaml
   Project Details:
   - Project Identifier: "IMG202501"
   - Experiment Title: "Protein Localization in Response to Heat Stress"
   - Principal Investigator: "[Your Name]"
   
   Integration Settings:
   - Enable elabFTW: ✅ Yes
   - Enable OMERO: ✅ Yes
   - elabFTW Experiment Type: "Microscopy"
   - elabFTW Tags: "protein localization, heat stress, fluorescence"
   - OMERO Group: "[Your Group]"
   - OMERO Project Link: "Create New"
   
   Research Content:
   - Research Question: "How does heat stress affect the subcellular localization of heat shock proteins in HeLa cells?"
   - Experimental Approach: "Live cell fluorescence microscopy with temperature control to track protein redistribution during stress response"
   - Expected Outcomes: "Rapid translocation from cytoplasm to nucleus upon heat stress"
   
   Sample Information:
   - Sample Type: "Live Cells"
   - Sample Preparation Protocol: "HeLa_transfection_protocol_v2.1"
   
   Imaging Details:
   - Imaging Modality: "Confocal"
   - Microscope System: "Zeiss LSM 880 with environmental control"
   
   Data Management:
   - Data Sharing Level: "Group"
   - Publication Plan: "Journal"
   ```

3. **Create Integrated Project**
   - Review all settings
   - Click "Create Project"
   - Monitor progress for both integrations
   - Verify success messages for all systems

![Integrated Project Creation](images/tutorials/integrated-project-creation.png)

### Step 4: Verify Cross-System Creation

**Check MetaFold Project:**
- ✅ Folder structure created correctly
- ✅ `elabftw-metadata.json` file present
- ✅ Integration status logged in `01_project_management/integration_logs/`

**Verify elabFTW Experiment:**
1. **Open elabFTW Link**
   - Click elabFTW link from MetaFold success message
   - Or navigate to elabFTW web interface manually

2. **Verify Experiment Details**
   - ✅ Title matches MetaFold project
   - ✅ All metadata appears in extra fields
   - ✅ Tags are correctly applied
   - ✅ Experiment status is "Running"

3. **Check Initial Content**
   - Research question in experiment body
   - Link back to MetaFold project path
   - Placeholder sections for protocols and results

![elabFTW Verification](images/tutorials/elabftw-verification.png)

**Verify OMERO Dataset:**
1. **Open OMERO Link**
   - Click OMERO link from MetaFold success message
   - Or navigate to OMERO.web interface

2. **Verify Dataset Creation**
   - ✅ Dataset name matches project title
   - ✅ Dataset in correct group and project
   - ✅ Map annotations contain MetaFold metadata
   - ✅ Dataset description includes project reference

3. **Check Metadata Annotations**
   - All key metadata fields present as map annotations
   - Proper data types and formatting
   - Cross-reference information to elabFTW

![OMERO Verification](images/tutorials/omero-verification.png)

## Part 4: Workflow Implementation

### Step 5: Protocol Development and Documentation

**Phase 1: Protocol Development in elabFTW**

1. **Access elabFTW Experiment**
   - Open elabFTW from MetaFold project link
   - Navigate to experiment entry

2. **Create Detailed Protocol Section**
   ```markdown
   # Heat Stress Protein Localization Protocol

   ## Objective
   Track the subcellular localization of heat shock protein 70 (HSP70) in HeLa cells during heat stress response using live cell confocal microscopy.

   ## Materials and Equipment
   - HeLa cells expressing fluorescently-tagged HSP70
   - Environmental chamber for temperature control
   - Zeiss LSM 880 confocal microscope
   - Live cell imaging medium
   - Temperature monitoring system

   ## Experimental Design
   ### Conditions
   1. Control: 37°C (physiological temperature)
   2. Mild stress: 42°C for 30 minutes
   3. Severe stress: 45°C for 15 minutes
   4. Recovery: Return to 37°C for 60 minutes

   ### Imaging Parameters
   - Objective: 63x/1.4 Oil immersion
   - Excitation: 488 nm (GFP-HSP70)
   - Emission: 500-550 nm
   - Time interval: 2 minutes
   - Duration: 2 hours total

   ## Step-by-Step Procedure
   1. **Cell Preparation** (Day -1)
      - Seed HeLa cells on glass-bottom dishes
      - Transfect with GFP-HSP70 construct
      - Incubate overnight at 37°C

   2. **Microscope Setup** (Day 0)
      - Pre-warm environmental chamber to 37°C
      - Calibrate temperature monitoring
      - Set up imaging parameters
      - Test focus stability

   3. **Baseline Imaging**
      - Mount dish on microscope stage
      - Select 5-10 cells per condition
      - Record baseline localization (10 minutes)

   4. **Stress Application**
      - Gradually increase temperature to test condition
      - Monitor cell viability and morphology
      - Continue imaging throughout stress period

   5. **Recovery Phase**
      - Return temperature to 37°C
      - Monitor protein relocalization
      - Document recovery kinetics

   ## Quality Control
   - Cell viability assessment (morphology, membrane integrity)
   - Temperature stability monitoring (±0.5°C)
   - Focus drift correction
   - Photobleaching assessment

   ## Data Collection
   - Raw images saved to OMERO dataset: [Dataset Link]
   - Quantitative analysis in MetaFold project folder
   - Time-lapse movies for publication

   ## Expected Results
   - Baseline: Cytoplasmic HSP70 distribution
   - Stress: Rapid nuclear translocation (within 5-10 minutes)
   - Recovery: Gradual return to cytoplasmic localization

   ## Troubleshooting
   [To be updated during experiment]

   ## References
   - [Link to relevant literature]
   - [Link to previous experiments]
   ```

3. **Add Protocol Files**
   - Upload detailed protocols as attachments
   - Link to institutional SOP documents
   - Include equipment manuals and calibration data

![Protocol Development](images/tutorials/protocol-development.png)

### Step 6: Sample Preparation with Cross-System Documentation

**Phase 2: Sample Preparation Documentation**

1. **Create Preparation Log in elabFTW**
   ```markdown
   # Sample Preparation Log - IMG202501

   ## Date: [Preparation Date]

   ## Cell Culture Status
   - **HeLa Cell Line**: Passage 15 (within recommended range)
   - **Culture Condition**: 37°C, 5% CO2, 95% humidity
   - **Medium**: DMEM + 10% FBS + 1% Pen/Strep
   - **Confluency**: 60-70% (optimal for transfection)

   ## Transfection Protocol
   - **Plasmid**: pEGFP-HSP70 (5 μg per dish)
   - **Transfection Reagent**: Lipofectamine 3000
   - **Transfection Efficiency**: ~70% (estimated from GFP fluorescence)
   - **Incubation Time**: 24 hours post-transfection

   ## Quality Control Results
   - **Cell Viability**: >95% (Trypan blue exclusion)
   - **GFP Expression**: Visible in majority of cells
   - **Cell Morphology**: Normal, healthy appearance
   - **Contamination Check**: Negative

   ## Dish Preparation
   - **Substrate**: 35mm glass-bottom dishes (MatTek)
   - **Coating**: Poly-L-lysine (0.1 mg/mL, 1 hour)
   - **Cell Density**: 2×10^5 cells per dish
   - **Number of Dishes**: 6 (2 per condition + 2 spare)

   ## Pre-Imaging Setup
   - **Medium Exchange**: Phenol-red free DMEM + HEPES
   - **CO2 Independence**: HEPES buffering for environmental chamber
   - **Temperature Equilibration**: 30 minutes at 37°C

   ## Sample Storage and Backup
   - **Primary Samples**: Ready for immediate imaging
   - **Backup Cultures**: Maintained in incubator
   - **Frozen Stocks**: Available if re-preparation needed

   ## Images and Documentation
   - Phase contrast images saved to: `/02_sample_preparation/preparation_images/`
   - Fluorescence validation images in OMERO dataset
   - Preparation protocol followed: `HeLa_transfection_protocol_v2.1`

   ## Next Steps
   - Confirm stable GFP expression
   - Set up environmental chamber
   - Begin imaging within 24-48 hours of transfection

   ## Cross-Reference
   - **MetaFold Project**: IMG202501
   - **OMERO Dataset**: [Dataset ID]
   - **Related Experiments**: [Links to previous preparations]
   ```

2. **Update MetaFold Project Files**
   - Save preparation notes to `02_sample_preparation/batch_records/`
   - Document any protocol deviations
   - Create preparation image catalog

![Sample Preparation Documentation](images/tutorials/sample-preparation-documentation.png)

### Step 7: Image Acquisition and OMERO Integration

**Phase 3: Coordinated Image Acquisition**

1. **Pre-Acquisition Setup**
   ```markdown
   ## Microscope Configuration - [Date]

   ### System Calibration
   - **Microscope**: Zeiss LSM 880
   - **Objective**: Plan-Apochromat 63x/1.4 Oil DIC M27
   - **Immersion Oil**: Zeiss Immersol 518F
   - **Calibration Standard**: Argolight slide AR-2X
   - **Pixel Size**: 50 nm × 50 nm (verified)

   ### Environmental Control
   - **Temperature Control**: Zeiss Heating Unit XL S1
   - **CO2 Control**: Not used (HEPES buffering)
   - **Humidity**: Controlled chamber environment
   - **Temperature Stability**: ±0.2°C (monitored continuously)

   ### Acquisition Parameters
   - **Laser Lines**: 488 nm (2% power)
   - **Detection**: PMT 2, gain 700-800
   - **Pixel Dwell**: 2 μs
   - **Averaging**: 2x line averaging
   - **Frame Size**: 1024 × 1024 pixels
   - **Zoom**: 1.0x (field of view: 133 × 133 μm)

   ### Time-Lapse Settings
   - **Interval**: 2 minutes
   - **Duration**: 120 minutes (60 time points)
   - **Z-Stack**: None (single plane imaging)
   - **Multiple Positions**: 5-8 cells per condition

   ### Data Storage
   - **Format**: .czi files (Zeiss native format)
   - **Backup**: Automatic to network storage
   - **OMERO Import**: Scheduled post-acquisition
   ```

2. **Live Imaging Session Documentation**
   ```markdown
   ## Live Imaging Session - [Date and Time]

   ### Session Overview
   - **Start Time**: [Time]
   - **Operator**: [Your Name]
   - **Experiment ID**: IMG202501
   - **Session Code**: IMG202501_Session01

   ### Experimental Conditions
   #### Condition 1: Control (37°C)
   - **Dish ID**: Dish_01
   - **Cell Positions**: 5 positions marked
   - **Baseline Period**: 0-20 minutes
   - **Temperature**: 37.0°C ± 0.1°C
   - **Cell Health**: Excellent, normal morphology

   #### Condition 2: Mild Stress (42°C)
   - **Dish ID**: Dish_02
   - **Cell Positions**: 6 positions marked
   - **Stress Application**: 20-50 minutes
   - **Temperature Ramp**: 37°C to 42°C over 5 minutes
   - **Stress Duration**: 30 minutes at 42°C
   - **Observations**: Visible protein redistribution by 25 minutes

   #### Condition 3: Severe Stress (45°C)
   - **Dish ID**: Dish_03
   - **Cell Positions**: 5 positions marked
   - **Stress Application**: 20-35 minutes
   - **Temperature Ramp**: 37°C to 45°C over 5 minutes
   - **Stress Duration**: 15 minutes at 45°C
   - **Observations**: Rapid nuclear accumulation, some cell rounding

   ### Technical Issues and Solutions
   - **Focus Drift**: Minimal, software correction effective
   - **Photobleaching**: <10% over 2 hours (acceptable)
   - **Stage Vibration**: None detected
   - **Temperature Overshoots**: ±0.5°C during ramp (within tolerance)

   ### Data Quality Assessment
   - **Image Quality**: Excellent signal-to-noise ratio
   - **Temporal Resolution**: Sufficient to capture dynamics
   - **Spatial Resolution**: Clear subcellular detail
   - **Quantification Suitability**: Suitable for intensity analysis

   ### Post-Acquisition Actions
   - [ ] Images uploaded to OMERO dataset
   - [ ] Metadata synchronized across systems
   - [ ] Backup verification completed
   - [ ] Initial quality control review
   - [ ] Analysis pipeline preparation
   ```

3. **OMERO Image Import and Organization**
   ```bash
   # Example OMERO import command
   omero import --name "IMG202501_Session01" \
                --dataset "Protein Localization Heat Stress" \
                /path/to/images/*.czi
   ```

![Image Acquisition Documentation](images/tutorials/image-acquisition-documentation.png)

## Part 5: Analysis and Cross-System Data Management

### Step 8: Integrated Analysis Workflow

**Phase 4: Analysis with Multi-System Coordination**

1. **Analysis Planning in elabFTW**
   ```markdown
   # Analysis Plan - IMG202501

   ## Analysis Objectives
   1. **Quantify protein localization** changes during stress response
   2. **Measure kinetics** of nuclear translocation
   3. **Compare** different stress conditions
   4. **Generate** publication-quality figures

   ## Analysis Pipeline
   ### 1. Image Preprocessing (OMERO + FIJI)
   - Background subtraction (rolling ball, radius 20px)
   - Noise reduction (Gaussian blur, σ=0.5)
   - Drift correction (template matching)
   - Intensity normalization (histogram matching)

   ### 2. Cell Segmentation (OMERO + CellProfiler)
   - Nuclear segmentation (DAPI or DIC channel)
   - Cytoplasm definition (expansion from nucleus)
   - Cell boundary detection (fluorescence threshold)
   - Quality filtering (size, shape, intensity)

   ### 3. Quantitative Analysis (MetaFold + R/Python)
   - Nuclear/cytoplasmic intensity ratio calculation
   - Time-course analysis and curve fitting
   - Statistical testing (ANOVA, post-hoc tests)
   - Data visualization and figure generation

   ### 4. Quality Control Metrics
   - Signal-to-noise ratio assessment
   - Photobleaching correction validation
   - Cell viability tracking
   - Technical replicate consistency

   ## Analysis Timeline
   - **Week 1**: Image preprocessing and quality control
   - **Week 2**: Segmentation optimization and validation
   - **Week 3**: Quantitative analysis and statistics
   - **Week 4**: Figure generation and manuscript preparation

   ## Software and Tools
   - **OMERO**: Image storage, viewing, and basic analysis
   - **FIJI/ImageJ**: Image preprocessing and measurements
   - **CellProfiler**: Automated segmentation pipeline
   - **R/RStudio**: Statistical analysis and visualization
   - **MetaFold**: Data organization and workflow coordination

   ## Output Organization
   - **Raw Analysis Data**: MetaFold `/04_analysis/results/`
   - **Processed Images**: OMERO derived data
   - **Statistical Results**: MetaFold `/04_analysis/statistics/`
   - **Figures**: MetaFold `/05_documentation/figures/`
   ```

2. **OMERO Analysis Integration**
   ```python
   # Example OMERO analysis script
   import omero
   from omero.gateway import BlitzGateway
   import numpy as np
   import pandas as pd

   # Connect to OMERO
   conn = BlitzGateway(username, password, host=host, port=port)
   conn.connect()

   # Access dataset
   dataset_id = 12345  # From OMERO integration
   dataset = conn.getObject("Dataset", dataset_id)

   # Process images
   results = []
   for image in dataset.listChildren():
       # Extract pixel data
       pixels = image.getPrimaryPixels()
       
       # Perform analysis
       nuclear_intensity = analyze_nuclear_region(pixels)
       cytoplasm_intensity = analyze_cytoplasm_region(pixels)
       ratio = nuclear_intensity / cytoplasm_intensity
       
       # Store results with metadata
       result = {
           'image_id': image.getId(),
           'image_name': image.getName(),
           'nuclear_intensity': nuclear_intensity,
           'cytoplasm_intensity': cytoplasm_intensity,
           'nc_ratio': ratio,
           'timestamp': extract_timestamp(image),
           'condition': extract_condition(image)
       }
       results.append(result)

   # Save results to MetaFold project
   df = pd.DataFrame(results)
   df.to_csv('/path/to/metafold/project/04_analysis/results/quantification.csv')

   # Add analysis results as OMERO annotations
   for result in results:
       image_id = result['image_id']
       add_map_annotation(conn, image_id, result)

   conn.close()
   ```

3. **Cross-System Result Synchronization**
   ```markdown
   ## Analysis Results Summary

   ### Key Findings
   - **Baseline Localization**: 75% cytoplasmic, 25% nuclear (N/C ratio: 0.33)
   - **Mild Stress Response**: 45% cytoplasmic, 55% nuclear (N/C ratio: 1.22)
   - **Severe Stress Response**: 20% cytoplasmic, 80% nuclear (N/C ratio: 4.00)
   - **Recovery Phase**: Partial return to baseline (N/C ratio: 0.65)

   ### Statistical Analysis
   - **ANOVA**: F(3,156) = 247.3, p < 0.001
   - **Post-hoc Tests**: All pairwise comparisons significant (p < 0.01)
   - **Effect Size**: η² = 0.826 (large effect)

   ### Quality Metrics
   - **Sample Size**: n=40 cells per condition
   - **Technical Replicates**: 3 independent imaging sessions
   - **Reproducibility**: CV < 15% between replicates
   - **Statistical Power**: >99% for detected effect sizes

   ### Data Location
   - **Raw Quantification**: MetaFold `/04_analysis/results/quantification.csv`
   - **Statistical Analysis**: MetaFold `/04_analysis/statistics/statistical_tests.R`
   - **OMERO Annotations**: Attached to each image as map annotations
   - **elabFTW Documentation**: Detailed in experiment entry [Link]
   ```

![Integrated Analysis Workflow](images/tutorials/integrated-analysis-workflow.png)

## Part 6: Publication and Data Sharing

### Step 9: Publication-Ready Data Package

**Phase 5: Data Organization for Publication**

1. **Create Publication Data Package**
   ```
   06_publication/
   ├── figures/
   │   ├── figure_1_localization_timecourse.pdf
   │   ├── figure_2_quantification_summary.pdf
   │   ├── figure_3_statistical_analysis.pdf
   │   └── supplementary_movie_1.avi
   ├── raw_data/
   │   ├── quantification_data.csv
   │   ├── metadata_complete.json
   │   └── image_analysis_parameters.txt
   ├── processed_data/
   │   ├── normalized_intensities.csv
   │   ├── statistical_results.csv
   │   └── time_course_fits.csv
   ├── metadata_packages/
   │   ├── omero_dataset_metadata.xml
   │   ├── elabftw_experiment_export.pdf
   │   └── metafold_project_summary.json
   └── data_availability/
       ├── omero_access_instructions.md
       ├── elabftw_reference_links.txt
       └── data_sharing_statement.md
   ```

2. **Generate Comprehensive Metadata Package**
   ```json
   {
     "publication_data_package": {
       "experiment_id": "IMG202501",
       "title": "Protein Localization in Response to Heat Stress",
       "authors": ["Your Name", "Collaborator Names"],
       "institution": "Your Institution",
       "publication_date": "2025-06-13",
       
       "data_sources": {
         "metafold_project": {
           "project_path": "/path/to/IMG202501",
           "template_version": "Multi-Modal Imaging Workflow v1.0",
           "creation_date": "2025-06-13",
           "metadata_file": "elabftw-metadata.json"
         },
         "elabftw_experiment": {
           "experiment_id": 12345,
           "server_url": "https://elabftw.institution.edu",
           "experiment_url": "https://elabftw.institution.edu/experiments.php?mode=view&id=12345",
           "export_date": "2025-06-13",
           "export_format": "PDF"
         },
         "omero_dataset": {
           "dataset_id": 67890,
           "server_url": "https://omero.institution.edu",
           "dataset_url": "https://omero.institution.edu/webclient/?show=dataset-67890",
           "image_count": 180,
           "total_size_gb": 12.5
         }
       },
       
       "experimental_metadata": {
         "sample_type": "Live HeLa cells",
         "imaging_system": "Zeiss LSM 880",
         "analysis_software": ["OMERO", "FIJI", "CellProfiler", "R"],
         "statistical_methods": ["ANOVA", "Tukey HSD", "Linear mixed models"],
         "quality_control": ["Focus stability", "Photobleaching assessment", "Cell viability"]
       },
       
       "data_availability": {
         "image_data": "Available in OMERO dataset with institutional access",
         "quantitative_data": "Included in supplementary materials",
         "analysis_code": "Available on request",
         "protocols": "Detailed in elabFTW experiment entry"
       },
       
       "reproducibility_information": {
         "template_availability": "MetaFold template shared in institutional repository",
         "protocol_documentation": "Complete protocols in elabFTW with version control",
         "analysis_parameters": "All parameters documented in OMERO annotations",
         "statistical_analysis": "R scripts available with complete parameter settings"
       }
     }
   }
   ```

3. **Cross-System Data Validation**
   ```python
   # Data consistency validation script
   import json
   import pandas as pd
   from omero.gateway import BlitzGateway

   def validate_cross_system_consistency():
       """Validate data consistency across MetaFold, elabFTW, and OMERO"""
       
       # Load MetaFold metadata
       with open('elabftw-metadata.json', 'r') as f:
           metafold_data = json.load(f)
       
       # Connect to OMERO and extract metadata
       conn = BlitzGateway(username, password, host=host)
       conn.connect()
       dataset = conn.getObject("Dataset", dataset_id)
       omero_annotations = extract_map_annotations(dataset)
       
       # Load elabFTW export data
       elabftw_data = parse_elabftw_export('elabftw_experiment_export.pdf')
       
       # Validation checks
       consistency_report = {
           'title_match': check_title_consistency(metafold_data, elabftw_data, omero_annotations),
           'date_match': check_date_consistency(metafold_data, elabftw_data, omero_annotations),
           'investigator_match': check_investigator_consistency(metafold_data, elabftw_data),
           'metadata_completeness': check_metadata_completeness(metafold_data, omero_annotations),
           'data_integrity': check_data_file_integrity()
       }
       
       # Generate validation report
       return consistency_report

   # Run validation
   validation_results = validate_cross_system_consistency()
   print("Cross-system validation completed:", validation_results)
   ```

![Publication Data Package](images/tutorials/publication-data-package.png)

### Step 10: Data Sharing and Archive Preparation

**Phase 6: Long-term Data Management**

1. **Prepare Data Sharing Statement**
   ```markdown
   # Data Availability Statement - IMG202501

   ## Data Accessibility
   The datasets generated and analyzed during this study are available through multiple complementary systems:

   ### Image Data
   - **Location**: OMERO server at [Institution]
   - **Dataset ID**: 67890
   - **Access**: Available to institutional users with proper authentication
   - **External Access**: Available upon reasonable request to corresponding author
   - **Format**: Original .czi files with complete metadata
   - **Size**: 12.5 GB (180 images across 3 conditions)

   ### Quantitative Data
   - **Location**: Supplementary materials and institutional repository
   - **Format**: CSV files with complete measurement data
   - **Analysis Code**: R scripts and CellProfiler pipelines available on request
   - **Statistical Data**: Complete statistical analysis results included

   ### Experimental Documentation
   - **Protocols**: Detailed protocols available in elabFTW experiment entry
   - **Daily Notes**: Complete experimental log with troubleshooting information
   - **Quality Control**: All quality metrics and validation data included

   ### Metadata and Provenance
   - **Project Organization**: Complete MetaFold project structure available
   - **Cross-System Links**: Full traceability between all data management systems
   - **Version Control**: All template and protocol versions documented

   ## Reuse and Reproducibility
   - **Template Sharing**: MetaFold templates available in institutional template library
   - **Protocol Standardization**: All protocols follow institutional SOPs
   - **Analysis Reproducibility**: Complete parameter documentation enables exact replication
   - **Quality Standards**: All data meets institutional quality control requirements

   ## Contact Information
   For data access requests or questions about experimental procedures:
   - **Corresponding Author**: [Email]
   - **Data Management Contact**: [Institution Data Office]
   - **Technical Support**: [IT Support for OMERO/elabFTW access]

   ## Compliance and Ethics
   - **Data Management Plan**: Follows institutional DMP requirements
   - **Retention Policy**: Data will be maintained for minimum 10 years
   - **Privacy**: No personally identifiable information included
   - **Funding Compliance**: Meets all funder data sharing requirements
   ```

2. **Archive Package Creation**
   ```bash
   # Create comprehensive archive package
   mkdir IMG202501_archive_package
   cd IMG202501_archive_package

   # Copy essential data files
   cp -r ../06_publication/ ./publication_materials/
   cp ../elabftw-metadata.json ./metadata/
   cp ../01_project_management/integration_logs/* ./integration_logs/

   # Generate system exports
   # OMERO metadata export
   omero metadata get Dataset:67890 > ./metadata/omero_metadata.xml

   # elabFTW experiment export
   # (exported manually from web interface)
   cp ../05_documentation/elabftw_exports/* ./elabftw_documentation/

   # Create archive manifest
   cat > archive_manifest.txt << EOF
   Archive Package: IMG202501 - Protein Localization Heat Stress Study
   Creation Date: $(date)
   Creator: [Your Name]
   Institution: [Your Institution]

   Contents:
   - publication_materials/: All publication-ready data and figures
   - metadata/: Complete metadata from all systems
   - integration_logs/: System integration and synchronization logs
   - elabftw_documentation/: Complete experimental documentation
   - omero_references/: Image data access information
   - validation_reports/: Data quality and consistency validation

   Access Information:
   - OMERO Dataset: 67890 on [server]
   - elabFTW Experiment: 12345 on [server]
   - MetaFold Project: IMG202501

   Verification:
   - MD5 checksums: checksums.md5
   - File count: $(find . -type f | wc -l) files
   - Total size: $(du -sh . | cut -f1)
   EOF

   # Generate checksums for integrity verification
   find . -type f -exec md5sum {} \; > checksums.md5

   # Create final archive
   cd ..
   tar -czf IMG202501_archive_$(date +%Y%m%d).tar.gz IMG202501_archive_package/
   ```

![Archive Preparation](images/tutorials/archive-preparation.png)

## Part 7: Advanced Integration Patterns

### Step 11: Automated Workflow Orchestration

**Advanced Automation Features:**

1. **Event-Driven Integration Updates**
   ```python
   # Example webhook handler for cross-system updates
   from flask import Flask, request, jsonify
   import json

   app = Flask(__name__)

   @app.route('/webhook/elabftw_update', methods=['POST'])
   def handle_elabftw_update():
       """Handle updates from elabFTW and sync to other systems"""
       data = request.json
       
       if data['event_type'] == 'experiment_updated':
           experiment_id = data['experiment_id']
           
           # Update OMERO annotations
           update_omero_annotations(experiment_id, data['metadata'])
           
           # Update MetaFold project files
           update_metafold_documentation(experiment_id, data['content'])
           
           # Log integration activity
           log_integration_event('elabftw_update', experiment_id, data)
           
       return jsonify({'status': 'success'})

   @app.route('/webhook/omero_import', methods=['POST'])
   def handle_omero_import():
       """Handle new image imports to OMERO"""
       data = request.json
       
       if data['event_type'] == 'images_imported':
           dataset_id = data['dataset_id']
           
           # Update elabFTW with import notification
           notify_elabftw_image_import(dataset_id, data['image_count'])
           
           # Update MetaFold project status
           update_project_imaging_status(dataset_id, 'images_imported')
           
       return jsonify({'status': 'success'})
   ```

2. **Batch Project Management**
   ```python
   # Batch project creation for large studies
   def create_batch_integrated_projects(project_configs):
       """Create multiple integrated projects with consistent settings"""
       
       results = []
       for config in project_configs:
           try:
               # Create MetaFold project
               metafold_result = create_metafold_project(config)
               
               # Create elabFTW experiment
               elabftw_result = create_elabftw_experiment(config, metafold_result)
               
               # Create OMERO dataset
               omero_result = create_omero_dataset(config, metafold_result)
               
               # Link all systems
               link_cross_system_references(metafold_result, elabftw_result, omero_result)
               
               results.append({
                   'project_id': config['project_id'],
                   'status': 'success',
                   'metafold_path': metafold_result['path'],
                   'elabftw_id': elabftw_result['experiment_id'],
                   'omero_dataset': omero_result['dataset_id']
               })
               
           except Exception as e:
               results.append({
                   'project_id': config['project_id'],
                   'status': 'failed',
                   'error': str(e)
               })
               
       return results

   # Example batch configuration
   batch_configs = [
       {
           'project_id': 'IMG202501',
           'title': 'Heat Stress Condition 1',
           'temperature': 42,
           'duration': 30
       },
       {
           'project_id': 'IMG202502',
           'title': 'Heat Stress Condition 2',
           'temperature': 45,
           'duration': 15
       }
       # ... more configurations
   ]

   batch_results = create_batch_integrated_projects(batch_configs)
   ```

![Advanced Automation](images/tutorials/advanced-automation.png)

### Step 12: Quality Control and Validation Workflows

**Comprehensive Quality Assurance:**

1. **Automated Quality Checks**
   ```python
   def run_integration_quality_checks(project_id):
       """Comprehensive quality validation across all systems"""
       
       quality_report = {
           'project_id': project_id,
           'timestamp': datetime.now().isoformat(),
           'checks': {}
       }
       
       # MetaFold project structure validation
       metafold_checks = validate_metafold_project_structure(project_id)
       quality_report['checks']['metafold'] = metafold_checks
       
       # elabFTW experiment validation
       elabftw_checks = validate_elabftw_experiment_consistency(project_id)
       quality_report['checks']['elabftw'] = elabftw_checks
       
       # OMERO dataset validation
       omero_checks = validate_omero_dataset_metadata(project_id)
       quality_report['checks']['omero'] = omero_checks
       
       # Cross-system consistency validation
       consistency_checks = validate_cross_system_consistency(project_id)
       quality_report['checks']['consistency'] = consistency_checks
       
       # Generate overall score
       quality_report['overall_score'] = calculate_quality_score(quality_report['checks'])
       quality_report['recommendations'] = generate_improvement_recommendations(quality_report)
       
       return quality_report

   def validate_metafold_project_structure(project_id):
       """Validate MetaFold project structure and metadata"""
       checks = {
           'folder_structure_complete': check_folder_structure(project_id),
           'metadata_file_valid': validate_metadata_json(project_id),
           'integration_logs_present': check_integration_logs(project_id),
           'file_permissions_correct': check_file_permissions(project_id)
       }
       return checks

   def validate_elabftw_experiment_consistency(project_id):
       """Validate elabFTW experiment data consistency"""
       checks = {
           'experiment_exists': check_elabftw_experiment_exists(project_id),
           'metadata_synchronized': check_elabftw_metadata_sync(project_id),
           'links_functional': check_elabftw_cross_references(project_id),
           'permissions_appropriate': check_elabftw_permissions(project_id)
       }
       return checks

   def validate_omero_dataset_metadata(project_id):
       """Validate OMERO dataset and annotations"""
       checks = {
           'dataset_exists': check_omero_dataset_exists(project_id),
           'annotations_complete': check_omero_map_annotations(project_id),
           'permissions_set': check_omero_permissions(project_id),
           'metadata_searchable': check_omero_search_functionality(project_id)
       }
       return checks
   ```

2. **Compliance and Audit Trail**
   ```python
   def generate_compliance_report(project_id):
       """Generate comprehensive compliance report for auditing"""
       
       report = {
           'project_information': get_project_metadata(project_id),
           'data_management_compliance': {
               'fair_principles': assess_fair_compliance(project_id),
               'institutional_policies': check_institutional_compliance(project_id),
               'funder_requirements': validate_funder_compliance(project_id),
               'data_protection': assess_data_protection_compliance(project_id)
           },
           'technical_compliance': {
               'backup_status': check_backup_compliance(project_id),
               'access_controls': validate_access_controls(project_id),
               'version_control': check_version_control(project_id),
               'documentation_completeness': assess_documentation(project_id)
           },
           'integration_status': {
               'system_connectivity': test_all_system_connections(project_id),
               'data_synchronization': verify_cross_system_sync(project_id),
               'error_handling': check_error_recovery_procedures(project_id),
               'performance_metrics': collect_performance_data(project_id)
           }
       }
       
       return report

   # Generate audit trail
   audit_trail = generate_audit_trail(project_id)
   compliance_report = generate_compliance_report(project_id)
   
   # Save reports
   save_compliance_documentation(project_id, audit_trail, compliance_report)
   ```

![Quality Control Workflows](images/tutorials/quality-control-workflows.png)

## Summary and Advanced Applications

### What You've Accomplished

**✅ Complete Integration Mastery:**
- Designed and implemented sophisticated multi-system workflows
- Created seamless data synchronization between MetaFold, elabFTW, and OMERO
- Built comprehensive quality control and validation systems
- Established publication-ready data management practices

**✅ Advanced Workflow Automation:**
- Implemented event-driven integration updates
- Created batch project management capabilities
- Built automated quality assurance systems
- Established compliance and audit workflows

**✅ Professional Data Management:**
- Designed comprehensive metadata strategies
- Implemented cross-system validation and consistency checks
- Created publication-ready data packages
- Established long-term data preservation workflows

![Integration Mastery](images/tutorials/integration-mastery.png)

### Key Integration Patterns Mastered

**Sequential Workflows:**
- Planned protocol development → Sample preparation → Image acquisition → Analysis → Publication
- Each phase builds on previous work with complete traceability

**Parallel System Management:**
- Simultaneous updates across multiple platforms
- Coordinated data entry and validation
- Cross-system consistency maintenance

**Event-Driven Automation:**
- Automatic updates triggered by system events
- Intelligent workflow orchestration
- Error detection and recovery procedures

### Real-World Applications

**Multi-Institutional Collaborations:**
- Shared project templates and standards
- Coordinated data sharing across institutions
- Consistent quality control procedures
- Unified publication preparation workflows

**Large-Scale Research Programs:**
- Batch project creation for systematic studies
- Automated data collection and organization
- Comprehensive progress tracking and reporting
- Scalable quality assurance procedures

**Regulatory Compliance:**
- Complete audit trails and documentation
- Validation of data integrity and consistency
- Compliance with institutional and funder requirements
- Long-term data preservation and accessibility

### Advanced Extensions

**Custom Integration Development:**
- Additional laboratory information systems
- Specialized analysis software integration
- Custom workflow automation tools
- Institution-specific compliance systems

**Machine Learning Integration:**
- Automated metadata extraction from images
- Intelligent quality control and error detection
- Predictive analytics for research planning
- Smart template and workflow recommendations

**Cloud and High-Performance Computing:**
- Cloud-based data storage and processing
- High-performance computing integration
- Distributed analysis workflows
- Scalable infrastructure deployment

![Advanced Applications](images/tutorials/advanced-applications.png)

## Next Steps and Continuing Education

### Immediate Applications
1. **Implement in Your Research** - Apply these workflows to your actual research projects
2. **Team Training** - Share knowledge with research group members
3. **Template Development** - Create domain-specific templates for your field
4. **Quality Improvement** - Continuously refine workflows based on experience

### Advanced Learning Paths
1. **[Multi-User Setup Tutorial](multi-user-setup.md)** - Team collaboration and administration
2. **Custom Integration Development** - Build integrations with additional systems
3. **Advanced Analytics** - Machine learning and automated analysis workflows
4. **Institutional Deployment** - Large-scale implementation strategies

### Community Contribution
1. **Share Templates** - Contribute successful templates to community repositories
2. **Best Practices Documentation** - Document lessons learned and optimization strategies
3. **Training Development** - Create training materials for other researchers
4. **Standards Development** - Participate in research data management standards initiatives

---

**Congratulations!** You've mastered advanced integration workflows that represent the cutting edge of research data management. These skills enable you to create sophisticated, automated, and highly reliable research workflows that span multiple systems and support the complete research lifecycle from planning to publication.

*The future of research data management lies in seamless integration, automation, and intelligent workflow orchestration. You now have the skills to build and implement these advanced systems.*