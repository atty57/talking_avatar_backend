// helpers/llm.js
require('dotenv').config();
const axios = require('axios');

// Configuration for Ollama
const LLM_API_URL = process.env.LLM_API_URL || 'http://localhost:11434/api/generate';
const LLM_MODEL = process.env.LLM_MODEL || 'llama3.2';

// Clinical expert persona
const CLINICAL_EXPERT_PROMPT = `You are a clinical expert. When a patient asks you a question you should not answer just general recommendations. When any patient asks about any problems or describes symptoms, ask follow-up questions as a physician, to get more ideas from the problems. Ask questions until you understand the specific problems. Always be compassionate, clear, and professional in your responses.`;

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
    
    // Combining the clinical expert persona with the user's prompt
    const fullPrompt = `${CLINICAL_EXPERT_PROMPT}\n\nPatient: ${prompt}\n\nDoctor:`;
    
    const response = await axios.post(
      LLM_API_URL,
      {
        model: model || LLM_MODEL,
        prompt: fullPrompt,
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