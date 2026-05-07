# Workflow Briefing - Antragserstellung (Mid Fidelity)

## Ziel dieses Dokuments

Dieser Kontext ist fuer einen neuen Chat gedacht und beschreibt den aktuellen, bereits umgesetzten Stand der Antragserstellung fuer R1 inkl. Mock-Interaktion mit R2.

---

## Projektfokus (aktueller Scope)

- Fokus ist die Mid-Fidelity-Antragserstellung fuer Studierende (R1), screen-by-screen aus Figma.
- Die obligatorische Beratung ist Teil des Flows und wurde als Mock-End-to-End zwischen R1 und R2 umgesetzt.
- Wichtig: Das Erscheinungsbild der bereits umgesetzten Screens soll bei weiteren Anpassungen nicht grundsaetzlich veraendert werden.

---

## Relevante Routen

- R1 Login: `/student/login`
- R1 Portal Root: `/portal` -> redirect auf `/portal/antragserstellung`
- R1 Antragserstellung: `/portal/antragserstellung`
- Legacy-Route: `/portal/antrag` -> redirect auf `/portal/antragserstellung`
- R2 Login: `/staff/login`
- R2 Workspace-Test: `/workspace/test`

Login-Verhalten:
- R1 wird nach Login auf `/portal/antragserstellung` geleitet.
- Staff-Rollen (R2/R3/R5/R6) werden auf `/workspace/test` geleitet.

---

## Umgesetzte Dateien (Kern)

- `components/nta-antrag-desktop.tsx`
  - Hauptflow fuer R1 (Steps 1, 2, 3, 3.1, 3.2)
  - Validierungen, Autosave, Mock-Terminbuchung, Realtime-Reaktion
- `app/portal/antragserstellung/page.tsx`
  - Laedt Userprofil, laedt letzten Antrag und reicht ihn in den Flow
- `components/domain/workspace-test-flow.tsx`
  - R2-Ansicht fuer eingegangene Beratungsanfragen inkl. Mock-Aktion
- `lib/test-flow-types.ts`
  - Erweiterte Datenstruktur fuer `personalData`, `attestFiles`, `consultation`, `recommendation`

---

## Layout- und UI-Grundsaetze (bereits umgesetzt)

- 12-Column-Layout mit 24px Gutter.
- Sidebar links auf Spalte 1-4, Formbereich rechts auf Spalte 5-12.
- Sidebar ist fix (100vh, nicht scrollbar), Formbereich ist scrollbar.
- Prozessfortschritt links mit farblicher Zustandslogik (aktiv, erledigt, pending).
- Kontaktkarte unten in der Sidebar bleibt sichtbar.

---

## R1 Flow: Umgesetzte Steps

### Step 1 - Persoenliche Angaben + Studienangaben + Antragsart

Funktionalitaet:
- Alle Felder sind Pflichtfelder.
- Weiter nur bei gueltiger Eingabe.
- Error-State pro Feld (rote Markierung + Meldung `Dieses Feld ist erforderlich.`).
- Matrikelnummer hat Eingabemaske:
  - Schema `XX-XXX-XXX`
  - Trennzeichen werden automatisch gesetzt
  - Validierung blockiert Weiter bei falschem Format

### Step 2 - Fachaerztliches Attest

Funktionalitaet:
- Drag & Drop Upload + Klick zum Oeffnen des Finders (multiple files).
- Hochgeladene Dateien als graue Callouts untereinander.
- Loeschen pro Datei via Papierkorb (disruptive/rot).
- Blaue Info-Box mit 2 Links, beide oeffnen aktuell Google in neuem Tab.
- Pflichtvalidierung: ohne Upload kein Weiter, mit Error-State + Meldung.

### Step 3 - Beratung buchen (Mock)

Funktionalitaet:
- Kalenderansicht als regulaere Monatsansicht (So-Sa Raster, Vor-/Folgemonatstage, Monatsnavigation).
- Zeitslot-Auswahl rechts.
- Termindetails werden aus gewaehltem Datum/Slot angezeigt.
- `Termin buchen` uebertraegt den aktuellen Antrag als Mock in `applications` (Supabase).

### Step 3.1 - Termin bestaetigt (Waiting)

Funktionalitaet:
- Bestaetigungs-Screen mit gebuchtem Termin.
- UI angepasst Richtung Figma (zentrierter Aufbau, Alert, Beraterinfo, Datum/Ort, Aktionen).
- Aktionen:
  - `Termin verschieben` (mock button)
  - `Zum Kalender hinzufuegen` (mock button)

### Step 3.2 - Empfehlungsschreiben verfuegbar

Funktionalitaet:
- Erscheint bei R1, sobald R2 die Beratung als durchgefuehrt markiert und Empfehlung freigibt.
- Empfehlung als Datei-Callout mit Open-in-new-tab.
- Checkbox "zur Kenntnis genommen" muss aktiv sein, sonst blockiert Weiter.

---

## Datenuebergabe R1 -> R2 (Mock-Simulation)

Beim Terminbuchen werden in `applications.data` gespeichert:
- `personalData`
  - vorname, name, email, phone, matrikel, studiengang, semester, antragsart
- `attestFiles`
  - Dateimeta (id, name, size, type)
- `consultation`
  - status (`booked`), date, slot, location, advisor
- `recommendation`
  - ready (`false`), url (aktuell mock auf Google)

Status:
- Antrag wird beim Terminbuchen auf `in_review` gesetzt, damit er direkt in der Fachstellen-Inbox erscheint.

---

## R2-Seite (Workspace-Test) - Umgesetztes Verhalten

Auf `/workspace/test`:
- Eingegangene Eintraege sind in der Liste sichtbar.
- Detailansicht zeigt:
  - angefragten Beratungstermin
  - uebermittelte persoenliche Angaben
  - Anzahl Uploads
- Antrag ist fuer Fachstelle read-only (keine manuelle Feldbearbeitung im Formularteil).
- Button:
  - `Beratung durchgefuehrt + Empfehlung freigeben`
  - setzt `consultation.status = "done"` und `recommendation.ready = true`
  - Empfehlung-URL ist aktuell Mock (`https://www.google.com`)

Realtime:
- R1-Flow hoert auf `applications` Aenderungen fuer den Applicant.
- Bei `recommendation.ready = true` wechselt R1 automatisch auf Step 3.2.

---

## Validierungsregeln (aktuell)

- Step 1:
  - alle Felder Pflicht
  - Matrikel strikt `XX-XXX-XXX`
- Step 2:
  - mindestens 1 Datei Pflicht
- Step 3:
  - Slot-Auswahl Pflicht
- Step 3.2:
  - Kenntnisnahme-Checkbox Pflicht vor Weiter

---

## Autosave / Persistenz

- Clientseitiger Autosave aktiv (LocalStorage, debounce ~400ms).
- Key ist user-spezifisch:
  - `nta-antrag-step1-draft:<userId>` (ueber Route uebergeben)
- Draft wird nach Hydration geladen (Hydration-Mismatch bereits behoben).

---

## DB / RLS / Trigger (wichtige Anpassungen)

Folgende Punkte wurden zur Stabilisierung bereits gefixt und muessen bei Folgeaenderungen mitgedacht werden:

- Workspace-Worklist-Policies auf `applications` erlauben jetzt Zugriff fuer:
  - `R2`, `R3`, `R5`, `R6`
- R1-Update-Policy erlaubt Update auf eigenem Antrag auch im Status:
  - `submitted` (zusaetzlich zu `draft`, `needs_correction`)
- Trigger `enforce_r2_application_update_columns` wurde angepasst:
  - Fachstellenrollen duerfen in `applications.data` nur `recommendation` und `consultation` aendern
  - `applicant_id` und `created_at` bleiben gesperrt
  - andere `data`-Teile bleiben fuer Fachstelle gesperrt

---

## Konkreter Userflow (bisher)

### R1 (Studierende)

1. Login via `/student/login`
2. Redirect auf `/portal/antragserstellung`
3. Step 1 ausfuellen (Pflichtvalidierung)
4. Step 2 Attest hochladen (mind. 1 Datei Pflicht)
5. Step 3 Termin waehlen (Tag + Slot) und `Termin buchen`
6. Step 3.1 erscheint: Terminbestaetigung / Waiting
7. Sobald R2 freigibt, wechselt R1 automatisch auf Step 3.2
8. In Step 3.2 Empfehlungsschreiben in neuem Tab oeffnen und Kenntnisnahme bestaetigen

### R2 (Fachstelle)

1. Login via `/staff/login`
2. Redirect auf `/workspace/test`
3. Eingegangene Beratung (inkl. uebermittelter Antragsdaten) in der Inbox sehen
4. Eintrag oeffnen (read-only)
5. `Beratung durchgefuehrt + Empfehlung freigeben` klicken
6. Dadurch wird bei R1 Step 3.2 sichtbar (Realtime)

---

## Bekannte Mock-Annahmen / offene Punkte

- Terminbuchung ist bewusst Mock (kein echtes Kalender-Backend, keine echte Verfuegbarkeitslogik).
- Empfehlungsdokument ist aktuell Mock-Link.
- R2-UI ist noch Testbereich, nicht finales Produktlayout.
- Naechster fachlicher Schritt: nach Step 3.2 den weiteren R1-Antragsteil ("Antrag stellen" / restliches Formular) screen-by-screen implementieren.

---

## Arbeitsmodus fuer den naechsten Chat

Empfehlung:
1. Nur den naechsten Figma-Screen umsetzen.
2. Bestehendes Erscheinungsbild der umgesetzten Steps nicht regressiv veraendern.
3. Bestehende Datenstruktur weiterverwenden (`applications.data`).
4. Neue Felder mit Step-Validierung + Error-States implementieren.
5. Bei Bedarf R2-Sicht nur mock-maessig erweitern, bis finale R2-Screens vorliegen.
