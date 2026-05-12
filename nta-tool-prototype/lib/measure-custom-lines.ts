import type { ApplicationDefinitionData } from "@/lib/test-flow-types";

/** Non-empty trimmed lines for validation / persistence. */
export function compactMeasureOtherLines(
  lines: string[] | undefined | null,
): string[] {
  return (lines ?? []).map((s) => s.trim()).filter(Boolean);
}

export function hasMeasureOtherSelection(
  lines: string[] | undefined | null,
): boolean {
  return compactMeasureOtherLines(lines).length > 0;
}

/**
 * Invariant: optional trailing empty slot so another measure can be typed.
 * If the last row has text, an empty row is appended below (Figma: new empty field under filled rows).
 */
export function normalizeMeasureOtherInputLines(
  lines: string[] | undefined | null,
): string[] {
  if (lines == null || lines.length === 0) return [""];
  const out = [...lines];
  while (
    out.length > 1
    && out[out.length - 1] === ""
    && out[out.length - 2] === ""
  ) {
    out.pop();
  }
  const last = out[out.length - 1];
  if (last.trim() !== "") out.push("");
  return out;
}

export function persistMeasureOtherLines(
  lines: string[] | undefined | null,
): string[] | undefined {
  const c = compactMeasureOtherLines(lines);
  return c.length ? c : undefined;
}

function legacyOtherLines(
  enabled: boolean | undefined,
  text: string | undefined,
  explicitLines: string[] | undefined,
): string[] {
  const fromNew = (explicitLines ?? []).filter((t) => t.trim());
  if (fromNew.length > 0) return normalizeMeasureOtherInputLines(fromNew);
  const t = text?.trim();
  if (!t) return [""];
  if (enabled === false) return [""];
  return normalizeMeasureOtherInputLines([t]);
}

export function lectureOtherLinesFromDefinition(
  def: ApplicationDefinitionData | undefined,
): string[] {
  return legacyOtherLines(
    def?.lectureOtherEnabled,
    def?.lectureOtherText,
    def?.lectureOtherLines,
  );
}

export function assessmentOtherLinesFromDefinition(
  def: ApplicationDefinitionData | undefined,
): string[] {
  return legacyOtherLines(
    def?.assessmentOtherEnabled,
    def?.assessmentOtherText,
    def?.assessmentOtherLines,
  );
}

export function definitionShowsLectureCustomMeasures(
  def?: ApplicationDefinitionData,
): boolean {
  if ((def?.lectureOtherLines ?? []).some((t) => t.trim())) return true;
  return Boolean(def?.lectureOtherEnabled && def?.lectureOtherText?.trim());
}

export function definitionShowsAssessmentCustomMeasures(
  def?: ApplicationDefinitionData,
): boolean {
  if ((def?.assessmentOtherLines ?? []).some((t) => t.trim())) return true;
  return Boolean(def?.assessmentOtherEnabled && def?.assessmentOtherText?.trim());
}
