import {
  Circle,
  Eye,
  File,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Save,
  Stethoscope,
  Trash2,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/** Inhaltlicher Zustand der Fortschrittszeile (ohne Auswahl/Hover). */
export type R1ProgressStepVisualState =
  | "available"
  | "complete"
  | "incomplete"
  | "locked-pre"
  | "locked-post";

export type R1ProgressLockedPlacement = "pre-divider" | "post-divider";

const R1_FLOW_ICONS = {
  user: User,
  stethoscope: Stethoscope,
  "message-circle": MessageCircle,
  file: File,
  eye: Eye,
  phone: Phone,
  mail: Mail,
  "trash-2": Trash2,
  "close-x": X,
  save: Save,
  loader: Loader2,
} as const;

export type R1FlowIconName = keyof typeof R1_FLOW_ICONS;

export type R1FlowStepIconName = Exclude<
  R1FlowIconName,
  "phone" | "mail" | "trash-2" | "close-x" | "loader"
>;

const ICON_BASE = "size-4 shrink-0";

type R1FlowIconProps = {
  name: R1FlowIconName;
  className?: string;
};

/** Lucide icons (shadcn) — fixed 16×16, no raster stretch. */
export function R1FlowIcon({ name, className }: R1FlowIconProps) {
  const Icon = R1_FLOW_ICONS[name] as LucideIcon;
  const merged = cn(ICON_BASE, className);

  if (name === "loader") {
    return (
      <Loader2
        className={cn(merged, "animate-spin")}
        strokeWidth={2}
        aria-hidden
      />
    );
  }

  return <Icon className={merged} strokeWidth={2} aria-hidden />;
}

export function r1FlowProgressContentClass(
  visualState: R1ProgressStepVisualState,
): string {
  switch (visualState) {
    case "complete":
      return "text-bewilligt-500";
    case "incomplete":
      return "text-abgelehnt-600";
    case "locked-pre":
      return "text-stone-400";
    case "locked-post":
      return "text-stone-250";
    case "available":
    default:
      return "text-primary";
  }
}

/** Statuspunkt rechts — bewilligt / abgelehnt bei complete / incomplete. */
export function R1FlowProgressTrailingIndicator({
  visualState,
}: {
  visualState: R1ProgressStepVisualState;
}) {
  switch (visualState) {
    case "complete":
      return (
        <span
          className="size-3.5 shrink-0 rounded-full bg-bewilligt-300"
          aria-hidden
        />
      );
    case "incomplete":
      return (
        <span
          className="size-3.5 shrink-0 rounded-full bg-abgelehnt-400"
          aria-hidden
        />
      );
    case "locked-pre":
      return (
        <Circle
          className={cn(ICON_BASE, "text-stone-400")}
          strokeWidth={2}
          aria-hidden
        />
      );
    case "locked-post":
      return (
        <Circle
          className={cn(ICON_BASE, "text-stone-250")}
          strokeWidth={2}
          aria-hidden
        />
      );
    case "available":
    default:
      return (
        <Circle
          className={cn(ICON_BASE, "text-primary")}
          strokeWidth={2}
          aria-hidden
        />
      );
  }
}
