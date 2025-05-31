# MetaFold - Benutzerhandbuch

## 🚀 Willkommen bei MetaFold

MetaFold ist ein Tool zum Erstellen und Verwalten von Projekt-Templates. Sie können Ordnerstrukturen und Experiment-Vorlagen erstellen, mit Ihrem Team teilen und wiederverwenden.

---

## 🔐 Erste Schritte

### Anmeldung
Beim ersten Start erscheint ein Login-Fenster:

1. **Name eingeben**: Geben Sie Ihren vollständigen Namen ein (z.B. "Max Mustermann")
2. **Auto-Vervollständigung**: Bereits verwendete Namen werden vorgeschlagen
3. **Gruppen**: Werden automatisch zugeordnet oder in der Benutzerverwaltung festgelegt

### Benutzerverwaltung (👥 Verwalten Button)
- **Benutzer-Gruppen zuordnen**: Ziehen Sie Benutzer in Gruppen
- **Neue Gruppen erstellen**: Eingabe unten im Dialog
- **Benutzer löschen**: ⚠️ Achtung: Löscht auch alle Templates des Benutzers

---

## 📁 Template-Verwaltung

### Template-Typen

#### 🗂️ **Folder Templates**
Erstellen vordefinierte Ordnerstrukturen für Projekte:
```
src/
  components/
  assets/
    images/
    css/
public/
docs/
README.md
```

#### 🧪 **Experiment Templates**
Wissenschaftliche Projekte mit Metadaten-Formularen:
- **Struktur**: Ordner für Daten, Analyse, Ergebnisse
- **Metadaten**: Experiment-Name, Hypothese, Datenquelle, etc.
- **Validierung**: Pflichtfelder und Dropdown-Optionen

### Template erstellen

1. **➕ Neues Template**: Button oben links
2. **Template-Typ wählen**: Folder oder Experiment
3. **Details eingeben**:
   - **Name**: Eindeutiger Template-Name
   - **Beschreibung**: Kurze Erklärung des Zwecks
   - **Struktur**: Ordner-Hierarchie (eine Zeile pro Ordner/Datei)

#### Struktur-Syntax
```
ordner1/
  unterordner/
    datei.txt
  datei2.md
ordner2/
datei_im_root.txt
```

4. **Metadaten** (nur Experiments):
   - **Feldname**: Eindeutige Bezeichnung
   - **Anzeigename**: Was der Benutzer sieht
   - **Typ**: Text, Textarea, Datum, Dropdown
   - **Pflichtfeld**: Muss ausgefüllt werden
   - **Optionen**: Bei Dropdown verfügbare Auswahlmöglichkeiten

### Template verwenden

1. **Template auswählen**: Klick auf Template in der Liste
2. **Vorschau prüfen**: Struktur wird rechts angezeigt
3. **Metadaten ausfüllen** (bei Experiments): Formular unten
4. **Projekt erstellen**: "Projekt erstellen" Button

---

## 👥 Zusammenarbeit

### Eigene vs. Geteilte Templates

#### 📝 **Eigene Templates**
- Von Ihnen erstellt
- Vollzugriff: Bearbeiten, Löschen, Verwenden
- Normale Farbkodierung

#### 📋 **Geteilte Templates**
- Von anderen Gruppenmitgliedern erstellt
- Badge "📋 Geteilt" sichtbar
- Nur Kopieren und Verwenden möglich
- Button "📋 Kopieren" erstellt eigene Kopie

### Template teilen
Templates werden automatisch mit Ihrer Gruppe geteilt:
1. Erstellen Sie ein Template
2. Andere Gruppenmitglieder sehen es als "geteiltes Template"
3. Sie können es kopieren und anpassen

---

## ⚙️ Funktionen im Detail

### Template bearbeiten
- Nur bei eigenen Templates möglich
- **✏️ Bearbeiten** Button in den Template-Details
- Öffnet den Template-Editor mit vorausgefüllten Daten

### Template löschen
- Nur bei eigenen Templates möglich
- **🗑️ Löschen** Button in den Template-Details
- Bestätigung erforderlich - **Aktion kann nicht rückgängig gemacht werden**

### Template kopieren
- Bei geteilten Templates verfügbar
- Erstellt eine eigene Kopie mit dem Namen "Template Name (Kopie)"
- Kann dann bearbeitet und angepasst werden

### Template-Typ wechseln
- **Folder Templates** / **Experiment Templates** Toggle oben
- Filtert die Anzeige nach Template-Typ
- Gespeicherte Templates bleiben erhalten

---

## 💡 Tipps & Best Practices

### Template-Struktur
- **Konsistente Namenskonvention**: Verwenden Sie einheitliche Namen
- **Logische Gruppierung**: Ähnliche Dateien in gemeinsame Ordner
- **README-Dateien**: Dokumentieren Sie den Template-Zweck
- **Beispiel-Dateien**: Fügen Sie Dummy-Inhalte für Orientierung hinzu

### Metadaten-Design
- **Klare Feldnamen**: "experiment_date" statt "ed"
- **Hilfreiche Labels**: "Experiment Start Date" statt "Date"
- **Sinnvolle Defaults**: Dropdown mit häufig verwendeten Optionen
- **Pflichtfelder sparsam**: Nur wirklich notwendige Felder

### Gruppen-Organisation
- **Beschreibende Namen**: "Labor A", "Marketing Team", "Entwicklung"
- **Klare Zuordnung**: Ein Benutzer = eine Hauptgruppe
- **Regelmäßige Bereinigung**: Inaktive Benutzer entfernen

### Template-Management
- **Versionierung durch Namen**: "Web Project v2", "Experiment Template 2025"
- **Beschreibungen nutzen**: Erklären Sie Verwendungszweck und Besonderheiten
- **Regelmäßige Updates**: Veraltete Templates löschen oder aktualisieren

---

## 🔧 Fehlerbehebung

### Häufige Probleme

#### "Template wird nicht angezeigt"
- **Ursache**: Falscher Template-Typ ausgewählt
- **Lösung**: Template-Typ Toggle (Folder/Experiment) prüfen

#### "Kann Template nicht bearbeiten"
- **Ursache**: Template gehört anderem Benutzer
- **Lösung**: Template kopieren, dann bearbeiten

#### "Metadaten-Form fehlt"
- **Ursache**: Template ist kein Experiment-Typ
- **Lösung**: Template als "Experiment" erstellen

#### "Geteilte Templates nicht sichtbar"
- **Ursache**: Nicht in gleicher Gruppe
- **Lösung**: Benutzerverwaltung → Gruppenzuordnung prüfen

### Browser-Kompatibilität
- **Unterstützt**: Chrome, Firefox, Safari, Edge (moderne Versionen)
- **Speicherung**: Lokal im Browser (localStorage)
- **Datenaustausch**: Zwischen Browsern nicht automatisch synchronisiert

### Datenverlust vermeiden
- **Regelmäßige Nutzung**: Inaktive Browser können Daten löschen
- **Backup**: Screenshots wichtiger Templates erstellen
- **Dokumentation**: Template-Strukturen extern dokumentieren

---

## 📞 Support

### Keyboard Shortcuts
- **Strg + N**: Neues Template erstellen
- **Escape**: Modals schließen
- **Enter**: Bestätigen (in Dialogen)

### Statusmeldungen
- **🟢 Grün**: Erfolgreiche Aktionen (5 Sekunden sichtbar)
- **🔴 Rot**: Fehler oder Warnungen (15 Sekunden sichtbar)
- **Position**: Oben rechts im Browser

---

*MetaFold v1.0 - Entwickelt für effiziente Projekt-Template-Verwaltung*