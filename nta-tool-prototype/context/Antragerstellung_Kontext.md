# Kontext: Antragserstellung (R1) & R2-Beratung — Prototyp NTA

> **Zweck:** Operative Referenz für Chats zu **Anpassungen und Integrationen** rund um den **Antragsflow R1** bis zur finalen Einreichung, die **Status-/Badge-Logik**, den **Workspace-Test R2** (Beratung/Empfehlung) sowie **RLS/Trigger**.  
> **Nicht** hier: ausführlicher **Review-/Korrektur-Loop** nach Einreichung → `Antrag_Review_Kontext.md` (wenn befüllt). Gesamtprototyp → `General_Prototype_Kontext.md`. Zielbild-Funktionen → `Prototyp_Funktionen.md`.

---

## 1. Produktscope (aktueller Stand)

- R1 **Antragserstellung** end-to-end bis zum **finalen Submit**; danach fachlich **„In Review“**.
- R2 kann **Beratung + Empfehlung** im **Workspace-Test** bearbeiten (Schreibzugriff nur auf definierte `data`-Teile).
- R1 **Dashboard:** Liste eigener Anträge, Read-only-Detail, Delete; **Neuer Antrag** nur mit leerem Stand über **`?new=1`**.
- **Statusdarstellung** für Badges ist **zentral** in `lib/application-status.ts` (R1/R2 konsistent; Wording z. B. bei „Anpassung“ rollenabhängig).
- R1- und R2-Dashboard nutzen ein gemeinsames **`RoleDashboardLayout`** (einklappbare Sidebar, rollenspezifische Nav-Items).

---

## 2. Routen

### R1

| Zweck | Route |
|-------|--------|
| Login | `/student/login` |
| Antragserstellung | `/portal/antragserstellung` |
| Leerer Neustart | `/portal/antragserstellung?new=1` |
| Dashboard | `/portal/home` |
| Legacy | `/portal/antrag` → Redirect auf `/portal/antragserstellung` |

Hinweis: `/portal` kann noch auf die Antragserstellung zeigen — mit `app/` abgleichen.

### R2

| Zweck | Route |
|-------|--------|
| Login | `/staff/login` |
| Workspace (R2–R6) | `/workspace` |

---

## 3. Kerndateien (Implementierung)

| Datei | Rolle |
|-------|--------|
| `components/nta-antrag-desktop.tsx` | R1 Flow Step 1–6: Validierung, Autosave, Realtime, Sidebar, Delete |
| `app/portal/antragserstellung/page.tsx` | Letzten Antrag laden; `?new=1` für leeren Start |
| `components/domain/student-dashboard.tsx` | R1 Dashboard (Liste, Detail, Delete) |
| `app/portal/home/page.tsx` | Serverpage R1 Dashboard |
| `components/domain/workspace-test-flow.tsx` | Workspace: Liste, Detail, Aktion Beratung/Empfehlung |
| `components/domain/role-dashboard-layout.tsx` | Gemeinsames R1/R2 Dashboard-Layout (collapsible Sidebar, Workspace-Topbar R2) |
| `lib/test-flow-types.ts` | `ApplicationData` / `applications.data` |
| `lib/application-status.ts` | Zentrale fachliche States + rollenabhängige Labels/Farben |
| `components/domain/application-status-badge.tsx` | Badge-UI aus Status-Ableitung |

---

## 4. R1 Flow (fachlich)

### Step 1 — Persönliche Angaben

- Pflichtfelder inkl. Matrikel **`XX-XXX-XXX`**; Feldweise Fehler-States.

**Sperre:** Sobald `consultation.status` **`booked`** oder **`done`** ist, sind Step-1-Inhalte (inkl. Studium, Antragsart) **read-only** in **Übersicht (Step 5)** und bei **erneutem Öffnen von Step 1** über die Sidebar.

### Step 2 — Fachärztliches Attest

- Multi-Upload (Drag & Drop / Dateiauswahl); Löschen pro Datei; **mind. eine Datei** Pflicht.

### Step 3 — Beratung & Empfehlung

- Terminwahl (Kalender + Slot); nach Buchung Waiting-Screen.
- **Empfehlung:** Realtime, sobald R2 freigibt; **Kenntnisnahme-Checkbox** Pflicht.

### Step 4 — Antrag stellen (Definition)

- Blöcke gemäß Figma/Produkt; Pflicht: Freitext, Dauer, pro Auswahlblock mind. eine Option; „Sonstige“ mit Zusatztext wo vorgesehen.

### Step 5 — Übersicht

- Gesamter Antrag als Review; Step-1 **locked**; Rest **editierbar**.
- Live-Validierung: fehlende Pflichtinhalte **rot**; zugehöriger **Prozessschritt** in der Sidebar bei Fehler **rot**.
- **Finales Senden** schreibt u. a. **`submittedAt`**, **`finalSubmitted`**, **`applicationDefinition`** in `applications.data` und führt fachlich in **„In Review“**.

### Step 6 — Erfolg

- Success-Screen, z. B. **„Zum Dashboard“** → `/portal/home`.
- **Realtime** darf nach finalem Submit **nicht** wieder auf frühere Steps (z. B. nur Empfehlung) springen — **Lock über Submit-Marker** (`finalSubmitted` / `submittedAt`).

---

## 5. Prozessfortschritt (Sidebar) — Sollverhalten

- Steps nur klickbar, wenn **freigeschaltet**; Freischaltung **datenbasiert** (nicht nur `currentStep`).
- Farben: **Grün** abgeschlossen; **Schwarz** aktiv oder nächster offener Step; **Grau** gesperrt; **Rot** ungültig in Übersicht.
- **Trennlinie** nach „Beratung und Empfehlung“: vor Empfehlung sichtbar; nach freigegebener Empfehlung **dauerhaft ausgeblendet**.

---

## 6. R1 Dashboard — Sollverhalten

- Liste aller eigenen Anträge.
- **Neuen Antrag erstellen** → komplett leer über **`?new=1`**.
- Detail **read-only** (keine Edit-Aktionen im aktuellen Stand).
- **Delete:** Papierkorb-Icon + Bestätigung.
- Sidebar wie im Layout: **collapsible** (expanded / icon-only).

---

## 7. Datenmodell `applications.data` (relevant)

- `title`, `summary`
- `personalData`
- `attestFiles`
- `consultation`: `status` **`booked` | `done`**, date, slot, location, advisor
- `recommendation`: `ready`, `url`
- `applicationDefinition`
- `finalSubmitted` (boolean, Final-Submit-Marker)
- `submittedAt`

Typen: **`lib/test-flow-types.ts`**.

---

## 8. Statusmodell (kanonisch, R1/R2)

Verbindlich (Figma-State-Canvas + Produktregel):

| Fachlicher State | Bedeutung / Sichtbarkeit |
|------------------|---------------------------|
| **Entwurf** | Antrag nicht final eingereicht. R1: relevant; R2: irrelevant. |
| **Beratung & Empfehlung** | Termin gebucht bis Empfehlung von R2 freigegeben. R1 + R2 relevant. |
| **In Review** | Final von R1 eingereicht. R1 und R2 gleich. |
| **Anpassung erforderlich** / **Anpassung ausstehend** | Gleicher fachlicher State; **R1** vs. **R2** Wording. |
| **In Entscheid** | An Entscheidungsstelle übergeben (Doku nennt z. B. R4; im Funktionen-Dokument oft **R3** als dezentrale Entscheid — mit Code/Produkt abgleichen). |
| **Bewilligt** / **Abgelehnt** | Abschluss nach Entscheid. |

**Technisch bereits vorgesehen/umgesetzt (Ableitung):** Entwurf, Beratung & Empfehlung, In Review; weitere States (Anpassung, In Entscheid, Bewilligt/Abgelehnt) in `application-status.ts` — **fachliche Trigger** für Wechsel *nach* In Review durch nachgelagerte Prozesse ggf. **noch nicht** vollständig.

### Ableitungslogik (verbindlich)

Zentral in **`lib/application-status.ts`** — nicht in UI duplizieren:

- `approved` → Bewilligt  
- `rejected` → Abgelehnt  
- `in_decision` / `in_implementation` → In Entscheid  
- `needs_adjustment` / `needs_correction` → Anpassung erforderlich (R1) / ausstehend (R2)  
- Submit-Marker (`finalSubmitted`, `submittedAt`, `applicationDefinition`) bzw. finaler Review-Hinweis → **In Review**  
- Sonst, wenn Beratung gestartet (`consultation.status` oder `recommendation.ready`) → **Beratung & Empfehlung**  
- Sonst → **Entwurf**

### Badge-Styling

State-Badges orientieren sich an **Figma-Farbkodierung** (kompakt, ohne Border) — reines Styling, Logik bleibt in `application-status.ts`.

---

## 9. R2 Workspace-Test — Leitplanken

- Detailansicht **read-only** (außer definierte Aktionen).
- Dokumente in **neuen Tabs** öffnen, wo vorgesehen.
- Aktion **„Beratung durchgeführt + Empfehlung freigeben“** darf in **`applications.data`** nur ändern:
  - `consultation`
  - `recommendation`
- Diese Aktion ändert den technischen **`applications.status`** **nicht** in einer Weise, die R1-**Finalsubmit** blockiert (RLS-konform).
- Andere `data`-Felder für R2: **trigger-/policy-seitig gesperrt**.

---

## 10. DB / RLS / Trigger — nicht verletzen

- Workspace-Policies: Zugriff für Rollen wie **R2, R3, R5, R6** (exakt: aktuelle Supabase-Policies im Repo).
- R1 darf eigenen Antrag nur in **erlaubten Status** updaten.
- **Konsequenz:** Beratungsphase darf technisch **nicht** in einem Status landen, der den **späteren Final-Submit** durch R1 blockiert. Umgesetzter Pfad: Beratung im Workspace u. a. bei **`submitted`**, finaler Submit R1 → **`in_review`**.
- Trigger **`enforce_r2_application_update_columns`:** R2 darf in `applications.data` nur **`consultation`** / **`recommendation`** ändern — nicht `summary`, `applicationDefinition`, `personalData`, etc.

---

## 11. Arbeitsregeln bei Änderungen

1. Keine Regression in bereits umgesetzten Screens ohne Produktentscheid.
2. Status- und Freischaltlogik **datenbasiert** halten.
3. R2-**Trigger-Grenzen** strikt einhalten.
4. Neue Screens nach Möglichkeit **screen-by-screen** aus Figma.
5. Neue Pflichtfelder: klare **Error-UI** und Konsistenz mit Übersicht/Sidebar.
6. Status-Erweiterungen in **`application-status.ts`** zentralisieren.

---

## 12. Verwandte Dokumente

| Datei | Nutzen |
|-------|--------|
| `General_Prototype_Kontext.md` | Tech, Rollen, Architektur, Scope |
| `Antrag_Review_Kontext.md` | Review nach Einreichung (Platzhalter) |
| `Prototyp_Funktionen.md` | Langfristige Funktionsvision |
