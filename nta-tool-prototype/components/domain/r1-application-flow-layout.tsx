"use client";

import { ExternalLink, Info } from "lucide-react";
import { type ComponentPropsWithoutRef, type ReactNode } from "react";

import { HfPageGrid } from "@/components/layout/hf-grid";
import {
  R1FlowIcon,
  R1FlowProgressTrailingIndicator,
  r1FlowProgressContentClass,
  type R1FlowStepIconName,
  type R1ProgressStepVisualState,
} from "@/components/domain/r1-flow-icons";
import {
  r1FlowFieldClassName,
  r1FlowFieldControlClassName,
  r1FlowFieldDescribedClassName,
  r1FlowFieldLabelGroupClassName,
  r1FlowFieldOptionsClassName,
  r1FlowFieldRowClassName,
  r1FlowFieldStackClassName,
  r1FlowFieldStackDefinitionClassName,
} from "@/lib/design-tokens/r1-form";
import { hfTypography } from "@/lib/design-tokens/typography";
import type { R1PortalFlowStep } from "@/lib/test-flow-types";
import { cn } from "@/lib/utils";

/** UI-Schritte im R1-Antragsflow (inkl. Erfolgsscreen, nicht persistiert). */
export type R1FlowUiStep = R1PortalFlowStep | "step6_submitted";

export const R1_FLOW_PROGRESS_STEP_COUNT = 5;

export function r1FlowProgressStepIndex(step: R1FlowUiStep): number {
  switch (step) {
    case "step1":
      return 0;
    case "step2":
      return 1;
    case "step3_booking":
    case "step3_booked":
    case "step3_recommendation":
      return 2;
    case "step4_application":
      return 3;
    case "step5_overview":
    case "step6_submitted":
      return 4;
    default:
      return 0;
  }
}

export type { R1ProgressStepVisualState };

type R1ApplicationFlowLayoutProps = {
  showCorrectionSidebar?: boolean;
  headerClose?: {
    onClick: () => void;
    disabled?: boolean;
    label: string;
  };
  headerAutosave?: ReactNode;
  sidebar: ReactNode;
  sidebarFooter?: ReactNode;
  main: ReactNode;
  correctionSidebar?: ReactNode;
};

export function R1ApplicationFlowLayout({
  showCorrectionSidebar = false,
  headerClose,
  headerAutosave,
  sidebar,
  sidebarFooter,
  main,
  correctionSidebar,
}: R1ApplicationFlowLayoutProps) {
  return (
    <div className="flex h-screen min-w-[var(--hf-grid-min-width)] flex-col overflow-hidden bg-stone-100">
      <HfPageGrid
        className="flex h-full min-h-0 flex-col"
        gridClassName="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]"
      >
        <R1FlowTopBar close={headerClose} autosave={headerAutosave} />

        <div className="hf-col-span-12 hf-grid min-h-0 flex-1">
          <aside className="hf-col-span-3 hf-col-collapse-below-desktop flex h-full min-h-0 flex-col justify-between gap-4 overflow-hidden">
            <div className="flex shrink-0 flex-col gap-6">
              {sidebar}
            </div>
            {sidebarFooter ? (
              <div className="w-full shrink-0 pb-6">{sidebarFooter}</div>
            ) : null}
          </aside>

          {showCorrectionSidebar && correctionSidebar ? (
            <>
              <div
                className={cn(
                  "hf-col-collapse-below-desktop hf-grid-free flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background",
                  "rounded-tl-xl",
                  "hf-col-span-6 hf-col-start-4",
                )}
              >
                {main}
              </div>
              <aside
                className={cn(
                  "hf-col-collapse-below-desktop hf-grid-free hidden h-full min-h-0 flex-col overflow-hidden border-l border-stone-250 bg-background lg:flex",
                  "hf-col-span-3 hf-col-start-10",
                )}
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {correctionSidebar}
                </div>
              </aside>
            </>
          ) : (
            <div
              className={cn(
                "hf-col-collapse-below-desktop hf-grid-free flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background",
                "rounded-tl-xl",
                "-mr-[var(--hf-grid-margin)]",
                "hf-col-span-9 hf-col-start-4",
              )}
            >
              {main}
            </div>
          )}
        </div>
      </HfPageGrid>
    </div>
  );
}

type R1FlowTopBarProps = {
  close?: {
    onClick: () => void;
    disabled?: boolean;
    label: string;
  };
  autosave?: ReactNode;
};

function R1FlowTopBar({ close, autosave }: R1FlowTopBarProps) {
  return (
    <header className="hf-col-span-12 flex shrink-0 items-center justify-between gap-4 pt-4 pb-5">
      <h1 className={cn(hfTypography.h4, "shrink-0 text-foreground")}>
        Antrag auf Nachteilsausgleich
      </h1>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
        {autosave ? <div className="min-w-0 truncate">{autosave}</div> : null}
        {close ? (
          <button
            type="button"
            disabled={close.disabled}
            onClick={close.onClick}
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-foreground-alt transition-colors hover:bg-stone-150/80 disabled:opacity-50"
          >
            <span className={hfTypography.paragraphSmallMedium}>{close.label}</span>
            <R1FlowIcon name="close-x" className="text-foreground" />
          </button>
        ) : null}
      </div>
    </header>
  );
}

type R1FlowProgressCardProps = {
  /** Anzahl vollständig abgeschlossener Schritte (0–5). */
  completedStepCount: number;
  children: ReactNode;
};

export function R1FlowProgressCard({
  completedStepCount,
  children,
}: R1FlowProgressCardProps) {
  const completed = Math.min(
    Math.max(completedStepCount, 0),
    R1_FLOW_PROGRESS_STEP_COUNT,
  );
  const progressPercent =
    (completed / R1_FLOW_PROGRESS_STEP_COUNT) * 100;

  return (
    <div
      className="flex shrink-0 flex-col gap-4 rounded-xl bg-background p-4"
      data-node-id="5180:7025"
    >
      <div className="flex shrink-0 flex-col gap-4" data-node-id="5180:7026">
        <p
          className={cn(hfTypography.paragraphLargeMedium, "text-stone-900")}
          data-node-id="5180:7027"
        >
          Fortschritt
        </p>
        <div className="flex flex-col gap-1" data-node-id="5180:7028">
          <p
            className={cn(hfTypography.paragraphSmallMedium, "text-stone-500")}
            data-node-id="5180:7029"
          >
            {completed} von {R1_FLOW_PROGRESS_STEP_COUNT} abgeschlossen
          </p>
          <div
            className="relative h-2 w-full overflow-hidden rounded-xl bg-bewilligt-50"
            role="progressbar"
            aria-valuenow={completed}
            aria-valuemin={0}
            aria-valuemax={R1_FLOW_PROGRESS_STEP_COUNT}
            data-node-id="5180:7030"
          >
            <div
              className="absolute top-0 left-0 h-2 rounded-l-md bg-gradient-to-r from-bewilligt-100 to-bewilligt-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
      <nav className="flex flex-col gap-1" aria-label="Fortschritt">
        {children}
      </nav>
    </div>
  );
}

type R1FlowProgressStepProps = {
  label: string;
  iconName: R1FlowStepIconName;
  visualState: R1ProgressStepVisualState;
  isActive?: boolean;
  onClick?: () => void;
  isClickable?: boolean;
};

export function R1FlowProgressStep({
  label,
  iconName,
  visualState,
  isActive = false,
  onClick,
  isClickable = false,
}: R1FlowProgressStepProps) {
  const contentClass = r1FlowProgressContentClass(visualState);
  const canHighlight =
    (visualState === "available" ||
      visualState === "complete" ||
      visualState === "incomplete") &&
    (isClickable || isActive);
  const isLocked =
    visualState === "locked-pre" || visualState === "locked-post";

  return (
    <div
      className={cn(
        "flex w-full shrink-0 items-center justify-between rounded-lg p-2 transition-colors",
        isLocked && !isClickable && "cursor-not-allowed",
        canHighlight && "cursor-pointer hover:bg-stone-100",
        isActive && canHighlight && "bg-stone-100",
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex size-4 shrink-0 items-center justify-center">
          <R1FlowIcon name={iconName} className={contentClass} />
        </span>
        <span
          className={cn(
            "truncate whitespace-nowrap",
            hfTypography.paragraphSmall,
            contentClass,
          )}
        >
          {label}
        </span>
      </div>
      <span className="flex size-4 shrink-0 items-center justify-center">
        <R1FlowProgressTrailingIndicator visualState={visualState} />
      </span>
    </div>
  );
}

export function R1FlowProgressDivider() {
  return (
    <div
      className="my-3 h-px w-full shrink-0 bg-stone-200"
      aria-hidden
      data-node-id="5180:7051"
    />
  );
}

export function R1FlowContactCard() {
  return (
    <div
      className="flex shrink-0 flex-col gap-4 rounded-xl bg-background p-4"
      data-node-id="5213:1456"
    >
      <div className="flex flex-col gap-0.5" data-node-id="5213:1457">
        <p
          className={cn(hfTypography.paragraphMedium, "text-stone-900")}
          data-node-id="5213:1458"
        >
          Fragen und Unklarheiten?
        </p>
        <p
          className={cn(hfTypography.paragraphSmall, "text-stone-500")}
          data-node-id="5213:1459"
        >
          Kontaktieren Sie unsere Fachstelle unter:
        </p>
      </div>
      <div className="flex flex-col gap-2" data-node-id="5213:1460">
        <a
          href="mailto:kontakt@hochschule.ch"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          data-node-id="5213:1461"
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-150 p-2"
            data-node-id="5213:1462"
          >
            <R1FlowIcon name="mail" className="text-stone-900" />
          </span>
          <span className={cn(hfTypography.paragraphSmall, "text-stone-900")}>
            kontakt@hochschule.ch
          </span>
        </a>
        <a
          href="tel:+41550000000"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          data-node-id="5213:1464"
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-150 p-2"
            data-node-id="5213:1465"
          >
            <R1FlowIcon name="phone" className="text-stone-900" />
          </span>
          <span className={cn(hfTypography.paragraphSmall, "text-stone-900")}>
            +41 55 000 00 00
          </span>
        </a>
      </div>
    </div>
  );
}

type R1FlowDiscardButtonProps = {
  disabled?: boolean;
  onClick: () => void;
};

export function R1FlowDiscardButton({ disabled, onClick }: R1FlowDiscardButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-node-id="5180:7111"
      className={cn(
        "flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-abgelehnt-500 bg-transparent px-4 py-2 transition-colors",
        "hover:bg-abgelehnt-50",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <span
        className="flex size-4 shrink-0 items-center justify-center overflow-hidden"
        data-node-id="I5180:7111;1495:13438"
      >
        <R1FlowIcon name="trash-2" className="text-abgelehnt-600" />
      </span>
      <span
        className={cn(
          hfTypography.paragraphSmallMedium,
          "shrink-0 whitespace-nowrap text-abgelehnt-600",
        )}
      >
        Antrag verwerfen
      </span>
    </button>
  );
}

type R1FlowMainContentProps = {
  children: ReactNode;
};

export function R1FlowMainContent({ children }: R1FlowMainContentProps) {
  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain"
      data-node-id="5180:7022"
    >
      <div className="grid grid-cols-9 gap-x-[var(--hf-grid-gutter)] pb-8 pt-6">
        <div className="col-span-7 col-start-2 flex flex-col gap-[11px]" data-node-id="5180:7077">
          {children}
        </div>
      </div>
    </div>
  );
}

export function R1FlowAutosaveIndicator() {
  return (
    <p
      className={cn(
        hfTypography.paragraphMiniMedium,
        "flex items-center gap-1 whitespace-nowrap text-bewilligt-500",
      )}
    >
      <R1FlowIcon name="save" className="shrink-0 text-bewilligt-500" />
      Autosave aktiv: Entwurf wird laufend gespeichert…
    </p>
  );
}

type R1FlowFormCardProps = {
  children: ReactNode;
};

export function R1FlowFormCard({ children }: R1FlowFormCardProps) {
  return (
    <div
      className="rounded-xl border border-stone-250 bg-background p-6"
      data-node-id="5180:7082"
    >
      <div className="flex flex-col gap-10">{children}</div>
    </div>
  );
}

type R1FlowSectionTitleProps = {
  children: ReactNode;
  className?: string;
  /** 12px Abstand unter der Überschrift (Step-Sektionen laut Figma). */
  spacingBelow?: "compact";
};

export function R1FlowSectionTitle({
  children,
  className,
  spacingBelow,
}: R1FlowSectionTitleProps) {
  return (
    <h2
      className={cn(
        hfTypography.paragraphLargeMedium,
        "text-stone-900",
        spacingBelow === "compact" && "mb-3",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** 20px zwischen Feldzeilen; `definition` = 40px (nur Antragsdefinition). */
export function R1FlowFieldStack({
  children,
  className,
  spacing = "default",
}: {
  children: ReactNode;
  className?: string;
  spacing?: "default" | "definition";
}) {
  return (
    <div
      className={cn(
        spacing === "definition"
          ? r1FlowFieldStackDefinitionClassName
          : r1FlowFieldStackClassName,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Titel + Beschreibung (4px zwischen den Zeilen). */
export function R1FlowFieldLabelGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(r1FlowFieldLabelGroupClassName, className)}>{children}</div>
  );
}

/** Control + optionaler Fehlertext (4px). */
export function R1FlowFieldControl({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(r1FlowFieldControlClassName, className)}>{children}</div>
  );
}

/** Ein Feld: Label + Control; mit `described` 12px unter dem Beschreibungsblock. */
export function R1FlowField({
  children,
  className,
  described = false,
  ...props
}: {
  children: ReactNode;
  className?: string;
  /** Feld hat Titel + Beschreibung vor dem Control (12px Abstand). */
  described?: boolean;
} & ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        described ? r1FlowFieldDescribedClassName : r1FlowFieldClassName,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** 2-Spalten-Zeile mit 20px Gap. */
export function R1FlowFieldRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(r1FlowFieldRowClassName, className)}>{children}</div>;
}

/** 8px zwischen Optionen eines Feldes. */
export function R1FlowFieldOptions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(r1FlowFieldOptionsClassName, className)}>{children}</div>;
}

/** Zwei Spalten à max. 320px wie Figma Vertical-Field-Reihen. */
export function R1FlowFieldColumns({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:gap-6">
      {children}
    </div>
  );
}

export function R1FlowFieldColumn({ children }: { children: ReactNode }) {
  return (
    <div className={cn("flex w-full max-w-[320px]", r1FlowFieldStackClassName)}>
      {children}
    </div>
  );
}

export function R1FlowFormSection({ children }: { children: ReactNode }) {
  return <section className={r1FlowFieldStackClassName}>{children}</section>;
}

export function R1FlowFormFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-end justify-end" data-node-id="5180:7103">
      {children}
    </div>
  );
}

const ATTEST_CALLOUT_LINK_CLASS =
  "inline-flex items-center gap-2 text-hf-paragraph-small-medium text-in-review-800 underline underline-offset-2 hover:text-in-review-900";

/** Info-Callout zu Attest-Vorgaben (Figma 5077:14809). */
export function R1FlowAttestCallout({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-lg bg-in-review-50 px-4 py-3", className)}
      data-node-id="5077:14809"
    >
      <div className="grid grid-cols-[1rem_1fr] gap-x-3 gap-y-1">
        <Info
          className="row-start-1 self-center text-in-review-800"
          size={16}
          strokeWidth={2}
          aria-hidden
        />
        <p className="col-start-2 row-start-1 text-hf-paragraph-small-medium text-in-review-800">
          Bitte beachten Sie die Vorgaben des fachärztlichen Attests
        </p>
        <div className="col-start-2 row-start-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href="/attest/attest-mustervorlage.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className={ATTEST_CALLOUT_LINK_CLASS}
            >
              Attest Mustervorlage
              <ExternalLink className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            </a>
            <a
              href="/attest/attest-checkliste-icf.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className={ATTEST_CALLOUT_LINK_CLASS}
            >
              Attest-Checkliste im ICF Format
              <ExternalLink className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            </a>
        </div>
      </div>
    </div>
  );
}
