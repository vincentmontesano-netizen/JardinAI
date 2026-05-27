CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."credit_type" AS ENUM('purchase', 'use', 'refund');--> statement-breakpoint
CREATE TYPE "public"."space_type" AS ENUM('interior', 'exterior', 'both');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "user_credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_credits_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"amount" integer NOT NULL,
	"type" "credit_type" NOT NULL,
	"stripeSessionId" varchar(255),
	"amountEur" numeric(10, 2),
	"description" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "credit_transactions_stripe_session_unique" ON "credit_transactions" USING btree ("stripeSessionId");--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"spaceType" "space_type" NOT NULL,
	"style" varchar(100) NOT NULL,
	"budget" varchar(100),
	"constraints" text,
	"additionalNotes" text,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"generationAttempts" integer DEFAULT 0 NOT NULL,
	"lastError" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"storageKey" varchar(500) NOT NULL,
	"url" text NOT NULL,
	"originalName" varchar(255),
	"photoOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_renderings" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"originalPhotoId" integer,
	"renderedUrl" text NOT NULL,
	"storageKey" varchar(500) NOT NULL,
	"prompt" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"planContent" text,
	"roadmapContent" text,
	"estimatedCostMin" numeric(10, 2),
	"estimatedCostMax" numeric(10, 2),
	"artisansList" text,
	"purchasesList" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_reports_projectId_unique" UNIQUE("projectId")
);
