require('dotenv').config({ path: '.env.local' });
const { GoogleGenAI } = require('@google/genai');

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  const client = new GoogleGenAI({ apiKey });
  
  try {
    console.log('Testing text generation...');
    const textRes = await client.models.generateContent({
      model: process.env.AI_TEXT_MODEL || 'gemini-2.5-flash',
      contents: 'Say hello',
    });
    console.log('Text OK:', textRes.text);
  } catch (e) {
    console.error('Text Error:', e);
  }

  try {
    console.log('Testing image generation...');
    const imgRes = await client.models.generateImages({
      model: process.env.AI_IMAGE_MODEL || 'imagen-4.0-generate-001',
      prompt: 'A cinematic photo of a red yamaha motorcycle in a city.',
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '3:4',
      }
    });
    console.log('Image OK, base64 length:', imgRes.generatedImages?.[0]?.image?.imageBytes?.length);
  } catch (e) {
    console.error('Image Error:', e);
  }
}

testGemini();
