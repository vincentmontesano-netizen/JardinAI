import JardiniaLayout from "@/components/JardiniaLayout";
import { ProjectBriefStep } from "@/components/project-wizard/ProjectBriefStep";
import { ProjectGenerationLoader } from "@/components/project-wizard/ProjectGenerationLoader";
import { ProjectWizardProgress } from "@/components/project-wizard/ProjectWizardProgress";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  clearProjectWizardDraft,
  loadProjectWizardDraft,
  restorePhotosFromDraft,
  saveProjectWizardDraft,
  setPostPaymentRedirect,
  shouldStartFreshWizard,
} from "@/lib/projectWizardDraft";
import { trpc } from "@/lib/trpc";
import {
  getApplicableSections,
  type BriefAnswers,
  type ProjectSpaceType,
} from "@shared/projectQuestionnaire";
import type { WizardMacroStepId } from "@shared/projectWizard";
import { CREDIT_PRICING } from "@shared/pricing";
import { formatCreditBalance, hasAvailableCredits } from "@shared/credits";
import { isTestProjectSlot, type TestProjectSlot } from "@shared/testProjects";
import { useLocation } from "wouter";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

const STYLES = [
  { value: "moderne", label: "Moderne", icon: "🏙️" },
  { value: "naturel", label: "Naturel & Organique", icon: "🌿" },
  { value: "scandinave", label: "Scandinave", icon: "❄️" },
  { value: "mediterraneen", label: "Méditerranéen", icon: "☀️" },
  { value: "japonais", label: "Japonais / Zen", icon: "🎋" },
  { value: "industriel", label: "Industriel", icon: "🔩" },
  { value: "luxe", label: "Luxe contemporain", icon: "💎" },
  { value: "rustique", label: "Rustique / Campagne", icon: "🌾" },
];

const SPACE_OPTIONS: { value: ProjectSpaceType; label: string; icon: string; hint: string }[] = [
  { value: "interior", label: "Intérieur", icon: "🏠", hint: "Questions intérieur uniquement" },
  { value: "exterior", label: "Extérieur", icon: "🌿", hint: "Questions jardin & terrasse" },
  { value: "both", label: "Les deux", icon: "🏡", hint: "Questionnaire complet" },
];

type FlowPhase = "wizard" | "generating";

function Plus({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function getTestSlotFromUrl(): TestProjectSlot | null {
  const raw = new URLSearchParams(window.location.search).get("test");
  return raw && isTestProjectSlot(raw) ? raw : null;
}

export default function NewProject() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const testSlot = useMemo(() => getTestSlotFromUrl(), []);
  const hasTestSlot = testSlot !== null;
  const isAdminTestMode = user?.role === "admin" && hasTestSlot;
  const [testProjectId, setTestProjectId] = useState<number | null>(null);
  const [testLoadDone, setTestLoadDone] = useState(!hasTestSlot);

  const [flowPhase, setFlowPhase] = useState<FlowPhase>("wizard");
  const [macroStep, setMacroStep] = useState<WizardMacroStepId>("project");
  const [briefSectionIndex, setBriefSectionIndex] = useState(0);
  const [uploadPhase, setUploadPhase] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null);

  const [form, setForm] = useState({
    title: "",
    spaceType: "" as ProjectSpaceType | "",
    style: "",
    budget: "",
  });
  const [briefAnswers, setBriefAnswers] = useState<BriefAnswers>({});
  const [photos, setPhotos] = useState<{ file: File; preview: string; title: string }[]>([]);
  const [serverDraftId, setServerDraftId] = useState<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [draftSaveError, setDraftSaveError] = useState(false);

  const sections = useMemo(
    () => (form.spaceType ? getApplicableSections(form.spaceType) : []),
    [form.spaceType]
  );

  const utils = trpc.useUtils();
  const { data: credits } = trpc.credits.balance.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const createProject = trpc.projects.create.useMutation();
  const saveServerDraft = trpc.projects.saveDraft.useMutation({
    onSuccess: (data) => {
      if (data.id) setServerDraftId(data.id);
      void utils.projects.list.invalidate();
    },
  });
  const testProjectQuery = trpc.admin.testProjects.getBySlot.useQuery(
    { slot: testSlot ?? "1" },
    { enabled: hasTestSlot && isAuthenticated && user?.role === "admin" }
  );
  const getUploadUrl = trpc.projects.getUploadUrl.useMutation();
  const registerPhoto = trpc.projects.registerPhoto.useMutation();
  const generateProject = trpc.projects.generate.useMutation();

  const updateBrief = (id: string, value: string) => {
    setBriefAnswers((prev) => ({ ...prev, [id]: value }));
  };

  useEffect(() => {
    if (!hasTestSlot || authLoading || testLoadDone) return;

    if (!isAuthenticated) {
      const redirect = `/projects/new?test=${testSlot}`;
      navigate(`${getLoginUrl()}?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    if (!isAdminTestMode) {
      toast.error("Mode test réservé aux administrateurs.");
      navigate("/admin/test");
      setTestLoadDone(true);
      return;
    }

    if (testProjectQuery.isLoading) return;

    if (testProjectQuery.error) {
      toast.error(testProjectQuery.error.message);
      setTestLoadDone(true);
      return;
    }

    const data = testProjectQuery.data;
    if (!data) return;

    setForm({
      title: data.title,
      spaceType: data.spaceType,
      style: data.style,
      budget: data.budget ?? "",
    });
    setBriefAnswers(data.briefData);
    setTestProjectId(data.projectId);
    setMacroStep("photos");
    setBriefSectionIndex(0);
    setDraftRestored(true);
    setTestLoadDone(true);
    toast.success(`Mode test ${testSlot} — brief prérempli, ajoutez vos photos.`);
  }, [
    hasTestSlot,
    testLoadDone,
    authLoading,
    isAuthenticated,
    isAdminTestMode,
    testProjectQuery.isLoading,
    testProjectQuery.error,
    testProjectQuery.data,
    testSlot,
    navigate,
  ]);

  useEffect(() => {
    if (authLoading || draftRestored || isAdminTestMode) return;

    if (shouldStartFreshWizard()) {
      clearProjectWizardDraft();
      setDraftRestored(true);
      return;
    }

    const draft = loadProjectWizardDraft();
    if (!draft) {
      setDraftRestored(true);
      return;
    }

    void (async () => {
      setForm(draft.form);
      setBriefAnswers(draft.briefAnswers);
      setMacroStep(draft.macroStep);
      setBriefSectionIndex(draft.briefSectionIndex);
      if (draft.serverProjectId) setServerDraftId(draft.serverProjectId);
      const restoredPhotos = await restorePhotosFromDraft(draft);
      setPhotos(restoredPhotos);
      setDraftRestored(true);
      setLastSavedAt(draft.savedAt);
      toast.success("Brouillon restauré — reprenez où vous en étiez.");
    })();
  }, [authLoading, draftRestored, isAdminTestMode]);

  useEffect(() => {
    if (!draftRestored || isAdminTestMode || flowPhase !== "wizard") return;

    const hasContent =
      form.title.trim().length > 0 ||
      form.spaceType !== "" ||
      form.style.length > 0 ||
      photos.length > 0 ||
      Object.values(briefAnswers).some((value) => value.trim().length > 0);

    if (!hasContent) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          await saveProjectWizardDraft({
            form,
            briefAnswers,
            macroStep,
            briefSectionIndex,
            photos,
            serverProjectId: serverDraftId ?? undefined,
          });
          setLastSavedAt(Date.now());
          setDraftSaveError(false);

          if (isAuthenticated && form.title.trim() && form.spaceType) {
            const result = await saveServerDraft.mutateAsync({
              id: serverDraftId ?? undefined,
              title: form.title.trim(),
              spaceType: form.spaceType,
              style: form.style || undefined,
              budget: form.budget || undefined,
              briefData: briefAnswers,
            });
            if (result.id) setServerDraftId(result.id);
          }
        } catch {
          setDraftSaveError(true);
        }
      })();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [
    form,
    briefAnswers,
    macroStep,
    briefSectionIndex,
    photos,
    draftRestored,
    isAdminTestMode,
    flowPhase,
    isAuthenticated,
    serverDraftId,
    saveServerDraft,
  ]);

  const persistDraft = useCallback(async () => {
    await saveProjectWizardDraft({
      form,
      briefAnswers,
      macroStep,
      briefSectionIndex,
      photos,
      serverProjectId: serverDraftId ?? undefined,
    });
  }, [form, briefAnswers, macroStep, briefSectionIndex, photos, serverDraftId]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const newPhotos = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, 10 - photos.length)
        .map((file) => ({ file, preview: URL.createObjectURL(file), title: "" }));
      setPhotos((prev) => [...prev, ...newPhotos]);
    },
    [photos.length]
  );

  const removePhoto = (idx: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const updatePhotoTitle = (idx: number, title: string) => {
    setPhotos((prev) => prev.map((photo, i) => (i === idx ? { ...photo, title } : photo)));
  };

  const canProceedProject = form.title.trim().length > 0 && form.spaceType !== "";
  const canProceedStyle = form.style.length > 0;
  const canProceedPhotos = photos.length >= 1;

  const answeredCount = useMemo(
    () => Object.values(briefAnswers).filter((v) => v.trim().length > 0).length,
    [briefAnswers]
  );

  const spaceTypeLabel =
    form.spaceType === "interior"
      ? "Intérieur"
      : form.spaceType === "exterior"
        ? "Extérieur"
        : form.spaceType === "both"
          ? "Intérieur & extérieur"
          : "";

  const handleSubmit = async () => {
    if (!canProceedProject || !canProceedStyle || !canProceedPhotos || !form.spaceType) return;

    try {
      await persistDraft();
    } catch {
      toast.error("Impossible de sauvegarder le brouillon (stockage navigateur plein). Continuez quand même.");
    }

    if (!isAuthenticated) {
      toast.message("Connectez-vous pour générer votre compte rendu");
      navigate(`${getLoginUrl()}?redirect=${encodeURIComponent("/projects/new?resume=1")}`);
      return;
    }

    if (!hasAvailableCredits(credits)) {
      toast.message(`Achetez un crédit pour lancer la génération (${CREDIT_PRICING.single.displayEur} €)`);
      setPostPaymentRedirect("/projects/new?resume=1");
      navigate(`/credits?redirect=${encodeURIComponent("/projects/new?resume=1")}`);
      return;
    }

    setFlowPhase("generating");
    setMacroStep("report");
    setUploadPhase(true);

    try {
      let projectId = testProjectId ?? serverDraftId;
      if (!projectId) {
        const project = await createProject.mutateAsync({
          title: form.title,
          spaceType: form.spaceType,
          style: form.style,
          budget: form.budget || undefined,
          briefData: briefAnswers,
        });
        projectId = project.id;
      } else if (!testProjectId) {
        await saveServerDraft.mutateAsync({
          id: projectId,
          title: form.title.trim(),
          spaceType: form.spaceType,
          style: form.style,
          budget: form.budget || undefined,
          briefData: briefAnswers,
        });
      }

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const { uploadUrl, key, url } = await getUploadUrl.mutateAsync({
          projectId,
          fileName: photo.file.name,
          mimeType: photo.file.type,
        });

        const uploadResp = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": photo.file.type },
          body: photo.file,
        });

        if (!uploadResp.ok) {
          throw new Error(`Échec de l'upload de ${photo.file.name}`);
        }

        await registerPhoto.mutateAsync({
          projectId,
          storageKey: key,
          url,
          fileName: photo.file.name,
          title: photo.title.trim() || undefined,
          order: i,
        });
      }

      setUploadPhase(false);
      setCreatedProjectId(projectId);
      await generateProject.mutateAsync({ projectId });
      clearProjectWizardDraft();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      toast.error(message);
      setFlowPhase("wizard");
      setMacroStep("confirm");
      setUploadPhase(false);
      setCreatedProjectId(null);
    }
  };

  const goBack = () => {
    if (macroStep === "style") setMacroStep("project");
    else if (macroStep === "brief") {
      if (briefSectionIndex > 0) setBriefSectionIndex(briefSectionIndex - 1);
      else setMacroStep("style");
    } else if (macroStep === "photos") {
      if (isAdminTestMode) navigate("/admin/test");
      else setMacroStep("brief");
    } else if (macroStep === "confirm") setMacroStep("photos");
  };

  const goNext = () => {
    if (macroStep === "project" && canProceedProject) setMacroStep("style");
    else if (macroStep === "style" && canProceedStyle) {
      setBriefSectionIndex(0);
      setMacroStep("brief");
    } else if (macroStep === "brief") {
      if (briefSectionIndex < sections.length - 1) {
        setBriefSectionIndex(briefSectionIndex + 1);
      } else {
        setMacroStep("photos");
      }
    } else if (macroStep === "photos" && canProceedPhotos) {
      setMacroStep("confirm");
    }
  };

  const progressStep: WizardMacroStepId = flowPhase === "generating" ? "report" : macroStep;

  return (
    <JardiniaLayout
      requireAuth={false}
      showSidebar={false}
      title={
        flowPhase === "generating"
          ? "Génération du compte rendu"
          : isAdminTestMode
            ? `Test ${testSlot} — photos`
            : "Nouveau projet"
      }
      actions={
        <div className="flex items-center gap-3 text-sm flex-wrap justify-end">
          {flowPhase === "wizard" && draftRestored && !isAdminTestMode && (
            <span
              className={`text-xs ${draftSaveError ? "text-destructive" : "text-muted-foreground"}`}
              aria-live="polite"
            >
              {draftSaveError
                ? "Échec enregistrement brouillon"
                : lastSavedAt
                  ? `Brouillon enregistré à ${new Date(lastSavedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                  : "Enregistrement…"}
            </span>
          )}
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="btn-outline text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                Tableau de bord
              </button>
              <span className="text-muted-foreground">
                {formatCreditBalance(credits)} disponible
                {!credits?.unlimited && (credits?.balance ?? 0) !== 1 ? "s" : ""}
              </span>
            </>
          ) : flowPhase === "wizard" ? (
            <>
              <a href={getLoginUrl()} className="btn-outline text-xs py-1.5 px-3">
                Connexion
              </a>
              <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Accueil
              </a>
            </>
          ) : null}
        </div>
      }
    >
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <ProjectWizardProgress current={progressStep} />

        {hasTestSlot && !testLoadDone && (
          <div className="mt-16 flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="animate-spin" size={32} style={{ color: "oklch(54% 0.17 145)" }} />
            <p className="text-sm">Préparation du scénario de test…</p>
          </div>
        )}

        {flowPhase === "generating" && (
          <div className="mt-10 animate-fade-in-up">
            <ProjectGenerationLoader
              projectId={createdProjectId ?? 0}
              uploadPhase={uploadPhase || !createdProjectId}
              onComplete={() => {
                if (createdProjectId) {
                  toast.success("Compte rendu prêt !");
                  navigate(`/projects/${createdProjectId}?ready=1`);
                }
              }}
              onFailed={() => {
                if (createdProjectId) {
                  navigate(`/projects/${createdProjectId}`);
                }
              }}
            />
          </div>
        )}

        {flowPhase === "wizard" && !(hasTestSlot && !testLoadDone) && macroStep === "project" && (
          <div className="wizard-panel space-y-8 animate-fade-in-up">
            <div>
              <h2 className="font-serif text-3xl font-bold mb-2">Votre projet</h2>
              <p className="text-muted-foreground text-sm">
                Nommez le projet et choisissez le type d&apos;espace — l&apos;interrogatoire client
                s&apos;adapte automatiquement.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nom du projet *</label>
              <input
                className="input-premium"
                placeholder="Ex : Jardin villa Dupont, Rénovation salon Paris 11e…"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Type d&apos;espace *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SPACE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, spaceType: opt.value })}
                    className="glass rounded-xl p-4 text-left transition-all duration-200"
                    style={{
                      border:
                        form.spaceType === opt.value
                          ? "2px solid oklch(54% 0.17 145 / 0.6)"
                          : "1px solid oklch(54% 0.17 145 / 0.1)",
                      background:
                        form.spaceType === opt.value ? "oklch(54% 0.17 145 / 0.1)" : undefined,
                    }}
                  >
                    <div className="text-2xl mb-2">{opt.icon}</div>
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{opt.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {form.spaceType && (
              <p className="text-xs text-muted-foreground glass rounded-lg px-3 py-2">
                {sections.length} thèmes d&apos;interrogatoire pour {spaceTypeLabel.toLowerCase()}.
              </p>
            )}

            <WizardNav
              onNext={goNext}
              nextDisabled={!canProceedProject}
              nextLabel="Continuer"
              hideBack
            />
          </div>
        )}

        {flowPhase === "wizard" && macroStep === "style" && (
          <div className="wizard-panel space-y-8 animate-fade-in-up">
            <div>
              <h2 className="font-serif text-3xl font-bold mb-2">Style souhaité</h2>
              <p className="text-muted-foreground text-sm">
                Ce choix oriente les rendus IA et le compte rendu esthétique.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm({ ...form, style: s.value })}
                  className="flex items-center gap-3 glass rounded-xl px-4 py-3 text-sm transition-all duration-200"
                  style={{
                    border:
                      form.style === s.value
                        ? "2px solid oklch(54% 0.17 145 / 0.6)"
                        : "1px solid oklch(54% 0.17 145 / 0.1)",
                    background: form.style === s.value ? "oklch(54% 0.17 145 / 0.1)" : undefined,
                  }}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>

            <WizardNav
              onBack={goBack}
              onNext={goNext}
              nextDisabled={!canProceedStyle}
              nextLabel="Commencer le brief client"
            />
          </div>
        )}

        {flowPhase === "wizard" && macroStep === "brief" && form.spaceType && (
          <div className="wizard-panel animate-fade-in-up">
            <ProjectBriefStep
              sections={sections}
              spaceType={form.spaceType}
              answers={briefAnswers}
              budget={form.budget}
              sectionIndex={briefSectionIndex}
              onSectionIndexChange={setBriefSectionIndex}
              onChange={updateBrief}
              onBudgetChange={(budget) => setForm({ ...form, budget })}
            />
            <WizardNav
              onBack={goBack}
              onNext={goNext}
              nextLabel={
                briefSectionIndex === sections.length - 1 ? "Passer aux photos" : "Thème suivant"
              }
            />
          </div>
        )}

        {flowPhase === "wizard" && macroStep === "photos" && (
          <div className="wizard-panel space-y-8 animate-fade-in-up">
            <div>
              <h2 className="font-serif text-3xl font-bold mb-2">Photos du lieu</h2>
              <p className="text-muted-foreground text-sm">
                {isAdminTestMode ? (
                  <>
                    Mode test admin : le brief est déjà rempli. Ajoutez vos photos de test puis
                    passez au récapitulatif.
                  </>
                ) : (
                  <>
                    Minimum 1 photo, maximum 10. Donnez un titre à chaque vue (ex. « Salon », «
                    Terrasse »). L&apos;IA s&apos;appuie sur vos visuels et le brief (
                    {answeredCount} réponse{answeredCount !== 1 ? "s" : ""}).
                  </>
                )}
              </p>
            </div>

            <div
              className="upload-zone"
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="mx-auto mb-3" style={{ color: "oklch(54% 0.17 145)" }} />
              <p className="text-sm font-medium mb-1">Glissez vos photos ici</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WEBP</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="relative group rounded-xl overflow-hidden aspect-square">
                      <img
                        src={photo.preview}
                        alt={photo.title || `Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "oklch(0% 0 0 / 0.7)" }}
                      >
                        <X size={12} style={{ color: "white" }} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={photo.title}
                      onChange={(e) => updatePhotoTitle(idx, e.target.value)}
                      placeholder={`Titre de la photo ${idx + 1}`}
                      maxLength={255}
                      className="w-full rounded-lg px-3 py-2 text-sm bg-background/50 border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                ))}
                {photos.length < 10 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl flex items-center justify-center text-muted-foreground"
                    style={{ border: "2px dashed oklch(54% 0.17 145 / 0.2)" }}
                  >
                    <Plus size={24} />
                  </button>
                )}
              </div>
            )}

            <WizardNav
              onBack={goBack}
              onNext={goNext}
              nextDisabled={!canProceedPhotos || (isAdminTestMode && !testLoadDone)}
              nextLabel="Voir le récapitulatif"
            />
          </div>
        )}

        {flowPhase === "wizard" && macroStep === "confirm" && (
          <div className="wizard-panel space-y-8 animate-fade-in-up">
            <div>
              <h2 className="font-serif text-3xl font-bold mb-2">Validation & lancement</h2>
              <p className="text-muted-foreground text-sm">
                Vérifiez le récapitulatif. La génération produira rendus, plan et compte rendu
                complet.
              </p>
            </div>

            <div className="card-premium space-y-4">
              <RecapRow label="Projet" value={form.title} />
              <RecapRow label="Type" value={spaceTypeLabel} />
              <RecapRow label="Style" value={form.style} capitalize />
              {form.budget && <RecapRow label="Budget" value={form.budget} />}
              <RecapRow
                label="Brief client"
                value={`${sections.length} thèmes · ${answeredCount} réponse${answeredCount !== 1 ? "s" : ""}`}
              />
              <RecapRow
                label="Photos"
                value={
                  photos.some((p) => p.title.trim())
                    ? photos
                        .map((p, i) => p.title.trim() || `Photo ${i + 1}`)
                        .join(" · ")
                    : `${photos.length} photo${photos.length > 1 ? "s" : ""}`
                }
              />
              <div className="section-divider my-2" />
              <div className="flex justify-between text-sm font-semibold">
                <span>Coût</span>
                <span className="text-gradient-green">1 crédit</span>
              </div>
            </div>

            <div className="glass rounded-xl p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Ce que vous recevrez :</p>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>Rendus avant / après photoréalistes</li>
                <li>Plan d&apos;aménagement détaillé</li>
                <li>Travaux, outillage & planning</li>
                <li>Matériaux, main d&apos;œuvre & fourchette de coûts</li>
              </ul>
            </div>

            {!isAuthenticated && (
              <div className="glass rounded-xl p-4 text-sm">
                <p className="font-medium mb-1">Presque terminé</p>
                <p className="text-muted-foreground">
                  Parcourez tout le wizard librement. À la génération, vous serez invité à vous
                  connecter puis à acheter 1 crédit ({CREDIT_PRICING.single.displayEur} €) si besoin.
                </p>
              </div>
            )}

            {isAuthenticated && !hasAvailableCredits(credits) && (
              <div
                className="glass rounded-xl p-4 text-center"
                style={{ borderColor: "oklch(55% 0.22 25 / 0.3)" }}
              >
                <p className="text-sm" style={{ color: "oklch(65% 0.22 25)" }}>
                  Vous n&apos;avez plus de crédits.{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/credits?redirect=%2Fprojects%2Fnew%3Fresume%3D1")}
                    className="underline"
                  >
                    Acheter des crédits
                  </button>
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={goBack} className="btn-outline flex items-center gap-2">
                <ArrowLeft size={16} />
                Retour
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {!isAuthenticated
                  ? "Se connecter et générer ✨"
                  : !hasAvailableCredits(credits)
                    ? "Acheter un crédit et générer ✨"
                    : "Générer le compte rendu ✨"}
              </button>
            </div>
          </div>
        )}
      </div>
    </JardiniaLayout>
  );
}

function RecapRow({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`font-medium text-right ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}

function WizardNav({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Continuer",
  hideBack,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  hideBack?: boolean;
}) {
  return (
    <div className="flex gap-3 pt-4">
      {!hideBack && onBack && (
        <button type="button" onClick={onBack} className="btn-outline flex items-center gap-2">
          <ArrowLeft size={16} />
          Retour
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="btn-primary flex-1 flex items-center justify-center gap-2"
        style={{ opacity: nextDisabled ? 0.5 : 1 }}
      >
        {nextLabel}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
