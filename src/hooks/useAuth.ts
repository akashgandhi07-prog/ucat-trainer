/**
 * Re-export useAuth from AuthContext. Auth state is provided by AuthProvider
 * so it persists across navigation and prevents false "logged out" flashes.
 */
export { useAuth } from "../contexts/AuthContext";
