"use client";

import { type ComponentType, type ReactNode } from "react";
import { Check, ExternalLink, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
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

/**
 * Visueller Tonus eines Review-Block-Footers / -Rahmens.
 * - `default`: neutraler Card-Look (für noch ausstehende Aktionen).
 * - `confirmed`: teal — R2 hat bestätigt bzw. R1 zeigt einen vom Kommentar
 *   nicht betroffenen Block.
 * - `adjustment`: amber — R2 hat eine Anpassung angefordert.
 * - `adjustment_done`: gleiche Teal-Farbe wie `confirmed`, Rahmen und unterer Balken mit
 *   60 % Deckkraft (R1-Anpassung gespeichert vs. volle Fachstellen-Bestätigung).
 */
export type ReviewBlockFooterTone =
  | "default"
  | "confirmed"
  | "adjustment"
  | "adjustment_done";

export function ReviewBlockCard({
  title,
  children,
  footer,
  footerTone = "default",
  /** Optional: nur Card-Rahmen (z. B. aktiver Anpassungs-Entwurf), Fußzeile bleibt `footerTone`. */
  cardBorderTone,
  anchorId,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode | null;
  footerTone?: ReviewBlockFooterTone;
  cardBorderTone?: ReviewBlockFooterTone;
  anchorId?: string;
}) {
  const borderTone = cardBorderTone ?? footerTone;

  /** Gleiche vertikale Polsterung über alle States — verhindert Höhensprung beim Wechsel der Fußzeile. */
  const footerClassName =
    footerTone === "default"
      ? "flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-6 py-3"
      : footerTone === "confirmed"
        ? "flex flex-wrap items-center justify-between gap-3 border-t border-teal-600 bg-teal-600 px-3 py-3 dark:bg-teal-600"
        : footerTone === "adjustment_done"
          ? "flex flex-wrap items-center justify-between gap-3 border-0 border-t border-solid bg-[rgb(13_148_136/0.6)] px-3 py-3 [border-top-color:rgb(13_148_136/0.6)] dark:bg-[rgb(20_184_166/0.6)] dark:[border-top-color:rgb(20_184_166/0.6)]"
          : "flex flex-wrap items-center justify-between gap-3 border-t border-amber-400 bg-amber-400 px-3 py-3";

  const sectionClassName = cn(
    "scroll-mt-6 overflow-hidden rounded-lg bg-card",
    borderTone === "default" && "border border-border",
    borderTone === "confirmed" &&
      "border-[1.5px] border-teal-600 dark:border-teal-500",
    borderTone === "adjustment_done" &&
      "border-[1.5px] border-solid [border-color:rgb(13_148_136/0.6)] dark:[border-color:rgb(20_184_166/0.6)]",
    borderTone === "adjustment" && "border-[1.5px] border-amber-400",
  );

  return (
    <section className={sectionClassName} id={anchorId}>
      <div className="space-y-6 px-6 pt-5 pb-5">
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
        {children}
      </div>
      {footer ? <div className={footerClassName}>{footer}</div> : null}
    </section>
  );
}

export function ReviewBlockFooterStatus({
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

export function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function attestFileHrefIsOpenable(href: string): boolean {
  if (!href || href === "#") return false;
  return (
    href.startsWith("http:")
    || href.startsWith("https:")
    || href.startsWith("blob:")
    || href.startsWith("data:")
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

/** Visual markers — neutral zinc/black per Figma Review Block (not teal „success“). */
function ReviewBlockCheckboxMarker({ checked }: { checked: boolean }) {
  return (
    <span
      className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center"
      aria-hidden
    >
      {checked ? (
        <span className="flex size-4 items-center justify-center rounded-sm border border-zinc-900 bg-zinc-900 text-white">
          <Check className="size-3 stroke-[3]" />
        </span>
      ) : (
        <span className="box-border flex size-3.5 items-center justify-center rounded-sm border border-zinc-300 bg-background shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]" />
      )}
    </span>
  );
}

function ReviewBlockRadioMarker({ checked }: { checked: boolean }) {
  return (
    <span
      className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center"
      aria-hidden
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-full border-2 bg-background",
          checked
            ? "border-zinc-900"
            : "border-zinc-300 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]",
        )}
      >
        {checked ? <span className="size-2 rounded-full bg-zinc-900" /> : null}
      </span>
    </span>
  );
}

/**
 * Read-only Vergleichsdarstellung „Gesamte Studiendauer“ vs. „Einmalig …“.
 * Wird sowohl von der R2-Review-Kachel als auch von der R1-Adjustment-Ansicht
 * im Lesemodus genutzt.
 */
export function DurationChoiceCompare({
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
    <div className="space-y-1.5">
      {options.map((opt) => {
        const isSelected = selected === opt.id;
        return (
          <div
            key={opt.id}
            className={cn(
              "flex gap-3 rounded-lg border px-3 py-3 transition-colors",
              isSelected
                ? "border-border border-solid bg-card"
                : "border-border border-dashed bg-muted/50 opacity-70",
            )}
          >
            <ReviewBlockRadioMarker checked={isSelected} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p
                  className={cn(
                    "text-sm leading-5",
                    isSelected
                      ? "text-foreground"
                      : "text-muted-foreground line-through decoration-solid",
                  )}
                >
                  {opt.title}
                </p>
                <p
                  className={cn(
                    "shrink-0 text-right text-xs font-medium leading-4",
                    isSelected ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {isSelected ? "wurde gewählt" : "wurde nicht gewählt"}
                </p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {opt.hint}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ScopeChecklist({ selected }: { selected: string[] }) {
  const set = new Set(selected);
  return (
    <ul className="space-y-1.5">
      {APPLICATION_SCOPE_OPTIONS.map((option) => {
        const isOn = set.has(option);
        return (
          <li key={option}>
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-3",
                isOn
                  ? "border-border border-solid bg-card"
                  : "border-border border-dashed bg-muted/50 opacity-70",
              )}
            >
              <ReviewBlockCheckboxMarker checked={isOn} />
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <span
                  className={cn(
                    "text-sm leading-5",
                    isOn
                      ? "text-foreground"
                      : "text-muted-foreground line-through decoration-solid",
                  )}
                >
                  {option}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-right text-xs font-medium leading-4",
                    isOn ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {isOn ? "wurde gewählt" : "wurde nicht gewählt"}
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
}: {
  options: readonly ApplicationMeasureOption[];
  selectedKeys: string[];
  /** Bevorzugt — mehrere «Sonstige»-Zeilen. */
  otherLines?: string[];
  /** Legacy-Einzelfeld */
  otherEnabled?: boolean;
  otherText?: string;
  /** Antrag: explizit «Keine Massnahme» gewählt. */
  measuresKeine?: boolean;
  keineTitle?: string;
  keineDescription?: string;
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
      <ul className="space-y-1.5">
        {measuresKeine ? (
          <li key="__keine__">
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border bg-card px-3 py-3",
                "border-foreground",
              )}
            >
              <ReviewBlockCheckboxMarker checked />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium leading-5 text-foreground">
                    {keineTitle}
                  </span>
                  <span className="shrink-0 text-right text-xs font-medium leading-4 text-foreground">
                    wurde gewählt
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
              <div
                className={cn(
                  "flex items-start gap-3 rounded-lg border bg-card px-3 py-3",
                  isOn ? "border-foreground" : "border-border",
                )}
              >
                <ReviewBlockCheckboxMarker checked={isOn} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        "text-sm font-medium leading-5",
                        isOn
                          ? "text-foreground"
                          : "text-muted-foreground line-through decoration-solid",
                      )}
                    >
                      {option.title}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-right text-xs font-medium leading-4",
                        isOn ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {isOn ? "wurde gewählt" : "wurde nicht gewählt"}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-xs leading-relaxed text-muted-foreground",
                      !isOn && "line-through decoration-solid",
                    )}
                  >
                    {option.description}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {resolvedOthers.map((line, idx) => (
        <div
          key={`other-${idx}`}
          className={cn(
            "flex items-start gap-3 rounded-lg border bg-card px-3 py-3",
            line ? "border-foreground" : "border-border",
          )}
        >
          <ReviewBlockCheckboxMarker checked={Boolean(line)} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium leading-4 text-muted-foreground">
                Sonstige Massnahme
              </p>
              <span
                className={cn(
                  "shrink-0 text-right text-xs font-medium leading-4",
                  line ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {line ? "wurde ergänzt" : "wurde nicht gewählt"}
              </span>
            </div>
            <p
              className={cn(
                "mt-1 text-sm leading-5",
                line
                  ? "text-foreground"
                  : "text-muted-foreground line-through decoration-solid",
              )}
            >
              {line || "Keine Angabe"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export {
  APPLICATION_SCOPE_OPTIONS,
  ASSESSMENT_MEASURE_OPTIONS,
  LECTURE_MEASURE_OPTIONS,
};
export type { ApplicationMeasureOption };
