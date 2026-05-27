import { trpc } from "@/lib/trpc";
import { GENERATION_STAGES, type GenerationStageId } from "@shared/projectWizard";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ProjectGenerationLoaderProps = {
  projectId: number;
  uploadPhase?: boolean;
  onComplete?: () => void;
  onFailed?: (message?: string) => void;
};

function resolveStageFromProject(data: {
  status: string;
  renderings?: unknown[];
  report?: unknown | null;
}): GenerationStageId {
  if (data.status === "completed" || data.report) return "report";
  if (data.renderings && data.renderings.length > 0) return "render";
  if (data.status === "processing") return "analyze";
  return "upload";
}

export function ProjectGenerationLoader({
  projectId,
  uploadPhase = false,
  onComplete,
  onFailed,
}: ProjectGenerationLoaderProps) {
  const [elapsed, setElapsed] = useState(0);

  const { data: project } = trpc.projects.get.useQuery(
    { id: projectId },
    {
      enabled: !!projectId && !uploadPhase,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "processing" || status === "draft" ? 3000 : false;
      },
    }
  );

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!project || uploadPhase) return;
    if (project.status === "completed") {
      onComplete?.();
    }
    if (project.status === "failed") {
      onFailed?.(project.lastError ?? undefined);
    }
  }, [project, uploadPhase, onComplete, onFailed]);

  const activeStageId = useMemo(() => {
    if (uploadPhase) return "upload" as GenerationStageId;
    if (!project) return "upload" as GenerationStageId;
    return resolveStageFromProject(project);
  }, [uploadPhase, project]);

  const activeIndex = GENERATION_STAGES.findIndex((s) => s.id === activeStageId);

  const progressPercent = useMemo(() => {
    if (uploadPhase) return 12;
    if (project?.status === "completed") return 100;
    const base = ((activeIndex + 1) / GENERATION_STAGES.length) * 85;
    const tick = Math.min(8, Math.floor(elapsed / 8));
    return Math.min(95, base + tick);
  }, [uploadPhase, project?.status, activeIndex, elapsed]);

  if (project?.status === "failed") {
    return (
      <div className="generation-loader generation-loader--failed">
        <div className="generation-loader__icon">
          <AlertCircle size={32} />
        </div>
        <h2 className="font-serif text-2xl font-bold mb-2">La génération a échoué</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
          Une erreur est survenue. Votre crédit a été remboursé automatiquement.
        </p>
        {project.lastError && (
          <p className="text-xs text-muted-foreground glass rounded-lg px-3 py-2 max-w-md mx-auto">
            {project.lastError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="generation-loader">
      <div className="generation-loader__orb" aria-hidden>
        <Loader2 size={36} className="animate-spin" />
      </div>

      <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Génération en cours</p>
      <h2 className="font-serif text-3xl font-bold mb-3 text-center">
        Préparation de votre compte rendu
      </h2>
      <p className="text-muted-foreground text-sm text-center max-w-lg mx-auto mb-10">
        Notre IA analyse vos photos et votre brief pour produire les rendus, le plan
        d&apos;aménagement et le dossier travaux complet. Comptez 2 à 5 minutes.
      </p>

      <div className="generation-loader__stages">
        {GENERATION_STAGES.map((stage, index) => {
          const done = index < activeIndex || project?.status === "completed";
          const active = index === activeIndex && project?.status !== "completed";
          return (
            <div
              key={stage.id}
              className={`generation-loader__stage ${done ? "generation-loader__stage--done" : ""} ${active ? "generation-loader__stage--active" : ""}`}
            >
              <div className="generation-loader__stage-icon">
                {done ? (
                  <Check size={16} />
                ) : active ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{stage.label}</p>
                <p className="text-xs text-muted-foreground">{stage.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="generation-loader__bar mt-10">
        <div className="generation-loader__bar-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <p className="text-xs text-muted-foreground text-center mt-3">
        {uploadPhase
          ? "Envoi des fichiers en cours…"
          : project?.status === "completed"
            ? "Compte rendu prêt !"
            : `Étape ${activeIndex + 1} sur ${GENERATION_STAGES.length}`}
      </p>
    </div>
  );
}
