/**
 * Cost Tracker Service
 * 
 * Tracks API usage and associated costs for Replicate API calls.
 * Estimates costs based on the API endpoint being used.
 */

import { storage } from '../storage';
import { InsertApiUsage } from '@shared/schema';

// Cost multipliers for different API endpoints (in USD per request)
const COST_MULTIPLIERS: Record<string, number> = {
  'replicate/kling-video-generation': 0.05, // $0.05 per video generation
  'replicate/face-swap': 0.03, // $0.03 per face swap operation
  'replicate/status-check': 0.001, // $0.001 per status check (minimal cost)
  'default': 0.01 // Default cost for unknown endpoints
};

export class CostTrackerService {
  /**
   * Tracks API usage and estimates cost
   * @param userId User ID making the request
   * @param endpoint The API endpoint being called
   * @param requestId Optional request ID from the API
   * @param requestPayloadSize Optional size of the request payload
   * @param responsePayloadSize Optional size of the response payload
   * @param status Status of the API call (success/error)
   * @param errorMessage Optional error message if status is error
   * @param duration Optional duration of the API call in milliseconds
   * @returns The created API usage record
   */
  async trackApiUsage(
    userId: number,
    endpoint: string,
    requestId: string | null,
    requestPayloadSize: number,
    responsePayloadSize: number,
    status: 'success' | 'error',
    errorMessage: string | null = null,
    duration: number = 0
  ) {
    // Calculate the estimated cost based on the endpoint
    const costMultiplier = COST_MULTIPLIERS[endpoint] || COST_MULTIPLIERS.default;
    const estimatedCost = costMultiplier;
    
    // Create the API usage record
    const apiUsageData: InsertApiUsage = {
      userId,
      endpoint,
      requestId,
      requestPayloadSize: requestPayloadSize.toString(),
      responsePayloadSize: responsePayloadSize.toString(),
      status,
      errorMessage,
      duration: duration.toString(),
      estimatedCost: estimatedCost.toString()
      // createdAt is handled by default in the database
    };
    
    // Store the API usage in the database
    try {
      const apiUsage = await storage.createApiUsage(apiUsageData);
      return apiUsage;
    } catch (error) {
      console.error('Error tracking API usage:', error);
      // If there's an error, we still want to continue execution
      // so we just log the error and return null
      return null;
    }
  }
  
  /**
   * Gets the total estimated cost for a user
   * @param userId User ID
   * @returns Total estimated cost and usage count
   */
  async getUserCosts(userId: number): Promise<{ totalCost: number; usageCount: number }> {
    try {
      const summary = await storage.getApiUsageSummary(userId);
      return summary;
    } catch (error) {
      console.error('Error getting user costs:', error);
      return { totalCost: 0, usageCount: 0 };
    }
  }
  
  /**
   * Gets the total estimated cost across all users
   * @returns Total estimated cost
   */
  async getTotalCosts(): Promise<number> {
    try {
      const totalCost = await storage.getTotalApiCost();
      return totalCost;
    } catch (error) {
      console.error('Error getting total costs:', error);
      return 0;
    }
  }
}

export const costTrackerService = new CostTrackerService();