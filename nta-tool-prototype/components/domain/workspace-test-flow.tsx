"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { getApplicationStatusMeta } from "@/lib/application-status";

type WorkspaceTestFlowProps = {
  userId: string;
  initialApplications: WorkspaceApplication[];
};

export function WorkspaceTestFlow({
  userId,
  initialApplications,
}: WorkspaceTestFlowProps) {
  const supabase = useMemo(() => createClient(), []);
  const [applications, setApplications] =
    useState<WorkspaceApplication[]>(initialApplications);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const formatFileSize = (sizeInBytes: number) => `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  const refreshApplications = useCallback(async () => {
    const { data } = await supabase
      .from("applications")
      .select(
        "id,applicant_id,status,updated_at,data,users!applications_applicant_id_fkey(display_name,email)",
      )
      .order("updated_at", { ascending: false });

    if (data) {
      const nextApplications = data as WorkspaceApplication[];
      setApplications(nextApplications);
    }
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`workspace-app-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
        },
        () => {
          void refreshApplications();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshApplications, supabase, userId]);

  async function markConsultationDone(applicationId: string) {
    setPendingId(applicationId);
    setMessage(null);

    const target = applications.find((a) => a.id === applicationId);
    if (!target) {
      setPendingId(null);
      return;
    }

    const { error } = await supabase
      .from("applications")
      .update({
        data: {
          ...target.data,
          consultation: {
            ...target.data.consultation,
            status: "done",
          },
          recommendation: {
            ready: true,
            url: "https://www.google.com",
          },
        },
      })
      .eq("id", applicationId);

    if (error) {
      setMessage(error.message);
      setPendingId(null);
      return;
    }

    await refreshApplications();
    setMessage("Beratung als durchgeführt markiert, Empfehlungsschreiben freigegeben.");
    setPendingId(null);
  }

  const selectedApplication = applications.find(
    (application) => application.id === selectedApplicationId,
  );
  const selectedStatusMeta = selectedApplication
    ? getApplicationStatusMeta(selectedApplication, "R2")
    : null;

  if (!selectedApplication) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Eingegangene Antraege</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {applications.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Keine sichtbaren Antraege in der Inbox.
            </p>
          )}
          {applications.map((application) => {
            const statusMeta = getApplicationStatusMeta(application, "R2");
            return (
              <button
                key={application.id}
                type="button"
                onClick={() => setSelectedApplicationId(application.id)}
                className="w-full rounded-md border p-3 text-left transition hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-medium">
                    {application.data.title ?? "Ohne Titel"}
                  </p>
                  <span
                    className={cn(
                        "inline-flex items-center rounded-lg px-2 py-0.5 text-xs leading-4 font-semibold",
                      statusMeta.className,
                    )}
                  >
                    {statusMeta.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {application.users[0]?.display_name ??
                    application.users[0]?.email ??
                    application.applicant_id}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Eingereicht am {new Date(application.created_at).toLocaleDateString("de-CH")}
                </p>
              </button>
            );
          })}
          {message && <p className="pt-2 text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Button
          variant="ghost"
          size="sm"
          className="w-fit gap-2 px-0"
          onClick={() => setSelectedApplicationId(null)}
        >
          <ArrowLeft className="size-4" />
          Zurueck zur Liste
        </Button>
        <CardTitle>Antrag oeffnen und bearbeiten</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">
                {selectedApplication.data.title ?? "Ohne Titel"}
              </h3>
              <span
                className={cn(
                  "inline-flex items-center rounded-lg px-2 py-0.5 text-xs leading-4 font-semibold",
                  selectedStatusMeta?.className,
                )}
              >
                {selectedStatusMeta?.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedApplication.data.summary || "Keine Beschreibung hinterlegt."}
            </p>
            <p className="text-xs text-muted-foreground">
              Antragsteller:{" "}
              {selectedApplication.users[0]?.display_name ??
                selectedApplication.users[0]?.email ??
                selectedApplication.applicant_id}
            </p>
            {selectedApplication.data.consultation?.status ? (
              <div className="rounded-md border bg-background p-3 text-xs">
                <p className="font-medium text-foreground">Angefragter Beratungstermin</p>
                <p className="text-muted-foreground">
                  {selectedApplication.data.consultation.date ?? "Datum noch offen"}
                </p>
                <p className="text-muted-foreground">
                  Slot: {selectedApplication.data.consultation.slot ?? "Slot noch offen"}
                </p>
                <p className="text-muted-foreground">
                  Ort: {selectedApplication.data.consultation.location ?? "Ort noch offen"}
                </p>
              </div>
            ) : null}
            {selectedApplication.data.personalData ? (
              <div className="space-y-1 rounded-md border bg-background p-3 text-xs">
                <p className="mb-1 font-medium text-foreground">
                  Übermittelte Antragsdaten (read-only)
                </p>
                <p className="text-muted-foreground">
                  Name: {selectedApplication.data.personalData.vorname}{" "}
                  {selectedApplication.data.personalData.name}
                </p>
                <p className="text-muted-foreground">
                  E-Mail: {selectedApplication.data.personalData.email}
                </p>
                <p className="text-muted-foreground">
                  Telefon: {selectedApplication.data.personalData.phone}
                </p>
                <p className="text-muted-foreground">
                  Matrikel: {selectedApplication.data.personalData.matrikel}
                </p>
                <p className="text-muted-foreground">
                  Studiengang: {selectedApplication.data.personalData.studiengang}
                </p>
                <p className="text-muted-foreground">
                  Uploads: {selectedApplication.data.attestFiles?.length ?? 0}
                </p>
              </div>
            ) : null}
            {selectedApplication.data.attestFiles?.length ? (
              <div className="space-y-2 rounded-md border bg-background p-3 text-xs">
                <p className="font-medium text-foreground">Fachärztliche Atteste</p>
                {selectedApplication.data.attestFiles.map((file) => (
                  <a
                    key={file.id ?? file.name}
                    href="https://www.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-foreground hover:underline"
                  >
                    <span>{file.name ?? "Datei"}</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      {formatFileSize(file.size ?? 0)}
                      <ExternalLink className="size-3.5" />
                    </span>
                  </a>
                ))}
              </div>
            ) : null}
            {selectedApplication.data.recommendation?.url ? (
              <div className="rounded-md border bg-background p-3 text-xs">
                <p className="mb-1 font-medium text-foreground">Empfehlungsschreiben</p>
                <a
                  href={selectedApplication.data.recommendation.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-foreground underline"
                >
                  Dokument in neuem Tab öffnen
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            ) : null}
            {selectedApplication.data.applicationDefinition ? (
              <div className="space-y-1 rounded-md border bg-background p-3 text-xs">
                <p className="mb-1 font-medium text-foreground">Antragsdefinition</p>
                <p className="text-muted-foreground">
                  Beschreibung:{" "}
                  {selectedApplication.data.applicationDefinition.situationDescription ??
                    "Keine Angabe"}
                </p>
                <p className="text-muted-foreground">
                  Gültigkeit:{" "}
                  {selectedApplication.data.applicationDefinition.duration === "full_study"
                    ? "Gesamte Studiendauer"
                    : selectedApplication.data.applicationDefinition.duration === "one_semester"
                      ? "Einmalig für ein Semester"
                      : "Keine Angabe"}
                </p>
                <p className="text-muted-foreground">
                  Geltungsbereich:{" "}
                  {selectedApplication.data.applicationDefinition.scopeSelections?.join(", ") ||
                    "Keine Angabe"}
                </p>
                <p className="text-muted-foreground">
                  Maßnahmen Lehrveranstaltungen:{" "}
                  {[
                    ...(selectedApplication.data.applicationDefinition.lectureMeasures ?? []),
                    selectedApplication.data.applicationDefinition.lectureOtherEnabled
                      ? selectedApplication.data.applicationDefinition.lectureOtherText || "Sonstige"
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Keine Angabe"}
                </p>
                <p className="text-muted-foreground">
                  Maßnahmen Leistungsnachweise:{" "}
                  {[
                    ...(selectedApplication.data.applicationDefinition.assessmentMeasures ?? []),
                    selectedApplication.data.applicationDefinition.assessmentOtherEnabled
                      ? selectedApplication.data.applicationDefinition.assessmentOtherText ||
                        "Sonstige"
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Keine Angabe"}
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">
              Empfehlungsschreiben freigeben (Mock)
            </p>
            <p className="text-sm text-muted-foreground">
              Der eingereichte Antrag ist hier nur lesbar. Nach Durchführung der
              Beratung können Sie die Empfehlung freigeben.
            </p>
            <div className="flex items-center justify-between gap-3">
              <span
                className={cn(
                  "inline-flex items-center rounded-lg px-2 py-0.5 text-xs leading-4 font-semibold",
                  selectedStatusMeta?.className,
                )}
              >
                {selectedStatusMeta?.label}
              </span>
              <Button
                variant="outline"
                onClick={() => markConsultationDone(selectedApplication.id)}
                disabled={pendingId === selectedApplication.id}
              >
                Beratung durchgeführt + Empfehlung freigeben
              </Button>
            </div>
          </div>
        </div>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
