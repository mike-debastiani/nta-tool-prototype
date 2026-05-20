"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { PortalDashboardToolbarProvider } from "@/components/domain/portal-dashboard-toolbar-context";
import {
  PortalDashboardShell,
  WorkspaceDashboardShell,
} from "@/components/domain/workspace-dashboard-shell";
import { WorkspaceR2ToolbarProvider } from "@/components/domain/workspace-r2-toolbar-context";

type RoleDashboardLayoutProps = {
  role: "R1" | "R2" | "R3" | "R4" | "R5" | "R6";
  userLabel: string;
  /** Initialen im Header-Avatar (R1 Portal + R2–R6 Workspace). */
  workspaceAccountInitials?: string;
  children: ReactNode;
  actions?: ReactNode;
  /** Workspace: Badge «Meine Aufgaben» (Figma nav_max). */
  workspaceTasksBadgeCount?: number;
  /**
   * Setzt die innere Inhaltsfläche auf edge-to-edge (kein zusätzliches Padding).
   * Genutzt für Vollflächen-Ansichten (z. B. R1-Antragsflow).
   */
  edgeToEdge?: boolean;
  /** Navigationsleiste initial eingeklappt (nur Icon-Leiste). */
  defaultSidebarCollapsed?: boolean;
};

export function RoleDashboardLayout({
  role,
  userLabel: _userLabel,
  workspaceAccountInitials = "NF",
  children,
  actions: _actions,
  workspaceTasksBadgeCount,
  edgeToEdge = false,
  defaultSidebarCollapsed = false,
}: RoleDashboardLayoutProps) {
  const pathname = usePathname();
  const isWorkspaceShell = role !== "R1";

  if (isWorkspaceShell) {
    return (
      <WorkspaceR2ToolbarProvider>
        <WorkspaceDashboardShell
          workspaceAccountInitials={workspaceAccountInitials}
          tasksBadgeCount={workspaceTasksBadgeCount}
          defaultSidebarCollapsed={defaultSidebarCollapsed}
        >
          {children}
        </WorkspaceDashboardShell>
      </WorkspaceR2ToolbarProvider>
    );
  }

  const showPortalTopBar = pathname.startsWith("/portal/antragserstellung");

  return (
    <PortalDashboardToolbarProvider>
      <PortalDashboardShell
        workspaceAccountInitials={workspaceAccountInitials}
        showTopBar={showPortalTopBar}
        defaultSidebarCollapsed={defaultSidebarCollapsed}
      >
        {edgeToEdge ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col p-6">{children}</div>
        )}
      </PortalDashboardShell>
    </PortalDashboardToolbarProvider>
  );
}
