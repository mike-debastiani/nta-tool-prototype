"use client";

import Image from "next/image";
import { ArrowUpRight, Check, Info, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

const BOOKING_MAP_IMAGE_SRC = "/images/r1-booking/uzh-location-map.png";

function R1FlowBookingInfoCallout() {
  return (
    <div
      className="w-full rounded-lg bg-in-review-50 px-4 py-3"
      data-node-id="5307:8135"
    >
      <div className="grid grid-cols-[1rem_1fr] gap-x-3 gap-y-0">
        <Info
          className="row-start-1 self-start pt-0.5 text-in-review-800"
          size={16}
          strokeWidth={2}
          aria-hidden
        />
        <p className="col-start-2 text-left text-hf-paragraph-small-medium text-in-review-800">
          Sie erhalten eine Bestätigung per E-Mail. Nach der Beratung werden die
          weiteren Schritte Ihres Antrags freigeschaltet.
        </p>
      </div>
    </div>
  );
}

function R1FlowBookingSuccessIcon() {
  return (
    <div className="flex size-[41px] items-center justify-center rounded-full bg-bewilligt-400" aria-hidden>
      <Check className="size-5 text-white" strokeWidth={2.5} />
    </div>
  );
}

export type R1FlowBookingConfirmationProps = {
  advisorName: string;
  /** z. B. «Dienstag» */
  appointmentWeekdayLine: string;
  /** z. B. «11. Juni» */
  appointmentDayLine: string;
  /** z. B. «10:00 – 11:00 Uhr» */
  appointmentTimeLine: string;
  locationLines: string[];
  mapsHref: string;
  mapImageSrc?: string;
  onReschedule?: () => void;
  onAddToCalendar?: () => void;
  className?: string;
};

/** Terminbestätigung nach Buchung (Figma 5307:7907). Liegt in `R1FlowFormCard`. */
export function R1FlowBookingConfirmation({
  advisorName,
  appointmentWeekdayLine,
  appointmentDayLine,
  appointmentTimeLine,
  locationLines,
  mapsHref,
  mapImageSrc = BOOKING_MAP_IMAGE_SRC,
  onReschedule,
  onAddToCalendar,
  className,
}: R1FlowBookingConfirmationProps) {
  const primaryLocationLine = locationLines[0] ?? "—";
  const remainingLocationLines = locationLines.slice(1);
  const initials = "SB";

  return (
    <div
      className={cn("flex w-full flex-col items-center gap-5", className)}
      data-node-id="6101:22681"
    >
      <div className="flex w-full flex-col items-center gap-3">
        <R1FlowBookingSuccessIcon />
        <div className="flex w-full flex-col gap-4">
          <h2 className="w-full text-center text-hf-paragraph-large-medium text-stone-900">
            Ihr Beratungsgespräch ist gebucht!
          </h2>
          <R1FlowBookingInfoCallout />
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        <div
          className="flex h-[350px] w-full items-end overflow-hidden rounded-xl border border-border bg-stone-50"
          data-node-id="6101:22832"
        >
          <div className="grid h-full w-full min-w-0 grid-cols-2">
            <div className="flex h-full min-w-0 flex-col gap-6 overflow-hidden bg-stone-50 p-6">
              <div className="flex flex-col gap-1">
                <p className="text-hf-paragraph-regular text-stone-900">{appointmentWeekdayLine}</p>
                <p className="text-[32px] leading-[38px] font-medium text-stone-900">
                  {appointmentDayLine}
                </p>
                <p className="text-hf-paragraph-small-medium text-stone-900">{appointmentTimeLine}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-hf-paragraph-small text-muted-foreground">Ort</p>
                <p className="text-hf-paragraph-small-medium text-stone-900">{primaryLocationLine}</p>
                <div className="text-hf-paragraph-small-medium text-stone-900">
                  {remainingLocationLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
              <div className="mt-auto flex items-center gap-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-stone-200 text-hf-paragraph-small-medium text-stone-700">
                  {initials}
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-hf-paragraph-small text-muted-foreground">
                    Beratende Person
                  </p>
                  <p className="text-hf-paragraph-medium text-foreground">{advisorName}</p>
                </div>
              </div>
            </div>
            <div className="relative min-h-0 min-w-0 overflow-hidden bg-stone-100">
              <Image
                src={mapImageSrc}
                alt="Karte des Beratungsstandorts"
                fill
                className="scale-[1.06] object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <MapPin
                className="pointer-events-none absolute left-[68%] top-[62%] size-8 -translate-x-1/2 -translate-y-full text-stone-900"
                strokeWidth={2}
                fill="currentColor"
                aria-hidden
              />
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-3 top-3 z-10 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-hf-paragraph-small-medium text-stone-50 transition-colors hover:bg-stone-800"
                data-node-id="6101:23688"
              >
                <ArrowUpRight className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                In Maps öffnen
              </a>
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex w-full flex-col items-center gap-5"
        data-node-id="6101:22886"
      >
          <div className="grid w-full grid-cols-2 gap-4">
          <button
            type="button"
            className="inline-flex h-9 w-full items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-hf-paragraph-small-medium text-stone-900 transition-colors hover:bg-stone-50"
            onClick={onReschedule}
          >
            Termin verschieben
          </button>
            <button
              type="button"
              className="inline-flex h-9 w-full items-center justify-center rounded-full bg-stone-900 px-4 py-2 text-hf-paragraph-small-medium text-stone-50 transition-colors hover:bg-stone-800"
              onClick={onAddToCalendar}
            >
              Zum Kalender hinzufügen
            </button>
        </div>
        <p
          className="w-full text-center text-hf-paragraph-mini text-muted-foreground"
          data-node-id="6101:23694"
        >
          Terminverschiebungen müssen mindestens 24 Stunden im Voraus erfolgen. Bei
          Notfällen und Krankheit ist eine kurzfristige Absage an beispiel@hochschule.ch
          möglich.
        </p>
      </div>
    </div>
  );
}
