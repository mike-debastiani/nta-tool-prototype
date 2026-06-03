import type { WorkspaceApplication } from "@/lib/test-flow-types";

export type WorkspaceConsultationAppointmentDetails = {
  weekdayLine: string;
  dateLine: string;
  timeLine: string;
  locationLines: string[];
  advisorLines: string[];
};

type ConsultationDateFields = {
  dateIso?: string;
  slot?: string;
  date?: string;
};

export function parseConsultationStartFromFields(
  fields: ConsultationDateFields | null | undefined,
): Date | null {
  if (!fields) return null;
  const slot = fields.slot?.trim();
  const iso = fields.dateIso?.trim();
  if (iso) {
    const date = new Date(iso);
    if (Number.isFinite(date.getTime())) {
      if (slot) {
        const [fromRaw] = slot.split("-");
        const [hoursRaw, minutesRaw] = (fromRaw ?? "").trim().split(":");
        const hours = Number(hoursRaw);
        const minutes = Number(minutesRaw);
        if (Number.isFinite(hours) && Number.isFinite(minutes)) {
          date.setHours(hours, minutes, 0, 0);
        }
      }
      return date;
    }
  }

  const fallback = fields.date?.trim();
  if (!fallback) return null;

  const match =
    fallback.match(/(?:^.*?,\s*)?(\d{1,2})\.\s*([A-Za-zÄÖÜäöü]+)\s*(\d{4})?$/u);
  if (!match) return null;

  const day = Number(match[1]);
  const monthRaw = match[2]?.toLowerCase();
  const year = Number(match[3] || new Date().getFullYear());
  const monthMap: Record<string, number> = {
    januar: 0,
    februar: 1,
    maerz: 2,
    märz: 2,
    april: 3,
    mai: 4,
    juni: 5,
    juli: 6,
    august: 7,
    september: 8,
    oktober: 9,
    november: 10,
    dezember: 11,
  };
  const monthIndex = monthRaw ? monthMap[monthRaw] : undefined;
  if (monthIndex === undefined || !Number.isFinite(day) || !Number.isFinite(year)) {
    return null;
  }

  const date = new Date(year, monthIndex, day);
  if (slot) {
    const [fromRaw] = slot.split("-");
    const [hoursRaw, minutesRaw] = (fromRaw ?? "").trim().split(":");
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      date.setHours(hours, minutes, 0, 0);
    }
  }
  return date;
}

export function parseConsultationStart(application: WorkspaceApplication): Date | null {
  return parseConsultationStartFromFields(application.data.consultation);
}

function formatConsultationTimeLine(slot: string | undefined): string {
  if (!slot?.trim()) return "—";
  const normalized = slot.trim().replace(/\s*[-–]\s*/g, " - ");
  return `${normalized} Uhr`;
}

function splitLocationLines(location: string): string[] {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 4) {
    return [`${parts[0]}, ${parts[1]}`, parts[2], parts[3]];
  }
  if (parts.length === 3) {
    return parts;
  }
  return parts.length ? parts : ["—"];
}

const NTA_ADVISOR_ORG_LINES = [
  "Fachstelle Studium und Behinderung",
  "Universität Zürich",
] as const;

function resolveAdvisorLines(advisor: string | undefined): string[] {
  const trimmed = advisor?.trim();
  const nameLine = trimmed
    ? (trimmed.split(/,\s*/)[0]?.trim() || trimmed)
    : "—";
  return [nameLine, ...NTA_ADVISOR_ORG_LINES];
}

/** Gebuchter Beratungstermin aus `applications.data.consultation` (R2 Review, Figma 6081:24572). */
export function resolveWorkspaceConsultationAppointment(
  application: WorkspaceApplication,
): WorkspaceConsultationAppointmentDetails | null {
  const consultation = application.data.consultation;
  if (!consultation) return null;

  const consultationStatus = consultation.status;
  if (consultationStatus !== "booked" && consultationStatus !== "done") {
    return null;
  }

  const startsAt = parseConsultationStart(application);
  let weekdayLine: string;
  let dateLine: string;

  if (startsAt) {
    weekdayLine = startsAt.toLocaleDateString("de-CH", { weekday: "long" });
    dateLine = startsAt.toLocaleDateString("de-CH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } else if (consultation.date?.trim()) {
    const parts = consultation.date.split(",").map((part) => part.trim());
    weekdayLine = parts[0] ?? "—";
    dateLine = parts.slice(1).join(", ").trim() || "—";
  } else {
    return null;
  }

  const location = consultation.location?.trim();

  return {
    weekdayLine,
    dateLine,
    timeLine: formatConsultationTimeLine(consultation.slot),
    locationLines: location ? splitLocationLines(location) : ["—"],
    advisorLines: resolveAdvisorLines(consultation.advisor),
  };
}
