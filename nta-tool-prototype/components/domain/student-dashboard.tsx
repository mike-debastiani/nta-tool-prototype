"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationStatusBadge } from "@/components/domain/application-status-badge";
import { type ApplicationRow } from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/client";

type StudentDashboardProps = {
  applications: ApplicationRow[];
  /** Used to poll the applicant's rows so status badges update without reload. */
  applicantId: string;
};

export function StudentDashboard({ applications, applicantId }: StudentDashboardProps) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<ApplicationRow[]>(applications);

  useEffect(() => {
    setRows(applications);
  }, [applications]);

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Meine Anträge</CardTitle>
        <Button asChild>
          <Link href="/portal/antragserstellung?new=1" className="inline-flex items-center gap-2">
            <Plus className="size-4" />
            Neuen Antrag erstellen
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Anträge vorhanden.</p>
        ) : null}
        {rows.map((application) => (
          <Link
            key={application.id}
            href={`/portal/antragserstellung?applicationId=${application.id}`}
            className="block w-full rounded-md border p-3 text-left transition hover:bg-muted/30"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-1 text-sm font-medium">
                {application.data.title ?? "NTA Antrag"}
              </p>
              <ApplicationStatusBadge application={application} audience="R1" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Aktualisiert am {new Date(application.updated_at).toLocaleDateString("de-CH")}
            </p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
