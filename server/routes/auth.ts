import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDb } from '../services/db';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Augment Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

// Middleware to protect routes
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('JWT_SECRET is missing from environment variables');
    return res.status(500).json({ error: 'Internal Server Error', message: 'Server configuration error' });
  }

  try {
    const payload = jwt.verify(token, secret) as { id: string; email: string };
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
};

const resendRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 resend requests per windowMs
  message: { error: 'Too many verification requests, please try again later.' }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const db = getDb();
    
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is missing');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      'INSERT INTO users (id, email, "passwordHash", "email_verified", "verification_token_hash", "verification_token_expires_at") VALUES ($1, $2, $3, $4, $5, $6)',
      [id, email, passwordHash, false, verificationTokenHash, expiresAt]
    );

    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (err) {
      console.error('Failed to send verification email during registration:', err);
    }

    const token = jwt.sign({ id, email }, secret, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id, email, email_verified: false, username: null, avatar_url: null }
    });
  } catch (error: any) {
    console.error('Register Error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is missing');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, email_verified: user.email_verified || false, username: user.username, avatar_url: user.avatar_url }
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    const db = getDb();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await db.query(
      'SELECT id, email_verified, verification_token_expires_at FROM users WHERE verification_token_hash = $1',
      [tokenHash]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    if (user.email_verified) {
      return res.status(200).json({ message: 'Email is already verified' });
    }

    if (new Date() > new Date(user.verification_token_expires_at)) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    await db.query(
      'UPDATE users SET email_verified = true, verification_token_hash = NULL, verification_token_expires_at = NULL WHERE id = $1',
      [user.id]
    );

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify Email Error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

router.post('/resend-verification', resendRateLimiter, requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDb();
    const result = await db.query('SELECT email, email_verified FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      'UPDATE users SET verification_token_hash = $1, verification_token_expires_at = $2 WHERE id = $3',
      [verificationTokenHash, expiresAt, userId]
    );

    await sendVerificationEmail(user.email, verificationToken);

    res.json({ message: 'Verification email resent successfully' });
  } catch (error) {
    console.error('Resend Verification Error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const db = getDb();
    const result = await db.query('SELECT id, email, email_verified, username, avatar_url FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { message: 'If an account exists for this email, a password reset email has been sent.' }
});

router.post('/forgot-password', forgotPasswordRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(200).json({ message: 'If an account exists for this email, a password reset email has been sent.' });
    }

    const db = getDb();
    const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(200).json({ message: 'If an account exists for this email, a password reset email has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      'UPDATE users SET password_reset_token_hash = $1, password_reset_token_expires_at = $2 WHERE id = $3',
      [resetTokenHash, expiresAt, user.id]
    );

    // Send email asynchronously so we don't block the response
    sendPasswordResetEmail(email, resetToken).catch(err => {
      console.error('Failed to send password reset email asynchronously:', err);
    });

    res.status(200).json({ message: 'If an account exists for this email, a password reset email has been sent.' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

const resetPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts, please try again later.' }
});

router.post('/reset-password', resetPasswordRateLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const db = getDb();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await db.query(
      'SELECT id, password_reset_token_expires_at FROM users WHERE password_reset_token_hash = $1',
      [tokenHash]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    if (new Date() > new Date(user.password_reset_token_expires_at)) {
      return res.status(400).json({ error: 'Password reset token has expired' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(
      'UPDATE users SET "passwordHash" = $1, password_reset_token_hash = NULL, password_reset_token_expires_at = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    res.json({ message: 'Password has been successfully reset' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
