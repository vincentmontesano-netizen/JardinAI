import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { CREDIT_PRICING, creditPackAmountEurFallback } from "@shared/pricing";
import { type CreditBalanceView } from "@shared/credits";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { normalizeEmail, setSessionCookie, toPublicUser } from "./_core/authHelpers";
import { hashPassword, verifyPassword } from "./_core/password";
import { ENV } from "./_core/env";
import {
  getUserCredits,
  getUserTransactions,
  addCredits,
  deductCredit,
  createProject,
  getProjectsByUser,
  getProjectById,
  updateProjectStatus,
  addProjectPhoto,
  getProjectPhotos,
  getProjectRenderings,
  getProjectReport,
  getAllUsers,
  getAllProjects,
  getAdminStats,
  getUserByEmail,
  getUserById,
  registerEmailUser,
  touchUserLastSignedIn,
  syncOwnerAdminRole,
  resolveRoleForEmail,
  getLandingContent,
  saveLandingContent,
  resetLandingContent,
  updateUserByAdmin,
  setUserPassword,
  createUserMessage,
  getUnreadMessagesForUser,
  markUserMessagesRead,
  getAppSettingsPublic,
  saveAppSettings,
  getAdminTestProjectsForUser,
  ensureAdminTestProjects,
  getAdminTestProjectBySlot,
} from "./db";
import { landingContentSchema } from "../shared/landingContent";
import { appSettingsUpdateSchema } from "../shared/appSettings";
import { storagePresignPut } from "./storage";
import { enqueueGeneration, prepareProjectForGeneration } from "./generationQueue";
import { randomBytes } from "crypto";
import {
  buildUserNotificationEmail,
  sendTransactionalEmail,
} from "./_core/mailer";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Accès administrateur requis" });
  }
  return next({ ctx });
});

async function assertProjectOwner(projectId: number, userId: number) {
  const project = await getProjectById(projectId);
  if (!project || project.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à ce projet" });
  }
  return project;
}

function generateTemporaryPassword(): string {
  return randomBytes(9).toString("base64url");
}

async function startGeneration(
  projectId: number,
  userId: number,
  role: "user" | "admin"
) {
  if (role !== "admin") {
    const credits = await getUserCredits(userId);
    if (credits.balance <= 0) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Solde de crédits insuffisant. Veuillez acheter des crédits.",
      });
    }
    await deductCredit(userId);
  }

  await prepareProjectForGeneration(projectId);
  enqueueGeneration(projectId, userId);
}

function creditBalanceForUser(role: "user" | "admin", balance: number): CreditBalanceView {
  if (role === "admin") {
    return { balance: 0, unlimited: true };
  }
  return { balance, unlimited: false };
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) =>
      opts.ctx.user ? toPublicUser(opts.ctx.user) : null
    ),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email("Email invalide"),
          password: z.string().min(1, "Mot de passe requis"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ENV.cookieSecret) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "JWT_SECRET non configuré sur le serveur",
          });
        }

        const user = await getUserByEmail(input.email);
        if (!user?.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email ou mot de passe incorrect",
          });
        }

        const valid = await verifyPassword(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email ou mot de passe incorrect",
          });
        }

        await syncOwnerAdminRole(user.openId, user.email);
        const refreshed = await getUserByEmail(input.email);
        const activeUser = refreshed ?? user;

        await touchUserLastSignedIn(activeUser.openId);
        await setSessionCookie(ctx.req, ctx.res, activeUser);

        return { user: toPublicUser(activeUser) };
      }),

    register: publicProcedure
      .input(
        z.object({
          email: z.string().email("Email invalide"),
          password: z.string().min(8, "Minimum 8 caractères"),
          name: z.string().trim().max(120).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ENV.cookieSecret) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "JWT_SECRET non configuré sur le serveur",
          });
        }

        const normalizedEmail = normalizeEmail(input.email);
        const role = resolveRoleForEmail(normalizedEmail);
        const displayName =
          input.name?.trim() || normalizedEmail.split("@")[0] || "Utilisateur";

        try {
          const passwordHash = await hashPassword(input.password);
          const user = await registerEmailUser({
            email: normalizedEmail,
            name: displayName,
            passwordHash,
            role,
          });

          await setSessionCookie(ctx.req, ctx.res, user);
          return { user: toPublicUser(user) };
        } catch (error) {
          if (error instanceof Error && error.message === "EMAIL_TAKEN") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Un compte existe déjà avec cet email",
            });
          }
          throw error;
        }
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  credits: router({
    balance: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") {
        return creditBalanceForUser("admin", 0);
      }
      const credits = await getUserCredits(ctx.user.id);
      return creditBalanceForUser("user", credits.balance);
    }),
    transactions: protectedProcedure.query(async ({ ctx }) => getUserTransactions(ctx.user.id)),
  }),

  messages: router({
    unread: protectedProcedure.query(async ({ ctx }) => getUnreadMessagesForUser(ctx.user.id)),
    markRead: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).optional() }).optional())
      .mutation(async ({ ctx, input }) => {
        await markUserMessagesRead(ctx.user.id, input?.ids);
        return { success: true as const };
      }),
  }),

  payments: router({
    createCheckout: protectedProcedure
      .input(
        z.object({
          pack: z.enum(["single", "pack10"]),
          origin: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const stripe = await getStripe();
        if (!stripe) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe non configuré" });
        }

        const packs = {
          single: {
            price: CREDIT_PRICING.single.stripeCents,
            credits: CREDIT_PRICING.single.credits,
            name: CREDIT_PRICING.single.stripeName,
            amountEur: CREDIT_PRICING.single.amountEur,
          },
          pack10: {
            price: CREDIT_PRICING.pack10.stripeCents,
            credits: CREDIT_PRICING.pack10.credits,
            name: CREDIT_PRICING.pack10.stripeName,
            amountEur: CREDIT_PRICING.pack10.amountEur,
          },
        };
        const pack = packs[input.pack];

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: { name: pack.name },
                unit_amount: pack.price,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${input.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${input.origin}/payment/cancel`,
          metadata: {
            userId: String(ctx.user.id),
            credits: String(pack.credits),
            pack: input.pack,
            amountEur: String(pack.amountEur),
          },
        });

        return { url: session.url! };
      }),

    confirmPayment: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const stripe = await getStripe();
        if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const session = await stripe.checkout.sessions.retrieve(input.sessionId);
        if (session.payment_status !== "paid") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Paiement non confirmé" });
        }

        const credits = parseInt(session.metadata?.credits ?? "0");
        const pack = session.metadata?.pack ?? "single";
        const amount = parseFloat(
          session.metadata?.amountEur ??
            String(creditPackAmountEurFallback(pack === "pack10" ? "pack10" : "single"))
        );

        if (session.metadata?.userId && session.metadata.userId !== String(ctx.user.id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Session de paiement invalide" });
        }

        if (credits > 0) {
          const result = await addCredits(
            ctx.user.id,
            credits,
            "purchase",
            `Achat ${pack === "pack10" ? "pack 10 crédits" : "1 crédit"} — ${amount.toFixed(2)} EUR`,
            input.sessionId,
            amount
          );
          return { success: true, credits, alreadyProcessed: result.alreadyProcessed };
        }

        return { success: true, credits, alreadyProcessed: false };
      }),
  }),

  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => getProjectsByUser(ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        if (project.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const photos = await getProjectPhotos(input.id);
        const renderings = await getProjectRenderings(input.id);
        const report = await getProjectReport(input.id);

        let briefData: Record<string, string> | null = null;
        if (project.briefData) {
          try {
            briefData = JSON.parse(project.briefData) as Record<string, string>;
          } catch {
            briefData = null;
          }
        }

        return { ...project, briefData, photos, renderings, report };
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          spaceType: z.enum(["interior", "exterior", "both"]),
          style: z.string().min(1).max(100),
          budget: z.string().optional(),
          constraints: z.string().optional(),
          additionalNotes: z.string().optional(),
          briefData: z.record(z.string(), z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await createProject({
          userId: ctx.user.id,
          title: input.title,
          spaceType: input.spaceType,
          style: input.style,
          budget: input.budget ?? null,
          constraints: input.constraints ?? null,
          additionalNotes: input.additionalNotes ?? null,
          briefData: input.briefData ? JSON.stringify(input.briefData) : null,
          status: "draft",
        });

        return { id: result.id };
      }),

    getUploadUrl: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          fileName: z.string(),
          mimeType: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const project = await assertProjectOwner(input.projectId, ctx.user.id);
        if (project.status !== "draft") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ce projet ne peut plus recevoir de photos" });
        }

        const key = `projects/${input.projectId}/photos/${Date.now()}-${input.fileName}`;
        const { uploadUrl, key: storageKey, url } = await storagePresignPut(key, input.mimeType);
        return { uploadUrl, key: storageKey, url };
      }),

    registerPhoto: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          storageKey: z.string(),
          url: z.string(),
          fileName: z.string(),
          title: z.string().max(255).optional(),
          order: z.number().default(0),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertProjectOwner(input.projectId, ctx.user.id);

        const result = await addProjectPhoto({
          projectId: input.projectId,
          storageKey: input.storageKey,
          url: input.url,
          originalName: input.fileName,
          title: input.title,
          order: input.order,
        });

        return { id: result.id, url: input.url };
      }),

    generate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await assertProjectOwner(input.projectId, ctx.user.id);
        if (project.status !== "draft") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ce projet a déjà été généré" });
        }

        const photos = await getProjectPhotos(input.projectId);
        if (photos.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ajoutez au moins une photo avant de générer" });
        }

        await startGeneration(input.projectId, ctx.user.id, ctx.user.role);
        return { success: true };
      }),

    retry: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await assertProjectOwner(input.projectId, ctx.user.id);
        if (project.status !== "failed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Seuls les projets en échec peuvent être relancés",
          });
        }

        const photos = await getProjectPhotos(input.projectId);
        if (photos.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Aucune photo disponible pour relancer la génération" });
        }

        await startGeneration(input.projectId, ctx.user.id, ctx.user.role);
        return { success: true };
      }),
  }),

  landing: router({
    get: publicProcedure.query(async () => getLandingContent()),
    save: adminProcedure.input(landingContentSchema).mutation(async ({ input }) => {
      return saveLandingContent(input);
    }),
    reset: adminProcedure.mutation(async () => resetLandingContent()),
  }),

  admin: router({
    stats: adminProcedure.query(async () => getAdminStats()),
    users: adminProcedure.query(async () => getAllUsers()),
    projects: adminProcedure.query(async () => getAllProjects()),
    grantCredits: adminProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          amount: z.number().int().min(1).max(999),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const target = await getUserById(input.userId);
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable" });
        }

        await addCredits(
          input.userId,
          input.amount,
          "purchase",
          `Crédit ajouté par ${ctx.user.email ?? ctx.user.name ?? "admin"}`
        );

        const updated = await getUserCredits(input.userId);
        return { success: true, balance: updated.balance };
      }),
    manageUser: adminProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          name: z.string().trim().min(1).max(120),
          email: z.string().email(),
          role: z.enum(["user", "admin"]),
          resetPassword: z.boolean().default(false),
          messageSubject: z.string().trim().min(1).max(200),
          messageBody: z.string().trim().min(1).max(5000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const target = await getUserById(input.userId);
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable" });
        }

        if (input.userId === ctx.user.id && input.role === "user" && ctx.user.role === "admin") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Vous ne pouvez pas retirer votre propre rôle administrateur",
          });
        }

        if (!target.email && !input.email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Un email est requis pour notifier l'utilisateur",
          });
        }

        let temporaryPassword: string | undefined;

        try {
          await updateUserByAdmin({
            userId: input.userId,
            name: input.name,
            email: input.email,
            role: input.role,
          });
        } catch (error) {
          if (error instanceof Error && error.message === "EMAIL_TAKEN") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Cet email est déjà utilisé par un autre compte",
            });
          }
          throw error;
        }

        if (input.resetPassword) {
          temporaryPassword = generateTemporaryPassword();
          await setUserPassword(input.userId, temporaryPassword);
        }

        const updated = await getUserById(input.userId);
        const recipientEmail = updated?.email ?? input.email;
        if (!recipientEmail) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Impossible d'envoyer le message sans adresse email",
          });
        }

        const mailContent = buildUserNotificationEmail({
          userName: input.name,
          subject: input.messageSubject,
          message: input.messageBody,
          temporaryPassword,
        });

        const emailResult = await sendTransactionalEmail({
          to: recipientEmail,
          subject: mailContent.subject,
          text: mailContent.text,
          html: mailContent.html,
        });

        await createUserMessage({
          userId: input.userId,
          sentByAdminId: ctx.user.id,
          subject: input.messageSubject,
          body: input.messageBody,
          emailDelivered: emailResult.delivered,
        });

        return {
          success: true,
          emailDelivered: emailResult.delivered,
          temporaryPassword: emailResult.delivered ? undefined : temporaryPassword,
        };
      }),

    settings: router({
      get: adminProcedure.query(async () => getAppSettingsPublic()),
      update: adminProcedure.input(appSettingsUpdateSchema).mutation(async ({ input }) => {
        await saveAppSettings(input);
        return getAppSettingsPublic();
      }),
    }),

    testProjects: router({
      list: adminProcedure.query(async ({ ctx }) => getAdminTestProjectsForUser(ctx.user.id)),
      ensure: adminProcedure.mutation(async ({ ctx }) => ensureAdminTestProjects(ctx.user.id)),
      getBySlot: adminProcedure
        .input(z.object({ slot: z.enum(["1", "2", "3"]) }))
        .query(async ({ ctx, input }) => {
          let project = await getAdminTestProjectBySlot(ctx.user.id, input.slot);
          if (!project) {
            await ensureAdminTestProjects(ctx.user.id);
            project = await getAdminTestProjectBySlot(ctx.user.id, input.slot);
          }
          if (!project) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Impossible de préparer le projet de test.",
            });
          }
          return project;
        }),
    }),
  }),
});

async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const Stripe = (await import("stripe")).default;
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

export type AppRouter = typeof appRouter;
