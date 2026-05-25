/**
 * Scrollbare weisse Inhaltsflächen — Läufer-Optik in `high-fidelity-content-panel.css`.
 *
 * Läufer-Position und Inhalts-Padding sind getrennt:
 * - Inhalt: 24px zum Panel-Rand (`pl-6` links, `pr-4` + `mr-2` rechts = 8+16px)
 * - Läufer: `mr-2` am Scroll-Viewport (8px zum Panel-Rand)
 */

/** Einheitlicher Läufer (6px, stone-300, Abstand oben/unten am Track). */
export const applicationContentScrollClass = "hf-content-panel-scroll";

/** Scroll-Viewport: 8px Abstand Läufer ↔ rechter Panel-Rand (`--hf-scrollbar-gutter`). */
export const whitePanelScrollViewportMarginClass = "mr-2";

/**
 * Horizontaler Inhalts-Innenabstand im Scroll-Viewport (bei gesetztem `mr-2`).
 * Links 24px (`pl-6`); rechts 16px (`pr-4`) + 8px Viewport-Margin = 24px zum Panel.
 */
export const whitePanelScrollContentInsetXClass = "pl-6 pr-4";

/** Basis-Layout für vertikale Scroll-Areas im weissen Panel. */
export const whitePanelScrollAreaBaseClass =
  "min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain";

/** Scroll-Viewport inkl. Läufer-Position (ohne Inhalts-Padding). */
export const whitePanelScrollViewportClass = [
  whitePanelScrollAreaBaseClass,
  applicationContentScrollClass,
  whitePanelScrollViewportMarginClass,
].join(" ");

/** @deprecated Nur noch für Kompatibilität — bitte Viewport + Inset-Klassen nutzen. */
export const whitePanelScrollbarGutterClass = whitePanelScrollViewportMarginClass;

/**
 * Dashboard-Home (Workspace & Portal «Meine Anträge») — Figma `p-48` oben.
 * Läufer-Abstand oben/unten am Track: `.hf-content-panel-scroll` (`margin-block: 1rem`).
 */
export const dashboardMainPanelContentInsetTopClass = "pt-12";

export const dashboardMainPanelScrollAreaClass = [
  whitePanelScrollViewportClass,
  whitePanelScrollContentInsetXClass,
  dashboardMainPanelContentInsetTopClass,
  "pb-6",
].join(" ");

/**
 * Review / Portal-Adjustment / R4 — Figma `5623:17867` (`p-48`, `gap-32` zum Block-Stack).
 * Horizontal: 48px; Läufer bleibt im Viewport-`mr-2`.
 */
export const applicationReviewContentInsetClass = "px-12 pt-12";

/** Abstand Header/Callout → erster Review-Block (32px). */
export const applicationReviewSectionGapClass = "gap-8";

/** Review / Portal-Adjustment / R4 (edge-to-edge). */
export const applicationReviewScrollAreaClass = [
  whitePanelScrollViewportClass,
  applicationReviewContentInsetClass,
  "pb-8",
].join(" ");

/**
 * Graue Antragdetails-Spalte: 24px links; rechts kein Container-Padding (Läufer am Spaltenrand).
 */
export const detailPanelContentInsetXClass = "pl-6";

/** Spalten-Scroll ohne `mr-2` — kein zusätzlicher rechter Innenabstand am Leistencontainer. */
export const detailPanelScrollAreaClass = [
  whitePanelScrollAreaBaseClass,
  applicationContentScrollClass,
  "flex flex-col gap-4",
].join(" ");
