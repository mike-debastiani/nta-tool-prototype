"use client";

import { X } from "lucide-react";

import { hfTypography } from "@/lib/design-tokens/typography";
import {
  WORKSPACE_HOME_TABLE_FILTER_PILL_CLASS,
  WORKSPACE_HOME_TABLE_FILTER_PILL_REMOVE_CLASS,
  WORKSPACE_HOME_TABLE_FILTER_PILLS_ROW_CLASS,
} from "@/lib/design-tokens/workspace-dashboard";
import {
  buildWorkspaceTableActiveFilterPills,
  removeWorkspaceTableFilterPill,
  type WorkspaceTableActiveFilterPill,
  type WorkspaceTableColumnFilters,
} from "@/lib/workspace-applications-table-controls";
import { cn } from "@/lib/utils";

type WorkspaceApplicationsTableFilterPillsProps = {
  columnFilters: WorkspaceTableColumnFilters;
  filteredCount: number;
  totalCount: number;
  onColumnFiltersChange: (filters: WorkspaceTableColumnFilters) => void;
  onResetColumnFilters: () => void;
};

function FilterPill({
  pill,
  onRemove,
}: {
  pill: WorkspaceTableActiveFilterPill;
  onRemove: () => void;
}) {
  const displayValue = pill.value ?? pill.label;
  const showCategory = pill.value != null && pill.dimension !== "assignedToMeOnly";

  return (
    <span className={WORKSPACE_HOME_TABLE_FILTER_PILL_CLASS}>
      {showCategory ? (
        <span className="shrink-0 text-muted-foreground">{pill.label}:</span>
      ) : null}
      <span className="min-w-0 truncate" title={displayValue}>
        {displayValue}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className={WORKSPACE_HOME_TABLE_FILTER_PILL_REMOVE_CLASS}
        aria-label={`Filter «${displayValue}» entfernen`}
      >
        <X className="size-3.5" strokeWidth={2} aria-hidden />
      </button>
    </span>
  );
}

export function WorkspaceApplicationsTableFilterPills({
  columnFilters,
  filteredCount,
  totalCount,
  onColumnFiltersChange,
  onResetColumnFilters,
}: WorkspaceApplicationsTableFilterPillsProps) {
  const pills = buildWorkspaceTableActiveFilterPills(columnFilters);

  if (pills.length === 0) return null;

  const hasNarrowing = filteredCount !== totalCount;

  return (
    <div
      className="flex w-full min-w-0 flex-col gap-2"
      role="region"
      aria-label="Aktive Filter"
    >
      {hasNarrowing ? (
        <p className={cn(hfTypography.paragraphMiniMedium, "text-muted-foreground")}>
          {filteredCount === 0
            ? `Keine Treffer in ${totalCount} Anträgen`
            : `${filteredCount} von ${totalCount} Anträgen`}
        </p>
      ) : null}

      <div className={WORKSPACE_HOME_TABLE_FILTER_PILLS_ROW_CLASS}>
        {pills.map((pill) => (
          <FilterPill
            key={pill.id}
            pill={pill}
            onRemove={() =>
              onColumnFiltersChange(removeWorkspaceTableFilterPill(columnFilters, pill))
            }
          />
        ))}
        {pills.length > 1 ? (
          <button
            type="button"
            onClick={onResetColumnFilters}
            className={cn(
              hfTypography.paragraphMiniMedium,
              "shrink-0 px-1 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline",
            )}
          >
            Alle Filter entfernen
          </button>
        ) : null}
      </div>
    </div>
  );
}
