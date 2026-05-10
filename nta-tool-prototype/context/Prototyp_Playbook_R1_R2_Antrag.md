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
- Statusdarstellung ist zentralisiert und fuer R1/R2 konsistent (inkl. Wording-Unterschied bei Anpassung).
- R1- und R2-Dashboard laufen in einem gemeinsamen, ein-/ausklappbaren Sidebar-Layout (role-basiert unterschiedliche Nav-Items).

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
- `components/domain/role-dashboard-layout.tsx`
  - Gemeinsames Layout fuer R1/R2 Dashboard inkl. collapsible Sidebar
- `lib/test-flow-types.ts`
  - `applications.data` Struktur inkl. `applicationDefinition`, `submittedAt`, `finalSubmitted`
- `lib/application-status.ts`
  - Zentrale Ableitung fachlicher States + rollenabhaengige Badge-Labels/-Farben
- `components/domain/application-status-badge.tsx`
  - Zentrale Badge-Darstellung auf Basis der Status-Ableitung

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
- Finales Senden setzt technische Submit-Marker in `applications.data` (`submittedAt`, `finalSubmitted`, `applicationDefinition`) und fuehrt in den fachlichen State "In Review"

### Step 6 - Erfolgreich eingereicht

- Success-Screen mit `Zum Dashboard` -> `/portal/home`
- Realtime darf nach finalem Submit nicht mehr auf Step 3 zurueckspringen (Step-6-Lock ueber Submit-Marker)

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
- Sidebar ist collapsible (expanded/reduced, icon-only reduced) und role-basiert konfiguriert.

---

## Datenmodell in `applications.data` (aktuell)

- `title`, `summary`
- `personalData`
- `attestFiles`
- `consultation` (`booked` | `done`, date, slot, location, advisor)
- `recommendation` (ready, url)
- `applicationDefinition`
- `finalSubmitted` (boolean, expliziter Final-Submit-Marker)
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
- Beratung & Empfehlung
- In Review
- Anpassung erforderlich / Anpassung ausstehend (technisch vorgesehen, Label-Rolle differenziert)
- In Entscheid (technisch vorgesehen)
- Bewilligt / Abgelehnt (technisch vorgesehen)

### Noch nicht umgesetzt (naechste Ausbaustufe)

- Fachliche Trigger fuer Folgezustaende nach In Review (z.B. Wechsel nach In Entscheid/Bewilligt/Abgelehnt durch nachgelagerte Rollen/Prozesse)

### Technische Ableitungslogik (verbindlich)

Die Statusanzeige wird zentral in `lib/application-status.ts` abgeleitet (kein verteiltes if/else in UI-Komponenten):

- `approved` -> Bewilligt
- `rejected` -> Abgelehnt
- `in_decision` / `in_implementation` -> In Entscheid
- `needs_adjustment` / `needs_correction` -> Anpassung erforderlich (R1) / Anpassung ausstehend (R2)
- Submit-Marker (`finalSubmitted`, `submittedAt`, `applicationDefinition`) bzw. finaler Review-Hinweis -> In Review
- sonst, wenn Beratung gestartet (`consultation.status` oder `recommendation.ready`) -> Beratung & Empfehlung
- sonst -> Entwurf

### Styling-Stand (Figma)

State-Badges sind auf Figma-Farbkodierung umgestellt (nur Styling, keine Logikaenderung), inkl. kompakter Badge-Proportionen ohne Border.

---

## R2 Workspace-Test - Leitplanken

- Detailansicht ist read-only.
- Dokumente koennen in neuen Tabs geoeffnet werden.
- Aktion `Beratung durchgefuehrt + Empfehlung freigeben` darf nur diese `data`-Teile veraendern:
  - `consultation`
  - `recommendation`
- Die Aktion aendert den technischen `status` nicht mehr, um RLS-konform zu bleiben und R1-Finalsubmit nicht zu blockieren.

Andere `data`-Aenderungen durch R2 sind Trigger-seitig gesperrt.

---

## DB / RLS / Trigger - Nicht verletzen

- Workspace-Policies erlauben Zugriff fuer `R2`, `R3`, `R5`, `R6`.
- R1 darf eigenen Antrag in erlaubten Status updaten.
- Wichtige RLS-Konsequenz:
  - R1-Updates sind auf bestimmte Ausgangs-Status begrenzt.
  - Deshalb darf die Beratungsphase technisch nicht in einen Status laufen, der den spaeteren Final-Submit durch R1 blockiert.
  - Umgesetzter Pfad: Beratung sichtbar im Workspace bei `submitted`, finaler Submit durch R1 auf `in_review`.
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
