import JardiniaLayout from "@/components/JardiniaLayout";
import { trpc } from "@/lib/trpc";
import {
  DEFAULT_LANDING_CONTENT,
  newLandingItemId,
  type LandingContent,
} from "@shared/landingContent";
import { ExternalLink, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type TabId = "hero" | "gallery" | "process" | "features" | "testimonials" | "sections" | "cta";

const TABS: { id: TabId; label: string }[] = [
  { id: "hero", label: "Hero" },
  { id: "gallery", label: "Galerie" },
  { id: "process", label: "Processus" },
  { id: "features", label: "Fonctionnalités" },
  { id: "testimonials", label: "Témoignages" },
  { id: "sections", label: "En-têtes & pied" },
  { id: "cta", label: "CTA final" },
];

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const className =
    "w-full px-3 py-2 rounded-lg text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary/40";
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea rows={3} className={className} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type="text" className={className} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function ItemCard({
  title,
  onDelete,
  children,
}: {
  title: string;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-4 space-y-3 border border-white/5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
          aria-label="Supprimer"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {children}
    </div>
  );
}

export default function AdminLandingEditor() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.landing.get.useQuery();
  const [draft, setDraft] = useState<LandingContent>(DEFAULT_LANDING_CONTENT);
  const [tab, setTab] = useState<TabId>("hero");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setDraft(structuredClone(data));
      setDirty(false);
    }
  }, [data]);

  const saveMutation = trpc.landing.save.useMutation({
    onSuccess: async () => {
      toast.success("Landing page enregistrée");
      setDirty(false);
      await utils.landing.get.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetMutation = trpc.landing.reset.useMutation({
    onSuccess: async (content) => {
      setDraft(structuredClone(content));
      setDirty(false);
      toast.success("Contenu réinitialisé aux valeurs par défaut");
      await utils.landing.get.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const patch = (updater: (prev: LandingContent) => LandingContent) => {
    setDraft((prev) => updater(structuredClone(prev)));
    setDirty(true);
  };

  if (isLoading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <JardiniaLayout
      requireAdmin
      title="Éditeur landing page"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <a href="/" target="_blank" rel="noreferrer" className="btn-outline text-xs py-1.5 px-3 inline-flex items-center gap-1">
            <ExternalLink size={14} />
            Aperçu
          </a>
          <button
            type="button"
            disabled={resetMutation.isPending}
            onClick={() => {
              if (confirm("Réinitialiser tout le contenu aux valeurs par défaut ?")) {
                resetMutation.mutate();
              }
            }}
            className="btn-outline text-xs py-1.5 px-3 inline-flex items-center gap-1"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            type="button"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => saveMutation.mutate(draft)}
            className="btn-primary text-xs py-1.5 px-4 inline-flex items-center gap-1"
          >
            {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Enregistrer
          </button>
        </div>
      }
    >
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <p className="text-sm text-muted-foreground">
          Modifiez, ajoutez ou supprimez les éléments de la page d&apos;accueil. Les changements sont visibles après
          enregistrement.
        </p>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                tab === t.id ? "bg-primary/20 text-primary border border-primary/30" : "glass text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "hero" && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Badge" value={draft.hero.pill} onChange={(v) => patch((d) => { d.hero.pill = v; return d; })} />
              <Field label="CTA principal" value={draft.hero.ctaPrimary} onChange={(v) => patch((d) => { d.hero.ctaPrimary = v; return d; })} />
              <Field label="Titre ligne 1" value={draft.hero.titleMain} onChange={(v) => patch((d) => { d.hero.titleMain = v; return d; })} />
              <Field label="Titre accent vert" value={draft.hero.titleAccentGreen} onChange={(v) => patch((d) => { d.hero.titleAccentGreen = v; return d; })} />
              <Field label="Titre accent sable" value={draft.hero.titleAccentSand} onChange={(v) => patch((d) => { d.hero.titleAccentSand = v; return d; })} />
              <Field label="CTA secondaire" value={draft.hero.ctaSecondary} onChange={(v) => patch((d) => { d.hero.ctaSecondary = v; return d; })} />
              <Field label="Image avant (URL)" value={draft.hero.beforeImage} onChange={(v) => patch((d) => { d.hero.beforeImage = v; return d; })} />
              <Field label="Image après (URL)" value={draft.hero.afterImage} onChange={(v) => patch((d) => { d.hero.afterImage = v; return d; })} />
            </div>
            <Field label="Description" value={draft.hero.description} multiline onChange={(v) => patch((d) => { d.hero.description = v; return d; })} />
            <Field label="Texte slider" value={draft.hero.sliderHint} onChange={(v) => patch((d) => { d.hero.sliderHint = v; return d; })} />

            <div className="flex items-center justify-between pt-2">
              <h3 className="font-medium text-sm">Statistiques hero</h3>
              <button
                type="button"
                className="btn-outline text-xs py-1 px-2 inline-flex items-center gap-1"
                onClick={() =>
                  patch((d) => {
                    d.heroStats.push({ id: newLandingItemId("stat"), icon: "sparkles", label: "Nouvelle stat" });
                    return d;
                  })
                }
              >
                <Plus size={12} /> Ajouter
              </button>
            </div>
            <div className="space-y-3">
              {draft.heroStats.map((stat, i) => (
                <ItemCard
                  key={stat.id}
                  title={`Stat #${i + 1}`}
                  onDelete={() => patch((d) => { d.heroStats = d.heroStats.filter((s) => s.id !== stat.id); return d; })}
                >
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Label" value={stat.label} onChange={(v) => patch((d) => { d.heroStats[i].label = v; return d; })} />
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Icône</span>
                      <select
                        className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border"
                        value={stat.icon}
                        onChange={(e) =>
                          patch((d) => {
                            d.heroStats[i].icon = e.target.value as typeof stat.icon;
                            return d;
                          })
                        }
                      >
                        <option value="filetext">Document</option>
                        <option value="clock">Horloge</option>
                        <option value="sparkles">Étoiles</option>
                      </select>
                    </label>
                  </div>
                </ItemCard>
              ))}
            </div>
          </div>
        )}

        {tab === "gallery" && (
          <div className="space-y-4">
            <Field label="Titre de section" value={draft.galleryLabel} onChange={(v) => patch((d) => { d.galleryLabel = v; return d; })} />
            <div className="flex justify-end">
              <button
                type="button"
                className="btn-outline text-xs py-1 px-2 inline-flex items-center gap-1"
                onClick={() =>
                  patch((d) => {
                    d.gallery.push({ id: newLandingItemId("gallery"), src: "", label: "Nouvelle image" });
                    return d;
                  })
                }
              >
                <Plus size={12} /> Ajouter une image
              </button>
            </div>
            {draft.gallery.map((item, i) => (
              <ItemCard
                key={item.id}
                title={item.label || `Image #${i + 1}`}
                onDelete={() => patch((d) => { d.gallery = d.gallery.filter((g) => g.id !== item.id); return d; })}
              >
                <Field label="URL image" value={item.src} onChange={(v) => patch((d) => { d.gallery[i].src = v; return d; })} />
                <Field label="Légende" value={item.label} onChange={(v) => patch((d) => { d.gallery[i].label = v; return d; })} />
              </ItemCard>
            ))}
          </div>
        )}

        {tab === "process" && (
          <div className="space-y-4">
            <Field label="Eyebrow" value={draft.process.header.eyebrow ?? ""} onChange={(v) => patch((d) => { d.process.header.eyebrow = v; return d; })} />
            <Field label="Titre" value={draft.process.header.title} onChange={(v) => patch((d) => { d.process.header.title = v; return d; })} />
            <Field label="Description" value={draft.process.header.description ?? ""} multiline onChange={(v) => patch((d) => { d.process.header.description = v; return d; })} />
            <Field label="Bouton CTA" value={draft.process.ctaLabel} onChange={(v) => patch((d) => { d.process.ctaLabel = v; return d; })} />
            <div className="flex justify-end">
              <button
                type="button"
                className="btn-outline text-xs py-1 px-2 inline-flex items-center gap-1"
                onClick={() =>
                  patch((d) => {
                    d.process.steps.push({
                      id: newLandingItemId("step"),
                      number: String(d.process.steps.length + 1).padStart(2, "0"),
                      title: "Nouvelle étape",
                      desc: "Description…",
                      image: "",
                    });
                    return d;
                  })
                }
              >
                <Plus size={12} /> Ajouter une étape
              </button>
            </div>
            {draft.process.steps.map((step, i) => (
              <ItemCard
                key={step.id}
                title={`Étape ${step.number}`}
                onDelete={() => patch((d) => { d.process.steps = d.process.steps.filter((s) => s.id !== step.id); return d; })}
              >
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="Numéro" value={step.number} onChange={(v) => patch((d) => { d.process.steps[i].number = v; return d; })} />
                  <Field label="Titre" value={step.title} onChange={(v) => patch((d) => { d.process.steps[i].title = v; return d; })} />
                </div>
                <Field label="Description" value={step.desc} multiline onChange={(v) => patch((d) => { d.process.steps[i].desc = v; return d; })} />
                <Field label="URL image" value={step.image} onChange={(v) => patch((d) => { d.process.steps[i].image = v; return d; })} />
              </ItemCard>
            ))}
          </div>
        )}

        {tab === "features" && (
          <div className="space-y-4">
            <Field label="Eyebrow section" value={draft.featuresSection.eyebrow ?? ""} onChange={(v) => patch((d) => { d.featuresSection.eyebrow = v; return d; })} />
            <Field label="Titre section" value={draft.featuresSection.title} onChange={(v) => patch((d) => { d.featuresSection.title = v; return d; })} />
            <div className="flex justify-end">
              <button
                type="button"
                className="btn-outline text-xs py-1 px-2 inline-flex items-center gap-1"
                onClick={() =>
                  patch((d) => {
                    d.features.push({ id: newLandingItemId("feature"), label: "Nouvelle fonctionnalité" });
                    return d;
                  })
                }
              >
                <Plus size={12} /> Ajouter
              </button>
            </div>
            {draft.features.map((f, i) => (
              <ItemCard
                key={f.id}
                title={`Fonctionnalité #${i + 1}`}
                onDelete={() => patch((d) => { d.features = d.features.filter((x) => x.id !== f.id); return d; })}
              >
                <Field label="Texte" value={f.label} onChange={(v) => patch((d) => { d.features[i].label = v; return d; })} />
              </ItemCard>
            ))}
          </div>
        )}

        {tab === "testimonials" && (
          <div className="space-y-4">
            <Field label="Titre section" value={draft.testimonials.title} onChange={(v) => patch((d) => { d.testimonials.title = v; return d; })} />
            <div className="flex justify-end">
              <button
                type="button"
                className="btn-outline text-xs py-1 px-2 inline-flex items-center gap-1"
                onClick={() =>
                  patch((d) => {
                    d.testimonials.items.push({
                      id: newLandingItemId("testimonial"),
                      quote: "Nouveau témoignage…",
                      name: "Nom",
                      role: "Métier · Ville",
                      avatar: "",
                    });
                    return d;
                  })
                }
              >
                <Plus size={12} /> Ajouter un témoignage
              </button>
            </div>
            {draft.testimonials.items.map((t, i) => (
              <ItemCard
                key={t.id}
                title={t.name}
                onDelete={() =>
                  patch((d) => {
                    d.testimonials.items = d.testimonials.items.filter((x) => x.id !== t.id);
                    return d;
                  })
                }
              >
                <Field label="Citation" value={t.quote} multiline onChange={(v) => patch((d) => { d.testimonials.items[i].quote = v; return d; })} />
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="Nom" value={t.name} onChange={(v) => patch((d) => { d.testimonials.items[i].name = v; return d; })} />
                  <Field label="Rôle / ville" value={t.role} onChange={(v) => patch((d) => { d.testimonials.items[i].role = v; return d; })} />
                </div>
                <Field label="URL avatar" value={t.avatar} onChange={(v) => patch((d) => { d.testimonials.items[i].avatar = v; return d; })} />
              </ItemCard>
            ))}
          </div>
        )}

        {tab === "sections" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-medium">Section tarifs</h3>
              <Field label="Eyebrow" value={draft.pricingSection.eyebrow ?? ""} onChange={(v) => patch((d) => { d.pricingSection.eyebrow = v; return d; })} />
              <Field label="Titre" value={draft.pricingSection.title} onChange={(v) => patch((d) => { d.pricingSection.title = v; return d; })} />
              <Field label="Description" value={draft.pricingSection.description ?? ""} multiline onChange={(v) => patch((d) => { d.pricingSection.description = v; return d; })} />
            </div>
            <div className="space-y-3">
              <h3 className="font-medium">Pied de page</h3>
              <Field label="Nom de marque" value={draft.footer.brandName} onChange={(v) => patch((d) => { d.footer.brandName = v; return d; })} />
              <Field label="Tagline" value={draft.footer.tagline} multiline onChange={(v) => patch((d) => { d.footer.tagline = v; return d; })} />
            </div>
          </div>
        )}

        {tab === "cta" && (
          <div className="space-y-4">
            <Field label="Titre" value={draft.cta.title} onChange={(v) => patch((d) => { d.cta.title = v; return d; })} />
            <Field label="Titre accent" value={draft.cta.titleAccent} onChange={(v) => patch((d) => { d.cta.titleAccent = v; return d; })} />
            <Field label="Description" value={draft.cta.description} multiline onChange={(v) => patch((d) => { d.cta.description = v; return d; })} />
            <Field label="Bouton" value={draft.cta.buttonLabel} onChange={(v) => patch((d) => { d.cta.buttonLabel = v; return d; })} />
            <Field label="Image de fond (URL)" value={draft.cta.backgroundImage} onChange={(v) => patch((d) => { d.cta.backgroundImage = v; return d; })} />
          </div>
        )}
      </div>
    </JardiniaLayout>
  );
}
