"use client";

import {
  Calendar,
  Check,
  Copy,
  Hash,
  MessageSquare,
  User,
  UserCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { formatReviewSubmittedAt } from "@/lib/application-review-labels";
import { type ApplicationStatusMeta } from "@/lib/application-status";

type DetailRow = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
};

type ApplicationReviewDetailSidebarProps = {
  application: WorkspaceApplication;
  statusMeta: ApplicationStatusMeta;
  /** Shown for „Zugewiesen an“ — typically the logged-in R2 reviewer in the prototype. */
  assignedReviewerLabel: string;
};

export function ApplicationReviewDetailSidebar({
  application,
  statusMeta,
  assignedReviewerLabel,
}: ApplicationReviewDetailSidebarProps) {
  const submitted = formatReviewSubmittedAt(application.data);
  const updated = new Date(application.updated_at).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const primaryRows = useMemo<DetailRow[]>(
    () => [
      {
        icon: User,
        label: "Antragsteller",
        value: <ApplicantNameWithId application={application} />,
      },
      {
        icon: Calendar,
        label: "Eingereicht am",
        value: (
          <span className="text-foreground">{submitted ?? "—"}</span>
        ),
      },
      {
        icon: UserCircle,
        label: "Zuletzt aktualisiert",
        value: <span className="text-foreground">{updated}</span>,
      },
      {
        icon: User,
        label: "Zugewiesen an",
        value: (
          <span className="inline-flex items-center gap-2 text-foreground">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[10px] font-semibold text-white">
              {initialsFromName(assignedReviewerLabel)}
            </span>
            <span className="truncate">{assignedReviewerLabel}</span>
          </span>
        ),
      },
      {
        icon: Hash,
        label: "Antrags-ID",
        value: (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
            {application.id}
          </code>
        ),
      },
    ],
    [application, assignedReviewerLabel, submitted, updated],
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fafafa]">
      <div className="shrink-0 space-y-4 border-b border-border px-5 py-5">
        <h2 className="text-sm font-semibold text-foreground">Antragdetails</h2>
        <div className="space-y-0">
          {/* Status row — Notion-style pill */}
          <div className="flex min-h-9 items-start gap-2 py-1.5">
            <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
              <span className="size-2 rounded-full bg-current opacity-60" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
              <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
                Status
              </span>
              <span
                className={cn(
                  "inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-xs font-semibold",
                  statusMeta.className,
                )}
              >
                {statusMeta.label}
              </span>
            </div>
          </div>
          {primaryRows.map((row) => (
            <DetailPropertyRow key={row.label} {...row} />
          ))}
        </div>
      </div>

      <section
        className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-5 pt-4"
        aria-labelledby="review-comments-heading"
      >
        <div className="mb-3 flex shrink-0 items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
          <h3 id="review-comments-heading" className="text-sm font-semibold text-foreground">
            Kommentare
          </h3>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-dashed border-border bg-background/80 p-4">
          <p className="text-sm text-muted-foreground">
            Kommentarverlauf folgt — dieser Bereich ist scrollbar vorgesehen.
          </p>
        </div>
      </section>
    </div>
  );
}

function DetailPropertyRow({
  icon: Icon,
  label,
  value,
}: DetailRow) {
  return (
    <div className="flex min-h-9 items-start gap-2 py-1.5">
      <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">{label}</span>
        <div className="min-w-0 flex-1 text-right text-sm sm:text-right">{value}</div>
      </div>
    </div>
  );
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/** Aligns with Antragsteller block: Formularname zuerst, dann Profil, dann Fallback. */
function resolveApplicantDisplayName(application: WorkspaceApplication): string {
  const pd = application.data.personalData;
  const fromForm = pd
    ? `${pd.vorname ?? ""} ${pd.name ?? ""}`.trim()
    : "";
  if (fromForm) return fromForm;
  const u = application.users[0];
  if (u?.display_name?.trim()) return u.display_name.trim();
  if (u?.email?.trim()) return u.email.trim();
  return "Antragsteller";
}

function ApplicantNameWithId({ application }: { application: WorkspaceApplication }) {
  const id = application.applicant_id;
  const name = resolveApplicantDisplayName(application);
  const [copied, setCopied] = useState(false);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <span className="inline-flex max-w-full min-w-0 items-center justify-end gap-1">
      <span
        className="min-w-0 truncate text-right font-medium text-foreground"
        title={id}
      >
        {name}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void copyId();
        }}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={`Antragsteller-ID (Hover auf den Namen)\n${id}\n\nKlick: ID kopieren`}
        aria-label="Antragsteller-ID kopieren"
      >
        {copied ? (
          <Check className="size-3.5 text-teal-600" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
      </button>
    </span>
  );
}
