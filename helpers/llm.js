// helpers/llm.js
require('dotenv').config();
const axios = require('axios');

// Configuration for Ollama
const LLM_API_URL = process.env.LLM_API_URL || 'http://localhost:11434/api/generate';
const LLM_MODEL = process.env.LLM_MODEL || 'llama3.2';

/**
 * Generate a response using Ollama
 * @param {string} prompt - The user's input text
 * @param {string} model - Optional model override
 * @returns {Promise<string>} - The generated response
 */
async function generateResponse(prompt, model = null) {
  try {
    console.log(`Generating response with model: ${model || LLM_MODEL}`);
    console.log(`Prompt: ${prompt}`);
    
    const response = await axios.post(
      LLM_API_URL,
      {
        model: model || LLM_MODEL,
        prompt: prompt,
        stream: false
      }
    );
    
    console.log("LLM Response received");
    
    if (response.data && response.data.response) {
      return response.data.response.trim();
    } else {
      console.error("Unexpected response format:", JSON.stringify(response.data));
      return "I couldn't generate a proper response. Please try again.";
    }
  } catch (error) {
    console.error('Error generating LLM response:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(error.message);
    }
    return 'Sorry, I had trouble generating a response. Please try again.';
  }
}

module.exports = { generateResponse };