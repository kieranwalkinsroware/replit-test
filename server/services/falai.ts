import fetch from 'node-fetch';
import { costTrackerService } from './costTracker';
import {
  FalError, FalConfigError, FalAuthError, FalApiError,
  FalTrainingError, FalGenerationError, getSolutionForError
} from './falai-errors';

// Constants for fal.ai endpoints
// Network connectivity options
const CONNECTIVITY_OPTIONS = {
  DIRECT: 'direct',        // Direct connection to api.fal.ai
  LOCAL_PROXY: 'local',    // Use our local proxy endpoints
  CORS_PROXY: 'cors'       // Use a public CORS proxy service
};

// Choose which connectivity option to use (modify this if one approach doesn't work)
const CONNECTIVITY_OPTION = CONNECTIVITY_OPTIONS.CORS_PROXY;

// Define different access URLs based on the connectivity option
const API_URLS = {
  [CONNECTIVITY_OPTIONS.DIRECT]: "https://api.fal.ai",
  [CONNECTIVITY_OPTIONS.LOCAL_PROXY]: "/api/fal-proxy",
  [CONNECTIVITY_OPTIONS.CORS_PROXY]: "https://corsproxy.io/?https://api.fal.ai"
};

// Select the API URL based on the connectivity option
const FAL_API_URL = API_URLS[CONNECTIVITY_OPTION];

// API endpoint paths
const KLING_API_TRAIN_URL = "/v2/fal/klingtube/train";
const KLING_API_GENERATE_URL = "/v2/fal/klingtube/generate";
const KLING_API_CHECK_TRAINING_URL = "/v2/fal/klingtube/check-training";
const KLING_API_CHECK_GENERATION_URL = "/v2/fal/klingtube/check-generation";

// Types for API responses
export interface KlingTrainingResponse {
  request_id?: string;
  lora_id?: string;
  status?: string;
  error?: string;
}

export interface KlingGenerationResponse {
  request_id?: string;
  status?: string;
  video_url?: string;
  thumbnail_url?: string;
  error?: string;
}

export { 
  FalError, FalConfigError, FalAuthError, FalApiError,
  FalTrainingError, FalGenerationError, getSolutionForError
};

/**
 * Service to interact with fal.ai's Kling API
 */
export class FalAIService {
  private apiKey: string;
  private debugMode: boolean;

  constructor() {
    if (!process.env.FAL_KEY) {
      throw new FalConfigError("FAL_KEY environment variable is not set. Please set it to use the Fal.ai service.");
    }
    this.apiKey = process.env.FAL_KEY;
    this.debugMode = process.env.FAL_DEBUG?.toLowerCase() === 'true';
    
    if (this.debugMode) {
      this.debugLog('Initialized Fal.ai service with debug mode enabled');
    }
  }
  
  /**
   * Enable or disable debug mode
   * @param enabled Whether debug mode should be enabled
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.debugLog(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Check if debug mode is enabled
   * @returns Whether debug mode is enabled
   */
  isDebugMode(): boolean {
    return this.debugMode;
  }
  
  /**
   * Log a message only when in debug mode
   * @param message The message to log
   * @param data Optional data to log
   */
  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      console.log(`[FAL-DEBUG] ${message}`);
      if (data !== undefined) {
        console.log(data);
      }
    }
  }
  
  /**
   * Get the full URL for the training endpoint
   * @returns The full URL for the training endpoint
   */
  getTrainEndpoint(): string {
    return `${FAL_API_URL}${KLING_API_TRAIN_URL}`;
  }
  
  /**
   * Get the full URL for the video generation endpoint
   * @returns The full URL for the video generation endpoint
   */
  getGenerateEndpoint(): string {
    return `${FAL_API_URL}${KLING_API_GENERATE_URL}`;
  }
  
  /**
   * Get the full URL for checking training status
   * @param loraId The LoRA ID to check
   * @returns The full URL for checking training status
   */
  getTrainingStatusEndpoint(loraId: string): string {
    return `${FAL_API_URL}${KLING_API_CHECK_TRAINING_URL}?lora_id=${loraId}`;
  }
  
  /**
   * Get the full URL for checking generation status
   * @param requestId The request ID to check
   * @returns The full URL for checking generation status
   */
  getGenerationStatusEndpoint(requestId: string): string {
    return `${FAL_API_URL}${KLING_API_CHECK_GENERATION_URL}?request_id=${requestId}`;
  }

  /**
   * Submits a video for LoRA training
   * @param videoData Base64 encoded video data
   * @param userId User ID for tracking
   * @returns Promise with the training response including loraId
   */
  async trainLora(videoData: string, userId: number): Promise<KlingTrainingResponse> {
    const startTime = Date.now();
    let status = 'success';
    let errorMessage = '';
    let responseData: Record<string, any> = {};
    let requestPayloadSize = 0;
    
    try {
      // More detailed debug logging
      console.log("==== FAL.AI LORA TRAINING REQUEST START ====");
      console.log(`Video data length: ${videoData.length} characters`);
      console.log(`User ID: ${userId}`);
      console.log(`API Key present: ${!!this.apiKey}`);
      console.log(`Debug mode: ${this.debugMode}`);
      
      // Log the action in debug mode with detailed info
      this.debugLog(`Starting LoRA training for user ${userId}`, { 
        videoLength: videoData.length,
        timestamp: new Date().toISOString(),
        dataPrefix: videoData.substring(0, 100) // Show first 100 chars to verify format
      });
      
      console.log(`Starting LoRA training for user ${userId}, video length: ${videoData.length} chars`);
      
      // Check if video is too large and truncate if necessary
      const MAX_VIDEO_SIZE = 26000000; // ~26MB
      let processedVideoData = videoData;
      if (videoData.length > MAX_VIDEO_SIZE) {
        console.log(`Video data exceeds max size (${videoData.length} > ${MAX_VIDEO_SIZE}), truncating...`);
        this.debugLog(`Video data exceeds max size, truncating`, {
          originalSize: videoData.length,
          maxSize: MAX_VIDEO_SIZE
        });
        processedVideoData = videoData.substring(0, MAX_VIDEO_SIZE);
      }
      
      // Estimate request payload size
      const requestBody = JSON.stringify({
        video_input: processedVideoData,
        user_id: userId.toString(),
        webhook_url: process.env.NODE_ENV === 'production' 
          ? `${process.env.PUBLIC_URL}/api/webhooks/training-complete` 
          : null
      });
      
      requestPayloadSize = new TextEncoder().encode(requestBody).length;
      console.log(`Making request to fal.ai for LoRA training, payload size: ${requestPayloadSize} bytes`);
      this.debugLog(`Making LoRA training request`, {
        endpoint: this.getTrainEndpoint(),
        payloadSize: requestPayloadSize,
        includesWebhook: process.env.NODE_ENV === 'production'
      });
      
      try {
        const response = await fetch(this.getTrainEndpoint(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${this.apiKey}`,
          },
          body: requestBody,
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          status = 'error';
          errorMessage = errorText;
          
          // Log detailed error info in debug mode
          this.debugLog(`Failed to train LoRA`, {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText
          });
          
          console.error(`Failed to train LoRA: ${errorText}, HTTP status: ${response.status}`);
          
          // Handle specific error status codes
          if (response.status === 401 || response.status === 403) {
            throw new FalAuthError(
              `Authentication failed with Fal.ai API: ${errorText}`, 
              new Error(`HTTP ${response.status}: ${errorText}`)
            );
          } else {
            throw new FalApiError(
              `Failed to train LoRA: ${errorText}`,
              response.status,
              errorText,
              this.getTrainEndpoint()
            );
          }
        }
  
        // Use type assertion to handle the JSON response
        responseData = await response.json() as Record<string, any>;
        
        this.debugLog(`LoRA training initiated successfully`, responseData);
        console.log(`LoRA training initiated successfully, response:`, responseData);
        
      } catch (fetchError: any) {
        // Re-throw if it's already one of our custom errors
        if (fetchError instanceof FalError) {
          throw fetchError;
        }
        
        // Network errors or other fetch problems
        throw new FalApiError(
          `Network error connecting to Fal.ai: ${fetchError.message}`,
          0,
          fetchError.message,
          this.getTrainEndpoint()
        );
      }
      
      // Track API usage
      const responsePayloadSize = new TextEncoder().encode(JSON.stringify(responseData)).length;
      const duration = Date.now() - startTime;
      
      await costTrackerService.trackApiUsage(
        userId,
        'train',
        responseData.request_id,
        requestPayloadSize,
        responsePayloadSize,
        status,
        errorMessage,
        duration
      );
      
      return responseData;
    } catch (error: any) {
      // Log the error in detail with more information
      console.log("==== FAL.AI LORA TRAINING ERROR ====");
      console.log(`Error message: ${error.message}`);
      console.log(`Error type: ${error.constructor.name}`);
      console.log(`Error code: ${error.code || 'N/A'}`);
      if (error.stack) {
        console.log("Error stack trace:");
        console.log(error.stack);
      }
      
      this.debugLog('Error in trainLora', {
        error: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        fullError: JSON.stringify(error)
      });
      
      console.error('Error training LoRA:', error);
      
      // Still track API usage in case of error
      if (status === 'success') {
        status = 'error';
        errorMessage = error?.message || 'Unknown error';
      }
      
      await costTrackerService.trackApiUsage(
        userId,
        'train',
        undefined,
        requestPayloadSize,
        0,
        status,
        errorMessage,
        Date.now() - startTime
      );
      
      // Convert to a FalTrainingError if it's not already a FalError
      if (!(error instanceof FalError)) {
        throw new FalTrainingError(
          `Failed to train LoRA model: ${error.message}`,
          undefined,
          'failed',
          error
        );
      }
      
      throw error;
    }
  }

  /**
   * Checks the status of a LoRA training job
   * @param loraId ID of the training job
   * @returns Promise with the training status
   */
  async checkTrainingStatus(loraId: string, userId: number): Promise<KlingTrainingResponse> {
    const startTime = Date.now();
    let status = 'success';
    let errorMessage = '';
    let responseData: Record<string, any> = {};
    
    try {
      console.log(`Checking training status for LoRA ID: ${loraId}, user: ${userId}`);
      this.debugLog(`Checking training status`, { loraId, userId });
      
      try {
        const response = await fetch(this.getTrainingStatusEndpoint(loraId), {
          method: 'GET',
          headers: {
            'Authorization': `Key ${this.apiKey}`,
          },
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          status = 'error';
          errorMessage = errorText;
          
          this.debugLog(`Failed to check training status`, {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText
          });
          
          console.error(`Failed to check training status: ${errorText}, HTTP status: ${response.status}`);
          
          // Handle specific error status codes
          if (response.status === 401 || response.status === 403) {
            throw new FalAuthError(
              `Authentication failed with Fal.ai API: ${errorText}`, 
              new Error(`HTTP ${response.status}: ${errorText}`)
            );
          } else {
            throw new FalApiError(
              `Failed to check training status: ${errorText}`,
              response.status,
              errorText,
              this.getTrainingStatusEndpoint(loraId)
            );
          }
        }
  
        // Use type assertion to handle the JSON response
        responseData = await response.json() as Record<string, any>;
        
        this.debugLog(`Training status check successful`, {
          loraId,
          status: responseData.status || 'unknown',
          response: responseData
        });
        
        console.log(`Training status for LoRA ID ${loraId}: ${responseData.status || 'unknown'}`);
      } catch (fetchError: any) {
        // Re-throw if it's already one of our custom errors
        if (fetchError instanceof FalError) {
          throw fetchError;
        }
        
        // Network errors or other fetch problems
        throw new FalApiError(
          `Network error connecting to Fal.ai: ${fetchError.message}`,
          0,
          fetchError.message,
          this.getTrainingStatusEndpoint(loraId)
        );
      }
      
      // Track API usage
      const requestSize = new TextEncoder().encode(loraId).length;
      const responseSize = new TextEncoder().encode(JSON.stringify(responseData)).length;
      const duration = Date.now() - startTime;
      
      await costTrackerService.trackApiUsage(
        userId,
        'check-training-status',
        undefined,
        requestSize,
        responseSize,
        status,
        errorMessage,
        duration
      );
      
      return responseData;
    } catch (error: any) {
      // Log the error in detail
      this.debugLog('Error in checkTrainingStatus', {
        error: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      
      console.error('Error checking training status:', error);
      
      if (status === 'success') {
        status = 'error';
        errorMessage = error?.message || 'Unknown error';
      }
      
      await costTrackerService.trackApiUsage(
        userId,
        'check-training-status',
        undefined,
        0,
        0,
        status,
        errorMessage,
        Date.now() - startTime
      );
      
      // Convert to a FalTrainingError if it's not already a FalError
      if (!(error instanceof FalError)) {
        throw new FalTrainingError(
          `Failed to check LoRA training status: ${error.message}`,
          loraId,
          'failed',
          error
        );
      }
      
      throw error;
    }
  }

  /**
   * Generates a video using a trained LoRA model
   * @param loraId ID of the trained LoRA model
   * @param prompt Text prompt for video generation
   * @returns Promise with the generated video URL
   */
  async generateVideo(loraId: string, prompt: string, userId: number): Promise<KlingGenerationResponse> {
    const startTime = Date.now();
    let status = 'success';
    let errorMessage = '';
    let responseData: Record<string, any> = {};
    let requestPayloadSize = 0;
    
    try {
      console.log(`Starting video generation for user ${userId} with LoRA ID: ${loraId}`);
      console.log(`Using prompt: "${prompt}"`);
      
      this.debugLog(`Starting video generation`, {
        userId,
        loraId,
        prompt,
        timestamp: new Date().toISOString()
      });
      
      // Estimate request payload size
      const requestBody = JSON.stringify({
        lora_id: loraId,
        prompt: prompt,
        negative_prompt: "bad quality, blurry, watermark, text, pixelated",
        num_frames: 25,
        num_inference_steps: 50,
        webhook_url: process.env.NODE_ENV === 'production' 
          ? `${process.env.PUBLIC_URL}/api/webhooks/video-complete` 
          : null
      });
      
      requestPayloadSize = new TextEncoder().encode(requestBody).length;
      console.log(`Making request to fal.ai for video generation, payload size: ${requestPayloadSize} bytes`);
      
      this.debugLog(`Making video generation request`, {
        endpoint: this.getGenerateEndpoint(),
        payloadSize: requestPayloadSize,
        includesWebhook: process.env.NODE_ENV === 'production',
        requestParams: {
          loraId,
          prompt: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''), // Truncate long prompts in logs
          numFrames: 25,
          numInferenceSteps: 50
        }
      });
      
      try {
        const response = await fetch(this.getGenerateEndpoint(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${this.apiKey}`,
          },
          body: requestBody,
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          status = 'error';
          errorMessage = errorText;
          
          this.debugLog(`Failed to generate video`, {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText
          });
          
          console.error(`Failed to generate video: ${errorText}, HTTP status: ${response.status}`);
          
          // Handle specific error status codes
          if (response.status === 401 || response.status === 403) {
            throw new FalAuthError(
              `Authentication failed with Fal.ai API: ${errorText}`, 
              new Error(`HTTP ${response.status}: ${errorText}`)
            );
          } else {
            throw new FalApiError(
              `Failed to generate video: ${errorText}`,
              response.status,
              errorText,
              this.getGenerateEndpoint()
            );
          }
        }
  
        // Use type assertion to handle the JSON response
        responseData = await response.json() as Record<string, any>;
        
        this.debugLog(`Video generation initiated successfully`, responseData);
        console.log(`Video generation initiated successfully, response:`, responseData);
      } catch (fetchError: any) {
        // Re-throw if it's already one of our custom errors
        if (fetchError instanceof FalError) {
          throw fetchError;
        }
        
        // Network errors or other fetch problems
        throw new FalApiError(
          `Network error connecting to Fal.ai: ${fetchError.message}`,
          0,
          fetchError.message,
          this.getGenerateEndpoint()
        );
      }
      
      // Track API usage
      const responsePayloadSize = new TextEncoder().encode(JSON.stringify(responseData)).length;
      const duration = Date.now() - startTime;
      
      await costTrackerService.trackApiUsage(
        userId,
        'generate',
        responseData.request_id,
        requestPayloadSize,
        responsePayloadSize,
        status,
        errorMessage,
        duration
      );
      
      return responseData;
    } catch (error: any) {
      // Log the error in detail
      this.debugLog('Error in generateVideo', {
        error: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      
      console.error('Error generating video:', error);
      
      // Still track API usage in case of error
      if (status === 'success') {
        status = 'error';
        errorMessage = error?.message || 'Unknown error';
      }
      
      await costTrackerService.trackApiUsage(
        userId,
        'generate',
        undefined,
        requestPayloadSize,
        0,
        status,
        errorMessage,
        Date.now() - startTime
      );
      
      // Convert to a FalGenerationError if it's not already a FalError
      if (!(error instanceof FalError)) {
        throw new FalGenerationError(
          `Failed to generate video: ${error.message}`,
          undefined,
          'failed',
          error
        );
      }
      
      throw error;
    }
  }

  /**
   * Checks the status of a video generation job
   * @param requestId ID of the generation request
   * @returns Promise with the generation status
   */
  async checkGenerationStatus(requestId: string, userId: number): Promise<KlingGenerationResponse> {
    const startTime = Date.now();
    let status = 'success';
    let errorMessage = '';
    let responseData: Record<string, any> = {};
    
    try {
      console.log(`Checking generation status for request ID: ${requestId}, user: ${userId}`);
      this.debugLog(`Checking generation status`, { requestId, userId });
      
      try {
        const response = await fetch(this.getGenerationStatusEndpoint(requestId), {
          method: 'GET',
          headers: {
            'Authorization': `Key ${this.apiKey}`,
          },
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          status = 'error';
          errorMessage = errorText;
          
          this.debugLog(`Failed to check generation status`, {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText
          });
          
          console.error(`Failed to check generation status: ${errorText}, HTTP status: ${response.status}`);
          
          // Handle specific error status codes
          if (response.status === 401 || response.status === 403) {
            throw new FalAuthError(
              `Authentication failed with Fal.ai API: ${errorText}`, 
              new Error(`HTTP ${response.status}: ${errorText}`)
            );
          } else {
            throw new FalApiError(
              `Failed to check generation status: ${errorText}`,
              response.status,
              errorText,
              this.getGenerationStatusEndpoint(requestId)
            );
          }
        }
  
        // Use type assertion to handle the JSON response
        responseData = await response.json() as Record<string, any>;
        
        this.debugLog(`Generation status check successful`, {
          requestId,
          status: responseData.status || 'unknown',
          hasVideoUrl: !!responseData.video_url,
          response: responseData
        });
        
        console.log(`Generation status for request ID ${requestId}: ${responseData.status || 'unknown'}`);
        if (responseData.video_url) {
          console.log(`Video generation completed, URL: ${responseData.video_url}`);
        }
      } catch (fetchError: any) {
        // Re-throw if it's already one of our custom errors
        if (fetchError instanceof FalError) {
          throw fetchError;
        }
        
        // Network errors or other fetch problems
        throw new FalApiError(
          `Network error connecting to Fal.ai: ${fetchError.message}`,
          0,
          fetchError.message,
          this.getGenerationStatusEndpoint(requestId)
        );
      }
      
      // Track API usage
      const requestSize = new TextEncoder().encode(requestId).length;
      const responseSize = new TextEncoder().encode(JSON.stringify(responseData)).length;
      const duration = Date.now() - startTime;
      
      await costTrackerService.trackApiUsage(
        userId,
        'check-generation-status',
        requestId,
        requestSize,
        responseSize,
        status,
        errorMessage,
        duration
      );
      
      return responseData;
    } catch (error: any) {
      // Log the error in detail
      this.debugLog('Error in checkGenerationStatus', {
        error: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      
      console.error('Error checking generation status:', error);
      
      if (status === 'success') {
        status = 'error';
        errorMessage = error?.message || 'Unknown error';
      }
      
      await costTrackerService.trackApiUsage(
        userId,
        'check-generation-status',
        requestId,
        0,
        0,
        status,
        errorMessage,
        Date.now() - startTime
      );
      
      // Convert to a FalGenerationError if it's not already a FalError
      if (!(error instanceof FalError)) {
        throw new FalGenerationError(
          `Failed to check video generation status: ${error.message}`,
          requestId,
          'failed',
          error
        );
      }
      
      throw error;
    }
  }
}

export const falaiService = new FalAIService();