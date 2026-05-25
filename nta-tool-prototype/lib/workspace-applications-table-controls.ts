import type { WorkspaceApplicationTableRow } from "@/lib/workspace-application-table-rows";

export type WorkspaceTableSortColumn =
  | "applicantName"
  | "studiengang"
  | "fakultaet"
  | "ref"
  | "date"
  | "statusLabel"
  | "assignee";

export type WorkspaceTableSort = {
  column: WorkspaceTableSortColumn;
  direction: "asc" | "desc";
};

export type WorkspaceTableColumnFilters = {
  statusLabels: string[];
  studiengaenge: string[];
  fakultaeten: string[];
  assignees: string[];
  assignedToMeOnly: boolean;
};

export const EMPTY_WORKSPACE_TABLE_COLUMN_FILTERS: WorkspaceTableColumnFilters = {
  statusLabels: [],
  studiengaenge: [],
  fakultaeten: [],
  assignees: [],
  assignedToMeOnly: false,
};

export type WorkspaceTableFilterOptionEntry = {
  value: string;
  count: number;
};

export type WorkspaceTableFilterOptions = {
  statusLabels: WorkspaceTableFilterOptionEntry[];
  studiengaenge: WorkspaceTableFilterOptionEntry[];
  fakultaeten: WorkspaceTableFilterOptionEntry[];
  assignees: WorkspaceTableFilterOptionEntry[];
  /** Schnellfilter «Nur mir zugewiesen» ist mit übrigen Filtern noch sinnvoll. */
  canAssignToMeOnly: boolean;
  assignedToMeCount: number;
};

export type WorkspaceTableFilterFacetDimension =
  | "statusLabels"
  | "studiengaenge"
  | "fakultaeten"
  | "assignees";

export type WorkspaceTableActiveFilterPill = {
  id: string;
  dimension: WorkspaceTableFilterFacetDimension | "assignedToMeOnly";
  label: string;
  value?: string;
};

const sortDe = (a: string, b: string) => a.localeCompare(b, "de-CH");

function sortEntries(
  entries: WorkspaceTableFilterOptionEntry[],
): WorkspaceTableFilterOptionEntry[] {
  return [...entries].sort((a, b) => sortDe(a.value, b.value));
}

function countByField(
  rows: WorkspaceApplicationTableRow[],
  pick: (row: WorkspaceApplicationTableRow) => string,
): WorkspaceTableFilterOptionEntry[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = pick(row);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return sortEntries(
    [...counts.entries()].map(([value, count]) => ({ value, count })),
  );
}

function countAssignedToReviewer(
  rows: WorkspaceApplicationTableRow[],
  reviewer: string,
): number {
  if (!reviewer) return 0;
  return rows.filter((row) => namesMatch(row.assignee.displayName, reviewer)).length;
}

export function deriveWorkspaceTableFilterOptions(
  rows: WorkspaceApplicationTableRow[],
  options?: { reviewerDisplayName?: string },
): WorkspaceTableFilterOptions {
  const reviewer = options?.reviewerDisplayName?.trim() ?? "";
  const assignedToMeCount = countAssignedToReviewer(rows, reviewer);

  return {
    statusLabels: countByField(rows, (row) => row.statusLabel),
    studiengaenge: countByField(rows, (row) => row.studiengang),
    fakultaeten: countByField(rows, (row) => row.fakultaet),
    assignees: countByField(rows, (row) => row.assignee.displayName),
    canAssignToMeOnly: assignedToMeCount > 0,
    assignedToMeCount,
  };
}

function filtersWithoutDimension(
  filters: WorkspaceTableColumnFilters,
  dimension: WorkspaceTableFilterFacetDimension | "assignedToMeOnly",
): WorkspaceTableColumnFilters {
  switch (dimension) {
    case "statusLabels":
      return { ...filters, statusLabels: [] };
    case "studiengaenge":
      return { ...filters, studiengaenge: [] };
    case "fakultaeten":
      return { ...filters, fakultaeten: [] };
    case "assignees":
      return { ...filters, assignees: [] };
    case "assignedToMeOnly":
      return { ...filters, assignedToMeOnly: false };
    default:
      return filters;
  }
}

/** Facettierte Optionen: pro Dimension nur Werte, die nach den übrigen Filtern noch vorkommen. */
export function deriveFacetedWorkspaceTableFilterOptions(
  rows: WorkspaceApplicationTableRow[],
  filters: WorkspaceTableColumnFilters,
  options?: { reviewerDisplayName?: string },
): WorkspaceTableFilterOptions {
  const reviewer = options?.reviewerDisplayName?.trim() ?? "";

  const statusRows = applyWorkspaceTableColumnFilters(
    rows,
    filtersWithoutDimension(filters, "statusLabels"),
    options,
  );
  const studiengangRows = applyWorkspaceTableColumnFilters(
    rows,
    filtersWithoutDimension(filters, "studiengaenge"),
    options,
  );
  const fakultaetRows = applyWorkspaceTableColumnFilters(
    rows,
    filtersWithoutDimension(filters, "fakultaeten"),
    options,
  );
  const assigneeRows = applyWorkspaceTableColumnFilters(
    rows,
    filtersWithoutDimension(filters, "assignees"),
    options,
  );
  const quickFilterRows = applyWorkspaceTableColumnFilters(
    rows,
    filtersWithoutDimension(filters, "assignedToMeOnly"),
    options,
  );

  const assignedToMeCount = countAssignedToReviewer(quickFilterRows, reviewer);

  return {
    statusLabels: countByField(statusRows, (row) => row.statusLabel),
    studiengaenge: countByField(studiengangRows, (row) => row.studiengang),
    fakultaeten: countByField(fakultaetRows, (row) => row.fakultaet),
    assignees: countByField(assigneeRows, (row) => row.assignee.displayName),
    canAssignToMeOnly: assignedToMeCount > 0,
    assignedToMeCount,
  };
}

export function workspaceTableColumnFiltersEqual(
  a: WorkspaceTableColumnFilters,
  b: WorkspaceTableColumnFilters,
): boolean {
  return (
    a.assignedToMeOnly === b.assignedToMeOnly
    && a.statusLabels.length === b.statusLabels.length
    && a.studiengaenge.length === b.studiengaenge.length
    && a.fakultaeten.length === b.fakultaeten.length
    && a.assignees.length === b.assignees.length
    && a.statusLabels.every((value, index) => value === b.statusLabels[index])
    && a.studiengaenge.every((value, index) => value === b.studiengaenge[index])
    && a.fakultaeten.every((value, index) => value === b.fakultaeten[index])
    && a.assignees.every((value, index) => value === b.assignees[index])
  );
}

/** Entfernt Auswahlen, die in der aktuellen Facettenmenge nicht mehr vorkommen. */
export function sanitizeWorkspaceTableColumnFilters(
  filters: WorkspaceTableColumnFilters,
  options: WorkspaceTableFilterOptions,
): WorkspaceTableColumnFilters {
  const statusValues = new Set(options.statusLabels.map((entry) => entry.value));
  const studiengangValues = new Set(
    options.studiengaenge.map((entry) => entry.value),
  );
  const fakultaetValues = new Set(options.fakultaeten.map((entry) => entry.value));
  const assigneeValues = new Set(options.assignees.map((entry) => entry.value));

  return {
    assignedToMeOnly:
      filters.assignedToMeOnly && options.canAssignToMeOnly
        ? true
        : false,
    statusLabels: filters.statusLabels.filter((value) => statusValues.has(value)),
    studiengaenge: filters.studiengaenge.filter((value) =>
      studiengangValues.has(value),
    ),
    fakultaeten: filters.fakultaeten.filter((value) => fakultaetValues.has(value)),
    assignees: filters.assignees.filter((value) => assigneeValues.has(value)),
  };
}

export function buildWorkspaceTableActiveFilterPills(
  filters: WorkspaceTableColumnFilters,
): WorkspaceTableActiveFilterPill[] {
  const pills: WorkspaceTableActiveFilterPill[] = [];

  if (filters.assignedToMeOnly) {
    pills.push({
      id: "assignedToMeOnly",
      dimension: "assignedToMeOnly",
      label: "Nur mir zugewiesen",
    });
  }

  for (const value of filters.statusLabels) {
    pills.push({
      id: `status:${value}`,
      dimension: "statusLabels",
      label: "Status",
      value,
    });
  }

  for (const value of filters.studiengaenge) {
    pills.push({
      id: `studiengang:${value}`,
      dimension: "studiengaenge",
      label: "Studiengang",
      value,
    });
  }

  for (const value of filters.fakultaeten) {
    pills.push({
      id: `fakultaet:${value}`,
      dimension: "fakultaeten",
      label: "Fakultät",
      value,
    });
  }

  for (const value of filters.assignees) {
    pills.push({
      id: `assignee:${value}`,
      dimension: "assignees",
      label: "Zugewiesen an",
      value,
    });
  }

  return pills;
}

export function removeWorkspaceTableFilterPill(
  filters: WorkspaceTableColumnFilters,
  pill: WorkspaceTableActiveFilterPill,
): WorkspaceTableColumnFilters {
  if (pill.dimension === "assignedToMeOnly") {
    return { ...filters, assignedToMeOnly: false };
  }
  if (!pill.value) return filters;

  switch (pill.dimension) {
    case "statusLabels":
      return {
        ...filters,
        statusLabels: filters.statusLabels.filter((value) => value !== pill.value),
      };
    case "studiengaenge":
      return {
        ...filters,
        studiengaenge: filters.studiengaenge.filter((value) => value !== pill.value),
      };
    case "fakultaeten":
      return {
        ...filters,
        fakultaeten: filters.fakultaeten.filter((value) => value !== pill.value),
      };
    case "assignees":
      return {
        ...filters,
        assignees: filters.assignees.filter((value) => value !== pill.value),
      };
    default:
      return filters;
  }
}

export function countActiveWorkspaceTableFilters(
  filters: WorkspaceTableColumnFilters,
): number {
  return (
    (filters.assignedToMeOnly ? 1 : 0)
    + filters.statusLabels.length
    + filters.studiengaenge.length
    + filters.fakultaeten.length
    + filters.assignees.length
  );
}

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function applyWorkspaceTableColumnFilters(
  rows: WorkspaceApplicationTableRow[],
  filters: WorkspaceTableColumnFilters,
  options?: { reviewerDisplayName?: string },
): WorkspaceApplicationTableRow[] {
  const reviewer = options?.reviewerDisplayName?.trim() ?? "";
  const hasStatus = filters.statusLabels.length > 0;
  const hasStudiengang = filters.studiengaenge.length > 0;
  const hasFakultaet = filters.fakultaeten.length > 0;
  const hasAssignee = filters.assignees.length > 0;

  return rows.filter((row) => {
    if (filters.assignedToMeOnly && reviewer) {
      if (!namesMatch(row.assignee.displayName, reviewer)) return false;
    }
    if (hasStatus && !filters.statusLabels.includes(row.statusLabel)) {
      return false;
    }
    if (hasStudiengang && !filters.studiengaenge.includes(row.studiengang)) {
      return false;
    }
    if (hasFakultaet && !filters.fakultaeten.includes(row.fakultaet)) {
      return false;
    }
    if (hasAssignee && !filters.assignees.includes(row.assignee.displayName)) {
      return false;
    }
    return true;
  });
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, "de-CH", { sensitivity: "base" });
}

export function sortWorkspaceApplicationTableRows(
  rows: WorkspaceApplicationTableRow[],
  sort: WorkspaceTableSort | null,
): WorkspaceApplicationTableRow[] {
  if (!sort) return rows;

  const direction = sort.direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sort.column) {
      case "applicantName":
        cmp = compareStrings(a.applicantName, b.applicantName);
        break;
      case "studiengang":
        cmp = compareStrings(a.studiengang, b.studiengang);
        break;
      case "fakultaet":
        cmp = compareStrings(a.fakultaet, b.fakultaet);
        break;
      case "ref":
        cmp = compareStrings(a.ref, b.ref);
        break;
      case "date":
        cmp = a.dateSortValue - b.dateSortValue;
        break;
      case "statusLabel":
        cmp = compareStrings(a.statusLabel, b.statusLabel);
        break;
      case "assignee":
        cmp = compareStrings(a.assignee.displayName, b.assignee.displayName);
        break;
      default:
        cmp = 0;
    }
    if (cmp === 0) {
      cmp = compareStrings(a.ref, b.ref);
    }
    return cmp * direction;
  });
}

export function filterWorkspaceTableRowsBySearch(
  rows: WorkspaceApplicationTableRow[],
  query: string,
): WorkspaceApplicationTableRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;

  return rows.filter(
    (row) =>
      row.applicantName.toLowerCase().includes(q)
      || row.studiengang.toLowerCase().includes(q)
      || row.fakultaet.toLowerCase().includes(q)
      || (row.fakultaetFullName?.toLowerCase().includes(q) ?? false)
      || row.ref.toLowerCase().includes(q)
      || row.assignee.displayName.toLowerCase().includes(q)
      || row.statusLabel.toLowerCase().includes(q),
  );
}

/** Nächster Sortierzustand beim Klick auf eine Spalte (asc → desc → aus). */
export function nextWorkspaceTableSort(
  current: WorkspaceTableSort | null,
  column: WorkspaceTableSortColumn,
): WorkspaceTableSort | null {
  if (!current || current.column !== column) {
    return { column, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { column, direction: "desc" };
  }
  return null;
}

export const WORKSPACE_TABLE_SORT_COLUMN_LABELS: Record<
  WorkspaceTableSortColumn,
  string
> = {
  applicantName: "Name",
  studiengang: "Studiengang",
  fakultaet: "Fakultät",
  ref: "Antragsnummer",
  date: "Datum",
  statusLabel: "Status",
  assignee: "Zugewiesen an",
};
