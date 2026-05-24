import { R1InformationPanel } from "@/components/domain/r1-information-panel";
import { R1NewApplicationTile } from "@/components/domain/r1-new-application-tile";
import { cn } from "@/lib/utils";

type R1DashboardUtilityColumnProps = {
  className?: string;
};

/**
 * Figma `5792:22057` — «Neuer Antrag erstellen» + «Informationen» gestapelt
 * (zwei stone-50-Flächen, eine Grid-Zelle am Ende der Kartenliste).
 */
export function R1DashboardUtilityColumn({ className }: R1DashboardUtilityColumnProps) {
  return (
    <div
      className={cn("flex min-w-0 w-full flex-col gap-6 self-start", className)}
      data-node-id="5792:22057"
    >
      <R1NewApplicationTile layout="cards" />
      <R1InformationPanel />
    </div>
  );
}
