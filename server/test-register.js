require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // 1. Delete existing
  await pool.query('DELETE FROM users WHERE email = $1', ['spr.app2026@gmail.com']);
  console.log('User deleted');

  // 2. Register
  const res = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'spr.app2026@gmail.com', password: 'SPRHackathon123!' })
  });
  
  const data = await res.json();
  console.log('Register response:', data);

  // 3. Verify DB state
  const { rows } = await pool.query('SELECT email_verified, verification_token_hash FROM users WHERE email = $1', ['spr.app2026@gmail.com']);
  console.log('DB State:', rows[0]);
  
  process.exit(0);
}

run().catch(console.error);
