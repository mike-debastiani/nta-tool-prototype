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

/** Massnahmen-Block nach «Konkretisierung abschliessen» — grüner Rahmen (`6344:25081`). */
export const R4_DECISION_BLOCK_DEFINED_CLASS = REVIEW_BLOCK_CONFIRMED_CLASS;

/** Massnahmen-Block ohne bewilligte Massnahme — roter Rahmen (`6344:25421`). */
export const R4_DECISION_BLOCK_REJECTED_CLASS =
  "overflow-hidden rounded-xl border border-abgelehnt-600 bg-background";

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

/** Footer «Massnahmen definiert» (`6344:25108`) — wie Bestätigt-Footer (bewilligt-200). */
export const R4_DECISION_DEFINED_FOOTER_CLASS = REVIEW_BLOCK_CONFIRMED_FOOTER_CLASS;

export const R4_DECISION_DEFINED_STATUS_CLASS =
  "inline-flex items-center gap-2 text-sm font-medium text-bewilligt-600";

/** Footer «Massnahmen abgelehnt» (`6344:25439`) — abgelehnt-100. */
export const R4_DECISION_REJECTED_FOOTER_CLASS =
  `${REVIEW_BLOCK_ACTION_FOOTER_BAR_CLASS} justify-between gap-3 bg-abgelehnt-100 px-5`;

export const R4_DECISION_REJECTED_STATUS_CLASS =
  "inline-flex items-center gap-2 text-sm font-medium text-abgelehnt-600";

/** Hinweistext im abgelehnten Massnahmen-Block (`6344:25597`). */
export const R4_DECISION_REJECTED_BODY_TEXT_CLASS =
  "text-sm font-normal leading-5 text-foreground";

/**
 * «Massnahmen konkretisieren» — Liste der bewilligten Massnahmen, je Massnahme eine
 * Karte mit editierbarem Titel + Beschreibung (`6358:26353`) bzw. fixierter
 * Darstellung im «definiert»-Zustand (`6344:25081`).
 */
export const R4_DECISION_CONCRETIZE_LIST_CLASS = "flex w-full flex-col gap-3";

export const R4_DECISION_CONCRETIZE_ITEM_CLASS = "flex w-full flex-col gap-2";

export const R4_DECISION_CONCRETIZE_TITLE_CLASS =
  "flex w-full gap-2 text-base font-medium leading-6 text-foreground";

/** Inhaltsblock je Massnahme — Einrückung unter der Nummerierung. */
export const R4_DECISION_CONCRETIZE_BODY_CLASS = "flex w-full flex-col pl-5";

/** Konkretisieren-Karte je Massnahme (`6358:26359`) — stone-50, rounded-10, px-12 py-16. */
export const R4_DECISION_CONCRETIZE_CARD_CLASS =
  "flex w-full flex-col gap-2 rounded-[10px] bg-stone-50 px-3 py-4";

/** Nummerierte Überschrift in der Karte (paragraph regular/medium) (`6358:26360`). */
export const R4_DECISION_CONCRETIZE_CARD_HEADER_CLASS =
  "flex w-full gap-2 text-base font-medium leading-6 text-foreground";

/** Felder-Container in der Karte — Einrückung unter der Nummerierung (`6358:26361`). */
export const R4_DECISION_CONCRETIZE_FIELDS_CLASS = "flex w-full flex-col gap-4 pl-6";

/** Vertikales Feld: Label + Input (`6358:26362`). */
export const R4_DECISION_CONCRETIZE_FIELD_CLASS = "flex w-full flex-col gap-1";

/** Feld-Label (paragraph small/medium, muted-foreground) (`120:13759`). */
export const R4_DECISION_CONCRETIZE_FIELD_LABEL_CLASS =
  "text-sm font-medium leading-5 text-muted-foreground";

/** Einzeiliges Titel-Input (`120:13760`). */
export const R4_DECISION_CONCRETIZE_TITLE_INPUT_CLASS =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm leading-5 text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

export const R4_DECISION_CONCRETIZE_TEXTAREA_CLASS =
  "block w-full resize-none rounded-lg border border-border bg-background px-2 py-2 text-sm leading-5 text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

/** Fixierte (read-only) Beschreibung im «definiert»-Zustand (`6344:25407`). */
export const R4_DECISION_CONCRETIZE_DESCRIPTION_CLASS =
  "whitespace-pre-wrap text-sm font-normal leading-5 text-foreground";

/**
 * Ablehnungs-Begründung erfassen (`6358:26387`) — Footer stone-50, mehrzeilig:
 * Freitext-Composer + «Zurück zur Auswahl» / «Bestätigen».
 */
export const R4_DECISION_REASON_FOOTER_CLASS =
  "flex flex-col gap-4 border-t border-border bg-stone-50 px-5 py-4";

export const R4_DECISION_REASON_INPUT_CLASS =
  "block w-full min-h-5 resize-none overflow-hidden border-0 bg-transparent p-0 text-sm leading-5 text-foreground shadow-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0";

/**
 * «Massnahmen abgelehnt» mit eingebetteter Begründung (`6358:26343`) — Footer abgelehnt-50,
 * mehrzeilig: Begründung + «Bearbeiten» / Status.
 */
export const R4_DECISION_REJECTED_REASON_FOOTER_CLASS =
  "flex flex-col gap-4 border-t border-border bg-abgelehnt-50 px-5 py-4";

export const R4_DECISION_REJECTED_REASON_BLOCK_CLASS = "flex w-full flex-col gap-1";

export const R4_DECISION_REJECTED_REASON_TITLE_CLASS =
  "text-sm font-medium leading-5 text-abgelehnt-600";

export const R4_DECISION_REJECTED_REASON_TEXT_CLASS =
  "whitespace-pre-wrap text-sm font-normal leading-5 text-abgelehnt-600";

export const R4_DECISION_REJECTED_REASON_ROW_CLASS =
  "flex w-full items-start justify-between gap-3";

/** «Zurück zur Auswahl» Textbutton im Konkretisieren-Footer (`6344:25168`). */
export const R4_DECISION_BACK_BUTTON_CLASS =
  "inline-flex h-9 shrink-0 items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80 disabled:opacity-40";

/** Abgelehnte Blöcke unter der Verfügung — Figma `6430:5454` / `6423:5582`. */
export const R4_VERFUEGUNG_REJECTED_BLOCK_CLASS =
  "overflow-hidden rounded-xl border border-abgelehnt-600 bg-background";

export const R4_VERFUEGUNG_REJECTED_BLOCK_BODY_CLASS =
  "flex flex-col gap-4 p-6";

export const R4_VERFUEGUNG_REJECTED_ROWS_CLASS = "flex w-full flex-col gap-3";

export const R4_VERFUEGUNG_REJECTED_ROW_CARD_CLASS =
  "flex flex-col gap-1.5 rounded-[10px] border border-border bg-background px-3 py-3";

export const R4_VERFUEGUNG_REJECTED_ROW_HEADER_CLASS =
  "flex w-full items-start justify-between gap-3";

export const R4_VERFUEGUNG_REJECTED_ROW_LABEL_CLASS =
  "text-sm font-normal leading-5 text-foreground";

export const R4_VERFUEGUNG_REJECTED_BADGE_CLASS =
  "shrink-0 text-xs font-medium leading-4 text-abgelehnt-600";

export const R4_VERFUEGUNG_REJECTED_ROW_HINT_CLASS =
  "text-xs font-normal leading-4 text-muted-foreground";

export const R4_VERFUEGUNG_REJECTED_FOOTER_CLASS =
  "flex flex-col gap-4 border-t border-border bg-abgelehnt-50 px-5 py-4";

export const R4_VERFUEGUNG_REJECTED_FOOTER_STATUS_ROW_CLASS =
  "flex w-full items-center justify-end gap-2";

export const R4_VERFUEGUNG_REJECTED_FOOTER_STATUS_CLASS =
  "inline-flex items-center gap-2 text-sm font-medium leading-5 text-abgelehnt-600";

/** Zeilen-Hintergrund je Badge (Figma Rich Radio Group). */
export const R4_DECISION_ROW_SURFACE_CLASS = {
  bewilligt: "bg-bewilligt-50",
  abgelehnt: "bg-abgelehnt-50",
  vorschlag: "bg-adjustment-50",
  vorschlagen: "bg-stone-50",
} as const;
