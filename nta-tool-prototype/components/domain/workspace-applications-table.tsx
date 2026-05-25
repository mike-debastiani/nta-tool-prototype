"use client";

import { ChevronsUpDown, MoreVertical } from "lucide-react";

import type { WorkspaceApplicationTableRow } from "@/lib/workspace-application-table-rows";
import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

type WorkspaceApplicationsTableProps = {
  rows: WorkspaceApplicationTableRow[];
  onSelectApplication: (applicationId: string) => void;
  emptyMessage?: string;
  className?: string;
};

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-hf-paragraph-mini-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Anträge-Tabelle (Figma Dashboard-Home `5948:27465`). */
export function WorkspaceApplicationsTable({
  rows,
  onSelectApplication,
  emptyMessage = "Keine Anträge für die aktuelle Filterung.",
  className,
}: WorkspaceApplicationsTableProps) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[1068px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            {(
              [
                "Name",
                "Studiengang",
                "Antragsnummer",
                "Datum",
                "Status",
                "Zugewiesen an",
              ] as const
            ).map((label) => (
              <th key={label} className="px-2 py-2 text-left">
                <span className="inline-flex items-center gap-2">
                  <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                    {label}
                  </span>
                  <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
                </span>
              </th>
            ))}
            <th className="w-10 px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-2 py-8 text-center text-hf-paragraph-small text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const isLast = index === rows.length - 1;
              return (
                <tr
                  key={row.application.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-background/80",
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
                  <td className="h-14 px-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-150 text-[10px] font-semibold text-foreground"
                        aria-hidden
                      >
                        {row.applicantInitials}
                      </span>
                      <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                        {row.applicantName}
                      </span>
                    </div>
                  </td>
                  <td className="h-14 px-2">
                    <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                      {row.studiengang}
                    </span>
                  </td>
                  <td className="h-14 px-2">
                    <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                      {row.ref}
                    </span>
                  </td>
                  <td className="h-14 px-2">
                    <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                      {row.date}
                    </span>
                  </td>
                  <td className="h-14 px-2">
                    <StatusBadge label={row.statusLabel} className={row.statusClass} />
                  </td>
                  <td className="h-14 px-2">
                    <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                      {row.assignee}
                    </span>
                  </td>
                  <td className="h-14 px-2">
                    <button
                      type="button"
                      className="inline-flex size-6 items-center justify-center text-foreground-alt"
                      aria-label={`Menü für ${row.applicantName}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <MoreVertical className="size-4" strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
