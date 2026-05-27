import { eq, desc, sql, and, isNull, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  InsertUser,
  users,
  projects,
  projectPhotos,
  projectRenderings,
  projectReports,
  userCredits,
  creditTransactions,
  landingContent,
  appSettings,
  userMessages,
  InsertProject,
} from "../drizzle/schema";
import { hashPassword } from "./_core/password";
import {
  DEFAULT_LANDING_CONTENT,
  landingContentSchema,
  type LandingContent,
} from "../shared/landingContent";
import { ENV } from "./_core/env";
import {
  appSettingsSchema,
  DEFAULT_APP_SETTINGS,
  DEFAULT_GEMINI_IMAGE_MODEL,
  DEFAULT_GEMINI_TEXT_MODEL,
  toPublicAppSettings,
  type AppSettings,
  type AppSettingsPublic,
  type AppSettingsUpdate,
} from "../shared/appSettings";
import {
  normalizeGeminiImageModel,
  normalizeGeminiTextModel,
} from "../shared/geminiModels";
import {
  buildBriefAnswers,
  parseTestSlotFromBriefData,
  TEST_PROJECT_SLOTS,
  type TestProjectSlot,
  getTestProjectTemplate,
} from "../shared/testProjects";

const { Pool } = pg;

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new Pool({ connectionString: process.env.DATABASE_URL });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

// ===== USERS =====

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = { updatedAt: new Date() };

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (
      (ENV.ownerOpenId && user.openId === ENV.ownerOpenId) ||
      (ENV.ownerEmail && user.email?.trim().toLowerCase() === ENV.ownerEmail)
    ) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 1) updateSet.lastSignedIn = new Date();

    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({ target: users.openId, set: updateSet });

    const existingUser = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    if (existingUser[0]) {
      await db
        .insert(userCredits)
        .values({ userId: existingUser[0].id, balance: 0 })
        .onConflictDoUpdate({
          target: userCredits.userId,
          set: { updatedAt: new Date() },
        });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  return getUserByOpenId(`email:${email.trim().toLowerCase()}`);
}

export async function registerEmailUser(params: {
  email: string;
  name: string;
  passwordHash: string;
  role?: "user" | "admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const normalizedEmail = params.email.trim().toLowerCase();
  const openId = `email:${normalizedEmail}`;
  const existing = await getUserByOpenId(openId);
  if (existing) throw new Error("EMAIL_TAKEN");

  await db.insert(users).values({
    openId,
    email: normalizedEmail,
    name: params.name,
    passwordHash: params.passwordHash,
    loginMethod: "email",
    role: params.role ?? "user",
    lastSignedIn: new Date(),
  });

  const created = await getUserByOpenId(openId);
  if (!created) throw new Error("Failed to create user");

  await db
    .insert(userCredits)
    .values({ userId: created.id, balance: 0 })
    .onConflictDoUpdate({
      target: userCredits.userId,
      set: { updatedAt: new Date() },
    });

  return created;
}

export async function touchUserLastSignedIn(openId: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ lastSignedIn: new Date(), updatedAt: new Date() })
    .where(eq(users.openId, openId));
}

export function resolveRoleForEmail(email: string): "user" | "admin" {
  const normalized = email.trim().toLowerCase();
  if (ENV.ownerEmail && normalized === ENV.ownerEmail) return "admin";
  return "user";
}

export async function ensureAdminAccount(params: {
  email: string;
  password: string;
  name?: string;
  resetPassword?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const normalizedEmail = params.email.trim().toLowerCase();
  const openId = `email:${normalizedEmail}`;
  const displayName =
    params.name?.trim() || normalizedEmail.split("@")[0] || "Administrateur";
  const passwordHash = await hashPassword(params.password);

  const existing = await getUserByOpenId(openId);
  if (!existing) {
    return registerEmailUser({
      email: normalizedEmail,
      name: displayName,
      passwordHash,
      role: "admin",
    });
  }

  const updates: Partial<typeof users.$inferInsert> = {
    role: "admin",
    updatedAt: new Date(),
  };
  if (!existing.passwordHash || params.resetPassword) {
    updates.passwordHash = passwordHash;
  }
  if (!existing.name?.trim()) {
    updates.name = displayName;
  }

  await db.update(users).set(updates).where(eq(users.openId, openId));

  const updated = await getUserByOpenId(openId);
  if (!updated) throw new Error("Failed to update admin account");
  return updated;
}

export async function syncOwnerAdminRole(openId: string, email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!ENV.ownerEmail || normalizedEmail !== ENV.ownerEmail) return;

  const db = await getDb();
  if (!db) return;

  await db
    .update(users)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(users.openId, openId));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      credits: userCredits.balance,
    })
    .from(users)
    .leftJoin(userCredits, eq(users.id, userCredits.userId))
    .orderBy(desc(users.createdAt));
  return result;
}

// ===== CREDITS =====

export async function getUserCredits(userId: number) {
  const db = await getDb();
  if (!db) return { balance: 0 };
  const result = await db.select().from(userCredits).where(eq(userCredits.userId, userId)).limit(1);
  return result[0] ?? { balance: 0 };
}

export async function getTransactionByStripeSessionId(stripeSessionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.stripeSessionId, stripeSessionId))
    .limit(1);
  return result[0];
}

export async function addCredits(
  userId: number,
  amount: number,
  type: "purchase" | "use" | "refund",
  description?: string,
  stripeSessionId?: string,
  amountEur?: number
): Promise<{ alreadyProcessed: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  if (stripeSessionId) {
    const existing = await getTransactionByStripeSessionId(stripeSessionId);
    if (existing) return { alreadyProcessed: true };
  }

  await db
    .insert(userCredits)
    .values({ userId, balance: amount })
    .onConflictDoUpdate({
      target: userCredits.userId,
      set: { balance: sql`${userCredits.balance} + ${amount}`, updatedAt: new Date() },
    });

  await db.insert(creditTransactions).values({
    userId,
    amount,
    type,
    description: description ?? null,
    stripeSessionId: stripeSessionId ?? null,
    amountEur: amountEur != null ? String(amountEur) : null,
  });

  return { alreadyProcessed: false };
}

export async function refundCredit(userId: number, description = "Remboursement — génération échouée") {
  return addCredits(userId, 1, "refund", description);
}

export async function deductCredit(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const credits = await getUserCredits(userId);
  if (credits.balance <= 0) throw new Error("Solde de credits insuffisant");

  await db
    .update(userCredits)
    .set({ balance: sql`${userCredits.balance} - 1`, updatedAt: new Date() })
    .where(eq(userCredits.userId, userId));

  await db.insert(creditTransactions).values({
    userId,
    amount: -1,
    type: "use",
    description: "Utilisation d'un credit projet",
  });
}

export async function getUserTransactions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(50);
}

// ===== PROJECTS =====

export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(projects).values(data).returning({ id: projects.id });
  return result;
}

export async function getProjectsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0];
}

export async function updateProjectStatus(
  id: number,
  status: "draft" | "processing" | "completed" | "failed"
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(projects)
    .set({ status, updatedAt: new Date() })
    .where(eq(projects.id, id));
}

export async function clearProjectGenerationError(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(projects)
    .set({ lastError: null, updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}

export async function recordProjectGenerationFailure(projectId: number, lastError: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(projects)
    .set({
      lastError,
      generationAttempts: sql`${projects.generationAttempts} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));
}

export async function clearProjectOutputs(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(projectRenderings).where(eq(projectRenderings.projectId, projectId));
  await db.delete(projectReports).where(eq(projectReports.projectId, projectId));
}

export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: projects.id,
      title: projects.title,
      spaceType: projects.spaceType,
      status: projects.status,
      userId: projects.userId,
      createdAt: projects.createdAt,
      userName: users.name,
    })
    .from(projects)
    .leftJoin(users, eq(projects.userId, users.id))
    .orderBy(desc(projects.createdAt))
    .limit(100);
}

// ===== PHOTOS =====

export async function addProjectPhoto(data: {
  projectId: number;
  storageKey: string;
  url: string;
  originalName?: string;
  title?: string;
  order: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db
    .insert(projectPhotos)
    .values({
      projectId: data.projectId,
      storageKey: data.storageKey,
      url: data.url,
      originalName: data.originalName,
      title: data.title?.trim() || null,
      photoOrder: data.order,
    })
    .returning({ id: projectPhotos.id });
  return result;
}

export async function getProjectPhotos(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(projectPhotos)
    .where(eq(projectPhotos.projectId, projectId))
    .orderBy(projectPhotos.photoOrder);
}

// ===== RENDERINGS =====

export async function addRendering(data: {
  projectId: number;
  originalPhotoId?: number;
  renderedUrl: string;
  storageKey: string;
  prompt?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(projectRenderings).values(data).returning({ id: projectRenderings.id });
  return result;
}

export async function getProjectRenderings(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectRenderings).where(eq(projectRenderings.projectId, projectId));
}

// ===== REPORTS =====

export async function upsertProjectReport(data: {
  projectId: number;
  planContent?: string;
  roadmapContent?: string;
  estimatedCostMin?: string;
  estimatedCostMax?: string;
  artisansList?: string;
  purchasesList?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .insert(projectReports)
    .values({ ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: projectReports.projectId,
      set: { ...data, updatedAt: new Date() },
    });
}

export async function getProjectReport(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(projectReports)
    .where(eq(projectReports.projectId, projectId))
    .limit(1);
  return result[0];
}

// ===== ADMIN STATS =====

export async function getAdminStats() {
  const db = await getDb();
  if (!db) {
    return { totalUsers: 0, totalProjects: 0, completedProjects: 0, totalRevenue: 0, monthlyRevenue: [] };
  }

  const [usersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const [projectsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(projects);
  const [completedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.status, "completed"));

  const revenueResult = await db
    .select({ total: sql<number>`COALESCE(SUM("amountEur"), 0)::float` })
    .from(creditTransactions)
    .where(eq(creditTransactions.type, "purchase"));

  const monthlyRevenue = await db
    .select({
      month: sql<string>`TO_CHAR("createdAt", 'YYYY-MM')`,
      revenue: sql<number>`COALESCE(SUM("amountEur"), 0)::float`,
    })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.type, "purchase"),
        sql`"createdAt" >= NOW() - INTERVAL '6 months'`
      )
    )
    .groupBy(sql`TO_CHAR("createdAt", 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR("createdAt", 'YYYY-MM')`);

  return {
    totalUsers: Number(usersCount?.count ?? 0),
    totalProjects: Number(projectsCount?.count ?? 0),
    completedProjects: Number(completedCount?.count ?? 0),
    totalRevenue: Number(revenueResult[0]?.total ?? 0),
    monthlyRevenue: monthlyRevenue.map((r) => ({ month: r.month, revenue: Number(r.revenue) })),
  };
}

// ===== LANDING CMS =====

export async function getLandingContent(): Promise<LandingContent> {
  const db = await getDb();
  if (!db) return DEFAULT_LANDING_CONTENT;

  try {
    const rows = await db.select().from(landingContent).where(eq(landingContent.id, 1)).limit(1);
    if (!rows[0]?.content) return DEFAULT_LANDING_CONTENT;
    const parsed = landingContentSchema.safeParse(rows[0].content);
    return parsed.success ? parsed.data : DEFAULT_LANDING_CONTENT;
  } catch (error) {
    console.warn("[Landing] Failed to load content:", error);
    return DEFAULT_LANDING_CONTENT;
  }
}

export async function saveLandingContent(content: LandingContent): Promise<LandingContent> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const parsed = landingContentSchema.parse(content);
  await db
    .insert(landingContent)
    .values({ id: 1, content: parsed, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: landingContent.id,
      set: { content: parsed, updatedAt: new Date() },
    });

  return parsed;
}

export async function resetLandingContent(): Promise<LandingContent> {
  return saveLandingContent(DEFAULT_LANDING_CONTENT);
}

// ===== APP SETTINGS =====

let _geminiRuntimeCache: {
  apiKey: string;
  textModel: string;
  imageModel: string;
} | null = null;

export function invalidateGeminiRuntimeCache() {
  _geminiRuntimeCache = null;
}

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDb();
  if (!db) return { ...DEFAULT_APP_SETTINGS };

  try {
    const rows = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
    if (!rows[0]?.settings) return { ...DEFAULT_APP_SETTINGS };
    const parsed = appSettingsSchema.safeParse(rows[0].settings);
    return parsed.success ? { ...DEFAULT_APP_SETTINGS, ...parsed.data } : { ...DEFAULT_APP_SETTINGS };
  } catch (error) {
    console.warn("[AppSettings] Failed to load:", error);
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export async function saveAppSettings(update: AppSettingsUpdate): Promise<AppSettings> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const current = await getAppSettings();
  const merged: AppSettings = {
    geminiTextModel: normalizeGeminiTextModel(
      update.geminiTextModel?.trim() || current.geminiTextModel || DEFAULT_GEMINI_TEXT_MODEL
    ),
    geminiImageModel: normalizeGeminiImageModel(
      update.geminiImageModel?.trim() || current.geminiImageModel || DEFAULT_GEMINI_IMAGE_MODEL
    ),
  };

  const incomingKey = update.geminiApiKey?.trim();
  if (incomingKey) {
    merged.geminiApiKey = incomingKey;
  } else if (current.geminiApiKey) {
    merged.geminiApiKey = current.geminiApiKey;
  }

  const parsed = appSettingsSchema.parse(merged);
  await db
    .insert(appSettings)
    .values({ id: 1, settings: parsed, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { settings: parsed, updatedAt: new Date() },
    });

  invalidateGeminiRuntimeCache();
  return parsed;
}

export async function getAppSettingsPublic(): Promise<AppSettingsPublic> {
  const stored = await getAppSettings();
  return toPublicAppSettings(stored, {
    geminiTextModel: ENV.geminiTextModel || DEFAULT_GEMINI_TEXT_MODEL,
    geminiImageModel: ENV.geminiImageModel || DEFAULT_GEMINI_IMAGE_MODEL,
    geminiApiKey: ENV.geminiApiKey,
  });
}

export async function getGeminiRuntimeConfig(): Promise<{
  apiKey: string;
  textModel: string;
  imageModel: string;
}> {
  if (_geminiRuntimeCache) return _geminiRuntimeCache;

  const stored = await getAppSettings();
  _geminiRuntimeCache = {
    apiKey: stored.geminiApiKey?.trim() || ENV.geminiApiKey || "",
    textModel: normalizeGeminiTextModel(
      stored.geminiTextModel?.trim() || ENV.geminiTextModel || DEFAULT_GEMINI_TEXT_MODEL
    ),
    imageModel: normalizeGeminiImageModel(
      stored.geminiImageModel?.trim() || ENV.geminiImageModel || DEFAULT_GEMINI_IMAGE_MODEL
    ),
  };
  return _geminiRuntimeCache;
}

// ===== ADMIN TEST PROJECTS =====

function parseBriefDataRaw(briefData: string | null): Record<string, string> | null {
  if (!briefData) return null;
  try {
    return JSON.parse(briefData) as Record<string, string>;
  } catch {
    return null;
  }
}

export async function getAdminTestProjectsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));

  const bySlot = new Map<TestProjectSlot, (typeof userProjects)[number]>();

  for (const project of userProjects) {
    const brief = parseBriefDataRaw(project.briefData);
    const slot = parseTestSlotFromBriefData(brief);
    if (!slot || bySlot.has(slot)) continue;
    bySlot.set(slot, project);
  }

  return TEST_PROJECT_SLOTS.map((slot) => {
    const template = getTestProjectTemplate(slot);
    const project = bySlot.get(slot);
    return {
      slot,
      template,
      projectId: project?.id ?? null,
      title: project?.title ?? template.title,
      status: project?.status ?? null,
    };
  });
}

async function resetTestProjectOutputs(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(projectPhotos).where(eq(projectPhotos.projectId, projectId));
  await db.delete(projectRenderings).where(eq(projectRenderings.projectId, projectId));
  await db.delete(projectReports).where(eq(projectReports.projectId, projectId));
}

export async function ensureAdminTestProjects(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const existing = await getAdminTestProjectsForUser(userId);
  const results: Array<{
    slot: TestProjectSlot;
    projectId: number;
    title: string;
    spaceType: "interior" | "exterior" | "both";
    style: string;
    budget: string | null;
    briefData: Record<string, string>;
  }> = [];

  for (const slot of TEST_PROJECT_SLOTS) {
    const template = getTestProjectTemplate(slot);
    const briefData = buildBriefAnswers(template.spaceType, slot);
    const row = existing.find((e) => e.slot === slot);

    if (row?.projectId) {
      await resetTestProjectOutputs(row.projectId);
      await db
        .update(projects)
        .set({
          title: template.title,
          spaceType: template.spaceType,
          style: template.style,
          budget: template.budget,
          briefData: JSON.stringify(briefData),
          status: "draft",
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, row.projectId));

      results.push({
        slot,
        projectId: row.projectId,
        title: template.title,
        spaceType: template.spaceType,
        style: template.style,
        budget: template.budget,
        briefData,
      });
    } else {
      const created = await createProject({
        userId,
        title: template.title,
        spaceType: template.spaceType,
        style: template.style,
        budget: template.budget,
        briefData: JSON.stringify(briefData),
        status: "draft",
      });
      results.push({
        slot,
        projectId: created.id,
        title: template.title,
        spaceType: template.spaceType,
        style: template.style,
        budget: template.budget,
        briefData,
      });
    }
  }

  return results;
}

export async function getAdminTestProjectBySlot(userId: number, slot: TestProjectSlot) {
  const list = await getAdminTestProjectsForUser(userId);
  const entry = list.find((e) => e.slot === slot);
  if (!entry?.projectId) return null;

  const project = await getProjectById(entry.projectId);
  if (!project || project.userId !== userId) return null;

  const briefData = parseBriefDataRaw(project.briefData) ?? buildBriefAnswers(project.spaceType, slot);
  const photos = await getProjectPhotos(entry.projectId);

  return {
    slot,
    projectId: entry.projectId,
    title: project.title,
    spaceType: project.spaceType,
    style: project.style,
    budget: project.budget,
    briefData,
    photoCount: photos.length,
    template: getTestProjectTemplate(slot),
  };
}

// ===== USER ADMIN =====

export async function updateUserByAdmin(params: {
  userId: number;
  name: string;
  email: string;
  role: "user" | "admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const existing = await getUserById(params.userId);
  if (!existing) throw new Error("USER_NOT_FOUND");

  const normalizedEmail = params.email.trim().toLowerCase();
  const newOpenId = `email:${normalizedEmail}`;

  if (newOpenId !== existing.openId) {
    const conflict = await getUserByOpenId(newOpenId);
    if (conflict && conflict.id !== params.userId) {
      throw new Error("EMAIL_TAKEN");
    }
  }

  await db
    .update(users)
    .set({
      name: params.name.trim(),
      email: normalizedEmail,
      openId: newOpenId,
      role: params.role,
      updatedAt: new Date(),
    })
    .where(eq(users.id, params.userId));

  const updated = await getUserById(params.userId);
  if (!updated) throw new Error("USER_NOT_FOUND");
  return updated;
}

export async function setUserPassword(userId: number, plainPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const passwordHash = await hashPassword(plainPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function createUserMessage(params: {
  userId: number;
  sentByAdminId: number;
  subject: string;
  body: string;
  emailDelivered: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const [row] = await db
    .insert(userMessages)
    .values({
      userId: params.userId,
      sentByAdminId: params.sentByAdminId,
      subject: params.subject,
      body: params.body,
      emailDelivered: params.emailDelivered,
    })
    .returning();

  return row;
}

export async function getUnreadMessagesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(userMessages)
    .where(and(eq(userMessages.userId, userId), isNull(userMessages.readAt)))
    .orderBy(desc(userMessages.createdAt))
    .limit(10);
}

export async function markUserMessagesRead(userId: number, messageIds?: number[]) {
  const db = await getDb();
  if (!db) return;

  const whereClause =
    messageIds && messageIds.length > 0
      ? and(eq(userMessages.userId, userId), inArray(userMessages.id, messageIds))
      : and(eq(userMessages.userId, userId), isNull(userMessages.readAt));

  await db.update(userMessages).set({ readAt: new Date() }).where(whereClause);
}
