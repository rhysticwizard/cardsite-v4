ALTER TABLE "decks" DROP CONSTRAINT "decks_deck_id_unique";--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "card_faces" jsonb;--> statement-breakpoint
ALTER TABLE "decks" DROP COLUMN "deck_id";