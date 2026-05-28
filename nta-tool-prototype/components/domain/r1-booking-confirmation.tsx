"use client";

import Image from "next/image";
import { ArrowUpRight, CircleCheck, Info, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

const DEFAULT_ADVISOR_AVATAR_SRC = "/images/r1-booking/advisor-avatar.png";
const BOOKING_MAP_IMAGE_SRC = "/images/r1-booking/map-example.png";

/** Pin-Position auf dem Kartenbild (Universität Luzern / Bahnhof-Bereich). */
const MAP_PIN_POSITION = { left: "58%", top: "42%" } as const;

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
    <div className="relative size-[72px] shrink-0" aria-hidden>
      <div className="absolute inset-0 rounded-full bg-bewilligt-100" />
      <div className="absolute left-[14.4px] top-[14.4px] size-[43.2px] rounded-full bg-bewilligt-400" />
      <CircleCheck
        className="absolute left-[21.6px] top-[21.6px] size-[28.8px] text-white"
        strokeWidth={2}
      />
    </div>
  );
}

type R1FlowBookingMapProps = {
  mapsHref: string;
  mapImageSrc: string;
};

function R1FlowBookingMap({ mapsHref, mapImageSrc }: R1FlowBookingMapProps) {
  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden rounded-lg"
      data-node-id="5307:8242"
    >
      <Image
        src={mapImageSrc}
        alt="Karte des Beratungsstandorts"
        fill
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 343px"
      />
      <MapPin
        className="pointer-events-none absolute size-10 -translate-x-1/2 -translate-y-full text-stone-900"
        style={{
          left: MAP_PIN_POSITION.left,
          top: MAP_PIN_POSITION.top,
        }}
        strokeWidth={1.75}
        fill="currentColor"
        aria-hidden
      />
      <a
        href={mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="sr-only"
      >
        Karte in externer App öffnen
      </a>
    </div>
  );
}

export type R1FlowBookingConfirmationProps = {
  advisorName: string;
  advisorAvatarSrc?: string;
  /** z. B. «Montag, 27. Juni 2026» */
  appointmentDateLine: string;
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
  advisorAvatarSrc = DEFAULT_ADVISOR_AVATAR_SRC,
  appointmentDateLine,
  appointmentTimeLine,
  locationLines,
  mapsHref,
  mapImageSrc = BOOKING_MAP_IMAGE_SRC,
  onReschedule,
  onAddToCalendar,
  className,
}: R1FlowBookingConfirmationProps) {
  return (
    <div
      className={cn("flex w-full flex-col items-center gap-10", className)}
      data-node-id="5307:7907"
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

      <div
        className="flex w-full flex-col gap-4 rounded-lg bg-stone-100 p-3 lg:flex-row lg:items-stretch lg:justify-between lg:gap-6"
        data-node-id="5307:8232"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex items-center gap-4" data-node-id="5307:9055">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-stone-200">
              <Image
                src={advisorAvatarSrc}
                alt=""
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-hf-paragraph-regular text-muted-foreground">
                Beratende Person
              </p>
              <p className="text-hf-paragraph-medium text-foreground">{advisorName}</p>
            </div>
          </div>

          <div className="flex gap-4" data-node-id="5307:9063">
            <div className="size-10 shrink-0" aria-hidden />
            <div className="flex min-w-0 flex-col gap-4">
              <p className="text-hf-paragraph-small-medium text-stone-900">
                {appointmentDateLine}
                <br />
                {appointmentTimeLine}
              </p>
              <p className="text-hf-paragraph-small text-stone-900">
                {locationLines.map((line, index) => (
                  <span key={line}>
                    {line}
                    {index < locationLines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>

        <div
          className="flex min-h-[161px] w-full shrink-0 flex-col gap-2 self-stretch lg:w-[343px]"
          data-node-id="5307:8238"
        >
          <R1FlowBookingMap mapsHref={mapsHref} mapImageSrc={mapImageSrc} />
          <div className="flex shrink-0 justify-end">
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 py-0.5 text-hf-paragraph-mini-medium text-muted-foreground transition-colors hover:text-stone-900"
              data-node-id="5307:8939"
            >
              In Maps öffnen
              <ArrowUpRight className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            </a>
          </div>
        </div>
      </div>

      <div
        className="flex w-full flex-col items-center gap-5 px-10"
        data-node-id="5307:8254"
      >
        <div className="flex flex-col items-start" data-node-id="5307:8255">
          <div
            className="flex items-start justify-end gap-2 rounded-[10px]"
            data-node-id="I5307:8255;176:20953"
          >
            <button
              type="button"
              className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-background px-4 py-2 text-hf-paragraph-small-medium text-stone-900 transition-colors hover:bg-stone-50"
              onClick={onReschedule}
            >
              Termin verschieben
            </button>
            <button
              type="button"
              className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full bg-stone-900 px-4 py-2 text-hf-paragraph-small-medium text-stone-50 transition-colors hover:bg-stone-800"
              onClick={onAddToCalendar}
            >
              Zum Kalender hinzufügen
            </button>
          </div>
        </div>
        <p
          className="min-w-full text-center text-hf-paragraph-mini text-muted-foreground"
          data-node-id="5307:8268"
        >
          Terminverschiebungen müssen mindestens 24 Stunden im Voraus erfolgen. Bei
          Notfällen und Krankheit ist eine kurzfristige Absage an beispiel@hochschule.ch
          möglich.
        </p>
      </div>
    </div>
  );
}
