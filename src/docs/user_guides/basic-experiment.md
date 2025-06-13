# Tutorial: Basic Experiment Setup

This hands-on tutorial walks you through creating your first complete experiment project in MetaFold, from template design to project creation and data organization. By the end, you'll have a working experiment project and understand the complete workflow.

![Basic Experiment Tutorial](images/tutorials/basic-experiment-tutorial.png)

## Tutorial Overview

**What You'll Learn:**
- Create a custom experiment template from scratch
- Design effective metadata schemas for research
- Create and organize your first experiment project
- Understand folder structures and file organization
- Set up basic integration with elabFTW (optional)

**What You'll Build:**
A complete experiment project for studying "Cell Growth Under Different Temperature Conditions" with:
- Standardized folder structure
- Rich metadata collection
- Integration-ready setup
- Documentation templates

**Prerequisites:**
- MetaFold installed and running
- Basic familiarity with the interface
- Optional: elabFTW server access for integration

**Time Required:** 30-45 minutes

![Tutorial Overview](images/tutorials/tutorial-overview.png)

## Part 1: Template Design and Creation

### Step 1: Planning Your Experiment Template

Before creating the template, let's plan what we need:

**Research Question:** "How does temperature affect bacterial cell growth rates?"

**Information We Need to Track:**
- Basic experiment information (title, date, researcher)
- Bacterial strain and culture conditions
- Temperature settings and control parameters
- Data collection methods and timepoints
- Expected outcomes and hypotheses

**Folder Structure We Need:**
```
Cell_Growth_Temperature_Study/
├── protocols/              # Experimental procedures
├── culture_prep/          # Culture preparation documentation
├── data/
│   ├── raw_measurements/  # Direct measurement data
│   ├── processed/         # Cleaned and analyzed data
│   └── images/           # Photos of cultures, plates, etc.
├── analysis/
│   ├── scripts/          # Analysis code
│   └── results/          # Analysis outputs
├── documentation/
│   ├── daily_notes/      # Day-by-day observations
│   ├── troubleshooting/  # Issues and solutions
│   └── final_report/     # Summary and conclusions
└── references/           # Literature and protocols
```

![Experiment Planning](images/tutorials/experiment-planning.png)

### Step 2: Create the Template

**Access Template Creation:**
1. Open MetaFold
2. Go to **📋 Templates** tab
3. Click **"Create New Template"**
4. Select **"Experiment Template"** for full features

**Basic Template Information:**
- **Name:** `Cell Growth Temperature Study`
- **Description:** `Template for studying bacterial cell growth rates under different temperature conditions`
- **Type:** Experiment Template

![Template Creation Start](images/tutorials/template-creation-start.png)

### Step 3: Build the Folder Structure

Add folders one by one in the **Folder Structure** section:

**Core Folders:**
```
protocols
culture_prep
data
data/raw_measurements
data/processed
data/images
analysis
analysis/scripts
analysis/results
documentation
documentation/daily_notes
documentation/troubleshooting
documentation/final_report
references
```

**Pro Tips:**
- Use forward slashes for subfolders: `data/raw_measurements`
- Keep folder names short but descriptive
- Use underscores instead of spaces
- Think about the workflow when organizing

![Folder Structure Creation](images/tutorials/folder-structure-creation.png)

### Step 4: Design the Metadata Schema

Now create metadata fields that capture essential experimental information:

**Basic Information Group:**
```yaml
Experiment Title:
  Type: Text
  Required: Yes
  Help: "Descriptive title for this specific experiment"

Principal Investigator:
  Type: Text
  Required: Yes
  Help: "Lead researcher responsible for this experiment"

Experiment Date:
  Type: Date
  Required: Yes
  Default: Today
  Help: "Date when experiment was started"

Lab Notebook Reference:
  Type: Text
  Required: No
  Help: "Page number or reference in physical lab notebook"
```

**Bacterial Culture Group:**
```yaml
Bacterial Strain:
  Type: Dropdown
  Options: ["E. coli K-12", "E. coli DH5α", "B. subtilis", "S. aureus", "Other"]
  Required: Yes
  Help: "Bacterial strain used in this experiment"

Culture Medium:
  Type: Text
  Required: Yes
  Help: "Type of growth medium (e.g., LB broth, M9 minimal)"

Initial Cell Density:
  Type: Number
  Required: Yes
  Unit: "CFU/mL"
  Help: "Starting cell concentration"

Culture Volume:
  Type: Number
  Required: Yes
  Unit: "mL"
  Help: "Total volume of culture per condition"
```

**Temperature Conditions Group:**
```yaml
Temperature Conditions:
  Type: Text
  Required: Yes
  Help: "List of temperature conditions tested (e.g., 25°C, 30°C, 37°C)"

Control Temperature:
  Type: Number
  Required: Yes
  Unit: "°C"
  Help: "Standard control temperature"

Incubation Method:
  Type: Dropdown
  Options: ["Shaking incubator", "Static incubator", "Water bath", "Other"]
  Required: Yes
  Help: "Method used for temperature control"

Measurement Interval:
  Type: Number
  Required: Yes
  Unit: "hours"
  Help: "How often growth measurements were taken"
```

**Data Collection Group:**
```yaml
Measurement Method:
  Type: Dropdown
  Options: ["OD600 spectrophotometry", "Colony counting", "Cell counting", "Other"]
  Required: Yes
  Help: "Primary method for measuring cell growth"

Number of Replicates:
  Type: Number
  Required: Yes
  Minimum: 1
  Help: "Number of replicate cultures per condition"

Experiment Duration:
  Type: Number
  Required: Yes
  Unit: "hours"
  Help: "Total length of experiment"

Expected Outcome:
  Type: Textarea
  Required: No
  Help: "Hypothesis and expected results"
```

![Metadata Schema Design](images/tutorials/metadata-schema-design.png)

### Step 5: Save and Test Template

**Save Your Template:**
1. Review all folder structure entries
2. Check that metadata fields are complete
3. Click **"Save Template"**
4. Verify template appears in template list

**Test Template Preview:**
1. Find your new template in the Templates tab
2. Click the template card to see preview
3. Review folder structure tree
4. Check metadata field preview
5. Make adjustments if needed

![Template Save and Test](images/tutorials/template-save-test.png)

## Part 2: Creating Your First Experiment Project

### Step 6: Project Creation Setup

**Navigate to Project Creation:**
1. Go to **🚀 Create Project** tab
2. Select your "Cell Growth Temperature Study" template
3. Review the template preview to confirm it's correct

**Choose Project Location:**
1. Click **"Browse"** to select location
2. Choose a directory where you have write permissions
3. Good locations: Desktop, Documents, or dedicated research folder
4. Verify you have sufficient disk space

![Project Creation Setup](images/tutorials/project-creation-setup.png)

### Step 7: Complete the Metadata Form

Fill out the form with realistic experimental data:

**Basic Information:**
- **Experiment Title:** `E_coli_Growth_Temperature_Comparison_2025`
- **Principal Investigator:** `[Your Name]`
- **Experiment Date:** `[Today's Date]`
- **Lab Notebook Reference:** `Notebook 3, Pages 45-52`

**Bacterial Culture:**
- **Bacterial Strain:** `E. coli K-12`
- **Culture Medium:** `LB broth with glucose`
- **Initial Cell Density:** `1000000` (1×10⁶ CFU/mL)
- **Culture Volume:** `50` mL

**Temperature Conditions:**
- **Temperature Conditions:** `20°C, 25°C, 30°C, 37°C, 42°C`
- **Control Temperature:** `37`
- **Incubation Method:** `Shaking incubator`
- **Measurement Interval:** `2` hours

**Data Collection:**
- **Measurement Method:** `OD600 spectrophotometry`
- **Number of Replicates:** `3`
- **Experiment Duration:** `24` hours
- **Expected Outcome:** `Growth rate should increase with temperature up to optimal point (~37°C), then decrease at higher temperatures due to thermal stress`

![Metadata Form Completion](images/tutorials/metadata-form-completion.png)

### Step 8: Create the Project

**Final Review:**
1. Double-check all metadata entries
2. Verify project location is correct
3. Ensure template selection is right

**Create Project:**
1. Click **"Create Project"** button
2. Watch the progress indicator
3. Wait for completion message

**Success Confirmation:**
- Green success message appears
- Project summary shows key information
- Links provided to open project folder
- Metadata file location displayed

![Project Creation Success](images/tutorials/project-creation-success.png)

## Part 3: Project Organization and Usage

### Step 9: Explore Your Project Structure

**Open Project Folder:**
1. Click **"Open Project Folder"** from success message
2. Explore the created directory structure
3. Notice all folders from template are created
4. Find the `elabftw-metadata.json` file

**Project Structure Verification:**
```
E_coli_Growth_Temperature_Comparison_2025/
├── protocols/
├── culture_prep/
├── data/
│   ├── raw_measurements/
│   ├── processed/
│   └── images/
├── analysis/
│   ├── scripts/
│   └── results/
├── documentation/
│   ├── daily_notes/
│   ├── troubleshooting/
│   └── final_report/
├── references/
└── elabftw-metadata.json
```

![Project Structure Exploration](images/tutorials/project-structure-exploration.png)

### Step 10: Organize Initial Project Files

**Create Initial Documentation:**

**In `protocols/` folder:**
1. Create `bacterial_culture_protocol.md`:
```markdown
# Bacterial Culture Protocol

## Materials
- E. coli K-12 strain
- LB broth with glucose
- Sterile flasks
- Shaking incubator

## Procedure
1. Prepare overnight starter culture at 37°C
2. Dilute to target cell density
3. Distribute to experimental flasks
4. Set up temperature conditions
5. Begin measurements

## Safety Notes
- Work in sterile conditions
- Follow institutional biosafety guidelines
```

2. Create `growth_measurement_protocol.md`:
```markdown
# Growth Measurement Protocol

## Equipment
- Spectrophotometer (600nm)
- Sterile cuvettes
- Pipettes and tips

## Measurement Procedure
1. Remove 1mL aliquot from culture
2. Measure OD600 in spectrophotometer
3. Record measurement with timestamp
4. Return sample or discard appropriately
5. Repeat every 2 hours

## Data Recording
- Use standardized data sheets
- Include temperature and time for each measurement
- Note any unusual observations
```

![Initial Documentation](images/tutorials/initial-documentation.png)

**In `culture_prep/` folder:**
Create `culture_preparation_log.md`:
```markdown
# Culture Preparation Log

## Date: [Experiment Date]

## Starter Culture
- Strain: E. coli K-12
- Medium: LB broth with glucose
- Incubation: 37°C, 200 rpm, overnight
- Final OD600: [to be measured]

## Experimental Cultures
- Target initial density: 1×10⁶ CFU/mL
- Volume per flask: 50 mL
- Number of conditions: 5 temperatures
- Replicates per condition: 3
- Total flasks: 15

## Temperature Setup
- 20°C: Flasks 1-3
- 25°C: Flasks 4-6
- 30°C: Flasks 7-9
- 37°C: Flasks 10-12 (control)
- 42°C: Flasks 13-15

## Notes
[Space for preparation notes and observations]
```

### Step 11: Set Up Data Collection Templates

**In `data/raw_measurements/` folder:**
Create `growth_data_template.csv`:
```csv
Date,Time,Temperature_C,Flask_ID,Replicate,OD600,Notes
2025-06-13,09:00,37,10,1,0.1,Initial measurement
2025-06-13,09:00,37,11,2,0.1,Initial measurement
2025-06-13,09:00,37,12,3,0.1,Initial measurement
```

**In `documentation/daily_notes/` folder:**
Create `day_1_observations.md`:
```markdown
# Day 1 Observations

## Date: [Experiment Date]

## Morning Setup (9:00 AM)
- All cultures prepared successfully
- Initial OD600 measurements taken
- Temperature verification completed
- All equipment functioning normally

## Hourly Observations
### 11:00 AM (2 hours)
- Measurements: [to be recorded]
- Observations: [note any changes]

### 1:00 PM (4 hours)
- Measurements: [to be recorded]
- Observations: [note any changes]

[Continue for each timepoint]

## Issues and Solutions
[Document any problems and how they were resolved]

## Tomorrow's Plan
[Note any adjustments or special observations needed]
```

![Data Collection Setup](images/tutorials/data-collection-setup.png)

## Part 4: Working with Your Experiment (Simulation)

### Step 12: Simulate Data Collection

Let's simulate how you would use this project during an actual experiment:

**Hour 0 (Start of Experiment):**
1. Open `data/raw_measurements/growth_data_template.csv`
2. Record initial measurements for all flasks
3. Update `documentation/daily_notes/day_1_observations.md` with setup notes
4. Take photos of experimental setup, save in `data/images/`

**Hour 2 (First Measurement):**
1. Take OD600 measurements for all cultures
2. Add data to CSV file
3. Note any visual observations in daily log
4. Check temperature consistency across incubators

**Continue Pattern:**
- Regular measurements every 2 hours
- Update documentation with observations
- Note any issues in troubleshooting log
- Take photos of cultures showing growth differences

![Simulated Data Collection](images/tutorials/simulated-data-collection.png)

### Step 13: Analysis Preparation

**In `analysis/scripts/` folder:**
Create `growth_analysis.R` (or `.py`):
```r
# Growth Rate Analysis Script
# Analysis of bacterial growth under different temperatures

# Load required libraries
library(ggplot2)
library(dplyr)

# Load data
growth_data <- read.csv("../../data/processed/growth_data_cleaned.csv")

# Calculate growth rates
# [Analysis code would go here]

# Generate plots
# [Plotting code would go here]

# Statistical analysis
# [Statistics code would go here]

# Export results
# [Export code would go here]
```

**In `analysis/results/` folder (after analysis):**
- `growth_curves.png` - Growth curve plots
- `growth_rates_table.csv` - Calculated growth rates
- `statistical_analysis.txt` - Statistical test results
- `temperature_optimum.png` - Temperature vs growth rate plot

### Step 14: Documentation and Reporting

**In `documentation/final_report/` folder:**
Create `experiment_summary.md`:
```markdown
# Cell Growth Temperature Study - Final Report

## Objective
To determine the effect of temperature on E. coli K-12 growth rates.

## Methods
- Temperatures tested: 20°C, 25°C, 30°C, 37°C, 42°C
- Growth measured by OD600 every 2 hours for 24 hours
- 3 biological replicates per condition

## Results
[Summary of findings]

## Key Observations
- Optimal growth at 37°C as expected
- Significant growth reduction at 42°C
- Minimal growth at 20°C

## Conclusions
[Interpretation of results]

## Future Experiments
[Suggestions for follow-up studies]
```

![Final Documentation](images/tutorials/final-documentation.png)

## Part 5: Advanced Features (Optional)

### Step 15: elabFTW Integration (If Available)

If you have access to an elabFTW server, you can enhance this tutorial:

**Enable Integration:**
1. Go to **Settings > elabFTW**
2. Enter your server URL and API key
3. Test the connection

**Create Integrated Project:**
1. Return to **Create Project** tab
2. Select the same template
3. Enable **"Sync with elabFTW"** option
4. Fill metadata form
5. Create project with integration

**Benefits:**
- Experiment automatically created in elabFTW
- Metadata synchronized as extra fields
- Direct link from project to lab notebook entry
- Team collaboration through elabFTW sharing

![elabFTW Integration](images/tutorials/elabftw-integration.png)

### Step 16: Project Discovery

**Use Project Scanner:**
1. Go to **🔍 Discover Projects** tab
2. Scan the directory containing your project
3. See your project appear in scan results
4. Explore project metadata and relationships

**Benefits:**
- Find all related experiments
- Analyze experiment patterns across time
- Identify template usage and evolution
- Generate reports on research productivity

## Part 6: Review and Next Steps

### What You've Accomplished

**✅ Template Mastery:**
- Created a comprehensive experiment template
- Designed effective metadata schema
- Built logical folder structure
- Understood template reusability

**✅ Project Organization:**
- Created well-structured experiment project
- Set up documentation workflows
- Prepared for data collection and analysis
- Established reproducible practices

**✅ Metadata Management:**
- Captured essential experimental information
- Used appropriate field types and validation
- Created searchable, structured data
- Enabled future discovery and reuse

**✅ Workflow Understanding:**
- Learned complete MetaFold workflow
- Understood file organization principles
- Prepared for integration with lab systems
- Set foundation for team collaboration

![Tutorial Accomplishments](images/tutorials/tutorial-accomplishments.png)

### Key Takeaways

**Template Design Principles:**
- Start with clear experimental objectives
- Plan folder structure to match workflow
- Design metadata for future discovery
- Balance completeness with usability

**Project Organization Best Practices:**
- Use consistent naming conventions
- Document everything as you go
- Prepare templates for common file types
- Plan for data analysis from the beginning

**Metadata Quality:**
- Capture enough detail for reproduction
- Use controlled vocabularies when possible
- Include context and reasoning
- Make information searchable

### Common Variations

**For Different Experiment Types:**

**Microscopy Experiments:**
- Add folders for `raw_images/`, `processed_images/`, `analysis_software_settings/`
- Include metadata for microscope settings, objectives, wavelengths
- Plan for large image file organization

**Field Studies:**
- Add folders for `site_information/`, `environmental_data/`, `gps_coordinates/`
- Include metadata for location, weather, sampling methods
- Plan for data from multiple sites and dates

**Computational Studies:**
- Add folders for `source_code/`, `input_data/`, `computational_results/`, `performance_logs/`
- Include metadata for software versions, parameters, computational resources
- Plan for version control and reproducible computing

![Experiment Variations](images/tutorials/experiment-variations.png)

## Troubleshooting Common Issues

### Template Creation Issues

**Problem:** Template won't save
- **Check:** All required fields completed
- **Check:** No duplicate folder names
- **Check:** Valid folder path syntax (use forward slashes)

**Problem:** Metadata fields not working correctly
- **Check:** Field type matches data requirements
- **Check:** Validation rules are reasonable
- **Check:** Help text is clear and useful

### Project Creation Issues

**Problem:** Project creation fails
- **Check:** Write permissions to target directory
- **Check:** Sufficient disk space available
- **Check:** No conflicting project names

**Problem:** Folder structure not created correctly
- **Check:** Template folder structure syntax
- **Check:** Operating system file name restrictions
- **Check:** Path length limitations

### Usage Issues

**Problem:** Can't find created projects
- **Solution:** Use Project Scanner to discover projects
- **Solution:** Check metadata file exists and is valid JSON
- **Solution:** Verify project location and accessibility

![Troubleshooting Common Issues](images/tutorials/troubleshooting-issues.png)

## Next Steps and Advanced Tutorials

### Immediate Next Steps

**Customize Your Template:**
- Modify the template based on your actual experimental needs
- Add fields specific to your research domain
- Adjust folder structure for your workflow
- Test with real experiments

**Create Template Variations:**
- Create specialized versions for different experiment types
- Build templates for different research phases
- Develop templates for different team members
- Create templates for different equipment or facilities

### Advanced Tutorials to Explore

**[Advanced Metadata Schemas](advanced-metadata.md):**
- Complex field relationships and conditional logic
- Integration with external databases and APIs
- Advanced validation and quality control
- Metadata inheritance and template families

**[Integration Workflows](integration-workflows.md):**
- Combined elabFTW and OMERO workflows
- Custom integration development
- Automated data transfer and synchronization
- Multi-system project management

**[Multi-User Setup](multi-user-setup.md):**
- Team template sharing and collaboration
- User permission management
- Group workflows and coordination
- Institutional deployment strategies

### Building on This Foundation

**Research Data Management:**
- Develop comprehensive data management plans
- Implement FAIR data principles
- Create institutional template libraries
- Establish quality assurance workflows

**Team Collaboration:**
- Share templates with research group
- Establish common metadata vocabularies
- Coordinate project naming and organization
- Develop training materials for new team members

**Integration with Research Infrastructure:**
- Connect with institutional data repositories
- Integrate with laboratory information systems
- Develop custom analysis workflows
- Plan for long-term data preservation

![Next Steps](images/tutorials/next-steps-advanced.png)

## Resources and Support

### Template Examples

Download additional template examples:
- **Cell Culture Experiments** - Various cell lines and culture conditions
- **Microscopy Studies** - Different imaging modalities and analysis approaches
- **Field Research** - Environmental and ecological study templates
- **Computational Biology** - Bioinformatics and modeling project templates

### Community Resources

**User Community:**
- Template sharing and collaboration
- Best practices discussion
- Troubleshooting help and support
- Feature requests and development input

**Documentation:**
- Complete user guides and reference materials
- Video tutorials and walkthroughs
- API documentation for advanced users
- Integration guides for laboratory systems

### Getting Help

**If You're Stuck:**
1. Review this tutorial step-by-step
2. Check the troubleshooting section
3. Consult the main documentation
4. Ask in community forums
5. Contact support with specific details

**What to Include When Asking for Help:**
- Clear description of the problem
- Steps you've already tried
- Screenshots of error messages
- Your template configuration (without sensitive data)
- System information and MetaFold version

---

**Congratulations!** You've completed your first MetaFold experiment project. You now have the foundation to create organized, reproducible research projects that will serve you well throughout your scientific career.

*Start with this basic template and evolve it based on your research needs. Good organization today saves countless hours tomorrow!*