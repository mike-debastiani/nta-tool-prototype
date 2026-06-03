import { type ApplicationStatus } from "@/lib/application-status";
import { type ReviewWorkspaceBlockId } from "@/lib/review-workspace-blocks";

/** Persistenter Snapshot nach R2-Weiterreichung (Review nach Einreichung). */
export type R2ReviewBlockSnapshot =
  | { phase: "confirmed" }
  | { phase: "adjustment"; remark: string }
  /**
   * R1 hat angeforderte Anpassungen erledigt und zurück an die Fachstelle
   * gegeben: Block erneut wie „frisches“ Review, Bemerkung bleibt sichtbar
   * bis R2 erneut „Anpassung anfordert“ (dann ersetzt).
   */
  | { phase: "pending_after_adjustment"; lockedRemark: string };

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
  /** Anzeigename der Person, die den Kommentar verfasst hat (typisch R2). */
  authorDisplayName?: string;
};

export type RecommendationWorkspaceReview = {
  /** Autosave vor Weiterreichung */
  draft?: R2ReviewDraft;
  /** Nach Weiterreichung */
  postSubmit?: R2PostSubmitReview;
  /** Kommentarchronik nach Weiterreichung (R1 / Sidebar) */
  forwardedComments?: ReviewCommentPersisted[];
};

/**
 * Per-Block-Markierung, dass R1 nach R2-Anforderung „Anpassung" eine Korrektur
 * vorgenommen und gespeichert hat. Der Originalkommentar (`R2`) bleibt erhalten,
 * aber der Block wird visuell als „Anpassung erfolgt" markiert.
 */
export type R1AdjustmentResolution = {
  /** ISO-8601 — Zeitpunkt des letzten R1-Speicherns für diesen Block. */
  resolvedAt: string;
};

/** R1 Antragsflow: persistierter UI-Schritt vor finalem Submit (Resume). */
export type R1PortalFlowStep =
  | "step1"
  | "step2"
  | "step3_booking"
  | "step3_booked"
  | "step3_recommendation"
  | "step4_application"
  | "step5_overview";

/** R4-Bewilligung: editierbare Review-Blöcke (ohne Antragsteller/Attest/Definition/Empfehlung). */
export type R4DecisionReviewBlockId =
  | "duration"
  | "scope"
  | "lectureMeasures"
  | "assessmentMeasures";

/** Eine Zeile (Dauer-Option, Geltungsbereich oder Massnahme) mit R4-Schalterzustand. */
export type R4DecisionRow = {
  key: string;
  title: string;
  description?: string;
  studentSelected: boolean;
  r4Approved: boolean;
  /** R4-konkretisierte Massnahmenbeschreibung (Entscheid-Step, Massnahmen-Blöcke). */
  concretizedDescription?: string;
  /** R4-konkretisierter Massnahmentitel (Entscheid-Step, Massnahmen-Blöcke). */
  concretizedTitle?: string;
};

export type R4DecisionBlockSnapshot = {
  confirmed: boolean;
  rows: R4DecisionRow[];
  /** Begründung bei abgelehnten Massnahmen-Blöcken (keine Massnahme bewilligt). */
  decisionReason?: string;
};

export type R4DecisionReview = {
  blocks: Partial<Record<R4DecisionReviewBlockId, R4DecisionBlockSnapshot>>;
  /** ISO-8601 — letzte Persistenz durch R4 */
  updatedAt?: string;
};

export type ApplicationDefinitionData = {
  situationDescription?: string;
  duration?: "full_study" | "one_semester";
  scopeSelections?: string[];
  lectureMeasures?: string[];
  /** Antrag Schritt 4: Nutzer hat «Keine» für Lehrveranstaltungen gewählt. */
  lectureMeasuresKeine?: boolean;
  /** „Sonstige“ Massnahmen (persistiert, ohne leere Einträge). */
  lectureOtherLines?: string[];
  /** Legacy — bei Lesen nach `lectureOtherLines` migrieren. */
  lectureOtherEnabled?: boolean;
  lectureOtherText?: string;
  assessmentMeasures?: string[];
  /** Antrag Schritt 4: Nutzer hat «Keine» für Leistungsnachweise gewählt. */
  assessmentMeasuresKeine?: boolean;
  assessmentOtherLines?: string[];
  assessmentOtherEnabled?: boolean;
  assessmentOtherText?: string;
};

/** Früherer Slot nach «Termin verschieben» — Terminplaner: rot/durchgestrichen. */
export type ConsultationSupersededAppointment = {
  dateIso: string;
  slot?: string;
  date?: string;
  location?: string;
  locationType?: "zoom" | "onsite";
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
    /** Öffentliche oder blob:-URL zum Öffnen der Datei (z. B. Storage oder lokale Vorschau). */
    url?: string;
  }[];
  consultation?: {
    status?: "booked" | "done";
    date?: string;
    /** ISO-8601 Datum des gewählten Beratungstermins (lokales Kalenderdatum). */
    dateIso?: string;
    slot?: string;
    location?: string;
    locationType?: "zoom" | "onsite";
    advisor?: string;
    /** Verschobene Termine (Historie für R2 Terminplaner). */
    supersededAppointments?: ConsultationSupersededAppointment[];
  };
  recommendation?: {
    ready?: boolean;
    url?: string;
    /** R2-Entwurf für das Empfehlungsschreiben in der Beratungsphase. */
    draftHtml?: string;
    draftText?: string;
    /**
     * Vom R2 freigegebener finaler Inhalt (HTML + Plaintext) inkl. Zeitstempel.
     * Wird beim Klick auf „Empfehlungsschreiben freigeben" gesetzt; R1 sieht
     * diesen Inhalt im Empfehlungs-Step.
     */
    releasedHtml?: string;
    releasedText?: string;
    releasedAt?: string;
    /** Anzeige-Name der R2-Fachperson, welche das Schreiben freigegeben hat. */
    releasedBy?: string;
    /** Post-Submit-R2-Review — einziger erlaubter Ort für Draft/Snapshot (Trigger). */
    workspaceReview?: RecommendationWorkspaceReview;
    /**
     * Eingereichte Block-Inhalte beim Weiterreichen mit Anpassungsanforderung;
     * Basis für «Zurücksetzen» in der R1-Korrekturansicht. Liegt unter
     * `recommendation`, damit R2 beim Forward trigger-konform schreiben darf.
     */
    r1AdjustmentBlockBaselines?: Partial<
      Record<
        ReviewWorkspaceBlockId,
        import("@/lib/r1-adjustment-baseline").R1AdjustmentBlockBaseline
      >
    >;
  };
  applicationDefinition?: ApplicationDefinitionData;
  /**
   * R1: Entwurf der Antragsdefinition vor finalem Submit. Wird genutzt, damit
   * `applicationDefinition` (Trigger für „In Review“ in der Ableitung) erst
   * bei finaler Einreichung gesetzt wird.
   */
  r1DraftApplicationDefinition?: ApplicationDefinitionData;
  /** R1: zuletzt aktiver Flow-Schritt für Wiederaufnahme. */
  r1PortalFlowStep?: R1PortalFlowStep;
  /** R1: Kenntnisnahme-Checkbox Empfehlungsschreiben (nur UI-State). */
  r1RecommendationAcknowledged?: boolean;
  /**
   * R1: Kalender-Mock-Zustand vor Buchung (Termin noch nicht in `consultation`
   * persistiert).
   */
  r1DraftBookingUi?: {
    selectedBookingDateIso: string;
    displayedMonthIso: string;
    selectedBookingSlot: string;
  };
  finalSubmitted?: boolean;
  submittedAt?: string;
  /**
   * Pro Review-Block: gesetzt, sobald R1 den Block in der Korrekturansicht
   * aktualisiert und gespeichert hat. Wird beim erneuten Einreichen (zurück
   * nach `in_review`) wieder geleert.
   */
  r1AdjustmentResolutions?: Partial<
    Record<import("@/lib/review-workspace-blocks").ReviewWorkspaceBlockId, R1AdjustmentResolution>
  >;
  /**
   * @deprecated Unter `recommendation.r1AdjustmentBlockBaselines` — nur noch lesen
   * für ältere Datensätze.
   */
  r1AdjustmentBlockBaselines?: Partial<
    Record<
      ReviewWorkspaceBlockId,
      import("@/lib/r1-adjustment-baseline").R1AdjustmentBlockBaseline
    >
  >;
  /**
   * R4 Entscheidungsinstanz: Bewilligung pro sichtbarem Block (Dauer, Geltung,
   * Massnahmen). Liegt absichtlich ausserhalb von `recommendation`, damit R2-Trigger
   * (`consultation` / `recommendation` only) nicht greifen.
   */
  r4DecisionReview?: R4DecisionReview;

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
  | { phase: "adjustment"; remark: string }
  | { phase: "pending_after_adjustment"; lockedRemark: string };

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
