import { Assignment } from '../models/Assignment';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { generatePaper, ModelExhaustedError } from '../lib/modelRouter';

import { PromptInput } from '../lib/promptBuilder';
import { GenerationJobData } from '../queues/generationQueue';
import { emitToUser } from '../utils/websocket';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

const genAI = new GoogleGenerativeAI(config.googleApiKey || config.groqApiKey || '');

/**
 * Runs a generation job in-process — used when Redis/BullMQ is not available.
 * This runs asynchronously using setImmediate so the HTTP response returns first.
 */
export function runJobInProcess(data: GenerationJobData, jobId: string = 'local-job'): void {
  setImmediate(async () => {
    const { assignmentId, userId, title, subject, className, chapters, questionTypes, additionalInstructions, fileContent } = data;

    try {
      emitToUser(userId, 'job:queued', { jobId, assignmentId });
      await Assignment.findByIdAndUpdate(assignmentId, { status: 'generating' });

      const promptInput: PromptInput = {
        title, subject, className, chapters, questionTypes, additionalInstructions, pdfText: fileContent
      };

      const paper = await generatePaper(promptInput, (msg) => {
        emitToUser(userId, 'job:progress', { jobId, stage: msg, model: 'Router' });
      });

      // Use user-specified time if provided in additional instructions, else calculate from marks
      const timeMatch = (additionalInstructions || '').match(/Time Allowed:\s*([^\n.]+)/i);
      const totalMarks = questionTypes.reduce((sum, qt) => sum + (qt.count * qt.marks), 0);
      const timeAllowed = timeMatch
        ? timeMatch[1].trim()
        : (totalMarks > 50 ? '3 Hours' : (totalMarks > 25 ? '2 Hours' : '1 Hour'));
      
      const user = await User.findById(userId);
      const schoolParts = [];
      if (user?.school) schoolParts.push(user.school);
      if (user?.branch) schoolParts.push(user.branch);
      const schoolName = schoolParts.length > 0 ? schoolParts.join(', ') : 'Your School Name';

      const fullResult = {
        schoolName,
        subject,
        className,
        timeAllowed,
        totalMarks,
        sections: paper.sections,
      };

      emitToUser(userId, 'job:progress', { jobId, stage: 'Generating Marking Scheme...', model: 'Groq' });
      const groq = new (require('groq-sdk').Groq)({ apiKey: config.groqApiKey || '' });
      const msPrompt = `Create a detailed marking scheme in markdown format with correct answers and marking breakdown for this question paper JSON:\n\n${JSON.stringify(paper.sections, null, 2)}`;
      let markingScheme = '';
      try {
         const msResult = await groq.chat.completions.create({
           messages: [{ role: 'user', content: msPrompt }],
           model: 'llama-3.3-70b-versatile',
         });
         markingScheme = msResult.choices[0]?.message?.content || '';
      } catch (e: any) {
         console.warn('Could not generate marking scheme:', e.message);
      }

      await Assignment.findByIdAndUpdate(assignmentId, {
        status: 'done',
        result: fullResult,
        markingScheme 
      });

      const notif = await Notification.create({
        user: userId,
        type: 'generation',
        message: `Your assignment "${title}" has been successfully generated!`,
        link: `/assignments/${assignmentId}`
      });

      emitToUser(userId, 'job:complete', { jobId, paperId: assignmentId, cached: false });
      emitToUser(userId, 'notification', notif);
      console.log(`✅ Job completed for assignment ${assignmentId}`);
    } catch (err) {
      let msg = err instanceof Error ? err.message : 'Unknown error';
      if (err instanceof ModelExhaustedError) {
        msg = 'All AI models are temporarily exhausted. Please try again later.';
      }
      
      await Assignment.findByIdAndUpdate(assignmentId, {
        status: 'error',
        errorMessage: msg,
      });
      
      const notif = await Notification.create({
        user: userId,
        type: 'system',
        message: `Generation failed for "${title}": ${msg}`
      });

      emitToUser(userId, 'job:failed', { jobId, reason: msg });
      emitToUser(userId, 'notification', notif);
      console.error(`❌ Job failed for assignment ${assignmentId}:`, msg);
    }
  });
}

/**
 * Creates a BullMQ worker — only called when Redis IS available.
 * Dynamically imported to avoid crashing on import when Redis is down.
 */
export async function maybeStartBullMQWorker(redisConnection: import('ioredis').default): Promise<void> {
  try {
    const { Worker } = await import('bullmq');

    const worker = new Worker<GenerationJobData>(
      'question-generation',
      async (job) => {
        runJobInProcess(job.data, job.id);
        return { success: true };
      },
      { connection: redisConnection as any, concurrency: 3 }
    );

    worker.on('completed', (j) => console.log(`✅ BullMQ job ${j.id} completed`));
    worker.on('failed', (j, err) => console.error(`❌ BullMQ job ${j?.id} failed:`, err.message));
    console.log('✅ BullMQ worker started');
  } catch (err) {
    console.warn('⚠️  Could not start BullMQ worker:', err);
  }
}
