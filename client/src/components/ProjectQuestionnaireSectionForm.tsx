import {
  type BriefAnswers,
  type ProjectSpaceType,
  type QuestionnaireSection,
  isQuestionApplicable,
} from "@shared/projectQuestionnaire";

type ProjectQuestionnaireFormProps = {
  section: QuestionnaireSection;
  spaceType: ProjectSpaceType;
  answers: BriefAnswers;
  onChange: (id: string, value: string) => void;
};

export function ProjectQuestionnaireSectionForm({
  section,
  spaceType,
  answers,
  onChange,
}: ProjectQuestionnaireFormProps) {
  const questions = section.questions.filter((q) => isQuestionApplicable(q, spaceType));

  return (
    <div className="space-y-6">
      {section.description && (
        <p className="text-sm text-muted-foreground">{section.description}</p>
      )}
      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <label htmlFor={q.id} className="text-sm font-medium leading-snug">
            {q.label}
          </label>
          {q.type === "text" ? (
            <input
              id={q.id}
              className="input-premium"
              placeholder={q.placeholder}
              value={answers[q.id] ?? ""}
              onChange={(e) => onChange(q.id, e.target.value)}
            />
          ) : (
            <textarea
              id={q.id}
              className="input-premium resize-none"
              rows={q.rows ?? 3}
              placeholder={q.placeholder}
              value={answers[q.id] ?? ""}
              onChange={(e) => onChange(q.id, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
