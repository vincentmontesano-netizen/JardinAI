import { useAuth } from "@/_core/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { Loader2, Menu } from "lucide-react";
import { JardiniaSidebarNav } from "./JardiniaSidebarNav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type JardiniaLayoutProps = {
  children: React.ReactNode;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  requireAdmin?: boolean;
  requireAuth?: boolean;
  showSidebar?: boolean;
};

export default function JardiniaLayout({
  children,
  title,
  actions,
  requireAdmin = false,
  requireAuth = true,
  showSidebar = true,
}: JardiniaLayoutProps) {
  const authGate = useRequireAuth({ requireAdmin, enabled: requireAuth });
  const session = useAuth();
  const user = requireAuth ? authGate.user : session.user;
  const isAuthenticated = requireAuth ? authGate.isAuthenticated : session.isAuthenticated;
  const loading = requireAuth ? authGate.loading : session.loading;
  const logout = requireAuth ? authGate.logout : session.logout;
  const isAuthorized = requireAuth ? authGate.isAuthorized : true;
  const isAdmin = requireAuth ? authGate.isAdmin : session.user?.role === "admin";
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: credits } = trpc.credits.balance.useQuery(undefined, {
    enabled: isAuthorized && isAuthenticated,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin" size={32} style={{ color: "oklch(54% 0.17 145)" }} />
      </div>
    );
  }

  if (requireAuth && !isAuthorized) {
    if (requireAdmin && user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center glass rounded-2xl p-10 max-w-md mx-4">
            <h2 className="font-serif text-2xl font-bold mb-2">Accès refusé</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Vous n&apos;avez pas les droits d&apos;administration.
            </p>
            <button type="button" onClick={() => navigate("/dashboard")} className="btn-outline">
              Retour au tableau de bord
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const sidebarProps = {
    location,
    navigate,
    credits,
    user,
    isAdmin,
    onLogout: handleLogout,
    onNavigate: () => setMobileOpen(false),
  };

  const showNav = showSidebar && isAuthenticated;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {showNav && (
        <aside
          className="hidden md:flex w-64 min-h-screen flex-col shrink-0"
          style={{
            background: "var(--dark-surface)",
            borderRight: "1px solid oklch(54% 0.17 145 / 0.1)",
          }}
        >
          <JardiniaSidebarNav {...sidebarProps} />
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {(title || actions || showNav || !requireAuth) && (
          <div
            className="p-4 md:p-8 border-b shrink-0 print:hidden"
            style={{ borderColor: "oklch(54% 0.17 145 / 0.1)" }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {showNav && (
                  <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger asChild>
                      <button
                        type="button"
                        className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl glass"
                        aria-label="Ouvrir le menu"
                      >
                        <Menu size={18} />
                      </button>
                    </SheetTrigger>
                    <SheetContent
                      side="left"
                      className="w-72 p-0 border-r md:hidden"
                      style={{
                        background: "var(--dark-surface)",
                        borderColor: "oklch(54% 0.17 145 / 0.1)",
                      }}
                    >
                      <div className="flex flex-col h-full">
                        <JardiniaSidebarNav {...sidebarProps} />
                      </div>
                    </SheetContent>
                  </Sheet>
                )}
                {title && (
                  <h1 className="font-serif text-xl md:text-3xl font-bold truncate">{title}</h1>
                )}
              </div>
              {actions}
            </div>
          </div>
        )}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
