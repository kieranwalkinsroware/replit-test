import { pgTable, text, serial, timestamp, numeric, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define tables first
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"), // User's email for notifications
  faceImageUrl: text("face_image_url"), // URL to the extracted face image
  processingStatus: text("processing_status").default("not_started"), // not_started, processing, completed, failed
  loraId: text("lora_id"), // Keep the LoraID field to preserve existing data
  trainingStatus: text("training_status").default("not_started"), // Keep training_status to preserve existing data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  userId: numeric("user_id").notNull().references(() => users.id), // changed from serial to numeric to preserve existing data
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  notificationEmail: text("notification_email"), // Email for sending completion notifications
  negativePrompt: text("negative_prompt"),
  aspectRatio: text("aspect_ratio").default("16:9"), // 16:9, 9:16, 1:1
  duration: numeric("duration").default("5"), // 5 or 10 seconds
  cfgScale: numeric("cfg_scale").default("0.5"), // 0.0 to 1.0
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  rawVideoUrl: text("raw_video_url"), // Original video from Kling before face swap
  status: text("status").notNull().default("processing"), // processing, swapping, completed, failed
  errorMessage: text("error_message"),
  requestId: text("request_id"), // Request ID from Replicate
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userUploads = pgTable("user_uploads", {
  id: serial("id").primaryKey(),
  userId: numeric("user_id").notNull().references(() => users.id), // changed from serial to numeric to preserve existing data
  videoData: text("video_data").notNull(), // URL of the video file
  faceImageUrl: text("face_image_url"), // URL to the extracted face image
  processingStatus: text("processing_status").notNull().default("pending"), // pending, processing, completed, failed
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // Store additional info like dimensions, duration, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiUsage = pgTable("api_usage", {
  id: serial("id").primaryKey(),
  userId: numeric("user_id").notNull().references(() => users.id), // changed from serial to numeric to preserve existing data
  endpoint: text("endpoint").notNull(), // The API endpoint called (e.g., "train", "generate")
  requestId: text("request_id"), // Request ID from fal.ai if available
  requestPayloadSize: text("request_payload_size"), // Size of the request in bytes
  responsePayloadSize: text("response_payload_size"), // Size of the response in bytes
  estimatedCost: text("estimated_cost"), // Estimated cost in USD
  status: text("status").notNull(), // success, error
  errorMessage: text("error_message"), // Error message if status is error
  duration: text("duration"), // Duration of the API call in milliseconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Now define relations
export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos),
  uploads: many(userUploads),
  apiUsages: many(apiUsage),
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
