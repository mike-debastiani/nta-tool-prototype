"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

const MENU_ITEM =
  "flex h-8 w-full items-center rounded-md px-2 text-sm text-foreground outline-none transition-colors hover:bg-zinc-200/60 focus-visible:bg-zinc-200/60";

type WorkspaceAccountMenuProps = {
  initials?: string;
  /** HF Workspace-Topbar: 40px Avatar (Figma 5354:10014). */
  size?: "default" | "workspace";
};

export function WorkspaceAccountMenu({
  initials = "NF",
  size = "default",
}: WorkspaceAccountMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            size === "workspace"
              ? "size-10 bg-stone-150 text-hf-paragraph-small-medium text-foreground hover:bg-stone-200/80"
              : "size-9 bg-neutral-200 text-xs font-semibold text-neutral-800 hover:bg-neutral-300/80 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600/80",
          )}
          aria-label="Benutzerkonto-Menü"
        >
          {initials}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-56 gap-0 rounded-lg border border-border bg-popover p-0.5 shadow-md ring-1 ring-foreground/5"
      >
        <div className="flex min-h-8 w-full items-center px-2 py-[5px]">
          <p className="text-xs font-medium text-muted-foreground">Mein Account</p>
        </div>
        <Link
          href="/workspace?view=profil"
          className={MENU_ITEM}
          onClick={() => setOpen(false)}
        >
          Profil
        </Link>
        <Link
          href="/workspace?view=einstellungen"
          className={MENU_ITEM}
          onClick={() => setOpen(false)}
        >
          Einstellungen
        </Link>

        <div className="flex h-[9px] w-full items-center px-0">
          <Separator className="bg-border" />
        </div>

        <button
          type="button"
          className={cn(
            MENU_ITEM,
            "justify-between gap-2 text-left hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive",
          )}
          onClick={() => void handleSignOut()}
          disabled={signingOut}
        >
          <span>{signingOut ? "Abmelden…" : "Abmelden"}</span>
          <LogOut
            className="size-5 shrink-0 opacity-90"
            strokeWidth={2}
            aria-hidden
          />
        </button>
      </PopoverContent>
    </Popover>
  );
}
