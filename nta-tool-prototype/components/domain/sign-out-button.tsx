"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useRoleBannerOpen } from "@/lib/role-banner-state";
import { createClient } from "@/utils/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  // Abmelden ist gesperrt, solange die Rollen-Leiste (Demo) eingeblendet ist.
  const roleBannerOpen = useRoleBannerOpen();

  async function handleSignOut() {
    if (roleBannerOpen) {
      return;
    }
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="outline"
        onClick={handleSignOut}
        disabled={pending || roleBannerOpen}
        aria-disabled={roleBannerOpen}
      >
        {pending ? "Abmelden..." : "Abmelden"}
      </Button>
      {roleBannerOpen ? (
        <p className="text-xs leading-snug text-muted-foreground">
          Gesperrt, solange die Rollen-Leiste aktiv ist (Ctrl + Alt + R zum
          Schliessen).
        </p>
      ) : null}
    </div>
  );
}
