import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
// Set limits for image upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Supported mime types by Gemini
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// Types
export interface MenuItem {
  id: string;
  name: string;
  price: number;
}

router.post('/scan', upload.single('image'), async (req, res) => {
  try {
    // 1. Validate GEMINI_API_KEY
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ 
        error: 'Service Unavailable',
        message: 'OCR service is not configured (GEMINI_API_KEY missing).' 
      });
    }

    // 2. Validate Image Upload
    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: 'No image uploaded or file is empty.' });
    }

    if (!SUPPORTED_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(415).json({ 
        error: 'Unsupported Media Type',
        message: `Image format ${req.file.mimetype} is not supported.` 
      });
    }

    // 3. Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `Extract all food and drink items that are actually visible in this menu image.

For each recognizable item return:
- name
- price

Rules:
- Return only items actually visible in the image.
- Do not invent items.
- Do not invent prices.
- Do not guess unreadable prices.
- Ignore restaurant branding.
- Ignore addresses.
- Ignore phone numbers.
- Ignore decorative text.
- Ignore unrelated text.
- Extract only actual menu items.

Return JSON only in the following format:
[
  {
    "name": "Food item",
    "price": 120
  }
]`;

    const imageParts = [
      {
        inlineData: {
          data: req.file.buffer.toString('base64'),
          mimeType: req.file.mimetype
        }
      }
    ];

    // 4. Call Gemini
    const result = await model.generateContent([prompt, ...imageParts]);
    let responseText = result.response.text();

    if (!responseText) {
      return res.status(502).json({ error: 'Invalid response from OCR model (empty).' });
    }

    // Safely strip markdown code fences if present
    responseText = responseText.replace(/^```(json)?\n?/g, '').replace(/\n?```$/g, '').trim();

    // 5. Parse and Validate JSON
    let parsedItems: any;
    try {
      parsedItems = JSON.parse(responseText);
    } catch (e) {
      console.error('OCR JSON Parse Error:', e, 'Raw Response:', responseText);
      return res.status(502).json({ error: 'Invalid structured output from OCR model.' });
    }

    if (!Array.isArray(parsedItems)) {
      return res.status(502).json({ error: 'OCR model did not return a JSON array.' });
    }

    // Validate items and generate IDs
    const validatedItems: MenuItem[] = [];
    
    for (const item of parsedItems) {
      if (
        typeof item === 'object' &&
        item !== null &&
        typeof item.name === 'string' &&
        item.name.trim().length > 0 &&
        typeof item.price === 'number' &&
        Number.isFinite(item.price) &&
        item.price >= 0
      ) {
        validatedItems.push({
          id: crypto.randomUUID(),
          name: item.name.trim(),
          price: item.price
        });
      }
    }

    // 6. Return response
    // If it found nothing, it legitimately returns 200 with an empty array
    return res.status(200).json({ items: validatedItems });

  } catch (error: any) {
    console.error('OCR Processing Error:', error);
    // Do not expose internal stack traces
    return res.status(500).json({ error: 'Unexpected server error while processing image.' });
  }
});

export default router;
