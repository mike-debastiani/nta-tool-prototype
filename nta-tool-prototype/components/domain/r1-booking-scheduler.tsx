"use client";

import {
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"] as const;

export type BookingCalendarDay = {
  key: string;
  date: Date;
  isCurrentMonth: boolean;
};

function formatBookingMonthParts(date: Date) {
  const month = date.toLocaleDateString("de-CH", { month: "long" });
  return {
    month: month.charAt(0).toUpperCase() + month.slice(1),
    year: String(date.getFullYear()),
  };
}

function formatSelectedDayHeading(date: Date) {
  const weekday = date.toLocaleDateString("de-CH", { weekday: "long" });
  const shortDate = date.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  return { weekday: `${weekday}, `, shortDate };
}

function formatTermindetailDateLines(date: Date, timeLabel: string) {
  const weekdayRaw = date.toLocaleDateString("de-CH", { weekday: "long" });
  const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
  const dateLine = date.toLocaleDateString("de-CH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return {
    weekday,
    dateLine,
    timeLine: timeLabel,
  };
}

function isSameCalendarDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Prototyp: buchbare Tage im Monat (HF-Mock). */
function isBookableDay(date: Date) {
  const today = startOfDay(new Date());
  if (startOfDay(date) < today) return false;
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  return true;
}

function isDisabledDay(date: Date) {
  return !isBookableDay(date);
}

function dayShowsMarker(date: Date, markerDate: Date | null) {
  if (!markerDate) return false;
  return isSameCalendarDay(date, markerDate);
}

export type R1FlowBookingSchedulerProps = {
  displayedMonth: Date;
  onDisplayedMonthChange: (month: Date) => void;
  selectedBookingDate: Date;
  onSelectedBookingDateChange: (date: Date) => void;
  selectedBookingSlot: string;
  onSelectedBookingSlotChange: (slot: string) => void;
  slots: readonly string[];
  calendarDays: BookingCalendarDay[];
  bookingTimeLabel: string;
  locationLines: string[];
  advisorName?: string;
  markerDate?: Date | null;
  error?: string | null;
};

/** Beratung buchen — Kalender + Slots (Figma 5307:7575). */
export function R1FlowBookingScheduler({
  displayedMonth,
  onDisplayedMonthChange,
  selectedBookingDate,
  onSelectedBookingDateChange,
  selectedBookingSlot,
  onSelectedBookingSlotChange,
  slots,
  calendarDays,
  bookingTimeLabel,
  locationLines,
  advisorName = "Frau Dr. Suzanne Beispiel",
  markerDate = null,
  error,
}: R1FlowBookingSchedulerProps) {
  const { month: monthLabel, year: yearLabel } = formatBookingMonthParts(displayedMonth);
  const selectedDayHeading = formatSelectedDayHeading(selectedBookingDate);
  const termindetailDateLines = formatTermindetailDateLines(
    selectedBookingDate,
    bookingTimeLabel,
  );

  return (
    <div className="flex w-full flex-col gap-10" data-node-id="5307:7575">
      <div className="flex w-full flex-col gap-3">
        <h2 className="text-hf-paragraph-large-medium text-stone-900">Beratung buchen</h2>
        <p className="text-hf-paragraph-small text-muted-foreground">
          Wählen sie einen freien Termin, um das obligatorische Beratungsgespräch
          wahrzunehmen.
        </p>
      </div>

      <div className="flex w-full flex-col gap-8">
        <div className="flex w-full flex-col items-start justify-between gap-8 lg:flex-row lg:gap-[128px]">
          <div className="w-full min-w-0 flex-1 lg:max-w-[524px]" data-node-id="5307:7584">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-hf-paragraph-small-medium text-stone-900">
                {monthLabel}{" "}
                <span className="font-normal text-muted-foreground">{yearLabel}</span>
              </p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="flex size-8 min-h-8 min-w-8 items-center justify-center rounded-full p-2 text-stone-900 transition-colors hover:bg-stone-100"
                  onClick={() =>
                    onDisplayedMonthChange(
                      new Date(
                        displayedMonth.getFullYear(),
                        displayedMonth.getMonth() - 1,
                        1,
                      ),
                    )
                  }
                  aria-label="Vorheriger Monat"
                >
                  <ArrowLeft className="size-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="flex size-8 min-h-8 min-w-8 items-center justify-center rounded-full p-2 text-stone-900 transition-colors hover:bg-stone-100"
                  onClick={() =>
                    onDisplayedMonthChange(
                      new Date(
                        displayedMonth.getFullYear(),
                        displayedMonth.getMonth() + 1,
                        1,
                      ),
                    )
                  }
                  aria-label="Nächster Monat"
                >
                  <ArrowRight className="size-4" strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-7 gap-2">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="flex h-8 items-center justify-center text-hf-paragraph-small-medium text-muted-foreground"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((entry) => {
                  const isSelected = isSameCalendarDay(entry.date, selectedBookingDate);
                  const isBookable = isBookableDay(entry.date);
                  const isDisabled = isDisabledDay(entry.date);
                  const showMarker = dayShowsMarker(entry.date, markerDate);

                  return (
                    <button
                      key={entry.key}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        onSelectedBookingDateChange(entry.date);
                        if (!entry.isCurrentMonth) {
                          onDisplayedMonthChange(
                            new Date(entry.date.getFullYear(), entry.date.getMonth(), 1),
                          );
                        }
                      }}
                      className={cn(
                        "relative flex aspect-square size-full min-h-8 w-full items-center justify-center rounded-xl p-2 text-hf-paragraph-small transition-colors",
                        isSelected &&
                          "bg-stone-900 text-stone-50 hover:bg-stone-900",
                        !isSelected && isBookable && "bg-stone-100 text-stone-900 hover:bg-stone-150",
                        !isSelected &&
                          !isBookable &&
                          entry.isCurrentMonth &&
                          !isDisabled &&
                          "bg-background text-stone-900 hover:bg-stone-50",
                        !entry.isCurrentMonth && "opacity-40",
                        isDisabled && "opacity-50",
                      )}
                    >
                      {entry.date.getDate()}
                      {showMarker ? (
                        <span
                          className={cn(
                            "absolute bottom-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full",
                            isSelected ? "bg-stone-50" : "bg-stone-900",
                          )}
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className="flex w-full shrink-0 flex-col justify-center gap-6 lg:w-[180px]"
            data-node-id="5307:7641"
          >
            <p className="text-hf-paragraph-small-medium text-stone-900">
              {selectedDayHeading.weekday}
              <span className="font-normal text-muted-foreground">
                {selectedDayHeading.shortDate}
              </span>
            </p>
            <div className="flex flex-col gap-2">
              {slots.map((slot) => {
                const isSelected = selectedBookingSlot === slot;
                const displaySlot = slot.replace(" - ", " – ");
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => onSelectedBookingSlotChange(slot)}
                    className={cn(
                      "w-full rounded-lg transition-colors",
                      isSelected
                        ? "bg-stone-100 p-0"
                        : "bg-stone-100 hover:bg-stone-150",
                    )}
                  >
                    <span
                      className={cn(
                        "flex w-full items-center justify-center px-2 py-2 text-hf-paragraph-small",
                        isSelected
                          ? "rounded-lg bg-stone-900 text-stone-50"
                          : "text-stone-900",
                      )}
                    >
                      {displaySlot}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="flex w-full flex-col items-start gap-4 rounded-xl bg-stone-100 p-6"
          data-node-id="6101:22544"
        >
          <p className="text-hf-paragraph-large-medium text-stone-900">Termindetails</p>
          <div className="flex w-full flex-col items-start justify-between gap-6 lg:flex-row lg:gap-8">
            <div className="flex min-w-0 flex-col items-start">
              <p className="text-hf-paragraph-mini text-muted-foreground">Datum</p>
              <div className="text-hf-paragraph-small-medium text-stone-900">
                <p>{termindetailDateLines.weekday}</p>
                <p>{termindetailDateLines.dateLine}</p>
                <p>{termindetailDateLines.timeLine}</p>
              </div>
            </div>
            <div className="flex min-w-0 flex-col items-start">
              <p className="text-hf-paragraph-mini text-muted-foreground">Ort</p>
              <div className="text-hf-paragraph-small-medium text-stone-900">
                {locationLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
            <div className="flex min-w-0 flex-col items-start">
              <p className="text-hf-paragraph-mini text-muted-foreground">Beratende Person</p>
              <div className="text-hf-paragraph-small-medium text-stone-900">
                <p>{advisorName}</p>
                <p>Fachstelle Studium und Behinderung</p>
                <p>Universität Zürich</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-hf-paragraph-small text-stone-900">
        Indem Sie fortfahren, stimmen Sie den{" "}
        <a
          href="https://www.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-2"
        >
          Nutzungsbedingungen
        </a>{" "}
        und der{" "}
        <a
          href="https://www.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-2"
        >
          Datenschutzerklärung
        </a>{" "}
        zu.
      </p>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
