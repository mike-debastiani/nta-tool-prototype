"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  CircleAlert,
  Info,
  Loader2,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudiengangCombobox } from "@/components/studiengang-combobox";
import {
  ApplicationReviewDetailSidebar,
  type SavedReviewComment,
} from "@/components/domain/application-review-detail-sidebar";
import { ApplicationIssuedVerfuegungView } from "@/components/domain/application-issued-verfuegung-view";
import { ApplicationReviewPageHeader } from "@/components/domain/application-review-page-header";
import { ApplicationStatusCallout } from "@/components/domain/application-status-callout";
import { useRegisterDashboardDetailPanel } from "@/components/domain/dashboard-detail-panel-context";
import { useDashboardScrollRoot } from "@/components/domain/dashboard-main-panel-scroll-context";
import {
  resolveApplicationAssignee,
  WORKSPACE_PROTOTYPE_R2_REVIEWER_NAME,
  WORKSPACE_PROTOTYPE_R4_REVIEWER_NAME,
} from "@/lib/application-assignee";
import {
  APPLICATION_SCOPE_OPTIONS,
  ASSESSMENT_MEASURE_OPTIONS,
  LECTURE_MEASURE_OPTIONS,
  type ApplicationMeasureOption,
  DurationChoiceCompare,
  MeasureChecklist,
  ReviewBlockCard,
  ReviewBlockConfirmedFooter,
  ReviewBlockR1EditingFooter,
  ReviewBlockR1RemarkSection,
  ReviewBlockR1SavedRemarkActions,
  ReviewBlockR1StartAdjustmentFooter,
  ReviewField,
  ReviewFileRow,
  ScopeChecklist,
  createAttestFileEntryFromBrowserFile,
  formatReviewFileSize,
  revokeAttestFileUrls,
  sanitizeAttestFilesForDatabase,
} from "@/components/domain/application-review-blocks";
import { formatReviewSubmittedAt } from "@/lib/application-review-labels";
import {
  ASSESSMENT_MEASURES_KEINE_DESCRIPTION,
  LECTURE_MEASURES_KEINE_DESCRIPTION,
} from "@/lib/application-review-labels";
import { RecommendationReleasedAccordion } from "@/components/domain/recommendation-released-accordion";
import {
  REVIEW_WORKSPACE_APPLICANT_BLOCK_TITLE,
  REVIEW_WORKSPACE_BLOCK_IDS,
  reviewWorkspaceAnchorId,
  type ReviewWorkspaceBlockId,
} from "@/lib/review-workspace-blocks";
import {
  type ApplicationData,
  type ApplicationRow,
  type R1AdjustmentResolution,
  type WorkspaceApplication,
} from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/client";
import {
  applicationReviewScrollAreaClass,
  applicationReviewSectionGapClass,
} from "@/lib/design-tokens/application-scroll";
import { cn } from "@/lib/utils";
import { getApplicationStatusMeta } from "@/lib/application-status";
import {
  lectureOtherLinesFromDefinition,
  assessmentOtherLinesFromDefinition,
  hasMeasureOtherSelection,
  persistMeasureOtherLines,
} from "@/lib/measure-custom-lines";
import {
  APPLICATION_ROW_BROADCAST_EVENT,
  applicationRowBroadcastChannelName,
} from "@/lib/application-realtime-sync";
import {
  applyBaselineToData,
  readR1AdjustmentBlockBaselines,
} from "@/lib/r1-adjustment-baseline";
import { r1AllRequestedAdjustmentsSaved } from "@/lib/r1-adjustment-release";
import {
  R1_ATTEST_FILE_REMOVE_BUTTON_CLASS,
  R1_RICH_OPTION_EDITABLE_CLASS,
  R1_RICH_OPTION_GROUP_CLASS,
} from "@/lib/design-tokens/r1-review-block";
import { REVIEW_BLOCK_FIELD_GRID_CLASS } from "@/lib/design-tokens/review-block";
import { CustomMeasureLinesField } from "@/components/domain/custom-measure-lines-field";

type R2BlockPhase =
  | { phase: "confirmed" }
  | { phase: "adjustment"; remark: string };

const SEMESTER_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

const BLOCK_TITLES: Record<ReviewWorkspaceBlockId, string> = {
  applicant: REVIEW_WORKSPACE_APPLICANT_BLOCK_TITLE,
  attest: "Fachärztliches Attest",
  definition: "Persönliche Situationsbeschreibung",
  duration: "Gültigkeitsdauer des Nachteilsausgleiches",
  scope: "Geltungsbereich des beantragten Nachteilsausgleiches",
  lectureMeasures: "Ausgleichsmassnahmen für Lehrveranstaltungen",
  assessmentMeasures: "Ausgleichsmassnahmen für Leistungsnachweise",
};

type AttestFile = NonNullable<ApplicationData["attestFiles"]>[number] & {
  id?: string;
  name?: string;
  size?: number;
  type?: string;
};

type EditingPersonal = {
  vorname: string;
  name: string;
  email: string;
  phone: string;
  matrikel: string;
  studiengang: string;
  semester: string;
  antragsart: "studium" | "aufnahmeverfahren";
};

type EditingDefinition = {
  situationDescription: string;
  duration: "" | "full_study" | "one_semester";
  scopeSelections: string[];
  lectureMeasures: string[];
  lectureMeasuresKeine: boolean;
  lectureOtherLines: string[];
  assessmentMeasures: string[];
  assessmentMeasuresKeine: boolean;
  assessmentOtherLines: string[];
};

type EditingState = {
  blockId: ReviewWorkspaceBlockId;
  personal?: EditingPersonal;
  attestFiles?: AttestFile[];
  definition?: EditingDefinition;
};

type FieldErrors = Partial<Record<string, string>>;

function formatMatrikelInput(value: string) {
  const digitsOnly = value.replace(/\D/g, "").slice(0, 8);
  const first = digitsOnly.slice(0, 2);
  const second = digitsOnly.slice(2, 5);
  const third = digitsOnly.slice(5, 8);
  if (digitsOnly.length <= 2) return first;
  if (digitsOnly.length <= 5) return `${first}-${second}`;
  return `${first}-${second}-${third}`;
}

function readForwardedBlocks(
  data: ApplicationData,
): Partial<Record<ReviewWorkspaceBlockId, R2BlockPhase>> {
  const fromWorkspace = data.recommendation?.workspaceReview?.postSubmit?.blocks;
  const fromLegacy = data.r2PostSubmitReview?.blocks;
  return (fromWorkspace ?? fromLegacy ?? {}) as Partial<
    Record<ReviewWorkspaceBlockId, R2BlockPhase>
  >;
}

function readSavedComments(data: ApplicationData): SavedReviewComment[] {
  const list =
    data.recommendation?.workspaceReview?.forwardedComments ??
    data.reviewComments ??
    [];
  return list.map((c) => ({
    id: c.id,
    blockId: c.blockId,
    blockTitle: c.blockTitle,
    body: c.body,
    createdAt: Date.parse(c.createdAt),
    authorDisplayName: c.authorDisplayName,
  }));
}

function commentForBlock(
  data: ApplicationData,
  blockId: ReviewWorkspaceBlockId,
): SavedReviewComment | null {
  const comments = readSavedComments(data);
  const newest = comments
    .filter((c) => c.blockId === blockId)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  return newest ?? null;
}

function applyEditToData(
  data: ApplicationData,
  edit: EditingState,
): ApplicationData {
  const next: ApplicationData = { ...data };

  if (edit.blockId === "applicant" && edit.personal) {
    next.personalData = {
      ...next.personalData,
      ...edit.personal,
    };
  }
  if (edit.blockId === "attest" && edit.attestFiles) {
    next.attestFiles = sanitizeAttestFilesForDatabase(edit.attestFiles);
  }
  if (edit.definition) {
    const base = next.applicationDefinition ?? {};
    if (edit.blockId === "definition") {
      next.applicationDefinition = {
        ...base,
        situationDescription: edit.definition.situationDescription,
      };
    } else if (edit.blockId === "duration") {
      next.applicationDefinition = {
        ...base,
        duration: edit.definition.duration || undefined,
      };
    } else if (edit.blockId === "scope") {
      next.applicationDefinition = {
        ...base,
        scopeSelections: edit.definition.scopeSelections,
      };
    } else if (edit.blockId === "lectureMeasures") {
      const persisted = persistMeasureOtherLines(edit.definition.lectureOtherLines);
      const nextDef = { ...base, lectureMeasures: edit.definition.lectureMeasures };
      delete nextDef.lectureOtherEnabled;
      delete nextDef.lectureOtherText;
      delete nextDef.lectureOtherLines;
      if (persisted) nextDef.lectureOtherLines = persisted;
      if (edit.definition.lectureMeasuresKeine) {
        nextDef.lectureMeasuresKeine = true;
      } else {
        delete nextDef.lectureMeasuresKeine;
      }
      next.applicationDefinition = nextDef;
    } else if (edit.blockId === "assessmentMeasures") {
      const persisted = persistMeasureOtherLines(edit.definition.assessmentOtherLines);
      const nextDef = { ...base, assessmentMeasures: edit.definition.assessmentMeasures };
      delete nextDef.assessmentOtherEnabled;
      delete nextDef.assessmentOtherText;
      delete nextDef.assessmentOtherLines;
      if (persisted) nextDef.assessmentOtherLines = persisted;
      if (edit.definition.assessmentMeasuresKeine) {
        nextDef.assessmentMeasuresKeine = true;
      } else {
        delete nextDef.assessmentMeasuresKeine;
      }
      next.applicationDefinition = nextDef;
    }
  }

  return next;
}

function workspaceRowWithSanitizedAttests(row: WorkspaceApplication): WorkspaceApplication {
  const files = row.data.attestFiles;
  if (!files?.length) return row;
  return {
    ...row,
    data: {
      ...row.data,
      attestFiles: sanitizeAttestFilesForDatabase(files),
    },
  };
}

type AutosaveStatus =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

type PortalApplicationAdjustmentProps = {
  application: WorkspaceApplication;
  /** Anzeigename des angemeldeten R1 — für „Zugewiesen an" / Kommentar-Karten. */
  applicantDisplayName: string;
  /** Nur im Status „Anpassung erforderlich“ darf R1 einzelne Blöcke bearbeiten. */
  allowAdjustments?: boolean;
  /** Optional: nach jedem Save erneut hydrieren (z. B. Liste refreshen). */
  onPersisted?: () => void;
};

export function PortalApplicationAdjustment({
  application,
  applicantDisplayName,
  onPersisted,
}: PortalApplicationAdjustmentProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  // Lokaler Snapshot des Antrags. Initial vom Server kommend; bei jedem
  // erfolgreichen Save aktualisieren wir ihn aus der Update-Antwort. Die
  // Server-Komponente sollte bei Wechsel des Antrags via `key={application.id}`
  // ein vollständiges Remount erzwingen.
  const [snapshot, setSnapshot] = useState<WorkspaceApplication>(() =>
    workspaceRowWithSanitizedAttests(application),
  );

  const data = snapshot.data;
  const def = data.applicationDefinition;
  const personal = data.personalData;
  const forwarded = readForwardedBlocks(data);
  const resolutions = (data.r1AdjustmentResolutions ?? {}) as Partial<
    Record<ReviewWorkspaceBlockId, R1AdjustmentResolution>
  >;
  const statusMeta = getApplicationStatusMeta(snapshot, "R1");
  const isInReviewPortal = statusMeta.canonicalState === "in_review";
  const isInDecisionPortal = statusMeta.canonicalState === "in_decision";
  const isIssuedVerfuegungPortal =
    statusMeta.canonicalState === "approved"
    || statusMeta.canonicalState === "rejected";
  // Entscheidend ist der aktuelle kanonische Status des Snapshots (Realtime),
  // nicht nur der Server-Prop-Zustand beim ersten Render.
  const canEditBlocks = statusMeta.canonicalState === "needs_adjustment";

  const [editing, setEditing] = useState<EditingState | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [releaseSubmitting, setReleaseSubmitting] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [autosave, setAutosave] = useState<AutosaveStatus>({ kind: "idle" });
  const [autosaveBaseline, setAutosaveBaseline] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const applicationIdRef = useRef<string>(application.id);
  applicationIdRef.current = snapshot.id;

  const editingRef = useRef<EditingState | null>(null);
  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  const applyRemoteApplicationRow = useCallback(
    (nextRow: ApplicationRow) => {
      setSnapshot((prev) => {
        if (prev.id !== nextRow.id) return prev;
        if (prev.status === nextRow.status && prev.updated_at === nextRow.updated_at) {
          return prev;
        }

        if (prev.status !== nextRow.status) {
          // Re-sync Server Components + `key` on `PortalAntragserstellungPage` (status suffix).
          queueMicrotask(() => {
            router.refresh();
          });
        }

        const next = workspaceRowWithSanitizedAttests({
          ...prev,
          ...(nextRow as unknown as Partial<WorkspaceApplication>),
        });
        const nextStatusMeta = getApplicationStatusMeta(next, "R1");
        const stillEditable = nextStatusMeta.canonicalState === "needs_adjustment";

        if (editingRef.current && !stillEditable) {
          queueMicrotask(() => {
            setEditing(null);
            setErrors({});
            setSaveError(null);
            setAutosave({ kind: "idle" });
            setAutosaveBaseline(null);
          });
        }

        return next;
      });
    },
    [router],
  );

  const refreshSnapshotFromServer = useCallback(async () => {
    const applicationId = applicationIdRef.current;
    if (!applicationId) return;
    const { data: row, error } = await supabase
      .from("applications")
      .select("id,applicant_id,status,data,created_at,updated_at")
      .eq("id", applicationId)
      .maybeSingle<ApplicationRow>();
    if (error || !row) return;
    applyRemoteApplicationRow(row);
  }, [applyRemoteApplicationRow, supabase]);

  useEffect(() => {
    const applicationId = snapshot.id;
    if (!applicationId) return;

    const channel = supabase
      .channel(`portal-antrag-${applicationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          filter: `id=eq.${applicationId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            router.push("/portal/home");
            return;
          }

          const nextRow = payload.new as ApplicationRow | null;
          if (!nextRow?.id || nextRow.id !== applicationId) return;
          applyRemoteApplicationRow(nextRow);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applyRemoteApplicationRow, router, snapshot.id, supabase]);

  /** Broadcast works without adding `applications` to `supabase_realtime`. */
  useEffect(() => {
    const applicationId = snapshot.id;
    if (!applicationId) return;

    const channel = supabase
      .channel(applicationRowBroadcastChannelName(applicationId), {
        config: {
          private: false,
          broadcast: { ack: false, self: true },
        },
      })
      .on("broadcast", { event: APPLICATION_ROW_BROADCAST_EVENT }, () => {
        void refreshSnapshotFromServer();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshSnapshotFromServer, snapshot.id, supabase]);

  /** Fallback if neither postgres_changes nor broadcast arrives (misconfig / offline). */
  useEffect(() => {
    const applicationId = snapshot.id;
    if (!applicationId) return;

    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      void refreshSnapshotFromServer();
    };

    void refreshSnapshotFromServer();
    const interval = window.setInterval(tick, 1500);
    return () => window.clearInterval(interval);
  }, [refreshSnapshotFromServer, snapshot.id]);

  const startEdit = (blockId: ReviewWorkspaceBlockId) => {
    if (!canEditBlocks) return;
    setSaveError(null);
    setErrors({});

    /** Erneut bearbeiten: gespeicherte Resolution entfernen → UI wieder To do / gelb bis zum nächsten Speichern. */
    const resMap = snapshot.data.r1AdjustmentResolutions ?? {};
    if (resMap[blockId]) {
      const nextRes = { ...resMap };
      delete nextRes[blockId];
      const nextData: ApplicationData = {
        ...snapshot.data,
        r1AdjustmentResolutions: nextRes,
      };
      setSnapshot((prev) =>
        prev.id !== snapshot.id ? prev : { ...prev, data: nextData },
      );
      void supabase
        .from("applications")
        .update({ data: nextData })
        .eq("id", snapshot.id)
        .then(() => {
          onPersisted?.();
        });
    }

    if (blockId === "applicant") {
      const nextEdit: EditingState = {
        blockId,
        personal: {
          vorname: personal?.vorname ?? "",
          name: personal?.name ?? "",
          email: personal?.email ?? "",
          phone: personal?.phone ?? "",
          matrikel: personal?.matrikel ?? "",
          studiengang: personal?.studiengang ?? "",
          semester: personal?.semester ?? "",
          antragsart:
            (personal?.antragsart as "studium" | "aufnahmeverfahren" | undefined) ??
            "studium",
        },
      };
      setAutosaveBaseline(JSON.stringify(nextEdit));
      setEditing(nextEdit);
      return;
    }
    if (blockId === "attest") {
      const nextEdit: EditingState = {
        blockId,
        attestFiles: (data.attestFiles ?? []).map((f) => ({ ...f })),
      };
      setAutosaveBaseline(JSON.stringify(nextEdit));
      setEditing(nextEdit);
      return;
    }
    const nextEdit: EditingState = {
      blockId,
      definition: {
        situationDescription: def?.situationDescription ?? "",
        duration: (def?.duration ?? "") as EditingDefinition["duration"],
        scopeSelections: [...(def?.scopeSelections ?? [])],
        lectureMeasures: [...(def?.lectureMeasures ?? [])],
        lectureMeasuresKeine: Boolean(def?.lectureMeasuresKeine),
        lectureOtherLines: lectureOtherLinesFromDefinition(def),
        assessmentMeasures: [...(def?.assessmentMeasures ?? [])],
        assessmentMeasuresKeine: Boolean(def?.assessmentMeasuresKeine),
        assessmentOtherLines: assessmentOtherLinesFromDefinition(def),
      },
    };
    setAutosaveBaseline(JSON.stringify(nextEdit));
    setEditing(nextEdit);
  };


  const resetBlock = async (blockId: ReviewWorkspaceBlockId) => {
    if (!canEditBlocks) return;
    setSaveError(null);
    setErrors({});
    setEditing(null);
    setAutosave({ kind: "idle" });
    setAutosaveBaseline(null);

    const baseline = readR1AdjustmentBlockBaselines(data)[blockId];
    if (!baseline) return;

    let nextData = applyBaselineToData(data, blockId, baseline);
    const nextRes = { ...(nextData.r1AdjustmentResolutions ?? {}) };
    delete nextRes[blockId];
    nextData = { ...nextData, r1AdjustmentResolutions: nextRes };

    setSnapshot((prev) =>
      prev.id !== snapshot.id ? prev : { ...prev, data: nextData },
    );

    setSaving(true);
    const { data: updated, error } = await supabase
      .from("applications")
      .update({ data: nextData })
      .eq("id", snapshot.id)
      .select(
        "id,applicant_id,status,data,created_at,updated_at,users!applications_applicant_id_fkey(display_name,email)",
      )
      .maybeSingle();

    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    if (updated) {
      setSnapshot(workspaceRowWithSanitizedAttests(updated as WorkspaceApplication));
    }
    onPersisted?.();
  };

  const cancelEdit = () => {
    setEditing(null);
    setErrors({});
    setSaveError(null);
    setAutosave({ kind: "idle" });
    setAutosaveBaseline(null);
  };

  const validateBlock = (edit: EditingState): FieldErrors => {
    const e: FieldErrors = {};
    if (edit.blockId === "applicant" && edit.personal) {
      const p = edit.personal;
      if (!p.vorname.trim()) e.vorname = "Pflichtfeld";
      if (!p.name.trim()) e.name = "Pflichtfeld";
      if (!p.email.trim()) e.email = "Pflichtfeld";
      if (!p.phone.trim()) e.phone = "Pflichtfeld";
      if (!p.matrikel.trim()) e.matrikel = "Pflichtfeld";
      else if (!/^\d{2}-\d{3}-\d{3}$/.test(p.matrikel))
        e.matrikel = "Format XX-XXX-XXX";
      if (!p.studiengang.trim()) e.studiengang = "Pflichtfeld";
      if (!p.semester.trim()) e.semester = "Pflichtfeld";
    }
    if (edit.blockId === "attest" && edit.attestFiles) {
      if (edit.attestFiles.length === 0) e.attest = "Mindestens eine Datei";
    }
    if (edit.definition) {
      const d = edit.definition;
      if (edit.blockId === "definition" && !d.situationDescription.trim()) {
        e.situationDescription = "Pflichtfeld";
      }
      if (edit.blockId === "duration" && !d.duration) {
        e.duration = "Bitte wählen";
      }
      if (edit.blockId === "scope" && d.scopeSelections.length === 0) {
        e.scope = "Mindestens eine Option";
      }
      if (edit.blockId === "lectureMeasures") {
        if (
          !d.lectureMeasuresKeine
          && d.lectureMeasures.length === 0
          && !hasMeasureOtherSelection(d.lectureOtherLines)
        ) {
          e.lectureMeasures =
            "«Keine», mindestens eine Massnahme oder Sonstige-Angabe erforderlich.";
        }
      }
      if (edit.blockId === "assessmentMeasures") {
        if (
          !d.assessmentMeasuresKeine
          && d.assessmentMeasures.length === 0
          && !hasMeasureOtherSelection(d.assessmentOtherLines)
        ) {
          e.assessmentMeasures =
            "«Keine», mindestens eine Massnahme oder Sonstige-Angabe erforderlich.";
        }
      }
    }
    return e;
  };

  useEffect(() => {
    if (!canEditBlocks || !editing || saving) return;

    const signature = JSON.stringify(editing);
    if (signature === autosaveBaseline) return;

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setAutosave({ kind: "saving" });

      void (async () => {
        const nextData = applyEditToData(data, editing);
        const { data: updated, error } = await supabase
          .from("applications")
          .update({ data: nextData })
          .eq("id", snapshot.id)
          .select(
            "id,applicant_id,status,data,created_at,updated_at,users!applications_applicant_id_fkey(display_name,email)",
          )
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          setAutosave({ kind: "error", message: error.message });
          return;
        }
        if (updated) {
          setSnapshot(workspaceRowWithSanitizedAttests(updated as WorkspaceApplication));
        }
        setAutosaveBaseline(signature);
        setAutosave({ kind: "saved", at: Date.now() });
      })();
    }, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [editing, canEditBlocks, autosaveBaseline, saving, data, snapshot.id, supabase]);

  const persistEdit = async (edit: EditingState) => {
    if (!canEditBlocks) return;
    const blockErrors = validateBlock(edit);
    if (Object.keys(blockErrors).length > 0) {
      setErrors(blockErrors);
      return;
    }

    setSaving(true);
    setSaveError(null);

    const nextData = applyEditToData(data, edit);

    nextData.r1AdjustmentResolutions = {
      ...(data.r1AdjustmentResolutions ?? {}),
      [edit.blockId]: { resolvedAt: new Date().toISOString() },
    };

    setSnapshot((prev) =>
      prev.id !== snapshot.id ? prev : { ...prev, data: nextData },
    );

    const { data: updated, error } = await supabase
      .from("applications")
      .update({ data: nextData })
      .eq("id", snapshot.id)
      .select(
        "id,applicant_id,status,data,created_at,updated_at,users!applications_applicant_id_fkey(display_name,email)",
      )
      .maybeSingle();

    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    if (updated) {
      setSnapshot(workspaceRowWithSanitizedAttests(updated as WorkspaceApplication));
    }
    setEditing(null);
    setErrors({});
    setAutosave({ kind: "idle" });
    setAutosaveBaseline(null);
    onPersisted?.();
  };

  const releaseAdjustmentsForReview = async () => {
    if (!r1AllRequestedAdjustmentsSaved(data)) return;
    setReleaseError(null);
    setReleaseSubmitting(true);
    try {
      const res = await fetch("/api/applications/r1-release-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ applicationId: snapshot.id }),
      });
      let payload: { error?: string } = {};
      try {
        payload = (await res.json()) as { error?: string };
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        setReleaseError(
          typeof payload.error === "string"
            ? payload.error
            : `Anfrage fehlgeschlagen (${res.status})`,
        );
        return;
      }
      router.refresh();
      onPersisted?.();
    } catch (e) {
      setReleaseError(e instanceof Error ? e.message : "Netzwerkfehler");
    } finally {
      setReleaseSubmitting(false);
    }
  };

  const performWithdrawApplication = async () => {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", snapshot.id);
    setDeleting(false);

    if (error) {
      setDeleteError(error.message);
      return;
    }

    setWithdrawDialogOpen(false);
    router.push("/portal/home");
    router.refresh();
  };

  const navigateFromComment = (blockId: string) => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document
          .getElementById(reviewWorkspaceAnchorId(blockId as ReviewWorkspaceBlockId))
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  const savedComments = useMemo(() => {
    const raw = readSavedComments(data);
    if (!canEditBlocks) return raw;
    return raw.map((c) => {
      const bid = c.blockId as ReviewWorkspaceBlockId;
      if (forwarded[bid]?.phase !== "adjustment") return c;
      return {
        ...c,
        adjustmentResolutionStatus: resolutions[bid] ? ("done" as const) : ("todo" as const),
      };
    });
  }, [data, canEditBlocks, forwarded, resolutions]);

  const blockProps = (id: ReviewWorkspaceBlockId): R1BlockShellProps => ({
    blockId: id,
    title: BLOCK_TITLES[id],
    forwarded: forwarded[id] ?? null,
    resolution: resolutions[id] ?? null,
    isEditing: canEditBlocks && editing?.blockId === id,
    canEdit: canEditBlocks,
    onStartEdit: () => startEdit(id),
    onReset: () => void resetBlock(id),
    onCancel: cancelEdit,
    onSave: () => editing && void persistEdit(editing),
    saving,
    saveError: editing?.blockId === id ? saveError : null,
    remarkComment: commentForBlock(data, id),
    autosaveErrorMessage:
      editing?.blockId === id && autosave.kind === "error" ? autosave.message : null,
  });

  const assignee = useMemo(
    () =>
      resolveApplicationAssignee({
        canonicalState: statusMeta.canonicalState,
        applicantDisplayName,
        r2ReviewerDisplayName:
          snapshot.data.consultation?.advisor?.trim()
          || WORKSPACE_PROTOTYPE_R2_REVIEWER_NAME,
        r4ReviewerDisplayName: WORKSPACE_PROTOTYPE_R4_REVIEWER_NAME,
      }),
    [statusMeta.canonicalState, applicantDisplayName, snapshot.data],
  );

  const detailPanelSignature = useMemo(
    () =>
      [
        snapshot.id,
        snapshot.updated_at,
        statusMeta.canonicalState,
        statusMeta.label,
        canEditBlocks ? "1" : "0",
        savedComments
          .map((c) => `${c.id}:${c.adjustmentResolutionStatus ?? ""}`)
          .join(","),
        JSON.stringify(resolutions),
      ].join("\u001e"),
    [
      snapshot.id,
      snapshot.updated_at,
      statusMeta.canonicalState,
      statusMeta.label,
      canEditBlocks,
      savedComments,
      resolutions,
    ],
  );

  const scrollRootRef = useDashboardScrollRoot<HTMLDivElement>();
  const submittedAtLabel = formatReviewSubmittedAt(snapshot.data);

  useRegisterDashboardDetailPanel(
    detailPanelSignature,
    () => (
      <ApplicationReviewDetailSidebar
        application={snapshot}
        statusMeta={statusMeta}
        assignee={assignee}
        adjustmentComposer={null}
        savedReviewComments={savedComments}
        onSavedCommentNavigate={navigateFromComment}
        showCommentsSection={canEditBlocks}
        bemerkungenVariant="r1"
      />
    ),
    !isIssuedVerfuegungPortal,
  );

  if (isIssuedVerfuegungPortal) {
    return (
      <ApplicationIssuedVerfuegungView
        application={snapshot}
        calloutAudience="R1"
        applicantDisplayName={applicantDisplayName}
      />
    );
  }

  return (
    <>
    <div className="flex min-h-0 flex-1 w-full min-w-0 flex-col overflow-hidden">
      <div
        ref={scrollRootRef}
        className={cn(
          applicationReviewScrollAreaClass,
          "flex flex-col",
          applicationReviewSectionGapClass,
        )}
      >
        <div className="flex flex-col gap-6">
          <ApplicationReviewPageHeader submittedAtLabel={submittedAtLabel} />
              {isInReviewPortal ? (
                <ApplicationStatusCallout
                  badgeClassName={statusMeta.className}
                  icon={Info}
                >
                  Die Fachstelle prüft Ihren Antrag auf Vollständigkeit. Die Bearbeitung dauert
                  in der Regel 5–10 Werktage. Sie werden per E-Mail informiert, sobald es
                  Neuigkeiten gibt.
                </ApplicationStatusCallout>
              ) : null}
              {canEditBlocks ? (
                <ApplicationStatusCallout
                  badgeClassName={statusMeta.className}
                  icon={CircleAlert}
                >
                  Die Fachstelle hat Ihren Antrag geprüft und Nachbesserungen festgestellt. Nehmen
                  Sie die markierten Anpassungen vor und reichen Sie den Antrag erneut ein.
                </ApplicationStatusCallout>
              ) : null}
              {isInDecisionPortal ? (
                <ApplicationStatusCallout
                  badgeClassName={statusMeta.className}
                  icon={Info}
                >
                  Die Entscheidungsinstanz prüft Ihren Antrag. Die Bearbeitung dauert in der Regel
                  5–10 Werktage. Sie werden per E-Mail informiert, sobald es Neuigkeiten gibt.
                </ApplicationStatusCallout>
              ) : null}
              {deleteError ? (
                <p className="text-sm text-destructive" role="alert">
                  Antrag konnte nicht zurückgezogen werden: {deleteError}
                </p>
              ) : null}
        </div>

        <div className="flex flex-col gap-6">
          {/* Antragsteller */}
          <R1BlockShell {...blockProps("applicant")}>
            {editing?.blockId === "applicant" && editing.personal ? (
              <PersonalEditForm
                layout="r1"
                value={editing.personal}
                errors={errors}
                onChange={(patch) =>
                  setEditing((prev) =>
                    prev?.blockId === "applicant" && prev.personal
                      ? { ...prev, personal: { ...prev.personal, ...patch } }
                      : prev,
                  )
                }
              />
            ) : personal ? (
              <div className={REVIEW_BLOCK_FIELD_GRID_CLASS}>
                <ReviewField
                  label="Name"
                  value={`${personal.vorname ?? ""} ${personal.name ?? ""}`.trim() || "—"}
                />
                <ReviewField label="Martikelnummer" value={personal.matrikel ?? "—"} />
                <ReviewField label="Studiengang" value={personal.studiengang ?? "—"} />
                <ReviewField label="Semester" value={personal.semester ?? "—"} />
                <ReviewField label="E-Mail" value={personal.email ?? "—"} />
                <ReviewField label="Telefonnummer" value={personal.phone ?? "—"} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Keine Daten erfasst.</p>
            )}
          </R1BlockShell>

          {/* Attest */}
          <R1BlockShell {...blockProps("attest")}>
            {editing?.blockId === "attest" && editing.attestFiles ? (
              <AttestEditForm
                value={editing.attestFiles}
                error={errors.attest}
                fileInputRef={fileInputRef}
                onChange={(next) =>
                  setEditing((prev) =>
                    prev?.blockId === "attest"
                      ? { ...prev, attestFiles: next }
                      : prev,
                  )
                }
              />
            ) : data.attestFiles?.length ? (
              <ul className="space-y-3">
                {data.attestFiles.map((file) => (
                  <li key={file.id ?? file.name}>
                    <ReviewFileRow
                      title={file.name ?? "Datei"}
                      subtitle={formatReviewFileSize(file.size ?? 0)}
                      file={file}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Keine Dateien hochgeladen.</p>
            )}
          </R1BlockShell>

          {/* Empfehlungsschreiben — read-only Accordion mit Rich-Text-Inhalt.
              Wird nur gerendert, wenn die Fachstelle ein Schreiben freigegeben hat. */}
          {data.recommendation?.releasedHtml?.trim() ? (
            <RecommendationReleasedAccordion
              html={data.recommendation.releasedHtml}
              releasedAt={data.recommendation.releasedAt}
              authorDisplayName={
                data.recommendation.releasedBy?.trim()
                || "NTA Fachstelle"
              }
            />
          ) : null}

          {/* Antragsdefinition */}
          <R1BlockShell {...blockProps("definition")}>
            {editing?.blockId === "definition" && editing.definition ? (
              <div className="space-y-2">
                <Label htmlFor="r1-situation">
                  Beschreibung der gesundheitlichen Situation und Nachteile
                </Label>
                <AutoGrowTextarea
                  id="r1-situation"
                  placeholder="Auswirkungen auf das Studium..."
                  value={editing.definition.situationDescription}
                  onChange={(e) =>
                    setEditing((prev) =>
                      prev?.blockId === "definition" && prev.definition
                        ? {
                            ...prev,
                            definition: {
                              ...prev.definition,
                              situationDescription: e.target.value,
                            },
                          }
                        : prev,
                    )
                  }
                  className={cn(
                    "min-h-[120px] w-full",
                    errors.situationDescription && "border-destructive",
                  )}
                />
                {errors.situationDescription ? (
                  <p className="text-xs text-destructive">
                    {errors.situationDescription}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {def?.situationDescription?.trim()
                  ? def.situationDescription
                  : "Keine Beschreibung hinterlegt."}
              </p>
            )}
          </R1BlockShell>

          {/* Gültigkeitsdauer */}
          <R1BlockShell {...blockProps("duration")}>
            {editing?.blockId === "duration" && editing.definition ? (
              <DurationEditForm
                value={editing.definition.duration}
                error={errors.duration}
                onChange={(next) =>
                  setEditing((prev) =>
                    prev?.blockId === "duration" && prev.definition
                      ? { ...prev, definition: { ...prev.definition, duration: next } }
                      : prev,
                  )
                }
              />
            ) : (
              <DurationChoiceCompare selected={def?.duration} readonlyMode="r1" />
            )}
          </R1BlockShell>

          {/* Geltungsbereich */}
          <R1BlockShell {...blockProps("scope")}>
            {editing?.blockId === "scope" && editing.definition ? (
              <ScopeEditForm
                value={editing.definition.scopeSelections}
                error={errors.scope}
                onChange={(next) =>
                  setEditing((prev) =>
                    prev?.blockId === "scope" && prev.definition
                      ? {
                          ...prev,
                          definition: { ...prev.definition, scopeSelections: next },
                        }
                      : prev,
                  )
                }
              />
            ) : (
              <ScopeChecklist selected={def?.scopeSelections ?? []} readonlyMode="r1" />
            )}
          </R1BlockShell>

          {/* Lehrveranstaltungen */}
          <R1BlockShell {...blockProps("lectureMeasures")}>
            {editing?.blockId === "lectureMeasures" && editing.definition ? (
              <MeasuresEditForm
                groupId="lecture"
                options={LECTURE_MEASURE_OPTIONS}
                keineDescription={LECTURE_MEASURES_KEINE_DESCRIPTION}
                value={{
                  measures: editing.definition.lectureMeasures,
                  otherLines: editing.definition.lectureOtherLines,
                  measuresKeine: editing.definition.lectureMeasuresKeine,
                }}
                errors={{
                  measures: errors.lectureMeasures,
                }}
                onChange={(patch) =>
                  setEditing((prev) =>
                    prev?.blockId === "lectureMeasures" && prev.definition
                      ? {
                          ...prev,
                          definition: {
                            ...prev.definition,
                            lectureMeasures:
                              patch.measures ?? prev.definition.lectureMeasures,
                            lectureOtherLines:
                              patch.otherLines ?? prev.definition.lectureOtherLines,
                            lectureMeasuresKeine:
                              patch.measuresKeine ?? prev.definition.lectureMeasuresKeine,
                          },
                        }
                      : prev,
                  )
                }
              />
            ) : (
              <MeasureChecklist
                options={LECTURE_MEASURE_OPTIONS}
                selectedKeys={def?.lectureMeasures ?? []}
                otherLines={def?.lectureOtherLines}
                otherEnabled={def?.lectureOtherEnabled}
                otherText={def?.lectureOtherText}
                measuresKeine={Boolean(def?.lectureMeasuresKeine)}
                keineDescription={LECTURE_MEASURES_KEINE_DESCRIPTION}
                readonlyMode="r1"
              />
            )}
          </R1BlockShell>

          {/* Leistungsnachweise */}
          <R1BlockShell {...blockProps("assessmentMeasures")}>
            {editing?.blockId === "assessmentMeasures" && editing.definition ? (
              <MeasuresEditForm
                groupId="assessment"
                options={ASSESSMENT_MEASURE_OPTIONS}
                keineDescription={ASSESSMENT_MEASURES_KEINE_DESCRIPTION}
                value={{
                  measures: editing.definition.assessmentMeasures,
                  otherLines: editing.definition.assessmentOtherLines,
                  measuresKeine: editing.definition.assessmentMeasuresKeine,
                }}
                errors={{
                  measures: errors.assessmentMeasures,
                }}
                onChange={(patch) =>
                  setEditing((prev) =>
                    prev?.blockId === "assessmentMeasures" && prev.definition
                      ? {
                          ...prev,
                          definition: {
                            ...prev.definition,
                            assessmentMeasures:
                              patch.measures ?? prev.definition.assessmentMeasures,
                            assessmentOtherLines:
                              patch.otherLines ?? prev.definition.assessmentOtherLines,
                            assessmentMeasuresKeine:
                              patch.measuresKeine ?? prev.definition.assessmentMeasuresKeine,
                          },
                        }
                      : prev,
                  )
                }
              />
            ) : (
              <MeasureChecklist
                options={ASSESSMENT_MEASURE_OPTIONS}
                selectedKeys={def?.assessmentMeasures ?? []}
                otherLines={def?.assessmentOtherLines}
                otherEnabled={def?.assessmentOtherEnabled}
                otherText={def?.assessmentOtherText}
                measuresKeine={Boolean(def?.assessmentMeasuresKeine)}
                keineDescription={ASSESSMENT_MEASURES_KEINE_DESCRIPTION}
                readonlyMode="r1"
              />
            )}
          </R1BlockShell>

          <div className="flex w-full flex-row flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "h-10 gap-2 rounded-full px-4 text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/15",
                "focus-visible:border-destructive/30 focus-visible:ring-destructive/20",
              )}
              onClick={() => setWithdrawDialogOpen(true)}
              disabled={deleting || saving}
            >
              <Trash2 className="size-4 shrink-0" aria-hidden />
              {deleting ? "Wird zurückgezogen…" : "Antrag zurückziehen"}
            </Button>
            {canEditBlocks ? (
              <Button
                type="button"
                className="h-10 shrink-0 gap-2 rounded-full px-5"
                disabled={
                  !r1AllRequestedAdjustmentsSaved(data)
                  || releaseSubmitting
                  || saving
                  || Boolean(editing)
                }
                onClick={() => void releaseAdjustmentsForReview()}
              >
                {releaseSubmitting ? (
                  <>
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                    Wird freigegeben…
                  </>
                ) : (
                  <>
                    <Send className="size-4 shrink-0" aria-hidden />
                    Anpassungen für Review freigeben
                  </>
                )}
              </Button>
            ) : null}
          </div>
          {releaseError ? (
            <p className="text-sm text-destructive" role="alert">
              {releaseError}
            </p>
          ) : null}
        </div>
      </div>
    </div>

    <Dialog
      open={withdrawDialogOpen}
      onOpenChange={(open) => {
        if (!open && deleting) return;
        setWithdrawDialogOpen(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Antrag zurückziehen?</DialogTitle>
          <DialogDescription>
            Möchten Sie diesen Antrag wirklich zurückziehen? Der Antrag wird aus dem
            System entfernt; dieser Vorgang kann nicht rückgängig gemacht werden.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={deleting}
            onClick={() => setWithdrawDialogOpen(false)}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-full"
            disabled={deleting}
            onClick={() => void performWithdrawApplication()}
          >
            {deleting ? "Wird zurückgezogen…" : "Zurückziehen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

/* ---------- Block shell --------------------------------------------------- */

type R1BlockShellProps = {
  blockId: ReviewWorkspaceBlockId;
  title: string;
  forwarded: R2BlockPhase | null;
  resolution: R1AdjustmentResolution | null;
  canEdit: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  saveError: string | null;
  /** Neuester R2-Kommentar zu diesem Block (für Anzeige in der Karte). */
  remarkComment: SavedReviewComment | null;
  /** Nur bei fehlgeschlagenem Hintergrund-Autosave (kein Hinweis bei Erfolg). */
  autosaveErrorMessage: string | null;
};

function R1BlockShell({
  title,
  forwarded,
  resolution,
  canEdit,
  isEditing,
  onStartEdit,
  onReset,
  onSave,
  saving,
  saveError,
  blockId,
  autosaveErrorMessage,
  children,
}: R1BlockShellProps & { children: ReactNode }) {
  const anchorId = reviewWorkspaceAnchorId(blockId);

  const isAdjustmentRequested = forwarded?.phase === "adjustment";
  const isResolved = isAdjustmentRequested && Boolean(resolution);

  const tone: "confirmed" | "adjustment" | "default" =
    forwarded?.phase === "confirmed"
      ? "confirmed"
      : isAdjustmentRequested
        ? "adjustment"
        : "default";

  const remark =
    forwarded?.phase === "adjustment" ? forwarded.remark : null;

  const errorAlerts = (
    <>
      {autosaveErrorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {autosaveErrorMessage}
        </p>
      ) : null}
      {saveError ? (
        <p className="text-sm text-destructive" role="alert">
          {saveError}
        </p>
      ) : null}
    </>
  );

  if (canEdit && isEditing) {
    return (
      <ReviewBlockCard
        anchorId={anchorId}
        title={title}
        variant="adjustment_active"
        footer={
          <>
            {remark ? <ReviewBlockR1RemarkSection remark={remark} /> : null}
            <ReviewBlockR1EditingFooter
              onReset={onReset}
              onConfirm={onSave}
              saving={saving}
            />
          </>
        }
      >
        <>
          {children}
          {errorAlerts}
        </>
      </ReviewBlockCard>
    );
  }

  if (tone === "confirmed") {
    return (
      <ReviewBlockCard
        anchorId={anchorId}
        title={title}
        variant="confirmed"
        footer={
          <ReviewBlockConfirmedFooter
            readOnly
            statusLabel="Von Fachstelle bestätigt"
          />
        }
      >
        {children}
      </ReviewBlockCard>
    );
  }

  if (isAdjustmentRequested && isResolved) {
    return (
      <ReviewBlockCard
        anchorId={anchorId}
        title={title}
        variant="adjustment_active"
        footer={
          remark ? (
            <ReviewBlockR1RemarkSection
              remark={remark}
              footerActions={
                canEdit ? (
                  <ReviewBlockR1SavedRemarkActions onEdit={onStartEdit} />
                ) : undefined
              }
            />
          ) : null
        }
      >
        {children}
      </ReviewBlockCard>
    );
  }

  if (isAdjustmentRequested) {
    return (
      <ReviewBlockCard
        anchorId={anchorId}
        title={title}
        variant="adjustment_active"
        footer={
          <>
            {remark ? <ReviewBlockR1RemarkSection remark={remark} /> : null}
            {canEdit ? (
              <ReviewBlockR1StartAdjustmentFooter onStart={onStartEdit} />
            ) : null}
          </>
        }
      >
        {children}
      </ReviewBlockCard>
    );
  }

  return (
    <ReviewBlockCard anchorId={anchorId} title={title} variant="default" footer={null}>
      {children}
    </ReviewBlockCard>
  );
}

/* ---------- Edit forms (mirror Antragserstellung inputs) ----------------- */

function PersonalEditForm({
  value,
  errors,
  onChange,
  layout = "default",
}: {
  value: EditingPersonal;
  errors: FieldErrors;
  onChange: (patch: Partial<EditingPersonal>) => void;
  layout?: "default" | "r1";
}) {
  if (layout === "r1") {
    return (
      <div className={REVIEW_BLOCK_FIELD_GRID_CLASS}>
        <FieldGroup label="Vorname" error={errors.vorname}>
          <Input
            value={value.vorname}
            placeholder="Vorname"
            onChange={(e) => onChange({ vorname: e.target.value })}
            aria-invalid={Boolean(errors.vorname)}
            className={cn(errors.vorname && "border-destructive")}
          />
        </FieldGroup>
        <FieldGroup label="Name" error={errors.name}>
          <Input
            value={value.name}
            placeholder="Name"
            onChange={(e) => onChange({ name: e.target.value })}
            aria-invalid={Boolean(errors.name)}
            className={cn(errors.name && "border-destructive")}
          />
        </FieldGroup>
        <FieldGroup label="E-Mail" error={errors.email}>
          <Input
            type="email"
            value={value.email}
            placeholder="@hochschule.ch"
            onChange={(e) => onChange({ email: e.target.value })}
            aria-invalid={Boolean(errors.email)}
            className={cn(errors.email && "border-destructive")}
          />
        </FieldGroup>
        <FieldGroup label="Telefonnummer" error={errors.phone}>
          <Input
            type="tel"
            value={value.phone}
            placeholder="+41"
            onChange={(e) => onChange({ phone: e.target.value })}
            aria-invalid={Boolean(errors.phone)}
            className={cn(errors.phone && "border-destructive")}
          />
        </FieldGroup>
        <FieldGroup label="Martikelnummer" error={errors.matrikel}>
          <Input
            value={value.matrikel}
            inputMode="numeric"
            placeholder="00-000-000"
            onChange={(e) =>
              onChange({ matrikel: formatMatrikelInput(e.target.value) })
            }
            aria-invalid={Boolean(errors.matrikel)}
            className={cn(errors.matrikel && "border-destructive")}
          />
        </FieldGroup>
        <FieldGroup label="Studiengang" error={errors.studiengang}>
          <StudiengangCombobox
            value={value.studiengang}
            onValueChange={(v) => onChange({ studiengang: v })}
            placeholder="Studiengang wählen"
          />
        </FieldGroup>
        <FieldGroup label="Semester" error={errors.semester}>
          <Select
            value={value.semester || undefined}
            onValueChange={(v: string) => onChange({ semester: v })}
          >
            <SelectTrigger
              className={cn("w-full", errors.semester && "border-destructive")}
              aria-invalid={Boolean(errors.semester)}
            >
              <SelectValue placeholder="Semester wählen" />
            </SelectTrigger>
            <SelectContent>
              {SEMESTER_NUMBERS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldGroup>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Vorname" error={errors.vorname}>
          <Input
            value={value.vorname}
            placeholder="Vorname"
            onChange={(e) => onChange({ vorname: e.target.value })}
            aria-invalid={Boolean(errors.vorname)}
            className={cn(errors.vorname && "border-destructive")}
          />
        </FieldGroup>
        <FieldGroup label="Name" error={errors.name}>
          <Input
            value={value.name}
            placeholder="Name"
            onChange={(e) => onChange({ name: e.target.value })}
            aria-invalid={Boolean(errors.name)}
            className={cn(errors.name && "border-destructive")}
          />
        </FieldGroup>
        <FieldGroup label="E-Mail" error={errors.email}>
          <Input
            type="email"
            value={value.email}
            placeholder="@hochschule.ch"
            onChange={(e) => onChange({ email: e.target.value })}
            aria-invalid={Boolean(errors.email)}
            className={cn(errors.email && "border-destructive")}
          />
        </FieldGroup>
        <FieldGroup label="Telefonnummer" error={errors.phone}>
          <Input
            type="tel"
            value={value.phone}
            placeholder="+41"
            onChange={(e) => onChange({ phone: e.target.value })}
            aria-invalid={Boolean(errors.phone)}
            className={cn(errors.phone && "border-destructive")}
          />
        </FieldGroup>
      </div>
      <div className="space-y-4">
        <FieldGroup label="Matrikelnummer" error={errors.matrikel}>
          <Input
            value={value.matrikel}
            inputMode="numeric"
            placeholder="00-000-000"
            onChange={(e) =>
              onChange({ matrikel: formatMatrikelInput(e.target.value) })
            }
            aria-invalid={Boolean(errors.matrikel)}
            className={cn("max-w-[320px]", errors.matrikel && "border-destructive")}
          />
        </FieldGroup>
        <FieldGroup label="Studiengang" error={errors.studiengang}>
          <StudiengangCombobox
            value={value.studiengang}
            onValueChange={(v) => onChange({ studiengang: v })}
            placeholder="Studiengang wählen"
          />
        </FieldGroup>
        <FieldGroup label="Welches Semester besuchen Sie" error={errors.semester}>
          <Select
            value={value.semester || undefined}
            onValueChange={(v: string) => onChange({ semester: v })}
          >
            <SelectTrigger
              className={cn(
                "w-full border-neutral-300 bg-background shadow-xs dark:border-neutral-600",
                errors.semester && "border-destructive",
              )}
              aria-invalid={Boolean(errors.semester)}
            >
              <SelectValue placeholder="Semester wählen" />
            </SelectTrigger>
            <SelectContent>
              {SEMESTER_NUMBERS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}. Semester
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldGroup>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Antragsart</p>
        {(
          [
            {
              value: "studium" as const,
              title: "Für Studium",
              description:
                "Ich bin bereits immatrikuliert und möchte einen Nachteilsausgleich während des Studiums stellen.",
            },
            {
              value: "aufnahmeverfahren" as const,
              title: "Für Aufnahmeverfahren",
              description:
                "Ich bin noch nicht immatrikuliert und möchte einen Nachteilsausgleich für das Aufnahmeverfahren stellen.",
            },
          ]
        ).map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg border border-border bg-card px-3 py-3",
              value.antragsart === opt.value ? "opacity-100" : "opacity-70",
            )}
          >
            <input
              type="radio"
              checked={value.antragsart === opt.value}
              onChange={() => onChange({ antragsart: opt.value })}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm leading-5 text-foreground">{opt.title}</span>
              <span className="text-xs leading-4 text-muted-foreground">
                {opt.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function AttestEditForm({
  value,
  error,
  fileInputRef,
  onChange,
}: {
  value: AttestFile[];
  error?: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (next: AttestFile[]) => void;
}) {
  const [drag, setDrag] = useState(false);

  const append = (files: FileList | null) => {
    if (!files?.length) return;
    void (async () => {
      const next = await Promise.all(
        Array.from(files).map((f) => createAttestFileEntryFromBrowserFile(f)),
      );
      onChange([...value, ...next]);
    })();
  };

  const remove = (id?: string) => {
    const target = value.find((f) => f.id === id);
    if (target) revokeAttestFileUrls([target]);
    onChange(value.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex cursor-pointer flex-col items-center rounded-xl border border-dashed px-8 py-8 text-center transition-colors",
          drag ? "border-ring bg-muted/40" : "border-border",
          error && "border-destructive bg-destructive/5",
        )}
        onDragOver={(e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setDrag(false);
          append(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <Upload className="mb-2 size-6 text-foreground" />
        <p className="text-base font-medium text-foreground">Drag & Drop</p>
        <p className="text-sm text-muted-foreground">Datei hier hochladen</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => append(e.target.files)}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="space-y-2">
        {value.map((file) => (
          <div
            key={file.id ?? file.name}
            className="flex items-center gap-3 rounded-lg bg-secondary px-3 py-3"
          >
            <div className="min-w-0 flex-1">
              <ReviewFileRow
                title={file.name ?? "Datei"}
                subtitle={formatReviewFileSize(file.size ?? 0)}
                file={file}
              />
            </div>
            <button
              type="button"
              onClick={() => remove(file.id)}
              className={R1_ATTEST_FILE_REMOVE_BUTTON_CLASS}
              aria-label={`${file.name ?? "Datei"} entfernen`}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DurationEditForm({
  value,
  error,
  onChange,
}: {
  value: "" | "full_study" | "one_semester";
  error?: string;
  onChange: (next: "" | "full_study" | "one_semester") => void;
}) {
  const options: { id: "full_study" | "one_semester"; title: string; hint: string }[] = [
    {
      id: "full_study",
      title: "Gesamte Studiendauer",
      hint: "Für dauerhafte oder chronische Beeinträchtigungen",
    },
    {
      id: "one_semester",
      title: "Einmalig für ein Semester",
      hint: "Für episodische Erkrankungen oder zur erstmaligen Erprobung der Massnahmen",
    },
  ];
  return (
    <div className={R1_RICH_OPTION_GROUP_CLASS}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={R1_RICH_OPTION_EDITABLE_CLASS}
          onClick={() => onChange(opt.id)}
        >
          <span className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center" aria-hidden>
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full border-2 bg-background",
                value === opt.id ? "border-zinc-900" : "border-zinc-300",
              )}
            >
              {value === opt.id ? <span className="size-2 rounded-full bg-zinc-900" /> : null}
            </span>
          </span>
          <span className="min-w-0 flex-1 space-y-1.5 text-left">
            <span className="block text-sm leading-5 text-foreground">{opt.title}</span>
            <span className="block text-xs leading-4 text-muted-foreground">{opt.hint}</span>
          </span>
        </button>
      ))}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function ScopeEditForm({
  value,
  error,
  onChange,
}: {
  value: string[];
  error?: string;
  onChange: (next: string[]) => void;
}) {
  const set = new Set(value);
  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {APPLICATION_SCOPE_OPTIONS.map((opt) => {
          const isOn = set.has(opt);
          return (
            <label key={opt} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={isOn}
                onChange={(e) =>
                  onChange(
                    e.target.checked ? [...value, opt] : value.filter((v) => v !== opt),
                  )
                }
                className="size-4 accent-primary"
              />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

type MeasuresEditValue = {
  measures: string[];
  otherLines: string[];
  measuresKeine: boolean;
};

function MeasuresEditForm({
  groupId,
  options,
  keineDescription,
  value,
  errors,
  onChange,
}: {
  groupId: "lecture" | "assessment";
  options: readonly ApplicationMeasureOption[];
  keineDescription: string;
  value: MeasuresEditValue;
  errors: { measures?: string };
  onChange: (patch: Partial<MeasuresEditValue>) => void;
}) {
  const set = new Set(value.measures);
  const selectionInvalid =
    Boolean(errors.measures)
    && !value.measuresKeine
    && value.measures.length === 0
    && !hasMeasureOtherSelection(value.otherLines);
  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-[10px] border bg-card px-3 py-3 text-sm",
            value.measuresKeine ? "border-foreground" : "border-border",
          )}
        >
          <input
            type="checkbox"
            checked={value.measuresKeine}
            onChange={(e) =>
              onChange({
                measuresKeine: e.target.checked,
                measures: [],
                otherLines: e.target.checked ? [""] : value.otherLines,
              })
            }
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          <span className="space-y-1">
            <span className="block text-sm text-foreground">Keine</span>
            <span className="block text-xs text-muted-foreground">{keineDescription}</span>
          </span>
        </label>
        {options.map((opt) => {
          const isOn = set.has(opt.key);
          return (
            <label
              key={`${groupId}-${opt.key}`}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-[10px] border bg-card px-3 py-3 text-sm",
                isOn ? "border-foreground" : "border-border",
              )}
            >
              <input
                type="checkbox"
                checked={isOn}
                onChange={(e) =>
                  onChange({
                    measuresKeine: false,
                    measures: e.target.checked
                      ? [...value.measures, opt.key]
                      : value.measures.filter((m) => m !== opt.key),
                  })
                }
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span className="space-y-1">
                <span className="block text-sm text-foreground">{opt.title}</span>
                <span className="block text-xs text-muted-foreground">{opt.description}</span>
              </span>
            </label>
          );
        })}
        <CustomMeasureLinesField
          idPrefix={`${groupId}-other`}
          lines={value.otherLines ?? [""]}
          onChange={(next) =>
            onChange({
              otherLines: next,
              ...(hasMeasureOtherSelection(next) ? { measuresKeine: false } : {}),
            })
          }
          error={selectionInvalid}
        />
      </div>
      {errors.measures ? (
        <p className="text-xs text-destructive">{errors.measures}</p>
      ) : null}
    </div>
  );
}

function FieldGroup({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/** Genutzt durch das Layout, damit nur die Blöcke gerendert werden, die wir kennen. */
export const R1_REVIEW_BLOCKS = REVIEW_WORKSPACE_BLOCK_IDS;
