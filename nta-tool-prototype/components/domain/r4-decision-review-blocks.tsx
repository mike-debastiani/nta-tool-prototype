"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCheck,
  CircleCheckBig,
  Pencil,
  Plus,
  RotateCcw,
  SquareX,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { ReviewField } from "@/components/domain/application-review-blocks";
import {
  r4RowBadge,
  type R4RowBadge,
} from "@/lib/r4-decision-state";
import type { R4DecisionRow } from "@/lib/test-flow-types";
import {
  R4_DECISION_BACK_BUTTON_CLASS,
  R4_DECISION_BLOCK_BODY_CLASS,
  R4_DECISION_CONCRETIZE_BODY_CLASS,
  R4_DECISION_CONCRETIZE_CARD_CLASS,
  R4_DECISION_CONCRETIZE_CARD_HEADER_CLASS,
  R4_DECISION_CONCRETIZE_DESCRIPTION_CLASS,
  R4_DECISION_CONCRETIZE_FIELD_CLASS,
  R4_DECISION_CONCRETIZE_FIELD_LABEL_CLASS,
  R4_DECISION_CONCRETIZE_FIELDS_CLASS,
  R4_DECISION_CONCRETIZE_ITEM_CLASS,
  R4_DECISION_CONCRETIZE_LIST_CLASS,
  R4_DECISION_CONCRETIZE_TEXTAREA_CLASS,
  R4_DECISION_CONCRETIZE_TITLE_CLASS,
  R4_DECISION_CONCRETIZE_TITLE_INPUT_CLASS,
  R4_DECISION_REASON_FOOTER_CLASS,
  R4_DECISION_REASON_INPUT_CLASS,
  R4_DECISION_REJECTED_REASON_BLOCK_CLASS,
  R4_DECISION_REJECTED_REASON_FOOTER_CLASS,
  R4_DECISION_REJECTED_REASON_ROW_CLASS,
  R4_DECISION_REJECTED_REASON_TEXT_CLASS,
  R4_DECISION_REJECTED_REASON_TITLE_CLASS,
  R4_DECISION_CONFIRM_SELECTION_BUTTON_CLASS,
  R4_DECISION_CONFIRMED_FOOTER_CLASS,
  R4_DECISION_CONFIRMED_STATUS_CLASS,
  R4_DECISION_DEFINED_FOOTER_CLASS,
  R4_DECISION_DEFINED_STATUS_CLASS,
  R4_DECISION_EDIT_BLOCK_BUTTON_CLASS,
  R4_DECISION_EDITING_FOOTER_CLASS,
  R4_DECISION_REJECTED_FOOTER_CLASS,
  R4_DECISION_REJECTED_STATUS_CLASS,
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
      return "Hinzugefügt";
    default:
      return "Hinzufügen";
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
    return "Hinzufügen";
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
  proposalRows,
  disabled,
  onUpsertProposal,
  onRemoveProposal,
}: {
  proposalRows: R4DecisionRow[];
  disabled?: boolean;
  onUpsertProposal: (text: string, existingKey?: string) => string | null;
  onRemoveProposal: (key: string) => void;
}) {
  type ProposalInputRow = { uiId: string; key?: string; value: string };
  const nextIdRef = useRef(0);
  const createUiId = () => `r4-proposal-ui-${nextIdRef.current++}`;
  /** Stabiler, lokal vergebener Proposal-Key — bleibt über die gesamte Eingabe identisch. */
  const createProposalKey = () => `proposal:${Date.now()}-${nextIdRef.current++}`;

  const [rows, setRows] = useState<ProposalInputRow[]>(() => [
    ...proposalRows.map((row) => ({
      uiId: createUiId(),
      key: row.key,
      value: row.title,
    })),
    { uiId: createUiId(), value: "" },
  ]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const proposalRowsRef = useRef(proposalRows);
  proposalRowsRef.current = proposalRows;
  const proposalKeysSignature = useMemo(
    () => proposalRows.map((row) => row.key).join("\u001e"),
    [proposalRows],
  );

  // Server-Proposals einspielen, OHNE lokal in Bearbeitung befindliche Werte/uiIds
  // zurückzusetzen: bekannte Keys behalten ihren lokalen Stand, neue Keys werden ergänzt,
  // entfernte fallen weg. Genau ein Leerfeld am Ende.
  useEffect(() => {
    setRows((previous) => {
      const localByKey = new Map(
        previous.filter((row) => row.key).map((row) => [row.key as string, row]),
      );
      const reconciled = proposalRowsRef.current.map(
        (server) =>
          localByKey.get(server.key) ?? {
            uiId: createUiId(),
            key: server.key,
            value: server.title,
          },
      );
      const trailing =
        previous.find((row) => !row.key && row.value.trim() === "") ?? {
          uiId: createUiId(),
          value: "",
        };
      return [...reconciled, trailing];
    });
  }, [proposalKeysSignature]);

  const handleRowChange = (uiId: string, nextValue: string) => {
    const current = rowsRef.current;
    const target = current.find((row) => row.uiId === uiId);
    if (!target) return;
    const trimmed = nextValue.trim();

    if (disabled) {
      setRows(current.map((row) => (row.uiId === uiId ? { ...row, value: nextValue } : row)));
      return;
    }

    // Bestehende Zeile (stabiler Key): nur aktualisieren, niemals neu anlegen.
    if (target.key) {
      if (!trimmed) {
        onRemoveProposal(target.key);
        setRows(current.map((row) => (row.uiId === uiId ? { uiId, value: "" } : row)));
      } else {
        onUpsertProposal(trimmed, target.key);
        setRows(current.map((row) => (row.uiId === uiId ? { ...row, value: nextValue } : row)));
      }
      return;
    }

    // Leeres Trailing-Feld erhält Text → genau EINE neue Massnahme mit stabilem Key anlegen.
    if (trimmed) {
      const key = createProposalKey();
      onUpsertProposal(trimmed, key);
      let next = current.map((row) =>
        row.uiId === uiId ? { ...row, key, value: nextValue } : row,
      );
      if (!next.some((row) => !row.key && row.value.trim() === "")) {
        next = [...next, { uiId: createUiId(), value: "" }];
      }
      setRows(next);
      return;
    }

    setRows(current.map((row) => (row.uiId === uiId ? { ...row, value: nextValue } : row)));
  };

  const handleRemoveRow = (uiId: string) => {
    const current = rowsRef.current;
    const target = current.find((row) => row.uiId === uiId);
    if (!target) return;
    if (target.key) onRemoveProposal(target.key);
    let next = current.filter((row) => row.uiId !== uiId);
    if (!next.some((row) => !row.key && row.value.trim() === "")) {
      next = [...next, { uiId: createUiId(), value: "" }];
    }
    setRows(next);
  };

  return (
    <>
      {rows.map((row) => {
        const hasText = row.value.trim().length > 0;
        return (
          <li
            key={row.uiId}
            className={cn(
              R4_DECISION_ROW_CLASS,
              hasText
                ? R4_DECISION_ROW_SURFACE_CLASS.vorschlag
                : R4_DECISION_ROW_SURFACE_CLASS.vorschlagen,
            )}
          >
            <div className="flex h-5 shrink-0 items-center">
              <Plus className="size-5 text-muted-foreground" aria-hidden />
            </div>
            <AutoGrowTextarea
              value={row.value}
              disabled={disabled}
              onChange={(e) => handleRowChange(row.uiId, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                }
              }}
              placeholder="Formulieren Sie einen anderen Zusatz …"
              className="min-h-5 flex-1 border-0 bg-transparent px-0 py-0 text-sm leading-5 shadow-none focus-visible:border-0 focus-visible:ring-0"
            />
            <div className={R4_DECISION_SWITCH_GROUP_CLASS}>
              <R4Switch
                checked={hasText}
                tone={hasText ? "vorschlag" : "muted"}
                disabled={disabled}
                onToggle={() => {
                  if (disabled || !hasText) return;
                  handleRemoveRow(row.uiId);
                }}
              />
              <span
                className={cn(
                  hasText
                    ? R4_DECISION_ROW_LABEL_ACTIVE_CLASS
                    : R4_DECISION_ROW_LABEL_MUTED_CLASS,
                )}
              >
                {hasText ? "Hinzugefügt" : "Hinzufügen"}
              </span>
            </div>
          </li>
        );
      })}
    </>
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
  showFacultyFooter = true,
}: {
  anchorId: string;
  title: string;
  children: React.ReactNode;
  /** «Von Fachstelle bestätigt»-Footer ausblenden (z. B. in der bewilligten Verfügungs-Ansicht). */
  showFacultyFooter?: boolean;
}) {
  return (
    <section id={anchorId} className={cn("scroll-mt-6", R4_FACULTY_CONFIRMED_BLOCK_CLASS)}>
      <div className={R4_DECISION_BLOCK_BODY_CLASS}>
        <h2 className={hfBlockTitle}>{title}</h2>
        {children}
      </div>
      {showFacultyFooter ? <R4FacultyConfirmedFooter /> : null}
    </section>
  );
}

export function R4DecisionEditingFooter({
  dirty,
  disableInteractions,
  persisting,
  onReset,
  onConfirm,
  confirmLabel = "Auswahl bestätigen",
  confirmIcon: ConfirmIcon = CircleCheckBig,
}: {
  dirty: boolean;
  disableInteractions: boolean;
  persisting: boolean;
  onReset: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmIcon?: LucideIcon;
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
        <ConfirmIcon className="size-4 shrink-0" aria-hidden />
        {confirmLabel}
      </button>
    </div>
  );
}

export type R4ConcretizeItem = {
  key: string;
  title: string;
  value: string;
};

/** «Massnahmen konkretisieren» — editierbare, nummerierte Massnahmenliste (`6344:25136`). */
export function R4DecisionConcretizeList({
  items,
  disabled,
  onChangeTitle,
  onChangeDescription,
}: {
  items: R4ConcretizeItem[];
  disabled?: boolean;
  onChangeTitle: (key: string, value: string) => void;
  onChangeDescription: (key: string, value: string) => void;
}) {
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const keysSignature = useMemo(() => items.map((i) => i.key).join("\u001e"), [items]);

  const [titles, setTitles] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.key, i.title])),
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.key, i.value])),
  );

  useEffect(() => {
    setTitles((prev) => {
      const next: Record<string, string> = {};
      for (const item of itemsRef.current) {
        next[item.key] = prev[item.key] ?? item.title;
      }
      return next;
    });
    setValues((prev) => {
      const next: Record<string, string> = {};
      for (const item of itemsRef.current) {
        next[item.key] = prev[item.key] ?? item.value;
      }
      return next;
    });
  }, [keysSignature]);

  return (
    <ol className={R4_DECISION_CONCRETIZE_LIST_CLASS}>
      {items.map((item, index) => (
        <li key={item.key} className={R4_DECISION_CONCRETIZE_CARD_CLASS}>
          <div className={R4_DECISION_CONCRETIZE_CARD_HEADER_CLASS}>
            <span className="shrink-0 tabular-nums">{index + 1}.</span>
            <span className="min-w-0 flex-1">Massnahme</span>
          </div>
          <div className={R4_DECISION_CONCRETIZE_FIELDS_CLASS}>
            <div className={R4_DECISION_CONCRETIZE_FIELD_CLASS}>
              <span className={R4_DECISION_CONCRETIZE_FIELD_LABEL_CLASS}>Titel</span>
              <input
                type="text"
                value={titles[item.key] ?? ""}
                disabled={disabled}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setTitles((prev) => ({ ...prev, [item.key]: nextValue }));
                  onChangeTitle(item.key, nextValue);
                }}
                placeholder="Titel der Massnahme …"
                className={R4_DECISION_CONCRETIZE_TITLE_INPUT_CLASS}
              />
            </div>
            <div className={R4_DECISION_CONCRETIZE_FIELD_CLASS}>
              <span className={R4_DECISION_CONCRETIZE_FIELD_LABEL_CLASS}>
                Beschreibung der Massnahme
              </span>
              <AutoGrowTextarea
                value={values[item.key] ?? ""}
                disabled={disabled}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setValues((prev) => ({ ...prev, [item.key]: nextValue }));
                  onChangeDescription(item.key, nextValue);
                }}
                placeholder="Konkretisieren Sie die Massnahme …"
                className={R4_DECISION_CONCRETIZE_TEXTAREA_CLASS}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Fixierte (read-only) Massnahmenliste nach «Konkretisierung abschliessen» (`6344:25081`). */
export function R4DecisionDefinedList({ items }: { items: R4ConcretizeItem[] }) {
  return (
    <ol className={R4_DECISION_CONCRETIZE_LIST_CLASS}>
      {items.map((item, index) => (
        <li key={item.key} className={R4_DECISION_CONCRETIZE_ITEM_CLASS}>
          <div className={R4_DECISION_CONCRETIZE_TITLE_CLASS}>
            <span className="shrink-0 tabular-nums">{index + 1}.</span>
            <span className="min-w-0 flex-1">{item.title}</span>
          </div>
          <div className={R4_DECISION_CONCRETIZE_BODY_CLASS}>
            <p className={R4_DECISION_CONCRETIZE_DESCRIPTION_CLASS}>
              {item.value.trim() ? item.value : "—"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Footer im Konkretisieren-Zustand: «Zurück zur Auswahl» + «Konkretisierung abschliessen» (`6344:25166`). */
export function R4DecisionConcretizeFooter({
  disableInteractions,
  persisting,
  onBack,
  onComplete,
}: {
  disableInteractions: boolean;
  persisting: boolean;
  onBack: () => void;
  onComplete: () => void;
}) {
  return (
    <div className={R4_DECISION_EDITING_FOOTER_CLASS}>
      <button
        type="button"
        className={R4_DECISION_BACK_BUTTON_CLASS}
        disabled={disableInteractions || persisting}
        onClick={onBack}
      >
        <Undo2 className="size-4 shrink-0" aria-hidden />
        Zurück zur Auswahl
      </button>
      <button
        type="button"
        className={R4_DECISION_CONFIRM_SELECTION_BUTTON_CLASS}
        disabled={disableInteractions || persisting}
        onClick={onComplete}
      >
        <CircleCheckBig className="size-4 shrink-0" aria-hidden />
        Konkretisierung abschliessen
      </button>
    </div>
  );
}

/** Footer «Massnahmen definiert» (`6344:25108`). */
export function R4DecisionDefinedFooter({
  disableInteractions,
  onEdit,
}: {
  disableInteractions: boolean;
  onEdit: () => void;
}) {
  return (
    <div className={R4_DECISION_DEFINED_FOOTER_CLASS}>
      <button
        type="button"
        className={R4_DECISION_EDIT_BLOCK_BUTTON_CLASS}
        disabled={disableInteractions}
        onClick={onEdit}
      >
        <Pencil className="size-4 shrink-0" aria-hidden />
        Bearbeiten
      </button>
      <span className={R4_DECISION_DEFINED_STATUS_CLASS}>
        <CircleCheckBig className="size-4 shrink-0" aria-hidden />
        Massnahmen definiert
      </span>
    </div>
  );
}

export function R4DecisionDefinedReadonlyFooter() {
  return (
    <div className={R4_DECISION_DEFINED_FOOTER_CLASS}>
      <span aria-hidden />
      <span className={R4_DECISION_DEFINED_STATUS_CLASS}>
        <CircleCheckBig className="size-4 shrink-0" aria-hidden />
        Massnahmen definiert (Nur Ansicht)
      </span>
    </div>
  );
}

/** Footer «Massnahmen abgelehnt» (`6344:25439`). */
export function R4DecisionRejectedFooter({
  disableInteractions,
  persisting,
  onReset,
  statusLabel = "Massnahmen abgelehnt",
}: {
  disableInteractions: boolean;
  persisting: boolean;
  onReset: () => void;
  statusLabel?: string;
}) {
  return (
    <div className={R4_DECISION_REJECTED_FOOTER_CLASS}>
      <button
        type="button"
        className={R4_DECISION_RESET_BUTTON_CLASS}
        disabled={disableInteractions || persisting}
        onClick={onReset}
      >
        <RotateCcw className="size-4 shrink-0" aria-hidden />
        Zurücksetzen
      </button>
      <span className={R4_DECISION_REJECTED_STATUS_CLASS}>
        <SquareX className="size-4 shrink-0" aria-hidden />
        {statusLabel}
      </span>
    </div>
  );
}

export function R4DecisionRejectedReadonlyFooter({
  statusLabel = "Massnahmen abgelehnt",
}: {
  statusLabel?: string;
} = {}) {
  return (
    <div className={R4_DECISION_REJECTED_FOOTER_CLASS}>
      <span aria-hidden />
      <span className={R4_DECISION_REJECTED_STATUS_CLASS}>
        <SquareX className="size-4 shrink-0" aria-hidden />
        {statusLabel} (Nur Ansicht)
      </span>
    </div>
  );
}

/**
 * Begründung erfassen, wenn keine Massnahme bewilligt wurde (`6358:26387`).
 * Auto-wachsendes Freitextfeld + «Zurück zur Auswahl» / «Bestätigen».
 */
export function R4DecisionRejectReasonFooter({
  draft,
  disableInteractions,
  persisting,
  onDraftChange,
  onBack,
  onConfirm,
}: {
  draft: string;
  disableInteractions: boolean;
  persisting: boolean;
  onDraftChange: (value: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const canConfirm = draft.trim().length > 0 && !disableInteractions && !persisting;
  return (
    <div className={R4_DECISION_REASON_FOOTER_CLASS}>
      <AutoGrowTextarea
        value={draft}
        disabled={disableInteractions || persisting}
        autoFocus
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder="Erläutern Sie den Grund für Ihre Entscheidung …"
        className={R4_DECISION_REASON_INPUT_CLASS}
      />
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className={R4_DECISION_BACK_BUTTON_CLASS}
          disabled={disableInteractions || persisting}
          onClick={onBack}
        >
          <Undo2 className="size-4 shrink-0" aria-hidden />
          Zurück zur Auswahl
        </button>
        <button
          type="button"
          className={R4_DECISION_CONFIRM_SELECTION_BUTTON_CLASS}
          disabled={!canConfirm}
          onClick={onConfirm}
        >
          <CircleCheckBig className="size-4 shrink-0" aria-hidden />
          Bestätigen
        </button>
      </div>
    </div>
  );
}

/** Footer «Massnahmen abgelehnt» mit eingebetteter Begründung (`6358:26343`). */
export function R4DecisionRejectedReasonFooter({
  reason,
  disableInteractions,
  onEdit,
  statusLabel = "Massnahmen abgelehnt",
}: {
  reason: string;
  disableInteractions: boolean;
  onEdit: () => void;
  statusLabel?: string;
}) {
  return (
    <div className={R4_DECISION_REJECTED_REASON_FOOTER_CLASS}>
      <div className={R4_DECISION_REJECTED_REASON_BLOCK_CLASS}>
        <p className={R4_DECISION_REJECTED_REASON_TITLE_CLASS}>
          Begründung für diesen Entscheid
        </p>
        <p className={R4_DECISION_REJECTED_REASON_TEXT_CLASS}>{reason}</p>
      </div>
      <div className={R4_DECISION_REJECTED_REASON_ROW_CLASS}>
        <button
          type="button"
          className={R4_DECISION_EDIT_BLOCK_BUTTON_CLASS}
          disabled={disableInteractions}
          onClick={onEdit}
        >
          <Pencil className="size-4 shrink-0" aria-hidden />
          Bearbeiten
        </button>
        <span className={R4_DECISION_REJECTED_STATUS_CLASS}>
          <SquareX className="size-4 shrink-0" aria-hidden />
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

/** Read-only Variante des abgelehnten Massnahmen-Footers mit Begründung. */
export function R4DecisionRejectedReasonReadonlyFooter({
  reason,
  statusLabel = "Massnahmen abgelehnt",
}: {
  reason: string;
  statusLabel?: string;
}) {
  return (
    <div className={R4_DECISION_REJECTED_REASON_FOOTER_CLASS}>
      <div className={R4_DECISION_REJECTED_REASON_BLOCK_CLASS}>
        <p className={R4_DECISION_REJECTED_REASON_TITLE_CLASS}>
          Begründung für diesen Entscheid
        </p>
        <p className={R4_DECISION_REJECTED_REASON_TEXT_CLASS}>{reason}</p>
      </div>
      <div className={R4_DECISION_REJECTED_REASON_ROW_CLASS}>
        <span aria-hidden />
        <span className={R4_DECISION_REJECTED_STATUS_CLASS}>
          <SquareX className="size-4 shrink-0" aria-hidden />
          {statusLabel} (Nur Ansicht)
        </span>
      </div>
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
