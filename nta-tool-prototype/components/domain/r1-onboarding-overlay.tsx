"use client";

import { Check, X } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Onboarding-Overlay über Step 1 der R1-Antragserstellung (Figma `6359:36452`).
 * Vier Karten erklären die Prozessphasen; Navigation über «Zurück» / «Weiter»,
 * letzte Karte startet die Antragstellung. Schliessen oben rechts.
 */

type PhaseNode = {
  label: string;
  /** Hintergrund + Textfarbe, wenn dieser Knoten der aktive Schritt ist. */
  activeCircleClass: string;
  activeTextClass: string;
};

/** Die vier Prozessphasen im Stepper (Figma `6359:36924`). */
const PHASE_NODES: readonly PhaseNode[] = [
  {
    label: "Beratung & Empfehlung",
    activeCircleClass: "bg-consultation-surface",
    activeTextClass: "text-consultation-accent",
  },
  {
    label: "In Review",
    activeCircleClass: "bg-beratung-100",
    activeTextClass: "text-beratung-800",
  },
  {
    label: "Anpassung erforderlich",
    activeCircleClass: "bg-adjustment-100",
    activeTextClass: "text-adjustment-600",
  },
  {
    label: "In Entscheid",
    activeCircleClass: "bg-in-decision-100",
    activeTextClass: "text-[#5b21b6]",
  },
] as const;

type OnboardingStep = {
  badgeClass: string;
  badgeLabel: string;
  title: string;
  paragraphs: readonly string[];
  /** Index des aktiven Knotens im Stepper. */
  activeNodeIndex: number;
};

const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    badgeClass: "bg-consultation-surface text-consultation-accent",
    badgeLabel: "Beratung & Empfehlung",
    title: "Beratung & Empfehlung",
    paragraphs: [
      "Sie geben ihre persönlichen Angaben an, laden Ihr fachärztliches Attest hoch und wählen einen Beratungstermin mit der Fachstelle.",
      "Nach dem Gespräch verfasst die Fachstelle ein Empfehlungsschreiben. Sobald es freigegeben ist, können Sie Ihren Antrag vollständig ausfüllen und einreichen.",
    ],
    activeNodeIndex: 0,
  },
  {
    badgeClass: "bg-beratung-100 text-beratung-500",
    badgeLabel: "In Review",
    title: "In Review",
    paragraphs: [
      "Nachdem Sie Ihren Antrag vollständig eingereicht haben, prüft die zentrale Beratungs- und Fachstelle diesen. Bei Bedarf werden Sie zur Anpassung kontaktiert.",
    ],
    activeNodeIndex: 1,
  },
  {
    badgeClass: "bg-adjustment-100 text-adjustment-500",
    badgeLabel: "Anpassung erforderlich",
    title: "Anpassung erforderlich",
    paragraphs: [
      "Sollte die Fachstelle notwendige Nachbesserungen feststellen, werden Sie kontaktiert. Nehmen Sie die markierten Anpassungen vor und reichen Sie den Antrag erneut ein.",
    ],
    activeNodeIndex: 2,
  },
  {
    badgeClass: "bg-in-decision-100 text-in-decision-500",
    badgeLabel: "In Entscheid",
    title: "In Entscheid",
    paragraphs: [
      "Die zuständige Instanz prüft Ihren Antrag und erstellt eine Verfügung. Sie werden per E-Mail informiert, sobald es Neuigkeiten gibt und Ihre Verfügung als PDF zum Download bereit steht.",
    ],
    activeNodeIndex: 3,
  },
] as const;

type StepNodeState = "completed" | "active" | "upcoming";

function StepperNode({
  node,
  index,
  state,
}: {
  node: PhaseNode;
  index: number;
  state: StepNodeState;
}) {
  // Feste Knotenbreite 88px (= 40px Kreis + 2×24px) hält den Abstand Kreis ↔
  // Dashed Line konstant bei 24px; Kreis und Label sind beide zentriert.
  return (
    <div className="flex w-[88px] shrink-0 flex-col items-center gap-2">
      {state === "completed" ? (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-stone-100">
          <Check className="size-5 text-muted-foreground" strokeWidth={2.5} aria-hidden />
        </span>
      ) : (
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            state === "active" ? node.activeCircleClass : "bg-stone-150",
          )}
        >
          <span
            className={cn(
              "text-hf-paragraph-small-medium",
              state === "active" ? node.activeTextClass : "text-muted-foreground",
            )}
          >
            {index + 1}
          </span>
        </span>
      )}
      <span
        className={cn(
          "w-full text-center text-hf-paragraph-mini-medium",
          state === "active" ? node.activeTextClass : "text-muted-foreground",
        )}
      >
        {node.label}
      </span>
    </div>
  );
}

type R1OnboardingOverlayProps = {
  open: boolean;
  /** Schliessen über «Schliessen»/X — Onboarding abbrechen. */
  onClose: () => void;
  /** Letzte Karte «Antragstellung beginnen». */
  onComplete?: () => void;
};

export function R1OnboardingOverlay({
  open,
  onClose,
  onComplete,
}: R1OnboardingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const step = ONBOARDING_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete?.();
      return;
    }
    setStepIndex((index) => Math.min(index + 1, ONBOARDING_STEPS.length - 1));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-100/70 p-4 backdrop-blur-[8px]"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding Antragstellung"
    >
      <div className="flex w-full max-w-[800px] flex-col gap-8 rounded-xl border border-border bg-white p-8 shadow-lg">
        {/* Header: Status-Badge + Schliessen */}
        <div className="flex w-full items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-hf-paragraph-mini-medium",
              step.badgeClass,
            )}
          >
            {step.badgeLabel}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-4 py-2 text-foreground-alt transition-colors hover:bg-stone-100"
          >
            <span className="text-hf-paragraph-small-medium">Schliessen</span>
            <X className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          </button>
        </div>

        {/* Stepper über die vier Prozessphasen — Knoten 88px breit (Kreis
            zentriert über Label), Dashed Line startet bündig am Knotenrand →
            24px Abstand Kreis ↔ Linie. Rand-Knoten halten so das Card-Padding. */}
        <div className="flex w-full items-start">
          {PHASE_NODES.map((node, index) => {
            const state: StepNodeState =
              index < step.activeNodeIndex
                ? "completed"
                : index === step.activeNodeIndex
                  ? "active"
                  : "upcoming";
            return (
              <Fragment key={node.label}>
                <StepperNode node={node} index={index} state={state} />
                {index < PHASE_NODES.length - 1 ? (
                  <div className="flex h-10 min-w-0 flex-1 items-center" aria-hidden>
                    <div className="h-0 w-full border-t border-dashed border-stone-300" />
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </div>

        {/* Titel + Beschreibung */}
        <div className="flex w-full flex-col gap-2 pt-2">
          <p className="text-hf-paragraph-large-medium text-black">{step.title}</p>
          <div className="flex flex-col gap-3.5">
            {step.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="text-hf-paragraph-small text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div
          className={cn(
            "flex w-full items-center",
            isFirst ? "justify-end" : "justify-between",
          )}
        >
          {!isFirst ? (
            <button
              type="button"
              onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-stone-100 px-4 py-2 text-hf-paragraph-small-medium text-foreground transition-colors hover:bg-stone-200"
            >
              Zurück
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-hf-paragraph-small-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {isLast ? "Antragstellung beginnen" : "Weiter"}
          </button>
        </div>
      </div>
    </div>
  );
}
