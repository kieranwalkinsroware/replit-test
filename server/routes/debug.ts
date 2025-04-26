/**
 * Debug Routes Module
 * 
 * This module provides debug routes for testing API integrations (Fal.ai and Replicate).
 * These routes are only available in development mode or when ENABLE_DEBUG_ROUTES is set to 'true'.
 * 
 * Available endpoints:
 * - GET /api/debug - Get debug status and available endpoints
 * - POST /api/debug/falai/debug/:enabled - Enable or disable Fal.ai debug mode
 * - GET /api/debug/falai/training-status/:loraId - Check training status for a specific LoRA ID
 * - GET /api/debug/falai/generation-status/:requestId - Check generation status for a specific request ID
 * - GET /api/debug/falai/test-connection - Test connection to Fal.ai API
 * - GET /api/debug/replicate/test-connection - Test connection to Replicate API
 * - GET /api/debug/cost-summary/:userId? - Get API usage cost summary for a user or all users
 */

import { Router, Request, Response } from 'express';
import { falaiService } from '../services/falai';
import { replicateService } from '../services/replicate';
import { storage } from '../storage';

// Debug routes are only enabled in development mode
const isDebugEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEBUG_ROUTES === 'true';

// Create a router for debug routes
const debugRouter = Router();

// Middleware to check if debug routes are enabled
const requireDebugMode = (req: Request, res: Response, next: Function) => {
  if (!isDebugEnabled) {
    return res.status(404).json({ error: 'Debug routes are disabled in production mode' });
  }
  next();
};

// Apply the middleware to all debug routes
debugRouter.use(requireDebugMode);

// Get debug status
debugRouter.get('/', (req: Request, res: Response) => {
  res.json({
    debug: isDebugEnabled,
    falDebugMode: falaiService.isDebugMode(),
    endpoints: {
      falai: {
        train: falaiService.getTrainEndpoint(),
        generate: falaiService.getGenerateEndpoint(),
        checkTraining: falaiService.getTrainingStatusEndpoint(':loraId'),
        checkGeneration: falaiService.getGenerationStatusEndpoint(':requestId'),
      },
      debug: {
        base: '/api/debug',
        falaiDebugToggle: '/api/debug/falai/debug/:enabled',
        checkTrainingStatus: '/api/debug/falai/training-status/:loraId',
        checkGenerationStatus: '/api/debug/falai/generation-status/:requestId',
        testFalaiConnection: '/api/debug/falai/test-connection',
        testReplicateConnection: '/api/debug/replicate/test-connection',
        costSummary: '/api/debug/cost-summary/:userId?',
      }
    }
  });
});

// Toggle Fal.ai debug mode
debugRouter.post('/falai/debug/:enabled', (req: Request, res: Response) => {
  const enabled = req.params.enabled === 'true';
  falaiService.setDebugMode(enabled);
  res.json({ debug: enabled });
});

// Check training status
debugRouter.get('/falai/training-status/:loraId', async (req: Request, res: Response) => {
  try {
    const loraId = req.params.loraId;
    const userId = parseInt(req.query.userId as string || '1');
    
    console.log(`[DEBUG] Checking training status for LoRA ID: ${loraId}`);
    const result = await falaiService.checkTrainingStatus(loraId, userId);
    
    res.json({
      loraId,
      status: result.status,
      requestId: result.request_id,
      error: result.error,
      full_response: result
    });
  } catch (error: any) {
    console.error('[DEBUG] Error checking training status:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      solution: error.solution || 'Try again later or check logs for more details'
    });
  }
});

// Check generation status
debugRouter.get('/falai/generation-status/:requestId', async (req: Request, res: Response) => {
  try {
    const requestId = req.params.requestId;
    const userId = parseInt(req.query.userId as string || '1');
    
    console.log(`[DEBUG] Checking generation status for request ID: ${requestId}`);
    const result = await falaiService.checkGenerationStatus(requestId, userId);
    
    res.json({
      requestId,
      status: result.status,
      videoUrl: result.video_url,
      thumbnailUrl: result.thumbnail_url,
      error: result.error,
      full_response: result
    });
  } catch (error: any) {
    console.error('[DEBUG] Error checking generation status:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      solution: error.solution || 'Try again later or check logs for more details'
    });
  }
});

// Test connection to Fal.ai
debugRouter.get('/falai/test-connection', async (req: Request, res: Response) => {
  try {
    const enabled = req.query.debug === 'true';
    if (enabled) {
      falaiService.setDebugMode(true);
    }
    
    res.json({
      success: true,
      apiKey: !!process.env.FAL_KEY,
      endpoints: {
        train: falaiService.getTrainEndpoint(),
        generate: falaiService.getGenerateEndpoint(),
        checkTraining: falaiService.getTrainingStatusEndpoint('test-id'),
        checkGeneration: falaiService.getGenerationStatusEndpoint('test-id'),
      },
      instructions: [
        "To check an actual training status, use /api/debug/falai/training-status/:loraId",
        "To check an actual generation status, use /api/debug/falai/generation-status/:requestId",
        "To toggle debug mode, use /api/debug/falai/debug/true or /api/debug/falai/debug/false"
      ]
    });
  } catch (error: any) {
    console.error('[DEBUG] Error testing Fal.ai connection:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      solution: error.solution || 'Ensure your FAL_KEY environment variable is set correctly'
    });
  }
});

// Test connection to Replicate API
debugRouter.get('/replicate/test-connection', async (req: Request, res: Response) => {
  try {
    const enabled = req.query.debug === 'true';
    if (enabled) {
      replicateService.setDebugMode(true);
    }
    
    const connectionResult = await replicateService.testConnection();
    
    res.json({
      ...connectionResult,
      apiUrl: 'https://api.replicate.com/v1/predictions',
      videoModel: 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
      faceSwapModel: 'lucataco/faceswap-plus:0d9b8ab75eea7b60486fbc361a4566438e84c2f693aeb15af9ab36048b21ac95',
      apiKey: !!process.env.REPLICATE_API_TOKEN,
      instructions: [
        "This test checks direct connectivity to the Replicate API"
      ]
    });
  } catch (error: any) {
    console.error('[DEBUG] Error testing Replicate API connection:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      solution: error.solution || 'Ensure your REPLICATE_API_TOKEN environment variable is set correctly'
    });
  }
});

// Test actual video generation with Replicate API
debugRouter.get('/replicate/test-video-generation', async (req: Request, res: Response) => {
  try {
    const prompt = req.query.prompt as string || "A sunset over the ocean";
    const userId = parseInt(req.query.userId as string || '1');
    
    // Enable debug mode to see detailed logs
    replicateService.setDebugMode(true);
    
    console.log(`[DEBUG] Testing video generation with prompt: "${prompt}" for userId: ${userId}`);
    
    // For development, we'll use a development mode that simulates video generation
    // Use development mode since we've confirmed API token doesn't have model permissions
    const useDevelopmentMode = true; // Using development mode to allow continued development
    
    if (useDevelopmentMode) {
      console.log('[DEBUG] Using development mode for video generation');
      
      // Create a mock prediction ID
      const mockPredictionId = `dev-${Date.now()}`;
      
      // Track simulated API usage
      await storage.createApiUsage({
        userId,
        endpoint: 'replicate/development-mode',
        requestId: mockPredictionId,
        requestPayloadSize: prompt.length,
        responsePayloadSize: 200,
        status: 'success',
        estimatedCost: 0.05,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        message: "Development mode: Video generation simulated successfully",
        predictionId: mockPredictionId,
        developmentMode: true,
        requestDetails: {
          prompt,
          options: {
            negativePrompt: "",
            aspectRatio: "9:16", 
            duration: "3",
            cfgScale: "7.5"
          }
        },
        checkStatusUrl: `/api/debug/replicate/generation-status/${mockPredictionId}?userId=${userId}`
      });
      return;
    }
    
    // If not in development mode, use the real Replicate API
    // Generate test options for Stable Video Diffusion
    const options = {
      negativePrompt: "",
      aspectRatio: "9:16",
      duration: "3", // Use a shorter duration for testing
      cfgScale: "7.5"
    };
    
    // Enable debug mode for detailed logs
    replicateService.setDebugMode(true);
    
    // Generate the video
    const generateResult = await replicateService.generateVideo(prompt, userId, options);
    
    res.json({
      success: true,
      message: "Video generation started successfully",
      predictionId: generateResult.id,
      requestDetails: {
        prompt,
        options
      },
      checkStatusUrl: `/api/debug/replicate/generation-status/${generateResult.id}?userId=${userId}`
    });
  } catch (error: any) {
    console.error('[DEBUG] Error testing video generation:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      stack: error.stack,
      cause: error.cause || null,
      solution: 'Check server logs for more detailed error information'
    });
  }
});

// API endpoint to check video generation status
debugRouter.get('/replicate/generation-status/:predictionId', async (req: Request, res: Response) => {
  try {
    const predictionId = req.params.predictionId;
    const userId = parseInt(req.query.userId as string || '1');
    
    console.log(`[DEBUG] Checking video generation status for prediction ID: ${predictionId}`);
    
    // Check if this is a development mode prediction ID (starts with "dev-")
    if (predictionId.startsWith('dev-')) {
      console.log('[DEBUG] Development mode detected for status check');
      
      // Get timestamp from the prediction ID
      const timestamp = parseInt(predictionId.split('-')[1]);
      const now = Date.now();
      const elapsedTime = now - timestamp;
      
      // Simulate different statuses based on elapsed time
      let status = 'processing';
      let output = null;
      
      // Simulation: 0-5 seconds = starting, 5-10 seconds = processing, >10 seconds = succeeded
      if (elapsedTime < 5000) {
        status = 'starting';
      } else if (elapsedTime < 10000) {
        status = 'processing';
      } else {
        status = 'succeeded';
        
        // Sample video URLs - a selection of free demo videos for testing
        const sampleVideos = [
          'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
          'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
          'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
          'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
          'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
        ];
        
        // Deterministically select a video based on prediction ID and prompt
        // This ensures the same prompt always produces the same video for consistency
        const promptHash = req.query.prompt ? 
          req.query.prompt.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
        const index = (parseInt(predictionId.split('-')[1]) + promptHash) % sampleVideos.length;
        
        output = sampleVideos[index];
      }
      
      // Track simulated API usage
      await storage.createApiUsage({
        userId,
        endpoint: 'replicate/status-check-dev',
        requestId: predictionId,
        requestPayloadSize: 0,
        responsePayloadSize: output ? 1000 : 100,
        status: 'success',
        estimatedCost: 0.01,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        predictionId,
        developmentMode: true,
        status,
        output,
        complete: status === 'succeeded' || status === 'failed',
        videoUrl: status === 'succeeded' ? output : null,
        debugInfo: {
          timestamp,
          currentTime: now,
          elapsedSeconds: Math.floor(elapsedTime / 1000)
        }
      });
      return;
    }
    
    // If not development mode, check with Replicate API
    const statusResult = await replicateService.checkVideoStatus(predictionId, userId);
    
    res.json({
      success: true,
      predictionId,
      status: statusResult.status,
      output: statusResult.output,
      error: statusResult.error,
      complete: statusResult.status === 'succeeded' || statusResult.status === 'failed',
      videoUrl: statusResult.status === 'succeeded' && statusResult.output 
        ? (Array.isArray(statusResult.output) ? statusResult.output[0] : statusResult.output)
        : null
    });
  } catch (error: any) {
    console.error('[DEBUG] Error checking video generation status:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

// Get cost summary for a specific user or all users
debugRouter.get('/cost-summary/:userId?', async (req: Request, res: Response) => {
  try {
    let userId: number | undefined = undefined;
    let result;
    
    if (req.params.userId) {
      userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: `User with ID ${userId} not found` });
      }
      
      const summary = await storage.getApiUsageSummary(userId);
      result = {
        ...summary,
        user: { id: user.id, username: user.username }
      };
    } else {
      // Get total costs
      const totalCost = await storage.getTotalApiCost();
      result = { totalCost, usageCount: 0 };
    }
    
    res.json(result);
  } catch (error: any) {
    console.error('[DEBUG] Error getting cost summary:', error);
    res.status(500).json({ error: error.message });
  }
});

export default debugRouter;