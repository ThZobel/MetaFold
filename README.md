![MetaFold_Logo](/assets/MetafoldLogoPurple.png)

# MetaFold 🔬

**A powerful desktop application for laboratory data management and experiment organization**

MetaFold simplifies the creation of standardized folder structures and metadata files for life sciences experiments, with seamless integration to electronic lab notebooks and image management systems.
![MetaFold Grafic](/assets/MetafoldGrafikPurple.png)
---
## ⚠️ Development Status: PROTOTYPE

> **Disclaimer:**  
> This project was completely developed with the assistance of [claude.ai](https://claude.ai).  
> It is currently in a **prototype** stage — use at your own risk.  
> Contributions, reviews, and testing are highly appreciated.

---

![MetaFold Interface](/assets/screenshots/metafold-main-interface.png)


## ✨ Key Features

🗂️ **Template-Based Project Creation**
- Create standardized folder structures from configurable templates
- Dynamic metadata forms with validation
- Support for both folder and experiment templates

👥 **Multi-User Support**
- Secure user management with credential storage
- User-specific templates and settings
- Group-based access control

🔗 **Laboratory Integrations**
- **elabFTW**: Direct experiment creation with metadata sync
- **OMERO**: Dataset creation with map annotations
- **Secure Authentication**: Multi-layer encryption for credentials

📊 **Project Discovery & Visualization**
- Recursive scanning of existing projects
- Interactive data visualization with JSONCrack
- Project statistics and relationship analysis

🎨 **Modern Interface**
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
- Integration configuration
- Advanced features and workflows
- Troubleshooting guides

---

## 🔧 Core Concepts

### Templates
Define reusable project structures with:
- Custom folder hierarchies
- Metadata schemas with validation
- Integration settings for elabFTW/OMERO

### Projects
Create standardized experiments with:
- Automated folder structure generation
- JSON metadata files
- Direct integration with lab systems

### Discovery
Analyze existing projects with:
- Recursive project scanning
- Statistical analysis and visualization
- Export capabilities for further analysis

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
