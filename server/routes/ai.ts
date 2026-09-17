import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

router.post('/ask', async (req, res) => {
  try {
    const { messages, systemInstruction } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Convert messages to Gemini format (user vs model)
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    }));

    if (systemInstruction) {
      // Create a specific model instance if system instruction is provided
      const instModel = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash-latest',
        systemInstruction: systemInstruction 
      });
      
      const response = await instModel.generateContent({ contents });
      const replyText = response.response.text() || 'I could not generate a response. Please try again.';
      res.json({ reply: replyText });
    } else {
      const response = await model.generateContent({ contents });
      const replyText = response.response.text() || 'I could not generate a response. Please try again.';
      res.json({ reply: replyText });
    }
  } catch (error: any) {
    console.error('AI Proxy Error:', error);
    res.status(500).json({ error: 'AI service is currently unavailable. Please try again later.' });
  }
});

export default router;
