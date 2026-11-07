import express, { Request, Response } from 'express';
import { getDb } from '../services/db';
import { requireAuth, optionalAuth } from './auth';

const router = express.Router();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Helper: generate a dignified student alias to protect personal privacy
function sanitizeStudentName(username?: string, email?: string): string {
  if (username && username.length > 0) {
    return `Student ${username.charAt(0).toUpperCase()}.`;
  }
  if (email && email.length > 0) {
    return `Student ${email.charAt(0).toUpperCase()}.`;
  }
  return 'Verified Student';
}

// ─── Feature 3B: 🌳 TRYLAND Tree Planting Initiatives ─────────────────────────
router.get('/trees', optionalAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const initiativesRes = await db.query(`
      SELECT 
        i.*,
        (SELECT COUNT(*) FROM tryland_tree_donations WHERE initiative_id = i.id AND status = 'verified') as donor_count,
        (SELECT COALESCE(SUM(tree_count), 0) FROM tryland_tree_donations WHERE initiative_id = i.id AND status = 'verified') as total_verified_trees
      FROM tryland_trees i
      ORDER BY i.created_at ASC
    `);

    const statsRes = await db.query(`
      SELECT 
        COALESCE(SUM(tree_count), 0) as total_trees_planted,
        COALESCE(SUM(amount), 0) as total_money_raised,
        COUNT(DISTINCT donor_id) + COUNT(CASE WHEN donor_id IS NULL THEN 1 END) as total_contributors
      FROM tryland_tree_donations
      WHERE status = 'verified'
    `);

    const totalTrees = Number(statsRes.rows[0]?.total_trees_planted || 0);
    const totalRaised = Number(statsRes.rows[0]?.total_money_raised || 0);
    const totalContributors = Number(statsRes.rows[0]?.total_contributors || 0);
    const co2OffsetKg = Math.round(totalTrees * 22);

    res.json({
      initiatives: initiativesRes.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        location: row.location,
        description: row.description,
        cost_per_tree: Number(row.cost_per_tree),
        target_trees: parseInt(row.target_trees, 10),
        trees_planted: parseInt(row.total_verified_trees, 10) || 0,
        amount_raised: Number(row.amount_raised) || 0,
        status: row.status,
        donor_count: parseInt(row.donor_count, 10) || 0,
      })),
      stats: {
        total_trees_planted: totalTrees,
        total_money_raised: totalRaised,
        total_contributors: totalContributors,
        co2_offset_kg: co2OffsetKg,
      },
    });
  } catch (error) {
    console.error('Error fetching tree initiatives:', error);
    res.status(500).json({ error: 'Failed to fetch tree initiatives' });
  }
});

router.post('/trees/:id/donate', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      tree_count,
      amount,
      message = '',
      slip_reference,
      slip_url,
      transfer_time,
      payment_reference,
      guest_name,
      guest_email,
    } = req.body;

    const db = getDb();
    const initRes = await db.query('SELECT * FROM tryland_trees WHERE id = $1', [id]);
    if (initRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tree initiative not found' });
    }

    const initData = initRes.rows[0];
    const numTrees = parseInt(tree_count, 10) || 1;
    const numAmount = parseFloat(amount) || (numTrees * Number(initData.cost_per_tree));

    if (numTrees <= 0 || numAmount <= 0) {
      return res.status(400).json({ error: 'Invalid tree count or amount' });
    }

    const payRef = payment_reference || `TRY-TREE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const donationId = generateId();
    const donorId = req.user?.id || null;

    await db.query(
      `INSERT INTO tryland_tree_donations
       (id, initiative_id, donor_id, donor_name, donor_email, tree_count, amount, message, payment_reference, slip_reference, slip_url, transfer_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')`,
      [
        donationId,
        id,
        donorId,
        guest_name || req.user?.email?.split('@')[0] || 'Tree Supporter',
        guest_email || req.user?.email || null,
        numTrees,
        numAmount,
        message,
        payRef,
        slip_reference || null,
        slip_url || null,
        transfer_time ? new Date(transfer_time) : new Date(),
      ]
    );

    res.status(201).json({
      success: true,
      message: `🌳 Sponsoring ${numTrees} tree(s) submitted for verification.`,
      donationId,
      paymentReference: payRef,
      amount: numAmount,
      treeCount: numTrees,
      status: 'pending',
    });
  } catch (error) {
    console.error('Error creating tree donation:', error);
    res.status(500).json({ error: 'Failed to record tree donation' });
  }
});

// ─── GET /api/tryland (Browse sanitized verified requests) ───────────────────
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { category, status } = req.query;
    const db = getDb();

    const conditions: string[] = [];
    const values: any[] = [];
    let pIdx = 1;

    // By default, public browse shows only verified requests needing sponsorship
    if (status && status !== 'all') {
      conditions.push(`r.status = $${pIdx++}`);
      values.push(status);
    } else {
      conditions.push(`r.status IN ('open', 'approved', 'partially_funded', 'fully_funded')`);
    }

    if (category && category !== 'all') {
      conditions.push(`r.bill_category = $${pIdx++}`);
      values.push(category);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // NEVER SELECT document_url or full personal PII in public query
    const query = `
      SELECT 
        r.id,
        r.bill_category,
        r.amount_requested,
        r.amount_funded,
        r.explanation,
        r.due_date,
        r.status,
        r.created_at,
        u.username,
        u.email,
        (SELECT COUNT(*) FROM tryland_sponsorships WHERE request_id = r.id) as sponsors_count
      FROM tryland_requests r
      LEFT JOIN users u ON r.user_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT 100
    `;

    const result = await db.query(query, values);

    // Sanitize records so sensitive personal info is completely protected
    const sanitizedRows = result.rows.map((row: any) => ({
      id: row.id,
      bill_category: row.bill_category,
      amount_requested: Number(row.amount_requested),
      amount_funded: Number(row.amount_funded),
      explanation: row.explanation,
      due_date: row.due_date,
      status: row.status,
      created_at: row.created_at,
      sponsors_count: parseInt(row.sponsors_count, 10) || 0,
      student_alias: sanitizeStudentName(row.username, row.email),
    }));

    res.json(sanitizedRows);
  } catch (error) {
    console.error('Error fetching Tryland requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// ─── GET /api/tryland/my-requests (Student's own requests) ───────────────────
router.get('/my-requests', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const result = await db.query(
      `SELECT r.*,
        (SELECT COALESCE(json_agg(json_build_object('id', s.id, 'amount', s.amount, 'note', s.note, 'created_at', s.created_at)), '[]'::json)
         FROM tryland_sponsorships s WHERE s.request_id = r.id) as sponsorships
       FROM tryland_requests r
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching my Tryland requests:', error);
    res.status(500).json({ error: 'Failed to fetch your requests' });
  }
});

// ─── GET /api/tryland/my-sponsorships (Sponsor history) ──────────────────────
router.get('/my-sponsorships', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const result = await db.query(
      `SELECT s.*, r.bill_category, r.amount_requested, r.amount_funded, r.status as request_status, r.due_date
       FROM tryland_sponsorships s
       JOIN tryland_requests r ON s.request_id = r.id
       WHERE s.sponsor_id = $1
       ORDER BY s.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching my sponsorships:', error);
    res.status(500).json({ error: 'Failed to fetch sponsorships' });
  }
});

// ─── GET /api/tryland/:id (Single request detail) ────────────────────────────
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const db = getDb();

    const result = await db.query(
      `SELECT r.*, u.username, u.email
       FROM tryland_requests r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sponsorship request not found' });
    }

    const row = result.rows[0];
    const isOwner = userId ? row.user_id === userId : false;

    // Privacy rule: Only the owner sees the original document_url
    const sanitized = {
      id: row.id,
      bill_category: row.bill_category,
      amount_requested: Number(row.amount_requested),
      amount_funded: Number(row.amount_funded),
      explanation: row.explanation,
      due_date: row.due_date,
      status: row.status,
      created_at: row.created_at,
      rejection_reason: isOwner ? row.rejection_reason : undefined,
      document_url: isOwner ? row.document_url : undefined,
      student_alias: sanitizeStudentName(row.username, row.email),
      isOwner,
    };

    res.json(sanitized);
  } catch (error) {
    console.error('Error fetching Tryland request detail:', error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// ─── POST /api/tryland/request (Submit new sponsorship request) ──────────────
router.post('/request', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { bill_category, amount_requested, explanation = '', due_date, document_url = '' } = req.body;

    if (!bill_category) {
      return res.status(400).json({ error: 'Bill category is required' });
    }

    const amount = Number(amount_requested);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount requested must be greater than zero' });
    }

    if (!due_date) {
      return res.status(400).json({ error: 'Payment due date is required' });
    }

    const db = getDb();

    // Prevent fraudulent duplicate submissions (same user, category, amount within last 7 days)
    const duplicateCheck = await db.query(
      `SELECT id FROM tryland_requests 
       WHERE user_id = $1 
         AND bill_category = $2 
         AND ABS(amount_requested - $3) < 1 
         AND created_at > NOW() - INTERVAL '7 days'
         AND status NOT IN ('rejected', 'expired')`,
      [userId, bill_category, amount]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'You already have an active request for this bill category and amount in review. Please wait for verification.',
      });
    }

    const id = generateId();

    // Default status is ALWAYS pending_verification — users cannot self-approve!
    const insertResult = await db.query(
      `INSERT INTO tryland_requests 
        (id, user_id, bill_category, amount_requested, amount_funded, explanation, due_date, document_url, status)
       VALUES ($1, $2, $3, $4, 0, $5, $6, $7, 'pending_verification')
       RETURNING *`,
      [id, userId, bill_category, amount, explanation.trim(), due_date, document_url]
    );

    res.status(201).json({
      ...insertResult.rows[0],
      message: 'Request submitted for verification. Reviews typically take 24–48 hours.',
    });
  } catch (error) {
    console.error('Error submitting Tryland request:', error);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

// ─── POST /api/tryland/:id/sponsor (Sponsor a bill via PromptPay QR) ──────────
router.post('/:id/sponsor', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || null;
    const { id } = req.params;
    const {
      amount,
      note = '',
      slip_url = '',
      slip_reference = '',
      transfer_time,
      payment_reference,
      guest_name,
      guest_email,
    } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Sponsorship amount must be greater than zero' });
    }

    const db = getDb();
    const requestResult = await db.query('SELECT * FROM tryland_requests WHERE id = $1', [id]);
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const reqData = requestResult.rows[0];

    // Anti-self-sponsorship check: User cannot sponsor their own bill
    if (userId && reqData.user_id === userId) {
      return res.status(400).json({ error: 'You cannot sponsor your own request' });
    }

    // Must be in an open/funded state
    const openStatuses = ['open', 'approved', 'partially_funded'];
    if (!openStatuses.includes(reqData.status)) {
      return res.status(400).json({ error: `This request is currently ${reqData.status.replace('_', ' ')}` });
    }

    const remainingNeeded = Math.max(0, Number(reqData.amount_requested) - Number(reqData.amount_funded));
    if (remainingNeeded <= 0) {
      return res.status(400).json({ error: 'This bill request is already fully funded' });
    }

    const actualContribution = Math.min(numAmount, remainingNeeded);

    // Generate unique payment reference if not supplied
    const payRef = (payment_reference && typeof payment_reference === 'string' && (payment_reference.startsWith('TRY-') || payment_reference.startsWith('RK-')))
      ? payment_reference
      : `RK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Prevent duplicate payment reference collision
    const refCheck = await db.query('SELECT id FROM tryland_sponsorships WHERE payment_reference = $1', [payRef]);
    if (refCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Duplicate payment reference. Please generate a new transfer reference.' });
    }

    const sponId = generateId();

    // In accordance with audit rules: Initial status is ALWAYS 'pending'
    // Total funding progress only increases after authorized admin verification!
    await db.query(
      `INSERT INTO tryland_sponsorships 
        (id, request_id, sponsor_id, amount, note, status, payment_reference, payment_method, slip_url, slip_reference, transfer_time, guest_name, guest_email)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, 'promptpay_qr', $7, $8, $9, $10, $11)`,
      [
        sponId,
        id,
        userId,
        actualContribution,
        note.trim(),
        payRef,
        slip_url.trim(),
        slip_reference.trim(),
        transfer_time ? new Date(transfer_time) : new Date(),
        userId ? null : (guest_name?.trim() || 'Random Kindness Supporter'),
        userId ? null : (guest_email?.trim() || null),
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Sponsorship payment submitted successfully. Your transfer is Pending Verification by an administrator.',
      sponsorshipId: sponId,
      paymentReference: payRef,
      amount: actualContribution,
      status: 'pending',
    });
  } catch (error) {
    console.error('Error sponsoring request:', error);
    res.status(500).json({ error: 'Failed to submit sponsorship payment' });
  }
});

// ─── POST /api/tryland/:id/verify (Moderator verification action) ────────────
router.post('/:id/verify', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { action, rejection_reason = '' } = req.body; // action: 'approve' | 'reject'
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const reqResult = await db.query('SELECT * FROM tryland_requests WHERE id = $1', [id]);
    if (reqResult.rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    const reqData = reqResult.rows[0];

    // Anti-self-approval rule: User CANNOT verify their own request!
    if (reqData.user_id === userId) {
      return res.status(403).json({ error: 'Security violation: You cannot verify or approve your own sponsorship request' });
    }

    if (action === 'approve') {
      await db.query(
        "UPDATE tryland_requests SET status = 'open', verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );
      res.json({ message: 'Request verified and opened for community sponsorship' });
    } else {
      await db.query(
        "UPDATE tryland_requests SET status = 'rejected', rejection_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [rejection_reason || 'Incomplete documentation', id]
      );
      res.json({ message: 'Request rejected' });
    }
  } catch (error) {
    console.error('Error verifying request:', error);
    res.status(500).json({ error: 'Failed to verify request' });
  }
});

export default router;

