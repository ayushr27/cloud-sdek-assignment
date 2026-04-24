import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { upload } from '../utils/upload';
import { Resource } from '../models/Resource';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import fs from 'fs';
import path from 'path';

const router = Router();
const genAI = new GoogleGenerativeAI(config.googleApiKey || config.groqApiKey || ''); // User used groq as fallback for jwt

// Upload a resource file
router.post('/upload', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, subject, grade, chapter, aiSummarize } = req.body;
    let type: 'pdf' | 'image' | 'ppt' | 'other' = 'other';
    
    if (req.file.mimetype.includes('pdf')) type = 'pdf';
    else if (req.file.mimetype.includes('image')) type = 'image';
    else if (req.file.mimetype.includes('powerpoint') || req.file.mimetype.includes('presentation')) type = 'ppt';

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    // Optional AI summarisation for PDFs or text
    let aiSummary = '';
    if (aiSummarize === 'true' && type === 'pdf') {
      try {
        const prompt = `Please summarize the contents of this document broadly. Title: ${title}`;
        let summarySuccess = false;

        // Try Gemini if available
        if (config.googleApiKey) {
          try {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const fileContent = fs.readFileSync(req.file.path).toString("base64");
            const result = await model.generateContent([
              prompt,
              {
                inlineData: {
                  data: fileContent,
                  mimeType: 'application/pdf'
                }
              }
            ]);
            aiSummary = result.response.text();
            summarySuccess = true;
          } catch (geminiErr: any) {
            console.error('Gemini summarization failed:', geminiErr?.message);
          }
        }

        // Fallback to Groq + pdf-parse
        if (!summarySuccess && config.groqApiKey) {
          try {
            const pdfParse = require('pdf-parse');
            const dataBuffer = fs.readFileSync(req.file.path);
            const pdfData = await pdfParse(dataBuffer);
            
            // Limit text to avoid token limits
            const textContent = (pdfData.text || '').slice(0, 15000); 

            if (!textContent.trim()) {
              throw new Error("No extractable text found in PDF.");
            }

            const { Groq } = require('groq-sdk');
            const groq = new Groq({ apiKey: config.groqApiKey });
            const completion = await groq.chat.completions.create({
              messages: [
                { role: 'system', content: 'You are an expert summarizer. Provide a concise, broad summary.' },
                { role: 'user', content: `${prompt}\n\nDocument Text:\n${textContent}` }
              ],
              model: 'llama-3.3-70b-versatile',
            });
            
            aiSummary = completion.choices[0]?.message?.content || '';
          } catch (groqErr: any) {
            console.error('Groq summarization failed:', groqErr?.message);
            aiSummary = 'AI Summarization failed or not supported for this file.';
          }
        } else if (!summarySuccess) {
           aiSummary = 'AI Summarization failed or not supported for this file.';
        }
      } catch (err) {
        console.error('AI summarization failed, continuing without it', err);
        aiSummary = 'AI Summarization failed or not supported for this file.';
      }
    }

    const resource = await Resource.create({
      title,
      fileUrl,
      type,
      tags: { subject, grade, chapter },
      uploadedBy: req.user!.id,
      aiSummary
    });

    return res.status(201).json({ resource });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error uploading resource' });
  }
});

// Get all resources for the connected user
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const resources = await Resource.find({ uploadedBy: req.user!.id }).sort({ createdAt: -1 });
    return res.json({ resources });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error fetching resources' });
  }
});

// Delete a resource
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    if (resource.uploadedBy.toString() !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to delete this resource' });
    }

    // Delete the local file
    if (resource.fileUrl) {
      const filename = resource.fileUrl.split('/uploads/').pop();
      if (filename) {
        try {
          fs.unlinkSync(path.join(process.cwd(), 'uploads', filename));
        } catch (e) {
          console.error("Failed to delete local file:", e);
        }
      }
    }

    await Resource.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Resource deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
