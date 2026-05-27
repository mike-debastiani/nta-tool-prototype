"use client";

import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { hfConsultationStatusSurfaceClass } from "@/lib/design-tokens/status-badge-colors";
import { hfTypography } from "@/lib/design-tokens/typography";
import type { WorkspaceConsultationAppointmentDetails } from "@/lib/workspace-consultation-appointment";
import { cn } from "@/lib/utils";

type WorkspaceConsultationAppointmentCardProps = {
  appointment: WorkspaceConsultationAppointmentDetails;
  className?: string;
};

function AppointmentField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start">
      <p className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>{label}</p>
      <div className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
        {children}
      </div>
    </div>
  );
}

/** Beratungstermin-Karte unter dem Beratungs-Callout (Figma 6081:24572). */
export function WorkspaceConsultationAppointmentCard({
  appointment,
  className,
}: WorkspaceConsultationAppointmentCardProps) {
  const router = useRouter();

  return (
    <section
      className={cn(
        "flex w-full flex-col gap-4 rounded-xl p-6",
        hfConsultationStatusSurfaceClass,
        className,
      )}
      data-node-id="6081:24572"
      aria-labelledby="workspace-consultation-appointment-title"
    >
      <div className="flex items-start justify-between gap-4">
        <h2
          id="workspace-consultation-appointment-title"
          className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}
        >
          Beratungstermin
        </h2>
        <button
          type="button"
          onClick={() => router.push("/workspace?view=terminplaner")}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary p-2 text-primary-foreground transition-opacity hover:opacity-90"
          aria-label="Beratungen planen öffnen"
        >
          <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <AppointmentField label="Datum">
          <p>
            {appointment.weekdayLine}
            <br />
            {appointment.dateLine}
            <br />
            {appointment.timeLine}
          </p>
        </AppointmentField>

        <AppointmentField label="Ort">
          {appointment.locationLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </AppointmentField>

        <AppointmentField label="Beratende Person">
          {appointment.advisorLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </AppointmentField>
      </div>
    </section>
  );
}
