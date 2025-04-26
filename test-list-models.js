// This script attempts to list models we might have access to with our API key

import fetch from 'node-fetch';

// Check if REPLICATE_API_TOKEN is set
const API_KEY = process.env.REPLICATE_API_TOKEN;
if (!API_KEY) {
  console.error('Error: REPLICATE_API_TOKEN environment variable is not set');
  process.exit(1);
}

// Try to get a list of collections which might contain models we can access
async function listCollections() {
  console.log('Attempting to list collections...');
  
  try {
    const response = await fetch('https://api.replicate.com/v1/collections', {
      method: 'GET',
      headers: {
        'Authorization': `Token ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Successfully retrieved collections:');
      console.log(JSON.stringify(data, null, 2));
      return data;
    } else {
      console.error('Failed to get collections:', JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('Error getting collections:', error.message);
    return null;
  }
}

// Try to list public models
async function searchModels() {
  console.log('Searching for public models with search query...');
  
  try {
    // Try a few search queries that might find models
    const searchQueries = ['video', 'zeroscope', 'text-to-image'];
    
    for (const query of searchQueries) {
      console.log(`\nSearching for models with query: "${query}"`);
      
      const response = await fetch(`https://api.replicate.com/v1/models?query=${query}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.results && data.results.length > 0) {
        console.log(`Found ${data.results.length} models for query "${query}":`);
        
        // Log the first 3 models with their details
        for (let i = 0; i < Math.min(3, data.results.length); i++) {
          const model = data.results[i];
          console.log(`\nModel ${i+1}/${Math.min(3, data.results.length)}:`);
          console.log(`- Owner/Name: ${model.owner}/${model.name}`);
          console.log(`- Description: ${model.description}`);
          console.log(`- Visibility: ${model.visibility}`);
          console.log(`- Latest Version: ${model.latest_version ? model.latest_version.id : 'N/A'}`);
        }
        
        // Check if there are any public models
        const publicModels = data.results.filter(model => model.visibility === 'public');
        if (publicModels.length > 0) {
          console.log(`\nFound ${publicModels.length} public models for query "${query}"`);
          
          // List them
          publicModels.slice(0, 5).forEach((model, index) => {
            console.log(`${index+1}. ${model.owner}/${model.name} - ${model.latest_version ? model.latest_version.id : 'N/A'}`);
          });
        } else {
          console.log(`\nNo public models found for query "${query}"`);
        }
      } else {
        console.log(`No models found for query "${query}" or error:`, JSON.stringify(data, null, 2));
      }
    }
  } catch (error) {
    console.error('Error searching models:', error.message);
  }
}

// Run the tests
async function main() {
  const collections = await listCollections();
  await searchModels();
}

main().catch(error => {
  console.error('Unhandled error:', error);
});