"use client";

import { type ReactNode } from "react";
import {
  ArrowUpRight,
  ChevronsUpDown,
  Download,
  Filter,
  MoreVertical,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hfStatusBadgeClass } from "@/lib/design-tokens/status-badge-colors";
import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

/** Figma `5509:11682` — Workspace Home (Mock). */
const FIGMA_AVATAR_URL =
  "https://www.figma.com/api/mcp/asset/27ceb896-95bd-42de-93c3-02494ca68931";

type WorkspaceHomeDashboardProps = {
  reviewerDisplayName: string;
};

function greetingName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "Kollegin";
  const first = trimmed.split(/\s+/)[0];
  return first ?? trimmed;
}

function greetingPhrase(): string {
  const h = new Date().getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

function formatHomeDate(d: Date): string {
  return d.toLocaleDateString("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const mockAppointments = [
  { date: "Dienstag, 11. Juli", time: "08:15", name: "Jaquline Beispielien", room: "Zimmer 404" },
  { date: "Dienstag, 11. Juli", time: "08:15", name: "Jaquline Beispielien", room: "Zimmer 404" },
  { date: "Dienstag, 11. Juli", time: "08:15", name: "Jaquline Beispielien", room: "Zimmer 404" },
  { date: "Dienstag, 11. Juli", time: "08:15", name: "Jaquline Beispielien", room: "Zimmer 404" },
] as const;

type TableRow = {
  name: string;
  studiengang: string;
  ref: string;
  date: string;
  status: string;
  statusClass: string;
  assignee: string;
};

const mockTableRows: TableRow[] = [
  {
    name: "Suzanne Beispielien",
    studiengang: "Religionslehre (MA)",
    ref: "NTA-2024-0042",
    date: "02.07.2026",
    status: "Anpassung angefordert",
    statusClass: "bg-in-review-50 text-in-review-800",
    assignee: "Susanne Beispiel",
  },
  {
    name: "Suzanne Beispielien",
    studiengang: "Religionslehre (MA)",
    ref: "NTA-2024-0042",
    date: "02.07.2026",
    status: "Beratung & Empfehlung",
    statusClass: hfStatusBadgeClass.consultation_recommendation,
    assignee: "Susanne Beispiel",
  },
  {
    name: "Suzanne Beispielien",
    studiengang: "Religionslehre (MA)",
    ref: "NTA-2024-0042",
    date: "02.07.2026",
    status: "In Entscheid",
    statusClass: "bg-in-decision-50 text-in-decision-500",
    assignee: "Susanne Beispiel",
  },
  {
    name: "Suzanne Beispielien",
    studiengang: "Religionslehre (MA)",
    ref: "NTA-2024-0042",
    date: "02.07.2026",
    status: "Review erforderlich",
    statusClass: hfStatusBadgeClass.needs_adjustment.replace(
      "text-adjustment-500",
      "text-adjustment-600",
    ),
    assignee: "Susanne Beispiel",
  },
];

function SummaryCardShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[220px] shrink-0 flex-col gap-4 rounded-xl bg-stone-50 p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

function PrimaryIconLinkButton() {
  return (
    <button
      type="button"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      aria-label="Details öffnen"
    >
      <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

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

export function WorkspaceHomeDashboard({ reviewerDisplayName }: WorkspaceHomeDashboardProps) {
  const name = greetingName(reviewerDisplayName);
  const phrase = greetingPhrase();
  const todayLabel = formatHomeDate(new Date());

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-col gap-6 pb-6">
      <header className="flex items-start justify-between gap-4">
        <h1 className={cn(hfTypography.h3, "text-foreground")}>
          {phrase} {name}
        </h1>
        <p className={cn(hfTypography.paragraphSmallMedium, "shrink-0 text-muted-foreground")}>
          {todayLabel}
        </p>
      </header>

      <div className="flex gap-6">
        <SummaryCardShell className="w-[431px] max-w-[431px]">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>
              Offene Antragsverfahren
            </p>
            <PrimaryIconLinkButton />
          </div>
          <div className="flex min-h-0 flex-1 items-end justify-between gap-4">
            <p className="text-[128px] font-semibold leading-none tracking-tight text-foreground">
              73
            </p>
            <div className="flex h-[171px] items-end gap-4" aria-hidden>
              <div className="flex h-[85%] w-11 flex-col justify-end rounded-xl bg-beratung-100 px-2 pb-2 pt-3">
                <span className={cn(hfTypography.paragraphLargeMedium, "text-beratung-500")}>
                  23
                </span>
              </div>
              <div className="flex h-full w-12 flex-col justify-end rounded-xl bg-adjustment-200 px-2 pb-2 pt-3">
                <span className={cn(hfTypography.paragraphLargeMedium, "text-adjustment-600")}>
                  34
                </span>
              </div>
              <div className="flex h-[45%] w-11 flex-col justify-end rounded-xl bg-in-decision-200 pl-3 pr-2 pb-2 pt-3">
                <span className={cn(hfTypography.paragraphLargeMedium, "text-in-decision-500")}>
                  16
                </span>
              </div>
            </div>
          </div>
        </SummaryCardShell>

        <SummaryCardShell className="w-[319px] max-w-[319px]">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>
              Zugewiesene Aufgaben
            </p>
            <PrimaryIconLinkButton />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex flex-1 flex-col justify-between gap-3 rounded-xl bg-beratung-100 p-4">
              <p className={cn(hfTypography.paragraphMedium, "text-beratung-500")}>
                Beratungen
              </p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-[64px] font-semibold leading-none text-in-review-500">
                  6
                </span>
                <span className={cn(hfTypography.paragraphSmall, "text-beratung-500")}>
                  +5
                </span>
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-between gap-3 rounded-xl bg-adjustment-100 p-4">
              <p className={cn(hfTypography.paragraphMedium, "text-adjustment-600")}>
                Reviews
              </p>
              <div className="flex items-baseline gap-0.5 text-adjustment-600">
                <span className="text-[64px] font-semibold leading-none">23</span>
                <span className={cn(hfTypography.paragraphSmall)}>+16</span>
              </div>
            </div>
          </div>
        </SummaryCardShell>

        <div className="flex min-h-[220px] min-w-0 flex-1 flex-col gap-4 rounded-xl bg-beratung-100 p-6">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>
              Beratungen dieser Woche
            </p>
            <PrimaryIconLinkButton />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {mockAppointments.map((row, index) => (
              <div
                key={`${row.date}-${index}`}
                className="flex items-stretch border-b border-stone-300 last:border-b-0"
              >
                <div className="flex w-[113px] shrink-0 flex-col justify-center gap-0.5 px-2 py-2">
                  <p className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
                    {row.date}
                  </p>
                  <p className={cn(hfTypography.paragraphMiniMedium, "text-foreground")}>
                    {row.time}
                  </p>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2 py-2">
                  <p className={cn(hfTypography.paragraphMiniMedium, "truncate text-foreground")}>
                    {row.name}
                  </p>
                  <p className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
                    {row.room}
                  </p>
                </div>
                <div className="flex w-6 shrink-0 items-center justify-center py-2">
                  <ArrowUpRight className="size-4 text-foreground-alt" strokeWidth={1.75} aria-hidden />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-6 rounded-xl bg-stone-50 p-6">
        <h2 className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>Anträge</h2>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
            <div className="relative w-full max-w-[320px] min-w-[200px] flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.75}
                aria-hidden
              />
              <Input
                readOnly
                placeholder="Liste durchsuchen…"
                className="h-9 rounded-full border-border bg-background pl-10"
                aria-label="Liste durchsuchen (Mock)"
              />
            </div>
            <div className="flex items-center rounded-full border border-border p-[3px]">
              <button
                type="button"
                className={cn(
                  "rounded-full border border-border px-3 py-1.5",
                  hfTypography.paragraphSmallBold,
                  "text-foreground",
                )}
              >
                Offen
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-[10px] px-3 py-1.5",
                  hfTypography.paragraphSmall,
                  "text-muted-foreground",
                )}
              >
                Alle
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2 rounded-full border-border bg-background"
            >
              <Filter className="size-4" strokeWidth={1.75} aria-hidden />
              Filter
            </Button>
          </div>
          <Button
            type="button"
            className="h-9 shrink-0 gap-2 rounded-full bg-primary px-4 text-primary-foreground hover:bg-primary/90"
          >
            <Download className="size-4" strokeWidth={1.75} aria-hidden />
            Liste herunterladen
          </Button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1068px] border-collapse text-left">
            <thead>
              <tr>
                <th className="relative px-2 py-2 text-left after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-border">
                  <span className="inline-flex items-center gap-2">
                    <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                      Name
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                </th>
                <th className="relative px-2 py-2 text-left after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-border">
                  <span className="inline-flex items-center gap-2">
                    <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                      Studiengang
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                </th>
                <th className="relative px-2 py-2 text-left after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-border">
                  <span className="inline-flex items-center gap-2">
                    <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                      Antragsnummer
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                </th>
                <th className="relative px-2 py-2 text-left after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-border">
                  <span className="inline-flex items-center gap-2">
                    <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                      Datum
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                </th>
                <th className="relative px-2 py-2 text-left after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-border">
                  <span className="inline-flex items-center gap-2">
                    <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                      Status
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                </th>
                <th className="relative px-2 py-2 text-left after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-border">
                  <span className="inline-flex items-center gap-2">
                    <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                      Zugewiesen an
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                </th>
                <th className="relative w-10 px-2 py-2 after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-border" />
              </tr>
            </thead>
            <tbody>
              {mockTableRows.map((row) => (
                <tr key={`${row.ref}-${row.status}`}>
                  <td className="relative h-14 px-2 after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-stone-300">
                    <div className="flex items-center gap-2">
                      <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-stone-150">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={FIGMA_AVATAR_URL}
                          alt=""
                          className="size-full object-cover"
                        />
                      </span>
                      <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                        {row.name}
                      </span>
                    </div>
                  </td>
                  <td className="relative h-14 px-2 after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-stone-300">
                    <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                      {row.studiengang}
                    </span>
                  </td>
                  <td className="relative h-14 px-2 after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-stone-300">
                    <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                      {row.ref}
                    </span>
                  </td>
                  <td className="relative h-14 px-2 after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-stone-300">
                    <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                      {row.date}
                    </span>
                  </td>
                  <td className="relative h-14 px-2 after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-stone-300">
                    <StatusBadge label={row.status} className={row.statusClass} />
                  </td>
                  <td className="relative h-14 px-2 after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-stone-300">
                    <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                      {row.assignee}
                    </span>
                  </td>
                  <td className="relative h-14 px-2 after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-stone-300">
                    <button
                      type="button"
                      className="inline-flex size-6 items-center justify-center text-foreground-alt"
                      aria-label="Zeilenmenü"
                    >
                      <MoreVertical className="size-4" strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
