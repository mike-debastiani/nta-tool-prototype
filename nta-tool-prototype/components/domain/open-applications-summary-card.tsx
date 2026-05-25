"use client";

import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AllApplicationsBucketId } from "@/lib/workspace-all-applications-stats";
import { hfTypography } from "@/lib/design-tokens/typography";
import {
  type OpenApplicationsBucketId,
  type OpenApplicationsStats,
} from "@/lib/workspace-open-applications-stats";
import { cn } from "@/lib/utils";

export type ApplicationsChartBucketId = OpenApplicationsBucketId | AllApplicationsBucketId;

export type ApplicationsChartStats = {
  total: number;
  buckets: { id: ApplicationsChartBucketId; value: number }[];
};

export type OpenApplicationsChartView = "vertical" | "pie" | "horizontal" | "combined";

const VIEW_OPTIONS: { value: OpenApplicationsChartView; label: string }[] = [
  { value: "vertical", label: "Vertikal" },
  { value: "pie", label: "Kreis" },
  { value: "horizontal", label: "Horizontal" },
  { value: "combined", label: "Kombiniert" },
];

const BUCKET_STYLES: Record<
  ApplicationsChartBucketId,
  { barClass: string; textClass: string; pieStrokeClass: string }
> = {
  in_review: {
    barClass: "bg-beratung-100",
    textClass: "text-beratung-500",
    pieStrokeClass: "stroke-beratung-100",
  },
  adjustment: {
    barClass: "bg-adjustment-200",
    textClass: "text-adjustment-600",
    pieStrokeClass: "stroke-adjustment-200",
  },
  in_decision: {
    barClass: "bg-in-decision-200",
    textClass: "text-in-decision-500",
    pieStrokeClass: "stroke-in-decision-200",
  },
  approved: {
    barClass: "bg-bewilligt-100",
    textClass: "text-bewilligt-700",
    pieStrokeClass: "stroke-bewilligt-100",
  },
  rejected: {
    barClass: "bg-abgelehnt-200",
    textClass: "text-abgelehnt-700",
    pieStrokeClass: "stroke-abgelehnt-200",
  },
};

/** 16px unter Header-Zeile (Titel + Icon) — `gap-4` am Card-Container. */
const HEADER_TO_CONTENT_GAP_CLASS = "gap-4";
const CHART_BAR_GAP_PX = 24;
const TOTAL_TO_CHART_GAP_PX = 64;
const BAR_VALUE_INSET_BOTTOM_PX = 16;
const BAR_VALUE_INSET_LEFT_PX = 16;
const COMBINED_VALUE_INSET_TOP_PX = 8;
/** Figma `rounded-xl` — Überlappung zwischen gestapelten Segmenten. */
const COMBINED_SEGMENT_OVERLAP_PX = 12;
const COMBINED_SEGMENT_MIN_HEIGHT_PX = 24;
const COMBINED_BORDER_RADIUS_PX = 12;

/**
 * Stapel unten → oben (Figma `5862:24126`).
 * z-index: unterstes Segment vorn, oberstes hinten.
 */
const COMBINED_STACK_BOTTOM_TO_TOP: {
  id: ApplicationsChartBucketId;
  zIndex: number;
}[] = [
  { id: "in_decision", zIndex: 30 },
  { id: "adjustment", zIndex: 20 },
  { id: "in_review", zIndex: 10 },
];

type OpenApplicationsSummaryCardProps = {
  stats: ApplicationsChartStats | OpenApplicationsStats;
  className?: string;
  /** Figma R4 `5948:27359`: «Alle Anträge». */
  title?: string;
  totalAriaLabel?: string;
  /** Einschränkung der Diagrammansichten (z. B. R4 nur Vertikal/Horizontal). */
  allowedViews?: OpenApplicationsChartView[];
  onHeaderIconClick?: () => void;
  headerIconAriaLabel?: string;
};

type CombinedSegmentLayout = {
  bucket: ApplicationsChartStats["buckets"][number];
  bottomPx: number;
  heightPx: number;
  zIndex: number;
};

function bucketStyle(id: ApplicationsChartBucketId) {
  return BUCKET_STYLES[id];
}

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
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      aria-label={ariaLabel}
    >
      <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

function ChartValueLabel({
  value,
  bucketId,
  className,
}: {
  value: number;
  bucketId: ApplicationsChartBucketId;
  className?: string;
}) {
  const styles = bucketStyle(bucketId);
  return (
    <span
      className={cn(
        hfTypography.paragraphLargeMedium,
        styles.textClass,
        "whitespace-nowrap",
        className,
      )}
    >
      {value}
    </span>
  );
}

function VerticalBarValue({
  value,
  bucketId,
}: {
  value: number;
  bucketId: ApplicationsChartBucketId;
}) {
  return (
    <div
      className="flex w-full justify-center"
      style={{ paddingBottom: BAR_VALUE_INSET_BOTTOM_PX }}
    >
      <ChartValueLabel value={value} bucketId={bucketId} />
    </div>
  );
}

function HorizontalBarValue({
  value,
  bucketId,
}: {
  value: number;
  bucketId: ApplicationsChartBucketId;
}) {
  return (
    <div
      className="flex h-full items-center"
      style={{ paddingLeft: BAR_VALUE_INSET_LEFT_PX }}
    >
      <ChartValueLabel value={value} bucketId={bucketId} />
    </div>
  );
}

function CombinedSegmentLabel({
  value,
  bucketId,
}: {
  value: number;
  bucketId: ApplicationsChartBucketId;
}) {
  return (
    <div
      className="pointer-events-none absolute right-0 left-0 flex justify-center"
      style={{ top: COMBINED_VALUE_INSET_TOP_PX }}
    >
      <ChartValueLabel value={value} bucketId={bucketId} />
    </div>
  );
}

function useChartAreaHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      setHeight(Math.max(0, Math.floor(element.getBoundingClientRect().height)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, height };
}

function computeCombinedSegmentLayout(
  buckets: ApplicationsChartStats["buckets"],
  chartHeightPx: number,
): CombinedSegmentLayout[] {
  const total = buckets.reduce((sum, bucket) => sum + bucket.value, 0);
  if (total <= 0 || chartHeightPx <= 0) return [];

  const segments = COMBINED_STACK_BOTTOM_TO_TOP.flatMap((layer) => {
    const bucket = buckets.find((item) => item.id === layer.id);
    if (!bucket || bucket.value <= 0) return [];
    return [{ ...layer, bucket }];
  });

  if (segments.length === 0) return [];

  const rawHeights = segments.map((segment) =>
    Math.max(
      Math.round((segment.bucket.value / total) * chartHeightPx),
      COMBINED_SEGMENT_MIN_HEIGHT_PX,
    ),
  );

  const overlapTotal = Math.max(0, segments.length - 1) * COMBINED_SEGMENT_OVERLAP_PX;
  const naturalStackHeight = rawHeights.reduce((sum, height) => sum + height, 0) - overlapTotal;
  const scale = naturalStackHeight > 0 ? chartHeightPx / naturalStackHeight : 1;

  const scaledHeights = rawHeights.map((height) =>
    Math.max(Math.round(height * scale), COMBINED_SEGMENT_MIN_HEIGHT_PX),
  );

  const positioned: CombinedSegmentLayout[] = [];
  let bottomPx = 0;

  segments.forEach((segment, index) => {
    const isTopSegment = index === segments.length - 1;
    const heightPx = isTopSegment
      ? Math.max(chartHeightPx - bottomPx, COMBINED_SEGMENT_MIN_HEIGHT_PX)
      : (scaledHeights[index] ?? COMBINED_SEGMENT_MIN_HEIGHT_PX);

    positioned.push({
      bucket: segment.bucket,
      bottomPx,
      heightPx,
      zIndex: segment.zIndex,
    });

    if (!isTopSegment) {
      bottomPx += heightPx - COMBINED_SEGMENT_OVERLAP_PX;
    }
  });

  return positioned;
}

function VerticalBarsChart({
  buckets,
}: {
  buckets: ApplicationsChartStats["buckets"];
}) {
  const max = Math.max(...buckets.map((bucket) => bucket.value), 1);

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 items-end"
      style={{ gap: CHART_BAR_GAP_PX }}
      aria-hidden
    >
      {buckets.map((bucket) => {
        const heightPct = (bucket.value / max) * 100;
        const styles = bucketStyle(bucket.id);
        return (
          <div key={bucket.id} className="flex h-full min-w-0 flex-1 items-end justify-center">
            <div
              className={cn(
                "flex w-full min-w-0 flex-col justify-end rounded-xl",
                styles.barClass,
              )}
              style={{
                height: `${Math.max(heightPct, bucket.value > 0 ? 12 : 0)}%`,
              }}
            >
              <VerticalBarValue value={bucket.value} bucketId={bucket.id} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBarsChart({
  buckets,
}: {
  buckets: ApplicationsChartStats["buckets"];
}) {
  const max = Math.max(...buckets.map((bucket) => bucket.value), 1);

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 flex-col justify-end"
      style={{ gap: CHART_BAR_GAP_PX }}
      aria-hidden
    >
      {buckets.map((bucket) => {
        const widthPct = (bucket.value / max) * 100;
        const styles = bucketStyle(bucket.id);
        return (
          <div key={bucket.id} className="flex min-h-0 flex-1 items-center">
            <div
              className={cn("flex h-full min-w-[58px] rounded-xl", styles.barClass)}
              style={{
                width: `${Math.max(widthPct, bucket.value > 0 ? 12 : 0)}%`,
              }}
            >
              <HorizontalBarValue value={bucket.value} bucketId={bucket.id} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CombinedBarsChart({
  buckets,
}: {
  buckets: ApplicationsChartStats["buckets"];
}) {
  const { ref, height: chartHeightPx } = useChartAreaHeight<HTMLDivElement>();

  const segments = useMemo(
    () => computeCombinedSegmentLayout(buckets, chartHeightPx),
    [buckets, chartHeightPx],
  );

  return (
    <div ref={ref} className="relative h-full min-h-0 w-full min-w-0" aria-hidden>
      {segments.map(({ bucket, bottomPx, heightPx, zIndex }) => {
        const styles = bucketStyle(bucket.id);
        return (
          <div
            key={bucket.id}
            className="absolute right-0 left-0"
            style={{
              bottom: bottomPx,
              height: heightPx,
              zIndex,
            }}
          >
            <div
              className={cn("relative h-full w-full", styles.barClass)}
              style={{ borderRadius: COMBINED_BORDER_RADIUS_PX }}
            >
              <CombinedSegmentLabel value={bucket.value} bucketId={bucket.id} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PieDonutChart({ buckets }: { buckets: ApplicationsChartStats["buckets"] }) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const { ref, height: areaHeight } = useChartAreaHeight<HTMLDivElement>();
  const size = Math.min(Math.max(areaHeight, 120), 200);
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    if (total <= 0) {
      return buckets.map((bucket) => ({
        bucket,
        dash: 0,
        offset: 0,
      }));
    }

    let cumulative = 0;
    return buckets.map((bucket) => {
      const fraction = bucket.value / total;
      const dash = fraction * circumference;
      const offset = -cumulative;
      cumulative += dash;
      return { bucket, dash, offset };
    });
  }, [buckets, circumference, total]);

  return (
    <div
      ref={ref}
      className="flex h-full min-h-0 w-full items-center justify-center"
      aria-hidden
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {total <= 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              className="text-stone-200"
            />
          ) : (
            segments.map(({ bucket, dash, offset }) => (
              <circle
                key={bucket.id}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                className={bucketStyle(bucket.id).pieStrokeClass}
                strokeLinecap="butt"
              />
            ))
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center gap-3 px-4">
          {buckets.map((bucket) => (
            <ChartValueLabel key={bucket.id} value={bucket.value} bucketId={bucket.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ViewSelect({
  value,
  onValueChange,
  options,
}: {
  value: OpenApplicationsChartView;
  onValueChange: (value: OpenApplicationsChartView) => void;
  options: { value: OpenApplicationsChartView; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as OpenApplicationsChartView)}>
      <SelectTrigger
        className={cn(
          "h-auto gap-2 rounded-full border-border bg-transparent px-4 py-2 shadow-none",
          hfTypography.paragraphSmallMedium,
          "text-foreground [&>svg:last-child]:hidden",
        )}
        aria-label="Diagrammansicht wählen"
      >
        <ChevronDown className="size-4 shrink-0 text-foreground" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Figma `5862:24056` ff. — «Offene Antragsverfahren» / R4 «Alle Anträge» mit Ansicht-Dropdown. */
export function OpenApplicationsSummaryCard({
  stats,
  className,
  title = "Offene Antragsverfahren",
  totalAriaLabel,
  allowedViews,
  onHeaderIconClick,
  headerIconAriaLabel,
}: OpenApplicationsSummaryCardProps) {
  const viewOptions = useMemo(
    () =>
      allowedViews
        ? VIEW_OPTIONS.filter((option) => allowedViews.includes(option.value))
        : VIEW_OPTIONS,
    [allowedViews],
  );
  const defaultView = viewOptions[0]?.value ?? "vertical";
  const [view, setView] = useState<OpenApplicationsChartView>(defaultView);
  const displayBuckets = stats.buckets;
  const resolvedView = viewOptions.some((option) => option.value === view)
    ? view
    : defaultView;
  const totalLabel =
    totalAriaLabel ?? `${stats.total} ${title.toLowerCase()}`;

  return (
    <div
      className={cn(
        "flex min-h-[220px] min-w-0 flex-col rounded-xl bg-stone-50 p-6",
        HEADER_TO_CONTENT_GAP_CLASS,
        className,
      )}
      data-node-id="5862:24056"
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>
          {title}
        </p>
        <PrimaryIconLinkButton
          onClick={onHeaderIconClick}
          ariaLabel={headerIconAriaLabel}
        />
      </div>

      <div
        className="flex min-h-0 flex-1 items-stretch"
        style={{ gap: TOTAL_TO_CHART_GAP_PX }}
      >
        <div className="flex h-full min-w-0 shrink-0 flex-col justify-between self-stretch">
          <ViewSelect
            value={resolvedView}
            onValueChange={setView}
            options={viewOptions}
          />
          <p
            className="text-[128px] font-semibold leading-none tracking-tight text-foreground"
            aria-label={totalLabel}
          >
            {stats.total}
          </p>
        </div>

        <div className="flex h-full min-h-0 min-w-0 flex-1 items-stretch">
          {resolvedView === "vertical" ? <VerticalBarsChart buckets={displayBuckets} /> : null}
          {resolvedView === "horizontal" ? (
            <HorizontalBarsChart buckets={displayBuckets} />
          ) : null}
          {resolvedView === "combined" ? <CombinedBarsChart buckets={displayBuckets} /> : null}
          {resolvedView === "pie" ? <PieDonutChart buckets={displayBuckets} /> : null}
        </div>
      </div>
    </div>
  );
}
