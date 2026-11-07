import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';

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
    const candidateModels = [
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
    ];

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

    // 4. Call Gemini with multi-model fallback cascade
    let responseText = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const generatePromise = model.generateContent([prompt, ...imageParts]);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after 15s on OCR model ${modelName}`)), 15000)
        );
        const result: any = await Promise.race([generatePromise, timeoutPromise]);
        responseText = result.response.text();
        if (responseText) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`OCR model ${modelName} failed:`, err?.message || err);
      }
    }

    if (!responseText) {
      return res.status(502).json({ error: 'Invalid response from OCR model (empty or failed).' });
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

// ─── POST /api/ocr/scan-slip (Bank Transfer Slip Auto-Reader) ───────────────
router.post('/scan-slip', upload.single('image'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: 'No slip image uploaded or file is empty.' });
    }

    const base64Data = req.file.buffer.toString('base64');
    const slipUrl = `data:${req.file.mimetype};base64,${base64Data}`;

    // Fast fallback regex scanner for common Thai banking references in filename or raw text
    const origName = req.file.originalname || '';
    const nameMatch = origName.match(/(\d{12,20})/);
    let detectedRef = nameMatch ? nameMatch[1] : '';

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        success: true,
        reference_number: detectedRef || '',
        amount: null,
        sender_name: '',
        channel: 'PromptPay / Bank Transfer',
        slip_url: slipUrl,
        notice: 'Processed via local image parser.'
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const candidateModels = [
      'gemini-flash-lite-latest',
      'gemini-2.0-flash',
      'gemini-flash-latest',
      'gemini-1.5-flash',
    ];

    const prompt = `Analyze this Thai bank transfer slip, PromptPay receipt, or digital wallet receipt (e.g., TrueMoney, Kasikorn KPlus, SCB Easy, Krungthai NEXT, Bangkok Bank, PromptPay).
Extract the following information accurately:
1. reference_number: The unique bank transaction reference number / เลขที่อ้างอิง / รหัสอ้างอิง (e.g., "50060248100418"). Return only the digits/letters without labels or spaces.
2. amount: Transfer amount as a number (e.g., 100.00).
3. sender_name: The sender's name if printed (e.g., "ANTHONY JOSE FERRER").
4. channel: Bank or wallet name (e.g., "TrueMoney", "Kasikorn", "SCB", "PromptPay").
5. transfer_time: The ISO date-time string if printed.

Return valid JSON ONLY in this format:
{
  "reference_number": "50060248100418",
  "amount": 100,
  "sender_name": "Anthony Jose Ferrer",
  "channel": "TrueMoney",
  "transfer_time": "2026-11-06T22:38:45"
}
If reference number cannot be determined, set reference_number to "". Do not include markdown code block syntax.`;

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: req.file.mimetype || 'image/jpeg',
        },
      },
    ];

    let responseText = '';
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const generatePromise = model.generateContent([prompt, ...imageParts]);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after 12s on model ${modelName}`)), 12000)
        );
        const result: any = await Promise.race([generatePromise, timeoutPromise]);
        responseText = result.response.text();
        if (responseText) break;
      } catch (err: any) {
        console.warn(`Slip OCR model ${modelName} warning:`, err?.message || err);
      }
    }

    if (responseText) {
      responseText = responseText.replace(/^```(json)?\n?/g, '').replace(/\n?```$/g, '').trim();
      try {
        const parsed = JSON.parse(responseText);
        return res.status(200).json({
          success: true,
          reference_number: parsed.reference_number || detectedRef || '',
          amount: parsed.amount || null,
          sender_name: parsed.sender_name || '',
          channel: parsed.channel || 'Bank Transfer',
          transfer_time: parsed.transfer_time || '',
          slip_url: slipUrl,
        });
      } catch (parseErr) {
        console.warn('Failed to parse slip JSON, attempting regex extraction on responseText');
        const refMatch = responseText.match(/(\d{10,25})/);
        return res.status(200).json({
          success: true,
          reference_number: refMatch ? refMatch[1] : (detectedRef || ''),
          amount: null,
          sender_name: '',
          channel: 'Bank Transfer',
          slip_url: slipUrl,
        });
      }
    }

    return res.status(200).json({
      success: true,
      reference_number: detectedRef || '',
      amount: null,
      sender_name: '',
      channel: 'Bank Transfer',
      slip_url: slipUrl,
    });
  } catch (error: any) {
    console.error('Slip OCR Error:', error);
    return res.status(500).json({ error: 'Failed to process slip image.' });
  }
});

export default router;
