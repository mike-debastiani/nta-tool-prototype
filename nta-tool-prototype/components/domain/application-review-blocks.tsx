"use client";

import { type ComponentType, type ReactNode, useCallback, useLayoutEffect, useRef } from "react";
import {
  Check,
  CheckCheck,
  CircleCheckBig,
  ExternalLink,
  FileCheck,
  FileClock,
  FilePenLine,
  FileText,
  MessageSquare,
  Pencil,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hfBlockTitle, hfTypography } from "@/lib/design-tokens/typography";
import {
  REVIEW_BLOCK_ADJUSTMENT_ACTIVE_CLASS,
  REVIEW_BLOCK_ADJUSTMENT_FOOTER_CLASS,
  REVIEW_BLOCK_ADJUSTMENT_SENT_CLASS,
  REVIEW_BLOCK_BODY_CLASS,
  REVIEW_BLOCK_COMPOSER_CLASS,
  REVIEW_BLOCK_COMPOSER_FOOTER_CLASS,
  REVIEW_BLOCK_COMPOSER_INPUT_CLASS,
  REVIEW_BLOCK_CONFIRMED_CLASS,
  REVIEW_BLOCK_CONFIRMED_FOOTER_CLASS,
  REVIEW_BLOCK_DEFAULT_CLASS,
  REVIEW_BLOCK_FIELD_GRID_CLASS,
  REVIEW_BLOCK_PENDING_ADJUST_CLASS,
  REVIEW_BLOCK_PENDING_CLASS,
  REVIEW_BLOCK_PENDING_CONFIRM_CLASS,
  REVIEW_BLOCK_PENDING_FOOTER_CLASS,
  REVIEW_BLOCK_REMARK_LABEL_CLASS,
  REVIEW_BLOCK_REMARK_TEXT_CLASS,
  REVIEW_BLOCK_LOCKED_REMARK_BAND_CLASS,
  REVIEW_BLOCK_LOCKED_REMARK_BODY_CLASS,
  REVIEW_BLOCK_LOCKED_REMARK_TITLE_CLASS,
  REVIEW_BLOCK_HISTORY_TOGGLE_SHELL_CLASS,
  REVIEW_BLOCK_HISTORY_TOGGLE_TAB_BASE_CLASS,
  REVIEW_BLOCK_HISTORY_TOGGLE_TAB_ICON_CLASS,
  REVIEW_BLOCK_HISTORY_TOGGLE_TAB_CURRENT_ACTIVE_CLASS,
  REVIEW_BLOCK_HISTORY_TOGGLE_TAB_CURRENT_INACTIVE_CLASS,
  REVIEW_BLOCK_HISTORY_TOGGLE_TAB_HISTORY_ACTIVE_CLASS,
  REVIEW_BLOCK_HISTORY_TOGGLE_TAB_HISTORY_INACTIVE_CLASS,
  REVIEW_BLOCK_REQUESTED_ADJUSTMENT_BAND_CLASS,
  REVIEW_BLOCK_REQUESTED_ADJUSTMENT_BODY_CLASS,
  REVIEW_BLOCK_REQUESTED_ADJUSTMENT_META_CLASS,
  REVIEW_BLOCK_REQUESTED_ADJUSTMENT_TITLE_CLASS,
  REVIEW_BLOCK_RE_REVIEW_ADJUSTED_MARKER_CLASS,
  REVIEW_BLOCK_RE_REVIEW_FREETEXT_CURRENT_CLASS,
  REVIEW_BLOCK_RE_REVIEW_FREETEXT_HISTORY_CLASS,
  REVIEW_BLOCK_RE_REVIEW_PREVIOUS_MARKER_CLASS,
  REVIEW_BLOCK_RE_REVIEW_HISTORY_OPTION_SELECTED_SHELL_CLASS,
  REVIEW_BLOCK_RE_REVIEW_HISTORY_OPTION_SELECTED_TEXT_CLASS,
} from "@/lib/design-tokens/review-block";
import {
  R1_REVIEW_BLOCK_ACTION_FOOTER_CLASS,
  R1_REVIEW_BLOCK_REMARK_SECTION_CLASS,
  R1_RICH_OPTION_EDITABLE_CLASS,
  R1_RICH_OPTION_GROUP_CLASS,
  R1_RICH_OPTION_SELECTED_LOCKED_CLASS,
  R1_RICH_OPTION_STATUS_SELECTED_CLASS,
  R1_RICH_OPTION_STATUS_UNSELECTED_CLASS,
  R1_RICH_OPTION_UNSELECTED_LOCKED_CLASS,
} from "@/lib/design-tokens/r1-review-block";
import {
  type ApplicationMeasureOption,
  APPLICATION_SCOPE_OPTIONS,
  ASSESSMENT_MEASURE_OPTIONS,
  LECTURE_MEASURE_OPTIONS,
} from "@/lib/application-review-labels";

export function formatReviewFileSize(sizeInBytes: number) {
  if (!sizeInBytes || Number.isNaN(sizeInBytes)) return "—";
  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Dateien bis zu dieser Grösse werden als `data:`-URL in `applications.data`
 * gehalten, damit R1/R2 sie nach Reload in einem neuen Tab öffnen können.
 * `blob:`-URLs überleben keine Persistenz — werden vor dem DB-Write entfernt.
 * Im localStorage-Entwurf werden Attest-URLs weggelassen (Quota); nach dem
 * Laden werden Server-URLs mit dem Entwurf zusammengeführt.
 */
export const ATTEST_INLINE_PREVIEW_MAX_BYTES = 4 * 1024 * 1024;

function readBrowserFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}

/** Ein Attest-Eintrag inkl. Vorschau-URL für Upload aus dem Browser. */
export async function createAttestFileEntryFromBrowserFile(file: File): Promise<{
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}> {
  const id = `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;
  if (file.size <= ATTEST_INLINE_PREVIEW_MAX_BYTES) {
    try {
      const url = await readBrowserFileAsDataUrl(file);
      return {
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        url,
      };
    } catch {
      /* fall through to blob */
    }
  }
  return {
    id,
    name: file.name,
    size: file.size,
    type: file.type,
    url: URL.createObjectURL(file),
  };
}

/** Revokes blob: object URLs created for attest previews (call before dropping file refs). */
export function revokeAttestFileUrls(files: readonly { url?: string | undefined }[]) {
  for (const f of files) {
    if (f.url?.startsWith("blob:")) {
      URL.revokeObjectURL(f.url);
    }
  }
}

/** `blob:`-URLs in Postgres/JSON sind nach Reload ungültig — vor dem Speichern entfernen. */
export function sanitizeAttestFilesForDatabase<T extends { url?: string }>(files: readonly T[]): T[] {
  return files.map((f) => {
    if (f.url?.startsWith("blob:")) {
      const { url: _omit, ...rest } = f;
      return rest as T;
    }
    return f;
  });
}

type AttestMergeEntry = {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
};

function attestMergeKey(f: { id?: string; name?: string; size?: number }): string {
  if (f.id && String(f.id).trim().length > 0) return `id:${f.id}`;
  return `meta:${f.name ?? ""}|${String(f.size ?? 0)}`;
}

function attestOpenScore(f: { url?: string }): number {
  const h = f.url;
  if (!h) return 0;
  if (
    h.startsWith("data:")
    || h.startsWith("http://")
    || h.startsWith("https://")
  ) {
    return 3;
  }
  if (h.startsWith("blob:")) return 1;
  return 0;
}

function normalizeAttestMergeEntry(f: {
  id?: string;
  name?: string;
  size?: number;
  type?: string;
  url?: string;
}): AttestMergeEntry {
  return {
    id: f.id && String(f.id).trim().length > 0 ? f.id : crypto.randomUUID(),
    name: f.name ?? "Datei",
    size: f.size ?? 0,
    type: f.type ?? "",
    ...(typeof f.url === "string" && f.url.length > 0 ? { url: f.url } : {}),
  };
}

/**
 * Beim Client-Start: Server-Atteste (mit `data:` aus der DB) nicht durch einen
 * alten localStorage-Entwurf ohne URLs überschreiben.
 */
export function mergeAttestFilesForHydration(
  server: readonly { id?: string; name?: string; size?: number; type?: string; url?: string }[],
  draft: readonly { id?: string; name?: string; size?: number; type?: string; url?: string }[],
): AttestMergeEntry[] {
  const pickBetter = (a: AttestMergeEntry, b: AttestMergeEntry): AttestMergeEntry => {
    const sa = attestOpenScore(a);
    const sb = attestOpenScore(b);
    if (sb > sa) return b;
    if (sa > sb) return a;
    if (sa === 0 && sb === 0) return { ...a, ...b, id: b.id || a.id };
    return b;
  };

  const map = new Map<string, AttestMergeEntry>();
  for (const raw of server) {
    const e = normalizeAttestMergeEntry(raw);
    map.set(attestMergeKey(e), e);
  }
  for (const raw of draft) {
    const e = normalizeAttestMergeEntry(raw);
    const k = attestMergeKey(e);
    const existing = map.get(k);
    map.set(k, existing ? pickBetter(existing, e) : e);
  }
  return [...map.values()];
}

export function shortApplicationRef(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Anzeige als UI-«Antrags ID» (z. B. `NTA-2026-A1B2`). */
export function workspaceApplicationListNumber(application: {
  id: string;
  created_at: string;
}) {
  const year = new Date(application.created_at).getFullYear();
  return `NTA-${year}-${shortApplicationRef(application.id).slice(-4)}`;
}

/**
 * Visueller Tonus eines Review-Block-Footers / -Rahmens.
 * - `default`: neutraler Card-Look (für noch ausstehende Aktionen).
 * - `confirmed`: teal — R2 hat bestätigt bzw. R1 zeigt einen vom Kommentar
 *   nicht betroffenen Block.
 * - `adjustment`: amber — R2 hat eine Anpassung angefordert.
 * - `adjustment_done`: gleiche Teal-Farbe wie `confirmed`, Rahmen und unterer Balken mit
 *   60 % Deckkraft (R1-Anpassung gespeichert vs. volle Fachstellen-Bestätigung).
 */
/** @deprecated Nur noch für Portal-Adjustment (R1 Done-State); Review nutzt `ReviewBlockVariant`. */
export type ReviewBlockFooterTone =
  | "default"
  | "confirmed"
  | "adjustment"
  | "adjustment_done";

export type ReviewBlockVariant =
  | "default"
  | "pending"
  | "composer"
  | "confirmed"
  | "adjustment_active"
  | "adjustment_sent";

const REVIEW_BLOCK_SHELL_CLASS: Record<ReviewBlockVariant, string> = {
  default: REVIEW_BLOCK_DEFAULT_CLASS,
  pending: REVIEW_BLOCK_PENDING_CLASS,
  composer: REVIEW_BLOCK_COMPOSER_CLASS,
  confirmed: REVIEW_BLOCK_CONFIRMED_CLASS,
  adjustment_active: REVIEW_BLOCK_ADJUSTMENT_ACTIVE_CLASS,
  adjustment_sent: REVIEW_BLOCK_ADJUSTMENT_SENT_CLASS,
};

export type ReviewBlockAdjustmentHistoryView = "current" | "history";

export function ReviewBlockAdjustmentHistoryToggle({
  view,
  onViewChange,
}: {
  view: ReviewBlockAdjustmentHistoryView;
  onViewChange: (view: ReviewBlockAdjustmentHistoryView) => void;
}) {
  return (
    <div
      className={REVIEW_BLOCK_HISTORY_TOGGLE_SHELL_CLASS}
      role="group"
      aria-label="Anpassungsansicht umschalten"
    >
      <button
        type="button"
        className={cn(
          REVIEW_BLOCK_HISTORY_TOGGLE_TAB_BASE_CLASS,
          view === "current"
            ? REVIEW_BLOCK_HISTORY_TOGGLE_TAB_CURRENT_ACTIVE_CLASS
            : REVIEW_BLOCK_HISTORY_TOGGLE_TAB_CURRENT_INACTIVE_CLASS,
        )}
        aria-pressed={view === "current"}
        aria-label="Aktuelle Version anzeigen"
        onClick={() => onViewChange("current")}
      >
        <FileCheck
          className={REVIEW_BLOCK_HISTORY_TOGGLE_TAB_ICON_CLASS}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
      <button
        type="button"
        className={cn(
          REVIEW_BLOCK_HISTORY_TOGGLE_TAB_BASE_CLASS,
          view === "history"
            ? REVIEW_BLOCK_HISTORY_TOGGLE_TAB_HISTORY_ACTIVE_CLASS
            : REVIEW_BLOCK_HISTORY_TOGGLE_TAB_HISTORY_INACTIVE_CLASS,
        )}
        aria-pressed={view === "history"}
        aria-label="Alte Version anzeigen"
        onClick={() => onViewChange("history")}
      >
        <FileClock
          className={REVIEW_BLOCK_HISTORY_TOGGLE_TAB_ICON_CLASS}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
    </div>
  );
}

/** Gesperrte Fachstellen-Bemerkung — Re-Review Default & Verlauf (`6424:26528`, `6424:26695`). */
export function ReviewBlockRequestedAdjustmentBand({
  remark,
  metaLine,
}: {
  remark: string;
  /** Nur Freitext-Blöcke (Figma `6424:26530`); Select-Varianten ohne Meta-Zeile. */
  metaLine?: string | null;
}) {
  return (
    <div className={REVIEW_BLOCK_REQUESTED_ADJUSTMENT_BAND_CLASS}>
      {metaLine?.trim() ? (
        <p className={REVIEW_BLOCK_REQUESTED_ADJUSTMENT_META_CLASS}>{metaLine}</p>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className={REVIEW_BLOCK_REQUESTED_ADJUSTMENT_TITLE_CLASS}>
          Angeforderte Anpassung
        </p>
        <p className={REVIEW_BLOCK_REQUESTED_ADJUSTMENT_BODY_CLASS}>{remark}</p>
      </div>
    </div>
  );
}

export type ReviewReReviewFreetextVariant = "plain" | "currentAdjusted" | "history";

/** Freitext-Inhalt in R2 Re-Review — «Angepasst» / «Vorgängig» (`6424:26518`, `6424:26621`). */
export function ReviewReReviewFreetext({
  children,
  variant,
}: {
  children: ReactNode;
  variant: ReviewReReviewFreetextVariant;
}) {
  if (variant === "plain") {
    return (
      <p className={REVIEW_BLOCK_RE_REVIEW_FREETEXT_CURRENT_CLASS}>{children}</p>
    );
  }

  const isHistory = variant === "history";
  return (
    <div className="flex flex-col items-end gap-2">
      <p
        className={
          isHistory
            ? REVIEW_BLOCK_RE_REVIEW_FREETEXT_HISTORY_CLASS
            : REVIEW_BLOCK_RE_REVIEW_FREETEXT_CURRENT_CLASS
        }
      >
        {children}
      </p>
      <p
        className={
          isHistory
            ? REVIEW_BLOCK_RE_REVIEW_PREVIOUS_MARKER_CLASS
            : REVIEW_BLOCK_RE_REVIEW_ADJUSTED_MARKER_CLASS
        }
      >
        {isHistory ? "Vorgängig" : "Angepasst"}
      </p>
    </div>
  );
}

export function ReviewBlockCard({
  title,
  children,
  footer,
  variant = "default",
  anchorId,
  headerAction,
  /** Legacy Portal-Adjustment — mapped to `variant` when gesetzt. */
  footerTone,
  cardBorderTone,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode | null;
  variant?: ReviewBlockVariant;
  anchorId?: string;
  /** Optional rechts neben dem Titel (z. B. Re-Review-Verlauf-Toggle). */
  headerAction?: ReactNode;
  footerTone?: ReviewBlockFooterTone;
  cardBorderTone?: ReviewBlockFooterTone;
}) {
  const resolvedVariant: ReviewBlockVariant =
    cardBorderTone === "adjustment" || footerTone === "adjustment"
      ? "adjustment_active"
      : footerTone === "confirmed"
        ? "confirmed"
        : footerTone === "adjustment_done"
          ? "adjustment_sent"
          : variant;

  return (
    <section
      className={cn("scroll-mt-6", REVIEW_BLOCK_SHELL_CLASS[resolvedVariant])}
      id={anchorId}
    >
      <div className={REVIEW_BLOCK_BODY_CLASS}>
        <div className="flex w-full items-center justify-between gap-3">
          <h2 className={hfBlockTitle}>{title}</h2>
          {headerAction}
        </div>
        {children}
      </div>
      {footer}
    </section>
  );
}

/** R2 pending — geteilte Leiste (`5641:21952`). */
export function ReviewBlockPendingFooter({
  onRequestAdjustment,
  onConfirm,
}: {
  onRequestAdjustment: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className={REVIEW_BLOCK_PENDING_FOOTER_CLASS}>
      <button
        type="button"
        className={REVIEW_BLOCK_PENDING_ADJUST_CLASS}
        onClick={onRequestAdjustment}
      >
        <FilePenLine className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        Anpassung anfordern
      </button>
      <button
        type="button"
        className={REVIEW_BLOCK_PENDING_CONFIRM_CLASS}
        onClick={onConfirm}
      >
        <Check className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        Bestätigen
      </button>
    </div>
  );
}

/** Auto-wachsendes Bemerkungsfeld — startet einzeilig wie ein Input. */
function ReviewBlockComposerInput({
  value,
  onChange,
  placeholder,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  invalid?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      rows={1}
      placeholder={placeholder}
      aria-invalid={invalid}
      className={REVIEW_BLOCK_COMPOSER_INPUT_CLASS}
      autoFocus
      onChange={(e) => onChange(e.target.value)}
      onInput={syncHeight}
    />
  );
}

/** R2 Bemerkung verfassen (`5641:22599`). */
export function ReviewBlockComposerFooter({
  draft,
  onDraftChange,
  onCancel,
  onSave,
  saveError,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onCancel: () => void;
  onSave: (draft: string) => void;
  saveError?: boolean;
}) {
  return (
    <div className={REVIEW_BLOCK_COMPOSER_FOOTER_CLASS}>
      <ReviewBlockComposerInput
        value={draft}
        onChange={onDraftChange}
        placeholder="Erläutern Sie, was angepasst werden sollte …"
        invalid={saveError}
      />
      {saveError ? (
        <p className="text-sm text-destructive" role="alert">
          Bitte erfassen Sie eine Bemerkung, bevor Sie speichern.
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="h-8 gap-1.5 px-0 text-sm font-medium text-foreground hover:bg-transparent"
          onClick={onCancel}
        >
          <X className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          Abbrechen
        </Button>
        <Button
          type="button"
          className="h-8 gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-stone-600"
          onClick={() => onSave(draft)}
        >
          <MessageSquare className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          Kommentieren
        </Button>
      </div>
    </div>
  );
}

export function ReviewBlockFooterTextButton({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center gap-2 text-sm font-medium text-foreground transition-colors",
        className,
      )}
      onClick={onClick}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      {label}
    </button>
  );
}

/** R2 bestätigt (`5641:22807`). */
export function ReviewBlockConfirmedFooter({
  onReset,
  readOnly,
  statusLabel = "Reviewed & Bestätigt",
}: {
  onReset?: () => void;
  readOnly?: boolean;
  statusLabel?: string;
}) {
  return (
    <div className={REVIEW_BLOCK_CONFIRMED_FOOTER_CLASS}>
      {readOnly || !onReset ? (
        <span className="min-w-0 flex-1" />
      ) : (
        <ReviewBlockFooterTextButton
          icon={RotateCcw}
          label="Zurücksetzen"
          onClick={onReset}
        />
      )}
      <span className="inline-flex items-center gap-2 text-sm font-medium text-bewilligt-600">
        <CheckCheck className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        {statusLabel}
      </span>
    </div>
  );
}

/** R2 Anpassung gespeichert (`5641:22767`). */
export function ReviewBlockAdjustmentActiveFooter({
  remark,
  onReset,
  onEdit,
  readOnly,
}: {
  remark: string;
  onReset?: () => void;
  onEdit?: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className={REVIEW_BLOCK_ADJUSTMENT_FOOTER_CLASS}>
      <p className={REVIEW_BLOCK_REMARK_TEXT_CLASS}>{remark}</p>
      {readOnly ? null : (
        <div className="flex items-center justify-between gap-3">
          {onReset ? (
            <ReviewBlockFooterTextButton
              icon={RotateCcw}
              label="Zurücksetzen"
              onClick={onReset}
            />
          ) : (
            <span />
          )}
          {onEdit ? (
            <ReviewBlockFooterTextButton
              icon={Pencil}
              label="Bearbeiten"
              onClick={onEdit}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Nach Weiterleitung an R1 (`5657:1673`). */
export function ReviewBlockAdjustmentSentFooter({ remark }: { remark: string }) {
  return (
    <div className={REVIEW_BLOCK_ADJUSTMENT_FOOTER_CLASS}>
      <div className="flex flex-col gap-1">
        <p className={REVIEW_BLOCK_REMARK_LABEL_CLASS}>Anpassung</p>
        <p className={REVIEW_BLOCK_REMARK_TEXT_CLASS}>{remark}</p>
      </div>
      <div className="flex justify-end">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-adjustment-700">
          <FilePenLine className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          Anpassung wurde angefordert
        </span>
      </div>
    </div>
  );
}

/** R1 — Bemerkung der Fachstelle (`5641:23243`, `5657:18454`). */
export function ReviewBlockR1RemarkSection({
  remark,
  footerActions,
}: {
  remark: string;
  footerActions?: ReactNode;
}) {
  return (
    <div
      className={cn(
        R1_REVIEW_BLOCK_REMARK_SECTION_CLASS,
        footerActions && "gap-6",
      )}
    >
      <div className="flex flex-col gap-1">
        <p className={REVIEW_BLOCK_REMARK_LABEL_CLASS}>Bemerkung der Fachstelle</p>
        <p className={REVIEW_BLOCK_REMARK_TEXT_CLASS}>{remark}</p>
      </div>
      {footerActions}
    </div>
  );
}

/** R1 — untere Aktionsleiste (`5792:23125`, `stone-50`, 52px). */
export function ReviewBlockR1ActionFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(R1_REVIEW_BLOCK_ACTION_FOOTER_CLASS, className)}>
      {children}
    </div>
  );
}

export function ReviewBlockR1PrimaryButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      className="h-8 gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-stone-600"
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      {label}
    </Button>
  );
}

/** R1 — «Anpassung vornehmen» (`5641:23217`). */
export function ReviewBlockR1StartAdjustmentFooter({
  onStart,
  disabled,
}: {
  onStart: () => void;
  disabled?: boolean;
}) {
  return (
    <ReviewBlockR1ActionFooter className="justify-end">
      <ReviewBlockR1PrimaryButton
        icon={Pencil}
        label="Anpassung vornehmen"
        onClick={onStart}
        disabled={disabled}
      />
    </ReviewBlockR1ActionFooter>
  );
}

/** R1 — «Zurücksetzen» + «Anpassung bestätigen» (`5792:23169`). */
export function ReviewBlockR1EditingFooter({
  onReset,
  onConfirm,
  saving,
}: {
  onReset: () => void;
  onConfirm: () => void;
  saving?: boolean;
}) {
  return (
    <ReviewBlockR1ActionFooter className="justify-between">
      <ReviewBlockFooterTextButton
        icon={RotateCcw}
        label="Zurücksetzen"
        onClick={onReset}
      />
      <ReviewBlockR1PrimaryButton
        icon={CircleCheckBig}
        label={saving ? "Wird gespeichert…" : "Anpassung bestätigen"}
        onClick={onConfirm}
        disabled={saving}
      />
    </ReviewBlockR1ActionFooter>
  );
}

/** R1 — «Bearbeiten» + «Angepasst» im Bemerkungsbereich (`5657:18476`). */
export function ReviewBlockR1SavedRemarkActions({
  onEdit,
}: {
  onEdit: () => void;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <ReviewBlockFooterTextButton icon={Pencil} label="Bearbeiten" onClick={onEdit} />
      <span className="inline-flex items-center gap-2 text-sm font-medium text-adjustment-700">
        <Check className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        Angepasst
      </span>
    </div>
  );
}

/** Gesperrte Fachstellen-Bemerkung — R2 Review Runde 2 (`5905:23340`). */
export function ReviewBlockLockedRemarkCallout({ remark }: { remark: string }) {
  return (
    <div className={REVIEW_BLOCK_LOCKED_REMARK_BAND_CLASS}>
      <p className={REVIEW_BLOCK_LOCKED_REMARK_TITLE_CLASS}>
        Bemerkung der Fachstelle
      </p>
      <p className={REVIEW_BLOCK_LOCKED_REMARK_BODY_CLASS}>{remark}</p>
    </div>
  );
}

/** @deprecated Legacy — Portal-Adjustment. */
export function ReviewBlockFooterStatus({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span
      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 text-sm font-medium text-bewilligt-600"
      role="status"
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

export function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className={cn(hfTypography.paragraphSmall, "text-muted-foreground")}>{label}</p>
      <p className={cn(hfTypography.paragraphMedium, "text-foreground")}>{value}</p>
    </div>
  );
}

/** Wrapper für Review-Feldgrids (2 Spalten ab `sm`). */
export function ReviewBlockFieldGrid({ children }: { children: ReactNode }) {
  return <div className={REVIEW_BLOCK_FIELD_GRID_CLASS}>{children}</div>;
}

function attestFileHrefIsOpenable(href: string): boolean {
  if (!href || href === "#") return false;
  return (
    href.startsWith("http:")
    || href.startsWith("https:")
    || href.startsWith("blob:")
    || href.startsWith("data:")
    || href.startsWith("/")
  );
}

export function resolveAttestFileOpenHref(file: {
  url?: string;
  id?: string;
}): string {
  const candidates = [file.url, file.id].filter(
    (s): s is string => typeof s === "string" && s.length > 0,
  );
  for (const c of candidates) {
    if (attestFileHrefIsOpenable(c)) return c;
  }
  return "";
}

/** Stabile Datei-ID für Workspace-Attest-Dokument-URL (`file` Query). */
export function attestFileDocumentId(file: {
  id?: string;
  name?: string;
  url?: string;
}): string {
  if (file.id?.trim()) return file.id.trim();
  if (file.name?.trim()) return file.name.trim();
  if (file.url?.trim()) return file.url.trim();
  return "attest";
}

/** `data:` → Blob → Object-URL (Chromium öffnet `data:` in neuem Tab oft nicht zuverlässig). */
async function openDataAttestViaBlobObjectUrl(
  dataUrl: string,
  fileNameForDownload: string,
): Promise<void> {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const child = window.open(objectUrl, "_blank", "noopener,noreferrer");
    if (!child) {
      URL.revokeObjectURL(objectUrl);
      const fallback = document.createElement("a");
      fallback.href = dataUrl;
      fallback.download = fileNameForDownload;
      fallback.rel = "noopener noreferrer";
      fallback.click();
      return;
    }
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 180_000);
  } catch {
    const fallback = document.createElement("a");
    fallback.href = dataUrl;
    fallback.download = fileNameForDownload;
    fallback.rel = "noopener noreferrer";
    fallback.click();
  }
}

let attestOpenLastHref = "";
let attestOpenLastAt = 0;
/** Nur kurz: doppelte Events derselben URL (z. B. innerhalb eines Ticks / aux+click). */
const ATTEST_OPEN_DEBOUNCE_MS = 400;

/**
 * Öffnet Attest-Links genau einmal pro Nutzeraktion (schützt vor doppelten Events
 * z. B. auxclick+click oder schnellen Doppelklicks).
 */
export async function openAttestHrefInNewTabOnce(
  href: string,
  fileNameForDownload: string,
): Promise<void> {
  const now = Date.now();
  if (
    attestOpenLastHref === href
    && now - attestOpenLastAt < ATTEST_OPEN_DEBOUNCE_MS
  ) {
    return;
  }
  attestOpenLastHref = href;
  attestOpenLastAt = now;

  if (href.startsWith("data:")) {
    await openDataAttestViaBlobObjectUrl(href, fileNameForDownload);
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

export function ReviewFileRow({
  title,
  subtitle,
  href,
  file,
}: {
  title: string;
  subtitle: string;
  /** Legacy: fester Link. Bevorzugt `file` setzen (R1/R2 Attest-Block). */
  href?: string;
  file?: { url?: string; id?: string };
}) {
  const resolvedHref = file ? resolveAttestFileOpenHref(file) : (href ?? "#");
  const openable = attestFileHrefIsOpenable(resolvedHref);

  const linkTitle = openable
    ? "In neuem Tab öffnen"
    : "Für diese Datei liegt kein öffnbarer Link vor (z. B. nach erneutem Login oder bei sehr grossen Dateien nur in derselben Sitzung).";

  const inner = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <FileText className="size-5 text-muted-foreground" aria-hidden />
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate font-medium text-foreground",
              openable && "decoration-dotted underline-offset-2 group-hover:underline",
            )}
          >
            {title}
          </span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </span>
      </span>
      <ExternalLink
        className={cn(
          "size-4 shrink-0 transition-colors",
          openable
            ? "text-muted-foreground group-hover:text-foreground"
            : "text-muted-foreground/40",
        )}
        aria-hidden
      />
    </>
  );

  const shellClass = cn(
    "flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm",
  );
  const shellClassOpenable = cn(shellClass, "group");
  const interactiveOpenableClass = cn(
    shellClassOpenable,
    "cursor-pointer transition-all hover:border-muted-foreground/30 hover:bg-muted/55",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  );

  if (openable) {
    return (
      <button
        type="button"
        title={linkTitle}
        className={cn(interactiveOpenableClass, "w-full text-left")}
        onClick={() => {
          void openAttestHrefInNewTabOnce(resolvedHref, title);
        }}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={cn(shellClass, "cursor-default")} title={linkTitle}>
      {inner}
    </div>
  );
}

type ReviewBlockChoiceMarkerTone = "default" | "adjustmentHistory";

/** Visual markers — neutral zinc/black; `adjustmentHistory` = Verlaufsansicht (erforderlich-700). */
function ReviewBlockCheckboxMarker({
  checked,
  tone = "default",
}: {
  checked: boolean;
  tone?: ReviewBlockChoiceMarkerTone;
}) {
  return (
    <span
      className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center"
      aria-hidden
    >
      {checked ? (
        <span
          className={cn(
            "flex size-4 items-center justify-center rounded-sm border text-white",
            tone === "adjustmentHistory"
              ? "border-adjustment-700 bg-adjustment-700"
              : "border-zinc-900 bg-zinc-900",
          )}
        >
          <Check className="size-3 stroke-[3]" />
        </span>
      ) : (
        <span className="box-border flex size-3.5 items-center justify-center rounded-sm border border-zinc-300 bg-stone-50" />
      )}
    </span>
  );
}

function ReviewBlockRadioMarker({
  checked,
  tone = "default",
}: {
  checked: boolean;
  tone?: ReviewBlockChoiceMarkerTone;
}) {
  return (
    <span
      className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center"
      aria-hidden
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-full border-2",
          checked && tone === "adjustmentHistory"
            ? "border-adjustment-700 bg-background"
            : checked
              ? "border-zinc-900 bg-background"
              : "border-zinc-300 bg-stone-50",
        )}
      >
        {checked ? (
          <span
            className={cn(
              "size-2 rounded-full",
              tone === "adjustmentHistory" ? "bg-adjustment-700" : "bg-zinc-900",
            )}
          />
        ) : null}
      </span>
    </span>
  );
}

export type ReviewReadonlyChoiceMode = "r1" | "r2" | "reReviewHistory";

/** @deprecated Alias — `legacy` → `r2`. */
export type R1ReadonlyChoiceMode = ReviewReadonlyChoiceMode;

function choiceOptionShellClass(
  isSelected: boolean,
  mode: ReviewReadonlyChoiceMode,
): string {
  if (mode === "reReviewHistory" && isSelected) {
    return REVIEW_BLOCK_RE_REVIEW_HISTORY_OPTION_SELECTED_SHELL_CLASS;
  }
  return isSelected
    ? R1_RICH_OPTION_SELECTED_LOCKED_CLASS
    : R1_RICH_OPTION_UNSELECTED_LOCKED_CLASS;
}

function choiceMarkerTone(
  isSelected: boolean,
  mode: ReviewReadonlyChoiceMode,
): ReviewBlockChoiceMarkerTone {
  return mode === "reReviewHistory" && isSelected ? "adjustmentHistory" : "default";
}

function choiceOptionTitleClass(
  isSelected: boolean,
  mode: ReviewReadonlyChoiceMode,
): string {
  if (mode === "reReviewHistory" && isSelected) {
    return cn("text-sm leading-5", REVIEW_BLOCK_RE_REVIEW_HISTORY_OPTION_SELECTED_TEXT_CLASS);
  }
  return cn("text-sm leading-5", isSelected ? "text-foreground" : "text-inherit");
}

function choiceOptionStatusClass(
  isSelected: boolean,
  mode: ReviewReadonlyChoiceMode,
): string {
  if (mode === "reReviewHistory" && isSelected) {
    return cn(
      "shrink-0 text-hf-paragraph-mini",
      REVIEW_BLOCK_RE_REVIEW_HISTORY_OPTION_SELECTED_TEXT_CLASS,
    );
  }
  return isSelected
    ? R1_RICH_OPTION_STATUS_SELECTED_CLASS
    : R1_RICH_OPTION_STATUS_UNSELECTED_CLASS;
}

function choiceSelectedStatusLabel(
  mode: ReviewReadonlyChoiceMode,
  reReviewAdjusted?: boolean,
): string {
  if (mode === "reReviewHistory") return "Vorgängig";
  if (mode === "r1") return "gewählt";
  if (reReviewAdjusted) return "Angepasst";
  return "wurde gewählt";
}

function choiceUnselectedStatusLabel(mode: ReviewReadonlyChoiceMode): string {
  return mode === "r1" ? "nicht gewählt" : "wurde nicht gewählt";
}

function choiceOptionHintClass(
  isSelected: boolean,
  mode: ReviewReadonlyChoiceMode,
): string {
  if (mode === "reReviewHistory" && isSelected) {
    return cn(
      "mt-1.5 text-xs leading-4",
      REVIEW_BLOCK_RE_REVIEW_HISTORY_OPTION_SELECTED_TEXT_CLASS,
    );
  }
  return cn(
    "mt-1.5 text-xs leading-4",
    isSelected ? "text-muted-foreground" : "text-inherit",
  );
}

function choiceOptionDescriptionClass(
  isSelected: boolean,
  mode: ReviewReadonlyChoiceMode,
): string {
  if (mode === "reReviewHistory" && isSelected) {
    return cn(
      "text-xs leading-relaxed",
      REVIEW_BLOCK_RE_REVIEW_HISTORY_OPTION_SELECTED_TEXT_CLASS,
    );
  }
  return cn(
    "text-xs leading-relaxed",
    isSelected ? "text-muted-foreground" : "text-inherit",
  );
}

const DURATION_OPTION_HINTS_R1 = {
  full_study: "Für dauerhafte oder chronische Beeinträchtigungen",
  one_semester:
    "Für episodische Erkrankungen oder zur erstmaligen Erprobung der Massnahmen",
} as const;

/**
 * Read-only Vergleichsdarstellung „Gesamte Studiendauer“ vs. «Einmalig …».
 * `r1`: «gewählt» / «nicht gewählt» · `r2`: «wurde gewählt» / «wurde nicht gewählt».
 */
export function DurationChoiceCompare({
  selected,
  readonlyMode = "r2",
  reReviewAdjustedSelection = false,
  useR1OptionHints = false,
}: {
  selected?: "full_study" | "one_semester";
  readonlyMode?: ReviewReadonlyChoiceMode;
  reReviewAdjustedSelection?: boolean;
  /** Re-Review-Runde 2 — Figma `6424:26683` (kompakte R1-Untertitel). */
  useR1OptionHints?: boolean;
}) {
  const options: {
    id: "full_study" | "one_semester";
    title: string;
    hint: string;
  }[] = [
    {
      id: "full_study",
      title: "Gesamte Studiendauer",
      hint:
        readonlyMode === "r1" || useR1OptionHints
          ? DURATION_OPTION_HINTS_R1.full_study
          : "Der Ausgleich gilt für die gesamte Dauer des Studiums.",
    },
    {
      id: "one_semester",
      title: "Einmalig für ein Semester",
      hint:
        readonlyMode === "r1" || useR1OptionHints
          ? DURATION_OPTION_HINTS_R1.one_semester
          : "Der Ausgleich gilt für ein Semester; eine Verlängerung ist separat zu beantragen.",
    },
  ];

  if (!selected) {
    return (
      <p className="text-sm text-muted-foreground">Keine Auswahl gespeichert.</p>
    );
  }

  return (
    <div className={R1_RICH_OPTION_GROUP_CLASS}>
      {options.map((opt) => {
        const isSelected = selected === opt.id;
        return (
          <div key={opt.id} className={choiceOptionShellClass(isSelected, readonlyMode)}>
            <ReviewBlockRadioMarker
              checked={isSelected}
              tone={choiceMarkerTone(isSelected, readonlyMode)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className={choiceOptionTitleClass(isSelected, readonlyMode)}>
                  {opt.title}
                </p>
                <p className={choiceOptionStatusClass(isSelected, readonlyMode)}>
                  {isSelected
                    ? choiceSelectedStatusLabel(
                        readonlyMode,
                        reReviewAdjustedSelection && readonlyMode === "r2",
                      )
                    : choiceUnselectedStatusLabel(readonlyMode)}
                </p>
              </div>
              <p className={choiceOptionHintClass(isSelected, readonlyMode)}>{opt.hint}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ScopeChecklist({
  selected,
  readonlyMode = "r2",
  reReviewAdjustedOptions,
}: {
  selected: string[];
  readonlyMode?: ReviewReadonlyChoiceMode;
  reReviewAdjustedOptions?: ReadonlySet<string>;
}) {
  const set = new Set(selected);
  return (
    <ul className={R1_RICH_OPTION_GROUP_CLASS}>
      {APPLICATION_SCOPE_OPTIONS.map((option) => {
        const isOn = set.has(option);
        return (
          <li key={option}>
            <div className={choiceOptionShellClass(isOn, readonlyMode)}>
              <ReviewBlockCheckboxMarker
                checked={isOn}
                tone={choiceMarkerTone(isOn, readonlyMode)}
              />
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <span className={choiceOptionTitleClass(isOn, readonlyMode)}>
                  {option}
                </span>
                <span className={choiceOptionStatusClass(isOn, readonlyMode)}>
                  {isOn
                    ? choiceSelectedStatusLabel(
                        readonlyMode,
                        reReviewAdjustedOptions?.has(option) && readonlyMode === "r2",
                      )
                    : choiceUnselectedStatusLabel(readonlyMode)}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function MeasureChecklist({
  options,
  selectedKeys,
  otherLines,
  otherEnabled,
  otherText,
  measuresKeine,
  keineTitle = "Keine",
  keineDescription,
  readonlyMode = "r2",
  reReviewAdjustedKeys,
  reReviewAdjustedOtherIndices,
}: {
  options: readonly ApplicationMeasureOption[];
  selectedKeys: string[];
  otherLines?: string[];
  otherEnabled?: boolean;
  otherText?: string;
  measuresKeine?: boolean;
  keineTitle?: string;
  keineDescription?: string;
  readonlyMode?: ReviewReadonlyChoiceMode;
  reReviewAdjustedKeys?: ReadonlySet<string>;
  reReviewAdjustedOtherIndices?: ReadonlySet<number>;
}) {
  const set = new Set(selectedKeys);
  const resolvedOthers = (() => {
    const fromLines = (otherLines ?? []).map((t) => t.trim()).filter(Boolean);
    if (fromLines.length > 0) return fromLines;
    const legacy = otherText?.trim();
    if (legacy && otherEnabled !== false) return [legacy];
    return [];
  })();

  return (
    <div className="space-y-4">
      <ul className={R1_RICH_OPTION_GROUP_CLASS}>
        {measuresKeine ? (
          <li key="__keine__">
            <div className={choiceOptionShellClass(true, readonlyMode)}>
              <ReviewBlockCheckboxMarker
                checked
                tone={choiceMarkerTone(true, readonlyMode)}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-start justify-between gap-3">
                  <span className={choiceOptionTitleClass(true, readonlyMode)}>
                    {keineTitle}
                  </span>
                  <span className={choiceOptionStatusClass(true, readonlyMode)}>
                    {choiceSelectedStatusLabel(readonlyMode)}
                  </span>
                </div>
                {keineDescription ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {keineDescription}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ) : null}
        {options.map((option) => {
          const isOn = set.has(option.key);
          return (
            <li key={option.key}>
              <div className={choiceOptionShellClass(isOn, readonlyMode)}>
                <ReviewBlockCheckboxMarker
                  checked={isOn}
                  tone={choiceMarkerTone(isOn, readonlyMode)}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <span className={choiceOptionTitleClass(isOn, readonlyMode)}>
                      {option.title}
                    </span>
                    <span className={choiceOptionStatusClass(isOn, readonlyMode)}>
                      {isOn
                        ? choiceSelectedStatusLabel(
                            readonlyMode,
                            reReviewAdjustedKeys?.has(option.key) && readonlyMode === "r2",
                          )
                        : choiceUnselectedStatusLabel(readonlyMode)}
                    </span>
                  </div>
                  <p className={choiceOptionDescriptionClass(isOn, readonlyMode)}>
                    {option.description}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {resolvedOthers.length > 0 ? (
        <ul className={R1_RICH_OPTION_GROUP_CLASS}>
          {resolvedOthers.map((line, idx) => {
            const hasLine = Boolean(line);
            return (
              <li key={`other-${idx}`}>
                <div className={choiceOptionShellClass(hasLine, readonlyMode)}>
                  <ReviewBlockCheckboxMarker
                    checked={hasLine}
                    tone={choiceMarkerTone(hasLine, readonlyMode)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p
                        className={cn(
                          "text-xs font-medium leading-4",
                          !hasLine
                            ? "text-inherit"
                            : readonlyMode === "reReviewHistory"
                              ? REVIEW_BLOCK_RE_REVIEW_HISTORY_OPTION_SELECTED_TEXT_CLASS
                              : "text-muted-foreground",
                        )}
                      >
                        Sonstige Massnahme
                      </p>
                      <span className={choiceOptionStatusClass(hasLine, readonlyMode)}>
                        {hasLine
                          ? choiceSelectedStatusLabel(
                              readonlyMode,
                              reReviewAdjustedOtherIndices?.has(idx)
                                && readonlyMode === "r2",
                            )
                          : choiceUnselectedStatusLabel(readonlyMode)}
                      </span>
                    </div>
                    <p className={cn("mt-1", choiceOptionTitleClass(hasLine, readonlyMode))}>
                      {line || "Keine Angabe"}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export {
  APPLICATION_SCOPE_OPTIONS,
  ASSESSMENT_MEASURE_OPTIONS,
  LECTURE_MEASURE_OPTIONS,
};
export type { ApplicationMeasureOption };
