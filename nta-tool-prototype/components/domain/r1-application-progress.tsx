import { Check, X } from "lucide-react";
import { Fragment } from "react";

import {
  R1_PROGRESS_PALETTE_CLASS,
  type R1ProgressStep,
} from "@/lib/r1-application-card-visual";
import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

type R1ApplicationProgressProps = {
  steps: R1ProgressStep[];
};

const STEP_COLUMN_WIDTH_CLASS: Record<number, string> = {
  0: "w-[78px]",
  1: "w-[70px]",
  2: "w-[70px]",
};

function ProgressConnector() {
  return (
    <div
      className="min-h-0 min-w-0 flex-1 border-t border-dashed border-stone-300"
      aria-hidden
    />
  );
}

function StepCircle({ step, index }: { step: R1ProgressStep; index: number }) {
  const palette = R1_PROGRESS_PALETTE_CLASS[step.palette];

  if (step.state === "completed") {
    if (step.palette === "bewilligt") {
      return (
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bewilligt-50"
          aria-hidden
        >
          <Check className="size-5 text-bewilligt-800" strokeWidth={2.5} />
        </div>
      );
    }

    return (
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-stone-150"
        aria-hidden
      >
        <Check className="size-5 text-muted-foreground" strokeWidth={2.5} />
      </div>
    );
  }

  if (step.state === "failed") {
    return (
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          palette.circle,
        )}
        aria-hidden
      >
        <X className="size-5 text-abgelehnt-600" strokeWidth={2.5} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center rounded-full",
        step.state === "active" ? palette.circle : "bg-stone-150 text-muted-foreground",
      )}
      aria-hidden
    >
      <span className={cn(hfTypography.paragraphSmallMedium, "leading-none")}>
        {index + 1}
      </span>
    </div>
  );
}

function stepLabelClass(step: R1ProgressStep): string {
  const palette = R1_PROGRESS_PALETTE_CLASS[step.palette];

  if (step.state === "active" || step.state === "failed") {
    return palette.label;
  }

  if (step.state === "completed" && step.palette === "bewilligt") {
    return "text-bewilligt-800";
  }

  return "text-muted-foreground";
}

/** Figma Fortschritt «In Review → In Entscheid → Verfügung». */
export function R1ApplicationProgress({ steps }: R1ApplicationProgressProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center">
        {steps.map((step, index) => (
          <Fragment key={`${step.id}-track`}>
            {index > 0 ? <ProgressConnector /> : null}
            <div
              className={cn(
                "flex shrink-0 justify-center",
                STEP_COLUMN_WIDTH_CLASS[index] ?? "w-[70px]",
                step.dimmed && "opacity-40",
              )}
            >
              <StepCircle step={step} index={index} />
            </div>
          </Fragment>
        ))}
      </div>

      <div className="flex w-full items-start">
        {steps.map((step, index) => (
          <Fragment key={`${step.id}-label`}>
            {index > 0 ? <div className="min-w-0 flex-1" aria-hidden /> : null}
            <div
              className={cn(
                "flex shrink-0 justify-center",
                STEP_COLUMN_WIDTH_CLASS[index] ?? "w-[70px]",
                step.dimmed && "opacity-40",
              )}
            >
              <p
                className={cn(
                  hfTypography.paragraphMiniMedium,
                  "text-center leading-4",
                  stepLabelClass(step),
                )}
              >
                {step.label}
              </p>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
