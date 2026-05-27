import JardiniaLayout from "@/components/JardiniaLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import { Users, FolderOpen, TrendingUp, Shield, Plus, Pencil } from "lucide-react";
import { AdminUserManageDialog } from "@/components/admin/AdminUserManageDialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useState } from "react";
import { toast } from "sonner";

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="card-premium">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20`, color }}
        >
          {icon}
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="font-serif text-3xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function GrantCreditsCell({ userId, currentCredits }: { userId: number; currentCredits: number }) {
  const utils = trpc.useUtils();
  const [amount, setAmount] = useState("1");
  const grant = trpc.admin.grantCredits.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.balance} crédit${data.balance !== 1 ? "s" : ""} au total`);
      void utils.admin.users.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const parsed = parseInt(amount, 10);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-semibold min-w-[2ch]" style={{ color: "oklch(65% 0.16 145)" }}>
        {currentCredits}
      </span>
      <input
        type="number"
        min={1}
        max={999}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-16 px-2 py-1 rounded-lg text-sm bg-background border border-border"
        aria-label="Nombre de crédits à ajouter"
      />
      <button
        type="button"
        disabled={grant.isPending || !Number.isFinite(parsed) || parsed < 1}
        onClick={() => grant.mutate({ userId, amount: parsed })}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        style={{
          background: "oklch(54% 0.17 145 / 0.15)",
          color: "oklch(65% 0.16 145)",
          border: "1px solid oklch(54% 0.17 145 / 0.25)",
        }}
      >
        <Plus size={12} />
        Ajouter
      </button>
    </div>
  );
}

export default function AdminPanel() {
  const [manageUser, setManageUser] = useState<{
    id: number;
    name: string | null;
    email: string | null;
    role: "user" | "admin";
    credits?: number | null;
  } | null>(null);
  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery();
  const { data: allUsers, isLoading: usersLoading } = trpc.admin.users.useQuery();
  const { data: allProjects, isLoading: projectsLoading } = trpc.admin.projects.useQuery();

  return (
    <JardiniaLayout
      requireAdmin
      title={
        <span className="flex items-center gap-3">
          <Shield size={24} style={{ color: "oklch(72% 0.09 74)" }} />
          Administration
        </span>
      }
    >
      <div className="p-6 md:p-8 space-y-10 max-w-6xl mx-auto">
        <div>
          <h2 className="font-serif text-2xl font-bold mb-6">Vue d&apos;ensemble</h2>
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="shimmer h-28 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatCard
                icon={<Users size={18} />}
                label="Utilisateurs"
                value={stats?.totalUsers ?? 0}
                color="oklch(65% 0.16 145)"
              />
              <StatCard
                icon={<FolderOpen size={18} />}
                label="Projets totaux"
                value={stats?.totalProjects ?? 0}
                color="oklch(72% 0.09 74)"
              />
              <StatCard
                icon={<TrendingUp size={18} />}
                label="Revenus (EUR)"
                value={`${(stats?.totalRevenue ?? 0).toFixed(2)}`}
                color="oklch(65% 0.16 145)"
              />
              <StatCard
                icon={<Shield size={18} />}
                label="Projets terminés"
                value={stats?.completedProjects ?? 0}
                color="oklch(72% 0.09 74)"
              />
            </div>
          )}
        </div>

        {stats?.monthlyRevenue && stats.monthlyRevenue.length > 0 && (
          <div className="card-premium">
            <h2 className="font-serif text-xl font-bold mb-6">Revenus mensuels</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(20% 0.03 145)" />
                <XAxis dataKey="month" tick={{ fill: "oklch(65% 0.05 145)", fontSize: 12 }} />
                <YAxis tick={{ fill: "oklch(65% 0.05 145)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(14% 0.025 145)",
                    border: "1px solid oklch(54% 0.17 145 / 0.2)",
                    borderRadius: "0.75rem",
                    color: "oklch(94% 0.02 80)",
                  }}
                />
                <Bar dataKey="revenue" fill="oklch(54% 0.17 145)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div>
          <h2 className="font-serif text-2xl font-bold mb-2">Utilisateurs</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Gérez les comptes : crédits, modification, réinitialisation de mot de passe et messages.
          </p>
          {usersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="shimmer h-14 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid oklch(54% 0.17 145 / 0.1)" }}>
                    <th className="text-left px-6 py-4 text-muted-foreground font-medium">Utilisateur</th>
                    <th className="text-left px-6 py-4 text-muted-foreground font-medium">Email</th>
                    <th className="text-left px-6 py-4 text-muted-foreground font-medium">Rôle</th>
                    <th className="text-left px-6 py-4 text-muted-foreground font-medium">Crédits</th>
                    <th className="text-left px-6 py-4 text-muted-foreground font-medium">Inscription</th>
                    <th className="text-left px-6 py-4 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers?.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid oklch(54% 0.17 145 / 0.05)" }}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                            style={{ background: "var(--gradient-green)", color: "oklch(97% 0.01 145)" }}
                          >
                            {u.name?.[0]?.toUpperCase() || "U"}
                          </div>
                          <span className="font-medium">{u.name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{u.email || "—"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={u.role === "admin" ? "status-completed" : "status-draft"}
                          style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "9999px" }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.role === "admin" ? (
                          <span className="text-xs font-medium" style={{ color: "oklch(72% 0.09 74)" }}>
                            Illimité
                          </span>
                        ) : (
                          <GrantCreditsCell userId={u.id} currentCredits={u.credits ?? 0} />
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setManageUser(u)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={{
                            background: "oklch(72% 0.09 74 / 0.12)",
                            color: "oklch(72% 0.09 74)",
                            border: "1px solid oklch(72% 0.09 74 / 0.25)",
                          }}
                        >
                          <Pencil size={12} />
                          Gérer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 className="font-serif text-2xl font-bold mb-6">Tous les projets</h2>
          {projectsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="shimmer h-14 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid oklch(54% 0.17 145 / 0.1)" }}>
                    <th className="text-left px-6 py-4 text-muted-foreground font-medium">Projet</th>
                    <th className="text-left px-6 py-4 text-muted-foreground font-medium">Utilisateur</th>
                    <th className="text-left px-6 py-4 text-muted-foreground font-medium">Type</th>
                    <th className="text-left px-6 py-4 text-muted-foreground font-medium">Statut</th>
                    <th className="text-left px-6 py-4 text-muted-foreground font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {allProjects?.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid oklch(54% 0.17 145 / 0.05)" }}>
                      <td className="px-6 py-4 font-medium">{p.title}</td>
                      <td className="px-6 py-4 text-muted-foreground">{p.userName || `#${p.userId}`}</td>
                      <td className="px-6 py-4 text-muted-foreground capitalize">{p.spaceType}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AdminUserManageDialog
        user={manageUser}
        open={manageUser !== null}
        onOpenChange={(open) => {
          if (!open) setManageUser(null);
        }}
      />
    </JardiniaLayout>
  );
}
