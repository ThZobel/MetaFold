# OMERO Auto-Import Workflow – Anforderungsübersicht

*Grundlage für Team-Diskussion, MIN Münster – Stand: Juli 2026*

---

## 1. Ausgangslage

MetaFold erstellt Ordnerstrukturen und JSON-Metadatendateien. Diese JSON dient als Basis für einen automatisierten Import von Mikroskopdaten nach OMERO.

**Aktueller Stand:**
- Prüfung auf neue Dateien alle 24h (Polling)
- JSON enthält das Ziel-OMERO-Dataset
- Nutzerdaten werden ebenfalls aus der JSON übernommen

**Kernfragen:**
- Ist 24h-Polling schnell genug für alle Use Cases?
- Wie erkennen wir "Aufnahme wirklich fertig" vs. "Datei existiert bereits, ist aber noch nicht vollständig"?
- Wie vermeiden wir Datenduplikation zwischen Unicloud-Storage und OMERO-Storage?
- Wie unterscheiden wir verschiedene Import-Mechanismen (Struktur / Dataset / ome.zarr) automatisiert?

---

## 2. Zentrale Design-Entscheidung: Vereinheitlichtes Sidecard-Schema

Statt mehrerer Sonderfälle (getrennte Watch-Pfade, zweite Sidecard-Datei, Heuristik über Datei-Präsenz) nutzt **eine** MetaFold-Sidecard-JSON ein strukturiertes Feld, das den Import-Mechanismus in n8n direkt bestimmt:

```
import_mode: "structure" | "dataset" | "zarr_s3"
inplace: true | false
status: "recording" | "ready"
```

**Vorteil:** Nutzer arbeiten immer mit MetaFold, unabhängig vom Zielszenario. n8n verzweigt per Switch-Node basierend auf diesen Feldern in den passenden Sub-Workflow. Das Ready-Flag für unvollständige Aufnahmen wird Teil desselben Schemas statt einer zweiten Datei.

---

## 3. Import-Mechanismen im Überblick

| Mechanismus | Ziel-Definition | MetaFold nötig? | Inplace möglich? | Bemerkung |
|---|---|---|---|---|
| **Reine Ordnerstruktur** | Feste Hierarchie Group/User/Project/Dataset, Ziel = Default-Gruppe | Nein | Ja | Kein Dataset-Mapping, einfachster Fall |
| **Dataset (JSON-basiert)** | Dataset-ID explizit in JSON definiert | Ja | Optional | Aktueller Hauptpfad |
| **ome.zarr + S3** | Konvertierung vor Import, dann Referenz auf S3 | Ja | Ja (auf S3-Pfad) | Ermöglicht direkte Nutzung in Browser-3D-Viewern (z. B. Allen Institute Viewer) |

**Technische Import-Optionen:** OMERO Insight-Client vs. OMERO Webscript (serverseitige Alternative, ebenfalls inplace-fähig) – Auswahl je nach n8n-Implementierung.

---

## 4. Trigger-Mechanismen: Wann wird importiert?

**Problem mit reinem 24h-Polling:**
- Zu langsam für kurze, abgeschlossene Aufnahmen (Nutzer erwartet zeitnahes Feedback)
- Zu schnell/riskant für laufende Streams (importiert unvollständige Dateien)

**Lösungsansätze (kombinierbar, keine Alternative im Sinne von entweder/oder):**

| Achse | Optionen |
|---|---|
| **Wo wird geschrieben?** | Direkt in überwachten Netzwerkordner / Lokal auf Systemplatte, dann Kopie nach Fertigstellung / Auf AG-eigenes RAID/NAS, dann Verschieben |
| **Wie wird "fertig" signalisiert?** | Filesystem-Watch (neue Datei) / Ready-Flag im Sidecard (`status: ready`) / Scheduler/Manager mit Zeitsteuerung |
| **Wie wird der Import ausgelöst?** | MetaFold-Webhook direkt an n8n / periodischer Watch-Trigger auf Zielordner |

**Trade-off Direktstream vs. lokal-dann-kopieren:** Lokales Schreiben auf Systemplatte vor dem Kopieren reduziert das Risiko von Datenverlust durch Netzwerkaussetzer während langer Aufnahmen (v. a. relevant bei Ü.N.-Aufnahmen), erfordert aber einen zusätzlichen, expliziten Kopierschritt.

---

## 5. Persona-Szenarien

## Anna – Zellkultur-Imaging (CLSM), kurze Direktaufnahmen

Anna fährt kurze, in Minuten abgeschlossene CLSM-Aufnahmen. Sie möchte ihre Bilder zeitnah in OMERO sehen, um direkt weiterzuarbeiten.

- **Anforderung:** Trigger nah an Echtzeit – Filesystem-Watch oder direkter MetaFold-Webhook an n8n statt Warten auf Poll-Zyklus.
- **Fertigstellungserkennung:** einfache Prüfung ausreichend (Datei-Schließen-Event, stabile Dateigröße).
- **Import-Modus:** `dataset`, kein Inplace nötig – normaler Import inkl. Backup unkritisch bei kleinen Datenmengen.

## Stefan – Zebrafisch-Entwicklung, Übernachtaufnahme

Stefan startet abends eine Zeitraffer-Aufnahme, die über Nacht läuft. Die Mikroskop-Software streamt laufend Dateien in den überwachten Ordner – ein schneller Trigger würde eine unfertige Datei importieren.

- **Anforderung:** Import erst nach echtem Aufnahmeende, unabhängig von Trigger-Geschwindigkeit.
- **Lösung:** `status: recording` → `status: ready` im Sidecard, gesetzt durch Skript oder manuell nach Aufnahmeende.
- **Alternative:** Aufnahme läuft auf lokaler Systemplatte oder AG-RAID/NAS, Kopie in überwachten Bereich erst nach Fertigstellung – reduziert Risiko von Datenverlust bei Netzwerkproblemen über Nacht.
- **Import-Modus:** `dataset`, Scheduler/Manager als zusätzliche zeitgesteuerte Absicherung denkbar.

## Kiefer – Lightsheet, große Rohdatenmengen, Inplace-Import

Kiefer produziert mit dem Lightsheet sehr große Datenmengen. Seine AG speichert bereits auf der Unicloud – ein regulärer Import mit Kopie würde die Daten doppelt auf derselben Infrastruktur ablegen.

- **Anforderung:** Inplace-Import – OMERO referenziert die Daten am bestehenden Speicherort, keine Kopie.
- **Feste Struktur:** vordefinierte Ordnerstruktur + JSON (inkl. metadata.html) durch MetaFold.
- **Datenschutz nach Import:** Inplace-Referenzen brechen bei Verschieben/Umbenennen. Lösungsansätze:
  - Read-only setzen auf Ordner-/Dateiebene als letzter automatisierter Schritt im n8n-Workflow
  - Checksum bei Import speichern, periodische Prüfung gegen Original
  - Klar definierte "frozen zone" als Prozess-/Policy-Frage mit den AGs klären (kein rein technisches Problem)
- **Import-Modus:** `zarr_s3` als Erweiterung denkbar (siehe Abschnitt 6).

---

## 6. Zusatz-Szenario: ome.zarr-Konvertierung + S3

Nach Aufnahmeende werden Rohdaten direkt nach ome.zarr konvertiert und auf S3-Storage verschoben. OMERO importiert diese Daten inplace (referenziert S3-Pfad, keine Kopie). Derselbe S3/ome.zarr-Link lässt sich zusätzlich direkt in browserbasierten 3D-Viewern nutzen (z. B. Allen Institute Viewer) – ohne zweite Datenhaltung.

- **Workflow-Kette:** Ready-Flag → Konvertierung → Konvertierung-fertig-Flag → Inplace-Import
- **Konsequenz:** Trigger-Kette wird um eine Stufe länger, sollte im n8n-Workflow-Design berücksichtigt werden.

---

## 7. Infrastruktur-Notizen (aus Team-Miro-Board)

- **HIVE3000:** konkreter Use-Case für OMERO Inplace-Import – als Referenzfall dokumentieren.
- **Herbie:** Server mit RAID-System, Ziel für Auto-Import anhand von Ordnerstruktur (Default-Gruppe).
  - **Wichtig:** Mikroskope haben **keinen direkten Zugriff auf Herbie** – nur auf eigenes AG-RAID/NAS.
  - Verschieben von AG-RAID/NAS nach Herbie/Cloud ist ein **separater, expliziter Schritt**, kein impliziter Teil des Streamings.
  - **Offenes Todo:** Herbie-Accounts pro Mikroskop anlegen, um Zugriff/Workflow-Anbindung zu klären – sofern direkter Zugriff perspektivisch gewünscht ist.
- **OMERO Webscript:** Alternative zu Insight-Client, ebenfalls inplace-fähig – Implementierungsoption für n8n-Anbindung.
- **Scheduler/Manager:** zusätzlicher zeitgesteuerter Mechanismus für Ü.N.-Aufnahmen, ergänzend zum Filesystem-Watch.

---

## 8. Offene Diskussionspunkte für Team-Meeting

1. Sidecard-Schema final abstimmen (Feldnamen, mögliche Werte, Pflicht-/Optionalfelder)
2. Wer setzt `status: ready` bei Ü.N.-Aufnahmen – Mikroskop-Software, Skript, oder manuell durch Nutzer?
3. Policy für "frozen zone" bei Inplace-Importen – wer ist verantwortlich, wie wird das kommuniziert?
4. Herbie-Zugriffskonzept: direkter Zugriff vom Mikroskop gewünscht, oder bleibt AG-RAID/NAS als Zwischenstation Standard?
5. ~~Priorisierung: welches Szenario zuerst implementieren~~ → siehe Abschnitt 9: erste Implementierungsphase beschlossen.

---

## 9. Team-Entscheidung: Erste Implementierungsphase (Stand: Juli 2026)

Im Team-Meeting wurde folgender pragmatischer Einstieg beschlossen, der die offenen Punkte aus Abschnitt 8 teilweise auflöst bzw. priorisiert:

### 9.1 Sidecard-Ansatz (eingeschränkter Scope)

- Das "Ready-to-import"-Flag (`status: ready`) gilt zunächst **nur für ausgewählte Unterordner und Dateitypen** (Whitelist), nicht global für alle Daten.
- Dadurch lässt sich der Ansatz schrittweise testen, ohne sofort alle Szenarien (Anna/Stefan/Kiefer) gleichzeitig abdecken zu müssen.

### 9.2 Trigger-Mechanismus

- Auto-Import läuft weiterhin über **Cronjob**, jedoch mit **deutlich höherer Frequenz** als die bisherigen 24h (statt Filesystem-Watch oder Webhook als Einstieg).
- Bei jedem Lauf: Prüfung, welche Dateien seit dem letzten Durchlauf **neu** hinzugekommen sind.
- Werden zu einem späteren Zeitpunkt weitere neue Dateien in einem bereits verarbeiteten Unterordner ergänzt, wird der Auto-Import für diesen Ordner **erneut angestoßen**.
- Der Abgleich "was ist bereits in OMERO vorhanden" erfolgt über einen **OMERO-Fetch** (Abfrage der vorhandenen Objekte/Liste), nicht über rein lokalen State – das macht den Prozess robuster gegen Neustarts und Inkonsistenzen.

### 9.3 Tracking/Logging (zukünftig geplant)

- Geplant ist eine **leichtgewichtige SQL-Datenbank** zum Tracken von Upload-Ereignissen (was wurde wann importiert, was ist fehlgeschlagen).
- Ziel: Bei Fehlern gezielt nachvollziehen können, an welcher Stelle der Import gescheitert ist.

### 9.4 Ordnerhierarchie / Import-Wege

Drei parallele Wege, wie ein Ziel-Dataset in OMERO bestimmt wird:

| # | Mechanismus | Beschreibung |
|---|---|---|
| 1 | **Dataset-Import via MetaFold** | Ziel-Dataset-ID kommt direkt aus der MetaFold-Metadatendatei (entspricht `import_mode: dataset` aus Abschnitt 2/3) |
| 2 | **Ordnerstruktur (Standard)** | Feste Hierarchie: RAID-Projektordner / Group / `user_userid` / Project / Dataset |
| 3 | **Ordnerstruktur (erweitert, mit Markern)** | Werden zusätzliche Verschachtelungsebenen benötigt, markiert der Nutzer die relevanten Ordner explizit mit `_project`- bzw. `_dataset`-Suffix, z. B.: `group / user / xy_project / xy / z / xy_dataset / files` |

**Anmerkung:** Weg 3 löst das Problem beliebig tiefer/individueller Ordnerstrukturen, ohne dass jede AG zwingend MetaFold nutzen muss – die Suffix-Konvention macht die Struktur für n8n eindeutig parsbar, unabhängig von der tatsächlichen Verschachtelungstiefe.

### 9.5 Offene Punkte, die durch diese Entscheidung noch nicht abgedeckt sind

- Whitelist-Kriterien (welche Unterordner/Dateitypen konkret) müssen noch definiert werden.
- Konkrete Cron-Frequenz (Minuten?) ist noch festzulegen.
- Schema der SQL-Logging-Tabelle (Felder, Fehlerzustände) steht noch aus.
- Sidecard-Schema-Details (Punkt 1, Abschnitt 8), `status: ready`-Verantwortlichkeit (Punkt 2), Frozen-Zone-Policy (Punkt 3) und Herbie-Zugriffskonzept (Punkt 4) bleiben weiterhin offen.
