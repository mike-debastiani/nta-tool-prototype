"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  type ComponentProps,
} from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type AutoGrowTextareaProps = ComponentProps<typeof Textarea>;

/** Textarea die mit dem Inhalt mitwächst (min. eine Zeile). */
export function AutoGrowTextarea({
  className,
  onChange,
  value,
  rows = 1,
  ...props
}: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const minPx = parseFloat(getComputedStyle(el).minHeight) || 20;
    el.style.height = "0px";
    el.style.height = `${Math.max(el.scrollHeight, minPx)}px`;
  }, []);

  useLayoutEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  return (
    <Textarea
      ref={ref}
      rows={rows}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        requestAnimationFrame(syncHeight);
      }}
      className={cn(
        "min-h-8 resize-none overflow-hidden py-1.5 leading-5 field-sizing-content",
        className,
      )}
      {...props}
    />
  );
}
