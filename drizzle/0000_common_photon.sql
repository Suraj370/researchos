CREATE TABLE "research" (
	"id" text PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"status" text DEFAULT 'initializing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"research_id" text NOT NULL,
	"competitor" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"domain" text NOT NULL,
	"snippet" text,
	"published_date" text,
	"relevance_score" real,
	"source_type" text DEFAULT 'unknown' NOT NULL,
	"search_category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "research_sources" ADD CONSTRAINT "research_sources_research_id_research_id_fk" FOREIGN KEY ("research_id") REFERENCES "public"."research"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "research_sources_research_id_url_idx" ON "research_sources" USING btree ("research_id","url");