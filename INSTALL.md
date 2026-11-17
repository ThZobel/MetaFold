# MetaFold – Installation & Setup Guide

- [Pre-built Binaries (Recommended)](#pre-built-binaries-recommended)
- [Development Setup (From Source)](#development-setup-from-source)
- [Getting Started with Templates](#getting-started-with-templates)

---

## Pre-built Binaries (Recommended)

Download the latest release for your operating system:

1. Visit the [Releases page](https://github.com/ThZobel/MetaFold/releases).
2. Download the installer for your platform:
   - **Windows**: `MetaFold-Setup-x.x.x.exe`
   - **macOS**: `MetaFold-x.x.x.dmg` or `MetaFold-x.x.x.pkg`
   - **Linux**: `MetaFold-x.x.x.AppImage` or `MetaFold-x.x.x.deb`
3. Install and launch:
   - **Windows**: Run the `.exe` installer and follow the setup wizard.
   - **macOS**: Open the `.dmg` file and drag MetaFold to **Applications**.
   - **Linux**:
     - `.AppImage`: Make executable (`chmod +x MetaFold-x.x.x.AppImage`) and run directly.
     - `.deb`: Install with `sudo dpkg -i MetaFold-x.x.x.deb`.
4. Launch MetaFold from your applications menu.

---

## Development Setup (From Source)

### Prerequisites
- **Node.js** (Latest LTS version): [nodejs.org](https://nodejs.org)

### Steps

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

Create platform-specific executables (output in `dist/`):
```bash
npm run build
```

---

## Getting Started with Templates

MetaFold includes example templates in the [`/templates`](https://github.com/ThZobel/MetaFold/tree/main/templates) folder on GitHub.

### Method 1: Import via User Interface (Recommended)

1. Download the desired `.json` template file from [`/templates`](https://github.com/ThZobel/MetaFold/tree/main/templates).
2. Launch **MetaFold**.
3. Open the **Action Menu** by clicking on "Templ. Options" and select **More → Import Template**.
4. Select the downloaded `.json` file in the import dialog.
5. Start creating projects with your imported template.

### Method 2: Manual Installation

1. Download the `.json` template files from [`/templates`](https://github.com/ThZobel/MetaFold/tree/main/templates).
2. Copy them into your local MetaFold configuration directory (replace `<group>` and `<user>` with your configured MetaFold group and username):
   - **Windows**: `C:\Users\<YourUsername>\MetaFold\<group>\<user>\`
   - **macOS**: `/Users/<YourUsername>/MetaFold/<group>/<user>/`
   - **Linux**: `/home/<YourUsername>/MetaFold/<group>/<user>/`
3. Restart MetaFold to load the templates automatically.

---

Back to [README](README.md) · [Full Documentation](https://metafold-docs.readthedocs.io/en/latest/)

