"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APPLICATION_CONTENT_PANEL_CARD_CLASS } from "@/lib/design-tokens/application-content-panel";
import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth";
import { createClient } from "@/utils/supabase/client";

type LoginCardProps = {
  title: string;
  description?: string;
  allowedRoles: UserRole[];
};

export function LoginCard({ title, description, allowedRoles }: LoginCardProps) {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      setError(authError?.message ?? "Login fehlgeschlagen.");
      setPending(false);
      return;
    }

    // Session/JWT muss für den nächsten PostgREST-Aufruf gesetzt sein (sonst RLS wie «anon» → leeres Profil).
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      await supabase.auth.signOut();
      setError(
        sessionError?.message
          ?? "Sitzung konnte nicht erstellt werden. Bitte erneut versuchen.",
      );
      setPending(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle<{ role: UserRole }>();

    if (profileError) {
      await supabase.auth.signOut();
      setError(
        `Profil konnte nicht geladen werden: ${profileError.message}`,
      );
      setPending(false);
      return;
    }

    if (!profile || !allowedRoles.includes(profile.role)) {
      await supabase.auth.signOut();
      setError("Dieser Account hat keinen Zugriff auf diesen Login.");
      setPending(false);
      return;
    }

    setPending(false);
    router.push(
      profile.role === "R1" ? "/portal/antragserstellung" : "/workspace",
    );
    router.refresh();
  }

  return (
    <div
      className={cn(
        APPLICATION_CONTENT_PANEL_CARD_CLASS,
        "w-full p-6",
      )}
    >
      <header className="mb-6">
        <h1 className={cn(hfTypography.h3, "text-stone-900")}>{title}</h1>
        {description ? (
          <p className={cn(hfTypography.paragraphSmall, "mt-2 text-stone-600")}>
            {description}
          </p>
        ) : null}
      </header>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? (
          <p className={cn(hfTypography.paragraphSmall, "text-destructive")}>
            {error}
          </p>
        ) : null}
        <Button className="w-full" type="submit" disabled={pending}>
          {pending ? "Anmeldung läuft…" : "Anmelden"}
        </Button>
      </form>
    </div>
  );
}
