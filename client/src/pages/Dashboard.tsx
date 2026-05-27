import JardiniaLayout from "@/components/JardiniaLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Plus, Leaf, FolderOpen, Settings, ChevronRight, Sparkles } from "lucide-react";
import { formatCreditBalance, hasAvailableCredits } from "@shared/credits";

function UserMessagesBanner() {
  const utils = trpc.useUtils();
  const { data: messages } = trpc.messages.unread.useQuery();
  const markRead = trpc.messages.markRead.useMutation({
    onSuccess: () => void utils.messages.unread.invalidate(),
  });

  if (!messages?.length) return null;

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="glass rounded-xl p-4 border border-primary/20 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
        >
          <div>
            <p className="font-medium text-sm">{msg.subject}</p>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{msg.body}</p>
          </div>
          <button
            type="button"
            className="btn-outline text-xs py-1.5 px-3 shrink-0"
            onClick={() => markRead.mutate({ ids: [msg.id] })}
          >
            Marquer comme lu
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();
  const { data: credits, isLoading: creditsLoading } = trpc.credits.balance.useQuery();

  const firstName = user?.name?.split(" ")[0] || "Professionnel";

  return (
    <JardiniaLayout
      title={
        <>
          Bonjour, <span className="text-gradient-green">{firstName}</span>
        </>
      }
      actions={
        <button
          type="button"
          onClick={() => navigate("/projects/new?new=1")}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Nouveau projet
        </button>
      }
    >
      <div className="p-6 md:p-8 space-y-8">
        <UserMessagesBanner />
        <p className="text-muted-foreground text-sm -mt-4">Gérez vos projets d&apos;aménagement IA</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-premium">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "oklch(54% 0.17 145 / 0.15)" }}
              >
                <Leaf size={18} style={{ color: "oklch(65% 0.16 145)" }} />
              </div>
              <span className="text-sm text-muted-foreground">Crédits disponibles</span>
            </div>
            {creditsLoading ? (
              <div className="shimmer h-8 w-16 rounded" />
            ) : (
              <div className="font-serif text-3xl font-bold text-gradient-green">
                {formatCreditBalance(credits)}
              </div>
            )}
            {!credits?.unlimited && (
            <button
              type="button"
              onClick={() => navigate("/credits")}
              className="text-xs mt-2 hover:underline"
              style={{ color: "oklch(65% 0.16 145)" }}
            >
              Acheter des crédits
            </button>
            )}
          </div>

          <div className="card-premium">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "oklch(72% 0.09 74 / 0.15)" }}
              >
                <FolderOpen size={18} style={{ color: "oklch(72% 0.09 74)" }} />
              </div>
              <span className="text-sm text-muted-foreground">Projets totaux</span>
            </div>
            {projectsLoading ? (
              <div className="shimmer h-8 w-16 rounded" />
            ) : (
              <div className="font-serif text-3xl font-bold text-gradient-sand">{projects?.length ?? 0}</div>
            )}
          </div>

          <div className="card-premium">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "oklch(54% 0.17 145 / 0.15)" }}
              >
                <Settings size={18} style={{ color: "oklch(65% 0.16 145)" }} />
              </div>
              <span className="text-sm text-muted-foreground">Projets terminés</span>
            </div>
            {projectsLoading ? (
              <div className="shimmer h-8 w-16 rounded" />
            ) : (
              <div className="font-serif text-3xl font-bold text-gradient-green">
                {projects?.filter((p) => p.status === "completed").length ?? 0}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl font-semibold">Mes projets</h2>
            {credits && !hasAvailableCredits(credits) && (
              <div className="text-sm text-muted-foreground glass px-4 py-2 rounded-full">
                Aucun crédit —{" "}
                <button
                  type="button"
                  onClick={() => navigate("/credits")}
                  className="underline"
                  style={{ color: "oklch(65% 0.16 145)" }}
                >
                  Acheter
                </button>
              </div>
            )}
          </div>

          {projectsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="shimmer h-20 rounded-2xl" />
              ))}
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className="card-premium card-interactive w-full text-left group"
                  onClick={() =>
                    navigate(
                      project.status === "draft"
                        ? `/projects/new?draft=${project.id}`
                        : `/projects/${project.id}`
                    )
                  }
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="dashboard-project-icon">
                        {project.spaceType === "interior"
                          ? "🏠"
                          : project.spaceType === "exterior"
                            ? "🌿"
                            : "🏡"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{project.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {project.style} ·{" "}
                          {project.spaceType === "interior"
                            ? "Intérieur"
                            : project.spaceType === "exterior"
                              ? "Extérieur"
                              : "Mixte"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={project.status} />
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {new Date(project.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty glass rounded-2xl p-12 md:p-16 text-center">
              <div className="dashboard-empty__icon">
                <Sparkles size={28} className="text-primary" />
              </div>
              <h3 className="font-serif text-2xl font-semibold mb-2">Aucun projet pour l&apos;instant</h3>
              <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
                Lancez le wizard — parcourez le brief gratuitement, connectez-vous à la fin pour générer
                votre compte rendu.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button type="button" onClick={() => navigate("/projects/new")} className="btn-primary">
                  Démarrer un projet
                </button>
                {!hasAvailableCredits(credits) && (
                  <button type="button" onClick={() => navigate("/credits")} className="btn-outline">
                    Acheter des crédits
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </JardiniaLayout>
  );
}
