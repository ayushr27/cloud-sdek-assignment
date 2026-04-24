import { generatePDF } from './src/services/pdfService';

async function run() {
  try {
    console.log('Starting puppeteer tests...');
    const result = await generatePDF({
      schoolName: 'Test School',
      subject: 'Math',
      className: '10',
      timeAllowed: '1 Hour',
      totalMarks: 10,
      sections: [{ title: 'Section A', instruction: 'Answer all', questions: [{text: '1+1?', difficulty: 'easy', marks: 1}] }]
    } as any, 'test');
    console.log('Success!', result.length);
    process.exit(0);
  } catch (err) {
    console.error('Puppeteer Failed:', err);
    process.exit(1);
  }
}

run();
