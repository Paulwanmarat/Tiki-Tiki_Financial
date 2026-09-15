import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRoutes from './routes/ai';
import ocrRoutes from './routes/ocr';
import authRoutes, { requireAuth } from './routes/auth';
import transactionsRoutes from './routes/transactions';
import goalsRoutes from './routes/goals';
import settingsRoutes from './routes/settings';
import historyRoutes from './routes/history';
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
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. native mobile apps, curl)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    
    // In production, check against explicitly allowed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    
    // If not allowed, reject
    callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', requireAuth, aiRoutes);
app.use('/api/ocr', requireAuth, ocrRoutes);
app.use('/api/transactions', requireAuth, transactionsRoutes);
app.use('/api/goals', requireAuth, goalsRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/history', requireAuth, historyRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Tiki Finance AI Proxy Server is running' });
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
