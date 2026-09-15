import express from 'express';
import { getDb } from '../services/db';

const router = express.Router();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    
    // Parse query options
    const type = req.query.type as string;
    const categoryId = req.query.categoryId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    let queryStr = 'SELECT * FROM transactions WHERE user_id = $1';
    const params: any[] = [userId];
    
    if (type) {
      params.push(type);
      queryStr += ` AND type = $${params.length}`;
    }
    if (categoryId) {
      params.push(categoryId);
      queryStr += ` AND "categoryId" = $${params.length}`;
    }
    if (startDate) {
      params.push(startDate);
      queryStr += ` AND date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      queryStr += ` AND date <= $${params.length}`;
    }

    queryStr += ` ORDER BY date DESC`;

    const result = await db.query(queryStr, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/transactions
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { type, amount, categoryId, description, date } = req.body;
    if (!type || amount === undefined || !categoryId || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = generateId();
    const now = new Date().toISOString();
    const db = getDb();

    await db.query(
      `INSERT INTO transactions (id, user_id, type, amount, "categoryId", description, date, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, userId, type, amount, categoryId, description || '', date, now, now]
    );

    const result = await db.query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [id, userId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/transactions/:id
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { type, amount, categoryId, description, date } = req.body;
    const db = getDb();

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (type !== undefined) { fields.push(`type = $${paramIndex++}`); values.push(type); }
    if (amount !== undefined) { fields.push(`amount = $${paramIndex++}`); values.push(amount); }
    if (categoryId !== undefined) { fields.push(`"categoryId" = $${paramIndex++}`); values.push(categoryId); }
    if (description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(description); }
    if (date !== undefined) { fields.push(`date = $${paramIndex++}`); values.push(date); }

    if (fields.length === 0) return res.json({ message: 'No updates provided' });

    fields.push(`"updatedAt" = $${paramIndex++}`);
    values.push(new Date().toISOString());
    
    values.push(id, userId);
    
    const query = `UPDATE transactions SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex}`;
    
    const result = await db.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transaction not found or not owned by user' });
    }
    
    res.json({ message: 'Updated successfully' });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const result = await db.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transaction not found or not owned by user' });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
