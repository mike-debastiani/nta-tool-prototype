"use client";

import { LayoutGrid, Table } from "lucide-react";

import { cn } from "@/lib/utils";

export type R1ApplicationsViewMode = "cards" | "table";

type R1ApplicationsViewToggleProps = {
  value: R1ApplicationsViewMode;
  onChange: (mode: R1ApplicationsViewMode) => void;
};

/** Figma `5826:3087` — Karten- / Tabellenansicht. */
export function R1ApplicationsViewToggle({
  value,
  onChange,
}: R1ApplicationsViewToggleProps) {
  return (
    <div className="flex shrink-0 items-center" role="group" aria-label="Darstellung">
      <button
        type="button"
        onClick={() => onChange("cards")}
        className={cn(
          "flex size-10 items-center justify-center rounded-l-lg transition-colors",
          value === "cards"
            ? "bg-primary text-primary-foreground hover:bg-stone-600"
            : "bg-black/5 text-foreground hover:bg-black/10",
        )}
        aria-pressed={value === "cards"}
        aria-label="Kartenansicht"
      >
        <LayoutGrid className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={cn(
          "flex size-10 items-center justify-center rounded-r-lg transition-colors",
          value === "table"
            ? "bg-primary text-primary-foreground hover:bg-stone-600"
            : "bg-black/5 text-foreground hover:bg-black/10",
        )}
        aria-pressed={value === "table"}
        aria-label="Tabellenansicht"
      >
        <Table className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
