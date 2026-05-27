import { useLocation } from "wouter";
import { XCircle, ArrowRight } from "lucide-react";

export default function PaymentCancel() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="glass rounded-3xl p-12 text-center max-w-md mx-4">
        <div
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ background: "oklch(72% 0.09 74 / 0.15)", border: "2px solid oklch(72% 0.09 74 / 0.3)" }}
        >
          <XCircle size={36} style={{ color: "oklch(72% 0.09 74)" }} />
        </div>
        <h1 className="font-serif text-3xl font-bold mb-3">Paiement annulé</h1>
        <p className="text-muted-foreground mb-8">
          Votre paiement a été annulé. Aucun crédit n&apos;a été débité sur votre compte.
        </p>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => navigate("/credits")} className="btn-primary flex items-center justify-center gap-2">
            Réessayer l&apos;achat
            <ArrowRight size={16} />
          </button>
          <button type="button" onClick={() => navigate("/dashboard")} className="btn-outline">
            Retour au tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
}
