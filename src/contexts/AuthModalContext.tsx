import { createContext, useContext, useState, useCallback } from "react";
import AuthModal from "../components/auth/AuthModal";

export type AuthModalMode = "login" | "register";

type AuthModalContextValue = {
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<AuthModalMode>("login");
  const openAuthModal = useCallback((mode?: AuthModalMode) => {
    setInitialMode(mode ?? "login");
    setIsOpen(true);
  }, []);
  const closeAuthModal = useCallback(() => setIsOpen(false), []);

  return (
    <AuthModalContext.Provider value={{ openAuthModal, closeAuthModal }}>
      {children}
      <AuthModal isOpen={isOpen} onClose={closeAuthModal} initialMode={initialMode} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return ctx;
}
