ALTER TABLE "deck_cards" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "deck_cards" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "deck_cards" ALTER COLUMN "deck_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "decks" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "decks" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();