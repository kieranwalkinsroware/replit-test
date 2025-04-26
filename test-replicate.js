// Simple script to test Replicate API
import fetch from 'node-fetch';

// Define the API endpoint
const API_URL = 'http://localhost:5000/api/debug/replicate/test-connection';

// Define the request payload
const payload = {
  prompt: 'A rocket launching into space',
  userId: 1
};

// Make the request
async function testReplicateApi() {
  console.log('Sending request to:', API_URL);
  console.log('With payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    
    // Get the response content type
    const contentType = response.headers.get('content-type');
    console.log('Response content type:', contentType);
    
    // Read the response
    const text = await response.text();
    
    // Check if it's JSON
    if (contentType && contentType.includes('application/json')) {
      try {
        const json = JSON.parse(text);
        console.log('Response (JSON):', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Failed to parse JSON:', e.message);
        console.log('Response (text):', text.substring(0, 300) + '...');
      }
    } else {
      // Just show the first part of the response
      console.log('Response (text, first 300 chars):', text.substring(0, 300) + '...');
    }
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

// Run the test
testReplicateApi();