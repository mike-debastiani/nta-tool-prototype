"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type DashboardDetailPanelRegistration = {
  signature: string;
  render: () => ReactNode;
};

type DashboardDetailPanelContextValue = {
  registration: DashboardDetailPanelRegistration | null;
  setRegistration: (registration: DashboardDetailPanelRegistration | null) => void;
};

const DashboardDetailPanelContext =
  createContext<DashboardDetailPanelContextValue | null>(null);

export function DashboardDetailPanelProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [registration, setRegistrationState] =
    useState<DashboardDetailPanelRegistration | null>(null);

  const setRegistration = useCallback(
    (next: DashboardDetailPanelRegistration | null) => {
      setRegistrationState((prev) => {
        if (prev === null && next === null) return prev;
        if (
          prev !== null
          && next !== null
          && prev.signature === next.signature
        ) {
          return prev;
        }
        return next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      registration,
      setRegistration,
    }),
    [registration, setRegistration],
  );

  return (
    <DashboardDetailPanelContext.Provider value={value}>
      {children}
    </DashboardDetailPanelContext.Provider>
  );
}

export function useDashboardDetailPanel() {
  const ctx = useContext(DashboardDetailPanelContext);
  if (!ctx) {
    throw new Error(
      "useDashboardDetailPanel must be used within DashboardDetailPanelProvider",
    );
  }
  return ctx;
}

/**
 * Registriert den rechten Detail-Panel-Inhalt in der Dashboard-Shell.
 * `signature` muss alle fachlichen Panel-Inputs abdecken (nicht das JSX-Element selbst).
 */
export function useRegisterDashboardDetailPanel(
  signature: string,
  render: () => ReactNode,
  enabled = true,
) {
  const { setRegistration } = useDashboardDetailPanel();
  const renderRef = useRef(render);
  renderRef.current = render;

  useLayoutEffect(() => {
    if (!enabled || !signature) {
      setRegistration(null);
      return;
    }

    setRegistration({
      signature,
      render: () => renderRef.current(),
    });
  }, [enabled, signature, setRegistration]);
}
