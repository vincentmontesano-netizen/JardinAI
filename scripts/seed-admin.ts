import "dotenv/config";
import { closeDb, ensureAdminAccount } from "../server/db";
import { ENV } from "../server/_core/env";

async function main() {
  const email = (ENV.ownerEmail || process.env.ADMIN_EMAIL || "").trim();
  const password = process.env.ADMIN_SEED_PASSWORD || "";

  if (!email) {
    console.error("OWNER_EMAIL ou ADMIN_EMAIL requis.");
    process.exit(1);
  }
  if (!password) {
    console.error("ADMIN_SEED_PASSWORD requis.");
    process.exit(1);
  }

  const user = await ensureAdminAccount({
    email,
    password,
    name: process.env.ADMIN_NAME || email.split("@")[0] || "Administrateur",
    resetPassword: true,
  });

  console.log(`Compte admin prêt : ${user.email} (id ${user.id}, rôle ${user.role})`);
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
