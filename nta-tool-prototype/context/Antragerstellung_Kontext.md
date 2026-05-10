# Kontext: Antragserstellung (R1) & R2-Beratung — Prototyp NTA

> **Zweck:** Operative Referenz für Chats zu **Anpassungen und Integrationen** rund um den **Antragsflow R1** bis zur finalen Einreichung, die **Status-/Badge-Logik**, den **Workspace-Test R2** (Beratung/Empfehlung) sowie **RLS/Trigger**.  
> **Nicht** hier: ausführlicher **Review-/Korrektur-Loop** nach Einreichung → `Antrag_Review_Kontext.md` (wenn befüllt). Gesamtprototyp → `General_Prototype_Kontext.md`. Zielbild-Funktionen → `Prototyp_Funktionen.md`.

---

## 1. Produktscope (aktueller Stand)

- R1 **Antragserstellung** end-to-end bis zum **finalen Submit**; danach fachlich **„In Review“**.
- R2 kann **Beratung + Empfehlung** und im Anschluss den **Block-Review** im **Workspace** bearbeiten und mit **„Antrag weiterreichen“** in **`in_implementation`** bzw. **`needs_correction`** überführen (Schreibzugriff nur auf definierte `data`-Teile).
- R1 **Dashboard:** Liste eigener Anträge, Read-only-Detail, Delete; **Neuer Antrag** nur mit leerem Stand über **`?new`** / **`?new=1`**.
- **Statusdarstellung** für Badges ist **zentral** in `lib/application-status.ts` (R1/R2 konsistent; Wording z. B. bei „Anpassung“ rollenabhängig).
- R1- und R2-Dashboard nutzen ein gemeinsames **`RoleDashboardLayout`** (einklappbare Sidebar, rollenspezifische Nav-Items).

---

## 2. Routen

### R1

| Zweck | Route |
|-------|--------|
| Login | `/student/login` |
| Antragserstellung | `/portal/antragserstellung` |
| Leerer Neustart | `/portal/antragserstellung?new` (oder `?new=1` / beliebiger Wert) |
| Bestimmten Antrag fortsetzen | `/portal/antragserstellung?applicationId=<uuid>` |
| Dashboard | `/portal/home` |
| Legacy | `/portal/antrag` → Redirect auf `/portal/antragserstellung` |

Hinweise:

- `app/portal/antragserstellung/page.tsx` interpretiert **jeden** Wert von `?new` als „leerer Neustart“ (`params.new !== undefined`).
- Ohne `?new` und ohne `?applicationId` wird der **letzte** Antrag des Users **nur dann** automatisch geladen, wenn sein kanonischer Status **`draft`**, **`consultation_recommendation`** oder **`needs_adjustment`** ist. Bereits eingereichte Anträge (`in_review` / `in_decision` / `approved` / `rejected`) führen zu einem **leeren** Formular, damit R1 problemlos einen zweiten Antrag starten kann.
- `/portal` kann noch auf die Antragserstellung zeigen — mit `app/` abgleichen.

### R2

| Zweck | Route |
|-------|--------|
| Login | `/staff/login` |
| Workspace (R2–R6) | `/workspace` |

---

## 3. Kerndateien (Implementierung)

| Datei | Rolle |
|-------|--------|
| `components/nta-antrag-desktop.tsx` | R1 Flow Step 1–6: Validierung, Autosave, Realtime (per **`application.id`** gescoped), Sidebar, Delete |
| `app/portal/antragserstellung/page.tsx` | Steuert Initial-Load: `?new` ⇒ leer; `?applicationId` ⇒ gezielt; sonst nur **resumable** Anträge auto-laden |
| `components/domain/student-dashboard.tsx` | R1 Dashboard (Liste, Detail, Delete; „Neuen Antrag erstellen“ → `?new=1`) |
| `app/portal/home/page.tsx` | Serverpage R1 Dashboard |
| `components/domain/workspace-test-flow.tsx` | Workspace: Liste, Detail, Aktion Beratung/Empfehlung, Mode-Switch `review` / `readonly_decision` |
| `components/domain/workspace-application-review.tsx` | R2 Block-Review inkl. Persistenz und Forward |
| `app/api/applications/review-forward/route.ts` | Forward-API: Statuswechsel auf `in_implementation` / `needs_correction` (RLS-konform, Session-Client) |
| `components/domain/role-dashboard-layout.tsx` | Gemeinsames R1/R2 Dashboard-Layout (collapsible Sidebar, Workspace-Topbar R2) |
| `lib/test-flow-types.ts` | `ApplicationData` / `applications.data` (inkl. `recommendation.workspaceReview`) |
| `lib/application-status.ts` | Zentrale fachliche States + rollenabhängige Labels/Farben |
| `lib/r2-review-persist.ts` | Helfer `dataWithoutLegacyReviewRoots` für trigger-konforme R2-Saves |
| `components/domain/application-status-badge.tsx` | Badge-UI aus Status-Ableitung |
| `utils/supabase/service-role.ts` | Optionaler Service-Role-Client (aktuell **nicht** im Forward-Pfad benötigt) |

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
- **Realtime-Scope:** Subscription in `nta-antrag-desktop.tsx` filtert auf **`id=eq.${activeApplicationId}`** (nicht auf `applicant_id`). Ohne aktive `application.id` wird **keine** Subscription geöffnet. Damit kann ein bereits eingereichter Altantrag den Step-State eines neu gestarteten Drafts nicht mehr auf `step6_submitted` zurückwerfen.

---

## 5. Prozessfortschritt (Sidebar) — Sollverhalten

- Steps nur klickbar, wenn **freigeschaltet**; Freischaltung **datenbasiert** (nicht nur `currentStep`).
- Farben: **Grün** abgeschlossen; **Schwarz** aktiv oder nächster offener Step; **Grau** gesperrt; **Rot** ungültig in Übersicht.
- **Trennlinie** nach „Beratung und Empfehlung“: vor Empfehlung sichtbar; nach freigegebener Empfehlung **dauerhaft ausgeblendet**.

---

## 6. R1 Dashboard — Sollverhalten

- Liste aller eigenen Anträge.
- **Neuen Antrag erstellen** → komplett leer über **`?new=1`** (auch `?new` ohne Wert genügt).
- **Korrekturen vornehmen** (`needs_adjustment`) → `?applicationId=<uuid>` öffnet genau diesen Antrag.
- Direktaufruf von `/portal/antragserstellung` ohne Parameter: lädt nur **resumable** Anträge automatisch; bei bereits eingereichten Anträgen erscheint ein leeres Formular (kein Re-Display des Erfolgs-Screens).
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
| **Anpassung erforderlich** / **Anpassung ausstehend** | Gleicher fachlicher State (`needs_correction` / `needs_adjustment`); **R1** vs. **R2** Wording. |
| **In Entscheid** | R2 hat „Antrag weiterreichen“ ausgelöst; technisch **`in_implementation`**. |
| **Bewilligt** / **Abgelehnt** | Abschluss nach Entscheid (`approved` / `rejected`). |

**Technisch umgesetzt (Ableitung):** Entwurf, Beratung & Empfehlung, In Review, **`in_implementation` → In Entscheid** über `app/api/applications/review-forward/route.ts`. **`needs_correction → in_review`** nach R1-Korrektur sowie der Entscheidungsschritt **`approved` / `rejected`** sind im Statusmodell vorgesehen, aber UI-/Trigger-seitig noch nicht final verdrahtet.

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
- **Block-Review nach `in_review`:** Persistenz unter **`data.recommendation.workspaceReview`** (innerhalb des Trigger-erlaubten `recommendation`-Pfads). Details: `Antrag_Review_Kontext.md` § 4.
- **„Antrag weiterreichen“** geht über **`POST /api/applications/review-forward`** mit Session-Client:
  - Alle Blöcke `confirmed` ⇒ `applications.status = in_implementation` (kanonisch „In Entscheid“).
  - Mind. ein Block `adjustment` ⇒ `applications.status = needs_correction` (kanonisch „Anpassung erforderlich“).
  - Schreibt zugleich `recommendation.workspaceReview.postSubmit` und `forwardedComments`.
- Diese Aktionen ändern den technischen **`applications.status`** **nicht** in einer Weise, die R1-**Finalsubmit** blockiert (RLS-konform).
- Andere `data`-Felder für R2: **trigger-/policy-seitig gesperrt**.

---

## 10. DB / RLS / Trigger — nicht verletzen

- Workspace-Policies: Zugriff für Rollen **R2, R3, R5, R6**. Die **SELECT**-Policy `applications_select_r2_worklist` umfasst seit Migration **`extend_workspace_select_to_decision_states`** auch **`in_implementation`**, **`approved`** und **`rejected`** — sonst scheitert der `UPDATE` von `in_review → in_implementation` am implizit folgenden `RETURNING`-SELECT (Postgres-RLS-Mechanik). **`SUPABASE_SERVICE_ROLE_KEY` ist für den Forward-Pfad nicht erforderlich.**
- **UPDATE**-Policy `applications_update_r2_worklist` deckt den Übergang aus `in_review` heraus (`USING`); `WITH CHECK` erlaubt die Ziel-Status `in_implementation` / `needs_correction`.
- R1 darf eigenen Antrag nur in **erlaubten Status** updaten (`applications_update_r1_own_limited`).
- **Konsequenz:** Beratungsphase darf technisch **nicht** in einem Status landen, der den **späteren Final-Submit** durch R1 blockiert. Umgesetzter Pfad: Beratung im Workspace u. a. bei **`submitted`**, finaler Submit R1 → **`in_review`** → R2-Forward → **`in_implementation`** / **`needs_correction`**.
- Trigger **`enforce_r2_application_update_columns`:** R2 darf in `applications.data` nur **`consultation`** / **`recommendation`** ändern — nicht `summary`, `applicationDefinition`, `personalData`, etc. Vor jedem Save daher **`dataWithoutLegacyReviewRoots`** (`lib/r2-review-persist.ts`) auf das Daten-Objekt anwenden.

---

## 11. Arbeitsregeln bei Änderungen

1. Keine Regression in bereits umgesetzten Screens ohne Produktentscheid.
2. Status- und Freischaltlogik **datenbasiert** halten.
3. R2-**Trigger-Grenzen** strikt einhalten (nur `consultation` / `recommendation`); R2-Review-Daten gehören unter `recommendation.workspaceReview`.
4. **Realtime-Subscriptions** im R1-Flow immer auf die **aktive `application.id`** scopen, nicht auf `applicant_id` — sonst können Updates eines anderen Antrags den lokalen Step-State überschreiben.
5. RLS-Anpassungen: bei **Status-Übergängen** prüfen, ob die Ziel-Zeile nach dem Update via SELECT-Policy weiterhin sichtbar ist (sonst `new row violates row-level security policy`).
6. Neue Screens nach Möglichkeit **screen-by-screen** aus Figma.
7. Neue Pflichtfelder: klare **Error-UI** und Konsistenz mit Übersicht/Sidebar.
8. Status-Erweiterungen in **`application-status.ts`** zentralisieren.

---

## 12. Verwandte Dokumente

| Datei | Nutzen |
|-------|--------|
| `General_Prototype_Kontext.md` | Tech, Rollen, Architektur, Scope |
| `Antrag_Review_Kontext.md` | Review nach Einreichung (Platzhalter) |
| `Prototyp_Funktionen.md` | Langfristige Funktionsvision |
