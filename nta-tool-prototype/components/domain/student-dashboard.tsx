"use client";

import { useEffect, useMemo, useState } from "react";

import { R1ApplicationCard } from "@/components/domain/r1-application-card";
import { R1ApplicationsTable } from "@/components/domain/r1-applications-table";
import {
  R1ApplicationsViewToggle,
  type R1ApplicationsViewMode,
} from "@/components/domain/r1-applications-view-toggle";
import { R1DashboardUtilityColumn } from "@/components/domain/r1-dashboard-utility-column";
import { R1InformationPanel } from "@/components/domain/r1-information-panel";
import { R1NewApplicationTile } from "@/components/domain/r1-new-application-tile";
import { hfTypography } from "@/lib/design-tokens/typography";
import { type ApplicationRow } from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

const VIEW_MODE_STORAGE_KEY = "r1-applications-view";

/** Karten-Grid: 2 Spalten, ab 1600px 3 Spalten — Figma Desktop. */
const R1_CARDS_GRID_CLASS =
  "grid w-full min-w-0 grid-cols-2 gap-6 min-[1600px]:grid-cols-3";

/** Gleiche Zellenhöhe wie Antragskarten (Figma 352px). */
const R1_CARD_GRID_ITEM_CLASS = "h-[352px] min-w-0 w-full";

type StudentDashboardProps = {
  applications: ApplicationRow[];
  applicantId: string;
  studentDisplayName: string;
};

function greetingName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "Studierende";
  const first = trimmed.split(/\s+/)[0];
  return first ?? trimmed;
}

function greetingPhrase(): string {
  const h = new Date().getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

function formatHomeDate(d: Date): string {
  return d.toLocaleDateString("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function readStoredViewMode(): R1ApplicationsViewMode {
  if (typeof window === "undefined") return "cards";
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return stored === "table" ? "table" : "cards";
}

/** Figma `5792:22019` / `5826:3088` — R1 «Meine Anträge». */
export function StudentDashboard({
  applications,
  applicantId,
  studentDisplayName,
}: StudentDashboardProps) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<ApplicationRow[]>(applications);
  const [viewMode, setViewMode] = useState<R1ApplicationsViewMode>("cards");

  useEffect(() => {
    setRows(applications);
  }, [applications]);

  useEffect(() => {
    setViewMode(readStoredViewMode());
  }, []);

  useEffect(() => {
    const tick = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      const { data, error } = await supabase
        .from("applications")
        .select("id,applicant_id,status,data,created_at,updated_at")
        .eq("applicant_id", applicantId)
        .order("updated_at", { ascending: false });
      if (error || !data) return;
      setRows(data as ApplicationRow[]);
    };

    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => window.clearInterval(id);
  }, [applicantId, supabase]);

  const handleViewModeChange = (mode: R1ApplicationsViewMode) => {
    setViewMode(mode);
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  };

  const name = greetingName(studentDisplayName);
  const phrase = greetingPhrase();
  const todayLabel = formatHomeDate(new Date());

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-col gap-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className={cn(hfTypography.h3, "text-foreground")}>
            {phrase} {name}
          </h1>
          <p className={cn(hfTypography.paragraphSmallMedium, "text-muted-foreground")}>
            {todayLabel}
          </p>
        </div>
        <R1ApplicationsViewToggle value={viewMode} onChange={handleViewModeChange} />
      </header>

      {viewMode === "cards" ? (
        <div className={R1_CARDS_GRID_CLASS}>
          {rows.map((application) => (
            <div key={application.id} className={R1_CARD_GRID_ITEM_CLASS}>
              <R1ApplicationCard application={application} className="h-full" />
            </div>
          ))}

          <R1DashboardUtilityColumn />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-stretch gap-6">
            <div className="min-w-[280px] flex-1">
              <R1NewApplicationTile layout="table" className="h-full" />
            </div>
            <div className="w-full max-w-[546px] shrink-0">
              <R1InformationPanel className="h-full" />
            </div>
          </div>
          <R1ApplicationsTable applications={rows} />
        </div>
      )}
    </div>
  );
}
