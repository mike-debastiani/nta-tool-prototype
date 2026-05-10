"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationStatusBadge } from "@/components/domain/application-status-badge";
import { type ApplicationRow } from "@/lib/test-flow-types";

type StudentDashboardProps = {
  applications: ApplicationRow[];
};

export function StudentDashboard({ applications }: StudentDashboardProps) {
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
        {applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Anträge vorhanden.</p>
        ) : null}
        {applications.map((application) => (
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
