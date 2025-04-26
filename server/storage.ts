import { 
  users, 
  videos, 
  userUploads, 
  apiUsage,
  type User, 
  type InsertUser, 
  type Video, 
  type InsertVideo,
  type UserUpload,
  type InsertUserUpload,
  type ApiUsage,
  type InsertApiUsage
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Video methods
  getVideo(id: number): Promise<Video | undefined>;
  getVideosByUserId(userId: number): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideoStatus(id: number, status: string): Promise<Video | undefined>;
  updateVideo(id: number, updates: Partial<Video>): Promise<Video | undefined>;
  
  // User Upload methods
  getUserUpload(id: number): Promise<UserUpload | undefined>;
  getUserUploadsByUserId(userId: number): Promise<UserUpload[]>;
  createUserUpload(upload: InsertUserUpload): Promise<UserUpload>;
  updateUserUploadStatus(id: number, status: string): Promise<UserUpload | undefined>;
  updateUserUpload(id: number, updates: Partial<UserUpload>): Promise<UserUpload | undefined>;
  
  // API usage methods
  getApiUsage(id: number): Promise<ApiUsage | undefined>;
  getApiUsageByUserId(userId: number): Promise<ApiUsage[]>;
  createApiUsage(usage: InsertApiUsage): Promise<ApiUsage>;
  getApiUsageSummary(userId: number): Promise<{ totalCost: number; usageCount: number }>;
  getTotalApiCost(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        processingStatus: "not_started",
        createdAt: new Date()
      })
      .returning();
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }
  
  // Video methods
  async getVideo(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video || undefined;
  }
  
  async getVideosByUserId(userId: number): Promise<Video[]> {
    return await db.select().from(videos).where(eq(videos.userId, userId));
  }
  
  async createVideo(video: InsertVideo): Promise<Video> {
    const [createdVideo] = await db
      .insert(videos)
      .values({
        ...video,
        createdAt: new Date()
      })
      .returning();
    return createdVideo;
  }
  
  async updateVideoStatus(id: number, status: string): Promise<Video | undefined> {
    const [updatedVideo] = await db
      .update(videos)
      .set({ status })
      .where(eq(videos.id, id))
      .returning();
    return updatedVideo || undefined;
  }
  
  async updateVideo(id: number, updates: Partial<Video>): Promise<Video | undefined> {
    const [updatedVideo] = await db
      .update(videos)
      .set(updates)
      .where(eq(videos.id, id))
      .returning();
    return updatedVideo || undefined;
  }
  
  // User Upload methods
  async getUserUpload(id: number): Promise<UserUpload | undefined> {
    const [upload] = await db.select().from(userUploads).where(eq(userUploads.id, id));
    return upload || undefined;
  }
  
  async getUserUploadsByUserId(userId: number): Promise<UserUpload[]> {
    return await db.select().from(userUploads).where(eq(userUploads.userId, userId));
  }
  
  async createUserUpload(upload: InsertUserUpload): Promise<UserUpload> {
    const [createdUpload] = await db
      .insert(userUploads)
      .values({
        ...upload,
        createdAt: new Date()
      })
      .returning();
    return createdUpload;
  }
  
  async updateUserUploadStatus(id: number, status: string): Promise<UserUpload | undefined> {
    const [updatedUpload] = await db
      .update(userUploads)
      .set({ processingStatus: status })
      .where(eq(userUploads.id, id))
      .returning();
    return updatedUpload || undefined;
  }
  
  async updateUserUpload(id: number, updates: Partial<UserUpload>): Promise<UserUpload | undefined> {
    const [updatedUpload] = await db
      .update(userUploads)
      .set(updates)
      .where(eq(userUploads.id, id))
      .returning();
    return updatedUpload || undefined;
  }

  // API Usage methods
  async getApiUsage(id: number): Promise<ApiUsage | undefined> {
    const [usage] = await db.select().from(apiUsage).where(eq(apiUsage.id, id));
    return usage || undefined;
  }

  async getApiUsageByUserId(userId: number): Promise<ApiUsage[]> {
    return await db.select().from(apiUsage).where(eq(apiUsage.userId, userId));
  }

  async createApiUsage(usage: InsertApiUsage): Promise<ApiUsage> {
    const [createdUsage] = await db
      .insert(apiUsage)
      .values({
        ...usage,
        createdAt: new Date()
      })
      .returning();
    return createdUsage;
  }

  async getApiUsageSummary(userId: number): Promise<{ totalCost: number; usageCount: number }> {
    const usages = await db.select().from(apiUsage).where(eq(apiUsage.userId, userId));
    
    const totalCost = usages.reduce((sum, usage) => {
      return sum + (usage.estimatedCost ? parseFloat(usage.estimatedCost) : 0);
    }, 0);
    
    return {
      totalCost: parseFloat(totalCost.toFixed(2)),
      usageCount: usages.length
    };
  }

  async getTotalApiCost(): Promise<number> {
    const usages = await db.select().from(apiUsage);
    
    const totalCost = usages.reduce((sum, usage) => {
      return sum + (usage.estimatedCost ? parseFloat(usage.estimatedCost) : 0);
    }, 0);
    
    return parseFloat(totalCost.toFixed(2));
  }
}

export const storage = new DatabaseStorage();
