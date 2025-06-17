ALTER TABLE "decks" ADD COLUMN "deck_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_deck_id_unique" UNIQUE("deck_id");