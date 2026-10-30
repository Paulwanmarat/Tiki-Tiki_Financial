import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const router = express.Router();

router.post('/ask', async (req, res) => {
  try {
    const { messages, systemInstruction } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Valid messages array is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI service is currently unavailable. Please try again later.' });
    }

    // Convert messages to Gemini format (user vs model)
    const contents = messages
      .filter(msg => msg && typeof msg.content === 'string' && msg.content.trim().length > 0)
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content.trim() }]
      }));

    if (contents.length === 0) {
      return res.status(400).json({ error: 'At least one non-empty message is required' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    let replyText = '';
    let lastError: any = null;

    const candidateModels = [
      'gemini-flash-latest',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
    ];

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          ...(systemInstruction ? { systemInstruction } : {}),
        });
        const response = await model.generateContent({ contents });
        replyText = response.response.text();
        if (replyText) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini model ${modelName} failed:`, err?.message || err);
      }
    }

    if (!replyText && lastError) {
      throw lastError;
    }

    res.json({ reply: replyText || 'I could not generate a response. Please try again.' });
  } catch (error: any) {
    console.error('AI Proxy Error:', error?.message || error);
    res.status(500).json({ error: 'AI service is currently unavailable. Please try again later.' });
  }
});

export default router;
