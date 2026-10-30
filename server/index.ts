import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import aiRoutes from './routes/ai';
import ocrRoutes from './routes/ocr';
import authRoutes, { requireAuth } from './routes/auth';
import transactionsRoutes from './routes/transactions';
import goalsRoutes from './routes/goals';
import settingsRoutes from './routes/settings';
import historyRoutes from './routes/history';
import feedbackRoutes from './routes/feedback';
import profileRoutes from './routes/profile';
import { initDb } from './services/db';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables before proceeding
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'GEMINI_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL ERROR: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to prevent breaking Expo Web assets/API behavior
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Allowed origins setup
const rawEnvOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOriginsSet = new Set<string>([
  'https://spr-app.expo.app',
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:19006',
  'http://127.0.0.1:3000',
  ...rawEnvOrigins,
]);

export const isOriginAllowed = (origin: string): boolean => {
  // Allow all origins in non-production environments
  if (process.env.NODE_ENV !== 'production') return true;

  // Allow explicitly listed origins
  if (allowedOriginsSet.has(origin)) return true;

  // Allow any Expo deployment or preview subdomain (e.g. https://spr-app.expo.app, https://spr-app--*.expo.app)
  if (/^https:\/\/([a-zA-Z0-9-]+\.)*expo\.app$/.test(origin)) return true;

  // Allow local development ports
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;

  // Allow Render internal / preview domains if any
  if (/^https:\/\/([a-zA-Z0-9-]+\.)*onrender\.com$/.test(origin)) return true;

  return false;
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. native mobile apps, curl) with no origin header
    if (!origin) return callback(null, true);

    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    // Safely reject disallowed origins without throwing an unhandled Error
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', requireAuth, aiRoutes);
app.use('/api/ocr', requireAuth, ocrRoutes);
app.use('/api/transactions', requireAuth, transactionsRoutes);
app.use('/api/goals', requireAuth, goalsRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/history', requireAuth, historyRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/profile', requireAuth, profileRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SPR App Server is running' });
});

// Catch-all 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'NotFound', message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Centralized error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred on the server',
  });
});

// Initialize DB and start server
initDb()
  .then(() => {
    console.log('Database initialized successfully');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database. Server not started.', err);
    process.exit(1);
  });
