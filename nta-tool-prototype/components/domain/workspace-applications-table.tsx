"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, MoreVertical } from "lucide-react";

import type { WorkspaceApplicationTableRow } from "@/lib/workspace-application-table-rows";
import {
  nextWorkspaceTableSort,
  WORKSPACE_TABLE_SORT_COLUMN_LABELS,
  type WorkspaceTableSort,
  type WorkspaceTableSortColumn,
} from "@/lib/workspace-applications-table-controls";
import {
  WORKSPACE_APPLICATIONS_TABLE_ACTIONS_CELL_CLASS,
  WORKSPACE_APPLICATIONS_TABLE_ACTIONS_HEADER_CLASS,
  WORKSPACE_APPLICATIONS_TABLE_ASSIGNEE_CELL_CLASS,
  WORKSPACE_APPLICATIONS_TABLE_COL_MIN_CLASS,
  WORKSPACE_APPLICATIONS_TABLE_COL_WIDTH,
  WORKSPACE_APPLICATIONS_TABLE_COMPACT_QUERY,
  WORKSPACE_APPLICATIONS_TABLE_CONTAINER_CLASS,
  WORKSPACE_APPLICATIONS_TABLE_FIT_COL_PERCENT,
  WORKSPACE_APPLICATIONS_TABLE_FIT_COL_WIDTH,
  WORKSPACE_APPLICATIONS_TABLE_FIT_QUERY,
  WORKSPACE_APPLICATIONS_TABLE_MIN_WIDTH_CLASS,
} from "@/lib/design-tokens/workspace-dashboard";
import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

type WorkspaceApplicationsTableProps = {
  rows: WorkspaceApplicationTableRow[];
  onSelectApplication: (applicationId: string) => void;
  emptyMessage?: string;
  className?: string;
  sort?: WorkspaceTableSort | null;
  onSortChange?: (sort: WorkspaceTableSort | null) => void;
  /** Gesamtzeilen vor Filter/Suche (für leere-Hinweis). */
  totalRowCount?: number;
};

/** Status-Pill — Hintergrund hugged den Text (wie `R1ApplicationStatusPill`). */
function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-max shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-2 py-0.5",
        hfTypography.paragraphMiniMedium,
        "font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}

const SORTABLE_COLUMNS: WorkspaceTableSortColumn[] = [
  "applicantName",
  "studiengang",
  "fakultaet",
  "ref",
  "date",
  "statusLabel",
  "assignee",
];

/** Nur Studiengang darf umbrechen; alle übrigen bleiben einzeilig. */
function isWrapColumn(column: WorkspaceTableSortColumn): boolean {
  return column === "studiengang";
}

/** Fit-Modus: Referenzspalte darf auf Inhaltsbreite zusammenschrumpfen. */
function usesFitShrinkWidth(column: WorkspaceTableSortColumn): boolean {
  return column === "ref";
}

function isFakultaetColumn(column: WorkspaceTableSortColumn): boolean {
  return column === "fakultaet";
}

function isDateColumn(column: WorkspaceTableSortColumn): boolean {
  return column === "date";
}

function keepsIntrinsicMinWidth(column: WorkspaceTableSortColumn): boolean {
  return (
    column === "fakultaet" ||
    column === "ref" ||
    column === "date" ||
    column === "statusLabel" ||
    column === "assignee"
  );
}

function fitDateColClasses(fitQ: string): string {
  return `${fitQ}:w-[5.5rem] ${fitQ}:min-w-[5.5rem] ${fitQ}:max-w-[5.5rem]`;
}

const wrapCellTextClass = "block whitespace-normal break-words text-foreground";
const nonWrapCellTextClass = "block whitespace-nowrap text-foreground";
const APPLICANT_NAME_WRAP_THRESHOLD = 24;

function shouldWrapApplicantName(name: string): boolean {
  return name.trim().length > APPLICANT_NAME_WRAP_THRESHOLD;
}

function RowActionsCell({ applicantName }: { applicantName: string }) {
  return (
    <td className={WORKSPACE_APPLICATIONS_TABLE_ACTIONS_CELL_CLASS}>
      <button
        type="button"
        className="ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-transparent text-foreground-alt hover:bg-stone-100/80"
        aria-label={`Menü für ${applicantName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreVertical className="size-4" strokeWidth={1.75} />
      </button>
    </td>
  );
}

function headerCellClass(
  column: WorkspaceTableSortColumn,
  fitQ: string,
  compactQ: string,
): string {
  if (isWrapColumn(column)) {
    return cn("px-3 py-2.5 text-left", `${fitQ}:min-w-0`, `${compactQ}:min-w-0`);
  }
  const minClass = WORKSPACE_APPLICATIONS_TABLE_COL_MIN_CLASS[column];
  return cn(
    "py-2.5 text-left whitespace-nowrap",
    isFakultaetColumn(column) ? "px-2" : isDateColumn(column) ? "px-2" : "px-3",
    column === "statusLabel" && "overflow-visible",
    keepsIntrinsicMinWidth(column) && `${fitQ}:min-w-max`,
    usesFitShrinkWidth(column) && `${fitQ}:w-px`,
    isDateColumn(column) && fitDateColClasses(fitQ),
    `${compactQ}:${minClass}`,
  );
}

function bodyCellClass(
  column: WorkspaceTableSortColumn,
  fitQ: string,
  compactQ: string,
): string {
  if (isWrapColumn(column)) {
    return cn("h-14 px-3 align-middle", `${fitQ}:min-w-0`, `${compactQ}:min-w-0`);
  }
  const minClass = WORKSPACE_APPLICATIONS_TABLE_COL_MIN_CLASS[column];
  return cn(
    "h-14 align-middle whitespace-nowrap",
    isFakultaetColumn(column) && "text-left",
    isFakultaetColumn(column) ? "px-2" : isDateColumn(column) ? "px-2" : "px-3",
    column === "statusLabel" && "overflow-visible",
    keepsIntrinsicMinWidth(column) && `${fitQ}:min-w-max`,
    usesFitShrinkWidth(column) && `${fitQ}:w-px`,
    isDateColumn(column) && fitDateColClasses(fitQ),
    `${compactQ}:${minClass}`,
  );
}

function SortableHeaderCell({
  column,
  sort,
  onSortChange,
  fitQ,
  compactQ,
}: {
  column: WorkspaceTableSortColumn;
  sort: WorkspaceTableSort | null;
  onSortChange?: (sort: WorkspaceTableSort | null) => void;
  fitQ: string;
  compactQ: string;
}) {
  const isActive = sort?.column === column;
  const label = WORKSPACE_TABLE_SORT_COLUMN_LABELS[column];

  const SortIcon = isActive
    ? sort.direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ChevronsUpDown;

  if (!onSortChange) {
    return (
      <th className={headerCellClass(column, fitQ, compactQ)}>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
            {label}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </span>
      </th>
    );
  }

  return (
    <th className={headerCellClass(column, fitQ, compactQ)}>
      <button
        type="button"
        onClick={() => onSortChange(nextWorkspaceTableSort(sort, column))}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md py-0.5 transition-colors",
          isWrapColumn(column)
            ? "max-w-full min-w-0 text-left"
            : "whitespace-nowrap",
          isFakultaetColumn(column) && "justify-start",
          "hover:bg-stone-100/80",
          isActive && "text-foreground",
        )}
        aria-label={
          isActive
            ? `Sortierung ${label}: ${sort.direction === "asc" ? "aufsteigend" : "absteigend"}. Klicken zum Wechseln.`
            : `Nach ${label} sortieren`
        }
      >
        <span
          className={cn(
            hfTypography.paragraphSmallMedium,
            isActive ? "text-foreground" : "text-foreground",
          )}
        >
          {label}
        </span>
        <SortIcon
          className={cn(
            "size-4 shrink-0",
            isActive ? "text-foreground" : "text-muted-foreground",
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
    </th>
  );
}

/** Anträge-Tabelle (Figma Dashboard-Home `5948:27465`). */
export function WorkspaceApplicationsTable({
  rows,
  onSelectApplication,
  emptyMessage = "Keine Anträge für die aktuelle Filterung.",
  className,
  sort = null,
  onSortChange,
  totalRowCount,
}: WorkspaceApplicationsTableProps) {
  const emptyHint =
    rows.length === 0 && (totalRowCount ?? 0) > 0
      ? "Keine Anträge für die aktuelle Suche oder Filter."
      : emptyMessage;

  const w = WORKSPACE_APPLICATIONS_TABLE_COL_WIDTH;
  const wf = WORKSPACE_APPLICATIONS_TABLE_FIT_COL_WIDTH;
  const wp = WORKSPACE_APPLICATIONS_TABLE_FIT_COL_PERCENT;
  const actionsW = w.actions;

  const compactQ = WORKSPACE_APPLICATIONS_TABLE_COMPACT_QUERY;
  const fitQ = WORKSPACE_APPLICATIONS_TABLE_FIT_QUERY;

  return (
    <div className={cn(WORKSPACE_APPLICATIONS_TABLE_CONTAINER_CLASS, className)}>
      <table
        className={cn(
          "w-full table-auto border-collapse text-left",
          `${compactQ}:${WORKSPACE_APPLICATIONS_TABLE_MIN_WIDTH_CLASS}`,
        )}
      >
        {/* Fit (>1150px): Studiengang flexibel; kurze Spalten einzeilig; Assignee min-content-basiert. */}
        <colgroup className={cn("hidden", `${fitQ}:table-column-group`)}>
          <col style={{ width: wp.applicantName }} />
          <col style={{ width: wp.studiengang }} />
          <col style={{ width: wf.fakultaet }} />
          <col style={{ width: wf.ref }} />
          <col style={{ width: wf.date }} />
          <col style={{ width: wf.statusLabel }} />
          <col style={{ width: wf.assignee }} />
          <col style={{ width: actionsW }} />
        </colgroup>
        {/* Kompakt (≤1150px): feste rem-Breiten + Scroll. */}
        <colgroup className={cn("hidden", `${compactQ}:table-column-group`)}>
          <col style={{ width: w.applicantName }} />
          <col style={{ minWidth: w.studiengangMin }} />
          <col style={{ width: w.fakultaet }} />
          <col style={{ width: w.ref }} />
          <col style={{ width: w.date }} />
          <col style={{ width: w.statusLabel }} />
          <col style={{ width: w.assignee }} />
          <col style={{ width: w.actions }} />
        </colgroup>
        <thead>
          <tr className="border-b border-border">
            {SORTABLE_COLUMNS.map((column) => (
              <SortableHeaderCell
                key={column}
                column={column}
                sort={sort}
                onSortChange={onSortChange}
                fitQ={fitQ}
                compactQ={compactQ}
              />
            ))}
            <th
              className={WORKSPACE_APPLICATIONS_TABLE_ACTIONS_HEADER_CLASS}
              aria-hidden
            />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="px-2 py-8 text-center text-hf-paragraph-small text-muted-foreground"
              >
                {emptyHint}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const isLast = index === rows.length - 1;
              return (
                <tr
                  key={row.application.id}
                  className={cn(
                    "group/tr cursor-pointer transition-colors hover:bg-background/80",
                    !isLast && "border-b border-stone-300",
                  )}
                  onClick={() => onSelectApplication(row.application.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectApplication(row.application.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Antrag ${row.applicantName} öffnen`}
                >
                  <td className={bodyCellClass("applicantName", fitQ, compactQ)}>
                    <span
                      className={cn(
                        hfTypography.paragraphSmall,
                        shouldWrapApplicantName(row.applicantName)
                          ? wrapCellTextClass
                          : nonWrapCellTextClass,
                      )}
                    >
                      {row.applicantName}
                    </span>
                  </td>
                  <td className={bodyCellClass("studiengang", fitQ, compactQ)}>
                    <span className={cn(hfTypography.paragraphSmall, wrapCellTextClass)}>
                      {row.studiengang}
                    </span>
                  </td>
                  <td className={bodyCellClass("fakultaet", fitQ, compactQ)}>
                    <span
                      className={cn(
                        hfTypography.paragraphSmall,
                        "block text-left text-foreground tabular-nums",
                      )}
                      title={row.fakultaetFullName}
                    >
                      {row.fakultaet}
                    </span>
                  </td>
                  <td className={bodyCellClass("ref", fitQ, compactQ)}>
                    <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                      {row.ref}
                    </span>
                  </td>
                  <td className={bodyCellClass("date", fitQ, compactQ)}>
                    <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                      {row.date}
                    </span>
                  </td>
                  <td className={bodyCellClass("statusLabel", fitQ, compactQ)}>
                    <StatusBadge label={row.statusLabel} className={row.statusClass} />
                  </td>
                  <td
                    className={cn(
                      bodyCellClass("assignee", fitQ, compactQ),
                      WORKSPACE_APPLICATIONS_TABLE_ASSIGNEE_CELL_CLASS,
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-150 text-[10px] font-semibold text-foreground"
                        aria-hidden
                      >
                        {row.assignee.initials}
                      </span>
                      <span
                        className={cn(
                          hfTypography.paragraphSmall,
                          "shrink-0 whitespace-nowrap text-foreground",
                        )}
                      >
                        {row.assignee.displayName}
                      </span>
                    </div>
                  </td>
                  <RowActionsCell applicantName={row.applicantName} />
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
