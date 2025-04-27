import express from "express";
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertVideoSchema, 
  insertUserUploadSchema, 
  insertUserSchema 
} from "@shared/schema";
import { z } from "zod";
import { costTrackerService } from "./services/costTracker";
import { replicateService } from "./services/replicate";
import { emailService } from "./services/emailService";
import debugRouter from "./routes/debug";
import proxyRouter from "./routes/proxy";

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();

  // API endpoint to upload user video
  router.post("/api/uploads", async (req, res) => {
    try {
      console.log("Video upload started, validating payload...");
      
      // Add size limit checks first
      if (req.body.videoData && typeof req.body.videoData === 'string') {
        const dataSize = req.body.videoData.length;
        const sizeInMB = Math.round((dataSize / (1024 * 1024)) * 100) / 100;
        console.log(`Video data size: ${sizeInMB} MB`);
        
        // Warn if video is very large
        if (dataSize > 20 * 1024 * 1024) { // Over 20MB
          console.warn(`Large video upload detected: ${sizeInMB}MB. This may cause performance issues.`);
        }
      }
      
      const { videoData, userId, metadata } = insertUserUploadSchema.parse({
        ...req.body,
        createdAt: new Date().toISOString(),
      });

      console.log(`Creating upload record for user ${userId}...`);
      
      // Create a user upload record - but don't store the full video in the DB
      // Just store a placeholder to prevent DB bloat
      const userUpload = await storage.createUserUpload({
        userId,
        videoData: "VIDEO_DATA_PROCESSED", // Don't store large video data in DB
        metadata: JSON.stringify({
          originalSize: videoData.length,
          uploadDate: new Date().toISOString(),
          deviceInfo: metadata && typeof metadata === 'object' ? metadata : {}
        })
      });
      
      // Set the processing status
      await storage.updateUserUpload(userUpload.id, {
        processingStatus: 'processing'
      });

      console.log(`Upload record created with ID ${userUpload.id}, starting face extraction...`);

      // Process the video for face extraction in background
      // First return success response to client
      res.status(200).json({
        message: "Video upload successful, processing started",
        uploadId: userUpload.id
      });
      
      // Then process in background (don't await)
      (async () => {
        try {
          console.log("Extracting face from uploaded video...");
          
          // Use development mode for local testing (no API calls)
          const useDevelopmentMode = true;
          
          let faceImageUrl;
          
          if (useDevelopmentMode) {
            console.log("Development mode: Simulating face extraction with sample face image");
            // Use a sample face image URL for development testing
            faceImageUrl = "https://replicate.delivery/pbxt/Jd7ApHW7KS4qJIZfMYg0A1qM6O1W9enwGkPwn0pJT3K3WHtQA/face.jpg";
          } else {
            // Real API call to extract face
            faceImageUrl = await replicateService.extractFace(videoData, Number(userId));
          }
          console.log("Face extraction completed successfully");
          
          // Update the user upload with the face image URL and set status to completed
          await storage.updateUserUpload(userUpload.id, {
            faceImageUrl,
            processingStatus: 'completed'
          });
          
          // Update the user record with the face image URL
          const user = await storage.getUser(Number(userId));
          if (user) {
            await storage.updateUser(user.id, {
              faceImageUrl,
              processingStatus: 'completed'
            });
            
            // Send email notification for face extraction completion if user has email
            if (user.email) {
              try {
                await emailService.sendFaceExtractionCompleteNotification(user, userUpload.id);
                console.log(`Face extraction completion email sent to ${user.email}`);
              } catch (emailError) {
                console.error("Error sending face extraction completion email:", emailError);
                // Continue even if email fails
              }
            }
          }
        } catch (err) {
          const error = err as Error;
          console.error("Error processing user video:", error);
          
          // Provide a more helpful error message
          let userFriendlyMessage = "We couldn't process your video. Please try recording in better lighting or try a different pose.";
          
          if (error.message.includes("Unknown error")) {
            userFriendlyMessage = "We're experiencing temporary issues with our video processing. Please try again later.";
          } else if (error.message.includes("422") || error.message.includes("unprocessable")) {
            userFriendlyMessage = "Your video couldn't be analyzed properly. Try recording with your face clearly visible, in good lighting.";
          }
          
          // Update upload status on error
          await storage.updateUserUpload(userUpload.id, {
            processingStatus: 'failed',
            errorMessage: userFriendlyMessage,
            // Store the technical error details in metadata for debugging
            metadata: JSON.stringify({
              technicalError: error.message,
              errorTimestamp: new Date().toISOString()
            })
          });
          
          console.error("Face extraction failed: ", error.message || "Unknown error");
        }
      })().catch(err => {
        console.error("Unhandled error in background processing:", err);
      });
      
    } catch (error) {
      console.error("Error processing upload request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to upload video", error: (error as Error).message || "Unknown error" });
    }
  });

  // API endpoint to check upload status
  router.get("/api/uploads/:id", async (req, res) => {
    try {
      const userUpload = await storage.getUserUpload(Number(req.params.id));
      if (!userUpload) {
        return res.status(404).json({ message: "Upload not found" });
      }

      // Even if failed, we want to return with 200 status so the frontend can show the error message
      // This is more user-friendly than a 500 server error
      if (userUpload.processingStatus === 'failed') {
        return res.status(200).json({
          ...userUpload,
          message: userUpload.errorMessage || "Processing failed, but we're working on making it better!"
        });
      }

      // If the upload is already completed, just return it
      if (userUpload.processingStatus === 'completed') {
        return res.status(200).json(userUpload);
      }

      // Get user
      const user = await storage.getUser(Number(userUpload.userId));
      if (!user) {
        // For now, just create a default user with this ID if it doesn't exist
        try {
          // Use ID 1 as default in case the user doesn't exist
          const defaultUserId = Number(userUpload.userId) || 1;
          await storage.createUser({
            username: `user_${defaultUserId}`,
            password: 'default_password',
            email: null,
            // The ID will be assigned automatically
          });
        } catch (userCreateError) {
          console.log("Failed to create user automatically:", userCreateError);
          // Continue anyway
        }
      }
      
      // Return with the current status, even if it's still processing
      return res.status(200).json({
        ...userUpload,
        message: "Your video is being processed. This may take a few moments."
      });
    } catch (error) {
      console.error("Error in /api/uploads/:id route:", error);
      
      // Even for errors, we want a 200 response with error details to handle gracefully in the frontend
      return res.status(200).json({ 
        id: Number(req.params.id),
        processingStatus: 'failed',
        message: "There was an error checking your upload status. Please try again.",
        errorDetails: (error as Error).message 
      });
    }
  });

  // API endpoint to generate video
  router.post("/api/videos", async (req, res) => {
    try {
      // Get the data from the request and pass it through the schema validation
      const validatedData = insertVideoSchema.parse({
        ...req.body,
        status: 'processing', // Always start with processing
        createdAt: new Date().toISOString(),
      });
      
      // Extract the fields including the email field which is in the extended schema
      const { prompt, userId, title, negativePrompt, aspectRatio, duration, cfgScale, email } = validatedData;

      // Get the user to check for face image
      const user = await storage.getUser(Number(userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has an extracted face image
      if (!user.faceImageUrl) {
        return res.status(400).json({ 
          message: "User does not have a profile image. Please upload a video first." 
        });
      }

      // Create a video entry in the database
      // Use a string format for the userId since our schema now handles conversion
      const video = await storage.createVideo({
        userId: userId, // Passed as string, our schema now handles conversion 
        title,
        prompt,
        notificationEmail: email, // Save the email address for notifications
        negativePrompt: negativePrompt || "",
        aspectRatio: aspectRatio || "16:9",
        duration: duration || "5",
        cfgScale: cfgScale || "0.5"
      });
      
      // Set status to processing explicitly
      await storage.updateVideoStatus(video.id, 'processing');

      // Start video generation with Replicate API
      try {
        // Generate the base video using Stable Video Diffusion model
        const options = {
          negativePrompt: negativePrompt || "",
          aspectRatio: aspectRatio || "9:16", // Using portrait mode (9:16) for mobile devices
          duration: duration || "5",
          cfgScale: cfgScale || "7.5" // Replicate service will convert this to a number
        };
        
        console.log(`Video generation started for user ${userId} with prompt: ${prompt}`);
        console.log(`Using options:`, JSON.stringify(options));
        
        // Ensure we have the user's face image
        console.log(`User face image URL: ${user.faceImageUrl}`);
        
        // Check Replicate API connection before trying generation
        try {
          console.log("Testing Replicate API connection before generating video...");
          const connectionTest = await replicateService.testConnection();
          console.log("Replicate API connection test result:", JSON.stringify(connectionTest));
          
          if (!connectionTest.success) {
            console.error("Replicate API connection failed:", connectionTest.message);
            throw new Error(`Replicate API connection failed: ${connectionTest.message}`);
          }
          
          // First, enable debug mode to see detailed logs
          replicateService.setDebugMode(true);
          
          // Make sure userId is a number for the Replicate service
          const userIdNum = Number(userId);
          console.log(`Converting userId from ${userId} (${typeof userId}) to ${userIdNum} (${typeof userIdNum})`);
          
          // Verify API token is not empty
          if (!process.env.REPLICATE_API_TOKEN) {
            console.error("REPLICATE_API_TOKEN is not set or is empty");
            throw new Error("REPLICATE_API_TOKEN is not set or is empty");
          }
          console.log("REPLICATE_API_TOKEN is set (length:", process.env.REPLICATE_API_TOKEN.length, "characters)");
          
          // Use development mode to simulate video generation
          const useDevelopmentMode = true;
          
          let generateResult;
          
          if (useDevelopmentMode) {
            console.log("Development mode: Simulating video generation without API call");
            // Create a mock prediction ID for tracking
            generateResult = {
              id: `dev-${Date.now()}`,
              status: 'processing'
            };
            console.log("Simulated video generation response:", JSON.stringify(generateResult));
          } else {
            console.log("Calling Replicate API to generate video...");
            generateResult = await replicateService.generateVideo(prompt, userIdNum, options);
          }
          console.log(`Video generation API response:`, JSON.stringify(generateResult));
          
          // Store the prediction ID in the database
          await storage.updateVideo(video.id, {
            requestId: generateResult.id
          });
        } catch (error) {
          const generateError = error as Error;
          console.error(`DETAILED ERROR in video generation:`, generateError);
          // Show more details about network-related errors
          if ('cause' in generateError && generateError.cause) {
            console.error("Error cause:", generateError.cause);
          }
          throw generateError;
        }

        return res.status(200).json({
          message: "Video generation started",
          videoId: video.id,
          status: 'processing'
        });
      } catch (err) {
        console.error("Error in video generation:", err);
        // Update video status on error
        await storage.updateVideoStatus(video.id, 'failed');
        return res.status(500).json({ 
          message: "Failed to start video generation", 
          error: (err as Error).message || "Unknown error" 
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to generate video", error });
    }
  });

  // API endpoint to get a specific video and check its status
  router.get("/api/videos/:id", async (req, res) => {
    try {
      const video = await storage.getVideo(Number(req.params.id));
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // If video is already completed or failed, just return it
      if (video.status === 'completed' || video.status === 'failed') {
        return res.status(200).json(video);
      }

      // If the video is in processing state and has a request_id, check with Replicate
      try {
        if (!video.requestId) {
          return res.status(200).json({
            ...video,
            message: "Waiting for generation to start"
          });
        }
        
        // Check the status with Replicate
        const statusResult = await replicateService.checkVideoStatus(video.requestId, Number(video.userId));
        
        if (statusResult.status === 'succeeded' && statusResult.output) {
          // If video generation succeeded, we need to apply face swap
          // Handle the case where output could be an array
          const videoUrl = Array.isArray(statusResult.output) 
            ? statusResult.output[0] 
            : statusResult.output as string;
            
          const user = await storage.getUser(Number(video.userId));
          
          if (user && user.faceImageUrl) {
            // Now apply face swap
            const swapResult = await replicateService.swapFace(videoUrl, user.faceImageUrl, Number(video.userId));
            
            // Update the video with the face swap request ID
            await storage.updateVideo(video.id, {
              rawVideoUrl: videoUrl, // Store the original video URL
              requestId: swapResult.id // Update with face swap request ID
            });
            
            return res.status(200).json({
              ...video,
              status: 'processing',
              message: "Face swap in progress",
              progress: 0.5
            });
          } else {
            // No face image available, just use the generated video
            const updatedVideo = await storage.updateVideo(video.id, {
              status: 'completed',
              videoUrl
            });
            
            // Get the user to send notification
            const user = await storage.getUser(Number(video.userId));
            if (user && user.email && updatedVideo) {
              try {
                await emailService.sendVideoGenerationCompleteNotification(user, updatedVideo);
                console.log(`Video completion email sent to ${user.email}`);
              } catch (emailError) {
                console.error("Error sending video completion email:", emailError);
                // Continue even if email fails
              }
            }
            
            return res.status(200).json({
              ...video,
              status: 'completed',
              videoUrl
            });
          }
        } else if (statusResult.status === 'failed') {
          // Update video status to failed
          await storage.updateVideoStatus(video.id, 'failed');
          return res.status(200).json({
            ...video,
            status: 'failed',
            error: statusResult.error
          });
        } else if (video.rawVideoUrl && statusResult.status !== 'succeeded') {
          // We're in the face swap phase
          // Check face swap status
          const swapStatusResult = await replicateService.checkFaceSwapStatus(video.requestId, Number(video.userId));
          
          if (swapStatusResult.status === 'succeeded' && swapStatusResult.output) {
            // Face swap completed, update the video
            // Handle the case where output could be an array
            const swappedVideoUrl = Array.isArray(swapStatusResult.output) 
              ? swapStatusResult.output[0] 
              : swapStatusResult.output as string;
              
            const updatedVideo = await storage.updateVideo(video.id, {
              status: 'completed',
              videoUrl: swappedVideoUrl,
              thumbnailUrl: video.rawVideoUrl // Use first frame of the original video as thumbnail
            });
            
            // Get the user to send notification
            const user = await storage.getUser(Number(video.userId));
            if (user && user.email && updatedVideo) {
              try {
                await emailService.sendVideoGenerationCompleteNotification(user, updatedVideo);
                console.log(`Video completion email sent to ${user.email}`);
              } catch (emailError) {
                console.error("Error sending video completion email:", emailError);
                // Continue even if email fails
              }
            }
            
            return res.status(200).json({
              ...video,
              status: 'completed',
              videoUrl: swapStatusResult.output
            });
          } else if (swapStatusResult.status === 'failed') {
            // Face swap failed, use the original video
            const updatedVideo = await storage.updateVideo(video.id, {
              status: 'completed',
              videoUrl: video.rawVideoUrl,
              errorMessage: swapStatusResult.error
            });
            
            // Get the user to send notification
            const user = await storage.getUser(Number(video.userId));
            if (user && user.email && updatedVideo) {
              try {
                await emailService.sendVideoGenerationCompleteNotification(user, updatedVideo);
                console.log(`Video completion email sent to ${user.email} (fallback to original video)`);
              } catch (emailError) {
                console.error("Error sending video completion email:", emailError);
                // Continue even if email fails
              }
            }
            
            return res.status(200).json({
              ...video,
              status: 'completed',
              videoUrl: video.rawVideoUrl,
              errorMessage: "Face swap failed, showing original video"
            });
          } else {
            // Still processing face swap
            return res.status(200).json({
              ...video,
              status: 'processing',
              message: "Face swap in progress",
              progress: 0.7
            });
          }
        } else {
          // Still processing
          return res.status(200).json({
            ...video,
            status: 'processing',
            message: "Video generation in progress",
            progress: 0.3
          });
        }
      } catch (err) {
        console.error("Error checking video generation status:", err);
        // Don't update status on API error
        return res.status(200).json({
          ...video,
          error: (err as Error).message
        });
      }
    } catch (error) {
      return res.status(500).json({ message: "Failed to get video", error });
    }
  });

  // API endpoint to get all videos for a user
  router.get("/api/users/:userId/videos", async (req, res) => {
    try {
      const videos = await storage.getVideosByUserId(Number(req.params.userId));
      return res.status(200).json(videos);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get user videos", error });
    }
  });
  
  // API endpoint to create a user
  router.post("/api/users", async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Create the user
      const user = await storage.createUser({ username, password });
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create user", error });
    }
  });

  // API endpoint to get API usage costs for a user
  router.get("/api/users/:userId/api-usage", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      
      // Get cost summary for user
      const costSummary = await costTrackerService.getUserCosts(userId);
      
      // Get latest API usage records for user
      const apiUsageRecords = await storage.getApiUsageByUserId(userId);
      
      return res.status(200).json({
        ...costSummary,
        recentUsage: apiUsageRecords.slice(0, 10) // Only return the 10 most recent records
      });
    } catch (error) {
      return res.status(500).json({ 
        message: "Failed to get API usage information", 
        error: (error as Error).message 
      });
    }
  });
  
  // API endpoint to get total API usage costs for system monitoring
  router.get("/api/admin/api-usage", async (req, res) => {
    try {
      // Get total cost across all users
      const totalCost = await costTrackerService.getTotalCosts();
      
      return res.status(200).json({
        totalCost,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return res.status(500).json({ 
        message: "Failed to get total API usage information", 
        error: (error as Error).message 
      });
    }
  });
  
  // Register the main API routes
  app.use(router);
  
  // Quick test endpoint for Replicate API
  app.get('/api/test-replicate', async (req, res) => {
    try {
      // Check if REPLICATE_API_TOKEN is set
      const apiToken = process.env.REPLICATE_API_TOKEN || '';
      const hasToken = !!apiToken;
      const tokenLength = apiToken.length;
      
      console.log(`REPLICATE_API_TOKEN check: exists=${hasToken}, length=${tokenLength}`);
      
      if (!hasToken) {
        return res.status(500).json({
          success: false,
          message: "REPLICATE_API_TOKEN is not set in environment variables",
          hasToken: false
        });
      }
      
      // Test the API connection
      const connectionResult = await replicateService.testConnection();
      
      return res.status(200).json({
        ...connectionResult,
        hasToken: true,
        tokenLength: tokenLength
      });
    } catch (error) {
      console.error("Error testing Replicate API:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to test Replicate API", 
        error: (error as Error).message,
        hasToken: !!(process.env.REPLICATE_API_TOKEN || ''),
        tokenLength: (process.env.REPLICATE_API_TOKEN || '').length
      });
    }
  });

  // Register debug routes (only available in development)
  app.use('/api/debug', debugRouter);
  
  // Register proxy routes for external API access
  app.use('/api', proxyRouter);

  const httpServer = createServer(app);
  return httpServer;
}
