import express, { Request, Response } from 'express';
import { getDb } from '../services/db';
import { requireAuth, optionalAuth, isUserAdmin } from './auth';

const router = express.Router();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Prohibited terms for student campus safety
const PROHIBITED_KEYWORDS = [
  'weapon', 'gun', 'knife', 'explosive', 'ammunition',
  'drug', 'weed', 'cannabis', 'marijuana', 'vape', 'tobacco', 'cigarette', 'alcohol', 'beer', 'liquor',
  'exam answer', 'cheat', 'fake id', 'counterfeit'
];

function containsProhibitedContent(text: string): boolean {
  const lower = text.toLowerCase();
  return PROHIBITED_KEYWORDS.some(term => lower.includes(term));
}

// ─── GET /api/marketplace (Public browse with filters) ───────────────────────
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { search, category, condition, minPrice, maxPrice, status = 'available', sort = 'newest' } = req.query;
    const db = getDb();

    const conditions: string[] = [];
    const values: any[] = [];
    let pIdx = 1;

    if (status && status !== 'all') {
      conditions.push(`m.status = $${pIdx++}`);
      values.push(status);
    } else {
      conditions.push(`m.status != 'removed'`);
    }

    if (category && category !== 'all') {
      conditions.push(`m.category = $${pIdx++}`);
      values.push(category);
    }

    if (condition && condition !== 'all') {
      conditions.push(`m.condition = $${pIdx++}`);
      values.push(condition);
    }

    if (search && typeof search === 'string' && search.trim()) {
      conditions.push(`(m.title ILIKE $${pIdx} OR m.description ILIKE $${pIdx})`);
      values.push(`%${search.trim()}%`);
      pIdx++;
    }

    if (minPrice && !isNaN(Number(minPrice))) {
      conditions.push(`m.price >= $${pIdx++}`);
      values.push(Number(minPrice));
    }

    if (maxPrice && !isNaN(Number(maxPrice))) {
      conditions.push(`m.price <= $${pIdx++}`);
      values.push(Number(maxPrice));
    }

    let orderBy = 'm.created_at DESC';
    if (sort === 'price_asc') {
      orderBy = 'm.price ASC';
    } else if (sort === 'price_desc') {
      orderBy = 'm.price DESC';
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT m.*, u.username as seller_name, u.avatar_url as seller_avatar
      FROM marketplace_listings m
      LEFT JOIN users u ON m.user_id = u.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT 100
    `;

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace listings' });
  }
});

// ─── GET /api/marketplace/my (Seller's own listings) ─────────────────────────
router.get('/my', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const result = await db.query(
      `SELECT m.*, 
        (SELECT COUNT(*) FROM marketplace_interests WHERE listing_id = m.id) as real_interest_count
       FROM marketplace_listings m
       WHERE m.user_id = $1
       ORDER BY m.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching my listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// ─── GET /api/marketplace/:id (Single listing detail) ────────────────────────
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const db = getDb();

    const result = await db.query(
      `SELECT m.*, u.username as seller_name, u.avatar_url as seller_avatar
       FROM marketplace_listings m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = result.rows[0];

    // Check if current user has expressed interest
    let hasExpressedInterest = false;
    let myInterest = null;

    if (userId) {
      const interestCheck = await db.query(
        'SELECT * FROM marketplace_interests WHERE listing_id = $1 AND user_id = $2',
        [id, userId]
      );
      if (interestCheck.rows.length > 0) {
        hasExpressedInterest = true;
        myInterest = interestCheck.rows[0];
      }
    }

    // If owner, fetch list of interested buyers
    let buyerInterests = [];
    if (userId && listing.user_id === userId) {
      const buyers = await db.query(
        `SELECT i.*, u.username as buyer_name, u.avatar_url as buyer_avatar
         FROM marketplace_interests i
         LEFT JOIN users u ON i.user_id = u.id
         WHERE i.listing_id = $1
         ORDER BY i.created_at DESC`,
        [id]
      );
      buyerInterests = buyers.rows;
    }

    res.json({
      ...listing,
      hasExpressedInterest,
      myInterest,
      buyerInterests,
      isOwner: userId ? listing.user_id === userId : false,
    });
  } catch (error) {
    console.error('Error fetching listing detail:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// ─── POST /api/marketplace (Create listing) ──────────────────────────────────
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      title,
      description = '',
      category,
      condition,
      price,
      images = [],
      contact_info = '',
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return res.status(400).json({ error: 'Item title is required (minimum 2 characters)' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Item category is required' });
    }

    const validConditions = ['new', 'like_new', 'good', 'fair', 'poor'];
    if (!condition || !validConditions.includes(condition)) {
      return res.status(400).json({ error: `Valid condition required (${validConditions.join(', ')})` });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ error: 'Price must be a non-negative number' });
    }

    // Prohibited content check for student safety
    if (containsProhibitedContent(title) || containsProhibitedContent(description)) {
      return res.status(400).json({
        error: 'Safety warning: Listing contains prohibited items (weapons, drugs, alcohol, or academic dishonesty items).',
      });
    }

    const id = generateId();
    const db = getDb();

    const insertResult = await db.query(
      `INSERT INTO marketplace_listings 
        (id, user_id, title, description, category, condition, price, images, status, contact_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'available', $9)
       RETURNING *`,
      [id, userId, title.trim(), description.trim(), category, condition, numPrice, images, contact_info.trim()]
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error('Error creating marketplace listing:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// ─── PUT /api/marketplace/:id (Edit listing) ─────────────────────────────────
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const existing = await db.query('SELECT * FROM marketplace_listings WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own listings' });
    }

    const { title, description, category, condition, price, images, status, contact_info } = req.body;

    if (title && containsProhibitedContent(title)) {
      return res.status(400).json({ error: 'Safety warning: Title contains prohibited keywords.' });
    }
    if (description && containsProhibitedContent(description)) {
      return res.status(400).json({ error: 'Safety warning: Description contains prohibited keywords.' });
    }

    const fields: string[] = [];
    const values: any[] = [];
    let pIdx = 1;

    if (title !== undefined) {
      fields.push(`title = $${pIdx++}`);
      values.push(title.trim());
    }
    if (description !== undefined) {
      fields.push(`description = $${pIdx++}`);
      values.push(description.trim());
    }
    if (category !== undefined) {
      fields.push(`category = $${pIdx++}`);
      values.push(category);
    }
    if (condition !== undefined) {
      fields.push(`condition = $${pIdx++}`);
      values.push(condition);
    }
    if (price !== undefined) {
      fields.push(`price = $${pIdx++}`);
      values.push(Number(price));
    }
    if (images !== undefined) {
      fields.push(`images = $${pIdx++}`);
      values.push(images);
    }
    if (status !== undefined) {
      fields.push(`status = $${pIdx++}`);
      values.push(status);
    }
    if (contact_info !== undefined) {
      fields.push(`contact_info = $${pIdx++}`);
      values.push(contact_info.trim());
    }

    if (fields.length === 0) return res.json(existing.rows[0]);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, userId);

    const query = `UPDATE marketplace_listings SET ${fields.join(', ')} WHERE id = $${pIdx++} AND user_id = $${pIdx} RETURNING *`;
    const result = await db.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating listing:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// ─── POST /api/marketplace/:id/sold (Mark as sold + optional SPR income tracking)
router.post('/:id/sold', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { recordTransaction = false } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const existing = await db.query('SELECT * FROM marketplace_listings WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });

    const listing = existing.rows[0];
    if (listing.user_id !== userId) return res.status(403).json({ error: 'Unauthorized' });

    // Mark as sold
    await db.query(
      "UPDATE marketplace_listings SET status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    // If requested, integrate confirmed sale into SPR financial records as Income
    if (recordTransaction && listing.price > 0) {
      const txnId = generateId();
      await db.query(
        `INSERT INTO transactions (id, user_id, type, amount, "categoryId", description, date, "createdAt", "updatedAt")
         VALUES ($1, $2, 'income', $3, 'other-income', $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [txnId, userId, listing.price, `SPR Marketplace Sale: ${listing.title}`]
      );
    }

    res.json({ message: 'Item marked as sold', recordedToIncome: recordTransaction });
  } catch (error) {
    console.error('Error marking listing sold:', error);
    res.status(500).json({ error: 'Failed to mark as sold' });
  }
});

// ─── DELETE /api/marketplace/:id (Remove listing) ────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const existing = await db.query('SELECT * FROM marketplace_listings WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = existing.rows[0];

    const userRes = await db.query('SELECT role, email FROM users WHERE id = $1', [userId]);
    const userRole = userRes.rows[0]?.role;
    const userEmail = userRes.rows[0]?.email;
    const isAdmin = isUserAdmin({ role: userRole, email: userEmail });

    // Check ownership: only creator (or admin/owner) can delete
    const isOwner = listing.user_id === userId || isAdmin;
    if (!isOwner) {
      return res.status(403).json({ error: 'You can only remove listings that you created' });
    }

    // Check if not used: if already marked sold, cannot delete
    if (listing.status === 'sold') {
      return res.status(400).json({ error: 'Cannot remove an item that has already been sold and completed.' });
    }

    await db.query(
      "UPDATE marketplace_listings SET status = 'removed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    res.json({ success: true, message: 'Listing removed successfully' });
  } catch (error) {
    console.error('Error removing listing:', error);
    res.status(500).json({ error: 'Failed to remove listing' });
  }
});

// ─── POST /api/marketplace/:id/interest (Express buyer interest) ─────────────
router.post('/:id/interest', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { message = '', contact = '' } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const listingCheck = await db.query('SELECT * FROM marketplace_listings WHERE id = $1', [id]);
    if (listingCheck.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });

    const listing = listingCheck.rows[0];
    if (listing.user_id === userId) {
      return res.status(400).json({ error: 'You cannot express interest in your own listing' });
    }

    const interestId = generateId();
    await db.query(
      `INSERT INTO marketplace_interests (id, listing_id, user_id, message, contact)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (listing_id, user_id) DO UPDATE SET message = $4, contact = $5`,
      [interestId, id, userId, message.trim(), contact.trim()]
    );

    // Update counter
    await db.query(
      'UPDATE marketplace_listings SET buyer_interest_count = (SELECT COUNT(*) FROM marketplace_interests WHERE listing_id = $1) WHERE id = $1',
      [id]
    );

    res.json({ message: 'Interest expressed successfully' });
  } catch (error) {
    console.error('Error expressing interest:', error);
    res.status(500).json({ error: 'Failed to express interest' });
  }
});

// ─── POST /api/marketplace/:id/report (Report inappropriate listing) ─────────
router.post('/:id/report', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { reason, details = '' } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const reportId = generateId();
    const db = getDb();

    await db.query(
      `INSERT INTO marketplace_reports (id, listing_id, reporter_id, reason, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [reportId, id, userId, reason.trim(), details.trim()]
    );

    res.json({ message: 'Report submitted. Our moderation team will review this item.' });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

export default router;

