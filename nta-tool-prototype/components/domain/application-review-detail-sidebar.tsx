"use client";

import { Check, EllipsisVertical, MessageSquare, MoreHorizontal, X } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ApplicationDetailsCard } from "@/components/domain/application-details-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationAssignee } from "@/lib/application-assignee";
import { type ApplicationStatusMeta } from "@/lib/application-status";
import {
  detailPanelContentInsetXClass,
  detailPanelScrollAreaClass,
} from "@/lib/design-tokens/application-scroll";
import {
  REVIEW_BEMERKUNGEN_ACCENT_BAR_CLASS,
  REVIEW_BEMERKUNGEN_ITEM_CLASS,
  REVIEW_BEMERKUNGEN_ITEM_R1_DONE_CLASS,
  REVIEW_BEMERKUNGEN_ITEM_R1_PENDING_CLASS,
  REVIEW_BEMERKUNGEN_PANEL_CLASS,
  REVIEW_BEMERKUNGEN_R1_AVATAR_CLASS,
  REVIEW_BEMERKUNGEN_R1_BLOCK_TITLE_CLASS,
  REVIEW_BEMERKUNGEN_R1_DONE_LABEL_CLASS,
} from "@/lib/design-tokens/review-bemerkungen";
import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import {
  REVIEW_WORKSPACE_BLOCK_IDS,
  type ReviewWorkspaceBlockId,
} from "@/lib/review-workspace-blocks";

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

const BEMERKUNG_ITEM_BODY_MAX_HEIGHT_PX = 250;

/** Figma `5866:2028` — Monat + Jahr in der Bemerkungsliste. */
function formatBemerkungDate(ts: number): string {
  return new Date(ts).toLocaleDateString("de-CH", {
    month: "long",
    year: "numeric",
  });
}

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
  assignee: ApplicationAssignee;
  /** Aktiver Entwurf zur Anpassung (Sidebar nach „Anpassung anfordern“). */
  adjustmentComposer: ReviewAdjustmentComposerProps | null;
  /** Gespeicherte Block-Kommentare (Chronik unter dem Entwurf). */
  savedReviewComments: SavedReviewComment[];
  /** Z. B. R1 Korrekturflow: Sprung zum passenden Antragsschritt / Anker. */
  onSavedCommentNavigate?: (blockId: string) => void;
  /** Optionaler Empty-State für reine Detailansichten ohne Review-Kommentarflow. */
  emptyCommentsLabel?: string;
  /**
   * Wenn false: kein Bereich «Bemerkungen» unter den Antragdetails
   * (z. B. R1-Portal solange nicht «Anpassung erforderlich», R2 «Beratung & Empfehlung»).
   */
  showCommentsSection?: boolean;
  /** R4: Kontakt-Cards statt Kommentarbereich. */
  secondarySection?: "comments" | "r4_contacts";
  /** R1 «Anpassung erforderlich» — Figma `5858:22820`; sonst R2 `5866:2021`. */
  bemerkungenVariant?: "r1" | "r2";
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
  assignee,
  adjustmentComposer,
  savedReviewComments,
  onSavedCommentNavigate,
  emptyCommentsLabel = "Klicken Sie bei einem Block auf «Anpassung anfordern», um hier eine Bemerkung zu verfassen.",
  showCommentsSection = true,
  secondarySection = "comments",
  bemerkungenVariant = "r2",
}: ApplicationReviewDetailSidebarProps) {
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
        <header className="flex shrink-0 items-center gap-2 border-b border-border py-5">
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-6 pt-6">
          <ReviewAdjustmentDraftCard
            reviewerName={assignee.displayName}
            composer={adjustmentComposer}
            layout="fullColumn"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-col gap-6 overflow-hidden",
        detailPanelContentInsetXClass,
      )}
    >
      <ApplicationDetailsCard
        application={application}
        statusMeta={statusMeta}
        assignee={assignee}
        className="w-full shrink-0"
      />

      {showCommentsSection && secondarySection === "comments" ? (
        <ReviewBemerkungenPanel
          comments={orderedSavedReviewComments}
          emptyLabel={emptyCommentsLabel}
          onNavigate={onSavedCommentNavigate}
          variant={bemerkungenVariant}
        />
      ) : null}
      {secondarySection === "r4_contacts" ? (
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
        "flex flex-col gap-4 rounded-lg border-[1.5px] border-amber-400 bg-muted/80 p-4",
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
            "field-sizing-fixed resize-y overflow-y-auto rounded-lg border border-border bg-background text-sm",
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


function initialsFromAuthor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "NF";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
  }
  const compact = trimmed.replace(/\s+/g, "");
  if (compact.length >= 2) return compact.slice(0, 2).toUpperCase();
  return `${compact[0] ?? "?"}${compact[0] ?? "?"}`.toUpperCase();
}

function bemerkungItemInteractionProps(onNavigate?: () => void) {
  return {
    onClick: onNavigate,
    onKeyDown: onNavigate
      ? (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onNavigate();
          }
        }
      : undefined,
    role: onNavigate ? ("button" as const) : undefined,
    tabIndex: onNavigate ? 0 : undefined,
  };
}

/** Figma `5866:2021` / `5858:22820` — Bemerkungen-Container unter Antragdetails. */
function ReviewBemerkungenPanel({
  comments,
  emptyLabel,
  onNavigate,
  variant = "r2",
}: {
  comments: SavedReviewComment[];
  emptyLabel: string;
  onNavigate?: (blockId: string) => void;
  variant?: "r1" | "r2";
}) {
  const panelTitle =
    variant === "r1" ? "Bemerkungen der Fachstelle" : "Bemerkungen";

  return (
    <section
      className={REVIEW_BEMERKUNGEN_PANEL_CLASS}
      aria-labelledby="review-bemerkungen-heading"
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3
          id="review-bemerkungen-heading"
          className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}
        >
          {panelTitle}
        </h3>
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-150 text-foreground-alt transition-colors hover:bg-stone-200/80"
          aria-label="Weitere Optionen"
        >
          <EllipsisVertical className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <div className={cn(detailPanelScrollAreaClass, "min-h-0 flex-1")}>
        {comments.length === 0 ? (
          <p className={cn(hfTypography.paragraphSmall, "text-muted-foreground")}>
            {emptyLabel}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {comments.map((comment) =>
              variant === "r1" ? (
                <ReviewBemerkungItemR1
                  key={comment.id}
                  comment={comment}
                  onNavigate={
                    onNavigate ? () => onNavigate(comment.blockId) : undefined
                  }
                />
              ) : (
                <ReviewBemerkungItemR2
                  key={comment.id}
                  comment={comment}
                  onNavigate={
                    onNavigate ? () => onNavigate(comment.blockId) : undefined
                  }
                />
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Figma `5858:22824` / `5858:22852` — R1-Bemerkung (ausstehend / angepasst). */
function ReviewBemerkungItemR1({
  comment,
  onNavigate,
}: {
  comment: SavedReviewComment;
  onNavigate?: () => void;
}) {
  const isDone = comment.adjustmentResolutionStatus === "done";
  const authorName = comment.authorDisplayName?.trim() || "NTA Fachstelle";

  return (
    <article
      className={cn(
        isDone
          ? REVIEW_BEMERKUNGEN_ITEM_R1_DONE_CLASS
          : REVIEW_BEMERKUNGEN_ITEM_R1_PENDING_CLASS,
        onNavigate && "cursor-pointer transition-colors hover:opacity-95",
      )}
      {...bemerkungItemInteractionProps(onNavigate)}
    >
      <div className="flex items-center gap-3">
        <span className={REVIEW_BEMERKUNGEN_R1_AVATAR_CLASS} aria-hidden>
          {initialsFromAuthor(authorName)}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
            {authorName}
          </p>
          <time
            className={cn(hfTypography.paragraphMini, "text-stone-500")}
            dateTime={new Date(comment.createdAt).toISOString()}
          >
            {formatCommentTimestamp(comment.createdAt)}
          </time>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className={REVIEW_BEMERKUNGEN_R1_BLOCK_TITLE_CLASS}>{comment.blockTitle}</p>
        <div className="flex items-center gap-4">
          <div className={REVIEW_BEMERKUNGEN_ACCENT_BAR_CLASS} aria-hidden />
          <p
            className={cn(
              hfTypography.paragraphSmall,
              "min-w-0 flex-1 overflow-hidden whitespace-pre-line text-foreground",
            )}
            style={{
              maxHeight: `${BEMERKUNG_ITEM_BODY_MAX_HEIGHT_PX}px`,
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 10,
            }}
          >
            {comment.body}
          </p>
        </div>
      </div>

      {isDone ? (
        <div className="flex items-end justify-start">
          <span className={REVIEW_BEMERKUNGEN_R1_DONE_LABEL_CLASS}>
            <Check className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            Angepasst
          </span>
        </div>
      ) : null}
    </article>
  );
}

/** Figma `5866:2025` — R2-Bemerkung in der Sidebar. */
function ReviewBemerkungItemR2({
  comment,
  onNavigate,
}: {
  comment: SavedReviewComment;
  onNavigate?: () => void;
}) {
  return (
    <article
      className={cn(
        REVIEW_BEMERKUNGEN_ITEM_CLASS,
        onNavigate && "cursor-pointer transition-colors hover:bg-stone-100",
      )}
      {...bemerkungItemInteractionProps(onNavigate)}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <p className={cn(hfTypography.paragraphMedium, "min-w-0 text-foreground")}>
          {comment.blockTitle}
        </p>
        <time
          className={cn(hfTypography.paragraphMini, "shrink-0 text-stone-500")}
          dateTime={new Date(comment.createdAt).toISOString()}
        >
          {formatBemerkungDate(comment.createdAt)}
        </time>
      </div>

      <div className="flex w-full items-start gap-4">
        <div className={REVIEW_BEMERKUNGEN_ACCENT_BAR_CLASS} aria-hidden />
        <p
          className={cn(
            hfTypography.paragraphSmall,
            "min-w-0 flex-1 overflow-hidden whitespace-pre-line text-foreground",
          )}
          style={{
            maxHeight: `${BEMERKUNG_ITEM_BODY_MAX_HEIGHT_PX}px`,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 10,
          }}
        >
          {comment.body}
        </p>
      </div>
    </article>
  );
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
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-background px-6 pb-4 pt-4"
      aria-labelledby="r4-contacts-heading"
    >
      <h3 id="r4-contacts-heading" className="mb-4 text-lg font-medium leading-[27px] text-foreground">
        Kontakte
      </h3>
      <div className="space-y-4">
        <Card className="rounded-lg border border-border shadow-none ring-0">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Antragstellende Person</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium text-foreground">{applicantName}</p>
            <p className="text-muted-foreground">{applicantEmail}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border shadow-none ring-0">
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

