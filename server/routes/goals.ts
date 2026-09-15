import express from 'express';
import { getDb } from '../services/db';

const router = express.Router();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const result = await db.query('SELECT * FROM goals WHERE user_id = $1 ORDER BY "targetDate" ASC', [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, targetAmount, currentAmount, targetDate, description, status } = req.body;
    if (!name || targetAmount === undefined || !targetDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = generateId();
    const now = new Date().toISOString();
    const db = getDb();

    await db.query(
      `INSERT INTO goals (id, user_id, name, "targetAmount", "currentAmount", "targetDate", description, status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, userId, name, targetAmount, currentAmount || 0, targetDate, description || '', status || 'active', now, now]
    );

    const result = await db.query('SELECT * FROM goals WHERE id = $1 AND user_id = $2', [id, userId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, targetAmount, currentAmount, targetDate, description, status } = req.body;
    const db = getDb();

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(name); }
    if (targetAmount !== undefined) { fields.push(`"targetAmount" = $${paramIndex++}`); values.push(targetAmount); }
    if (currentAmount !== undefined) { fields.push(`"currentAmount" = $${paramIndex++}`); values.push(currentAmount); }
    if (targetDate !== undefined) { fields.push(`"targetDate" = $${paramIndex++}`); values.push(targetDate); }
    if (description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(description); }
    if (status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(status); }

    if (fields.length === 0) return res.json({ message: 'No updates provided' });

    fields.push(`"updatedAt" = $${paramIndex++}`);
    values.push(new Date().toISOString());
    
    values.push(id, userId);
    
    const query = `UPDATE goals SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex}`;
    
    const result = await db.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Goal not found or not owned by user' });
    }
    
    res.json({ message: 'Updated successfully' });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const result = await db.query('DELETE FROM goals WHERE id = $1 AND user_id = $2', [id, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Goal not found or not owned by user' });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
