import { resolveApplicantDisplayName } from "@/lib/application-assignee";
import { isConsultationPhaseApplication } from "@/lib/application-status";
import { workspaceApplicationListNumber } from "@/components/domain/application-review-blocks";
import type { WorkspaceApplication } from "@/lib/test-flow-types";
import { parseConsultationStartFromFields } from "@/lib/workspace-consultation-appointment";

export type ConsultationPlannerAppointmentVariant =
  | "active"
  | "completed"
  | "rescheduled";

export type ConsultationPlannerAppointment = {
  applicationId: string;
  applicantName: string;
  appointmentDate: Date;
  dateKey: string;
  weekdayShortLine: string;
  timeLabel: string;
  locationLabel: string;
  locationType: "zoom" | "onsite";
  listNumber: string;
  variant: ConsultationPlannerAppointmentVariant;
  /** Eindeutiger Listen-Schlüssel (aktueller vs. verschobener Slot). */
  listKey: string;
};

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeSlotLabel(slot: string): string {
  return slot.replace(/\s*[-–]\s*/g, " – ");
}

/** Adresse als Paar-Schema: «Gebäude, Raum • Strasse, PLZ Ort». */
export function formatAppointmentLocation(raw: string | undefined): string {
  const parts =
    raw
      ?.split(",")
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  if (parts.length === 0) {
    return "UZH Gebäude SBO, Raum E-103 • Schönbergstrasse 15, 8001 Zürich";
  }

  const groups: string[] = [];
  for (let index = 0; index < parts.length; index += 2) {
    groups.push(parts.slice(index, index + 2).join(", "));
  }
  return groups.join(" • ");
}

function resolvePlannerAppointmentVariant(
  application: WorkspaceApplication,
  slotRole: "current" | "superseded",
): ConsultationPlannerAppointmentVariant {
  if (slotRole === "superseded") return "rescheduled";
  if (!isConsultationPhaseApplication(application)) return "completed";
  return "active";
}

function buildPlannerAppointmentRow(
  application: WorkspaceApplication,
  startsAt: Date,
  fields: {
    slot?: string;
    location?: string;
    locationType?: "zoom" | "onsite";
  },
  slotRole: "current" | "superseded",
  listKeySuffix: string,
): ConsultationPlannerAppointment {
  const slot = fields.slot?.trim();
  const timeLabel = slot
    ? normalizeSlotLabel(slot)
    : startsAt.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });

  const weekdayShortLine = `${capitalize(
    startsAt.toLocaleDateString("de-CH", { weekday: "long" }),
  )}, ${startsAt.toLocaleDateString("de-CH", { day: "numeric", month: "long" })}`;

  const dateKey = formatDateKey(startsAt);

  return {
    applicationId: application.id,
    applicantName: resolveApplicantDisplayName(application),
    appointmentDate: startsAt,
    dateKey,
    weekdayShortLine,
    timeLabel,
    locationLabel: formatAppointmentLocation(fields.location),
    locationType: fields.locationType === "zoom" ? "zoom" : "onsite",
    listNumber: workspaceApplicationListNumber(application),
    variant: resolvePlannerAppointmentVariant(application, slotRole),
    listKey: `${application.id}-${dateKey}-${listKeySuffix}`,
  };
}

/** Hat der Antrag einen real gebuchten Beratungstermin (unabhängig vom Antragsstatus)? */
export function hasBookedConsultation(application: WorkspaceApplication): boolean {
  const status = application.data.consultation?.status;
  return status === "booked" || status === "done";
}

/** Kalender + Tagesliste — aktuelle und verschobene Slots. */
export function buildConsultationPlannerAppointments(
  applications: WorkspaceApplication[],
): ConsultationPlannerAppointment[] {
  return applications
    .flatMap((application) => {
      if (!hasBookedConsultation(application)) return [];

      const consultation = application.data.consultation;
      if (!consultation) return [];

      const rows: ConsultationPlannerAppointment[] = [];

      for (const [index, superseded] of (
        consultation.supersededAppointments ?? []
      ).entries()) {
        const startsAt = parseConsultationStartFromFields(superseded);
        if (!startsAt) continue;
        rows.push(
          buildPlannerAppointmentRow(
            application,
            startsAt,
            superseded,
            "superseded",
            `superseded-${index}`,
          ),
        );
      }

      const currentStart = parseConsultationStartFromFields(consultation);
      if (currentStart) {
        rows.push(
          buildPlannerAppointmentRow(
            application,
            currentStart,
            consultation,
            "current",
            "current",
          ),
        );
      }

      return rows;
    })
    .sort((a, b) => a.appointmentDate.getTime() - b.appointmentDate.getTime());
}

export const CONSULTATION_PLANNER_APPOINTMENT_ROW_CLASS: Record<
  ConsultationPlannerAppointmentVariant,
  { surface: string; accent: string; strike: boolean }
> = {
  active: {
    surface: "bg-consultation-surface hover:bg-consultation-surface/80",
    accent: "bg-beratung-500",
    strike: false,
  },
  completed: {
    surface: "bg-stone-100 hover:bg-stone-100/80",
    accent: "bg-stone-300",
    strike: false,
  },
  rescheduled: {
    surface: "bg-abgelehnt-100 hover:bg-abgelehnt-100/70",
    accent: "bg-abgelehnt-600",
    strike: true,
  },
};
