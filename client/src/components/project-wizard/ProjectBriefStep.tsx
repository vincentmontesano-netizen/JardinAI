import { ProjectQuestionnaireSectionForm } from "@/components/ProjectQuestionnaireSectionForm";
import type { BriefAnswers, ProjectSpaceType, QuestionnaireSection } from "@shared/projectQuestionnaire";
import { Check } from "lucide-react";

const BUDGETS = [
  { value: "< 5000", label: "Moins de 5 000 EUR" },
  { value: "5000-15000", label: "5 000 - 15 000 EUR" },
  { value: "15000-30000", label: "15 000 - 30 000 EUR" },
  { value: "30000-60000", label: "30 000 - 60 000 EUR" },
  { value: "> 60000", label: "Plus de 60 000 EUR" },
];

type ProjectBriefStepProps = {
  sections: QuestionnaireSection[];
  spaceType: ProjectSpaceType;
  answers: BriefAnswers;
  budget: string;
  sectionIndex: number;
  onSectionIndexChange: (index: number) => void;
  onChange: (id: string, value: string) => void;
  onBudgetChange: (value: string) => void;
};

function sectionAnswerCount(section: QuestionnaireSection, answers: BriefAnswers): number {
  return section.questions.filter((q) => answers[q.id]?.trim()).length;
}

export function ProjectBriefStep({
  sections,
  spaceType,
  answers,
  budget,
  sectionIndex,
  onSectionIndexChange,
  onChange,
  onBudgetChange,
}: ProjectBriefStepProps) {
  const currentSection = sections[sectionIndex];
  if (!currentSection) return null;

  const totalAnswered = Object.values(answers).filter((v) => v.trim()).length;

  return (
    <div className="wizard-brief">
      <aside className="wizard-brief__nav">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 px-2">
          {sections.length} thèmes · {totalAnswered} réponse{totalAnswered !== 1 ? "s" : ""}
        </p>
        <nav className="space-y-1">
          {sections.map((section, index) => {
            const answered = sectionAnswerCount(section, answers);
            const isActive = index === sectionIndex;
            const isDone = index < sectionIndex || answered > 0;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSectionIndexChange(index)}
                className={`wizard-brief__nav-item ${isActive ? "wizard-brief__nav-item--active" : ""}`}
              >
                <span className="wizard-brief__nav-index">
                  {isDone && !isActive ? <Check size={12} /> : index + 1}
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-sm font-medium leading-tight">{section.title}</span>
                  {answered > 0 && (
                    <span className="text-[10px] text-muted-foreground">{answered} rép.</span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="wizard-brief__content">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Thème {sectionIndex + 1} / {sections.length}
          </p>
          <h2 className="font-serif text-2xl md:text-3xl font-bold mb-2">{currentSection.title}</h2>
          {currentSection.description && (
            <p className="text-muted-foreground text-sm">{currentSection.description}</p>
          )}
          <p className="text-muted-foreground text-sm mt-2">
            Toutes les questions sont optionnelles — plus le brief est complet, plus le compte rendu
            sera précis.
          </p>
        </div>

        {currentSection.id === "budget" && (
          <div className="space-y-3 mb-6">
            <label className="text-sm font-medium">Fourchette budgétaire rapide</label>
            <div className="grid grid-cols-1 gap-2">
              {BUDGETS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => onBudgetChange(b.value)}
                  className="flex items-center gap-3 glass rounded-xl px-4 py-3 text-sm transition-all text-left"
                  style={{
                    border:
                      budget === b.value
                        ? "2px solid oklch(72% 0.09 74 / 0.6)"
                        : "1px solid oklch(54% 0.17 145 / 0.1)",
                    background: budget === b.value ? "oklch(72% 0.09 74 / 0.08)" : undefined,
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <ProjectQuestionnaireSectionForm
          section={currentSection}
          spaceType={spaceType}
          answers={answers}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
