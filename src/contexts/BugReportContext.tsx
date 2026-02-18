import { createContext, useContext, useState, useCallback } from "react";
import BugReportModal from "../components/bug/BugReportModal";

type BugReportContextValue = {
  openBugReport: () => void;
  closeBugReport: () => void;
};

const BugReportContext = createContext<BugReportContextValue | null>(null);

export function BugReportProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openBugReport = useCallback(() => setIsOpen(true), []);
  const closeBugReport = useCallback(() => setIsOpen(false), []);

  return (
    <BugReportContext.Provider value={{ openBugReport, closeBugReport }}>
      {children}
      <BugReportModal isOpen={isOpen} onClose={closeBugReport} />
    </BugReportContext.Provider>
  );
}

/* eslint-disable-next-line react-refresh/only-export-components -- context exports Provider and hook */
export function useBugReportModal(): BugReportContextValue {
  const ctx = useContext(BugReportContext);
  if (!ctx) {
    throw new Error("useBugReportModal must be used within BugReportProvider");
  }
  return ctx;
}
