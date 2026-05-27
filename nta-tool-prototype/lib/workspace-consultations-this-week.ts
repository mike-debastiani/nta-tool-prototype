import {
  hasReleasedRecommendation,
  isConsultationPhaseApplication,
} from "@/lib/application-status";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { parseConsultationStart } from "@/lib/workspace-consultation-appointment";

export type WorkspaceConsultationRow = {
  applicationId: string;
  dateLabel: string;
  timeLabel: string;
  applicantName: string;
  locationLabel: string;
  startsAt: Date;
};

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
