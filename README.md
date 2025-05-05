# Talking Avatar Backend

This Express.js backend service for the Talking Avatar application converts text to speech with synchronized facial animations using Microsoft Azure Cognitive Services.

## Features

- Text-to-speech conversion with viseme (facial animation) data
- Integration with Azure Cognitive Services Speech SDK
- Optional LLM-powered AI responses via Ollama
- Customizable viseme settings for facial expression control
- Both standard and streaming API endpoints
- Cross-origin resource sharing (CORS) enabled

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Microsoft Azure account with Speech Services enabled
- Ollama setup (optional, for AI functionality)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd talking-avatar-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following content:
```
AZURE_KEY=your_azure_speech_service_key
AZURE_REGION=your_azure_region
LLM_API_URL=http://localhost:11434/api/generate
LLM_MODEL=llama3.2
```

## Running the Server

Start the development server:
```bash
npm start
```

The server will be available at `http://localhost:3001`.

## Project Structure

- `/bin` - Server initialization
- `/helpers` - Utility functions
  - `blendshapeNames.js` - Names of facial animation parameters
  - `tts.js` - Core text-to-speech and viseme generation functionality
  - `llm.js` - Optional LLM integration for AI responses
- `/routes` - API routes
  - `index.js` - Main routes for the application
- `/public` - Static files
  - `/speech-*.mp3` - Generated speech files (created during runtime)
- `/views` - Pug templates (minimal, mostly for error pages)

## API Endpoints

### POST /talk

Converts text to speech and returns audio file URL and viseme data.

Parameters:
- `text` (string): The text to convert to speech
- `useAI` (boolean, optional): Whether to generate an AI response
- `prompt` (string, optional): Custom prompt for AI generation
- `model` (string, optional): Name of the LLM model to use
- `visemeIntensity` (number, optional): Intensity of facial expressions
- `visemeSmoothing` (boolean, optional): Enable/disable expression smoothing
- `visemeEmphasis` (object, optional): Specific emphasis values for expressions
- `addIdleVisemes` (boolean, optional): Add micro-expressions during pauses

Response:
```json
{
  "blendData": [...],  // Array of animation data
  "filename": "/speech-xyz123.mp3",  // Path to audio file
  "generatedText": "Response text..."  // Original or AI-generated text
}
```

### POST /talk-stream

Streaming version of the `/talk` endpoint that returns audio data directly.

Parameters: Same as `/talk`

Response:
- Headers:
  - `Content-Type: application/octet-stream`
  - `X-Blend-Data: [...]` (JSON-serialized animation data)
  - `X-Generated-Text: "Response text..."`
- Body: Raw audio data

## Azure Speech Services Integration

The backend uses Microsoft's Cognitive Services Speech SDK to:
1. Convert text to speech audio
2. Generate viseme (facial animation) data synchronized with speech

The viseme data is mapped to standard facial animation blend shapes.

## Optional LLM Integration

For AI-powered responses, the backend can integrate with Ollama using:
- `LLM_API_URL` environment variable 
- `LLM_MODEL` environment variable 

This enables the avatar to generate contextual responses to user input.

## Customizing Facial Animations

Viseme (facial animation) data can be customized through API parameters:

- `visemeIntensity`: Overall intensity of expressions (default: 1.0)
- `visemeSmoothing`: Smooth transitions between expressions (default: true)
- `visemeEmphasis`: Emphasis for specific blendshapes like "mouthOpen" or "eyeSquint"
- `addIdleVisemes`: Add natural micro-expressions during pauses (default: true)

## Testing

You can test the API with the included `test_ollama.js` script:
```bash
node test_ollama.js
```

For Azure connectivity testing, use:
```bash
node test-azure.js
```

## Troubleshooting

- Check Azure credentials in the `.env` file
- Verify that the specified Azure region is correct
- For LLM issues, ensure Ollama is running and accessible
- Check the server console for detailed error logs


## Acknowledgments

- Speech synthesis powered by Microsoft Azure Cognitive Services
- LLM functionality powered by Ollama
