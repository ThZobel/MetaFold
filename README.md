# MetaFold 🔬

**A powerful desktop application for laboratory data management and experiment organization**

MetaFold simplifies the creation of standardized folder structures and metadata files for life sciences experiments, with seamless integration to electronic lab notebooks, image management systems, and workflow automation tools.

---

## ✨ Key Features

🗂️ **Template-Based Project Creation**
- Create standardized folder structures from configurable templates
- Dynamic metadata forms with drag & drop field ordering
- Support for both folder and experiment templates

👥 **Multi-User Support & RDM Provenance**
- Secure user management with credential storage
- **RDM-compliant profiles** (ISA-JSON inspired) with ORCID & Affiliation support
- **Automated provenance injection** into metadata files for FAIR compliance
- User-specific templates and settings
- Group-based access control
- Admin account with automatic initialization on first launch

🔗 **Laboratory Integrations**
- **elabFTW**: Direct experiment creation with metadata sync; select experiment templates via dropdown
- **OMERO**: Project/Dataset creation with map annotations and smart namespaces
- **RSpace**: Electronic lab notebook integration
- **n8n**: Workflow automation via webhooks – trigger custom workflows on project creation
- **BioFormats**: Automated OME-XML extraction via the built-in File Sidecar Scanner
- **Secure Authentication**: Multi-layer encryption (DPAPI + user-specific entropy) for all credentials

📊 **Project Discovery & Visualization**
- Recursive scanning of existing projects
- Interactive data visualization with JSONCrack
- **Knowledge Graph & Lineage Tree**: Visualize, connect, and explore project dependencies interactively
- **Lineage Export & Data Harvest**: Export standalone graph dashboards and selectively copy linked raw data
- **File Sidecar Scanner**: 3-step wizard to scan microscopy files and extract metadata automatically

🎨 **Modern Interface**
- **Light & Dark Mode** – toggle with a single click, preference is remembered
- **Sidebar Metadata Viewer** – Instantly inspect fully parsed, recursive project metadata directly in the sidebar
- Responsive design for different screen sizes
- Drag & drop functionality
- Real-time validation and feedback

---

## 🚀 Installation

### Option 1: Pre-built Binaries (Recommended for Most Users)

**Download the latest release for your operating system:**

1. Visit the [Releases page](https://github.com/ThZobel/MetaFold/releases)
2. Download the latest release for your platform:
   - **Windows**: `MetaFold-Setup-x.x.x.exe`
   - **macOS**: `MetaFold-x.x.x.dmg` or `MetaFold-x.x.x.pkg`
   - **Linux**: `MetaFold-x.x.x.AppImage` or `MetaFold-x.x.x.deb`
3. Install the application:
   - **Windows**: Run the `.exe` installer and follow the setup wizard
   - **macOS**: Open the `.dmg` file and drag MetaFold to Applications
   - **Linux**:
     - For `.AppImage`: Make executable (`chmod +x`) and run directly
     - For `.deb`: Install with `sudo dpkg -i MetaFold-x.x.x.deb`
4. Launch MetaFold from your applications menu

### Option 2: Development Setup

For developers who want to run from source:

#### Prerequisites
- **Node.js** (Latest LTS version)
- Download from: [https://nodejs.org](https://nodejs.org)

#### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/ThZobel/MetaFold.git
   cd MetaFold
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

#### Building for Production

Create platform-specific executables:
```bash
npm run build
```

Builds will be available in the `dist/` folder for Windows, macOS, and Linux.

---

## 📝 Getting Started with Templates

### Using Example Templates

MetaFold provides example templates to help you get started quickly:

#### Method 1: Import via User Interface (Recommended)

1. **Launch MetaFold**
2. **Navigate to the Action Menu**:
   - Click on the **Action Menu** button (usually in the top bar)
   - Select **More** → **Import Template**
3. **Download example templates**:
   - Visit the [/templates folder](https://github.com/ThZobel/MetaFold/tree/main/templates) on GitHub
   - Download the `.json` template files you need
4. **Import the template**:
   - In the import dialog, select the downloaded `.json` file
   - The template will be added to your templates list
5. **Start using the template**:
   - Create new projects using the imported template

#### Method 2: Manual Installation

1. **Download example templates**:
   - Visit the [/templates folder](https://github.com/ThZobel/MetaFold/tree/main/templates) on GitHub
   - Download the `.json` template files you need
2. **Locate your MetaFold configuration directory**:
   - **Windows**: `C:\Users\<YourUsername>\MetaFold\<group>\<user>\`
   - **macOS**: `/Users/<YourUsername>/MetaFold/<group>/<user>/`
   - **Linux**: `/home/<YourUsername>/MetaFold/<group>/<user>/`
3. **Copy template files**:
   - Copy the downloaded `.json` files into the directory above
4. **Restart MetaFold**:
   - The templates will be automatically loaded on next launch

**Note**: Replace `<group>` and `<user>` with your actual group and username as configured in MetaFold.

---

## 📖 Documentation

For comprehensive documentation, tutorials, and API references, visit:

**📚 [MetaFold Documentation](https://metafold-docs.readthedocs.io/en/latest/)**

The documentation includes:
- Detailed setup guides
- Template creation tutorials
- Integration configuration (elabFTW, OMERO, RSpace, n8n)
- Advanced features and workflows
- Troubleshooting guides

---

## 🔧 Core Concepts

### Templates
Define reusable project structures with:
- Custom folder hierarchies
- Metadata schemas with validation
- Integration settings for elabFTW / OMERO / RSpace / n8n

### Projects
Create standardized experiments with:
- Automated folder structure generation
- JSON metadata files
- Direct integration with lab systems

### Discovery
Analyze existing projects with:
- **Recursive project scanning**: Generate statistical analysis and data visualization.
- **JSON Export**: Export aggregated project metadata for further analysis.
- **Knowledge Graph**: Interactively explore project lineages, visual link connections, and export dependency subgraphs.
- **Faceted Search**: Explore exported metadata dynamically via an interactive UI.
  - **Column Selection**: Customize which metadata fields are visible in the results table independently of active filters.
  - **Multi-Select Filtering**: Combine multiple filter tags for precise project discovery.
  - **Integrations**: Directly launch OMERO (🔵) or eLabFTW (🟢) links associated with the discovered projects right from the search results.

---

## 🔗 Integrations Overview

| Integration | Purpose | Key Feature |
|---|---|---|
| **elabFTW** | Electronic lab notebook | Experiment creation; template selection via dropdown |
| **OMERO** | Image data management | Project/Dataset + map annotation creation |
| **RSpace** | Electronic lab notebook | Document creation with folder targeting |
| **n8n** | Workflow automation | Webhook trigger on project creation |

### n8n Workflow Automation
Connect MetaFold to your [n8n](https://n8n.io) automation server to trigger custom workflows whenever a new project is created. Configure in **Settings → 🤖 n8n**:
- Enter your webhook URL
- Choose authentication (None / Bearer Token / Basic Auth)
- Optionally set an Instance ID for multi-machine setups
- Enable the n8n toggle per project in the right sidebar

### elabFTW Template Selection
When elabFTW is enabled, the right sidebar shows a **Template** dropdown populated directly from your elabFTW server. Select the appropriate experiment template per MetaFold project template – the selection is saved and restored automatically.

---

## 🎨 Light & Dark Mode

MetaFold supports both **dark mode** (default) and **light mode**:
- Click the ☀️/🌙 button in the top-left sidebar header to toggle
- Your preference is saved across sessions

---

## 🎯 Target Audience

MetaFold is designed for:
- **Life Sciences Researchers** organizing experiments
- **Laboratory Managers** standardizing workflows
- **Research Data Managers** implementing FAIR principles
- **NFDI4BioImage** community members

---

## 🤝 Contributing

We welcome contributions! Please check our documentation for:
- Development setup guides
- Code contribution guidelines
- Feature request procedures

---

## 📄 License & Acknowledgements

### Inspiration
MetaFold is inspired by the excellent **RDM-Desktop Tool** by T. Haraszti:
- Repository: [tomio13/RDM-Desktop](https://github.com/tomio13/RDM-Desktop)
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

We thank T. Haraszti for the inspiration and foundation.

### Development
This project was developed with the assistance of [claude.ai](https://claude.ai/) as part of the **NFDI4BioImage** initiative.

---

## 🔗 Links

- 📚 [Full Documentation](https://metafold-docs.readthedocs.io/en/latest/)
- 📦 [Download Latest Release](https://github.com/ThZobel/MetaFold/releases)
- 📝 [Example Templates](https://github.com/ThZobel/MetaFold/tree/main/templates)
- 🐛 [Report Issues](https://github.com/ThZobel/MetaFold/issues)
- 💬 [Discussions](https://github.com/ThZobel/MetaFold/discussions)
- 🌐 [NFDI4BioImage](https://nfdi4bioimage.de/)

---

*Simplifying laboratory data management, one experiment at a time* ✨
