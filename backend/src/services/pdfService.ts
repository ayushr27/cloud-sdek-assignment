import puppeteer from 'puppeteer';
import { marked } from 'marked';
import { IQuestionPaper } from '../models/Assignment';

function difficultyColor(d: string): string {
  if (d === 'easy') return '#22c55e';
  if (d === 'hard') return '#ef4444';
  return '#f59e0b';
}

function buildHtml(paper: IQuestionPaper, title: string): string {
  const sectionsHtml = paper.sections
    .map((section) => {
      const questionsHtml = section.questions
        .map((q, qi) => {
          const badgeColor = difficultyColor(q.difficulty);
          const optionsHtml =
            q.options && q.options.length > 0
              ? `<ol type="A" class="options">${q.options.map((opt) => `<li>${opt}</li>`).join('')}</ol>`
              : '';
          return `
          <div class="question">
            <div class="q-header">
              <span class="q-num">${qi + 1}.</span>
              <span class="q-text">${q.text}</span>
              <span class="q-meta">
                <span class="difficulty-badge" style="background:${badgeColor}20;color:${badgeColor};border:1px solid ${badgeColor}40">${q.difficulty}</span>
                <span class="marks">[${q.marks} mark${q.marks > 1 ? 's' : ''}]</span>
              </span>
            </div>
            ${optionsHtml}
          </div>`;
        })
        .join('');

      return `
      <div class="section">
        <h2 class="section-title">${section.title}</h2>
        <p class="section-instruction"><em>${section.instruction}</em></p>
        <div class="questions">${questionsHtml}</div>
      </div>`;
    })
    .join('<div class="section-divider"></div>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color: #111; background: #fff; padding: 40px; font-size: 12pt; line-height: 1.6; }
  .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
  .school-name { font-size: 20pt; font-weight: bold; }
  .sub-info { font-size: 13pt; margin-top: 4px; }
  .meta-row { display: flex; justify-content: space-between; margin: 16px 0; font-size: 11pt; }
  .instructions { border: 1px solid #444; padding: 10px 16px; margin-bottom: 20px; font-size: 11pt; }
  .student-info { margin-bottom: 24px; }
  .student-info p { margin: 6px 0; }
  .underline { display: inline-block; min-width: 160px; border-bottom: 1px solid #111; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 15pt; font-weight: bold; text-align: center; margin-bottom: 6px; }
  .section-instruction { font-size: 10pt; text-align: center; color: #555; margin-bottom: 14px; }
  .section-divider { border-top: 1px dashed #999; margin: 20px 0; }
  .question { margin-bottom: 16px; page-break-inside: avoid; }
  .q-header { display: flex; align-items: flex-start; gap: 8px; }
  .q-num { font-weight: bold; min-width: 24px; }
  .q-text { flex: 1; }
  .q-meta { display: flex; align-items: center; gap: 6px; white-space: nowrap; margin-left: 8px; }
  .difficulty-badge { padding: 2px 8px; border-radius: 12px; font-size: 8pt; font-weight: 600; text-transform: uppercase; }
  .marks { font-size: 10pt; color: #555; }
  .options { margin: 6px 0 0 32px; }
  .options li { margin: 3px 0; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="school-name">${paper.schoolName}</div>
  <div class="sub-info">Subject: ${paper.subject}</div>
  <div class="sub-info">Class: ${paper.className}</div>
</div>
<div class="meta-row">
  <span>Time Allowed: ${paper.timeAllowed}</span>
  <span>Maximum Marks: ${paper.totalMarks}</span>
</div>
<div class="instructions">
  All questions are compulsory unless stated otherwise.
</div>
<div class="student-info">
  <p>Name: <span class="underline">&nbsp;</span></p>
  <p>Roll Number: <span class="underline" style="min-width:120px">&nbsp;</span></p>
  <p>Section: <span class="underline" style="min-width:80px">&nbsp;</span></p>
</div>
${sectionsHtml}
</body>
</html>`;
}

export async function generatePDF(paper: IQuestionPaper, title: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(buildHtml(paper, title), { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function generateMarkdownPDF(markdownContent: string): Promise<Buffer> {
  const htmlContent = await marked.parse(markdownContent);
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color: #111; background: #fff; padding: 40px; font-size: 12pt; line-height: 1.6; }
  h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; font-weight: bold; }
  h1 { font-size: 20pt; text-align: center; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
  h2 { font-size: 16pt; }
  h3 { font-size: 14pt; }
  p { margin-bottom: 1em; }
  ul, ol { margin-bottom: 1em; padding-left: 2em; }
  li { margin-bottom: 0.5em; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
  th, td { border: 1px solid #444; padding: 8px; text-align: left; }
  th { background-color: #f4f4f4; font-weight: bold; }
  blockquote { border-left: 4px solid #ccc; padding-left: 1em; color: #555; margin-bottom: 1em; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
