import Link from "next/link";
import { Plus } from "lucide-react";

import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

type R1NewApplicationTileProps = {
  /** Kartenlayout: volle Sidebar-Höhe; Tabellenlayout: kompakter Kasten. */
  layout?: "cards" | "table";
  className?: string;
};

/** Figma «Neuer Antrag erstellen» — gestrichelter Kasten. */
export function R1NewApplicationTile({
  layout = "cards",
  className,
}: R1NewApplicationTileProps) {
  const isCardsLayout = layout === "cards";

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl bg-stone-50 p-6",
        isCardsLayout ? "h-[93px]" : "min-h-[93px]",
        className,
      )}
    >
      <Link
        href="/portal/antragserstellung?new=1"
        className={cn(
          "flex h-full min-h-[45px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-stone-400",
          "bg-background px-4 py-2 shadow-xs transition-colors hover:bg-stone-50",
        )}
      >
        <Plus className="size-4 shrink-0 text-foreground" strokeWidth={1.75} aria-hidden />
        <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
          Neuer Antrag erstellen
        </span>
      </Link>
    </div>
  );
}
