import type { ComponentType } from "react";
import { CircleCheck, CircleX } from "lucide-react";

import type { R4VerfuegungVariant } from "@/components/domain/r4-verfuegung-document";

/** Zielgruppe für Status-Callouts auf der ausgestellten Verfügung. */
export type IssuedVerfuegungCalloutAudience = "R1" | "R2" | "R4";

export type IssuedVerfuegungCalloutContent = {
  text: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

const R2_R4_APPROVED =
  "Der Antrag wurde bewilligt. Die folgende Verfügung wurde der antragstellenden Person übermittelt. Die bewilligten Angaben sind in der Verfügung festgehalten.";

const R2_R4_REJECTED =
  "Der Antrag wurde abgelehnt. Die Verfügung mit der Rechtsmittelbelehrung wurde der antragstellenden Person übermittelt. Die Begründung des Entscheids finden Sie unten auf dieser Seite.";

const R1_APPROVED =
  "Ihr Antrag auf Nachteilsausgleich wurde bewilligt. Die Verfügung mit den genehmigten Massnahmen finden Sie unten zum Download.";

const R1_REJECTED =
  "Ihr Antrag auf Nachteilsausgleich wurde abgelehnt. Die Verfügung mit der Rechtsmittelbelehrung steht unten zum Download bereit. Die Begründung des Entscheids finden Sie ebenfalls unten auf dieser Seite.";

export function getIssuedVerfuegungCallout(
  audience: IssuedVerfuegungCalloutAudience,
  variant: R4VerfuegungVariant,
): IssuedVerfuegungCalloutContent {
  if (variant === "rejected") {
    if (audience === "R1") {
      return { text: R1_REJECTED, icon: CircleX };
    }
    return { text: R2_R4_REJECTED, icon: CircleX };
  }

  if (audience === "R1") {
    return { text: R1_APPROVED, icon: CircleCheck };
  }
  return { text: R2_R4_APPROVED, icon: CircleCheck };
}
