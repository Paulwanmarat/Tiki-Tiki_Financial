import express from 'express';
import { getDb } from '../services/db';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const result = await db.query('SELECT key, value FROM settings WHERE user_id = $1', [userId]);
    
    // Return as a key-value object
    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const settings = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const db = getDb();
    
    // Begin transaction for safety, though single queries per key is fine
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          `INSERT INTO settings (key, user_id, value) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (key, user_id) 
           DO UPDATE SET value = EXCLUDED.value`,
          [key, userId, String(value)]
        );
      }
      
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
