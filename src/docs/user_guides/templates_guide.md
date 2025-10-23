# Template Management

Templates are the foundation of MetaFold - they define the structure and metadata for your research projects. This guide covers everything you need to know about creating, managing, and using templates effectively.

![Template Management Overview](images/templates-overview.png)

## Understanding Templates

### Template Types

MetaFold supports two types of templates:

**📁 Folder Templates**
- Simple directory structures for file organization
- Minimal metadata requirements
- Perfect for data storage, literature reviews, or simple projects
- Quick setup and lightweight

**🧪 Experiment Templates**
- Rich metadata schemas for scientific experiments
- Integration capabilities with lab systems
- Advanced form fields and validation
- Designed for structured research workflows

![Template Types Comparison](images/template-types-comparison.png)

### Template Components

Every template consists of:

1. **Basic Information**
   - Name and description
   - Template type (Folder or Experiment)
   - Creation date and author

2. **Folder Structure**
   - Directory layout definition
   - Nested folder support
   - File naming conventions

3. **Metadata Schema** (Experiments only)
   - Custom form fields
   - Data validation rules
   - Field types and options

4. **Integration Settings**
   - elabFTW configuration
   - OMERO settings
   - Sync preferences

## Creating Templates

### Method 1: Create from Scratch

1. **Open Template Tab**
   - Navigate to the **📋 Templates** tab
   - Click **"Create New Template"**

   ![Create Template Button](images/create-template-button.png)

2. **Choose Template Type**
   - Select **"Folder Template"** for simple organization
   - Select **"Experiment Template"** for research projects

   ![Template Type Selection](images/template-type-selection.png)

3. **Basic Information**
   - Enter a descriptive name
   - Add a brief description
   - Templates are automatically tagged with your username

   ![Template Basic Info](images/template-basic-info.png)

4. **Define Folder Structure**
   - Add folders one by one using the input field
   - Use forward slashes for nested structures: `data/raw`, `data/processed`
   - Common research folders: `literature`, `protocols`, `data`, `analysis`, `results`, `reports`

   ![Folder Structure Editor](images/folder-structure-editor.png)

5. **Configure Metadata** (Experiment Templates only)
   - Add fields using the metadata editor
   - Choose appropriate field types
   - Set required fields and validation rules

   ![Metadata Editor](images/metadata-editor-overview.png)

6. **Save Template**
   - Review all settings
   - Click **"Save Template"**
   - Template appears in your template list

### Method 2: Import from JSON

You can import templates from JSON files or external schemas:

1. **Click "Import Template"**
2. **Select Import Source**:
   - JSON file from disk
   - elabFTW experiment template
   - JSON Schema specification
3. **Review and Adjust**
   - MetaFold will parse the structure
   - Make any necessary modifications
4. **Save Imported Template**

![Template Import Process](images/template-import-process.png)

### Method 3: Create from Existing Project

Transform an existing project into a reusable template:

1. **Use Project Scanner** to find existing projects
2. **Select a well-structured project**
3. **Click "Create Template from Project"**
4. **Review and customize** the generated template
5. **Save as new template**

![Create from Project](images/create-from-project.png)

## Metadata Schema Design

For Experiment Templates, designing good metadata schemas is crucial for research reproducibility.

### Field Types Available

**Text Fields**
```
- text: Single-line text input
- textarea: Multi-line text area
- email: Email validation
- url: URL validation
```

**Numeric Fields**
```
- number: Numeric input with validation
- range: Slider for numeric ranges
- currency: Formatted currency input
```

**Date and Time**
```
- date: Date picker
- datetime: Date and time picker
- time: Time-only picker
```

**Selection Fields**
```
- dropdown: Select from predefined options
- radio: Radio button selection
- checkbox: Boolean true/false
- checklist: Multiple checkbox options
```

**Advanced Fields**
```
- file: File upload reference
- group: Grouped related fields
- conditional: Fields that appear based on other values
```

![Metadata Field Types](images/metadata-field-types.png)

### Schema Design Best Practices

**Start Simple**
- Begin with essential fields only
- Add complexity gradually
- Test with real projects

**Use Clear Labels**
- Descriptive field names
- Help text for complex fields
- Consistent terminology

**Group Related Fields**
- Use field groups for organization
- Logical sections (Sample Info, Methods, Results)
- Collapsible sections for long forms

**Set Appropriate Validation**
- Mark truly required fields only
- Use data type validation
- Provide helpful error messages

![Metadata Best Practices](images/metadata-best-practices.png)

## Managing Templates

### Template Library

The **📋 Templates** tab shows all your available templates:

![Template Library](images/template-library.png)

**Template Cards Display**:
- Template name and type icon
- Description and creation date
- Usage statistics (how many projects created)
- Quick action buttons (Edit, Duplicate, Delete, Export)

### Template Actions

**✏️ Edit Template**
- Modify structure, metadata, or settings
- Changes affect only new projects (existing projects unchanged)
- Version history tracking

**📋 Duplicate Template**
- Create a copy for modification
- Useful for creating template variations
- Automatic name suffixing ("Template Name - Copy")

**📤 Export Template**
- Save as JSON file for sharing
- Include all metadata schema and settings
- Compatible with import function

**🗑️ Delete Template**
- Permanent removal (with confirmation)
- Does not affect existing projects created from template
- Cannot be undone

![Template Actions](images/template-actions.png)

### Template Sharing

**Export for Sharing**
1. Click **"Export"** on template card
2. Choose export format:
   - MetaFold JSON (full compatibility)
   - JSON Schema (metadata only)
   - YAML format (human-readable)
3. Share file with colleagues

**Import Shared Templates**
1. Receive template file from colleague
2. Use **"Import Template"** function
3. Review and customize as needed
4. Save to your template library

![Template Sharing](images/template-sharing.png)

## Advanced Template Features

### Conditional Fields

Create fields that appear only when certain conditions are met:

```yaml
Sample Type: dropdown [Cell Culture, Tissue, Blood]
└─ Cell Line: text (only if Sample Type = "Cell Culture")
└─ Tissue Type: dropdown (only if Sample Type = "Tissue")
└─ Blood Type: dropdown (only if Sample Type = "Blood")
```

![Conditional Fields](images/conditional-fields.png)

### Field Groups

Organize related fields into collapsible sections:

```yaml
📋 Sample Information
├─ Sample ID: text (required)
├─ Sample Type: dropdown
└─ Collection Date: date

🔬 Experimental Conditions  
├─ Temperature: number
├─ pH Level: number
└─ Duration: text

📊 Results
├─ Primary Outcome: textarea
├─ Data Files: file
└─ Notes: textarea
```

![Field Groups](images/field-groups.png)

### Default Values and Auto-Fill

Set smart defaults for common fields:

- **Auto-generated IDs**: `EXP_{YYYYMMDD}_{counter}`
- **Current date**: Automatically fill date fields
- **User information**: Pre-fill researcher name/email
- **Template defaults**: Values commonly used in your lab

![Auto-Fill Features](images/auto-fill-features.png)

### Integration Settings

Configure how templates work with lab systems:

**elabFTW Integration**
- Default experiment type
- Field mapping to elabFTW extra fields
- Auto-sync preferences

**OMERO Integration**
- Default project/dataset settings
- Map annotation configuration
- Group and permission settings

![Integration Settings](images/template-integration-settings.png)

## Template Examples

### Basic Cell Culture Experiment

**Folder Structure**:
```
protocols/
data/
├─ images/
├─ measurements/
└─ raw/
analysis/
results/
documentation/
```

**Key Metadata Fields**:
- Experiment Title (text, required)
- Cell Line (dropdown: HeLa, HEK293, Primary)
- Passage Number (number, required)
- Culture Conditions (group with temp, CO2, media)
- Experimental Timeline (date range)
- Primary Investigator (text, auto-fill)

![Cell Culture Template](images/template-example-cell-culture.png)

### Microscopy Imaging Project

**Folder Structure**:
```
sample_preparation/
imaging/
├─ raw_images/
├─ processed/
└─ analysis/
quantification/
figures/
manuscripts/
```

**Key Metadata Fields**:
- Project Title (text, required)
- Microscope Setup (dropdown with common configurations)
- Imaging Parameters (group: objective, exposure, filters)
- Sample Information (group: staining, preparation date)
- Analysis Software (dropdown: ImageJ, CellProfiler, etc.)

![Microscopy Template](images/template-example-microscopy.png)

### Literature Review Template

**Folder Structure**:
```
search_strategy/
papers/
├─ to_read/
├─ reviewed/
└─ excluded/
notes/
synthesis/
references/
```

**Key Metadata Fields**:
- Review Topic (text, required)
- Search Keywords (textarea)
- Databases Searched (checklist: PubMed, Scopus, etc.)
- Date Range (date range)
- Inclusion Criteria (textarea)
- Total Papers Found (number)

![Literature Review Template](images/template-example-literature.png)

## Troubleshooting Templates

### Common Issues

**Template Won't Save**
- Check for duplicate template names
- Ensure all required fields are filled
- Verify folder structure syntax (use forward slashes)

**Metadata Fields Not Appearing**
- Check field type configuration
- Verify conditional field logic
- Ensure proper field group nesting

**Integration Not Working**
- Verify integration credentials in Settings
- Check template integration configuration
- Test connection before creating projects

**Performance Issues with Large Templates**
- Limit number of fields (recommend <50 fields)
- Use field groups for organization
- Consider breaking into multiple templates

![Template Troubleshooting](images/template-troubleshooting.png)

### Template Validation

MetaFold automatically validates templates:

✅ **Structure Validation**
- Folder paths are valid
- No circular dependencies
- Reasonable depth limits

✅ **Metadata Validation**  
- Field types are properly configured
- Required field logic is sound
- Conditional dependencies are valid

✅ **Integration Validation**
- elabFTW field mappings are correct
- OMERO settings are compatible
- Authentication is properly configured

![Template Validation](images/template-validation.png)

## Next Steps

Now that you understand template management:

- **[Create Your First Project](project-creation.md)** using your new templates
- **[Set Up elabFTW Integration](elabftw-integration.md)** for electronic lab notebook sync
- **[Configure OMERO Integration](omero-integration.md)** for image data management
- **[Explore Project Discovery](project-scanner.md)** to find existing research projects

---

*Master template design and you'll master organized, reproducible research!*