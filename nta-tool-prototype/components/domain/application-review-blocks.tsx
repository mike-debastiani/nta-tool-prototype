"use client";

import {
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { Check, ExternalLink, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  APPLICATION_MEASURE_OPTIONS,
  APPLICATION_SCOPE_OPTIONS,
} from "@/lib/application-review-labels";

export function formatReviewFileSize(sizeInBytes: number) {
  if (!sizeInBytes || Number.isNaN(sizeInBytes)) return "—";
  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function shortApplicationRef(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/**
 * Visueller Tonus eines Review-Block-Footers / -Rahmens.
 * - `default`: neutraler Card-Look (für noch ausstehende Aktionen).
 * - `confirmed`: teal — R2 hat bestätigt bzw. R1 zeigt einen vom Kommentar
 *   nicht betroffenen Block.
 * - `adjustment`: amber — R2 hat eine Anpassung angefordert.
 */
export type ReviewBlockFooterTone = "default" | "confirmed" | "adjustment";

export function ReviewBlockCard({
  title,
  children,
  footer,
  footerTone = "default",
  anchorId,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode | null;
  footerTone?: ReviewBlockFooterTone;
  anchorId?: string;
}) {
  /** Gleiche vertikale Polsterung über alle States — verhindert Höhensprung beim Wechsel der Fußzeile. */
  const footerClassName =
    footerTone === "default"
      ? "flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-6 py-3"
      : footerTone === "confirmed"
        ? "flex flex-wrap items-center justify-between gap-3 border-t border-teal-600 bg-teal-600 px-3 py-3 dark:bg-teal-600"
        : "flex flex-wrap items-center justify-between gap-3 border-t border-amber-400 bg-amber-400 px-3 py-3";

  const sectionClassName = cn(
    "scroll-mt-6 overflow-hidden rounded-xl bg-card shadow-xs",
    footerTone === "default" && "border border-border",
    footerTone === "confirmed" &&
      "border-[1.5px] border-teal-600 dark:border-teal-500",
    footerTone === "adjustment" && "border-[1.5px] border-amber-400",
  );

  return (
    <section className={sectionClassName} id={anchorId}>
      <div className="space-y-6 px-6 pt-5 pb-5">
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
        {children}
      </div>
      {footer ? <div className={footerClassName}>{footer}</div> : null}
    </section>
  );
}

export function ReviewBlockFooterStatus({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-white"
      role="status"
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

export function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

export function ReviewFileRow({
  title,
  subtitle,
  href,
  onNavigate,
}: {
  title: string;
  subtitle: string;
  href: string;
  onNavigate?: (e: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a
      href={href}
      target={href === "#" ? undefined : "_blank"}
      rel={href === "#" ? undefined : "noreferrer"}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm shadow-xs transition-colors hover:bg-muted/40"
      onClick={onNavigate}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <FileText className="size-5 text-muted-foreground" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </span>
      </span>
      <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </a>
  );
}

/**
 * Read-only Vergleichsdarstellung „Gesamte Studiendauer“ vs. „Einmalig …“.
 * Wird sowohl von der R2-Review-Kachel als auch von der R1-Adjustment-Ansicht
 * im Lesemodus genutzt.
 */
export function DurationChoiceCompare({
  selected,
}: {
  selected?: "full_study" | "one_semester";
}) {
  const options: {
    id: "full_study" | "one_semester";
    title: string;
    hint: string;
  }[] = [
    {
      id: "full_study",
      title: "Gesamte Studiendauer",
      hint: "Der Ausgleich gilt für die gesamte Dauer des Studiums.",
    },
    {
      id: "one_semester",
      title: "Einmalig für ein Semester",
      hint: "Der Ausgleich gilt für ein Semester; eine Verlängerung ist separat zu beantragen.",
    },
  ];

  if (!selected) {
    return (
      <p className="text-sm text-muted-foreground">Keine Auswahl gespeichert.</p>
    );
  }

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const isSelected = selected === opt.id;
        return (
          <div
            key={opt.id}
            className={cn(
              "rounded-lg border px-4 py-3 transition-colors",
              isSelected
                ? "border-teal-300 bg-teal-50/90 shadow-xs"
                : "border-zinc-200 bg-zinc-50/80 opacity-80",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  isSelected
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-zinc-300 bg-white text-transparent",
                )}
                aria-hidden
              >
                <Check className="size-3 stroke-[3]" />
              </span>
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    isSelected ? "text-teal-950" : "text-muted-foreground",
                  )}
                >
                  {opt.title}
                  {isSelected ? (
                    <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-teal-700">
                      Gewählt
                    </span>
                  ) : (
                    <span className="ml-2 text-xs font-medium text-muted-foreground">
                      Nicht gewählt
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{opt.hint}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ScopeChecklist({ selected }: { selected: string[] }) {
  const set = new Set(selected);
  return (
    <ul className="space-y-2">
      {APPLICATION_SCOPE_OPTIONS.map((option) => {
        const isOn = set.has(option);
        return (
          <li key={option}>
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                isOn
                  ? "border-teal-200 bg-teal-50/90 shadow-xs"
                  : "border-dashed border-zinc-200 bg-zinc-50/60",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                  isOn
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-zinc-300 bg-white text-zinc-300",
                )}
                aria-hidden
              >
                {isOn ? <Check className="size-3.5 stroke-[3]" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isOn
                      ? "text-teal-950"
                      : "text-muted-foreground line-through decoration-zinc-400/80",
                  )}
                >
                  {option}
                </span>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {isOn ? "Vom Studierenden gewählt" : "Nicht gewählt"}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function MeasureChecklist({
  options,
  selectedKeys,
  otherEnabled,
  otherText,
}: {
  options: readonly { key: string; label: string }[];
  selectedKeys: string[];
  otherEnabled?: boolean;
  otherText?: string;
}) {
  const set = new Set(selectedKeys);
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {options.map((option) => {
          const isOn = set.has(option.key);
          return (
            <li key={option.key}>
              <div
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                  isOn
                    ? "border-teal-200 bg-teal-50/90 shadow-xs"
                    : "border-dashed border-zinc-200 bg-zinc-50/60",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                    isOn
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-zinc-300 bg-white text-zinc-300",
                  )}
                  aria-hidden
                >
                  {isOn ? <Check className="size-3.5 stroke-[3]" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isOn
                        ? "text-teal-950"
                        : "text-muted-foreground line-through decoration-zinc-400/80",
                    )}
                  >
                    {option.label}
                  </span>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {isOn ? "Vom Studierenden gewählt" : "Nicht gewählt"}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {otherEnabled ? (
        <div
          className={cn(
            "rounded-lg border px-3 py-3",
            otherText?.trim()
              ? "border-teal-200 bg-teal-50/90 shadow-xs"
              : "border-dashed border-zinc-200 bg-zinc-50/60",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sonstige Massnahme
          </p>
          <p
            className={cn(
              "mt-1 text-sm",
              otherText?.trim()
                ? "font-medium text-teal-950"
                : "text-muted-foreground line-through decoration-zinc-400/80",
            )}
          >
            {otherText?.trim() || "Keine Angabe"}
          </p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {otherText?.trim() ? "Vom Studierenden ergänzt" : "Nicht gewählt"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export { APPLICATION_MEASURE_OPTIONS, APPLICATION_SCOPE_OPTIONS };
