"use client";

import type { ComponentType, ReactNode } from "react";
import { hfStatusCalloutClasses } from "@/lib/design-tokens/status-badge-colors";
import { cn } from "@/lib/utils";

type ApplicationStatusCalloutProps = {
  /** Aus `getApplicationStatusMeta(…).className`. */
  badgeClassName: string;
  children: ReactNode;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** R4 read-only Kopie in der Review-Ansicht. */
  muted?: boolean;
  className?: string;
};

/** Status-Callout im Antrags-Header — Farben 1:1 wie Status-Badge. */
export function ApplicationStatusCallout({
  badgeClassName,
  children,
  icon: Icon,
  muted = false,
  className,
}: ApplicationStatusCalloutProps) {
  const styles = hfStatusCalloutClasses(badgeClassName, { muted });

  return (
    <div className={cn(styles.containerClass, className)}>
      <div className="flex gap-3 text-left">
        <div className="flex shrink-0 items-start pt-0.5">
          {Icon ? (
            <Icon className={styles.iconClass} strokeWidth={2} aria-hidden />
          ) : null}
        </div>
        <p className={styles.textClass}>{children}</p>
      </div>
    </div>
  );
}
