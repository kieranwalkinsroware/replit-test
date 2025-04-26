import { KlingTrainingResponse, KlingGenerationResponse } from './falai';
import { costTrackerService } from './costTracker';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock service for Fal.ai API
 * Used for testing when the real API is not accessible
 */
export class MockFalAIService {
  private debugMode: boolean;
  private trainingJobs: Map<string, { userId: number, status: string, createdAt: Date }>;
  private videoJobs: Map<string, { loraId: string, prompt: string, status: string, videoUrl?: string, createdAt: Date }>;

  constructor() {
    this.debugMode = process.env.FAL_DEBUG?.toLowerCase() === 'true';
    this.trainingJobs = new Map();
    this.videoJobs = new Map();
    
    if (this.debugMode) {
      this.debugLog('Initialized Mock Fal.ai service with debug mode enabled');
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
      console.log(`[MOCK-FAL-DEBUG] ${message}`);
      if (data !== undefined) {
        console.log(data);
      }
    }
  }

  /**
   * Submits a video for LoRA training
   * @param videoData Base64 encoded video data
   * @param userId User ID for tracking
   * @returns Promise with the training response including loraId
   */
  async trainLora(videoData: string, userId: number): Promise<KlingTrainingResponse> {
    const startTime = Date.now();
    
    this.debugLog(`Starting mock LoRA training for user ${userId}`, { 
      videoLength: videoData.length,
      timestamp: new Date().toISOString()
    });
    
    console.log(`[MOCK] Starting LoRA training for user ${userId}, video length: ${videoData.length} chars`);
    
    // Create a mock response
    const loraId = `mock-lora-${uuidv4()}`;
    const requestId = `mock-request-${uuidv4()}`;
    
    // Store the training job
    this.trainingJobs.set(loraId, {
      userId,
      status: 'in_progress',
      createdAt: new Date()
    });
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const responseData: KlingTrainingResponse = {
      request_id: requestId,
      lora_id: loraId,
      status: 'in_progress'
    };
    
    this.debugLog(`Mock LoRA training initiated successfully`, responseData);
    console.log(`[MOCK] LoRA training initiated successfully, response:`, responseData);
    
    // Track API usage
    await costTrackerService.trackApiUsage(
      userId,
      'train',
      requestId,
      videoData.length,
      JSON.stringify(responseData).length,
      'success',
      '',
      Date.now() - startTime
    );
    
    return responseData;
  }

  /**
   * Checks the status of a LoRA training job
   * @param loraId ID of the training job
   * @param userId User ID for tracking
   * @returns Promise with the training status
   */
  async checkTrainingStatus(loraId: string, userId: number): Promise<KlingTrainingResponse> {
    this.debugLog(`Checking mock training status`, { loraId, userId });
    
    // Get the training job
    const job = this.trainingJobs.get(loraId);
    
    if (!job) {
      // If the job doesn't exist yet, create it with in_progress status
      this.trainingJobs.set(loraId, {
        userId,
        status: 'in_progress',
        createdAt: new Date()
      });
      
      return {
        lora_id: loraId,
        status: 'in_progress'
      };
    }
    
    // Calculate how long the job has been running
    const runningTimeMs = Date.now() - job.createdAt.getTime();
    const runningTimeMinutes = runningTimeMs / (1000 * 60);
    
    // Mock progression: jobs complete after 2 minutes
    let status = job.status;
    if (runningTimeMinutes >= 2 && status !== 'completed') {
      status = 'completed';
      job.status = status;
      this.trainingJobs.set(loraId, job);
    }
    
    return {
      lora_id: loraId,
      status
    };
  }

  /**
   * Generates a video using a trained LoRA model
   * @param loraId ID of the trained LoRA model
   * @param prompt Text prompt for the video
   * @param userId User ID for tracking
   * @returns Promise with the generation response
   */
  async generateVideo(loraId: string, prompt: string, userId: number): Promise<KlingGenerationResponse> {
    const startTime = Date.now();
    
    this.debugLog(`Starting mock video generation`, { loraId, prompt, userId });
    
    // Create a mock response
    const requestId = `mock-gen-${uuidv4()}`;
    
    // Store the video job
    this.videoJobs.set(requestId, {
      loraId,
      prompt,
      status: 'in_progress',
      createdAt: new Date()
    });
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const responseData: KlingGenerationResponse = {
      request_id: requestId,
      status: 'in_progress'
    };
    
    this.debugLog(`Mock video generation initiated successfully`, responseData);
    
    // Track API usage
    await costTrackerService.trackApiUsage(
      userId,
      'generate',
      requestId,
      prompt.length,
      JSON.stringify(responseData).length,
      'success',
      '',
      Date.now() - startTime
    );
    
    return responseData;
  }

  /**
   * Checks the status of a video generation job
   * @param requestId ID of the generation job
   * @param userId User ID for tracking
   * @returns Promise with the generation status
   */
  async checkGenerationStatus(requestId: string, userId: number): Promise<KlingGenerationResponse> {
    this.debugLog(`Checking mock generation status`, { requestId, userId });
    
    // Get the video job
    const job = this.videoJobs.get(requestId);
    
    if (!job) {
      // If the job doesn't exist, return an error
      return {
        request_id: requestId,
        status: 'failed',
        error: 'Job not found'
      };
    }
    
    // Calculate how long the job has been running
    const runningTimeMs = Date.now() - job.createdAt.getTime();
    const runningTimeMinutes = runningTimeMs / (1000 * 60);
    
    // Mock progression: videos complete after 1 minute
    let status = job.status;
    let videoUrl = job.videoUrl;
    let thumbnailUrl;
    
    if (runningTimeMinutes >= 1 && status !== 'completed') {
      status = 'completed';
      
      // Generate mock URLs
      videoUrl = `https://example.com/mock-videos/${requestId}.mp4`;
      thumbnailUrl = `https://example.com/mock-thumbnails/${requestId}.jpg`;
      
      // Update the job
      job.status = status;
      job.videoUrl = videoUrl;
      this.videoJobs.set(requestId, job);
    }
    
    return {
      request_id: requestId,
      status,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl
    };
  }
}

// Export an instance of the mock service
export const mockFalaiService = new MockFalAIService();