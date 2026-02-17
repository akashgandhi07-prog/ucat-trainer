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

export function useBugReportModal(): BugReportContextValue {
  const ctx = useContext(BugReportContext);
  if (!ctx) {
    throw new Error("useBugReportModal must be used within BugReportProvider");
  }
  return ctx;
}
