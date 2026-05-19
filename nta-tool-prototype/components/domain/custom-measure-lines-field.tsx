"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  normalizeMeasureOtherInputLines,
} from "@/lib/measure-custom-lines";
import {
  r1FlowChoiceCardClassName,
  r1FlowInputClassName,
} from "@/lib/design-tokens/r1-form";
import { cn } from "@/lib/utils";

type CustomMeasureLinesFieldProps = {
  idPrefix: string;
  lines: string[] | undefined;
  onChange: (next: string[]) => void;
  error?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export function CustomMeasureLinesField({
  idPrefix,
  lines,
  onChange,
  error,
  disabled,
  placeholder = "Weitere Massnahme definieren …",
}: CustomMeasureLinesFieldProps) {
  const rows = normalizeMeasureOtherInputLines(lines);

  const handleChange = (index: number, value: string) => {
    const next = [...rows];
    next[index] = value;
    onChange(normalizeMeasureOtherInputLines(next));
  };

  const handleRemove = (index: number) => {
    const filtered = rows.filter((_, i) => i !== index);
    onChange(normalizeMeasureOtherInputLines(filtered.length ? filtered : [""]));
  };

  return (
    <div className="flex w-full flex-col gap-2">
      {rows.map((line, index) => {
        const isTrailingEmptySlot =
          index === rows.length - 1 && line.trim() === "";
        const showRemove = !isTrailingEmptySlot;

        const inputId = `${idPrefix}-${index}`;
        const hasText = line.trim().length > 0;

        return (
          <div
            key={`${idPrefix}-row-${index}`}
            className={r1FlowChoiceCardClassName(hasText)}
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-primary"
              checked={hasText}
              disabled={disabled}
              onChange={(e) => {
                if (!e.target.checked) {
                  handleChange(index, "");
                  return;
                }
                if (!line.trim()) {
                  document.getElementById(inputId)?.focus();
                }
              }}
              aria-label={
                hasText
                  ? "Sonstige Massnahme ausgewählt"
                  : "Sonstige Massnahme hinzufügen"
              }
            />
            <Input
              id={inputId}
              value={line}
              disabled={disabled}
              onChange={(e) => handleChange(index, e.target.value)}
              placeholder={placeholder}
              className={cn(
                r1FlowInputClassName,
                "h-8 min-h-8 flex-1",
                error && isTrailingEmptySlot && "border-destructive",
              )}
              aria-invalid={Boolean(error && isTrailingEmptySlot)}
            />
            {showRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => handleRemove(index)}
                disabled={disabled}
                aria-label="Massnahme entfernen"
              >
                <X className="size-4" strokeWidth={2} aria-hidden />
              </Button>
            ) : (
              <span className="size-8 shrink-0" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}
