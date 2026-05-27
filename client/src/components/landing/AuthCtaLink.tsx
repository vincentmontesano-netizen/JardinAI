import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import type { ReactNode } from "react";

type AuthCtaLinkProps = {
  children: ReactNode;
  className?: string;
  authenticatedHref?: string;
  /** Lien pour les visiteurs non connectés (ex. wizard sans auth). */
  guestHref?: string;
};

export function AuthCtaLink({
  children,
  className = "",
  authenticatedHref = "/dashboard",
  guestHref,
}: AuthCtaLinkProps) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <a href={authenticatedHref} className={className}>
        {children}
      </a>
    );
  }

  return (
    <a href={guestHref ?? getLoginUrl()} className={className}>
      {children}
    </a>
  );
}
