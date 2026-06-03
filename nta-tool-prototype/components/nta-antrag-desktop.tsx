"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Circle,
  CircleArrowRight,
  CircleDashed,
  CircleHelp,
  ExternalLink,
  Eye,
  FileText,
  MessageCircle,
  Mail,
  Lock,
  Phone,
  Send,
  Stethoscope,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";

import { usePortalDashboardToolbar } from "@/components/domain/portal-dashboard-toolbar-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  R1ApplicationFlowLayout,
  R1FlowAutosaveIndicator,
  R1FlowSupportInformationCard,
  R1FlowDiscardButton,
  R1FlowField,
  R1FlowFieldColumn,
  R1FlowFieldColumns,
  R1FlowFieldControl,
  R1FlowFieldLabelGroup,
  R1FlowFieldOptions,
  R1FlowFieldRow,
  R1FlowFieldStack,
  R1FlowFormCard,
  R1FlowFormFooter,
  R1FlowFormSection,
  R1FlowMainContent,
  R1FlowProgressCard,
  R1FlowProgressDivider,
  R1FlowProgressStep,
  R1FlowSectionTitle,
  R1FlowAttestCallout,
  R1_FLOW_PROGRESS_STEP_COUNT,
  type R1ProgressStepVisualState,
  r1FlowProgressStepIndex,
} from "@/components/domain/r1-application-flow-layout";
import {
  R1FlowBookingConfirmation,
  R1FlowInfoCallout,
  R1FlowSuccessIcon,
} from "@/components/domain/r1-booking-confirmation";
import { R1FlowBookingScheduler } from "@/components/domain/r1-booking-scheduler";
import { R1OnboardingOverlay } from "@/components/domain/r1-onboarding-overlay";
import { RecommendationReleasedAccordion } from "@/components/domain/recommendation-released-accordion";
import { R1ApplicationDefinitionSection } from "@/components/domain/r1-application-definition-section";
import { R1_ATTEST_FILE_REMOVE_BUTTON_CLASS } from "@/lib/design-tokens/r1-review-block";
import { hfTypography } from "@/lib/design-tokens/typography";
import {
  createAttestFileEntryFromBrowserFile,
  formatReviewFileSize,
  mergeAttestFilesForHydration,
  revokeAttestFileUrls,
  ReviewFileRow,
  sanitizeAttestFilesForDatabase,
} from "@/components/domain/application-review-blocks";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicationReviewDetailSidebar } from "@/components/domain/application-review-detail-sidebar";
import { StudiengangCombobox } from "@/components/studiengang-combobox";
import {
  deriveCanonicalApplicationState,
  getApplicationStatusMeta,
} from "@/lib/application-status";
import {
  reviewBlockToAntragStep,
  reviewWorkspaceAnchorId,
  type ReviewWorkspaceBlockId,
} from "@/lib/review-workspace-blocks";
import {
  ASSESSMENT_MEASURE_OPTIONS,
  LECTURE_MEASURE_OPTIONS,
  type AssessmentMeasureKey,
  type LectureMeasureKey,
} from "@/lib/application-review-labels";
import {
  type ApplicationData,
  type ApplicationDefinitionData,
  type ApplicationRow,
  type R1PortalFlowStep,
  type WorkspaceApplication,
} from "@/lib/test-flow-types";
import { CustomMeasureLinesField } from "@/components/domain/custom-measure-lines-field";
import {
  assessmentOtherLinesFromDefinition,
  hasMeasureOtherSelection,
  lectureOtherLinesFromDefinition,
  persistMeasureOtherLines,
} from "@/lib/measure-custom-lines";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

const ICF_FORMAT_INFO_URL =
  "https://careers.iconplc.com/blogs/2025-4/what-is-an-informed-consent-form-icf";

export type NtaAntragUploadFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  /** Lokale Vorschau (`blob:`) oder Storage-URL zum Öffnen in neuem Tab. */
  url?: string;
};

export type NtaAntragFormData = {
  vorname: string;
  name: string;
  email: string;
  phone: string;
  matrikel: string;
  studiengang: string;
  semester: string;
  antragsart: "studium" | "aufnahmeverfahren";
  attestFiles: NtaAntragUploadFile[];
};

type FlowStep =
  | "step1"
  | "step2"
  | "step3_booking"
  | "step3_booked"
  | "step3_recommendation"
  | "step4_application"
  | "step5_overview"
  | "step6_submitted";

type NtaAntragDesktopProps = {
  userId: string;
  initialApplication?: ApplicationRow;
  autosaveKey?: string;
  initialData?: Partial<NtaAntragFormData>;
  onContinue?: (data: NtaAntragFormData) => void;
  forceNew?: boolean;
  /**
   * Nach bereits eingereichtem Antrag: „Schliessen“ speichert den Entwurf in
   * der DB und springt zum Dashboard (`/portal/home`).
   */
  enableDraftExitToDashboard?: boolean;
  /** Portal: Flow in `PortalDashboardShell` (Top-Bar + Zurück extern). */
  embedInDashboardShell?: boolean;
};

type StepOneField =
  | "vorname"
  | "name"
  | "email"
  | "phone"
  | "matrikel"
  | "studiengang"
  | "semester"
  | "antragsart";

type ApplicationDuration = "full_study" | "one_semester";

type ApplicationFormData = {
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

type ApplicationFormFieldErrors = {
  situationDescription?: string;
  duration?: string;
  scopeSelections?: string;
  lectureMeasures?: string;
  assessmentMeasures?: string;
};

type BookingMode = "onsite";
type BookingSlotOption = {
  value: string;
  mode: BookingMode;
  location: string;
};

const BOOKING_SLOT_OPTIONS: BookingSlotOption[] = [
  {
    value: "09:30 - 10:30",
    mode: "onsite",
    location: "UZH Gebäude SBO, Raum E-103, Schönbergstrasse 15, 8001 Zürich",
  },
  {
    value: "10:30 - 11:30",
    mode: "onsite",
    location: "UZH Gebäude SBO, Raum E-103, Schönbergstrasse 15, 8001 Zürich",
  },
  {
    value: "11:30 - 12:30",
    mode: "onsite",
    location: "UZH Gebäude SBO, Raum E-103, Schönbergstrasse 15, 8001 Zürich",
  },
  {
    value: "12:30 - 13:30",
    mode: "onsite",
    location: "UZH Gebäude SBO, Raum E-103, Schönbergstrasse 15, 8001 Zürich",
  },
  {
    value: "13:30 - 14:30",
    mode: "onsite",
    location: "UZH Gebäude SBO, Raum E-103, Schönbergstrasse 15, 8001 Zürich",
  },
  {
    value: "14:30 - 15:30",
    mode: "onsite",
    location: "UZH Gebäude SBO, Raum E-103, Schönbergstrasse 15, 8001 Zürich",
  },
  {
    value: "15:30 - 16:30",
    mode: "onsite",
    location: "UZH Gebäude SBO, Raum E-103, Schönbergstrasse 15, 8001 Zürich",
  },
] as const;

const BOOKING_SLOTS = BOOKING_SLOT_OPTIONS.map((option) => option.value);
const MOCK_ADVISOR = "Frau Dr. Suzanne Beispiel";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function nextBookableWeekday(from: Date): Date {
  const candidate = startOfDay(from);
  while (!isWeekday(candidate)) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

function resolveInitialBookingDate(): Date {
  return nextBookableWeekday(new Date());
}

function resolveInitialBookingState(): {
  displayedMonth: Date;
  selectedBookingDate: Date;
  selectedBookingSlot: string;
} {
  const selectedBookingDate = resolveInitialBookingDate();
  return {
    displayedMonth: new Date(
      selectedBookingDate.getFullYear(),
      selectedBookingDate.getMonth(),
      1,
    ),
    selectedBookingDate,
    selectedBookingSlot: BOOKING_SLOTS[0],
  };
}

function normalizeBookingDate(candidate: Date): Date {
  if (!Number.isFinite(candidate.getTime())) return resolveInitialBookingDate();
  const today = startOfDay(new Date());
  const notPast = candidate < today ? today : candidate;
  return nextBookableWeekday(notPast);
}

function formatGoogleCalendarDate(date: Date, slot: string): {
  start: string;
  end: string;
} {
  const [startRaw, endRaw] = slot.split(" - ").map((part) => part.trim());
  const parseTime = (value: string): { hours: number; minutes: number } => {
    const [hoursPart, minutesPart] = value.split(":");
    const hours = Number.parseInt(hoursPart ?? "0", 10);
    const minutes = Number.parseInt(minutesPart ?? "0", 10);
    return {
      hours: Number.isFinite(hours) ? hours : 0,
      minutes: Number.isFinite(minutes) ? minutes : 0,
    };
  };
  const startTime = parseTime(startRaw ?? "09:00");
  const endTime = parseTime(endRaw ?? "10:00");
  const startDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    startTime.hours,
    startTime.minutes,
    0,
  );
  const endDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    endTime.hours,
    endTime.minutes,
    0,
  );
  const toGoogleFormat = (value: Date) =>
    `${value.getFullYear()}${String(value.getMonth() + 1).padStart(2, "0")}${String(value.getDate()).padStart(2, "0")}T${String(value.getHours()).padStart(2, "0")}${String(value.getMinutes()).padStart(2, "0")}00`;
  return {
    start: toGoogleFormat(startDate),
    end: toGoogleFormat(endDate),
  };
}

function resolveBookingSlotOption(slot: string): BookingSlotOption {
  return (
    BOOKING_SLOT_OPTIONS.find((option) => option.value === slot) ??
    BOOKING_SLOT_OPTIONS[0]
  );
}

const SEMESTER_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

function resolveR1ProgressVisualState({
  isComplete,
  isInvalidInOverview,
  isLocked,
  lockedPlacement = "pre-divider",
  isPastIncomplete,
}: {
  isComplete: boolean;
  isInvalidInOverview: boolean;
  isLocked: boolean;
  lockedPlacement?: "pre-divider" | "post-divider";
  isPastIncomplete: boolean;
}): R1ProgressStepVisualState {
  if (isLocked) {
    return lockedPlacement === "post-divider" ? "locked-post" : "locked-pre";
  }
  if (isComplete) return "complete";
  if (isInvalidInOverview || isPastIncomplete) return "incomplete";
  return "available";
}

function resolveHighestUnlockedStepIndex(
  savedStep: R1PortalFlowStep | undefined,
  flowStep: FlowStep,
): number {
  const fromCurrent =
    flowStep === "step6_submitted"
      ? R1_FLOW_PROGRESS_STEP_COUNT - 1
      : r1FlowProgressStepIndex(flowStep);
  const fromSaved =
    savedStep && isR1PortalFlowStep(savedStep)
      ? r1FlowProgressStepIndex(savedStep)
      : 0;
  return Math.max(fromCurrent, fromSaved);
}

function canOpenR1ProgressStep(
  stepIndex: number,
  highestUnlockedStepIndex: number,
  gates: {
    step1Complete: boolean;
    step2Complete: boolean;
    recommendationReleased: boolean;
    recommendationAcknowledged: boolean;
    step3Complete: boolean;
    step4Complete: boolean;
  },
): boolean {
  if (highestUnlockedStepIndex >= stepIndex) return true;
  switch (stepIndex) {
    case 0:
      return true;
    case 1:
      return gates.step1Complete;
    case 2:
      return gates.step1Complete && gates.step2Complete;
    case 3:
      return (
        gates.step1Complete &&
        gates.step2Complete &&
        gates.recommendationReleased &&
        gates.recommendationAcknowledged
      );
    case 4:
      return (
        gates.step1Complete &&
        gates.step2Complete &&
        gates.step3Complete &&
        gates.step4Complete
      );
    default:
      return false;
  }
}

/** Rot markieren, wenn ein späterer Schritt schon freigeschaltet wurde. */
function isR1StepIncompleteVisual(
  stepIndex: number,
  isComplete: boolean,
  isLocked: boolean,
  highestUnlockedStepIndex: number,
  isInvalidInOverview: boolean,
): boolean {
  if (isComplete || isLocked) return false;
  return isInvalidInOverview || highestUnlockedStepIndex > stepIndex;
}

const DEFAULT_FORM_DATA: NtaAntragFormData = {
  vorname: "",
  name: "",
  email: "",
  phone: "",
  matrikel: "",
  studiengang: "",
  semester: "",
  antragsart: "studium",
  attestFiles: [],
};

const APPLICATION_SCOPE_OPTIONS = [
  "Schriftliche Prüfungen",
  "Mündliche Prüfungen",
  "Schriftliche Arbeiten",
  "Während Lehrveranstaltungen",
  "Praktika",
] as const;

const DEFAULT_APPLICATION_FORM_DATA: ApplicationFormData = {
  situationDescription: "",
  duration: "",
  scopeSelections: [],
  lectureMeasures: [],
  lectureMeasuresKeine: false,
  lectureOtherLines: [""],
  assessmentMeasures: [],
  assessmentMeasuresKeine: false,
  assessmentOtherLines: [""],
};

function collectPersistedApplicationDefinition(
  form: ApplicationFormData,
): ApplicationDefinitionData {
  const lectureOtherLines = persistMeasureOtherLines(form.lectureOtherLines ?? []);
  const assessmentOtherLines = persistMeasureOtherLines(form.assessmentOtherLines ?? []);
  return {
    situationDescription: form.situationDescription,
    duration: form.duration || undefined,
    scopeSelections: [...form.scopeSelections],
    lectureMeasures: [...form.lectureMeasures],
    ...(form.lectureMeasuresKeine ? { lectureMeasuresKeine: true } : {}),
    ...(lectureOtherLines ? { lectureOtherLines } : {}),
    assessmentMeasures: [...form.assessmentMeasures],
    ...(form.assessmentMeasuresKeine ? { assessmentMeasuresKeine: true } : {}),
    ...(assessmentOtherLines ? { assessmentOtherLines } : {}),
  };
}

function mergeWithDefaults(value?: Partial<NtaAntragFormData>): NtaAntragFormData {
  return {
    ...DEFAULT_FORM_DATA,
    ...value,
    attestFiles: value?.attestFiles ?? [],
  };
}

/** Atteste aus persistiertem Antrag; `blob:` aus der DB ist immer ungültig. */
function mapRemoteAttestFiles(
  files: ApplicationData["attestFiles"] | undefined,
): NtaAntragUploadFile[] {
  return (files ?? []).map((file) => ({
    id: file.id ?? crypto.randomUUID(),
    name: file.name ?? "Datei",
    size: file.size ?? 0,
    type: file.type ?? "",
    ...(typeof file.url === "string"
      && file.url.length > 0
      && !file.url.startsWith("blob:")
      ? { url: file.url }
      : {}),
  }));
}

function formatMatrikelInput(value: string) {
  const digitsOnly = value.replace(/\D/g, "").slice(0, 8);
  const first = digitsOnly.slice(0, 2);
  const second = digitsOnly.slice(2, 5);
  const third = digitsOnly.slice(5, 8);

  if (digitsOnly.length <= 2) return first;
  if (digitsOnly.length <= 5) return `${first}-${second}`;
  return `${first}-${second}-${third}`;
}

function isStepOneComplete(data: NtaAntragFormData) {
  return (
    Boolean(data.vorname.trim()) &&
    Boolean(data.name.trim()) &&
    Boolean(data.email.trim()) &&
    Boolean(data.phone.trim()) &&
    /^\d{2}-\d{3}-\d{3}$/.test(data.matrikel) &&
    Boolean(data.studiengang.trim()) &&
    Boolean(data.semester.trim()) &&
    Boolean(data.antragsart.trim())
  );
}

function isStepFourComplete(data: ApplicationFormData) {
  if (!data.situationDescription.trim()) return false;
  if (!data.duration) return false;
  if (data.scopeSelections.length === 0) return false;
  if (
    !data.lectureMeasuresKeine
    && data.lectureMeasures.length === 0
    && !hasMeasureOtherSelection(data.lectureOtherLines)
  ) {
    return false;
  }
  if (
    !data.assessmentMeasuresKeine
    && data.assessmentMeasures.length === 0
    && !hasMeasureOtherSelection(data.assessmentOtherLines)
  ) {
    return false;
  }
  return true;
}

const R1_PORTAL_FLOW_STEPS: R1PortalFlowStep[] = [
  "step1",
  "step2",
  "step3_booking",
  "step3_booked",
  "step3_recommendation",
  "step4_application",
  "step5_overview",
];

function isR1PortalFlowStep(value: unknown): value is R1PortalFlowStep {
  return typeof value === "string" && (R1_PORTAL_FLOW_STEPS as string[]).includes(value);
}

function applicationFormDataFromRow(
  row: ApplicationRow | undefined,
  forceNew: boolean,
): ApplicationFormData {
  if (forceNew || !row) return DEFAULT_APPLICATION_FORM_DATA;
  const ad =
    row.data?.r1DraftApplicationDefinition ?? row.data?.applicationDefinition;
  if (!ad) return DEFAULT_APPLICATION_FORM_DATA;
  const lectureKeySet = new Set(
    LECTURE_MEASURE_OPTIONS.map((o) => o.key),
  ) as ReadonlySet<string>;
  const assessmentKeySet = new Set(
    ASSESSMENT_MEASURE_OPTIONS.map((o) => o.key),
  ) as ReadonlySet<string>;
  const pickLectureMeasures = (raw: string[] | undefined): LectureMeasureKey[] =>
    (raw ?? []).filter((k): k is LectureMeasureKey => lectureKeySet.has(k));
  const pickAssessmentMeasures = (
    raw: string[] | undefined,
  ): AssessmentMeasureKey[] =>
    (raw ?? []).filter((k): k is AssessmentMeasureKey => assessmentKeySet.has(k));
  return {
    situationDescription: ad.situationDescription ?? "",
    duration: (ad.duration as ApplicationDuration | "") ?? "",
    scopeSelections: [...(ad.scopeSelections ?? [])],
    lectureMeasures: pickLectureMeasures(ad.lectureMeasures),
    lectureMeasuresKeine: Boolean(ad.lectureMeasuresKeine),
    lectureOtherLines: lectureOtherLinesFromDefinition(ad) ?? [""],
    assessmentMeasures: pickAssessmentMeasures(ad.assessmentMeasures),
    assessmentMeasuresKeine: Boolean(ad.assessmentMeasuresKeine),
    assessmentOtherLines: assessmentOtherLinesFromDefinition(ad) ?? [""],
  };
}

/** Schritte 4–5 nur nach R2-Freigabe (`releasedHtml`), nicht durch Navigation. */
function isRecommendationReleasedToR1(
  data: ApplicationRow["data"] | undefined,
): boolean {
  return Boolean(data?.recommendation?.releasedHtml?.trim());
}

function readBookingUiFromApplication(
  row: ApplicationRow | undefined,
  forceNew: boolean,
): { displayedMonth: Date; selectedBookingDate: Date; selectedBookingSlot: string } {
  const initial = resolveInitialBookingState();
  if (forceNew || !row?.data?.r1DraftBookingUi) {
    return initial;
  }
  const ui = row.data.r1DraftBookingUi;
  const dm = new Date(ui.displayedMonthIso);
  const sd = new Date(ui.selectedBookingDateIso);
  const selectedBookingDate = normalizeBookingDate(sd);
  const displayedMonth = Number.isFinite(dm.getTime())
    ? new Date(dm.getFullYear(), dm.getMonth(), 1)
    : new Date(selectedBookingDate.getFullYear(), selectedBookingDate.getMonth(), 1);
  return {
    displayedMonth,
    selectedBookingDate,
    selectedBookingSlot: ui.selectedBookingSlot || initial.selectedBookingSlot,
  };
}

function clampFlowStepToData(desired: R1PortalFlowStep, row: ApplicationRow): FlowStep {
  const recommendationReleased = isRecommendationReleasedToR1(row.data);
  const consultationStatus = row.data?.consultation?.status;
  const booked = consultationStatus === "booked" || consultationStatus === "done";

  if (desired === "step5_overview" || desired === "step4_application") {
    if (!recommendationReleased) return booked ? "step3_booked" : "step3_booking";
    return desired;
  }
  if (desired === "step3_recommendation") {
    if (recommendationReleased) return "step3_recommendation";
    return booked ? "step3_booked" : "step3_booking";
  }
  if (desired === "step3_booked") return booked ? "step3_booked" : "step3_booking";
  if (desired === "step3_booking") return booked ? "step3_booked" : "step3_booking";
  return desired;
}

type RichRadioOptionProps = {
  checked: boolean;
  title: string;
  description: string;
  onChange: () => void;
};

function resolveInitialFlowStep(
  initialApplication: ApplicationRow | undefined,
  forceNew: boolean,
): FlowStep {
  if (forceNew) return "step1";
  if (!initialApplication) return "step1";
  const canonical = deriveCanonicalApplicationState(initialApplication);
  if (canonical === "needs_adjustment") return "step4_application";
  const recommendationReleased = isRecommendationReleasedToR1(
    initialApplication.data,
  );
  const consultationStatus = initialApplication.data?.consultation?.status;
  const isSubmitted = Boolean(initialApplication.data?.submittedAt);
  if (isSubmitted) return "step6_submitted";

  const saved = initialApplication.data?.r1PortalFlowStep;
  if (isR1PortalFlowStep(saved)) {
    return clampFlowStepToData(saved, initialApplication);
  }
  if (recommendationReleased) return "step3_recommendation";
  if (consultationStatus === "booked" || consultationStatus === "done") {
    return "step3_booked";
  }
  return "step1";
}

function RichRadioOption({
  checked,
  title,
  description,
  onChange,
}: RichRadioOptionProps) {
  return (
    <label
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 rounded-[10px] border border-stone-250 bg-background px-3 py-3 text-left transition-colors",
      )}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-4 shrink-0 accent-foreground"
      />
      <span className="flex min-w-0 flex-col gap-1.5">
        <span
          className={cn(
            hfTypography.paragraphSmallMedium,
            checked ? "text-foreground-alt" : "text-stone-500",
          )}
        >
          {title}
        </span>
        <span className={hfTypography.paragraphMini}>{description}</span>
      </span>
    </label>
  );
}

export function NtaAntragDesktop({
  userId: _userId,
  initialApplication,
  autosaveKey = "nta-antrag-draft",
  initialData,
  onContinue,
  forceNew = false,
  enableDraftExitToDashboard = false,
  embedInDashboardShell = false,
}: NtaAntragDesktopProps) {
  const router = useRouter();
  const portalToolbar = usePortalDashboardToolbar();
  const supabase = useMemo(() => createClient(), []);
  const [application, setApplication] = useState<ApplicationRow | null>(
    forceNew ? null : (initialApplication ?? null),
  );
  const [formData, setFormData] = useState<NtaAntragFormData>(() => {
    if (forceNew) return mergeWithDefaults(initialData);
    const fromApplication = initialApplication?.data?.personalData
      ? ({
          vorname: initialApplication.data.personalData.vorname ?? "",
          name: initialApplication.data.personalData.name ?? "",
          email: initialApplication.data.personalData.email ?? "",
          phone: initialApplication.data.personalData.phone ?? "",
          matrikel: initialApplication.data.personalData.matrikel ?? "",
          studiengang: initialApplication.data.personalData.studiengang ?? "",
          semester: initialApplication.data.personalData.semester ?? "",
          antragsart:
            (initialApplication.data.personalData.antragsart as
              | "studium"
              | "aufnahmeverfahren"
              | undefined) ?? "studium",
          attestFiles: mapRemoteAttestFiles(initialApplication.data.attestFiles),
        } satisfies Partial<NtaAntragFormData>)
      : undefined;
    return mergeWithDefaults(fromApplication ?? initialData);
  });
  const [currentStep, setCurrentStep] = useState<FlowStep>(() =>
    resolveInitialFlowStep(initialApplication, forceNew),
  );
  const [highestUnlockedStepIndex, setHighestUnlockedStepIndex] = useState(() =>
    resolveHighestUnlockedStepIndex(
      initialApplication?.data?.r1PortalFlowStep,
      resolveInitialFlowStep(initialApplication, forceNew),
    ),
  );
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(
    () => forceNew && !embedInDashboardShell,
  );
  const [isDragActive, setIsDragActive] = useState(false);
  const [stepOneErrors, setStepOneErrors] = useState<
    Partial<Record<StepOneField, string>>
  >({});
  const [stepTwoFileError, setStepTwoFileError] = useState<string | null>(null);
  const [stepThreeError, setStepThreeError] = useState<string | null>(null);
  const [stepFourErrors, setStepFourErrors] = useState<ApplicationFormFieldErrors>({});
  const [stepFiveError, setStepFiveError] = useState<string | null>(null);
  const [pendingBooking, setPendingBooking] = useState(false);
  const [isDeletingApplication, setIsDeletingApplication] = useState(false);
  const [deleteApplicationDialogOpen, setDeleteApplicationDialogOpen] =
    useState(false);
  const [isRecommendationAcknowledged, setIsRecommendationAcknowledged] = useState(
    () => Boolean(initialApplication?.data?.r1RecommendationAcknowledged),
  );
  const [applicationFormData, setApplicationFormData] = useState<ApplicationFormData>(
    () => applicationFormDataFromRow(initialApplication, forceNew),
  );
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() =>
    readBookingUiFromApplication(initialApplication, forceNew).displayedMonth,
  );
  const [selectedBookingDate, setSelectedBookingDate] = useState<Date>(() =>
    readBookingUiFromApplication(initialApplication, forceNew).selectedBookingDate,
  );
  const [selectedBookingSlot, setSelectedBookingSlot] = useState<string>(() =>
    readBookingUiFromApplication(initialApplication, forceNew).selectedBookingSlot,
  );
  const [draftExitError, setDraftExitError] = useState<string | null>(null);
  const [isPersistingDraftExit, setIsPersistingDraftExit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overviewFileInputRef = useRef<HTMLInputElement>(null);
  const flowMainScrollRef = useRef<HTMLDivElement>(null);
  const situationDescriptionStep4Ref = useRef<HTMLTextAreaElement>(null);
  const situationDescriptionOverviewRef = useRef<HTMLTextAreaElement>(null);
  const lastSyncedInitialApplicationId = useRef<string | undefined>(undefined);
  const previousStepRef = useRef<FlowStep | null>(null);

  const syncSituationDescriptionTextareaHeights = useCallback(() => {
    for (const ref of [situationDescriptionStep4Ref, situationDescriptionOverviewRef]) {
      const el = ref.current;
      if (!el) continue;
      el.style.height = "auto";
      const minHeightPx = Number.parseFloat(getComputedStyle(el).minHeight);
      const minH = Number.isFinite(minHeightPx) ? minHeightPx : 0;
      el.style.height = `${Math.max(el.scrollHeight, minH)}px`;
    }
  }, []);

  useLayoutEffect(() => {
    syncSituationDescriptionTextareaHeights();
  }, [
    applicationFormData.situationDescription,
    currentStep,
    syncSituationDescriptionTextareaHeights,
  ]);

  useEffect(() => {
    const idx =
      currentStep === "step6_submitted"
        ? R1_FLOW_PROGRESS_STEP_COUNT - 1
        : r1FlowProgressStepIndex(currentStep);
    setHighestUnlockedStepIndex((previous) => Math.max(previous, idx));
  }, [currentStep]);

  useEffect(() => {
    const previousStep = previousStepRef.current;
    const movedFromStep3ToStep4 =
      (previousStep === "step3_booking"
        || previousStep === "step3_booked"
        || previousStep === "step3_recommendation")
      && currentStep === "step4_application";
    const movedFromStep4ToStep5 =
      previousStep === "step4_application" && currentStep === "step5_overview";

    if (movedFromStep3ToStep4 || movedFromStep4ToStep5) {
      flowMainScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }
    previousStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    const saved = application?.data?.r1PortalFlowStep;
    const idx = resolveHighestUnlockedStepIndex(
      isR1PortalFlowStep(saved) ? saved : undefined,
      currentStep,
    );
    setHighestUnlockedStepIndex((previous) => Math.max(previous, idx));
  }, [application?.id, application?.data?.r1PortalFlowStep, currentStep]);

  useEffect(() => {
    // Load persisted draft only after hydration to avoid SSR/client markup mismatch.
    const timeout = window.setTimeout(() => {
      if (forceNew) {
        window.localStorage.removeItem(autosaveKey);
        setApplication(null);
        setFormData((previous) => {
          revokeAttestFileUrls(previous.attestFiles);
          return mergeWithDefaults(initialData);
        });
        setApplicationFormData(DEFAULT_APPLICATION_FORM_DATA);
        setStepOneErrors({});
        setStepTwoFileError(null);
        setStepThreeError(null);
        setStepFourErrors({});
        setStepFiveError(null);
        setIsRecommendationAcknowledged(false);
        setCurrentStep("step1");
        setHighestUnlockedStepIndex(0);
        return;
      }
      try {
        const rawDraft = window.localStorage.getItem(autosaveKey);
        if (!rawDraft) return;
        const parsedDraft = JSON.parse(rawDraft) as Partial<NtaAntragFormData>;
        const draftMerged = mergeWithDefaults(parsedDraft);

        if (initialApplication?.data) {
          const serverAttest = mapRemoteAttestFiles(initialApplication.data.attestFiles);
          setFormData(
            mergeWithDefaults({
              ...parsedDraft,
              attestFiles: mergeAttestFilesForHydration(serverAttest, draftMerged.attestFiles),
            }),
          );
        } else {
          setFormData(draftMerged);
        }
      } catch {
        // Keep current in-memory state when draft is malformed.
      }
    }, 0);

    // Nur `initialApplication?.id` in den deps: vermeidet erneutes Merge bei jedem Parent-Re-Render.
    return () => window.clearTimeout(timeout);
  }, [autosaveKey, forceNew, initialData, initialApplication?.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const payload = {
          ...formData,
          attestFiles: formData.attestFiles.map(({ id, name, size, type }) => ({
            id,
            name,
            size,
            type,
          })),
        };
        window.localStorage.setItem(autosaveKey, JSON.stringify(payload));
      } catch {
        /* Quota oder Private Mode — ohne Entwurf weiterarbeiten. */
      }
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [autosaveKey, formData]);

  useEffect(() => {
    if (forceNew || !initialApplication) return;
    const id = initialApplication.id;
    if (lastSyncedInitialApplicationId.current === undefined) {
      lastSyncedInitialApplicationId.current = id;
      return;
    }
    if (lastSyncedInitialApplicationId.current === id) return;
    lastSyncedInitialApplicationId.current = id;

    setApplication(initialApplication);
    const nextStep = resolveInitialFlowStep(initialApplication, false);
    setCurrentStep(nextStep);
    setHighestUnlockedStepIndex((previous) =>
      Math.max(
        previous,
        resolveHighestUnlockedStepIndex(
          initialApplication.data?.r1PortalFlowStep,
          nextStep,
        ),
      ),
    );

    const pd = initialApplication.data.personalData;
    if (pd) {
      setFormData((previous) => {
        revokeAttestFileUrls(previous.attestFiles);
        return mergeWithDefaults({
          vorname: pd.vorname ?? "",
          name: pd.name ?? "",
          email: pd.email ?? "",
          phone: pd.phone ?? "",
          matrikel: pd.matrikel ?? "",
          studiengang: pd.studiengang ?? "",
          semester: pd.semester ?? "",
          antragsart:
            (pd.antragsart as "studium" | "aufnahmeverfahren" | undefined) ?? "studium",
          attestFiles: mapRemoteAttestFiles(initialApplication.data.attestFiles),
        });
      });
    }

    setApplicationFormData(applicationFormDataFromRow(initialApplication, false));
    setIsRecommendationAcknowledged(
      Boolean(initialApplication.data.r1RecommendationAcknowledged),
    );
    const booking = readBookingUiFromApplication(initialApplication, false);
    setDisplayedMonth(booking.displayedMonth);
    setSelectedBookingDate(booking.selectedBookingDate);
    setSelectedBookingSlot(booking.selectedBookingSlot);
  }, [forceNew, initialApplication]);

  // Scope realtime to the currently active application ONLY.
  // Filtering by `applicant_id` would hijack the in-progress draft whenever any
  // other application of the same R1 user gets updated (e.g. an existing
  // `in_review` application receiving an unrelated UPDATE), which previously
  // caused the success screen to appear when starting a second application.
  const activeApplicationId = application?.id ?? null;

  useEffect(() => {
    if (!activeApplicationId) return;
    const channel = supabase
      .channel(`portal-antrag-${activeApplicationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          filter: `id=eq.${activeApplicationId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setApplication(null);
            return;
          }
          const next = payload.new as ApplicationRow;
          if (!next?.id || next.id !== activeApplicationId) return;
          setApplication(next);
          const isFinalSubmitted = Boolean(
            next.data?.finalSubmitted || next.data?.submittedAt,
          );
          setCurrentStep((previousStep) => {
            if (isFinalSubmitted) return "step6_submitted";
            if (previousStep === "step6_submitted") return previousStep;
            if (isRecommendationReleasedToR1(next.data)) {
              return "step3_recommendation";
            }
            if (next.data?.consultation?.status === "booked") return "step3_booked";
            return previousStep;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, activeApplicationId]);

  const appendFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const nextFiles = await Promise.all(
      Array.from(files).map((file) => createAttestFileEntryFromBrowserFile(file)),
    );
    setFormData((previous) => ({
      ...previous,
      attestFiles: [...previous.attestFiles, ...nextFiles],
    }));
    setStepTwoFileError(null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    void appendFiles(event.dataTransfer.files);
  };

  const validateStepOne = (): boolean => {
    const nextErrors: Partial<Record<StepOneField, string>> = {};

    if (!formData.vorname.trim()) nextErrors.vorname = "Dieses Feld ist erforderlich.";
    if (!formData.name.trim()) nextErrors.name = "Dieses Feld ist erforderlich.";
    if (!formData.email.trim()) nextErrors.email = "Dieses Feld ist erforderlich.";
    if (!formData.phone.trim()) nextErrors.phone = "Dieses Feld ist erforderlich.";
    if (!formData.matrikel.trim()) {
      nextErrors.matrikel = "Dieses Feld ist erforderlich.";
    } else if (!/^\d{2}-\d{3}-\d{3}$/.test(formData.matrikel)) {
      nextErrors.matrikel = "Bitte im Format XX-XXX-XXX ausfüllen.";
    }
    if (!formData.studiengang.trim())
      nextErrors.studiengang = "Dieses Feld ist erforderlich.";
    if (!formData.semester.trim()) nextErrors.semester = "Dieses Feld ist erforderlich.";
    if (!formData.antragsart.trim())
      nextErrors.antragsart = "Dieses Feld ist erforderlich.";

    setStepOneErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateStepTwo = (): boolean => {
    if (formData.attestFiles.length > 0) {
      setStepTwoFileError(null);
      return true;
    }
    setStepTwoFileError("Bitte laden Sie mindestens ein Attest hoch (obligatorisch).");
    return false;
  };

  const validateStepFour = (): boolean => {
    const nextErrors: ApplicationFormFieldErrors = {};

    if (!applicationFormData.situationDescription.trim()) {
      nextErrors.situationDescription = "Dieses Feld ist erforderlich.";
    }
    if (!applicationFormData.duration) {
      nextErrors.duration = "Bitte wählen Sie eine Option aus.";
    }
    if (applicationFormData.scopeSelections.length === 0) {
      nextErrors.scopeSelections = "Bitte wählen Sie mindestens eine Option aus.";
    }
    if (
      !applicationFormData.lectureMeasuresKeine
      && applicationFormData.lectureMeasures.length === 0
      && !hasMeasureOtherSelection(applicationFormData.lectureOtherLines)
    ) {
      nextErrors.lectureMeasures =
        "Bitte wählen Sie «Keine», mindestens eine Massnahme oder eine Sonstige-Angabe.";
    }
    if (
      !applicationFormData.assessmentMeasuresKeine
      && applicationFormData.assessmentMeasures.length === 0
      && !hasMeasureOtherSelection(applicationFormData.assessmentOtherLines)
    ) {
      nextErrors.assessmentMeasures =
        "Bitte wählen Sie «Keine», mindestens eine Massnahme oder eine Sonstige-Angabe.";
    }

    setStepFourErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  async function performDeleteApplication() {
    setIsDeletingApplication(true);
    setDraftExitError(null);

    try {
      if (application?.id) {
        const { error } = await supabase
          .from("applications")
          .delete()
          .eq("id", application.id);
        if (error) {
          setDraftExitError(error.message);
          return;
        }
      }

      setApplication(null);
      setFormData((previous) => {
        revokeAttestFileUrls(previous.attestFiles);
        return mergeWithDefaults(initialData);
      });
      setApplicationFormData(DEFAULT_APPLICATION_FORM_DATA);
      setStepOneErrors({});
      setStepTwoFileError(null);
      setStepThreeError(null);
      setStepFourErrors({});
      setStepFiveError(null);
      setIsRecommendationAcknowledged(false);
      const initialBookingState = resolveInitialBookingState();
      setSelectedBookingDate(initialBookingState.selectedBookingDate);
      setDisplayedMonth(initialBookingState.displayedMonth);
      setSelectedBookingSlot(initialBookingState.selectedBookingSlot);
      setHighestUnlockedStepIndex(0);
      setCurrentStep("step1");
      window.localStorage.removeItem(autosaveKey);
      setDeleteApplicationDialogOpen(false);
      router.replace("/portal/home");
    } finally {
      setIsDeletingApplication(false);
    }
  }

  async function handleDraftExitToDashboard() {
    if (!enableDraftExitToDashboard) return;
    setDraftExitError(null);
    setIsPersistingDraftExit(true);
    try {
      const consultationBooked =
        application?.data?.consultation?.status === "booked"
        || application?.data?.consultation?.status === "done";

      const hasMeaningfulInput =
        application !== null
        || formData.attestFiles.length > 0
        || [
            formData.vorname,
            formData.name,
            formData.email,
            formData.phone,
            formData.matrikel,
            formData.studiengang,
            formData.semester,
          ].some((s) => s.trim().length > 0);

      if (!hasMeaningfulInput) {
        router.push("/portal/home");
        return;
      }

      const draftDef = collectPersistedApplicationDefinition(applicationFormData);

      const stepForPersist: R1PortalFlowStep =
        currentStep === "step6_submitted"
          ? "step5_overview"
          : isR1PortalFlowStep(currentStep)
            ? currentStep
            : "step5_overview";

      const r1DraftBookingUi = !consultationBooked
        ? {
            displayedMonthIso: displayedMonth.toISOString(),
            selectedBookingDateIso: selectedBookingDate.toISOString(),
            selectedBookingSlot,
          }
        : undefined;

      let targetId = application?.id ?? null;
      if (!targetId) {
        const { data, error } = await supabase.rpc("r1_submit_application", {
          p_title:
            `NTA Antrag ${formData.vorname} ${formData.name}`.trim() || "NTA Antrag (Entwurf)",
          p_summary: "Entwurf",
        });
        if (error || !data?.id) {
          setDraftExitError(error?.message ?? "Entwurf konnte nicht gespeichert werden.");
          return;
        }
        targetId = data.id as string;
      }

      const baseData: ApplicationData = { ...(application?.data ?? {}) };
      delete baseData.finalSubmitted;
      delete baseData.submittedAt;
      delete baseData.applicationDefinition;

      const nextData: ApplicationData = {
        ...baseData,
        title:
          `NTA Antrag ${formData.vorname} ${formData.name}`.trim()
          || baseData.title
          || "NTA Antrag (Entwurf)",
        summary: baseData.summary?.trim() ? baseData.summary : "Entwurf",
        personalData: {
          vorname: formData.vorname,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          matrikel: formData.matrikel,
          studiengang: formData.studiengang,
          semester: formData.semester,
          antragsart: formData.antragsart,
        },
        attestFiles: sanitizeAttestFilesForDatabase(formData.attestFiles),
        recommendation: { ...(application?.data?.recommendation ?? {}) },
        r1DraftApplicationDefinition: draftDef,
        r1PortalFlowStep: stepForPersist,
        r1RecommendationAcknowledged: isRecommendationAcknowledged,
      };

      if (consultationBooked) {
        nextData.consultation = application?.data?.consultation;
        delete nextData.r1DraftBookingUi;
      } else {
        nextData.r1DraftBookingUi = r1DraftBookingUi;
      }

      const nextStatus = consultationBooked ? (application?.status ?? "submitted") : "draft";

      const { error: updateError } = await supabase
        .from("applications")
        .update({
          status: nextStatus,
          data: nextData,
        })
        .eq("id", targetId);

      if (updateError) {
        setDraftExitError(updateError.message);
        return;
      }

      window.localStorage.removeItem(autosaveKey);
      router.push("/portal/home");
    } finally {
      setIsPersistingDraftExit(false);
    }
  }

  const bookingDateLabel = selectedBookingDate.toLocaleDateString("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const selectedBookingOption = resolveBookingSlotOption(selectedBookingSlot);
  const selectedBookingLocationLines = selectedBookingOption.location.split(", ");
  const monthStart = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
  const gridStart = new Date(monthStart);
  const mondayFirstOffset = (monthStart.getDay() + 6) % 7;
  gridStart.setDate(1 - mondayFirstOffset);
  const calendarDays = Array.from({ length: 35 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      key: date.toISOString(),
      date,
      isCurrentMonth: date.getMonth() === displayedMonth.getMonth(),
    };
  });

  async function handleBookConsultation() {
    setStepThreeError(null);
    if (!selectedBookingSlot) {
      setStepThreeError("Bitte wählen Sie einen verfügbaren Zeitslot.");
      return;
    }

    setPendingBooking(true);
    let targetId = application?.id ?? null;

    if (!targetId) {
      const { data, error } = await supabase.rpc("r1_submit_application", {
        p_title: `NTA Antrag ${formData.vorname} ${formData.name}`.trim(),
        p_summary: "Mock Antrag mit Beratungstermin",
      });

      if (error || !data?.id) {
        setStepThreeError(
          error?.message ?? "Termin konnte nicht gespeichert werden.",
        );
        setPendingBooking(false);
        return;
      }
      targetId = data.id as string;
    }

    const priorConsultation = application?.data?.consultation;
    const nextDateIso = selectedBookingDate.toISOString();
    const supersededAppointments = [...(priorConsultation?.supersededAppointments ?? [])];
    if (priorConsultation?.dateIso) {
      const dateChanged = priorConsultation.dateIso !== nextDateIso;
      const slotChanged =
        (priorConsultation.slot ?? "").trim() !== selectedBookingSlot.trim();
      if (dateChanged || slotChanged) {
        supersededAppointments.push({
          dateIso: priorConsultation.dateIso,
          slot: priorConsultation.slot,
          date: priorConsultation.date,
          location: priorConsultation.location,
          locationType: priorConsultation.locationType,
        });
      }
    }

    const { error: updateError } = await supabase
      .from("applications")
      .update({
        status: "submitted",
        data: {
          title: `NTA Antrag ${formData.vorname} ${formData.name}`.trim(),
          summary: "Beratungstermin vereinbart",
          personalData: {
            vorname: formData.vorname,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            matrikel: formData.matrikel,
            studiengang: formData.studiengang,
            semester: formData.semester,
            antragsart: formData.antragsart,
          },
          attestFiles: sanitizeAttestFilesForDatabase(formData.attestFiles),
          consultation: {
            status: "booked",
            date: bookingDateLabel,
            dateIso: nextDateIso,
            slot: selectedBookingSlot,
            location: selectedBookingOption.location,
            locationType: selectedBookingOption.mode,
            advisor: priorConsultation?.advisor ?? MOCK_ADVISOR,
            supersededAppointments:
              supersededAppointments.length > 0 ? supersededAppointments : undefined,
          },
          recommendation: application?.data?.recommendation ?? {
            ready: false,
            url: "https://www.google.com",
          },
        },
      })
      .eq("id", targetId);

    if (updateError) {
      setStepThreeError(updateError.message);
      setPendingBooking(false);
      return;
    }

    const { data: refreshed } = await supabase
      .from("applications")
      .select("id,applicant_id,status,data,created_at,updated_at")
      .eq("id", targetId)
      .maybeSingle<ApplicationRow>();

    if (refreshed) setApplication(refreshed);
    setCurrentStep("step3_booked");
    setPendingBooking(false);
  }

  async function handleSubmitApplication() {
    let targetId = application?.id ?? null;
    if (!targetId) {
      const { data, error } = await supabase.rpc("r1_submit_application", {
        p_title: `NTA Antrag ${formData.vorname} ${formData.name}`.trim(),
        p_summary: "NTA Antrag",
      });
      if (error || !data?.id) {
        setStepFiveError(error?.message ?? "Antrag konnte nicht eingereicht werden.");
        return;
      }
      targetId = data.id as string;
    }

    const submittedAt = new Date().toISOString();
    const fullSubmitData = {
      title: `NTA Antrag ${formData.vorname} ${formData.name}`.trim(),
      summary: "In Review",
      personalData: {
        vorname: formData.vorname,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        matrikel: formData.matrikel,
        studiengang: formData.studiengang,
        semester: formData.semester,
        antragsart: formData.antragsart,
      },
      attestFiles: sanitizeAttestFilesForDatabase(formData.attestFiles),
      consultation: {
        ...(application?.data?.consultation ?? {}),
        status: "done" as const,
        date: application?.data?.consultation?.date ?? bookingDateLabel,
        dateIso: application?.data?.consultation?.dateIso ?? selectedBookingDate.toISOString(),
        slot: application?.data?.consultation?.slot ?? selectedBookingSlot,
        location: application?.data?.consultation?.location ?? selectedBookingOption.location,
        locationType:
          application?.data?.consultation?.locationType ?? selectedBookingOption.mode,
        advisor: application?.data?.consultation?.advisor ?? MOCK_ADVISOR,
      },
      recommendation: {
        ...(application?.data?.recommendation ?? {}),
        ready: true,
      },
      applicationDefinition: collectPersistedApplicationDefinition(applicationFormData),
      finalSubmitted: true,
      submittedAt,
    };

    const prevSubmitData: ApplicationData = { ...(application?.data ?? {}) };
    delete prevSubmitData.r1PortalFlowStep;
    delete prevSubmitData.r1DraftApplicationDefinition;
    delete prevSubmitData.r1DraftBookingUi;
    delete prevSubmitData.r1RecommendationAcknowledged;

    const minimalSubmitData = {
      ...prevSubmitData,
      title: `NTA Antrag ${formData.vorname} ${formData.name}`.trim(),
      summary: "In Review",
      personalData: {
        vorname: formData.vorname,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        matrikel: formData.matrikel,
        studiengang: formData.studiengang,
        semester: formData.semester,
        antragsart: formData.antragsart,
      },
      attestFiles: sanitizeAttestFilesForDatabase(formData.attestFiles),
      applicationDefinition: collectPersistedApplicationDefinition(applicationFormData),
      finalSubmitted: true,
      submittedAt,
    };

    const runSubmitUpdate = async (nextData: typeof fullSubmitData | typeof minimalSubmitData) =>
      supabase
        .from("applications")
        .update({
          status: "in_review",
          data: nextData,
        })
        .eq("id", targetId)
        .select("id,applicant_id,status,data,created_at,updated_at")
        .maybeSingle<ApplicationRow>();

    let { data: refreshed, error } = await runSubmitUpdate(fullSubmitData);
    if (!refreshed && !error) {
      ({ data: refreshed, error } = await runSubmitUpdate(minimalSubmitData));
    }

    if (error || !refreshed) {
      setStepFiveError(
        error?.message
          ?? "Antrag konnte nicht final gespeichert werden (keine Datenänderung in der DB).",
      );
      return;
    }

    setApplication(refreshed);
    setCurrentStep("step6_submitted");
  }

  const releasedRecommendationHtml =
    application?.data?.recommendation?.releasedHtml?.trim() ?? "";
  const releasedRecommendationAuthor =
    application?.data?.recommendation?.releasedBy?.trim()
    || "NTA Fachstelle";
  const bookedSlot = application?.data?.consultation?.slot ?? selectedBookingSlot;
  const bookedAdvisor = application?.data?.consultation?.advisor ?? MOCK_ADVISOR;
  const bookedLocation = application?.data?.consultation?.location ?? selectedBookingOption.location;
  const bookedLocationLines = bookedLocation.split(", ");
  const bookedDateIso = application?.data?.consultation?.dateIso;
  const bookedDate =
    bookedDateIso && Number.isFinite(new Date(bookedDateIso).getTime())
      ? new Date(bookedDateIso)
      : selectedBookingDate;
  const bookedAppointmentWeekdayLine = bookedDate.toLocaleDateString("de-CH", {
    weekday: "long",
  });
  const bookedAppointmentDayLine = bookedDate.toLocaleDateString("de-CH", {
    day: "numeric",
    month: "long",
  });
  const bookedAppointmentTimeLine = `${bookedSlot.replace(" - ", " – ")} Uhr`;
  const bookedCalendarDateRange = formatGoogleCalendarDate(bookedDate, bookedSlot);
  const bookedCalendarHref = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Beratungsgespräch NTA")}&dates=${bookedCalendarDateRange.start}/${bookedCalendarDateRange.end}&location=${encodeURIComponent(bookedLocation)}&details=${encodeURIComponent("Beratungstermin mit der Fachstelle Studium und Behinderung.")}`;
  const recommendationReleased = isRecommendationReleasedToR1(application?.data);
  const stepOneLockedAfterConsultation =
    application?.data?.consultation?.status === "booked" ||
    application?.data?.consultation?.status === "done";
  const step1Complete = isStepOneComplete(formData);
  const step2Complete = formData.attestFiles.length > 0;
  const step3Complete = recommendationReleased;
  const step3ProgressComplete =
    recommendationReleased && isRecommendationAcknowledged;
  const step3MissingAcknowledgment =
    recommendationReleased &&
    !isRecommendationAcknowledged &&
    highestUnlockedStepIndex >= 3;
  const step4Complete = isStepFourComplete(applicationFormData);
  const step5Complete = currentStep === "step6_submitted";
  const isOverviewStep = currentStep === "step5_overview";
  const overviewSituationInvalid =
    isOverviewStep && !applicationFormData.situationDescription.trim();
  const overviewDurationInvalid = isOverviewStep && !applicationFormData.duration;
  const overviewScopeInvalid =
    isOverviewStep && applicationFormData.scopeSelections.length === 0;
  const overviewLectureMeasuresInvalid =
    isOverviewStep &&
    !applicationFormData.lectureMeasuresKeine &&
    applicationFormData.lectureMeasures.length === 0 &&
    !hasMeasureOtherSelection(applicationFormData.lectureOtherLines);
  const overviewAssessmentMeasuresInvalid =
    isOverviewStep &&
    !applicationFormData.assessmentMeasuresKeine &&
    applicationFormData.assessmentMeasures.length === 0 &&
    !hasMeasureOtherSelection(applicationFormData.assessmentOtherLines);
  const step1InvalidInOverview = isOverviewStep && !step1Complete;
  const step2InvalidInOverview = isOverviewStep && !step2Complete;
  const step4InvalidInOverview = isOverviewStep && !step4Complete;
  const canSubmitFromOverview = step1Complete && step2Complete && step4Complete;

  const progressUnlockGates = {
    step1Complete,
    step2Complete,
    recommendationReleased,
    recommendationAcknowledged: isRecommendationAcknowledged,
    step3Complete,
    step4Complete,
  };
  const canOpenStep1 = canOpenR1ProgressStep(0, highestUnlockedStepIndex, progressUnlockGates);
  const canOpenStep2 = canOpenR1ProgressStep(1, highestUnlockedStepIndex, progressUnlockGates);
  const canOpenStep3 = canOpenR1ProgressStep(2, highestUnlockedStepIndex, progressUnlockGates);
  const canOpenStep4 = canOpenR1ProgressStep(3, highestUnlockedStepIndex, progressUnlockGates);
  const canOpenStep5 = canOpenR1ProgressStep(4, highestUnlockedStepIndex, progressUnlockGates);

  const r1CompletedStepCount = [
    step1Complete,
    step2Complete,
    step3ProgressComplete,
    step4Complete,
    step5Complete,
  ].filter(Boolean).length;

  const nextAvailableStep: FlowStep | null = !step1Complete
    ? "step1"
    : !step2Complete
      ? "step2"
      : !step3Complete
        ? "step3_recommendation"
        : !step4Complete
          ? "step4_application"
          : !step5Complete
            ? "step5_overview"
            : null;
  const isStep3Active =
    currentStep === "step3_booking" ||
    currentStep === "step3_booked" ||
    currentStep === "step3_recommendation";

  const canonicalR1State = application
    ? deriveCanonicalApplicationState(application)
    : null;
  const showCorrectionSidebar = canonicalR1State === "needs_adjustment";

  const savedReviewCommentsForSidebar = useMemo(() => {
    const raw =
      application?.data?.recommendation?.workspaceReview?.forwardedComments
      ?? application?.data?.reviewComments;
    if (!raw?.length) return [];
    const blocks =
      application?.data?.recommendation?.workspaceReview?.postSubmit?.blocks
      ?? application?.data?.r2PostSubmitReview?.blocks;
    const resolutions = application?.data?.r1AdjustmentResolutions ?? {};
    const canonical = application
      ? deriveCanonicalApplicationState(application)
      : null;
    return raw.map((c) => {
      const bid = c.blockId as ReviewWorkspaceBlockId;
      const phase = blocks?.[bid]?.phase;
      const showAdjPills =
        canonical === "needs_adjustment" && phase === "adjustment";
      return {
        id: c.id,
        blockId: c.blockId,
        blockTitle: c.blockTitle,
        body: c.body,
        createdAt: Date.parse(c.createdAt),
        authorDisplayName: c.authorDisplayName,
        ...(showAdjPills
          ? {
              adjustmentResolutionStatus: resolutions[bid]
                ? ("done" as const)
                : ("todo" as const),
            }
          : {}),
      };
    });
  }, [
    application,
    application?.data?.recommendation?.workspaceReview?.forwardedComments,
    application?.data?.recommendation?.workspaceReview?.postSubmit?.blocks,
    application?.data?.r2PostSubmitReview?.blocks,
    application?.data?.r1AdjustmentResolutions,
    application?.data?.reviewComments,
  ]);

  const statusMetaForCorrection = useMemo(
    () => (application ? getApplicationStatusMeta(application, "R1") : null),
    [application],
  );

  const workspaceApplicationForSidebar: WorkspaceApplication | null = useMemo(() => {
    if (!application) return null;
    return { ...application, users: [] };
  }, [application]);

  const navigateFromSavedComment = useCallback((blockId: string) => {
    const id = blockId as ReviewWorkspaceBlockId;
    setCurrentStep(reviewBlockToAntragStep(id));
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document
          .getElementById(reviewWorkspaceAnchorId(id))
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }, []);

  const showFormAutosave =
    currentStep !== "step3_booked" && currentStep !== "step6_submitted";

  useEffect(() => {
    if (!embedInDashboardShell || !portalToolbar) return;

    portalToolbar.setTrailingSlot(
      showFormAutosave ? <R1FlowAutosaveIndicator /> : null,
    );

    if (enableDraftExitToDashboard) {
      portalToolbar.setLeadingSlot(
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 gap-2 rounded-full px-2 text-muted-foreground hover:text-foreground"
          disabled={isPersistingDraftExit}
          onClick={() => void handleDraftExitToDashboard()}
        >
          <ArrowLeft className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          {isPersistingDraftExit ? "Wird gespeichert …" : "Zurück"}
        </Button>,
      );
    } else {
      portalToolbar.setLeadingSlot(null);
    }

    return () => {
      portalToolbar.setLeadingSlot(null);
      portalToolbar.setTrailingSlot(null);
    };
  }, [
    embedInDashboardShell,
    portalToolbar,
    showFormAutosave,
    enableDraftExitToDashboard,
    isPersistingDraftExit,
    handleDraftExitToDashboard,
  ]);

  return (
    <>
    <R1ApplicationFlowLayout
      embedInDashboardShell={embedInDashboardShell}
      showCorrectionSidebar={showCorrectionSidebar}
      headerAutosave={
        !embedInDashboardShell && showFormAutosave ? (
          <R1FlowAutosaveIndicator />
        ) : undefined
      }
      headerClose={
        !embedInDashboardShell && enableDraftExitToDashboard
          ? {
              onClick: () => void handleDraftExitToDashboard(),
              disabled: isPersistingDraftExit,
              label: isPersistingDraftExit ? "Wird gespeichert …" : "Schliessen",
            }
          : undefined
      }
      sidebar={
        <>
          <R1FlowProgressCard completedStepCount={r1CompletedStepCount}>
            <R1FlowProgressStep
              label="Persönliche Angaben"
              iconName="user"
              visualState={resolveR1ProgressVisualState({
                isComplete: step1Complete,
                isInvalidInOverview: step1InvalidInOverview,
                isLocked: false,
                isPastIncomplete: isR1StepIncompleteVisual(
                  0,
                  step1Complete,
                  false,
                  highestUnlockedStepIndex,
                  step1InvalidInOverview,
                ),
              })}
              isActive={currentStep === "step1"}
              isClickable={canOpenStep1}
              onClick={() => setCurrentStep("step1")}
            />
            <R1FlowProgressStep
              label="Fachärztliches Attest"
              iconName="stethoscope"
              visualState={resolveR1ProgressVisualState({
                isComplete: step2Complete,
                isInvalidInOverview: step2InvalidInOverview,
                isLocked: !canOpenStep2,
                isPastIncomplete: isR1StepIncompleteVisual(
                  1,
                  step2Complete,
                  !canOpenStep2,
                  highestUnlockedStepIndex,
                  step2InvalidInOverview,
                ),
              })}
              isActive={currentStep === "step2"}
              isClickable={canOpenStep2}
              onClick={canOpenStep2 ? () => setCurrentStep("step2") : undefined}
            />
            <R1FlowProgressStep
              label="Beratung und Empfehlung"
              iconName="message-circle"
              visualState={resolveR1ProgressVisualState({
                isComplete: step3ProgressComplete,
                isInvalidInOverview: false,
                isLocked: !canOpenStep3,
                isPastIncomplete:
                  step3MissingAcknowledgment ||
                  isR1StepIncompleteVisual(
                    2,
                    step3ProgressComplete,
                    !canOpenStep3,
                    highestUnlockedStepIndex,
                    false,
                  ),
              })}
              isActive={isStep3Active}
              isClickable={canOpenStep3}
              onClick={
                canOpenStep3
                  ? () => {
                      if (recommendationReleased) {
                        setCurrentStep("step3_recommendation");
                        return;
                      }
                      const consultationStatus =
                        application?.data?.consultation?.status;
                      if (
                        consultationStatus === "booked" ||
                        consultationStatus === "done"
                      ) {
                        setCurrentStep("step3_booked");
                      } else {
                        setCurrentStep("step3_booking");
                      }
                    }
                  : undefined
              }
            />
            {!recommendationReleased ? <R1FlowProgressDivider /> : null}
            <R1FlowProgressStep
              label="Antrag stellen"
              iconName="file"
              visualState={resolveR1ProgressVisualState({
                isComplete: step4Complete,
                isInvalidInOverview: step4InvalidInOverview,
                isLocked: !canOpenStep4,
                lockedPlacement: recommendationReleased
                  ? "pre-divider"
                  : "post-divider",
                isPastIncomplete: isR1StepIncompleteVisual(
                  3,
                  step4Complete,
                  !canOpenStep4,
                  highestUnlockedStepIndex,
                  step4InvalidInOverview,
                ),
              })}
              isActive={currentStep === "step4_application"}
              isClickable={canOpenStep4}
              lockedTooltip={
                !recommendationReleased
                  ? "Wird nach der Beratung freigeschaltet"
                  : undefined
              }
              onClick={
                canOpenStep4
                  ? () => setCurrentStep("step4_application")
                  : recommendationReleased &&
                      !isRecommendationAcknowledged &&
                      highestUnlockedStepIndex < 3
                    ? () => {
                        setStepThreeError(
                          "Bitte bestätigen Sie die Kenntnisnahme des Empfehlungsschreibens.",
                        );
                        setCurrentStep("step3_recommendation");
                      }
                    : undefined
              }
            />
            <R1FlowProgressStep
              label="Übersicht"
              iconName="eye"
              visualState={resolveR1ProgressVisualState({
                isComplete: step5Complete,
                isInvalidInOverview: false,
                isLocked: !canOpenStep5,
                lockedPlacement: recommendationReleased
                  ? "pre-divider"
                  : "post-divider",
                isPastIncomplete: isR1StepIncompleteVisual(
                  4,
                  step5Complete,
                  !canOpenStep5,
                  highestUnlockedStepIndex,
                  false,
                ),
              })}
              isActive={currentStep === "step5_overview"}
              isClickable={canOpenStep5}
              lockedTooltip={
                !recommendationReleased
                  ? "Wird nach der Beratung freigeschaltet"
                  : undefined
              }
              onClick={canOpenStep5 ? () => setCurrentStep("step5_overview") : undefined}
            />
          </R1FlowProgressCard>
          <R1FlowSupportInformationCard />
        </>
      }
      sidebarFooter={
        currentStep !== "step6_submitted" ? (
          <R1FlowDiscardButton
            disabled={isDeletingApplication}
            onClick={() => setDeleteApplicationDialogOpen(true)}
          />
        ) : null
      }
      main={
        <R1FlowMainContent scrollRef={flowMainScrollRef}>
<form
            onSubmit={(event) => {
              event.preventDefault();
              if (currentStep === "step1") {
                if (!validateStepOne()) return;
                setCurrentStep("step2");
                return;
              }
              if (currentStep === "step2") {
                if (!validateStepTwo()) return;
                setCurrentStep("step3_booking");
                return;
              }
              if (currentStep === "step3_recommendation" && !isRecommendationAcknowledged) {
                setStepThreeError(
                  "Bitte bestätigen Sie die Kenntnisnahme des Empfehlungsschreibens.",
                );
                return;
              }
              if (currentStep === "step3_recommendation") {
                if (!recommendationReleased) return;
                setCurrentStep("step4_application");
                return;
              }
              if (currentStep === "step4_application") {
                if (!validateStepFour()) return;
                setCurrentStep("step5_overview");
                return;
              }
              if (currentStep === "step5_overview") {
                if (!canSubmitFromOverview) return;
                void handleSubmitApplication();
                return;
              }
              onContinue?.(formData);
            }}
          >
            <R1FlowFormCard>
                {currentStep === "step1" ? (
                  <>
                    {!stepOneLockedAfterConsultation ? (
                      <>
                        <div
                          id={reviewWorkspaceAnchorId("applicant")}
                          className="scroll-mt-4"
                        >
                          <R1FlowSectionTitle spacingBelow="compact">
                            Persönliche Angaben
                          </R1FlowSectionTitle>
                      <R1FlowFieldRow>
                        <R1FlowField>
                          <Label htmlFor="vorname">Vorname</Label>
                          <Input
                            id="vorname"
                            name="vorname"
                            placeholder="Vorname"
                            autoComplete="given-name"
                            value={formData.vorname}
                            onChange={(event) =>
                              setFormData((previous) => {
                                if (stepOneErrors.vorname) {
                                  setStepOneErrors((prev) => ({
                                    ...prev,
                                    vorname: undefined,
                                  }));
                                }
                                return {
                                  ...previous,
                                  vorname: event.target.value,
                                };
                              })
                            }
                            aria-invalid={Boolean(stepOneErrors.vorname)}
                            className={cn(
                              stepOneErrors.vorname && "border-destructive",
                            )}
                          />
                          {stepOneErrors.vorname ? (
                            <p className="text-xs text-destructive">
                              {stepOneErrors.vorname}
                            </p>
                          ) : null}
                        </R1FlowField>
                        <R1FlowField>
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            name="name"
                            placeholder="Name"
                            autoComplete="family-name"
                            value={formData.name}
                            onChange={(event) =>
                              setFormData((previous) => {
                                if (stepOneErrors.name) {
                                  setStepOneErrors((prev) => ({
                                    ...prev,
                                    name: undefined,
                                  }));
                                }
                                return {
                                  ...previous,
                                  name: event.target.value,
                                };
                              })
                            }
                            aria-invalid={Boolean(stepOneErrors.name)}
                            className={cn(stepOneErrors.name && "border-destructive")}
                          />
                          {stepOneErrors.name ? (
                            <p className="text-xs text-destructive">
                              {stepOneErrors.name}
                            </p>
                          ) : null}
                        </R1FlowField>
                        <R1FlowField>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="@hochschule.ch"
                            autoComplete="email"
                            value={formData.email}
                            onChange={(event) =>
                              setFormData((previous) => {
                                if (stepOneErrors.email) {
                                  setStepOneErrors((prev) => ({
                                    ...prev,
                                    email: undefined,
                                  }));
                                }
                                return {
                                  ...previous,
                                  email: event.target.value,
                                };
                              })
                            }
                            aria-invalid={Boolean(stepOneErrors.email)}
                            className={cn(stepOneErrors.email && "border-destructive")}
                          />
                          {stepOneErrors.email ? (
                            <p className="text-xs text-destructive">
                              {stepOneErrors.email}
                            </p>
                          ) : null}
                        </R1FlowField>
                        <R1FlowField>
                          <Label htmlFor="phone">Telefonnummer</Label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="+41"
                            autoComplete="tel"
                            value={formData.phone}
                            onChange={(event) =>
                              setFormData((previous) => {
                                if (stepOneErrors.phone) {
                                  setStepOneErrors((prev) => ({
                                    ...prev,
                                    phone: undefined,
                                  }));
                                }
                                return {
                                  ...previous,
                                  phone: event.target.value,
                                };
                              })
                            }
                            aria-invalid={Boolean(stepOneErrors.phone)}
                            className={cn(stepOneErrors.phone && "border-destructive")}
                          />
                          {stepOneErrors.phone ? (
                            <p className="text-xs text-destructive">
                              {stepOneErrors.phone}
                            </p>
                          ) : null}
                        </R1FlowField>
                      </R1FlowFieldRow>
                    </div>

                    <div>
                      <R1FlowSectionTitle spacingBelow="compact">
                        Angaben zum Studium
                      </R1FlowSectionTitle>
                      <R1FlowFieldStack>
                        <R1FlowField className="max-w-[320px]">
                          <Label htmlFor="matrikel">Matrikelnummer</Label>
                          <Input
                            id="matrikel"
                            name="matrikel"
                            placeholder="00-000-000"
                            value={formData.matrikel}
                            onChange={(event) =>
                              setFormData((previous) => {
                                if (stepOneErrors.matrikel) {
                                  setStepOneErrors((prev) => ({
                                    ...prev,
                                    matrikel: undefined,
                                  }));
                                }
                                return {
                                  ...previous,
                                  matrikel: formatMatrikelInput(event.target.value),
                                };
                              })
                            }
                            aria-invalid={Boolean(stepOneErrors.matrikel)}
                            className={cn(
                              stepOneErrors.matrikel && "border-destructive",
                            )}
                            inputMode="numeric"
                          />
                          {stepOneErrors.matrikel ? (
                            <p className="text-xs text-destructive">
                              {stepOneErrors.matrikel}
                            </p>
                          ) : null}
                        </R1FlowField>
                        <R1FlowField>
                          <Label htmlFor="studiengang">Studiengang</Label>
                          <StudiengangCombobox
                            id="studiengang"
                            value={formData.studiengang}
                            onValueChange={(value) =>
                              setFormData((previous) => {
                                if (stepOneErrors.studiengang) {
                                  setStepOneErrors((prev) => ({
                                    ...prev,
                                    studiengang: undefined,
                                  }));
                                }
                                return {
                                  ...previous,
                                  studiengang: value,
                                };
                              })
                            }
                          />
                          {stepOneErrors.studiengang ? (
                            <p className="text-xs text-destructive">
                              {stepOneErrors.studiengang}
                            </p>
                          ) : null}
                        </R1FlowField>
                        <R1FlowField>
                          <Label htmlFor="semester">Welches Semester besuchen Sie</Label>
                          <Select
                            value={formData.semester || undefined}
                            onValueChange={(value: string) =>
                              setFormData((previous) => {
                                if (stepOneErrors.semester) {
                                  setStepOneErrors((prev) => ({
                                    ...prev,
                                    semester: undefined,
                                  }));
                                }
                                return {
                                  ...previous,
                                  semester: value,
                                };
                              })
                            }
                          >
                            <SelectTrigger
                              id="semester"
                              className={cn(
                                "w-full border-neutral-300 bg-background shadow-xs dark:border-neutral-600",
                                stepOneErrors.semester && "border-destructive",
                              )}
                              aria-invalid={Boolean(stepOneErrors.semester)}
                            >
                              <SelectValue placeholder="Semester wählen" />
                            </SelectTrigger>
                            <SelectContent>
                              {SEMESTER_NUMBERS.map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n}. Semester
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {stepOneErrors.semester ? (
                            <p className="text-xs text-destructive">
                              {stepOneErrors.semester}
                            </p>
                          ) : null}
                        </R1FlowField>
                      </R1FlowFieldStack>
                    </div>

                    <div>
                      <R1FlowSectionTitle spacingBelow="compact">
                        Antragsart
                      </R1FlowSectionTitle>
                      <R1FlowFieldOptions>
                        {stepOneErrors.antragsart ? (
                          <p className="text-xs text-destructive">
                            {stepOneErrors.antragsart}
                          </p>
                        ) : null}
                        <RichRadioOption
                          checked={formData.antragsart === "studium"}
                          title="Für Studium"
                          description="Ich bin bereits immatrikuliert und möchte einen Nachteilsausgleich während des Studiums stellen."
                          onChange={() =>
                            setFormData((previous) => ({
                              ...previous,
                              antragsart: "studium",
                            }))
                          }
                        />
                        <RichRadioOption
                          checked={formData.antragsart === "aufnahmeverfahren"}
                          title="Für Aufnahmeverfahren"
                          description="Ich bin noch nicht immatrikuliert und möchte einen Nachteilsausgleich für das Aufnahmeverfahren stellen."
                          onChange={() =>
                            setFormData((previous) => ({
                              ...previous,
                              antragsart: "aufnahmeverfahren",
                            }))
                          }
                        />
                      </R1FlowFieldOptions>
                    </div>
                      </>
                    ) : (
                      <>
                        <div
                          id={reviewWorkspaceAnchorId("applicant")}
                          className="scroll-mt-4"
                        >
                          <R1FlowSectionTitle spacingBelow="compact">
                            Persönliche Angaben
                          </R1FlowSectionTitle>
                          <R1FlowFieldRow>
                            {(
                              [
                                { label: "Vorname", value: formData.vorname },
                                { label: "Name", value: formData.name },
                                { label: "Email", value: formData.email },
                                { label: "Telefonnummer", value: formData.phone },
                              ] as const
                            ).map((item) => (
                              <R1FlowField key={item.label}>
                                <Label>{item.label}</Label>
                                <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                                  <span className="text-sm text-muted-foreground">
                                    {item.value}
                                  </span>
                                  <Lock className="size-4 text-muted-foreground" />
                                </div>
                              </R1FlowField>
                            ))}
                          </R1FlowFieldRow>
                        </div>

                        <div>
                          <R1FlowSectionTitle spacingBelow="compact">
                            Angaben zum Studium
                          </R1FlowSectionTitle>
                          <R1FlowFieldStack>
                            <R1FlowField className="max-w-[320px]">
                              <Label>Matrikelnummer</Label>
                              <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                                <span className="text-sm text-muted-foreground">
                                  {formData.matrikel}
                                </span>
                                <Lock className="size-4 text-muted-foreground" />
                              </div>
                            </R1FlowField>
                            <R1FlowField>
                              <Label>Studiengang</Label>
                              <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                                <span className="text-sm text-muted-foreground">
                                  {formData.studiengang}
                                </span>
                                <Lock className="size-4 text-muted-foreground" />
                              </div>
                            </R1FlowField>
                            <R1FlowField>
                              <Label>Welches Semester besuchen Sie</Label>
                              <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                                <span className="text-sm text-muted-foreground">
                                  {formData.semester
                                    ? `${formData.semester}. Semester`
                                    : ""}
                                </span>
                                <Lock className="size-4 text-muted-foreground" />
                              </div>
                            </R1FlowField>
                          </R1FlowFieldStack>
                        </div>

                        <div>
                          <R1FlowSectionTitle spacingBelow="compact">Antragsart</R1FlowSectionTitle>
                          <R1FlowFieldOptions>
                            {(
                              [
                                {
                                  value: "studium",
                                  title: "Für Studium",
                                  description:
                                    "Ich bin bereits immatrikuliert und möchte einen Nachteilsausgleich während des Studiums stellen.",
                                },
                                {
                                  value: "aufnahmeverfahren",
                                  title: "Für Aufnahmeverfahren",
                                  description:
                                    "Ich bin noch nicht immatrikuliert und möchte einen Nachteilsausgleich für das Aufnahmeverfahren stellen.",
                                },
                              ] as const
                            ).map((item) => (
                              <div
                                key={item.value}
                                className={cn(
                                  "flex w-full items-start gap-3 rounded-xl border border-border px-3 py-3",
                                  formData.antragsart === item.value
                                    ? "opacity-100"
                                    : "opacity-50",
                                )}
                              >
                                <input
                                  type="radio"
                                  checked={formData.antragsart === item.value}
                                  readOnly
                                  disabled
                                  className="mt-0.5 h-4 w-4 accent-primary"
                                />
                                <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                                  <span className="flex flex-col gap-1">
                                    <span className="text-sm leading-5 text-foreground">
                                      {item.title}
                                    </span>
                                    <span className="text-xs leading-4 text-muted-foreground">
                                      {item.description}
                                    </span>
                                  </span>
                                  <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                </div>
                              </div>
                            ))}
                          </R1FlowFieldOptions>
                        </div>
                      </>
                    )}
                  </>
                ) : currentStep === "step2" ? (
                  <div
                    id={reviewWorkspaceAnchorId("attest")}
                    className="scroll-mt-4 space-y-3"
                  >
                    <div>
                      <R1FlowSectionTitle spacingBelow="compact">
                        Fachärztliches Attest
                      </R1FlowSectionTitle>
                      <p className="text-sm text-muted-foreground">
                        Laden Sie Ihr fachärztliches Attest im{" "}
                        <a
                          href={ICF_FORMAT_INFO_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2"
                        >
                          ICF-Format
                        </a>{" "}
                        hoch. Es muss Diagnose, Auswirkungen auf studienrelevante Aktivitäten
                        sowie empfohlene Massnahmen enthalten.
                      </p>
                    </div>

                    <R1FlowAttestCallout className="mb-10" />

                    <div className="space-y-2">
                      <div
                        className={cn(
                          "flex cursor-pointer flex-col items-center rounded-xl border border-dashed px-8 py-8 text-center transition-colors",
                            isDragActive ? "border-ring bg-muted/40" : "border-border",
                            stepTwoFileError && "border-destructive bg-destructive/5",
                        )}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setIsDragActive(true);
                        }}
                        onDragLeave={() => setIsDragActive(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            fileInputRef.current?.click();
                          }
                        }}
                      >
                        <Upload className="mb-2 size-6 text-foreground" />
                        <p className="text-base font-medium text-foreground">Drag & Drop</p>
                        <p className="text-sm text-muted-foreground">
                          Datei hier hochladen
                        </p>
                        <p className="text-sm text-muted-foreground">
                          oder via Finder auswählen
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(event) => void appendFiles(event.target.files)}
                        />
                      </div>
                      {stepTwoFileError ? (
                        <p className="text-xs text-destructive">{stepTwoFileError}</p>
                      ) : null}
                      <p className="text-hf-paragraph-small text-muted-foreground mb-5">
                        Empfohlene max. Grösse: 10 MB, file types: PDF & DOCX
                      </p>
                    </div>

                    <div className="space-y-2">
                      {formData.attestFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 rounded-lg bg-secondary px-3 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <ReviewFileRow
                              title={file.name}
                              subtitle={formatReviewFileSize(file.size)}
                              file={file}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((previous) => {
                                const removed = previous.attestFiles.find(
                                  (item) => item.id === file.id,
                                );
                                if (removed) revokeAttestFileUrls([removed]);
                                return {
                                  ...previous,
                                  attestFiles: previous.attestFiles.filter(
                                    (item) => item.id !== file.id,
                                  ),
                                };
                              })
                            }
                            className={R1_ATTEST_FILE_REMOVE_BUTTON_CLASS}
                            aria-label={`${file.name} löschen`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : currentStep === "step3_booking" ? (
                  <R1FlowBookingScheduler
                    displayedMonth={displayedMonth}
                    onDisplayedMonthChange={setDisplayedMonth}
                    selectedBookingDate={selectedBookingDate}
                    onSelectedBookingDateChange={setSelectedBookingDate}
                    selectedBookingSlot={selectedBookingSlot}
                    onSelectedBookingSlotChange={setSelectedBookingSlot}
                    slots={BOOKING_SLOTS}
                    calendarDays={calendarDays}
                    bookingTimeLabel={`${selectedBookingSlot.replace(" - ", " – ")} Uhr`}
                    locationLines={selectedBookingLocationLines}
                    markerDate={new Date()}
                    error={stepThreeError}
                  />
                ) : currentStep === "step3_booked" ? (
                  <R1FlowBookingConfirmation
                    advisorName={bookedAdvisor}
                    appointmentWeekdayLine={bookedAppointmentWeekdayLine}
                    appointmentDayLine={bookedAppointmentDayLine}
                    appointmentTimeLine={bookedAppointmentTimeLine}
                    locationLines={bookedLocationLines}
                    onReschedule={() => setCurrentStep("step3_booking")}
                    onAddToCalendar={() => {
                      window.open(bookedCalendarHref, "_blank", "noopener,noreferrer");
                    }}
                  />
                ) : currentStep === "step3_recommendation" ? (
                  <div className="w-full">
                    {releasedRecommendationHtml ? (
                      <RecommendationReleasedAccordion
                        variant="r1"
                        html={releasedRecommendationHtml}
                        releasedAt={
                          application?.data?.recommendation?.releasedAt
                        }
                        authorDisplayName={releasedRecommendationAuthor}
                      >
                        <label
                          className={cn(
                            "flex h-6 cursor-pointer items-center gap-3",
                            !recommendationReleased && "cursor-not-allowed opacity-60",
                          )}
                          data-node-id="5247:5575"
                        >
                          <input
                            type="checkbox"
                            checked={isRecommendationAcknowledged}
                            disabled={!recommendationReleased}
                            onChange={(event) => {
                              setIsRecommendationAcknowledged(event.target.checked);
                              setStepThreeError(null);
                            }}
                            className="size-4 shrink-0 rounded-sm border border-stone-250 accent-stone-900 disabled:cursor-not-allowed"
                          />
                          <span className="text-hf-paragraph-small text-stone-900">
                            Ich habe das Empfehlungsschreiben zur Kenntnis genommen
                          </span>
                        </label>
                      </RecommendationReleasedAccordion>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <h2 className="text-hf-paragraph-large-medium text-stone-900">
                          Empfehlungsschreiben
                        </h2>
                        <p className="text-hf-paragraph-small text-muted-foreground">
                          Die Fachstelle hat noch kein Empfehlungsschreiben
                          freigegeben. Sobald die Freigabe erfolgt ist, erscheint
                          es hier zur Kenntnisnahme.
                        </p>
                        <label
                          className="flex h-6 cursor-not-allowed items-center gap-3 opacity-60"
                        >
                          <input
                            type="checkbox"
                            checked={isRecommendationAcknowledged}
                            disabled
                            className="size-4 shrink-0 rounded-sm border border-stone-250"
                          />
                          <span className="text-hf-paragraph-small text-stone-900">
                            Ich habe das Empfehlungsschreiben zur Kenntnis genommen
                          </span>
                        </label>
                      </div>
                    )}
                    {stepThreeError ? (
                      <p className="mt-3 text-xs text-destructive">{stepThreeError}</p>
                    ) : null}
                  </div>
                ) : currentStep === "step4_application" ? (
                  <R1ApplicationDefinitionSection
                    applicationFormData={applicationFormData}
                    setApplicationFormData={setApplicationFormData}
                    errors={stepFourErrors}
                    situationDescriptionRef={situationDescriptionStep4Ref}
                    durationRadioName="application-duration"
                    lectureOtherIdPrefix="step4-lecture-other"
                    assessmentOtherIdPrefix="step4-assessment-other"
                  />
                ) : currentStep === "step6_submitted" ? (
                  <div className="mx-auto flex w-full max-w-[620px] flex-col items-center gap-8 py-10 text-center">
                    <R1FlowSuccessIcon />
                    <div className="flex w-full flex-col gap-6">
                      <div className="space-y-2">
                        <R1FlowSectionTitle>
                          Antrag erfolgreich eingereicht
                        </R1FlowSectionTitle>
                        <p className="text-sm text-muted-foreground">
                          Ihr Antrag wurde erfolgreich eingereicht und befindet sich nun im Status Review. Den aktuellen Status finden Sie jederzeit unter «Meine Anträge».
                        </p>
                      </div>
                      <R1FlowInfoCallout className="mx-auto max-w-[544px] text-left">
                        Die Fachstelle prüft Ihren Antrag auf Vollständigkeit. Die Bearbeitung dauert
                        in der Regel 5–10 Werktage. Sie werden per E-Mail informiert, sobald es
                        Neuigkeiten gibt.
                      </R1FlowInfoCallout>
                    </div>
                    <Button
                      type="button"
                      className="min-h-9 rounded-full px-4"
                      onClick={() => {
                        window.location.href = "/portal/home";
                      }}
                    >
                      Meine Anträge
                    </Button>
                  </div>
                ) : (
                  <>
                    <div
                      id={reviewWorkspaceAnchorId("applicant")}
                      className="scroll-mt-4"
                    >
                      <R1FlowSectionTitle spacingBelow="compact">Persönliche Angaben</R1FlowSectionTitle>
                      <R1FlowFieldRow>
                        {(
                          [
                            { label: "Vorname", value: formData.vorname },
                            { label: "Name", value: formData.name },
                            { label: "Email", value: formData.email },
                            { label: "Telefonnummer", value: formData.phone },
                          ] as const
                        ).map((item) => (
                          <R1FlowField key={item.label}>
                            <Label>{item.label}</Label>
                            <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                              <span className="text-sm text-muted-foreground">{item.value}</span>
                              <Lock className="size-4 text-muted-foreground" />
                            </div>
                          </R1FlowField>
                        ))}
                      </R1FlowFieldRow>
                    </div>

                    <div>
                      <R1FlowSectionTitle spacingBelow="compact">Angaben zum Studium</R1FlowSectionTitle>
                      <R1FlowFieldStack>
                        <R1FlowField className="max-w-[320px]">
                          <Label>Matrikelnummer</Label>
                          <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                            <span className="text-sm text-muted-foreground">
                              {formData.matrikel}
                            </span>
                            <Lock className="size-4 text-muted-foreground" />
                          </div>
                        </R1FlowField>
                        <R1FlowField>
                          <Label>Studiengang</Label>
                          <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                            <span className="text-sm text-muted-foreground">
                              {formData.studiengang}
                            </span>
                            <Lock className="size-4 text-muted-foreground" />
                          </div>
                        </R1FlowField>
                        <R1FlowField>
                          <Label>Welches Semester besuchen Sie</Label>
                          <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                            <span className="text-sm text-muted-foreground">
                              {formData.semester ? `${formData.semester}. Semester` : ""}
                            </span>
                            <Lock className="size-4 text-muted-foreground" />
                          </div>
                        </R1FlowField>
                      </R1FlowFieldStack>
                    </div>

                    <div>
                      <R1FlowSectionTitle spacingBelow="compact">Antragsart</R1FlowSectionTitle>
                      <R1FlowFieldOptions>
                        {(
                          [
                            {
                              value: "studium",
                              title: "Für Studium",
                              description:
                                "Ich bin bereits immatrikuliert und möchte einen Nachteilsausgleich während des Studiums stellen.",
                            },
                            {
                              value: "aufnahmeverfahren",
                              title: "Für Aufnahmeverfahren",
                              description:
                                "Ich bin noch nicht immatrikuliert und möchte einen Nachteilsausgleich für das Aufnahmeverfahren stellen.",
                            },
                          ] as const
                        ).map((item) => (
                          <div
                            key={item.value}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-xl border border-border px-3 py-3",
                              formData.antragsart === item.value ? "opacity-100" : "opacity-50",
                            )}
                          >
                            <input
                              type="radio"
                              checked={formData.antragsart === item.value}
                              readOnly
                              disabled
                              className="mt-0.5 h-4 w-4 accent-primary"
                            />
                            <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                              <span className="flex flex-col gap-1">
                                <span className="text-sm leading-5 text-foreground">
                                  {item.title}
                                </span>
                                <span className="text-xs leading-4 text-muted-foreground">
                                  {item.description}
                                </span>
                              </span>
                              <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </R1FlowFieldOptions>
                    </div>

                    <div
                      id={reviewWorkspaceAnchorId("attest")}
                      className="scroll-mt-4 space-y-3"
                    >
                      <div>
                        <R1FlowSectionTitle spacingBelow="compact">
                          Fachärztliches Attest
                        </R1FlowSectionTitle>
                        <p className="text-sm text-muted-foreground">
                          Laden Sie Ihr fachärztliches Attest im{" "}
                          <a
                          href={ICF_FORMAT_INFO_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2"
                        >
                          ICF-Format
                        </a>{" "}
                          hoch. Es muss Diagnose, Auswirkungen auf studienrelevante Aktivitäten
                          sowie empfohlene Massnahmen enthalten.
                        </p>
                      </div>

                      <R1FlowAttestCallout className="mb-10" />

                      <div className="space-y-2">
                        <div
                          className={cn(
                            "flex cursor-pointer flex-col items-center rounded-xl border border-dashed px-8 py-8 text-center transition-colors",
                            isDragActive ? "border-ring bg-muted/40" : "border-border",
                            step2InvalidInOverview && "border-destructive bg-destructive/5",
                          )}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setIsDragActive(true);
                          }}
                          onDragLeave={() => setIsDragActive(false)}
                          onDrop={(event) => {
                            event.preventDefault();
                            setIsDragActive(false);
                            void appendFiles(event.dataTransfer.files);
                          }}
                          onClick={() => overviewFileInputRef.current?.click()}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              overviewFileInputRef.current?.click();
                            }
                          }}
                        >
                          <Upload className="mb-2 size-6 text-foreground" />
                          <p className="text-base font-medium text-foreground">Drag & Drop</p>
                          <p className="text-sm text-muted-foreground">
                            Datei hier hochladen
                          </p>
                          <p className="text-sm text-muted-foreground">
                            oder via Finder auswählen
                          </p>
                          <input
                            ref={overviewFileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(event) => void appendFiles(event.target.files)}
                          />
                        </div>
                        {step2InvalidInOverview ? (
                          <p className="text-xs text-destructive">
                            Bitte laden Sie mindestens ein Attest hoch (obligatorisch).
                          </p>
                        ) : null}
                        <p className="text-hf-paragraph-small text-muted-foreground mb-5">
                          Empfohlene max. Grösse: 10 MB, file types: PDF & DOCX
                        </p>
                      </div>

                      <div className="space-y-2">
                      {formData.attestFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 rounded-lg bg-secondary px-3 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <ReviewFileRow
                              title={file.name}
                              subtitle={formatReviewFileSize(file.size)}
                              file={file}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((previous) => {
                                const removed = previous.attestFiles.find(
                                  (item) => item.id === file.id,
                                );
                                if (removed) revokeAttestFileUrls([removed]);
                                return {
                                  ...previous,
                                  attestFiles: previous.attestFiles.filter(
                                    (item) => item.id !== file.id,
                                  ),
                                };
                              })
                            }
                            className={R1_ATTEST_FILE_REMOVE_BUTTON_CLASS}
                            aria-label={`${file.name} löschen`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                      </div>
                    </div>

                    <div className="w-full">
                      {releasedRecommendationHtml ? (
                        <RecommendationReleasedAccordion
                          variant="r1"
                          html={releasedRecommendationHtml}
                          releasedAt={
                            application?.data?.recommendation?.releasedAt
                          }
                          authorDisplayName={releasedRecommendationAuthor}
                        />
                      ) : (
                        <div className="flex flex-col gap-3">
                          <h2 className="text-hf-paragraph-large-medium text-stone-900">
                            Empfehlungsschreiben
                          </h2>
                          <p className="text-hf-paragraph-small text-muted-foreground">
                            Die Fachstelle hat noch kein Empfehlungsschreiben
                            freigegeben.
                          </p>
                        </div>
                      )}
                    </div>

                    <R1ApplicationDefinitionSection
                      applicationFormData={applicationFormData}
                      setApplicationFormData={setApplicationFormData}
                      errors={{
                        situationDescription: overviewSituationInvalid
                          ? "Dieses Feld ist erforderlich."
                          : undefined,
                        duration: overviewDurationInvalid
                          ? "Bitte wählen Sie eine Option aus."
                          : undefined,
                        scopeSelections: overviewScopeInvalid
                          ? "Bitte wählen Sie mindestens eine Option aus."
                          : undefined,
                        lectureMeasures: overviewLectureMeasuresInvalid
                          ? "Bitte wählen Sie «Keine», mindestens eine Massnahme oder eine Sonstige-Angabe."
                          : undefined,
                        assessmentMeasures: overviewAssessmentMeasuresInvalid
                          ? "Bitte wählen Sie «Keine», mindestens eine Massnahme oder eine Sonstige-Angabe."
                          : undefined,
                      }}
                      situationDescriptionRef={situationDescriptionOverviewRef}
                      durationRadioName="overview-application-duration"
                      lectureOtherIdPrefix="overview-lecture-other"
                      assessmentOtherIdPrefix="overview-assessment-other"
                    />

                    <div className="rounded-md bg-background p-2">
                      <p className="text-sm text-foreground">
                        Indem Sie fortfahren, stimmen Sie den{" "}
                        <a
                          href="https://www.google.com"
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold underline"
                        >
                          Nutzungsbedingungen
                        </a>{" "}
                        und der{" "}
                        <a
                          href="https://www.google.com"
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold underline"
                        >
                          Datenschutzerklärung
                        </a>{" "}
                        zu.
                      </p>
                      {stepFiveError ? (
                        <p className="mt-1 text-xs text-destructive">{stepFiveError}</p>
                      ) : null}
                    </div>
                  </>
                )}

                {currentStep !== "step3_booked" && currentStep !== "step6_submitted" ? (
                  <R1FlowFormFooter>
                    <div className="flex w-full items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {currentStep === "step2" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 rounded-full px-4"
                          onClick={() => setCurrentStep("step1")}
                        >
                          Zurück
                        </Button>
                      ) : currentStep === "step3_booking" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 rounded-full px-4"
                          onClick={() => setCurrentStep("step2")}
                        >
                          Zurück
                        </Button>
                      ) : currentStep === "step3_recommendation" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 rounded-full px-4"
                          onClick={() => setCurrentStep("step3_booked")}
                        >
                          Zurück
                        </Button>
                      ) : currentStep === "step4_application" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 rounded-full px-4"
                          onClick={() => setCurrentStep("step3_recommendation")}
                        >
                          Zurück
                        </Button>
                      ) : currentStep === "step5_overview" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 rounded-full px-4"
                          onClick={() => setCurrentStep("step4_application")}
                        >
                          Zurück
                        </Button>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      {currentStep === "step3_booking" ? (
                        <Button
                          type="button"
                          className="min-h-9 rounded-full px-4"
                          onClick={handleBookConsultation}
                          disabled={pendingBooking}
                        >
                          {pendingBooking ? "Termin wird gebucht..." : "Termin buchen"}
                        </Button>
                      ) : currentStep === "step4_application" ? (
                        <Button type="submit" className="min-h-9 rounded-full px-4">
                          Übersicht
                        </Button>
                      ) : currentStep === "step5_overview" ? (
                        <Button
                          type="submit"
                          className="min-h-9 gap-2 rounded-full px-4"
                          disabled={!canSubmitFromOverview}
                        >
                          <Send className="size-4 shrink-0" aria-hidden />
                          Ausgleich beantragen
                        </Button>
                      ) : (
                        <Button type="submit" className="min-h-9 rounded-full px-4">
                          Weiter
                        </Button>
                      )}
                    </div>
                    </div>
                  </R1FlowFormFooter>
                ) : null}
            </R1FlowFormCard>
          </form>
        </R1FlowMainContent>
      }
      correctionSidebar={
        showCorrectionSidebar && workspaceApplicationForSidebar && statusMetaForCorrection ? (
          <div className="p-6">
            <ApplicationReviewDetailSidebar
              application={workspaceApplicationForSidebar}
              statusMeta={statusMetaForCorrection}
              assignee={{ displayName: "NTA Fachstelle", initials: "NF" }}
              adjustmentComposer={null}
              savedReviewComments={savedReviewCommentsForSidebar}
              onSavedCommentNavigate={navigateFromSavedComment}
              bemerkungenVariant="r1"
            />
          </div>
        ) : undefined
      }
    />

      <R1OnboardingOverlay
        open={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={() => setIsOnboardingOpen(false)}
      />

      {draftExitError ? (
        <p className="fixed right-6 top-16 z-50 max-w-sm text-right text-xs text-destructive">
          {draftExitError}
        </p>
      ) : null}

      <Dialog
        open={deleteApplicationDialogOpen}
        onOpenChange={(open) => {
          if (!open && isDeletingApplication) return;
          setDeleteApplicationDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Antrag löschen?</DialogTitle>
            <DialogDescription>
              Möchten Sie den aktuellen Antrag wirklich löschen? Dieser Vorgang kann nicht
              rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={isDeletingApplication}
              onClick={() => setDeleteApplicationDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              disabled={isDeletingApplication}
              onClick={() => void performDeleteApplication()}
            >
              {isDeletingApplication ? "Wird gelöscht…" : "Löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
