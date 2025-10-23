# Installation

MetaFold is available for Windows, macOS, and Linux. Follow the installation guide for your operating system to get started with organized research data management.

![Installation Overview](images/installation-overview.png)

## System Requirements

### Minimum Requirements

**Operating System:**
- Windows 10 (64-bit) or later
- macOS 10.14 (Mojave) or later  
- Linux Ubuntu 18.04 LTS or equivalent

**Hardware:**
- 4 GB RAM (8 GB recommended)
- 500 MB free disk space (2 GB recommended for templates and projects)
- Internet connection (for integrations and updates)

**Additional Requirements:**
- Modern web browser (for OMERO proxy functionality)
- Python 3.7+ (for OMERO integration)

![System Requirements](images/system-requirements.png)

### Recommended Specifications

**For Individual Use:**
- 8 GB RAM
- SSD storage
- Stable internet connection
- Dedicated project storage location

**For Team/Lab Use:**
- 16 GB RAM
- Fast SSD storage
- Reliable network infrastructure
- Centralized backup solution
- Network-attached storage for shared projects

## Download MetaFold

### Official Download Sources

**GitHub Releases** (Recommended)
- Visit [MetaFold Releases](https://github.com/ThZobel/MetaFold/releases)
- Download the latest version for your operating system
- Choose from installer packages or portable versions

**Direct Download Links**
- Windows: `MetaFold-Setup-x64.exe` (Installer) or `MetaFold-Windows-x64.zip` (Portable)
- macOS: `MetaFold-macOS.dmg` (Disk Image) or `MetaFold-macOS.zip` (Archive)
- Linux: `MetaFold-Linux-x64.AppImage` (Portable) or `MetaFold-Linux-x64.deb` (Package)

![Download Options](images/download-options.png)

### Version Information

**Release Channels:**
- **Stable** - Thoroughly tested releases for production use
- **Beta** - Preview releases with new features (testing encouraged)
- **Development** - Cutting-edge builds (developers only)

**Version Numbering:**
- Format: `v0.5.x` (Major.Minor.Patch)
- Check [Changelog](https://github.com/ThZobel/MetaFold/releases) for version differences

## Windows Installation

### Method 1: Installer Package (Recommended)

1. **Download Installer**
   - Download `MetaFold-Setup-x64.exe`
   - Verify file integrity (optional but recommended)

2. **Run Installer**
   - Right-click installer → "Run as administrator" (if prompted)
   - Follow installation wizard steps
   - Choose installation directory (default: `C:\Program Files\MetaFold`)

   ![Windows Installation Wizard](images/windows-installation-wizard.png)

3. **Installation Options**
   - ✅ Create desktop shortcut
   - ✅ Add to Start Menu
   - ✅ Associate with `.metafold` files (optional)
   - ✅ Install for all users (requires admin rights)

4. **Complete Installation**
   - Click "Install" and wait for completion
   - Launch MetaFold immediately or later from Start Menu

### Method 2: Portable Version

1. **Download Archive**
   - Download `MetaFold-Windows-x64.zip`
   - Extract to desired location (e.g., `C:\Tools\MetaFold`)

2. **Run Portable**
   - Navigate to extracted folder
   - Double-click `MetaFold.exe`
   - No installation required - runs directly

![Windows Portable Setup](images/windows-portable-setup.png)

### Windows-Specific Configuration

**Security Settings:**
```powershell
# If Windows Defender blocks execution:
# 1. Open Windows Security
# 2. Go to Virus & threat protection
# 3. Add MetaFold folder to exclusions
```

**Firewall Configuration:**
- Allow MetaFold through Windows Firewall (for integrations)
- Add exception for Python (OMERO proxy server)

## macOS Installation

### Method 1: Disk Image (Recommended)

1. **Download DMG**
   - Download `MetaFold-macOS.dmg`
   - Double-click to mount disk image

2. **Install Application**
   - Drag MetaFold.app to Applications folder
   - Eject disk image when complete

   ![macOS Installation](images/macos-installation.png)

3. **First Launch**
   - Open Applications folder
   - Right-click MetaFold → "Open" (bypasses Gatekeeper warning)
   - Confirm opening unsigned application

4. **Security Permission**
   ```bash
   # If blocked by Gatekeeper:
   # System Preferences → Security & Privacy
   # Click "Open Anyway" for MetaFold
   ```

### Method 2: Archive Installation

1. **Download Archive**
   - Download `MetaFold-macOS.zip`
   - Extract to Applications folder

2. **Set Permissions**
   ```bash
   chmod +x /Applications/MetaFold.app/Contents/MacOS/MetaFold
   ```

![macOS Security Settings](images/macos-security-settings.png)

### macOS-Specific Configuration

**Keychain Access:**
- MetaFold integrates with macOS Keychain for secure credential storage
- Grant Keychain access when prompted

**Privacy Permissions:**
- Full Disk Access may be required for some project locations
- System Preferences → Security & Privacy → Privacy → Full Disk Access

## Linux Installation

### Method 1: AppImage (Recommended)

1. **Download AppImage**
   - Download `MetaFold-Linux-x64.AppImage`
   - Make executable: `chmod +x MetaFold-Linux-x64.AppImage`

2. **Run Application**
   ```bash
   ./MetaFold-Linux-x64.AppImage
   ```

3. **Optional: Desktop Integration**
   ```bash
   # Install desktop entry and icons
   ./MetaFold-Linux-x64.AppImage --appimage-extract
   sudo cp squashfs-root/MetaFold.desktop /usr/share/applications/
   sudo cp squashfs-root/MetaFold.png /usr/share/pixmaps/
   ```

![Linux AppImage Setup](images/linux-appimage-setup.png)

### Method 2: Debian Package

1. **Install Package**
   ```bash
   sudo dpkg -i MetaFold-Linux-x64.deb
   sudo apt-get install -f  # Fix dependencies if needed
   ```

2. **Launch from Menu**
   - Find MetaFold in applications menu
   - Or run from terminal: `metafold`

### Method 3: Build from Source

1. **Clone Repository**
   ```bash
   git clone https://github.com/ThZobel/MetaFold.git
   cd MetaFold
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build Application**
   ```bash
   npm run build
   npm run dist
   ```

![Linux Build Process](images/linux-build-process.png)

### Linux-Specific Configuration

**Dependencies:**
```bash
# Ubuntu/Debian
sudo apt-get install python3 python3-pip

# CentOS/RHEL
sudo yum install python3 python3-pip

# Arch Linux
sudo pacman -S python python-pip
```

**Desktop Environment:**
- GNOME, KDE, XFCE, and other major desktop environments supported
- Wayland and X11 compatibility

## Post-Installation Setup

### First Launch

1. **Start MetaFold**
   - Launch from desktop shortcut, Start Menu, or Applications folder
   - Wait for application to load completely

2. **Initial Setup Wizard**
   - Choose user mode (Simple or Multi-user)
   - Set default project location
   - Configure basic preferences

   ![First Launch Setup](images/first-launch-setup.png)

3. **Verify Installation**
   - Check that all tabs are accessible
   - Test template creation functionality
   - Verify file system permissions

### Python Setup (for OMERO Integration)

**Install Python Dependencies:**
```bash
# Install required packages
pip install requests flask flask-cors

# Verify installation
python -c "import requests, flask"
```

**Test Proxy Server:**
```bash
# Navigate to MetaFold directory
cd /path/to/MetaFold

# Test proxy server startup
python omero_proxy.py --help
```

![Python Setup](images/python-setup.png)

### Directory Structure

MetaFold creates the following directories on first launch:

```
User Data Directory:
├── templates/          # User templates
├── settings.json       # Application settings
├── logs/              # Application logs
├── cache/             # Temporary cache files
└── backups/           # Automatic backups

Project Directory:
├── project-name/      # Individual projects
│   ├── data/         # Project data
│   ├── analysis/     # Analysis files
│   └── elabftw-metadata.json  # Project metadata
```

**Default Locations:**
- Windows: `%APPDATA%\MetaFold`
- macOS: `~/Library/Application Support/MetaFold`
- Linux: `~/.config/MetaFold`

## Verification and Testing

### Installation Verification

**Check Application Status:**
1. Launch MetaFold successfully
2. All tabs load without errors
3. Settings page accessible
4. Debug information available in Settings > Debug

**Test Core Functionality:**
1. Create a simple template
2. Create a test project
3. Verify folder structure creation
4. Check metadata file generation

![Installation Verification](images/installation-verification.png)

### Integration Testing

**Test elabFTW Integration (if available):**
1. Go to Settings > elabFTW
2. Enter server URL (test server or actual server)
3. Click "Test Connection"
4. Verify connection status

**Test OMERO Integration (if available):**
1. Start Python proxy server
2. Go to Settings > OMERO
3. Enter server details
4. Test authentication

### Performance Testing

**System Performance:**
- Monitor CPU and memory usage during startup
- Check application responsiveness
- Verify file operations are fast
- Test with sample templates and projects

## Troubleshooting Installation

### Common Installation Issues

**Windows: "App can't run on this PC"**
- Ensure you downloaded the correct 64-bit version
- Check Windows version compatibility
- Try running as administrator

**macOS: "Cannot open because of unidentified developer"**
- Right-click → Open instead of double-clicking
- System Preferences → Security & Privacy → "Open Anyway"
- Consider allowing unsigned applications

**Linux: "Permission denied"**
- Make AppImage executable: `chmod +x MetaFold-*.AppImage`
- Check if execution from current directory is allowed
- Try running from terminal for error messages

![Installation Troubleshooting](images/installation-troubleshooting.png)

### Dependency Issues

**Python Not Found:**
```bash
# Windows: Install Python from python.org
# macOS: Install Homebrew, then: brew install python3
# Linux: Use package manager: sudo apt install python3
```

**Missing System Libraries (Linux):**
```bash
# Common missing libraries
sudo apt-get install libnss3 libatk-bridge2.0-0 libgtk-3-0
```

### Getting Help

**If installation fails:**
1. Check [GitHub Issues](https://github.com/ThZobel/MetaFold/issues) for known problems
2. Review system requirements and compatibility
3. Try alternative installation methods
4. Contact support with system details and error messages

**Useful Information for Support:**
- Operating system and version
- MetaFold version attempted
- Complete error messages
- System specifications

## Updating MetaFold

### Automatic Updates

**Update Notifications:**
- MetaFold checks for updates on startup
- Notification appears when new version available
- Optional automatic download and installation

**Manual Update Check:**
- Help → Check for Updates
- Downloads update in background
- Prompts for installation when ready

![Update Process](images/update-process.png)

### Manual Updates

**Complete Reinstallation:**
1. Download latest version
2. Close MetaFold completely
3. Install new version (overwrites previous)
4. Launch and verify settings preserved

**Backup Before Updates:**
- Export important templates
- Backup settings if heavily customized
- Note integration configurations

## Uninstallation

### Windows Uninstallation

**Using Control Panel:**
1. Programs and Features → MetaFold → Uninstall
2. Follow uninstaller prompts
3. Optionally remove user data folder

**Manual Removal:**
```cmd
# Remove installation directory
rmdir /s "C:\Program Files\MetaFold"

# Remove user data (optional)
rmdir /s "%APPDATA%\MetaFold"
```

### macOS Uninstallation

**Simple Removal:**
```bash
# Move to Trash
mv /Applications/MetaFold.app ~/.Trash/

# Remove user data (optional)
rm -rf ~/Library/Application\ Support/MetaFold
```

### Linux Uninstallation

**AppImage:**
```bash
# Simply delete the AppImage file
rm MetaFold-Linux-x64.AppImage

# Remove user data (optional)
rm -rf ~/.config/MetaFold
```

**Debian Package:**
```bash
sudo apt remove metafold
```

## Next Steps

Now that MetaFold is installed:

1. **[First Steps](first-steps.md)** - Learn the basic interface and create your first template
2. **[Interface Overview](interface-overview.md)** - Understand all features and navigation
3. **[Template Management](templates.md)** - Create sophisticated templates for your research
4. **[Integration Setup](elabftw-integration.md)** - Connect with your laboratory systems

---

*Welcome to organized, reproducible research data management with MetaFold!*