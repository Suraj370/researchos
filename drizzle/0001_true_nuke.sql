CREATE TABLE "competitive_comparisons" (
	"research_id" text PRIMARY KEY NOT NULL,
	"comparison" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitor_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"research_id" text NOT NULL,
	"competitor" text NOT NULL,
	"analysis" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitive_comparisons" ADD CONSTRAINT "competitive_comparisons_research_id_research_id_fk" FOREIGN KEY ("research_id") REFERENCES "public"."research"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_analyses" ADD CONSTRAINT "competitor_analyses_research_id_research_id_fk" FOREIGN KEY ("research_id") REFERENCES "public"."research"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "competitor_analyses_research_id_competitor_idx" ON "competitor_analyses" USING btree ("research_id","competitor");