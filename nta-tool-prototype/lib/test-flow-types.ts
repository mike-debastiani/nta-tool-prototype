import { type ApplicationStatus } from "@/lib/application-status";

export type ApplicationData = {
  title?: string;
  summary?: string;
  personalData?: {
    vorname?: string;
    name?: string;
    email?: string;
    phone?: string;
    matrikel?: string;
    studiengang?: string;
    semester?: string;
    antragsart?: "studium" | "aufnahmeverfahren";
  };
  attestFiles?: {
    id?: string;
    name?: string;
    size?: number;
    type?: string;
  }[];
  consultation?: {
    status?: "booked" | "done";
    date?: string;
    slot?: string;
    location?: string;
    advisor?: string;
  };
  recommendation?: {
    ready?: boolean;
    url?: string;
  };
  applicationDefinition?: {
    situationDescription?: string;
    duration?: "full_study" | "one_semester";
    scopeSelections?: string[];
    lectureMeasures?: string[];
    lectureOtherEnabled?: boolean;
    lectureOtherText?: string;
    assessmentMeasures?: string[];
    assessmentOtherEnabled?: boolean;
    assessmentOtherText?: string;
  };
  finalSubmitted?: boolean;
  submittedAt?: string;
  /** Persistierte Review-Kommentare (R2 → R1 / Sidebar). */
  reviewComments?: Array<{
    id: string;
    blockId: string;
    blockTitle: string;
    body: string;
    /** ISO-8601 */
    createdAt: string;
  }>;
};

export type ApplicationRow = {
  id: string;
  applicant_id: string;
  status: ApplicationStatus;
  data: ApplicationData;
  created_at: string;
  updated_at: string;
};

export type WorkspaceApplication = ApplicationRow & {
  users: {
    display_name: string | null;
    email: string;
  }[];
};
