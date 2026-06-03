import { Fragment, type ReactNode } from "react";
import Image from "next/image";

import { resolveApplicantDisplayName } from "@/lib/application-assignee";
import { isR4ProposalRowKey } from "@/lib/r4-decision-state";
import {
  getFacultyNameForStudiengang,
  studienstufeFromStudiengang,
} from "@/lib/uzh-studiengaenge";
import { REVIEW_BLOCK_DEFAULT_CLASS } from "@/lib/design-tokens/review-block";
import { hfTypography } from "@/lib/design-tokens/typography";
import {
  type R4DecisionBlockSnapshot,
  type R4DecisionReview,
  type WorkspaceApplication,
} from "@/lib/test-flow-types";
import { cn } from "@/lib/utils";

const UZH_LOGO_SRC = "/images/r4-decision/uzh-logo.svg";
const FAKE_SIGNATURE_SRC = "/images/r4-decision/fake-signature.svg";

/** Figma `6415:26074` — Abschnitt mit unterer Trennlinie (kein separater Divider). */
const VERFUEGUNG_SECTION_BORDER_CLASS =
  "border-b border-border pb-5";

/* -------------------------------------------------------------------------------------------------
 * Inhalts-Konfiguration der Verfügung
 * ------------------------------------------------------------------------------------------------*/
export const VERFUEGUNG_CONTENT = {
  institution: "Universität Zürich",
  facultyFallback: "Rechtswissenschaftliche Fakultät",
  addressLines: [
    "Universität Zürich",
    "{faculty}",
    "Rämistrasse 74/2",
    "CH-8001 Zürich",
  ],
  signer: {
    name: "Markus Decision",
    role: "Studiendekan",
    email: "markus.decision@uzh.ch",
  },
  city: "Zürich",
  titleTemplate: "Verfügung betreffend Nachteilsausgleichender Massnahmen ab {semester}",
  greetingTemplate: "Guten Tag {name}",
  intro:
    "Ich beziehe mich auf Ihren Antrag um Gewährung nachteilsausgleichender Massnahmen (NTA). Wir haben diesen eingehend geprüft. Nachfolgend finden Sie die bewilligten NTA mit allen relevanten Angaben.",
  labels: {
    person: "Antragsstellende Person",
    personName: "Name, Vorname",
    personMatrikel: "Matrikelnummer",
    personStufe: "Studienstufe",
    contacts: "Kontaktpersonen",
    contactFsb: "Kontaktstelle Fachstelle Studium und Behinderung (FSB)",
    contactDekanat: "Kontakt Dekanat",
    measuresLecture: "Gewährte NTA Massnahmen für Lehrveranstaltungen",
    measuresAssessment: "Gewährte NTA Massnahmen für Leistungsnachweise",
  },
  contactDekanatPrefix: "Student Services: ",
  contactDekanatEmail: "studium@uzh.ch",
  contactFsbEmailFallback: "fachstelle@uzh.ch",
  rejectedMeasuresText: {
    lecture:
      "Der antragstellenden Person wurden keine Ausgleichsmassnahmen im Bezug auf Lehrveranstaltungen gewährt.",
    assessment:
      "Der antragstellenden Person wurden keine Ausgleichsmassnahmen im Bezug auf Leistungsnachweise gewährt.",
  },
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

/** Textbausteine abgelehnte Verfügung — Figma `6426:26894`. */
export const VERFUEGUNG_REJECTED_CONTENT = {
  introLead:
    "Ich beziehe mich auf Ihren Antrag um Gewährung nachteilsausgleichender Massnahmen (NTA). Wir haben diesen eingehend geprüft. Nach sorgfältiger Prüfung können wir Ihrem",
  introEmphasis: " Antrag nicht stattgeben.",
  introTail:
    " Über die Möglichkeit, gegen diesen Entscheid Einsprache zu erheben, informiert Sie die nachfolgende Rechtsmittelbelehrung.",
} as const;

function formatSwissDate(value: Date): string {
  return value.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function currentSemesterLabel(now = new Date()): string {
  const month = now.getMonth();
  const isSpring = month >= 1 && month <= 7;
  return `${isSpring ? "Frühjahrssemester" : "Herbstsemester"} ${now.getFullYear()}`;
}

type VerfuegungMeasureItem = { key: string; title: string; description: string };

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

/** Rechts oben im Adressblock — Fakultät aus dem Antrag. */
function signerContactLines(facultyName: string): string[] {
  const { name, role, email } = VERFUEGUNG_CONTENT.signer;
  return [name, role, facultyName, email];
}

function formatFsbContactLine(advisorName: string): { prefix: string; email: string } {
  const trimmed = advisorName.trim();
  const emailMatch = trimmed.match(/[\w.+-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    const email = emailMatch[0];
    const prefix = trimmed.replace(email, "").replace(/:\s*$/, "").trim();
    return {
      prefix: prefix ? `${prefix}: ` : "",
      email,
    };
  }
  return {
    prefix: trimmed ? `${trimmed}: ` : "",
    email: VERFUEGUNG_CONTENT.contactFsbEmailFallback,
  };
}

function DefinitionRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex w-full items-start">
      <span
        className={cn(
          hfTypography.paragraphRegular,
          "w-[188px] shrink-0 text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span className={cn(hfTypography.paragraphMedium, "min-w-0 text-foreground")}>
        {value}
      </span>
    </div>
  );
}

function ContactEmailLine({ prefix, email }: { prefix: string; email: string }) {
  return (
    <p className={cn(hfTypography.paragraphMedium, "text-foreground")}>
      <span>{prefix}</span>
      <a
        href={`mailto:${email}`}
        className="underline decoration-from-font underline-offset-2"
      >
        {email}
      </a>
    </p>
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
    <section className={cn("flex w-full flex-col gap-3", VERFUEGUNG_SECTION_BORDER_CLASS)}>
      <h3 className={cn(hfTypography.paragraphLargeBold, "text-foreground")}>{title}</h3>
      {items.length > 0 ? (
        <ol className="m-0 flex w-full list-none flex-col gap-2 p-0">
          {items.map((item, index) => (
            <li key={item.key} className="flex w-full flex-col gap-0.5">
              <div
                className={cn(
                  hfTypography.paragraphMedium,
                  "flex w-full leading-6 text-foreground",
                )}
              >
                <span className="w-6 shrink-0 tabular-nums">{index + 1}.</span>
                <span className="min-w-0 flex-1">{item.title}</span>
              </div>
              <div className="w-full pl-6">
                <p
                  className={cn(
                    hfTypography.paragraphSmall,
                    "whitespace-pre-wrap text-foreground",
                  )}
                >
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

export type R4VerfuegungVariant = "approved" | "rejected";

type R4VerfuegungDocumentProps = {
  application: WorkspaceApplication;
  review: R4DecisionReview;
  variant?: R4VerfuegungVariant;
  className?: string;
};

/**
 * Generierte Verfügung (R4-Entscheid). Layout Figma `6415:26074` (Inhalt ohne Canvas-Rahmen).
 */
export function R4VerfuegungDocument({
  application,
  review,
  variant = "approved",
  className,
}: R4VerfuegungDocumentProps) {
  const isRejected = variant === "rejected";
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

  const issuedLabel = formatSwissDate(new Date());

  const lectureItems = approvedMeasureItems(review.blocks.lectureMeasures);
  const assessmentItems = approvedMeasureItems(review.blocks.assessmentMeasures);
  const showLecture = !isRejected && Boolean(review.blocks.lectureMeasures);
  const showAssessment = !isRejected && Boolean(review.blocks.assessmentMeasures);

  const fsbAdvisor =
    data.consultation?.advisor?.trim()
    || data.recommendation?.releasedBy?.trim()
    || "NTA Fachstelle";
  const fsbContact = formatFsbContactLine(fsbAdvisor);

  const addressLines = VERFUEGUNG_CONTENT.addressLines.map((line) =>
    line.replace("{faculty}", facultyName),
  );

  const facultyDisplayLines = facultyName.includes("\n")
    ? facultyName.split("\n")
    : facultyName.includes(" Fakultät")
      ? facultyName.split(" Fakultät").map((part, i) =>
          i === 0 ? `${part.trimEnd()}` : `Fakultät${part}`,
        )
      : [facultyName];

  return (
    <article
      className={cn(
        REVIEW_BLOCK_DEFAULT_CLASS,
        "flex w-full shrink-0 flex-col gap-24 pt-12 pb-6 px-8",
        className,
      )}
      aria-label="Generierte Verfügung"
    >
      {/* Adresse — Figma `6415:26076` */}
      <div className="flex w-full flex-col gap-22">
        <header className="flex h-[48px] w-full items-start">
          <div className="flex items-start gap-8">
            <Image
              src={UZH_LOGO_SRC}
              alt=""
              width={141}
              height={48}
              className="h-[48px] w-[141px] shrink-0 object-contain object-left"
              unoptimized
            />
            <span className="h-10 w-px shrink-0 bg-border" aria-hidden />
            <p
              className={cn(
                hfTypography.paragraphMedium,
                "max-w-[311px] break-words text-foreground",
              )}
            >
              {facultyDisplayLines.map((line, i) => (
                <Fragment key={line}>
                  {i > 0 ? <br /> : null}
                  {line}
                </Fragment>
              ))}
            </p>
          </div>
        </header>

        <div
          className={cn(
            hfTypography.paragraphSmall,
            "flex w-full flex-col gap-4 text-foreground",
          )}
        >
          <p className="whitespace-pre-line text-foreground">{addressLines.join("\n")}</p>
          <p className="w-full whitespace-pre-line text-right text-foreground">
            {signerContactLines(facultyName).join("\n")}
          </p>
        </div>
      </div>

      {/* Inhalt — Figma `6415:26086`, gap 20px zwischen Abschnitten */}
      <div className="flex w-full flex-col gap-5">
        {/* Anrede — `6415:26087` */}
        <section className={cn("flex w-full flex-col gap-12", VERFUEGUNG_SECTION_BORDER_CLASS)}>
          <div className="flex w-full flex-col gap-3">
            <p className={cn(hfTypography.paragraphSmall, "text-muted-foreground")}>
              {VERFUEGUNG_CONTENT.city}, {issuedLabel}
            </p>
            <h2 className={cn(hfTypography.h3, "text-foreground")}>{title}</h2>
          </div>
          <div className="flex w-full flex-col gap-1 text-foreground">
            <p className={cn(hfTypography.paragraphLargeBold, "text-foreground")}>{greeting}</p>
            {isRejected ? (
              <p className={cn(hfTypography.paragraphRegular, "text-foreground")}>
                {VERFUEGUNG_REJECTED_CONTENT.introLead}
                <span className={cn(hfTypography.paragraphBold, "text-foreground")}>
                  {VERFUEGUNG_REJECTED_CONTENT.introEmphasis}
                </span>
                {VERFUEGUNG_REJECTED_CONTENT.introTail}
              </p>
            ) : (
              <p className={cn(hfTypography.paragraphRegular, "text-foreground")}>
                {VERFUEGUNG_CONTENT.intro}
              </p>
            )}
          </div>
        </section>

        {/* Antragsstellende Person — `6415:26094` */}
        <section
          className={cn(
            "flex w-full flex-col gap-1",
            VERFUEGUNG_SECTION_BORDER_CLASS,
          )}
        >
          <h3 className={cn(hfTypography.paragraphMedium, "text-foreground")}>
            {VERFUEGUNG_CONTENT.labels.person}
          </h3>
          <div className="flex w-full flex-col">
            <DefinitionRow label={VERFUEGUNG_CONTENT.labels.personName} value={nameVorname} />
            <DefinitionRow label={VERFUEGUNG_CONTENT.labels.personMatrikel} value={matrikel} />
            <DefinitionRow label={VERFUEGUNG_CONTENT.labels.personStufe} value={studienstufe} />
          </div>
        </section>

        {/* Kontaktpersonen — `6415:26106` */}
        <section
          className={cn(
            "flex w-full flex-col gap-2",
            VERFUEGUNG_SECTION_BORDER_CLASS,
          )}
        >
          <h3 className={cn(hfTypography.paragraphMedium, "text-foreground")}>
            {VERFUEGUNG_CONTENT.labels.contacts}
          </h3>
          <div className="flex w-full flex-col gap-3">
            <div className="flex w-full flex-col">
              <p className={cn(hfTypography.paragraphRegular, "text-muted-foreground")}>
                {VERFUEGUNG_CONTENT.labels.contactFsb}
              </p>
              <ContactEmailLine prefix={fsbContact.prefix} email={fsbContact.email} />
            </div>
            <div className="flex w-full flex-col">
              <p className={cn(hfTypography.paragraphRegular, "text-muted-foreground")}>
                {VERFUEGUNG_CONTENT.labels.contactDekanat}
              </p>
              <ContactEmailLine
                prefix={VERFUEGUNG_CONTENT.contactDekanatPrefix}
                email={VERFUEGUNG_CONTENT.contactDekanatEmail}
              />
            </div>
          </div>
        </section>

        {showLecture ? (
          <MeasuresSection
            title={VERFUEGUNG_CONTENT.labels.measuresLecture}
            items={lectureItems}
            rejectedText={VERFUEGUNG_CONTENT.rejectedMeasuresText.lecture}
          />
        ) : null}

        {showAssessment ? (
          <MeasuresSection
            title={VERFUEGUNG_CONTENT.labels.measuresAssessment}
            items={assessmentItems}
            rejectedText={VERFUEGUNG_CONTENT.rejectedMeasuresText.assessment}
          />
        ) : null}

        {/* Einsprachen — `6415:26130` */}
        <section className={cn("flex w-full flex-col gap-3", VERFUEGUNG_SECTION_BORDER_CLASS)}>
          <h3 className={cn(hfTypography.paragraphLargeBold, "text-foreground")}>
            {VERFUEGUNG_CONTENT.appeals.heading}
          </h3>
          <div className="flex w-full flex-col gap-2">
            <p className={cn(hfTypography.paragraphSmall, "text-foreground")}>
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
            <p className={cn(hfTypography.paragraphSmall, "text-foreground")}>
              {VERFUEGUNG_CONTENT.appeals.dekanat}
            </p>
          </div>
        </section>

        {/* Fusszeile — `6415:26137` */}
        <footer className="flex w-full flex-col gap-4">
          <p className={cn(hfTypography.paragraphRegular, "text-foreground")}>
            {VERFUEGUNG_CONTENT.closing}
          </p>
          <div className="flex w-fit flex-col gap-1">
            <Image
              src={FAKE_SIGNATURE_SRC}
              alt=""
              width={92}
              height={55}
              className="h-[55px] w-[92px] object-contain object-left"
              unoptimized
            />
            <div className="flex flex-col">
              <span className={cn(hfTypography.paragraphMedium, "text-primary")}>
                {VERFUEGUNG_CONTENT.signer.name}
              </span>
              <span className={cn(hfTypography.paragraphRegular, "text-muted-foreground")}>
                {VERFUEGUNG_CONTENT.signer.role}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </article>
  );
}
