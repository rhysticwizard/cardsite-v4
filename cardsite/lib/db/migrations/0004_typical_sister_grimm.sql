ALTER TABLE "accounts" DROP CONSTRAINT "accounts_provider_providerAccountId_pk";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "accounts_provider_idx" ON "accounts" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "accounts_provider_account_idx" ON "accounts" USING btree ("provider","providerAccountId");--> statement-breakpoint
CREATE INDEX "cards_name_idx" ON "cards" USING btree ("name");--> statement-breakpoint
CREATE INDEX "cards_type_line_idx" ON "cards" USING btree ("type_line");--> statement-breakpoint
CREATE INDEX "cards_set_code_idx" ON "cards" USING btree ("set_code");--> statement-breakpoint
CREATE INDEX "cards_rarity_idx" ON "cards" USING btree ("rarity");--> statement-breakpoint
CREATE INDEX "cards_cmc_idx" ON "cards" USING btree ("cmc");--> statement-breakpoint
CREATE INDEX "cards_set_rarity_idx" ON "cards" USING btree ("set_code","rarity");--> statement-breakpoint
CREATE INDEX "cards_oracle_text_idx" ON "cards" USING btree ("oracle_text");--> statement-breakpoint
CREATE INDEX "collections_user_id_idx" ON "collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "collections_card_id_idx" ON "collections" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "collections_user_card_idx" ON "collections" USING btree ("user_id","card_id");--> statement-breakpoint
CREATE INDEX "collections_condition_idx" ON "collections" USING btree ("condition");--> statement-breakpoint
CREATE INDEX "collections_foil_idx" ON "collections" USING btree ("foil");--> statement-breakpoint
CREATE INDEX "deck_cards_deck_id_idx" ON "deck_cards" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "deck_cards_card_id_idx" ON "deck_cards" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "deck_cards_deck_card_idx" ON "deck_cards" USING btree ("deck_id","card_id");--> statement-breakpoint
CREATE INDEX "deck_cards_category_idx" ON "deck_cards" USING btree ("category");--> statement-breakpoint
CREATE INDEX "decks_user_id_idx" ON "decks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "decks_format_idx" ON "decks" USING btree ("format");--> statement-breakpoint
CREATE INDEX "decks_is_public_idx" ON "decks" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "decks_public_format_idx" ON "decks" USING btree ("is_public","format");--> statement-breakpoint
CREATE INDEX "decks_name_idx" ON "decks" USING btree ("name");--> statement-breakpoint
CREATE INDEX "decks_created_at_idx" ON "decks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "verification_tokens_identifier_idx" ON "verificationTokens" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_tokens_token_idx" ON "verificationTokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "verification_tokens_expires_idx" ON "verificationTokens" USING btree ("expires");