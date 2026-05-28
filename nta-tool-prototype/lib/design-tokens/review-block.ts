/**
 * Review-Block — Figma BA-Prototyp-High-Fi (Nodes 5641:21990, 5641:21952, …).
 * Inhalte der Blöcke sind formularabhängig; Layout/Typo/Footer-States sind fix.
 */

/** Default / R1 neutral (`5641:21990`). */
export const REVIEW_BLOCK_DEFAULT_CLASS =
  "overflow-hidden rounded-xl border border-border bg-background";

/** R2 pending (`5641:21952`). */
export const REVIEW_BLOCK_PENDING_CLASS =
  "overflow-hidden rounded-xl border border-border bg-background";

/** Schreiben einer Bemerkung (`5641:22599`). */
export const REVIEW_BLOCK_COMPOSER_CLASS =
  "overflow-hidden rounded-xl border border-adjustment-500 bg-background";

/** Bestätigt (`5641:22807`). */
export const REVIEW_BLOCK_CONFIRMED_CLASS =
  "overflow-hidden rounded-xl border border-bewilligt-600 bg-background";

/** Anpassung mit Bemerkung, bearbeitbar (`5641:22767`). */
export const REVIEW_BLOCK_ADJUSTMENT_ACTIVE_CLASS =
  "overflow-hidden rounded-xl border border-adjustment-500 bg-background";

/** Anpassung an R1 übermittelt (`5657:1673`). */
export const REVIEW_BLOCK_ADJUSTMENT_SENT_CLASS =
  "overflow-hidden rounded-xl border border-adjustment-500 bg-background";

/** Block-Inhalt: `p-24`, Titel↔Grid `gap-16` (Figma xl / md). */
export const REVIEW_BLOCK_BODY_CLASS = "flex flex-col gap-4 p-6";

/** 2-Spalten-Feldgrid (`gap-12`). */
export const REVIEW_BLOCK_FIELD_GRID_CLASS =
  "grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2";

/**
 * Einzeilige Aktionsleiste (ohne Textarea/Bemerkung im Footer): fest 52px.
 * Nicht auf Composer- oder Bemerkungs-Footer anwenden.
 */
export const REVIEW_BLOCK_ACTION_FOOTER_BAR_CLASS =
  "flex h-[52px] w-full shrink-0 items-center border-t border-border";

/** Pending-Footer: geteilte Leiste (Figma `5641:21978`). */
export const REVIEW_BLOCK_PENDING_FOOTER_CLASS =
  `${REVIEW_BLOCK_ACTION_FOOTER_BAR_CLASS} items-stretch`;

export const REVIEW_BLOCK_PENDING_ADJUST_CLASS =
  "flex h-full min-w-9 flex-1 items-center justify-center gap-1 rounded-bl-xl bg-adjustment-200 px-2 text-sm font-medium text-foreground transition-colors hover:bg-adjustment-300";

export const REVIEW_BLOCK_PENDING_CONFIRM_CLASS =
  "flex h-full min-w-9 flex-1 items-center justify-center gap-1 rounded-br-xl border-l border-border bg-bewilligt-200 px-2 text-sm font-medium text-foreground transition-colors hover:bg-bewilligt-300";

/** Nur-Status / «Nur Ansicht» — 52px. */
export const REVIEW_BLOCK_READONLY_STATUS_FOOTER_CLASS =
  `${REVIEW_BLOCK_ACTION_FOOTER_BAR_CLASS} px-5 text-sm text-muted-foreground`;

/** Composer-Footer (`5641:22599`): Textarea — Höhe variabel. */
export const REVIEW_BLOCK_COMPOSER_FOOTER_CLASS =
  "flex flex-col gap-4 border-t border-border bg-stone-50 px-5 py-4";

/** Einzeiliger Start, wächst mit Inhalt; Platzhalter muted, Eingabe `foreground`. */
export const REVIEW_BLOCK_COMPOSER_INPUT_CLASS =
  "block w-full min-h-5 resize-none overflow-hidden border-0 bg-transparent p-0 shadow-none text-sm leading-5 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0";

/** Bestätigt-Footer (`5641:22807`): bewilligt-200, 52px. */
export const REVIEW_BLOCK_CONFIRMED_FOOTER_CLASS =
  `${REVIEW_BLOCK_ACTION_FOOTER_BAR_CLASS} justify-between gap-3 bg-bewilligt-200 px-5`;

/** Anpassung mit Bemerkung im Footer (`5641:22767`, `5657:1673`) — Höhe variabel. */
export const REVIEW_BLOCK_ADJUSTMENT_FOOTER_CLASS =
  "flex flex-col gap-4 border-t border-border bg-adjustment-100 px-5 py-4";

export const REVIEW_BLOCK_REMARK_TEXT_CLASS =
  "whitespace-pre-wrap text-sm leading-5 text-adjustment-700";

export const REVIEW_BLOCK_REMARK_LABEL_CLASS =
  "text-sm font-medium text-adjustment-700";

/** Gesperrte Fachstellen-Bemerkung nach R1-Freigabe — Band vor Pending-Footer (`5905:23340`). */
export const REVIEW_BLOCK_LOCKED_REMARK_BAND_CLASS =
  "flex flex-col gap-1 border-t border-border bg-adjustment-100 px-5 py-4";

export const REVIEW_BLOCK_LOCKED_REMARK_TITLE_CLASS =
  "text-hf-paragraph-small-medium text-adjustment-700";

export const REVIEW_BLOCK_LOCKED_REMARK_BODY_CLASS =
  "whitespace-pre-wrap text-hf-paragraph-small text-adjustment-700";

/**
 * R2 Re-Review — Umschalter Aktuell/Verlauf im Block-Header.
 * Figma `6192:3836` (aktuell aktiv) · `6193:22254` (Verlauf aktiv).
 * Shell: border, `p-3xs` (2px), `rounded-full`.
 */
export const REVIEW_BLOCK_HISTORY_TOGGLE_SHELL_CLASS =
  "flex shrink-0 items-center rounded-full border border-border p-0.5";

/** Gemeinsame Tab-Basis: `min-h/w-20px`, Icon `16px`, `gap-2xs` (4px). */
export const REVIEW_BLOCK_HISTORY_TOGGLE_TAB_BASE_CLASS =
  "flex min-h-5 min-w-5 shrink-0 items-center justify-center gap-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export const REVIEW_BLOCK_HISTORY_TOGGLE_TAB_ICON_CLASS = "size-4 shrink-0";

/** Aktuell aktiv — `graustufen/stone/150`, `p-6px`, `rounded-full`. */
export const REVIEW_BLOCK_HISTORY_TOGGLE_TAB_CURRENT_ACTIVE_CLASS =
  "rounded-full bg-stone-150 p-1.5 text-foreground";

/** Aktuell inaktiv (Verlauf aktiv) — kein Fill, `p-6px`, `rounded-full`. */
export const REVIEW_BLOCK_HISTORY_TOGGLE_TAB_CURRENT_INACTIVE_CLASS =
  "rounded-full p-1.5 text-muted-foreground";

/** Verlauf aktiv — `a-und-r-erforderlich/100`, Icon/Text `erforderlich-700`. */
export const REVIEW_BLOCK_HISTORY_TOGGLE_TAB_HISTORY_ACTIVE_CLASS =
  "rounded-full bg-adjustment-100 p-1.5 text-adjustment-700";

/** Verlauf inaktiv (aktuell aktiv) — kein Fill, `px-6px` `py-1px`, `rounded-md`. */
export const REVIEW_BLOCK_HISTORY_TOGGLE_TAB_HISTORY_INACTIVE_CLASS =
  "rounded-md px-1.5 py-px text-muted-foreground";

/** «Angeforderte Anpassung» vor Pending-Footer in Verlaufsansicht (`6193:22256`). */
export const REVIEW_BLOCK_REQUESTED_ADJUSTMENT_BAND_CLASS =
  "flex flex-col gap-1 border-t border-border bg-adjustment-100 px-5 py-4";

export const REVIEW_BLOCK_REQUESTED_ADJUSTMENT_TITLE_CLASS =
  "text-sm font-medium leading-5 text-adjustment-700";

export const REVIEW_BLOCK_REQUESTED_ADJUSTMENT_BODY_CLASS =
  "whitespace-pre-wrap text-sm font-normal leading-5 text-adjustment-700";

/** «Angepasst»-Marker an geänderten Auswahloptionen (`6195:22506`). */
export const REVIEW_BLOCK_RE_REVIEW_ADJUSTED_MARKER_CLASS =
  "shrink-0 text-hf-paragraph-mini font-medium text-muted-foreground";

/** Re-Review Verlauf — gewählte Option (gleiches Layout wie R1 gewählt, ohne Border). */
export const REVIEW_BLOCK_RE_REVIEW_HISTORY_OPTION_SELECTED_SHELL_CLASS =
  "flex gap-3 rounded-[10px] bg-adjustment-100 px-3 py-3";

export const REVIEW_BLOCK_RE_REVIEW_HISTORY_OPTION_SELECTED_TEXT_CLASS =
  "text-adjustment-700";
