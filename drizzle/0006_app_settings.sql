CREATE TABLE IF NOT EXISTS "app_settings" (
  "id" integer PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
  "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
