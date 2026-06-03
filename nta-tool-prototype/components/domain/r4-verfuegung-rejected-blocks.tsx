"use client";

import { SquareX } from "lucide-react";

import {
  getR4BlockVisibility,
  getR4RejectedVerfuegungBlockIds,
  isR4ProposalRowKey,
  studentRejectedR4Rows,
} from "@/lib/r4-decision-state";
import {
  R4_VERFUEGUNG_REJECTED_BADGE_CLASS,
  R4_VERFUEGUNG_REJECTED_BLOCK_BODY_CLASS,
  R4_VERFUEGUNG_REJECTED_BLOCK_CLASS,
  R4_VERFUEGUNG_REJECTED_FOOTER_CLASS,
  R4_VERFUEGUNG_REJECTED_FOOTER_STATUS_CLASS,
  R4_VERFUEGUNG_REJECTED_FOOTER_STATUS_ROW_CLASS,
  R4_VERFUEGUNG_REJECTED_ROW_CARD_CLASS,
  R4_VERFUEGUNG_REJECTED_ROW_HEADER_CLASS,
  R4_VERFUEGUNG_REJECTED_ROW_HINT_CLASS,
  R4_VERFUEGUNG_REJECTED_ROW_LABEL_CLASS,
  R4_VERFUEGUNG_REJECTED_ROWS_CLASS,
  R4_DECISION_REJECTED_REASON_BLOCK_CLASS,
  R4_DECISION_REJECTED_REASON_TEXT_CLASS,
  R4_DECISION_REJECTED_REASON_TITLE_CLASS,
} from "@/lib/design-tokens/r4-decision-block";
import { hfTypography } from "@/lib/design-tokens/typography";
import type {
  R4DecisionReview,
  R4DecisionReviewBlockId,
  R4DecisionRow,
  WorkspaceApplication,
} from "@/lib/test-flow-types";
import { cn } from "@/lib/utils";

const BLOCK_TITLES: Record<R4DecisionReviewBlockId, string> = {
  duration: "Gültigkeitsdauer des Nachteilsausgleiches",
  scope: "Geltungsbereich des beantragten Nachteilsausgleiches",
  lectureMeasures: "Ausgleichsmassnahmen für Lehrveranstaltungen",
  assessmentMeasures: "Ausgleichsmassnahmen für Leistungsnachweise",
};

function blockStatusLabel(id: R4DecisionReviewBlockId): string {
  if (id === "duration") return "Keine Gültigkeit zugesprochen";
  if (id === "scope") return "Kein Geltungsbereich zugesprochen";
  return "Massnahmen abgelehnt";
}

function rowLabel(row: R4DecisionRow): string {
  if (isR4ProposalRowKey(row.key)) return "Sonstige Massnahme";
  return row.title;
}

function rowHint(row: R4DecisionRow): string | null {
  const hint = (row.description ?? "").trim();
  if (!hint) return null;
  if (isR4ProposalRowKey(row.key)) return row.title.trim() || hint;
  return hint;
}

function RejectedOptionRow({ row }: { row: R4DecisionRow }) {
  const hint = rowHint(row);
  return (
    <div className={R4_VERFUEGUNG_REJECTED_ROW_CARD_CLASS}>
      <div className={R4_VERFUEGUNG_REJECTED_ROW_HEADER_CLASS}>
        <p className={R4_VERFUEGUNG_REJECTED_ROW_LABEL_CLASS}>{rowLabel(row)}</p>
        <span className={R4_VERFUEGUNG_REJECTED_BADGE_CLASS}>Abgelehnt</span>
      </div>
      {hint ? <p className={R4_VERFUEGUNG_REJECTED_ROW_HINT_CLASS}>{hint}</p> : null}
    </div>
  );
}

function RejectedBlockSection({
  blockId,
  review,
}: {
  blockId: R4DecisionReviewBlockId;
  review: R4DecisionReview;
}) {
  const block = review.blocks[blockId]!;
  const rows = studentRejectedR4Rows(block);
  const reason = block.decisionReason?.trim() ?? "";

  return (
    <section className={R4_VERFUEGUNG_REJECTED_BLOCK_CLASS}>
      <div className={R4_VERFUEGUNG_REJECTED_BLOCK_BODY_CLASS}>
        <h3 className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>
          {BLOCK_TITLES[blockId]}
        </h3>
        {rows.length > 0 ? (
          <div className={R4_VERFUEGUNG_REJECTED_ROWS_CLASS}>
            {rows.map((row) => (
              <RejectedOptionRow key={row.key} row={row} />
            ))}
          </div>
        ) : null}
      </div>
      {reason ? (
        <footer className={R4_VERFUEGUNG_REJECTED_FOOTER_CLASS}>
          <div className={R4_DECISION_REJECTED_REASON_BLOCK_CLASS}>
            <p className={R4_DECISION_REJECTED_REASON_TITLE_CLASS}>
              Begründung für diesen Entscheid
            </p>
            <p className={R4_DECISION_REJECTED_REASON_TEXT_CLASS}>{reason}</p>
          </div>
          <div className={R4_VERFUEGUNG_REJECTED_FOOTER_STATUS_ROW_CLASS}>
            <span className={R4_VERFUEGUNG_REJECTED_FOOTER_STATUS_CLASS}>
              <SquareX className="size-4 shrink-0" aria-hidden />
              {blockStatusLabel(blockId)}
            </span>
          </div>
        </footer>
      ) : null}
    </section>
  );
}

type R4VerfuegungRejectedBlocksProps = {
  application: WorkspaceApplication;
  review: R4DecisionReview;
  className?: string;
};

/** Abgelehnte Entscheid-Blöcke unter der Verfügung — Figma `6426:26226`. */
export function R4VerfuegungRejectedBlocks({
  application,
  review,
  className,
}: R4VerfuegungRejectedBlocksProps) {
  const visibility = getR4BlockVisibility(application.data);
  const blockIds = getR4RejectedVerfuegungBlockIds(review, visibility);

  if (blockIds.length === 0) return null;

  return (
    <div className={cn("flex w-full shrink-0 flex-col gap-6", className)}>
      {blockIds.map((id) => (
        <RejectedBlockSection key={id} blockId={id} review={review} />
      ))}
    </div>
  );
}
