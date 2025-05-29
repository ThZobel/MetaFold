# MetaFold

**MetaFold** is a program for creating folder structures and metadata files (e.g., .json) based on templates.

*Note: This project is currently under development (Work in Progress).*

---

## Core Idea

The main idea behind MetaFold is to locally generate folder structures and associated metadata on your computer based on configurable templates. This is particularly intended to simplify the organization of "experiments" or projects.

An "**Experiment**" in MetaFold:

* Is based on a previously defined template.
* The template can include a specific folder structure.
* The template also defines a configurable metadata file (currently primarily JSON files).

---

## Inspiration and Acknowledgements

The concept of MetaFold is inspired by the excellent **RDM-Desktop Tool**, developed by T. Haraszti.

* GitHub Repository: [tomio13/RDM-Desktop](https://github.com/tomio13/RDM-Desktop)
* License: The RDM-Desktop Tool is licensed under the [CC BY 4.0 License](https://creativecommons.org/licenses/by/4.0/). We thank T. Haraszti for providing this tool and the inspiration.

MetaFold aims to offer similar functionalities in a modern design and with enhanced flexibility.

---

## Technology Stack

MetaFold is built as a desktop application using **Node.js** and **Electron**. This allows for a cross-platform user interface developed with web technologies.

---

## Future Ideas and Planned Features

* **Compatibility with Electronic Lab Notebooks (ELNs)**: Creation of metadata files that can be directly used in various ELNs like eLabFTW.
* **Direct Upload to ELNs**: Implementation of a feature to directly upload JSON files to platforms such as eLabFTW, OpenBis, or RSpace.
* **OMERO Integration**: Sending JSON metadata to OMERO Projects/Datasets.
* **Automated README Creation**: Generation of a README file with project descriptions based on the metadata.
* **RO-Crates as Outcome**: Generation of **RO-Crates** for packaging research objects and their metadata.

---
# 🚀 How to Install MetaFold

## Prerequisites

* **Node.js** must be installed
  → Download: [https://nodejs.org](https://nodejs.org)

---

## 🔧 Setting Up the Project

1. **Create a new folder for your project**

   ```bash
   mkdir my-electron-app
   cd my-electron-app
   ```

2. **Copy project files from GitHub**

   * Download or clone the contents of the `src` folder from the GitHub repository:

     ```bash
     git clone https://github.com/ThZobel/MetaFold.git
     cp -r MetaFold/src/* ./
     ```
   * Alternatively, download the files manually from GitHub (click on the green Code Button and select download as zip) and place them into your new folder.

3. **Initialize the project (if needed)**

   ```bash
   npm init -y
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

---

## ▶️ Run the App

To start the Electron app in development mode, run:

```bash
npm start
```

---

## 🛠️ Build the App (Windows, macOS, Linux)

If the project is already configured with [electron-builder](https://www.electron.build/) or a similar tool, you can simply run:

```bash
npm run build
```

This will generate platform-specific executables in the `dist/` folder (depending on your configuration in `package.json`).

---

## ✅ Done!

Your Electron app is now ready to use and build! 🎉

---
## Development Note

This program was developed with the assistance of [claude.ai](https://claude.ai/).
