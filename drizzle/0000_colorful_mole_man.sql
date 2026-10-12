CREATE TABLE "audits" (
	"id" text PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"area_id" text NOT NULL,
	"area_name" text,
	"auditor" text NOT NULL,
	"auditee" text NOT NULL,
	"ans" jsonb NOT NULL,
	"finds" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score" jsonb,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dept_audits" (
	"id" text PRIMARY KEY NOT NULL,
	"unit" text NOT NULL,
	"unit_name" text,
	"dept" text,
	"date" text NOT NULL,
	"auditor" text NOT NULL,
	"auditee" text NOT NULL,
	"ans" jsonb NOT NULL,
	"finds" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score" jsonb,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" text PRIMARY KEY NOT NULL,
	"audit_id" text NOT NULL,
	"audit_src" text DEFAULT 'p' NOT NULL,
	"item_n" integer NOT NULL,
	"kind" text DEFAULT 'photos' NOT NULL,
	"mime" text DEFAULT 'image/jpeg' NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" bigint NOT NULL
);
