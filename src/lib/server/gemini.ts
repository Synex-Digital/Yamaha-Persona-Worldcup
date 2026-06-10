import { GoogleGenAI } from '@google/genai';

const getApiKeys = (): string[] => {
  const rawKey = process.env.GEMINI_API_KEY;
  if (!rawKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  return rawKey.split(',').map(key => key.trim()).filter(Boolean);
};

const getClient = () => {
  const keys = getApiKeys();
  return new GoogleGenAI({ apiKey: keys[0] });
};



const bikeImageCache = new Map<string, { base64: string, mimeType: string }>();

/**
 * Downloads and caches the optimized bike reference image in RAM.
 * Re-uses the base64 string on subsequent hits to avoid S3 network latency.
 */
export async function getBikeImageBase64(url: string | null) {
  if (!url) return null;

  if (bikeImageCache.has(url)) {
    console.log(`[getBikeImageBase64] Cache HIT for S3 URL: ${url}`);
    return bikeImageCache.get(url)!;
  }

  try {
    console.log(`[getBikeImageBase64] Cache MISS. Fetching S3 URL: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch bike reference image from S3: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';

    const cachedResult = { base64, mimeType };
    bikeImageCache.set(url, cachedResult);
    return cachedResult;
  } catch (error) {
    console.error(`[getBikeImageBase64] Error fetching or encoding bike image:`, error);
    return null;
  }
}

export async function generateCinematicImage(
  userBase64Image: string,
  userMimeType: string,
  bikeBase64Image: string | null,
  bikeMimeType: string | null,
  imagePrompt: string
): Promise<{
  imageUrl: string;
  usedKeyIndex?: number;
  usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  };
}> {
  const keys = getApiKeys();
  const model = process.env.AI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';

  let retries = keys.length * 2; // Retry up to twice per configured key
  let delay = 2000;
  const startedAt = Date.now();
  const referenceImageCopies = 3;

  // Randomize start key index to balance concurrency load
  let currentKeyIndex = Math.floor(Math.random() * keys.length);

  console.log('[generateCinematicImage] starting request', {
    model,
    userMimeType: userMimeType || 'image/jpeg',
    hasBikeImage: !!bikeBase64Image,
    bikeMimeType: bikeMimeType || 'image/jpeg',
    imagePromptLength: imagePrompt.length,
    referenceImageCopies,
    referenceImageReason: 'intentional face-match boost',
    userBase64Chars: userBase64Image.length,
    totalKeys: keys.length,
    startingKeyIndex: currentKeyIndex,
  });

  const totalAttempts = retries;

  while (retries > 0) {
    const apiKey = keys[currentKeyIndex];
    const attempt = totalAttempts - retries + 1;
    const attemptStartedAt = Date.now();
    try {
      let enhancedPrompt = imagePrompt;

      if (bikeBase64Image) {
        enhancedPrompt = [
          enhancedPrompt,
          'A visual reference of the exact motorcycle is supplied in the input images.',
          'Rely heavily on this motorcycle reference image to accurately reproduce the physical shape, headlights, graphics, decals, chassis layout, and body geometry of the vehicle in the final scene.',
          'Do not draw generic motorcycle shapes; preserve the exact design from the reference.'
        ].join(' ');
      }

      const parts: any[] = [{ text: enhancedPrompt }];

      // Push 3 copies of the user's portrait for face matching consistency
      for (let i = 0; i < referenceImageCopies; i++) {
        parts.push({
          inlineData: {
            mimeType: userMimeType || "image/jpeg",
            data: userBase64Image
          }
        });
      }

      // If available, append the bike's visual reference image as the final part
      if (bikeBase64Image) {
        parts.push({
          inlineData: {
            mimeType: bikeMimeType || "image/jpeg",
            data: bikeBase64Image
          }
        });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts
            }
          ],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: {
              aspectRatio: process.env.AI_IMAGE_ASPECT_RATIO || "3:4"
            }
          }
        }),
        signal: AbortSignal.timeout(90000) // Timeout after 90 seconds to prevent hanging threads
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw { status: response.status, message: errorText };
      }

      const data = await response.json();

      const candidate = data.candidates?.[0];
      const resParts = candidate?.content?.parts;

      if (!Array.isArray(resParts)) {
        throw new Error("Gemini image response did not include any content parts.");
      }

      let imageUrl = '';

      for (const part of resParts) {
        if (part?.inlineData?.data) {
          const base64Out = part.inlineData.data;
          const outMimeType = part.inlineData.mimeType || "image/png";
          if (typeof base64Out === "string" && base64Out.length > 0) {
            imageUrl = `data:${outMimeType};base64,${base64Out}`;
            break;
          }
        }
      }

      if (!imageUrl) {
        throw new Error('No image payload found in response');
      }

      console.log('[generateCinematicImage] completed', {
        attempt,
        attemptMs: Date.now() - attemptStartedAt,
        totalMs: Date.now() - startedAt,
        outputBase64Chars: imageUrl.length,
        usedKeyIndex: currentKeyIndex,
      });

      return {
        imageUrl,
        usedKeyIndex: currentKeyIndex,
        usage: data.usageMetadata ? {
          promptTokenCount: data.usageMetadata.promptTokenCount || 0,
          candidatesTokenCount: data.usageMetadata.candidatesTokenCount || 0
        } : undefined
      };
    } catch (err: any) {
      // Catch transient errors: 503, 429, network timeout, headers timeout, or direct fetch failures
      const isTransient =
        err.status === 503 ||
        err.status === 429 ||
        err.name === 'TimeoutError' ||
        err.code === 'UND_ERR_HEADERS_TIMEOUT' ||
        err.message?.toLowerCase().includes('fetch failed');

      // Rotate to the next API key in the list
      const failedKeyIndex = currentKeyIndex;
      currentKeyIndex = (currentKeyIndex + 1) % keys.length;

      if (isTransient && retries > 1) {
        console.warn(`[generateCinematicImage] Gemini transient error detected on key index ${failedKeyIndex}. Retrying with key index ${currentKeyIndex} in ${delay}ms...`, {
          attempt,
          retryInMs: delay,
          elapsedMs: Date.now() - startedAt,
          error: err.message || err,
          status: err.status
        });
        await new Promise(res => setTimeout(res, delay));
        retries--;
        delay *= 2;
      } else {
        console.error(`[generateCinematicImage] permanent or final failure on key index ${failedKeyIndex}`, {
          elapsedMs: Date.now() - startedAt,
          error: err.message || err,
          status: err.status,
          retriesLeft: retries - 1
        });
        if (retries > 1) {
          console.warn(`[generateCinematicImage] Retrying next key index ${currentKeyIndex} immediately due to error...`);
          retries--;
          continue; // Try next key immediately without delay multiplier
        }
        throw err;
      }
    }
  }

  throw new Error('Gemini image generation failed after retries');
}



export async function generatePersonaContent(
  personaTitle: string,
  bikeModel: string,
  rawPrompt: string
): Promise<{
  appreciationText: string;
  optimizedPrompt: string;
  usedKeyIndex?: number;
  usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  };
}> {
  const keys = getApiKeys();
  const model = process.env.AI_TEXT_MODEL || 'gemini-2.5-flash';

  console.log('[generatePersonaContent] starting request', {
    model,
    rawPromptLength: rawPrompt.length,
    totalKeys: keys.length,
  });

  let retries = keys.length * 2; // Retry up to twice per configured key
  let delay = 1000;

  // Randomize start key index to balance concurrency load
  let currentKeyIndex = Math.floor(Math.random() * keys.length);

  while (retries > 0) {
    const apiKey = keys[currentKeyIndex];
    const client = new GoogleGenAI({ apiKey });
    const attempt = keys.length * 2 - retries + 1;

    try {
      const response = await client.models.generateContent({
        model,
        contents: `Raw prompt to optimize: ${rawPrompt}`,
        config: {
          systemInstruction: `You are a professional designer, luxury copywriter, and expert prompt engineer specializing in premium AI image-generation prompts.



Your task is to transform the provided inputs into:

1. A short, premium, 2-sentence appreciation statement for a rider whose riding personality is "${personaTitle}" and whose matched motorcycle is "${bikeModel}".

2. A refined, cohesive, high-quality image-generation prompt based on the raw visual prompt.



Inputs:

- Riding personality: "${personaTitle}"

- Matched motorcycle: "${bikeModel}"



Appreciation statement requirements:

- Write exactly 2 sentences.

- Make it sound polished, aspirational, and premium, similar to a luxury automotive campaign.

- Celebrate the rider’s personality and the match with the motorcycle.

- Keep it concise, elegant, and emotionally engaging.

- Avoid exaggerated claims, clichés, or overly casual wording.



Image prompt optimization requirements:

- Preserve all important visual context from the raw prompt.

- Keep key details intact, including:

  - Rider wardrobe and cultural clothing, such as a country jersey, salwar kameez, Punjabi outfit, or any other specified attire.

  - Rider pose, posture, body positioning, and interaction with the motorcycle.

  - Motorcycle identity, model, color, design language, and distinctive features.

  - Authentic Yamaha FZS V4 front-face elements when mentioned.

  - Environment, background, lighting, mood, atmosphere, camera angle, lens style, and cinematic direction.

- Resolve contradictions by choosing the clearest, most visually consistent interpretation.

- Remove repetition, filler, awkward phrasing, fragmented wording, and conflicting descriptions.

- Rewrite the prompt as one unified premium visual description, not as a disconnected list.

- Use realistic, respectful, neutral language that preserves the intended meaning while avoiding unnecessarily sensitive or unsafe wording.

- Keep the motorcycle and wardrobe descriptions visually precise and believable.

- Do not invent major new elements that are not implied by the raw prompt.

- You may improve phrasing, flow, cinematic quality, and visual clarity.



Output rules:

- Respond only with a valid JSON object.

- Do not include markdown, explanations, comments, or extra text.

- Ensure the JSON is properly escaped and parseable.



Required JSON schema:

{

  "appreciationText": "Exactly 2 polished sentences celebrating the rider personality and bike match.",

  "optimizedPrompt": "A single polished, cohesive, premium image-generation prompt preserving the original visual context."

}`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              appreciationText: {
                type: 'STRING',
                description: 'A short, engaging, premium 2-sentence appreciation statement.'
              },
              optimizedPrompt: {
                type: 'STRING',
                description: 'The refined, optimized visual prompt description for image generation.'
              }
            },
            required: ['appreciationText', 'optimizedPrompt']
          },
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.appreciationText && parsed.optimizedPrompt) {
          console.log('[generatePersonaContent] completed successfully', {
            attempt,
            model,
            usedKeyIndex: currentKeyIndex,
            appreciationLength: parsed.appreciationText.length,
            optimizedPromptLength: parsed.optimizedPrompt.length,
          });
          return {
            appreciationText: parsed.appreciationText.trim(),
            optimizedPrompt: parsed.optimizedPrompt.trim(),
            usedKeyIndex: currentKeyIndex,
            usage: response.usageMetadata ? {
              promptTokenCount: response.usageMetadata.promptTokenCount || 0,
              candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0
            } : undefined
          };
        }
      }
      throw new Error('Invalid or empty structured response from model');
    } catch (error: any) {
      const failedKeyIndex = currentKeyIndex;
      currentKeyIndex = (currentKeyIndex + 1) % keys.length; // Rotate key

      if (error.status === 503 && retries > 1) {
        console.warn(`[generatePersonaContent] Gemini 503 error on key index ${failedKeyIndex}. Retrying key index ${currentKeyIndex} in ${delay}ms...`, {
          attempt,
          retryInMs: delay,
          error: error.message || error,
          status: error.status
        });
        await new Promise(res => setTimeout(res, delay));
        retries--;
        delay *= 2;
      } else {
        console.warn(`[generatePersonaContent] API error on key index ${failedKeyIndex}. Retrying key index ${currentKeyIndex} immediately...`, {
          attempt,
          error: error.message || error,
          status: error.status,
          retriesLeft: retries - 1
        });
        if (retries > 1) {
          retries--;
          continue;
        }
        break;
      }
    }
  }

  console.warn('[generatePersonaContent] Failed to generate combined content. Using fallbacks.');
  return {
    appreciationText: `Experience the thrill of the ride. You and the ${bikeModel} are a perfect match.`,
    optimizedPrompt: rawPrompt
  };
}
