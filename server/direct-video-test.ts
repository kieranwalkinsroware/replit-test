/**
 * Direct Test for Replicate Video Generation
 * 
 * This script bypasses the regular app flow and directly tests the Replicate API
 * video generation functionality.
 */

import { replicateService } from './services/replicate';

// Environment variables are already loaded by the Replit environment

async function testVideoGeneration() {
  console.log('Starting direct test of video generation...');
  
  // Enable debug mode
  replicateService.setDebugMode(true);
  
  try {
    // Test connection first
    console.log('Testing API connection...');
    const connectionResult = await replicateService.testConnection();
    console.log('Connection test result:', connectionResult);
    
    if (!connectionResult.success) {
      console.error('Connection test failed, aborting video generation test');
      return;
    }
    
    // Attempt video generation with a simple prompt
    console.log('Starting video generation test...');
    const result = await replicateService.generateVideo(
      'A person walking on a beach at sunset', // Simple test prompt
      999, // Test user ID
      {
        aspectRatio: "9:16",
        duration: "5",
        cfgScale: "7.5",
        negativePrompt: "blurry, distorted, low quality"
      }
    );
    
    console.log('Video generation test succeeded:');
    console.log(JSON.stringify(result, null, 2));
    
    // If we got an ID, check status
    if (result.id) {
      console.log(`Checking status for prediction ${result.id}...`);
      
      // Check status a few times
      for (let i = 0; i < 3; i++) {
        console.log(`Status check #${i+1}...`);
        const statusResult = await replicateService.checkVideoStatus(result.id, 999);
        console.log('Status:', statusResult.status);
        
        if (statusResult.status === 'succeeded') {
          console.log('Generation completed! Output:', statusResult.output);
          break;
        } else if (statusResult.status === 'failed') {
          console.error('Generation failed:', statusResult.error);
          break;
        }
        
        // Wait 5 seconds between checks
        console.log('Waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  } catch (error) {
    console.error('Error during video generation test:');
    console.error(error);
  }
}

// Run the test
testVideoGeneration().then(() => {
  console.log('Test completed');
}).catch(err => {
  console.error('Uncaught error in test:', err);
});