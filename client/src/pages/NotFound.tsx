import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-12 text-center max-w-md" style={{ boxShadow: "var(--shadow-glow)" }}>
        <div className="text-5xl mb-4">🌿</div>
        <h1 className="font-serif text-5xl font-bold text-gradient-green mb-2">404</h1>
        <h2 className="font-serif text-xl font-semibold mb-3">Page introuvable</h2>
        <p className="text-muted-foreground text-sm mb-8">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="btn-primary inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Retour à l&apos;accueil
        </button>
      </div>
    </div>
  );
}
