# Dashboard Core Layout — Portal (R1) & Workspace (R2–R6)

> **Zweck:** SSOT für die gemeinsame **Dashboard-Shell** (Sidebar, Top-Leiste, weisser Inhalts-Container) in **Portal** und **Workspace**.  
> **Nicht abgedeckt:** Der **R1-Antragsflow** (Steps 1–6 mit Fortschritts-Sidebar) — eigene Shell in `r1-application-flow-layout.tsx` → `Antragerstellung_Kontext.md` § 5, `High_Fidelity_Design_Kontext.md` § 7.  
> **Figma (HF):** `5354:9951` nav_max (240px), `5354:10586` nav_mini (68px).

---

## 1. Architektur (Schichten)

```
RoleDashboardLayout          ← Einstieg pro Seite (Rolle + Route)
├── R1  → PortalDashboardToolbarProvider
│         └── PortalDashboardShell → DashboardShell (variant="portal")
└── R2–R6 → WorkspaceR2ToolbarProvider
          └── WorkspaceDashboardShell → DashboardShell (variant="workspace")

DashboardShell (intern)
├── DashboardMainPanelScrollProvider
├── WorkspaceSidebar       Brand, Nav, Collapse-Logik
├── PortalTopBar | WorkspaceTopBar
└── DashboardMainPanel     weisses Panel (Inset `rounded-xl` oder Tight `rounded-t-xl`)
```

| Datei | Rolle |
|-------|--------|
| `components/domain/role-dashboard-layout.tsx` | Wählt Shell nach Rolle; Portal: `showTopBar` wenn Route `/portal/antragserstellung` |
| `components/domain/workspace-dashboard-shell.tsx` | `DashboardShell`, `PortalDashboardShell`, `WorkspaceDashboardShell`, Sidebar, Brand, Nav-Items, `DashboardMainPanel` (Inset/Tight-Layout) |
| `components/domain/dashboard-main-panel-scroll-context.tsx` | Optional: Page registriert eigenes Scroll-Element (`edgeToEdge`-Review), Shell misst `scrollHeight` dort |
| `components/domain/portal-dashboard-toolbar-context.tsx` | Slots für Portal-Top-Bar (Zurück, optional Trailing z. B. Autosave) |
| `components/domain/workspace-r2-toolbar-context.tsx` | Slot für Workspace-Top-Bar links (z. B. «Zurück zur Liste») |
| `components/domain/workspace-home-dashboard.tsx` | Workspace-Home (Figma `5509:11682`); KPI-Zeile live; Anträge-Panel mit Toolbar |
| `components/domain/workspace-my-tasks-view.tsx` | `/workspace?view=aufgaben` — vorab gefilterte Aufgaben + gleiche Tabellen-Toolbar |
| `components/domain/use-workspace-applications-table-state.ts` | Shared State: Offen/Alle (nur Home), Suche, Facetten, Sortierung → `displayedRows` |
| `components/domain/workspace-applications-table-toolbar.tsx` | Suche, Offen/Alle-Toggle (Home), Filter-Popover, aktive Pills |
| `components/domain/workspace-applications-table-filter-popover.tsx` | Facettierte Filter (Status, Studiengang, Fakultät, Zugewiesen an, «Nur mir») |
| `components/domain/workspace-applications-table-filter-pills.tsx` | Entfernbare Filter-Chips |
| `components/domain/workspace-applications-table.tsx` | Sortierbare Tabelle inkl. Fakultäts-Kürzel, Assignee-Avatar |
| `components/domain/open-applications-summary-card.tsx` | KPI «Offene Antragsverfahren» (Chart-Ansichten, Live-Stats) |
| `components/domain/assigned-tasks-summary-card.tsx` | KPI «Zugewiesene Aufgaben»; `+N` = heute neu (ohne sichtbares «heute») |
| `lib/workspace-applications-table-controls.ts` | Facetten, Pills, Sort, Spaltenfilter |
| `lib/workspace-assigned-tasks-stats.ts` | KPI + `filterMyTasksApplications` / `isApplicationInMyTasksForRole` |
| `lib/workspace-applications-list.ts` | Server-Liste; R4: Session + RLS + Status-Whitelist (kein Service-Role) |
| `lib/application-assignee.ts` | «Zugewiesen an» + Prototyp-R2/R4-Namen je Viewer-Rolle |
| `lib/uzh-studiengaenge-data.ts` / `lib/uzh-studiengaenge.ts` | UZH-Fakultäten & Studiengänge (alphabetisch, Kürzel) |
| `lib/r4-department-access.ts` | Hilfs-Lookup R4-Scope (optional; Liste verlässt sich auf RLS) |
| `components/domain/student-dashboard.tsx` | R1 Home «Meine Anträge» (Figma `5792:22019` / `5826:3088`); Cards/Table-Toggle, Live-Polling |
| `components/domain/r1-application-card.tsx` | R1-Antragkarte nach Status (Figma `5856:21926`); ganze Karte klickbar |
| `components/domain/r1-applications-table.tsx` | R1-Anträge-Tabelle (`table-fixed` + `colgroup`); Status via `r1-application-status-pill.tsx` |
| `lib/design-tokens/workspace-dashboard.ts` | Breiten, Padding, Nav-Aktiv-Farben, Inset/Tight-Layout-Ratios, `WORKSPACE_HOME_KPI_*` |
| `lib/design-tokens/application-content-panel.ts` | Weisses Panel: Shadow, Card-Surface (`APPLICATION_CONTENT_PANEL_*`) |
| `lib/design-tokens/application-scroll.ts` | Scroll-Viewport vs. Inhalts-Inset (`whitePanelScroll*`, `dashboardMainPanelScrollAreaClass`) |

**Wichtig — zwei getrennte R1-Layouts:**

| Situation | Shell |
|-----------|--------|
| `/portal/home` (Antragsliste) | **Portal Dashboard Shell** |
| `/portal/antragserstellung` + Status **≠** `draft` / `consultation_recommendation` | **Portal Dashboard Shell** + `PortalApplicationAdjustment` |
| `/portal/antragserstellung` + **Entwurf** oder **Beratung & Empfehlung**, oder `?new` | **Keine** Dashboard-Shell — **`NtaAntragDesktop`** + `r1-application-flow-layout.tsx` (`embedInDashboardShell={false}`) |

Die Flow-Shell und die Dashboard-Shell **nicht mischen** (kein doppelte Sidebar, kein Top-Bar-Konflikt).

---

## 2. Visuelle Struktur (gemeinsam)

```
┌──────────────┬─────────────────────────────────────────────┐
│  Sidebar     │  [Portal: 12px-Rand oder Top-Bar]            │
│  stone-100   │  [Workspace: Top-Bar immer sichtbar]         │
│  pl-[18px]   ├─────────────────────────────────────────────┤
│  py-3        │  px-6 (Hauptpanel); Detail-Spalte pl-6      │
│  Logo+avalis │  ┌─────────────────────────────────────────┐ │
│  Navigation  │  │  Inhalt (bg-background, rounded-t-xl)   │ │
│  …           │  │  children der jeweiligen Page             │ │
│  Hilfe/…     │  └─────────────────────────────────────────┘ │
└──────────────┴─────────────────────────────────────────────┘
```

- **Seiten-Hintergrund:** `bg-stone-100`, `h-screen`, `overflow-hidden`.
- **Inhalts-Panel:** `bg-background` + Shadow `APPLICATION_CONTENT_PANEL_SHADOW_CLASS`; **kein** Container-Padding am Panel (`DASHBOARD_SHELL_MAIN_PANEL_PADDING_CLASS` = `""`). Inset am **Scroll-Viewport** (`dashboardMainPanelScrollAreaClass`: `pl-6 pr-4`, **`pt-12`** = 48px oben, `pb-6`); **Inset-Layout** (`rounded-xl`, unten `pb-6` an Content-Zeile) vs. **Tight-Layout** (`rounded-t-xl`, `pb-0`) — Hysterese **90 %** / **82 %** (`DASHBOARD_MAIN_PANEL_TIGHT_LAYOUT_*`).
- **Horizontaler Abstand:** Content-Zeile **`px-6`** (24px zum Viewport); Scroll-Inhalt **`pl-6 pr-4`** + Läufer-`mr-2`; Nav **`pl-[18px] py-3`**; Top-Leiste **`px-6 py-3`**; Antragdetails **`pl-6`**.

---

## 3. Sidebar — Mechanik

### Breiten (Figma)

| Zustand | CSS | Innenbreite Inhalt |
|---------|-----|---------------------|
| Aufgeklappt (nav_max) | `w-[240px]` | 240px |
| Eingeklappt (nav_mini) | `w-[68px]` | 68px (`p-3` → 44px nutzbar) |

Transition: `transition-[width] duration-300 ease-out` (`WORKSPACE_SIDEBAR_TRANSITION_MS = 300`).

### Zwei Phasen beim Einklappen (`collapsed` vs. `layoutMini`)

| State | Wann | UI |
|-------|------|-----|
| `collapsed` | Sofort nach Klick «Einklappen» | Breite animiert auf 68px; Labels `opacity-0`; Nav-Icons bleiben **links** (`justify-start`, kein `justify-center`) |
| `layoutMini` | **300 ms nach** `collapsed === true` | Labels aus dem Flex-Flow (`absolute` + `opacity-0`); optional Zentrierung nur wo explizit — **Nav-Icons bleiben am gleichen X** |

Beim **Aufklappen:** `layoutMini` sofort `false`, dann `collapsed` → `false` (kein Sprung der Icon-Position).

**Grund:** Icon-Position und Label-Fade entkoppeln — nur Text blendet aus, Icons springen nicht.

### Brand-Zeile

- Höhe: `h-12` (`WORKSPACE_BRAND_ROW_CLASS`), Logo **`AvalisLogo`** 40×40 (`size-10`).
- Text **«avalis»:** `hfTypography.h4`.
- **Icon-Slot:** 40×40 (`workspaceSidebarIconSlotClass`) für Logo und Nav — **kein** zusätzlicher linker Offset. Nav-Zeile: `w-full` + `transition-[max-width] duration-300` — bei `collapsed` `max-w-10`, Breite schrumpft mit der Sidebar (nicht separat auf 40px). Label per Opacity im Flex-Flow. Aufgeklappt: 40px-Box links, Label rechts (`gap-2`).

### Einklappen / Aufklappen (Toggle-Buttons)

| Button | Sichtbarkeit | Position |
|--------|----------------|----------|
| **Einklappen** (`ArrowLeftFromLine`) | Nur wenn Sidebar **aufgeklappt**; erscheint bei Hover über Sidebar oder Brand (`group-hover/sidebar`, `group-hover/brand`); nach 300 ms Freigabe wenn wieder aufgeklappt | Rechts in der Brand-Zeile |
| **Aufklappen** (`ArrowRightFromLine`) | Nur wenn `collapsed && layoutMini`; Hover über Sidebar/Brand; **16px rechts** vom Logo (`left: calc(100% + 16px)`) | Absolut am Logo-Slot |

**Regeln gegen Doppel-Icons / Überlagerung:**

- Einklappen-Button wird im eingeklappten Zustand **`hidden`** (nicht nur `opacity-0`), damit Hover-Klassen ihn nicht einblenden.
- Im Mini-Zustand kein Einklappen-Button im Layout — nur Aufklappen-Badge neben dem Logo.

### Sidebar-Klick

- **Eingeklappt:** Klick auf die Sidebar (ausser Nav-Links mit `stopPropagation`) → `onCollapsedChange(false)`.
- **Aufgeklappt:** `cursor-default`, kein Flächen-Klick zum Aufklappen.

### Nav-Items

- Zeile: `h-8`, Icon in **40×40-Slot**, Lucide **16×16** zentriert im Slot.
- Label: `opacity`-Transition 300ms; bei `layoutMini` aus dem Flow genommen.
- **Aktiv (Portal + Workspace):** `DASHBOARD_NAV_ITEM_ACTIVE_CLASS` — `bg-primary`, `rounded-[7px]`, Icons erben `text-primary-foreground`; Label **`DASHBOARD_NAV_ITEM_ACTIVE_LABEL_CLASS`** (`text-hf-paragraph-small-medium text-primary-foreground`) — **nicht** `hfTypography.paragraphSmallMedium` (enthält `text-foreground-alt` und würde den Kontrast killen). Figma: `5509:11682`.
- **Inaktiv:** `DASHBOARD_NAV_ITEM_IDLE_CLASS` — `text-foreground-alt`, Hover `stone-150/80`.
- Badge (nur Workspace «Meine Aufgaben»): bei `collapsed`/`layoutMini` per `opacity-0` ausgeblendet, bleibt im DOM (auch im aktiven Zustand weiter `bg-stone-150`).

### Navigation — Inhalte

**Portal (`PortalDashboardShell`):**

| Eintrag | Route | Hinweis |
|---------|--------|---------|
| Meine Anträge | `/portal/home` | Aktiv auch auf `/portal/antragserstellung` (Antrag geöffnet) |
| Profil | `/portal/home?view=profil` | |
| Einstellungen | `/portal/home?view=einstellungen` | unten |
| Hilfe | `/portal/home?view=hilfe` | unten |

**Workspace (`WorkspaceDashboardShell`):**

| Eintrag | Route |
|---------|--------|
| Home | `/workspace` |
| Meine Aufgaben | `/workspace?view=aufgaben` (+ optional Badge) |
| Beratungen planen | `/workspace?view=terminplaner` — **R2, R3, R2R4** (Sidebar via `lib/workspace-nav-access.ts`); **R4** ohne Eintrag; Platzhalter `WorkspaceConsultationPlannerView` (`stone-50`, noch ohne Inhalt) |
| Auswerten | `/workspace?view=auswerten` |
| Einstellungen / Hilfe | `?view=einstellungen` / `?view=hilfe` |

Aktiv-Logik: `useDashboardNavActive(variant)` — Pfad + optional `view`-Query-Parameter.

---

## 4. Portal — Top-Leiste

### Wann sichtbar

- **`/portal/home`:** Keine Top-Bar. Stattdessen **12px** grauer Streifen oben (`h-3` / `PORTAL_DASHBOARD_RIM_HEIGHT_CLASS`) — visueller «Rahmen» zum Viewport.
- **`/portal/antragserstellung`** (nur Shell-Fälle, s. § 1): Top-Bar mit **Zurück**, Account-Menü.

Steuerung: `RoleDashboardLayout` setzt `showTopBar={pathname.startsWith("/portal/antragserstellung")}` — gilt nur für Seiten **in** der Shell (Adjustment-Ansicht), nicht für den Step-Flow ohne Shell.

### Verhalten (Ist)

- **Liste (`/portal/home`):** fester **12px**-Streifen (`h-3` / `PORTAL_DASHBOARD_RIM_HEIGHT_CLASS`), keine Top-Bar.
- **Antrag in Shell (`/portal/antragserstellung`, Adjustment):** **`PortalTopBar`** — gleiche Höhe/Elemente wie Workspace (`h-14`, Benachrichtigungen, Account, optional `trailingSlot`), **ohne** Suche.
- Inhalts-Panel: **`pt-0`** (Rand bzw. Top-Bar sitzt oberhalb des weissen Panels).

### Geplant für später — Morph Rim → Top-Bar

Optional wieder einführbar (Tokens in `workspace-dashboard.ts` vorbereitet):

1. Container: `transition-[height] duration-300 ease-out` (`workspacePortalTopBarHeightTransitionClass`).
2. Geschlossen: **`h-3`** → geöffnet: **`h-14`**.
3. Beim Route-Wechsel: State startet bei `h-3`, dann **`requestAnimationFrame` × 2** → `portalTopBarExpanded=true`, damit CSS die Höhe animiert (Mount sonst direkt mit `h-14` ohne Transition).
4. Top-Bar-Inhalt (Zurück, Account): **`opacity`** 200ms, sichtbar wenn `portalTopBarExpanded`.

### Toolbar-Slots

`PortalDashboardToolbarProvider` + `usePortalDashboardToolbar()`:

| Slot | Standard | Überschreibung |
|------|----------|----------------|
| `leadingSlot` | Link **«Zurück»** → `/portal/home` | Optional durch Page (selten) |
| `trailingSlot` | — | z. B. Autosave-Hinweis (`NtaAntragDesktop`) |
| Rechts (wie Workspace) | Benachrichtigungen + Account | **keine** Suche im Portal |

Default-Zurück: `portalDefaultBackButton` in `workspace-dashboard-shell.tsx`.

---

## 5. Workspace — Home & Top-Leiste

### Home-Dashboard & Workspace-Views

| Aspekt | Ist |
|--------|-----|
| **Figma Home R2/R3** | `5509:11682` — KPI-Zeile + Anträge-Panel |
| **Figma Home R4** | `5948:27359` — «Alle Anträge» 7/10 + «Zugewiesene Aufgaben» 3/10, je **`h-[320px]`** (keine dritte KPI-Karte) |
| **Figma Home R2R4** | `5949:3172` (`Dashboard_R2/R4`) — wie R2: drei KPI-Zeilen; «Zugewiesene Aufgaben» **319px** breit, **drei** Buckets (Beratungen · Reviews · Entscheidungen) |
| **Figma Anträge-Toolbar** | `5948:27466` / `5948:27470` — Suche, Toggle, Filter, Download |
| **Figma Tabelle maximiert** | `5955:21930` — KPI ausgeblendet, Minimize oben rechts im Panel |
| **Routing** | `workspace-test-flow.tsx`: `searchParams.get("view")`, `searchParams.get("application")` (UUID), Client-State `selectedApplicationId` |

| Route / Zustand | Komponente | Rollen |
|-----------------|------------|--------|
| `/workspace` ohne `?view=` | `WorkspaceHomeDashboard` | R2, R3, R4, **R2R4** |
| `/workspace?view=aufgaben` | `WorkspaceMyTasksView` | R2, R3, R4, **R2R4** |
| `/workspace?view=terminplaner` | `WorkspaceConsultationPlannerView` (R2/R3/**R2R4**, leer) | R4 → Redirect `/workspace` |
| kein Antrag selektiert, sonstige `?view=` | Inbox-Card-Liste | R5/R6 bzw. Platzhalter |
| `?application=<uuid>` gesetzt | Review / R4-Entscheid | je Status/Rolle |

**Antrag öffnen/schliessen:** Zeilenklick → `router.push` mit `?application=<uuid>`; «Zurück zur Liste» / Home-Nav ohne `application` → `router.replace` und `selectedApplicationId = null`. Sync-Effect: fehlt `application` in der URL, wird die Detailansicht immer geschlossen (auch nach Sidebar «Home» → `/workspace`).

### Abhängigkeiten (Daten & UI)

```
WorkspaceTestFlow(applications, workspaceRole, reviewerDisplayName)
│
├─ WorkspaceHomeDashboard
│   ├─ computeOpenApplicationsStats ──► OpenApplicationsSummaryCard (R2/R3)
│   ├─ computeAllApplicationsStats ─────► OpenApplicationsSummaryCard (R4)
│   ├─ computeAssignedTasksStats ───────► AssignedTasksSummaryCard
│   └─ useWorkspaceApplicationsTableState(applications) ──► WorkspaceApplicationsTable
│
└─ WorkspaceMyTasksView
    ├─ filterMyTasksApplications ◄── isApplicationInMyTasksForRole
    └─ useWorkspaceApplicationsTableState(prefilteredApplications=…) ──► gleiche Tabelle/Toolbar
```

**Gemeinsame Tabellen-Pipeline:** `fetchWorkspaceApplicationsList` → (optional Vorfilter) → `useWorkspaceApplicationsTableState` → `buildWorkspaceApplicationTableRows` → `WorkspaceApplicationsTable`.

| Ansicht | Vorfilter auf Rohliste | Offen/Alle | Zuweisungs-Filter |
|---------|------------------------|------------|-------------------|
| **Home «Anträge»** (R2/R3) | Keiner — alle RLS-sichtbaren Anträge | Ja, Default **Offen** (`≠ approved/rejected`) | Nein (optional Toolbar «Nur mir zugewiesen») |
| **Meine Aufgaben** (R2/R3) | `filterMyTasksApplications` (Status + Name-Match) | Nein | Im Vorfilter fest |
| **Home** (R4) | RLS Fakultät + Client-Status-Whitelist | Default **Alle** | Wie R2/R3 |

**R2 Meine Aufgaben:** `consultation_recommendation` (ohne freigegebene Empfehlung) oder `in_review`, Assignee = eingeloggtes R2. **R3 Meine Aufgaben:** nur `in_decision`, Assignee = eingeloggtes R3/R4-Konto.

### KPI-Zeile

| Rolle | Layout erste Zeile | KPI-Karten |
|-------|-------------------|------------|
| **R2, R3** | 3× `WORKSPACE_HOME_KPI_CARD_CLASS` (`flex-1`, `min-h-[220px]`, `gap-6`) | Offene Antragsverfahren · Zugewiesene Aufgaben · Beratungen diese Woche (Mock) |
| **R4** | `WORKSPACE_HOME_R4_OPEN_CARD_CLASS` (7/10) + `WORKSPACE_HOME_R4_TASKS_CARD_CLASS` (3/10), je **`h-[320px]`** | Alle Anträge · Zugewiesene Aufgaben |
| **R2R4** | Wie R2/R3-Zeile; «Zugewiesene Aufgaben» mit `WORKSPACE_HOME_R2R4_ASSIGNED_TASKS_CARD_CLASS` (`w-[319px]`) | Offene Antragsverfahren · Zugewiesene Aufgaben (3 Buckets) · Beratungen diese Woche (Mock) |

**KPI «Offene Antragsverfahren» (R2/R3)** — `lib/workspace-open-applications-stats.ts`: Total und Balken nur **`in_review`**, **`needs_adjustment`**, **`in_decision`** (kein `consultation_recommendation` im Total).

**KPI «Alle Anträge» (R4)** — `lib/workspace-all-applications-stats.ts`: Total und Balken nur **`in_decision`**, **`approved`**, **`rejected`** (Reihenfolge Figma).

**KPI «Zugewiesene Aufgaben»** — `computeAssignedTasksStats` / `isApplicationInMyTasksForRole`:

| Rolle | Status in KPI & Meine Aufgaben | Ausgeschlossen |
|-------|--------------------------------|----------------|
| **R2** | `consultation_recommendation` (ohne freigegebene Empfehlung), `in_review` | «Empfehlung verfasst» (`recommendation.releasedHtml`), alle anderen States |
| **R2R4** | Union R2 + R4: Beratung (ohne freigegebene Empfehlung), `in_review`, **`in_decision`** | wie R2 bzgl. freigegebener Empfehlung |
| **R3, R4** | `in_decision` | alle anderen States |

Zuweisung: `resolveApplicationAssigneeForWorkspace` + Name-Match mit `reviewerDisplayName` (`isApplicationAssignedToReviewer`). Details → `lib/application-assignee.ts` (Status → Antragsteller / R2-Konto / R4-Konto; Avatar-Initialen in Tabelle + Antragdetails).

### 4b. Test-Accounts & Berechtigungs-Matrix (Ist)

Credentials: mit Testpersonen abgestimmt (nicht in Repo). Login **`/staff/login`**; nach Sign-In **`getSession()`** vor `users.role`-Select (RLS).

| Account (E-Mail) | `users.role` | Home-Layout | Listen-Filter (Client) | Antrag öffnen — typische Views |
|------------------|--------------|-------------|------------------------|--------------------------------|
| **`r4.test@example.com`** | **R4** | 2 KPI (`5948:27359`), je 320px | Nur `in_implementation`, `approved`, `rejected` + RLS alle Fakultäten | `in_decision` → **`WorkspaceR4DecisionView`**; sonst Review read-only |
| **`r4.rf.test@example.com`** | **R4** | wie R4 | wie R4, RLS nur Fakultät **`rwf`** | wie R4 |
| **`r2and4.combined.test@example.com`** | **R2R4** | 3 KPI (`5949:3172`), Aufgaben-Bucket 319px | Wie R2 (≠ `draft`) + R4-SELECT-Policies | `in_review` / Beratung → **R2-Review**; `in_decision` → **R4-Entscheid** + Label «Entscheid ausstehend» |
| **R2 / R3** (weitere Staff-Tests) | R2 / R3 | 3 KPI | R2: ≠ `draft`; R3: Worklist-Policy | R2: Review + Forward; **kein** R4-Edit |

**Fachliche Capabilities** (`lib/workspace-role.ts`):

| Flag | Rollen | Wirkung |
|------|--------|---------|
| `hasR2WorkspaceCapabilities` | R2, **R2R4** | Empfehlung, Block-Review, Forward, «Beratungen planen» |
| `hasR4WorkspaceCapabilities` | R4, **R2R4** | R4-Entscheid-UI, persist/complete, APIs |
| `usesR4OnlyHomeLayout` | nur **R4** | Zwei KPI-Karten (keine «Beratungen diese Woche») |
| `statusAudienceForWorkspaceApplication` | **R2R4** in `in_decision` → Audience **R4** | Badge «Entscheid ausstehend» statt «In Entscheid» |

**Antragsdetail — Routing** (`workspace-test-flow.tsx`):

| Kanonischer State | R2 | R4 | R2R4 |
|-------------------|----|----|------|
| `consultation_recommendation` / `in_review` | Review (interaktiv / readonly je Modus) | Review readonly | Review wie R2 |
| `needs_adjustment` | readonly | readonly | readonly |
| **`in_decision`** | readonly Entscheid | **`WorkspaceR4DecisionView`** | **R4-Entscheid** (editierbar) |
| `approved` / `rejected` | readonly | readonly | readonly |

**Detail-Panel:** Registrierung über `useRegisterDashboardDetailPanel` — Panel bleibt bei geöffnetem Antrag sichtbar (kein Unmount-Cleanup in Kind-Komponenten); Clear nur bei Deselektion in der Liste.

**R4 Schreiben / Trigger:**

| Aktion | R4 | R2R4 |
|--------|----|------|
| Autosave `r4DecisionReview` | RLS `applications_update_r4_decision` | + Trigger: nur `recommendation` / `consultation` / **`r4DecisionReview`** |
| «Entscheid abschliessen» | `approved` + **`materializeApprovedR4DecisionReview`** | + Trigger erlaubt zusätzlich **`applicationDefinition`** nur bei `in_implementation` → `approved` (`20260526200000_*`) |

**RLS-Migrationen (Auszug):** `20260513190000` (R4 SELECT), `20260514120000` (R4 UPDATE), `20260526120100` (R2R4 Policies + combined User), `20260526140000` (R2R4 `r4DecisionReview`), `20260526150000` (Worklist/Forward-Fixes), `20260526160000` (R2 Forward `WITH CHECK`), `20260526200000` (R2R4 Definition on approve).

→ Entscheidungs-UI im Detail: **`Antrag_Bewilligung_Kontext.md`**; Freitext-Massnahmen R1: **`Antragerstellung_Kontext.md`** § 4 Step 4.

**KPI-Delta `+N`:** `addedToday` = Anträge im Bucket mit `submittedAt` bzw. `updated_at` auf heutigem Kalendertag (de-CH). UI nur `+N` (kein «heute»-Suffix); Bedeutung per `aria-label`.

**KPI Icon-Buttons (Header):**

| Karte | Aktion |
|-------|--------|
| Offene Antragsverfahren / Alle Anträge | `maximizeApplicationsTable`: Filter **Offen**, Tabelle **maximiert** (KPI-Zeile ausgeblendet, Transition 300ms) |
| Zugewiesene Aufgaben | `router.push("/workspace?view=aufgaben")` |
| Beratungen diese Woche (nur R2/R3) | `router.push("/workspace?view=terminplaner")` |

### Meine Aufgaben (`?view=aufgaben`)

| Aspekt | Ist |
|--------|-----|
| **Komponente** | `workspace-my-tasks-view.tsx` — Panel + **dieselbe** `WorkspaceApplicationsTableToolbar` wie Home (ohne Offen/Alle) |
| **Vorfilter** | `filterMyTasksApplications` — identisch zu KPI «Zugewiesene Aufgaben» (s. Tabelle oben) |
| **Danach** | `useWorkspaceApplicationsTableState({ prefilteredApplications })` — Suche, Facetten, Sortierung |
| **Interaktion** | Zeilenklick → `?application=<uuid>` → Review wie von Home |

### Anträge-Panel (Home)

| Aspekt | Ist |
|--------|-----|
| **Toolbar** | `workspace-applications-table-toolbar.tsx`; Tokens `WORKSPACE_HOME_TABLE_*` (Figma `5948:27470`) |
| **Offen/Alle** | Nur Home; `isOpenApplication` = nicht `approved` / `rejected` (R2/R3 Default **Offen**, R4 Default **Alle**) |
| **Facettierte Filter** | `workspace-applications-table-controls.ts`: Status, Studiengang, Fakultät (Kürzel), Zugewiesen an, «Nur mir zugewiesen»; Pills zum Entfernen |
| **Suche** | Name, Studiengang, Fakultät (Kürzel + Vollname), **Antrags ID** (`NTA-YYYY-XXXX`), Status-Label, Assignee |
| **Sortierung** | Spaltenköpfe in `workspace-applications-table.tsx` |
| **Tabellen-Layout** | Container `@container/applications-table` auf `WorkspaceApplicationsTable`: **`table-auto`**. **&gt; 1150px (Fit):** kein horizontales Scrollen; Name `13%` (einzeilig bis **&gt; 24 Zeichen**, dann Umbruch), Studiengang `35%` (**einzige** Standard-Umbruchspalte), Fakultät/Datum je **`5.5rem`**, Ref `9rem`, Status `15rem`, Zugewiesen an **`max-content`** + `min-w-max` (kein Überlauf in Menü-Spalte). Fakultät, Antrags ID, Datum, Status, Zugewiesen an: **immer `nowrap`**, Mindestbreite = Inhalt. **≤ 1150px:** `min-w-[74.125rem]` + horizontaler Scroll. Menü-Spalte `sticky right-0`, `pl-2` zum Assignee. Tokens: `WORKSPACE_APPLICATIONS_TABLE_*` in `workspace-dashboard.ts`. |
| **Maximize** | Nur R2/R4: Panel-Header; KPI-Zeile ausgeblendet; Minimize stellt KPI wieder her |
| **Tabellen-Spalten** | Name, Studiengang, **Fakultät** (Kürzel, Tooltip Vollname), **Antrags ID**, Datum, Status, Zugewiesen an (Avatar) |
| **R4 Fakultäts-Scope** | DB: `departments`, `study_programs`, `r4_department_scopes`; RLS `r4_application_in_department_scope`; Liste: **nur** Session-Client (`fetchWorkspaceApplicationsList`), kein Service-Role-Fallback |
| **R4 Test-Accounts** | `r4.test@example.com` = alle Fakultäten; `r4.rf.test@example.com` = nur `rwf` — volle Matrix § **4b** |
| **Studiengang (R1)** | `lib/uzh-studiengaenge-data.ts` — Fakultäten alphabetisch, gruppierte Combobox |
| **Shell** | Default-Scroll `dashboardMainPanelScrollAreaClass` mit `pt-12`; kein `edgeToEdge` |

### Top-Leiste

- **Immer** sichtbar (kein Rim-Morph).
- Inhalt: optional **`leadingSlot`** aus `WorkspaceR2ToolbarProvider` (z. B. «Zurück zur Liste» in `workspace-test-flow.tsx` bei geöffnetem Antrag), **Suche** (Mock), **Benachrichtigungen**, **Account** mit Initialen (`lib/user-initials.ts`, `workspaceAccountInitials` von Server-Pages).
- Figma-Node Referenz Top-Bar Workspace: `5354:10007`.

---

## 5b. Portal — Home «Meine Anträge» (R1)

| Aspekt | Ist |
|--------|-----|
| **Figma** | Cards `5792:22019`, Table `5826:3088`, Card-States `5856:21926` |
| **Route** | `/portal/home` |
| **Komponente** | `StudentDashboard` — volle Panelbreite (`edgeToEdge`, kein Shell-`p-6`; Inset nur am Scroll-Viewport) |
| **Daten** | Supabase-Liste eigener Anträge (Server + Client-Polling 2s) |
| **Ansichten** | Toggle **Cards** / **Table** (`localStorage`: `r1-applications-view`) |
| **Cards** | CSS-Grid: 2 Spalten, ab **1600px** 3 Spalten; Status-spezifische Shell + Progress (`In Review → In Entscheid → Verfügung`); Utility-Spalte am Ende (`R1DashboardUtilityColumn`: Neuer Antrag + Informationen) |
| **Table** | Spalten **Antrags ID**, Einreichedatum, Gültigkeitsdauer, Gültig bis, Status; Header + Zeilen mit je einem `border-b` (letzte Zeile ohne); ganze Zeile klickbar |
| **Status-Pills auf Karten** | `R1_CARD_STATUS_BADGE_CLASS` (HF-pro Status, z. B. Beratung `beratung-100/500`) — kann von globalen Badges abweichen |
| **Interaktion** | Klick Karte/Zeile → `/portal/antragserstellung?applicationId=<uuid>`; «Neuer Antrag» → `?new=1` |

---

## 6. Rechtes Antragdetails-Panel

Gemeinsam für **Portal (Adjustment)** und **Workspace (Review, R4, …)** — nicht für den R1-Step-Flow ohne Dashboard-Shell.

### Mechanik

- Registrierung: `useRegisterDashboardDetailPanel(signature, render, enabled)` (`dashboard-detail-panel-context.tsx`).
- Shell rendert rechts neben dem weissen Inhalts-Panel eine Spalte auf **`bg-stone-100`** (Rahmen zum Viewport).
- **Geschlossen:** `w-0`, kein Inhalt.
- **Geöffnet:** **`w-[330px]`** (`DASHBOARD_DETAIL_PANEL_WIDTH_CLASS`) — Karte **Antragdetails** (Figma `5652:18411`, `application-details-card.tsx`, `hf-content-panel-card` + Shadow): Reihenfolge **Status** → **Zuletzt aktualisiert** → Antragsteller → … → **Antrags-ID** (UI: `workspaceApplicationListNumber`, z. B. `NTA-2026-CDF5`; technische UUID unverändert in DB) + Kommentare/Kontakte je nach Page.

### Verhalten (Ist)

Beim Öffnen eines Antrags: Panel und Inhalt **sofort** sichtbar — **keine** Breiten-Animation (`w-3` → `330px`), **kein** Opacity-Fade.

### Geplant für später — Morph Rim → Panel

Optional (Tokens `DASHBOARD_DETAIL_PANEL_RIM_WIDTH_CLASS`, `workspaceDetailPanelWidthTransitionClass`, `workspaceDetailPanelContentTransitionClass`):

1. Breite: `w-0` → **`w-3`** (12px Rim) → **`w-[330px]`** mit `transition-[width] duration-300`.
2. Inhalt: `opacity` 200ms nach `requestAnimationFrame` × 2 (`detailPanelExpanded`), analog Portal-Top-Bar.

**Signatur:** stabile Felder (Antrags-ID, `updated_at`, Status, Kommentar-IDs, …), damit Updates ohne Re-Render-Loop — siehe Implementierung in Review/Adjustment-Pages.

---

## 7. Seiten — Anbindung

| Page | Shell | `edgeToEdge` | Inhalt |
|------|-------|--------------|--------|
| `app/portal/home/page.tsx` | Portal | **ja** (`edgeToEdge`) | `StudentDashboard` (volle Breite, `pt-12` am Scroll) |
| `app/portal/antragserstellung/page.tsx` | nur bei **Adjustment** | ja | `PortalApplicationAdjustment` |
| `app/portal/antragserstellung/page.tsx` | **keine** Shell bei Flow | — | `NtaAntragDesktop` |
| `app/workspace/page.tsx` | Workspace | ja | `WorkspaceTestFlow` |

`edgeToEdge`: kein zusätzliches `p-6` im Shell-Inneren — volle Fläche für Review/Listen; Page registriert Scroll-Root über `DashboardMainPanelScrollProvider` (s. unten).

### Weisses Hauptpanel — Inset vs. Tight (Scroll)

`DashboardMainPanel` in `workspace-dashboard-shell.tsx` misst `scrollHeight / clientHeight` am Scroll-Container (Default: inneres `overflow-y-auto` im Panel; bei `edgeToEdge` das registrierte Element aus `dashboard-main-panel-scroll-context.tsx`).

| Modus | Bedingung | Content-Zeile unten | Panel-Radius |
|-------|-----------|---------------------|--------------|
| **Inset** | Ratio ≤ 0,9 (Einstieg) bzw. &lt; 0,82 (Ausstieg, Hysterese) | `pb-6` | `rounded-xl` |
| **Tight** | Ratio &gt; 0,9 (Einstieg) | `pb-0` | `rounded-t-xl` |

**Hysterese:** Wechsel Inset ↔ Tight ändert `clientHeight` — ohne zweite Schwelle (`EXIT` 0,82 &lt; `ENTER` 0,9) flackert das Layout. `ResizeObserver` + `window.resize` triggern Neumessung.

---

## 8. Tokens & Konstanten (`lib/design-tokens/workspace-dashboard.ts`)

| Export | Bedeutung |
|--------|-----------|
| `WORKSPACE_NAV_WIDTH_EXPANDED_PX` / `COLLAPSED_PX` | 240 / 68 |
| `WORKSPACE_SIDEBAR_TRANSITION_MS` | 300 — Sidebar-Breite + `layoutMini`-Delay |
| `workspaceSidebarLabelTransitionClass` | Label-Opacity 300ms |
| `workspaceSidebarNavItemWidthTransitionClass` | Nav-Zeilen `max-width` 300ms (mit Sidebar) |
| `workspacePortalTopBarHeightTransitionClass` | *(später)* Portal Top-Bar Höhe 300ms |
| `DASHBOARD_DETAIL_PANEL_RIM_WIDTH_CLASS` | *(später)* `w-3` Rim vor vollem Panel |
| `DASHBOARD_DETAIL_PANEL_WIDTH_CLASS` | `w-[330px]` — Antragdetails-Spalte |
| `workspaceDetailPanelWidthTransitionClass` | *(später)* Panel-Breite 300ms |
| `workspaceDetailPanelContentTransitionClass` | *(später)* Panel-Inhalt Opacity 200ms |
| `DASHBOARD_SIDEBAR_PADDING_CLASS` | `pl-[18px] py-3` |
| `DASHBOARD_SHELL_CONTENT_ROW_PADDING_CLASS` | `px-6` |
| `DASHBOARD_SHELL_MAIN_PANEL_PADDING_CLASS` | `""` — horizontal/oben am Scroll (`dashboardMainPanelScrollAreaClass`) |
| `DASHBOARD_SHELL_MAIN_PANEL_PADDING_OPEN_CLASS` | `""` — Antrag geöffnet; Inset am Page-Scroll (`applicationReviewScrollAreaClass` für Review) |
| `dashboardMainPanelContentInsetTopClass` | `pt-12` (48px) — Dashboard-Home Workspace + Portal |
| `applicationReviewContentInsetClass` | `px-12 pt-12` — Review / Portal-Adjustment / R4 |
| `DASHBOARD_SHELL_CONTENT_ROW_PADDING_BOTTOM_INSET_CLASS` | `pb-6` — Inset-Modus |
| `DASHBOARD_SHELL_CONTENT_ROW_PADDING_BOTTOM_SCROLL_CLASS` | `pb-0` — Tight-Modus |
| `DASHBOARD_SHELL_MAIN_PANEL_ROUNDED_INSET_CLASS` | `rounded-xl` |
| `DASHBOARD_SHELL_MAIN_PANEL_ROUNDED_SCROLL_CLASS` | `rounded-t-xl` |
| `DASHBOARD_MAIN_PANEL_TIGHT_LAYOUT_ENTER_RATIO` | `0.9` — Einstieg Tight |
| `DASHBOARD_MAIN_PANEL_TIGHT_LAYOUT_EXIT_RATIO` | `0.82` — Rückkehr Inset (Hysterese) |
| `WORKSPACE_HOME_KPI_CARD_CLASS` | R2/R3: drei gleich breite KPI-Karten |
| `WORKSPACE_HOME_R4_OPEN_CARD_CLASS` / `WORKSPACE_HOME_R4_TASKS_CARD_CLASS` | R4: 7/10 + 3/10, **`h-[320px]`** |
| `WORKSPACE_HOME_R2R4_ASSIGNED_TASKS_CARD_CLASS` | R2R4: «Zugewiesene Aufgaben» 319px breit |
| `lib/workspace-role.ts` | `R2R4`, Capability-Flags, `statusAudienceForWorkspaceApplication` |
| `lib/workspace-application-visibility.ts` | R4-Listen-Whitelist, `canEditR4DecisionApplication` |
| `lib/workspace-nav-access.ts` | Sidebar «Beratungen planen» (R2/R3/R2R4) |
| `WORKSPACE_HOME_TABLE_PANEL_TOGGLE_BUTTON_CLASS` | Maximize/Minimize im Anträge-Panel |
| `WORKSPACE_HOME_TABLE_SEARCH_*` | Suche 320px, pill, transparent |
| `WORKSPACE_HOME_TABLE_FILTER_*` | Toggle Offen/Alle (Segment + Tab active/inactive) |
| `WORKSPACE_HOME_TABLE_OUTLINE_BUTTON_CLASS` | Filter + Liste herunterladen (outline, transparent) |
| `WORKSPACE_APPLICATIONS_TABLE_*` | Anträge-Tabelle Home + Meine Aufgaben: Container-Query 1150px, Fit-/Kompakt-Spalten, Actions `pl-2` |
| `DASHBOARD_NAV_ITEM_ACTIVE_CLASS` | `rounded-[7px] bg-primary text-primary-foreground` |
| `DASHBOARD_NAV_ITEM_IDLE_CLASS` | inaktiv + Hover |
| `DASHBOARD_NAV_ITEM_ACTIVE_LABEL_CLASS` | Label aktiv ohne `text-foreground-alt` |
| `DASHBOARD_DETAIL_PANEL_PADDING_CLASS` | `pl-6` (+ `gap-4` zwischen Karten in Shell) |
| `DASHBOARD_TOP_BAR_PADDING_CLASS` | `px-6 py-3` |
| `DASHBOARD_TOP_BAR_HEIGHT_CLASS` | `min-h-14` (Portal + Workspace) |
| `PORTAL_DASHBOARD_RIM_HEIGHT_CLASS` | `h-4` — Listen-Rand oben (`portal/home`) |
| `PORTAL_TOP_BAR_HEIGHT_CLASS` | `h-14` — Top-Bar (Referenz / späterer Morph) |
| `workspaceSidebarIconSlotClass` | 40×40 Flex-Slot für Logo/Nav-Icon |
| `workspaceSidebarToggleBaseClass` / `HoverClass` | 32×32 Badge; Hover nur wenn erlaubt |

---

## 9. Checkliste für Änderungen

1. **Neue Nav-Einträge:** `topItems` / `bottomItems` in `PortalDashboardShell` oder `WorkspaceDashboardShell` — nicht in `DashboardShell` hardcoden.
2. **Aktiv-Zustand Portal:** Wenn eine Route thematisch zu «Meine Anträge» gehört, in `useDashboardNavActive` ergänzen (wie `PORTAL_APPLICATION_DETAIL_PREFIX`).
3. **R1-Flow:** Keine `RoleDashboardLayout`-Hülle um `NtaAntragDesktop` — Flow behält `r1-application-flow-layout.tsx`.
4. **Top-Bar / Detail-Panel:** Standard ist **sofortiges** Einblenden; Morph-Animationen nur bewusst reaktivieren (§ 4 «Geplant», § 6 «Geplant»).
5. **Detail-Panel:** Registrierung über `useRegisterDashboardDetailPanel` mit stabiler **Signatur** — kein JSX direkt in Context-State.
6. **Icon-Ausrichtung:** Kein `justify-center` auf Nav-Zeilen beim Einklappen — Slot-System beibehalten.
7. **Inhalts-Panel:** Im **Tight**-Modus nur `rounded-t-xl`; im **Inset**-Modus `rounded-xl` (unten `pb-6` in der Content-Zeile). Nicht manuell zwischen `pb-4`/`pb-0` toggeln — `DashboardMainPanel` + Hysterese-Tokens nutzen.
8. **Nav aktiv:** Label immer `DASHBOARD_NAV_ITEM_ACTIVE_LABEL_CLASS` — kein `hfTypography.*` mit festem `text-foreground-alt` auf dem aktiven Eintrag.

---

## 10. Verwandte Kontext-Dateien

| Datei | Inhalt |
|-------|--------|
| `General_Prototype_Kontext.md` | Architektur, Rollen, Code-Index |
| `Antragerstellung_Kontext.md` | R1-Routen, Flow vs. Dashboard, Daten |
| `Antrag_Review_Kontext.md` | Block-Review, `PortalApplicationAdjustment`, Workspace-Toolbar |
| `Antrag_Bewilligung_Kontext.md` | R4 in derselben Workspace-Shell |
| `High_Fidelity_Design_Kontext.md` | HF-Tokens, Grid, **R1-Flow**-Shell (nicht Dashboard-Shell) |

---

*Letzte Aktualisierung: § **4b** Test-Accounts & Berechtigungs-Matrix (R4 / R2R4 / Routing); Detail-Panel-Persistenz; R4 KPI 320px; Meine Aufgaben; Anträge-Toolbar/Maximize.*
