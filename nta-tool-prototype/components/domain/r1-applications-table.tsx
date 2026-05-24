"use client";

import { ChevronsUpDown, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, ReactNode } from "react";

import { ApplicationStatusBadge } from "@/components/domain/application-status-badge";
import {
  formatR1SubmittedDate,
  formatR1ValidUntil,
  formatR1ValidityDuration,
  r1ApplicationListNumber,
} from "@/lib/r1-application-list-meta";
import { hfTypography } from "@/lib/design-tokens/typography";
import type { ApplicationRow } from "@/lib/test-flow-types";
import { cn } from "@/lib/utils";

type R1ApplicationsTableProps = {
  applications: ApplicationRow[];
};

function TableHeaderCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn("px-2 pb-2 pt-2 text-left align-middle", className)}
    >
      <div className="flex items-center gap-2">
        <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
          {children}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>
    </th>
  );
}

function TableCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("h-14 px-2 py-2 align-middle", className)}>
      {children}
    </td>
  );
}

/** Figma `5878:1918` — Anträge-Tabelle. */
export function R1ApplicationsTable({ applications }: R1ApplicationsTableProps) {
  const router = useRouter();

  const openApplication = (applicationId: string) => {
    router.push(`/portal/antragserstellung?applicationId=${applicationId}`);
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    applicationId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openApplication(applicationId);
    }
  };

  return (
    <section className="flex w-full flex-col gap-6 rounded-xl bg-stone-50 p-6">
      <h2 className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>
        Anträge
      </h2>

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <TableHeaderCell className="w-[220px]">Antragsnummer</TableHeaderCell>
              <TableHeaderCell className="w-[200px]">Einreichedatum</TableHeaderCell>
              <TableHeaderCell className="w-[200px]">Gültigkeitsdauer</TableHeaderCell>
              <TableHeaderCell className="w-[146px]">Gültig bis</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <th scope="col" className="w-10 px-2 pb-2 pt-2">
                <span className="sr-only">Aktionen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center">
                  <p className={cn(hfTypography.paragraphSmall, "text-muted-foreground")}>
                    Noch keine Anträge vorhanden.
                  </p>
                </td>
              </tr>
            ) : null}
            {applications.map((application) => {
              const ref = r1ApplicationListNumber(application);
              const submitted =
                formatR1SubmittedDate(application)
                ?? new Date(application.created_at).toLocaleDateString("de-CH", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });

              return (
                <tr
                  key={application.id}
                  className={cn(
                    "cursor-pointer border-b border-border transition-colors last:border-b-0",
                    "hover:bg-background/80",
                  )}
                  onClick={() => openApplication(application.id)}
                  onKeyDown={(event) => handleRowKeyDown(event, application.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Antrag ${ref} öffnen`}
                >
                  <TableCell>
                    <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                      {ref}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                      {submitted}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                      {formatR1ValidityDuration(application)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                      {formatR1ValidUntil(application)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ApplicationStatusBadge
                      application={application}
                      audience="R1"
                      className={cn(
                        hfTypography.paragraphMiniMedium,
                        "rounded-lg px-2 py-0.5 font-medium",
                      )}
                    />
                  </TableCell>
                  <TableCell className="w-10 text-center">
                    <MoreVertical
                      className="mx-auto size-6 text-foreground"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </TableCell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
