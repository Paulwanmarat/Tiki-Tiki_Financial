import express from 'express';
import { getDb } from '../services/db';

const router = express.Router();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// GET /api/history
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const result = await db.query('SELECT * FROM ai_history WHERE user_id = $1 ORDER BY timestamp ASC', [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching AI history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/history
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { role, content, contextSnapshot, timestamp } = req.body;
    if (!role || !content) {
      return res.status(400).json({ error: 'Role and content are required' });
    }

    const id = generateId();
    const ts = timestamp || new Date().toISOString();
    const db = getDb();

    await db.query(
      `INSERT INTO ai_history (id, user_id, role, content, "contextSnapshot", timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId, role, content, contextSnapshot || null, ts]
    );

    const result = await db.query('SELECT * FROM ai_history WHERE id = $1 AND user_id = $2', [id, userId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving AI history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/history/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const result = await db.query('DELETE FROM ai_history WHERE id = $1 AND user_id = $2', [id, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'History item not found or not owned by user' });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting AI history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
