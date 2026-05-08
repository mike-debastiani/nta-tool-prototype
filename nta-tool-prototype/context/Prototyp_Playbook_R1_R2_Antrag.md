# Prototyp Playbook - R1/R2 Antragssystem (Mid Fidelity)

## Zweck dieses Dokuments

Dieses Dokument ist das zentrale Arbeits- und Kontext-Playbook fuer neue Chats.
Es beschreibt:

- den aktuellen Produktzustand des Prototyps,
- die umgesetzte Interaktions- und Statuslogik,
- technische Leitplanken (RLS/Trigger),
- sowie Regeln, wie Folgeaenderungen konsistent umgesetzt werden.

Dieses Dokument ist **kein reines Workflow-Log** mehr, sondern die operative Referenz fuer Weiterentwicklung.

---

## Produktscope (aktueller Stand)

- R1 Antragserstellung ist end-to-end bis zum finalen Submit umgesetzt.
- R2 kann Beratung + Empfehlung im Workspace-Test read-only abwickeln.
- R1 hat ein Dashboard mit Antragsliste, Read-only-Einsicht und Delete.
- Statusdarstellung ist fuer R1 und R2 bereits teilweise differenziert (mit Wording-Unterschieden je Rolle).

---

## Relevante Routen

### R1

- Login: `/student/login`
- Antragserstellung: `/portal/antragserstellung`
- Antragserstellung leer erzwingen: `/portal/antragserstellung?new=1`
- Dashboard: `/portal/home`
- Legacy: `/portal/antrag` -> redirect auf `/portal/antragserstellung`

### R2

- Login: `/staff/login`
- Workspace-Test: `/workspace/test`

Hinweis:

- `/portal` redirect zeigt aktuell noch auf `/portal/antragserstellung`.
- Dashboard ist bereits unter `/portal/home` verfuegbar.

---

## Kern-Dateien (aktueller Implementierungsstand)

- `components/nta-antrag-desktop.tsx`
  - Voller R1 Flow Step 1-6
  - Pflichtvalidierungen, Autosave, Realtime, Sidebar-Navigation, Delete
- `app/portal/antragserstellung/page.tsx`
  - Last application laden + `?new=1` fuer leeren Start
- `components/domain/student-dashboard.tsx`
  - R1 Dashboard (Liste, Read-only Detail, Delete)
- `app/portal/home/page.tsx`
  - Serverpage fuer R1 Dashboard
- `components/domain/workspace-test-flow.tsx`
  - R2 Liste + Detail (read-only) + Beratung/Empfehlung Aktion
- `lib/test-flow-types.ts`
  - `applications.data` Struktur inkl. `applicationDefinition`, `submittedAt`
- `lib/application-status.ts`
  - Basis-Statuslabel (`in_review` => "In Review")

---

## R1 Flow (fachlich)

### Step 1 - Persoenliche Angaben

- Pflichtfelder inkl. Matrikel `XX-XXX-XXX`
- Feldweise Error-States

### Step 2 - Fachaerztliches Attest

- Multi-Upload via Drag&Drop/Finder
- Loeschen pro Datei via Papierkorb
- Pflicht: mind. 1 Datei

### Step 3 - Beratung buchen + Waiting

- Terminwahl (Kalender + Slot)
- Nach Buchung Waiting-Screen

### Step 3.2 - Empfehlungsschreiben

- Realtime-Sprung, sobald R2 Empfehlung freigibt
- Kenntnisnahme-Checkbox Pflicht

### Step 4 - Antrag stellen (Definition)

- Vollstaendige Bloecke gemaess Figma
- Pflicht: Freitext, Dauer, pro Auswahlblock mind. eine Option
- "Sonstige" erfordert zusaetzlichen Text

### Step 5 - Uebersicht

- Gesamter Antrag als Review
- Step-1-Daten locked/read-only
- Rest editierbar
- Live-Validierung: geloeschte Pflichtinhalte werden rot
- Zugehoeriges Prozessschritt-Item wird im Fehlerfall rot

### Step 6 - Erfolgreich eingereicht

- Success-Screen mit `Zum Dashboard` -> `/portal/home`

---

## Prozessfortschritt (Sidebar) - Sollverhalten

- Steps sind nur klickbar, wenn freigeschaltet.
- Freischaltung ist datenbasiert (nicht nur `currentStep`-basiert).
- Farblogik:
  - Gruen: abgeschlossen
  - Schwarz: aktiv oder naechster verfuegbarer offener Step
  - Grau: noch nicht verfuegbar
  - Rot: invalid in Overview
- Trennlinie nach "Beratung und Empfehlung":
  - vor Empfehlung sichtbar,
  - nach freigegebener Empfehlung dauerhaft ausgeblendet.

---

## R1 Dashboard - Sollverhalten

- Liste aller eigenen Antraege.
- `Neuen Antrag erstellen` muss mit komplett leerem Antrag starten (`?new=1`).
- Detailansicht read-only (aktuell keine Edit-Aktionen).
- Delete ueber dezentes Papierkorb-Icon + Confirm.

---

## Datenmodell in `applications.data` (aktuell)

- `title`, `summary`
- `personalData`
- `attestFiles`
- `consultation` (`booked` | `done`, date, slot, location, advisor)
- `recommendation` (ready, url)
- `applicationDefinition`
- `submittedAt`

---

## Statusmodell (kanonisch, gemappt auf R1/R2)

Die folgenden fachlichen States sind verbindlich (gem. Figma-State-Canvas + Produktregel):

1. **Entwurf**
   - Bedeutung: Antrag erstellt, aber nicht final eingesendet.
   - Sichtbarkeit:
     - R1: relevant (Dashboard)
     - R2: irrelevant

2. **Beratung & Empfehlung**
   - Bedeutung: Beratungstermin ist gebucht bis Empfehlung von R2 erstellt/freigegeben ist.
   - Sichtbarkeit:
     - R1: sichtbar
     - R2: besonders relevant

3. **In Review**
   - Bedeutung: Antrag wurde final von R1 eingereicht.
   - Sichtbarkeit: R1 und R2 gleich.

4. **Anpassung erforderlich** / **Anpassung ausstehend**
   - Fachlich derselbe State.
   - Wording:
     - R1: Anpassung erforderlich
     - R2: Anpassung ausstehend

5. **In Entscheid**
   - Bedeutung: Nach Review an Entscheidungsstelle (z.B. R4) uebergeben.
   - Sichtbarkeit: fuer alle gleich.

6. **Bewilligt** / **Abgelehnt**
   - Bedeutung: Ergebnis nach Entscheid.
   - Sichtbarkeit: fuer alle gleich.

### Aktuell technisch bereits umgesetzt

- Entwurf
- Beratung & Empfehlung (inkl. Zwischenzustand "Beratung abgehalten & Empfehlung verfasst")
- In Review

### Noch nicht umgesetzt (naechste Ausbaustufe)

- Anpassung erforderlich / Anpassung ausstehend
- In Entscheid
- Bewilligt / Abgelehnt

---

## R2 Workspace-Test - Leitplanken

- Detailansicht ist read-only.
- Dokumente koennen in neuen Tabs geoeffnet werden.
- Aktion `Beratung durchgefuehrt + Empfehlung freigeben` darf nur diese `data`-Teile veraendern:
  - `consultation`
  - `recommendation`

Andere `data`-Aenderungen durch R2 sind Trigger-seitig gesperrt.

---

## DB / RLS / Trigger - Nicht verletzen

- Workspace-Policies erlauben Zugriff fuer `R2`, `R3`, `R5`, `R6`.
- R1 darf eigenen Antrag in erlaubten Status updaten.
- Trigger `enforce_r2_application_update_columns`:
  - R2 darf in `applications.data` nur `consultation`/`recommendation` aendern.
  - Keine Aenderung von `summary`, `applicationDefinition`, `personalData` etc.

---

## Arbeitsprinzip fuer neue Chats

1. Auf diesem Playbook-Stand aufbauen.
2. Keine Regressionen in bereits umgesetzten Screens.
3. Status-/Freischaltlogik datenbasiert halten.
4. R2-Trigger-Grenzen strikt einhalten.
5. Neue Screens weiter screen-by-screen aus Figma umsetzen.
6. Neue Pflichtfelder immer mit klarer Error-UI und Meldung versehen.
