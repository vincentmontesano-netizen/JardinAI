import { useAuth } from "@/_core/hooks/useAuth";
import { AuthCtaLink } from "@/components/landing/AuthCtaLink";
import {
  CREDIT_PRICING,
  pack10DiscountPercent,
  pack10UnitPriceEur,
} from "@shared/pricing";
import { BeforeAfterSlider } from "@/components/landing/BeforeAfterSlider";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingSectionHeader } from "@/components/landing/LandingSectionHeader";
import { trpc } from "@/lib/trpc";
import { DEFAULT_LANDING_CONTENT, type LandingContent } from "@shared/landingContent";
import { ArrowRight, Check, Clock, FileText, Loader2, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const HERO_STAT_ICONS: Record<string, LucideIcon> = {
  filetext: FileText,
  clock: Clock,
  sparkles: Sparkles,
};

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { data: landing, isLoading } = trpc.landing.get.useQuery(undefined, {
    staleTime: 60_000,
  });

  const content: LandingContent = landing ?? DEFAULT_LANDING_CONTENT;

  if (isLoading && !landing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="landing-page min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingNavbar isAuthenticated={isAuthenticated} />

      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="landing-hero-bg" />
        <div className="landing-hero-grid" />
      </div>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-20 pb-16 z-10">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 xl:gap-16 items-center">
            <div className="space-y-8 order-2 lg:order-1">
              <div className="flex flex-wrap gap-2 animate-fade-in">
                <span className="landing-trust-pill">
                  <Sparkles size={12} style={{ color: "oklch(65% 0.16 145)" }} />
                  {content.hero.pill}
                </span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.05] animate-fade-in-up delay-100">
                {content.hero.titleMain}
                <span className="block text-gradient-green">{content.hero.titleAccentGreen}</span>
                <span className="block text-gradient-sand">{content.hero.titleAccentSand}</span>
              </h1>

              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl animate-fade-in-up delay-200">
                {content.hero.description}
              </p>

              <div className="flex flex-wrap gap-4 animate-fade-in-up delay-300">
                <AuthCtaLink
                  guestHref="/projects/new"
                  className="btn-primary text-base py-3 px-8 inline-flex items-center gap-2"
                >
                  {content.hero.ctaPrimary}
                  <ArrowRight size={16} />
                </AuthCtaLink>
                <a href="#how" className="btn-outline text-base py-3 px-8 inline-block">
                  {content.hero.ctaSecondary}
                </a>
              </div>

              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 pt-2 animate-fade-in-up delay-400">
                {content.features.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Check size={14} className="shrink-0 mt-0.5 text-primary" />
                    {item.label}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-3 pt-2 animate-fade-in-up delay-500">
                {content.heroStats.map((stat) => {
                  const Icon = HERO_STAT_ICONS[stat.icon] ?? Sparkles;
                  return (
                    <span key={stat.id} className="landing-stat-pill">
                      <Icon size={13} className="text-primary shrink-0" />
                      {stat.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="order-1 lg:order-2 animate-fade-in delay-200">
              <div className="relative">
                <BeforeAfterSlider
                  before={content.hero.beforeImage}
                  after={content.hero.afterImage}
                  className="shadow-2xl"
                />
                <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-2">
                  <span className="inline-block w-8 h-px bg-primary/40" />
                  {content.hero.sliderHint}
                  <span className="inline-block w-8 h-px bg-primary/40" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY STRIP */}
      <section id="gallery" className="landing-section scroll-mt-24 py-12 border-y border-white/10 bg-card/40">
        <div className="container mb-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            {content.galleryLabel}
          </p>
        </div>
        <div className="container">
          <div className="landing-gallery-scroll">
            {content.gallery.map((img) => (
              <div key={img.id} className="landing-gallery-item">
                <img src={img.src} alt={img.label} loading="lazy" />
                <span>{img.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* PROCESS */}
      <section id="how" className="landing-section scroll-mt-24 py-24 bg-card/30">
        <div className="container">
          <LandingSectionHeader
            eyebrow={content.process.header.eyebrow}
            title={content.process.header.title}
            description={content.process.header.description}
            className="mb-16"
          />

          <div className="grid md:grid-cols-3 gap-8">
            {content.process.steps.map((step, i) => (
              <article key={step.id} className={`landing-step-card animate-fade-in-up delay-${(i + 1) * 100}`}>
                <div className="landing-step-card__image">
                  <img src={step.image} alt="" loading="lazy" />
                </div>
                <div className="p-6">
                  <span className="font-serif text-3xl font-bold text-gradient-green opacity-50">{step.number}</span>
                  <h3 className="font-serif text-xl font-semibold mt-2 mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="text-center mt-12">
            <AuthCtaLink
              guestHref="/projects/new"
              authenticatedHref="/projects/new"
              className="btn-primary text-base py-3 px-8 inline-flex items-center gap-2"
            >
              {content.process.ctaLabel}
              <ArrowRight size={16} />
            </AuthCtaLink>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="landing-section scroll-mt-24 py-24 bg-background">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <LandingSectionHeader
                eyebrow={content.featuresSection.eyebrow}
                title={content.featuresSection.title}
                align="left"
                className="mb-8"
              />
              <ul className="space-y-4">
                {content.features.map((item) => (
                  <li key={item.id} className="flex items-start gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "oklch(54% 0.17 145 / 0.15)" }}
                    >
                      <Check size={12} style={{ color: "oklch(65% 0.16 145)" }} />
                    </span>
                    <span className="text-foreground/85">{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {content.gallery.slice(0, 4).map((img) => (
                <div
                  key={img.id}
                  className="rounded-xl overflow-hidden aspect-square border border-white/10"
                >
                  <img src={img.src} alt={img.label} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      {content.testimonials.items.length > 0 && (
        <section className="relative z-10 py-24 bg-card/25">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl lg:text-4xl font-bold">{content.testimonials.title}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {content.testimonials.items.map((t, i) => (
                <blockquote key={t.id} className={`landing-testimonial animate-fade-in-up delay-${(i + 1) * 100}`}>
                  <p className="text-sm leading-relaxed text-muted-foreground flex-1">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="flex items-center gap-3 mt-6 pt-6 border-t border-white/5">
                    <img src={t.avatar} alt="" className="landing-testimonial__avatar" loading="lazy" />
                    <div>
                      <cite className="not-italic font-medium text-sm">{t.name}</cite>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.role}</p>
                    </div>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="section-divider" />

      {/* PRICING */}
      <section id="pricing" className="landing-section scroll-mt-24 py-24">
        <div className="container">
          <LandingSectionHeader
            eyebrow={content.pricingSection.eyebrow}
            title={content.pricingSection.title}
            description={content.pricingSection.description}
            className="mb-16"
          />

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="card-premium">
              <div className="mb-6">
                <div className="text-sm text-muted-foreground mb-1">Projet unique</div>
                <div className="font-serif text-5xl font-bold text-gradient-sand">
                  {CREDIT_PRICING.single.displayEur}{" "}
                  <span className="text-2xl">EUR</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8 text-sm text-muted-foreground">
                {["1 dossier complet", "Rendus + brief + chiffrage", "Export PDF"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check size={14} style={{ color: "oklch(65% 0.16 145)" }} />
                    {item}
                  </li>
                ))}
              </ul>
              <AuthCtaLink authenticatedHref="/credits" className="btn-outline w-full text-center block py-3">
                Acheter 1 crédit
              </AuthCtaLink>
            </div>

            <div className="card-premium relative" style={{ borderColor: "oklch(54% 0.17 145 / 0.3)" }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span
                  className="text-xs font-semibold px-4 py-1 rounded-full"
                  style={{ background: "var(--gradient-green)", color: "oklch(97% 0.01 145)" }}
                >
                  Pack pro
                </span>
              </div>
              <div className="mb-6">
                <div className="text-sm text-muted-foreground mb-1">10 projets</div>
                <div className="font-serif text-5xl font-bold text-gradient-green">
                  {CREDIT_PRICING.pack10.displayEur}{" "}
                  <span className="text-2xl">EUR</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  soit {pack10UnitPriceEur().toFixed(2).replace(".", ",")} EUR / dossier
                </div>
              </div>
              <ul className="space-y-3 mb-8 text-sm text-muted-foreground">
                {[
                  "10 dossiers complets",
                  "Même livrables que l'unité",
                  `−${pack10DiscountPercent()} % vs à l'unité`,
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check size={14} style={{ color: "oklch(65% 0.16 145)" }} />
                    {item}
                  </li>
                ))}
              </ul>
              <AuthCtaLink authenticatedHref="/credits" className="btn-primary w-full text-center block py-3">
                Acheter 10 crédits
              </AuthCtaLink>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24">
        <div className="container">
          <div
            className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center"
            style={{
              background: "linear-gradient(135deg, oklch(22% 0.04 145), oklch(28% 0.045 145))",
              border: "1px solid oklch(58% 0.18 145 / 0.35)",
            }}
          >
            <img
              src={content.cta.backgroundImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-20"
              loading="lazy"
            />
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="font-serif text-4xl lg:text-5xl font-bold mb-4">
                {content.cta.title}
                <span className="block text-gradient-green">{content.cta.titleAccent}</span>
              </h2>
              <p className="text-muted-foreground mb-8">{content.cta.description}</p>
              <AuthCtaLink
                guestHref="/projects/new"
                className="btn-primary text-base py-4 px-10 inline-flex items-center gap-2"
              >
                {content.cta.buttonLabel}
                <ArrowRight size={16} />
              </AuthCtaLink>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t py-12" style={{ borderColor: "oklch(54% 0.17 145 / 0.1)" }}>
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full" style={{ background: "var(--gradient-green)" }} />
            <span className="font-serif text-lg font-semibold text-gradient-mixed">{content.footer.brandName}</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">{content.footer.tagline}</p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Mentions légales
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
