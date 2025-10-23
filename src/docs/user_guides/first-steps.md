# First Steps

Welcome to MetaFold! This guide will walk you through your first experience with the application, from launching MetaFold to creating your first research project. By the end of this guide, you'll understand the basics and be ready to organize your research data effectively.

![First Steps Overview](images/first-steps-overview.png)

## Launching MetaFold

### First Launch Experience

When you start MetaFold for the first time, you'll see:

1. **Splash Screen** - Brief loading screen with MetaFold logo
2. **Initial Setup Dialog** - Quick configuration for your preferences
3. **Main Interface** - The primary MetaFold workspace

![First Launch Sequence](images/first-launch-sequence.png)

### Initial Configuration

**User Mode Selection:**
- **Simple Mode** - Single user, immediate access to all features
- **Multi-User Mode** - Team-friendly with user accounts and permissions

**Default Settings:**
- **Project Location** - Where your research projects will be created
- **Language** - Interface language (English default)
- **Theme** - Light or dark interface theme

![Initial Configuration](images/initial-configuration.png)

### First Look at the Interface

The MetaFold interface consists of five main tabs:

**📋 Templates** - Create and manage project templates  
**🚀 Create Project** - Generate new research projects  
**🔍 Discover Projects** - Find and analyze existing projects  
**📊 Visualize Data** - Interactive data exploration  
**⚙️ Settings** - Configure integrations and preferences  

![Main Interface Tabs](images/main-interface-tabs.png)

## Understanding Templates

### What Are Templates?

Templates are blueprints for your research projects that define:
- **Folder Structure** - Standard directory organization
- **Metadata Fields** - Information to collect about experiments
- **Integration Settings** - Connections to lab systems

Think of templates as **standardized project formats** that ensure consistency across your research.

![Template Concept](images/template-concept.png)

### Template Types

**📁 Folder Templates**
- Simple directory structures
- Basic metadata collection
- Perfect for file organization

**🧪 Experiment Templates**
- Rich metadata schemas
- Laboratory system integration
- Advanced validation and automation

![Template Types](images/template-types-comparison.png)

### Built-in Templates

MetaFold comes with several example templates to get you started:

**Basic Research Project**
- Standard academic research structure
- Essential metadata fields (title, description, date)
- Good starting point for any research

**Microscopy Experiment**
- Optimized for imaging research
- Technical metadata for instruments and parameters
- Integration-ready for OMERO

**Literature Review**
- Organized approach to literature studies
- Reference management and note organization
- Progress tracking and synthesis planning

![Built-in Templates](images/built-in-templates.png)

## Creating Your First Template

Let's create a simple template for a basic experiment:

### Step 1: Access Template Creation

1. **Go to Templates Tab**
   - Click the **📋 Templates** tab
   - You'll see any existing templates

2. **Start New Template**
   - Click **"Create New Template"** button
   - Choose **"Experiment Template"** for full features

![Template Creation Start](images/template-creation-start.png)

### Step 2: Basic Information

**Template Details:**
- **Name**: "My First Experiment"
- **Description**: "A simple template for basic research experiments"
- **Type**: Experiment Template

![Template Basic Info](images/template-basic-info-first.png)

### Step 3: Define Folder Structure

Add these folders for a basic research structure:

```
protocols/
data/
  raw/
  processed/
analysis/
results/
documentation/
```

**How to Add Folders:**
1. Type folder name in input field
2. Use forward slash for subfolders: `data/raw`
3. Click "Add Folder" or press Enter
4. Repeat for each folder

![Folder Structure Creation](images/folder-structure-creation-first.png)

### Step 4: Add Metadata Fields

Create essential metadata fields:

**Experiment Title** (Text, Required)
- Field name: `title`
- Type: Text
- Required: Yes
- Help text: "Descriptive title for your experiment"

**Description** (Textarea)
- Field name: `description`  
- Type: Textarea
- Required: No
- Help text: "Detailed experiment description"

**Experiment Date** (Date, Required)
- Field name: `date`
- Type: Date
- Required: Yes
- Default: Current date

**Principal Investigator** (Text, Required)
- Field name: `investigator`
- Type: Text  
- Required: Yes
- Default: Your name

![Metadata Fields Creation](images/metadata-fields-creation-first.png)

### Step 5: Save Template

1. **Review Your Template**
   - Check folder structure is correct
   - Verify metadata fields are appropriate
   - Ensure required fields are marked

2. **Save Template**
   - Click **"Save Template"** button
   - Template appears in your template list
   - Ready to use for project creation

![Template Save Success](images/template-save-success.png)

## Creating Your First Project

Now let's use your template to create an actual research project:

### Step 1: Navigate to Project Creation

1. **Go to Create Project Tab**
   - Click **🚀 Create Project** tab
   - You'll see project creation interface

2. **Select Your Template**
   - Choose "My First Experiment" from template list
   - Template preview shows folder structure and metadata

![Project Creation Interface](images/project-creation-interface-first.png)

### Step 2: Choose Project Location

1. **Browse for Location**
   - Click **"Browse"** button next to project path
   - Navigate to where you want to create projects
   - Good locations: Desktop, Documents, or dedicated research folder

2. **Verify Path**
   - Ensure you have write permissions
   - Check sufficient disk space available
   - Path will be remembered for future projects

![Project Location Selection](images/project-location-selection.png)

### Step 3: Fill Metadata Form

Complete the metadata form with your experiment details:

**Experiment Title**: "Cell Growth Rate Analysis"  
**Description**: "Testing the effect of temperature on bacterial cell growth rates using E. coli cultures"  
**Experiment Date**: Today's date (auto-filled)  
**Principal Investigator**: Your name  

![Metadata Form Completion](images/metadata-form-completion-first.png)

### Step 4: Create the Project

1. **Review Settings**
   - Verify template selection
   - Check project location
   - Confirm metadata is complete

2. **Create Project**
   - Click **"Create Project"** button
   - Watch progress indicator
   - Wait for completion message

![Project Creation Progress](images/project-creation-progress.png)

### Step 5: Explore Your New Project

**Success Message:**
- Shows project creation was successful
- Provides link to open project folder
- Displays project summary information

**Project Structure:**
```
Cell Growth Rate Analysis/
├── protocols/
├── data/
│   ├── raw/
│   └── processed/
├── analysis/
├── results/
├── documentation/
└── elabftw-metadata.json
```

![Project Creation Success](images/project-creation-success-first.png)

## Exploring Your Project

### Project Folder Structure

**Open Project Folder:**
1. Click **"Open Project Folder"** in success message
2. Or navigate manually to your chosen location
3. Explore the created directory structure

**Understanding the Structure:**
- **protocols/** - Store experimental procedures
- **data/raw/** - Original, unprocessed data
- **data/processed/** - Cleaned or transformed data  
- **analysis/** - Analysis scripts and outputs
- **results/** - Final results and figures
- **documentation/** - Notes, reports, manuscripts

![Project Folder Exploration](images/project-folder-exploration.png)

### Metadata File

**elabftw-metadata.json:**
This file contains all your project metadata in structured format:

```json
{
  "title": "Cell Growth Rate Analysis",
  "description": "Testing the effect of temperature...",
  "date": "2025-06-13",
  "investigator": "Your Name",
  "template": "My First Experiment",
  "created": "2025-06-13T10:30:00Z"
}
```

**Why This Matters:**
- Makes projects discoverable by Project Scanner
- Enables data visualization and analysis
- Supports integration with lab systems
- Provides audit trail for research

![Metadata File Structure](images/metadata-file-structure.png)

## Basic Workflow Example

Let's walk through a typical research workflow using your new project:

### Day 1: Planning Phase

1. **Open Project Folder** in your file manager
2. **Create Protocol** in `protocols/` folder:
   - `cell_culture_protocol.pdf`
   - `growth_measurement_procedure.docx`
3. **Document Planning** in `documentation/`:
   - `experiment_plan.md`
   - `literature_notes.md`

### Day 2: Data Collection

1. **Store Raw Data** in `data/raw/`:
   - `temperature_20C_measurements.csv`
   - `temperature_30C_measurements.csv`
   - `temperature_37C_measurements.csv`

2. **Update Documentation**:
   - Add daily notes to `documentation/daily_log.md`
   - Record any protocol deviations

### Day 3: Data Processing

1. **Process Data** in `data/processed/`:
   - Clean and normalize measurements
   - `cleaned_growth_data.csv`
   - `normalized_growth_rates.csv`

2. **Analysis Scripts** in `analysis/`:
   - `growth_rate_analysis.R`
   - `statistical_tests.py`

### Day 4: Results and Reporting

1. **Generate Results** in `results/`:
   - `growth_rate_comparison.png`
   - `statistical_summary.txt`
   - `final_results_table.csv`

2. **Final Documentation**:
   - `experiment_report.md`
   - `conclusions_and_next_steps.md`

![Workflow Example](images/workflow-example.png)

## Understanding Project Organization Benefits

### Before MetaFold

**Common Research Problems:**
- Inconsistent folder structures across projects
- Missing or incomplete metadata
- Difficulty finding related experiments
- No standardization across team members
- Lost context for old experiments

### After MetaFold

**Organized Research Benefits:**
- **Standardized Structure** - Every project follows the same organization
- **Rich Metadata** - Complete information about each experiment
- **Easy Discovery** - Find related projects quickly
- **Team Consistency** - Everyone uses the same templates
- **Future-Proof** - Projects remain understandable years later

![Organization Benefits](images/organization-benefits.png)

## Next Steps and Best Practices

### Immediate Next Steps

1. **Create More Projects**
   - Use your template for actual research
   - Refine the template based on experience
   - Create variations for different experiment types

2. **Explore Templates**
   - Try the built-in templates
   - Understand different organizational approaches
   - Adapt templates to your research needs

3. **Learn Integration Features**
   - Explore elabFTW integration for lab notebooks
   - Test OMERO integration for image data
   - Understand how integrations enhance workflow

![Next Steps](images/next-steps-first.png)

### Best Practices from Day One

**Template Design:**
- Start simple, add complexity gradually
- Use clear, descriptive field names
- Make required fields truly essential
- Test templates with real projects

**Project Organization:**
- Follow the folder structure consistently
- Keep raw data separate from processed data
- Document everything as you go
- Use descriptive file names

**Metadata Quality:**
- Fill out metadata completely and accurately
- Use consistent terminology across projects
- Include enough detail for future understanding
- Update metadata if project scope changes

![Best Practices](images/best-practices-first.png)

### Common Beginner Mistakes to Avoid

**Template Mistakes:**
- Making too many fields required
- Creating overly complex initial templates
- Not testing templates before widespread use
- Forgetting to include essential metadata

**Project Mistakes:**
- Skipping metadata entry to save time
- Not following the established folder structure
- Mixing different types of data in same folders
- Forgetting to document protocol changes

**Workflow Mistakes:**
- Not backing up important projects
- Creating projects outside MetaFold system
- Inconsistent naming conventions
- Not sharing templates with team members

![Common Mistakes](images/common-mistakes.png)

## Getting Help and Learning More

### Built-in Help Resources

**In-Application Help:**
- Settings > Debug - System information and diagnostics
- Template tooltips and help text
- Field-specific guidance during metadata entry
- Error messages with suggested solutions

**Documentation:**
- This user guide with comprehensive coverage
- Step-by-step tutorials for common tasks
- Troubleshooting section for problems
- Best practices from experienced users

![Help Resources](images/help-resources-first.png)

### Community and Support

**Learning Resources:**
- Example templates and workflows
- Video tutorials for complex features
- User community discussions and tips
- Regular webinars and training sessions

**Getting Support:**
- Community forums for user questions
- GitHub issues for bug reports
- Email support for integration problems
- Professional support for institutional users

### Continuing Your MetaFold Journey

Now that you've completed your first steps:

1. **[Interface Overview](interface-overview.md)** - Understand all features and capabilities
2. **[Template Management](templates.md)** - Create sophisticated templates for your research
3. **[Creating Projects](project-creation.md)** - Master the project creation workflow
4. **[Integration Setup](elabftw-integration.md)** - Connect with laboratory systems

---

*Congratulations! You've taken the first steps toward organized, reproducible research data management. Your future self will thank you for this investment in good research practices.*