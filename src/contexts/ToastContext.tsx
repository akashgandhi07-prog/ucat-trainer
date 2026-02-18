import { createContext, useContext, useCallback } from "react";
import { toast as sonnerToast } from "sonner";

export type ToastVariant = "success" | "error" | "info" | "default";

export type ToastOptions = {
  variant?: ToastVariant;
  duration?: number;
};

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 3000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const duration = options?.duration ?? DEFAULT_DURATION;
    const variant = options?.variant ?? "default";
    switch (variant) {
      case "success":
        sonnerToast.success(message, { duration });
        break;
      case "error":
        sonnerToast.error(message, { duration });
        break;
      case "info":
        sonnerToast.info(message, { duration });
        break;
      default:
        sonnerToast(message, { duration });
    }
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
    </ToastContext.Provider>
  );
}

/* eslint-disable-next-line react-refresh/only-export-components -- context exports Provider and hook */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
