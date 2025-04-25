require('dotenv').config();
const axios = require('axios');

// Test the /talk endpoint with AI generation
async function testTalkEndpoint() {
  try {
    console.log("Testing /talk endpoint with AI...");
    const response = await axios.post('http://localhost:3001/talk', {
      text: "Hello, this is a test.",
      useAI: true,
      prompt: "Give a short greeting as a friendly virtual assistant."
    });
    
    console.log("Response received:");
    console.log("Generated text:", response.data.generatedText);
    console.log("Audio file:", response.data.filename);
    console.log("Blend data length:", response.data.blendData.length);
    
  } catch (error) {
    console.error("Test failed:");
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testTalkEndpoint();