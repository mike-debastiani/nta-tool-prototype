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
import {
  Calendar,
  Circle,
  CircleArrowRight,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  ExternalLink,
  Eye,
  FileText,
  Info,
  MapPin,
  MessageCircle,
  Mail,
  Lock,
  Phone,
  Stethoscope,
  Trash2,
  Upload,
  User,
  UserRound,
  Clock3,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

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
import { RecommendationReleasedAccordion } from "@/components/domain/recommendation-released-accordion";
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
import { type ApplicationRow, type WorkspaceApplication } from "@/lib/test-flow-types";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

export type NtaAntragUploadFile = {
  id: string;
  name: string;
  size: number;
  type: string;
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

type ApplicationMeasureKey = "m1" | "m2" | "m3" | "m4";

type ApplicationFormData = {
  situationDescription: string;
  duration: ApplicationDuration | "";
  scopeSelections: string[];
  lectureMeasures: ApplicationMeasureKey[];
  lectureOtherEnabled: boolean;
  lectureOtherText: string;
  assessmentMeasures: ApplicationMeasureKey[];
  assessmentOtherEnabled: boolean;
  assessmentOtherText: string;
};

type ApplicationFormFieldErrors = {
  situationDescription?: string;
  duration?: string;
  scopeSelections?: string;
  lectureMeasures?: string;
  lectureOtherText?: string;
  assessmentMeasures?: string;
  assessmentOtherText?: string;
};

const INITIAL_BOOKING_MONTH = new Date(2026, 4, 1);
const INITIAL_BOOKING_DATE = new Date(2026, 4, 14);
const BOOKING_SLOTS = [
  "09:30 - 10:30",
  "10:30 - 11:30",
  "11:30 - 12:30",
  "12:30 - 13:30",
  "13:30 - 14:30",
  "14:30 - 15:30",
  "15:30 - 16:30",
];
const MOCK_LOCATION = "Hauptgebäude, Raum 402, Beispielstrasse 12, 8080 Beispilien";
const MOCK_ADVISOR = "Frau Dr. Suzanne Beispiel";

type ProgressRowProps = {
  icon: ReactNode;
  label: string;
  trailing: ReactNode;
  stateClassName?: string;
  onClick?: () => void;
  isClickable?: boolean;
};

const SEMESTER_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

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

const APPLICATION_MEASURE_OPTIONS = [
  { key: "m1", label: "Massnahme 1" },
  { key: "m2", label: "Massnahme 2" },
  { key: "m3", label: "Massnahme 3" },
  { key: "m4", label: "Massnahme 4" },
] as const;

const DEFAULT_APPLICATION_FORM_DATA: ApplicationFormData = {
  situationDescription: "",
  duration: "",
  scopeSelections: [],
  lectureMeasures: [],
  lectureOtherEnabled: false,
  lectureOtherText: "",
  assessmentMeasures: [],
  assessmentOtherEnabled: false,
  assessmentOtherText: "",
};

function mergeWithDefaults(value?: Partial<NtaAntragFormData>): NtaAntragFormData {
  return {
    ...DEFAULT_FORM_DATA,
    ...value,
    attestFiles: value?.attestFiles ?? [],
  };
}

function formatFileSize(sizeInBytes: number) {
  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
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

function formatBookingMonthLabel(date: Date) {
  const label = date.toLocaleDateString("de-CH", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
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
  if (data.lectureMeasures.length === 0 && !data.lectureOtherEnabled) return false;
  if (data.lectureOtherEnabled && !data.lectureOtherText.trim()) return false;
  if (data.assessmentMeasures.length === 0 && !data.assessmentOtherEnabled) return false;
  if (data.assessmentOtherEnabled && !data.assessmentOtherText.trim()) return false;
  return true;
}

function ProgressRow({
  icon,
  label,
  trailing,
  stateClassName,
  onClick,
  isClickable = false,
}: ProgressRowProps) {
  return (
    <div
      className={cn(
        "flex h-8 items-center justify-between rounded-md py-1 pl-3",
        isClickable && "cursor-pointer hover:bg-muted/40",
        stateClassName ?? "text-foreground",
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-4 shrink-0 items-center justify-center text-current [&_svg]:size-4">
          {icon}
        </span>
        <span className="truncate text-sm leading-5 text-current">
          {label}
        </span>
      </div>
      <span className="flex size-4 shrink-0 items-center justify-center text-current [&_svg]:size-4">
        {trailing}
      </span>
    </div>
  );
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
  const recommendationReady = Boolean(initialApplication.data?.recommendation?.ready);
  const consultationStatus = initialApplication.data?.consultation?.status;
  const isSubmitted = Boolean(initialApplication.data?.submittedAt);
  if (isSubmitted) return "step6_submitted";
  if (recommendationReady) return "step3_recommendation";
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
        "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
        checked ? "border-border bg-card" : "border-border bg-card opacity-60",
      )}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 accent-primary"
      />
      <span className="flex flex-col gap-1">
        <span className="text-sm leading-5 text-foreground">{title}</span>
        <span className="text-xs leading-4 text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}

export function NtaAntragDesktop({
  initialApplication,
  autosaveKey = "nta-antrag-draft",
  initialData,
  onContinue,
  forceNew = false,
}: NtaAntragDesktopProps) {
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
          attestFiles: (initialApplication.data.attestFiles ?? []).map((file) => ({
            id: file.id ?? crypto.randomUUID(),
            name: file.name ?? "Datei",
            size: file.size ?? 0,
            type: file.type ?? "",
          })),
        } satisfies Partial<NtaAntragFormData>)
      : undefined;
    return mergeWithDefaults(fromApplication ?? initialData);
  });
  const [currentStep, setCurrentStep] = useState<FlowStep>(() =>
    resolveInitialFlowStep(initialApplication, forceNew),
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
  const [isRecommendationAcknowledged, setIsRecommendationAcknowledged] =
    useState(false);
  const [applicationFormData, setApplicationFormData] = useState<ApplicationFormData>(
    DEFAULT_APPLICATION_FORM_DATA,
  );
  const [displayedMonth, setDisplayedMonth] = useState<Date>(INITIAL_BOOKING_MONTH);
  const [selectedBookingDate, setSelectedBookingDate] =
    useState<Date>(INITIAL_BOOKING_DATE);
  const [selectedBookingSlot, setSelectedBookingSlot] = useState<string>(
    BOOKING_SLOTS[4],
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overviewFileInputRef = useRef<HTMLInputElement>(null);
  const situationDescriptionStep4Ref = useRef<HTMLTextAreaElement>(null);
  const situationDescriptionOverviewRef = useRef<HTMLTextAreaElement>(null);
  const lastSyncedInitialApplicationId = useRef<string | undefined>(undefined);

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
    // Load persisted draft only after hydration to avoid SSR/client markup mismatch.
    const timeout = window.setTimeout(() => {
      if (forceNew) {
        window.localStorage.removeItem(autosaveKey);
        setApplication(null);
        setFormData(mergeWithDefaults(initialData));
        setApplicationFormData(DEFAULT_APPLICATION_FORM_DATA);
        setStepOneErrors({});
        setStepTwoFileError(null);
        setStepThreeError(null);
        setStepFourErrors({});
        setStepFiveError(null);
        setIsRecommendationAcknowledged(false);
        setCurrentStep("step1");
        return;
      }
      try {
        const rawDraft = window.localStorage.getItem(autosaveKey);
        if (!rawDraft) return;
        const parsedDraft = JSON.parse(rawDraft) as Partial<NtaAntragFormData>;
        setFormData(mergeWithDefaults(parsedDraft));
      } catch {
        // Keep current in-memory state when draft is malformed.
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [autosaveKey, forceNew, initialData]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(autosaveKey, JSON.stringify(formData));
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
    setCurrentStep(resolveInitialFlowStep(initialApplication, false));

    const pd = initialApplication.data.personalData;
    if (pd) {
      setFormData(
        mergeWithDefaults({
          vorname: pd.vorname ?? "",
          name: pd.name ?? "",
          email: pd.email ?? "",
          phone: pd.phone ?? "",
          matrikel: pd.matrikel ?? "",
          studiengang: pd.studiengang ?? "",
          semester: pd.semester ?? "",
          antragsart:
            (pd.antragsart as "studium" | "aufnahmeverfahren" | undefined) ?? "studium",
          attestFiles: (initialApplication.data.attestFiles ?? []).map((file) => ({
            id: file.id ?? crypto.randomUUID(),
            name: file.name ?? "Datei",
            size: file.size ?? 0,
            type: file.type ?? "",
          })),
        }),
      );
    }

    const ad = initialApplication.data.applicationDefinition;
    if (ad) {
      const measureKeys: ApplicationMeasureKey[] = ["m1", "m2", "m3", "m4"];
      const pickMeasures = (raw: string[] | undefined) =>
        (raw ?? []).filter((k): k is ApplicationMeasureKey =>
          measureKeys.includes(k as ApplicationMeasureKey),
        );
      setApplicationFormData({
        situationDescription: ad.situationDescription ?? "",
        duration: (ad.duration as ApplicationDuration | "") ?? "",
        scopeSelections: [...(ad.scopeSelections ?? [])],
        lectureMeasures: pickMeasures(ad.lectureMeasures),
        lectureOtherEnabled: Boolean(ad.lectureOtherEnabled),
        lectureOtherText: ad.lectureOtherText ?? "",
        assessmentMeasures: pickMeasures(ad.assessmentMeasures),
        assessmentOtherEnabled: Boolean(ad.assessmentOtherEnabled),
        assessmentOtherText: ad.assessmentOtherText ?? "",
      });
    }
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
            if (next.data?.recommendation?.ready) return "step3_recommendation";
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

  const appendFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const nextFiles: NtaAntragUploadFile[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setFormData((previous) => ({
      ...previous,
      attestFiles: [...previous.attestFiles, ...nextFiles],
    }));
    setStepTwoFileError(null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    appendFiles(event.dataTransfer.files);
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
      applicationFormData.lectureMeasures.length === 0 &&
      !applicationFormData.lectureOtherEnabled
    ) {
      nextErrors.lectureMeasures = "Bitte wählen Sie mindestens eine Option aus.";
    }
    if (
      applicationFormData.lectureOtherEnabled &&
      !applicationFormData.lectureOtherText.trim()
    ) {
      nextErrors.lectureOtherText = "Bitte spezifizieren Sie die sonstige Massnahme.";
    }
    if (
      applicationFormData.assessmentMeasures.length === 0 &&
      !applicationFormData.assessmentOtherEnabled
    ) {
      nextErrors.assessmentMeasures = "Bitte wählen Sie mindestens eine Option aus.";
    }
    if (
      applicationFormData.assessmentOtherEnabled &&
      !applicationFormData.assessmentOtherText.trim()
    ) {
      nextErrors.assessmentOtherText = "Bitte spezifizieren Sie die sonstige Massnahme.";
    }

    setStepFourErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  async function performDeleteApplication() {
    setIsDeletingApplication(true);

    if (application?.id) {
      const { error } = await supabase.from("applications").delete().eq("id", application.id);
      if (error) {
        setStepFiveError(error.message);
        setIsDeletingApplication(false);
        return;
      }
    }

    setApplication(null);
    setFormData(DEFAULT_FORM_DATA);
    setApplicationFormData(DEFAULT_APPLICATION_FORM_DATA);
    setStepOneErrors({});
    setStepTwoFileError(null);
    setStepThreeError(null);
    setStepFourErrors({});
    setStepFiveError(null);
    setIsRecommendationAcknowledged(false);
    setSelectedBookingDate(INITIAL_BOOKING_DATE);
    setDisplayedMonth(INITIAL_BOOKING_MONTH);
    setSelectedBookingSlot(BOOKING_SLOTS[4]);
    setCurrentStep("step1");
    window.localStorage.removeItem(autosaveKey);
    setDeleteApplicationDialogOpen(false);
    setIsDeletingApplication(false);
  }

  const bookingDateLabel = selectedBookingDate.toLocaleDateString("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const bookingMonthLabel = formatBookingMonthLabel(displayedMonth);
  const monthStart = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(1 - monthStart.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
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
          attestFiles: formData.attestFiles,
          consultation: {
            status: "booked",
            date: bookingDateLabel,
            slot: selectedBookingSlot,
            location: MOCK_LOCATION,
            advisor: MOCK_ADVISOR,
          },
          recommendation: {
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
      attestFiles: formData.attestFiles,
      consultation: {
        ...(application?.data?.consultation ?? {}),
        status: "done" as const,
        date: application?.data?.consultation?.date ?? bookingDateLabel,
        slot: application?.data?.consultation?.slot ?? selectedBookingSlot,
        location: application?.data?.consultation?.location ?? MOCK_LOCATION,
        advisor: application?.data?.consultation?.advisor ?? MOCK_ADVISOR,
      },
      recommendation: {
        ...(application?.data?.recommendation ?? {}),
        ready: true,
      },
      applicationDefinition: {
        situationDescription: applicationFormData.situationDescription,
        duration: applicationFormData.duration || undefined,
        scopeSelections: applicationFormData.scopeSelections,
        lectureMeasures: applicationFormData.lectureMeasures,
        lectureOtherEnabled: applicationFormData.lectureOtherEnabled,
        lectureOtherText: applicationFormData.lectureOtherText,
        assessmentMeasures: applicationFormData.assessmentMeasures,
        assessmentOtherEnabled: applicationFormData.assessmentOtherEnabled,
        assessmentOtherText: applicationFormData.assessmentOtherText,
      },
      finalSubmitted: true,
      submittedAt,
    };

    const minimalSubmitData = {
      ...(application?.data ?? {}),
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
      attestFiles: formData.attestFiles,
      applicationDefinition: {
        situationDescription: applicationFormData.situationDescription,
        duration: applicationFormData.duration || undefined,
        scopeSelections: applicationFormData.scopeSelections,
        lectureMeasures: applicationFormData.lectureMeasures,
        lectureOtherEnabled: applicationFormData.lectureOtherEnabled,
        lectureOtherText: applicationFormData.lectureOtherText,
        assessmentMeasures: applicationFormData.assessmentMeasures,
        assessmentOtherEnabled: applicationFormData.assessmentOtherEnabled,
        assessmentOtherText: applicationFormData.assessmentOtherText,
      },
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
    || "Fachstelle für Nachteilsausgleich";
  const bookedSlot = application?.data?.consultation?.slot ?? selectedBookingSlot;
  const bookedDateShort = selectedBookingDate.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const bookedTimeDisplay = `${bookedSlot.replace(" - ", " – ")} Uhr`;
  const locationLines = MOCK_LOCATION.split(", ");
  const recommendationReleased =
    Boolean(application?.data?.recommendation?.ready) ||
    currentStep === "step3_recommendation" ||
    currentStep === "step4_application" ||
    currentStep === "step5_overview" ||
    currentStep === "step6_submitted";
  const stepOneLockedAfterConsultation =
    application?.data?.consultation?.status === "booked" ||
    application?.data?.consultation?.status === "done";
  const step1Complete = isStepOneComplete(formData);
  const step2Complete = formData.attestFiles.length > 0;
  const step3Complete = recommendationReleased;
  const step4Complete = isStepFourComplete(applicationFormData);
  const step5Complete = currentStep === "step6_submitted";
  const isOverviewStep = currentStep === "step5_overview";
  const overviewSituationInvalid =
    isOverviewStep && !applicationFormData.situationDescription.trim();
  const overviewDurationInvalid = isOverviewStep && !applicationFormData.duration;
  const overviewScopeInvalid =
    isOverviewStep && applicationFormData.scopeSelections.length === 0;
  const overviewLectureSelectionInvalid =
    isOverviewStep &&
    applicationFormData.lectureMeasures.length === 0 &&
    !applicationFormData.lectureOtherEnabled;
  const overviewLectureOtherTextInvalid =
    isOverviewStep &&
    applicationFormData.lectureOtherEnabled &&
    !applicationFormData.lectureOtherText.trim();
  const overviewAssessmentSelectionInvalid =
    isOverviewStep &&
    applicationFormData.assessmentMeasures.length === 0 &&
    !applicationFormData.assessmentOtherEnabled;
  const overviewAssessmentOtherTextInvalid =
    isOverviewStep &&
    applicationFormData.assessmentOtherEnabled &&
    !applicationFormData.assessmentOtherText.trim();
  const step1InvalidInOverview = isOverviewStep && !step1Complete;
  const step2InvalidInOverview = isOverviewStep && !step2Complete;
  const step4InvalidInOverview = isOverviewStep && !step4Complete;
  const step5InvalidInOverview =
    isOverviewStep && (!step1Complete || !step2Complete || !step4Complete);

  const canOpenStep1 = true;
  const canOpenStep2 = step1Complete;
  const canOpenStep3 = step1Complete && step2Complete;
  const canOpenStep4 = step1Complete && step2Complete && recommendationReleased;
  const canOpenStep5 = step1Complete && step2Complete && step3Complete && step4Complete;

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
    return raw.map((c) => ({
      id: c.id,
      blockId: c.blockId,
      blockTitle: c.blockTitle,
      body: c.body,
      createdAt: Date.parse(c.createdAt),
    }));
  }, [
    application?.data?.recommendation?.workspaceReview?.forwardedComments,
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

  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      <div className="grid h-screen grid-cols-12 gap-6">
        <aside
          className={cn(
            "col-span-12 flex h-screen flex-col overflow-hidden border-r border-border bg-sidebar p-8",
            showCorrectionSidebar ? "lg:col-span-3" : "lg:col-span-4",
          )}
        >
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Prozessfortschritt
          </h1>
          <nav className="mt-8 flex flex-col gap-2" aria-label="Prozessfortschritt">
            <ProgressRow
              icon={<User className="stroke-[1.75]" />}
              label="Persönliche Angaben"
              stateClassName={
                step1InvalidInOverview
                  ? "text-destructive"
                  : step1Complete
                  ? "text-teal-600"
                  : currentStep === "step1" || nextAvailableStep === "step1"
                    ? "text-foreground"
                    : "text-neutral-400"
              }
              isClickable={canOpenStep1}
              onClick={() => setCurrentStep("step1")}
              trailing={
                step1InvalidInOverview ? (
                  <Circle className="stroke-[1.75]" />
                ) : step1Complete ? (
                  <CircleCheck className="stroke-[1.75]" />
                ) : currentStep === "step1" || nextAvailableStep === "step1" ? (
                  <CircleArrowRight className="stroke-[1.75]" />
                ) : (
                  <Circle className="stroke-[1.75]" />
                )
              }
            />
            <ProgressRow
              icon={<Stethoscope className="stroke-[1.75]" />}
              label="Fachärztliches Attest"
              stateClassName={
                step2InvalidInOverview
                  ? "text-destructive"
                  : step2Complete
                  ? "text-teal-600"
                  : currentStep === "step2"
                      || nextAvailableStep === "step2"
                    ? "text-foreground"
                    : !step1Complete
                    ? "text-neutral-400"
                    : "text-neutral-400"
              }
              isClickable={canOpenStep2}
              onClick={canOpenStep2 ? () => setCurrentStep("step2") : undefined}
              trailing={
                step2InvalidInOverview ? (
                  <Circle className="stroke-[1.75]" />
                ) : step2Complete ? (
                  <CircleCheck className="stroke-[1.75]" />
                ) : currentStep === "step2" || nextAvailableStep === "step2" ? (
                  <CircleArrowRight className="stroke-[1.75]" />
                ) : !step1Complete ? (
                  <Circle className="stroke-[1.75]" />
                ) : (
                  <Circle className="stroke-[1.75]" />
                )
              }
            />
            <ProgressRow
              icon={<MessageCircle className="stroke-[1.75]" />}
              label="Beratung und Empfehlung"
              stateClassName={
                step3Complete
                  ? "text-teal-600"
                  : isStep3Active || nextAvailableStep === "step3_recommendation"
                    ? "text-foreground"
                    : "text-neutral-400"
              }
              isClickable={canOpenStep3}
              onClick={
                canOpenStep3
                  ? () =>
                      setCurrentStep(
                        currentStep === "step3_booking"
                          ? "step3_booking"
                          : currentStep === "step3_booked"
                            ? "step3_booked"
                            : "step3_recommendation",
                      )
                  : undefined
              }
              trailing={
                step3Complete ? (
                  <CircleCheck className="stroke-[1.75]" />
                ) : isStep3Active || nextAvailableStep === "step3_recommendation" ? (
                  <CircleArrowRight className="stroke-[1.75]" />
                ) : (
                  <Circle className="stroke-[1.75]" />
                )
              }
            />
            {!recommendationReleased ? (
              <div
                className="my-1 h-px w-full border-0 border-t border-dashed border-border"
                aria-hidden
              />
            ) : null}
            <ProgressRow
              icon={<FileText className="stroke-[1.75]" />}
              label="Antrag stellen"
              stateClassName={
                step4InvalidInOverview
                  ? "text-destructive"
                  : step4Complete
                  ? "text-teal-600"
                  : currentStep === "step4_application" || nextAvailableStep === "step4_application"
                  ? "text-foreground"
                  : recommendationReleased
                    ? "text-neutral-400"
                    : "text-neutral-200"
              }
              isClickable={canOpenStep4}
              onClick={canOpenStep4 ? () => setCurrentStep("step4_application") : undefined}
              trailing={
                step4InvalidInOverview ? (
                  <Circle className="stroke-[1.75]" />
                ) : step4Complete ? (
                  <CircleCheck className="stroke-[1.75]" />
                ) : currentStep === "step4_application" || nextAvailableStep === "step4_application" ? (
                  <CircleArrowRight className="stroke-[1.75]" />
                ) : recommendationReleased ? (
                  <Circle className="stroke-[1.75]" />
                ) : (
                  <CircleDashed className="stroke-[1.75]" />
                )
              }
            />
            <ProgressRow
              icon={<Eye className="stroke-[1.75]" />}
              label="Übersicht"
              stateClassName={
                step5InvalidInOverview
                  ? "text-destructive"
                  : step5Complete
                  ? "text-teal-600"
                  : currentStep === "step5_overview" || nextAvailableStep === "step5_overview"
                  ? "text-foreground"
                  : currentStep === "step4_application"
                    ? "text-neutral-400"
                    : "text-neutral-200"
              }
              isClickable={canOpenStep5}
              onClick={canOpenStep5 ? () => setCurrentStep("step5_overview") : undefined}
              trailing={
                step5InvalidInOverview ? (
                  <Circle className="stroke-[1.75]" />
                ) : step5Complete ? (
                  <CircleCheck className="stroke-[1.75]" />
                ) : currentStep === "step5_overview" || nextAvailableStep === "step5_overview" ? (
                  <CircleArrowRight className="stroke-[1.75]" />
                ) : currentStep === "step4_application" ? (
                  <Circle className="stroke-[1.75]" />
                ) : (
                  <CircleDashed className="stroke-[1.75]" />
                )
              }
            />
          </nav>

          <Card className="mt-auto rounded-lg border border-zinc-200 bg-background p-0 shadow-none ring-0">
            <CardContent className="px-4 py-3">
              <div className="flex items-start gap-3">
                <CircleHelp className="mt-0.5 size-4 shrink-0 text-foreground" />
                <div className="min-w-0 text-xs leading-4 text-foreground">
                  <p className="font-medium">Fragen oder Unklarheiten?</p>
                  <p className="mt-0.5">kontaktieren Sie unsere Fachstelle unter</p>
                  <div className="mt-3 space-y-2.5">
                    <a
                      href="mailto:Kontaktstelle@hochschule.ch"
                      className="flex items-center gap-2 transition-colors hover:text-foreground/80"
                    >
                      <span>Kontaktstelle@hochschule.ch</span>
                      <Mail className="size-3.5" />
                    </a>
                    <a
                      href="tel:+41551203489"
                      className="flex items-center gap-2 transition-colors hover:text-foreground/80"
                    >
                      <span>+41 55 120 34 89</span>
                      <Phone className="size-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        <main
          className={cn(
            "col-span-12 h-screen overflow-y-auto px-6 pb-16 pt-[93px] lg:pr-8",
            showCorrectionSidebar ? "lg:col-span-6" : "lg:col-span-8",
          )}
        >
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
                setCurrentStep("step4_application");
                return;
              }
              if (currentStep === "step4_application") {
                if (!validateStepFour()) return;
                setCurrentStep("step5_overview");
                return;
              }
              if (currentStep === "step5_overview") {
                void handleSubmitApplication();
                return;
              }
              onContinue?.(formData);
            }}
          >
            <Card className="h-fit w-full max-w-[822px] border border-border px-6 py-6 shadow-xs">
              <CardContent className="space-y-8 p-0">
                {currentStep === "step1" ? (
                  <>
                    {!stepOneLockedAfterConsultation ? (
                      <>
                        <div
                          id={reviewWorkspaceAnchorId("applicant")}
                          className="scroll-mt-4 space-y-6"
                        >
                          <CardTitle className="text-lg font-medium leading-[27px] text-foreground">
                            Persönliche Angaben
                          </CardTitle>
                      <div className="grid gap-6 lg:grid-cols-2 lg:gap-x-[29px]">
                        <div className="flex flex-col gap-1">
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
                        </div>
                        <div className="flex flex-col gap-1">
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
                        </div>
                      </div>
                      <div className="grid gap-6 lg:grid-cols-2 lg:gap-x-[29px]">
                        <div className="flex flex-col gap-1">
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
                        </div>
                        <div className="flex flex-col gap-1">
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
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <CardTitle className="text-lg font-medium leading-[27px] text-foreground">
                        Angaben zum Studium
                      </CardTitle>
                      <div className="space-y-6">
                        <div className="flex max-w-[320px] flex-col gap-1">
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
                        </div>
                        <div className="flex flex-col gap-1">
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
                        </div>
                        <div className="flex flex-col gap-1">
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
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <CardTitle className="text-lg font-medium leading-[27px] text-foreground">
                        Antragsart
                      </CardTitle>
                      <div className="space-y-2">
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
                      </div>
                    </div>
                      </>
                    ) : (
                      <>
                        <div
                          id={reviewWorkspaceAnchorId("applicant")}
                          className="scroll-mt-4 space-y-6"
                        >
                          <p className="text-lg font-medium text-foreground">
                            Persönliche Angaben
                          </p>
                          <div className="grid gap-6 lg:grid-cols-2 lg:gap-x-[29px]">
                            {(
                              [
                                { label: "Vorname", value: formData.vorname },
                                { label: "Name", value: formData.name },
                                { label: "Email", value: formData.email },
                                { label: "Telefonnummer", value: formData.phone },
                              ] as const
                            ).map((item) => (
                              <div key={item.label} className="flex flex-col gap-1">
                                <Label>{item.label}</Label>
                                <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                                  <span className="text-sm text-muted-foreground">
                                    {item.value}
                                  </span>
                                  <Lock className="size-4 text-muted-foreground" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-6">
                          <p className="text-lg font-medium text-foreground">
                            Angaben zum Studium
                          </p>
                          <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                              <Label>Matrikelnummer</Label>
                              <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                                <span className="text-sm text-muted-foreground">
                                  {formData.matrikel}
                                </span>
                                <Lock className="size-4 text-muted-foreground" />
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Label>Welches Semester besuchen Sie</Label>
                              <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                                <span className="text-sm text-muted-foreground">
                                  {formData.studiengang}
                                </span>
                                <Lock className="size-4 text-muted-foreground" />
                              </div>
                            </div>
                            <div className="flex max-w-[320px] flex-col gap-1">
                              <Label>Welches Semester besuchen Sie</Label>
                              <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                                <span className="text-sm text-muted-foreground">
                                  {formData.semester
                                    ? `${formData.semester}. Semester`
                                    : ""}
                                </span>
                                <Lock className="size-4 text-muted-foreground" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-lg font-medium text-foreground">Antragsart</p>
                          <div className="space-y-2">
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
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : currentStep === "step2" ? (
                  <div
                    id={reviewWorkspaceAnchorId("attest")}
                    className="scroll-mt-4 space-y-5"
                  >
                    <div className="space-y-2">
                      <CardTitle className="text-lg font-medium leading-[27px] text-foreground">
                        Fachärztliches Attest
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Laden Sie Ihr fachärztliches Attest im{" "}
                        <span className="underline underline-offset-2">ICF-Format</span>{" "}
                        hoch. Es muss Diagnose, Auswirkungen auf studienrelevante Aktivitäten
                        sowie empfohlene Massnahmen enthalten.
                      </p>
                    </div>

                    <div className="rounded-lg bg-blue-100 px-4 py-3">
                      <div className="mb-1 flex items-start gap-2 text-sm font-medium text-foreground">
                        <Info className="mt-0.5 size-4 shrink-0" />
                        <span>Bitte beachten Sie die Vorgaben des fachärztlichen Attests</span>
                      </div>
                      <div className="ml-6 flex flex-col items-start gap-2">
                        <a
                          href="/attest/attest-checkliste-icf.pdf"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-foreground hover:underline"
                        >
                          Attest-Checkliste im ICF Format
                          <ExternalLink className="size-4" />
                        </a>
                        <a
                          href="/attest/attest-mustervorlage.pdf"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-foreground hover:underline"
                        >
                          Attest Mustervorlage
                          <ExternalLink className="size-4" />
                        </a>
                      </div>
                    </div>

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
                          onChange={(event) => appendFiles(event.target.files)}
                        />
                      </div>
                      {stepTwoFileError ? (
                        <p className="text-xs text-destructive">{stepTwoFileError}</p>
                      ) : null}
                      <p className="text-sm text-muted-foreground">
                        Empfohlene max. Grösse: 10 MB, file types: PDF & DOCX
                      </p>
                    </div>

                    <div className="space-y-2">
                      {formData.attestFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-4 rounded-lg bg-secondary px-4 py-4"
                        >
                          <FileText className="size-5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {file.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((previous) => ({
                                ...previous,
                                attestFiles: previous.attestFiles.filter(
                                  (item) => item.id !== file.id,
                                ),
                              }))
                            }
                            className="rounded-md p-2 text-destructive/80 transition hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`${file.name} löschen`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : currentStep === "step3_booking" ? (
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <CardTitle className="text-lg font-medium leading-[27px] text-foreground">
                        Beratung buchen
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Wählen sie einen freien Termin, um das obligatorische
                        Beratungsgespräch wahrzunehmen.
                      </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1fr_170px]">
                      <div>
                        <div className="mb-4 flex items-center justify-between px-2">
                          <button
                            type="button"
                            className="rounded-md border p-1.5 text-muted-foreground"
                            onClick={() =>
                              setDisplayedMonth(
                                (previous) =>
                                  new Date(
                                    previous.getFullYear(),
                                    previous.getMonth() - 1,
                                    1,
                                  ),
                              )
                            }
                          >
                            <ArrowLeft className="size-4" />
                          </button>
                          <p className="text-sm font-medium">{bookingMonthLabel}</p>
                          <button
                            type="button"
                            className="rounded-md border p-1.5 text-muted-foreground"
                            onClick={() =>
                              setDisplayedMonth(
                                (previous) =>
                                  new Date(
                                    previous.getFullYear(),
                                    previous.getMonth() + 1,
                                    1,
                                  ),
                              )
                            }
                          >
                            <ArrowRight className="size-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
                          {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((d) => (
                            <span key={d}>{d}</span>
                          ))}
                        </div>
                        <div className="mt-2 grid grid-cols-7 gap-2">
                          {calendarDays.map((entry) => (
                            <button
                              type="button"
                              key={entry.key}
                              onClick={() => {
                                setSelectedBookingDate(entry.date);
                                if (!entry.isCurrentMonth) {
                                  setDisplayedMonth(
                                    new Date(
                                      entry.date.getFullYear(),
                                      entry.date.getMonth(),
                                      1,
                                    ),
                                  );
                                }
                              }}
                              className={cn(
                                "h-8 rounded-md text-sm",
                                entry.date.toDateString() ===
                                  selectedBookingDate.toDateString()
                                  ? "bg-muted font-medium"
                                  : "hover:bg-muted/50",
                                !entry.isCurrentMonth && "text-muted-foreground",
                              )}
                            >
                              {entry.date.getDate()}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {BOOKING_SLOTS.map((slot) => (
                          <button
                            type="button"
                            key={slot}
                            onClick={() => setSelectedBookingSlot(slot)}
                            className={cn(
                              "w-full rounded-lg border px-3 py-2 text-sm",
                              selectedBookingSlot === slot
                                ? "border-foreground"
                                : "border-border",
                            )}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-base font-medium">Termindetails</p>
                      <div className="space-y-2 text-sm text-foreground">
                        <p className="flex items-center gap-2">
                          <Calendar className="size-4" /> {bookingDateLabel}
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock3 className="size-4" /> {selectedBookingSlot} Uhr
                        </p>
                        <p className="flex items-start gap-2">
                          <MapPin className="mt-0.5 size-4" /> {MOCK_LOCATION}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-foreground">
                      Indem Sie fortfahren, stimmen Sie den{" "}
                      <a
                        href="https://www.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        Nutzungsbedingungen
                      </a>{" "}
                      und der{" "}
                      <a
                        href="https://www.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        Datenschutzerklärung
                      </a>{" "}
                      zu.
                    </p>
                    {stepThreeError ? (
                      <p className="text-xs text-destructive">{stepThreeError}</p>
                    ) : null}
                  </div>
                ) : currentStep === "step3_booked" ? (
                  <div className="mx-auto w-full max-w-[620px] space-y-8 pb-2 text-center">
                    <CircleCheck className="mx-auto size-12 text-teal-600" />
                    <div className="space-y-3">
                      <CardTitle className="text-lg font-medium leading-[27px] text-foreground">
                        Ihr Beratungsgespräch ist gebucht!
                      </CardTitle>
                      <div className="mx-auto w-full max-w-[544px] rounded-lg bg-blue-100 px-4 py-3 text-sm">
                        <div className="flex items-start gap-2">
                          <Info className="mt-0.5 size-4 shrink-0" />
                          <p className="text-left">
                            Sie erhalten eine Bestätigung per E-Mail. Nach der
                            Beratung werden die weiteren Schritte Ihres Antrags
                            freigeschaltet.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 pt-1">
                      <UserRound className="mx-auto size-32 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Beratende Person</p>
                      <p className="text-sm">{MOCK_ADVISOR}</p>
                    </div>
                    <div className="mx-auto grid max-w-[460px] gap-x-12 gap-y-3 text-left text-sm md:grid-cols-2">
                      <p>
                        Datum: {bookedDateShort}
                        <br />
                        Uhrzeit: {bookedTimeDisplay}
                      </p>
                      <p>
                        {locationLines.map((line) => (
                          <span key={line}>
                            {line}
                            <br />
                          </span>
                        ))}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-8">
                      <Button type="button" variant="destructive" className="min-h-9 px-4">
                        Termin verschieben
                      </Button>
                      <Button type="button" variant="secondary" className="min-h-9 px-4">
                        Zum Kalender hinzufügen
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground/90">
                      Terminverschiebungen müssen mindestens 24 Stunden im Voraus
                      erfolgen. Bei Notfällen und Krankheit ist eine kurzfristige
                      Absage an beispiel@hochschule.ch möglich.
                    </p>
                  </div>
                ) : currentStep === "step3_recommendation" ? (
                  <div className="space-y-6">
                    {releasedRecommendationHtml ? (
                      <RecommendationReleasedAccordion
                        variant="plain"
                        html={releasedRecommendationHtml}
                        releasedAt={
                          application?.data?.recommendation?.releasedAt
                        }
                        authorDisplayName={releasedRecommendationAuthor}
                      />
                    ) : (
                      <div className="space-y-2">
                        <CardTitle className="text-lg font-medium leading-[27px] text-foreground">
                          Empfehlungsschreiben der Fachstelle
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Die Fachstelle hat noch kein Empfehlungsschreiben
                          freigegeben. Sobald die Freigabe erfolgt ist, erscheint
                          es hier zur Kenntnisnahme.
                        </p>
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={isRecommendationAcknowledged}
                        onChange={(event) => {
                          setIsRecommendationAcknowledged(event.target.checked);
                          setStepThreeError(null);
                        }}
                        className="size-4 accent-primary"
                      />
                      Ich habe das Empfehlungsschreiben zur Kenntnis genommen.
                    </label>
                    {stepThreeError ? (
                      <p className="text-xs text-destructive">{stepThreeError}</p>
                    ) : null}
                  </div>
                ) : currentStep === "step4_application" ? (
                  <div className="space-y-8">
                    <div className="space-y-5">
                      <CardTitle className="text-lg font-medium leading-[27px] text-foreground">
                        Antragsstellung
                      </CardTitle>

                      <div
                        id={reviewWorkspaceAnchorId("definition")}
                        className="scroll-mt-4 space-y-2"
                      >
                        <p className="text-sm font-medium text-foreground">
                          Beschreibung der gesundheitlichen Situation und Nachteile
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Beschreiben Sie Ihre gesundheitliche Situation und die
                          behinderungsbedingten Nachteile auf studienrelevante Aktivitäten und
                          Leistungsnachweise. Haben Sie noch keine Studienerfahrung, so können
                          Sie auf Ihre Erfahrungen in der Schule und im Alltag zurückgreifen.
                        </p>
                        <textarea
                          ref={situationDescriptionStep4Ref}
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
                            stepFourErrors.situationDescription
                              ? "border-destructive"
                              : "border-border focus:border-ring",
                          )}
                        />
                        {stepFourErrors.situationDescription ? (
                          <p className="text-xs text-destructive">
                            {stepFourErrors.situationDescription}
                          </p>
                        ) : null}
                      </div>

                      <div
                        id={reviewWorkspaceAnchorId("duration")}
                        className="scroll-mt-4 space-y-2"
                      >
                        <p className="text-sm font-medium text-foreground">
                          Gültigkeitsdauer des beantragten Nachteilsausgleiches
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Ihr Nachteilsausgleich kann für ein einzelnes Semester oder für die
                          gesamte Studienzeit beantragt werden.
                        </p>
                        <div className="space-y-2">
                          {(
                            [
                              {
                                value: "full_study",
                                title: "Gesamte Studiendauer",
                                description:
                                  "Für dauerhafte oder chronische Beeinträchtigungen",
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
                              className="flex items-start gap-3 rounded-[10px] border border-border px-3 py-3"
                            >
                              <input
                                type="radio"
                                name="application-duration"
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
                                <span className="block text-sm text-foreground">
                                  {option.title}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  {option.description}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                        {stepFourErrors.duration ? (
                          <p className="text-xs text-destructive">{stepFourErrors.duration}</p>
                        ) : null}
                      </div>

                      <div
                        id={reviewWorkspaceAnchorId("scope")}
                        className="scroll-mt-4 space-y-2"
                      >
                        <p className="text-sm font-medium text-foreground">
                          Geltungsbereich des beantragten Nachteilsausgleiches
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Wählen Sie aus, für welche Arten von Leistungsnachweisen der
                          Nachteilsausgleich gelten soll.
                        </p>
                        <div className="space-y-2">
                          {APPLICATION_SCOPE_OPTIONS.map((option) => (
                            <label key={option} className="flex items-center gap-3 text-sm">
                              <input
                                type="checkbox"
                                checked={applicationFormData.scopeSelections.includes(option)}
                                onChange={(event) =>
                                  setApplicationFormData((previous) => ({
                                    ...previous,
                                    scopeSelections: event.target.checked
                                      ? [...previous.scopeSelections, option]
                                      : previous.scopeSelections.filter(
                                          (entry) => entry !== option,
                                        ),
                                  }))
                                }
                                className="size-4 accent-primary"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                        {stepFourErrors.scopeSelections ? (
                          <p className="text-xs text-destructive">
                            {stepFourErrors.scopeSelections}
                          </p>
                        ) : null}
                      </div>

                      <div
                        id={reviewWorkspaceAnchorId("lectureMeasures")}
                        className="scroll-mt-4 space-y-2"
                      >
                        <p className="text-sm font-medium text-foreground">
                          Ausgleichsmassnahme für Lehrveranstaltungen
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Wählen Sie die Massnahmen aus, die Sie während Lehrveranstaltungen
                          benötigen.
                        </p>
                        <div className="max-w-[330px] space-y-2">
                          {APPLICATION_MEASURE_OPTIONS.map((option) => (
                            <label key={option.key} className="flex items-center gap-3 text-sm">
                              <input
                                type="checkbox"
                                checked={applicationFormData.lectureMeasures.includes(option.key)}
                                onChange={(event) =>
                                  setApplicationFormData((previous) => ({
                                    ...previous,
                                    lectureMeasures: event.target.checked
                                      ? [...previous.lectureMeasures, option.key]
                                      : previous.lectureMeasures.filter(
                                          (entry) => entry !== option.key,
                                        ),
                                  }))
                                }
                                className="size-4 accent-primary"
                              />
                              <span>{option.label}</span>
                            </label>
                          ))}
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={applicationFormData.lectureOtherEnabled}
                              onChange={(event) =>
                                setApplicationFormData((previous) => ({
                                  ...previous,
                                  lectureOtherEnabled: event.target.checked,
                                }))
                              }
                              className="size-4 accent-primary"
                            />
                            <Input
                              value={applicationFormData.lectureOtherText}
                              onChange={(event) =>
                                setApplicationFormData((previous) => ({
                                  ...previous,
                                  lectureOtherText: event.target.value,
                                }))
                              }
                              placeholder="Sonstige ..."
                              disabled={!applicationFormData.lectureOtherEnabled}
                              className={cn(
                                "h-8",
                                stepFourErrors.lectureOtherText && "border-destructive",
                              )}
                            />
                          </div>
                        </div>
                        {stepFourErrors.lectureMeasures ? (
                          <p className="text-xs text-destructive">
                            {stepFourErrors.lectureMeasures}
                          </p>
                        ) : null}
                        {stepFourErrors.lectureOtherText ? (
                          <p className="text-xs text-destructive">
                            {stepFourErrors.lectureOtherText}
                          </p>
                        ) : null}
                      </div>

                      <div
                        id={reviewWorkspaceAnchorId("assessmentMeasures")}
                        className="scroll-mt-4 space-y-2"
                      >
                        <p className="text-sm font-medium text-foreground">
                          Ausgleichsmassnahme für Leistungsnachweise
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Wählen Sie die Massnahmen aus, die Sie bei Prüfungen und anderen
                          Leistungsnachweisen benötigen.
                        </p>
                        <div className="max-w-[330px] space-y-2">
                          {APPLICATION_MEASURE_OPTIONS.map((option) => (
                            <label key={option.key} className="flex items-center gap-3 text-sm">
                              <input
                                type="checkbox"
                                checked={applicationFormData.assessmentMeasures.includes(
                                  option.key,
                                )}
                                onChange={(event) =>
                                  setApplicationFormData((previous) => ({
                                    ...previous,
                                    assessmentMeasures: event.target.checked
                                      ? [...previous.assessmentMeasures, option.key]
                                      : previous.assessmentMeasures.filter(
                                          (entry) => entry !== option.key,
                                        ),
                                  }))
                                }
                                className="size-4 accent-primary"
                              />
                              <span>{option.label}</span>
                            </label>
                          ))}
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={applicationFormData.assessmentOtherEnabled}
                              onChange={(event) =>
                                setApplicationFormData((previous) => ({
                                  ...previous,
                                  assessmentOtherEnabled: event.target.checked,
                                }))
                              }
                              className="size-4 accent-primary"
                            />
                            <Input
                              value={applicationFormData.assessmentOtherText}
                              onChange={(event) =>
                                setApplicationFormData((previous) => ({
                                  ...previous,
                                  assessmentOtherText: event.target.value,
                                }))
                              }
                              placeholder="Sonstige ..."
                              disabled={!applicationFormData.assessmentOtherEnabled}
                              className={cn(
                                "h-8",
                                stepFourErrors.assessmentOtherText && "border-destructive",
                              )}
                            />
                          </div>
                        </div>
                        {stepFourErrors.assessmentMeasures ? (
                          <p className="text-xs text-destructive">
                            {stepFourErrors.assessmentMeasures}
                          </p>
                        ) : null}
                        {stepFourErrors.assessmentOtherText ? (
                          <p className="text-xs text-destructive">
                            {stepFourErrors.assessmentOtherText}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : currentStep === "step6_submitted" ? (
                  <div className="mx-auto w-full max-w-[620px] space-y-8 py-10 text-center">
                    <CircleCheck className="mx-auto size-12 text-teal-600" />
                    <div className="space-y-2">
                      <CardTitle className="text-lg font-medium leading-[27px] text-foreground">
                        Antrag erfolgreich eingereicht
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Ihr Antrag wurde übermittelt und befindet sich jetzt im Status In Review.
                      </p>
                    </div>
                    <div className="mx-auto w-full max-w-[544px] rounded-lg bg-blue-100 px-4 py-3 text-sm">
                      <div className="flex items-start gap-2 text-left">
                        <Info className="mt-0.5 size-4 shrink-0" />
                        <p>
                          Sie werden benachrichtigt, sobald die Fachstelle Ihren Antrag
                          bearbeitet hat.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="min-h-9 px-4"
                      onClick={() => {
                        window.location.href = "/portal/home";
                      }}
                    >
                      Zum Dashboard
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <CardTitle className="text-lg font-medium leading-[27px] text-foreground">
                      Antrag auf Nachteilsausgleich (NTA)
                    </CardTitle>

                    <div className="space-y-6">
                      <p className="text-lg font-medium text-foreground">Persönliche Angaben</p>
                      <div className="grid gap-6 lg:grid-cols-2 lg:gap-x-[29px]">
                        {(
                          [
                            { label: "Vorname", value: formData.vorname },
                            { label: "Name", value: formData.name },
                            { label: "Email", value: formData.email },
                            { label: "Telefonnummer", value: formData.phone },
                          ] as const
                        ).map((item) => (
                          <div key={item.label} className="flex flex-col gap-1">
                            <Label>{item.label}</Label>
                            <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                              <span className="text-sm text-muted-foreground">{item.value}</span>
                              <Lock className="size-4 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <p className="text-lg font-medium text-foreground">Angaben zum Studium</p>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                          <Label>Matrikelnummer</Label>
                          <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                            <span className="text-sm text-muted-foreground">
                              {formData.matrikel}
                            </span>
                            <Lock className="size-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label>Welches Semester besuchen Sie</Label>
                          <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                            <span className="text-sm text-muted-foreground">
                              {formData.studiengang}
                            </span>
                            <Lock className="size-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex max-w-[320px] flex-col gap-1">
                          <Label>Welches Semester besuchen Sie</Label>
                          <div className="flex min-h-9 items-center justify-between rounded-lg border border-border bg-background px-3 py-2 opacity-70 shadow-xs">
                            <span className="text-sm text-muted-foreground">
                              {formData.semester ? `${formData.semester}. Semester` : ""}
                            </span>
                            <Lock className="size-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-lg font-medium text-foreground">Antragsart</p>
                      <div className="space-y-2">
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
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-lg font-medium text-foreground">Fachärztliches Attest</p>
                      <p className="text-sm text-muted-foreground">
                        Laden Sie Ihr fachärztliches Attest im ICF-Format hoch. Es muss Diagnose,
                        Auswirkungen auf studienrelevante Aktivitäten sowie empfohlene
                        Massnahmen enthalten.
                      </p>
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
                            appendFiles(event.dataTransfer.files);
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
                            Hier platzieren Sie das fachärztliche Attest
                          </p>
                          <input
                            ref={overviewFileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(event) => appendFiles(event.target.files)}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Empfohlene max. Grösse: 10 MB, file types: PDF & DOCX
                        </p>
                        {step2InvalidInOverview ? (
                          <p className="text-xs text-destructive">
                            Bitte laden Sie mindestens ein Attest hoch (obligatorisch).
                          </p>
                        ) : null}
                      </div>
                      {formData.attestFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-4 rounded-lg bg-secondary px-4 py-4"
                        >
                          <FileText className="size-5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {file.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((previous) => ({
                                ...previous,
                                attestFiles: previous.attestFiles.filter(
                                  (item) => item.id !== file.id,
                                ),
                              }))
                            }
                            className="rounded-md p-2 text-destructive/80 transition hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`${file.name} löschen`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      {releasedRecommendationHtml ? (
                        <RecommendationReleasedAccordion
                          variant="plain"
                          html={releasedRecommendationHtml}
                          releasedAt={
                            application?.data?.recommendation?.releasedAt
                          }
                          authorDisplayName={releasedRecommendationAuthor}
                        />
                      ) : (
                        <>
                          <p className="text-lg font-medium text-foreground">
                            Empfehlungsschreiben der Fachstelle
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Die Fachstelle hat noch kein Empfehlungsschreiben
                            freigegeben.
                          </p>
                        </>
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="text-lg font-medium text-foreground">Antragsdefinition</p>
                      <p className="text-sm font-medium text-foreground">
                        Beschreibung der gesundheitlichen Situation und Nachteile
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Beschreiben Sie Ihre gesundheitliche Situation und die
                        behinderungsbedingten Nachteile auf studienrelevante Aktivitäten und
                        Leistungsnachweise.
                      </p>
                      <textarea
                        ref={situationDescriptionOverviewRef}
                        value={applicationFormData.situationDescription}
                        onChange={(event) =>
                          setApplicationFormData((previous) => ({
                            ...previous,
                            situationDescription: event.target.value,
                          }))
                        }
                        rows={1}
                        className={cn(
                          "min-h-[120px] w-full resize-none overflow-hidden rounded-lg border bg-background px-3 py-2 text-sm shadow-xs outline-none focus:border-ring",
                          overviewSituationInvalid ? "border-destructive" : "border-border",
                        )}
                      />
                      {overviewSituationInvalid ? (
                        <p className="text-xs text-destructive">Dieses Feld ist erforderlich.</p>
                      ) : null}

                      <div className="space-y-2 pt-1">
                        <p className="text-sm font-medium text-foreground">
                          Gültigkeitsdauer des beantragten Nachteilsausgleiches
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Ihr Nachteilsausgleich kann für ein einzelnes Semester oder für die
                          gesamte Studienzeit beantragt werden.
                        </p>
                        <div
                          className={cn(
                            "space-y-2 rounded-lg",
                            overviewDurationInvalid && "border border-destructive p-2",
                          )}
                        >
                          {(
                            [
                              {
                                value: "full_study",
                                title: "Gesamte Studiendauer",
                                description:
                                  "Für dauerhafte oder chronische Beeinträchtigungen",
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
                              className="flex items-start gap-3 rounded-[10px] border border-border px-3 py-3"
                            >
                              <input
                                type="radio"
                                name="overview-application-duration"
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
                                <span className="block text-sm text-foreground">
                                  {option.title}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  {option.description}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                        {overviewDurationInvalid ? (
                          <p className="text-xs text-destructive">
                            Bitte wählen Sie eine Option aus.
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-2 pt-1">
                        <p className="text-sm font-medium text-foreground">
                          Geltungsbereich des beantragten Nachteilsausgleiches
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Wählen Sie aus, für welche Arten von Leistungsnachweisen der
                          Nachteilsausgleich gelten soll.
                        </p>
                        <div
                          className={cn(
                            "space-y-2 rounded-lg",
                            overviewScopeInvalid && "border border-destructive p-2",
                          )}
                        >
                          {APPLICATION_SCOPE_OPTIONS.map((option) => (
                            <label key={option} className="flex items-center gap-3 text-sm">
                              <input
                                type="checkbox"
                                checked={applicationFormData.scopeSelections.includes(option)}
                                onChange={(event) =>
                                  setApplicationFormData((previous) => ({
                                    ...previous,
                                    scopeSelections: event.target.checked
                                      ? [...previous.scopeSelections, option]
                                      : previous.scopeSelections.filter(
                                          (entry) => entry !== option,
                                        ),
                                  }))
                                }
                                className="size-4 accent-primary"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                        {overviewScopeInvalid ? (
                          <p className="text-xs text-destructive">
                            Bitte wählen Sie mindestens eine Option aus.
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-2 pt-1">
                        <p className="text-sm font-medium text-foreground">
                          Ausgleichsmassnahme für Lehrveranstaltungen
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Wählen Sie die Massnahmen aus, die Sie während Lehrveranstaltungen
                          benötigen.
                        </p>
                        <div
                          className={cn(
                            "max-w-[330px] space-y-2 rounded-lg",
                            (overviewLectureSelectionInvalid ||
                              overviewLectureOtherTextInvalid) &&
                              "border border-destructive p-2",
                          )}
                        >
                          {APPLICATION_MEASURE_OPTIONS.map((option) => (
                            <label key={option.key} className="flex items-center gap-3 text-sm">
                              <input
                                type="checkbox"
                                checked={applicationFormData.lectureMeasures.includes(option.key)}
                                onChange={(event) =>
                                  setApplicationFormData((previous) => ({
                                    ...previous,
                                    lectureMeasures: event.target.checked
                                      ? [...previous.lectureMeasures, option.key]
                                      : previous.lectureMeasures.filter(
                                          (entry) => entry !== option.key,
                                        ),
                                  }))
                                }
                                className="size-4 accent-primary"
                              />
                              <span>{option.label}</span>
                            </label>
                          ))}
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={applicationFormData.lectureOtherEnabled}
                              onChange={(event) =>
                                setApplicationFormData((previous) => ({
                                  ...previous,
                                  lectureOtherEnabled: event.target.checked,
                                }))
                              }
                              className="size-4 accent-primary"
                            />
                            <Input
                              value={applicationFormData.lectureOtherText}
                              onChange={(event) =>
                                setApplicationFormData((previous) => ({
                                  ...previous,
                                  lectureOtherText: event.target.value,
                                }))
                              }
                              placeholder="Sonstige ..."
                              disabled={!applicationFormData.lectureOtherEnabled}
                              className={cn(
                                "h-8",
                                overviewLectureOtherTextInvalid && "border-destructive",
                              )}
                            />
                          </div>
                        </div>
                        {overviewLectureSelectionInvalid ? (
                          <p className="text-xs text-destructive">
                            Bitte wählen Sie mindestens eine Option aus.
                          </p>
                        ) : null}
                        {overviewLectureOtherTextInvalid ? (
                          <p className="text-xs text-destructive">
                            Bitte spezifizieren Sie die sonstige Massnahme.
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-2 pt-1">
                        <p className="text-sm font-medium text-foreground">
                          Ausgleichsmassnahme für Leistungsnachweise
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Wählen Sie die Massnahmen aus, die Sie bei Prüfungen und anderen
                          Leistungsnachweisen benötigen.
                        </p>
                        <div
                          className={cn(
                            "max-w-[330px] space-y-2 rounded-lg",
                            (overviewAssessmentSelectionInvalid ||
                              overviewAssessmentOtherTextInvalid) &&
                              "border border-destructive p-2",
                          )}
                        >
                          {APPLICATION_MEASURE_OPTIONS.map((option) => (
                            <label key={option.key} className="flex items-center gap-3 text-sm">
                              <input
                                type="checkbox"
                                checked={applicationFormData.assessmentMeasures.includes(
                                  option.key,
                                )}
                                onChange={(event) =>
                                  setApplicationFormData((previous) => ({
                                    ...previous,
                                    assessmentMeasures: event.target.checked
                                      ? [...previous.assessmentMeasures, option.key]
                                      : previous.assessmentMeasures.filter(
                                          (entry) => entry !== option.key,
                                        ),
                                  }))
                                }
                                className="size-4 accent-primary"
                              />
                              <span>{option.label}</span>
                            </label>
                          ))}
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={applicationFormData.assessmentOtherEnabled}
                              onChange={(event) =>
                                setApplicationFormData((previous) => ({
                                  ...previous,
                                  assessmentOtherEnabled: event.target.checked,
                                }))
                              }
                              className="size-4 accent-primary"
                            />
                            <Input
                              value={applicationFormData.assessmentOtherText}
                              onChange={(event) =>
                                setApplicationFormData((previous) => ({
                                  ...previous,
                                  assessmentOtherText: event.target.value,
                                }))
                              }
                              placeholder="Sonstige ..."
                              disabled={!applicationFormData.assessmentOtherEnabled}
                              className={cn(
                                "h-8",
                                overviewAssessmentOtherTextInvalid && "border-destructive",
                              )}
                            />
                          </div>
                        </div>
                        {overviewAssessmentSelectionInvalid ? (
                          <p className="text-xs text-destructive">
                            Bitte wählen Sie mindestens eine Option aus.
                          </p>
                        ) : null}
                        {overviewAssessmentOtherTextInvalid ? (
                          <p className="text-xs text-destructive">
                            Bitte spezifizieren Sie die sonstige Massnahme.
                          </p>
                        ) : null}
                      </div>
                    </div>

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
                  </div>
                )}

                {currentStep !== "step3_booked" && currentStep !== "step6_submitted" ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteApplicationDialogOpen(true)}
                        disabled={isDeletingApplication}
                        className="rounded-md p-2 text-destructive/70 transition hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Antrag löschen"
                      >
                        <Trash2 className="size-4" />
                      </button>
                      {currentStep === "step2" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 px-4"
                          onClick={() => setCurrentStep("step1")}
                        >
                          Zurück
                        </Button>
                      ) : currentStep === "step3_booking" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 px-4"
                          onClick={() => setCurrentStep("step2")}
                        >
                          Zurück
                        </Button>
                      ) : currentStep === "step3_recommendation" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 px-4"
                          onClick={() => setCurrentStep("step3_booked")}
                        >
                          Zurück
                        </Button>
                      ) : currentStep === "step4_application" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 px-4"
                          onClick={() => setCurrentStep("step3_recommendation")}
                        >
                          Zurück
                        </Button>
                      ) : currentStep === "step5_overview" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 px-4"
                          onClick={() => setCurrentStep("step4_application")}
                        >
                          Zurück
                        </Button>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-muted-foreground">
                        Autosave aktiv: Entwurf wird laufend gespeichert.
                      </p>
                      {currentStep === "step3_booking" ? (
                        <Button
                          type="button"
                          className="min-h-9 px-4"
                          onClick={handleBookConsultation}
                          disabled={pendingBooking}
                        >
                          {pendingBooking ? "Termin wird gebucht..." : "Termin buchen"}
                        </Button>
                      ) : currentStep === "step4_application" ? (
                        <Button type="submit" className="min-h-9 px-4">
                          Übersicht
                        </Button>
                      ) : currentStep === "step5_overview" ? (
                        <Button type="submit" className="min-h-9 px-4">
                          Ausgleich beantragen
                        </Button>
                      ) : (
                        <Button type="submit" className="min-h-9 px-4">
                          Weiter
                        </Button>
                      )}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </form>
        </main>
        {showCorrectionSidebar && workspaceApplicationForSidebar && statusMetaForCorrection ? (
          <aside className="col-span-12 hidden h-screen flex-col overflow-y-auto border-l border-border bg-sidebar p-6 lg:col-span-3 lg:flex">
            <ApplicationReviewDetailSidebar
              application={workspaceApplicationForSidebar}
              statusMeta={statusMetaForCorrection}
              assignedReviewerLabel="Fachstelle NTA"
              adjustmentComposer={null}
              savedReviewComments={savedReviewCommentsForSidebar}
              onSavedCommentNavigate={navigateFromSavedComment}
            />
          </aside>
        ) : null}
      </div>

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
              disabled={isDeletingApplication}
              onClick={() => setDeleteApplicationDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingApplication}
              onClick={() => void performDeleteApplication()}
            >
              {isDeletingApplication ? "Wird gelöscht…" : "Löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
