"use client";

import { useCallback, useState, type ComponentType, type ReactNode } from "react";
import {
  CalendarCheck,
  Copy,
  File,
  Hash,
  RefreshCcw,
  School,
  User,
  Users,
} from "lucide-react";

import { APPLICATION_CONTENT_PANEL_CARD_CLASS } from "@/lib/design-tokens/application-content-panel";
import { hfTypography } from "@/lib/design-tokens/typography";
import {
  formatDurationLabel,
  formatReviewSubmittedAt,
} from "@/lib/application-review-labels";
import type { ApplicationAssignee } from "@/lib/application-assignee";
import type { ApplicationStatusMeta } from "@/lib/application-status";
import { resolveApplicantDisplayName } from "@/lib/application-assignee";
import { studienstufeFromStudiengang } from "@/lib/studiengaenge";
import type { ApplicationData, WorkspaceApplication } from "@/lib/test-flow-types";
import { cn } from "@/lib/utils";

function statusTextColorFromBadgeClass(badgeClassName: string): string {
  const textClass = badgeClassName.split(/\s+/).find((c) => c.startsWith("text-"));
  return textClass ?? "text-stone-500";
}

function formatValidityDuration(data: ApplicationData): string {
  const duration = data.applicationDefinition?.duration;
  const label = formatDurationLabel(duration);
  if (label === "Gesamte Studiendauer") return "Ende des Studiums";
  if (label === "Keine Angabe") return "—";
  return label;
}

type DetailRowProps = {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: ReactNode;
  valueClassName?: string;
};

function DetailRow({ icon: Icon, label, value, valueClassName }: DetailRowProps) {
  return (
    <div className="flex min-h-5 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-stone-500" strokeWidth={1.75} aria-hidden />
        <span className={cn(hfTypography.paragraphMini, "text-stone-500")}>{label}</span>
      </div>
      <div
        className={cn(
          hfTypography.paragraphMini,
          "min-w-0 shrink text-right text-foreground",
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
}

type ApplicationDetailsCardProps = {
  application: WorkspaceApplication;
  statusMeta: ApplicationStatusMeta;
  assignee: ApplicationAssignee;
  className?: string;
};

/** Figma `5652:18411` — Antragdetails-Karte im rechten Dashboard-Panel. */
export function ApplicationDetailsCard({
  application,
  statusMeta,
  assignee,
  className,
}: ApplicationDetailsCardProps) {
  const [copied, setCopied] = useState(false);
  const submitted = formatReviewSubmittedAt(application.data);
  const updated = new Date(application.updated_at).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const applicantName = resolveApplicantDisplayName(application);
  const personal = application.data.personalData;
  const statusDotColor = statusTextColorFromBadgeClass(statusMeta.className);

  const copyApplicationId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(application.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [application.id]);

  return (
    <div
      className={cn(
        APPLICATION_CONTENT_PANEL_CARD_CLASS,
        "flex w-full min-w-0 flex-col gap-4 p-4",
        className,
      )}
      data-node-id="5652:18411"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>
          Antragdetails
        </h2>
        <button
          type="button"
          onClick={() => void copyApplicationId()}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-150 text-foreground-alt transition-colors hover:bg-stone-200/80"
          aria-label={copied ? "Antrags-ID kopiert" : "Antrags-ID kopieren"}
          title={copied ? "Kopiert" : "Antrags-ID kopieren"}
        >
          <Copy className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex min-h-5 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn("flex size-4 items-center justify-center", statusDotColor)}
              aria-hidden
            >
              <span className="size-2 rounded-full bg-current" />
            </span>
            <span className={cn(hfTypography.paragraphMini, "text-stone-500")}>Status</span>
          </div>
          <span
            className={cn(
              "inline-flex max-w-[60%] shrink-0 items-center justify-center rounded-lg px-2 py-0.5 text-hf-paragraph-mini-medium",
              statusMeta.className,
            )}
          >
            {statusMeta.label}
          </span>
        </div>

        <DetailRow icon={User} label="Antragsteller" value={applicantName} />

        <DetailRow
          icon={File}
          label="Matrikelnummer"
          value={personal?.matrikel?.trim() || "—"}
        />

        <DetailRow
          icon={School}
          label="Studienstufe"
          value={studienstufeFromStudiengang(personal?.studiengang)}
        />

        <DetailRow
          icon={CalendarCheck}
          label="Eingereicht am"
          value={submitted ?? "—"}
        />

        <DetailRow icon={RefreshCcw} label="Zuletzt aktualisiert" value={updated} />

        <DetailRow
          icon={CalendarCheck}
          label="Gültigkeitsdauer"
          value={formatValidityDuration(application.data)}
        />

        <DetailRow
          icon={Users}
          label="Zugewiesen an"
          value={
            <span className="inline-flex items-center justify-end gap-2">
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-stone-150 text-[10px] font-semibold leading-none text-foreground"
                aria-hidden
              >
                {assignee.initials}
              </span>
              <span className="truncate">{assignee.displayName}</span>
            </span>
          }
        />

        <DetailRow
          icon={Hash}
          label="Antrags-ID"
          value={
            <span className="max-w-[169px] break-all text-right">{application.id}</span>
          }
        />
      </div>
    </div>
  );
}
