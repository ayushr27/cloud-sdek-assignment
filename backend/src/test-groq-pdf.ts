import fs from 'fs';
import { Groq } from 'groq-sdk';
import { config } from './config';
import pdfParse from 'pdf-parse';

async function testGroqSummary() {
  try {
    const dataBuffer = fs.readFileSync('test.pdf');
    console.log('PDF Read length:', dataBuffer.length);
    
    const pdfData = await pdfParse(dataBuffer);
    console.log('PDF parsed text length:', pdfData.text.length);
    const textContent = pdfData.text.slice(0, 15000); 

    const groq = new Groq({ apiKey: config.groqApiKey });
    const prompt = `Please summarize the contents of this document broadly. Title: Test PDF`;
    
    console.log('Calling Groq...');
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert summarizer. Provide a concise, broad summary.' },
        { role: 'user', content: `${prompt}\n\nDocument Text:\n${textContent}` }
      ],
      model: 'llama-3.3-70b-versatile',
    });
    
    console.log('Summary:', completion.choices[0]?.message?.content);
  } catch (err: any) {
    console.error('Error:', err.message || err);
  }
}

testGroqSummary();
