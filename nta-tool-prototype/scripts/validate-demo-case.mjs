#!/usr/bin/env node
/**
 * Validiert Claude-Demo-Case-JSON vor dem Supabase-Import.
 *
 * Usage:
 *   node scripts/validate-demo-case.mjs supabase/seed/demo-pool/cases/foo.json
 *   node scripts/validate-demo-case.mjs --register supabase/seed/demo-pool/cases/*.json
 *   node scripts/validate-demo-case.mjs --summary
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANTRAGSART_VALUES,
  APPLICATION_SCOPE_OPTIONS,
  ASSESSMENT_MEASURE_KEYS,
  CONSULTATION_STATUS,
  DURATION_VALUES,
  LECTURE_MEASURE_KEYS,
  SEMESTER_VALUES,
  TARGET_STATES,
  compactLines,
  inferDiagnosis,
  isValidIsoDate,
  isValidIsoDateTime,
  isValidMatrikel,
  loadStudyProgramMeta,
  resolveCaseFilePath,
} from "./demo-pool-catalog.mjs";
import {
  REVIEW_BLOCK_IDS,
  R4_BLOCK_IDS,
} from "./demo-pool-review-builders.mjs";

const REVIEW_BLOCK_ID_SET = new Set(REVIEW_BLOCK_IDS);
const R4_BLOCK_ID_SET = new Set(R4_BLOCK_IDS);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEMO_POOL_DIR = join(ROOT, "supabase/seed/demo-pool");
const REGISTRY_PATH = join(DEMO_POOL_DIR, "case-registry.json");
const CASES_DIR = join(DEMO_POOL_DIR, "cases");

const FORBIDDEN_TITLE_RE = /\b(demo|test|fake)\b/i;
/** Kyrillisch, Griechisch, CJK, Arabisch, Fullwidth-Latin u. ä. */
const NON_LATIN_SCRIPT_RE =
  /[\u0400-\u04FF\u0500-\u052F\u0370-\u03FF\u1F00-\u1FFF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\uFF00-\uFFEF]/;
const FORBIDDEN_RECOMMENDATION_HTML_RE =
  /<(script|style|table|img|iframe|object|embed|form|input|div|span|h[4-6]|code|pre)\b/i;
const STUDY_PROGRAM_META = loadStudyProgramMeta();

function validateLatinText(errors, value, path, { asciiOnly = false } = {}) {
  if (typeof value !== "string" || !value.trim()) return;
  if (NON_LATIN_SCRIPT_RE.test(value)) {
    push(
      errors,
      path,
      "Nur lateinische Schrift (kein Kyrillisch/Griechisch/…) — siehe Zeichensatz-Regeln in CLAUDE_PROJEKT_ANLEITUNG.md",
    );
  }
  if (asciiOnly && /[^\x00-\x7F]/.test(value)) {
    push(errors, path, "Nur ASCII-Zeichen erlaubt");
  }
}

function validateAdjustmentRequests(errors, requests) {
  if (!Array.isArray(requests) || requests.length === 0) {
    push(errors, "adjustmentRequests", "Mindestens eine Anpassungsanforderung (blockId + remark)");
    return;
  }
  for (let i = 0; i < requests.length; i++) {
    const item = requests[i];
    const base = `adjustmentRequests[${i}]`;
    if (!item || typeof item !== "object") {
      push(errors, base, "Muss ein Objekt sein");
      continue;
    }
    if (!REVIEW_BLOCK_ID_SET.has(item.blockId)) {
      push(errors, `${base}.blockId`, `Ungültig — erlaubt: ${REVIEW_BLOCK_IDS.join(", ")}`);
    }
    if (!requireString(errors, item.remark, `${base}.remark`, { minLength: 10 })) {
      continue;
    }
    validateLatinText(errors, item.remark, `${base}.remark`);
  }
}

function validateR4Decision(errors, r4, targetState) {
  if (!r4 || typeof r4 !== "object") {
    push(errors, "r4Decision", "Pflichtobjekt für approved/rejected/in_decision");
    return;
  }

  if (targetState === "in_decision") {
    return;
  }

  if (targetState === "approved") {
    const conc = r4.concretizations;
    if (!Array.isArray(conc) || conc.length === 0) {
      push(errors, "r4Decision.concretizations", "Mindestens eine ausformulierte Massnahme (blockId, measureKey, title, description)");
      return;
    }
    for (let i = 0; i < conc.length; i++) {
      const c = conc[i];
      const base = `r4Decision.concretizations[${i}]`;
      if (!R4_BLOCK_ID_SET.has(c?.blockId) || !["lectureMeasures", "assessmentMeasures"].includes(c.blockId)) {
        push(errors, `${base}.blockId`, "Nur lectureMeasures oder assessmentMeasures");
      }
      if (!requireString(errors, c?.measureKey, `${base}.measureKey`)) continue;
      requireString(errors, c?.title, `${base}.title`, { minLength: 5 });
      requireString(errors, c?.description, `${base}.description`, { minLength: 15 });
    }
  }

  if (targetState === "rejected") {
    const rejected = r4.rejectedBlocks;
    if (!Array.isArray(rejected) || rejected.length === 0) {
      push(errors, "r4Decision.rejectedBlocks", "Mindestens ein abgelehnter Block (blockId + reason)");
      return;
    }
    for (let i = 0; i < rejected.length; i++) {
      const b = rejected[i];
      const base = `r4Decision.rejectedBlocks[${i}]`;
      if (!R4_BLOCK_ID_SET.has(b?.blockId)) {
        push(errors, `${base}.blockId`, `Ungültig — erlaubt: ${R4_BLOCK_IDS.join(", ")}`);
      }
      requireString(errors, b?.reason, `${base}.reason`, { minLength: 20 });
      if (b?.rejectedMeasureKeys !== undefined) {
        if (!Array.isArray(b.rejectedMeasureKeys) || b.rejectedMeasureKeys.length === 0) {
          push(errors, `${base}.rejectedMeasureKeys`, "Array von Massnahmen-Keys oder weglassen (= alle beantragten ablehnen)");
        }
      }
    }
  }
}

function validateRecommendationHtml(errors, html) {
  if (typeof html !== "string" || !html.trim()) return;
  if (FORBIDDEN_RECOMMENDATION_HTML_RE.test(html)) {
    push(
      errors,
      "recommendationHtml",
      "Unzulässiges HTML-Tag — nur erlaubte TipTap-Tags (siehe CLAUDE_PROJEKT_ANLEITUNG.md)",
    );
  }
  if (!/<h[123]\b/i.test(html)) {
    push(
      errors,
      "recommendationHtml",
      "Mindestens eine Überschrift <h2> oder <h3> für den Empfehlungsblock setzen",
    );
  }
}

function usage() {
  console.log(`Usage:
  npm run validate:demo-case -- <file.json> [more.json ...]
  npm run validate:demo-case -- --register <file.json> [...]
  npm run demo-pool:summary`);
}

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new Error(`${path}: JSON parse failed — ${err.message}`);
  }
}

function push(errors, path, message) {
  errors.push({ path, message });
}

function requireString(errors, value, path, { minLength = 1 } = {}) {
  if (typeof value !== "string" || value.trim().length < minLength) {
    push(errors, path, "Pflichtfeld (nicht-leerer String)");
    return false;
  }
  return true;
}

function validateMeasureCategory(errors, def, prefix, allowedKeys, label) {
  const keine = Boolean(def[`${prefix}MeasuresKeine`]);
  const measures = Array.isArray(def[`${prefix}Measures`])
    ? def[`${prefix}Measures`]
    : [];
  const otherLines = compactLines(def[`${prefix}OtherLines`]);

  if (keine && (measures.length > 0 || otherLines.length > 0)) {
    push(
      errors,
      `applicationDefinition.${prefix}MeasuresKeine`,
      `${label}: «Keine» darf nicht zusammen mit Katalog-Keys oder Freitext stehen`,
    );
  }

  if (!keine && measures.length === 0 && otherLines.length === 0) {
    push(
      errors,
      `applicationDefinition.${prefix}Measures`,
      `${label}: mindestens «Keine», ein Katalog-Key oder eine Freitext-Zeile erforderlich`,
    );
  }

  for (const key of measures) {
    if (!allowedKeys.has(key)) {
      push(
        errors,
        `applicationDefinition.${prefix}Measures`,
        `Ungültiger Key «${key}» (erlaubt: ${[...allowedKeys].join(", ")})`,
      );
    }
  }

  if (!Array.isArray(def[`${prefix}Measures`]) && def[`${prefix}Measures`] != null) {
    push(errors, `applicationDefinition.${prefix}Measures`, "Muss ein Array sein");
  }
  if (def[`${prefix}OtherLines`] != null && !Array.isArray(def[`${prefix}OtherLines`])) {
    push(errors, `applicationDefinition.${prefix}OtherLines`, "Muss ein Array sein");
  }
}

function validatePersonalData(errors, pd) {
  if (!pd || typeof pd !== "object") {
    push(errors, "personalData", "Pflichtobjekt");
    return;
  }

  requireString(errors, pd.vorname, "personalData.vorname");
  requireString(errors, pd.name, "personalData.name");
  requireString(errors, pd.email, "personalData.email");
  requireString(errors, pd.phone, "personalData.phone");
  validateLatinText(errors, pd.vorname, "personalData.vorname");
  validateLatinText(errors, pd.name, "personalData.name");
  validateLatinText(errors, pd.email, "personalData.email", { asciiOnly: true });

  if (!isValidMatrikel(pd.matrikel)) {
    push(errors, "personalData.matrikel", "Format muss XX-XXX-XXX sein");
  }

  if (!requireString(errors, pd.studiengang, "personalData.studiengang")) {
    // skip faculty check
  } else if (!STUDY_PROGRAM_META.has(pd.studiengang)) {
    push(
      errors,
      "personalData.studiengang",
      `Unbekannter Studiengang «${pd.studiengang}» (nicht in uzh-studiengaenge-data.ts)`,
    );
  }

  if (!SEMESTER_VALUES.has(String(pd.semester ?? ""))) {
    push(errors, "personalData.semester", 'Muss "1" bis "12" sein');
  }

  if (!ANTRAGSART_VALUES.has(pd.antragsart)) {
    push(
      errors,
      "personalData.antragsart",
      'Muss "studium" oder "aufnahmeverfahren" sein',
    );
  }
}

function validateAttest(errors, attest) {
  if (!attest || typeof attest !== "object") {
    push(errors, "attest", "Pflichtobjekt");
    return;
  }
  requireString(errors, attest.fileName, "attest.fileName");
  requireString(errors, attest.markdownContent, "attest.markdownContent", {
    minLength: 40,
  });
}

function validateApplicationDefinition(errors, def) {
  if (!def || typeof def !== "object") {
    push(errors, "applicationDefinition", "Pflichtobjekt für diesen targetState");
    return;
  }

  requireString(errors, def.situationDescription, "applicationDefinition.situationDescription", {
    minLength: 80,
  });

  if (!DURATION_VALUES.has(def.duration)) {
    push(
      errors,
      "applicationDefinition.duration",
      'Muss "full_study" oder "one_semester" sein',
    );
  }

  const scopes = def.scopeSelections;
  if (!Array.isArray(scopes) || scopes.length === 0) {
    push(errors, "applicationDefinition.scopeSelections", "Mindestens ein Geltungsbereich");
  } else {
    const allowed = new Set(APPLICATION_SCOPE_OPTIONS);
    for (const s of scopes) {
      if (!allowed.has(s)) {
        push(
          errors,
          "applicationDefinition.scopeSelections",
          `Ungültiger Wert «${s}»`,
        );
      }
    }
  }

  validateMeasureCategory(
    errors,
    def,
    "lecture",
    LECTURE_MEASURE_KEYS,
    "Lehrveranstaltungen",
  );
  validateMeasureCategory(
    errors,
    def,
    "assessment",
    ASSESSMENT_MEASURE_KEYS,
    "Leistungsnachweise",
  );
}

function validateConsultation(errors, consultation, { requireDone = false } = {}) {
  if (!consultation || typeof consultation !== "object") {
    push(errors, "consultation", "Pflichtobjekt für diesen targetState");
    return;
  }

  if (!CONSULTATION_STATUS.has(consultation.status)) {
    push(errors, "consultation.status", 'Muss "booked" oder "done" sein');
  } else if (requireDone && consultation.status !== "done") {
    push(errors, "consultation.status", 'Für diesen State muss status "done" sein');
  } else if (!requireDone && consultation.status !== "booked") {
    push(errors, "consultation.status", 'Für consultation_booked muss status "booked" sein');
  }

  if (!isValidIsoDate(consultation.dateIso)) {
    push(errors, "consultation.dateIso", "Format YYYY-MM-DD");
  }
  requireString(errors, consultation.date, "consultation.date");
  requireString(errors, consultation.slot, "consultation.slot");
}

function validateCase(caseJson, filePath) {
  const errors = [];

  if (!caseJson || typeof caseJson !== "object" || Array.isArray(caseJson)) {
    return [{ path: "(root)", message: "Root muss ein JSON-Objekt sein" }];
  }

  if (!TARGET_STATES.includes(caseJson.targetState)) {
    push(
      errors,
      "targetState",
      `Ungültig — erlaubt: ${TARGET_STATES.join(", ")}`,
    );
  }

  if (!requireString(errors, caseJson.title, "title")) {
    // skip title checks
  } else {
    if (FORBIDDEN_TITLE_RE.test(caseJson.title)) {
      push(errors, "title", "Kein Demo/Test/Fake im Titel");
    }
    const pd = caseJson.personalData;
    if (pd?.vorname && pd?.name) {
      const expected = `NTA Antrag ${pd.vorname} ${pd.name}`;
      if (caseJson.title !== expected) {
        push(
          errors,
          "title",
          `Erwartet «${expected}» (Vorname + Nachname aus personalData)`,
        );
      }
    }
    validateLatinText(errors, caseJson.title, "title");
  }

  validatePersonalData(errors, caseJson.personalData);
  validateAttest(errors, caseJson.attest);

  const state = caseJson.targetState;
  const needsConsultation =
    state &&
    state !== "draft" &&
    ["consultation_booked", "consultation_released", "in_review", "needs_adjustment", "in_decision", "approved", "rejected"].includes(
      state,
    );

  const needsDefinition =
    state &&
    ["consultation_released", "in_review", "needs_adjustment", "in_decision", "approved", "rejected"].includes(
      state,
    );

  const needsRecommendation = needsDefinition;
  const needsSubmitted =
    state &&
    ["in_review", "needs_adjustment", "in_decision", "approved", "rejected"].includes(state);

  if (state === "draft") {
    if (caseJson.consultation) {
      push(errors, "consultation", "Bei draft nicht setzen");
    }
    if (caseJson.applicationDefinition) {
      push(errors, "applicationDefinition", "Bei draft nicht setzen");
    }
    if (caseJson.recommendationHtml) {
      push(errors, "recommendationHtml", "Bei draft nicht setzen");
    }
    if (caseJson.submittedAt) {
      push(errors, "submittedAt", "Bei draft nicht setzen");
    }
  }

  if (needsConsultation) {
    validateConsultation(errors, caseJson.consultation, {
      requireDone: state !== "consultation_booked",
    });
  }

  if (needsDefinition) {
    validateApplicationDefinition(errors, caseJson.applicationDefinition);
  }

  if (needsRecommendation) {
    if (
      requireString(errors, caseJson.recommendationHtml, "recommendationHtml", {
        minLength: 40,
      })
    ) {
      validateRecommendationHtml(errors, caseJson.recommendationHtml);
    }
  }

  if (needsSubmitted) {
    if (!isValidIsoDateTime(caseJson.submittedAt)) {
      push(errors, "submittedAt", "Pflicht — gültiges ISO-8601-Datum");
    }
  }

  if (state === "needs_adjustment") {
    validateAdjustmentRequests(errors, caseJson.adjustmentRequests);
  } else if (caseJson.adjustmentRequests) {
    push(errors, "adjustmentRequests", "Nur bei targetState needs_adjustment setzen");
  }

  if (["approved", "rejected", "in_decision"].includes(state)) {
    validateR4Decision(errors, caseJson.r4Decision, state);
  } else if (caseJson.r4Decision) {
    push(errors, "r4Decision", "Nur bei approved/rejected/in_decision setzen");
  }

  if (caseJson.reviewForwardedAt && !isValidIsoDateTime(caseJson.reviewForwardedAt)) {
    push(errors, "reviewForwardedAt", "Gültiges ISO-8601-Datum");
  }

  return errors;
}

function buildRegistryEntry(caseJson, filePath) {
  const studiengang = caseJson.personalData?.studiengang ?? "";
  const faculty = STUDY_PROGRAM_META.get(studiengang);
  const def = caseJson.applicationDefinition ?? {};
  const hasFreitext =
    compactLines(def.lectureOtherLines).length > 0 ||
    compactLines(def.assessmentOtherLines).length > 0;

  const rel = relative(DEMO_POOL_DIR, resolve(filePath));
  const file = rel.startsWith("..") ? basename(filePath) : rel;

  return {
    file,
    name: `${caseJson.personalData?.vorname ?? ""} ${caseJson.personalData?.name ?? ""}`.trim(),
    targetState: caseJson.targetState,
    diagnosis: inferDiagnosis(caseJson),
    faculty: faculty?.facultyName ?? "",
    facultyShortCode: faculty?.facultyShortCode ?? "",
    studiengang,
    hasFreitext,
    registeredAt: new Date().toISOString(),
  };
}

function loadRegistry() {
  if (!existsSync(REGISTRY_PATH)) {
    return [];
  }
  try {
    const data = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveRegistry(entries) {
  mkdirSync(dirname(REGISTRY_PATH), { recursive: true });
  const sorted = [...entries].sort((a, b) => a.file.localeCompare(b.file, "de"));
  writeFileSync(REGISTRY_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

function registerCase(caseJson, filePath) {
  const entry = buildRegistryEntry(caseJson, filePath);
  const registry = loadRegistry();
  const idx = registry.findIndex((r) => r.file === entry.file);
  if (idx >= 0) {
    registry[idx] = entry;
  } else {
    registry.push(entry);
  }
  saveRegistry(registry);
  return entry;
}

function printSummary() {
  const registry = loadRegistry();
  if (registry.length === 0) {
    console.log("case-registry.json ist leer. Zuerst: npm run validate:demo-case -- --register <file.json>");
    return;
  }

  console.log(`\nDemo-Pool Registry (${registry.length} Cases)\n`);
  console.log(
    "file".padEnd(36) +
      "name".padEnd(22) +
      "state".padEnd(22) +
      "faculty".padEnd(8) +
      "freitext",
  );
  console.log("-".repeat(96));

  for (const row of registry) {
    console.log(
      row.file.padEnd(36) +
        row.name.slice(0, 20).padEnd(22) +
        row.targetState.padEnd(22) +
        (row.facultyShortCode || "—").padEnd(8) +
        (row.hasFreitext ? "ja" : "nein"),
    );
  }

  const byState = countBy(registry, (r) => r.targetState);
  const byFaculty = countBy(registry, (r) => r.facultyShortCode || "(unbekannt)");
  const withFreitext = registry.filter((r) => r.hasFreitext).length;

  console.log("\nNach targetState:");
  for (const [k, v] of Object.entries(byState).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }

  console.log("\nNach Fakultät (Kürzel):");
  for (const [k, v] of Object.entries(byFaculty).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }

  console.log(`\nMit Freitext-Massnahme: ${withFreitext} / ${registry.length}`);

  const diagnoses = registry.map((r) => r.diagnosis).filter(Boolean);
  if (diagnoses.length > 0) {
    console.log("\nDiagnosen:");
    for (const row of registry) {
      if (row.diagnosis) {
        console.log(`  ${row.name}: ${row.diagnosis.slice(0, 72)}${row.diagnosis.length > 72 ? "…" : ""}`);
      }
    }
  }
  console.log("");
}

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const k = keyFn(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    usage();
    process.exit(args.includes("-h") || args.includes("--help") ? 0 : 1);
  }

  if (args.includes("--summary")) {
    printSummary();
    return;
  }

  const register = args.includes("--register");
  const files = args.filter((a) => !a.startsWith("-"));

  if (files.length === 0) {
    console.error("Keine JSON-Dateien angegeben.\n");
    usage();
    process.exit(1);
  }

  mkdirSync(CASES_DIR, { recursive: true });

  let failed = 0;
  let passed = 0;

  for (const fileArg of files) {
    if (fileArg.includes("*")) {
      console.error(`Glob im Shell expandieren: ${fileArg}`);
      failed++;
      continue;
    }

    const filePath = resolveCaseFilePath(fileArg);
    if (!existsSync(filePath)) {
      console.error(`✗ ${fileArg} — Datei nicht gefunden`);
      failed++;
      continue;
    }

    let caseJson;
    try {
      caseJson = loadJson(filePath);
    } catch (err) {
      console.error(`✗ ${fileArg} — ${err.message}`);
      failed++;
      continue;
    }

    const errors = validateCase(caseJson, filePath);
    if (errors.length > 0) {
      console.error(`✗ ${relative(ROOT, filePath)}`);
      for (const e of errors) {
        console.error(`    ${e.path}: ${e.message}`);
      }
      failed++;
      continue;
    }

    console.log(`✓ ${relative(ROOT, filePath)}`);
    passed++;

    if (register) {
      const entry = registerCase(caseJson, filePath);
      console.log(`  → registry: ${entry.file} (${entry.facultyShortCode || "?"}, ${entry.targetState})`);
    }
  }

  console.log(`\n${passed} ok, ${failed} fehlgeschlagen`);
  if (register && passed > 0) {
    console.log(`Registry: ${relative(ROOT, REGISTRY_PATH)}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
