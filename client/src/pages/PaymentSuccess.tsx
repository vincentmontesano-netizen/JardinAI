import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { CheckCircle, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { consumePostPaymentRedirect } from "@/lib/projectWizardDraft";
import { toast } from "sonner";

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const [resumePath] = useState(() => consumePostPaymentRedirect());
  const utils = trpc.useUtils();
  const confirmPayment = trpc.payments.confirmPayment.useMutation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");

    const finalize = async () => {
      try {
        if (sessionId) {
          const result = await confirmPayment.mutateAsync({ sessionId });
          if (result.alreadyProcessed) {
            toast.info("Paiement déjà enregistré sur votre compte.");
          }
        }
        await utils.credits.balance.invalidate();
        await utils.credits.transactions.invalidate();
        setStatus("success");
      } catch (err: unknown) {
        console.error("[PaymentSuccess]", err);
        await utils.credits.balance.invalidate();
        setStatus("error");
      }
    };

    finalize();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="glass rounded-3xl p-12 text-center max-w-md mx-4">
          <Loader2 className="animate-spin mx-auto mb-4" size={36} style={{ color: "oklch(65% 0.16 145)" }} />
          <p className="text-muted-foreground">Confirmation de votre paiement en cours…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="glass rounded-3xl p-12 text-center max-w-md mx-4">
          <AlertCircle size={36} className="mx-auto mb-4" style={{ color: "oklch(72% 0.09 74)" }} />
          <h1 className="font-serif text-2xl font-bold mb-3">Paiement reçu</h1>
          <p className="text-muted-foreground mb-8">
            Votre paiement a été traité. Si vos crédits n&apos;apparaissent pas sous quelques minutes,
            contactez le support avec votre reçu Stripe.
          </p>
          <button type="button" onClick={() => navigate("/dashboard")} className="btn-primary">
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div
        className="glass rounded-3xl p-12 text-center max-w-md mx-4 animate-scale-in"
        style={{ boxShadow: "var(--shadow-glow)" }}
      >
        <div
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center animate-glow-pulse"
          style={{
            background: "oklch(54% 0.17 145 / 0.15)",
            border: "2px solid oklch(54% 0.17 145 / 0.4)",
          }}
        >
          <CheckCircle size={36} style={{ color: "oklch(65% 0.16 145)" }} />
        </div>
        <h1 className="font-serif text-3xl font-bold mb-3 text-gradient-green">Paiement confirmé !</h1>
        <p className="text-muted-foreground mb-8">
          Vos crédits ont été crédités sur votre compte. Vous pouvez maintenant créer vos projets
          d&apos;aménagement IA.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate(resumePath ?? "/projects/new")}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {resumePath ? "Reprendre mon projet" : "Créer un projet maintenant"}
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
