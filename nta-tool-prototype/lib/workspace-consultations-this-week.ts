import {
  hasReleasedRecommendation,
  isConsultationPhaseApplication,
} from "@/lib/application-status";
import { type WorkspaceApplication } from "@/lib/test-flow-types";

export type WorkspaceConsultationRow = {
  applicationId: string;
  dateLabel: string;
  timeLabel: string;
  applicantName: string;
  locationLabel: string;
  startsAt: Date;
};

function parseConsultationStart(application: WorkspaceApplication): Date | null {
  const slot = application.data.consultation?.slot?.trim();
  const iso = application.data.consultation?.dateIso?.trim();
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

  const fallback = application.data.consultation?.date?.trim();
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

function resolveApplicantName(application: WorkspaceApplication): string {
  const userName = application.users[0]?.display_name?.trim();
  if (userName) return userName;
  const first = application.data.personalData?.vorname?.trim() ?? "";
  const last = application.data.personalData?.name?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || "Antragstellende Person";
}

function resolveTimeLabel(slot: string | undefined): string {
  if (!slot) return "—";
  const [fromRaw, toRaw] = slot.split("-");
  const from = fromRaw?.trim();
  const to = toRaw?.trim();
  if (from && to) return `${from} - ${to}`;
  return slot;
}

function resolveModeAndLocation(
  application: WorkspaceApplication,
): Pick<WorkspaceConsultationRow, "locationLabel"> {
  const location = application.data.consultation?.location?.trim() ?? "";
  if (/sbo|sob/i.test(location) || /e-?103/i.test(location) || /schönbergstrasse/i.test(location)) {
    return {
      locationLabel: "Gebäude SBO, Raum E-103",
    };
  }

  return {
    locationLabel: "Gebäude SBO, Raum E-103",
  };
}

/** Beratungstermine im Status «Beratung & Empfehlung» ohne «Empfehlung verfasst» (inkl. vergangene Termine). */
export function computeConsultationsThisWeek(
  applications: WorkspaceApplication[],
): WorkspaceConsultationRow[] {
  return applications
    .filter((application) => {
      if (!isConsultationPhaseApplication(application)) {
        return false;
      }
      if (hasReleasedRecommendation(application)) {
        return false;
      }
      const consultationStatus = application.data.consultation?.status;
      if (consultationStatus !== "booked" && consultationStatus !== "done") {
        return false;
      }
      return parseConsultationStart(application) !== null;
    })
    .map((application) => {
      const startsAt = parseConsultationStart(application) as Date;
      const modeAndLocation = resolveModeAndLocation(application);

      return {
        applicationId: application.id,
        startsAt,
        dateLabel: `${startsAt.toLocaleDateString("de-CH", {
          weekday: "long",
        })}, ${startsAt.toLocaleDateString("de-CH", {
          day: "2-digit",
          month: "2-digit",
        })}`,
        timeLabel: resolveTimeLabel(application.data.consultation?.slot),
        applicantName: resolveApplicantName(application),
        ...modeAndLocation,
      };
    })
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
