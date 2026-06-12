"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { LogOut } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { hfTypography } from "@/lib/design-tokens/typography";
import {
  DASHBOARD_NAV_ITEM_IDLE_CLASS,
  workspaceSidebarIconSlotClass,
  workspaceSidebarLabelTransitionClass,
  workspaceSidebarNavItemWidthTransitionClass,
} from "@/lib/design-tokens/workspace-dashboard";
import { useRoleBannerOpen } from "@/lib/role-banner-state";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

const MENU_ITEM =
  "flex h-8 w-full items-center rounded-md px-2 text-sm text-foreground outline-none transition-colors hover:bg-zinc-200/60 focus-visible:bg-zinc-200/60";

const NAV_ITEM_BASE =
  "flex h-8 shrink-0 items-center rounded-md py-1 transition-colors duration-200";

const ACCOUNT_MENU_PATHS = {
  workspace: {
    profile: "/workspace?view=profil",
    settings: "/workspace?view=einstellungen",
  },
  portal: {
    profile: "/portal/home?view=profil",
    settings: "/portal/home?view=einstellungen",
  },
} as const;

export type AccountMenuVariant = keyof typeof ACCOUNT_MENU_PATHS;

type AccountMenuPanelProps = {
  variant: AccountMenuVariant;
  onClose: () => void;
};

function AccountMenuPanel({ variant, onClose }: AccountMenuPanelProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  // Abmelden ist gesperrt, solange die Rollen-Leiste (Demo) eingeblendet ist.
  // Standard geschlossen → kein Einfluss auf den regulären Prototyp-Betrieb.
  const roleBannerOpen = useRoleBannerOpen();
  const paths = ACCOUNT_MENU_PATHS[variant];

  async function handleSignOut() {
    if (roleBannerOpen) {
      return;
    }
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <div className="flex min-h-8 w-full items-center px-2 py-[5px]">
        <p className="text-xs font-medium text-muted-foreground">Mein Account</p>
      </div>
      <Link href={paths.profile} className={MENU_ITEM} onClick={onClose}>
        Profil
      </Link>
      <Link href={paths.settings} className={MENU_ITEM} onClick={onClose}>
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
          "disabled:pointer-events-none disabled:opacity-50",
        )}
        onClick={() => void handleSignOut()}
        disabled={signingOut || roleBannerOpen}
        aria-disabled={roleBannerOpen}
      >
        <span>{signingOut ? "Abmelden…" : "Abmelden"}</span>
        <LogOut
          className="size-5 shrink-0 opacity-90"
          strokeWidth={2}
          aria-hidden
        />
      </button>

      {roleBannerOpen ? (
        <p className="px-2 pb-1 pt-1 text-xs leading-snug text-muted-foreground">
          Abmelden ist gesperrt, solange die Rollen-Leiste aktiv ist
          (Ctrl + Alt + R zum Schliessen).
        </p>
      ) : null}
    </>
  );
}

type WorkspaceAccountMenuProps = {
  initials?: string;
  /** HF Workspace-Topbar: 40px Avatar (Figma 5354:10014). */
  size?: "default" | "workspace";
  variant?: AccountMenuVariant;
};

export function WorkspaceAccountMenu({
  initials = "NF",
  size = "default",
  variant = "workspace",
}: WorkspaceAccountMenuProps) {
  const [open, setOpen] = useState(false);

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
        <AccountMenuPanel variant={variant} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

export type DashboardAccountMenuNavConfig = {
  label: string;
  icon: ReactNode;
  variant: AccountMenuVariant;
};

/** Sidebar «Profil» — gleiches Account-Menü wie Avatar in der Top-Bar. */
export function DashboardAccountMenuNavItem({
  label,
  icon,
  variant,
  collapsed,
}: DashboardAccountMenuNavConfig & { collapsed: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            NAV_ITEM_BASE,
            "relative w-full justify-start overflow-hidden",
            workspaceSidebarNavItemWidthTransitionClass,
            collapsed ? "max-w-10 gap-0 pr-0" : "max-w-full gap-2 pr-3",
            DASHBOARD_NAV_ITEM_IDLE_CLASS,
            open && !collapsed && "bg-stone-150",
          )}
          aria-label={collapsed ? label : undefined}
          title={collapsed ? label : undefined}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className={workspaceSidebarIconSlotClass}>
            <span className="inline-flex size-4 shrink-0 items-center justify-center">
              {icon}
            </span>
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate whitespace-nowrap text-left",
              workspaceSidebarLabelTransitionClass,
              hfTypography.paragraphSmall,
              collapsed ? "pointer-events-none opacity-0" : "opacity-100",
            )}
            aria-hidden={collapsed}
          >
            {label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="right"
        sideOffset={8}
        className="w-56 gap-0 rounded-lg border border-border bg-popover p-0.5 shadow-md ring-1 ring-foreground/5"
      >
        <AccountMenuPanel variant={variant} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
