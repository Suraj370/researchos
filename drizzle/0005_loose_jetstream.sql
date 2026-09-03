ALTER TABLE "research" ADD COLUMN "plan" jsonb;--> statement-breakpoint
ALTER TABLE "research" ADD COLUMN "agent_outcome" text;--> statement-breakpoint
ALTER TABLE "research" ADD COLUMN "iterations" integer;--> statement-breakpoint
ALTER TABLE "research" ADD COLUMN "searches_executed" integer;--> statement-breakpoint
ALTER TABLE "research" ADD COLUMN "missing_areas" jsonb;