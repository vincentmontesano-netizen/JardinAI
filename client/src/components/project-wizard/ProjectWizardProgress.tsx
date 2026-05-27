import { WIZARD_MACRO_STEPS, type WizardMacroStepId } from "@shared/projectWizard";
import { Check } from "lucide-react";

type ProjectWizardProgressProps = {
  current: WizardMacroStepId;
};

export function ProjectWizardProgress({ current }: ProjectWizardProgressProps) {
  const currentIndex = WIZARD_MACRO_STEPS.findIndex((s) => s.id === current);

  return (
    <div className="wizard-progress">
      <div className="wizard-progress__track hidden lg:grid">
        {WIZARD_MACRO_STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <div
              key={step.id}
              className={`wizard-progress__step ${done ? "wizard-progress__step--done" : ""} ${active ? "wizard-progress__step--active" : ""}`}
            >
              <div className="wizard-progress__marker">
                {done ? <Check size={14} /> : String(index + 1).padStart(2, "0")}
              </div>
              <div className="wizard-progress__text">
                <span className="wizard-progress__label">{step.label}</span>
                <span className="wizard-progress__desc">{step.description}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="wizard-progress__mobile lg:hidden">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
          Étape {currentIndex + 1} / {WIZARD_MACRO_STEPS.length}
        </p>
        <p className="font-serif text-lg font-semibold">{WIZARD_MACRO_STEPS[currentIndex]?.label}</p>
        <p className="text-sm text-muted-foreground">{WIZARD_MACRO_STEPS[currentIndex]?.description}</p>
        <div className="wizard-progress__bar mt-3">
          <div
            className="wizard-progress__bar-fill"
            style={{ width: `${((currentIndex + 1) / WIZARD_MACRO_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
