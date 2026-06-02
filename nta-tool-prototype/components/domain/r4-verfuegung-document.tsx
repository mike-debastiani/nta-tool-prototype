import { Fragment, type ReactNode } from "react";

import { formatReviewSubmittedAt } from "@/lib/application-review-labels";
import { resolveApplicantDisplayName } from "@/lib/application-assignee";
import { isR4ProposalRowKey } from "@/lib/r4-decision-state";
import {
  getFacultyNameForStudiengang,
  studienstufeFromStudiengang,
} from "@/lib/uzh-studiengaenge";
import { hfTypography } from "@/lib/design-tokens/typography";
import {
  type R4DecisionBlockSnapshot,
  type R4DecisionReview,
  type WorkspaceApplication,
} from "@/lib/test-flow-types";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------------------------------
 * Inhalts-Konfiguration der Verfügung
 *
 * Alle FIXEN Textbausteine der Verfügung sind hier zentral gebündelt, damit sie einfach
 * angepasst werden können, ohne das Layout anzufassen. Dynamische Angaben (Name, Massnahmen,
 * Gültigkeit, …) werden aus dem Antrag (`application` / `review`) abgeleitet (siehe unten).
 * ------------------------------------------------------------------------------------------------*/
export const VERFUEGUNG_CONTENT = {
  /** Absender / Hochschule (Briefkopf links). */
  institution: "Universität Zürich",
  /** Fallback-Fakultätsname, falls kein Studiengang am Antrag hängt. */
  facultyFallback: "Rechtswissenschaftliche Fakultät",
  addressLines: [
    "Universität Zürich",
    "{faculty}",
    "Rämistrasse 74/2",
    "CH-8001 Zürich",
  ],
  /** Unterzeichnende Person (rechts oben + Unterschrift unten). */
  signer: {
    name: "Markus Decision",
    role: "Studiendekan",
    email: "studium@uzh.ch",
  },
  /** Ort für die Datumszeile. */
  city: "Zürich",
  /** Titel der Verfügung — `{semester}` wird durch das aktuelle Semester ersetzt. */
  titleTemplate: "Verfügung betreffend Nachteilsausgleichender Massnahmen ab {semester}",
  /** Anrede — `{name}` = «Vorname Nachname». */
  greetingTemplate: "Guten Tag {name}",
  /** Einleitungssatz (fix). */
  intro:
    "Ich beziehe mich auf Ihren Antrag um Gewährung nachteilsausgleichender Massnahmen (NTA). Wir haben diesen eingehend geprüft. Nachfolgend finden Sie die bewilligten NTA mit allen relevanten Angaben.",
  labels: {
    person: "Antragsstellende Person",
    personName: "Name, Vorname",
    personMatrikel: "Matrikelnummer",
    personStufe: "Studienstufe",
    details: "Antragsdetails",
    detailEingereicht: "Antragseinreichung",
    detailAusgestellt: "Verfügung ausgestellt",
    detailDauer: "Gültigkeitsdauer",
    detailScope: "Geltungsbereich",
    contacts: "Kontaktpersonen",
    contactFsb: "Kontaktstelle Fachstelle Studium und Behinderung (FSB)",
    contactDekanat: "Kontakt Dekanat",
    measuresLecture: "Gewährte NTA Massnahmen für Lehrveranstaltungen",
    measuresAssessment: "Gewährte NTA Massnahmen für Leistungsnachweise",
  },
  /** Kontakt Dekanat (fix). */
  contactDekanatEmail: "studium@uzh.ch",
  /** Platzhalter, falls ein Block ohne zugesprochene Auswahl entschieden wurde. */
  emptyDurationValue: "Keine Gültigkeitsdauer zugesprochen",
  emptyScopeValue: "Kein Geltungsbereich zugesprochen",
  /** Hinweistexte, falls ein Massnahmen-Block abgelehnt wurde (keine Massnahme gewährt). */
  rejectedMeasuresText: {
    lecture:
      "Der antragstellenden Person wurden keine Ausgleichsmassnahmen im Bezug auf Lehrveranstaltungen gewährt.",
    assessment:
      "Der antragstellenden Person wurden keine Ausgleichsmassnahmen im Bezug auf Leistungsnachweise gewährt.",
  },
  /** Einsprachen / Rekurse (fix, immer angezeigt). */
  appeals: {
    heading: "Einsprachen und Rekurse",
    rekursLeadIn:
      "Gegen den Einspracheentscheid der Studiendekanin oder des Studiendekans können Sie Rekurs bei der Rekurskommission der Zürcher Hochschulen erheben. Bitte beachten sie die Rechtsmittelbelehrung im Einspracheentscheid. Weitere Informationen zum Rekursverfahren finden Sie auf der Webseite des ",
    rekursLinkLabel: "Kantons Zürich",
    rekursLinkHref:
      "https://www.zh.ch/de/bildung/schulen/hochschule/rekurse-im-hochschulbereich.html",
    rekursTrailing: ".",
    dekanat:
      "Das Dekanat beantwortet allgemeine Fragen zum Einspracheverfahren oder zur Modulbuchung. Die Rechtsstelle erteilt keine Auskünfte, auch nicht zum Einspracheverfahren. Sie gibt einzig schriftliche Informationen zum Stand des Verfahrens.",
  },
  closing: "Freundliche Grüsse",
} as const;

/* -------------------------------------------------------------------------------------------------
 * Datenableitung aus dem Antrag
 * ------------------------------------------------------------------------------------------------*/

function formatSwissDate(value: Date): string {
  return value.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Aktuelles Semester (Frühjahrs-/Herbstsemester) für den Verfügungstitel. */
function currentSemesterLabel(now = new Date()): string {
  const month = now.getMonth(); // 0 = Januar
  const isSpring = month >= 1 && month <= 7; // Feb–Aug
  return `${isSpring ? "Frühjahrssemester" : "Herbstsemester"} ${now.getFullYear()}`;
}

type VerfuegungMeasureItem = { key: string; title: string; description: string };

/**
 * Bewilligte Massnahmen eines Blocks als nummerierte Einträge mit Titel + Beschreibung —
 * identisch zur Darstellung im «definiert»-Zustand der Entscheidung (`R4DecisionDefinedList`).
 * Konkretisierte Werte (`concretizedTitle`/`-Description`) werden bevorzugt.
 */
function approvedMeasureItems(
  block: R4DecisionBlockSnapshot | undefined,
): VerfuegungMeasureItem[] {
  if (!block) return [];
  return block.rows
    .filter((row) => row.r4Approved && row.key !== "__keine__")
    .map((row) => {
      const isProposal = isR4ProposalRowKey(row.key);
      const defaultTitle = isProposal ? "Sonstige Massnahme" : row.title;
      const fallbackDescription = isProposal ? row.title : row.description ?? "";
      return {
        key: row.key,
        title: (row.concretizedTitle ?? defaultTitle).trim(),
        description: (row.concretizedDescription ?? fallbackDescription).trim(),
      };
    });
}

function approvedDurationLabel(block: R4DecisionBlockSnapshot | undefined): string | null {
  const row = block?.rows.find((r) => r.r4Approved);
  if (!row) return null;
  return (row.concretizedTitle ?? row.title).trim() || null;
}

function approvedScopeLabels(block: R4DecisionBlockSnapshot | undefined): string[] {
  return (block?.rows ?? [])
    .filter((row) => row.r4Approved)
    .map((row) => (isR4ProposalRowKey(row.key) ? row.title.trim() : row.title))
    .filter(Boolean);
}

/* -------------------------------------------------------------------------------------------------
 * Layout-Bausteine
 * ------------------------------------------------------------------------------------------------*/

function Divider() {
  return <div className="h-px w-full bg-border" aria-hidden />;
}

function DocSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-3">
      <h3 className={cn(hfTypography.paragraphMedium, "text-foreground")}>{title}</h3>
      {children}
    </section>
  );
}

function DefinitionRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span
        className={cn(
          hfTypography.paragraphRegular,
          "w-[200px] shrink-0 text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span className={cn(hfTypography.paragraphMedium, "min-w-0 flex-1 text-foreground")}>
        {value}
      </span>
    </div>
  );
}

function MeasuresSection({
  title,
  items,
  rejectedText,
}: {
  title: string;
  items: VerfuegungMeasureItem[];
  rejectedText: string;
}) {
  return (
    <section className="flex w-full flex-col gap-6">
      <h3 className={cn(hfTypography.paragraphLargeBold, "text-foreground")}>{title}</h3>
      {items.length > 0 ? (
        <ol className="flex w-full flex-col gap-4">
          {items.map((item, index) => (
            <li key={item.key} className="flex w-full flex-col gap-1">
              {/* Heading: Nummerierung + Massnahmentitel (paragraph regular/medium, 16/24). */}
              <div className="flex w-full text-base font-medium leading-6 text-foreground">
                <span className="w-6 shrink-0 tabular-nums">{index + 1}.</span>
                <span className="min-w-0 flex-1">{item.title}</span>
              </div>
              {/* Beschreibung mit Einzug unter dem Titel (paragraph small/regular, 14/20). */}
              <div className="w-full pl-6">
                <p className="whitespace-pre-wrap text-sm font-normal leading-5 text-foreground">
                  {item.description || "—"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className={cn(hfTypography.paragraphMedium, "text-foreground")}>{rejectedText}</p>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Verfügung
 * ------------------------------------------------------------------------------------------------*/

type R4VerfuegungDocumentProps = {
  application: WorkspaceApplication;
  review: R4DecisionReview;
  className?: string;
};

/**
 * Generierte Verfügung (R4-Entscheid). Briefartiges Dokument, dessen fixe Textbausteine in
 * `VERFUEGUNG_CONTENT` liegen und dessen dynamische Angaben aus Antrag + R4-Entscheid stammen.
 * Figma `6354:26077`.
 */
export function R4VerfuegungDocument({
  application,
  review,
  className,
}: R4VerfuegungDocumentProps) {
  const data = application.data;
  const personal = data.personalData;

  const applicantFullName = resolveApplicantDisplayName(application);
  const nameVorname =
    personal?.name || personal?.vorname
      ? `${personal?.name ?? ""}, ${personal?.vorname ?? ""}`.replace(/^, |, $/g, "").trim()
      : applicantFullName;
  const matrikel = personal?.matrikel?.trim() || "—";
  const studienstufe = studienstufeFromStudiengang(personal?.studiengang);
  const facultyName =
    getFacultyNameForStudiengang(personal?.studiengang) !== "—"
      ? getFacultyNameForStudiengang(personal?.studiengang)
      : VERFUEGUNG_CONTENT.facultyFallback;

  const semester = currentSemesterLabel();
  const title = VERFUEGUNG_CONTENT.titleTemplate.replace("{semester}", semester);
  const greeting = VERFUEGUNG_CONTENT.greetingTemplate.replace("{name}", applicantFullName);

  const submittedLabel = formatReviewSubmittedAt(data) ?? formatSwissDate(new Date(application.created_at));
  const issuedLabel = formatSwissDate(new Date());

  const durationLabel = approvedDurationLabel(review.blocks.duration);
  const scopeLabels = approvedScopeLabels(review.blocks.scope);

  const lectureItems = approvedMeasureItems(review.blocks.lectureMeasures);
  const assessmentItems = approvedMeasureItems(review.blocks.assessmentMeasures);
  const showLecture = Boolean(review.blocks.lectureMeasures);
  const showAssessment = Boolean(review.blocks.assessmentMeasures);

  const fsbContact =
    data.consultation?.advisor?.trim()
    || data.recommendation?.releasedBy?.trim()
    || "NTA Fachstelle";

  const addressLines = VERFUEGUNG_CONTENT.addressLines.map((line) =>
    line.replace("{faculty}", facultyName),
  );

  return (
    <article
      className={cn(
        "flex w-full flex-col gap-16 rounded-xl border border-border bg-background p-8 sm:p-10 lg:p-12",
        className,
      )}
      aria-label="Generierte Verfügung"
    >
      {/* Briefkopf */}
      <header className="flex items-center gap-6">
        <span className={cn(hfTypography.paragraphLargeBold, "text-foreground")}>
          {VERFUEGUNG_CONTENT.institution}
        </span>
        <span className="h-10 w-px bg-border" aria-hidden />
        <span className={cn(hfTypography.paragraphMedium, "text-foreground")}>
          {facultyName}
        </span>
      </header>

      {/* Absender / Unterzeichnende Person */}
      <div className="flex items-start justify-between gap-6">
        <p className={cn(hfTypography.paragraphMedium, "whitespace-pre-line text-foreground")}>
          {addressLines.join("\n")}
        </p>
        <p
          className={cn(
            hfTypography.paragraphMedium,
            "whitespace-pre-line text-right text-foreground",
          )}
        >
          {`${VERFUEGUNG_CONTENT.signer.name}\n${VERFUEGUNG_CONTENT.signer.role}\n${VERFUEGUNG_CONTENT.signer.email}`}
        </p>
      </div>

      {/* Titel + Body */}
      <div className="flex flex-col gap-12">
        <div className="flex flex-col gap-3">
          <p className={cn(hfTypography.paragraphSmall, "text-muted-foreground")}>
            {VERFUEGUNG_CONTENT.city}, {issuedLabel}
          </p>
          <h2 className={cn(hfTypography.h3, "text-foreground")}>{title}</h2>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 text-foreground">
            <p className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>{greeting}</p>
            <p className={cn(hfTypography.paragraphRegular, "text-foreground")}>
              {VERFUEGUNG_CONTENT.intro}
            </p>
          </div>

          <Divider />

          <DocSection title={VERFUEGUNG_CONTENT.labels.person}>
            <div className="flex flex-col gap-1">
              <DefinitionRow label={VERFUEGUNG_CONTENT.labels.personName} value={nameVorname} />
              <DefinitionRow label={VERFUEGUNG_CONTENT.labels.personMatrikel} value={matrikel} />
              <DefinitionRow label={VERFUEGUNG_CONTENT.labels.personStufe} value={studienstufe} />
            </div>
          </DocSection>

          <Divider />

          <DocSection title={VERFUEGUNG_CONTENT.labels.details}>
            <div className="flex flex-col gap-1">
              <DefinitionRow
                label={VERFUEGUNG_CONTENT.labels.detailEingereicht}
                value={submittedLabel}
              />
              <DefinitionRow
                label={VERFUEGUNG_CONTENT.labels.detailAusgestellt}
                value={issuedLabel}
              />
              <DefinitionRow
                label={VERFUEGUNG_CONTENT.labels.detailDauer}
                value={durationLabel ?? VERFUEGUNG_CONTENT.emptyDurationValue}
              />
              <DefinitionRow
                label={VERFUEGUNG_CONTENT.labels.detailScope}
                value={
                  scopeLabels.length > 0
                    ? scopeLabels.join(", ")
                    : VERFUEGUNG_CONTENT.emptyScopeValue
                }
              />
            </div>
          </DocSection>

          <Divider />

          <DocSection title={VERFUEGUNG_CONTENT.labels.contacts}>
            <div className="flex flex-col gap-1">
              <DefinitionRow label={VERFUEGUNG_CONTENT.labels.contactFsb} value={fsbContact} />
              <DefinitionRow
                label={VERFUEGUNG_CONTENT.labels.contactDekanat}
                value={VERFUEGUNG_CONTENT.contactDekanatEmail}
              />
            </div>
          </DocSection>

          <Divider />

          {showLecture ? (
            <Fragment>
              <MeasuresSection
                title={VERFUEGUNG_CONTENT.labels.measuresLecture}
                items={lectureItems}
                rejectedText={VERFUEGUNG_CONTENT.rejectedMeasuresText.lecture}
              />
              <Divider />
            </Fragment>
          ) : null}

          {showAssessment ? (
            <Fragment>
              <MeasuresSection
                title={VERFUEGUNG_CONTENT.labels.measuresAssessment}
                items={assessmentItems}
                rejectedText={VERFUEGUNG_CONTENT.rejectedMeasuresText.assessment}
              />
              <Divider />
            </Fragment>
          ) : null}

          <section className="flex w-full flex-col gap-4">
            <h3 className={cn(hfTypography.paragraphLargeBold, "text-foreground")}>
              {VERFUEGUNG_CONTENT.appeals.heading}
            </h3>
            <p className={cn(hfTypography.paragraphRegular, "text-foreground")}>
              {VERFUEGUNG_CONTENT.appeals.rekursLeadIn}
              <a
                href={VERFUEGUNG_CONTENT.appeals.rekursLinkHref}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-from-font underline-offset-2"
              >
                {VERFUEGUNG_CONTENT.appeals.rekursLinkLabel}
              </a>
              {VERFUEGUNG_CONTENT.appeals.rekursTrailing}
            </p>
            <p className={cn(hfTypography.paragraphRegular, "text-foreground")}>
              {VERFUEGUNG_CONTENT.appeals.dekanat}
            </p>
          </section>

          <Divider />
        </div>
      </div>

      {/* Grussformel + Unterschrift */}
      <div className="flex flex-col gap-3">
        <p className={cn(hfTypography.paragraphMedium, "text-foreground")}>
          {VERFUEGUNG_CONTENT.closing}
        </p>
        <SignatureMark />
        <div className="flex flex-col">
          <span className={cn(hfTypography.paragraphMedium, "text-foreground")}>
            {VERFUEGUNG_CONTENT.signer.name}
          </span>
          <span className={cn(hfTypography.paragraphRegular, "text-muted-foreground")}>
            {VERFUEGUNG_CONTENT.signer.role}
          </span>
        </div>
      </div>
    </article>
  );
}

/** Dezente Unterschrift-Andeutung (Platzhalter anstelle einer eingescannten Unterschrift). */
function SignatureMark() {
  return (
    <svg
      width="92"
      height="40"
      viewBox="0 0 92 40"
      fill="none"
      className="text-foreground"
      aria-hidden
    >
      <path
        d="M2 30C8 18 13 8 17 10c4 2-2 20 2 22 4 2 9-22 13-22 3 0 1 16 4 16 4 0 8-14 12-14 3 0 2 10 5 10 5 0 9-12 15-16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
