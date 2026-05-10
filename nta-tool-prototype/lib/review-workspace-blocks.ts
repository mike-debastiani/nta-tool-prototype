/**
 * Gemeinsame IDs für R2-Review-Blöcke und Anker im R1-Antragsformular
 * (`nta-antrag-desktop.tsx`), z. B. Sprung aus gespeicherten Review-Kommentaren.
 */

export type ReviewWorkspaceBlockId =
  | "applicant"
  | "attest"
  | "definition"
  | "duration"
  | "scope"
  | "lectureMeasures"
  | "assessmentMeasures";

const ANCHOR_PREFIX = "nta-review-block";

/** DOM-`id` für `scrollIntoView` — muss zu den `id`s in `nta-antrag-desktop.tsx` passen. */
export function reviewWorkspaceAnchorId(blockId: ReviewWorkspaceBlockId): string {
  return `${ANCHOR_PREFIX}-${blockId}`;
}

/**
 * Ziel-Schritt im Antragsflow für Navigation aus einem Block-Kommentar.
 * Anker für `definition` … `assessmentMeasures` liegen auf **step4_application**.
 */
export function reviewBlockToAntragStep(
  blockId: ReviewWorkspaceBlockId,
):
  | "step1"
  | "step2"
  | "step4_application" {
  switch (blockId) {
    case "applicant":
      return "step1";
    case "attest":
      return "step2";
    case "definition":
    case "duration":
    case "scope":
    case "lectureMeasures":
    case "assessmentMeasures":
      return "step4_application";
  }
}
