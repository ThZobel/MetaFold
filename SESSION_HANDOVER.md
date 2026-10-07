# MetaFold Session Handover: Community Templates Feature

## Was bisher erreicht wurde (Statusbericht)

1. **GitHub Repository & Automation**
   - Ein separates Repository (`ThZobel/MetaFold-Templates`) wurde für Community Templates angelegt.
   - Eine GitHub Action (`generate-index.yml`) wurde eingerichtet. Sie scannt bei jedem Push (außer bei Änderungen an der Index-Datei selbst) alle `.json`-Dateien und generiert vollautomatisch die `templates-index.json`.

2. **Electron Menü (main.js)**
   - Neues Menü **"Templates"** mit den Einträgen "Browse Community Templates", "Import", "Export" und "Upload" hinzugefügt.
   - Da die reguläre IPC-Brücke aus Sicherheitsgründen die Events nicht ins Frontend geleitet hat, nutzen wir nun robusterweise `webContents.executeJavaScript()` für diese Menüpunkte.

3. **Template Hub / Facet Search (app.js & facet-search-modal.html)**
   - `window.app.openTemplateHub()` implementiert: Lädt die `templates-index.json` von GitHub herunter, formatiert sie um und übergibt sie an die Facet Search.
   - In der `facet-search-modal.html` wurde ein verstecktes Vorschau-Panel (`#facetTemplatePreview`) auf der linken Seite eingebaut.

4. **Upload / Publish Feature (main.js)**
   - Der "Upload"-Menüpunkt öffnet nun ein MetaFold-internes Modal.
   - Dort kann der Nutzer seine installierten Templates aus einem Dropdown wählen.
   - Nach der Auswahl wird das Template formatiert und **als vorausgefülltes GitHub-Issue im Webbrowser geöffnet**. (Dies umgeht sicherheitskritische API-Keys im Code).

5. **Tabulator & Preview Bugfix (facetSearch.js)**
   - `selectableRows: 1` und das `rowSelectionChanged`-Event wurden eingebaut, damit die Tabelle klickbar ist und mit Pfeiltasten navigiert werden kann.
   - *Fehler behoben:* `showTemplatePreview()` hat sofort abgebrochen, weil die Variable `this.isTemplateHub` undefiniert war. Dies wurde behoben (die Vorschau sollte nun beim Klick sofort laden!).

---

## Nächste Schritte (To-Do für die kommende Session)

**1. Tabulator Selection Styling prüfen:**
Da Sie erwähnt haben, dass die ausgewählte Zeile optisch nicht hervorgehoben war, müssen wir prüfen, ob in der `index.css` von MetaFold die CSS-Klasse `.tabulator-row.tabulator-selected` entsprechend eingefärbt ist (z.B. mit einer violetten Hintergrundfarbe).

**2. "Install Template" Logik einbauen (WICHTIG):**
Wenn man im Preview-Panel auf den großen "Install Template" Button klickt, ruft das UI aktuell die Funktion `window.app.downloadAndInstallTemplate('${data.path}')` auf.
👉 **Diese Funktion existiert noch nicht!**
Der nächste Agent muss in `app.js` die Funktion `async downloadAndInstallTemplate(githubPath)` implementieren. Diese muss:
- Die RAW JSON Datei von `https://raw.githubusercontent.com/ThZobel/MetaFold-Templates/main/` + `githubPath` herunterladen.
- Die JSON lesen.
- Das Template über den `templateManager` lokal abspeichern (`window.templateManager.importTemplate(...)` oder manuell das JSON schreiben).
- Ein Success-Alert anzeigen.

**3. Test des Fixes:**
Prüfen, ob die Metadaten-Vorschau nun durch den Bugfix (Entfernung der `isTemplateHub` Prüfung) korrekt anzeigt wird.
