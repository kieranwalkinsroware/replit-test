import { pgTable, text, serial, timestamp, numeric, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define tables first
export const users = pgTable("users", {
  id: integer("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"), // User's email for notifications
  faceImageUrl: text("face_image_url"), // URL to the extracted face image
  processingStatus: text("processing_status"), // not_started, processing, completed, failed
  loraId: text("lora_id"), // Keep the LoraID field to preserve existing data
  trainingStatus: text("training_status"), // Keep training_status to preserve existing data
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(), // without timezone to match DB
});

export const videos = pgTable("videos", {
  id: integer("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  notificationEmail: text("notification_email"), // Email for sending completion notifications
  negativePrompt: text("negative_prompt"),
  aspectRatio: text("aspect_ratio"), // 16:9, 9:16, 1:1
  duration: numeric("duration"), // 5 or 10 seconds
  cfgScale: numeric("cfg_scale"), // 0.0 to 1.0
  videoUrl: text("video_url").notNull(), // Matches DB - required
  thumbnailUrl: text("thumbnail_url"),
  rawVideoUrl: text("raw_video_url"), // Original video from Kling before face swap
  status: text("status").notNull(), // processing, swapping, completed, failed
  errorMessage: text("error_message"),
  requestId: text("request_id"), // Request ID from Replicate
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(), // without timezone to match DB
});

export const userUploads = pgTable("user_uploads", {
  id: integer("id").primaryKey(),
  userId: integer("user_id"), // Match DB - not required in DB but should be in our app
  videoData: text("video_data").notNull(), // URL of the video file
  faceImageUrl: text("face_image_url"), // URL to the extracted face image
  processingStatus: text("processing_status").notNull(), // pending, processing, completed, failed
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // Store additional info like dimensions, duration, etc.
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }), // with timezone to match DB
});

export const apiUsage = pgTable("api_usage", {
  id: integer("id").primaryKey(),
  userId: integer("user_id").notNull(), // integer to match DB
  endpoint: text("endpoint").notNull(), // The API endpoint called (e.g., "train", "generate")
  requestId: text("request_id"), // Request ID from fal.ai if available
  requestPayloadSize: text("request_payload_size"), // Size of the request in bytes
  responsePayloadSize: text("response_payload_size"), // Size of the response in bytes
  estimatedCost: text("estimated_cost"), // Estimated cost in USD
  status: text("status").notNull(), // success, error
  errorMessage: text("error_message"), // Error message if status is error
  duration: text("duration"), // Duration of the API call in milliseconds
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(), // without timezone to match DB
});

// Add training_sessions table to preserve existing data
export const trainingSessions = pgTable("training_sessions", {
  id: integer("id").primaryKey(),
  userId: integer("user_id").notNull(), // integer to match existing DB type
  videoData: text("video_data").notNull(),
  status: text("status").notNull(), // pending, processing, completed, failed
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(), // without timezone to match DB
});

// Now define relations
export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos),
  uploads: many(userUploads),
  apiUsages: many(apiUsage),
  trainingSessions: many(trainingSessions),
}));

export const videosRelations = relations(videos, ({ one }) => ({
  user: one(users, {
    fields: [videos.userId],
    references: [users.id],
  }),
}));

export const userUploadsRelations = relations(userUploads, ({ one }) => ({
  user: one(users, {
    fields: [userUploads.userId],
    references: [users.id],
  }),
}));

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
  user: one(users, {
    fields: [apiUsage.userId],
    references: [users.id],
  }),
}));

export const trainingSessionsRelations = relations(trainingSessions, ({ one }) => ({
  user: one(users, {
    fields: [trainingSessions.userId],
    references: [users.id],
  }),
}));

// Define insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  createdAt: true,
  status: true,
  errorMessage: true,
  requestId: true,
  videoUrl: true,
  thumbnailUrl: true,
  rawVideoUrl: true,
}).extend({
  email: z.string().email().optional(), // Make email optional to maintain backward compatibility
  // Ensure userId is properly handled - can be either string or number (will be converted to numeric)
  userId: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? Number(val) : val
  ),
});

export const insertUserUploadSchema = createInsertSchema(userUploads).omit({
  id: true,
  createdAt: true,
  processingStatus: true,
  errorMessage: true,
  faceImageUrl: true,
});

export const insertApiUsageSchema = createInsertSchema(apiUsage).omit({
  id: true,
  createdAt: true,
}).extend({
  // Ensure userId is properly handled - can be either string or number
  userId: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? Number(val) : val
  ),
  // These fields need to accept either string or number
  requestPayloadSize: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? String(val) : val
  ),
  responsePayloadSize: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? String(val) : val
  ),
  estimatedCost: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? String(val) : val
  ),
  duration: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? String(val) : val
  ),
});

// Define types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

export type InsertUserUpload = z.infer<typeof insertUserUploadSchema>;
export type UserUpload = typeof userUploads.$inferSelect;

export type InsertApiUsage = z.infer<typeof insertApiUsageSchema>;
export type ApiUsage = typeof apiUsage.$inferSelect;

export type TrainingSession = typeof trainingSessions.$inferSelect;
