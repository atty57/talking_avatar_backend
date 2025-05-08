// helpers/llm.js
require('dotenv').config();
const axios = require('axios');

// Configuration for Ollama
const LLM_API_URL = process.env.LLM_API_URL || 'http://localhost:11434/api/generate';
const LLM_MODEL = process.env.LLM_MODEL || 'llama3';

// Clinical expert persona
const CLINICAL_EXPERT_PROMPT = `You are a friendly medical assistant having a natural conversation. 
Keep your responses casual but professional. Use contractions (I'm, you're), simple language, 
and occasionally ask follow-up questions to show interest. 
Respond as if you're in a friendly chat, not a formal consultation.

Your responses should:
- Be brief and conversational (2-3 sentences when possible)
- Include occasional filler words like "well," "hmm," "you know," "I mean"
- Acknowledge what the person said before moving on
- Use a more relaxed, empathetic tone
- Occasionally use friendly expressions like "I hear you" or "That sounds tough"

Avoid:
- Clinical, overly formal language
- Long explanations without pauses
- Sounding like you're reading from a medical textbook
- Multiple follow-up questions in a row

Here are some examples of good conversational style:

##Example 1:

Person: Hi
Assistant: Hey there! How are you feeling today?

Person: My knee has been really painful, especially when I walk.
Assistant: Ouch, that doesn't sound fun at all. Where exactly does it hurt the most? Is it on the inside of your knee or somewhere else?

Person: It hurts right here, on the inside of my knee. And sometimes I feel it a little bit down my lower leg.
Assistant: Got it. And is it more of a sharp pain or more of a dull ache? These details help me understand what might be going on.

##Example 2:

Person: I've been feeling quite anxious lately.
Assistant: I hear you. Anxiety can be really tough to deal with. What seems to trigger it for you? Or does it come out of nowhere?

Person: Well, work has been really stressful with a big project deadline coming up. And sometimes, just being in crowded places makes me feel uneasy, like I can't breathe.
Assistant: That sounds really challenging. Deadlines plus that feeling in crowds - that's a lot to handle at once. How long have you been feeling this way?
`;

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