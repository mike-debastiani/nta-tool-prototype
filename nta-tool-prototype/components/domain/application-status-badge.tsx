import { cn } from "@/lib/utils";
import {
  type ApplicationStatus,
  statusBadgeClass,
  statusLabel,
} from "@/lib/application-status";

type ApplicationStatusBadgeProps = {
  status: ApplicationStatus;
  className?: string;
};

export function ApplicationStatusBadge({
  status,
  className,
}: ApplicationStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        statusBadgeClass[status],
        className,
      )}
    >
      {statusLabel[status]}
    </span>
  );
}
