-- Drop existing tables (we don't need the data)
DROP TABLE IF EXISTS "deck_cards" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "decks" CASCADE;--> statement-breakpoint

-- Create new decks table with short IDs
CREATE TABLE "decks" (
  "id" varchar(12) PRIMARY KEY NOT NULL,
  "user_id" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "format" varchar(50) DEFAULT 'standard' NOT NULL,
  "is_public" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Create new deck_cards table with short IDs
CREATE TABLE "deck_cards" (
  "id" varchar(12) PRIMARY KEY NOT NULL,
  "deck_id" varchar(12) NOT NULL,
  "card_id" integer NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "category" varchar(50) DEFAULT 'mainboard' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "deck_cards" ADD CONSTRAINT "deck_cards_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "decks"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "deck_cards" ADD CONSTRAINT "deck_cards_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE cascade;--> statement-breakpoint

-- Create indexes for performance
CREATE INDEX "decks_user_id_idx" ON "decks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "decks_format_idx" ON "decks" USING btree ("format");--> statement-breakpoint
CREATE INDEX "decks_public_idx" ON "decks" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "decks_created_at_idx" ON "decks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "decks_user_format_idx" ON "decks" USING btree ("user_id","format");--> statement-breakpoint
CREATE INDEX "decks_user_created_idx" ON "decks" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "decks_user_public_created_idx" ON "decks" USING btree ("user_id","is_public","created_at");--> statement-breakpoint
CREATE INDEX "decks_public_created_idx" ON "decks" USING btree ("is_public","created_at") WHERE "is_public" = true;--> statement-breakpoint
CREATE INDEX "deck_cards_deck_id_idx" ON "deck_cards" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "deck_cards_card_id_idx" ON "deck_cards" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "deck_cards_deck_category_idx" ON "deck_cards" USING btree ("deck_id","category");--> statement-breakpoint