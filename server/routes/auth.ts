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

const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many registration attempts. Please try again later.' }
});

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { error: 'Too many login attempts. Please try again later.' }
});

router.post('/register', registerRateLimiter, async (req, res) => {
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

router.post('/login', loginRateLimiter, async (req, res) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// Google Authentication Routes
// ─────────────────────────────────────────────────────────────────────────────

async function handleGoogleUserPersistence(googleUser: {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}): Promise<{ token: string; user: any }> {
  const db = getDb();
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET missing');
  }

  const normalizedEmail = googleUser.email.toLowerCase().trim();

  const existing = await db.query(
    'SELECT id, email, username, email_verified, avatar_url, google_id FROM users WHERE google_id = $1 OR LOWER(email) = $2',
    [googleUser.sub, normalizedEmail]
  );

  let userRow: any;

  if (existing.rows.length > 0) {
    userRow = existing.rows[0];
    const updates: string[] = ['email_verified = true', '"updatedAt" = CURRENT_TIMESTAMP'];
    const params: any[] = [];
    let pIdx = 1;

    if (!userRow.google_id) {
      updates.push(`google_id = $${pIdx++}`);
      params.push(googleUser.sub);
    }
    if (!userRow.avatar_url && googleUser.picture) {
      updates.push(`avatar_url = $${pIdx++}`);
      params.push(googleUser.picture);
    }
    if (!userRow.username && googleUser.name) {
      const sanitizedUsername = googleUser.name.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
      if (sanitizedUsername.length >= 3) {
        const dup = await db.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2', [sanitizedUsername, userRow.id]);
        if (dup.rows.length === 0) {
          updates.push(`username = $${pIdx++}`);
          params.push(sanitizedUsername);
        }
      }
    }

    params.push(userRow.id);
    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING id, email, username, email_verified, avatar_url`;
    const updated = await db.query(updateQuery, params);
    userRow = updated.rows[0];
  } else {
    const id = crypto.randomUUID();
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    let initialUsername: string | null = null;
    if (googleUser.name) {
      const cleanName = googleUser.name.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
      if (cleanName.length >= 3) {
        const dup = await db.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [cleanName]);
        if (dup.rows.length === 0) {
          initialUsername = cleanName;
        }
      }
    }

    await db.query(
      `INSERT INTO users (id, email, "passwordHash", email_verified, username, avatar_url, google_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, normalizedEmail, passwordHash, true, initialUsername, googleUser.picture || null, googleUser.sub]
    );

    userRow = {
      id,
      email: normalizedEmail,
      email_verified: true,
      username: initialUsername,
      avatar_url: googleUser.picture || null,
    };
  }

  const token = jwt.sign({ id: userRow.id, email: userRow.email }, secret, { expiresIn: '7d' });
  return { token, user: userRow };
}

router.get('/google/config', (req, res) => {
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || null,
    configured: Boolean(process.env.GOOGLE_CLIENT_ID),
  });
});

router.get('/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({
      error: 'ServiceUnavailable',
      message: 'GOOGLE_CLIENT_ID is not configured on the server.',
    });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'https://spr-app.expo.app';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${frontendUrl}/auth-callback`;
  const state = crypto.randomBytes(16).toString('hex');

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('prompt', 'select_account');

  res.redirect(googleAuthUrl.toString());
});

router.get('/google/callback', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://spr-app.expo.app';
  try {
    const { code, error } = req.query;
    if (error || !code || typeof code !== 'string') {
      return res.redirect(`${frontendUrl}/(auth)/login?error=${encodeURIComponent(String(error || 'Authorization code missing'))}`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${frontendUrl}/auth-callback`;

    if (!clientId || !clientSecret) {
      return res.redirect(`${frontendUrl}/(auth)/login?error=${encodeURIComponent('Google credentials missing on server')}`);
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error('Failed to exchange code with Google:', errorText);
      return res.redirect(`${frontendUrl}/(auth)/login?error=${encodeURIComponent('Failed to exchange code with Google')}`);
    }

    const tokenData: any = await tokenRes.json();
    let googleUser: { sub: string; email: string; name?: string; picture?: string } | null = null;

    if (tokenData.id_token) {
      const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenData.id_token)}`);
      if (verifyRes.ok) {
        googleUser = await verifyRes.json() as any;
      }
    }

    if (!googleUser && tokenData.access_token) {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userRes.ok) {
        googleUser = await userRes.json() as any;
      }
    }

    if (!googleUser || !googleUser.email) {
      return res.redirect(`${frontendUrl}/(auth)/login?error=${encodeURIComponent('Failed to retrieve user profile from Google')}`);
    }

    const { token } = await handleGoogleUserPersistence(googleUser);
    res.redirect(`${frontendUrl}/auth-callback?token=${encodeURIComponent(token)}`);
  } catch (err: any) {
    console.error('Google Callback Error:', err);
    res.redirect(`${frontendUrl}/(auth)/login?error=${encodeURIComponent('Internal server error during Google login')}`);
  }
});

router.post('/google', async (req, res) => {
  try {
    const { credential, idToken, accessToken, code, isDevDemo, demoEmail, demoName } = req.body;

    let googleUser: {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    } | null = null;

    const tokenToVerify = credential || idToken;

    if (tokenToVerify) {
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`);
      if (!googleRes.ok) {
        return res.status(401).json({ error: 'Invalid Google ID token' });
      }
      const tokenInfo: any = await googleRes.json();

      const expectedClientId = process.env.GOOGLE_CLIENT_ID;
      if (expectedClientId && tokenInfo.aud !== expectedClientId) {
        return res.status(401).json({ error: 'Google token audience mismatch' });
      }

      if (!tokenInfo.email) {
        return res.status(400).json({ error: 'Google account does not have a verified email' });
      }

      googleUser = {
        sub: tokenInfo.sub,
        email: tokenInfo.email,
        name: tokenInfo.name,
        picture: tokenInfo.picture,
      };
    } else if (accessToken) {
      const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!googleRes.ok) {
        return res.status(401).json({ error: 'Invalid Google access token' });
      }
      const profile: any = await googleRes.json();
      googleUser = {
        sub: profile.sub,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      };
    } else if (code) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const frontendUrl = process.env.FRONTEND_URL || 'https://spr-app.expo.app';
      const redirectUri = req.body.redirect_uri || process.env.GOOGLE_REDIRECT_URI || `${frontendUrl}/auth-callback`;

      if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'Google OAuth client not configured on server' });
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        console.error('Failed to exchange code with Google:', errorText);
        return res.status(401).json({ error: 'Failed to exchange authorization code with Google' });
      }

      const tokenData: any = await tokenRes.json();
      if (tokenData.id_token) {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenData.id_token)}`);
        if (verifyRes.ok) {
          googleUser = await verifyRes.json() as any;
        }
      }
      if (!googleUser && tokenData.access_token) {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (userRes.ok) {
          googleUser = await userRes.json() as any;
        }
      }
    } else if (isDevDemo) {
      const email = demoEmail || 'demo.student@gmail.com';
      googleUser = {
        sub: 'google_demo_' + crypto.createHash('md5').update(email).digest('hex').substring(0, 16),
        email,
        name: demoName || 'Google Student',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      };
    } else {
      return res.status(400).json({ error: 'Google credential, idToken, or accessToken is required' });
    }

    if (!googleUser || !googleUser.email) {
      return res.status(400).json({ error: 'Unable to retrieve user info from Google' });
    }

    const { token, user } = await handleGoogleUserPersistence(googleUser);

    res.json({
      message: 'Google login successful',
      token,
      user,
    });
  } catch (error: any) {
    console.error('Google Auth Route Error:', error);
    res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
});

export default router;
