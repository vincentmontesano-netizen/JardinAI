import { DEFAULT_LANDING_CONTENT } from "@shared/landingContent";

/** @deprecated Import from `@shared/landingContent` */
export {
  DEFAULT_LANDING_CONTENT,
  type LandingContent,
  type LandingGalleryItem,
  type LandingProcessStep,
  type LandingTestimonial,
} from "@shared/landingContent";

export const HERO_PROJECT = {
  id: "jardin-piscine",
  title: "Jardin & piscine — rénovation",
  location: "Extérieur · Rendu IA sur photo réelle",
  type: "exterior" as const,
  before: "/images/hero-before.png",
  after: "/images/hero-after.png",
  tag: "Avant / Après — rendu IA",
};

export const SHOWCASE_PROJECTS = [HERO_PROJECT];
export const GALLERY_IMAGES = DEFAULT_LANDING_CONTENT.gallery.map(({ src, label }) => ({ src, label }));
export const TESTIMONIALS = DEFAULT_LANDING_CONTENT.testimonials.items;
export const PROCESS_STEPS = DEFAULT_LANDING_CONTENT.process.steps;
