import JardiniaLayout from "@/components/JardiniaLayout";
import { ProjectGenerationLoader } from "@/components/project-wizard/ProjectGenerationLoader";
import { StatusBadge } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import {
  getApplicableSections,
  isQuestionApplicable,
  type ProjectSpaceType,
} from "@shared/projectQuestionnaire";
import { useParams } from "wouter";
import { Loader2, RefreshCw, Download, RotateCcw } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id || "0");
  const reportRef = useRef<HTMLDivElement>(null);

  const retryProject = trpc.projects.retry.useMutation();
  const utils = trpc.useUtils();

  const handleRetry = async () => {
    try {
      await retryProject.mutateAsync({ projectId });
      toast.success("Génération relancée");
      await utils.projects.get.invalidate({ id: projectId });
      await utils.credits.balance.invalidate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Impossible de relancer la génération");
    }
  };

  const handleExportPdf = () => {
    window.print();
  };

  const { data: project, isLoading, refetch } = trpc.projects.get.useQuery(
    { id: projectId },
    {
      enabled: !!projectId,
      refetchInterval: (query) => {
        const d = query.state.data;
        return d?.status === "processing" ? 5000 : false;
      },
    }
  );

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.get("ready") === "1" && project?.report && reportRef.current) {
      reportRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [project?.report]);

  if (isLoading) {
    return (
      <JardiniaLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="animate-spin" size={32} style={{ color: "oklch(54% 0.17 145)" }} />
        </div>
      </JardiniaLayout>
    );
  }

  if (!project) {
    return (
      <JardiniaLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center glass rounded-2xl p-10">
            <div className="text-4xl mb-4">🌿</div>
            <h2 className="font-serif text-2xl font-bold mb-2">Projet introuvable</h2>
          </div>
        </div>
      </JardiniaLayout>
    );
  }

  return (
    <JardiniaLayout
      title={project.title}
      actions={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <StatusBadge status={project.status} />
          {project.status === "completed" && project.report && (
            <button
              type="button"
              onClick={handleExportPdf}
              className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1 print:hidden"
            >
              <Download size={12} />
              Exporter PDF
            </button>
          )}
          {project.status === "processing" && (
            <button
              type="button"
              onClick={() => refetch()}
              className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1"
            >
              <RefreshCw size={12} />
              Actualiser
            </button>
          )}
        </div>
      }
    >
      <div id="project-report" className="p-6 md:p-8 space-y-10 max-w-5xl mx-auto">
        {project.status === "processing" && (
          <ProjectGenerationLoader projectId={projectId} />
        )}

        {project.status === "failed" && (
          <div className="glass rounded-2xl p-8 text-center" style={{ borderColor: "oklch(55% 0.22 25 / 0.3)" }}>
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="font-serif text-xl font-bold mb-2">La génération a échoué</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Une erreur est survenue. Votre crédit a été remboursé automatiquement sur votre
              compte.
            </p>
            {"lastError" in project && project.lastError && (
              <p className="text-xs text-muted-foreground mb-4 glass rounded-lg px-3 py-2">
                {project.lastError}
              </p>
            )}
            <button
              type="button"
              onClick={handleRetry}
              disabled={retryProject.isPending}
              className="btn-primary inline-flex items-center gap-2"
            >
              {retryProject.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RotateCcw size={14} />
              )}
              Relancer la génération (1 crédit)
            </button>
          </div>
        )}

        {project.briefData && Object.keys(project.briefData).length > 0 && (
          <div className="card-premium">
            <h2 className="font-serif text-2xl font-bold mb-6">Brief client</h2>
            <div className="space-y-6">
              {getApplicableSections(project.spaceType as ProjectSpaceType).map((section) => {
                const entries = section.questions
                  .filter((q) => isQuestionApplicable(q, project.spaceType as ProjectSpaceType))
                  .map((q) => ({ label: q.label, value: project.briefData?.[q.id]?.trim() }))
                  .filter((e) => e.value);
                if (entries.length === 0) return null;
                return (
                  <div key={section.id}>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{section.title}</h3>
                    <dl className="space-y-3">
                      {entries.map((e) => (
                        <div key={e.label}>
                          <dt className="text-xs text-muted-foreground mb-1">{e.label}</dt>
                          <dd className="text-sm whitespace-pre-wrap">{e.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {project.photos && project.photos.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl font-bold mb-4">Photos originales</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {project.photos.map((photo, idx) => (
                <div key={photo.id} className="space-y-2">
                  <div className="rounded-xl overflow-hidden aspect-square">
                    <img
                      src={photo.url}
                      alt={photo.title || `Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {(photo.title || photo.originalName) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {photo.title || photo.originalName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {project.renderings && project.renderings.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl font-bold mb-4">Rendus IA — Avant / Après</h2>
            <div className="space-y-8">
              {project.renderings.map((rendering, idx) => {
                const originalPhoto = project.photos?.find((p) => p.id === rendering.originalPhotoId);
                return (
                  <div key={rendering.id} className="card-premium">
                    <div className="text-sm text-muted-foreground mb-4 font-medium">
                      {originalPhoto?.title || `Vue ${idx + 1}`}
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      {originalPhoto && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                            Avant
                          </div>
                          <div className="rounded-xl overflow-hidden aspect-video">
                            <img src={originalPhoto.url} alt="Avant" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      )}
                      <div>
                        <div
                          className="text-xs mb-2 uppercase tracking-wider font-semibold"
                          style={{ color: "oklch(65% 0.16 145)" }}
                        >
                          Après — Rendu IA
                        </div>
                        <div className="rounded-xl overflow-hidden aspect-video">
                          <img src={rendering.renderedUrl} alt="Après" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {project.report && (
          <div ref={reportRef} className="space-y-10">
            {project.report.planContent && (
              <div className="card-premium">
                <h2 className="font-serif text-2xl font-bold mb-6">Plan d&apos;aménagement</h2>
                <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                  <Streamdown>{project.report.planContent}</Streamdown>
                </div>
              </div>
            )}

            {project.report.roadmapContent && (
              <div className="card-premium">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <h2 className="font-serif text-2xl font-bold">Travaux, outillage & planning</h2>
                  {project.report.estimatedCostMin && (
                    <div className="glass rounded-xl px-4 py-2 text-right">
                      <div className="text-xs text-muted-foreground">Estimation</div>
                      <div className="font-serif text-lg font-bold text-gradient-green">
                        {Number(project.report.estimatedCostMin).toLocaleString("fr-FR")} —{" "}
                        {Number(project.report.estimatedCostMax).toLocaleString("fr-FR")} EUR
                      </div>
                    </div>
                  )}
                </div>
                <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                  <Streamdown>{project.report.roadmapContent}</Streamdown>
                </div>
              </div>
            )}

            {project.report.artisansList && (
              <div className="card-premium">
                <h2 className="font-serif text-2xl font-bold mb-4">Main d&apos;œuvre & artisans</h2>
                <div className="prose prose-invert max-w-none text-sm">
                  <Streamdown>{project.report.artisansList}</Streamdown>
                </div>
              </div>
            )}

            {project.report.purchasesList && (
              <div className="card-premium">
                <h2 className="font-serif text-2xl font-bold mb-4">Matériaux & fournitures</h2>
                <div className="prose prose-invert max-w-none text-sm">
                  <Streamdown>{project.report.purchasesList}</Streamdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </JardiniaLayout>
  );
}
