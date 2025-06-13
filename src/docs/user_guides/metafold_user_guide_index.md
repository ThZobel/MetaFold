# MetaFold User Guide

Welcome to MetaFold - your comprehensive solution for laboratory data management and experiment organization.

![MetaFold Logo](images/metafold-logo.png)

## What is MetaFold?

MetaFold is a desktop application designed for life sciences researchers to:

- **📁 Create standardized folder structures** for experiments and projects
- **📋 Manage metadata** with customizable templates  
- **🔗 Integrate with lab systems** like elabFTW and OMERO
- **🔍 Discover existing projects** and visualize research data
- **👥 Support multiple users** with secure credential management

## Key Features

✅ **Template-Based Organization** - Create reusable folder and experiment templates  
✅ **Dynamic Metadata Forms** - Custom forms that adapt to your research needs  
✅ **Laboratory Integration** - Connect with elabFTW (electronic lab notebook) and OMERO (image management)  
✅ **Project Discovery** - Find and analyze existing research projects  
✅ **Data Visualization** - Interactive views of your research data structure  
✅ **Multi-User Support** - Team-friendly with user management and secure storage  

## Getting Started

### System Requirements

- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **Disk Space**: 100MB free space
- **Memory**: 4GB RAM recommended
- **Network**: Internet connection for integrations (optional)

### Installation

1. **Download** the latest MetaFold installer for your operating system
2. **Run the installer** and follow the setup wizard
3. **Launch MetaFold** from your applications menu

![Installation Process](images/installation-steps.png)

### First Launch

When you first open MetaFold, you'll see the main interface with five tabs:

![Main Interface](images/main-interface-overview.png)

1. **📋 Templates** - Manage your project templates
2. **🚀 Create Project** - Create new research projects  
3. **🔍 Discover Projects** - Find existing MetaFold projects
4. **📊 Visualize Data** - View data relationships and structures
5. **⚙️ Settings** - Configure integrations and preferences

## Quick Start Guide

### Step 1: Create Your First Template

Templates define the structure and metadata for your projects. Let's create a simple experiment template:

1. Go to the **📋 Templates** tab
2. Click **"Create New Template"**
3. Choose **"Experiment Template"**
4. Add a name like "Basic Experiment"
5. Define your folder structure (e.g., `data`, `analysis`, `results`)
6. Add metadata fields (e.g., title, description, date)
7. Click **"Save Template"**

![Template Creation](images/template-creation-basic.png)

### Step 2: Create Your First Project

Now use your template to create a project:

1. Go to the **🚀 Create Project** tab
2. Select your "Basic Experiment" template
3. Choose a location for your project
4. Fill in the metadata form
5. Click **"Create Project"**

![Project Creation](images/project-creation-basic.png)

### Step 3: Explore Your Project

MetaFold will:
- Create the folder structure you defined
- Generate a metadata file (`elabftw-metadata.json`)
- Show you a success message with links to open the project

![Project Success](images/project-creation-success.png)

## Understanding the Interface

### Navigation Tabs

**📋 Templates Tab**
- View all your templates
- Create new templates (Folder or Experiment types)
- Edit existing templates
- Import/export templates

**🚀 Create Project Tab**
- Select a template
- Choose project location
- Fill metadata forms
- Enable integrations (elabFTW, OMERO)

**🔍 Discover Projects Tab**
- Scan directories for existing MetaFold projects
- View project statistics and relationships
- Search and filter projects
- Export aggregated data

**📊 Visualize Data Tab**
- Interactive visualization of project data
- Multiple view types (network, tree, etc.)
- Load custom JSON data
- Export visualizations

**⚙️ Settings Tab**
- Configure elabFTW integration
- Set up OMERO connection
- Manage users and security
- Customize application preferences

### Template Types

**Folder Templates**
- Simple folder structures for file organization
- Basic metadata tracking
- Perfect for data storage and simple projects

**Experiment Templates**  
- Rich metadata schemas for scientific experiments
- Integration with laboratory systems
- Advanced form fields and validation

## Next Steps

Now that you understand the basics, explore these advanced features:

- **[Template Management](templates.md)** - Create sophisticated templates with custom metadata
- **[elabFTW Integration](elabftw-integration.md)** - Connect to your electronic lab notebook
- **[OMERO Integration](omero-integration.md)** - Integrate with image data management
- **[Project Discovery](project-scanner.md)** - Find and analyze existing research projects
- **[Advanced Features](advanced-features.md)** - User management, security, and customization

## Getting Help

- **Documentation**: Browse this user guide for detailed instructions
- **Support**: Contact the NFDI4BioImage team for technical support
- **Community**: Join the MetaFold user community for tips and best practices

![Help Resources](images/help-resources.png)

---

*Ready to revolutionize your laboratory data management? Let's dive into creating your first template!*