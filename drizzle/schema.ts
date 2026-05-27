import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  timestamp,
  decimal,
  pgEnum,
  uniqueIndex,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import type { LandingContent } from "../shared/landingContent";
import type { AppSettings } from "../shared/appSettings";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const creditTypeEnum = pgEnum("credit_type", ["purchase", "use", "refund"]);
export const spaceTypeEnum = pgEnum("space_type", ["interior", "exterior", "both"]);
export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "processing",
  "completed",
  "failed",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const userCredits = pgTable("user_credits", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  balance: integer("balance").default(0).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type UserCredits = typeof userCredits.$inferSelect;

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    amount: integer("amount").notNull(),
    type: creditTypeEnum("type").notNull(),
    stripeSessionId: varchar("stripeSessionId", { length: 255 }),
    amountEur: decimal("amountEur", { precision: 10, scale: 2 }),
    description: text("description"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    stripeSessionUnique: uniqueIndex("credit_transactions_stripe_session_unique").on(
      table.stripeSessionId
    ),
  })
);

export type CreditTransaction = typeof creditTransactions.$inferSelect;

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  spaceType: spaceTypeEnum("spaceType").notNull(),
  style: varchar("style", { length: 100 }).notNull(),
  budget: varchar("budget", { length: 100 }),
  constraints: text("constraints"),
  additionalNotes: text("additionalNotes"),
  briefData: text("briefData"),
  status: projectStatusEnum("status").default("draft").notNull(),
  generationAttempts: integer("generationAttempts").default(0).notNull(),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export const projectPhotos = pgTable("project_photos", {
  id: serial("id").primaryKey(),
  projectId: integer("projectId").notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  url: text("url").notNull(),
  originalName: varchar("originalName", { length: 255 }),
  title: varchar("title", { length: 255 }),
  photoOrder: integer("photoOrder").default(0).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type ProjectPhoto = typeof projectPhotos.$inferSelect;

export const projectRenderings = pgTable("project_renderings", {
  id: serial("id").primaryKey(),
  projectId: integer("projectId").notNull(),
  originalPhotoId: integer("originalPhotoId"),
  renderedUrl: text("renderedUrl").notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  prompt: text("prompt"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type ProjectRendering = typeof projectRenderings.$inferSelect;

export const projectReports = pgTable("project_reports", {
  id: serial("id").primaryKey(),
  projectId: integer("projectId").notNull().unique(),
  planContent: text("planContent"),
  roadmapContent: text("roadmapContent"),
  estimatedCostMin: decimal("estimatedCostMin", { precision: 10, scale: 2 }),
  estimatedCostMax: decimal("estimatedCostMax", { precision: 10, scale: 2 }),
  artisansList: text("artisansList"),
  purchasesList: text("purchasesList"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type ProjectReport = typeof projectReports.$inferSelect;

export const landingContent = pgTable("landing_content", {
  id: integer("id").primaryKey().default(1),
  content: jsonb("content").$type<LandingContent>().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type LandingContentRow = typeof landingContent.$inferSelect;

export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  settings: jsonb("settings").$type<AppSettings>().notNull().default({}),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type AppSettingsRow = typeof appSettings.$inferSelect;

export const userMessages = pgTable("user_messages", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  sentByAdminId: integer("sentByAdminId"),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  emailDelivered: boolean("emailDelivered").default(false).notNull(),
  readAt: timestamp("readAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type UserMessage = typeof userMessages.$inferSelect;
