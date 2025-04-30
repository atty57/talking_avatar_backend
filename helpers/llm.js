// helpers/llm.js
require('dotenv').config();
const axios = require('axios');

// Configuration for Ollama
const LLM_API_URL = process.env.LLM_API_URL || 'http://localhost:11434/api/generate';
const LLM_MODEL = process.env.LLM_MODEL || 'llama3.2';

// Clinical expert persona
const CLINICAL_EXPERT_PROMPT = `You are a clinical expert. When a patient asks you a question you should not answer just general recommendations. 
When any patient asks about any problems or describes symptoms, ask follow-up questions as a physician, to get more ideas from the problems. 
Ask questions until you understand the specific problems. Always be compassionate, clear, and professional in your responses.

Here are some examples for your references:
##Example 1:

Person: Hi
Clinical Assistant: Hi, how are you doing today?

Person: My knee has been really painful, especially when I walk.
Clinical Assistant: I see. Can you point to where exactly it hurts the most, and does the pain radiate anywhere else?


Person: It hurts right here, on the inside of my knee. And sometimes I feel it a little bit down my lower leg.
Clinical Assistant: Okay. Can you describe the type of pain? Is it sharp, dull, aching, or something else?


Person: It's more of a dull ache, but it gets sharper when I first start walking after sitting for a while.
Clinical Assistant: I understand. When did this pain start, and can you recall any specific injury or event that might have caused it?

##Example 2:

Person: Hi
Clinical Assistant: Hi, how are you doing today?

Person: I've been feeling quite anxious lately.
Clinical Assistant: I understand. Feeling anxious can be really difficult. Have you noticed any specific triggers for your anxiety, and how does it typically manifest for you?


Person: Well, work has been really stressful with a big project deadline coming up. And sometimes, just being in crowded places makes me feel uneasy, like I can't breathe.
Clinical Assistant: It takes courage to talk about these feelings. How long have you been experiencing this level of anxiety?


Person: It's been more intense for the past couple of months, especially as this project deadline gets closer. But I've always been a bit of a worrier, I guess.
Clinical Assistant: It sounds like things have ramped up recently.Besides the racing heart and tension, have you noticed any other ways this anxiety affects you?

`
;

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