CREATE TABLE "friend_requests" (
	"id" varchar(12) PRIMARY KEY NOT NULL,
	"sender_id" varchar(255) NOT NULL,
	"receiver_id" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" varchar(12) PRIMARY KEY NOT NULL,
	"user1_id" varchar(255) NOT NULL,
	"user2_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user1_id_users_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user2_id_users_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "friend_requests_sender_id_idx" ON "friend_requests" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "friend_requests_receiver_id_idx" ON "friend_requests" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "friend_requests_status_idx" ON "friend_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "friend_requests_sender_receiver_idx" ON "friend_requests" USING btree ("sender_id","receiver_id");--> statement-breakpoint
CREATE INDEX "friend_requests_receiver_status_idx" ON "friend_requests" USING btree ("receiver_id","status");--> statement-breakpoint
CREATE INDEX "friendships_user1_id_idx" ON "friendships" USING btree ("user1_id");--> statement-breakpoint
CREATE INDEX "friendships_user2_id_idx" ON "friendships" USING btree ("user2_id");--> statement-breakpoint
CREATE INDEX "friendships_user1_user2_idx" ON "friendships" USING btree ("user1_id","user2_id");--> statement-breakpoint
CREATE INDEX "friendships_user2_user1_idx" ON "friendships" USING btree ("user2_id","user1_id");