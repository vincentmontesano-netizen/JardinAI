import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AiBriefCriteria } from "@shared/wizardMeta";
import { Loader2, Sparkles } from "lucide-react";

type ProjectBriefAiStepProps = {
  criteria: AiBriefCriteria;
  onChange: (patch: Partial<AiBriefCriteria>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generated: boolean;
};

export function ProjectBriefAiStep({
  criteria,
  onChange,
  onGenerate,
  isGenerating,
  generated,
}: ProjectBriefAiStepProps) {
  const canGenerate =
    criteria.clientGoals.trim().length > 0 &&
    criteria.mainConstraints.trim().length > 0 &&
    criteria.desiredAmbiance.trim().length > 0;

  return (
    <div className="wizard-panel space-y-8 animate-fade-in-up max-w-2xl">
      <div>
        <h2 className="font-serif text-3xl font-bold mb-2">Brief IA — 3 critères</h2>
        <p className="text-muted-foreground text-sm">
          L&apos;IA génère un brief complet à partir de ces trois éléments. Vous pourrez ajuster le
          résultat plus tard si besoin.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="ai-goals">1. Objectifs du client *</Label>
          <Textarea
            id="ai-goals"
            rows={3}
            placeholder="Ex : créer un espace convivial pour recevoir, valoriser la vue jardin…"
            value={criteria.clientGoals}
            onChange={(e) => onChange({ clientGoals: e.target.value })}
            className="auth-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-constraints">2. Contraintes principales *</Label>
          <Textarea
            id="ai-constraints"
            rows={3}
            placeholder="Ex : budget serré, sol déjà carrelé, exposition nord, accès difficile…"
            value={criteria.mainConstraints}
            onChange={(e) => onChange({ mainConstraints: e.target.value })}
            className="auth-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-ambiance">3. Ambiance & usage souhaités *</Label>
          <Textarea
            id="ai-ambiance"
            rows={3}
            placeholder="Ex : zen et minimaliste, familial et ludique, premium hôtelier…"
            value={criteria.desiredAmbiance}
            onChange={(e) => onChange({ desiredAmbiance: e.target.value })}
            className="auth-input"
          />
        </div>
      </div>

      <button
        type="button"
        className="btn-primary inline-flex items-center gap-2"
        disabled={!canGenerate || isGenerating}
        onClick={onGenerate}
      >
        {isGenerating ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Génération du brief…
          </>
        ) : (
          <>
            <Sparkles size={16} />
            {generated ? "Régénérer le brief" : "Générer le brief avec l'IA"}
          </>
        )}
      </button>

      {generated && (
        <p className="text-sm text-muted-foreground glass rounded-lg px-4 py-3">
          Brief généré — passez à l&apos;étape photos ou revenez en arrière pour modifier les
          critères.
        </p>
      )}
    </div>
  );
}
