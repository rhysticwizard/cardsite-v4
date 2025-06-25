CREATE TABLE "game_participants" (
	"id" varchar(12) PRIMARY KEY NOT NULL,
	"game_id" varchar(12) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"deck_id" varchar(12),
	"seat_position" integer NOT NULL,
	"status" varchar(20) DEFAULT 'joined' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_rooms" (
	"id" varchar(12) PRIMARY KEY NOT NULL,
	"host_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"format" varchar(50) DEFAULT 'commander' NOT NULL,
	"status" varchar(20) DEFAULT 'waiting' NOT NULL,
	"max_players" integer DEFAULT 4 NOT NULL,
	"current_players" integer DEFAULT 1 NOT NULL,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deck_cards" ALTER COLUMN "card_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_game_id_game_rooms_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_rooms" ADD CONSTRAINT "game_rooms_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_participants_game_id_idx" ON "game_participants" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_participants_user_id_idx" ON "game_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "game_participants_deck_id_idx" ON "game_participants" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "game_participants_game_user_idx" ON "game_participants" USING btree ("game_id","user_id");--> statement-breakpoint
CREATE INDEX "game_participants_game_seat_idx" ON "game_participants" USING btree ("game_id","seat_position");--> statement-breakpoint
CREATE INDEX "game_rooms_host_id_idx" ON "game_rooms" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "game_rooms_status_idx" ON "game_rooms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "game_rooms_format_idx" ON "game_rooms" USING btree ("format");--> statement-breakpoint
CREATE INDEX "game_rooms_created_at_idx" ON "game_rooms" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "game_rooms_status_format_idx" ON "game_rooms" USING btree ("status","format");--> statement-breakpoint
CREATE INDEX "game_rooms_public_idx" ON "game_rooms" USING btree ("status","created_at") WHERE "game_rooms"."status" = $1;