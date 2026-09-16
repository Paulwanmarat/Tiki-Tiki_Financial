import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { getDb } from '../services/db';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

if (process.env.CLOUDINARY_URL) {
  cloudinary.config();
}

router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const result = await db.query(
      'SELECT id, email, username, email_verified, avatar_url FROM users WHERE id = $1',
      [userId]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { username } = req.body;

    if (username !== undefined) {
      if (username !== null) {
        if (typeof username !== 'string') {
          return res.status(400).json({ error: 'Username must be a string' });
        }
        const trimmed = username.trim();
        if (trimmed.length < 3 || trimmed.length > 20) {
          return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
          return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
        }

        const db = getDb();
        const duplicateCheck = await db.query(
          'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
          [trimmed, userId]
        );
        if (duplicateCheck.rows.length > 0) {
          return res.status(409).json({ error: 'Username is already taken' });
        }
        
        const result = await db.query(
          'UPDATE users SET username = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, username, email_verified, avatar_url',
          [trimmed, userId]
        );
        return res.json({ user: result.rows[0], message: 'Profile updated successfully' });
      } else {
        // Allow setting username to null
        const db = getDb();
        const result = await db.query(
          'UPDATE users SET username = NULL, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, email, username, email_verified, avatar_url',
          [userId]
        );
        return res.json({ user: result.rows[0], message: 'Profile updated successfully' });
      }
    }

    res.status(400).json({ error: 'No fields to update' });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/avatar', upload.single('image'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    if (!process.env.CLOUDINARY_URL) {
      return res.status(500).json({ error: 'Cloudinary is not configured on the server' });
    }

    const uploadToCloudinary = (buffer: Buffer): Promise<any> => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'spr-app-avatars' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(buffer);
      });
    };

    const result = await uploadToCloudinary(req.file.buffer);
    const avatarUrl = result.secure_url;

    const db = getDb();
    const updateResult = await db.query(
      'UPDATE users SET avatar_url = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, username, email_verified, avatar_url',
      [avatarUrl, userId]
    );

    res.json({ message: 'Profile picture updated', user: updateResult.rows[0] });
  } catch (error: any) {
    console.error('Avatar Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

router.delete('/avatar', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const result = await db.query(
      'UPDATE users SET avatar_url = NULL, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, email, username, email_verified, avatar_url',
      [userId]
    );

    res.json({ message: 'Profile picture removed', user: result.rows[0] });
  } catch (error) {
    console.error('Avatar Remove Error:', error);
    res.status(500).json({ error: 'Failed to remove profile picture' });
  }
});

export default router;
