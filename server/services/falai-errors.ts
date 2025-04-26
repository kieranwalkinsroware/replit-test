/**
 * Fal.ai Error Handling System
 * 
 * This module provides specialized error classes for the Fal.ai API integration,
 * allowing for more detailed error information and better error handling.
 * 
 * Error Class Hierarchy:
 * - FalError: Base error class for all Fal.ai related errors
 *   - FalConfigError: Configuration errors (e.g., missing API key)
 *   - FalAuthError: Authentication errors (e.g., invalid API key)
 *   - FalApiError: API request errors with status code and endpoint info
 *   - FalTrainingError: LoRA training specific errors
 *   - FalGenerationError: Video generation specific errors
 * 
 * Usage:
 * ```
 * try {
 *   // API call to Fal.ai
 * } catch (error) {
 *   if (error instanceof FalConfigError) {
 *     // Handle configuration errors
 *   } else if (error instanceof FalAuthError) {
 *     // Handle authentication errors
 *   } else if (error instanceof FalTrainingError) {
 *     // Handle training specific errors
 *   } else if (error instanceof FalGenerationError) {
 *     // Handle generation specific errors
 *   } else if (error instanceof FalApiError) {
 *     // Handle general API errors
 *   } else if (error instanceof FalError) {
 *     // Handle any other Fal.ai errors
 *   } else {
 *     // Handle other errors
 *   }
 * }
 * ```
 */

/**
 * Base error class for all Fal.ai related errors
 */
export class FalError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'FAL_ERROR',
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'FalError';
  }
}

/**
 * Error thrown when the Fal.ai service is misconfigured
 */
export class FalConfigError extends FalError {
  constructor(message: string, cause?: Error) {
    super(message, 'FAL_CONFIG_ERROR', cause);
    this.name = 'FalConfigError';
  }
}

/**
 * Error thrown when the Fal.ai API authentication fails
 */
export class FalAuthError extends FalError {
  constructor(message: string, cause?: Error) {
    super(message, 'FAL_AUTH_ERROR', cause);
    this.name = 'FalAuthError';
  }
}

/**
 * Error thrown when the Fal.ai API returns an error
 */
export class FalApiError extends FalError {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseText: string,
    public readonly endpoint: string
  ) {
    super(message, 'FAL_API_ERROR');
    this.name = 'FalApiError';
  }
}

/**
 * Error thrown when the Fal.ai API training fails
 */
export class FalTrainingError extends FalError {
  constructor(
    message: string,
    public readonly loraId?: string,
    public readonly status?: string,
    cause?: Error
  ) {
    super(message, 'FAL_TRAINING_ERROR', cause);
    this.name = 'FalTrainingError';
  }
}

/**
 * Error thrown when the Fal.ai API video generation fails
 */
export class FalGenerationError extends FalError {
  constructor(
    message: string,
    public readonly requestId?: string,
    public readonly status?: string,
    cause?: Error
  ) {
    super(message, 'FAL_GENERATION_ERROR', cause);
    this.name = 'FalGenerationError';
  }
}

/**
 * Get a readable solution message for a specific error code
 * @param errorCode The error code
 * @returns A human-readable solution message
 */
export function getSolutionForError(errorCode: string): string {
  switch (errorCode) {
    case 'FAL_CONFIG_ERROR':
      return 'Please check your environment configuration. Make sure the FAL_KEY environment variable is set correctly.';
    case 'FAL_AUTH_ERROR':
      return 'Authentication failed. Please check your FAL_KEY is correct and has not expired.';
    case 'FAL_API_ERROR':
      return 'The Fal.ai API returned an error. Check the error message for details, or try again later as the service might be temporarily unavailable.';
    case 'FAL_TRAINING_ERROR':
      return 'LoRA training failed. Check that your video input meets the requirements (10 seconds max, clear face visibility, good lighting).';
    case 'FAL_GENERATION_ERROR':
      return 'Video generation failed. Check that your LoRA model is trained successfully and your prompt is appropriate.';
    default:
      return 'An unexpected error occurred. Please try again or contact support if the issue persists.';
  }
}