require('dotenv').config();
const axios = require('axios');

const subscriptionKey = process.env.AZURE_API_KEY;
const region = process.env.AZURE_REGION;

// Simple test request to Azure Cognitive Services
async function testAzure() {
  try {
    const response = await axios.get(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey,
        },
      }
    );
    console.log('Azure connection successful!');
    console.log('Auth token received:', response.data.substring(0, 10) + '...');
  } catch (error) {
    console.error('Azure connection failed:');
    console.error(error.response ? error.response.data : error.message);
  }
}

testAzure();