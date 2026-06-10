import { NextResponse } from 'next/server';
import { query } from '@/lib/server/mysql';
import { generateCinematicImage, getBikeImageBase64, generatePersonaContent } from '@/lib/server/gemini';
import { buildImagePrompt, parsePersonaPayload, selectBikeForPersona } from '@/lib/server/ride-persona';
import { getApiMessages, getRequestLanguage } from '@/lib/i18n/api';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getAppSettings, getBooleanAppSetting } from '@/lib/server/app-settings';

async function getGenerationByHashId(hashId: string) {
  const generations = await query<any[]>(
    `SELECT hash_id, generated_image_url, traits_summary, status
     FROM generations
     WHERE hash_id = ?
     LIMIT 1`,
    [hashId]
  );

  return generations[0] || null;
}

async function getUserProfile(userId: number) {
  const users = await query<any[]>(
    `SELECT gender, division
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  return users[0] || null;
}

function normalizeRequestId(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return /^[a-f0-9]{32}$/.test(trimmed) ? trimmed : null;
}

export async function GET(req: Request) {
  try {
    const messages = getApiMessages(await getRequestLanguage(req));
    const { searchParams } = new URL(req.url);
    const requestId = normalizeRequestId(searchParams.get('requestId'));

    if (!requestId) {
      return NextResponse.json({ error: messages.invalidRequestId }, { status: 400 });
    }

    const generation = await getGenerationByHashId(requestId);

    if (!generation) {
      return NextResponse.json({ status: 'not_found' });
    }

    return NextResponse.json({
      status: generation.status,
      generationId: generation.hash_id,
      imageUrl: generation.generated_image_url,
      personaCopy: generation.traits_summary,
    });
  } catch (error) {
    console.error('Generate status API error:', error);
    return NextResponse.json({ error: getApiMessages(await getRequestLanguage(req)).checkGenerationFailed }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const language = await getRequestLanguage(req);
  const messages = getApiMessages(language);
  const checkpoints: Record<string, number> = {};
  let activeHashId: string | null = null;
  let reservedGeneration = false;
  const mark = (label: string) => {
    checkpoints[label] = Date.now() - startedAt;
    console.log(`[api/generate] ${label} at ${checkpoints[label]}ms`);
  };

  const textModel = process.env.AI_TEXT_MODEL || 'gemini-2.5-flash';
  const imageModel = process.env.AI_IMAGE_MODEL || 'gemini-3.1-flash-image';
  let combinedUsage: { promptTokenCount: number; candidatesTokenCount: number } | undefined;
  let combinedUsedKeyIndex: number | undefined;
  let textCost = 0;
  let imageUsage: { promptTokenCount: number; candidatesTokenCount: number } | undefined;
  let imageUsedKeyIndex: number | undefined;
  let imageCost = 0;
  let totalCost = 0;
  let optimizedPromptText = '';

  try {
    if (await getBooleanAppSetting('campaign_completed')) {
      return NextResponse.json({ error: messages.campaignCompleted }, { status: 403 });
    }

    // We expect a multipart/form-data request
    const formData = await req.formData();
    mark('form-data-parsed');
    const photo = formData.get('photo') as File;
    const persona = formData.get('persona') as string;
    const requestId = normalizeRequestId(formData.get('requestId'));

    if (!photo || !persona) {
      return NextResponse.json({ error: messages.missingRequiredFields }, { status: 400 });
    }

    // Authenticate user
    const cookieStore = await cookies();
    const token = cookieStore.get('user_token')?.value;
    if (!token) {
      return NextResponse.json({ error: messages.unauthorized }, { status: 401 });
    }

    let userId: number;
    try {
      const secret = process.env.OTP_SECRET || 'fallback_secret_please_change';
      const verified = await jwtVerify(token, new TextEncoder().encode(secret));
      userId = verified.payload.userId as number;
      mark('auth-verified');
    } catch (err) {
      return NextResponse.json({ error: messages.invalidSession }, { status: 401 });
    }

    if (requestId) {
      const existingGeneration = await getGenerationByHashId(requestId);

      if (existingGeneration) {
        mark('existing-generation-found');
        return NextResponse.json({
          success: true,
          generationId: existingGeneration.hash_id,
          imageUrl: existingGeneration.generated_image_url,
          personaCopy: existingGeneration.traits_summary,
          status: existingGeneration.status,
        });
      }
    }

    // Rate Limiting Check
    const settings = Object.entries(await getAppSettings()).map(([setting_key, setting_value]) => ({
      setting_key,
      setting_value,
    }));
    const getSetting = (key: string, def: number) => {
      const s = settings.find(x => x.setting_key === key);
      return s ? parseInt(s.setting_value, 10) : def;
    };
    const getBooleanSetting = (key: string, def: boolean) => {
      const s = settings.find(x => x.setting_key === key);
      if (!s) return def;
      return s.setting_value !== 'false';
    };
    
    const maxDaily = getSetting('max_daily_generations', 10);
    const maxWeekly = getSetting('max_weekly_generations', 50);
    const maxMonthly = getSetting('max_monthly_generations', 100);
    const isEidCampEnabled = getBooleanSetting('eid_camp_enabled', false);
    const isWorldcupCampEnabled = getBooleanSetting('worldcup_camp_enabled', false);

    const [dailyCountRes, weeklyCountRes, monthlyCountRes] = await Promise.all([
      query<any[]>('SELECT COUNT(*) as count FROM generations WHERE user_id = ? AND created_at > NOW() - INTERVAL 1 DAY', [userId]),
      query<any[]>('SELECT COUNT(*) as count FROM generations WHERE user_id = ? AND created_at > NOW() - INTERVAL 1 WEEK', [userId]),
      query<any[]>('SELECT COUNT(*) as count FROM generations WHERE user_id = ? AND created_at > NOW() - INTERVAL 1 MONTH', [userId])
    ]);
    mark('rate-limit-checked');

    if (dailyCountRes[0].count >= maxDaily) {
      return NextResponse.json({ error: messages.dailyLimit.replace('{count}', String(maxDaily)) }, { status: 429 });
    }
    if (weeklyCountRes[0].count >= maxWeekly) {
      return NextResponse.json({ error: messages.weeklyLimit.replace('{count}', String(maxWeekly)) }, { status: 429 });
    }
    if (monthlyCountRes[0].count >= maxMonthly) {
      return NextResponse.json({ error: messages.monthlyLimit.replace('{count}', String(maxMonthly)) }, { status: 429 });
    }

    // Convert photo to base64
    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = photo.type;
    mark('photo-encoded');

    let personaData;
    try {
      personaData = parsePersonaPayload(persona);
      mark('persona-parsed');
    } catch (e: any) {
      console.error('Persona parsing error:', e);
      return NextResponse.json({ error: messages.quizInvalid }, { status: 400 });
    }

    const selection = await selectBikeForPersona(personaData);
    mark('bike-selected');
    const userProfile = await getUserProfile(userId);
    mark('user-profile-loaded');
    const bikeId = selection.bike.id;
    const bikeModel = selection.bike.model_name;
    const bikeColor = selection.resolvedColor;
    const destinationScene = personaData.destination_meta?.scene || personaData.destination || 'premium scenic road';
    const destinationMood = personaData.destination_meta?.personality || `${personaData.destination} rider energy`;
    const aspirationTone = personaData.aspiration || 'signature rider energy';
    const finalPrompt = buildImagePrompt({
      bikeModel,
      bikeColor,
      destinationScene,
      destinationMood,
      aspiration: aspirationTone,
      gender: userProfile?.gender || null,
      isEidCampEnabled,
      isWorldcupCampEnabled,
      destinationMeta: personaData.destination_meta,
    });

    const crypto = await import('crypto');
    const hashId = requestId || crypto.randomBytes(16).toString('hex');
    activeHashId = hashId;

    try {
      await query(
        `INSERT INTO generations (
          user_id,
          bike_id,
          behavior_option_id,
          destination_option_id,
          aspiration_option_id,
          generated_image_url,
          persona_title,
          traits_summary,
          final_prompt,
          resolved_bike_color,
          selection_meta,
          hash_id,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          bikeId,
          personaData.behavior,
          personaData.destination_id,
          personaData.aspiration_id,
          null,
          persona,
          null,
          finalPrompt,
          bikeColor,
          JSON.stringify(selection.selectionMeta),
          hashId,
          'processing',
        ]
      );
      reservedGeneration = true;
      mark('generation-reserved');
    } catch (reservationError: any) {
      if (reservationError?.code === 'ER_DUP_ENTRY') {
        const existingGeneration = await getGenerationByHashId(hashId);
        mark('existing-generation-found');
        return NextResponse.json({
          success: true,
          generationId: hashId,
          imageUrl: existingGeneration?.generated_image_url || null,
          personaCopy: existingGeneration?.traits_summary || null,
          status: existingGeneration?.status || 'processing',
        });
      }

      throw reservationError;
    }

    console.log('[api/generate] Generating persona copy and image...');
    const personaSummary = `${destinationMood} with ${aspirationTone.toLowerCase()}`;

    // Fetch the cached bike reference image base64 bytes (takes 0ms on cache hits)
    const bikeRef = await getBikeImageBase64(selection.bike.image_url);

    let personaCopy = `Experience the thrill of the ride. You and the ${bikeModel} are a perfect match.`;
    let generatedImageUrl = null;
    let generationStatus = 'completed';

    optimizedPromptText = finalPrompt;

    // 1. Generate premium appreciation statement and optimize the image prompt in a single call using gemini-2.5-flash
    try {
      console.log('[api/generate] Generating persona text & optimizing image prompt in a single call...');
      const combinedResult = await generatePersonaContent(personaSummary, bikeModel, finalPrompt);
      
      if (combinedResult.appreciationText) {
        personaCopy = combinedResult.appreciationText;
      }
      if (combinedResult.optimizedPrompt) {
        optimizedPromptText = combinedResult.optimizedPrompt;
      }
      if (combinedResult.usage) {
        combinedUsage = combinedResult.usage;
      }
      if (combinedResult.usedKeyIndex !== undefined) {
        combinedUsedKeyIndex = combinedResult.usedKeyIndex;
      }
    } catch (combinedError) {
      console.error('[api/generate] Combined persona content generation failed:', combinedError);
    }

    // 2. Generate the cinematic face-matched portrait
    try {
      console.log('[api/generate] Generating cinematic image...');
      const result = await generateCinematicImage(
        base64Image,
        mimeType,
        bikeRef?.base64 || null,
        bikeRef?.mimeType || null,
        optimizedPromptText
      );
      generatedImageUrl = result.imageUrl;
      if (result.usage) {
        imageUsage = result.usage;
      }
      if (result.usedKeyIndex !== undefined) {
        imageUsedKeyIndex = result.usedKeyIndex;
      }
    } catch (aiError: any) {
      console.error('Gemini Image Generation Failed. Triggering premium fallback card...', aiError);
      generationStatus = 'failed';
    }

    // Cost calculation & log output
    const getRates = (modelName: string) => {
      const normalized = modelName.toLowerCase();
      if (normalized.includes('gemini-3-pro-image')) {
        return { input: 2.00, output: 12.00 };
      }
      if (
        normalized.includes('gemini-3.1-flash-image') ||
        normalized.includes('gemini-3.1-flash') ||
        normalized.includes('gemini-3-flash')
      ) {
        return { input: 0.50, output: 3.00 };
      }
      // Default to gemini-2.5-flash rates
      return { input: 0.30, output: 2.50 };
    };

    const textRates = getRates(textModel);
    const imageRates = getRates(imageModel);

    textCost = 0;
    imageCost = 0;

    if (combinedUsage) {
      const inputCost = (combinedUsage.promptTokenCount / 1_000_000) * textRates.input;
      const outputCost = (combinedUsage.candidatesTokenCount / 1_000_000) * textRates.output;
      textCost = inputCost + outputCost;
    }

    if (imageUsage) {
      const inputCost = (imageUsage.promptTokenCount / 1_000_000) * imageRates.input;
      const outputCost = (imageUsage.candidatesTokenCount / 1_000_000) * imageRates.output;
      imageCost = inputCost + outputCost;
    }

    totalCost = textCost + imageCost;

    console.log('\n' + '='.repeat(60));
    console.log('              GEMINI PROMPT OPTIMIZATION LOGS');
    console.log('='.repeat(60));
    console.log('--- ORIGINAL PROMPT ---');
    console.log(finalPrompt);
    console.log('-'.repeat(60));
    console.log('--- OPTIMIZED PROMPT ---');
    console.log(optimizedPromptText);
    console.log('='.repeat(60) + '\n');

    console.log('\n' + '='.repeat(60));
    console.log('              GEMINI API COST BREAKDOWN');
    console.log('='.repeat(60));
    console.log(`Combined Text & Optimizer Model: ${textModel}${combinedUsedKeyIndex !== undefined ? ` (API Key Index: ${combinedUsedKeyIndex})` : ''}`);
    if (combinedUsage) {
      console.log(`  - Input Tokens:  ${combinedUsage.promptTokenCount.toLocaleString()} (Cost: $${((combinedUsage.promptTokenCount / 1_000_000) * textRates.input).toFixed(8)})`);
      console.log(`  - Output Tokens: ${combinedUsage.candidatesTokenCount.toLocaleString()} (Cost: $${((combinedUsage.candidatesTokenCount / 1_000_000) * textRates.output).toFixed(8)})`);
      console.log(`  - Subtotal Cost: $${textCost.toFixed(8)}`);
    } else {
      console.log('  - Usage stats not available');
    }
    console.log('-'.repeat(60));
    console.log(`Image Generator Model: ${imageModel}${imageUsedKeyIndex !== undefined ? ` (API Key Index: ${imageUsedKeyIndex})` : ''}`);
    if (imageUsage) {
      console.log(`  - Input Tokens:  ${imageUsage.promptTokenCount.toLocaleString()} (Cost: $${((imageUsage.promptTokenCount / 1_000_000) * imageRates.input).toFixed(8)})`);
      console.log(`  - Output Tokens: ${imageUsage.candidatesTokenCount.toLocaleString()} (Cost: $${((imageUsage.candidatesTokenCount / 1_000_000) * imageRates.output).toFixed(8)})`);
      console.log(`  - Subtotal Cost: $${imageCost.toFixed(8)}`);
    } else {
      console.log('  - Usage stats not available');
    }
    console.log('='.repeat(60));
    console.log('TOTAL COMBINED STATS:');
    if (combinedUsage || imageUsage) {
      const totalInput = (combinedUsage?.promptTokenCount || 0) + (imageUsage?.promptTokenCount || 0);
      const totalOutput = (combinedUsage?.candidatesTokenCount || 0) + (imageUsage?.candidatesTokenCount || 0);
      console.log(`  - Total Input Tokens:  ${totalInput.toLocaleString()}`);
      console.log(`  - Total Output Tokens: ${totalOutput.toLocaleString()}`);
      console.log(`  - Combined Total Cost: $${totalCost.toFixed(8)}`);
    } else {
      console.log('  - No usage stats available');
    }
    console.log('='.repeat(60) + '\n');

    let publicS3Url = selection.bike.image_url;

    if (generationStatus === 'completed' && generatedImageUrl) {
      // Upload to AWS S3 instead of local public folder
      console.log('[api/generate] Uploading generated image to S3...');
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      
      // Convert base64 data URI to buffer
      const base64Data = generatedImageUrl.replace(/^data:image\/\w+;base64,/, "");
      const imgBuffer = Buffer.from(base64Data, 'base64');
      
      const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
      const bucketName = process.env.S3_BUCKET_NAME;
      
      if (!bucketName) {
        throw new Error('S3_BUCKET_NAME is not configured in .env.local');
      }

      const fileName = `generations/gen_${hashId}.jpg`;
      
      try {
        const s3Command = new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: imgBuffer,
          ContentType: 'image/jpeg',
          ACL: 'public-read' // Make it publicly accessible
        });
        
        await s3Client.send(s3Command);
        publicS3Url = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
        mark('s3-uploaded');
      } catch (s3Error: any) {
        console.error('S3 Upload Error, falling back to static bike card:', s3Error);
        generationStatus = 'failed';
      }
    }

    const performanceMeta = {
      textModel,
      textTokens: combinedUsage ? {
        prompt: combinedUsage.promptTokenCount,
        candidates: combinedUsage.candidatesTokenCount
      } : null,
      textCost,
      textApiKeyIndex: combinedUsedKeyIndex,
      imageModel,
      imageTokens: imageUsage ? {
        prompt: imageUsage.promptTokenCount,
        candidates: imageUsage.candidatesTokenCount
      } : null,
      imageCost,
      imageApiKeyIndex: imageUsedKeyIndex,
      totalCost,
      totalDurationMs: Date.now() - startedAt,
      checkpoints,
      error: null,
      optimizedPromptText
    };

    // Save to database
    console.log('[api/generate] Saving generation record to database with status:', generationStatus);
    await query(
      `UPDATE generations
       SET generated_image_url = ?,
           traits_summary = ?,
           status = ?,
           performance_meta = ?
       WHERE hash_id = ?`,
      [
        publicS3Url,
        personaCopy,
        generationStatus,
        JSON.stringify(performanceMeta),
        hashId,
      ]
    );
    mark('db-saved');
    
    if (generationStatus === 'completed') {
      try {
        const { updateStatsCache } = await import('@/lib/server/statsCache');
        const textTokensCount = (combinedUsage?.promptTokenCount || 0) + (combinedUsage?.candidatesTokenCount || 0);
        const imageTokensCount = (imageUsage?.promptTokenCount || 0) + (imageUsage?.candidatesTokenCount || 0);
        updateStatsCache(totalCost, Date.now() - startedAt, textTokensCount + imageTokensCount);
      } catch (cacheError) {
        console.error('Failed to update stats cache dynamically:', cacheError);
      }
    }

    reservedGeneration = false;

    // Clear the OTP session token so they must verify again to generate another image
    const cookieStoreForDelete = await cookies();
    cookieStoreForDelete.delete('user_token');
    mark('cookie-cleared');

    console.log('[api/generate] completed', {
      totalMs: Date.now() - startedAt,
      checkpoints,
      status: generationStatus,
    });

    return NextResponse.json({
      success: true,
      generationId: hashId,
      imageUrl: publicS3Url,
      personaCopy,
      status: generationStatus
    });

  } catch (error: any) {
    if (reservedGeneration && activeHashId) {
      try {
        const performanceMeta = {
          textModel,
          textTokens: combinedUsage ? {
            prompt: combinedUsage.promptTokenCount,
            candidates: combinedUsage.candidatesTokenCount
          } : null,
          textCost,
          textApiKeyIndex: combinedUsedKeyIndex,
          imageModel,
          imageTokens: imageUsage ? {
            prompt: imageUsage.promptTokenCount,
            candidates: imageUsage.candidatesTokenCount
          } : null,
          imageCost,
          imageApiKeyIndex: imageUsedKeyIndex,
          totalCost,
          totalDurationMs: Date.now() - startedAt,
          checkpoints,
          error: error.message || String(error),
          optimizedPromptText
        };

        await query(
          `UPDATE generations
           SET status = ?,
               performance_meta = ?
           WHERE hash_id = ?`,
          ['failed', JSON.stringify(performanceMeta), activeHashId]
        );
      } catch (updateError) {
        console.error('Failed to mark generation as failed:', updateError);
      }
    }

    console.error('Generate API error:', error);
    console.error('[api/generate] failed', {
      totalMs: Date.now() - startedAt,
      checkpoints,
      error: error.message,
    });
    
    // Provide granular error messages back to the user
    let errorMessage: string = messages.genericGenerationFailed;
    
    if (error.message) {
      const msg = error.message.toLowerCase();
      if (msg.includes('503') || msg.includes('overloaded')) {
        errorMessage = messages.aiOverloaded;
      } else if (msg.includes('safety') || msg.includes('blocked') || msg.includes('policy')) {
        errorMessage = messages.aiSafety;
      } else if (msg.includes('payload') || msg.includes('no image')) {
        errorMessage = messages.aiPayload;
      }
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
