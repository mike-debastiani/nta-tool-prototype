"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

type DashboardMainPanelScrollContextValue = {
  scrollElement: HTMLElement | null;
  registerScrollElement: (element: HTMLElement | null) => void;
};

const DashboardMainPanelScrollContext =
  createContext<DashboardMainPanelScrollContextValue | null>(null);

export function DashboardMainPanelScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const registerScrollElement = useCallback((element: HTMLElement | null) => {
    setScrollElement(element);
  }, []);

  return (
    <DashboardMainPanelScrollContext.Provider
      value={{ scrollElement, registerScrollElement }}
    >
      {children}
    </DashboardMainPanelScrollContext.Provider>
  );
}

/** Callback-Ref für den Scroll-Container in edge-to-edge-Ansichten (Review, Adjustment). */
export function useDashboardScrollRoot<T extends HTMLElement>() {
  const ctx = useContext(DashboardMainPanelScrollContext);
  return useCallback(
    (node: T | null) => {
      ctx?.registerScrollElement(node);
    },
    [ctx],
  );
}

export function useDashboardMainPanelScrollElement() {
  return useContext(DashboardMainPanelScrollContext)?.scrollElement ?? null;
}
