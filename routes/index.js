var express = require('express');
var router = express.Router();
var ttsHelpers = require('../helpers/tts');
var llm = require('../helpers/llm');

/* POST talk endpoint (streaming version) */
router.post('/talk-stream', async function(req, res, next) {
  try {
    // Extract request parameters
    let text = req.body.text;
    const useAI = req.body.useAI;
    const prompt = req.body.prompt || text;
    const model = req.body.model;
    
    // Extract viseme tuning parameters
    const visemeOptions = {
        visemeIntensity: req.body.visemeIntensity,
        visemeSmoothing: req.body.visemeSmoothing,
        visemeEmphasis: req.body.visemeEmphasis,
        addIdleVisemes: req.body.addIdleVisemes
    };
    
    console.log(`/talk-stream request: useAI=${useAI}, model=${model}`);
    
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
    
    console.log(`Generating streaming speech for text: "${text}"`);
    // Process speech with the final text
    const result = await ttsHelpers.textToSpeechStream(text, req.body.voice, visemeOptions);
    
    // Set headers for the response
    res.set({
      'Content-Type': 'application/octet-stream',
      'X-Blend-Data': JSON.stringify(result.blendData),
      'X-Generated-Text': text
    });
    
    // Send the audio data directly
    res.send(result.audioData);
  } catch (err) {
    console.error("Error in /talk-stream endpoint:", err);
    res.status(500).json({ error: 'An error occurred during processing' });
  }
});

/* Original talk endpoint (updated with viseme options) */
router.post('/talk', async function(req, res, next) {
  try {
    // Extract request parameters
    let text = req.body.text;
    const useAI = req.body.useAI;
    const prompt = req.body.prompt || text;
    const model = req.body.model;
    
    // Extract viseme tuning parameters
    const visemeOptions = {
        visemeIntensity: req.body.visemeIntensity,
        visemeSmoothing: req.body.visemeSmoothing,
        visemeEmphasis: req.body.visemeEmphasis,
        addIdleVisemes: req.body.addIdleVisemes
    };
    
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
    const result = await ttsHelpers.textToSpeech(text, req.body.voice, visemeOptions);
    
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