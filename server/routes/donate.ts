import express, { Request, Response } from 'express';
import { getDb } from '../services/db';
import { requireAuth, optionalAuth } from './auth';

const router = express.Router();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ─── GET /api/donate (Browse campaigns) ──────────────────────────────────────
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { category, search, status = 'active' } = req.query;
    const db = getDb();

    const conditions: string[] = [];
    const values: any[] = [];
    let pIdx = 1;

    if (status && status !== 'all') {
      conditions.push(`status = $${pIdx++}`);
      values.push(status);
    } else {
      conditions.push(`status != 'cancelled'`);
    }

    if (category && category !== 'all') {
      conditions.push(`category = $${pIdx++}`);
      values.push(category);
    }

    if (search && typeof search === 'string' && search.trim()) {
      conditions.push(`(title ILIKE $${pIdx} OR description ILIKE $${pIdx} OR organizer_name ILIKE $${pIdx})`);
      values.push(`%${search.trim()}%`);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM donations WHERE campaign_id = c.id) as donor_count
      FROM donate_campaigns c
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT 50
    `;

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching donate campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// ─── GET /api/donate/my-donations ───────────────────────────────────────────
router.get('/my-donations', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const result = await db.query(
      `SELECT d.*, c.title as campaign_title, c.category as campaign_category, c.cover_image
       FROM donations d
       JOIN donate_campaigns c ON d.campaign_id = c.id
       WHERE d.donor_id = $1
       ORDER BY d.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching my donations:', error);
    res.status(500).json({ error: 'Failed to fetch donation history' });
  }
});

// ─── GET /api/donate/:id ────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const result = await db.query('SELECT * FROM donate_campaigns WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = result.rows[0];

    // Fetch recent donors (sanitizing anonymous donations)
    const donorsResult = await db.query(
      `SELECT d.id, d.amount, d.message, d.is_anonymous, d.created_at, u.username
       FROM donations d
       LEFT JOIN users u ON d.donor_id = u.id
       WHERE d.campaign_id = $1
       ORDER BY d.created_at DESC
       LIMIT 30`,
      [id]
    );

    const donors = donorsResult.rows.map((d: any) => ({
      id: d.id,
      amount: Number(d.amount),
      message: d.message,
      created_at: d.created_at,
      donor_name: d.is_anonymous ? 'Kind Donor' : (d.username || 'Student Supporter'),
    }));

    res.json({
      ...campaign,
      donors,
      donor_count: donors.length,
    });
  } catch (error) {
    console.error('Error fetching campaign detail:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// ─── POST /api/donate (Create campaign) ──────────────────────────────────────
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      title,
      description = '',
      objective = '',
      target_amount,
      cover_image = '',
      category = 'Student Welfare',
      end_date,
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ error: 'Campaign title is required (at least 3 characters)' });
    }

    const target = Number(target_amount);
    if (isNaN(target) || target <= 0) {
      return res.status(400).json({ error: 'Target amount must be greater than zero' });
    }

    const db = getDb();

    // Fetch user username to display as organizer
    const userRes = await db.query('SELECT username, email FROM users WHERE id = $1', [userId]);
    const organizerName = userRes.rows[0]?.username || 'Student Organizer';

    const id = generateId();
    const insertRes = await db.query(
      `INSERT INTO donate_campaigns 
        (id, organizer_id, organizer_name, title, description, objective, target_amount, amount_raised, cover_image, category, status, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, 'active', $10)
       RETURNING *`,
      [id, userId, organizerName, title.trim(), description.trim(), objective.trim(), target, cover_image, category, end_date || null]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (error) {
    console.error('Error creating donate campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// ─── POST /api/donate/:id/donate (Contribute via PromptPay QR) ──────────────
router.post('/:id/donate', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const {
      amount,
      message = '',
      is_anonymous = false,
      slip_url = '',
      slip_reference = '',
      transfer_time,
      payment_reference,
    } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Donation amount must be greater than zero' });
    }

    const db = getDb();
    const campaignRes = await db.query('SELECT * FROM donate_campaigns WHERE id = $1', [id]);
    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaignRes.rows[0];
    if (campaign.status === 'completed' || campaign.status === 'cancelled') {
      return res.status(400).json({ error: `Campaign is already ${campaign.status}` });
    }

    // Generate unique payment reference if not supplied
    const payRef = (payment_reference && typeof payment_reference === 'string' && payment_reference.startsWith('DON-'))
      ? payment_reference
      : `DON-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Prevent duplicate payment reference collision
    const refCheck = await db.query('SELECT id FROM donations WHERE payment_reference = $1', [payRef]);
    if (refCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Duplicate payment reference. Please generate a new transfer reference.' });
    }

    const donationId = generateId();

    // In accordance with audit rules: Initial status is ALWAYS 'pending'
    // Total raised only increases after authorized admin verification!
    await db.query(
      `INSERT INTO donations 
        (id, campaign_id, donor_id, amount, message, is_anonymous, status, payment_reference, payment_method, slip_url, slip_reference, transfer_time)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, 'promptpay_qr', $8, $9, $10)`,
      [
        donationId,
        id,
        userId,
        numAmount,
        message.trim(),
        Boolean(is_anonymous),
        payRef,
        slip_url.trim(),
        slip_reference.trim(),
        transfer_time ? new Date(transfer_time) : new Date(),
      ]
    );

    res.status(201).json({
      success: true,
      message: `Donation submitted successfully. Your transfer to "${campaign.title}" is Pending Verification by an administrator.`,
      donationId,
      paymentReference: payRef,
      amount: numAmount,
      status: 'pending',
    });
  } catch (error) {
    console.error('Error processing donation:', error);
    res.status(500).json({ error: 'Failed to submit donation payment' });
  }
});

export default router;

