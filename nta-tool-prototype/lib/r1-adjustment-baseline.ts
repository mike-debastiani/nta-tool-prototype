import type { ReviewWorkspaceBlockId } from "@/lib/review-workspace-blocks";
import type { ApplicationData } from "@/lib/test-flow-types";

/** Eingereichter Block-Inhalt beim Weiterreichen mit Anpassungsanforderung. */
export type R1AdjustmentBlockBaseline = {
  personalData?: ApplicationData["personalData"];
  attestFiles?: ApplicationData["attestFiles"];
  applicationDefinition?: ApplicationData["applicationDefinition"];
};

function cloneDefinition(
  def: ApplicationData["applicationDefinition"],
): ApplicationData["applicationDefinition"] | undefined {
  if (!def) return undefined;
  return JSON.parse(JSON.stringify(def)) as ApplicationData["applicationDefinition"];
}

function captureBlockBaseline(
  data: ApplicationData,
  blockId: ReviewWorkspaceBlockId,
): R1AdjustmentBlockBaseline {
  const def = data.applicationDefinition;

  switch (blockId) {
    case "applicant":
      return {
        personalData: data.personalData
          ? { ...data.personalData }
          : undefined,
      };
    case "attest":
      return {
        attestFiles: data.attestFiles?.map((f) => ({ ...f })),
      };
    case "definition":
      return {
        applicationDefinition: def
          ? { situationDescription: def.situationDescription }
          : undefined,
      };
    case "duration":
      return {
        applicationDefinition: def ? { duration: def.duration } : undefined,
      };
    case "scope":
      return {
        applicationDefinition: def
          ? { scopeSelections: [...(def.scopeSelections ?? [])] }
          : undefined,
      };
    case "lectureMeasures":
      return {
        applicationDefinition: def
          ? cloneDefinition({
              lectureMeasures: [...(def.lectureMeasures ?? [])],
              lectureMeasuresKeine: def.lectureMeasuresKeine,
              lectureOtherLines: def.lectureOtherLines
                ? [...def.lectureOtherLines]
                : undefined,
              lectureOtherEnabled: def.lectureOtherEnabled,
              lectureOtherText: def.lectureOtherText,
            })
          : undefined,
      };
    case "assessmentMeasures":
      return {
        applicationDefinition: def
          ? cloneDefinition({
              assessmentMeasures: [...(def.assessmentMeasures ?? [])],
              assessmentMeasuresKeine: def.assessmentMeasuresKeine,
              assessmentOtherLines: def.assessmentOtherLines
                ? [...def.assessmentOtherLines]
                : undefined,
              assessmentOtherEnabled: def.assessmentOtherEnabled,
              assessmentOtherText: def.assessmentOtherText,
            })
          : undefined,
      };
    default:
      return {};
  }
}

/** Liest Baselines (neu unter `recommendation`, Fallback Root für Migration). */
export function readR1AdjustmentBlockBaselines(
  data: ApplicationData,
): Partial<Record<ReviewWorkspaceBlockId, R1AdjustmentBlockBaseline>> {
  return (
    data.recommendation?.r1AdjustmentBlockBaselines
    ?? data.r1AdjustmentBlockBaselines
    ?? {}
  );
}

export function captureAdjustmentBaselines(
  data: ApplicationData,
  blockIds: ReviewWorkspaceBlockId[],
): Partial<Record<ReviewWorkspaceBlockId, R1AdjustmentBlockBaseline>> {
  const out: Partial<Record<ReviewWorkspaceBlockId, R1AdjustmentBlockBaseline>> =
    {};
  for (const id of blockIds) {
    out[id] = captureBlockBaseline(data, id);
  }
  return out;
}

export function applyBaselineToData(
  data: ApplicationData,
  blockId: ReviewWorkspaceBlockId,
  baseline: R1AdjustmentBlockBaseline,
): ApplicationData {
  const next: ApplicationData = { ...data };

  if (blockId === "applicant" && baseline.personalData) {
    next.personalData = { ...baseline.personalData };
    return next;
  }

  if (blockId === "attest" && baseline.attestFiles) {
    next.attestFiles = baseline.attestFiles.map((f) => ({ ...f }));
    return next;
  }

  if (!baseline.applicationDefinition) return next;

  const base = { ...(next.applicationDefinition ?? {}) };
  const slice = baseline.applicationDefinition;

  if (blockId === "definition") {
    next.applicationDefinition = {
      ...base,
      situationDescription: slice.situationDescription,
    };
    return next;
  }

  if (blockId === "duration") {
    next.applicationDefinition = {
      ...base,
      duration: slice.duration,
    };
    return next;
  }

  if (blockId === "scope") {
    next.applicationDefinition = {
      ...base,
      scopeSelections: slice.scopeSelections
        ? [...slice.scopeSelections]
        : [],
    };
    return next;
  }

  if (blockId === "lectureMeasures") {
    const nextDef = { ...base };
    delete nextDef.lectureMeasures;
    delete nextDef.lectureMeasuresKeine;
    delete nextDef.lectureOtherLines;
    delete nextDef.lectureOtherEnabled;
    delete nextDef.lectureOtherText;
    if (slice.lectureMeasures) nextDef.lectureMeasures = [...slice.lectureMeasures];
    if (slice.lectureMeasuresKeine) nextDef.lectureMeasuresKeine = true;
    if (slice.lectureOtherLines) {
      nextDef.lectureOtherLines = [...slice.lectureOtherLines];
    }
    if (slice.lectureOtherEnabled !== undefined) {
      nextDef.lectureOtherEnabled = slice.lectureOtherEnabled;
    }
    if (slice.lectureOtherText !== undefined) {
      nextDef.lectureOtherText = slice.lectureOtherText;
    }
    next.applicationDefinition = nextDef;
    return next;
  }

  if (blockId === "assessmentMeasures") {
    const nextDef = { ...base };
    delete nextDef.assessmentMeasures;
    delete nextDef.assessmentMeasuresKeine;
    delete nextDef.assessmentOtherLines;
    delete nextDef.assessmentOtherEnabled;
    delete nextDef.assessmentOtherText;
    if (slice.assessmentMeasures) {
      nextDef.assessmentMeasures = [...slice.assessmentMeasures];
    }
    if (slice.assessmentMeasuresKeine) nextDef.assessmentMeasuresKeine = true;
    if (slice.assessmentOtherLines) {
      nextDef.assessmentOtherLines = [...slice.assessmentOtherLines];
    }
    if (slice.assessmentOtherEnabled !== undefined) {
      nextDef.assessmentOtherEnabled = slice.assessmentOtherEnabled;
    }
    if (slice.assessmentOtherText !== undefined) {
      nextDef.assessmentOtherText = slice.assessmentOtherText;
    }
    next.applicationDefinition = nextDef;
    return next;
  }

  return next;
}
