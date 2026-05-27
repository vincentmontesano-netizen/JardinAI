import type { AiBriefCriteria, BriefInputMode } from "@shared/wizardMeta";
import { Sparkles, ClipboardList } from "lucide-react";

type ProjectBriefModeStepProps = {
  value: BriefInputMode | null;
  onChange: (mode: BriefInputMode) => void;
};

export function ProjectBriefModeStep({ value, onChange }: ProjectBriefModeStepProps) {
  return (
    <div className="wizard-panel space-y-8 animate-fade-in-up">
      <div>
        <h2 className="font-serif text-3xl font-bold mb-2">Brief client</h2>
        <p className="text-muted-foreground text-sm">
          Choisissez comment renseigner le brief — vous pourrez le modifier ensuite.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onChange("ai")}
          className="card-premium text-left p-6 transition-all"
          style={{
            border:
              value === "ai"
                ? "2px solid oklch(54% 0.17 145 / 0.6)"
                : "1px solid oklch(54% 0.17 145 / 0.1)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(54% 0.17 145 / 0.15)" }}
            >
              <Sparkles size={20} style={{ color: "oklch(65% 0.16 145)" }} />
            </div>
            <span className="font-semibold">Automatisé par l&apos;IA</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Décrivez 3 critères clés (objectifs, contraintes, ambiance) — l&apos;IA complète le
            questionnaire pour vous.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChange("manual")}
          className="card-premium text-left p-6 transition-all"
          style={{
            border:
              value === "manual"
                ? "2px solid oklch(72% 0.09 74 / 0.6)"
                : "1px solid oklch(54% 0.17 145 / 0.1)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(72% 0.09 74 / 0.15)" }}
            >
              <ClipboardList size={20} style={{ color: "oklch(72% 0.09 74)" }} />
            </div>
            <span className="font-semibold">Manuel</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Parcourez le questionnaire thème par thème, comme un brief client classique.
          </p>
        </button>
      </div>
    </div>
  );
}

export type { AiBriefCriteria };
