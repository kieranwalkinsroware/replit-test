/**
 * Fal.ai API Test Script
 * 
 * This script verifies the Fal.ai API connection and endpoint configuration.
 * It can also check the status of ongoing training or generation jobs.
 * 
 * Usage:
 *   Basic connection test:
 *     npx tsx server/test-falai.ts
 *   
 *   Check training status:
 *     npx tsx server/test-falai.ts training <lora-id>
 *   
 *   Check generation status:
 *     npx tsx server/test-falai.ts generation <request-id>
 * 
 * Debug mode is automatically enabled when running this script.
 */

import { falaiService } from './services/falai';
import { FalConfigError, FalAuthError, FalApiError } from './services/falai-errors';

async function testFalaiConnection() {
  console.log('--- Testing Fal.ai Connection ---');
  
  try {
    // Enable debug mode for detailed logging
    falaiService.setDebugMode(true);
    
    // Test endpoint configuration
    console.log('Train endpoint:', falaiService.getTrainEndpoint());
    console.log('Generate endpoint:', falaiService.getGenerateEndpoint());
    console.log('Training status endpoint:', falaiService.getTrainingStatusEndpoint('test-lora-id'));
    console.log('Generation status endpoint:', falaiService.getGenerationStatusEndpoint('test-request-id'));
    
    console.log('\nFal.ai service is properly configured.');
    
    // If we have arguments for status checks, run those
    const args = process.argv.slice(2);
    if (args.length >= 2) {
      const type = args[0];
      const id = args[1];
      
      if (type === 'training' || type === 'generation') {
        await testStatusCheck(type, id);
      }
    }
    
  } catch (error) {
    if (error instanceof FalConfigError) {
      console.error(`Configuration Error: ${error.message}`);
      console.error(`Solution: ${error.code}`);
    } else if (error instanceof FalAuthError) {
      console.error(`Authentication Error: ${error.message}`);
      console.error(`Solution: ${error.code}`);
    } else {
      console.error('Unexpected error:', error);
    }
  } finally {
    // Important for clean termination
    process.exit(0);
  }
}

async function testStatusCheck(type: 'training' | 'generation', id: string) {
  console.log(`\n--- Checking ${type} status for ID: ${id} ---`);
  
  try {
    if (type === 'training') {
      // Use a default user ID of 1 for testing
      const result = await falaiService.checkTrainingStatus(id, 1);
      console.log('Training status result:', result);
    } else {
      // Use a default user ID of 1 for testing
      const result = await falaiService.checkGenerationStatus(id, 1);
      console.log('Generation status result:', result);
    }
  } catch (error) {
    console.error(`Error checking ${type} status:`, error);
  }
}

// Run the test
testFalaiConnection().catch(console.error);