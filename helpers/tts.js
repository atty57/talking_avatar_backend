// helpers/tts.js
require('dotenv').config()
console.log("AZURE_KEY:", process.env.AZURE_KEY);
console.log("AZURE_REGION:", process.env.AZURE_REGION);
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const blendShapeNames = require('./blendshapeNames');
const _ = require('lodash');

// Viseme fine-tuning configuration
let VISEME_INTENSITY = 1; // Adjust this value to increase/decrease overall intensity
let VISEME_SMOOTHING = true; // Enable/disable smoothing between visemes
let VISEME_EMPHASIS = {
    // Emphasize specific mouth shapes
    "mouthOpen": 1.3,
    "jawOpen": 1.3,
    "mouthSmileLeft": 1.2,
    "mouthSmileRight": 1.2,
    "mouthFunnel": 1.25,
    "mouthPucker": 1.25,
    // Reduce excessive movement in these
    "eyeSquintLeft": 0.8,
    "eyeSquintRight": 0.8
};
let ADD_IDLE_VISEMES = true; // Enable/disable micro-expressions during pauses

let SSML = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
<voice name="en-US-AriaNeural">
  <mstts:express-as style="empathetic">
    <mstts:viseme type="FacialExpression"/>
    __TEXT__
  </mstts:express-as>
</voice>
</speak>`;

const key = process.env.AZURE_KEY || "7542ff2d8b814808a0a3dfc1987f5d70";
const region = process.env.AZURE_REGION;

/**
 * Apply intensity adjustments and smoothing to viseme data
 * @param {Array} blendData - The original blend shape data
 * @returns {Array} - The processed blend shape data
 */
function applyVisemeIntensityAndSmoothing(blendData) {
    // Apply intensity multiplier to all blendshapes
    blendData = blendData.map(frame => {
        const intensifiedBlendshapes = {};
        
        Object.keys(frame.blendshapes).forEach(key => {
            // Apply intensity but cap at 1.0 to avoid going beyond valid range
            intensifiedBlendshapes[key] = Math.min(frame.blendshapes[key] * VISEME_INTENSITY, 1.0);
            
            // Apply specific emphasis for this blendshape if defined
            if (VISEME_EMPHASIS[key]) {
                intensifiedBlendshapes[key] = Math.min(
                    intensifiedBlendshapes[key] * VISEME_EMPHASIS[key], 
                    1.0
                );
            }
        });
        
        return {
            time: frame.time,
            blendshapes: intensifiedBlendshapes
        };
    });
    
    // Apply smoothing if enabled
    if (VISEME_SMOOTHING && blendData.length > 2) {
        const smoothedData = [];
        // Keep first frame as is
        smoothedData.push(blendData[0]);
        
        // Smooth middle frames
        for (let i = 1; i < blendData.length - 1; i++) {
            const prevFrame = blendData[i - 1];
            const currentFrame = blendData[i];
            const nextFrame = blendData[i + 1];
            
            const smoothedBlendshapes = {};
            Object.keys(currentFrame.blendshapes).forEach(key => {
                // Simple three-point moving average
                smoothedBlendshapes[key] = (
                    prevFrame.blendshapes[key] * 0.25 +
                    currentFrame.blendshapes[key] * 0.5 +
                    nextFrame.blendshapes[key] * 0.25
                );
            });
            
            smoothedData.push({
                time: currentFrame.time,
                blendshapes: smoothedBlendshapes
            });
        }
        
        // Keep last frame as is
        smoothedData.push(blendData[blendData.length - 1]);
        return smoothedData;
    }
    
    return blendData;
}

/**
 * Add micro-expressions during speech pauses
 * @param {Array} blendData - The processed blend shape data
 * @param {number} frameRate - The frame rate (frames per second)
 * @returns {Array} - The blend data with added micro-expressions
 */
function addIdleVisemes(blendData, frameRate = 60) {
    if (!ADD_IDLE_VISEMES) return blendData;
    
    // Find pauses (gaps between speech movements)
    const pauseThreshold = 0.3; // seconds
    const pauseDetectionThreshold = 0.05; // value below which is considered neutral
    const pauses = [];
    
    let pauseStart = null;
    
    // Find pauses by looking for sequences with minimal movement
    for (let i = 0; i < blendData.length; i++) {
        const frame = blendData[i];
        const isActive = Object.values(frame.blendshapes).some(value => value > pauseDetectionThreshold);
        
        if (!isActive && pauseStart === null) {
            pauseStart = i;
        } else if (isActive && pauseStart !== null) {
            const pauseLength = (i - pauseStart) / frameRate;
            if (pauseLength >= pauseThreshold) {
                pauses.push({
                    start: pauseStart,
                    end: i - 1,
                    length: pauseLength
                });
            }
            pauseStart = null;
        }
    }
    
    // Add micro-expressions to pauses
    pauses.forEach(pause => {
        const microExpressions = generateMicroExpressions(
            pause.length, 
            frameRate, 
            pause.start / frameRate
        );
        
        // Blend micro-expressions into the original data
        microExpressions.forEach(microFrame => {
            const frameIndex = Math.round(microFrame.time * frameRate);
            if (frameIndex >= pause.start && frameIndex <= pause.end && frameIndex < blendData.length) {
                const originalFrame = blendData[frameIndex];
                
                // Merge micro-expressions with original frame
                Object.keys(microFrame.blendshapes).forEach(key => {
                    originalFrame.blendshapes[key] = Math.max(
                        originalFrame.blendshapes[key] || 0,
                        microFrame.blendshapes[key]
                    );
                });
            }
        });
    });
    
    return blendData;
}

/**
 * Generate micro-expressions for natural idle movements
 * @param {number} duration - Duration of the pause in seconds
 * @param {number} frameRate - The frame rate (frames per second)
 * @param {number} startTime - Starting time of the pause in seconds
 * @returns {Array} - Generated micro-expression frames
 */
function generateMicroExpressions(duration, frameRate, startTime) {
    const frames = [];
    const frameCount = Math.floor(duration * frameRate);
    
    // Create subtle random movements
    // Maybe a small blink
    if (duration > 0.5 && Math.random() > 0.4) {
        const blinkStart = startTime + Math.random() * (duration - 0.3);
        const blinkDuration = 0.2; // 200ms blink
        
        // Create blink animation frames
        for (let i = 0; i < blinkDuration * frameRate; i++) {
            const t = i / (blinkDuration * frameRate);
            const intensity = Math.sin(t * Math.PI); // 0->1->0 curve
            
            frames.push({
                time: blinkStart + i / frameRate,
                blendshapes: {
                    "eyeBlinkLeft": intensity * 0.8,
                    "eyeBlinkRight": intensity * 0.8
                }
            });
        }
    }
    
    // Maybe a small smile or other micro-expression
    if (duration > 0.7 && Math.random() > 0.6) {
        const expressionStart = startTime + Math.random() * (duration - 0.5);
        const expressionDuration = 0.4; // 400ms expression
        
        // Choose a random micro-expression
        const expressions = [
            { "mouthSmileLeft": 0.3, "mouthSmileRight": 0.3 },
            { "browInnerUp": 0.2 },
            { "browOuterUpLeft": 0.15, "browOuterUpRight": 0.15 }
        ];
        
        const selectedExpression = expressions[Math.floor(Math.random() * expressions.length)];
        
        // Create expression animation frames
        for (let i = 0; i < expressionDuration * frameRate; i++) {
            const t = i / (expressionDuration * frameRate);
            // Ease in and out curve
            const intensity = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            
            const blendshapes = {};
            Object.keys(selectedExpression).forEach(key => {
                blendshapes[key] = selectedExpression[key] * intensity;
            });
            
            frames.push({
                time: expressionStart + i / frameRate,
                blendshapes
            });
        }
    }
    
    return frames;
}

/**
 * Streaming text-to-speech function
 * @param {string} text - Text to convert to speech
 * @param {object} voice - Voice configuration
 * @param {object} options - Viseme fine-tuning options
 * @returns {Promise} - Promise resolving to audio and blend data
 */
const textToSpeechStream = async (text, voice, options = {}) => {
    // Apply options
    const currentVisemeIntensity = VISEME_INTENSITY;
    const currentVisemeSmoothing = VISEME_SMOOTHING;
    const currentVisemeEmphasis = {...VISEME_EMPHASIS};
    const currentAddIdleVisemes = ADD_IDLE_VISEMES;
    
    // Override with call-specific options
    VISEME_INTENSITY = options.visemeIntensity || VISEME_INTENSITY;
    VISEME_SMOOTHING = options.visemeSmoothing !== undefined ? options.visemeSmoothing : VISEME_SMOOTHING;
    ADD_IDLE_VISEMES = options.addIdleVisemes !== undefined ? options.addIdleVisemes : ADD_IDLE_VISEMES;
    
    if (options.visemeEmphasis) {
        Object.assign(VISEME_EMPHASIS, options.visemeEmphasis);
    }

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
            
            // Process the blend data
            blendData = applyVisemeIntensityAndSmoothing(blendData);
            blendData = addIdleVisemes(blendData);
            
            // Combine all audio chunks into a single buffer
            const audioData = Buffer.concat(audioChunks);
            
            // Restore original settings
            VISEME_INTENSITY = currentVisemeIntensity;
            VISEME_SMOOTHING = currentVisemeSmoothing;
            VISEME_EMPHASIS = currentVisemeEmphasis;
            ADD_IDLE_VISEMES = currentAddIdleVisemes;
            
            resolve({ blendData, audioData });
          },
          error => {
            synthesizer.close();
            
            // Restore original settings
            VISEME_INTENSITY = currentVisemeIntensity;
            VISEME_SMOOTHING = currentVisemeSmoothing;
            VISEME_EMPHASIS = currentVisemeEmphasis;
            ADD_IDLE_VISEMES = currentAddIdleVisemes;
            
            reject(error);
          }
        );
    });
};

/**
 * File-based text-to-speech function
 * @param {string} text - Text to convert to speech
 * @param {object} voice - Voice configuration
 * @param {object} options - Viseme fine-tuning options
 * @returns {Promise} - Promise resolving to blend data and filename
 */
const textToSpeech = async (text, voice, options = {}) => {
    // Apply options
    const currentVisemeIntensity = VISEME_INTENSITY;
    const currentVisemeSmoothing = VISEME_SMOOTHING;
    const currentVisemeEmphasis = {...VISEME_EMPHASIS};
    const currentAddIdleVisemes = ADD_IDLE_VISEMES;
    
    // Override with call-specific options
    VISEME_INTENSITY = options.visemeIntensity || VISEME_INTENSITY;
    VISEME_SMOOTHING = options.visemeSmoothing !== undefined ? options.visemeSmoothing : VISEME_SMOOTHING;
    ADD_IDLE_VISEMES = options.addIdleVisemes !== undefined ? options.addIdleVisemes : ADD_IDLE_VISEMES;
    
    if (options.visemeEmphasis) {
        Object.assign(VISEME_EMPHASIS, options.visemeEmphasis);
    }
    
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
                
                // Process the blend data
                blendData = applyVisemeIntensityAndSmoothing(blendData);
                blendData = addIdleVisemes(blendData);
                
                // Restore original settings
                VISEME_INTENSITY = currentVisemeIntensity;
                VISEME_SMOOTHING = currentVisemeSmoothing;
                VISEME_EMPHASIS = currentVisemeEmphasis;
                ADD_IDLE_VISEMES = currentAddIdleVisemes;
                
                resolve({blendData, filename: `/speech-${randomString}.mp3`});
            },
            error => {
                synthesizer.close();
                
                // Restore original settings
                VISEME_INTENSITY = currentVisemeIntensity;
                VISEME_SMOOTHING = currentVisemeSmoothing;
                VISEME_EMPHASIS = currentVisemeEmphasis;
                ADD_IDLE_VISEMES = currentAddIdleVisemes;
                
                reject(error);
            }
        ); 
    });
};

module.exports = { textToSpeech, textToSpeechStream };