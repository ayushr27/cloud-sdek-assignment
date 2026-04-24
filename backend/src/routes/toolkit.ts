import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Groq } from 'groq-sdk';
import { config } from '../config';
import { generateMarkdownPDF } from '../services/pdfService';

const router = Router();

router.post('/generate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { type, topic, grade, additionalInfo } = req.body;
    
    if (!type || !topic || !grade) {
      return res.status(400).json({ error: 'Type, topic, and grade are required' });
    }

    let prompt = '';

    if (type === 'lesson-plan') {
      prompt = `You are an expert teacher. Create a comprehensive lesson plan for grade ${grade} on the topic: "${topic}".${additionalInfo ? ` Additional context/info: "${additionalInfo}".` : ''} Include objectives, materials needed, introduction, main activity, assessment, and conclusion. Format using clean Markdown.`;
    } else if (type === 'rubric') {
      prompt = `You are an expert teacher. Create a detailed grading rubric for grade ${grade} for an assignment about: "${topic}".${additionalInfo ? ` Additional context/info: "${additionalInfo}".` : ''} Include criteria categories, and descriptions for excellent, good, fair, and poor performance. Format using a clean Markdown table.`;
    } else {
      return res.status(400).json({ error: 'Invalid generation type' });
    }

    let content = '';

    try {
      if (config.googleApiKey) {
        const genAI = new GoogleGenerativeAI(config.googleApiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        content = result.response.text();
      } else if (config.groqApiKey) {
        const groq = new Groq({ apiKey: config.groqApiKey });
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
        });
        content = completion.choices[0]?.message?.content || '';
      } else {
        return res.status(500).json({ error: 'No AI API keys configured' });
      }
    } catch (aiError: any) {
      // Fallback if Gemini fails but Groq is available
      if (config.googleApiKey && config.groqApiKey) {
        const groq = new Groq({ apiKey: config.groqApiKey });
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
        });
        content = completion.choices[0]?.message?.content || '';
      } else {
        throw aiError;
      }
    }

    return res.json({ content });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error generating content' });
  }
});

router.post('/pdf', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    const pdfBuffer = await generateMarkdownPDF(content);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="toolkit-content.pdf"');
    return res.status(200).send(pdfBuffer);
  } catch (err: any) {
    console.error('PDF Generation Error:', err);
    return res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

export default router;
