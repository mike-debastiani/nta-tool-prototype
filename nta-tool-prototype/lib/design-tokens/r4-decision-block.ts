/**
 * R4 Bewilligung — Figma BA-Prototyp-High-Fi.
 * Staff-bestätigte Blöcke: `5641:23410`; Entscheid-Blöcke: `5657:17967`, `5907:23351`, `5657:18077`.
 */

import {
  REVIEW_BLOCK_ACTION_FOOTER_BAR_CLASS,
  REVIEW_BLOCK_BODY_CLASS,
  REVIEW_BLOCK_CONFIRMED_CLASS,
  REVIEW_BLOCK_CONFIRMED_FOOTER_CLASS,
  REVIEW_BLOCK_DEFAULT_CLASS,
} from "@/lib/design-tokens/review-block";

/** Antragsteller, Attest, Definition, Empfehlung — neutral, Fachstelle bestätigt (`5641:23410`). */
export const R4_FACULTY_CONFIRMED_BLOCK_CLASS = REVIEW_BLOCK_DEFAULT_CLASS;

/** Bearbeitbarer Entscheid-Block — offen (`5657:17967`, `5907:23351`). */
export const R4_DECISION_BLOCK_EDITING_CLASS = REVIEW_BLOCK_DEFAULT_CLASS;

/** Nach «Auswahl bestätigen» (`5657:18077`). */
export const R4_DECISION_BLOCK_CONFIRMED_CLASS = REVIEW_BLOCK_CONFIRMED_CLASS;

export const R4_DECISION_BLOCK_BODY_CLASS = REVIEW_BLOCK_BODY_CLASS;

/** Zeilenliste — `gap-8` zwischen Optionen (`xs`). */
export const R4_DECISION_ROW_LIST_CLASS = "flex flex-col gap-2";

/** Freitext-Vorschlag unter den Optionen (`5907:23378`). */
export const R4_DECISION_PROPOSAL_INPUT_CLASS =
  "flex min-h-12 w-full items-start gap-2 rounded-[10px] border border-border bg-background px-3 py-2 shadow-xs";

/** Rich-Radio-Zeile — `gap-24` Inhalt ↔ Schalter (`xl`). */
export const R4_DECISION_ROW_CLASS =
  "flex items-center gap-6 rounded-[10px] border border-border pl-3 pr-2 py-3";

/**
 * Schalter + Label — feste Breite, Schalter linksbündig (Figma Switch Group `125px`).
 */
export const R4_DECISION_SWITCH_GROUP_CLASS =
  "flex h-6 w-[125px] shrink-0 items-center gap-2";

export const R4_DECISION_ROW_TITLE_CLASS =
  "text-sm font-normal leading-5 text-foreground";

export const R4_DECISION_ROW_DESCRIPTION_CLASS =
  "text-xs leading-4 text-muted-foreground";

export const R4_DECISION_ROW_LABEL_ACTIVE_CLASS =
  "shrink-0 text-sm font-medium text-foreground";

export const R4_DECISION_ROW_LABEL_MUTED_CLASS =
  "shrink-0 text-sm font-medium text-muted-foreground";

/** Footer «Von Fachstelle bestätigt» (`5641:23436`). */
export const R4_FACULTY_CONFIRMED_FOOTER_CLASS =
  `${REVIEW_BLOCK_ACTION_FOOTER_BAR_CLASS} justify-end bg-stone-100 px-5`;

export const R4_FACULTY_CONFIRMED_FOOTER_LABEL_CLASS =
  "inline-flex items-center gap-2 text-sm font-medium text-muted-foreground";

/** Footer offen / dirty (`5811:3319`, `5907:23380`). */
export const R4_DECISION_EDITING_FOOTER_CLASS =
  `${REVIEW_BLOCK_ACTION_FOOTER_BAR_CLASS} justify-between gap-3 bg-stone-50 px-5`;

/** Footer bestätigt (`5657:18106`). */
export const R4_DECISION_CONFIRMED_FOOTER_CLASS = REVIEW_BLOCK_CONFIRMED_FOOTER_CLASS;

export const R4_DECISION_CONFIRM_SELECTION_BUTTON_CLASS =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40";

export const R4_DECISION_RESET_BUTTON_CLASS =
  "inline-flex h-9 shrink-0 items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80 disabled:opacity-40";

export const R4_DECISION_EDIT_BLOCK_BUTTON_CLASS =
  "inline-flex h-9 shrink-0 items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80";

export const R4_DECISION_CONFIRMED_STATUS_CLASS =
  "inline-flex items-center gap-2 text-sm font-medium text-bewilligt-600";

/** Zeilen-Hintergrund je Badge (Figma Rich Radio Group). */
export const R4_DECISION_ROW_SURFACE_CLASS = {
  bewilligt: "bg-bewilligt-50",
  abgelehnt: "bg-abgelehnt-50",
  vorschlag: "bg-adjustment-50",
  vorschlagen: "bg-stone-50",
} as const;
