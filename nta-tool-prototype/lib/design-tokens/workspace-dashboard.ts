/** Workspace dashboard shell (Figma 5354:9951 nav_max, 5354:10586 nav_mini). */

export { APPLICATION_CONTENT_PANEL_SHADOW_CLASS } from "@/lib/design-tokens/application-content-panel";

/** Navigations-Sidebar: links 18px, oben/unten 12px (`py-3`). */
export const DASHBOARD_SIDEBAR_PADDING_CLASS = "py-3 pl-[18px]";

/** Nav-Item aktiv (Figma `5509:11682` — `general/primary`). */
export const DASHBOARD_NAV_ITEM_ACTIVE_CLASS =
  "rounded-[7px] bg-primary text-primary-foreground hover:bg-stone-600";

/** Nav-Item inaktiv — unveränderte Layout-Klassen (`NAV_ITEM_BASE` in Shell). */
export const DASHBOARD_NAV_ITEM_IDLE_CLASS =
  "rounded-md text-foreground-alt hover:bg-stone-150/80";

/** Nav-Label aktiv — ohne `text-foreground-alt` aus `hfTypography`, damit Primary-Foreground greift. */
export const DASHBOARD_NAV_ITEM_ACTIVE_LABEL_CLASS =
  "text-hf-paragraph-small-medium text-primary-foreground";

/** Zeile mit weissem Hauptpanel + Antragdetails-Spalte (24px zum Viewport-Rand). */
export const DASHBOARD_SHELL_CONTENT_ROW_PADDING_CLASS = "px-6";

/** Weisses Inhalts-Panel — kein Container-Padding; Inset am Scroll-Viewport (`dashboardMainPanelScrollAreaClass`). */
export const DASHBOARD_SHELL_MAIN_PANEL_PADDING_CLASS = "";

/** Inhalt passt ohne Scroll: unterer Rand der Content-Zeile (= 24px) + `rounded-xl`. */
export const DASHBOARD_SHELL_CONTENT_ROW_PADDING_BOTTOM_INSET_CLASS = "pb-6";
export const DASHBOARD_SHELL_MAIN_PANEL_ROUNDED_INSET_CLASS = "rounded-xl";

/** Inhalt scrollt: Panel bis unten, nur oben abgerundet. */
export const DASHBOARD_SHELL_CONTENT_ROW_PADDING_BOTTOM_SCROLL_CLASS = "pb-0";
export const DASHBOARD_SHELL_MAIN_PANEL_ROUNDED_SCROLL_CLASS = "rounded-t-xl";

/**
 * Weisses Panel: ab diesem Verhältnis `scrollHeight / clientHeight` → „tight“ Layout
 * (kein `pb-4`, nur `rounded-t-xl`). Höher als striktes Overflow, damit knapp-passender
 * Inhalt nicht mit dem Padding-Umschalten flackert.
 */
export const DASHBOARD_MAIN_PANEL_TIGHT_LAYOUT_ENTER_RATIO = 0.9;

/** Unter dieser Ratio wieder Inset-Layout — niedriger als ENTER wegen Hysterese (Padding ändert clientHeight). */
export const DASHBOARD_MAIN_PANEL_TIGHT_LAYOUT_EXIT_RATIO = 0.82;

/** Weisses Inhalts-Panel, wenn Antrag geöffnet (Inset am Page-Scroll des Kindes). */
export const DASHBOARD_SHELL_MAIN_PANEL_PADDING_OPEN_CLASS = "";

/** Antragdetails-Spalte: horizontaler Inset am Scroll-Viewport (`pl-6 pr-4` + `mr-2`). */
export const DASHBOARD_DETAIL_PANEL_PADDING_CLASS = "";

/** Top-Leiste Portal / Workspace: 24px seitlich, 12px oben/unten. */
export const DASHBOARD_TOP_BAR_PADDING_CLASS = "px-6 py-3";
export const DASHBOARD_TOP_BAR_HEIGHT_CLASS = "min-h-14";

export const WORKSPACE_NAV_WIDTH_EXPANDED_PX = 240;
export const WORKSPACE_NAV_WIDTH_COLLAPSED_PX = 68;

/** Dauer der Sidebar-Breiten-Transition — Layout-Mini erst danach umschalten. */
export const WORKSPACE_SIDEBAR_TRANSITION_MS = 300;

export const workspaceSidebarLabelTransitionClass =
  "transition-opacity duration-300 ease-out";

/** Nav-Zeilen: `max-width` folgt der schrumpfenden Sidebar (`w-full` + `max-w-10`). */
export const workspaceSidebarNavItemWidthTransitionClass =
  "transition-[max-width] duration-300 ease-out";

/** Portal: 12px-Rand oben (Dashboard) ↔ volle Top-Bar (Antrag geöffnet). */
export const PORTAL_DASHBOARD_RIM_HEIGHT_CLASS = "h-4";
export const PORTAL_TOP_BAR_HEIGHT_CLASS = "h-14";

/** Rechtes Panel — volle Breite (Figma 5435:11416). Ist-Zustand: sofort `w-0` ↔ diese Breite. */
export const DASHBOARD_DETAIL_PANEL_WIDTH_CLASS = "w-[330px]";

/** Später: 12px-Rim vor vollem Panel (Morph w-3 → w-[330px]). */
export const DASHBOARD_DETAIL_PANEL_RIM_WIDTH_CLASS = "w-3";

/** Später: Breiten-Morph des Detail-Panels (300ms). */
export const workspaceDetailPanelWidthTransitionClass =
  "transition-[width] duration-300 ease-out";

/** Später: Opacity-Fade des Panel-Inhalts (200ms). */
export const workspaceDetailPanelContentTransitionClass =
  "transition-opacity duration-200 ease-out";

/** Später: Höhen-Morph Portal Top-Bar h-3 → h-14 (gleiche Dauer wie Sidebar). */
export const workspacePortalTopBarHeightTransitionClass =
  "transition-[height] duration-300 ease-out";

export const workspaceNavWidthClass = (collapsed: boolean) =>
  collapsed ? "w-[68px]" : "w-[240px]";

/** Figma iconBadge: 32×32, stone-200, 16px-Icon. */
export const workspaceSidebarToggleBaseClass =
  "z-30 flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-200 p-2 text-foreground-alt";

/** Nur Aufklappen-Button & Einklappen im aufgeklappten Zustand — nie bei `collapsed`. */
export const workspaceSidebarToggleHoverClass =
  "opacity-0 invisible transition-[opacity,visibility] duration-200 group-hover/sidebar:visible group-hover/sidebar:opacity-100 group-hover/brand:visible group-hover/brand:opacity-100 focus-visible:visible focus-visible:opacity-100";

/** Brand-Zeile: identische Höhe aufgeklappt / eingeklappt (Figma py-1 + 40px Logo). */
export const WORKSPACE_BRAND_ROW_CLASS = "relative flex w-full shrink-0 items-center";

/** Logo + Nav-Icons: 40×40 (size-10), gleiche horizontale Achse in nav_max & nav_mini. */
export const WORKSPACE_SIDEBAR_ICON_SLOT_PX = 40;

/** Logo + Nav: 40×40-Box, 16×16-Icon zentriert — kein zusätzlicher linker Offset. */
export const workspaceSidebarIconSlotClass =
  "flex size-10 shrink-0 items-center justify-center";

/** Workspace-Home, erste Zeile: Abstand zwischen den drei KPI-Karten (24px). */
export const WORKSPACE_HOME_KPI_ROW_GAP_CLASS = "gap-6";

/**
 * Workspace-Home, erste Zeile: gleiche Breite für alle drei KPI-Karten.
 * `flex-1 basis-0` teilt die verfügbare Zeilenbreite minus `WORKSPACE_HOME_KPI_ROW_GAP_CLASS` zu gleichen Teilen.
 */
export const WORKSPACE_HOME_KPI_CARD_CLASS =
  "min-h-[220px] min-w-0 flex-1 basis-0 self-stretch";

/**
 * R4 Home (Figma `5948:27359`): «Alle Anträge» 7/10, «Zugewiesene Aufgaben» 3/10
 * der Zeilenbreite minus `WORKSPACE_HOME_KPI_ROW_GAP_CLASS`.
 */
export const WORKSPACE_HOME_R4_OPEN_CARD_CLASS =
  "h-[320px] min-w-0 shrink-0 flex-[7] basis-0";

export const WORKSPACE_HOME_R4_TASKS_CARD_CLASS =
  "h-[320px] min-w-0 shrink-0 flex-[3] basis-0";

/** Figma `5949:3192` (Dashboard_R2/R4): «Zugewiesene Aufgaben» feste Breite. */
export const WORKSPACE_HOME_R2R4_ASSIGNED_TASKS_CARD_CLASS =
  "min-h-[220px] w-[319px] shrink-0 self-stretch";

/** Figma `5948:27469` / `5955:21930` — Maximize/Minimize oben rechts im Anträge-Panel. */
export const WORKSPACE_HOME_TABLE_PANEL_TOGGLE_BUTTON_CLASS =
  "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary p-2 text-primary-foreground transition-colors hover:bg-stone-600";

/** Figma `5948:27470` — Toolbar-Zeile im Anträge-Panel. */
export const WORKSPACE_HOME_TABLE_TOOLBAR_ROW_CLASS =
  "flex w-full shrink-0 flex-wrap items-center justify-between gap-4";

export const WORKSPACE_HOME_TABLE_TOOLBAR_LEFT_CLASS =
  "flex min-w-0 flex-1 flex-wrap items-center gap-4";

/** Suche `5957:22502` — 320×36px, pill, border. */
export const WORKSPACE_HOME_TABLE_SEARCH_WRAPPER_CLASS =
  "relative w-full max-w-[320px] min-w-[200px] shrink-0";

export const WORKSPACE_HOME_TABLE_SEARCH_INPUT_CLASS = [
  "h-9 min-h-9 w-full rounded-full border-border bg-transparent py-[7.5px] pl-10 pr-3",
  "text-hf-paragraph-small text-foreground shadow-none",
  "placeholder:text-muted-foreground",
  "focus:border-ring focus:ring-3 focus:ring-ring/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
].join(" ");

/** Toggle `5948:27474` — Segment-Container. */
export const WORKSPACE_HOME_TABLE_FILTER_TOGGLE_CLASS =
  "flex shrink-0 items-center rounded-full border border-border p-[3px]";

/** Aktiver Tab — `bg-primary`, `primary-foreground` (Figma `5948:27475`). */
export const WORKSPACE_HOME_TABLE_FILTER_TAB_ACTIVE_CLASS =
  "min-h-[29px] rounded-full border border-border bg-primary px-2 py-1 text-primary-foreground hover:bg-stone-600";

/** Inaktiver Tab — `rounded-[10px]`, muted (Figma `5948:27478`). */
export const WORKSPACE_HOME_TABLE_FILTER_TAB_INACTIVE_CLASS =
  "min-h-[29px] rounded-[10px] px-2 py-1 text-muted-foreground";

/** Filter + Liste herunterladen `5948:27481` / `5948:27482`. */
export const WORKSPACE_HOME_TABLE_OUTLINE_BUTTON_CLASS =
  "inline-flex h-9 min-h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-transparent px-4 py-2 shadow-none transition-colors hover:bg-stone-150";

export const WORKSPACE_HOME_TABLE_DOWNLOAD_BUTTON_CLASS =
  WORKSPACE_HOME_TABLE_OUTLINE_BUTTON_CLASS;

/** Aktive Tabellenfilter als Pills unter der Toolbar. */
export const WORKSPACE_HOME_TABLE_FILTER_PILLS_ROW_CLASS =
  "flex w-full min-w-0 flex-wrap items-center gap-2";

export const WORKSPACE_HOME_TABLE_FILTER_PILL_CLASS = [
  "inline-flex h-8 max-w-full items-center gap-1 rounded-full bg-stone-200 py-1 pl-3 pr-1",
  "text-hf-paragraph-mini-medium text-foreground",
].join(" ");

/** «Alle Filter entfernen» unter aktiven Pills. */
export const WORKSPACE_HOME_TABLE_CLEAR_ALL_FILTERS_BUTTON_CLASS =
  "shrink-0 px-1 text-muted-foreground transition-colors hover:text-abgelehnt-500";

/**
 * Anträge-Tabelle (Home / Meine Aufgaben), Container-Query auf dem Scroll-Wrapper.
 *
 * **> 1150px (Fit):** volle Breite, kein horizontales Scrollen; kurze Spalten mit Mindestbreite,
 * **Studiengang** nimmt flexibel zu und darf umbrechen. Status-Pills nie umbrechen.
 *
 * **≤ 1150px (Kompakt):** feste Mindestbreite + horizontales Scrollen; gleiche Umbruch-Regel.
 */
export const WORKSPACE_APPLICATIONS_TABLE_CONTAINER_CLASS = [
  "@container/applications-table w-full min-w-0",
  "overflow-x-auto @min-[1151px]/applications-table:overflow-x-hidden",
].join(" ");

export const WORKSPACE_APPLICATIONS_TABLE_COMPACT_CONTAINER_MAX = "1150px";

export const WORKSPACE_APPLICATIONS_TABLE_COMPACT_QUERY =
  `@max-[${WORKSPACE_APPLICATIONS_TABLE_COMPACT_CONTAINER_MAX}]/applications-table` as const;

export const WORKSPACE_APPLICATIONS_TABLE_FIT_QUERY =
  "@min-[1151px]/applications-table" as const;

/** Summe der Spalten im Kompaktmodus inkl. etwas Luft für Fakultät/Datum; entspricht ca. 1186px @16px. */
export const WORKSPACE_APPLICATIONS_TABLE_MIN_WIDTH_CLASS = "min-w-[74.125rem]";

/** Menü-Spalte (3-Punkte): Icon + Abstand zu «Zugewiesen an», immer rechts (`sticky`). */
export const WORKSPACE_APPLICATIONS_TABLE_ACTIONS_COL_WIDTH = "3rem";

export const WORKSPACE_APPLICATIONS_TABLE_ACTIONS_HEADER_CLASS = [
  "sticky right-0 z-10 box-border w-12 min-w-12 max-w-12 bg-transparent p-0 pl-2 pr-2 align-middle",
].join(" ");

export const WORKSPACE_APPLICATIONS_TABLE_ACTIONS_CELL_CLASS = [
  "sticky right-0 z-10 box-border h-14 w-10 min-w-12 max-w-10 bg-transparent p-0 pl-2 pr-2 align-middle text-right",
].join(" ");

/**
 * Fit-Modus (>1150px): feste Breiten für kurze + Pill-Spalten; Name/Studiengang ohne width (Rest).
 * `statusLabel` breit genug für «Beratung & Empfehlung» ohne Überlappung.
 */
/** Längste Workspace-Labels: «Beratung & Empfehlung», «Anpassung erforderlich». */
export const WORKSPACE_APPLICATIONS_TABLE_STATUS_COL_WIDTH = "15rem";

/** Fit-Modus: Anteil für flexible Textspalten (Rest = feste/shrink-Spalten). */
export const WORKSPACE_APPLICATIONS_TABLE_FIT_COL_PERCENT = {
  applicantName: "13%",
  studiengang: "35%",
} as const;

export const WORKSPACE_APPLICATIONS_TABLE_FIT_COL_WIDTH = {
  /** «Fakultät» + Sort-Icon + Abstand zur nächsten Spalte. */
  fakultaet: "5.5rem",
  /** DD.MM.YYYY + Abstand vor Status-Badge. */
  date: "5.5rem",
  /** UI-Format NTA-YYYY-XXXX bleibt einzeilig stabil. */
  ref: "9rem",
  statusLabel: WORKSPACE_APPLICATIONS_TABLE_STATUS_COL_WIDTH,
  /** Längster Name in «Zugewiesen an» bestimmt die benötigte Mindestbreite. */
  assignee: "max-content",
} as const;

/** Feste Spaltenbreiten (Kompakt-Modus / Scroll); Studiengang ohne feste width. */
export const WORKSPACE_APPLICATIONS_TABLE_COL_WIDTH = {
  applicantName: "10.5rem",
  fakultaet: WORKSPACE_APPLICATIONS_TABLE_FIT_COL_WIDTH.fakultaet,
  ref: WORKSPACE_APPLICATIONS_TABLE_FIT_COL_WIDTH.ref,
  date: WORKSPACE_APPLICATIONS_TABLE_FIT_COL_WIDTH.date,
  statusLabel: WORKSPACE_APPLICATIONS_TABLE_FIT_COL_WIDTH.statusLabel,
  assignee: WORKSPACE_APPLICATIONS_TABLE_FIT_COL_WIDTH.assignee,
  actions: WORKSPACE_APPLICATIONS_TABLE_ACTIONS_COL_WIDTH,
  studiengangMin: "7rem",
} as const;

/** Mindestbreiten — nur Kompakt-Modus. */
export const WORKSPACE_APPLICATIONS_TABLE_COL_MIN_CLASS = {
  applicantName: "min-w-[10.5rem]",
  studiengang: "min-w-[7rem]",
  fakultaet: "min-w-[5.5rem] max-w-[5.5rem]",
  ref: "min-w-[9rem]",
  date: "min-w-[5.5rem] max-w-[5.5rem]",
  statusLabel: "min-w-[15rem]",
  assignee: "min-w-max",
  actions: "min-w-12 max-w-12",
} as const;

/** Zusätzlicher Abstand zwischen «Zugewiesen an» und Menü-Spalte. */
export const WORKSPACE_APPLICATIONS_TABLE_ASSIGNEE_CELL_CLASS = "pr-3";

export const WORKSPACE_HOME_TABLE_FILTER_PILL_REMOVE_CLASS =
  "flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-stone-200/90 hover:text-foreground";
