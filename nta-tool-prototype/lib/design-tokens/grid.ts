/** Figma Desktop laptop grid (node 3017:288). */
export const HF_GRID = {
  columns: 12,
  marginPx: 48,
  gutterPx: 24,
  breakpointPx: 1000,
  minWidthPx: 1000,
  breakpoint: "xl" as const,
} as const;

export type HfGridSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type HfGridStart = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const spanClass: Record<HfGridSpan, string> = {
  1: "hf-col-span-1",
  2: "hf-col-span-2",
  3: "hf-col-span-3",
  4: "hf-col-span-4",
  5: "hf-col-span-5",
  6: "hf-col-span-6",
  7: "hf-col-span-7",
  8: "hf-col-span-8",
  9: "hf-col-span-9",
  10: "hf-col-span-10",
  11: "hf-col-span-11",
  12: "hf-col-span-12",
};

const startClass: Record<HfGridStart, string> = {
  1: "hf-col-start-1",
  2: "hf-col-start-2",
  3: "hf-col-start-3",
  4: "hf-col-start-4",
  5: "hf-col-start-5",
  6: "hf-col-start-6",
  7: "hf-col-start-7",
  8: "hf-col-start-8",
  9: "hf-col-start-9",
  10: "hf-col-start-10",
  11: "hf-col-start-11",
  12: "hf-col-start-12",
};

export function hfGridSpanClass(span: HfGridSpan): string {
  return spanClass[span];
}

export function hfGridStartClass(start: HfGridStart): string {
  return startClass[start];
}

export function hfGridCellClass(options: {
  span: HfGridSpan;
  start?: HfGridStart;
  collapseBelowDesktop?: boolean;
  free?: boolean;
}): string {
  const parts = [
    spanClass[options.span],
    options.start ? startClass[options.start] : null,
    options.collapseBelowDesktop ? "hf-col-collapse-below-desktop" : null,
    options.free ? "hf-grid-free" : null,
    "min-w-0",
  ];
  return parts.filter(Boolean).join(" ");
}
