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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { formatReviewSubmittedAt } from "@/lib/application-review-labels";
import { type ApplicationStatusMeta } from "@/lib/application-status";

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
};

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
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[10px] font-semibold text-white">
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

      {showCommentsSection ? (
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
            {savedReviewComments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {emptyCommentsLabel}
              </p>
            ) : null}
            {savedReviewComments.map((c) => (
              <SavedReviewCommentCard
                key={c.id}
                reviewerName={assignedReviewerLabel}
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
        full && "min-h-0 flex-1",
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
          full && "min-h-0 flex-1",
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
  reviewerName,
  comment,
  onNavigate,
}: {
  reviewerName: string;
  comment: SavedReviewComment;
  onNavigate?: () => void;
}) {
  return (
    <article
      className={cn(
        "flex max-w-full flex-col gap-4 rounded-lg border border-border bg-muted/80 p-4",
        onNavigate &&
          "cursor-pointer transition-colors hover:border-border hover:bg-muted",
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
          <span className="flex shrink-0 rounded-full bg-background p-2.5">
            <MessageSquare className="size-6 text-foreground" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-5 text-foreground">{reviewerName}</p>
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
        <p className="text-xs font-medium leading-4 text-muted-foreground">
          Block: {comment.blockTitle}
        </p>
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
