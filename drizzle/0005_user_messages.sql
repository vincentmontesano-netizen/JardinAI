CREATE TABLE IF NOT EXISTS "user_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "sentByAdminId" integer,
  "subject" varchar(255) NOT NULL,
  "body" text NOT NULL,
  "emailDelivered" boolean DEFAULT false NOT NULL,
  "readAt" timestamp with time zone,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_messages_user_id_idx" ON "user_messages" ("userId");
