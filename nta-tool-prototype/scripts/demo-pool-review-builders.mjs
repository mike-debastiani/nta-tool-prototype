/**
 * Baut workspaceReview + r4DecisionReview für Demo-Pool-Import.
 * Spiegelt die UI-Strukturen aus test-flow-types / r4-decision-state.
 */

import { APPLICATION_SCOPE_OPTIONS } from "./demo-pool-catalog.mjs";

export const REVIEW_BLOCK_IDS = [
  "applicant",
  "attest",
  "definition",
  "duration",
  "scope",
  "lectureMeasures",
  "assessmentMeasures",
];

export const REVIEW_BLOCK_TITLES = {
  applicant: "Antragstellende Person",
  attest: "Fachärztliches Attest",
  definition: "Persönliche Situationsbeschreibung",
  duration: "Gültigkeitsdauer des Nachteilsausgleiches",
  scope: "Geltungsbereich des beantragten Nachteilsausgleiches",
  lectureMeasures: "Ausgleichsmassnahmen für Lehrveranstaltungen",
  assessmentMeasures: "Ausgleichsmassnahmen für Leistungsnachweise",
};

const LECTURE_MEASURES = [
  { key: "m1", title: "Zusätzliche Pausen", description: "Möglichkeit, während Lehrveranstaltungen zusätzliche Pausen einzulegen." },
  { key: "m2", title: "Einzelarbeit statt Gruppenarbeit", description: "Gruppenarbeiten können durch gleichwertige Einzelarbeiten ersetzt werden." },
  { key: "m3", title: "Angepasste Präsenzpflicht", description: "Die Präsenzpflicht wird individuell angepasst." },
  { key: "m4", title: "Audioaufnahme-Erlaubnis", description: "Lehrveranstaltungen dürfen zu persönlichen Lernzwecken aufgezeichnet werden." },
  { key: "m5", title: "Reservierter Sitzplatz", description: "Ein fester Sitzplatz wird reserviert." },
  { key: "m6", title: "Kein unaufgefordertes Aufrufen", description: "Verzicht auf unaufgefordertes mündliches Aufbieten." },
];

const ASSESSMENT_MEASURES = [
  { key: "m1", title: "Einsatz technischer Hilfsmittel", description: "Nutzung von Hilfsmitteln während Prüfungen." },
  { key: "m2", title: "Anpassung der Prüfungsunterlagen", description: "Angepasste Schriftart, -grösse oder -farbe." },
  { key: "m3", title: "Einsatz personeller Unterstützung", description: "Begleitung durch eine Assistenzperson." },
  { key: "m4", title: "Zeitverlängerung", description: "Verlängerung der Prüfungszeit." },
  { key: "m5", title: "Angepasste Pausenregelung", description: "Individuelle Pausengestaltung während Prüfungen." },
  { key: "m6", title: "Separater Prüfungsraum", description: "Prüfung in einem separaten Raum." },
  { key: "m7", title: "Mündliche statt schriftliche Prüfung", description: "Ersatz durch gleichwertige mündliche Prüfung." },
];

const DURATION_OPTIONS = [
  { key: "full_study", title: "Gesamte Studiendauer", description: "Der Ausgleich gilt für die gesamte Dauer des Studiums." },
  { key: "one_semester", title: "Einmalig für ein Semester", description: "Der Ausgleich gilt für ein Semester." },
];

export const R4_BLOCK_IDS = ["duration", "scope", "lectureMeasures", "assessmentMeasures"];

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function resolveOtherLines(def, kind) {
  if (!def) return [];
  const lines = kind === "lecture" ? def.lectureOtherLines : def.assessmentOtherLines;
  return (lines ?? []).map((l) => String(l).trim()).filter(Boolean);
}

function buildDurationRows(def) {
  const selected = def?.duration;
  return DURATION_OPTIONS.map((o) => ({
    key: o.key,
    title: o.title,
    description: o.description,
    studentSelected: selected === o.key,
    r4Approved: selected === o.key,
  }));
}

function buildScopeRows(def) {
  const set = new Set(def?.scopeSelections ?? []);
  return APPLICATION_SCOPE_OPTIONS.map((label) => ({
    key: label,
    title: label,
    studentSelected: set.has(label),
    r4Approved: set.has(label),
  }));
}

function buildLectureMeasureRows(def) {
  if (!def) return [];
  if (def.lectureMeasuresKeine) {
    return [{
      key: "__keine__",
      title: "Keine",
      description: "Keine Ausgleichsmassnahmen für Lehrveranstaltungen.",
      studentSelected: true,
      r4Approved: true,
    }];
  }
  const selected = new Set(def.lectureMeasures ?? []);
  const rows = LECTURE_MEASURES.map((o) => ({
    key: o.key,
    title: o.title,
    description: o.description,
    studentSelected: selected.has(o.key),
    r4Approved: selected.has(o.key),
  }));
  resolveOtherLines(def, "lecture").forEach((line, idx) => {
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

function buildAssessmentMeasureRows(def) {
  if (!def) return [];
  if (def.assessmentMeasuresKeine) {
    return [{
      key: "__keine__",
      title: "Keine",
      description: "Keine Ausgleichsmassnahmen für Leistungsnachweise.",
      studentSelected: true,
      r4Approved: true,
    }];
  }
  const selected = new Set(def.assessmentMeasures ?? []);
  const rows = ASSESSMENT_MEASURES.map((o) => ({
    key: o.key,
    title: o.title,
    description: o.description,
    studentSelected: selected.has(o.key),
    r4Approved: selected.has(o.key),
  }));
  resolveOtherLines(def, "assessment").forEach((line, idx) => {
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

function buildDefaultR4Block(def, id) {
  const rows =
    id === "duration" ? buildDurationRows(def)
      : id === "scope" ? buildScopeRows(def)
        : id === "lectureMeasures" ? buildLectureMeasureRows(def)
          : buildAssessmentMeasureRows(def);
  return { confirmed: false, rows };
}

function captureBlockBaseline(data, blockId) {
  const def = data.applicationDefinition;
  switch (blockId) {
    case "applicant":
      return { personalData: data.personalData ? { ...data.personalData } : undefined };
    case "attest":
      return { attestFiles: data.attestFiles?.map((f) => ({ ...f })) };
    case "definition":
      return { applicationDefinition: def ? { situationDescription: def.situationDescription } : undefined };
    case "duration":
      return { applicationDefinition: def ? { duration: def.duration } : undefined };
    case "scope":
      return { applicationDefinition: def ? { scopeSelections: [...(def.scopeSelections ?? [])] } : undefined };
    case "lectureMeasures":
      return {
        applicationDefinition: def
          ? cloneJson({
              lectureMeasures: [...(def.lectureMeasures ?? [])],
              lectureMeasuresKeine: def.lectureMeasuresKeine,
              lectureOtherLines: def.lectureOtherLines ? [...def.lectureOtherLines] : undefined,
            })
          : undefined,
      };
    case "assessmentMeasures":
      return {
        applicationDefinition: def
          ? cloneJson({
              assessmentMeasures: [...(def.assessmentMeasures ?? [])],
              assessmentMeasuresKeine: def.assessmentMeasuresKeine,
              assessmentOtherLines: def.assessmentOtherLines ? [...def.assessmentOtherLines] : undefined,
            })
          : undefined,
      };
    default:
      return {};
  }
}

function defaultForwardedAt(caseJson) {
  if (caseJson.reviewForwardedAt) return caseJson.reviewForwardedAt;
  if (caseJson.submittedAt) {
    const d = new Date(caseJson.submittedAt);
    d.setDate(d.getDate() + 5);
    return d.toISOString();
  }
  return new Date().toISOString();
}

/** R2 hat alle Blöcke bestätigt (Vorstufe R4 / approved / rejected). */
export function buildConfirmedWorkspaceReview(caseJson) {
  const forwardedAt = defaultForwardedAt(caseJson);
  const blocks = {};
  for (const id of REVIEW_BLOCK_IDS) {
    blocks[id] = { phase: "confirmed" };
  }
  return {
    postSubmit: { forwardedAt, blocks },
    forwardedComments: [],
  };
}

/** R2 hat Anpassungen angefordert. */
export function buildAdjustmentWorkspaceReview(caseJson, data) {
  const requests = caseJson.adjustmentRequests ?? [];
  const requestMap = new Map(requests.map((r) => [r.blockId, r.remark]));
  const forwardedAt = defaultForwardedAt(caseJson);
  const blocks = {};
  const forwardedComments = [];

  for (const id of REVIEW_BLOCK_IDS) {
    const remark = requestMap.get(id);
    if (remark) {
      blocks[id] = { phase: "adjustment", remark };
      forwardedComments.push({
        id: `cmt-${id}`,
        blockId: id,
        blockTitle: REVIEW_BLOCK_TITLES[id],
        body: remark,
        createdAt: forwardedAt,
        authorDisplayName: "Dr. Sandra Meier",
      });
    } else {
      blocks[id] = { phase: "confirmed" };
    }
  }

  const adjustmentBlockIds = requests.map((r) => r.blockId);
  const baselines = {};
  for (const id of adjustmentBlockIds) {
    baselines[id] = captureBlockBaseline(data, id);
  }

  return {
    postSubmit: { forwardedAt, blocks },
    forwardedComments,
    r1AdjustmentBlockBaselines: baselines,
    r1PortalFlowStep: "step4_application",
  };
}

function applyConcretizations(rows, concretizations, blockId) {
  if (!concretizations?.length) return rows;
  const byKey = new Map(
    concretizations
      .filter((c) => c.blockId === blockId)
      .map((c) => [c.measureKey ?? c.rowKey, c]),
  );
  return rows.map((row) => {
    const c = byKey.get(row.key);
    if (!c) return row;
    return {
      ...row,
      concretizedTitle: c.title ?? row.concretizedTitle,
      concretizedDescription: c.description ?? row.concretizedDescription,
    };
  });
}

function applyRejectedBlock(block, rejection) {
  const rejectKeys = new Set(rejection.rejectedMeasureKeys ?? []);
  const rejectAll = rejectKeys.size === 0;
  const rows = block.rows.map((row) => {
    if (!row.studentSelected || row.key === "__keine__") return row;
    const shouldReject = rejectAll || rejectKeys.has(row.key) || row.key.startsWith("other:");
    return { ...row, r4Approved: shouldReject ? false : row.r4Approved };
  });
  return {
    confirmed: true,
    decisionReason: rejection.reason,
    rows,
  };
}

function applyApprovedBlock(block, concretizations, blockId) {
  const rows = block.rows.map((row) => ({
    ...row,
    r4Approved: row.studentSelected ? true : row.r4Approved,
  }));
  return {
    confirmed: true,
    rows: applyConcretizations(rows, concretizations, blockId),
  };
}

export function buildR4DecisionReview(caseJson, def) {
  const r4 = caseJson.r4Decision ?? {};
  const updatedAt = r4.updatedAt ?? defaultForwardedAt(caseJson);
  const concretizations = r4.concretizations ?? [];
  const blocks = {};

  for (const id of R4_BLOCK_IDS) {
    const base = buildDefaultR4Block(def, id);
    if (caseJson.targetState === "approved" || caseJson.targetState === "in_decision") {
      blocks[id] = applyApprovedBlock(base, concretizations, id);
    } else if (caseJson.targetState === "rejected") {
      const rejection = (r4.rejectedBlocks ?? []).find((b) => b.blockId === id);
      if (rejection) {
        blocks[id] = applyRejectedBlock(base, rejection);
      } else {
        blocks[id] = applyApprovedBlock(base, concretizations, id);
      }
    }
  }

  return { blocks, updatedAt };
}

export function enrichApplicationDataForState(caseJson, data) {
  const { targetState } = caseJson;
  const def = data.applicationDefinition;

  if (targetState === "needs_adjustment") {
    const adj = buildAdjustmentWorkspaceReview(caseJson, data);
    data.recommendation = {
      ...data.recommendation,
      workspaceReview: {
        postSubmit: adj.postSubmit,
        forwardedComments: adj.forwardedComments,
      },
      r1AdjustmentBlockBaselines: adj.r1AdjustmentBlockBaselines,
    };
    data.r1PortalFlowStep = adj.r1PortalFlowStep;
    return data;
  }

  if (["in_decision", "approved", "rejected"].includes(targetState)) {
    const ws = buildConfirmedWorkspaceReview(caseJson);
    data.recommendation = { ...data.recommendation, workspaceReview: ws };
    data.r4DecisionReview = buildR4DecisionReview(caseJson, def);
    if (targetState === "approved" || targetState === "rejected") {
      data.r1PortalFlowStep = "step6_submitted";
    }
  }

  return data;
}
