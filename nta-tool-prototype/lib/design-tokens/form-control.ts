import { cn } from "@/lib/utils";

/**
 * Focus highlight for regular text fields — matches R1 Step 1 «Persönliche Angaben»
 * (`Input` / `Textarea` / `SelectTrigger`).
 */
export const formControlFocusVisibleClass =
  "outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Wrapper triggers (e.g. R1 Studiengang combobox shell). */
export const formControlFocusWithinClass =
  "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50";

export const formControlInvalidRingClass =
  "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

/** Native `<input>` / `<textarea>` outside shadcn primitives. */
export const formControlNativeFieldClass = cn(
  "transition-[color,box-shadow] outline-none shadow-xs",
  formControlFocusVisibleClass,
  formControlInvalidRingClass,
);
