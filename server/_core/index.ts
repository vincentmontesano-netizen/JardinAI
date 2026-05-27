import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerLocalStorageRoutes, registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { addCredits, ensureAdminAccount } from "../db";
import { ENV } from "./env";
import { isUsingLocalStorage, getLocalStorageRoot } from "../localStorage";
import { creditPackAmountEurFallback, type CreditPackId } from "@shared/pricing";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function seedAdminIfConfigured() {
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!ENV.ownerEmail || !password) {
    if (ENV.isProduction) {
      console.warn(
        "[Auth] OWNER_EMAIL ou ADMIN_SEED_PASSWORD manquant — aucun compte admin créé automatiquement."
      );
    }
    return;
  }

  try {
    await ensureAdminAccount({
      email: ENV.ownerEmail,
      password,
      resetPassword: true,
    });
    console.log("[Auth] Compte administrateur prêt:", ENV.ownerEmail);
  } catch (error) {
    console.error("[Auth] Échec initialisation administrateur:", error);
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  if (process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Stripe webhook MUST use raw body — register BEFORE express.json()
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      const stripeKey = process.env.STRIPE_SECRET_KEY;

      if (!stripeKey) {
        res.status(400).json({ error: "Stripe not configured" });
        return;
      }

      let event: any;
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" });

        if (webhookSecret && sig) {
          event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
          event = JSON.parse(req.body.toString());
        }
      } catch (err: any) {
        console.error("[Webhook] Signature verification failed:", err.message);
        res.status(400).json({ error: "Webhook signature verification failed" });
        return;
      }

      // Handle test events
      if (event.id?.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected, returning verification response");
        res.json({ verified: true });
        return;
      }

      console.log("[Webhook] Event:", event.type);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        if (session.payment_status === "paid") {
          const userId = parseInt(session.metadata?.userId ?? "0");
          const credits = parseInt(session.metadata?.credits ?? "0");
          const pack = session.metadata?.pack ?? "single";
          const amount = parseFloat(
            session.metadata?.amountEur ??
              String(creditPackAmountEurFallback((pack === "pack10" ? "pack10" : "single") as CreditPackId))
          );

          if (userId > 0 && credits > 0) {
            try {
              await addCredits(
                userId,
                credits,
                "purchase",
                `Achat ${pack === "pack10" ? "pack 10 crédits" : "1 crédit"} — ${amount.toFixed(2)} EUR`,
                session.id,
                amount
              );
              console.log(`[Webhook] Added ${credits} credits to user ${userId}`);
            } catch (err) {
              console.error("[Webhook] Failed to add credits:", err);
            }
          }
        }
      }

      res.json({ received: true });
    }
  );

  registerLocalStorageRoutes(app);

  // Standard body parsers
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  const serveStaticFiles = process.env.SERVE_STATIC !== "false";

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else if (serveStaticFiles) {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port =
    process.env.NODE_ENV === "production"
      ? preferredPort
      : await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  const host = process.env.HOST || "0.0.0.0";
  await seedAdminIfConfigured();

  if (isUsingLocalStorage()) {
    console.log("[Storage] Mode local (dev) — fichiers dans:", getLocalStorageRoot());
  }

  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}/`);
  });
}

startServer().catch(console.error);
