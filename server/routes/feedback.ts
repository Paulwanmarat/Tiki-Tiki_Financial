import express from 'express';
import { getDb } from '../services/db';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Middleware to optionally get user if token exists
const optionalAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (secret) {
      try {
        const payload = jwt.verify(token, secret) as { id: string; email: string };
        req.user = payload;
      } catch (error) {
        // Just ignore invalid token for optional auth, user remains undefined
      }
    }
  }
  next();
};

const feedbackRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 feedback submissions per hour
  message: { error: 'Too many feedback submissions, please try again later.' }
});

router.post('/', feedbackRateLimiter, optionalAuth, async (req, res) => {
  try {
    const { type, message, rating, platform, app_version, contact_email } = req.body;

    // Validate input
    if (!type || !message) {
      return res.status(400).json({ error: 'Type and message are required' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message is too long (max 2000 characters)' });
    }

    if (rating !== undefined && rating !== null) {
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
      }
    }

    if (contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
      return res.status(400).json({ error: 'Invalid contact email format' });
    }

    // Authenticated user ID (never trust body.user_id)
    const userId = req.user?.id || null;

    const db = getDb();
    const id = crypto.randomUUID();

    await db.query(
      `INSERT INTO feedback (id, user_id, type, message, rating, platform, app_version, contact_email) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, userId, type, message.trim(), rating, platform || 'unknown', app_version || 'unknown', contact_email || null]
    );

    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Feedback Submission Error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

export default router;
