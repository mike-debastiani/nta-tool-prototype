"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationStatusBadge } from "@/components/domain/application-status-badge";
import { deriveCanonicalApplicationState } from "@/lib/application-status";
import { type ApplicationRow } from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/client";

type StudentDashboardProps = {
  applications: ApplicationRow[];
};

function formatFileSize(sizeInBytes: number) {
  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function StudentDashboard({ applications }: StudentDashboardProps) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<ApplicationRow[]>(applications);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selected = useMemo(
    () => items.find((application) => application.id === selectedId) ?? null,
    [items, selectedId],
  );

  const needsCorrection =
    selected !== null
    && deriveCanonicalApplicationState(selected) === "needs_adjustment";

  if (!selected) {
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
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Anträge vorhanden.</p>
          ) : null}
          {items.map((application) => (
            <button
              key={application.id}
              type="button"
              onClick={() => setSelectedId(application.id)}
              className="w-full rounded-md border p-3 text-left transition hover:bg-muted/30"
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
            </button>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit gap-2 px-0"
            onClick={() => setSelectedId(null)}
          >
            <ArrowLeft className="size-4" />
            Zurück zur Liste
          </Button>
          <button
            type="button"
            onClick={async () => {
              if (!selected) return;
              const shouldDelete = window.confirm(
                "Möchten Sie diesen Antrag wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.",
              );
              if (!shouldDelete) return;
              setIsDeleting(true);
              const { error } = await supabase
                .from("applications")
                .delete()
                .eq("id", selected.id);
              setIsDeleting(false);
              if (error) return;
              setItems((previous) => previous.filter((entry) => entry.id !== selected.id));
              setSelectedId(null);
            }}
            disabled={isDeleting}
            className="rounded-md p-2 text-destructive/70 transition hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Antrag löschen"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        <CardTitle>{selected.data.title ?? "NTA Antrag"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ApplicationStatusBadge application={selected} audience="R1" />
        {needsCorrection ? (
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/portal/antragserstellung?applicationId=${selected.id}`}>
              Korrekturen vornehmen
            </Link>
          </Button>
        ) : null}
        {selected.data.personalData ? (
          <div className="rounded-md border bg-muted/20 p-3 text-xs">
            <p className="mb-1 font-medium text-foreground">Persönliche Angaben</p>
            <p className="text-muted-foreground">
              {selected.data.personalData.vorname} {selected.data.personalData.name}
            </p>
            <p className="text-muted-foreground">{selected.data.personalData.email}</p>
            <p className="text-muted-foreground">{selected.data.personalData.phone}</p>
          </div>
        ) : null}
        {selected.data.attestFiles?.length ? (
          <div className="space-y-2 rounded-md border bg-muted/20 p-3 text-xs">
            <p className="font-medium text-foreground">Atteste</p>
            {selected.data.attestFiles.map((file) => (
              <a
                key={file.id ?? file.name}
                href="https://www.google.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded bg-background px-3 py-2 text-foreground hover:underline"
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
      </CardContent>
    </Card>
  );
}
