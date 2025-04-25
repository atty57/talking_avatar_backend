var express = require('express');
var router = express.Router();
var textToSpeech = require('../helpers/tts');
var llm = require('../helpers/llm');

/* POST talk endpoint */
router.post('/talk', async function(req, res, next) {
  try {
    // Extract request parameters
    let text = req.body.text;
    const useAI = req.body.useAI;
    const prompt = req.body.prompt || text;
    const model = req.body.model;
    
    console.log(`/talk request: useAI=${useAI}, model=${model}`);
    
    // If useAI flag is true, generate response with LLM
    if (useAI) {
      try {
        console.log(`Generating LLM response for prompt: ${prompt}`);
        const generatedText = await llm.generateResponse(prompt, model);
        console.log(`LLM response: "${generatedText}"`);
        
        if (generatedText && generatedText !== 'Sorry, I had trouble generating a response. Please try again.') {
          text = generatedText;
        } else {
          console.log("Using original text due to LLM generation failure");
        }
      } catch (llmError) {
        console.error("LLM Error:", llmError);
        // Continue with original text if LLM fails
      }
    }
    
    console.log(`Generating speech for text: "${text}"`);
    // Process speech with the final text
    const result = await textToSpeech(text, req.body.voice);
    
    // Return the result with the possibly modified text
    res.json({
      ...result,
      generatedText: text
    });
  } catch (err) {
    console.error("Error in /talk endpoint:", err);
    res.status(500).json({ error: 'An error occurred during processing' });
  }
});

module.exports = router;