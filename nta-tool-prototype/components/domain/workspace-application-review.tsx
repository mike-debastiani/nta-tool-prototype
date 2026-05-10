"use client";

import {
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useState,
} from "react";
import {
  Check,
  CheckCheck,
  ExternalLink,
  FileText,
  MessageSquarePlus,
  MessageSquareText,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ApplicationReviewDetailSidebar,
  type SavedReviewComment,
} from "@/components/domain/application-review-detail-sidebar";
import {
  APPLICATION_MEASURE_OPTIONS,
  APPLICATION_SCOPE_OPTIONS,
} from "@/lib/application-review-labels";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { cn } from "@/lib/utils";
import { getApplicationStatusMeta } from "@/lib/application-status";

type ReviewBlockId =
  | "applicant"
  | "attest"
  | "definition"
  | "duration"
  | "scope"
  | "lectureMeasures"
  | "assessmentMeasures";

type ReviewBlockPhase =
  | { phase: "pending" }
  | { phase: "confirmed" }
  | { phase: "adjustment"; remark: string };

const INITIAL_REVIEW_BLOCK_PHASES: Record<ReviewBlockId, ReviewBlockPhase> = {
  applicant: { phase: "pending" },
  attest: { phase: "pending" },
  definition: { phase: "pending" },
  duration: { phase: "pending" },
  scope: { phase: "pending" },
  lectureMeasures: { phase: "pending" },
  assessmentMeasures: { phase: "pending" },
};

export type WorkspaceReviewViewMode =
  | "interactive"
  | "readonly_decision"
  | "readonly_adjustment_pending";

type WorkspaceApplicationReviewProps = {
  application: WorkspaceApplication;
  reviewerDisplayName: string;
  /** Nur-Lese-Modi für andere Kanon-States (z. B. Entscheid, ausstehende Anpassung). */
  viewMode?: WorkspaceReviewViewMode;
  /** Optional: nach persistierender Aktion (z. B. Refresh der Antragsliste). */
  onPersisted?: () => void;
};

function formatFileSize(sizeInBytes: number) {
  if (!sizeInBytes || Number.isNaN(sizeInBytes)) return "—";
  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function WorkspaceApplicationReview({
  application,
  reviewerDisplayName,
  viewMode = "interactive",
  onPersisted,
}: WorkspaceApplicationReviewProps) {
  const readOnly = viewMode !== "interactive";
  const data = application.data;
  const statusMeta = getApplicationStatusMeta(application, "R2");
  const def = data.applicationDefinition;

  const [blockPhases, setBlockPhases] =
    useState<Record<ReviewBlockId, ReviewBlockPhase>>(INITIAL_REVIEW_BLOCK_PHASES);

  const [pendingComposer, setPendingComposer] = useState<{
    blockId: ReviewBlockId;
    blockTitle: string;
    draft: string;
  } | null>(null);
  const [adjustmentRemarkSaveError, setAdjustmentRemarkSaveError] = useState(false);
  const [savedReviewComments, setSavedReviewComments] = useState<SavedReviewComment[]>(
    [],
  );
  const [adjustmentResetDialogBlockId, setAdjustmentResetDialogBlockId] =
    useState<ReviewBlockId | null>(null);

  const openAdjustmentComposer = (blockId: ReviewBlockId, blockTitle: string) => {
    setAdjustmentRemarkSaveError(false);
    setPendingComposer({ blockId, blockTitle, draft: "" });
  };

  const handleSaveAdjustmentFromSidebar = () => {
    if (!pendingComposer) return;
    const trimmed = pendingComposer.draft.trim();
    if (!trimmed) {
      setAdjustmentRemarkSaveError(true);
      return;
    }
    adjustBlock(pendingComposer.blockId, trimmed);
    setSavedReviewComments((prev) => [
      {
        id: crypto.randomUUID(),
        blockId: pendingComposer.blockId,
        blockTitle: pendingComposer.blockTitle,
        body: trimmed,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setPendingComposer(null);
    setAdjustmentRemarkSaveError(false);
    onPersisted?.();
  };

  const confirmBlock = (id: ReviewBlockId) => {
    setBlockPhases((prev) => ({ ...prev, [id]: { phase: "confirmed" } }));
  };

  const adjustBlock = (id: ReviewBlockId, remark: string) => {
    setBlockPhases((prev) => ({
      ...prev,
      [id]: { phase: "adjustment", remark },
    }));
  };

  const resetBlock = (id: ReviewBlockId) => {
    setBlockPhases((prev) => ({ ...prev, [id]: { phase: "pending" } }));
  };

  const handleResetRequest = (id: ReviewBlockId) => {
    const phase = blockPhases[id];
    if (phase.phase === "adjustment") {
      setAdjustmentResetDialogBlockId(id);
      return;
    }
    resetBlock(id);
  };

  const confirmWithdrawAdjustment = () => {
    const id = adjustmentResetDialogBlockId;
    if (!id) return;
    resetBlock(id);
    setSavedReviewComments((prev) => prev.filter((c) => c.blockId !== id));
    setPendingComposer((prev) => (prev?.blockId === id ? null : prev));
    setAdjustmentRemarkSaveError(false);
    setAdjustmentResetDialogBlockId(null);
  };

  return (
    <div className="flex min-h-0 flex-1 w-full min-w-0 flex-row overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-6 pb-8 pt-6">
        <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Antrag auf Nachteilsausgleich (NTA) – {shortApplicationRef(application.id)}
          </h1>
        </div>

        {/* Step „Persönliche Angaben“ ohne Antragsart (Figma: Antragsteller) */}
        <InteractiveReviewBlock
          readOnly={readOnly}
          title="Antragsteller"
          phase={blockPhases.applicant}
          onConfirm={() => confirmBlock("applicant")}
          onRequestAdjustment={() =>
            openAdjustmentComposer("applicant", "Antragsteller")}
          onReset={() => handleResetRequest("applicant")}
        >
          {data.personalData ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ReviewField
                label="Name"
                value={`${data.personalData.vorname ?? ""} ${data.personalData.name ?? ""}`.trim() || "—"}
              />
              <ReviewField
                label="Matrikelnummer"
                value={data.personalData.matrikel ?? "—"}
              />
              <ReviewField
                label="Studiengang"
                value={data.personalData.studiengang ?? "—"}
              />
              <ReviewField
                label="Semester"
                value={data.personalData.semester ?? "—"}
              />
              <ReviewField
                label="E-Mail"
                value={data.personalData.email ?? "—"}
              />
              <ReviewField
                label="Telefonnummer"
                value={data.personalData.phone ?? "—"}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Daten erfasst.</p>
          )}
        </InteractiveReviewBlock>

        {/* Fachärztliches Attest */}
        <InteractiveReviewBlock
          readOnly={readOnly}
          title="Fachärztliches Attest"
          phase={blockPhases.attest}
          onConfirm={() => confirmBlock("attest")}
          onRequestAdjustment={() =>
            openAdjustmentComposer("attest", "Fachärztliches Attest")}
          onReset={() => handleResetRequest("attest")}
        >
          {data.attestFiles?.length ? (
            <ul className="space-y-3">
              {data.attestFiles.map((file) => (
                <li key={file.id ?? file.name}>
                  <ReviewFileRow
                    title={file.name ?? "Datei"}
                    subtitle={formatFileSize(file.size ?? 0)}
                    href="#"
                    onNavigate={(e) => e.preventDefault()}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Dateien hochgeladen.</p>
          )}
        </InteractiveReviewBlock>

        {/* Empfehlungsschreiben — gleiche Dateikachel wie Attest, ohne Aktionen */}
        <ReviewBlockCard title="Empfehlungsschreiben der Fachstelle" footer={null}>
          {data.recommendation?.url ? (
            <ul className="space-y-3">
              <li>
                <ReviewFileRow
                  title={fileNameFromUrl(data.recommendation.url)}
                  subtitle="Empfehlung der Fachstelle"
                  href={data.recommendation.url}
                />
              </li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Kein Empfehlungsschreiben hinterlegt.</p>
          )}
        </ReviewBlockCard>

        {/* Antragsdefinition (Freitext) */}
        <InteractiveReviewBlock
          readOnly={readOnly}
          title="Antragsdefinition"
          phase={blockPhases.definition}
          onConfirm={() => confirmBlock("definition")}
          onRequestAdjustment={() =>
            openAdjustmentComposer("definition", "Antragsdefinition")}
          onReset={() => handleResetRequest("definition")}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {def?.situationDescription?.trim()
              ? def.situationDescription
              : "Keine Beschreibung hinterlegt."}
          </p>
        </InteractiveReviewBlock>

        {/* Gültigkeitsdauer */}
        <InteractiveReviewBlock
          readOnly={readOnly}
          title="Gültigkeitsdauer des Nachteilsausgleiches"
          phase={blockPhases.duration}
          onConfirm={() => confirmBlock("duration")}
          onRequestAdjustment={() =>
            openAdjustmentComposer(
              "duration",
              "Gültigkeitsdauer des Nachteilsausgleiches",
            )}
          onReset={() => handleResetRequest("duration")}
        >
          <DurationChoiceCompare selected={def?.duration} />
        </InteractiveReviewBlock>

        {/* Geltungsbereich */}
        <InteractiveReviewBlock
          readOnly={readOnly}
          title="Geltungsbereich des beantragten Nachteilsausgleiches"
          phase={blockPhases.scope}
          onConfirm={() => confirmBlock("scope")}
          onRequestAdjustment={() =>
            openAdjustmentComposer(
              "scope",
              "Geltungsbereich des beantragten Nachteilsausgleiches",
            )}
          onReset={() => handleResetRequest("scope")}
        >
          <ScopeChecklist selected={def?.scopeSelections ?? []} />
        </InteractiveReviewBlock>

        {/* Lehrveranstaltungen */}
        <InteractiveReviewBlock
          readOnly={readOnly}
          title="Ausgleichsmassnahmen für Lehrveranstaltungen"
          phase={blockPhases.lectureMeasures}
          onConfirm={() => confirmBlock("lectureMeasures")}
          onRequestAdjustment={() =>
            openAdjustmentComposer(
              "lectureMeasures",
              "Ausgleichsmassnahmen für Lehrveranstaltungen",
            )}
          onReset={() => handleResetRequest("lectureMeasures")}
        >
          <MeasureChecklist
            options={APPLICATION_MEASURE_OPTIONS}
            selectedKeys={def?.lectureMeasures ?? []}
            otherEnabled={def?.lectureOtherEnabled}
            otherText={def?.lectureOtherText}
          />
        </InteractiveReviewBlock>

        {/* Leistungsnachweise */}
        <InteractiveReviewBlock
          readOnly={readOnly}
          title="Ausgleichsmassnahmen für Leistungsnachweise"
          phase={blockPhases.assessmentMeasures}
          onConfirm={() => confirmBlock("assessmentMeasures")}
          onRequestAdjustment={() =>
            openAdjustmentComposer(
              "assessmentMeasures",
              "Ausgleichsmassnahmen für Leistungsnachweise",
            )}
          onReset={() => handleResetRequest("assessmentMeasures")}
        >
          <MeasureChecklist
            options={APPLICATION_MEASURE_OPTIONS}
            selectedKeys={def?.assessmentMeasures ?? []}
            otherEnabled={def?.assessmentOtherEnabled}
            otherText={def?.assessmentOtherText}
          />
        </InteractiveReviewBlock>

        <div className="pt-2">
          <Button
            type="button"
            className="h-11 w-full bg-zinc-900 text-white hover:bg-zinc-800 sm:w-auto sm:min-w-[240px]"
            disabled
            title="Logik folgt"
          >
            Anpassungen anfordern
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Gesamtaktion nach Block-Freigaben — Anbindung folgt.
          </p>
        </div>
        </div>
      </div>

      <aside className="flex h-full min-h-0 w-[366px] shrink-0 flex-col overflow-hidden border-l border-border bg-[#fafafa]">
        <ApplicationReviewDetailSidebar
          application={application}
          statusMeta={statusMeta}
          assignedReviewerLabel={reviewerDisplayName}
          adjustmentComposer={
            readOnly || !pendingComposer
              ? null
              : {
                  blockTitle: pendingComposer.blockTitle,
                  draft: pendingComposer.draft,
                  onDraftChange: (value) => {
                    setPendingComposer((prev) =>
                      prev ? { ...prev, draft: value } : null,
                    );
                    setAdjustmentRemarkSaveError((err) =>
                      err && value.trim() ? false : err,
                    );
                  },
                  onCancel: () => {
                    setPendingComposer(null);
                    setAdjustmentRemarkSaveError(false);
                  },
                  onSave: handleSaveAdjustmentFromSidebar,
                  saveError: adjustmentRemarkSaveError,
                }
          }
          savedReviewComments={savedReviewComments}
        />
      </aside>

      <Dialog
        open={adjustmentResetDialogBlockId !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setAdjustmentResetDialogBlockId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anpassung zurückziehen?</DialogTitle>
            <DialogDescription>
              Möchten Sie die angeforderte Anpassung für diesen Block wirklich
              zurückziehen? Der zugehörige Kommentar wird aus der Kommentarliste
              entfernt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdjustmentResetDialogBlockId(null)}
            >
              Abbrechen
            </Button>
            <Button type="button" variant="destructive" onClick={confirmWithdrawAdjustment}>
              Zurückziehen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function shortApplicationRef(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean).pop();
    if (!path) return "Empfehlungsschreiben";
    return decodeURIComponent(path);
  } catch {
    return "Empfehlungsschreiben";
  }
}

function ReviewFileRow({
  title,
  subtitle,
  href,
  onNavigate,
}: {
  title: string;
  subtitle: string;
  href: string;
  onNavigate?: (e: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a
      href={href}
      target={href === "#" ? undefined : "_blank"}
      rel={href === "#" ? undefined : "noreferrer"}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm shadow-xs transition-colors hover:bg-muted/40"
      onClick={onNavigate}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <FileText className="size-5 text-muted-foreground" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </span>
      </span>
      <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </a>
  );
}

function ReviewBlockCard({
  title,
  children,
  footer,
  footerTone = "default",
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode | null;
  /** Nur die unterste Leiste: farbiger Balken wie Figma-Review-States. */
  footerTone?: "default" | "confirmed" | "adjustment";
}) {
  /** Gleiche vertikale Polsterung über alle States (`py-3`) — verhindert Höhensprung beim Wechsel der Fußzeile. */
  const footerClassName =
    footerTone === "default"
      ? "flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-6 py-3"
      : footerTone === "confirmed"
        ? "flex flex-wrap items-center justify-between gap-3 border-t border-teal-600 bg-teal-600 px-3 py-3 dark:bg-teal-600"
        : "flex flex-wrap items-center justify-between gap-3 border-t border-amber-400 bg-amber-400 px-3 py-3";

  const sectionClassName = cn(
    "overflow-hidden rounded-xl bg-card shadow-xs",
    footerTone === "default" && "border border-border",
    footerTone === "confirmed" &&
      "border-[1.5px] border-teal-600 dark:border-teal-500",
    footerTone === "adjustment" && "border-[1.5px] border-amber-400",
  );

  return (
    <section className={sectionClassName}>
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
      </div>
      <div className="space-y-4 px-6 py-5">{children}</div>
      {footer ? <div className={footerClassName}>{footer}</div> : null}
    </section>
  );
}

function ReviewBlockActions({
  onAdjust,
  onConfirm,
}: {
  onAdjust: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "h-9 gap-2 rounded-lg border-0 bg-amber-400 px-4 text-white shadow-xs",
          "hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500",
          "focus-visible:text-white focus-visible:ring-amber-400/45",
          "dark:bg-amber-400 dark:text-white dark:hover:text-white",
        )}
        onClick={onAdjust}
      >
        <MessageSquarePlus className="size-4" aria-hidden />
        Anpassung anfordern
      </Button>
      <Button
        type="button"
        className="h-9 gap-2 bg-teal-600 text-white hover:bg-teal-700"
        onClick={onConfirm}
      >
        <Check className="size-4" aria-hidden />
        Bestätigen
      </Button>
    </>
  );
}

/** Ghost-Button auf farbigem Footer; gleiche Höhe wie ReviewBlockActions (`h-9`). */
function ReviewBlockFooterResetButton({ onReset }: { onReset: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-9 shrink-0 gap-1.5 px-2.5 text-sm font-medium text-white",
        "hover:bg-destructive hover:text-destructive-foreground",
        "focus-visible:ring-white/80",
      )}
      onClick={onReset}
    >
      <RotateCcw className="size-4 shrink-0" aria-hidden />
      Zurücksetzen
    </Button>
  );
}

function ReviewBlockFooterStatus({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-white"
      role="status"
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

function InteractiveReviewBlock({
  title,
  phase,
  onConfirm,
  onRequestAdjustment,
  onReset,
  readOnly = false,
  children,
}: {
  title: string;
  phase: ReviewBlockPhase;
  onConfirm: () => void;
  onRequestAdjustment: () => void;
  onReset: () => void;
  readOnly?: boolean;
  children: ReactNode;
}) {
  if (phase.phase === "confirmed") {
    return (
      <ReviewBlockCard
        title={title}
        footerTone="confirmed"
        footer={
          readOnly ? (
            <div className="flex w-full justify-end">
              <ReviewBlockFooterStatus
                icon={CheckCheck}
                label="Reviewed & Bestätigt"
              />
            </div>
          ) : (
            <>
              <ReviewBlockFooterResetButton onReset={onReset} />
              <ReviewBlockFooterStatus
                icon={CheckCheck}
                label="Reviewed & Bestätigt"
              />
            </>
          )
        }
      >
        {children}
      </ReviewBlockCard>
    );
  }

  if (phase.phase === "adjustment") {
    return (
      <ReviewBlockCard
        title={title}
        footerTone="adjustment"
        footer={
          readOnly ? (
            <div className="flex w-full justify-end">
              <ReviewBlockFooterStatus
                icon={MessageSquareText}
                label="Anpassung angefordert"
              />
            </div>
          ) : (
            <>
              <ReviewBlockFooterResetButton onReset={onReset} />
              <ReviewBlockFooterStatus
                icon={MessageSquareText}
                label="Anpassung angefordert"
              />
            </>
          )
        }
      >
        <>
          {children}
          <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/35">
            <p className="text-xs font-medium text-muted-foreground">Bemerkung</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-foreground">{phase.remark}</p>
          </div>
        </>
      </ReviewBlockCard>
    );
  }

  return (
    <ReviewBlockCard
      title={title}
      footer={
        readOnly ? (
          <p className="text-xs text-muted-foreground">Nur Ansicht.</p>
        ) : (
          <ReviewBlockActions
            onAdjust={onRequestAdjustment}
            onConfirm={onConfirm}
          />
        )
      }
    >
      {children}
    </ReviewBlockCard>
  );
}

function DurationChoiceCompare({
  selected,
}: {
  selected?: "full_study" | "one_semester";
}) {
  const options: {
    id: "full_study" | "one_semester";
    title: string;
    hint: string;
  }[] = [
    {
      id: "full_study",
      title: "Gesamte Studiendauer",
      hint: "Der Ausgleich gilt für die gesamte Dauer des Studiums.",
    },
    {
      id: "one_semester",
      title: "Einmalig für ein Semester",
      hint: "Der Ausgleich gilt für ein Semester; eine Verlängerung ist separat zu beantragen.",
    },
  ];

  if (!selected) {
    return (
      <p className="text-sm text-muted-foreground">Keine Auswahl gespeichert.</p>
    );
  }

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const isSelected = selected === opt.id;
        return (
          <div
            key={opt.id}
            className={cn(
              "rounded-lg border px-4 py-3 transition-colors",
              isSelected
                ? "border-teal-300 bg-teal-50/90 shadow-xs"
                : "border-zinc-200 bg-zinc-50/80 opacity-80",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  isSelected
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-zinc-300 bg-white text-transparent",
                )}
                aria-hidden
              >
                <Check className="size-3 stroke-[3]" />
              </span>
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    isSelected ? "text-teal-950" : "text-muted-foreground",
                  )}
                >
                  {opt.title}
                  {isSelected ? (
                    <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-teal-700">
                      Gewählt
                    </span>
                  ) : (
                    <span className="ml-2 text-xs font-medium text-muted-foreground">
                      Nicht gewählt
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{opt.hint}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function ScopeChecklist({ selected }: { selected: string[] }) {
  const set = new Set(selected);
  return (
    <ul className="space-y-2">
      {APPLICATION_SCOPE_OPTIONS.map((option) => {
        const isOn = set.has(option);
        return (
          <li key={option}>
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                isOn
                  ? "border-teal-200 bg-teal-50/90 shadow-xs"
                  : "border-dashed border-zinc-200 bg-zinc-50/60",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                  isOn
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-zinc-300 bg-white text-zinc-300",
                )}
                aria-hidden
              >
                {isOn ? <Check className="size-3.5 stroke-[3]" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isOn ? "text-teal-950" : "text-muted-foreground line-through decoration-zinc-400/80",
                  )}
                >
                  {option}
                </span>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {isOn ? "Vom Studierenden gewählt" : "Nicht gewählt"}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MeasureChecklist({
  options,
  selectedKeys,
  otherEnabled,
  otherText,
}: {
  options: readonly { key: string; label: string }[];
  selectedKeys: string[];
  otherEnabled?: boolean;
  otherText?: string;
}) {
  const set = new Set(selectedKeys);
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {options.map((option) => {
          const isOn = set.has(option.key);
          return (
            <li key={option.key}>
              <div
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                  isOn
                    ? "border-teal-200 bg-teal-50/90 shadow-xs"
                    : "border-dashed border-zinc-200 bg-zinc-50/60",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                    isOn
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-zinc-300 bg-white text-zinc-300",
                  )}
                  aria-hidden
                >
                  {isOn ? <Check className="size-3.5 stroke-[3]" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isOn
                        ? "text-teal-950"
                        : "text-muted-foreground line-through decoration-zinc-400/80",
                    )}
                  >
                    {option.label}
                  </span>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {isOn ? "Vom Studierenden gewählt" : "Nicht gewählt"}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {otherEnabled ? (
        <div
          className={cn(
            "rounded-lg border px-3 py-3",
            otherText?.trim()
              ? "border-teal-200 bg-teal-50/90 shadow-xs"
              : "border-dashed border-zinc-200 bg-zinc-50/60",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sonstige Massnahme
          </p>
          <p
            className={cn(
              "mt-1 text-sm",
              otherText?.trim()
                ? "font-medium text-teal-950"
                : "text-muted-foreground line-through decoration-zinc-400/80",
            )}
          >
            {otherText?.trim() || "Keine Angabe"}
          </p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {otherText?.trim() ? "Vom Studierenden ergänzt" : "Nicht gewählt"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
