"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type WorkspaceR2ToolbarContextValue = {
  leadingSlot: ReactNode | null;
  setLeadingSlot: (node: ReactNode | null) => void;
};

const WorkspaceR2ToolbarContext = createContext<WorkspaceR2ToolbarContextValue | null>(
  null,
);

export function WorkspaceR2ToolbarProvider({ children }: { children: ReactNode }) {
  const [leadingSlot, setLeadingSlotState] = useState<ReactNode | null>(null);
  const setLeadingSlot = useCallback((node: ReactNode | null) => {
    setLeadingSlotState(node);
  }, []);

  const value = useMemo(
    () => ({ leadingSlot, setLeadingSlot }),
    [leadingSlot, setLeadingSlot],
  );

  return (
    <WorkspaceR2ToolbarContext.Provider value={value}>
      {children}
    </WorkspaceR2ToolbarContext.Provider>
  );
}

export function useWorkspaceR2Toolbar(): WorkspaceR2ToolbarContextValue | null {
  return useContext(WorkspaceR2ToolbarContext);
}
