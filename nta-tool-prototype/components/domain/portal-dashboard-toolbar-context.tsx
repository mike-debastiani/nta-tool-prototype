"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PortalDashboardToolbarContextValue = {
  leadingSlot: ReactNode | null;
  trailingSlot: ReactNode | null;
  setLeadingSlot: (node: ReactNode | null) => void;
  setTrailingSlot: (node: ReactNode | null) => void;
};

const PortalDashboardToolbarContext = createContext<PortalDashboardToolbarContextValue | null>(
  null,
);

export function PortalDashboardToolbarProvider({ children }: { children: ReactNode }) {
  const [leadingSlot, setLeadingSlotState] = useState<ReactNode | null>(null);
  const [trailingSlot, setTrailingSlotState] = useState<ReactNode | null>(null);
  const setLeadingSlot = useCallback((node: ReactNode | null) => {
    setLeadingSlotState(node);
  }, []);
  const setTrailingSlot = useCallback((node: ReactNode | null) => {
    setTrailingSlotState(node);
  }, []);

  const value = useMemo(
    () => ({ leadingSlot, trailingSlot, setLeadingSlot, setTrailingSlot }),
    [leadingSlot, trailingSlot, setLeadingSlot, setTrailingSlot],
  );

  return (
    <PortalDashboardToolbarContext.Provider value={value}>
      {children}
    </PortalDashboardToolbarContext.Provider>
  );
}

export function usePortalDashboardToolbar(): PortalDashboardToolbarContextValue | null {
  return useContext(PortalDashboardToolbarContext);
}
