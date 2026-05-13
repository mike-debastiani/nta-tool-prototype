"use client";

import {
  Calendar,
  Check,
  Copy,
  Hash,
  MessageSquare,
  MoreHorizontal,
  User,
  UserCircle,
  X,
} from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { formatReviewSubmittedAt } from "@/lib/application-review-labels";
import { type ApplicationStatusMeta } from "@/lib/application-status";
import {
  REVIEW_WORKSPACE_BLOCK_IDS,
  type ReviewWorkspaceBlockId,
} from "@/lib/review-workspace-blocks";

type DetailRow = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
};

export type SavedReviewComment = {
  id: string;
  /** Gleicher Schlüssel wie im Review-Workspace (Anpassung zurücksetzen / Liste filtern). */
  blockId: string;
  blockTitle: string;
  body: string;
  createdAt: number;
  /** Verfasser des Kommentars (persistiert; nicht der aktuell eingeloggte Viewer). */
  authorDisplayName?: string;
  /**
   * Nur R1 «Anpassung erforderlich»: ob der Block noch offen ist oder bereits gespeichert wurde
   * (`data.r1AdjustmentResolutions`). Unset z. B. in der R2-Review-Ansicht.
   */
  adjustmentResolutionStatus?: "todo" | "done";
};

const REVIEW_COMMENT_AUTHOR_FALLBACK = "NTA Fachstelle";

export type ReviewAdjustmentComposerProps = {
  blockTitle: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saveError: boolean;
};

type ApplicationReviewDetailSidebarProps = {
  application: WorkspaceApplication;
  statusMeta: ApplicationStatusMeta;
  /** Shown for „Zugewiesen an“ — typically the logged-in R2 reviewer in the prototype. */
  assignedReviewerLabel: string;
  /** Aktiver Entwurf zur Anpassung (Sidebar nach „Anpassung anfordern“). */
  adjustmentComposer: ReviewAdjustmentComposerProps | null;
  /** Gespeicherte Block-Kommentare (Chronik unter dem Entwurf). */
  savedReviewComments: SavedReviewComment[];
  /** Z. B. R1 Korrekturflow: Sprung zum passenden Antragsschritt / Anker. */
  onSavedCommentNavigate?: (blockId: string) => void;
  /** Optionaler Empty-State für reine Detailansichten ohne Review-Kommentarflow. */
  emptyCommentsLabel?: string;
  /**
   * Wenn false: kein Bereich «Kommentare» und kein Trennstrich unter den Antragdetails
   * (z. B. R1-Portal solange nicht «Anpassung erforderlich», R2 «Beratung & Empfehlung»).
   */
  showCommentsSection?: boolean;
  /** R4: Kontakt-Cards statt Kommentarbereich. */
  secondarySection?: "comments" | "r4_contacts";
};

function formatCommentTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate()
    && d.getMonth() === now.getMonth()
    && d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return `Heute, ${d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString("de-CH", {
    day: "numeric",
    month: "long",
  });
}

export function ApplicationReviewDetailSidebar({
  application,
  statusMeta,
  assignedReviewerLabel,
  adjustmentComposer,
  savedReviewComments,
  onSavedCommentNavigate,
  emptyCommentsLabel = "Klicken Sie bei einem Block auf «Anpassung anfordern», um hier eine Bemerkung zu verfassen.",
  showCommentsSection = true,
  secondarySection = "comments",
}: ApplicationReviewDetailSidebarProps) {
  const submitted = formatReviewSubmittedAt(application.data);
  const updated = new Date(application.updated_at).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const primaryRows = useMemo<DetailRow[]>(
    () => [
      {
        icon: User,
        label: "Antragsteller",
        value: <ApplicantNameWithId application={application} />,
      },
      {
        icon: Calendar,
        label: "Eingereicht am",
        value: (
          <span className="text-foreground">{submitted ?? "—"}</span>
        ),
      },
      {
        icon: UserCircle,
        label: "Zuletzt aktualisiert",
        value: <span className="text-foreground">{updated}</span>,
      },
      {
        icon: User,
        label: "Zugewiesen an",
        value: (
          <span className="inline-flex items-center gap-2 text-foreground">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[10px] leading-none font-semibold text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100">
              {initialsFromName(assignedReviewerLabel)}
            </span>
            <span className="truncate">{assignedReviewerLabel}</span>
          </span>
        ),
      },
      {
        icon: Hash,
        label: "Antrags-ID",
        value: (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
            {application.id}
          </code>
        ),
      },
    ],
    [application, assignedReviewerLabel, submitted, updated],
  );

  const orderedSavedReviewComments = useMemo(() => {
    const orderIndex = new Map<ReviewWorkspaceBlockId, number>(
      REVIEW_WORKSPACE_BLOCK_IDS.map((id, idx) => [id, idx]),
    );

    return [...savedReviewComments].sort((a, b) => {
      const aIdx = orderIndex.get(a.blockId as ReviewWorkspaceBlockId);
      const bIdx = orderIndex.get(b.blockId as ReviewWorkspaceBlockId);

      // Comments zu unbekannten Block-IDs ans Ende schieben.
      const ai = aIdx ?? Number.MAX_SAFE_INTEGER;
      const bi = bIdx ?? Number.MAX_SAFE_INTEGER;

      if (ai !== bi) return ai - bi;

      // Gleicher Block: stabile Sortierung nach Erstellzeit.
      return a.createdAt - b.createdAt;
    });
  }, [savedReviewComments]);

  if (adjustmentComposer) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fafafa]">
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-6 py-5">
          <button
            type="button"
            onClick={() => adjustmentComposer.onCancel()}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
            aria-label="Kommentarentwurf schliessen"
          >
            <X className="size-6" aria-hidden />
          </button>
          <h2 className="text-lg font-medium leading-[27px] text-foreground">Kommentare</h2>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-6">
          <ReviewAdjustmentDraftCard
            reviewerName={assignedReviewerLabel}
            composer={adjustmentComposer}
            layout="fullColumn"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fafafa]">
      <div
        className={cn(
          "shrink-0 space-y-4 px-5 py-5",
          showCommentsSection && "border-b border-border",
        )}
      >
        <h2 className="text-sm font-semibold text-foreground">Antragdetails</h2>
        <div className="space-y-0">
          {/* Status row — Notion-style pill */}
          <div className="flex min-h-9 items-start gap-2 py-1.5">
            <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
              <span className="size-2 rounded-full bg-current opacity-60" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
              <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
                Status
              </span>
              <span
                className={cn(
                  "inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-xs font-semibold",
                  statusMeta.className,
                )}
              >
                {statusMeta.label}
              </span>
            </div>
          </div>
          {primaryRows.map((row) => (
            <DetailPropertyRow key={row.label} {...row} />
          ))}
        </div>
      </div>

      {showCommentsSection && secondarySection === "comments" ? (
        <section
          className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-6"
          aria-labelledby="review-comments-heading"
        >
          <div className="mb-5 flex shrink-0 items-center gap-2">
            <h3 id="review-comments-heading" className="text-lg font-medium leading-[27px] text-foreground">
              Kommentare
            </h3>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
            {orderedSavedReviewComments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {emptyCommentsLabel}
              </p>
            ) : null}
            {orderedSavedReviewComments.map((c) => (
              <SavedReviewCommentCard
                key={c.id}
                comment={c}
                onNavigate={
                  onSavedCommentNavigate
                    ? () => onSavedCommentNavigate(c.blockId)
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      ) : null}
      {showCommentsSection && secondarySection === "r4_contacts" ? (
        <R4ContactsSection application={application} />
      ) : null}
    </div>
  );
}

function ReviewAdjustmentDraftCard({
  reviewerName,
  composer,
  layout = "embedded",
}: {
  reviewerName: string;
  composer: ReviewAdjustmentComposerProps;
  /** `fullColumn`: nutzt die volle Höhe der Sidebar-Spalte (Kommentarentwurf). */
  layout?: "embedded" | "fullColumn";
}) {
  const [nowLabel] = useState(() => formatCommentTimestamp(Date.now()));
  const full = layout === "fullColumn";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const minPx = 120;
    const maxPx =
      typeof window !== "undefined"
        ? Math.min(Math.round(window.innerHeight * 0.48), 480)
        : 480;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minPx), maxPx)}px`;
  }, []);

  useLayoutEffect(() => {
    syncTextareaHeight();
  }, [composer.draft, syncTextareaHeight]);

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-lg border-[1.5px] border-amber-400 bg-muted/80 p-4 shadow-xs",
        // In `fullColumn` mode the card should not stretch to fill the column
        // height. We want "height on hug" based on the textarea content,
        // while keeping the textarea's min-height intact.
        full && "min-h-0",
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="flex shrink-0 rounded-full bg-background p-2.5">
            <MessageSquare className="size-6 text-foreground" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-5 text-foreground">{reviewerName}</p>
            <p className="text-xs font-medium leading-4 text-muted-foreground">{nowLabel}</p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background/80 hover:text-foreground"
          aria-label="Weitere Optionen"
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </button>
      </div>
      <div
        className={cn(
          "flex min-h-0 flex-col gap-1",
          full && "min-h-0",
        )}
      >
        <p className="shrink-0 text-xs font-medium leading-4 text-muted-foreground">
          Block: {composer.blockTitle}
        </p>
        <Textarea
          ref={textareaRef}
          value={composer.draft}
          onChange={(e) => {
            composer.onDraftChange(e.target.value);
            queueMicrotask(() => {
              syncTextareaHeight();
            });
          }}
          placeholder="Erläutern Sie der antragstellenden Person, was konkret angepasst werden muss"
          rows={1}
          aria-invalid={composer.saveError}
          className={cn(
            "field-sizing-fixed resize-y overflow-y-auto rounded-lg border-border bg-background text-sm shadow-xs",
            "min-h-[120px] max-h-[min(48dvh,480px)] w-full",
            composer.saveError && "border-destructive",
          )}
        />
        {composer.saveError ? (
          <p className="shrink-0 text-xs text-destructive" role="alert">
            Bitte geben Sie eine Bemerkung ein, bevor Sie speichern.
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 pt-0.5">
        <Button
          type="button"
          variant="ghost"
          className="h-9 px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={composer.onCancel}
        >
          Abbrechen
        </Button>
        <Button
          type="button"
          className="h-9 bg-amber-400 px-4 text-sm font-medium text-white hover:bg-amber-500"
          onClick={composer.onSave}
        >
          Speichern
        </Button>
      </div>
    </article>
  );
}

function SavedReviewCommentCard({
  comment,
  onNavigate,
}: {
  comment: SavedReviewComment;
  onNavigate?: () => void;
}) {
  const trimmedAuthor = comment.authorDisplayName?.trim();
  const authorName = trimmedAuthor || REVIEW_COMMENT_AUTHOR_FALLBACK;
  /** Ohne persistierten Namen (Legacy): fest „NF“ für Fachstelle, nicht aus dem Langtext abgeleitet. */
  const authorInitials = trimmedAuthor ? initialsFromName(trimmedAuthor) : "NF";
  const adjStatus = comment.adjustmentResolutionStatus;

  return (
    <article
      className={cn(
        "flex max-w-full flex-col gap-4 rounded-lg border bg-muted/80 p-4",
        adjStatus === "todo" && "border-[1.5px] border-amber-400",
        adjStatus === "done" &&
          "border-[1.5px] border-solid [border-color:rgb(13_148_136/0.6)] dark:[border-color:rgb(20_184_166/0.6)]",
        !adjStatus && "border border-border",
        onNavigate && "cursor-pointer transition-colors hover:bg-muted",
        onNavigate && adjStatus === "todo" && "hover:border-amber-500",
        onNavigate &&
          adjStatus === "done" &&
          "hover:[border-color:rgb(13_148_136/0.8)] dark:hover:[border-color:rgb(20_184_166/0.8)]",
        onNavigate && !adjStatus && "hover:border-border",
      )}
      onClick={onNavigate}
      onKeyDown={
        onNavigate
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigate();
              }
            }
          : undefined
      }
      role={onNavigate ? "button" : undefined}
      tabIndex={onNavigate ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm leading-none font-semibold text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100"
            aria-hidden
          >
            {authorInitials}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-5 text-foreground">{authorName}</p>
            <p className="text-xs font-medium leading-4 text-muted-foreground">
              {formatCommentTimestamp(comment.createdAt)}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background/80 hover:text-foreground"
          aria-label="Weitere Optionen"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </button>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium leading-4 text-muted-foreground">
            Block: {comment.blockTitle}
          </p>
          {adjStatus === "todo" ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold leading-none text-amber-950 dark:bg-amber-950/40 dark:text-amber-50">
              To do
            </span>
          ) : null}
          {adjStatus === "done" ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-semibold leading-none text-white shadow-sm ring-1 ring-teal-700/20 dark:bg-teal-600 dark:text-white">
              Done
            </span>
          ) : null}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-5 text-foreground">{comment.body}</p>
      </div>
    </article>
  );
}

function DetailPropertyRow({
  icon: Icon,
  label,
  value,
}: DetailRow) {
  return (
    <div className="flex min-h-9 items-start gap-2 py-1.5">
      <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">{label}</span>
        <div className="min-w-0 flex-1 text-right text-sm sm:text-right">{value}</div>
      </div>
    </div>
  );
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/** Aligns with Antragsteller block: Formularname zuerst, dann Profil, dann Fallback. */
function resolveApplicantDisplayName(application: WorkspaceApplication): string {
  const pd = application.data.personalData;
  const fromForm = pd
    ? `${pd.vorname ?? ""} ${pd.name ?? ""}`.trim()
    : "";
  if (fromForm) return fromForm;
  const u = application.users[0];
  if (u?.display_name?.trim()) return u.display_name.trim();
  if (u?.email?.trim()) return u.email.trim();
  return "Antragsteller";
}

function R4ContactsSection({ application }: { application: WorkspaceApplication }) {
  const pd = application.data.personalData;
  const applicantName = resolveApplicantDisplayName(application);
  const applicantEmail = pd?.email?.trim() || application.users[0]?.email || "—";
  const fachstelleName =
    application.data.consultation?.advisor?.trim()
    || application.data.recommendation?.releasedBy?.trim()
    || "NTA Fachstelle";

  return (
    <section
      className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-6"
      aria-labelledby="r4-contacts-heading"
    >
      <h3 id="r4-contacts-heading" className="mb-4 text-lg font-medium leading-[27px] text-foreground">
        Kontakte
      </h3>
      <div className="space-y-4">
        <Card className="shadow-xs">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Antragstellende Person</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium text-foreground">{applicantName}</p>
            <p className="text-muted-foreground">{applicantEmail}</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Kontaktperson Fachstelle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium text-foreground">{fachstelleName}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Bei inhaltlichen Rückfragen während der Bewilligung können Sie diese Person konsultieren.
            </p>
            <p className="text-muted-foreground">fachstelle@hochschule.example</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function ApplicantNameWithId({ application }: { application: WorkspaceApplication }) {
  const id = application.applicant_id;
  const name = resolveApplicantDisplayName(application);
  const [copied, setCopied] = useState(false);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <span className="inline-flex max-w-full min-w-0 items-center justify-end gap-1">
      <span
        className="min-w-0 truncate text-right font-medium text-foreground"
        title={id}
      >
        {name}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void copyId();
        }}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={`Antragsteller-ID (Hover auf den Namen)\n${id}\n\nKlick: ID kopieren`}
        aria-label="Antragsteller-ID kopieren"
      >
        {copied ? (
          <Check className="size-3.5 text-teal-600" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
      </button>
    </span>
  );
}
