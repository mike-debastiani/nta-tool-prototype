"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { hfTypography } from "@/lib/design-tokens/typography";
import {
  countActiveWorkspaceTableFilters,
  type WorkspaceTableColumnFilters,
  type WorkspaceTableFilterOptionEntry,
  type WorkspaceTableFilterOptions,
} from "@/lib/workspace-applications-table-controls";
import { cn } from "@/lib/utils";

type WorkspaceApplicationsTableFilterPopoverProps = {
  filters: WorkspaceTableColumnFilters;
  options: WorkspaceTableFilterOptions;
  reviewerDisplayName: string;
  onFiltersChange: (filters: WorkspaceTableColumnFilters) => void;
  onReset: () => void;
  trigger: ReactNode;
};

function FilterSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className={cn(
        hfTypography.paragraphMiniMedium,
        "px-1 text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}

function FilterOptionButton({
  label,
  count,
  selected,
  onToggle,
}: {
  label: string;
  count: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
        "text-hf-paragraph-small text-foreground hover:bg-stone-100",
        selected && "bg-stone-100",
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded border border-border",
          selected && "border-primary bg-primary text-primary-foreground",
        )}
        aria-hidden
      >
        {selected ? <Check className="size-3" strokeWidth={2.5} /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={cn(
          hfTypography.paragraphMiniMedium,
          "shrink-0 tabular-nums text-muted-foreground",
        )}
        aria-hidden
      >
        {count}
      </span>
    </button>
  );
}

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function FilterOptionSection({
  title,
  entries,
  selectedValues,
  onToggleValue,
}: {
  title: string;
  entries: WorkspaceTableFilterOptionEntry[];
  selectedValues: string[];
  onToggleValue: (value: string) => void;
}) {
  const visibleEntries = entries.filter((entry) => entry.count > 0);

  if (visibleEntries.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <FilterSectionTitle>{title}</FilterSectionTitle>
      {visibleEntries.map((entry) => (
        <FilterOptionButton
          key={entry.value}
          label={entry.value}
          count={entry.count}
          selected={selectedValues.includes(entry.value)}
          onToggle={() => onToggleValue(entry.value)}
        />
      ))}
    </div>
  );
}

export function WorkspaceApplicationsTableFilterPopover({
  filters,
  options,
  reviewerDisplayName,
  onFiltersChange,
  onReset,
  trigger,
}: WorkspaceApplicationsTableFilterPopoverProps) {
  const activeCount = countActiveWorkspaceTableFilters(filters);

  const hasAnySection =
    options.canAssignToMeOnly
    || options.statusLabels.length > 0
    || options.studiengaenge.length > 0
    || options.fakultaeten.length > 0
    || options.assignees.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        className="w-80 gap-0 rounded-xl border border-border bg-background p-0 shadow-md ring-1 ring-foreground/5"
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
            Filter
          </p>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={onReset}
              className={cn(
                hfTypography.paragraphMiniMedium,
                "text-muted-foreground underline-offset-2 hover:text-foreground hover:underline",
              )}
            >
              Zurücksetzen
            </button>
          ) : null}
        </div>

        <div className="flex max-h-[min(420px,60vh)] flex-col gap-4 overflow-y-auto overscroll-contain p-3">
          {!hasAnySection ? (
            <p className={cn(hfTypography.paragraphSmall, "px-1 text-muted-foreground")}>
              Keine Filteroptionen für die aktuelle Liste.
            </p>
          ) : null}

          {options.canAssignToMeOnly ? (
            <div className="flex flex-col gap-1">
              <FilterSectionTitle>Schnellfilter</FilterSectionTitle>
              <FilterOptionButton
                label={`Nur mir zugewiesen (${reviewerDisplayName.trim() || "ich"})`}
                count={options.assignedToMeCount}
                selected={filters.assignedToMeOnly}
                onToggle={() =>
                  onFiltersChange({
                    ...filters,
                    assignedToMeOnly: !filters.assignedToMeOnly,
                  })
                }
              />
            </div>
          ) : null}

          <FilterOptionSection
            title="Status"
            entries={options.statusLabels}
            selectedValues={filters.statusLabels}
            onToggleValue={(value) =>
              onFiltersChange({
                ...filters,
                statusLabels: toggleInList(filters.statusLabels, value),
              })
            }
          />

          <FilterOptionSection
            title="Studiengang"
            entries={options.studiengaenge}
            selectedValues={filters.studiengaenge}
            onToggleValue={(value) =>
              onFiltersChange({
                ...filters,
                studiengaenge: toggleInList(filters.studiengaenge, value),
              })
            }
          />

          <FilterOptionSection
            title="Fakultät"
            entries={options.fakultaeten}
            selectedValues={filters.fakultaeten}
            onToggleValue={(value) =>
              onFiltersChange({
                ...filters,
                fakultaeten: toggleInList(filters.fakultaeten, value),
              })
            }
          />

          <FilterOptionSection
            title="Zugewiesen an"
            entries={options.assignees}
            selectedValues={filters.assignees}
            onToggleValue={(value) =>
              onFiltersChange({
                ...filters,
                assignees: toggleInList(filters.assignees, value),
              })
            }
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
