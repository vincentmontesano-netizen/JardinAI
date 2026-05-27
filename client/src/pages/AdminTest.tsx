import JardiniaLayout from "@/components/JardiniaLayout";
import { trpc } from "@/lib/trpc";
import { TEST_PROJECT_TEMPLATES, type TestProjectSlot } from "@shared/testProjects";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const SLOT_LABELS: Record<TestProjectSlot, string> = {
  "1": "Test 1 — Intérieur / moderne",
  "2": "Test 2 — Extérieur / méditerranéen",
  "3": "Test 3 — Les deux / japonais",
};

export default function AdminTest() {
  const utils = trpc.useUtils();
  const { data: slots, isLoading } = trpc.admin.testProjects.list.useQuery();

  const ensureMutation = trpc.admin.testProjects.ensure.useMutation({
    onSuccess: async (results) => {
      toast.success(`${results.length} projets de test prêts`);
      await utils.admin.testProjects.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <JardiniaLayout
      requireAdmin
      title="Projets de test"
      actions={
        <button
          type="button"
          disabled={ensureMutation.isPending}
          onClick={() => ensureMutation.mutate()}
          className="btn-primary text-xs py-1.5 px-4 inline-flex items-center gap-1"
        >
          {ensureMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Créer / réinitialiser les 3 projets
        </button>
      }
    >
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
        <p className="text-sm text-muted-foreground">
          Chaque scénario crée un brouillon avec le brief client prérempli. Le wizard s&apos;ouvre
          directement à l&apos;étape <strong className="text-foreground">Photos</strong> — ajoutez
          vos images manuellement puis lancez la génération.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : (
          <div className="space-y-4">
            {(["1", "2", "3"] as const).map((slot) => {
              const template = TEST_PROJECT_TEMPLATES[slot];
              const row = slots?.find((r) => r.slot === slot);
              const projectId =
                row && "projectId" in row ? (row.projectId as number | null) : null;
              const status = row && "status" in row ? (row.status as string | null) : null;

              return (
                <div key={slot} className="card-premium space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-lg font-semibold">{SLOT_LABELS[slot]}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    </div>
                    {projectId ? (
                      <span className="text-xs glass px-2.5 py-1 rounded-full capitalize">
                        {status ?? "draft"} · #{projectId}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Non créé</span>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <dt className="font-medium text-foreground/80">Titre</dt>
                      <dd>{template.title}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground/80">Style</dt>
                      <dd className="capitalize">{template.style}</dd>
                    </div>
                  </dl>
                  <a
                    href={`/projects/new?test=${slot}`}
                    className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2 w-fit"
                  >
                    <ExternalLink size={14} />
                    Ouvrir le wizard (photos)
                  </a>
                </div>
              );
            })}
          </div>
        )}

        <div className="glass rounded-xl p-4 text-xs text-muted-foreground">
          <p>
            Utilisez « Créer / réinitialiser » pour (re)créer les 3 brouillons avec brief à jour et
            photos supprimées. Les projets sont marqués <code>_testSlot</code> dans le brief.
          </p>
        </div>
      </div>
    </JardiniaLayout>
  );
}
