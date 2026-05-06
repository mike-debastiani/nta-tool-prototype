import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">NTA Testflow</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Dieser reduzierte Prototyp simuliert die Kommunikation zwischen R1
        (Studierende:r) und R2 (Fachstelle) mit echter Supabase-Anbindung und
        Realtime-Statusupdates.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Studierenden-Bereich (R1)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Antrag erstellen, einreichen und den Status live verfolgen.
            </p>
            <Button asChild>
              <Link href="/student/login">Zu Student Login</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Workspace-Bereich (R2)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Eingereichte Antraege einsehen und den Status bearbeiten.
            </p>
            <Button asChild variant="outline">
              <Link href="/staff/login">Zu Staff Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
