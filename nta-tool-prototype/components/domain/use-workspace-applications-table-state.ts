"use client";

import { useEffect, useMemo, useState } from "react";

import { deriveCanonicalApplicationState } from "@/lib/application-status";
import type { UserRole } from "@/lib/auth";
import { usesR4OnlyHomeLayout } from "@/lib/workspace-role";
import type { WorkspaceApplication } from "@/lib/test-flow-types";
import { buildWorkspaceApplicationTableRows } from "@/lib/workspace-application-table-rows";
import {
  applyWorkspaceTableColumnFilters,
  deriveFacetedWorkspaceTableFilterOptions,
  EMPTY_WORKSPACE_TABLE_COLUMN_FILTERS,
  filterWorkspaceTableRowsBySearch,
  sanitizeWorkspaceTableColumnFilters,
  sortWorkspaceApplicationTableRows,
  workspaceTableColumnFiltersEqual,
  type WorkspaceTableColumnFilters,
  type WorkspaceTableSort,
} from "@/lib/workspace-applications-table-controls";

export type WorkspaceApplicationsOpenAllFilter = "open" | "all";

function isOpenApplication(application: WorkspaceApplication): boolean {
  const state = deriveCanonicalApplicationState(application);
  return state !== "approved" && state !== "rejected";
}

type UseWorkspaceApplicationsTableStateOptions = {
  applications: WorkspaceApplication[];
  reviewerDisplayName: string;
  workspaceRole: UserRole;
  /** Wenn gesetzt: nur diese Anträge (z. B. Meine Aufgaben), kein Offen/Alle auf Rohliste. */
  prefilteredApplications?: WorkspaceApplication[];
  initialOpenAllFilter?: WorkspaceApplicationsOpenAllFilter;
};

export function useWorkspaceApplicationsTableState({
  applications,
  reviewerDisplayName,
  workspaceRole,
  prefilteredApplications,
  initialOpenAllFilter,
}: UseWorkspaceApplicationsTableStateOptions) {
  const defaultOpenAllFilter =
    initialOpenAllFilter ?? (usesR4OnlyHomeLayout(workspaceRole) ? "all" : "open");
  const [searchQuery, setSearchQuery] = useState("");
  const [openAllFilter, setOpenAllFilter] =
    useState<WorkspaceApplicationsOpenAllFilter>(defaultOpenAllFilter);
  const [columnFilters, setColumnFilters] = useState<WorkspaceTableColumnFilters>(
    EMPTY_WORKSPACE_TABLE_COLUMN_FILTERS,
  );
  const [sort, setSort] = useState<WorkspaceTableSort | null>(null);

  const baseRows = useMemo(() => {
    const list =
      prefilteredApplications != null
        ? prefilteredApplications
        : applications.filter((application) => {
            if (openAllFilter === "open" && !isOpenApplication(application)) {
              return false;
            }
            return true;
          });

    return buildWorkspaceApplicationTableRows(list, {
      reviewerDisplayName,
      workspaceRole,
    });
  }, [
    applications,
    openAllFilter,
    prefilteredApplications,
    reviewerDisplayName,
    workspaceRole,
  ]);

  const searchFilteredRows = useMemo(
    () => filterWorkspaceTableRowsBySearch(baseRows, searchQuery),
    [baseRows, searchQuery],
  );

  const filterOptions = useMemo(
    () =>
      deriveFacetedWorkspaceTableFilterOptions(searchFilteredRows, columnFilters, {
        reviewerDisplayName,
      }),
    [searchFilteredRows, columnFilters, reviewerDisplayName],
  );

  useEffect(() => {
    const sanitized = sanitizeWorkspaceTableColumnFilters(columnFilters, filterOptions);
    if (!workspaceTableColumnFiltersEqual(columnFilters, sanitized)) {
      setColumnFilters(sanitized);
    }
  }, [columnFilters, filterOptions]);

  const columnFilteredRows = useMemo(
    () =>
      applyWorkspaceTableColumnFilters(searchFilteredRows, columnFilters, {
        reviewerDisplayName,
      }),
    [searchFilteredRows, columnFilters, reviewerDisplayName],
  );

  const displayedRows = useMemo(
    () => sortWorkspaceApplicationTableRows(columnFilteredRows, sort),
    [columnFilteredRows, sort],
  );

  const resetColumnFilters = () => {
    setColumnFilters(EMPTY_WORKSPACE_TABLE_COLUMN_FILTERS);
  };

  return {
    searchQuery,
    setSearchQuery,
    openAllFilter,
    setOpenAllFilter,
    columnFilters,
    setColumnFilters,
    sort,
    setSort,
    baseRows,
    displayedRows,
    filterOptions,
    filteredCount: columnFilteredRows.length,
    totalCount: searchFilteredRows.length,
    resetColumnFilters,
  };
}
