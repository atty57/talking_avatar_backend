// helpers/tts.js
require('dotenv').config()
console.log("AZURE_KEY:", process.env.AZURE_KEY);
console.log("AZURE_REGION:", process.env.AZURE_REGION);
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const blendShapeNames = require('./blendshapeNames');
const _ = require('lodash');

let SSML = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
<voice name="en-US-JennyNeural">
  <mstts:viseme type="FacialExpression"/>
  __TEXT__
</voice>
</speak>`;

const key = process.env.AZURE_KEY || "7542ff2d8b814808a0a3dfc1987f5d70";
const region = process.env.AZURE_REGION;

/**
 * Streaming text-to-speech function
 * @param {*} text text to convert to speech
 * @param {*} voice voice configuration
 * @returns Promise
 */
const textToSpeechStream = async (text, voice) => {
  return new Promise((resolve, reject) => {
    let ssml = SSML.replace("__TEXT__", text);
    
    const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
    // Use PCM format for lower latency
    speechConfig.speechSynthesisOutputFormat = 
      sdk.SpeechSynthesisOutputFormat.Raw8Khz8BitMonoALaw;
    
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
    
    let blendData = [];
    let timeStep = 1/60;
    let timeStamp = 0;
    let audioChunks = [];
    
    // Handle viseme events for facial animation
    synthesizer.visemeReceived = function (s, e) {
      var animation = JSON.parse(e.animation);
      
      _.each(animation.BlendShapes, blendArray => {
        let blend = {};
        _.each(blendShapeNames, (shapeName, i) => {
          blend[shapeName] = blendArray[i];
        });
        
        blendData.push({
          time: timeStamp,
          blendshapes: blend
        });
        timeStamp += timeStep;
      });
    };
    
    // Add event handler to collect audio chunks
    synthesizer.synthesizing = function (s, e) {
      if (e.result.reason === sdk.ResultReason.SynthesizingAudio) {
        audioChunks.push(e.result.audioData);
      }
    };
    
    synthesizer.speakSsmlAsync(
      ssml,
      result => {
        synthesizer.close();
        // Combine all audio chunks into a single buffer
        const audioData = Buffer.concat(audioChunks);
        resolve({ blendData, audioData });
      },
      error => {
        synthesizer.close();
        reject(error);
      }
    );
  });
};

// Original function (unmodified)
const textToSpeech = async (text, voice)=> {
    // convert callback function to promise
    return new Promise((resolve, reject) => {
        let ssml = SSML.replace("__TEXT__", text);
        
        const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
        speechConfig.speechSynthesisOutputFormat = 5; // mp3
        
        let audioConfig = null;
        
        let randomString = Math.random().toString(36).slice(2, 7);
        let filename = `./public/speech-${randomString}.mp3`;
        audioConfig = sdk.AudioConfig.fromAudioFileOutput(filename);

        let blendData = [];
        let timeStep = 1/60;
        let timeStamp = 0;

        const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

        // Subscribes to viseme received event
        synthesizer.visemeReceived = function (s, e) {
            var animation = JSON.parse(e.animation);

            _.each(animation.BlendShapes, blendArray => {
                let blend = {};
                _.each(blendShapeNames, (shapeName, i) => {
                    blend[shapeName] = blendArray[i];
                });
        
                blendData.push({
                    time: timeStamp,
                    blendshapes: blend
                });
                timeStamp += timeStep;
            });
        }

        synthesizer.speakSsmlAsync(
            ssml,
            result => {
                synthesizer.close();
                resolve({blendData, filename: `/speech-${randomString}.mp3`});
            },
            error => {
                synthesizer.close();
                reject(error);
            }); 
    });
};

module.exports = { textToSpeech, textToSpeechStream };