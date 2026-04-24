import Groq from 'groq-sdk';
import { config } from '../config';
import { IQuestionPaper, IQuestionType } from '../models/Assignment';

const groq = new Groq({ apiKey: config.groqApiKey });

export interface GenerationInput {
  title: string;
  subject: string;
  className: string;
  chapters: string[];
  questionTypes: IQuestionType[];
  additionalInstructions: string;
  fileContent?: string;
}

function buildPrompt(input: GenerationInput): string {
  const sections = input.questionTypes.map((qt, idx) => {
    const section = String.fromCharCode(65 + idx); // A, B, C...
    return `Section ${section}: ${qt.count} ${qt.type} questions, each worth ${qt.marks} mark(s)`;
  });

  const totalQuestions = input.questionTypes.reduce((s, qt) => s + qt.count, 0);
  const totalMarks = input.questionTypes.reduce((s, qt) => s + qt.count * qt.marks, 0);

  return `You are an expert teacher creating a formal exam question paper.

Create a complete question paper with these specifications:
- Subject: ${input.subject}
- Class: ${input.className}
- Title: ${input.title}
- Chapters / Syllabus Topics: ${input.chapters.length > 0 ? input.chapters.join(', ') : 'All chapters'}
- Total Questions: ${totalQuestions}
- Total Marks: ${totalMarks}
- Sections: ${sections.join('; ')}
${input.additionalInstructions ? `- Additional Instructions: ${input.additionalInstructions}` : ''}
${input.fileContent ? `- Reference Material:\n${input.fileContent}` : ''}

Rules:
1. Generate EXACTLY the specified number of questions per section.
2. Assign difficulty: roughly 40% easy, 40% medium, 20% hard.
3. For MCQ sections, provide 4 options (A, B, C, D) and mark the correct answer.
4. Questions must be relevant, clear, and educationally appropriate.
5. Return ONLY valid JSON — no markdown, no explanation.

JSON format:
{
  "schoolName": "Delhi Public School",
  "subject": "${input.subject}",
  "className": "${input.className}",
  "timeAllowed": "3 hours",
  "totalMarks": ${totalMarks},
  "sections": [
    {
      "title": "Section A",
      "instruction": "Attempt all questions. Each question carries X marks.",
      "questions": [
        {
          "text": "Question text here?",
          "difficulty": "easy",
          "marks": 1,
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": "Option A"
        }
      ]
    }
  ]
}`;
}

function validateAndParsePaper(raw: string): IQuestionPaper {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
  
  let parsed: IQuestionPaper;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object from the response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No valid JSON found in AI response');
    parsed = JSON.parse(match[0]);
  }

  // Validate structure
  if (!parsed.sections || !Array.isArray(parsed.sections)) {
    throw new Error('Invalid response: missing sections array');
  }

  for (const section of parsed.sections) {
    if (!section.questions || !Array.isArray(section.questions)) {
      throw new Error(`Invalid section: missing questions in ${section.title}`);
    }
    for (const q of section.questions) {
      if (!q.text || !q.difficulty || !q.marks) {
        throw new Error('Invalid question: missing required fields');
      }
      // Normalize difficulty
      q.difficulty = q.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard';
      if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
        q.difficulty = 'medium';
      }
    }
  }

  return parsed;
}

export async function generateQuestionPaper(
  input: GenerationInput,
  onProgress?: (progress: number) => void
): Promise<IQuestionPaper> {
  onProgress?.(10);

  const prompt = buildPrompt(input);
  onProgress?.(20);

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are an expert educator who creates well-structured, pedagogically sound exam papers. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  });

  onProgress?.(75);

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from AI');

  onProgress?.(85);

  const paper = validateAndParsePaper(content);
  onProgress?.(100);

  return paper;
}
