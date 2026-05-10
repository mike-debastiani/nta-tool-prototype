"use client";

import { type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import {
  Check,
  ExternalLink,
  FileText,
  SquarePen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationReviewDetailSidebar } from "@/components/domain/application-review-detail-sidebar";
import {
  APPLICATION_MEASURE_OPTIONS,
  APPLICATION_SCOPE_OPTIONS,
} from "@/lib/application-review-labels";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { cn } from "@/lib/utils";
import { getApplicationStatusMeta } from "@/lib/application-status";

type WorkspaceApplicationReviewProps = {
  application: WorkspaceApplication;
  reviewerDisplayName: string;
};

function formatFileSize(sizeInBytes: number) {
  if (!sizeInBytes || Number.isNaN(sizeInBytes)) return "—";
  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function WorkspaceApplicationReview({
  application,
  reviewerDisplayName,
}: WorkspaceApplicationReviewProps) {
  const data = application.data;
  const statusMeta = getApplicationStatusMeta(application, "R2");
  const def = data.applicationDefinition;

  return (
    <div className="flex min-h-0 flex-1 w-full min-w-0 flex-row overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-6 pb-8 pt-6">
        <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Antrag auf Nachteilsausgleich (NTA) – {shortApplicationRef(application.id)}
          </h1>
        </div>

        {/* Step „Persönliche Angaben“ ohne Antragsart (Figma: Antragsteller) */}
        <ReviewBlockCard
          title="Antragsteller"
          footer={
            <ReviewBlockActions
              onAdjust={() => {}}
              onConfirm={() => {}}
            />
          }
        >
          {data.personalData ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ReviewField
                label="Name"
                value={`${data.personalData.vorname ?? ""} ${data.personalData.name ?? ""}`.trim() || "—"}
              />
              <ReviewField
                label="Matrikelnummer"
                value={data.personalData.matrikel ?? "—"}
              />
              <ReviewField
                label="Studiengang"
                value={data.personalData.studiengang ?? "—"}
              />
              <ReviewField
                label="Semester"
                value={data.personalData.semester ?? "—"}
              />
              <ReviewField
                label="E-Mail"
                value={data.personalData.email ?? "—"}
              />
              <ReviewField
                label="Telefonnummer"
                value={data.personalData.phone ?? "—"}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Daten erfasst.</p>
          )}
        </ReviewBlockCard>

        {/* Fachärztliches Attest */}
        <ReviewBlockCard
          title="Fachärztliches Attest"
          footer={
            <ReviewBlockActions
              onAdjust={() => {}}
              onConfirm={() => {}}
            />
          }
        >
          {data.attestFiles?.length ? (
            <ul className="space-y-3">
              {data.attestFiles.map((file) => (
                <li key={file.id ?? file.name}>
                  <ReviewFileRow
                    title={file.name ?? "Datei"}
                    subtitle={formatFileSize(file.size ?? 0)}
                    href="#"
                    onNavigate={(e) => e.preventDefault()}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Dateien hochgeladen.</p>
          )}
        </ReviewBlockCard>

        {/* Empfehlungsschreiben — gleiche Dateikachel wie Attest, ohne Aktionen */}
        <ReviewBlockCard title="Empfehlungsschreiben der Fachstelle" footer={null}>
          {data.recommendation?.url ? (
            <ul className="space-y-3">
              <li>
                <ReviewFileRow
                  title={fileNameFromUrl(data.recommendation.url)}
                  subtitle="Empfehlung der Fachstelle"
                  href={data.recommendation.url}
                />
              </li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Kein Empfehlungsschreiben hinterlegt.</p>
          )}
        </ReviewBlockCard>

        {/* Antragsdefinition (Freitext) */}
        <ReviewBlockCard
          title="Antragsdefinition"
          footer={
            <ReviewBlockActions
              onAdjust={() => {}}
              onConfirm={() => {}}
            />
          }
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {def?.situationDescription?.trim()
              ? def.situationDescription
              : "Keine Beschreibung hinterlegt."}
          </p>
        </ReviewBlockCard>

        {/* Gültigkeitsdauer */}
        <ReviewBlockCard
          title="Gültigkeitsdauer des Nachteilsausgleiches"
          footer={
            <ReviewBlockActions
              onAdjust={() => {}}
              onConfirm={() => {}}
            />
          }
        >
          <DurationChoiceCompare selected={def?.duration} />
        </ReviewBlockCard>

        {/* Geltungsbereich */}
        <ReviewBlockCard
          title="Geltungsbereich des beantragten Nachteilsausgleiches"
          footer={
            <ReviewBlockActions
              onAdjust={() => {}}
              onConfirm={() => {}}
            />
          }
        >
          <ScopeChecklist selected={def?.scopeSelections ?? []} />
        </ReviewBlockCard>

        {/* Lehrveranstaltungen */}
        <ReviewBlockCard
          title="Ausgleichsmassnahmen für Lehrveranstaltungen"
          footer={
            <ReviewBlockActions
              onAdjust={() => {}}
              onConfirm={() => {}}
            />
          }
        >
          <MeasureChecklist
            options={APPLICATION_MEASURE_OPTIONS}
            selectedKeys={def?.lectureMeasures ?? []}
            otherEnabled={def?.lectureOtherEnabled}
            otherText={def?.lectureOtherText}
          />
        </ReviewBlockCard>

        {/* Leistungsnachweise */}
        <ReviewBlockCard
          title="Ausgleichsmassnahmen für Leistungsnachweise"
          footer={
            <ReviewBlockActions
              onAdjust={() => {}}
              onConfirm={() => {}}
            />
          }
        >
          <MeasureChecklist
            options={APPLICATION_MEASURE_OPTIONS}
            selectedKeys={def?.assessmentMeasures ?? []}
            otherEnabled={def?.assessmentOtherEnabled}
            otherText={def?.assessmentOtherText}
          />
        </ReviewBlockCard>

        <div className="pt-2">
          <Button
            type="button"
            className="h-11 w-full bg-zinc-900 text-white hover:bg-zinc-800 sm:w-auto sm:min-w-[240px]"
            disabled
            title="Logik folgt"
          >
            Anpassungen anfordern
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Gesamtaktion nach Block-Freigaben — Anbindung folgt.
          </p>
        </div>
        </div>
      </div>

      <aside className="flex h-full min-h-0 w-[366px] shrink-0 flex-col overflow-hidden border-l border-border bg-[#fafafa]">
        <ApplicationReviewDetailSidebar
          application={application}
          statusMeta={statusMeta}
          assignedReviewerLabel={reviewerDisplayName}
        />
      </aside>
    </div>
  );
}

function shortApplicationRef(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean).pop();
    if (!path) return "Empfehlungsschreiben";
    return decodeURIComponent(path);
  } catch {
    return "Empfehlungsschreiben";
  }
}

function ReviewFileRow({
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

function ReviewBlockCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode | null;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
      </div>
      <div className="space-y-4 px-6 py-5">{children}</div>
      {footer ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-6 py-4">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

function ReviewBlockActions({
  onAdjust,
  onConfirm,
}: {
  onAdjust: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="gap-2 border-amber-400/80 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-950/50"
        onClick={onAdjust}
      >
        <SquarePen className="size-4" aria-hidden />
        Anpassung anfordern
      </Button>
      <Button
        type="button"
        className="gap-2 bg-teal-600 text-white hover:bg-teal-700"
        onClick={onConfirm}
      >
        <Check className="size-4" aria-hidden />
        Bestätigen
      </Button>
    </>
  );
}

function DurationChoiceCompare({
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

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function ScopeChecklist({ selected }: { selected: string[] }) {
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
                    isOn ? "text-teal-950" : "text-muted-foreground line-through decoration-zinc-400/80",
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

function MeasureChecklist({
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
