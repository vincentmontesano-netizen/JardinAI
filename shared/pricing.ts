export const CREDIT_PRICING = {
  single: {
    credits: 1,
    amountEur: 6.99,
    stripeCents: 699,
    displayEur: "6,99",
    stripeName: "1 crédit projet — Jardinia",
  },
  pack10: {
    credits: 10,
    amountEur: 49.99,
    stripeCents: 4999,
    displayEur: "49,99",
    stripeName: "Pack 10 crédits projets — Jardinia",
  },
} as const;

export type CreditPackId = keyof typeof CREDIT_PRICING;

export function creditPackAmountEurFallback(pack: CreditPackId): number {
  return CREDIT_PRICING[pack].amountEur;
}

/** Prix unitaire du pack (EUR), arrondi à 2 décimales. */
export function pack10UnitPriceEur(): number {
  return Math.round((CREDIT_PRICING.pack10.amountEur / CREDIT_PRICING.pack10.credits) * 100) / 100;
}

/** Économie par projet vs achat à l'unité (EUR). */
export function pack10SavingsPerProjectEur(): number {
  const unitTotal = CREDIT_PRICING.single.amountEur * CREDIT_PRICING.pack10.credits;
  return Math.round(((unitTotal - CREDIT_PRICING.pack10.amountEur) / CREDIT_PRICING.pack10.credits) * 100) / 100;
}

/** Réduction en % du pack vs 10 achats unitaires. */
export function pack10DiscountPercent(): number {
  const unitTotal = CREDIT_PRICING.single.amountEur * CREDIT_PRICING.pack10.credits;
  return Math.round(((unitTotal - CREDIT_PRICING.pack10.amountEur) / unitTotal) * 100);
}
