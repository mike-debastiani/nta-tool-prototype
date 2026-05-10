import { type ApplicationStatus } from "@/lib/application-status";
import { type ReviewWorkspaceBlockId } from "@/lib/review-workspace-blocks";

/** Persistenter Snapshot nach R2-Weiterreichung (Review nach Einreichung). */
export type R2ReviewBlockSnapshot =
  | { phase: "confirmed" }
  | { phase: "adjustment"; remark: string };

export type R2PostSubmitReview = {
  /** ISO-8601 */
  forwardedAt: string;
  blocks: Record<ReviewWorkspaceBlockId, R2ReviewBlockSnapshot>;
};

/** R2 Post-Submit-Review — muss unter `recommendation.workspaceReview` liegen (DB-Trigger). */
export type ReviewCommentPersisted = {
  id: string;
  blockId: string;
  blockTitle: string;
  body: string;
  /** ISO-8601 */
  createdAt: string;
};

export type RecommendationWorkspaceReview = {
  /** Autosave vor Weiterreichung */
  draft?: R2ReviewDraft;
  /** Nach Weiterreichung */
  postSubmit?: R2PostSubmitReview;
  /** Kommentarchronik nach Weiterreichung (R1 / Sidebar) */
  forwardedComments?: ReviewCommentPersisted[];
};

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
    /** Post-Submit-R2-Review — einziger erlaubter Ort für Draft/Snapshot (Trigger). */
    workspaceReview?: RecommendationWorkspaceReview;
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
  /**
   * @deprecated Alte Speicherung — lesen nur noch für Migration; schreiben unter
   * `recommendation.workspaceReview`.
   */
  reviewComments?: ReviewCommentPersisted[];
  /** @deprecated Siehe `recommendation.workspaceReview.postSubmit` */
  r2PostSubmitReview?: R2PostSubmitReview;
  /** @deprecated Siehe `recommendation.workspaceReview.draft` */
  r2ReviewDraft?: R2ReviewDraft;
};

/** Zwischenstand R2-Review (Autosave), solange noch nicht weitergeleitet. */
export type R2ReviewDraftBlock =
  | { phase: "pending" }
  | { phase: "confirmed" }
  | { phase: "adjustment"; remark: string };

export type R2ReviewDraft = {
  /** ISO-8601 */
  updatedAt: string;
  blocks: Record<ReviewWorkspaceBlockId, R2ReviewDraftBlock>;
  reviewComments: ReviewCommentPersisted[];
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
