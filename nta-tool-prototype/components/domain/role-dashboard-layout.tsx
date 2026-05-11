"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  House,
  Inbox,
  PieChart,
  Search,
  Settings,
  User,
} from "lucide-react";
import { WorkspaceAccountMenu } from "@/components/domain/workspace-account-menu";
import { useWorkspaceR2Toolbar } from "@/components/domain/workspace-r2-toolbar-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type RoleDashboardLayoutProps = {
  role: "R1" | "R2";
  userLabel: string;
  children: ReactNode;
  actions?: ReactNode;
  /**
   * Workspace: unread count for the Inbox badge (only rendered when provided and positive).
   * Omit until inbox/notifications are implemented.
   */
  inboxNotificationCount?: number;
  /**
   * Setzt die innere Inhaltsfläche auf „edge-to-edge" (kein eigenes
   * `px-6 py-8`-Padding, kein Header). Genutzt für Screens, die selbst eine
   * mehrspaltige Vollflächen-Komposition liefern (z. B. R1-Korrekturansicht
   * mit eigener rechter Sidebar).
   */
  edgeToEdge?: boolean;
  /** Navigationsleiste initial eingeklappt (nur Icon-Leiste). */
  defaultSidebarCollapsed?: boolean;
};

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

const BASE_ITEM_CLASS =
  "flex h-8 items-center rounded-md px-3 text-sm text-sidebar-foreground transition-all duration-200";

export function RoleDashboardLayout({
  role,
  userLabel,
  children,
  actions,
  inboxNotificationCount,
  edgeToEdge = false,
  defaultSidebarCollapsed = false,
}: RoleDashboardLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(defaultSidebarCollapsed);
  const workspaceToolbar = useWorkspaceR2Toolbar();

  const topItems = useMemo<NavItem[]>(
    () =>
      role === "R1"
        ? [
            { label: "Meine Anträge", href: "/portal/home", icon: <House className="size-4" /> },
            { label: "Profil", href: "/portal/home?view=profil", icon: <User className="size-4" /> },
          ]
        : [
            { label: "Home", href: "/workspace", icon: <House className="size-4" /> },
            {
              label: "Meine Aufgaben",
              href: "/workspace?view=aufgaben",
              icon: <ClipboardList className="size-4" />,
            },
            {
              label: "Terminplaner",
              href: "/workspace?view=terminplaner",
              icon: <Calendar className="size-4" />,
            },
            {
              label: "Auswerten",
              href: "/workspace?view=auswerten",
              icon: <PieChart className="size-4" />,
            },
            { label: "Profil", href: "/workspace?view=profil", icon: <User className="size-4" /> },
          ],
    [role],
  );

  const bottomItems = useMemo<NavItem[]>(
    () =>
      role === "R1"
        ? [
            {
              label: "Einstellungen",
              href: "/portal/home?view=einstellungen",
              icon: <Settings className="size-4" />,
            },
            { label: "Hilfe", href: "/portal/home?view=hilfe", icon: <CircleHelp className="size-4" /> },
          ]
        : [
            {
              label: "Einstellungen",
              href: "/workspace?view=einstellungen",
              icon: <Settings className="size-4" />,
            },
            {
              label: "Hilfe",
              href: "/workspace?view=hilfe",
              icon: <CircleHelp className="size-4" />,
            },
          ],
    [role],
  );

  const isActive = (href: string) => {
    const [hrefPath, hrefQuery] = href.split("?");
    if (pathname !== hrefPath) return false;

    if (!hrefQuery) {
      return !searchParams.get("view");
    }

    const hrefParams = new URLSearchParams(hrefQuery);
    const hrefView = hrefParams.get("view");
    const currentView = searchParams.get("view");

    return hrefView === currentView;
  };

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-background">
      <aside
        className={cn(
          "group/sidebar relative shrink-0 border-r border-border bg-[#fafafa] py-8 transition-[width] duration-300 ease-out",
          collapsed
            ? "z-50 w-[111px] cursor-pointer overflow-visible px-0"
            : "w-[252px] cursor-default overflow-hidden px-6",
        )}
        onClick={() => {
          if (collapsed) setCollapsed(false);
        }}
      >
        <div className="flex h-full max-h-screen min-h-0 flex-col gap-8 overflow-hidden">
          <div
            className={cn(
              "relative flex items-center",
              collapsed ? "justify-center" : "justify-between",
            )}
          >
            <div className={cn("flex items-center gap-3", collapsed && "justify-center gap-0")}>
              <div
                className="size-9 shrink-0 rounded-lg bg-zinc-300"
                aria-hidden
              />
              {!collapsed ? (
                <h3 className="text-lg font-semibold leading-none tracking-tight text-foreground">
                  Logo
                </h3>
              ) : null}
            </div>
            {!collapsed ? (
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setCollapsed(true);
                }}
                className={cn(
                  "rounded-xl bg-zinc-200 text-zinc-600",
                  "opacity-0 transition-all duration-200 ease-out",
                  "group-hover/sidebar:opacity-100",
                )}
                aria-label="Seitenleiste einklappen"
              >
                <ChevronLeft className="size-4" />
              </Button>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden">
            <div className={cn("min-h-0 space-y-1 overflow-hidden", collapsed && "flex flex-col items-center")}>
              {!collapsed ? (
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">Menü</p>
              ) : null}
              {topItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    BASE_ITEM_CLASS,
                    collapsed
                      ? "w-[41px] justify-center px-0"
                      : "w-full justify-start gap-2",
                    isActive(item.href)
                      ? "bg-zinc-200/80"
                      : "hover:bg-zinc-200/60",
                  )}
                  aria-label={collapsed ? item.label : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center",
                      isActive(item.href) ? "text-zinc-700" : "text-zinc-700/90",
                    )}
                  >
                    {item.icon}
                  </span>
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              ))}
            </div>

            <div className={cn("shrink-0 space-y-1", collapsed && "flex flex-col items-center")}>
              {bottomItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    BASE_ITEM_CLASS,
                    collapsed
                      ? "w-[41px] justify-center px-0"
                      : "w-full justify-start gap-2",
                    isActive(item.href)
                      ? "bg-zinc-200/80"
                      : "hover:bg-zinc-200/60",
                  )}
                  aria-label={collapsed ? item.label : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center",
                      isActive(item.href) ? "text-zinc-700" : "text-zinc-700/90",
                    )}
                  >
                    {item.icon}
                  </span>
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              ))}
            </div>
          </div>
        </div>
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setCollapsed(false);
            }}
            className={cn(
              "absolute left-[calc(100%+16px)] top-[calc(2rem+1.125rem)] z-[60] -translate-y-1/2 rounded-xl bg-zinc-200 text-zinc-600",
              "opacity-0 transition-all duration-200 ease-out",
              "group-hover/sidebar:opacity-100",
            )}
            aria-label="Seitenleiste aufklappen"
          >
            <ChevronRight className="size-4" />
          </Button>
        ) : null}
      </aside>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {role === "R2" ? (
          <div className="sticky top-0 z-30 flex w-full shrink-0 items-center gap-4 border-b border-border bg-background px-6 py-3">
            <div className="flex min-w-0 shrink-0 items-center">
              {workspaceToolbar?.leadingSlot}
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
              <div className="relative w-full max-w-xs shrink-0">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="search"
                  placeholder="Suchen…"
                  className="h-9 rounded-lg border-zinc-200 bg-zinc-50 pl-9 shadow-xs placeholder:text-muted-foreground focus-visible:bg-background dark:border-zinc-700 dark:bg-zinc-900/50"
                  aria-label="Suchen"
                />
              </div>
              <Link
                href="/workspace?view=inbox"
                className={cn(
                  "relative inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm text-zinc-700 transition-colors",
                  "hover:bg-zinc-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                )}
              >
                <Inbox className="size-4 shrink-0" aria-hidden />
                <span>Inbox</span>
                {inboxNotificationCount != null && inboxNotificationCount > 0 ? (
                  <span
                    className={cn(
                      "inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1",
                      "text-[10px] font-semibold tabular-nums leading-none text-primary-foreground",
                    )}
                    aria-label={`${inboxNotificationCount} Benachrichtigungen`}
                  >
                    {inboxNotificationCount > 99 ? "99+" : inboxNotificationCount}
                  </span>
                ) : null}
              </Link>
              <WorkspaceAccountMenu initials="NF" />
            </div>
          </div>
        ) : null}
        {role === "R2" || edgeToEdge ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-8">
            {userLabel.trim() || actions ? (
              <header className="mb-6 flex items-center justify-between gap-3">
                {userLabel.trim() ? (
                  <p className="text-sm text-muted-foreground">{userLabel}</p>
                ) : (
                  <span />
                )}
                {actions}
              </header>
            ) : null}
            <div className="flex-1">{children}</div>
          </div>
        )}
      </main>
    </div>
  );
}
