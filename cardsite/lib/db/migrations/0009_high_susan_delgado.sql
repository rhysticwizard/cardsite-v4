ALTER TABLE "deck_cards" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "deck_cards" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "deck_cards" ALTER COLUMN "deck_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "decks" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "decks" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "uuid" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
CREATE INDEX "decks_uuid_idx" ON "decks" USING btree ("uuid");--> statement-breakpoint
CREATE INDEX "decks_user_format_idx" ON "decks" USING btree ("user_id","format");--> statement-breakpoint
CREATE INDEX "decks_user_created_idx" ON "decks" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "decks_user_public_created_idx" ON "decks" USING btree ("user_id","is_public","created_at");--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_uuid_unique" UNIQUE("uuid");