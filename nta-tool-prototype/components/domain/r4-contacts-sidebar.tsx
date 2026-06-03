"use client";

import { useMemo } from "react";

import { APPLICATION_CONTENT_PANEL_CARD_CLASS } from "@/lib/design-tokens/application-content-panel";
import { resolveApplicantDisplayName } from "@/lib/application-assignee";
import { hfTypography } from "@/lib/design-tokens/typography";
import type { WorkspaceApplication } from "@/lib/test-flow-types";
import { cn } from "@/lib/utils";

/** Prototyp — Fachstelle-Telefon/E-Mail (nicht im Antragsformular). */
const PROTOTYPE_FACHSTELLE_PHONE = "+41 44 634 39 00";
const PROTOTYPE_FACHSTELLE_EMAIL = "fachstelle@uzh.ch";

const R4_CONTACT_INNER_BLOCK_CLASS =
  "flex flex-col gap-4 rounded-xl border border-border bg-background px-3 py-4";

const R4_CONTACT_AVATAR_CLASS =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-hf-paragraph-small-bold text-foreground";

function initialsFromDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "—";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
  }
  const compact = trimmed.replace(/\s+/g, "");
  if (compact.length >= 2) return compact.slice(0, 2).toUpperCase();
  return `${compact[0] ?? "?"}${compact[0] ?? "?"}`.toUpperCase();
}

function ContactDetailLine({
  children,
  href,
}: {
  children: string;
  href?: string;
}) {
  const className = cn(
    hfTypography.paragraphMini,
    "text-stone-500",
    href && "underline underline-offset-2 hover:text-foreground",
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return <p className={className}>{children}</p>;
}

function ContactPersonRow({
  name,
  initials,
  email,
  phone,
}: {
  name: string;
  initials: string;
  email?: string | null;
  phone?: string | null;
}) {
  const emailTrimmed = email?.trim();
  const phoneTrimmed = phone?.trim();

  return (
    <div className="flex w-full items-center gap-3">
      <span className={R4_CONTACT_AVATAR_CLASS} aria-hidden>
        {initials}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
          {name}
        </p>
        {phoneTrimmed ? (
          <ContactDetailLine>{phoneTrimmed}</ContactDetailLine>
        ) : null}
        {emailTrimmed ? (
          <ContactDetailLine href={`mailto:${emailTrimmed}`}>
            {emailTrimmed}
          </ContactDetailLine>
        ) : null}
      </div>
    </div>
  );
}

function resolveFachstelleContact(application: WorkspaceApplication) {
  const displayName =
    application.data.consultation?.advisor?.trim()
    || application.data.recommendation?.releasedBy?.trim()
    || "NTA Fachstelle";

  return {
    displayName,
    initials: initialsFromDisplayName(displayName),
    phone: PROTOTYPE_FACHSTELLE_PHONE,
    email: PROTOTYPE_FACHSTELLE_EMAIL,
  };
}

function resolveApplicantContact(application: WorkspaceApplication) {
  const pd = application.data.personalData;
  const displayName = resolveApplicantDisplayName(application);
  const email = pd?.email?.trim() || application.users[0]?.email?.trim() || null;
  const phone = pd?.phone?.trim() || null;

  return {
    displayName,
    initials: initialsFromDisplayName(displayName),
    email,
    phone,
  };
}

/**
 * Sidebar «Kontakt» (Figma `6605:26547`) — unter Antragdetails in R4-Antragsansicht.
 */
export function R4ContactsSidebar({
  application,
  className,
}: {
  application: WorkspaceApplication;
  className?: string;
}) {
  const fachstelle = useMemo(
    () => resolveFachstelleContact(application),
    [application],
  );
  const applicant = useMemo(
    () => resolveApplicantContact(application),
    [application],
  );

  return (
    <section
      className={cn(
        APPLICATION_CONTENT_PANEL_CARD_CLASS,
        "flex w-full shrink-0 flex-col gap-4 p-4",
        className,
      )}
      data-node-id="6605:26547"
      aria-labelledby="r4-contacts-heading"
    >
      <h3
        id="r4-contacts-heading"
        className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}
      >
        Kontakt
      </h3>

      <div className="flex flex-col gap-4">
        <div className={R4_CONTACT_INNER_BLOCK_CLASS} data-node-id="6605:26614">
          <div className="flex w-full flex-col gap-2">
            <p className={cn(hfTypography.paragraphMedium, "text-foreground")}>
              Fachstelle
            </p>
            <p className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
              Bei Rückfragen zur Antragstellung wenden Sie sich an folgende Person.
            </p>
          </div>
          <ContactPersonRow
            name={fachstelle.displayName}
            initials={fachstelle.initials}
            phone={fachstelle.phone}
            email={fachstelle.email}
          />
        </div>

        <div className={R4_CONTACT_INNER_BLOCK_CLASS} data-node-id="6605:26579">
          <p className={cn(hfTypography.paragraphMedium, "text-foreground")}>
            Antragstellende Person
          </p>
          <ContactPersonRow
            name={applicant.displayName}
            initials={applicant.initials}
            email={applicant.email}
            phone={applicant.phone}
          />
        </div>
      </div>
    </section>
  );
}
