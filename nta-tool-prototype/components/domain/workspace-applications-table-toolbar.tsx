"use client";

import { Download, Filter, Search } from "lucide-react";

import { WorkspaceApplicationsTableFilterPills } from "@/components/domain/workspace-applications-table-filter-pills";
import { WorkspaceApplicationsTableFilterPopover } from "@/components/domain/workspace-applications-table-filter-popover";
import { Input } from "@/components/ui/input";
import {
  countActiveWorkspaceTableFilters,
  type WorkspaceTableColumnFilters,
  type WorkspaceTableFilterOptions,
} from "@/lib/workspace-applications-table-controls";
import {
  WORKSPACE_HOME_TABLE_DOWNLOAD_BUTTON_CLASS,
  WORKSPACE_HOME_TABLE_FILTER_TAB_ACTIVE_CLASS,
  WORKSPACE_HOME_TABLE_FILTER_TAB_INACTIVE_CLASS,
  WORKSPACE_HOME_TABLE_FILTER_TOGGLE_CLASS,
  WORKSPACE_HOME_TABLE_OUTLINE_BUTTON_CLASS,
  WORKSPACE_HOME_TABLE_SEARCH_INPUT_CLASS,
  WORKSPACE_HOME_TABLE_SEARCH_WRAPPER_CLASS,
  WORKSPACE_HOME_TABLE_TOOLBAR_LEFT_CLASS,
  WORKSPACE_HOME_TABLE_TOOLBAR_ROW_CLASS,
} from "@/lib/design-tokens/workspace-dashboard";
import type { WorkspaceApplicationsOpenAllFilter } from "@/components/domain/use-workspace-applications-table-state";
import { cn } from "@/lib/utils";

type WorkspaceApplicationsTableToolbarProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  showOpenAllToggle?: boolean;
  openAllFilter?: WorkspaceApplicationsOpenAllFilter;
  onOpenAllFilterChange?: (value: WorkspaceApplicationsOpenAllFilter) => void;
  columnFilters: WorkspaceTableColumnFilters;
  filterOptions: WorkspaceTableFilterOptions;
  reviewerDisplayName: string;
  onColumnFiltersChange: (filters: WorkspaceTableColumnFilters) => void;
  onResetColumnFilters: () => void;
  filteredCount: number;
  totalCount: number;
};

export function WorkspaceApplicationsTableToolbar({
  searchQuery,
  onSearchQueryChange,
  showOpenAllToggle = false,
  openAllFilter = "open",
  onOpenAllFilterChange,
  columnFilters,
  filterOptions,
  reviewerDisplayName,
  onColumnFiltersChange,
  onResetColumnFilters,
  filteredCount,
  totalCount,
}: WorkspaceApplicationsTableToolbarProps) {
  const activeFilterCount = countActiveWorkspaceTableFilters(columnFilters);

  return (
    <div className="flex w-full shrink-0 flex-col gap-3">
    <div className={WORKSPACE_HOME_TABLE_TOOLBAR_ROW_CLASS} data-node-id="5948:27470">
      <div className={WORKSPACE_HOME_TABLE_TOOLBAR_LEFT_CLASS} data-node-id="5948:27472">
        <div className={WORKSPACE_HOME_TABLE_SEARCH_WRAPPER_CLASS} data-node-id="5957:22502">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Liste durchsuchen…"
            className={WORKSPACE_HOME_TABLE_SEARCH_INPUT_CLASS}
            aria-label="Liste durchsuchen"
          />
        </div>

        {showOpenAllToggle && onOpenAllFilterChange ? (
          <div
            className={WORKSPACE_HOME_TABLE_FILTER_TOGGLE_CLASS}
            data-node-id="5948:27474"
            role="group"
            aria-label="Offene oder alle Anträge"
          >
            <button
              type="button"
              onClick={() => onOpenAllFilterChange("open")}
              className={cn(
                "text-hf-paragraph-small-bold",
                openAllFilter === "open"
                  ? WORKSPACE_HOME_TABLE_FILTER_TAB_ACTIVE_CLASS
                  : WORKSPACE_HOME_TABLE_FILTER_TAB_INACTIVE_CLASS,
              )}
            >
              Offen
            </button>
            <button
              type="button"
              onClick={() => onOpenAllFilterChange("all")}
              className={cn(
                "text-hf-paragraph-small-bold",
                openAllFilter === "all"
                  ? WORKSPACE_HOME_TABLE_FILTER_TAB_ACTIVE_CLASS
                  : WORKSPACE_HOME_TABLE_FILTER_TAB_INACTIVE_CLASS,
              )}
            >
              Alle
            </button>
          </div>
        ) : null}

        <WorkspaceApplicationsTableFilterPopover
          filters={columnFilters}
          options={filterOptions}
          reviewerDisplayName={reviewerDisplayName}
          onFiltersChange={onColumnFiltersChange}
          onReset={onResetColumnFilters}
          trigger={
            <button
              type="button"
              className={cn(
                WORKSPACE_HOME_TABLE_OUTLINE_BUTTON_CLASS,
                "relative text-hf-paragraph-small-medium text-foreground",
              )}
              data-node-id="5948:27481"
              aria-label={
                activeFilterCount > 0
                  ? `Filter (${activeFilterCount} aktiv)`
                  : "Filter"
              }
            >
              <Filter className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              Filter
              {activeFilterCount > 0 ? (
                <span className="ml-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold leading-none text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          }
        />
      </div>

      <button
        type="button"
        className={cn(
          WORKSPACE_HOME_TABLE_DOWNLOAD_BUTTON_CLASS,
          "text-hf-paragraph-small-medium text-foreground",
        )}
        data-node-id="5948:27482"
      >
        <Download className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        Liste herunterladen
      </button>
    </div>

    <WorkspaceApplicationsTableFilterPills
      columnFilters={columnFilters}
      filteredCount={filteredCount}
      totalCount={totalCount}
      onColumnFiltersChange={onColumnFiltersChange}
      onResetColumnFilters={onResetColumnFilters}
    />
    </div>
  );
}
