import { createContext, useContext } from "react";

const AppShellContext = createContext(false);

export function AppShellProvider({
  children,
  value = true,
}: {
  children: React.ReactNode;
  value?: boolean;
}) {
  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with provider
export function useAppShell(): boolean {
  return useContext(AppShellContext);
}
