import { GoogleGenerativeAI } from '@google/generative-ai';
import { Groq } from 'groq-sdk';
import { quotaTracker, ModelName } from './quotaTracker';
import { buildPrompt, questionPaperSchema, PromptInput, QuestionPaperType } from './promptBuilder';
import { config } from '../config';

const genAI = new GoogleGenerativeAI(config.googleApiKey || process.env.GEMINI_API_KEY || '');
const groq = new Groq({ apiKey: config.groqApiKey || process.env.GROQ_API_KEY || '' });

export class ModelExhaustedError extends Error {
  constructor() {
    super('All AI models are exhausted or on cooldown.');
    this.name = 'ModelExhaustedError';
  }
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function getModelsForTask(job: PromptInput): ModelName[] {
  const hasComplex = job.questionTypes.some(q => 
    !q.type.toLowerCase().includes('multiple choice') && 
    !q.type.toLowerCase().includes('short') &&
    !q.type.toLowerCase().includes('blanks') &&
    !q.type.toLowerCase().includes('true')
  );
  
  const requiresFlash = hasComplex || !!job.pdfText;
  
  if (requiresFlash) {
    return ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'groq-llama-3.3-70b'];
  }
  return ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'groq-llama-3.3-70b'];
}

async function executeWithRetry(
  modelName: ModelName, 
  system: string, 
  user: string
): Promise<string> {
  const delays = [2000, 4000];
  let attempt = 0;
  
  while (true) {
    try {
      if (modelName.startsWith('gemini')) {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: system,
          generationConfig: { responseMimeType: 'application/json' }
        });
        const result = await model.generateContent(user);
        return result.response.text();
      } else {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' }
        });
        return completion.choices[0]?.message?.content || '{}';
      }
    } catch (error: any) {
      const status = error.status || error.response?.status;
      // 429 = Rate Limit. Let router handle model fallback
      if (status === 429) {
        throw error; 
      }
      // 5xx = Server Error. Retry twice with backoff.
      if (status >= 500 && status < 600 && attempt < delays.length) {
        await delay(delays[attempt]);
        attempt++;
        continue;
      }
      throw error;
    }
  }
}

export async function generatePaper(job: PromptInput, onProgress?: (msg: string) => void): Promise<QuestionPaperType> {
  const models = getModelsForTask(job);
  const { system, user } = buildPrompt(job);

  for (const model of models) {
    const canUse = await quotaTracker.canUse(model);
    if (!canUse) {
      onProgress?.(`Model ${model} is on cooldown or quota exceeded. Skipping...`);
      continue;
    }

    try {
      onProgress?.(`Attempting generation with ${model}...`);
      const rawResponse = await executeWithRetry(model, system, user);
      
      // Parse & Validate -- Strip any markdown blocks if the model hallucinates them
      const cleanedResponse = rawResponse.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleanedResponse);
      const validated = questionPaperSchema.parse(parsed);

      // Increment Quota on Success
      await quotaTracker.increment(model);
      return validated;

    } catch (error: any) {
      const status = error.status || error.response?.status;
      if (status === 429) {
        onProgress?.(`Model ${model} rate limited (429). Setting 60s cooldown.`);
        await quotaTracker.setCooldown(model, 60);
      } else {
        console.error(`Error with model ${model}:`, error);
        onProgress?.(`Model ${model} failed: ${error.message}`);
      }
      // Continue to next model in the priority array
    }
  }

  throw new ModelExhaustedError();
}
