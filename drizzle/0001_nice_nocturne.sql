ALTER TABLE "audits" ADD COLUMN "root_cause" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "dept_audits" ADD COLUMN "root_cause" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "audits" AS a SET "root_cause" = COALESCE((
	SELECT jsonb_object_agg(kv.key, kv.value->>'rootCause')
	FROM jsonb_each(a."finds") AS kv
	WHERE kv.value ? 'rootCause' AND NULLIF(kv.value->>'rootCause', '') IS NOT NULL
), '{}'::jsonb);--> statement-breakpoint
UPDATE "dept_audits" AS a SET "root_cause" = COALESCE((
	SELECT jsonb_object_agg(kv.key, kv.value->>'rootCause')
	FROM jsonb_each(a."finds") AS kv
	WHERE kv.value ? 'rootCause' AND NULLIF(kv.value->>'rootCause', '') IS NOT NULL
), '{}'::jsonb);