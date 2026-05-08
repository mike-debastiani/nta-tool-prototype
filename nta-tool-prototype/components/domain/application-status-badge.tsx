import { cn } from "@/lib/utils";
import {
  getApplicationStatusMeta,
  type StatusAudience,
  type StatusDerivationInput,
} from "@/lib/application-status";

type ApplicationStatusBadgeProps = {
  application: StatusDerivationInput;
  audience?: StatusAudience;
  className?: string;
};

export function ApplicationStatusBadge({
  application,
  audience = "R1",
  className,
}: ApplicationStatusBadgeProps) {
  const statusMeta = getApplicationStatusMeta(application, audience);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-xs leading-4 font-semibold",
        statusMeta.className,
        className,
      )}
    >
      {statusMeta.label}
    </span>
  );
}
