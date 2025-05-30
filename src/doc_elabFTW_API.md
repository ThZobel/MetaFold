# MetaFold - Neue elabFTW Funktionen

## 🚀 Neue Features (Version 1.1)

### 1. **Verbesserte elabFTW Integration**

#### **Auto-Sync Indikator**
- Wenn Auto-Sync in den Einstellungen aktiviert ist, erscheint ein grüner Hinweis: 
  - ✅ "Auto-sync to elabFTW is enabled - experiments will be created automatically"
- Bei deaktiviertem Auto-Sync erscheint die manuelle Checkbox "Send to elabFTW"

#### **Manuelle Synchronisation**
- Die Checkbox "🧪 Send to elabFTW" funktioniert jetzt korrekt
- Nur sichtbar wenn Auto-Sync deaktiviert ist
- Erstellt Experimente nur wenn explizit angewählt

### 2. **Bestehende Experimente aktualisieren** 🆕

#### **Experiment ID Feld**
- Neues Eingabefeld: "📝 Update Existing Experiment (optional)"
- Experiment ID eingeben (z.B. "149")
- Metadaten werden zu bestehendem Experiment **hinzugefügt** (nicht überschrieben!)
- Bestehende Felder bleiben erhalten

#### **Verwendung:**
1. Template mit Metadaten auswählen
2. Experiment ID eingeben
3. Metadaten ausfüllen
4. "Create Project" klicken
5. Neue Felder werden mit bestehenden zusammengeführt

### 3. **Verbesserter JSON Import** 🔧

#### **Unterstützte Formate:**
- **elabFTW Export** (mit extra_fields)
- **JSON Schema** (mit properties)
- **MetaFold JSON** (Standard Format)

#### **Electron Integration:**
- Nutzt nativen Datei-Dialog in der Desktop App
- Fallback für Browser-Version verfügbar

### 4. **Verbesserte Wertformatierung** ✨

#### **Checkbox-Werte:**
- Korrekte Konvertierung: `true` → "on", `false` → ""
- Anzeige: ✅ Yes / ❌ No

#### **Zahlen-Werte:**
- Sichere String-Konvertierung
- Leere Werte werden zu "0"

#### **Datums-Werte:**
- Validierung vor Formatierung
- Ungültige Daten werden als Text behandelt

## 📝 Verwendungsbeispiele

### **Neues Experiment erstellen:**
1. Settings → elabFTW Integration aktivieren
2. Auto-Sync AN: Experimente werden automatisch erstellt
3. Auto-Sync AUS: Checkbox "Send to elabFTW" manuell wählen

### **Bestehendes Experiment erweitern:**
1. Experiment ID aus elabFTW kopieren
2. ID in "Update Existing Experiment" Feld eingeben
3. Neue Metadaten hinzufügen
4. Project erstellen → Felder werden zusammengeführt

### **Metadaten importieren:**
1. Template Modal öffnen
2. "Metadata" Tab wählen
3. "📂 Load JSON" klicken
4. elabFTW Export oder JSON Schema wählen
5. Felder werden automatisch konvertiert

## ⚠️ Wichtige Hinweise

- **Experiment Updates:** Neue Felder überschreiben gleichnamige bestehende Felder
- **API Key:** Benötigt Schreibrechte für Experimente
- **Server URL:** Muss mit https:// beginnen
- **Kategorien:** Standard-Kategorie ID in Settings konfigurierbar

## 🔍 Fehlerbehebung

**"Failed to fetch experiment"**
- Experiment ID prüfen
- API Key Berechtigungen prüfen

**"Failed to update experiment"**
- Feldnamen auf Konflikte prüfen
- elabFTW Version mindestens 4.4.0

**JSON Import schlägt fehl**
- Dateiformat prüfen
- Gültige JSON Struktur sicherstellen