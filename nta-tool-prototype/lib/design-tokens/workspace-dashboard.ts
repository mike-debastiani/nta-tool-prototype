/** Workspace dashboard shell (Figma 5354:9951 nav_max, 5354:10586 nav_mini). */

export { APPLICATION_CONTENT_PANEL_SHADOW_CLASS } from "@/lib/design-tokens/application-content-panel";

/** Navigations-Sidebar: links 18px, oben/unten 12px (`py-3`). */
export const DASHBOARD_SIDEBAR_PADDING_CLASS = "py-3 pl-[18px]";

/** Nav-Item aktiv (Figma `5509:11682` — `general/primary`). */
export const DASHBOARD_NAV_ITEM_ACTIVE_CLASS =
  "rounded-[7px] bg-primary text-primary-foreground";

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
