import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";

export function useRequireAuth(options?: { requireAdmin?: boolean; enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const { user, isAuthenticated, loading, logout } = useAuth();

  useEffect(() => {
    if (!enabled) return;
    if (!loading && !isAuthenticated) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `${getLoginUrl()}?redirect=${redirect}`;
    }
  }, [enabled, loading, isAuthenticated]);

  const isAdmin = user?.role === "admin";
  const isAuthorized = isAuthenticated && (!options?.requireAdmin || isAdmin);

  return { user, isAuthenticated, loading, logout, isAdmin, isAuthorized };
}
