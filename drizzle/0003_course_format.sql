ALTER TABLE "courses" ADD COLUMN "format" text DEFAULT 'course' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_parent_id_courses_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;