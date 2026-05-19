import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import {
  hfGridCellClass,
  type HfGridSpan,
  type HfGridStart,
} from "@/lib/design-tokens/grid";
import { cn } from "@/lib/utils";

type HfPageGridProps = {
  children: ReactNode;
  className?: string;
  gridClassName?: string;
  as?: ElementType;
} & Omit<ComponentPropsWithoutRef<"div">, "children" | "className">;

/**
 * Page-level grid shell: Figma margins + 12 fluid columns.
 * Children should be `HfGridCell` (or `HfGridFree` for layout exceptions).
 */
export function HfPageGrid({
  children,
  className,
  gridClassName,
  as: Component = "div",
  ...props
}: HfPageGridProps) {
  const Root = Component as ElementType;

  return (
    <Root className={cn("hf-page-grid", className)} {...props}>
      <div className={cn("hf-grid", gridClassName)}>{children}</div>
    </Root>
  );
}

type HfGridCellProps = {
  children: ReactNode;
  className?: string;
  span?: HfGridSpan;
  start?: HfGridStart;
  /** Full row width below 1000px (responsive). */
  collapseBelowDesktop?: boolean;
  /** Inner layout is not forced to column grid (sidebars, split panes). */
  free?: boolean;
  as?: ElementType;
} & Omit<ComponentPropsWithoutRef<"div">, "children" | "className">;

/** Grid-aligned column span (default: full width / 12 columns). */
export function HfGridCell({
  children,
  className,
  span = 12,
  start,
  collapseBelowDesktop = false,
  free = false,
  as: Component = "div",
  ...props
}: HfGridCellProps) {
  const Root = Component as ElementType;

  return (
    <Root
      className={cn(
        hfGridCellClass({ span, start, collapseBelowDesktop, free }),
        className,
      )}
      {...props}
    >
      {children}
    </Root>
  );
}

type HfGridFreeProps = Omit<HfGridCellProps, "free">;

/**
 * Occupies grid columns but allows arbitrary inner layout (review split, sidebars).
 */
export function HfGridFree(props: HfGridFreeProps) {
  return <HfGridCell {...props} free />;
}
