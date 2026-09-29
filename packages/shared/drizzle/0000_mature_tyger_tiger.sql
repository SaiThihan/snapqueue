CREATE TYPE "public"."status" AS ENUM('completed', 'failed');--> statement-breakpoint
CREATE TABLE "screenshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"url" text NOT NULL,
	"viewport" text NOT NULL,
	"status" "status" NOT NULL,
	"image_path" text,
	"failed_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "url_idx" ON "screenshots" USING btree ("url");