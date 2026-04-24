import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

async function testUpload() {
  try {
    // 1. Register a dummy user to get auth token
    const email = `test${Date.now()}@example.com`;
    const regRes = await axios.post('http://localhost:4000/api/auth/register', {
      name: 'Test',
      email,
      password: 'password123',
    });
    const token = regRes.data.token;

    // 2. Upload PDF
    const form = new FormData();
    form.append('file', fs.createReadStream('uploads/1773993290773-478578323-chap2_slides.pdf'));
    form.append('title', 'Chapter 2 Slides');
    form.append('aiSummarize', 'true');

    const uploadRes = await axios.post('http://localhost:4000/api/resources/upload', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Upload Result:', uploadRes.data);
  } catch (err: any) {
    console.error('Error:', err.response?.data || err.message);
  }
}
testUpload();
