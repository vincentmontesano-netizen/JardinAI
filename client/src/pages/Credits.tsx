import JardiniaLayout from "@/components/JardiniaLayout";
import { trpc } from "@/lib/trpc";
import { Loader2, Leaf, CreditCard, Zap } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

import { POST_PAYMENT_REDIRECT_KEY } from "@/lib/projectWizardDraft";
import { CREDIT_PRICING, pack10SavingsPerProjectEur } from "@shared/pricing";
import { formatCreditBalance, hasAvailableCredits } from "@shared/credits";

export default function Credits() {
  const [, navigate] = useLocation();
  const createCheckout = trpc.payments.createCheckout.useMutation();
  const { data: credits, isLoading: creditsLoading } = trpc.credits.balance.useQuery();
  const { data: transactions, isLoading: txLoading } = trpc.credits.transactions.useQuery();

  const resumeRedirect = new URLSearchParams(window.location.search).get("redirect");

  useEffect(() => {
    if (resumeRedirect?.startsWith("/") && !resumeRedirect.startsWith("//")) {
      sessionStorage.setItem(POST_PAYMENT_REDIRECT_KEY, resumeRedirect);
    }
  }, [resumeRedirect]);

  const handlePurchase = async (pack: "single" | "pack10") => {
    try {
      const { url } = await createCheckout.mutateAsync({
        pack,
        origin: window.location.origin,
      });
      window.location.href = url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la création du paiement";
      toast.error(message);
    }
  };

  const packs = [
    {
      id: "single" as const,
      icon: <Leaf size={24} />,
      label: "Projet unique",
      credits: 1,
      price: CREDIT_PRICING.single.displayEur,
      desc: "Idéal pour tester le service ou pour un projet ponctuel.",
      features: [
        "1 crédit projet",
        "Rendus visuels avant/après",
        "Plan d'aménagement",
        "Roadmap travaux chiffrée",
      ],
      highlight: false,
    },
    {
      id: "pack10" as const,
      icon: <Zap size={24} />,
      label: "Pack professionnel",
      credits: 10,
      price: CREDIT_PRICING.pack10.displayEur,
      desc: "Pour les professionnels qui gèrent plusieurs projets clients.",
      features: [
        "10 crédits projets",
        "Rendus visuels avant/après",
        "Plan d'aménagement",
        "Roadmap travaux chiffrée",
        `Économisez ${pack10SavingsPerProjectEur().toFixed(2).replace(".", ",")} EUR par projet`,
      ],
      highlight: true,
    },
  ];

  return (
    <JardiniaLayout
      title={
        <span className="flex items-center gap-3">
          <CreditCard size={24} style={{ color: "oklch(65% 0.16 145)" }} />
          Crédits
        </span>
      }
      actions={
        <div className="text-sm text-muted-foreground">
          Solde :{" "}
          <span className="font-semibold text-gradient-green">
            {creditsLoading ? "…" : formatCreditBalance(credits)}
          </span>
          {!credits?.unlimited && (
            <>
              {" "}
              crédit{(credits?.balance ?? 0) !== 1 ? "s" : ""}
            </>
          )}
        </div>
      }
    >
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        {resumeRedirect && (
          <div className="glass rounded-xl p-4 mb-8 text-sm border border-primary/20">
            <p className="font-medium mb-1">Projet en attente</p>
            <p className="text-muted-foreground mb-3">
              Achetez un crédit pour reprendre la génération de votre compte rendu.
            </p>
            {hasAvailableCredits(credits) && (
              <button
                type="button"
                className="btn-primary text-sm py-2 px-4"
                onClick={() => navigate(resumeRedirect)}
              >
                Reprendre mon projet
              </button>
            )}
          </div>
        )}

        <div className="glass rounded-2xl p-8 mb-12 text-center animate-fade-in-up">
          <div className="text-sm text-muted-foreground mb-2">Votre solde actuel</div>
          <div className="font-serif text-6xl font-bold text-gradient-green mb-1">
            {creditsLoading ? "…" : formatCreditBalance(credits)}
          </div>
          <div className="text-muted-foreground">
            {credits?.unlimited
              ? "Compte administrateur — génération sans limite"
              : `crédit${(credits?.balance ?? 0) !== 1 ? "s" : ""} disponible${(credits?.balance ?? 0) !== 1 ? "s" : ""}`}
          </div>
        </div>

        <h2 className="font-serif text-3xl font-bold mb-8 text-center animate-fade-in-up">
          Acheter des crédits
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className="card-premium relative animate-fade-in-up"
              style={pack.highlight ? { borderColor: "oklch(54% 0.17 145 / 0.3)" } : undefined}
            >
              {pack.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className="text-xs font-semibold px-4 py-1 rounded-full"
                    style={{ background: "var(--gradient-green)", color: "oklch(97% 0.01 145)" }}
                  >
                    Meilleure offre
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: pack.highlight
                      ? "oklch(54% 0.17 145 / 0.15)"
                      : "oklch(72% 0.09 74 / 0.1)",
                    color: pack.highlight ? "oklch(65% 0.16 145)" : "oklch(72% 0.09 74)",
                  }}
                >
                  {pack.icon}
                </div>
                <div>
                  <div className="font-semibold text-sm">{pack.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {pack.credits} crédit{pack.credits > 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <span
                  className="font-serif text-4xl font-bold"
                  style={{ color: pack.highlight ? "oklch(65% 0.16 145)" : "oklch(80% 0.08 76)" }}
                >
                  {pack.price}
                </span>
                <span className="text-muted-foreground ml-1">EUR</span>
              </div>

              <p className="text-sm text-muted-foreground mb-6">{pack.desc}</p>

              <ul className="space-y-2 mb-8">
                {pack.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span style={{ color: "oklch(65% 0.16 145)" }}>✓</span>
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handlePurchase(pack.id)}
                disabled={createCheckout.isPending}
                className={pack.highlight ? "btn-primary w-full" : "btn-outline w-full"}
              >
                {createCheckout.isPending ? (
                  <Loader2 size={16} className="animate-spin mx-auto" />
                ) : (
                  `Acheter — ${pack.price} EUR`
                )}
              </button>
            </div>
          ))}
        </div>

        <div>
          <h2 className="font-serif text-2xl font-bold mb-6">Historique des transactions</h2>
          {txLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="shimmer h-14 rounded-xl" />
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="glass rounded-xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">
                      {tx.description ||
                        (tx.type === "purchase" ? "Achat de crédits" : "Utilisation projet")}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(tx.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div
                    className="font-semibold text-sm"
                    style={{
                      color: tx.amount > 0 ? "oklch(65% 0.16 145)" : "oklch(65% 0.22 25)",
                    }}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount} crédit{Math.abs(tx.amount) !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass rounded-xl p-8 text-center">
              <div className="text-3xl mb-3">💳</div>
              <p className="text-muted-foreground text-sm">Aucune transaction pour l&apos;instant.</p>
            </div>
          )}
        </div>
      </div>
    </JardiniaLayout>
  );
}
