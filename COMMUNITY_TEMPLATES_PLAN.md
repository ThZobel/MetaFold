# MetaFold Community Templates: Architektur-, Taxonomie- und Integrationsplan

**Dokument-Version:** 1.0  
**Datum:** 06.10.2026  
**Status:** Geplant / Bereit zur Implementierung  
**Bezug:** `ARCHITECTURE_AND_MODULES.md`, `SESSION_HANDOVER.md`, `ThZobel/MetaFold-Templates`

---

## 1. Zielsetzung & Überblick

Um Templates in MetaFold besser auffindbar, filterbar und austauschbar zu machen, wird das Community-Template-System erweitert:
1. **Strukturierte Taxonomie:** Einführung standardisierter Kategorien (System/Device, Discipline, Biological System, freie Tags) mit **Dropdown-Vorschlägen plus Freitext-Option**, damit MetaFold sowohl für biologische Labore als auch für Technik, Materialwissenschaften oder nicht-akademische Workflows flexibel bleibt.
2. **Saubere Datenhaltung:** Speicherung der Metadaten im Template selbst (`community`-Block), sodass Templates autark und portabel bleiben, ohne reguläre Nutzer bei der täglichen Experimenterstellung zu verwirren.
3. **Optimierte Template-Editor UI:** 
   - Der Reiter **Metadaten** wird zum **ersten Haupt-Tab**.
   - Die **Ordnerstruktur** wird als einklappbarer Bereich (*Collapsible Section*) direkt integriert.
   - Ein neuer, optionaler Tab **„Community & Sharing“** erlaubt das Vorab-Klassifizieren.
4. **Nahtloser 3-Stufen-Workflow:** 
   - *Stufe 1:* Vordefinition im Template-Editor (optional).
   - *Stufe 2:* Schnelle Bestätigung/Ergänzung beim Upload-Dialog in MetaFold vor dem Öffnen des GitHub-Issues.
   - *Stufe 3:* GitHub Issue Form Template für externe Contributor ohne MetaFold.
5. **Facetten-Filterung im Template Hub:** Vollständige Filter- und Sortierbarkeit im bestehenden Tabulator/FacetSearch-Hub.

---

## 2. Metadaten-Schema im Template JSON

Die Metadaten werden in einem standardisierten `community`-Objekt auf Root-Ebene des Templates abgelegt:

```json
{
  "name": "Leica Stellaris - Live Plant Imaging",
  "description": "Konfokales Imaging-Protokoll für Wurzelwachstum in Arabidopsis",
  "type": "experiment",
  "category": "category1",

  "community": {
    "system": "Microscopy (Confocal / 2-Photon)",
    "discipline": "Plant Biology / Botany",
    "organism": "Arabidopsis thaliana",
    "tags": ["Confocal", "Live-cell", "GFP", "Time-Lapse", "Root Growth"],
    "author": "Dr. Thomas Zobel",
    "institution": "University of Münster",
    "orcid": "0000-0002-XXXX-XXXX",
    "version": "1.0.0",
    "license": "CC-BY-4.0"
  },

  "options": {
    "writeFilesOnly": false,
    "multipleFolders": false
  },
  "structure": "raw/\nprocessed/\nanalysis/\n",
  "metadata": {
    "fields": {
      "laser_power": { "type": "number", "label": "Laser Power (%)" }
    }
  }
}
```

> **Wichtig für die Trennung (README & Projekt-Metadaten):**  
> 1. Bei der täglichen Projekterstellung in MetaFold liest `experimentForm.js` ausschließlich `template.metadata.fields`. Der `community`-Block wird dort vollständig ignoriert.
> 2. **Kein Eintrag in `README.html` oder `ReadyToImport.json`:** Die `community`-Kategorien werden **niemals** in generierte `README.html`-Dateien oder experimentelle Export-JSONs geschrieben. Sie verbleiben ausschließlich als Schablonen-Metadaten für die GitHub-Indexierung und den Template Hub.
> 3. `generateReadmeHtml` und die JSON-Assemblierung in `projectManager.js` filtern den Key `community` analog zu internen System-Flags (`_metafold`, `_fileInfo`) strikt heraus.

---

## 3. Taxonomie & Kategorien (Dropdowns + Freitext via `<datalist>`)

Jedes Feld wird als **HTML5 `<input list="...">` mit verknüpfter `<datalist>`** umgesetzt. Der Nutzer kann aus einer Klick-Liste wählen **oder** beliebigen Freitext eintragen.

### A. System / Device (`system`)
*Vordefinierte Vorschläge (erweiterbar durch Freitext):*
- **Microscopy (Light / Widefield)**
- **Microscopy (Confocal / 2-Photon)**
- **Microscopy (Super-Resolution / STED / SIM / STORM)**
- **Microscopy (Light Sheet / SPIM)**
- **Microscopy (Electron / SEM / TEM / Cryo-EM)**
- **Plate Reader / Spectrophotometer**
- **Flow Cytometer / FACS**
- **Sequencer (NGS / Illumina / Nanopore / PacBio)**
- **Mass Spectrometer (Proteomics / Metabolomics)**
- **Chromatography (HPLC / FPLC / GC)**
- **Wet Lab: PCR / qPCR / Thermal Cycler**
- **Wet Lab: Staining / Histology / Immunofluorescence**
- **Wet Lab: Sample Prep / Extraction / Purification**
- **Wet Lab: Gel Imaging / Western Blot**
- **Wet Lab: Cell Culture / Incubator / Bioreactor**
- **Wet Lab: General Bench Protocol**
- **Data Analysis / Bioimage Analysis**
- **Hardware / 3D Printing / Prototyping**
- *Freitext (z.B. "Custom Spectrometer", "Server Benchmark", etc.)*

### B. Discipline / Domain (`discipline`)
*Vordefinierte Vorschläge (erweiterbar durch Freitext):*
- **Plant Biology / Botany**
- **Cell Biology**
- **Neuroscience**
- **Developmental Biology**
- **Microbiology / Bacteriology**
- **Virology**
- **Immunology**
- **Molecular Biology & Genetics**
- **Biochemistry & Structural Biology**
- **Biophysics**
- **Pharmacology & Toxicology**
- **Ecology & Evolution**
- **Material Science & Physics**
- **Chemistry & Synthesis**
- **Computer Science & Data Engineering**
- *Freitext (z.B. "Marine Ecology", "Robotics", etc.)*

### C. Biological System / Model (`organism`)
*Vordefinierte Vorschläge (erweiterbar durch Freitext):*
- **Arabidopsis thaliana** (Pflanze)
- **Danio rerio** (Zebrafisch)
- **Mus musculus** (Maus)
- **Rattus norvegicus** (Ratte)
- **Drosophila melanogaster** (Fruchtfliege)
- **Caenorhabditis elegans** (Fadenwurm)
- **Homo sapiens / Human Cell Lines**
- **Saccharomyces cerevisiae / Yeast**
- **Escherichia coli / Bacteria**
- **Viruses / Phages**
- **Organoids / 3D Tissues**
- **Non-biological / In vitro / Synthetic**
- *Freitext (z.B. "Nicotiana benthamiana", "Xenopus laevis", etc.)*

### D. Allgemeine Tags (`tags`)
- Freie Schlagworte, kommagetrennt (z.B. `FRAP`, `FLIM`, `CRISPR`, `Stellaris`, `LSM980`, `time-lapse`, `4D`, `fixed`).

---

## 4. UI/UX Umbau des Template-Editors (`template-modal.html`)

### Aktuelle Aufteilung:
- Tabs: `[Structure]` | `[Metadata]`

### Neue Aufteilung:
- **Tab 1: `[📋 Metadata Fields]` (Primär / Standard aktiv)**
  - Oben: Schaltflächen `+ Add Field`, `📂 Load JSON`, Knowledge Graph Lineage Buttons (`Lineage ID`, `Derived From`).
  - Formularfelder-Editor (`#metadataFields`).
  - **Neuer einklappbarer Bereich (`<details>` oder Accordion-Panel):**
    `📁 Folder Structure & Execution Mode (Optional)`
    - Beinhaltet die Schalter:
      - *Write files only (Flag-File)*
      - *Multiple folders (Batch mode)*
    - Beinhaltet die Textarea für `Folder Structure (optional)`.
    - Standardmäßig zugeklappt oder dezent platziert, da 80% der Nutzer primär Metadaten konfigurieren.
- **Tab 2: `[🌐 Community & Sharing (Optional)]`**
  - **Header:** *„Publishing & Community Hub Metadata (Optional)“* – dezenter Hinweistext, dass diese Angaben für das Teilen auf GitHub genutzt werden.
  - **Felder:**
    - `System / Device` (Input mit `<datalist>`)
    - `Discipline` (Input mit `<datalist>`)
    - `Biological System / Specimen` (Input mit `<datalist>`)
    - `Tags` (Textfeld, kommagetrennt)
    - `Author & Institution` (vorbelegt mit Benutzername und Gruppe aus `profileManager`/`userManager`)
    - `License` (Dropdown: CC-BY-4.0, MIT, CC0, etc.)

---

## 5. Upload-Workflow (MetaFold → GitHub)

Der Upload-Dialog in MetaFold wird auf ein 2-Schritt-Modal erweitert:

```
[Menü: Templates -> Upload to Community]
                │
                ▼
┌────────────────────────────────────────────────────────┐
│               Upload Community Template                │
├────────────────────────────────────────────────────────┤
│ 1. Select Template: [ Leica Stellaris System        ▼] │
│                                                        │
│ 2. Classification & Community Tags:                   │
│    System / Device:   [ Microscopy (Confocal)       ▼] │
│    Discipline:        [ Plant Biology / Botany      ▼] │
│    Biological System: [ Arabidopsis thaliana        ▼] │
│    Tags (comma-sep):  [ Confocal, GFP, Time-lapse    ] │
│    Author:            [ Dr. Thomas Zobel             ] │
│                                                        │
│ [x] Update local template with these tags              │
├────────────────────────────────────────────────────────┤
│                     [ Cancel ]  [ Continue to GitHub ] │
└────────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────┐
│ Browser öffnet GitHub Issue mit vorausgefülltem Text:  │
│ - Name, System, Discipline, Organism, Tags, Author     │
│ - Vollständiger JSON-Codeblock des Templates           │
└────────────────────────────────────────────────────────┘
```

**Besondere Vorteile:**
- Wurden die Tags bereits in Tab 2 des Template-Editors gepflegt, sind sie sofort vorausgefüllt.
- Wurden sie noch nicht gepflegt, kann der Nutzer sie in wenigen Sekunden im Upload-Modal setzen.
- Durch die Option *„Update local template with these tags“* bleibt das lokale Template synchron.

---

## 6. GitHub Repository Automation (`ThZobel/MetaFold-Templates`)

### A. GitHub Issue Form (`.github/ISSUE_TEMPLATE/new_template.yml`)
Für Nutzer, die Templates ohne MetaFold direkt über GitHub einreichen:
- Dropdown für **System / Device** (+ Freitext-Feld „Other“)
- Dropdown für **Discipline** (+ Freitext-Feld „Other“)
- Dropdown für **Biological System** (+ Freitext-Feld „Other“)
- Textfeld für **Tags**
- Textarea für **Template JSON Payload**

### B. Index-Generator Action (`generate-index.yml`)
Das Skript scannt alle `.json`-Dateien im Repository und erzeugt `templates-index.json`:
```json
[
  {
    "id": "leica-stellaris-plant",
    "name": "Leica Stellaris - Live Plant Imaging",
    "description": "Konfokales Imaging-Protokoll...",
    "collection": "NFDI4Bioimage",
    "path": "templates/NFDI4Bioimage/leica_stellaris_plant.json",
    "system": "Microscopy (Confocal / 2-Photon)",
    "discipline": "Plant Biology / Botany",
    "organism": "Arabidopsis thaliana",
    "tags": ["Confocal", "Live-cell", "GFP"],
    "author": "Dr. Thomas Zobel",
    "version": "1.0.0"
  }
]
```

### C. Ordnerstruktur im GitHub-Repository: Flach vs. Community-Unterordner
**Gibt es Probleme mit Unterordnern (z.B. `templates/NFDI4Bioimage/`, `templates/RDM4Mic/`, `templates/Protocols/`)?**
- **Nein, absolut keine Probleme!** Es funktioniert einwandfrei und ist sogar die **deutlich überlegene Architektur**.
- **Grund:** MetaFold verlässt sich nicht auf Dateinamen, sondern arbeitet strikt nach dem `templates-index.json`. 
  - Die GitHub Action scannt rekursiv: `path` speichert den exakten relativen Pfad (z.B. `templates/NFDI4Bioimage/leica_stellaris.json`).
  - Beim Download (`app.js` / `facetSearch.js`) wird dieser relative Pfad einfach an die Raw-URL angehängt:  
    `https://raw.githubusercontent.com/.../templates/NFDI4Bioimage/leica_stellaris.json`.
- **Riesige Vorteile von Community-Ordnern:**
  1. **Keine Namenskollisionen:** Zwei Konsortien können jeweils ein `confocal_standard.json` haben, ohne sich zu überschreiben.
  2. **Automatischer Filter `collection`:** Die GitHub Action kann den Ordnernamen automatisch als Attribut `"collection": "NFDI4Bioimage"` in den Index schreiben. Dadurch erhält MetaFold in der Facet Search sofort einen weiteren Filter-Chip:  
     `[Collection: NFDI4Bioimage (12)]` `[Collection: RDM4Mic (8)]` `[Collection: General (15)]`
  3. **Rechte & Governance auf GitHub:** Einzelne Communities oder Institute können via GitHub `CODEOWNERS` für ihren eigenen Ordner Review-Rechte erhalten.

---

## 7. Template Hub & Facet Search Integration (`facetSearch.js` & `app.js`)

In `src/js/app.js` (`openTemplateHub`):
```javascript
window.facetSearch.allAvailableKeys = [
  'collection',
  'system', 
  'discipline', 
  'organism', 
  'tags', 
  'author', 
  'version'
];
window.facetSearch.visibleColumns = [
  'collection',
  'system', 
  'discipline', 
  'organism', 
  'tags', 
  'author'
];
```

**Ergebnis für den Benutzer:**
- In der linken Sidebar der Facet Search erscheinen gruppierte Chips:
  - **Collection:** `[NFDI4Bioimage (12)]` `[RDM4Mic (8)]` `[General (15)]`
  - **System:** `[Microscopy (14)]` `[Wet Lab: PCR (5)]` `[Sequencer (3)]`
  - **Discipline:** `[Plant Biology (6)]` `[Neuroscience (8)]`
  - **Organism:** `[Arabidopsis thaliana (4)]` `[Danio rerio (3)]`
- Ein Klick auf z.B. `[Arabidopsis thaliana]` filtert die Tabelle sofort auf alle passenden Templates.

---

## 8. Schritt-für-Schritt Implementierungs-Checkliste

### Phase 1: Template Editor (`template-modal.html` & `templateModal.js`)
- [ ] HTML: Tab-Reihenfolge ändern (Metadaten zuerst).
- [ ] HTML: Ordnerstruktur als `<details>` / einklappbares Element in den Metadaten-Tab einbetten.
- [ ] HTML: Neuen Tab `[🌐 Community & Sharing]` mit Feldern (`system`, `discipline`, `organism`, `tags`, `author`, `license`) und `<datalist>`-Vorschlägen anlegen.
- [ ] JS: `templateModal.js` erweitern, um `community`-Metadaten beim Öffnen zu laden und beim Speichern in `template.community` zu sichern.

### Phase 2: Upload-Dialog (`src/main.js` & Renderer)
- [ ] Menü-Aktion `upload-template` überarbeiten: Modernes Modal mit Vorauswahl des Templates und Vorschau/Editierbarkeit der Community-Tags.
- [ ] Speichern der eingegebenen Tags zurück in das lokale Template.
- [ ] Formatierung des GitHub-Issue-Bodys um die neuen Kategorien erweitern.

### Phase 3: Hub & Facet Search Anpassung (`app.js` & `facetSearch.js`)
- [ ] `app.js` (`openTemplateHub`): Mapping für `system`, `discipline`, `organism`, `tags` hinterlegen.
- [ ] `downloadAndInstallTemplate(repoPath)` fertigstellen (Herunterladen, lokales Speichern über `templateManager`, Erfolgsmeldung).
- [ ] CSS: Hervorhebung der ausgewählten Tabulator-Zeile (`.tabulator-row.tabulator-selected`).

### Phase 4: GitHub Repository (`ThZobel/MetaFold-Templates`)
- [ ] `.github/ISSUE_TEMPLATE/new_template.yml` anlegen.
- [ ] `generate-index.yml` prüfen/aktualisieren, sodass `template.community` extrahiert wird.

---

*Dieser Plan dient als vollständige Blaupause für die nächste Implementierungsphase.*
