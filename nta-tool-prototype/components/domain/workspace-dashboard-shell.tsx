"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  Bell,
  Calendar,
  ChartPie,
  CircleHelp,
  ClipboardList,
  House,
  Search,
  Settings,
  User,
} from "lucide-react";

import {
  DashboardDetailPanelProvider,
  useDashboardDetailPanel,
} from "@/components/domain/dashboard-detail-panel-context";
import {
  DashboardMainPanelScrollProvider,
  useDashboardMainPanelScrollElement,
} from "@/components/domain/dashboard-main-panel-scroll-context";
import { AvalisLogo } from "@/components/icons/avalis-logo";
import { usePortalDashboardToolbar } from "@/components/domain/portal-dashboard-toolbar-context";
import {
  DashboardAccountMenuNavItem,
  type DashboardAccountMenuNavConfig,
  WorkspaceAccountMenu,
} from "@/components/domain/workspace-account-menu";
import { useWorkspaceR2Toolbar } from "@/components/domain/workspace-r2-toolbar-context";
import { workspaceShowsConsultationPlannerNav } from "@/lib/workspace-nav-access";
import { Button } from "@/components/ui/button";
import {
  dashboardMainPanelScrollAreaClass,
  detailPanelScrollAreaClass,
} from "@/lib/design-tokens/application-scroll";
import { hfTypography } from "@/lib/design-tokens/typography";
import {
  APPLICATION_CONTENT_PANEL_SHADOW_CLASS,
  DASHBOARD_DETAIL_PANEL_PADDING_CLASS,
  DASHBOARD_DETAIL_PANEL_WIDTH_CLASS,
  DASHBOARD_NAV_ITEM_ACTIVE_CLASS,
  DASHBOARD_NAV_ITEM_ACTIVE_LABEL_CLASS,
  DASHBOARD_NAV_ITEM_IDLE_CLASS,
  DASHBOARD_MAIN_PANEL_TIGHT_LAYOUT_ENTER_RATIO,
  DASHBOARD_MAIN_PANEL_TIGHT_LAYOUT_EXIT_RATIO,
  DASHBOARD_SHELL_CONTENT_ROW_PADDING_BOTTOM_INSET_CLASS,
  DASHBOARD_SHELL_CONTENT_ROW_PADDING_BOTTOM_SCROLL_CLASS,
  DASHBOARD_SHELL_CONTENT_ROW_PADDING_CLASS,
  DASHBOARD_SHELL_MAIN_PANEL_PADDING_CLASS,
  DASHBOARD_SHELL_MAIN_PANEL_PADDING_OPEN_CLASS,
  DASHBOARD_SHELL_MAIN_PANEL_ROUNDED_INSET_CLASS,
  DASHBOARD_SHELL_MAIN_PANEL_ROUNDED_SCROLL_CLASS,
  DASHBOARD_SIDEBAR_PADDING_CLASS,
  DASHBOARD_TOP_BAR_HEIGHT_CLASS,
  DASHBOARD_TOP_BAR_PADDING_CLASS,
  PORTAL_DASHBOARD_RIM_HEIGHT_CLASS,
  WORKSPACE_BRAND_ROW_CLASS,
  WORKSPACE_SIDEBAR_TRANSITION_MS,
  workspaceNavWidthClass,
  workspaceSidebarIconSlotClass,
  workspaceSidebarLabelTransitionClass,
  workspaceSidebarNavItemWidthTransitionClass,
  workspaceSidebarToggleBaseClass,
  workspaceSidebarToggleHoverClass,
} from "@/lib/design-tokens/workspace-dashboard";
import { cn } from "@/lib/utils";

export type DashboardNavItemConfig = {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
};

type WorkspaceDashboardShellProps = {
  children: ReactNode;
  workspaceAccountInitials?: string;
  workspaceRole: "R2" | "R3" | "R4" | "R5" | "R6" | "R2R4";
  /** Badge auf «Meine Aufgaben» (Figma: 24). */
  tasksBadgeCount?: number;
  defaultSidebarCollapsed?: boolean;
};

type PortalDashboardShellProps = {
  children: ReactNode;
  workspaceAccountInitials?: string;
  showTopBar?: boolean;
  defaultSidebarCollapsed?: boolean;
};

type DashboardShellProps = {
  children: ReactNode;
  workspaceAccountInitials?: string;
  defaultSidebarCollapsed?: boolean;
  variant: "workspace" | "portal";
  showTopBar: boolean;
  topItems: DashboardNavItemConfig[];
  bottomItems: DashboardNavItemConfig[];
  /** Portal: «Profil» öffnet Account-Menü statt Navigation. */
  accountMenuNavItem?: DashboardAccountMenuNavConfig;
  topBarLeadingSlot?: ReactNode;
  topBarTrailingSlot?: ReactNode;
};

const NAV_ITEM_BASE =
  "flex h-8 shrink-0 items-center rounded-md py-1 transition-colors duration-200";

function WorkspaceNavSeparator({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex h-[9px] w-full items-center", className)}
      role="presentation"
      aria-hidden
    >
      <div className="h-px min-h-px flex-1 bg-border" />
    </div>
  );
}

function WorkspaceBrand({
  collapsed,
  layoutMini,
  onExpand,
  onCollapse,
}: {
  collapsed: boolean;
  layoutMini: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  const showExpandControl = collapsed && layoutMini;
  const [collapseControlReady, setCollapseControlReady] = useState(!collapsed);

  useEffect(() => {
    if (collapsed) {
      setCollapseControlReady(false);
      return;
    }
    const id = window.setTimeout(
      () => setCollapseControlReady(true),
      WORKSPACE_SIDEBAR_TRANSITION_MS,
    );
    return () => window.clearTimeout(id);
  }, [collapsed]);

  const showCollapseControl = !collapsed && collapseControlReady;

  return (
    <div
      className={cn(WORKSPACE_BRAND_ROW_CLASS, "justify-between overflow-visible")}
      data-node-id={layoutMini ? "5354:10889" : "5354:11412"}
    >
      <div
        className="flex min-w-0 flex-1 items-center gap-2 overflow-visible"
        data-node-id="5379:3896"
      >
        <div className={cn("group/brand relative z-0", workspaceSidebarIconSlotClass)}>
          <AvalisLogo className="relative z-10" />
          {showExpandControl ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onExpand();
                }}
                className={cn(
                  workspaceSidebarToggleBaseClass,
                  workspaceSidebarToggleHoverClass,
                  "absolute top-1/2 left-[calc(100%+16px)] -translate-y-1/2",
                )}
                aria-label="Seitenleiste aufklappen"
                data-node-id="5379:4140"
              >
                <ArrowRightFromLine className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              </button>
              <span className="absolute top-0 left-full h-10 w-12" aria-hidden />
            </>
          ) : null}
        </div>
        <span
          className={cn(
            hfTypography.h4,
            "truncate whitespace-nowrap",
            workspaceSidebarLabelTransitionClass,
            layoutMini
              ? "pointer-events-none absolute opacity-0"
              : cn("min-w-0 flex-1", collapsed ? "pointer-events-none opacity-0" : "opacity-100"),
          )}
          aria-hidden={collapsed}
        >
          avalis
        </span>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onCollapse();
        }}
        className={cn(
          workspaceSidebarToggleBaseClass,
          showCollapseControl
            ? cn("shrink-0", workspaceSidebarToggleHoverClass)
            : "hidden",
        )}
        aria-label="Seitenleiste einklappen"
        aria-hidden={!showCollapseControl}
        tabIndex={showCollapseControl ? 0 : -1}
        data-node-id="5379:4133"
      >
        <ArrowLeftFromLine className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}

function WorkspaceNavItem({
  item,
  active,
  collapsed,
}: {
  item: DashboardNavItemConfig;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        NAV_ITEM_BASE,
        "relative",
        collapsed ? "overflow-visible" : "overflow-hidden",
        workspaceSidebarNavItemWidthTransitionClass,
        "w-full justify-start",
        collapsed ? "max-w-10 gap-0 pr-0" : "max-w-full gap-2 pr-3",
        active ? DASHBOARD_NAV_ITEM_ACTIVE_CLASS : DASHBOARD_NAV_ITEM_IDLE_CLASS,
      )}
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
    >
      <span className={workspaceSidebarIconSlotClass}>
        <span className="inline-flex size-4 shrink-0 items-center justify-center">{item.icon}</span>
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate whitespace-nowrap",
          workspaceSidebarLabelTransitionClass,
          active
            ? DASHBOARD_NAV_ITEM_ACTIVE_LABEL_CLASS
            : hfTypography.paragraphSmall,
          collapsed ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        aria-hidden={collapsed}
      >
        {item.label}
      </span>
      {item.badge != null && item.badge > 0 ? (
        <>
          <span
            className={cn(
              "ml-auto inline-flex size-6 min-w-6 shrink-0 items-center justify-center rounded-full",
              hfTypography.paragraphMiniMedium,
              active
                ? "bg-white text-black"
                : "bg-stone-200 text-primary",
              workspaceSidebarLabelTransitionClass,
              collapsed
                ? "pointer-events-none min-w-0 w-0 max-w-0 overflow-hidden p-0 opacity-0"
                : "opacity-100",
            )}
          >
            {item.badge > 99 ? "99+" : item.badge}
          </span>
          <span
            className={cn(
              "pointer-events-none absolute top-1/2 left-8 inline-flex size-6 min-w-6 -translate-y-1/2 items-center justify-center rounded-full",
              hfTypography.paragraphMiniMedium,
              active
                ? "bg-white text-black"
                : "bg-stone-200 text-primary",
              workspaceSidebarLabelTransitionClass,
              collapsed ? "opacity-100" : "opacity-0",
            )}
            aria-hidden={!collapsed}
          >
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        </>
      ) : null}
    </Link>
  );
}

function WorkspaceSidebar({
  collapsed,
  layoutMini,
  onCollapsedChange,
  topItems,
  bottomItems,
  accountMenuNavItem,
  isActive,
}: {
  collapsed: boolean;
  layoutMini: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  topItems: DashboardNavItemConfig[];
  bottomItems: DashboardNavItemConfig[];
  accountMenuNavItem?: DashboardAccountMenuNavConfig;
  isActive: (href: string) => boolean;
}) {
  return (
    <aside
      className={cn(
        "group/sidebar relative flex h-full shrink-0 flex-col bg-stone-100 transition-[width] duration-300 ease-out",
        DASHBOARD_SIDEBAR_PADDING_CLASS,
        workspaceNavWidthClass(collapsed),
        collapsed ? "cursor-pointer overflow-visible" : "overflow-hidden",
      )}
      data-node-id={collapsed ? "5354:10779" : "5354:11410"}
      onClick={() => {
        if (collapsed) onCollapsedChange(false);
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-4">
        <div className="flex flex-col gap-5">
          <WorkspaceBrand
            collapsed={collapsed}
            layoutMini={layoutMini}
            onExpand={() => onCollapsedChange(false)}
            onCollapse={() => onCollapsedChange(true)}
          />

          <nav className="flex flex-col gap-1" aria-label="Hauptnavigation">
            <div
              className="flex h-8 min-h-8 w-full items-center px-2 py-[5.5px]"
              aria-hidden={layoutMini}
            >
              <span
                className={cn(
                  hfTypography.paragraphMiniMedium,
                  workspaceSidebarLabelTransitionClass,
                  collapsed ? "opacity-0" : "opacity-100",
                )}
              >
                Navigation
              </span>
            </div>
            {topItems.map((item) => (
              <WorkspaceNavItem
                key={item.href}
                item={item}
                active={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}
            {accountMenuNavItem ? (
              <DashboardAccountMenuNavItem
                {...accountMenuNavItem}
                collapsed={collapsed}
              />
            ) : null}
          </nav>
        </div>

        <nav className="flex flex-col gap-1" aria-label="Zusatznavigation">
          <WorkspaceNavSeparator />
          {bottomItems.map((item) => (
            <WorkspaceNavItem
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}

function PortalTopBar({
  workspaceAccountInitials,
  leadingSlot,
  trailingSlot,
}: {
  workspaceAccountInitials: string;
  leadingSlot: ReactNode;
  trailingSlot?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 bg-stone-100",
        DASHBOARD_TOP_BAR_HEIGHT_CLASS,
        DASHBOARD_TOP_BAR_PADDING_CLASS,
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center">{leadingSlot}</div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {trailingSlot ? (
          <div className="flex min-w-0 shrink-0 items-center justify-end">{trailingSlot}</div>
        ) : null}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-stone-150 text-foreground-alt transition-colors hover:bg-stone-200/80"
            aria-label="Benachrichtigungen"
            data-node-id="5354:10012"
          >
            <Bell className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
          <WorkspaceAccountMenu
            initials={workspaceAccountInitials}
            size="workspace"
            variant="portal"
          />
        </div>
      </div>
    </header>
  );
}

function WorkspaceTopBar({
  workspaceAccountInitials,
  leadingSlot,
}: {
  workspaceAccountInitials: string;
  leadingSlot?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 bg-stone-100",
        DASHBOARD_TOP_BAR_HEIGHT_CLASS,
        DASHBOARD_TOP_BAR_PADDING_CLASS,
      )}
      data-node-id="5354:10007"
    >
      <div className="flex min-w-0 shrink-0 items-center">{leadingSlot}</div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <div
          className="flex h-9 w-full max-w-[320px] shrink-0 items-center gap-2 overflow-hidden rounded-full bg-stone-150 px-3 py-[7.5px]"
          data-node-id="5354:10010"
        >
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="search"
            placeholder="Suche..."
            className={cn(
              hfTypography.paragraphSmall,
              "min-w-0 flex-1 border-0 bg-transparent text-foreground-alt outline-none placeholder:text-muted-foreground",
            )}
            aria-label="Suchen"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-stone-150 text-foreground-alt transition-colors hover:bg-stone-200/80"
            aria-label="Benachrichtigungen"
            data-node-id="5354:10012"
          >
            <Bell className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
          <WorkspaceAccountMenu initials={workspaceAccountInitials} size="workspace" />
        </div>
      </div>
    </header>
  );
}

const PORTAL_APPLICATIONS_HREF = "/portal/home";
const PORTAL_APPLICATION_DETAIL_PREFIX = "/portal/antragserstellung";

function useDashboardNavActive(variant: "workspace" | "portal") {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (href: string) => {
    const [hrefPath, hrefQuery] = href.split("?");

    if (
      variant === "portal"
      && hrefPath === PORTAL_APPLICATIONS_HREF
      && !hrefQuery
      && pathname.startsWith(PORTAL_APPLICATION_DETAIL_PREFIX)
    ) {
      return true;
    }

    if (pathname !== hrefPath) return false;
    if (!hrefQuery) return !searchParams.get("view");
    const hrefParams = new URLSearchParams(hrefQuery);
    return hrefParams.get("view") === searchParams.get("view");
  };
}

function useSidebarCollapseState(defaultSidebarCollapsed: boolean) {
  const [collapsed, setCollapsed] = useState(defaultSidebarCollapsed);
  const [layoutMini, setLayoutMini] = useState(defaultSidebarCollapsed);

  useEffect(() => {
    if (collapsed) {
      const id = window.setTimeout(
        () => setLayoutMini(true),
        WORKSPACE_SIDEBAR_TRANSITION_MS,
      );
      return () => window.clearTimeout(id);
    }
    setLayoutMini(false);
  }, [collapsed]);

  return { collapsed, layoutMini, setCollapsed };
}

function useDashboardMainPanelScrollable() {
  const registeredScrollElement = useDashboardMainPanelScrollElement();
  const defaultScrollRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);
  /** Hysterese: `pb-4` ↔ `pb-0` ändert `clientHeight` — ohne zweite Schwelle flackert das Layout. */
  const tightLayoutRef = useRef(false);

  const measure = useCallback(() => {
    const el = registeredScrollElement ?? defaultScrollRef.current;
    if (!el) return;
    const h = el.clientHeight;
    if (h <= 0) return;
    const ratio = el.scrollHeight / h;

    const nextTight = tightLayoutRef.current
      ? ratio > DASHBOARD_MAIN_PANEL_TIGHT_LAYOUT_EXIT_RATIO
      : ratio > DASHBOARD_MAIN_PANEL_TIGHT_LAYOUT_ENTER_RATIO;

    if (nextTight !== tightLayoutRef.current) {
      tightLayoutRef.current = nextTight;
      setIsScrollable(nextTight);
    }
  }, [registeredScrollElement]);

  useLayoutEffect(() => {
    tightLayoutRef.current = false;
    measure();
  }, [measure, registeredScrollElement]);

  useEffect(() => {
    const el = registeredScrollElement ?? defaultScrollRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, registeredScrollElement]);

  return {
    defaultScrollRef,
    isScrollable,
    usesExternalScroll: registeredScrollElement != null,
  };
}

type DashboardMainPanelProps = {
  children: ReactNode;
  showDetailPanel: boolean;
  contentRowClassName?: string;
  panelDataNodeId?: string;
};

/**
 * Weisses Hauptpanel: bei kurzem Inhalt unten `pb-4` + `rounded-xl`;
 * bei hoher Füllhöhe (scrollHeight/clientHeight > 90 %, Hysterese-Ausstieg 82 %) nur oben abgerundet, bis zum Viewport-Rand.
 */
function DashboardMainPanel({
  children,
  showDetailPanel,
  contentRowClassName,
  panelDataNodeId,
}: DashboardMainPanelProps) {
  const { defaultScrollRef, isScrollable, usesExternalScroll } =
    useDashboardMainPanelScrollable();
  const { registration: detailPanelRegistration } = useDashboardDetailPanel();

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-row",
        DASHBOARD_SHELL_CONTENT_ROW_PADDING_CLASS,
        isScrollable
          ? DASHBOARD_SHELL_CONTENT_ROW_PADDING_BOTTOM_SCROLL_CLASS
          : DASHBOARD_SHELL_CONTENT_ROW_PADDING_BOTTOM_INSET_CLASS,
        contentRowClassName,
      )}
      data-node-id="5435:11022"
    >
      <div
        data-node-id={panelDataNodeId}
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background",
          APPLICATION_CONTENT_PANEL_SHADOW_CLASS,
          showDetailPanel
            ? DASHBOARD_SHELL_MAIN_PANEL_PADDING_OPEN_CLASS
            : DASHBOARD_SHELL_MAIN_PANEL_PADDING_CLASS,
          isScrollable
            ? DASHBOARD_SHELL_MAIN_PANEL_ROUNDED_SCROLL_CLASS
            : DASHBOARD_SHELL_MAIN_PANEL_ROUNDED_INSET_CLASS,
        )}
      >
        {usesExternalScroll ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        ) : (
          <div
            ref={defaultScrollRef}
            className={dashboardMainPanelScrollAreaClass}
          >
            {children}
          </div>
        )}
      </div>
      <div
        className={cn(
          "shrink-0 overflow-hidden",
          showDetailPanel ? DASHBOARD_DETAIL_PANEL_WIDTH_CLASS : "w-0",
        )}
        aria-hidden={!showDetailPanel}
      >
        {showDetailPanel ? (
          <div
            className={cn(
              "h-full min-h-0 bg-stone-100",
              detailPanelScrollAreaClass,
              DASHBOARD_DETAIL_PANEL_PADDING_CLASS,
            )}
          >
            {detailPanelRegistration?.render()}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DashboardShellBody({
  children,
  workspaceAccountInitials = "NF",
  defaultSidebarCollapsed = false,
  variant,
  showTopBar,
  topItems,
  bottomItems,
  accountMenuNavItem,
  topBarLeadingSlot,
  topBarTrailingSlot,
}: DashboardShellProps) {
  const { collapsed, layoutMini, setCollapsed } =
    useSidebarCollapseState(defaultSidebarCollapsed);
  const isActive = useDashboardNavActive(variant);
  const { registration: detailPanelRegistration } = useDashboardDetailPanel();
  const showDetailPanel = detailPanelRegistration != null;

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-stone-100">
      <WorkspaceSidebar
        collapsed={collapsed}
        layoutMini={layoutMini}
        onCollapsedChange={setCollapsed}
        topItems={topItems}
        bottomItems={bottomItems}
        accountMenuNavItem={accountMenuNavItem}
        isActive={isActive}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {variant === "portal" ? (
          showTopBar ? (
            <PortalTopBar
              workspaceAccountInitials={workspaceAccountInitials}
              leadingSlot={topBarLeadingSlot!}
              trailingSlot={topBarTrailingSlot}
            />
          ) : (
            <div
              className={cn("shrink-0 bg-stone-100", PORTAL_DASHBOARD_RIM_HEIGHT_CLASS)}
              aria-hidden
            />
          )
        ) : (
          <WorkspaceTopBar
            workspaceAccountInitials={workspaceAccountInitials}
            leadingSlot={topBarLeadingSlot}
          />
        )}
        <DashboardMainPanel
          showDetailPanel={showDetailPanel}
          panelDataNodeId={variant === "workspace" ? "5354:9953" : undefined}
          contentRowClassName={
            variant === "portal" ? "pt-0" : showTopBar ? "pt-0" : "pt-3"
          }
        >
          {children}
        </DashboardMainPanel>
      </div>
    </div>
  );
}

function DashboardShell(props: DashboardShellProps) {
  return (
    <DashboardDetailPanelProvider>
      <DashboardMainPanelScrollProvider>
        <DashboardShellBody {...props} />
      </DashboardMainPanelScrollProvider>
    </DashboardDetailPanelProvider>
  );
}

const portalDefaultBackButton = (
  <Button
    asChild
    variant="ghost"
    size="sm"
    className="-ml-2 gap-2 px-2 text-muted-foreground hover:text-foreground"
  >
    <Link href="/portal/home">
      <ArrowLeft className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      Zurück
    </Link>
  </Button>
);

export function PortalDashboardShell({
  children,
  workspaceAccountInitials = "NF",
  showTopBar = false,
  defaultSidebarCollapsed = false,
}: PortalDashboardShellProps) {
  const portalToolbar = usePortalDashboardToolbar();

  const topItems = useMemo<DashboardNavItemConfig[]>(
    () => [
      {
        label: "Meine Anträge",
        href: "/portal/home",
        icon: <House className="size-4" strokeWidth={1.75} />,
      },
    ],
    [],
  );

  const accountMenuNavItem = useMemo<DashboardAccountMenuNavConfig>(
    () => ({
      label: "Profil",
      icon: <User className="size-4" strokeWidth={1.75} />,
      variant: "portal",
    }),
    [],
  );

  const bottomItems = useMemo<DashboardNavItemConfig[]>(
    () => [
      {
        label: "Einstellungen",
        href: "/portal/home?view=einstellungen",
        icon: <Settings className="size-4" strokeWidth={1.75} />,
      },
      {
        label: "Hilfe",
        href: "/portal/home?view=hilfe",
        icon: <CircleHelp className="size-4" strokeWidth={1.75} />,
      },
    ],
    [],
  );

  return (
    <DashboardShell
      variant="portal"
      showTopBar={showTopBar}
      workspaceAccountInitials={workspaceAccountInitials}
      defaultSidebarCollapsed={defaultSidebarCollapsed}
      topItems={topItems}
      bottomItems={bottomItems}
      accountMenuNavItem={accountMenuNavItem}
      topBarLeadingSlot={portalToolbar?.leadingSlot ?? portalDefaultBackButton}
      topBarTrailingSlot={portalToolbar?.trailingSlot ?? undefined}
    >
      {children}
    </DashboardShell>
  );
}

export function WorkspaceDashboardShell({
  children,
  workspaceAccountInitials = "NF",
  workspaceRole,
  tasksBadgeCount,
  defaultSidebarCollapsed = false,
}: WorkspaceDashboardShellProps) {
  const workspaceToolbar = useWorkspaceR2Toolbar();
  const showConsultationPlannerNav = workspaceShowsConsultationPlannerNav(workspaceRole);

  const topItems = useMemo<DashboardNavItemConfig[]>(
    () => [
      { label: "Home", href: "/workspace", icon: <House className="size-4" strokeWidth={1.75} /> },
      {
        label: "Meine Aufgaben",
        href: "/workspace?view=aufgaben",
        icon: <ClipboardList className="size-4" strokeWidth={1.75} />,
        badge: tasksBadgeCount,
      },
      ...(showConsultationPlannerNav
        ? [
            {
              label: "Beratungen planen",
              href: "/workspace?view=terminplaner",
              icon: <Calendar className="size-4" strokeWidth={1.75} />,
            },
          ]
        : []),
      {
        label: "Auswerten",
        href: "/workspace?view=auswerten",
        icon: <ChartPie className="size-4" strokeWidth={1.75} />,
      },
    ],
    [showConsultationPlannerNav, tasksBadgeCount],
  );

  const bottomItems = useMemo<DashboardNavItemConfig[]>(
    () => [
      {
        label: "Einstellungen",
        href: "/workspace?view=einstellungen",
        icon: <Settings className="size-4" strokeWidth={1.75} />,
      },
      {
        label: "Hilfe",
        href: "/workspace?view=hilfe",
        icon: <CircleHelp className="size-4" strokeWidth={1.75} />,
      },
    ],
    [],
  );

  return (
    <DashboardShell
      variant="workspace"
      showTopBar
      workspaceAccountInitials={workspaceAccountInitials}
      defaultSidebarCollapsed={defaultSidebarCollapsed}
      topItems={topItems}
      bottomItems={bottomItems}
      topBarLeadingSlot={workspaceToolbar?.leadingSlot ?? undefined}
    >
      {children}
    </DashboardShell>
  );
}
