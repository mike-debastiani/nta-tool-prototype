import { cn } from "@/lib/utils";

/** Titel + Beschreibung innerhalb eines Feldes (4px zwischen den Zeilen). */
export const r1FlowFieldLabelGroupClassName = "flex flex-col gap-1";

/** Ein Feld ohne Beschreibung: Label → Control, 4px. */
export const r1FlowFieldClassName = "flex flex-col gap-1";

/** Ein Feld mit Beschreibungsblock: Block → Control, 12px. */
export const r1FlowFieldDescribedClassName = "flex flex-col gap-3";

/** Control + Fehlertext innerhalb eines beschriebenen Feldes. */
export const r1FlowFieldControlClassName = "flex w-full flex-col gap-1";

/** 20px zwischen Feldzeilen (Label+Input-Blöcken). */
export const r1FlowFieldStackClassName = "flex flex-col gap-5";

/** 40px zwischen Blöcken im Kapitel «Antragsdefinition» (Ausnahme). */
export const r1FlowFieldStackDefinitionClassName = "flex flex-col gap-10";

/** 20px zwischen Spalten/Zeilen in einer 2-Spalten-Reihe. */
export const r1FlowFieldRowClassName = "grid gap-5 lg:grid-cols-2 lg:gap-x-6";

/** 8px zwischen Optionen innerhalb eines Feldes (z. B. Radio-Karten). */
export const r1FlowFieldOptionsClassName = "flex w-full flex-col gap-2";

/** Checkbox-/Massnahmen-Karte im R1-Formular (Figma: 10px Radius, Primary-Rahmen wenn aktiv). */
export function r1FlowChoiceCardClassName(selected: boolean): string {
  return cn(
    "flex w-full cursor-pointer items-center gap-3 rounded-[10px] border bg-card px-3 py-3 text-sm transition-colors",
    selected ? "border-foreground" : "border-border",
  );
}

/** Eingabefeld innerhalb einer Choice-Karte — ohne eigenen Rahmen. */
export const r1FlowInputClassName =
  "border-0 bg-transparent px-0 shadow-none focus-visible:border-0 focus-visible:ring-0";

/** Select-/Combobox-Trigger im R1-Step-1-Formular. */
export const r1FlowSelectTriggerClassName = cn(
  "flex w-full min-w-0 items-center gap-1.5 rounded-md border border-neutral-300 bg-background px-2.5 text-sm shadow-xs transition-[color,box-shadow] outline-none",
  "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:border-neutral-600",
);
