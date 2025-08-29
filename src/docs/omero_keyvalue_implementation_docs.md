# OMERO Key-Value Implementation - Dokumentation & Entwicklungsplan

**Version**: v06.1 (August 2025)  
**Status**: ✅ Phase 1 Abgeschlossen - Phase 2 Geplant  
**Implementiert von**: Claude (mit Thomas Zobel)

---

## 🎉 **Phase 1: ERFOLGREICH ABGESCHLOSSEN**

### **Zielsetzung Phase 1**
Umstellung von JSON-Triplet Metadaten (Schema + Wert + Typ) auf **reine Key-Value Paare** für OMERO Map Annotations.

### **✅ Implementierte Änderungen**

#### **1. Neue Funktionen in `js/omero/omeroAnnotations.js`**
- ✅ **`testCreateMultipleKeyValues()`** - Bewährte Methode aus working-code-additions.md
- ✅ **`convertMetadataToSimpleKeyValues()`** - Konvertiert MetaFold-Metadaten zu [key, value] Arrays
- ✅ **`addMapAnnotationsSimple()`** - Neue Hauptmethode für reine Key-Value Übertragung

#### **2. Erweiterte Integration in `js/omero/metaFoldOMEROIntegration.js`**
- ✅ **`addMapAnnotationsNew()`** - Neue Hauptmethode mit automatischem Fallback
- ✅ **Fallback-Mechanismus** - Bei Fehlern automatischer Rückfall auf JSON-Triplet Methode
- ✅ **Aktualisierte `createDatasetForMetaFoldProject()`** - Nutzt neue Methode standardmäßig

#### **3. Optional: Template Sync Modul**
- ✅ **`js/omero/omeroTemplateSync.js`** - Direkter Template-zu-OMERO Sync
- ✅ **Console-Testing Funktionen** - Für Entwicklung und Debugging

### **🔄 Datenformat-Transformation**

**VORHER (JSON-Triplets):**
```json
{
  "mode": "LSM Plus (DCV)",
  "mode_type": "dropdown", 
  "mode_label": "Mode",
  "mode_description": "Microscopy mode selection"
}
```

**NACHHER (Reine Key-Value Paare):**
```json
[
  ["Mode", "LSM Plus (DCV)"],
  ["Sample ID", "S123"],
  ["Organism", "Rattus norvegicus"]
]
```

### **⚡ Bewiesene Funktionalität**
- ✅ **7 Template-Felder** erfolgreich als reine Key-Value Paare übertragen
- ✅ **OMERO Annotation ID** korrekt erstellt (getestet mit ID 233539)
- ✅ **Automatischer Fallback** bei Problemen zur alten Methode
- ✅ **Keine Datenverluste** - alle bestehenden Funktionen bleiben verfügbar
- ✅ **Performance-Verbesserung** - weniger Datenvolumen, klarere Darstellung in OMERO

---

## 🚀 **Phase 2: ENTWICKLUNGSPLAN**

### **Zielsetzung Phase 2**
Erweiterte OMERO-Integration mit Benutzeroptionen und intelligenter Namespace-Verwendung.

### **🎯 Geplante Features**

#### **2.1 UI-Option für JSON-Triplet Modus**
**Implementierung**: Checkbox im Project Manager OMERO-Bereich

**Technische Details:**
- **UI-Element**: `<input type="checkbox" id="omeroUseJsonTriplets" />` 
- **Label**: "Use detailed metadata format (JSON triplets)"
- **Default**: `false` (reine Key-Value ist Standard)
- **Speicher**: In `settingsManager` als `omero.use_json_triplets`
- **Integration**: Parameter an `addMapAnnotationsNew()` übergeben

**Code-Änderungen:**
- `index.html` - Checkbox im OMERO-UI Bereich hinzufügen
- `js/omero/omeroUIIntegration.js` - Checkbox-Handling
- `js/omero/metaFoldOMEROIntegration.js` - Parameter auswerten

#### **2.2 Integration Links als Key-Value Paare**
**Zielsetzung**: `NFDI4BioImage.MetaFold.IntegrationLinks` Namespace auf reine Key-Value umstellen

**Aktuelle Integration Links:**
```json
{
  "metafold_export_timestamp": "2025-08-02T08:33:36.443Z",
  "project_local_path": "C:\\Projekte\\metafold_test",
  "omero_link": "https://omero-imaging.uni-muenster.de/...",
  "elabftw_link": "https://elabftw.example.com/..." 
}
```

**Neue Struktur:**
```json
[
  ["MetaFold Export Timestamp", "2025-08-02T08:33:36.443Z"],
  ["Project Local Path", "C:\\Projekte\\metafold_test"],
  ["OMERO Link", "https://omero-imaging.uni-muenster.de/..."],
  ["elabFTW Link", "https://elabftw.example.com/..."]
]
```

**Code-Änderungen:**
- `js/omero/metaFoldOMEROIntegration.js` - Integration Links Konvertierung
- Neue Funktion: `convertIntegrationLinksToKeyValue()`

#### **2.3 Template Groups als OMERO Namespaces**
**Zielsetzung**: JSON-Group fields aus Templates als separate OMERO Namespaces verwenden

**Template Beispiel:**
```json
{
  "metadata": {
    "sample_info_group": {
      "type": "group",
      "label": "Sample Information",
      "fields": ["sample_id", "organism", "fixation"]
    },
    "microscopy_group": {
      "type": "group", 
      "label": "Microscopy Settings",
      "fields": ["mode", "objective", "wavelength"]
    }
  }
}
```

**OMERO Ergebnis - Multiple Namespaces:**
```
Namespace: "Sample Information"
├── Sample ID -> "S123"
├── Organism -> "Rattus norvegicus" 
└── Fixation -> "Fixed"

Namespace: "Microscopy Settings"
├── Mode -> "LSM Plus (DCV)"
├── Objective -> "63x Oil"
└── Wavelength -> "488nm"

Namespace: "MetaFold Integration" 
├── MetaFold Export Timestamp -> "2025-08-02..."
└── Project Local Path -> "C:\\Projekte\\..."
```

**Code-Änderungen:**
- `js/omero/omeroAnnotations.js` - Neue Funktion: `convertMetadataToGroupedKeyValues()`
- `js/omero/metaFoldOMEROIntegration.js` - Multi-Namespace Support
- Logik: Gruppe erkennen → separate Annotation pro Gruppe erstellen

### **🔧 Technische Implementierungsstrategie**

#### **Schritt 1: UI-Erweiterung** 
```html
<!-- In OMERO Integration Bereich von index.html -->
<div class="form-group">
    <label>
        <input type="checkbox" id="omeroUseJsonTriplets" />
        Use detailed metadata format (includes field types and descriptions)
    </label>
    <small>Default: Simple key-value pairs for cleaner OMERO display</small>
</div>
```

#### **Schritt 2: Settings Integration**
```javascript
// In settingsManager.js
const defaultSettings = {
    'omero.use_json_triplets': false,
    'omero.use_template_groups_as_namespaces': true,
    'omero.integration_links_as_keyvalue': true
};
```

#### **Schritt 3: Erweiterte Konvertierungsfunktionen**
```javascript
// Neue Funktionen in omeroAnnotations.js
convertMetadataToGroupedKeyValues(metadata)
convertIntegrationLinksToKeyValue(integrationData)
```

#### **Schritt 4: Multi-Namespace Support**
```javascript
// In metaFoldOMEROIntegration.js
async addMapAnnotationsWithGroups(datasetId, metadata, options)
```

### **📋 Entwicklungsreihenfolge**

1. **UI-Checkbox für JSON-Triplet Option** (1-2 Stunden)
2. **Integration Links Key-Value Konvertierung** (1 Stunde)  
3. **Template Groups als Namespaces** (2-3 Stunden)
4. **Testing & Debugging** (1 Stunde)
5. **Dokumentation Update** (30 Minuten)

**Geschätzte Gesamtzeit**: 5-7 Stunden

---

## 🎯 **Erfolgs-Kriterien Phase 2**

### **UI & Benutzerfreundlichkeit**
- ✅ Checkbox für JSON-Triplet Modus funktional
- ✅ Settings werden gespeichert und geladen
- ✅ Klare Beschriftung der Optionen

### **Technische Funktionalität**
- ✅ Template Groups werden als separate OMERO Namespaces erstellt
- ✅ Integration Links als reine Key-Value Paare übertragen
- ✅ Fallback-Mechanismus für Templates ohne Groups
- ✅ Alle bestehenden Funktionen bleiben kompatibel

### **OMERO Darstellung**
**Mit Template Groups:**
```
Dataset 15755 "Experiment XYZ"
├── Namespace: "Sample Information" (3 key-value pairs)
├── Namespace: "Microscopy Settings" (4 key-value pairs)  
└── Namespace: "MetaFold Integration" (4 key-value pairs)
```

**Ohne Template Groups (Fallback):**
```
Dataset 15756 "Simple Experiment"
├── Namespace: "MetaFold Integration" (7 key-value pairs)
└── Namespace: "NFDI4BioImage.MetaFold.IntegrationLinks" (4 key-value pairs)
```

---

## 📚 **Kompatibilität & Migration**

### **Rückwärtskompatibilität**
- ✅ **Bestehende Funktionen** bleiben unverändert verfügbar
- ✅ **JSON-Triplet Modus** über Checkbox aktivierbar
- ✅ **Automatischer Fallback** bei Problemen
- ✅ **Template Migration** - neue Features optional

### **Development Guidelines**
- 🔧 **Minimal-invasive Änderungen** - bestehende Funktionen nicht überschreiben
- 🔧 **Modularer Aufbau** - neue Features als separate Funktionen
- 🔧 **Extensive Logging** - Console-Output für Debugging
- 🔧 **Error Handling** - Robuste Fehlerbehandlung mit Fallbacks

### **Testing-Strategie**
- 🧪 **Console-Tests** für alle neuen Funktionen
- 🧪 **Template-Varianten** - mit/ohne Groups testen
- 🧪 **UI-Interaktion** - Checkbox-States testen
- 🧪 **OMERO-Verifikation** - Namespace-Erstellung bestätigen

---

## 🎉 **Zusammenfassung**

**Phase 1** hat erfolgreich die Grundlage geschaffen: **Reine Key-Value Paare sind jetzt der Standard** für OMERO Metadaten-Übertragung aus MetaFold.

**Phase 2** wird die Funktionalität erweitern: **Benutzeroptionen**, **intelligente Namespaces** und **optimierte Integration Links**.

Das System bleibt dabei **vollständig kompatibel** und bietet **maximale Flexibilität** für verschiedene Anwendungsfälle in der Laborumgebung.

**Ready for Implementation** - Alle Spezifikationen definiert, Implementierungsplan erstellt! 🚀