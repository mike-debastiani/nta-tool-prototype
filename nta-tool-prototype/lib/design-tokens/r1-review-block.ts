/**
 * R1 Review-Block — Figma Nodes 5641:23258, 5641:23217, 5792:23157, 5657:18445.
 */

/** Bemerkung der Fachstelle — `adjustment-100`. */
export const R1_REVIEW_BLOCK_REMARK_SECTION_CLASS =
  "flex flex-col gap-1 border-t border-border bg-adjustment-100 px-5 py-4";

/** Aktionsleiste unten — `stone-50`, 52px. */
export const R1_REVIEW_BLOCK_ACTION_FOOTER_CLASS =
  "flex h-[52px] w-full shrink-0 items-center border-t border-border bg-stone-50 px-5";

/**
 * Read-only Auswahloptionen — R1/R2 Review & Anpassung (Figma Geltungsdauer / Gültigkeitsdauer).
 * Gewählt: leichter Stroke, weiss. Nicht gewählt: `stone-50`, ohne Border.
 */
export const R1_RICH_OPTION_SELECTED_LOCKED_CLASS =
  "flex gap-3 rounded-[10px] border border-border bg-background px-3 py-3";

export const R1_RICH_OPTION_UNSELECTED_LOCKED_CLASS =
  "flex gap-3 rounded-[10px] bg-stone-50 px-3 py-3 text-neutral-400";

/** Rich-Option im Bearbeitungsmodus (`5792:23163`). */
export const R1_RICH_OPTION_EDITABLE_CLASS =
  "flex w-full gap-3 rounded-[10px] border border-border bg-background px-3 py-3 text-left";

export const R1_RICH_OPTION_GROUP_CLASS = "flex flex-col gap-3";

export const R1_RICH_OPTION_STATUS_SELECTED_CLASS =
  "shrink-0 text-hf-paragraph-mini text-foreground";

export const R1_RICH_OPTION_STATUS_UNSELECTED_CLASS =
  "shrink-0 text-hf-paragraph-mini text-neutral-400";

/** Attest-Datei entfernen — nur Hover `abgelehnt-100` + `rounded-full` (Rest wie destructive-Link). */
export const R1_ATTEST_FILE_REMOVE_BUTTON_CLASS =
  "shrink-0 self-center rounded-full p-2 text-destructive/80 transition hover:bg-abgelehnt-100 hover:text-destructive";
