import express, { Request, Response } from 'express';
import { getDb } from '../services/db';
import { requireAuth, optionalAuth, requireAdmin } from './auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

const GEMINI_CANDIDATE_MODELS = process.env.GEMINI_MODELS
  ? process.env.GEMINI_MODELS.split(',').map((m) => m.trim()).filter(Boolean)
  : ['gemini-flash-lite-latest', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash'];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ─── GET /api/projects (Browse projects) ────────────────────────────────────
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { category, difficulty, search } = req.query;
    const db = getDb();

    const conditions: string[] = [];
    const values: any[] = [];
    let pIdx = 1;

    if (category && category !== 'all') {
      conditions.push(`category = $${pIdx++}`);
      values.push(category);
    }

    if (difficulty && difficulty !== 'all') {
      conditions.push(`difficulty = $${pIdx++}`);
      values.push(difficulty);
    }

    if (search && typeof search === 'string' && search.trim()) {
      conditions.push(`(title ILIKE $${pIdx} OR description ILIKE $${pIdx})`);
      values.push(`%${search.trim()}%`);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT id, title, description, category, difficulty, estimated_budget, estimated_days,
             images, is_premium, created_at
      FROM projects
      ${whereClause}
      ORDER BY created_at ASC
    `;

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// ─── POST /api/projects (Create project - Restricted to Owner & Admins) ────────
router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      title,
      description = '',
      category,
      difficulty = 'Beginner',
      estimated_budget = 0,
      estimated_days = 1,
      materials = [],
      steps = [],
      expected_outcome = '',
      resources = [],
      images = [],
      is_premium = false,
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ error: 'Project title is required (at least 3 characters)' });
    }
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Project category is required' });
    }
    if (!['Beginner', 'Intermediate', 'Advanced'].includes(difficulty)) {
      return res.status(400).json({ error: 'Difficulty must be Beginner, Intermediate, or Advanced' });
    }

    const db = getDb();
    const id = generateId();

    const insertRes = await db.query(
      `INSERT INTO projects
        (id, title, description, category, difficulty, estimated_budget, estimated_days, materials, steps, expected_outcome, resources, images, is_premium)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        id,
        title.trim(),
        description.trim(),
        category.trim(),
        difficulty,
        Number(estimated_budget) || 0,
        Number(estimated_days) || 1,
        typeof materials === 'string' ? materials : JSON.stringify(materials),
        typeof steps === 'string' ? steps : JSON.stringify(steps),
        expected_outcome.trim(),
        typeof resources === 'string' ? resources : JSON.stringify(resources),
        Array.isArray(images) ? images : [],
        Boolean(is_premium),
      ]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// ─── GET /api/projects/subscription/status ──────────────────────────────────
router.get('/subscription/status', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({
        plan: 'free',
        isPremium: false,
        hasActiveGateway: false,
        notice: 'Sign in to access student project tracks and pilot passes.',
      });
    }

    const db = getDb();
    const result = await db.query('SELECT plan FROM user_subscriptions WHERE user_id = $1', [userId]);
    const plan = result.rows.length > 0 ? result.rows[0].plan : 'free';

    res.json({
      plan,
      isPremium: plan === 'premium',
      hasActiveGateway: false,
      notice: 'Academic Term Pilot: All verified students can activate complimentary access during the current semester.',
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// ─── POST /api/projects/subscription/activate-pilot ─────────────────────────
router.post('/subscription/activate-pilot', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    await db.query(
      `INSERT INTO user_subscriptions (user_id, plan, updated_at)
       VALUES ($1, 'premium', CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET plan = 'premium', updated_at = CURRENT_TIMESTAMP`,
      [userId]
    );

    res.json({ plan: 'premium', message: 'Complimentary Student Pilot Pass activated!' });
  } catch (error) {
    console.error('Error activating pilot subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// ─── GET /api/projects/:id (Single project detail) ──────────────────────────
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const db = getDb();

    const result = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = result.rows[0];

    // Check user plan
    let isUserPremium = false;
    if (userId) {
      const sub = await db.query('SELECT plan FROM user_subscriptions WHERE user_id = $1', [userId]);
      if (sub.rows.length > 0 && sub.rows[0].plan === 'premium') {
        isUserPremium = true;
      }
    }

    // Parse materials, steps, and resources JSON safely
    let parsedMaterials: any[] = [];
    let parsedSteps: any[] = [];
    let parsedResources: any[] = [];

    try {
      parsedMaterials = JSON.parse(project.materials);
    } catch {}

    try {
      parsedSteps = JSON.parse(project.steps);
    } catch {}

    try {
      parsedResources = JSON.parse(project.resources);
    } catch {}

    res.json({
      ...project,
      materials: parsedMaterials,
      steps: parsedSteps,
      resources: parsedResources,
      isUserPremium,
      canAccessFullContent: !project.is_premium || isUserPremium,
    });
  } catch (error) {
    console.error('Error fetching project detail:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// ─── GET /api/projects/:id/ai-history ───────────────────────────────────────
router.get('/:id/ai-history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const result = await db.query(
      'SELECT id, role, content, created_at FROM project_ai_history WHERE user_id = $1 AND project_id = $2 ORDER BY created_at ASC',
      [userId, id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching project AI history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ─── POST /api/projects/:id/ai-ask ──────────────────────────────────────────
router.post('/:id/ai-ask', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { message } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const db = getDb();
    const projResult = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projResult.rows[0];

    // Save user message
    const userMsgId = generateId();
    await db.query(
      `INSERT INTO project_ai_history (id, user_id, project_id, role, content)
       VALUES ($1, $2, $3, 'user', $4)`,
      [userMsgId, userId, id, message.trim()]
    );

    // Call Gemini with project context
    let reply = '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      reply = `I am ready to help you with "${project.title}". As your student engineering mentor, I recommend starting with Step 1 and ensuring your estimated budget of ฿${project.estimated_budget} fits your monthly discretionary allowance.`;
    } else {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const systemInstruction = `You are SPR Project Mentor, an expert hands-on engineering and student entrepreneurship advisor.
The student is currently building the following project:
- Title: ${project.title}
- Category: ${project.category}
- Difficulty: ${project.difficulty}
- Estimated Budget: ฿${project.estimated_budget}
- Estimated Completion: ${project.estimated_days} days
- Materials: ${project.materials}
- Steps: ${project.steps}
- Expected Outcome: ${project.expected_outcome}

Help the student with practical, realistic advice. If they ask about budget alternatives, suggest cheaper student hacks. Keep explanations structured, encouraging, and actionable.`;

        const candidateModels = GEMINI_CANDIDATE_MODELS;
        for (const candidateModel of candidateModels) {
          try {
            const model = genAI.getGenerativeModel({
              model: candidateModel,
              systemInstruction: systemInstruction,
            });
            const result = await model.generateContent(message.trim());
            const text = result.response.text();
            if (text) {
              reply = text;
              break;
            }
          } catch (modelErr: any) {
            console.warn(`Model ${candidateModel} failed:`, modelErr?.message || modelErr);
          }
        }

        if (!reply) {
          reply = `I analyzed "${project.title}". As a student advisor, I recommend starting with Step 1 and checking your budget of ฿${project.estimated_budget} before purchasing components.`;
        }
      } catch (aiErr) {
        console.error('Gemini error for project AI:', aiErr);
        reply = `I analyzed "${project.title}". Tip for ${project.difficulty} difficulty: verify all required materials before starting, and test each step incrementally to minimize unnecessary expenses.`;
      }
    }

    // Save assistant reply
    const assistantMsgId = generateId();
    await db.query(
      `INSERT INTO project_ai_history (id, user_id, project_id, role, content)
       VALUES ($1, $2, $3, 'assistant', $4)`,
      [assistantMsgId, userId, id, reply]
    );

    res.json({
      reply,
      userMessageId: userMsgId,
      assistantMessageId: assistantMsgId,
    });
  } catch (error) {
    console.error('Error in project AI ask:', error);
    res.status(500).json({ error: 'Failed to process AI question' });
  }
});

export default router;

