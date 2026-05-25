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
| `components/domain/workspace-home-dashboard.tsx` | Workspace-Home (Figma `5509:11682`); KPI-Zeile live (`OpenApplicationsSummaryCard`, `AssignedTasksSummaryCard`); Beratungen dieser Woche noch Mock |
| `components/domain/open-applications-summary-card.tsx` | KPI «Offene Antragsverfahren» (Chart-Ansichten, Live-Stats) |
| `components/domain/assigned-tasks-summary-card.tsx` | KPI «Zugewiesene Aufgaben» (Live-Zuweisung, rollenabhängig) |
| `components/domain/student-dashboard.tsx` | R1 Home «Meine Anträge» (Figma `5792:22019` / `5826:3088`); Cards/Table-Toggle, Live-Polling |
| `components/domain/r1-application-card.tsx` | R1-Antragkarte nach Status (Figma `5856:21926`); ganze Karte klickbar |
| `components/domain/r1-applications-table.tsx` | R1-Anträge-Tabelle; klickbare Zeilen |
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
| Beratungen planen | `/workspace?view=terminplaner` |
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

### Home-Dashboard

| Aspekt | Ist |
|--------|-----|
| **Figma** | `5509:11682` (Workspace Home) |
| **Route** | `/workspace` **ohne** `?view=` |
| **Rollen** | **R2, R3, R4** → `WorkspaceHomeDashboard`; **R5/R6** → weiterhin Inbox-Liste (`WorkspaceTestFlow`) |
| **Props** | `applications`, `workspaceRole`, `reviewerDisplayName`, `onSelectApplication` — aus `workspace-test-flow.tsx` |
| **KPI «Offene Antragsverfahren»** | Live (`computeOpenApplicationsStats`); Chart-Ansichten (Vertikal/Kreis/Horizontal/Kombiniert) |
| **KPI «Zugewiesene Aufgaben»** | Live (`computeAssignedTasksStats` + `resolveApplicationAssignee`); R2: Beratungen/Reviews; R3/R4: Entscheidungen; «+N seit Login» Mock |
| **KPI-Zeile Layout** | 3 gleich breite Spalten (`WORKSPACE_HOME_KPI_CARD_CLASS`, `gap-6`) |
| **Beratungen dieser Woche** | noch **Mock**-Terminzeilen |
| **Anträge-Tabelle** | echte `WorkspaceApplication[]` (Server-Liste + Realtime-Refresh wie Inbox) |
| **Tabellen-Spalten** | Name (`resolveApplicantDisplayName`), Studiengang, Antragsnummer (`workspaceApplicationListNumber` in `application-review-blocks.tsx`), Datum (`submittedAt` oder `updated_at`), Status (`getApplicationStatusMeta`), Zugewiesen an (`resolveApplicationAssignee`) |
| **Interaktion** | Zeile klickbar → `setSelectedApplicationId` → gleiche Review-/R4-Ansicht wie Inbox; Filter **Offen** (ohne bewilligt/abgelehnt) / **Alle**; lokale Suche |
| **Tabelle UI** | ein `border-b` pro Zeile (nicht pro Zelle); letzte Zeile ohne Divider |
| **Shell** | Default-Scroll mit `pt-12` am Viewport; kein `edgeToEdge` |

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
| **Table** | Spalten Antragsnummer, Einreichedatum, Gültigkeitsdauer, Gültig bis, Status; Header + Zeilen mit je einem `border-b` (letzte Zeile ohne); ganze Zeile klickbar |
| **Status-Pills auf Karten** | `R1_CARD_STATUS_BADGE_CLASS` (HF-pro Status, z. B. Beratung `beratung-100/500`) — kann von globalen Badges abweichen |
| **Interaktion** | Klick Karte/Zeile → `/portal/antragserstellung?applicationId=<uuid>`; «Neuer Antrag» → `?new=1` |

---

## 6. Rechtes Antragdetails-Panel

Gemeinsam für **Portal (Adjustment)** und **Workspace (Review, R4, …)** — nicht für den R1-Step-Flow ohne Dashboard-Shell.

### Mechanik

- Registrierung: `useRegisterDashboardDetailPanel(signature, render, enabled)` (`dashboard-detail-panel-context.tsx`).
- Shell rendert rechts neben dem weissen Inhalts-Panel eine Spalte auf **`bg-stone-100`** (Rahmen zum Viewport).
- **Geschlossen:** `w-0`, kein Inhalt.
- **Geöffnet:** **`w-[330px]`** (`DASHBOARD_DETAIL_PANEL_WIDTH_CLASS`) — Karte **Antragdetails** (Figma `5652:18411`, `application-details-card.tsx`, `hf-content-panel-card` + Shadow) + Kommentare/Kontakte je nach Page.

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

*Letzte Aktualisierung: R1 Home (Cards/Table, Live-Daten); Workspace-Home-KPIs «Offene Antragsverfahren» und «Zugewiesene Aufgaben» live; Scroll/Inset-Tokens für weisses Panel; Beratungen dieser Woche weiter Mock.*
