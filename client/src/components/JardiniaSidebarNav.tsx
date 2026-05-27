import { formatCreditBalance, hasAvailableCredits, type CreditBalanceView } from "@shared/credits";
import {
  ChevronDown,
  CreditCard,
  FlaskConical,
  Globe,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Plus,
  Settings,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";

type JardiniaSidebarNavProps = {
  location: string;
  navigate: (path: string) => void;
  credits?: CreditBalanceView;
  user?: { name?: string | null; email?: string | null } | null;
  isAdmin?: boolean;
  onLogout: () => void;
  onNavigate?: () => void;
};

const ADMIN_SUB_ITEMS = [
  { label: "Vue d'ensemble", path: "/admin", icon: LayoutGrid },
  { label: "Paramètres", path: "/admin/settings", icon: Settings },
  { label: "Test", path: "/admin/test", icon: FlaskConical },
  { label: "Landing page", path: "/admin/landing", icon: Globe },
] as const;

function isAdminPath(path: string) {
  return path === "/admin" || path.startsWith("/admin/");
}

export function JardiniaSidebarNav({
  location,
  navigate,
  credits,
  user,
  isAdmin,
  onLogout,
  onNavigate,
}: JardiniaSidebarNavProps) {
  const [adminOpen, setAdminOpen] = useState(() => isAdminPath(location));

  useEffect(() => {
    if (isAdminPath(location)) setAdminOpen(true);
  }, [location]);

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Tableau de bord", path: "/dashboard" },
    { icon: CreditCard, label: "Crédits", path: "/credits" },
  ];

  return (
    <>
      <div className="p-6 border-b" style={{ borderColor: "oklch(54% 0.17 145 / 0.1)" }}>
        <button type="button" className="flex items-center gap-3 w-full text-left" onClick={() => go("/")}>
          <div
            className="w-8 h-8 rounded-full"
            style={{ background: "var(--gradient-green)", boxShadow: "var(--shadow-glow)" }}
          />
          <span className="font-serif text-lg font-semibold text-gradient-mixed">Jardinia</span>
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => go(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
              style={{
                background: active ? "oklch(54% 0.17 145 / 0.15)" : "transparent",
                color: active ? "oklch(65% 0.16 145)" : "oklch(65% 0.05 145)",
                border: active ? "1px solid oklch(54% 0.17 145 / 0.2)" : "1px solid transparent",
              }}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => go("/projects/new")}
          disabled={!hasAvailableCredits(credits)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 mt-2 disabled:opacity-40"
          style={{
            background: "oklch(54% 0.17 145 / 0.08)",
            color: "oklch(65% 0.16 145)",
            border: "1px solid oklch(54% 0.17 145 / 0.15)",
          }}
        >
          <Plus size={16} />
          Nouveau projet
        </button>

        {isAdmin && (
          <div className="mt-2 space-y-1">
            <button
              type="button"
              onClick={() => setAdminOpen((open) => !open)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
              style={{
                background: isAdminPath(location) ? "oklch(72% 0.09 74 / 0.15)" : "transparent",
                color: "oklch(72% 0.09 74)",
                border: isAdminPath(location)
                  ? "1px solid oklch(72% 0.09 74 / 0.2)"
                  : "1px solid transparent",
              }}
            >
              <Shield size={16} />
              <span className="flex-1 text-left">Administration</span>
              <ChevronDown
                size={14}
                className="transition-transform duration-200"
                style={{ transform: adminOpen ? "rotate(180deg)" : undefined }}
              />
            </button>

            {adminOpen && (
              <div
                className="ml-4 pl-3 space-y-0.5 border-l"
                style={{ borderColor: "oklch(72% 0.09 74 / 0.2)" }}
              >
                {ADMIN_SUB_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.path === "/admin"
                      ? location === "/admin"
                      : location === item.path || location.startsWith(`${item.path}/`);
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => go(item.path)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all duration-200"
                      style={{
                        background: active ? "oklch(72% 0.09 74 / 0.12)" : "transparent",
                        color: active ? "oklch(78% 0.1 74)" : "oklch(65% 0.06 74)",
                      }}
                    >
                      <Icon size={14} />
                      {item.label}
                    </button>
                  );
                })}
                <p
                  className="px-2.5 py-1.5 text-[10px] leading-snug"
                  style={{ color: "oklch(72% 0.09 74 / 0.85)" }}
                >
                  Crédits illimités
                </p>
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="p-4 border-t" style={{ borderColor: "oklch(54% 0.17 145 / 0.1)" }}>
        <div
          className="glass rounded-xl px-3 py-2.5 mb-3 flex items-center justify-between cursor-pointer"
          onClick={() => go("/credits")}
          onKeyDown={(e) => e.key === "Enter" && go("/credits")}
          role="button"
          tabIndex={0}
        >
          <span className="text-xs text-muted-foreground">Crédits</span>
          <span className="font-serif text-lg font-bold text-gradient-green">
            {formatCreditBalance(credits)}
          </span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
            style={{ background: "var(--gradient-green)", color: "oklch(97% 0.01 145)" }}
          >
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.name || "Utilisateur"}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email || ""}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut size={14} />
          Déconnexion
        </button>
      </div>
    </>
  );
}
