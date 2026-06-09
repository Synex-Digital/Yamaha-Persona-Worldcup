# Gemini API Cost Calculation & Terminal Logging Reference

Future-use snippet to calculate token costs and print them dynamically.
You can copy-paste these blocks back into `src/app/api/generate/route.ts` when you want to monitor API billing again.

---

### STEP 1: Variable Declarations in `route.ts`
Place these variables right after:
`let generationStatus = 'completed';`

```typescript
    let textUsage: { promptTokenCount: number; candidatesTokenCount: number } | undefined;
    let imageUsage: { promptTokenCount: number; candidatesTokenCount: number } | undefined;
    let textUsedKeyIndex: number | undefined;
    let imageUsedKeyIndex: number | undefined;
```

---

### STEP 2: Capture usage metadata inside `route.ts` API generation blocks
Update the calls inside the try-catch blocks to capture the usage metadata and key indices:

#### 1. Text Appreciation statement block:
```typescript
    try {
      console.log('[api/generate] Generating premium appreciation statement...');
      const generatedResult = await generatePersonaCopy(personaSummary, bikeModel);
      if (generatedResult?.text) {
        personaCopy = generatedResult.text.trim();
      }
      if (generatedResult?.usage) {
        textUsage = generatedResult.usage;
      }
      if (generatedResult?.usedKeyIndex !== undefined) {
        textUsedKeyIndex = generatedResult.usedKeyIndex;
      }
    } catch (textError) {
      console.error('[api/generate] Persona text generation failed:', textError);
    }
```

#### 2. Image generation block:
```typescript
    try {
      console.log('[api/generate] Generating cinematic image...');
      const result = await generateCinematicImage(
        base64Image,
        mimeType,
        bikeRef?.base64 || null,
        bikeRef?.mimeType || null,
        finalPrompt
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
```

---

### STEP 3: Pricing Calculation & Console Log Block
Place this block right before S3 Upload or DB Save inside `route.ts`:

```typescript
    // Cost calculation & log output
    const textModel = process.env.AI_TEXT_MODEL || 'gemini-2.5-flash';
    const imageModel = process.env.AI_IMAGE_MODEL || 'gemini-3-pro-image';

    const getRates = (modelName: string) => {
      const normalized = modelName.toLowerCase();
      if (normalized.includes('gemini-3-pro-image')) {
        return { input: 2.00, output: 12.00 };
      }
      if (normalized.includes('gemini-3.1-flash-image') || normalized.includes('gemini-3.1-flash')) {
        return { input: 0.50, output: 3.00 };
      }
      // Default to gemini-2.5-flash rates
      return { input: 0.30, output: 2.50 };
    };

    const textRates = getRates(textModel);
    const imageRates = getRates(imageModel);

    let textCost = 0;
    let imageCost = 0;

    if (textUsage) {
      const inputCost = (textUsage.promptTokenCount / 1_000_000) * textRates.input;
      const outputCost = (textUsage.candidatesTokenCount / 1_000_000) * textRates.output;
      textCost = inputCost + outputCost;
    }

    if (imageUsage) {
      const inputCost = (imageUsage.promptTokenCount / 1_000_000) * imageRates.input;
      const outputCost = (imageUsage.candidatesTokenCount / 1_000_000) * imageRates.output;
      imageCost = inputCost + outputCost;
    }

    const totalCost = textCost + imageCost;

    console.log('\n' + '='.repeat(60));
    console.log('              GEMINI API COST BREAKDOWN');
    console.log('='.repeat(60));
    console.log(`Text Model: ${textModel}${textUsedKeyIndex !== undefined ? ` (API Key Index: ${textUsedKeyIndex})` : ''}`);
    if (textUsage) {
      console.log(`  - Input Tokens:  ${textUsage.promptTokenCount.toLocaleString()} (Cost: $${((textUsage.promptTokenCount / 1_000_000) * textRates.input).toFixed(8)})`);
      console.log(`  - Output Tokens: ${textUsage.candidatesTokenCount.toLocaleString()} (Cost: $${((textUsage.candidatesTokenCount / 1_000_000) * textRates.output).toFixed(8)})`);
      console.log(`  - Subtotal Cost: $${textCost.toFixed(8)}`);
    } else {
      console.log('  - Usage stats not available');
    }
    console.log('-'.repeat(60));
    console.log(`Image Model: ${imageModel}${imageUsedKeyIndex !== undefined ? ` (API Key Index: ${imageUsedKeyIndex})` : ''}`);
    if (imageUsage) {
      console.log(`  - Input Tokens:  ${imageUsage.promptTokenCount.toLocaleString()} (Cost: $${((imageUsage.promptTokenCount / 1_000_000) * imageRates.input).toFixed(8)})`);
      console.log(`  - Output Tokens: ${imageUsage.candidatesTokenCount.toLocaleString()} (Cost: $${((imageUsage.candidatesTokenCount / 1_000_000) * imageRates.output).toFixed(8)})`);
      console.log(`  - Subtotal Cost: $${imageCost.toFixed(8)}`);
    } else {
      console.log('  - Usage stats not available');
    }
    console.log('-'.repeat(60));
    console.log('TOTAL COMBINED STATS:');
    if (textUsage || imageUsage) {
      const totalInput = (textUsage?.promptTokenCount || 0) + (imageUsage?.promptTokenCount || 0);
      const totalOutput = (textUsage?.candidatesTokenCount || 0) + (imageUsage?.candidatesTokenCount || 0);
      console.log(`  - Total Input Tokens:  ${totalInput.toLocaleString()}`);
      console.log(`  - Total Output Tokens: ${totalOutput.toLocaleString()}`);
      console.log(`  - Combined Total Cost: $${totalCost.toFixed(8)}`);
    } else {
      console.log('  - No usage stats available');
    }
    console.log('='.repeat(60) + '\n');
```
