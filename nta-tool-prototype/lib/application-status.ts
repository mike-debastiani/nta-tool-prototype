export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "needs_correction"
  | "approved"
  | "rejected"
  | "in_implementation";

export const statusLabel: Record<ApplicationStatus, string> = {
  draft: "Entwurf",
  submitted: "Uebermittelt",
  in_review: "In Review",
  needs_correction: "Nachbesserung noetig",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  in_implementation: "In Umsetzung",
};

export const statusBadgeClass: Record<ApplicationStatus, string> = {
  draft: "border-zinc-200 bg-zinc-100 text-zinc-700",
  submitted: "border-sky-200 bg-sky-100 text-sky-700",
  in_review: "border-amber-200 bg-amber-100 text-amber-700",
  needs_correction: "border-orange-200 bg-orange-100 text-orange-700",
  approved: "border-emerald-200 bg-emerald-100 text-emerald-700",
  rejected: "border-rose-200 bg-rose-100 text-rose-700",
  in_implementation: "border-indigo-200 bg-indigo-100 text-indigo-700",
};
