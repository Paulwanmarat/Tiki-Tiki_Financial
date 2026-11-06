import express, { Request, Response } from 'express';
import { getDb } from '../services/db';
import { requireAuth, requireAdmin, requireOwner, OWNER_EMAIL } from './auth';

const router = express.Router();

function generateLogId(): string {
  return 'log_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// ─── GET /api/admin/users (List users for admin review) ──────────────────────
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { search, role } = req.query;
    const db = getDb();

    const conditions: string[] = [];
    const values: any[] = [];
    let pIdx = 1;

    if (search && typeof search === 'string' && search.trim()) {
      conditions.push(`(LOWER(email) LIKE $${pIdx} OR LOWER(COALESCE(username, '')) LIKE $${pIdx})`);
      values.push(`%${search.trim().toLowerCase()}%`);
      pIdx++;
    }

    if (role && typeof role === 'string' && role !== 'all') {
      if (role === 'owner') {
        conditions.push(`LOWER(email) = LOWER($${pIdx++})`);
        values.push(OWNER_EMAIL);
      } else {
        conditions.push(`role = $${pIdx++}`);
        values.push(role);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id, 
        email, 
        username, 
        CASE WHEN LOWER(email) = LOWER('${OWNER_EMAIL}') THEN 'owner' ELSE COALESCE(role, 'user') END as role,
        email_verified,
        "createdAt" as created_at
      FROM users
      ${whereClause}
      ORDER BY 
        CASE WHEN LOWER(email) = LOWER('${OWNER_EMAIL}') THEN 0 WHEN role = 'admin' THEN 1 ELSE 2 END,
        "createdAt" DESC
      LIMIT 100
    `;

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── POST /api/admin/users/assign-role (Assign or Revoke Admin Role) ─────────
// CRITICAL SECURITY RULE: Only the Application Owner (paulwanmarat@gmail.com) can call this!
router.post('/assign-role', requireAuth, requireOwner, async (req: Request, res: Response) => {
  try {
    const actorId = req.user?.id;
    const actorEmail = req.user?.email || OWNER_EMAIL;
    const { email, role } = req.body;

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Valid target user email is required' });
    }

    const normalizedTargetEmail = email.trim().toLowerCase();

    // 1. Guard: The application owner is immutable and cannot be modified or demoted
    if (normalizedTargetEmail === OWNER_EMAIL.toLowerCase()) {
      return res.status(403).json({
        error: 'Forbidden: Cannot modify role of the permanent Application Owner (paulwanmarat@gmail.com).'
      });
    }

    // 2. Guard: Allowed roles are strictly 'admin' or 'user'
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be either "admin" or "user".' });
    }

    const db = getDb();

    // 3. Find the target user in the database
    const userRes = await db.query('SELECT id, email, username, role FROM users WHERE LOWER(email) = $1', [normalizedTargetEmail]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        error: `User with email "${normalizedTargetEmail}" has not registered on SPR yet. They must register first before receiving admin privileges.`
      });
    }

    const targetUser = userRes.rows[0];

    // 4. Update role securely
    await db.query(
      'UPDATE users SET role = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
      [role, targetUser.id]
    );

    // 5. Audit log this security privilege escalation / de-escalation
    const logId = generateLogId();
    const actionDesc = role === 'admin' ? 'PROMOTED_TO_ADMIN' : 'REVOKED_ADMIN_PRIVILEGES';
    const logDetails = `Application Owner (${actorEmail}) changed role of ${normalizedTargetEmail} to "${role}"`;

    await db.query(
      `INSERT INTO admin_audit_logs (id, actor_id, actor_email, action, target_email, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [logId, actorId, actorEmail, actionDesc, normalizedTargetEmail, logDetails]
    );

    res.json({
      success: true,
      message: `Security role updated: ${normalizedTargetEmail} is now ${role === 'admin' ? 'an Administrator' : 'a standard User'}.`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        username: targetUser.username,
        role,
      },
    });
  } catch (error) {
    console.error('Error assigning user role:', error);
    res.status(500).json({ error: 'Failed to assign user role' });
  }
});

// ─── GET /api/admin/users/audit-logs (Security Audit Trail) ──────────────────
router.get('/audit-logs', requireAuth, requireOwner, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = await db.query(`
      SELECT * FROM admin_audit_logs 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching admin audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;

