"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ApplicationStatus,
  statusLabel,
} from "@/lib/application-status";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/client";
import { ApplicationStatusBadge } from "@/components/domain/application-status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type WorkspaceTestFlowProps = {
  userId: string;
  initialApplications: WorkspaceApplication[];
};

const nextStatusOptions: ApplicationStatus[] = [
  "in_review",
  "needs_correction",
  "approved",
  "rejected",
];

export function WorkspaceTestFlow({
  userId,
  initialApplications,
}: WorkspaceTestFlowProps) {
  const supabase = useMemo(() => createClient(), []);
  const [applications, setApplications] =
    useState<WorkspaceApplication[]>(initialApplications);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<
    Record<string, ApplicationStatus>
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

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
      setStatusDrafts((previous) => {
        const next = { ...previous };
        for (const application of nextApplications) {
          next[application.id] = previous[application.id] ?? application.status;
        }
        return next;
      });
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

  async function updateStatus(applicationId: string) {
    setPendingId(applicationId);
    setMessage(null);

    const nextStatus = statusDrafts[applicationId];
    if (!nextStatus) {
      setPendingId(null);
      return;
    }

    const { error } = await supabase.rpc("r2_set_application_status", {
      p_application_id: applicationId,
      p_next_status: nextStatus,
    });

    if (error) {
      setMessage(error.message);
      setPendingId(null);
      return;
    }

    await refreshApplications();
    setMessage(`Status wurde auf "${statusLabel[nextStatus]}" gesetzt.`);
    setPendingId(null);
  }

  const selectedApplication = applications.find(
    (application) => application.id === selectedApplicationId,
  );

  const canSave =
    selectedApplication != null &&
    statusDrafts[selectedApplication.id] != null &&
    statusDrafts[selectedApplication.id] !== selectedApplication.status;

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
          {applications.map((application) => (
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
                <ApplicationStatusBadge status={application.status} />
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
          ))}
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
              <ApplicationStatusBadge status={selectedApplication.status} />
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
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Status aendern und freigeben</p>
            <Select
              value={statusDrafts[selectedApplication.id] ?? selectedApplication.status}
              onValueChange={(value: string) =>
                setStatusDrafts((previous) => ({
                  ...previous,
                  [selectedApplication.id]: value as ApplicationStatus,
                }))
              }
            >
              <SelectTrigger className="w-full sm:max-w-xs">
                <SelectValue placeholder="Status waehlen" />
              </SelectTrigger>
              <SelectContent>
                {nextStatusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabel[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between gap-3">
              <ApplicationStatusBadge
                status={statusDrafts[selectedApplication.id] ?? selectedApplication.status}
              />
              <Button
                onClick={() => updateStatus(selectedApplication.id)}
                disabled={!canSave || pendingId === selectedApplication.id}
              >
                Aenderung speichern
              </Button>
            </div>
          </div>
        </div>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
