import { APPLICATION_CONTENT_PANEL_CARD_CLASS } from "@/lib/design-tokens/application-content-panel";

/** Äusserer Container — Figma `5858:22820` / `5866:2021`, globaler Shadow. */
export const REVIEW_BEMERKUNGEN_PANEL_CLASS = [
  APPLICATION_CONTENT_PANEL_CARD_CLASS,
  "flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 p-4",
].join(" ");

/** R2 — einzelne Bemerkung (`5866:2025`). */
export const REVIEW_BEMERKUNGEN_ITEM_CLASS =
  "flex flex-col gap-4 rounded-xl border border-border bg-stone-50 px-3 py-4";

/** R1 — Anpassung ausstehend (`5858:22824`). */
export const REVIEW_BEMERKUNGEN_ITEM_R1_PENDING_CLASS =
  "flex flex-col gap-4 rounded-xl border border-adjustment-500 bg-adjustment-50 px-3 py-4";

/** R1 — Block angepasst (`5858:22852`). */
export const REVIEW_BEMERKUNGEN_ITEM_R1_DONE_CLASS =
  "flex flex-col gap-4 rounded-xl border border-border bg-background px-3 py-4";

/** Vertikaler Akzent links neben dem Bemerkungstext. */
export const REVIEW_BEMERKUNGEN_ACCENT_BAR_CLASS =
  "w-0.5 shrink-0 self-stretch rounded-full bg-adjustment-500";

/** Blocktitel im R1-Karteninhalt — Figma `pl-[16px]`. */
export const REVIEW_BEMERKUNGEN_R1_BLOCK_TITLE_CLASS =
  "pl-4 text-hf-paragraph-medium text-foreground";

/** R1-Avatar — Figma 40×40. */
export const REVIEW_BEMERKUNGEN_R1_AVATAR_CLASS =
  "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-150 text-hf-paragraph-small-medium text-foreground";

/** «Angepasst»-Label unten rechts — Figma `5858:22869`. */
export const REVIEW_BEMERKUNGEN_R1_DONE_LABEL_CLASS =
  "inline-flex items-center gap-2 text-hf-paragraph-small-medium text-adjustment-500";
