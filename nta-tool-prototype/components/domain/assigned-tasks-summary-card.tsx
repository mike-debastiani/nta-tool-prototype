"use client";

import { ArrowUpRight } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import type {
  AssignedTaskBucket,
  AssignedTaskBucketId,
} from "@/lib/workspace-assigned-tasks-stats";
import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

const METRIC_FONT_MAX_PX = 64;
const METRIC_FONT_MIN_PX = 28;
const LABEL_FONT_MAX_PX = 16;
const LABEL_FONT_MIN_PX = 12;

type AssignedTasksSummaryCardProps = {
  buckets: AssignedTaskBucket[];
  className?: string;
  onHeaderIconClick?: () => void;
  headerIconAriaLabel?: string;
  onBucketClick?: (bucketId: AssignedTaskBucketId) => void;
};

function PrimaryIconLinkButton({
  onClick,
  ariaLabel = "Details öffnen",
}: {
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-stone-600"
      aria-label={ariaLabel}
    >
      <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

function AssignedTaskMetricItem({
  bucket,
  onClick,
  singleBucketLayout = false,
}: {
  bucket: AssignedTaskBucket;
  onClick?: () => void;
  /** Figma `6582:27901` — ein Bucket (z. B. R4): Label oben, Zahl unten. */
  singleBucketLayout?: boolean;
}) {
  const itemRef = useRef<HTMLButtonElement>(null);
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

  const labelNode = (
    <p
      className={cn("font-medium leading-none", bucket.labelClass)}
      style={{ fontSize: labelFontPx }}
    >
      {bucket.label}
    </p>
  );

  const metricNode = (
    <div className={cn("flex items-start gap-0.5", bucket.metricClass)}>
      <span
        className={cn("font-semibold leading-none", bucket.metricClass)}
        style={{ fontSize: metricFontPx }}
      >
        {bucket.count}
      </span>
      {bucket.addedToday > 0 ? (
        <span
          className={cn(
            hfTypography.paragraphSmall,
            "pt-[4px] pl-[2px]",
            bucket.deltaClass,
          )}
          aria-label={`${bucket.addedToday} heute hinzugekommen`}
        >
          +{bucket.addedToday} heute
        </span>
      ) : null}
    </div>
  );

  return (
    <button
      type="button"
      ref={itemRef}
      className={cn(
        "flex min-h-0 flex-1 flex-col rounded-xl p-4 text-left",
        singleBucketLayout ? "justify-between" : "justify-end",
        onClick ? "cursor-pointer" : "cursor-default",
        bucket.surfaceClass,
      )}
      onClick={onClick}
      disabled={!onClick}
      aria-label={onClick ? `${bucket.label} filtern` : undefined}
    >
      {singleBucketLayout ? (
        <>
          {labelNode}
          {metricNode}
        </>
      ) : (
        <div className="flex flex-col items-start gap-3">
          {labelNode}
          {metricNode}
        </div>
      )}
    </button>
  );
}

/** Figma `5483:11126` — «Zugewiesene Aufgaben» mit Echtdaten. */
export function AssignedTasksSummaryCard({
  buckets,
  className,
  onHeaderIconClick,
  headerIconAriaLabel,
  onBucketClick,
}: AssignedTasksSummaryCardProps) {
  const singleBucketLayout = buckets.length === 1;

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
        <PrimaryIconLinkButton
          onClick={onHeaderIconClick}
          ariaLabel={headerIconAriaLabel}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {buckets.map((bucket) => (
          <AssignedTaskMetricItem
            key={bucket.id}
            bucket={bucket}
            singleBucketLayout={singleBucketLayout}
            onClick={onBucketClick ? () => onBucketClick(bucket.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
