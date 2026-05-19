"use client";

import {
  CalendarCheck,
  Hash,
  RefreshCcw,
  User,
  Users,
} from "lucide-react";

import { hfTypography } from "@/lib/design-tokens/typography";
import { formatReviewSubmittedAt } from "@/lib/application-review-labels";
import type { ApplicationAssignee } from "@/lib/application-assignee";
import type { ApplicationStatusMeta } from "@/lib/application-status";
import { resolveApplicantDisplayName } from "@/lib/application-assignee";
import type { WorkspaceApplication } from "@/lib/test-flow-types";
import { cn } from "@/lib/utils";

function statusTextColorFromBadgeClass(badgeClassName: string): string {
  const textClass = badgeClassName.split(/\s+/).find((c) => c.startsWith("text-"));
  return textClass ?? "text-stone-500";
}

type DetailRowProps = {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: React.ReactNode;
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

/** Figma 5435:11416 — Antragdetails-Karte im rechten Dashboard-Panel. */
export function ApplicationDetailsCard({
  application,
  statusMeta,
  assignee,
  className,
}: ApplicationDetailsCardProps) {
  const submitted = formatReviewSubmittedAt(application.data);
  const updated = new Date(application.updated_at).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const applicantName = resolveApplicantDisplayName(application);
  const statusDotColor = statusTextColorFromBadgeClass(statusMeta.className);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl bg-background px-3 py-4",
        className,
      )}
      data-node-id="5435:11416"
    >
      <h2 className={cn(hfTypography.h4, "text-foreground")}>Antragdetails</h2>

      <div className="flex flex-col gap-2">
        <div className="flex min-h-5 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
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
              "inline-flex max-w-[60%] shrink-0 items-center justify-center rounded-lg px-2 py-0.5 text-xs font-medium",
              statusMeta.className,
            )}
          >
            {statusMeta.label}
          </span>
        </div>

        <DetailRow icon={User} label="Antragsteller" value={applicantName} />

        <DetailRow
          icon={CalendarCheck}
          label="Eingereicht am"
          value={submitted ?? "—"}
        />

        <DetailRow icon={RefreshCcw} label="Zuletzt aktualisiert" value={updated} />

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
