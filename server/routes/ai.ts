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
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
    ];

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          ...(systemInstruction ? { systemInstruction } : {}),
        });
        const generatePromise = model.generateContent({ contents });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after 12s on model ${modelName}`)), 12000)
        );
        const response: any = await Promise.race([generatePromise, timeoutPromise]);
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
