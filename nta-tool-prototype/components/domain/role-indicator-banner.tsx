"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { ArrowLeftRight } from "lucide-react";

import type { UserRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

type RoleIndicatorBannerProps = {
  role: UserRole | null;
};

type RoleVisual = {
  /** Kurzform der Rolle, z. B. «R1». */
  code: string;
  /** Sprechender Rollenname für die Demo-Ausstellung. */
  label: string;
  /** Tailwind bg/text Klassen für die Farbkodierung. */
  surfaceClass: string;
};

/** Neutrale Graustufe für Mischrollen, ungesetzte/unbekannte Rollen und «nicht angemeldet». */
const NEUTRAL_SURFACE_CLASS = "bg-stone-100 text-stone-700";

const ROLE_VISUALS: Record<UserRole, RoleVisual> = {
  // R1 — Studierende:r → bewilligt-50 / bewilligt-800
  R1: {
    code: "R1",
    label: "Studierende:r",
    surfaceClass: "bg-bewilligt-100 text-bewilligt-800",
  },
  // R2 — Fachstelle → gleiche Kodierung wie Status-Pill «In Review» (#E0F2FE / #1565C0)
  R2: {
    code: "R2",
    label: "Fachstelle",
    surfaceClass: "bg-beratung-100 text-beratung-800",
  },
  // R3 — Workspace-Rolle (keine eigene Kodierung) → neutral
  R3: {
    code: "R3",
    label: "Workspace-Rolle",
    surfaceClass: NEUTRAL_SURFACE_CLASS,
  },
  // R4 — Entscheidungsinstanz → entscheidung-50 / entscheidung-800
  R4: {
    code: "R4",
    label: "Entscheidungsinstanz",
    surfaceClass: "bg-in-decision-100 text-in-decision-800",
  },
  // R2R4 — Mischrolle (keine eigene Kodierung) → neutral
  R2R4: {
    code: "R2R4",
    label: "Fachstelle & Entscheidungsinstanz",
    surfaceClass: NEUTRAL_SURFACE_CLASS,
  },
  // R5 / R6 — keine eigene Kodierung → neutral
  R5: {
    code: "R5",
    label: "Prüfungsadministration",
    surfaceClass: NEUTRAL_SURFACE_CLASS,
  },
  R6: {
    code: "R6",
    label: "Modulverantwortliche",
    surfaceClass: NEUTRAL_SURFACE_CLASS,
  },
};

const NOT_SIGNED_IN_VISUAL: RoleVisual = {
  code: "—",
  label: "Nicht angemeldet",
  surfaceClass: NEUTRAL_SURFACE_CLASS,
};

const STORAGE_KEY = "nta-role-banner-open";
const STORE_EVENT = "nta-role-banner-change";
const HEIGHT_VAR = "--role-banner-height";

/**
 * Kleiner externer Store über `localStorage`, gelesen via `useSyncExternalStore`.
 * Vorteile: kein Hydration-Mismatch (Server-Snapshot = geschlossen) und keine
 * `setState`-Aufrufe innerhalb von Effekten.
 */
function subscribeToOpenState(callback: () => void) {
  window.addEventListener(STORE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(STORE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getOpenSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerOpenSnapshot(): boolean {
  return false;
}

function setOpenState(next: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Persistenz ist optional.
  }
  window.dispatchEvent(new Event(STORE_EVENT));
}

/**
 * Globale Rollen-Anzeige für die Ausstellung an einem einzelnen Gerät.
 *
 * - Ein-/Ausblenden über `Ctrl + Alt + R` (selber Command schliesst wieder).
 *   Diese Kombination hat weder im Browser noch in macOS eine Standardfunktion;
 *   `Ctrl + Pfeiltaste` bleibt bewusst frei für den macOS-Desktop-Wechsel.
 * - Der Banner sitzt als normaler Block oberhalb des regulären Layouts und
 *   schiebt den restlichen Inhalt nach unten: Seine gemessene Höhe wird als
 *   CSS-Variable `--role-banner-height` gesetzt, die in `globals.css` von den
 *   `h-screen`/`min-h-screen`-Wurzeln abgezogen wird. Das Core-Layout bleibt
 *   dadurch unverändert.
 */
export function RoleIndicatorBanner({ role }: RoleIndicatorBannerProps) {
  const open = useSyncExternalStore(
    subscribeToOpenState,
    getOpenSnapshot,
    getServerOpenSnapshot,
  );
  const bannerRef = useRef<HTMLDivElement | null>(null);

  const toggle = useCallback(() => {
    setOpenState(!getOpenSnapshot());
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // `event.code` ist layout-unabhängig (auf macOS verändert Alt das Zeichen).
      if (
        event.ctrlKey &&
        event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        event.code === "KeyR"
      ) {
        event.preventDefault();
        toggle();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  // Bannerhöhe als CSS-Variable spiegeln, damit `h-screen`-Layouts schrumpfen.
  useLayoutEffect(() => {
    const root = document.documentElement;

    if (!open) {
      root.style.setProperty(HEIGHT_VAR, "0px");
      return;
    }

    const node = bannerRef.current;
    if (!node) {
      return;
    }

    const applyHeight = () => {
      root.style.setProperty(HEIGHT_VAR, `${node.offsetHeight}px`);
    };

    applyHeight();

    const observer = new ResizeObserver(applyHeight);
    observer.observe(node);

    return () => {
      observer.disconnect();
      root.style.setProperty(HEIGHT_VAR, "0px");
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const visual = role ? ROLE_VISUALS[role] : NOT_SIGNED_IN_VISUAL;

  return (
    <div
      ref={bannerRef}
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-black/10 px-6 py-2.5 text-center",
        visual.surfaceClass,
      )}
    >
      <span className="text-sm font-semibold leading-5">
        Aktive Rolle: {visual.label}
        <span className="ml-1.5 font-medium opacity-70">({visual.code})</span>
      </span>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium leading-5 opacity-80">
        <ArrowLeftRight className="size-3.5" aria-hidden />
        Für eine andere Rolle den Desktop wechseln:
        <kbd className="rounded border border-black/10 bg-white/50 px-1.5 py-0.5 text-xs font-semibold">
          Control + Pfeiltaste
        </kbd>
      </span>
    </div>
  );
}
