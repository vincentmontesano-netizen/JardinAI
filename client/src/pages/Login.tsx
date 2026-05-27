import { useAuth } from "@/_core/hooks/useAuth";
import { BeforeAfterSlider } from "@/components/landing/BeforeAfterSlider";
import { getOAuthLoginUrl } from "@/const";
import { HERO_PROJECT } from "@/data/landingContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Leaf, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type AuthMode = "login" | "register";

function getRedirectTarget(): string {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }
  return "/dashboard";
}

export default function Login() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading, refresh } = useAuth();
  const utils = trpc.useUtils();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const oauthError = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("error");
  }, []);

  useEffect(() => {
    if (oauthError === "oauth") {
      toast.error("La connexion OAuth a échoué. Réessayez ou utilisez email / mot de passe.");
    }
  }, [oauthError]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(getRedirectTarget());
    }
  }, [authLoading, isAuthenticated, navigate]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      utils.auth.me.setData(undefined, data.user);
      await refresh();
      navigate(getRedirectTarget());
    },
    onError: (error) => {
      toast.error(error.message || "Connexion impossible");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async (data) => {
      utils.auth.me.setData(undefined, data.user);
      await refresh();
      navigate(getRedirectTarget());
    },
    onError: (error) => {
      toast.error(error.message || "Inscription impossible");
    },
  });

  const isPending = loginMutation.isPending || registerMutation.isPending;
  const oauthUrl = getOAuthLoginUrl();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "login") {
      loginMutation.mutate({ email, password });
      return;
    }
    registerMutation.mutate({
      email,
      password,
      name: name.trim() || undefined,
    });
  };

  if (authLoading) {
    return (
      <div className="auth-page flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="auth-page min-h-screen">
      <div className="auth-page__glow" aria-hidden />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2 lg:gap-12 px-6 py-8">
        <div className="hidden lg:flex flex-col justify-center py-8">
          <p className="landing-section-eyebrow mb-4">Rendu IA sur photo réelle</p>
          <h2 className="font-serif text-4xl font-bold mb-4 leading-tight">
            Vos projets méritent des visuels qui convertissent
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Connectez-vous pour sauvegarder vos dossiers, gérer vos crédits et retrouver vos comptes
            rendus à tout moment.
          </p>
          <BeforeAfterSlider
            before={HERO_PROJECT.before}
            after={HERO_PROJECT.after}
            className="max-w-lg shadow-2xl"
          />
          <ul className="mt-8 space-y-3">
            {["Brief client structuré", "Compte rendu travaux & coûts", "Export PDF client"].map(
              (item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-foreground/85">
                  <ShieldCheck size={16} className="text-primary shrink-0" />
                  {item}
                </li>
              )
            )}
          </ul>
        </div>

        <div className="flex flex-col min-h-[calc(100vh-4rem)]">
          <header className="flex items-center justify-between shrink-0">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 font-serif text-xl text-foreground">
              <Leaf className="h-5 w-5 text-primary" />
              Jardinia
            </Link>
          </header>

          <div className="flex flex-1 items-center justify-center py-8">
            <div className="auth-card w-full max-w-md">
              <div className="mb-8 text-center">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-primary">Espace client</p>
                <h1 className="font-serif text-3xl font-light text-foreground">
                  {mode === "login" ? "Connexion" : "Créer un compte"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {mode === "login"
                    ? "Accédez à vos projets d'aménagement assistés par IA."
                    : "Inscrivez-vous pour lancer votre premier projet."}
                </p>
              </div>

              <div className="auth-tabs mb-6">
                <button
                  type="button"
                  className={`auth-tabs__btn ${mode === "login" ? "auth-tabs__btn--active" : ""}`}
                  onClick={() => setMode("login")}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  className={`auth-tabs__btn ${mode === "register" ? "auth-tabs__btn--active" : ""}`}
                  onClick={() => setMode("register")}
                >
                  Inscription
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {mode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom (optionnel)</Label>
                    <Input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Marie Dupont"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="auth-input"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="auth-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder={mode === "register" ? "Minimum 8 caractères" : "••••••••"}
                    required
                    minLength={mode === "register" ? 8 : 1}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="auth-input"
                  />
                </div>

                <Button type="submit" className="btn-primary w-full relative z-[1]" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Chargement…
                    </>
                  ) : mode === "login" ? (
                    "Se connecter"
                  ) : (
                    "Créer mon compte"
                  )}
                </Button>
              </form>

              {oauthUrl && (
                <>
                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">ou</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <a href={oauthUrl} className="btn-outline flex w-full items-center justify-center py-3 text-sm">
                    Connexion via OAuth (SSO)
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
