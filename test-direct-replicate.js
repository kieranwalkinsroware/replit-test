// This script directly tests the Replicate API using a public model
// Bypassing our routing infrastructure to isolate the API key issue

import fetch from 'node-fetch';

// Check if REPLICATE_API_TOKEN is set
const API_KEY = process.env.REPLICATE_API_TOKEN;
if (!API_KEY) {
  console.error('Error: REPLICATE_API_TOKEN environment variable is not set');
  process.exit(1);
}

console.log('API Key length:', API_KEY.length, 'characters');

// Define the Replicate API endpoint
const API_URL = 'https://api.replicate.com/v1/predictions';

// Choose a public model to test
const PUBLIC_MODELS = [
  // Zeroscope - popular text-to-video model
  'anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b4a6f2fa26925f92c4193684f23e1dc6d7fa88710286',
  
  // Stable video diffusion
  'stability-ai/stable-video-diffusion:cf91c35338de27f2a2e4e00358c1e6acca289577de01f59ca9fed2c556c28c60',
  
  // Animov
  'cjwbw/damo-text-to-video:1e205ea73084bd1f48cf12292218629e3b9fd9e63fc45f7c34a0267a4a8c175e',
  
  // Another animation model
  'cerspense/zeroscope_v2_576w:63da0069206d88e3808a349a1cd9a07d39123e0e8c83566abbad0ddb8580e9c5'
];

// Test each model
async function testModels() {
  for (let i = 0; i < PUBLIC_MODELS.length; i++) {
    const model = PUBLIC_MODELS[i];
    console.log(`\n[${i+1}/${PUBLIC_MODELS.length}] Testing model: ${model}`);
    
    try {
      // Prepare the request payload
      const payload = {
        version: model,
        input: {
          prompt: "A rocket launching into space",
          width: 576,
          height: 320,
          num_frames: 24,
          fps: 8
        }
      };
      
      // Adjust payload for specific models
      if (model.includes('zeroscope')) {
        payload.input = {
          prompt: "A rocket launching into space"
        };
      } else if (model.includes('stability-ai')) {
        payload.input = {
          prompt: "A rocket launching into space",
          video_length: "14_frames_with_svd",
          sizing_strategy: "maintain_aspect_ratio",
          frames_per_second: 7
        };
      }
      
      console.log('Sending request with payload:', JSON.stringify(payload, null, 2));
      
      // Make the API request
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      console.log('Response status:', response.status);
      const responseData = await response.json();
      
      if (response.ok) {
        console.log('SUCCESS! Model works:', model);
        console.log('Response data:', JSON.stringify(responseData, null, 2));
        console.log('------------------------------------------');
        console.log('WORKING MODEL FOUND! You can use this model.');
        console.log('------------------------------------------');
        return;
      } else {
        console.log('Error response:', JSON.stringify(responseData, null, 2));
        console.log('------------------------------------------');
      }
    } catch (error) {
      console.error('Error testing model:', error.message);
      console.log('------------------------------------------');
    }
  }
  
  console.log('\nNone of the tested models worked with the current API key.');
}

async function testConnection() {
  console.log('Testing basic API connection...');
  
  try {
    // Make a simple GET request to the API to verify connectivity
    const response = await fetch('https://api.replicate.com/v1', {
      method: 'GET',
      headers: {
        'Authorization': `Token ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Successfully connected to Replicate API');
      console.log('Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.error('Failed to connect to Replicate API:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('Error connecting to Replicate API:', error.message);
    return false;
  }
}

// Run the tests
async function main() {
  const connectionOk = await testConnection();
  if (connectionOk) {
    await testModels();
  } else {
    console.error('Skipping model tests due to failed connection');
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
});