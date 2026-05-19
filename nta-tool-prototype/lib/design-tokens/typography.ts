/**
 * High Fidelity typography class bundles (Figma node 310:257309).
 * Prefer these over ad-hoc `text-lg font-medium` when touching HF screens.
 */
export const hfTypography = {
  h1: "text-hf-h1 text-foreground",
  h2: "text-hf-h2 text-foreground",
  h3: "text-hf-h3 text-foreground",
  h4: "text-hf-h4 text-foreground",
  monospaced: "text-hf-monospaced text-foreground-alt",
  paragraphLarge: "text-hf-paragraph-large text-foreground-alt",
  paragraphLargeMedium: "text-hf-paragraph-large-medium text-foreground-alt",
  paragraphLargeBold: "text-hf-paragraph-large-bold text-foreground-alt",
  paragraphRegular: "text-hf-paragraph-regular text-foreground-alt",
  paragraphMedium: "text-hf-paragraph-medium text-foreground-alt",
  paragraphBold: "text-hf-paragraph-bold text-foreground-alt",
  paragraphSmall: "text-hf-paragraph-small text-foreground-alt",
  paragraphSmallMedium: "text-hf-paragraph-small-medium text-foreground-alt",
  paragraphSmallBold: "text-hf-paragraph-small-bold text-foreground-alt",
  paragraphMini: "text-hf-paragraph-mini text-foreground-alt",
  paragraphMiniMedium: "text-hf-paragraph-mini-medium text-foreground-alt",
  paragraphMiniBold: "text-hf-paragraph-mini-bold text-foreground-alt",
  caption: "text-hf-caption text-foreground-alt",
} as const;

/** Card / block titles in Review flows (Figma: paragraph large medium on foreground). */
export const hfBlockTitle = "text-hf-paragraph-large-medium text-foreground";

/** Default body copy on app shell. */
export const hfBody = "text-hf-paragraph-regular text-foreground";
