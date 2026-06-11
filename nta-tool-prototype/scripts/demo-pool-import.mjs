#!/usr/bin/env node
/**
 * Demo-Case JSON → Attest-Datei + Supabase INSERT (ohne SQL-Migration).
 *
 * Voraussetzung: `.env.local` mit NEXT_PUBLIC_SUPABASE_URL (+ Publishable Key).
 * Optional: SUPABASE_SERVICE_ROLE_KEY (direkter INSERT). Ohne Key: RPC `import_demo_pool_case`.
 *
 * Usage:
 *   npm run demo-pool:import -- supabase/seed/demo-pool/cases/democase1.json
 *   npm run demo-pool:import -- --all
 *   npm run demo-pool:import -- --dry-run cases/foo.json
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { resolveCaseFilePath } from "./demo-pool-catalog.mjs";
import { enrichApplicationDataForState } from "./demo-pool-review-builders.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEMO_POOL_DIR = join(ROOT, "supabase/seed/demo-pool");
const CASES_DIR = join(DEMO_POOL_DIR, "cases");
const ATTEST_DIR = join(ROOT, "public/attest/seed");
const APPLICANT_ID = "3bd3ec82-841a-4b93-b62c-bd284e3de937";
const RELEASED_BY = "Dr. Sandra Meier, NTA-Fachstelle UZH";
const DEFAULT_IMPORT_TOKEN = "nta-demo-pool-import-v1";

function usage() {
  console.log(`Usage:
  npm run demo-pool:import -- <case.json>
  npm run demo-pool:import -- --all
  npm run demo-pool:import -- --dry-run <case.json>

Requires nta-tool-prototype/.env.local with NEXT_PUBLIC_SUPABASE_URL`);
}

function supabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    || ""
  );
}

async function insertViaRpc(supabase, { status, data, currentPhase }) {
  const importToken =
    process.env.DEMO_POOL_IMPORT_TOKEN?.trim() || DEFAULT_IMPORT_TOKEN;

  const { data: applicationId, error } = await supabase.rpc("import_demo_pool_case", {
    p_import_token: importToken,
    p_status: status,
    p_data: data,
    p_current_phase: currentPhase,
  });

  if (error) {
    throw new Error(`Supabase RPC import_demo_pool_case: ${error.message}`);
  }

  return applicationId;
}

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"'))
      || (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function attestSeedSlug(fileName) {
  return fileName
    .replace(/\.(md|pdf|docx)$/i, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapTargetStateToDbStatus(targetState) {
  switch (targetState) {
    case "draft":
      return "draft";
    case "consultation_booked":
    case "consultation_released":
      return "submitted";
    case "in_review":
      return "in_review";
    case "needs_adjustment":
      return "needs_correction";
    case "in_decision":
      return "in_implementation";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    default:
      throw new Error(`Unbekannter targetState: ${targetState}`);
  }
}

function mapCurrentPhase(targetState) {
  if (targetState === "draft") return 1;
  if (targetState === "consultation_booked") return 3;
  return 5;
}

function buildAttestFiles(caseJson) {
  const { fileName, markdownContent } = caseJson.attest;
  const slug = attestSeedSlug(fileName);
  const ext = fileName.toLowerCase().endsWith(".pdf") ? "pdf" : "md";
  const url = `/attest/seed/${slug}.${ext}`;
  const type = ext === "pdf" ? "application/pdf" : "text/markdown";
  return {
    url,
    localPath: join(ATTEST_DIR, `${slug}.${ext}`),
    entry: {
      id: slug,
      name: fileName,
      size: Buffer.byteLength(markdownContent, "utf8"),
      type,
      url,
    },
    markdownContent,
  };
}

function buildApplicationData(caseJson) {
  const { targetState } = caseJson;
  const attest = buildAttestFiles(caseJson);
  const data = {
    title: caseJson.title,
    personalData: { ...caseJson.personalData },
    attestFiles: [attest.entry],
  };

  if (caseJson.consultation) {
    data.consultation = { ...caseJson.consultation };
  }

  if (caseJson.applicationDefinition) {
    data.applicationDefinition = { ...caseJson.applicationDefinition };
  }

  const needsRecommendation = [
    "consultation_released",
    "in_review",
    "needs_adjustment",
    "in_decision",
    "approved",
    "rejected",
  ].includes(targetState);

  if (needsRecommendation && caseJson.recommendationHtml) {
    const releasedAt =
      caseJson.recommendationReleasedAt
      ?? (caseJson.consultation?.dateIso
        ? `${caseJson.consultation.dateIso}T14:00:00.000Z`
        : new Date().toISOString());

    data.recommendation = {
      ready: true,
      releasedHtml: caseJson.recommendationHtml,
      releasedText:
        caseJson.recommendationText
        ?? caseJson.recommendationHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      releasedAt,
      releasedBy: RELEASED_BY,
    };
  }

  if (["in_review", "needs_adjustment", "in_decision", "approved", "rejected"].includes(targetState)) {
    data.summary = "In Review";
    data.finalSubmitted = true;
    data.submittedAt = caseJson.submittedAt;
    data.r1PortalFlowStep = "step6_submitted";
  } else if (targetState === "consultation_released") {
    data.r1PortalFlowStep = "step3_recommendation";
    data.r1RecommendationAcknowledged = true;
  } else if (targetState === "consultation_booked") {
    data.r1PortalFlowStep = "step3_booked";
  } else if (targetState === "draft") {
    data.r1PortalFlowStep = "step2";
  }

  enrichApplicationDataForState(caseJson, data);

  return { data, attest };
}

function runValidation(filePath) {
  const rel = relative(ROOT, resolve(filePath));
  const result = spawnSync(
    process.execPath,
    [join(__dirname, "validate-demo-case.mjs"), rel],
    { cwd: ROOT, stdio: "inherit" },
  );
  return result.status === 0;
}

function registerInRegistry(filePath) {
  spawnSync(
    process.execPath,
    [join(__dirname, "validate-demo-case.mjs"), "--register", relative(ROOT, resolve(filePath))],
    { cwd: ROOT, stdio: "pipe" },
  );
}

async function importCaseFile(filePath, { dryRun = false } = {}) {
  const abs = resolveCaseFilePath(filePath);
  if (!existsSync(abs)) {
    throw new Error(`Datei nicht gefunden: ${filePath}`);
  }

  console.log(`\n→ ${relative(ROOT, abs)}`);

  if (!runValidation(abs)) {
    throw new Error("Validierung fehlgeschlagen");
  }

  const caseJson = JSON.parse(readFileSync(abs, "utf8"));
  const status = mapTargetStateToDbStatus(caseJson.targetState);
  const currentPhase = mapCurrentPhase(caseJson.targetState);
  const { data, attest } = buildApplicationData(caseJson);

  mkdirSync(ATTEST_DIR, { recursive: true });
  if (!dryRun) {
    writeFileSync(attest.localPath, attest.markdownContent, "utf8");
    console.log(`  ✓ Attest: ${relative(ROOT, attest.localPath)}`);
  } else {
    console.log(`  (dry-run) Attest → ${relative(ROOT, attest.localPath)}`);
  }

  if (dryRun) {
    console.log(`  (dry-run) Supabase INSERT status=${status}, phase=${currentPhase}`);
    console.log(`  (dry-run) title: ${data.title}`);
    return null;
  }

  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const publicKey = supabasePublicKey();

  if (!url) {
    throw new Error("Fehlt in nta-tool-prototype/.env.local: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceRoleKey && !publicKey) {
    throw new Error(
      "Fehlt in nta-tool-prototype/.env.local: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "
      + "(oder SUPABASE_SERVICE_ROLE_KEY)",
    );
  }

  const supabase = createClient(url, serviceRoleKey || publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let applicationId;

  if (serviceRoleKey) {
    const { data: row, error } = await supabase
      .from("applications")
      .insert({
        applicant_id: APPLICANT_ID,
        status,
        data,
        current_phase: currentPhase,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Supabase INSERT: ${error.message}`);
    }

    await supabase.from("application_events").insert({
      application_id: row.id,
      actor_id: APPLICANT_ID,
      actor_role: "R1",
      event_type: "submitted",
      payload: { note: "Demo-Pool Import" },
    });

    applicationId = row.id;
    console.log(`  ✓ Supabase INSERT: applications.id = ${applicationId} (${status})`);
  } else {
    applicationId = await insertViaRpc(supabase, { status, data, currentPhase });
    console.log(`  ✓ Supabase RPC: applications.id = ${applicationId} (${status})`);
  }

  registerInRegistry(abs);

  return applicationId;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    usage();
    process.exit(args.includes("-h") || args.includes("--help") ? 0 : 1);
  }

  const dryRun = args.includes("--dry-run");
  const all = args.includes("--all");
  const files = args.filter((a) => !a.startsWith("-"));

  const targets = all
    ? readdirSync(CASES_DIR)
        .filter((f) => f.endsWith(".json") && f !== "case.template.json")
        .map((f) => join(CASES_DIR, f))
    : files.map((f) => resolveCaseFilePath(f));

  if (targets.length === 0) {
    console.error("Keine Case-Dateien.\n");
    usage();
    process.exit(1);
  }

  let ok = 0;
  let fail = 0;

  for (const file of targets) {
    try {
      await importCaseFile(file, { dryRun });
      ok++;
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
      fail++;
    }
  }

  console.log(`\n${ok} importiert, ${fail} fehlgeschlagen`);
  if (!dryRun && ok > 0) {
    console.log("Test: r1.demo.pool@example.com → /portal/home  |  R2 → /workspace");
  }
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
