import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { ENV } from "./env";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  /** État de config (sans secrets) — utile après déploiement Hostinger. */
  deployStatus: publicProcedure.query(() => ({
    stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    gemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
    jwt: Boolean(ENV.cookieSecret.trim() && ENV.cookieSecret !== "change-me-in-production"),
    adminSeed: Boolean(ENV.ownerEmail && process.env.ADMIN_SEED_PASSWORD?.trim()),
  })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
