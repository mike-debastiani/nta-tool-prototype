"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ApplicationRow } from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/client";
import { ApplicationStatusBadge } from "@/components/domain/application-status-badge";

type PortalTestFlowProps = {
  userId: string;
  initialApplications: ApplicationRow[];
};

export function PortalTestFlow({
  userId,
  initialApplications,
}: PortalTestFlowProps) {
  const supabase = useMemo(() => createClient(), []);
  const [applications, setApplications] =
    useState<ApplicationRow[]>(initialApplications);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "create" | "detail">("list");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel(`portal-app-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          filter: `applicant_id=eq.${userId}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          if (eventType === "DELETE") {
            const deletedId = String(payload.old.id);
            setApplications((previous) => {
              const remaining = previous.filter((item) => item.id !== deletedId);
              setSelectedId((currentSelectedId) => {
                if (currentSelectedId !== deletedId) {
                  return currentSelectedId;
                }
                return remaining[0]?.id ?? null;
              });
              return remaining;
            });
            if (selectedId === deletedId) {
              setMode("list");
            }
            return;
          }

          const nextRow = payload.new as ApplicationRow;
          if (!nextRow?.id) {
            return;
          }

          setApplications((previous) => {
            const index = previous.findIndex((item) => item.id === nextRow.id);
            if (index === -1) {
              return [nextRow, ...previous];
            }
            const clone = [...previous];
            clone[index] = nextRow;
            return clone.sort(
              (a, b) =>
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
            );
          });
          if (selectedId === nextRow.id) {
            setSelectedId(nextRow.id);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedId, supabase, userId]);

  async function submitApplication() {
    setPending(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      setMessage(
        "Session inkonsistent (vermutlich Rollenwechsel in anderem Tab). Bitte neu einloggen.",
      );
      setPending(false);
      return;
    }

    if (!title.trim()) {
      setMessage("Bitte zuerst einen Titel erfassen.");
      setPending(false);
      return;
    }

    const { data, error } = await supabase.rpc("r1_submit_application", {
      p_title: title,
      p_summary: summary,
    });

    if (error || !data) {
      setMessage(error?.message ?? "Einreichen fehlgeschlagen.");
      setPending(false);
      return;
    }

    setSelectedId(data.id);
    setTitle("");
    setSummary("");
    setConfirmDelete(false);
    setMode("detail");

    setMessage("Antrag wurde uebermittelt.");
    setPending(false);
  }

  async function deleteApplication() {
    if (!selectedId) {
      return;
    }

    setPending(true);
    setMessage(null);

    const { error } = await supabase.from("applications").delete().eq("id", selectedId);

    if (error) {
      setMessage(error.message);
      setPending(false);
      return;
    }

    const remaining = applications.filter((item) => item.id !== selectedId);
    setApplications(remaining);
    setSelectedId(remaining[0]?.id ?? null);
    setConfirmDelete(false);
    setMode("list");
    setMessage("Antrag wurde geloescht.");
    setPending(false);
  }

  const selectedApplication =
    applications.find((application) => application.id === selectedId) ?? null;

  if (mode === "list") {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Meine Antraege</CardTitle>
            <p className="text-sm text-muted-foreground">
              Reduzierte Listenansicht mit Status und Datum.
            </p>
          </div>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setMode("create");
              setMessage(null);
            }}
          >
            <Plus className="size-4" />
            Neuer Antrag
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {applications.length === 0 && (
            <p className="text-sm text-muted-foreground">Noch keine Antraege vorhanden.</p>
          )}
          {applications.map((application) => (
            <button
              key={application.id}
              type="button"
              onClick={() => {
                setSelectedId(application.id);
                setMode("detail");
                setConfirmDelete(false);
              }}
              className="w-full rounded-md border p-3 text-left transition hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-1 text-sm font-medium">
                  {application.data.title ?? "Ohne Titel"}
                </p>
                <ApplicationStatusBadge application={application} audience="R1" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Erstellt am {new Date(application.created_at).toLocaleDateString("de-CH")}
              </p>
            </button>
          ))}
          {message && <p className="pt-2 text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
    );
  }

  if (mode === "create") {
    return (
      <Card>
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            className="w-fit gap-2 px-0"
            onClick={() => setMode("list")}
          >
            <ArrowLeft className="size-4" />
            Zurueck zur Liste
          </Button>
          <CardTitle>Neuen Antrag erstellen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Verlaengerte Pruefungszeit"
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="summary">Beschreibung</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Kurzer Kontext zum Anliegen"
              disabled={pending}
            />
          </div>
          <Button onClick={submitApplication} disabled={pending}>
            Antrag einreichen
          </Button>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
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
          onClick={() => setMode("list")}
        >
          <ArrowLeft className="size-4" />
          Zurueck zur Liste
        </Button>
        <CardTitle>Antragsdetails</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedApplication ? (
          <p className="text-sm text-muted-foreground">
            Antrag nicht gefunden.
          </p>
        ) : (
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">
                {selectedApplication.data.title ?? "Ohne Titel"}
              </h3>
              <ApplicationStatusBadge application={selectedApplication} audience="R1" />
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedApplication.data.summary || "Keine Beschreibung vorhanden."}
            </p>
            <p className="text-xs text-muted-foreground">
              Zuletzt aktualisiert:{" "}
              {new Date(selectedApplication.updated_at).toLocaleString("de-CH")}
            </p>
            {!confirmDelete ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="gap-2"
              >
                <Trash2 className="size-4" />
                Antrag loeschen
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Wirklich loeschen?
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteApplication}
                  disabled={pending}
                >
                  Ja, loeschen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={pending}
                >
                  Abbrechen
                </Button>
              </div>
            )}
          </div>
        )}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
