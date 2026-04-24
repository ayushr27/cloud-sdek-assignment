import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Assignment } from '../models/Assignment';
import { Group } from '../models/Group';
import { User } from '../models/User';
import { getGenerationQueue } from '../queues/generationQueue';
import { runJobInProcess } from '../workers/generationWorker';
import { cache } from '../services/cacheService';
import { generatePDF } from '../services/pdfService';
import { upload } from '../utils/upload';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

const genAI = new GoogleGenerativeAI(config.googleApiKey || config.groqApiKey || '');
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/assignments
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = `assignments:list:${req.user?.id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const assignments = await Assignment.find({ user: req.user?.id })
      .select('-result')
      .sort({ createdAt: -1 });

    await cache.setex(cacheKey, 60, JSON.stringify(assignments));
    return res.json(assignments);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /api/assignments/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = `assignment:${req.params.id}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      const p = JSON.parse(cached);
      if (p.user !== req.user?.id) return res.status(403).json({ error: 'Forbidden' });
      return res.json(p);
    }

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    if (assignment.user.toString() !== req.user?.id) return res.status(403).json({ error: 'Forbidden' });

    if (assignment.status === 'done') {
      await cache.setex(cacheKey, 300, JSON.stringify(assignment));
    }
    return res.json(assignment);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// POST /api/assignments
const createValidators = [
  body('title').notEmpty().withMessage('Title is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('className').notEmpty().withMessage('Class is required'),
  body('chapters').isArray().withMessage('Chapters must be an array'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('questionTypes').isArray({ min: 1 }).withMessage('At least one question type is required'),
  body('questionTypes.*.type').notEmpty().withMessage('Question type name is required'),
  body('questionTypes.*.count').isInt({ min: 1 }).withMessage('Count must be at least 1'),
  body('questionTypes.*.marks').isInt({ min: 1 }).withMessage('Marks must be at least 1'),
];

// POST /api/assignments/extract-text
router.post('/extract-text', requireAuth, upload.array('files', 10), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    let combinedText = '';

    for (const file of files) {
      if (file.mimetype.includes('pdf')) {
        try {
          const pdfParse = require('pdf-parse');
          const dataBuffer = fs.readFileSync(file.path);
          const pdfData = await pdfParse(dataBuffer);
          combinedText += `\n--- Content from ${file.originalname} ---\n`;
          combinedText += (pdfData.text || '').slice(0, 50000);
        } catch (e: any) {
          console.error(`Failed to parse PDF ${file.originalname}:`, e.message);
        }
      } else if (file.mimetype.includes('image')) {
         if (config.googleApiKey) {
           try {
             const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
             const fileContent = fs.readFileSync(file.path).toString("base64");
             const result = await model.generateContent([
               "Extract all the helpful educational text from this image to use for generating a question paper.",
               { inlineData: { data: fileContent, mimeType: file.mimetype } }
             ]);
             combinedText += `\n--- Content from ${file.originalname} ---\n`;
             combinedText += result.response.text();
           } catch (e: any) {
             console.error(`Gemini image extract failed for ${file.originalname}:`, e.message);
           }
         }
      }

      // cleanup the file immediately
      try {
        fs.unlinkSync(file.path);
      } catch (e) {}
    }

    return res.json({ text: combinedText });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to extract text from files' });
  }
});

router.post('/', requireAuth, createValidators, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { title, subject, className, chapters, dueDate, questionTypes, additionalInstructions, groupId, fileContent } = req.body;

    const assignment = await Assignment.create({
      user: req.user?.id,
      title, subject, className, chapters, dueDate, questionTypes,
      additionalInstructions: additionalInstructions || '',
      status: 'pending',
    });

    // Link to group if a groupId was provided
    if (groupId) {
      await Group.findByIdAndUpdate(groupId, { $push: { assignments: assignment._id } }).catch((e) =>
        console.error('Failed to link assignment to group:', e)
      );
    }

    try {
      const queue = getGenerationQueue();
      await Promise.race([
        queue.add('generate', {
          userId: req.user?.id,
          assignmentId: assignment._id.toString(),
          title, subject, className, chapters, questionTypes,
          additionalInstructions: additionalInstructions || '',
          fileContent: fileContent || '',
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('BullMQ add timeout')), 3000))
      ]);
    } catch (err) {
      console.warn('BullMQ unavailable, falling back to in-process generation:', (err as Error).message);
      runJobInProcess({
        userId: req.user?.id || '',
        assignmentId: assignment._id.toString(),
        title, subject, className, chapters, questionTypes,
        additionalInstructions: additionalInstructions || '',
        fileContent: fileContent || '',
      });
    }

    await cache.del(`assignments:list:${req.user?.id}`);

    return res.status(201).json({
      assignmentId: assignment._id,
      message: 'Assignment created — generation started',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: msg });
  }
});

// POST /api/assignments/:id/regenerate
router.post('/:id/regenerate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    if (assignment.user.toString() !== req.user?.id) return res.status(403).json({ error: 'Forbidden' });

    // Reset status
    await Assignment.findByIdAndUpdate(req.params.id, {
      status: 'pending',
      result: null,
      markingScheme: null,
      errorMessage: null,
    });

    // Re-enqueue
    try {
      const queue = getGenerationQueue();
      await Promise.race([
        queue.add('generate', {
          userId: req.user?.id,
          assignmentId: assignment._id.toString(),
          title: assignment.title,
          subject: assignment.subject,
          className: assignment.className,
          chapters: assignment.chapters || [],
          questionTypes: assignment.questionTypes,
          additionalInstructions: assignment.additionalInstructions || '',
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('BullMQ add timeout')), 3000))
      ]);
    } catch (err) {
      console.warn('BullMQ unavailable for regenerate, falling back to in-process:', (err as Error).message);
      runJobInProcess({
        userId: req.user?.id || '',
        assignmentId: assignment._id.toString(),
        title: assignment.title,
        subject: assignment.subject,
        className: assignment.className,
        chapters: assignment.chapters || [],
        questionTypes: assignment.questionTypes,
        additionalInstructions: assignment.additionalInstructions || '',
      });
    }

    await cache.del(`assignment:${req.params.id}`);
    await cache.del(`assignments:list:${req.user?.id}`);

    return res.status(200).json({ message: 'Regeneration started', assignmentId: assignment._id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: msg });
  }
});

// DELETE /api/assignments/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    if (assignment.user.toString() !== req.user?.id) return res.status(403).json({ error: 'Forbidden' });
    
    await assignment.deleteOne();
    await cache.del(`assignment:${req.params.id}`);
    await cache.del(`assignments:list:${req.user?.id}`);
    return res.json({ message: 'Assignment deleted' });
  } catch {
    return res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// GET /api/assignments/:id/pdf
router.get('/:id/pdf', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    const profileUpdatedAt = user?.updatedAt ? new Date(user.updatedAt).getTime() : 0;
    const cacheKey = `pdf:${req.params.id}:${profileUpdatedAt}`;
    
    const cachedPdf = await cache.getBuffer(cacheKey);
    if (cachedPdf && cachedPdf.length > 100) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="paper-${req.params.id}.pdf"`);
      return res.send(cachedPdf);
    }

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    if (assignment.user.toString() !== req.user?.id) return res.status(403).json({ error: 'Forbidden' });
    if (assignment.status !== 'done' || !assignment.result) {
      return res.status(400).json({ error: 'Question paper not yet generated' });
    }

    const schoolParts = [];
    if (user?.school) schoolParts.push(user.school);
    if (user?.branch) schoolParts.push(user.branch);
    
    if (assignment.result) {
      assignment.result.schoolName = schoolParts.length > 0 ? schoolParts.join(', ') : 'Your School Name';
    }

    const pdfBuffer = await generatePDF(assignment.result, assignment.title);
    await cache.setex(cacheKey, 600, pdfBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${assignment.title.replace(/\s+/g, '-')}-paper.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: msg });
  }
});

export default router;
