import {
  APPLICATION_SCOPE_OPTIONS,
  ASSESSMENT_MEASURE_OPTIONS,
  LECTURE_MEASURE_OPTIONS,
} from "@/lib/application-review-labels";
import {
  definitionShowsAssessmentCustomMeasures,
  definitionShowsLectureCustomMeasures,
} from "@/lib/measure-custom-lines";
import {
  type ApplicationData,
  type ApplicationDefinitionData,
  type R4DecisionBlockSnapshot,
  type R4DecisionReview,
  type R4DecisionReviewBlockId,
  type R4DecisionRow,
} from "@/lib/test-flow-types";

export type R4RowBadge = "bewilligt" | "abgelehnt" | "vorschlag" | "vorschlagen";

export function r4RowBadge(row: R4DecisionRow): R4RowBadge {
  if (row.studentSelected && row.r4Approved) return "bewilligt";
  if (row.studentSelected && !row.r4Approved) return "abgelehnt";
  if (!row.studentSelected && row.r4Approved) return "vorschlag";
  return "vorschlagen";
}

function resolveOtherLines(def: ApplicationDefinitionData | undefined, kind: "lecture" | "assessment"): string[] {
  if (!def) return [];
  if (kind === "lecture") {
    const fromLines = (def.lectureOtherLines ?? []).map((t) => t.trim()).filter(Boolean);
    if (fromLines.length > 0) return fromLines;
    const legacy = def.lectureOtherText?.trim();
    if (legacy && def.lectureOtherEnabled !== false) return [legacy];
    return [];
  }
  const fromLines = (def.assessmentOtherLines ?? []).map((t) => t.trim()).filter(Boolean);
  if (fromLines.length > 0) return fromLines;
  const legacy = def.assessmentOtherText?.trim();
  if (legacy && def.assessmentOtherEnabled !== false) return [legacy];
  return [];
}

export function buildDurationRows(def: ApplicationDefinitionData | undefined): R4DecisionRow[] {
  const selected = def?.duration;
  const options: { key: "full_study" | "one_semester"; title: string; description: string }[] = [
    {
      key: "full_study",
      title: "Gesamte Studiendauer",
      description: "Der Ausgleich gilt für die gesamte Dauer des Studiums.",
    },
    {
      key: "one_semester",
      title: "Einmalig für ein Semester",
      description: "Der Ausgleich gilt für ein Semester; eine Verlängerung ist separat zu beantragen.",
    },
  ];
  return options.map((o) => ({
    key: o.key,
    title: o.title,
    description: o.description,
    studentSelected: selected === o.key,
    r4Approved: selected === o.key,
  }));
}

export function buildScopeRows(def: ApplicationDefinitionData | undefined): R4DecisionRow[] {
  const set = new Set(def?.scopeSelections ?? []);
  return APPLICATION_SCOPE_OPTIONS.map((label) => ({
    key: label,
    title: label,
    studentSelected: set.has(label),
    r4Approved: set.has(label),
  }));
}

export function buildLectureMeasureRows(def: ApplicationDefinitionData | undefined): R4DecisionRow[] {
  if (!def) return [];
  if (def.lectureMeasuresKeine) {
    return [
      {
        key: "__keine__",
        title: "Keine",
        description: "Keine Ausgleichsmassnahmen für Lehrveranstaltungen.",
        studentSelected: true,
        r4Approved: true,
      },
    ];
  }
  const selected = new Set(def.lectureMeasures ?? []);
  const rows: R4DecisionRow[] = LECTURE_MEASURE_OPTIONS.map((o) => ({
    key: o.key,
    title: o.title,
    description: o.description,
    studentSelected: selected.has(o.key),
    r4Approved: selected.has(o.key),
  }));
  const others = resolveOtherLines(def, "lecture");
  others.forEach((line, idx) => {
    rows.push({
      key: `other:lv:${idx}`,
      title: "Sonstige Massnahme",
      description: line,
      studentSelected: true,
      r4Approved: true,
    });
  });
  return rows;
}

export function buildAssessmentMeasureRows(def: ApplicationDefinitionData | undefined): R4DecisionRow[] {
  if (!def) return [];
  if (def.assessmentMeasuresKeine) {
    return [
      {
        key: "__keine__",
        title: "Keine",
        description: "Keine Ausgleichsmassnahmen für Leistungsnachweise.",
        studentSelected: true,
        r4Approved: true,
      },
    ];
  }
  const selected = new Set(def.assessmentMeasures ?? []);
  const rows: R4DecisionRow[] = ASSESSMENT_MEASURE_OPTIONS.map((o) => ({
    key: o.key,
    title: o.title,
    description: o.description,
    studentSelected: selected.has(o.key),
    r4Approved: selected.has(o.key),
  }));
  const others = resolveOtherLines(def, "assessment");
  others.forEach((line, idx) => {
    rows.push({
      key: `other:as:${idx}`,
      title: "Sonstige Massnahme",
      description: line,
      studentSelected: true,
      r4Approved: true,
    });
  });
  return rows;
}

function buildDefaultBlock(
  def: ApplicationDefinitionData | undefined,
  id: R4DecisionReviewBlockId,
): R4DecisionBlockSnapshot {
  const rows =
    id === "duration"
      ? buildDurationRows(def)
      : id === "scope"
        ? buildScopeRows(def)
        : id === "lectureMeasures"
          ? buildLectureMeasureRows(def)
          : buildAssessmentMeasureRows(def);
  return { confirmed: false, rows };
}

/** Merge persisted R4 snapshot with freshly derived row keys/titles from the application. */
export function mergeR4DecisionReview(data: ApplicationData): R4DecisionReview {
  const def = data.applicationDefinition;
  const persisted = data.r4DecisionReview;
  const ids: R4DecisionReviewBlockId[] = ["duration", "scope", "lectureMeasures", "assessmentMeasures"];
  const blocks: R4DecisionReview["blocks"] = {};

  for (const id of ids) {
    const fresh = buildDefaultBlock(def, id);
    const prev = persisted?.blocks?.[id];
    if (!prev?.rows?.length) {
      blocks[id] = fresh;
      continue;
    }
    const prevByKey = new Map(prev.rows.map((r) => [r.key, r]));
    const mergedRows = fresh.rows.map((fr) => {
      const p = prevByKey.get(fr.key);
      if (!p) return fr;
      return {
        ...fr,
        r4Approved: p.r4Approved,
      };
    });
    blocks[id] = {
      confirmed: prev.confirmed,
      rows: mergedRows,
    };
  }

  return {
    blocks,
    updatedAt: persisted?.updatedAt,
  };
}

/** Zeilen/Schalter oder Bestätigung weichen vom Baseline-Snapshot ab. */
export function isR4BlockDirty(
  block: R4DecisionBlockSnapshot | undefined,
  baseline: R4DecisionBlockSnapshot,
): boolean {
  if (!block) return false;
  return (
    block.confirmed !== baseline.confirmed
    || JSON.stringify(block.rows) !== JSON.stringify(baseline.rows)
  );
}

/**
 * Lokaler Block weicht vom rein serverseitigen Merge ab (`r4Approved` / `confirmed`).
 * Wichtig für Bewilligt/Abgelehnt: Nach Zurückdrehen auf die Studierenden-Wahl ist der Block
 * gegenüber dem Baseline nicht mehr „dirty“, während persist/refetch noch hinterherhinkt —
 * Vergleich zum Baseline allein würde den Overlay-Schutz fälschlich abschalten.
 */
export function localR4BlockDiffersFromServerMerge(
  localBlock: R4DecisionBlockSnapshot | undefined,
  serverBlock: R4DecisionBlockSnapshot | undefined,
): boolean {
  if (!localBlock || !serverBlock) return false;
  if (localBlock.confirmed !== serverBlock.confirmed) return true;
  const localByKey = new Map(localBlock.rows.map((r) => [r.key, r]));
  for (const sr of serverBlock.rows) {
    const lr = localByKey.get(sr.key);
    if (lr && lr.r4Approved !== sr.r4Approved) return true;
  }
  return false;
}

/**
 * Server-Snapshot einspielen, aber lokale R4-Schalter (`r4Approved` / `confirmed`) behalten,
 * solange der Block noch vom serverseitigen Merge abweicht — inkl. „wirkt wieder wie Baseline“,
 * solange die DB noch nicht dieselbe Kombination hat.
 */
export function mergeR4DecisionReviewRespectingLocalDirty(
  serverData: ApplicationData,
  localReview: R4DecisionReview,
): R4DecisionReview {
  const serverMerged = mergeR4DecisionReview(serverData);
  const ids: R4DecisionReviewBlockId[] = ["duration", "scope", "lectureMeasures", "assessmentMeasures"];
  const outBlocks: R4DecisionReview["blocks"] = { ...serverMerged.blocks };

  for (const id of ids) {
    const sBlock = outBlocks[id];
    const localBlock = localReview.blocks[id];
    if (!sBlock || !localBlock) continue;

    if (!localR4BlockDiffersFromServerMerge(localBlock, sBlock)) continue;

    const localByKey = new Map(localBlock.rows.map((r) => [r.key, r]));
    outBlocks[id] = {
      ...sBlock,
      confirmed: localBlock.confirmed,
      rows: sBlock.rows.map((sr) => {
        const lr = localByKey.get(sr.key);
        if (!lr) return sr;
        return { ...sr, r4Approved: lr.r4Approved };
      }),
    };
  }

  return {
    blocks: outBlocks,
    updatedAt: serverMerged.updatedAt,
  };
}

export type R4BlockVisibility = Record<R4DecisionReviewBlockId, boolean>;

export function getR4BlockVisibility(data: ApplicationData): R4BlockVisibility {
  const def = data.applicationDefinition;

  const hasText = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  const hasAny = (values: unknown[]) =>
    values.some((value) => (Array.isArray(value) ? value.length > 0 : hasText(value)));

  return {
    duration: Boolean(def?.duration),
    scope: Boolean(def?.scopeSelections?.length),
    lectureMeasures:
      Boolean(def?.lectureMeasures?.length)
      || Boolean(def?.lectureMeasuresKeine)
      || definitionShowsLectureCustomMeasures(def),
    assessmentMeasures:
      Boolean(def?.assessmentMeasures?.length)
      || Boolean(def?.assessmentMeasuresKeine)
      || definitionShowsAssessmentCustomMeasures(def),
  };
}

export function allVisibleR4BlocksConfirmed(
  review: R4DecisionReview,
  visibility: R4BlockVisibility,
): boolean {
  const ids: R4DecisionReviewBlockId[] = ["duration", "scope", "lectureMeasures", "assessmentMeasures"];
  return ids.every((id) => {
    if (!visibility[id]) return true;
    return review.blocks[id]?.confirmed === true;
  });
}

/**
 * Schreibt `r4DecisionReview` in `ApplicationData` — `blocks` pro Schlüssel mergen,
 * damit partielle Payloads nie andere Entscheid-Blöcke aus der DB-JSON löschen.
 */
export function mergeApplicationDataWithR4Review(
  base: ApplicationData,
  incoming: R4DecisionReview,
): ApplicationData {
  const prev: R4DecisionReview = base.r4DecisionReview ?? { blocks: {} };
  const mergedReview: R4DecisionReview = {
    ...prev,
    ...incoming,
    blocks: {
      ...(prev.blocks ?? {}),
      ...(incoming.blocks ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };
  return {
    ...base,
    r4DecisionReview: mergedReview,
  };
}
