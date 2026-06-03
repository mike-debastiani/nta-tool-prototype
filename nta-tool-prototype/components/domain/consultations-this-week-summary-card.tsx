"use client";

import { ArrowUpRight, Calendar } from "lucide-react";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";

import { hfConsultationStatusSurfaceClass } from "@/lib/design-tokens/status-badge-colors";
import { hfTypography } from "@/lib/design-tokens/typography";
import {
  type WorkspaceConsultationRow,
  computeConsultationsThisWeek,
} from "@/lib/workspace-consultations-this-week";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { cn } from "@/lib/utils";

/** Entspricht `min-h-14` pro Zeile in der Liste. */
const CONSULTATION_ROW_HEIGHT_PX = 56;

function useVisibleConsultationRowCount(
  listRef: RefObject<HTMLDivElement | null>,
  totalRows: number,
) {
  const [visibleCount, setVisibleCount] = useState(() =>
    totalRows > 0 ? Math.min(totalRows, 4) : 0,
  );

  useLayoutEffect(() => {
    const element = listRef.current;
    if (!element || totalRows === 0) {
      setVisibleCount(0);
      return;
    }

    const update = () => {
      const fit = Math.max(1, Math.floor(element.clientHeight / CONSULTATION_ROW_HEIGHT_PX));
      setVisibleCount(Math.min(totalRows, fit));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [listRef, totalRows]);

  return visibleCount;
}

type ConsultationsThisWeekSummaryCardProps = {
  className?: string;
  applications: WorkspaceApplication[];
  onHeaderIconClick?: () => void;
  onSelectApplication?: (applicationId: string) => void;
};

function RowLocation({ row }: { row: WorkspaceConsultationRow }) {
  return (
    <span className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
      {row.locationLabel}
    </span>
  );
}

export function ConsultationsThisWeekSummaryCard({
  className,
  applications,
  onHeaderIconClick,
  onSelectApplication,
}: ConsultationsThisWeekSummaryCardProps) {
  const allRows = computeConsultationsThisWeek(applications);
  const listRef = useRef<HTMLDivElement>(null);
  const visibleCount = useVisibleConsultationRowCount(listRef, allRows.length);
  const rows = allRows.slice(0, visibleCount);

  return (
    <div
      className={cn(
        "flex min-h-[220px] min-w-0 flex-col gap-4 rounded-xl p-6",
        hfConsultationStatusSurfaceClass,
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between">
        <p className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>
          Anstehende Beratungen
        </p>
        <button
          type="button"
          onClick={onHeaderIconClick}
          className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-stone-600"
          aria-label="Beratungen planen öffnen"
        >
          <Calendar className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      {allRows.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center rounded-lg border border-dashed border-stone-250 px-3 py-4">
          <p className={cn(hfTypography.paragraphSmall, "text-muted-foreground")}>
            Keine offenen Beratungen mit gebuchtem Termin (ohne «Empfehlung verfasst»).
          </p>
        </div>
      ) : (
        <div ref={listRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {rows.map((row) => (
            <div
              key={`${row.applicationId}-${row.startsAt.toISOString()}`}
              role={onSelectApplication ? "button" : undefined}
              tabIndex={onSelectApplication ? 0 : undefined}
              className={cn(
                "flex w-full items-start border-b border-border text-left last:border-b-0",
                onSelectApplication &&
                  "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
              onClick={
                onSelectApplication
                  ? () => onSelectApplication(row.applicationId)
                  : undefined
              }
              onKeyDown={
                onSelectApplication
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectApplication(row.applicationId);
                      }
                    }
                  : undefined
              }
              aria-label={
                onSelectApplication
                  ? `Antrag ${row.applicantName} öffnen`
                  : undefined
              }
            >
              <div className="flex min-w-0 flex-1 items-start">
                <div className="flex min-h-14 min-w-0 basis-[34%] flex-col justify-center gap-0.5 py-2">
                  <p className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                    {row.timeLabel}
                  </p>
                  <p className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
                    {row.dateLabel}
                  </p>
                </div>

                <div className="flex min-h-14 min-w-0 basis-[66%] flex-col justify-center gap-0.5 py-2 pl-5 pr-2">
                  <p className={cn(hfTypography.paragraphSmallMedium, "truncate text-foreground")}>
                    {row.applicantName}
                  </p>
                  <RowLocation row={row} />
                </div>
              </div>

              <div className="ml-auto flex min-h-14 w-6 shrink-0 items-start justify-center py-2">
                <ArrowUpRight className="size-[18px] text-foreground-alt" strokeWidth={1.75} aria-hidden />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
