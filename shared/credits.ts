export type CreditBalanceView = {
  balance: number;
  unlimited: boolean;
};

export function hasAvailableCredits(credits?: CreditBalanceView | null): boolean {
  if (!credits) return false;
  if (credits.unlimited) return true;
  return credits.balance > 0;
}

export function formatCreditBalance(credits?: CreditBalanceView | null): string {
  if (!credits) return "0";
  if (credits.unlimited) return "Illimité";
  return String(credits.balance);
}

export function creditBalanceLabel(credits?: CreditBalanceView | null): string {
  if (credits?.unlimited) return "Crédits illimités";
  const n = credits?.balance ?? 0;
  return `${n} crédit${n !== 1 ? "s" : ""}`;
}
