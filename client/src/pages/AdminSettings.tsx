import JardiniaLayout from "@/components/JardiniaLayout";
import { trpc } from "@/lib/trpc";
import {
  DEFAULT_GEMINI_IMAGE_MODEL,
  DEFAULT_GEMINI_TEXT_MODEL,
} from "@shared/appSettings";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function Field({
  label,
  hint,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <input
        type={type}
        className="input-premium w-full"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export default function AdminSettings() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.settings.get.useQuery();

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [textModel, setTextModel] = useState(DEFAULT_GEMINI_TEXT_MODEL);
  const [imageModel, setImageModel] = useState(DEFAULT_GEMINI_IMAGE_MODEL);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data) return;
    setTextModel(data.geminiTextModel);
    setImageModel(data.geminiImageModel);
    setApiKeyInput("");
    setDirty(false);
  }, [data]);

  const saveMutation = trpc.admin.settings.update.useMutation({
    onSuccess: async () => {
      toast.success("Paramètres enregistrés");
      setApiKeyInput("");
      setDirty(false);
      await utils.admin.settings.get.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    saveMutation.mutate({
      ...(apiKeyInput.trim() ? { geminiApiKey: apiKeyInput.trim() } : {}),
      geminiTextModel: textModel.trim() || undefined,
      geminiImageModel: imageModel.trim() || undefined,
    });
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
      title="Paramètres API Gemini"
      actions={
        <button
          type="button"
          disabled={!dirty || saveMutation.isPending}
          onClick={handleSave}
          className="btn-primary text-xs py-1.5 px-4 inline-flex items-center gap-1"
        >
          {saveMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Enregistrer
        </button>
      }
    >
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8">
        <p className="text-sm text-muted-foreground">
          Les clés et modèles sont stockés en base (prioritaires sur le fichier{" "}
          <code className="text-xs">.env</code>). Laissez le champ clé vide pour conserver la clé
          actuelle.
        </p>

        <div className="card-premium space-y-6">
          <Field
            label="Clé API Gemini"
            hint={
              data?.geminiApiKeyConfigured
                ? `Clé configurée : ${data.geminiApiKeyMasked ?? "••••••••"}`
                : "Aucune clé en base — repli sur GEMINI_API_KEY (.env) si défini"
            }
            value={apiKeyInput}
            onChange={(v) => {
              setApiKeyInput(v);
              setDirty(true);
            }}
            type="password"
            placeholder={data?.geminiApiKeyConfigured ? "Laisser vide pour ne pas modifier" : "AIza…"}
          />

          <Field
            label="Modèle texte (compte rendu)"
            hint="Variable .env : GEMINI_TEXT_MODEL"
            value={textModel}
            onChange={(v) => {
              setTextModel(v);
              setDirty(true);
            }}
            placeholder={DEFAULT_GEMINI_TEXT_MODEL}
          />

          <Field
            label="Modèle image (Nano Banana)"
            hint="Utilisez gemini-2.5-flash-image — évitez les variantes *-preview-image (quota free tier = 0)"
            value={imageModel}
            onChange={(v) => {
              setImageModel(v);
              setDirty(true);
            }}
            placeholder={DEFAULT_GEMINI_IMAGE_MODEL}
          />
        </div>

        <div className="glass rounded-xl p-4 text-xs text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Ordre de priorité :</strong> base de données →
            variables d&apos;environnement.
          </p>
          <p>
            Après modification, les prochaines générations utilisent la configuration en cache
            (invalidée à chaque enregistrement).
          </p>
        </div>
      </div>
    </JardiniaLayout>
  );
}
