import { AuthCtaLink } from "@/components/landing/AuthCtaLink";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLocation } from "wouter";
import { Leaf, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "#gallery", label: "Galerie" },
  { href: "#how", label: "Processus" },
  { href: "#pricing", label: "Tarifs" },
];

type LandingNavbarProps = {
  isAuthenticated: boolean;
};

export function LandingNavbar({ isAuthenticated }: LandingNavbarProps) {
  const [, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`landing-nav fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "landing-nav--scrolled" : ""}`}
    >
      <div className="container flex items-center justify-between h-16">
        <button
          type="button"
          className="flex items-center gap-3 group"
          onClick={() => navigate("/")}
        >
          <div className="landing-nav__logo">
            <Leaf size={14} className="text-white" />
          </div>
          <span className="font-serif text-xl font-semibold text-gradient-mixed">Jardinia</span>
        </button>

        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="landing-nav__link">
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <button
              type="button"
              className="btn-primary text-sm py-2 px-5"
              onClick={() => navigate("/dashboard")}
            >
              Mon espace
            </button>
          ) : (
            <>
              <AuthCtaLink className="btn-outline text-sm py-2 px-4 hidden sm:inline-flex">
                Connexion
              </AuthCtaLink>
              <AuthCtaLink guestHref="/projects/new" className="btn-primary text-sm py-2 px-4 sm:px-5">
                Commencer
              </AuthCtaLink>
            </>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl glass"
                aria-label="Menu"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-72 border-l glass p-0"
              style={{ borderColor: "oklch(54% 0.17 145 / 0.2)" }}
            >
              <div className="flex flex-col h-full p-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="landing-nav__logo">
                    <Leaf size={14} className="text-white" />
                  </div>
                  <span className="font-serif text-lg font-semibold">Jardinia</span>
                </div>
                <nav className="flex flex-col gap-1">
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="landing-nav__mobile-link"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
                {!isAuthenticated && (
                  <div className="mt-auto flex flex-col gap-3 pt-6 border-t border-white/10">
                    <AuthCtaLink className="btn-outline w-full text-center py-3">Connexion</AuthCtaLink>
                    <AuthCtaLink guestHref="/projects/new" className="btn-primary w-full text-center py-3">
                      Commencer
                    </AuthCtaLink>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
