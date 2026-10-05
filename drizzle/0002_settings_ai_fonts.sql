ALTER TABLE "settings" ADD COLUMN "ai" jsonb;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "fonts" jsonb;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "secrets" jsonb;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "author_token_hash" text;