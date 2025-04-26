/**
 * Fal.ai LoRA Training Test Script
 * 
 * This script tests the LoRA training functionality by sending a sample video to the Fal.ai API.
 * 
 * Usage:
 *   npx tsx test-lora-train.ts [video_file_path]
 * 
 * If no video file path is provided, it will use a default small test video.
 */

import { readFileSync } from 'fs';
import { falaiService } from './server/services/falai';
import path from 'path';

// Enable debug mode for detailed logging
falaiService.setDebugMode(true);

async function testLoraTraining() {
  console.log('--- Starting LoRA Training Test ---');
  
  try {
    // Get the video file path from command line arguments
    const videoPath = process.argv[2];
    
    if (!videoPath) {
      console.error('Error: No video file path provided.');
      console.error('Usage: npx tsx test-lora-train.ts <video_file_path>');
      process.exit(1);
    }
    
    // Check if the file exists
    try {
      readFileSync(videoPath);
      console.log(`Using video file: ${videoPath}`);
    } catch (error) {
      console.error(`Error: Could not read file ${videoPath}`);
      console.error('Please provide a valid video file path as an argument.');
      process.exit(1);
    }
    
    // Read the video file and convert to base64
    const videoBuffer = readFileSync(videoPath);
    const videoBase64 = videoBuffer.toString('base64');
    
    console.log(`Loaded video file: ${videoPath}`);
    console.log(`Video size: ${videoBuffer.length} bytes`);
    console.log(`Base64 length: ${videoBase64.length} characters`);
    
    // Use a test user ID
    const testUserId = 1;
    
    console.log('\nSending video to Fal.ai for LoRA training...');
    
    // Call the trainLora method with the video data
    const result = await falaiService.trainLora(videoBase64, testUserId);
    
    console.log('\nLoRA training request successful!');
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.lora_id) {
      console.log(`\nLoRA ID: ${result.lora_id}`);
      console.log(`To check training status, run:`);
      console.log(`npx tsx server/test-falai.ts training ${result.lora_id}`);
      console.log(`\nOr use the debug endpoint:`);
      console.log(`curl http://localhost:5000/api/debug/falai/training-status/${result.lora_id}`);
    }
  } catch (error) {
    console.error('\nError during LoRA training test:', error);
  } finally {
    // For clean termination
    setTimeout(() => process.exit(0), 1000);
  }
}

// Run the test
testLoraTraining().catch(console.error);