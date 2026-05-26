import { getApplicationStatusMeta, type StatusDerivationInput } from "@/lib/application-status";
import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

type R1ApplicationStatusPillProps = {
  application: StatusDerivationInput;
  className?: string;
};

/** Status-Pill für R1 Home (Karten + Tabelle) — Status-Farben müssen zuletzt in `cn` stehen. */
export function R1ApplicationStatusPill({
  application,
  className,
}: R1ApplicationStatusPillProps) {
  const statusMeta = getApplicationStatusMeta(application, "R1");

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg px-2 py-0.5",
        hfTypography.paragraphMiniMedium,
        "font-medium",
        statusMeta.className,
        className,
      )}
    >
      {statusMeta.label}
    </span>
  );
}
