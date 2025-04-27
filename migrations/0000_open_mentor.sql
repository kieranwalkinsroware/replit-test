CREATE TABLE "api_usage" (
	"id" integer PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"request_id" text,
	"request_payload_size" text,
	"response_payload_size" text,
	"estimated_cost" text,
	"status" text NOT NULL,
	"error_message" text,
	"duration" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_sessions" (
	"id" integer PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"video_data" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_uploads" (
	"id" integer PRIMARY KEY NOT NULL,
	"user_id" integer,
	"video_data" text NOT NULL,
	"face_image_url" text,
	"processing_status" text NOT NULL,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"face_image_url" text,
	"processing_status" text,
	"lora_id" text,
	"training_status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" integer PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"notification_email" text,
	"negative_prompt" text,
	"aspect_ratio" text,
	"duration" numeric,
	"cfg_scale" numeric,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"raw_video_url" text,
	"status" text NOT NULL,
	"error_message" text,
	"request_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;