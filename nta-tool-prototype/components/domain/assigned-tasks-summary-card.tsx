"use client";

import { ArrowUpRight } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import type { AssignedTaskBucket } from "@/lib/workspace-assigned-tasks-stats";
import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

const METRIC_FONT_MAX_PX = 64;
const METRIC_FONT_MIN_PX = 28;
const LABEL_FONT_MAX_PX = 16;
const LABEL_FONT_MIN_PX = 12;

type AssignedTasksSummaryCardProps = {
  buckets: AssignedTaskBucket[];
  className?: string;
};

function PrimaryIconLinkButton() {
  return (
    <button
      type="button"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      aria-label="Details öffnen"
    >
      <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

function AssignedTaskMetricItem({ bucket }: { bucket: AssignedTaskBucket }) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [metricFontPx, setMetricFontPx] = useState(METRIC_FONT_MAX_PX);
  const [labelFontPx, setLabelFontPx] = useState(LABEL_FONT_MAX_PX);

  useLayoutEffect(() => {
    const element = itemRef.current;
    if (!element) return;

    const updateSizes = () => {
      const height = element.clientHeight;
      const metricPx = Math.round(
        Math.min(METRIC_FONT_MAX_PX, Math.max(METRIC_FONT_MIN_PX, height * 0.42)),
      );
      const labelPx = Math.round(
        Math.min(LABEL_FONT_MAX_PX, Math.max(LABEL_FONT_MIN_PX, height * 0.12)),
      );
      setMetricFontPx(metricPx);
      setLabelFontPx(labelPx);
    };

    updateSizes();
    const observer = new ResizeObserver(updateSizes);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={itemRef}
      className={cn(
        "flex min-h-0 flex-1 flex-col justify-end rounded-xl p-4",
        bucket.surfaceClass,
      )}
    >
      <div className="flex flex-col items-start gap-3">
        <p
          className={cn("font-medium leading-none", bucket.labelClass)}
          style={{ fontSize: labelFontPx }}
        >
          {bucket.label}
        </p>
        <div className={cn("flex items-start gap-0.5", bucket.metricClass)}>
          <span
            className="font-semibold leading-none"
            style={{ fontSize: metricFontPx }}
          >
            {bucket.count}
          </span>
          {bucket.sinceLastLogin > 0 ? (
            <span
              className={cn(hfTypography.paragraphSmall, bucket.deltaClass)}
            >
              +{bucket.sinceLastLogin}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Figma `5483:11126` — «Zugewiesene Aufgaben» mit Echtdaten. */
export function AssignedTasksSummaryCard({ buckets, className }: AssignedTasksSummaryCardProps) {
  return (
    <div
      className={cn(
        "flex min-h-[220px] min-w-0 flex-col gap-4 rounded-xl bg-stone-50 p-6",
        className,
      )}
      data-node-id="5483:11126"
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>
          Zugewiesene Aufgaben
        </p>
        <PrimaryIconLinkButton />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {buckets.map((bucket) => (
          <AssignedTaskMetricItem key={bucket.id} bucket={bucket} />
        ))}
      </div>
    </div>
  );
}
