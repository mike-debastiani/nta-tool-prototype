"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";

import { CustomMeasureLinesField } from "@/components/domain/custom-measure-lines-field";
import {
  R1FlowField,
  R1FlowFieldControl,
  R1FlowFieldLabelGroup,
  R1FlowFieldOptions,
  R1FlowFieldStack,
  R1FlowSectionTitle,
} from "@/components/domain/r1-application-flow-layout";
import {
  ASSESSMENT_MEASURE_OPTIONS,
  LECTURE_MEASURE_OPTIONS,
  type AssessmentMeasureKey,
  type LectureMeasureKey,
} from "@/lib/application-review-labels";
import { hasMeasureOtherSelection } from "@/lib/measure-custom-lines";
import { reviewWorkspaceAnchorId } from "@/lib/review-workspace-blocks";
import { cn } from "@/lib/utils";

const APPLICATION_SCOPE_OPTIONS = [
  "Schriftliche Prüfungen",
  "Mündliche Prüfungen",
  "Schriftliche Arbeiten",
  "Während Lehrveranstaltungen",
  "Praktika",
] as const;

type ApplicationDuration = "full_study" | "one_semester";

export type R1ApplicationFormData = {
  situationDescription: string;
  duration: ApplicationDuration | "";
  scopeSelections: string[];
  lectureMeasures: LectureMeasureKey[];
  lectureMeasuresKeine: boolean;
  lectureOtherLines: string[];
  assessmentMeasures: AssessmentMeasureKey[];
  assessmentMeasuresKeine: boolean;
  assessmentOtherLines: string[];
};

export type R1ApplicationFormFieldErrors = {
  situationDescription?: string;
  duration?: string;
  scopeSelections?: string;
  lectureMeasures?: string;
  assessmentMeasures?: string;
};

export type R1ApplicationDefinitionSectionProps = {
  applicationFormData: R1ApplicationFormData;
  setApplicationFormData: Dispatch<SetStateAction<R1ApplicationFormData>>;
  errors: R1ApplicationFormFieldErrors;
  situationDescriptionRef: RefObject<HTMLTextAreaElement | null>;
  durationRadioName?: string;
  lectureOtherIdPrefix?: string;
  assessmentOtherIdPrefix?: string;
};

/** Antragsstellung — identisch Step 4 und Übersicht (HF-Feldabstände). */
export function R1ApplicationDefinitionSection({
  applicationFormData,
  setApplicationFormData,
  errors,
  situationDescriptionRef,
  durationRadioName = "application-duration",
  lectureOtherIdPrefix = "step4-lecture-other",
  assessmentOtherIdPrefix = "step4-assessment-other",
}: R1ApplicationDefinitionSectionProps) {
  return (
    <div>
      <R1FlowSectionTitle spacingBelow="compact">Antragsstellung</R1FlowSectionTitle>
      <R1FlowFieldStack spacing="definition">
        <R1FlowField
          id={reviewWorkspaceAnchorId("definition")}
          className="scroll-mt-4"
          described
        >
          <R1FlowFieldLabelGroup>
            <p className="text-base font-medium text-foreground">
              Beschreibung der gesundheitlichen Situation und Nachteile
            </p>
            <p className="text-sm text-muted-foreground">
              Beschreiben Sie Ihre gesundheitliche Situation und die behinderungsbedingten
              Nachteile auf studienrelevante Aktivitäten und Leistungsnachweise. Haben Sie noch
              keine Studienerfahrung, so können Sie auf Ihre Erfahrungen in der Schule und im
              Alltag zurückgreifen.
            </p>
          </R1FlowFieldLabelGroup>
          <R1FlowFieldControl>
            <textarea
              ref={situationDescriptionRef}
              value={applicationFormData.situationDescription}
              onChange={(event) =>
                setApplicationFormData((previous) => ({
                  ...previous,
                  situationDescription: event.target.value,
                }))
              }
              placeholder="Auswirkungen auf das Studium..."
              rows={1}
              className={cn(
                "min-h-[116px] w-full resize-none overflow-hidden rounded-lg border bg-background px-3 py-2 text-sm shadow-xs outline-none transition",
                errors.situationDescription
                  ? "border-destructive"
                  : "border-border focus:border-ring",
              )}
            />
            {errors.situationDescription ? (
              <p className="text-xs text-destructive">{errors.situationDescription}</p>
            ) : null}
          </R1FlowFieldControl>
        </R1FlowField>

        <R1FlowField
          id={reviewWorkspaceAnchorId("duration")}
          className="scroll-mt-4"
          described
        >
          <R1FlowFieldLabelGroup>
            <p className="text-base font-medium text-foreground">
              Gültigkeitsdauer des beantragten Nachteilsausgleiches
            </p>
            <p className="text-sm text-muted-foreground">
              Ihr Nachteilsausgleich kann für ein einzelnes Semester oder für die gesamte
              Studienzeit beantragt werden.
            </p>
          </R1FlowFieldLabelGroup>
          <R1FlowFieldControl>
            <R1FlowFieldOptions>
              {(
                [
                  {
                    value: "full_study",
                    title: "Gesamte Studiendauer",
                    description: "Für dauerhafte oder chronische Beeinträchtigungen",
                  },
                  {
                    value: "one_semester",
                    title: "Einmalig für ein Semester",
                    description:
                      "Für episodische Erkrankungen oder zur erstmaligen Erprobung der Massnahmen",
                  },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-3 rounded-[10px] border bg-card px-3 py-3",
                    applicationFormData.duration === option.value
                      ? "border-foreground"
                      : "border-border",
                  )}
                >
                  <input
                    type="radio"
                    name={durationRadioName}
                    checked={applicationFormData.duration === option.value}
                    onChange={() =>
                      setApplicationFormData((previous) => ({
                        ...previous,
                        duration: option.value,
                      }))
                    }
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm text-foreground">{option.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </R1FlowFieldOptions>
            {errors.duration ? (
              <p className="text-xs text-destructive">{errors.duration}</p>
            ) : null}
          </R1FlowFieldControl>
        </R1FlowField>

        <R1FlowField
          id={reviewWorkspaceAnchorId("scope")}
          className="scroll-mt-4"
          described
        >
          <R1FlowFieldLabelGroup>
            <p className="text-base font-medium text-foreground">
              Geltungsbereich des beantragten Nachteilsausgleiches
            </p>
            <p className="text-sm text-muted-foreground">
              Wählen Sie aus, für welche Arten von Leistungsnachweisen der Nachteilsausgleich
              gelten soll.
            </p>
          </R1FlowFieldLabelGroup>
          <R1FlowFieldControl>
            <R1FlowFieldOptions>
              {APPLICATION_SCOPE_OPTIONS.map((option) => (
                <label key={option} className="flex w-full items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={applicationFormData.scopeSelections.includes(option)}
                    onChange={(event) =>
                      setApplicationFormData((previous) => ({
                        ...previous,
                        scopeSelections: event.target.checked
                          ? [...previous.scopeSelections, option]
                          : previous.scopeSelections.filter((entry) => entry !== option),
                      }))
                    }
                    className="size-4 accent-primary"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </R1FlowFieldOptions>
            {errors.scopeSelections ? (
              <p className="text-xs text-destructive">{errors.scopeSelections}</p>
            ) : null}
          </R1FlowFieldControl>
        </R1FlowField>

        <R1FlowField
          id={reviewWorkspaceAnchorId("lectureMeasures")}
          className="scroll-mt-4"
          described
        >
          <R1FlowFieldLabelGroup>
            <p className="text-base font-medium text-foreground">
              Ausgleichsmassnahme für Lehrveranstaltungen
            </p>
            <p className="text-sm text-muted-foreground">
              Wählen Sie die Massnahmen aus, die Sie während Lehrveranstaltungen benötigen.
            </p>
          </R1FlowFieldLabelGroup>
          <R1FlowFieldControl>
            <R1FlowFieldOptions>
              <label
                className={cn(
                  "flex w-full cursor-pointer items-start gap-3 rounded-[10px] border bg-card px-3 py-3 text-sm",
                  applicationFormData.lectureMeasuresKeine
                    ? "border-foreground"
                    : "border-border",
                )}
              >
                <input
                  type="checkbox"
                  checked={applicationFormData.lectureMeasuresKeine}
                  onChange={(event) =>
                    setApplicationFormData((previous) => ({
                      ...previous,
                      lectureMeasuresKeine: event.target.checked,
                      lectureMeasures: [],
                      lectureOtherLines: event.target.checked ? [""] : previous.lectureOtherLines,
                    }))
                  }
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                />
                <span className="space-y-1">
                  <span className="block text-sm text-foreground">Keine</span>
                  <span className="block text-xs text-muted-foreground">
                    Ich benötige keine Ausgleichsmassnahmen für Lehrveranstaltungen.
                  </span>
                </span>
              </label>
              {LECTURE_MEASURE_OPTIONS.map((option) => {
                const isChecked = applicationFormData.lectureMeasures.includes(option.key);
                return (
                  <label
                    key={option.key}
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-3 rounded-[10px] border bg-card px-3 py-3 text-sm",
                      isChecked ? "border-foreground" : "border-border",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(event) =>
                        setApplicationFormData((previous) => ({
                          ...previous,
                          lectureMeasuresKeine: false,
                          lectureMeasures: event.target.checked
                            ? [...previous.lectureMeasures, option.key]
                            : previous.lectureMeasures.filter((entry) => entry !== option.key),
                        }))
                      }
                      className="mt-0.5 size-4 shrink-0 accent-primary"
                    />
                    <span className="space-y-1">
                      <span className="block text-sm text-foreground">{option.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
              <CustomMeasureLinesField
                idPrefix={lectureOtherIdPrefix}
                lines={applicationFormData.lectureOtherLines}
                onChange={(next) =>
                  setApplicationFormData((previous) => ({
                    ...previous,
                    lectureOtherLines: next,
                    ...(hasMeasureOtherSelection(next)
                      ? { lectureMeasuresKeine: false }
                      : {}),
                  }))
                }
                error={
                  Boolean(errors.lectureMeasures) &&
                  !applicationFormData.lectureMeasuresKeine &&
                  applicationFormData.lectureMeasures.length === 0 &&
                  !hasMeasureOtherSelection(applicationFormData.lectureOtherLines)
                }
              />
            </R1FlowFieldOptions>
            {errors.lectureMeasures ? (
              <p className="text-xs text-destructive">{errors.lectureMeasures}</p>
            ) : null}
          </R1FlowFieldControl>
        </R1FlowField>

        <R1FlowField
          id={reviewWorkspaceAnchorId("assessmentMeasures")}
          className="scroll-mt-4"
          described
        >
          <R1FlowFieldLabelGroup>
            <p className="text-base font-medium text-foreground">
              Ausgleichsmassnahme für Leistungsnachweise
            </p>
            <p className="text-sm text-muted-foreground">
              Wählen Sie die Massnahmen aus, die Sie bei Prüfungen und anderen Leistungsnachweisen
              benötigen.
            </p>
          </R1FlowFieldLabelGroup>
          <R1FlowFieldControl>
            <R1FlowFieldOptions>
              <label
                className={cn(
                  "flex w-full cursor-pointer items-start gap-3 rounded-[10px] border bg-card px-3 py-3 text-sm",
                  applicationFormData.assessmentMeasuresKeine
                    ? "border-foreground"
                    : "border-border",
                )}
              >
                <input
                  type="checkbox"
                  checked={applicationFormData.assessmentMeasuresKeine}
                  onChange={(event) =>
                    setApplicationFormData((previous) => ({
                      ...previous,
                      assessmentMeasuresKeine: event.target.checked,
                      assessmentMeasures: [],
                      assessmentOtherLines: event.target.checked
                        ? [""]
                        : previous.assessmentOtherLines,
                    }))
                  }
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                />
                <span className="space-y-1">
                  <span className="block text-sm text-foreground">Keine</span>
                  <span className="block text-xs text-muted-foreground">
                    Ich benötige keine Ausgleichsmassnahmen für Leistungsnachweise.
                  </span>
                </span>
              </label>
              {ASSESSMENT_MEASURE_OPTIONS.map((option) => {
                const isChecked = applicationFormData.assessmentMeasures.includes(option.key);
                return (
                  <label
                    key={option.key}
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-3 rounded-[10px] border bg-card px-3 py-3 text-sm",
                      isChecked ? "border-foreground" : "border-border",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(event) =>
                        setApplicationFormData((previous) => ({
                          ...previous,
                          assessmentMeasuresKeine: false,
                          assessmentMeasures: event.target.checked
                            ? [...previous.assessmentMeasures, option.key]
                            : previous.assessmentMeasures.filter((entry) => entry !== option.key),
                        }))
                      }
                      className="mt-0.5 size-4 shrink-0 accent-primary"
                    />
                    <span className="space-y-1">
                      <span className="block text-sm text-foreground">{option.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
              <CustomMeasureLinesField
                idPrefix={assessmentOtherIdPrefix}
                lines={applicationFormData.assessmentOtherLines}
                onChange={(next) =>
                  setApplicationFormData((previous) => ({
                    ...previous,
                    assessmentOtherLines: next,
                    ...(hasMeasureOtherSelection(next)
                      ? { assessmentMeasuresKeine: false }
                      : {}),
                  }))
                }
                error={
                  Boolean(errors.assessmentMeasures) &&
                  !applicationFormData.assessmentMeasuresKeine &&
                  applicationFormData.assessmentMeasures.length === 0 &&
                  !hasMeasureOtherSelection(applicationFormData.assessmentOtherLines)
                }
              />
            </R1FlowFieldOptions>
            {errors.assessmentMeasures ? (
              <p className="text-xs text-destructive">{errors.assessmentMeasures}</p>
            ) : null}
          </R1FlowFieldControl>
        </R1FlowField>
      </R1FlowFieldStack>
    </div>
  );
}
