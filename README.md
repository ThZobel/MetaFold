<img src="/assets/MetafoldLogoPurple.png" alt="MetaFold Logo" width="256">

**A powerful desktop application for laboratory data management and experiment organization**

## Which problem is solved by this tool

MetaFold simplifies laboratory data management through easy-to-use templates that create **reproducible metadata**.  
It reduces manual steps by automatically generating folder structures and metadata files at multiple locations simultaneously.  
Thanks to its **integration with OMERO, ELNs, and RSpace**, microscopy data can be automatically imported based on the existing metadata — saving researchers significant time and effort.

- [⚠️ Development Status: PROTOTYPE](#️-development-status-prototype)
- [✨ Key Features](#-key-features)
- [Live demo](#live-demo)
- [🚀 Installation](#-installation)
  - [Option 1: Pre-built Binaries (Recommended for Most Users)](#option-1-pre-built-binaries-recommended-for-most-users)
  - [Option 2: Development Setup](#option-2-development-setup)
    - [Prerequisites](#prerequisites)
    - [Installation Steps](#installation-steps)
    - [Building for Production](#building-for-production)
- [📝 Getting Started with Templates](#-getting-started-with-templates)
  - [Using Example Templates](#using-example-templates)
    - [Method 1: Import via User Interface (Recommended)](#method-1-import-via-user-interface-recommended)
    - [Method 2: Manual Installation](#method-2-manual-installation)
- [🛡️ Admin User and User Management](#️-admin-user-and-user-management)
- [🔧 Core Concepts](#-core-concepts)
  - [Templates](#templates)
  - [Projects](#projects)
  - [Discovery](#discovery)
- [🎯 Target Audience](#-target-audience)
- [🤝 Contributing](#-contributing)
- [📄 Acknowledgements](#-acknowledgements)
- [🔗 Links](#-links)

---

## ⚠️ Development Status: PROTOTYPE

> **Disclaimer:**  
> This project was completely developed with the assistance of [claude.ai](https://claude.ai).  
> It is currently in a **prototype** stage — use at your own risk.  
> Contributions, reviews, and testing are highly appreciated.

---

## ✨ Key Features

<img src="/assets/MetafoldGrafikPurple.png" alt="MetaFold Grafic" width="512">

🗂️ **Template-Based Project Creation**
- Create standardized folder structures and metadata forms from configurable templates
- Create .json and .html metadata files.
- Send your metadata to different systems like electronic lab notebooks (elabFTW, RSpace) and special Databases (OMERO).

👥 **Multi-User Support**
- Secure user and group management with credential storage
- User-specific templates and settings
- Group-based access control

🔗 **Laboratory Integrations**
- **[elabFTW](https://github.com/elabftw/elabftw)**: Direct experiment creation with metadata based on templates
- **[RSpace](https://www.researchspace.com/)**: Direct experiment creation with metadata based on templates
- **[OMERO](https://www.openmicroscopy.org/index.html)**: Dataset creation with map annotations / metadata annotation
- Directly linking of all integrations 

📊 **Project Discovery & Visualization**
- Recursive scanning of existing projects
- Interactive data visualization with JSONCrack

🎨 **Modern Interface**
- Responsive design for different screen sizes
---
## Live demo

<img src="/assets/MetaFold_Teaser_konv3.gif" alt="MetaFold Gif" width="512">

<https://youtu.be/OV1vB6SOis8> *(early state & and first try(I will remove / exchange it soon)*

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
   cd MetaFold/src

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

## 🛡️ Admin User and User Management 

Admin User Password: `admin`
To manage users and their passwords, switch to the Admin user (the default password is admin). After switching, you can manage all users — for example, change their groups or reset their passwords.

---

## 🔧 Core Concepts

### Templates
Define reusable project structures with:
- Custom folder hierarchies
- Metadata schemas with validation
- Integration settings for elabFTW/RSpace/OMERO

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

We welcome contributions! - Development setup guides

---

## 📄 Acknowledgements

### Inspiration
MetaFold is inspired by the excellent **RDM-Desktop Tool** by T. Haraszti:
- Repository: [tomio13/RDM-Desktop](https://github.com/tomio13/RDM-Desktop)
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

We thank T. Haraszti for the inspiration and foundation.

### Development
This project was developed with the assistance of [claude.ai](https://claude.ai/)

---

## 🔗 Links
- 📦 [Download Latest Release](https://github.com/ThZobel/MetaFold/releases)
- 📝 [Example Templates](https://github.com/ThZobel/MetaFold/tree/main/templates)
- 🐛 [Report Issues](https://github.com/ThZobel/MetaFold/issues)
- 🌐 [NFDI4BioImage](https://nfdi4bioimage.de/)