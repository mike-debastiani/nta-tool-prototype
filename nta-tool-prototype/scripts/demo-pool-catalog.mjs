import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

export const PROTOTYPE_ROOT = ROOT;
const CASES_DIR = join(ROOT, "supabase/seed/demo-pool/cases");

/** Pfad zu einer Case-JSON — funktioniert vom Repo-Root und aus nta-tool-prototype/. */
export function resolveCaseFilePath(fileArg) {
  const stripped = fileArg.replace(/^\.?\/?nta-tool-prototype\//, "");
  const candidates = [
    resolve(ROOT, stripped),
    resolve(process.cwd(), stripped),
    resolve(process.cwd(), fileArg),
    join(CASES_DIR, basename(stripped)),
  ];
  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    if (existsSync(candidate)) return candidate;
  }
  return resolve(ROOT, stripped);
}

export const TARGET_STATES = [
  "draft",
  "consultation_booked",
  "consultation_released",
  "in_review",
  "needs_adjustment",
  "in_decision",
  "approved",
  "rejected",
];

export const APPLICATION_SCOPE_OPTIONS = [
  "Schriftliche Prüfungen",
  "Mündliche Prüfungen",
  "Schriftliche Arbeiten",
  "Während Lehrveranstaltungen",
  "Praktika",
];

export const LECTURE_MEASURE_KEYS = new Set(["m1", "m2", "m3", "m4", "m5", "m6"]);
export const ASSESSMENT_MEASURE_KEYS = new Set([
  "m1",
  "m2",
  "m3",
  "m4",
  "m5",
  "m6",
  "m7",
]);

export const DURATION_VALUES = new Set(["full_study", "one_semester"]);
export const ANTRAGSART_VALUES = new Set(["studium", "aufnahmeverfahren"]);
export const CONSULTATION_STATUS = new Set(["booked", "done"]);
export const SEMESTER_VALUES = new Set(
  Array.from({ length: 12 }, (_, i) => String(i + 1)),
);

const MATRIKEL_RE = /^\d{2}-\d{3}-\d{3}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function extractQuotedStrings(block) {
  return [...block.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((m) => m[1]);
}

/** Liest Studiengänge + Fakultät aus `lib/uzh-studiengaenge-data.ts` (kein TS-Build nötig). */
export function loadStudyProgramMeta() {
  const src = readFileSync(join(ROOT, "lib/uzh-studiengaenge-data.ts"), "utf8");
  const map = new Map();

  const facultyBlocks = src.matchAll(
    /\{\s*slug:\s*"([^"]+)"[\s\S]*?shortCode:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?bachelor:\s*\[([\s\S]*?)\],\s*master:\s*\[([\s\S]*?)\]/g,
  );

  for (const match of facultyBlocks) {
    const [, slug, shortCode, facultyName, bachelorBlock, masterBlock] = match;
    const programs = [
      ...extractQuotedStrings(bachelorBlock),
      ...extractQuotedStrings(masterBlock),
    ];
    for (const program of programs) {
      map.set(program, {
        facultyName,
        facultyShortCode: shortCode,
        facultySlug: slug,
      });
    }
  }

  const legacySection = src.split("LEGACY_STUDY_PROGRAMS")[1] ?? "";
  const legacyEntries = legacySection.matchAll(
    /facultySlug:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"/g,
  );

  const slugToFaculty = new Map();
  for (const faculty of map.values()) {
    slugToFaculty.set(faculty.facultySlug, faculty);
  }

  for (const match of legacyEntries) {
    const [, facultySlug, programName] = match;
    const faculty = slugToFaculty.get(facultySlug);
    if (faculty && !map.has(programName)) {
      map.set(programName, { ...faculty });
    }
  }

  return map;
}

export function isValidMatrikel(value) {
  return typeof value === "string" && MATRIKEL_RE.test(value);
}

export function isValidIsoDate(value) {
  return typeof value === "string" && ISO_DATE_RE.test(value);
}

export function isValidIsoDateTime(value) {
  if (typeof value !== "string") return false;
  const t = Date.parse(value);
  return !Number.isNaN(t);
}

export function compactLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map((l) => String(l).trim()).filter(Boolean);
}

/** Diagnose aus Attest-Text oder optionalem `diagnosis`-Feld. */
export function inferDiagnosis(caseJson) {
  if (typeof caseJson.diagnosis === "string" && caseJson.diagnosis.trim()) {
    return caseJson.diagnosis.trim();
  }
  const content = caseJson.attest?.markdownContent ?? "";
  const match =
    content.match(/\*\*Diagnose:\*\*\s*(.+)/i) ??
    content.match(/Diagnose:\s*(.+)/i);
  if (match) {
    return match[1].split("\n")[0].trim();
  }
  return "";
}
