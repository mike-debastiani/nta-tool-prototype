"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  CheckCheck,
  FileText,
  Loader2,
  MessageSquareText,
  PencilLine,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  APPLICATION_MEASURE_OPTIONS,
  APPLICATION_SCOPE_OPTIONS,
  DurationChoiceCompare,
  MeasureChecklist,
  ReviewBlockCard,
  ReviewBlockFooterStatus,
  ReviewField,
  ReviewFileRow,
  ScopeChecklist,
  formatReviewFileSize,
  shortApplicationRef,
} from "@/components/domain/application-review-blocks";
import { RecommendationReleasedAccordion } from "@/components/domain/recommendation-released-accordion";
import {
  REVIEW_WORKSPACE_BLOCK_IDS,
  reviewWorkspaceAnchorId,
  type ReviewWorkspaceBlockId,
} from "@/lib/review-workspace-blocks";
import {
  type ApplicationData,
  type R1AdjustmentResolution,
  type WorkspaceApplication,
} from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { getApplicationStatusMeta } from "@/lib/application-status";

type R2BlockPhase =
  | { phase: "confirmed" }
  | { phase: "adjustment"; remark: string };

const SEMESTER_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

const BLOCK_TITLES: Record<ReviewWorkspaceBlockId, string> = {
  applicant: "Antragsteller",
  attest: "Fachärztliches Attest",
  definition: "Antragsdefinition",
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
  lectureOtherEnabled: boolean;
  lectureOtherText: string;
  assessmentMeasures: string[];
  assessmentOtherEnabled: boolean;
  assessmentOtherText: string;
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
    next.attestFiles = edit.attestFiles;
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
      next.applicationDefinition = {
        ...base,
        lectureMeasures: edit.definition.lectureMeasures,
        lectureOtherEnabled: edit.definition.lectureOtherEnabled,
        lectureOtherText: edit.definition.lectureOtherText,
      };
    } else if (edit.blockId === "assessmentMeasures") {
      next.applicationDefinition = {
        ...base,
        assessmentMeasures: edit.definition.assessmentMeasures,
        assessmentOtherEnabled: edit.definition.assessmentOtherEnabled,
        assessmentOtherText: edit.definition.assessmentOtherText,
      };
    }
  }

  return next;
}

function formatAutosaveTime(ts: number): string {
  return new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
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
  allowAdjustments = false,
  onPersisted,
}: PortalApplicationAdjustmentProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  // Lokaler Snapshot des Antrags. Initial vom Server kommend; bei jedem
  // erfolgreichen Save aktualisieren wir ihn aus der Update-Antwort. Die
  // Server-Komponente sollte bei Wechsel des Antrags via `key={application.id}`
  // ein vollständiges Remount erzwingen.
  const [snapshot, setSnapshot] = useState<WorkspaceApplication>(application);

  const data = snapshot.data;
  const def = data.applicationDefinition;
  const personal = data.personalData;
  const forwarded = readForwardedBlocks(data);
  const resolutions = (data.r1AdjustmentResolutions ?? {}) as Partial<
    Record<ReviewWorkspaceBlockId, R1AdjustmentResolution>
  >;
  const statusMeta = getApplicationStatusMeta(snapshot, "R1");

  const [editing, setEditing] = useState<EditingState | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [autosave, setAutosave] = useState<AutosaveStatus>({ kind: "idle" });
  const [autosaveBaseline, setAutosaveBaseline] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startEdit = (blockId: ReviewWorkspaceBlockId) => {
    if (!allowAdjustments) return;
    setSaveError(null);
    setErrors({});
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
        lectureOtherEnabled: Boolean(def?.lectureOtherEnabled),
        lectureOtherText: def?.lectureOtherText ?? "",
        assessmentMeasures: [...(def?.assessmentMeasures ?? [])],
        assessmentOtherEnabled: Boolean(def?.assessmentOtherEnabled),
        assessmentOtherText: def?.assessmentOtherText ?? "",
      },
    };
    setAutosaveBaseline(JSON.stringify(nextEdit));
    setEditing(nextEdit);
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
        if (d.lectureMeasures.length === 0 && !d.lectureOtherEnabled)
          e.lectureMeasures = "Mindestens eine Option";
        if (d.lectureOtherEnabled && !d.lectureOtherText.trim())
          e.lectureOtherText = "Bitte spezifizieren";
      }
      if (edit.blockId === "assessmentMeasures") {
        if (d.assessmentMeasures.length === 0 && !d.assessmentOtherEnabled)
          e.assessmentMeasures = "Mindestens eine Option";
        if (d.assessmentOtherEnabled && !d.assessmentOtherText.trim())
          e.assessmentOtherText = "Bitte spezifizieren";
      }
    }
    return e;
  };

  useEffect(() => {
    if (!allowAdjustments || !editing || saving) return;

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
          setSnapshot(updated as WorkspaceApplication);
        }
        setAutosaveBaseline(signature);
        setAutosave({ kind: "saved", at: Date.now() });
      })();
    }, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [editing, allowAdjustments, autosaveBaseline, saving, data, snapshot.id, supabase]);

  const persistEdit = async (edit: EditingState) => {
    if (!allowAdjustments) return;
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
      setSnapshot(updated as WorkspaceApplication);
    }
    setEditing(null);
    setErrors({});
    setAutosave({ kind: "idle" });
    setAutosaveBaseline(null);
    onPersisted?.();
  };

  const deleteApplication = async () => {
    const shouldDelete = window.confirm(
      "Möchten Sie diesen Antrag wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.",
    );
    if (!shouldDelete) return;

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

  const savedComments = readSavedComments(data);

  const blockProps = (id: ReviewWorkspaceBlockId): R1BlockShellProps => ({
    blockId: id,
    title: BLOCK_TITLES[id],
    forwarded: forwarded[id] ?? null,
    resolution: resolutions[id] ?? null,
    isEditing: allowAdjustments && editing?.blockId === id,
    canEdit: allowAdjustments,
    onStartEdit: () => startEdit(id),
    onCancel: cancelEdit,
    onSave: () => editing && void persistEdit(editing),
    saving,
    saveError: editing?.blockId === id ? saveError : null,
    remarkComment: commentForBlock(data, id),
    autosave: editing?.blockId === id ? autosave : { kind: "idle" },
  });

  return (
    <div className="flex min-h-0 flex-1 w-full min-w-0 flex-row overflow-hidden">
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="absolute left-6 top-4 z-30 rounded-full border border-border/70 bg-background/90 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <Link href="/portal/home">
              <ArrowLeft className="size-4" aria-hidden />
              Zurück
            </Link>
          </Button>
        </div>

        <div className="h-full overflow-y-auto px-6 pb-8 pt-20">
          <div className="mx-auto w-full max-w-4xl space-y-6">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    Antrag auf Nachteilsausgleich (NTA) –{" "}
                    {shortApplicationRef(snapshot.id)}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {allowAdjustments ? (
                      <>
                        Die Fachstelle hat zu einzelnen Blöcken Anpassungen
                        angefordert. Klicken Sie bei einem markierten Block auf{" "}
                        <span className="font-medium text-foreground">
                          «Anpassung vornehmen»
                        </span>
                        , passen Sie die Inhalte an und speichern Sie den Block.
                      </>
                    ) : (
                      <>
                        Sie sehen den Antrag in der Blockansicht. Anpassungen sind
                        nur möglich, wenn der Antrag den Status «Anpassung
                        erforderlich» hat.
                      </>
                    )}
                  </p>
                  {deleteError ? (
                    <p className="mt-2 text-sm text-destructive" role="alert">
                      Antrag konnte nicht gelöscht werden: {deleteError}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  className="shrink-0 gap-2"
                  onClick={() => void deleteApplication()}
                  disabled={deleting || saving}
                >
                  <Trash2 className="size-4" aria-hidden />
                  {deleting ? "Wird gelöscht…" : "Antrag löschen"}
                </Button>
              </div>
            </div>

          {/* Antragsteller */}
          <R1BlockShell {...blockProps("applicant")}>
            {editing?.blockId === "applicant" && editing.personal ? (
              <PersonalEditForm
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
              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewField
                  label="Name"
                  value={`${personal.vorname ?? ""} ${personal.name ?? ""}`.trim() || "—"}
                />
                <ReviewField label="Matrikelnummer" value={personal.matrikel ?? "—"} />
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
                      href="#"
                      onNavigate={(e) => e.preventDefault()}
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
              variant="card"
              html={data.recommendation.releasedHtml}
              releasedAt={data.recommendation.releasedAt}
              authorDisplayName={
                data.recommendation.releasedBy?.trim()
                || "Fachstelle für Nachteilsausgleich"
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
                <textarea
                  id="r1-situation"
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
                    "min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm shadow-xs outline-none transition focus:border-ring",
                    errors.situationDescription
                      ? "border-destructive"
                      : "border-border",
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
              <DurationChoiceCompare selected={def?.duration} />
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
              <ScopeChecklist selected={def?.scopeSelections ?? []} />
            )}
          </R1BlockShell>

          {/* Lehrveranstaltungen */}
          <R1BlockShell {...blockProps("lectureMeasures")}>
            {editing?.blockId === "lectureMeasures" && editing.definition ? (
              <MeasuresEditForm
                groupId="lecture"
                value={{
                  measures: editing.definition.lectureMeasures,
                  otherEnabled: editing.definition.lectureOtherEnabled,
                  otherText: editing.definition.lectureOtherText,
                }}
                errors={{
                  measures: errors.lectureMeasures,
                  otherText: errors.lectureOtherText,
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
                            lectureOtherEnabled:
                              patch.otherEnabled ?? prev.definition.lectureOtherEnabled,
                            lectureOtherText:
                              patch.otherText ?? prev.definition.lectureOtherText,
                          },
                        }
                      : prev,
                  )
                }
              />
            ) : (
              <MeasureChecklist
                options={APPLICATION_MEASURE_OPTIONS}
                selectedKeys={def?.lectureMeasures ?? []}
                otherEnabled={def?.lectureOtherEnabled}
                otherText={def?.lectureOtherText}
              />
            )}
          </R1BlockShell>

          {/* Leistungsnachweise */}
          <R1BlockShell {...blockProps("assessmentMeasures")}>
            {editing?.blockId === "assessmentMeasures" && editing.definition ? (
              <MeasuresEditForm
                groupId="assessment"
                value={{
                  measures: editing.definition.assessmentMeasures,
                  otherEnabled: editing.definition.assessmentOtherEnabled,
                  otherText: editing.definition.assessmentOtherText,
                }}
                errors={{
                  measures: errors.assessmentMeasures,
                  otherText: errors.assessmentOtherText,
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
                            assessmentOtherEnabled:
                              patch.otherEnabled ?? prev.definition.assessmentOtherEnabled,
                            assessmentOtherText:
                              patch.otherText ?? prev.definition.assessmentOtherText,
                          },
                        }
                      : prev,
                  )
                }
              />
            ) : (
              <MeasureChecklist
                options={APPLICATION_MEASURE_OPTIONS}
                selectedKeys={def?.assessmentMeasures ?? []}
                otherEnabled={def?.assessmentOtherEnabled}
                otherText={def?.assessmentOtherText}
              />
            )}
          </R1BlockShell>

          {allowAdjustments ? (
            <p className="pt-2 text-xs text-muted-foreground">
              Sie können Anpassungen jederzeit erneut öffnen und überarbeiten,
              solange der Antrag im Status «Anpassung erforderlich» ist.
            </p>
          ) : null}
          </div>
        </div>
      </div>

      <aside className="flex h-full min-h-0 w-[366px] shrink-0 flex-col overflow-hidden border-l border-border bg-[#fafafa]">
        <ApplicationReviewDetailSidebar
          application={snapshot}
          statusMeta={statusMeta}
          assignedReviewerLabel={applicantDisplayName}
          adjustmentComposer={null}
          savedReviewComments={savedComments}
          onSavedCommentNavigate={navigateFromComment}
        />
      </aside>
    </div>
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
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  saveError: string | null;
  /** Neuester R2-Kommentar zu diesem Block (für Anzeige in der Karte). */
  remarkComment: SavedReviewComment | null;
  /** Autosave-Status — nur relevant wenn `isEditing`. */
  autosave: AutosaveStatus;
};

function R1BlockShell({
  title,
  forwarded,
  resolution,
  canEdit,
  isEditing,
  onStartEdit,
  onCancel,
  onSave,
  saving,
  saveError,
  remarkComment,
  blockId,
  autosave,
  children,
}: R1BlockShellProps & { children: ReactNode }) {
  const anchorId = reviewWorkspaceAnchorId(blockId);

  // Bestimme den Tonus.
  const isAdjustmentRequested = forwarded?.phase === "adjustment";
  const isResolved = isAdjustmentRequested && Boolean(resolution);

  const tone: "confirmed" | "adjustment" | "default" =
    forwarded?.phase === "confirmed"
      ? "confirmed"
      : isAdjustmentRequested
        ? "adjustment"
        : "default";

  const remark =
    forwarded?.phase === "adjustment"
      ? forwarded.remark
      : (remarkComment?.body ?? null);

  // Wenn Edit-Modus aktiv: Rahmen amber, Footer mit Speichern/Abbrechen.
  if (canEdit && isEditing) {
    return (
      <ReviewBlockCard
        anchorId={anchorId}
        title={title}
        footerTone="adjustment"
        footer={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-3 text-white hover:bg-amber-500 hover:text-white focus-visible:ring-white/80"
              onClick={onCancel}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <div className="flex items-center gap-3 sm:justify-end">
              <AutosaveBadge status={autosave} />
              <Button
                type="button"
                className="h-9 gap-2 bg-zinc-900 text-white hover:bg-zinc-800"
                onClick={onSave}
                disabled={saving}
              >
                <Save className="size-4" aria-hidden />
                {saving ? "Wird gespeichert…" : "Anpassung speichern"}
              </Button>
            </div>
          </div>
        }
      >
        <>
          {remark ? <RemarkBox remark={remark} /> : null}
          {children}
          {saveError ? (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          ) : null}
        </>
      </ReviewBlockCard>
    );
  }

  // Confirmed: grüner Rahmen, kein Footer-Button.
  if (tone === "confirmed") {
    return (
      <ReviewBlockCard
        anchorId={anchorId}
        title={title}
        footerTone="confirmed"
        footer={
          <div className="flex w-full justify-end">
            <ReviewBlockFooterStatus
              icon={CheckCheck}
              label="Von der Fachstelle bestätigt"
            />
          </div>
        }
      >
        {children}
      </ReviewBlockCard>
    );
  }

  // Adjustment requested + R1 hat Anpassung gespeichert: amber Rahmen + Marker „Anpassung erfolgt".
  if (isAdjustmentRequested && isResolved) {
    return (
      <ReviewBlockCard
        anchorId={anchorId}
        title={title}
        footerTone="adjustment"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            {canEdit ? (
              <Button
                type="button"
                variant="ghost"
                className="h-9 gap-2 px-3 text-white hover:bg-amber-500 hover:text-white focus-visible:ring-white/80"
                onClick={onStartEdit}
              >
                <PencilLine className="size-4" aria-hidden />
                Erneut bearbeiten
              </Button>
            ) : (
              <span />
            )}
            <ReviewBlockFooterStatus icon={CheckCheck} label="Anpassung erfolgt" />
          </div>
        }
      >
        <>
          {remark ? <RemarkBox remark={remark} /> : null}
          <ResolvedNotice />
          {children}
        </>
      </ReviewBlockCard>
    );
  }

  // Adjustment requested, noch nicht bearbeitet: amber + „Anpassung vornehmen".
  if (isAdjustmentRequested) {
    return (
      <ReviewBlockCard
        anchorId={anchorId}
        title={title}
        footerTone="adjustment"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <ReviewBlockFooterStatus
              icon={MessageSquareText}
              label={canEdit ? "Anpassung erforderlich" : "Anpassung angefordert"}
            />
            {canEdit ? (
              <Button
                type="button"
                className="h-9 gap-2 bg-zinc-900 text-white hover:bg-zinc-800"
                onClick={onStartEdit}
              >
                <PencilLine className="size-4" aria-hidden />
                Anpassung vornehmen
              </Button>
            ) : null}
          </div>
        }
      >
        <>
          {remark ? <RemarkBox remark={remark} /> : null}
          {children}
        </>
      </ReviewBlockCard>
    );
  }

  // Fallback: kein expliziter Snapshot — neutral.
  return (
    <ReviewBlockCard anchorId={anchorId} title={title} footer={null}>
      {children}
    </ReviewBlockCard>
  );
}

function RemarkBox({ remark }: { remark: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/35">
      <p className="text-xs font-medium text-muted-foreground">
        Bemerkung der Fachstelle
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-foreground">
        {remark}
      </p>
    </div>
  );
}

function ResolvedNotice() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-teal-300 bg-teal-50/80 px-4 py-3 text-sm text-teal-950 dark:border-teal-700/60 dark:bg-teal-950/30">
      <CheckCheck className="size-4 shrink-0 text-teal-600" aria-hidden />
      <span>
        Sie haben diesen Block angepasst. Die Bemerkung der Fachstelle bleibt
        zur Nachvollziehbarkeit sichtbar.
      </span>
    </div>
  );
}

function AutosaveBadge({ status }: { status: AutosaveStatus }) {
  if (status.kind === "idle") return null;

  if (status.kind === "pending") {
    return (
      <span
        className="text-xs text-white/85"
        aria-live="polite"
        title="Änderungen werden in Kürze automatisch gespeichert"
      >
        Autosave aktiv …
      </span>
    );
  }

  if (status.kind === "saving") {
    return (
      <span
        className="flex items-center gap-1.5 text-xs text-white/85"
        aria-live="polite"
      >
        <Loader2 className="size-3 animate-spin" aria-hidden />
        Speichert …
      </span>
    );
  }

  if (status.kind === "saved") {
    return (
      <span
        className="text-xs text-white/85"
        aria-live="polite"
        title={`Zwischengespeichert um ${formatAutosaveTime(status.at)}`}
      >
        Gespeichert · {formatAutosaveTime(status.at)}
      </span>
    );
  }

  return (
    <span
      className="text-xs font-medium text-amber-100"
      role="alert"
      title={status.message}
    >
      Autosave fehlgeschlagen
    </span>
  );
}

/* ---------- Edit forms (mirror Antragserstellung inputs) ----------------- */

function PersonalEditForm({
  value,
  errors,
  onChange,
}: {
  value: EditingPersonal;
  errors: FieldErrors;
  onChange: (patch: Partial<EditingPersonal>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Vorname" error={errors.vorname}>
          <Input
            value={value.vorname}
            onChange={(e) => onChange({ vorname: e.target.value })}
            aria-invalid={Boolean(errors.vorname)}
            className={cn(errors.vorname && "border-destructive")}
          />
        </FieldGroup>
        <FieldGroup label="Name" error={errors.name}>
          <Input
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            aria-invalid={Boolean(errors.name)}
            className={cn(errors.name && "border-destructive")}
          />
        </FieldGroup>
        <FieldGroup label="E-Mail" error={errors.email}>
          <Input
            type="email"
            value={value.email}
            onChange={(e) => onChange({ email: e.target.value })}
            aria-invalid={Boolean(errors.email)}
            className={cn(errors.email && "border-destructive")}
          />
        </FieldGroup>
        <FieldGroup label="Telefonnummer" error={errors.phone}>
          <Input
            type="tel"
            value={value.phone}
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
              "flex w-full items-start gap-3 rounded-xl border border-border bg-card px-3 py-3",
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
    const next: AttestFile[] = Array.from(files).map((f) => ({
      id: `${f.name}-${f.size}-${f.lastModified}-${crypto.randomUUID()}`,
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    onChange([...value, ...next]);
  };

  const remove = (id?: string) =>
    onChange(value.filter((f) => f.id !== id));

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
            className="flex items-center gap-4 rounded-lg bg-secondary px-4 py-4"
          >
            <FileText className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {file.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatReviewFileSize(file.size ?? 0)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(file.id)}
              className="rounded-md p-2 text-destructive/80 transition hover:bg-destructive/10 hover:text-destructive"
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
      hint: "Für episodische Erkrankungen oder zur erstmaligen Erprobung",
    },
  ];
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt.id}
          className={cn(
            "flex items-start gap-3 rounded-[10px] border bg-card px-3 py-3",
            value === opt.id ? "border-foreground" : "border-border",
          )}
        >
          <input
            type="radio"
            name="r1-duration"
            checked={value === opt.id}
            onChange={() => onChange(opt.id)}
            className="mt-0.5 size-4 accent-primary"
          />
          <span className="space-y-1">
            <span className="block text-sm text-foreground">{opt.title}</span>
            <span className="block text-xs text-muted-foreground">{opt.hint}</span>
          </span>
        </label>
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
  otherEnabled: boolean;
  otherText: string;
};

function MeasuresEditForm({
  groupId,
  value,
  errors,
  onChange,
}: {
  groupId: "lecture" | "assessment";
  value: MeasuresEditValue;
  errors: { measures?: string; otherText?: string };
  onChange: (patch: Partial<MeasuresEditValue>) => void;
}) {
  const set = new Set(value.measures);
  return (
    <div className="space-y-2">
      <div className="max-w-[330px] space-y-2">
        {APPLICATION_MEASURE_OPTIONS.map((opt) => {
          const isOn = set.has(opt.key);
          return (
            <label key={`${groupId}-${opt.key}`} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={isOn}
                onChange={(e) =>
                  onChange({
                    measures: e.target.checked
                      ? [...value.measures, opt.key]
                      : value.measures.filter((m) => m !== opt.key),
                  })
                }
                className="size-4 accent-primary"
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={value.otherEnabled}
            onChange={(e) => onChange({ otherEnabled: e.target.checked })}
            className="size-4 accent-primary"
          />
          <Input
            value={value.otherText}
            onChange={(e) => onChange({ otherText: e.target.value })}
            placeholder="Sonstige …"
            disabled={!value.otherEnabled}
            className={cn("h-8", errors.otherText && "border-destructive")}
          />
        </div>
      </div>
      {errors.measures ? (
        <p className="text-xs text-destructive">{errors.measures}</p>
      ) : null}
      {errors.otherText ? (
        <p className="text-xs text-destructive">{errors.otherText}</p>
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
