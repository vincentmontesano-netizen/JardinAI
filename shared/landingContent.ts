import { z } from "zod";

export const landingHeroStatSchema = z.object({
  id: z.string().min(1),
  icon: z.enum(["filetext", "clock", "sparkles"]),
  label: z.string().min(1).max(120),
});

export const landingGalleryItemSchema = z.object({
  id: z.string().min(1),
  src: z.string().min(1).max(2000),
  label: z.string().min(1).max(200),
});

export const landingProcessStepSchema = z.object({
  id: z.string().min(1),
  number: z.string().min(1).max(8),
  title: z.string().min(1).max(200),
  desc: z.string().min(1).max(1000),
  image: z.string().min(1).max(2000),
});

export const landingTestimonialSchema = z.object({
  id: z.string().min(1),
  quote: z.string().min(1).max(2000),
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(200),
  avatar: z.string().min(1).max(2000),
});

export const landingFeatureSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(300),
});

export const landingSectionHeaderSchema = z.object({
  eyebrow: z.string().max(80).optional(),
  title: z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
});

export const landingContentSchema = z.object({
  hero: z.object({
    pill: z.string().min(1).max(200),
    titleMain: z.string().min(1).max(200),
    titleAccentGreen: z.string().min(1).max(200),
    titleAccentSand: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    ctaPrimary: z.string().min(1).max(80),
    ctaSecondary: z.string().min(1).max(80),
    beforeImage: z.string().min(1).max(2000),
    afterImage: z.string().min(1).max(2000),
    sliderHint: z.string().min(1).max(200),
  }),
  heroStats: z.array(landingHeroStatSchema).min(1).max(12),
  features: z.array(landingFeatureSchema).min(1).max(24),
  galleryLabel: z.string().min(1).max(200),
  gallery: z.array(landingGalleryItemSchema).min(1).max(24),
  process: z.object({
    header: landingSectionHeaderSchema,
    steps: z.array(landingProcessStepSchema).min(1).max(12),
    ctaLabel: z.string().min(1).max(80),
  }),
  featuresSection: landingSectionHeaderSchema,
  testimonials: z.object({
    title: z.string().min(1).max(200),
    items: z.array(landingTestimonialSchema).min(0).max(12),
  }),
  pricingSection: landingSectionHeaderSchema,
  cta: z.object({
    title: z.string().min(1).max(200),
    titleAccent: z.string().min(1).max(200),
    description: z.string().min(1).max(1000),
    buttonLabel: z.string().min(1).max(80),
    backgroundImage: z.string().min(1).max(2000),
  }),
  footer: z.object({
    brandName: z.string().min(1).max(80),
    tagline: z.string().min(1).max(300),
  }),
});

export type LandingHeroStat = z.infer<typeof landingHeroStatSchema>;
export type LandingGalleryItem = z.infer<typeof landingGalleryItemSchema>;
export type LandingProcessStep = z.infer<typeof landingProcessStepSchema>;
export type LandingTestimonial = z.infer<typeof landingTestimonialSchema>;
export type LandingFeature = z.infer<typeof landingFeatureSchema>;
export type LandingSectionHeader = z.infer<typeof landingSectionHeaderSchema>;
export type LandingContent = z.infer<typeof landingContentSchema>;

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  hero: {
    pill: "Studio IA pour paysagistes & architectes d'intérieur",
    titleMain: "Vendez vos projets",
    titleAccentGreen: "avec des visuels",
    titleAccentSand: "qui font signer",
    description:
      "Photographiez le lieu, complétez le brief client structuré, et recevez en quelques minutes des rendus avant/après, un dossier travaux complet et une estimation matériaux + main d'œuvre — prêt à présenter en rendez-vous.",
    ctaPrimary: "Lancer un projet",
    ctaSecondary: "Voir le processus",
    beforeImage: "/images/hero-before.png",
    afterImage: "/images/hero-after.png",
    sliderHint: "Glissez pour comparer avant / après",
  },
  heroStats: [
    { id: "stat-brief", icon: "filetext", label: "15 thèmes de brief" },
    { id: "stat-time", icon: "clock", label: "2–5 min de génération" },
    { id: "stat-credit", icon: "sparkles", label: "1 crédit = dossier complet" },
  ],
  features: [
    { id: "f1", label: "Rendus avant / après photoréalistes" },
    { id: "f2", label: "Brief client en 15 thèmes métier" },
    { id: "f3", label: "Plan d'aménagement détaillé" },
    { id: "f4", label: "Travaux, outillage & planning" },
    { id: "f5", label: "Matériaux & main d'œuvre chiffrés" },
    { id: "f6", label: "Export PDF pour vos clients" },
  ],
  galleryLabel: "Ambiances — intérieur & extérieur",
  gallery: [
    {
      id: "g1",
      src: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=600&q=80",
      label: "Terrasse bois & végétation",
    },
    {
      id: "g2",
      src: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80",
      label: "Salon contemporain",
    },
    {
      id: "g3",
      src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
      label: "Maison & jardin",
    },
    {
      id: "g4",
      src: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=600&q=80",
      label: "Cuisine ouverte",
    },
    {
      id: "g5",
      src: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=600&q=80",
      label: "Piscine & deck",
    },
    {
      id: "g6",
      src: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80",
      label: "Chambre parentale",
    },
  ],
  process: {
    header: {
      eyebrow: "Processus",
      title: "De la visite au dossier client",
      description:
        "Un flux pensé comme en agence : collecte du brief, ancrage visuel sur le réel, livrable professionnel.",
    },
    steps: [
      {
        id: "step-1",
        number: "01",
        title: "Photographiez le lieu",
        desc: "Intérieur, terrasse ou jardin — quelques vues suffisent pour ancrer le rendu dans la réalité du terrain.",
        image:
          "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "step-2",
        number: "02",
        title: "Brief client guidé",
        desc: "15 thèmes d'interrogatoire adaptés au projet : usages, style, budget, contraintes techniques, planning…",
        image:
          "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "step-3",
        number: "03",
        title: "Dossier complet livré",
        desc: "Rendus avant/après, plan d'aménagement, travaux, outillage, matériaux, main d'œuvre et fourchette de coûts.",
        image:
          "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
      },
    ],
    ctaLabel: "Lancer le wizard projet",
  },
  featuresSection: {
    eyebrow: "Livrables",
    title: "Tout le dossier, pas seulement une image",
  },
  testimonials: {
    title: "Ils l'utilisent au quotidien",
    items: [
      {
        id: "t1",
        quote:
          "En rendez-vous client, je sors le brief structuré et le rendu IA en moins de 10 minutes. Mes clients signent plus vite.",
        name: "Camille Rousseau",
        role: "Architecte d'intérieur · Nantes",
        avatar:
          "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
      },
      {
        id: "t2",
        quote:
          "Le dossier matériaux + main d'œuvre me fait gagner une demi-journée par projet. Indispensable pour chiffrer au premier entretien.",
        name: "Marc Delorme",
        role: "Paysagiste · Aix-en-Provence",
        avatar:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
      },
      {
        id: "t3",
        quote:
          "L'interrogatoire client est enfin à la hauteur d'un vrai brief pro. L'IA produit des propositions cohérentes avec les réponses.",
        name: "Sophie Martin",
        role: "Studio d'aménagement · Lyon",
        avatar:
          "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80",
      },
    ],
  },
  pricingSection: {
    eyebrow: "Tarifs",
    title: "Payez à la mission",
    description:
      "1 crédit = 1 dossier complet. Idéal pour tester sur un premier client, ou en volume avec le pack pro.",
  },
  cta: {
    title: "Votre prochain rendez-vous client",
    titleAccent: "avec un dossier complet",
    description:
      "Uploadez les photos sur place, complétez le brief en voiture — le dossier vous attend au bureau.",
    buttonLabel: "Créer mon premier projet",
    backgroundImage:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
  },
  footer: {
    brandName: "Jardinia Studio",
    tagline: "Aménagement intérieur & extérieur — brief, rendu IA, dossier chiffré",
  },
};

export function newLandingItemId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
