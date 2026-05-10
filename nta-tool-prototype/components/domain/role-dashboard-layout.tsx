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
}: RoleDashboardLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);

  const topItems = useMemo<NavItem[]>(
    () =>
      role === "R1"
        ? [
            { label: "Home", href: "/portal/home", icon: <House className="size-4" /> },
            { label: "Profil", href: "/portal/home?view=profil", icon: <User className="size-4" /> },
          ]
        : [
            { label: "Home", href: "/workspace/test", icon: <House className="size-4" /> },
            {
              label: "Meine Aufgaben",
              href: "/workspace/test?view=aufgaben",
              icon: <ClipboardList className="size-4" />,
            },
            {
              label: "Terminplaner",
              href: "/workspace/test?view=terminplaner",
              icon: <Calendar className="size-4" />,
            },
            {
              label: "Auswerten",
              href: "/workspace/test?view=auswerten",
              icon: <PieChart className="size-4" />,
            },
            { label: "Profil", href: "/workspace/test?view=profil", icon: <User className="size-4" /> },
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
              href: "/workspace/test?view=einstellungen",
              icon: <Settings className="size-4" />,
            },
            {
              label: "Hilfe",
              href: "/workspace/test?view=hilfe",
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
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "group/sidebar relative border-r bg-[#fafafa] py-8 transition-[width] duration-300 ease-out",
          collapsed ? "w-[111px] px-0" : "w-[252px] px-6",
        )}
      >
        <div className="flex h-full flex-col gap-8">
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
                onClick={() => setCollapsed(true)}
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
            {collapsed ? (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCollapsed(false)}
                className={cn(
                  "absolute left-[calc(100%+24px)] top-1/2 z-20 -translate-y-1/2 rounded-xl bg-zinc-200 text-zinc-600",
                  "opacity-0 transition-all duration-200 ease-out",
                  "group-hover/sidebar:opacity-100",
                )}
                aria-label="Seitenleiste aufklappen"
              >
                <ChevronRight className="size-4" />
              </Button>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col justify-between">
            <div className={cn("space-y-1", collapsed && "flex flex-col items-center")}>
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

            <div className={cn("space-y-1", collapsed && "flex flex-col items-center")}>
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
      </aside>

      <main className="flex min-h-screen flex-1 flex-col">
        {role === "R2" ? (
          <div className="flex items-center justify-end gap-3 border-b border-border bg-background px-6 py-3">
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
              href="/workspace/test?view=inbox"
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
            <WorkspaceAccountMenu initials="FS" />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col px-6 py-8">
          <header className="mb-6 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{userLabel}</p>
            {actions}
          </header>
          <div className="flex-1">{children}</div>
        </div>
      </main>
    </div>
  );
}
