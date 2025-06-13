# MetaFold 🔬

**A powerful desktop application for laboratory data management and experiment organization**

MetaFold simplifies the creation of standardized folder structures and metadata files for life sciences experiments, with seamless integration to electronic lab notebooks and image management systems.

![MetaFold Interface](screenshots/metafold-main-interface.png)
*Screenshot placeholder - Main MetaFold interface*

---

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

## 🚀 Quick Start

### Prerequisites
- **Node.js** (Latest LTS version)
- Download from: [https://nodejs.org](https://nodejs.org)

### Installation

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

### Building for Production

Create platform-specific executables:
```bash
npm run build
```

Builds will be available in the `dist/` folder for Windows, macOS, and Linux.

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
- 🐛 [Report Issues](https://github.com/ThZobel/MetaFold/issues)
- 💬 [Discussions](https://github.com/ThZobel/MetaFold/discussions)
- 🌐 [NFDI4BioImage](https://nfdi4bioimage.de/)

---

*Simplifying laboratory data management, one experiment at a time* ✨