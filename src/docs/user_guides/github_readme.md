# MetaFold Documentation

[![Documentation Status](https://readthedocs.org/projects/metafold/badge/?version=latest)](https://metafold.readthedocs.io/en/latest/?badge=latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Issues](https://img.shields.io/github/issues/ThZobel/metafold-docs)](https://github.com/ThZobel/metafold-docs/issues)
[![Last Commit](https://img.shields.io/github/last-commit/ThZobel/metafold-docs)](https://github.com/ThZobel/metafold-docs/commits/main)

> **📚 Official user documentation for MetaFold - Laboratory Data Management & Experiment Organization**

This repository contains the complete user documentation for [MetaFold](https://github.com/ThZobel/MetaFold), a powerful desktop application for organizing research data, managing experiment metadata, and integrating with laboratory systems like elabFTW and OMERO.

## 🔗 Quick Links

- **📖 [Live Documentation](https://metafold.readthedocs.io)** - Read the complete user guide online
- **💻 [MetaFold Application](https://github.com/ThZobel/MetaFold)** - Main application repository
- **🐛 [Report Documentation Issues](https://github.com/ThZobel/metafold-docs/issues)** - Help improve these docs
- **💬 [Community Discussions](https://github.com/ThZobel/MetaFold/discussions)** - Join the conversation

## 🎯 About MetaFold

MetaFold is an Electron-based desktop application designed for life sciences researchers to:

- ✅ **Create standardized folder structures** for experiments and research projects
- ✅ **Manage metadata** with customizable, dynamic templates
- ✅ **Integrate with lab systems** - elabFTW (electronic lab notebook) and OMERO (image management)
- ✅ **Discover existing projects** with powerful scanning and visualization tools
- ✅ **Support team workflows** with multi-user capabilities and secure credential management

**Part of the [NFDI4BioImage](https://nfdi4bioimage.de/) initiative for FAIR research data management.**

## 📋 Documentation Contents

| Guide | Description |
|-------|-------------|
| **🚀 [Getting Started](docs/index.md)** | Installation, first steps, and quick start guide |
| **📋 [Template Management](docs/templates.md)** | Create and manage project templates |
| **🔗 [elabFTW Integration](docs/elabftw-integration.md)** | Electronic lab notebook integration |
| **🔬 [OMERO Integration](docs/omero-integration.md)** | Image data management integration |
| **🤝 [Combined Workflows](docs/combined-integrations.md)** | Using elabFTW + OMERO together |
| **🔍 [Project Discovery](docs/project-scanner.md)** | Find and analyze existing projects |
| **📊 [Data Visualization](docs/data-visualization.md)** | Interactive data exploration |
| **👥 [User Management](docs/user-management.md)** | Multi-user setup and administration |
| **🔒 [Security Features](docs/security.md)** | Credential management and data protection |
| **⚡ [Advanced Features](docs/advanced-features.md)** | Power user capabilities and customization |
| **🛠️ [Troubleshooting](docs/troubleshooting.md)** | Problem solving and FAQ |

## 🚀 Using This Documentation

### Online Reading
Visit **[metafold.readthedocs.io](https://metafold.readthedocs.io)** for the best reading experience with:
- 🔍 Full-text search
- 📱 Mobile-responsive design
- 🌙 Dark/light mode toggle
- 📖 Easy navigation and cross-references

### Local Development

```bash
# Clone this repository
git clone https://github.com/ThZobel/metafold-docs.git
cd metafold-docs

# Install MkDocs and dependencies
pip install mkdocs mkdocs-material

# Serve locally for development
mkdocs serve

# Build static site
mkdocs build
```

The documentation will be available at `http://localhost:8000`

## 📸 Screenshots and Images

Screenshots are stored in `docs/images/` with systematic naming:
- `main-interface-overview.png` - Main application interface
- `template-creation-basic.png` - Template creation workflow
- `elabftw-integration-setup.png` - Integration configuration
- `project-scanner-results.png` - Project discovery features

## 🤝 Contributing

We welcome contributions to improve the documentation! Here's how you can help:

### 📝 Content Improvements
- **Fix typos and grammar** - Submit pull requests for any errors
- **Update screenshots** - Help keep images current with latest UI
- **Add examples** - Share real-world usage scenarios
- **Improve clarity** - Suggest better explanations or organization

### 🐛 Reporting Issues
Found a problem with the documentation? Please [open an issue](https://github.com/ThZobel/metafold-docs/issues) with:
- **Page or section** where the issue occurs
- **Description** of the problem
- **Suggested improvement** (optional)

### 🔄 Contribution Workflow
1. **Fork** this repository
2. **Create** a feature branch (`git checkout -b improve-installation-guide`)
3. **Make** your changes
4. **Test** locally with `mkdocs serve`
5. **Submit** a pull request

## 📋 Documentation Standards

- **Clear structure** with logical progression from basic to advanced
- **Step-by-step instructions** with concrete examples
- **Screenshots** for all major UI interactions
- **Troubleshooting sections** for common issues
- **Cross-references** between related topics
- **Multiple user types** (individual researchers, teams, administrators)

## 🔧 Technical Details

**Built with:**
- [MkDocs](https://www.mkdocs.org/) - Static site generator
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) - Theme
- [Read the Docs](https://readthedocs.org/) - Hosting platform

**Features:**
- Responsive design for mobile and desktop
- Full-text search functionality
- Syntax highlighting for code examples
- Dark/light mode support
- Print-friendly layouts
- SEO optimized

## 📊 Documentation Statistics

- **12 comprehensive guides** covering all features
- **150+ screenshot placeholders** for visual guidance
- **Multiple user types** supported (researchers, admins, developers)
- **Complete workflow coverage** from installation to advanced usage
- **Troubleshooting support** for common issues

## 🏷️ Version Information

**Documentation Versions:**
- `latest` - Current development version
- `stable` - Latest stable release
- `v1.0` - Initial comprehensive documentation release

**Compatibility:**
- MetaFold v0.5+ (current development version)
- All major operating systems (Windows, macOS, Linux)
- Modern web browsers for online documentation

## 📄 License

This documentation is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.

The MetaFold application itself is licensed separately - see the [main repository](https://github.com/ThZobel/MetaFold) for application licensing information.

## 🙏 Acknowledgments

- **[NFDI4BioImage](https://nfdi4bioimage.de/)** - For supporting FAIR research data management
- **Contributors** - Everyone who has helped improve this documentation
- **Community** - Users who provide feedback and suggestions
- **Open Source Projects** - MkDocs, Material theme, and other tools that make this possible

## 📞 Support and Contact

- **Application Issues**: Report on the [main MetaFold repository](https://github.com/ThZobel/MetaFold/issues)
- **Documentation Issues**: Report on [this repository](https://github.com/ThZobel/metafold-docs/issues)
- **General Questions**: Use [GitHub Discussions](https://github.com/ThZobel/MetaFold/discussions)
- **NFDI4BioImage**: Visit [nfdi4bioimage.de](https://nfdi4bioimage.de/) for project information

---

**📖 [Start Reading the Documentation →](https://metafold.readthedocs.io)**

*Transform your research data management with MetaFold's comprehensive documentation!*