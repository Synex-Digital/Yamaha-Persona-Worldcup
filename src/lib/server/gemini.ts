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

export async function generatePersonaCopy(personaTitle: string, bikeModel: string): Promise<{
  text: string;
  usedKeyIndex?: number;
  usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  };
}> {
  const keys = getApiKeys();
  const model = process.env.AI_TEXT_MODEL || 'gemini-2.5-flash';

  const prompt = `Write a short, engaging, premium 2-sentence appreciation statement for a user whose riding personality is "${personaTitle}" and matched with the "${bikeModel}". Make it sound like a luxury automotive campaign.`;

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
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });

      console.log('[generatePersonaCopy] completed', {
        attempt,
        model,
        usedKeyIndex: currentKeyIndex,
      });

      return {
        text: response.text || '',
        usedKeyIndex: currentKeyIndex,
        usage: response.usageMetadata ? {
          promptTokenCount: response.usageMetadata.promptTokenCount || 0,
          candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0
        } : undefined
      };
    } catch (error: any) {
      const failedKeyIndex = currentKeyIndex;
      currentKeyIndex = (currentKeyIndex + 1) % keys.length; // Rotate key

      if (error.status === 503 && retries > 1) {
        console.warn(`[generatePersonaCopy] Gemini 503 error on key index ${failedKeyIndex}. Retrying key index ${currentKeyIndex} in ${delay}ms...`, {
          attempt,
          retryInMs: delay,
          error: error.message || error,
          status: error.status
        });
        await new Promise(res => setTimeout(res, delay));
        retries--;
        delay *= 2;
      } else {
        console.warn(`[generatePersonaCopy] API error on key index ${failedKeyIndex}. Retrying key index ${currentKeyIndex} immediately...`, {
          attempt,
          error: error.message || error,
          status: error.status,
          retriesLeft: retries - 1
        });
        if (retries > 1) {
          retries--;
          continue; // Try next key immediately without delay multiplier
        }
        break;
      }
    }
  }

  return {
    text: `Experience the thrill of the ride. You and the ${bikeModel} are a perfect match.`
  };
}

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
