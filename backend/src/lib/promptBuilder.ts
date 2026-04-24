import { z } from 'zod';

export interface PromptInput {
  title: string;
  subject: string;
  className: string;
  chapters: string[];
  questionTypes: {
    type: string;
    count: number;
    marks: number;
  }[];
  additionalInstructions: string;
  pdfText?: string;
}

export const questionPaperSchema = z.object({
  sections: z.array(z.object({
    title: z.string(),
    instruction: z.string(),
    questions: z.array(z.object({
      id: z.string(),
      text: z.string(),
      type: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      marks: z.number(),
      options: z.array(z.string()).optional()
    }))
  }))
});

export type QuestionPaperType = z.infer<typeof questionPaperSchema>;

export function buildPrompt(assignment: PromptInput): { system: string; user: string } {
  const system = `You are an expert curriculum designer and teacher for the Indian school curriculum (CBSE/ICSE).
Your task is to generate a comprehensive question paper that STRICTLY follows the requested format.

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON matching the exact schema provided. DO NOT wrap the output in markdown code blocks (e.g., no \`\`\`json at the start or \`\`\` at the end).
2. The output MUST begin perfectly with \`{\` and end perfectly with \`}\`. No extra text before or after the JSON.
3. Ensure the question difficulty is distributed approximately as: 40% easy, 40% medium, 20% hard.
4. Group questions logically into sections. For example: Section A (MCQs), Section B (Short Answer), Section C (Long/Numerical/Diagrams).
5. Every question MUST have an 'id', 'text', 'type', 'difficulty', and 'marks'. 
6. If the type is 'Multiple Choice Questions' or similar, you MUST provide an array of 'options'.

JSON Schema Structure:
{
  "sections": [
    {
      "title": "string",
      "instruction": "string",
      "questions": [
        {
          "id": "string",
          "text": "string",
          "type": "string",
          "difficulty": "easy" | "medium" | "hard",
          "marks": number,
          "options": ["string"]
        }
      ]
    }
  ]
}`;

  let user = `Generate a Question Paper for:
Subject: ${assignment.subject}
Class/Grade: ${assignment.className}
Topic/Chapters: ${assignment.chapters.length ? assignment.chapters.join(', ') : 'Whole Syllabus'}

Required Question Types and Counts:
${assignment.questionTypes.map(qt => `- ${qt.type}: ${qt.count} questions, ${qt.marks} marks each.`).join('\n')}

Additional Teacher Instructions: 
${assignment.additionalInstructions || 'None'}
`;

  if (assignment.pdfText) {
    user += `\nBase your questions heavily on the following source content:\n${assignment.pdfText}\n`;
  }

  return { system, user };
}
