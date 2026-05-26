"use client";

import { useState } from "react";
import { CheckCheck, CircleCheckBig, Pencil, Plus, RotateCcw } from "lucide-react";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { ReviewField } from "@/components/domain/application-review-blocks";
import {
  r4RowBadge,
  type R4RowBadge,
} from "@/lib/r4-decision-state";
import type { R4DecisionRow } from "@/lib/test-flow-types";
import {
  R4_DECISION_BLOCK_BODY_CLASS,
  R4_DECISION_CONFIRM_SELECTION_BUTTON_CLASS,
  R4_DECISION_CONFIRMED_FOOTER_CLASS,
  R4_DECISION_CONFIRMED_STATUS_CLASS,
  R4_DECISION_EDIT_BLOCK_BUTTON_CLASS,
  R4_DECISION_EDITING_FOOTER_CLASS,
  R4_DECISION_RESET_BUTTON_CLASS,
  R4_DECISION_ROW_CLASS,
  R4_DECISION_ROW_DESCRIPTION_CLASS,
  R4_DECISION_ROW_LABEL_ACTIVE_CLASS,
  R4_DECISION_ROW_LABEL_MUTED_CLASS,
  R4_DECISION_PROPOSAL_INPUT_CLASS,
  R4_DECISION_ROW_LIST_CLASS,
  R4_DECISION_ROW_SURFACE_CLASS,
  R4_DECISION_ROW_TITLE_CLASS,
  R4_DECISION_SWITCH_GROUP_CLASS,
  R4_FACULTY_CONFIRMED_BLOCK_CLASS,
  R4_FACULTY_CONFIRMED_FOOTER_CLASS,
  R4_FACULTY_CONFIRMED_FOOTER_LABEL_CLASS,
} from "@/lib/design-tokens/r4-decision-block";
import { hfBlockTitle } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

export type R4SwitchTone = "bewilligt" | "abgelehnt" | "vorschlag" | "muted";

function r4SwitchToneFromRow(row: R4DecisionRow): R4SwitchTone {
  const b = r4RowBadge(row);
  if (b === "abgelehnt") return "abgelehnt";
  if (b === "vorschlag") return "vorschlag";
  if (b === "bewilligt") return "bewilligt";
  return "muted";
}

function r4SwitchTrackClass(tone: R4SwitchTone, checked: boolean): string {
  if (checked) {
    if (tone === "abgelehnt") return "bg-abgelehnt-600";
    if (tone === "vorschlag") return "bg-adjustment-400";
    if (tone === "bewilligt") return "bg-bewilligt-500";
    return "bg-bewilligt-500";
  }
  if (tone === "abgelehnt") return "bg-abgelehnt-600";
  return "bg-stone-250";
}

export function R4Switch({
  checked,
  disabled,
  tone,
  onToggle,
}: {
  checked: boolean;
  disabled?: boolean;
  tone: R4SwitchTone;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onToggle();
      }}
      className={cn(
        "relative inline-flex h-[18px] w-[33px] shrink-0 items-center rounded-full shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        r4SwitchTrackClass(tone, checked),
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-[14px] rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[17px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

function badgeLabel(badge: R4RowBadge): string {
  switch (badge) {
    case "bewilligt":
      return "Bewilligt";
    case "abgelehnt":
      return "Abgelehnt";
    case "vorschlag":
      return "Vorschlag";
    default:
      return "Vorschlagen";
  }
}

function rowSurfaceClass(
  row: R4DecisionRow,
  pristine: boolean,
  blockConfirmed: boolean,
): string {
  if (pristine && !blockConfirmed) {
    if (!row.studentSelected && !row.r4Approved) {
      return R4_DECISION_ROW_SURFACE_CLASS.vorschlagen;
    }
    if (row.studentSelected && row.r4Approved) {
      return R4_DECISION_ROW_SURFACE_CLASS.bewilligt;
    }
  }
  return R4_DECISION_ROW_SURFACE_CLASS[r4RowBadge(row)];
}

function rowStatusLabel(
  row: R4DecisionRow,
  pristine: boolean,
  blockConfirmed: boolean,
): string {
  if (pristine && !blockConfirmed && !row.studentSelected && !row.r4Approved) {
    return "Vorschlagen";
  }
  return badgeLabel(r4RowBadge(row));
}

function rowTextStrike(
  badge: R4RowBadge,
  opts: { confirmedReadonly: boolean },
): boolean {
  if (badge === "abgelehnt") return true;
  if (opts.confirmedReadonly && badge === "vorschlagen") return true;
  return false;
}

function R4DecisionSwitchGroup({
  row,
  pristine,
  blockConfirmed,
  disabled,
  onToggle,
}: {
  row: R4DecisionRow;
  pristine: boolean;
  blockConfirmed: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const badge = r4RowBadge(row);
  const statusLabel = rowStatusLabel(row, pristine, blockConfirmed);
  const isMutedLabel =
    pristine && !blockConfirmed && !row.studentSelected && !row.r4Approved;

  return (
    <div className={R4_DECISION_SWITCH_GROUP_CLASS}>
      <R4Switch
        checked={row.r4Approved}
        tone={r4SwitchToneFromRow(row)}
        disabled={disabled}
        onToggle={onToggle}
      />
      <span
        className={cn(
          isMutedLabel || badge === "abgelehnt"
            ? R4_DECISION_ROW_LABEL_MUTED_CLASS
            : R4_DECISION_ROW_LABEL_ACTIVE_CLASS,
        )}
      >
        {statusLabel}
      </span>
    </div>
  );
}

/** Freitext unter Optionen — Commit per Enter/Blur (`5907:23378`). */
export function R4DecisionProposalInput({
  disabled,
  onAddProposal,
}: {
  disabled?: boolean;
  onAddProposal: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed || disabled) return;
    onAddProposal(trimmed);
    setDraft("");
  };

  return (
    <li className={R4_DECISION_PROPOSAL_INPUT_CLASS}>
      <div className="flex h-5 shrink-0 items-center">
        <Plus className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <AutoGrowTextarea
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit();
          }
        }}
        placeholder="Formulieren Sie einen anderen Vorschlag …"
        className="min-h-5 flex-1 border-0 bg-transparent px-0 py-0 text-sm leading-5 shadow-none focus-visible:border-0 focus-visible:ring-0"
      />
    </li>
  );
}

export function R4DecisionOptionRow({
  row,
  pristine,
  blockConfirmed,
  confirmedReadonly,
  disabled,
  onToggle,
}: {
  row: R4DecisionRow;
  pristine: boolean;
  blockConfirmed: boolean;
  confirmedReadonly: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const badge = r4RowBadge(row);
  const strike = rowTextStrike(badge, { confirmedReadonly });

  return (
    <li
      className={cn(
        R4_DECISION_ROW_CLASS,
        rowSurfaceClass(row, pristine, blockConfirmed),
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className={cn(R4_DECISION_ROW_TITLE_CLASS, strike && "line-through")}>
          {row.title}
        </p>
        {row.description ? (
          <p
            className={cn(
              R4_DECISION_ROW_DESCRIPTION_CLASS,
              strike && "line-through",
            )}
          >
            {row.description}
          </p>
        ) : null}
      </div>
      <R4DecisionSwitchGroup
        row={row}
        pristine={pristine}
        blockConfirmed={blockConfirmed}
        disabled={disabled}
        onToggle={onToggle}
      />
    </li>
  );
}

export function R4FacultyConfirmedFooter() {
  return (
    <div className={R4_FACULTY_CONFIRMED_FOOTER_CLASS}>
      <span className={R4_FACULTY_CONFIRMED_FOOTER_LABEL_CLASS}>
        <CheckCheck className="size-4 shrink-0" aria-hidden />
        Von Fachstelle bestätigt
      </span>
    </div>
  );
}

/** R2-bestätigte Inhaltsblöcke ohne R4-Schalter (`5641:23410`). */
export function R4FacultyConfirmedBlock({
  anchorId,
  title,
  children,
}: {
  anchorId: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={anchorId} className={cn("scroll-mt-6", R4_FACULTY_CONFIRMED_BLOCK_CLASS)}>
      <div className={R4_DECISION_BLOCK_BODY_CLASS}>
        <h2 className={hfBlockTitle}>{title}</h2>
        {children}
      </div>
      <R4FacultyConfirmedFooter />
    </section>
  );
}

export function R4DecisionEditingFooter({
  dirty,
  disableInteractions,
  persisting,
  onReset,
  onConfirm,
}: {
  dirty: boolean;
  disableInteractions: boolean;
  persisting: boolean;
  onReset: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className={R4_DECISION_EDITING_FOOTER_CLASS}>
      {dirty ? (
        <button
          type="button"
          className={R4_DECISION_RESET_BUTTON_CLASS}
          disabled={disableInteractions || persisting}
          onClick={onReset}
        >
          <RotateCcw className="size-4 shrink-0" aria-hidden />
          Zurücksetzen
        </button>
      ) : (
        <span aria-hidden className="shrink-0" />
      )}
      <button
        type="button"
        className={R4_DECISION_CONFIRM_SELECTION_BUTTON_CLASS}
        disabled={disableInteractions || persisting}
        onClick={onConfirm}
      >
        <CircleCheckBig className="size-4 shrink-0" aria-hidden />
        Auswahl bestätigen
      </button>
    </div>
  );
}

export function R4DecisionConfirmedFooter({
  disableInteractions,
  onEdit,
}: {
  disableInteractions: boolean;
  onEdit: () => void;
}) {
  return (
    <div className={R4_DECISION_CONFIRMED_FOOTER_CLASS}>
      <button
        type="button"
        className={R4_DECISION_EDIT_BLOCK_BUTTON_CLASS}
        disabled={disableInteractions}
        onClick={onEdit}
      >
        <Pencil className="size-4 shrink-0" aria-hidden />
        Bearbeiten
      </button>
      <span className={R4_DECISION_CONFIRMED_STATUS_CLASS}>
        <CircleCheckBig className="size-4 shrink-0" aria-hidden />
        Auswahl bestätigt
      </span>
    </div>
  );
}

export function R4DecisionReadonlyConfirmedFooter() {
  return (
    <div className={R4_DECISION_CONFIRMED_FOOTER_CLASS}>
      <span aria-hidden />
      <span className={R4_DECISION_CONFIRMED_STATUS_CLASS}>
        <CircleCheckBig className="size-4 shrink-0" aria-hidden />
        Auswahl bestätigt (Nur Ansicht)
      </span>
    </div>
  );
}

export { ReviewField };
