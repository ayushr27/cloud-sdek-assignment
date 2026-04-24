import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testGemini() {
  try {
    console.log("Key:", process.env.GEMINI_API_KEY ? "EXISTS" : "MISSING");
    console.log("Key Length:", process.env.GEMINI_API_KEY?.length);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }, { apiVersion: 'v1beta' });
    const prompt = 'Hello, this is a test.';
    const result = await model.generateContent(prompt);
    console.log('Result:', result.response.text());
  } catch (err) {
    console.error('Gemini Error:', err);
  }
}
testGemini();
