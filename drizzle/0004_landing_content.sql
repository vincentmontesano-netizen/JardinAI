CREATE TABLE IF NOT EXISTS "landing_content" (
  "id" integer PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
  "content" jsonb NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
