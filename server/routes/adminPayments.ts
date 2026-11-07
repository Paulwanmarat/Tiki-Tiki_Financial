import express, { Request, Response } from 'express';
import { getDb } from '../services/db';
import { requireAuth, requireAdmin } from './auth';

const router = express.Router();

// ─── GET /api/admin/payments (List payment submissions) ──────────────────────
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status = 'all', type = 'all', search } = req.query;
    const db = getDb();

    // 1. Fetch Tryland / RK Sponsorships (using LEFT JOIN so guest sponsors appear)
    let trylandQuery = `
      SELECT 
        s.id,
        'tryland' as type,
        s.payment_reference,
        s.payment_method,
        s.amount,
        s.status,
        s.note as message,
        s.slip_url,
        s.slip_reference,
        s.transfer_time,
        s.created_at,
        s.verified_at,
        s.rejection_reason,
        s.request_id as target_id,
        r.bill_category as target_title,
        r.amount_requested as target_total,
        r.amount_funded as target_current,
        COALESCE(u.email, s.guest_email, 'guest@spr.app') as submitter_email,
        COALESCE(u.username, s.guest_name, 'Guest Supporter') as submitter_name,
        v.email as verifier_email,
        v.username as verifier_name
      FROM tryland_sponsorships s
      JOIN tryland_requests r ON s.request_id = r.id
      LEFT JOIN users u ON s.sponsor_id = u.id
      LEFT JOIN users v ON s.verified_by = v.id
    `;

    // 2. Fetch SPR Donate Donations (using LEFT JOIN so guest donors appear)
    let donateQuery = `
      SELECT 
        d.id,
        'donate' as type,
        d.payment_reference,
        d.payment_method,
        d.amount,
        d.status,
        d.message,
        d.slip_url,
        d.slip_reference,
        d.transfer_time,
        d.created_at,
        d.verified_at,
        d.rejection_reason,
        d.campaign_id as target_id,
        c.title as target_title,
        c.target_amount as target_total,
        c.amount_raised as target_current,
        COALESCE(u.email, d.guest_email, 'guest@spr.app') as submitter_email,
        COALESCE(u.username, d.guest_name, 'Guest Supporter') as submitter_name,
        v.email as verifier_email,
        v.username as verifier_name
      FROM donations d
      JOIN donate_campaigns c ON d.campaign_id = c.id
      LEFT JOIN users u ON d.donor_id = u.id
      LEFT JOIN users v ON d.verified_by = v.id
    `;

    // 3. Fetch 🌳 TRYLAND Tree Donations
    let treeQuery = `
      SELECT 
        t.id,
        'tree' as type,
        t.payment_reference,
        'promptpay_qr' as payment_method,
        t.amount,
        t.status,
        t.message,
        t.slip_url,
        t.slip_reference,
        t.transfer_time,
        t.created_at,
        t.verified_at,
        NULL as rejection_reason,
        t.initiative_id as target_id,
        ('🌳 ' || i.title || ' (' || t.tree_count || ' Trees)') as target_title,
        (i.target_trees * i.cost_per_tree) as target_total,
        i.amount_raised as target_current,
        COALESCE(u.email, t.donor_email, 'guest@spr.app') as submitter_email,
        COALESCE(u.username, t.donor_name, 'Tree Supporter') as submitter_name,
        v.email as verifier_email,
        v.username as verifier_name
      FROM tryland_tree_donations t
      JOIN tryland_trees i ON t.initiative_id = i.id
      LEFT JOIN users u ON t.donor_id = u.id
      LEFT JOIN users v ON t.verified_by = v.id
    `;

    const trylandRows = (type === 'donate' || type === 'tree') ? [] : (await db.query(trylandQuery)).rows;
    const donateRows = (type === 'tryland' || type === 'tree') ? [] : (await db.query(donateQuery)).rows;
    const treeRows = (type === 'tryland' || type === 'donate') ? [] : (await db.query(treeQuery)).rows;

    let combined = [...trylandRows, ...donateRows, ...treeRows];

    // Filter by status if specified
    if (status && status !== 'all') {
      combined = combined.filter((item: any) => item.status === status);
    }

    // Filter by search query if provided
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      combined = combined.filter((item: any) =>
        (item.payment_reference && item.payment_reference.toLowerCase().includes(q)) ||
        (item.submitter_email && item.submitter_email.toLowerCase().includes(q)) ||
        (item.submitter_name && item.submitter_name.toLowerCase().includes(q)) ||
        (item.target_title && item.target_title.toLowerCase().includes(q)) ||
        (item.slip_reference && item.slip_reference.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    combined.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Detect duplicate slip references across all submissions
    const slipCounts = new Map<string, number>();
    for (const item of combined) {
      if (item.slip_reference && item.slip_reference.trim().length > 3) {
        const ref = item.slip_reference.trim().toLowerCase();
        slipCounts.set(ref, (slipCounts.get(ref) || 0) + 1);
      }
    }

    const annotated = combined.map((item: any) => ({
      ...item,
      amount: Number(item.amount),
      target_total: Number(item.target_total),
      target_current: Number(item.target_current),
      is_duplicate_slip: item.slip_reference && item.slip_reference.trim().length > 3
        ? (slipCounts.get(item.slip_reference.trim().toLowerCase()) || 0) > 1
        : false,
    }));

    res.json(annotated);
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// ─── POST /api/admin/payments/:type/:id/verify (Verify / Reject payment) ─────
router.post('/:type/:id/verify', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;
    const type = Array.isArray(req.params.type) ? req.params.type[0] : req.params.type;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { action, rejection_reason = '' } = req.body;

    if (!adminId) return res.status(401).json({ error: 'Unauthorized' });
    if (!type || !['tryland', 'donate', 'tree'].includes(type)) {
      return res.status(400).json({ error: 'Invalid payment type. Must be tryland, donate, or tree.' });
    }
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject.' });
    }

    const db = getDb();

    if (type === 'tree') {
      const treeRes = await db.query('SELECT * FROM tryland_tree_donations WHERE id = $1', [id]);
      if (treeRes.rows.length === 0) {
        return res.status(404).json({ error: 'Tree donation payment not found' });
      }

      const donation = treeRes.rows[0];
      if (donation.status === 'verified') {
        return res.status(400).json({ error: 'Tree donation is already verified' });
      }

      if (action === 'approve') {
        await db.query(
          `UPDATE tryland_tree_donations 
           SET status = 'verified', verified_by = $1, verified_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [adminId, id]
        );

        await db.query(
          `UPDATE tryland_trees 
           SET trees_planted = trees_planted + $1, amount_raised = amount_raised + $2 
           WHERE id = $3`,
          [donation.tree_count, donation.amount, donation.initiative_id]
        );

        return res.json({
          success: true,
          message: `🌳 TRYLAND tree donation verified! Planted ${donation.tree_count} trees.`,
          status: 'verified',
        });
      } else {
        await db.query(
          `UPDATE tryland_tree_donations 
           SET status = 'rejected', verified_by = $1, verified_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [adminId, id]
        );

        return res.json({
          success: true,
          message: 'Tree donation rejected.',
          status: 'rejected',
        });
      }
    } else if (type === 'tryland') {
      const sponRes = await db.query('SELECT * FROM tryland_sponsorships WHERE id = $1', [id]);
      if (sponRes.rows.length === 0) {
        return res.status(404).json({ error: 'Sponsorship payment not found' });
      }

      const spon = sponRes.rows[0];
      if (spon.status === 'verified') {
        return res.status(400).json({ error: 'Payment is already verified and counted toward totals' });
      }

      if (action === 'approve') {
        // 1. Mark sponsorship as verified
        await db.query(
          `UPDATE tryland_sponsorships 
           SET status = 'verified', verified_by = $1, verified_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [adminId, id]
        );

        // 2. Increment request amount_funded & update status
        const reqRes = await db.query('SELECT * FROM tryland_requests WHERE id = $1', [spon.request_id]);
        if (reqRes.rows.length > 0) {
          const reqData = reqRes.rows[0];
          const newFunded = Number(reqData.amount_funded) + Number(spon.amount);
          const newStatus = newFunded >= Number(reqData.amount_requested) ? 'fully_funded' : 'partially_funded';

          await db.query(
            'UPDATE tryland_requests SET amount_funded = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [newFunded, newStatus, spon.request_id]
          );
        }

        return res.json({
          success: true,
          message: '🌳RYLAND sponsorship verified successfully. Student bill funding progress updated.',
          status: 'verified',
        });
      } else {
        // Reject
        await db.query(
          `UPDATE tryland_sponsorships 
           SET status = 'rejected', rejection_reason = $1, verified_by = $2, verified_at = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          [rejection_reason || 'Bank transfer verification failed', adminId, id]
        );

        return res.json({
          success: true,
          message: 'Sponsorship payment rejected. Totals remain unchanged.',
          status: 'rejected',
        });
      }
    } else {
      // type === 'donate'
      const donRes = await db.query('SELECT * FROM donations WHERE id = $1', [id]);
      if (donRes.rows.length === 0) {
        return res.status(404).json({ error: 'Donation payment not found' });
      }

      const don = donRes.rows[0];
      if (don.status === 'verified') {
        return res.status(400).json({ error: 'Donation is already verified and counted toward campaign totals' });
      }

      if (action === 'approve') {
        // 1. Mark donation as verified
        await db.query(
          `UPDATE donations 
           SET status = 'verified', verified_by = $1, verified_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [adminId, id]
        );

        // 2. Increment campaign amount_raised & update status
        const campRes = await db.query('SELECT * FROM donate_campaigns WHERE id = $1', [don.campaign_id]);
        if (campRes.rows.length > 0) {
          const camp = campRes.rows[0];
          const newRaised = Number(camp.amount_raised) + Number(don.amount);
          const newStatus = newRaised >= Number(camp.target_amount) ? 'completed' : 'active';

          await db.query(
            'UPDATE donate_campaigns SET amount_raised = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [newRaised, newStatus, don.campaign_id]
          );
        }

        return res.json({
          success: true,
          message: 'SPR Donate contribution verified successfully. Campaign funding progress updated.',
          status: 'verified',
        });
      } else {
        // Reject
        await db.query(
          `UPDATE donations 
           SET status = 'rejected', rejection_reason = $1, verified_by = $2, verified_at = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          [rejection_reason || 'Bank transfer verification failed', adminId, id]
        );

        return res.json({
          success: true,
          message: 'Donation payment rejected. Campaign totals remain unchanged.',
          status: 'rejected',
        });
      }
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

export default router;
