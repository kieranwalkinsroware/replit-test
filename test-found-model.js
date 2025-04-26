// This script tests one of the public models we found in the API response

import fetch from 'node-fetch';

// Check if REPLICATE_API_TOKEN is set
const API_KEY = process.env.REPLICATE_API_TOKEN;
if (!API_KEY) {
  console.error('Error: REPLICATE_API_TOKEN environment variable is not set');
  process.exit(1);
}

// Models to test - from the search results
const MODELS_TO_TEST = [
  // First model from search results
  'menilub/menilub:933433834f2edff7410d8480cb8114b729dfa54cd59e69f7a0411007af8e893d',
  // Second model from search results
  'gastonmiguelartillo/slingit1:4929ce797e5778e6b4136748fa9bb857430bc2ed9edfb59ee41205bde0d2d726'
];

// Define the Replicate API endpoint
const API_URL = 'https://api.replicate.com/v1/predictions';

// Test each model
async function testModels() {
  for (const model of MODELS_TO_TEST) {
    console.log(`\nTesting model: ${model}`);
    
    try {
      // Prepare a generic request payload
      const payload = {
        version: model,
        input: {
          prompt: "A rocket launching into space"
        }
      };
      
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
      } else {
        console.log('Error response:', JSON.stringify(responseData, null, 2));
        console.log('------------------------------------------');
      }
    } catch (error) {
      console.error('Error testing model:', error.message);
      console.log('------------------------------------------');
    }
  }
}

// Run the tests
async function main() {
  await testModels();
}

main().catch(error => {
  console.error('Unhandled error:', error);
});