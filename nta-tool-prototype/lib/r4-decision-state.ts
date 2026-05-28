import {
  APPLICATION_SCOPE_OPTIONS,
  ASSESSMENT_MEASURE_OPTIONS,
  LECTURE_MEASURE_OPTIONS,
} from "@/lib/application-review-labels";
import {
  definitionShowsAssessmentCustomMeasures,
  definitionShowsLectureCustomMeasures,
  persistMeasureOtherLines,
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

const R4_PROPOSAL_ROW_KEY_PREFIX = "proposal:";

export function isR4ProposalRowKey(key: string): boolean {
  return key.startsWith(R4_PROPOSAL_ROW_KEY_PREFIX);
}

/** Freitext-Vorschlag der Entscheidungsinstanz (Figma `5907:23378`). */
const LECTURE_MEASURE_KEYS = new Set(LECTURE_MEASURE_OPTIONS.map((o) => o.key));
const ASSESSMENT_MEASURE_KEYS = new Set(ASSESSMENT_MEASURE_OPTIONS.map((o) => o.key));

/** Freitext-Vorschläge nur bei Massnahmen-Blöcken (nicht Dauer / Geltungsbereich). */
export function supportsR4CustomProposalInput(
  blockId: R4DecisionReviewBlockId,
): boolean {
  return blockId === "lectureMeasures" || blockId === "assessmentMeasures";
}

export function createR4ProposalRow(text: string, key?: string): R4DecisionRow {
  const trimmed = text.trim();
  return {
    key: key ?? `${R4_PROPOSAL_ROW_KEY_PREFIX}${Date.now()}`,
    title: trimmed,
    studentSelected: false,
    r4Approved: true,
  };
}

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
    const freshKeys = new Set(fresh.rows.map((r) => r.key));
    const mergedRows = fresh.rows.map((fr) => {
      const p = prevByKey.get(fr.key);
      if (!p) return fr;
      return {
        ...fr,
        r4Approved: p.r4Approved,
      };
    });
    const proposalRows = prev.rows
      .filter((r) => isR4ProposalRowKey(r.key) && !freshKeys.has(r.key))
      .map((r) => ({ ...r }));
    blocks[id] = {
      confirmed: prev.confirmed,
      rows: [...mergedRows, ...proposalRows],
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
  for (const lr of localBlock.rows) {
    if (!serverBlock.rows.some((sr) => sr.key === lr.key)) {
      return true;
    }
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
    const serverKeys = new Set(sBlock.rows.map((r) => r.key));
    const mergedServerRows = sBlock.rows.map((sr) => {
      const lr = localByKey.get(sr.key);
      if (!lr) return sr;
      return { ...sr, r4Approved: lr.r4Approved };
    });
    const localProposalRows = localBlock.rows.filter(
      (r) => isR4ProposalRowKey(r.key) && !serverKeys.has(r.key),
    );
    outBlocks[id] = {
      ...sBlock,
      confirmed: localBlock.confirmed,
      rows: [...mergedServerRows, ...localProposalRows],
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
function materializeMeasureBlock(
  block: R4DecisionBlockSnapshot | undefined,
  validKeys: Set<string>,
  kind: "lecture" | "assessment",
  def: ApplicationDefinitionData,
): void {
  if (!block?.confirmed) return;

  const approved = block.rows.filter((r) => r.r4Approved);
  if (approved.some((r) => r.key === "__keine__")) {
    if (kind === "lecture") {
      def.lectureMeasuresKeine = true;
      def.lectureMeasures = [];
      delete def.lectureOtherLines;
      delete def.lectureOtherEnabled;
      delete def.lectureOtherText;
    } else {
      def.assessmentMeasuresKeine = true;
      def.assessmentMeasures = [];
      delete def.assessmentOtherLines;
      delete def.assessmentOtherEnabled;
      delete def.assessmentOtherText;
    }
    return;
  }

  const measureKeys: string[] = [];
  const otherTexts: string[] = [];

  for (const row of approved) {
    if (row.key === "__keine__") continue;
    if (isR4ProposalRowKey(row.key)) {
      const text = row.title.trim();
      if (text) otherTexts.push(text);
      continue;
    }
    if (row.key.startsWith("other:")) {
      const text = (row.description ?? row.title).trim();
      if (text) otherTexts.push(text);
      continue;
    }
    if (validKeys.has(row.key)) {
      measureKeys.push(row.key);
    }
  }

  const otherLines = persistMeasureOtherLines(otherTexts);

  if (kind === "lecture") {
    def.lectureMeasuresKeine = false;
    if (measureKeys.length) {
      def.lectureMeasures = measureKeys;
    } else {
      delete def.lectureMeasures;
    }
    if (otherLines) {
      def.lectureOtherLines = otherLines;
    } else {
      delete def.lectureOtherLines;
      delete def.lectureOtherEnabled;
      delete def.lectureOtherText;
    }
  } else {
    def.assessmentMeasuresKeine = false;
    if (measureKeys.length) {
      def.assessmentMeasures = measureKeys;
    } else {
      delete def.assessmentMeasures;
    }
    if (otherLines) {
      def.assessmentOtherLines = otherLines;
    } else {
      delete def.assessmentOtherLines;
      delete def.assessmentOtherEnabled;
      delete def.assessmentOtherText;
    }
  }
}

/**
 * Übernimmt bestätigte R4-Entscheide (inkl. Freitext-Vorschläge) in `applicationDefinition`,
 * damit bewilligte Anträge in Review-/Portal-Ansichten die genehmigten Massnahmen zeigen.
 */
export function materializeApprovedR4DecisionReview(
  data: ApplicationData,
): ApplicationData {
  const review = data.r4DecisionReview;
  if (!review?.blocks) return data;

  const def: ApplicationDefinitionData = {
    ...(data.applicationDefinition ?? {}),
  };

  const durationBlock = review.blocks.duration;
  if (durationBlock?.confirmed) {
    const approved = durationBlock.rows.find(
      (r) =>
        r.r4Approved
        && !isR4ProposalRowKey(r.key)
        && (r.key === "full_study" || r.key === "one_semester"),
    );
    if (approved) {
      def.duration = approved.key as "full_study" | "one_semester";
    }
  }

  const scopeBlock = review.blocks.scope;
  if (scopeBlock?.confirmed) {
    const selections = scopeBlock.rows
      .filter((r) => r.r4Approved)
      .map((r) => (isR4ProposalRowKey(r.key) ? r.title.trim() : r.key))
      .filter(Boolean);
    if (selections.length) {
      def.scopeSelections = selections;
    } else {
      delete def.scopeSelections;
    }
  }

  materializeMeasureBlock(
    review.blocks.lectureMeasures,
    LECTURE_MEASURE_KEYS,
    "lecture",
    def,
  );
  materializeMeasureBlock(
    review.blocks.assessmentMeasures,
    ASSESSMENT_MEASURE_KEYS,
    "assessment",
    def,
  );

  return {
    ...data,
    applicationDefinition: def,
  };
}

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
