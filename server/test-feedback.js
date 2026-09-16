require('dotenv').config();
const { Pool } = require('pg');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4NDVlYzgxLTBkZjctNDlhNC1iMjhjLWJiNTMyYzg5ZTlmMSIsImVtYWlsIjoic3ByLmFwcDIwMjZAZ21haWwuY29tIiwiaWF0IjoxNzg5NTY2OTk5LCJleHAiOjE3OTAxNzE3OTl9.9KQluJoP-EN_3RS73kJRnHun2qlbPg0J3C-C3qM_D3k';

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // 1. Submit anonymous web feedback
  console.log('Submitting anonymous feedback...');
  const res1 = await fetch('http://localhost:3000/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      type: 'feature', 
      message: 'Great app! Please add dark mode.', 
      contact_email: 'anonymous@example.com',
      platform: 'web',
      app_version: 'landing'
    })
  });
  console.log('Anonymous Feedback Status:', res1.status, await res1.json());

  // 2. Submit authenticated mobile feedback
  console.log('\nSubmitting authenticated mobile feedback...');
  const res2 = await fetch('http://localhost:3000/api/feedback', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({ 
      type: 'bug', 
      message: 'The app crashes when I tap the back button quickly.', 
      rating: 4,
      platform: 'mobile',
      app_version: '1.0.0'
    })
  });
  console.log('Authenticated Feedback Status:', res2.status, await res2.json());

  // 3. Verify DB state
  console.log('\nQuerying feedback table in database...');
  const { rows } = await pool.query('SELECT * FROM feedback ORDER BY created_at DESC LIMIT 2');
  console.log('Recent Feedback Entries:', JSON.stringify(rows, null, 2));
  
  process.exit(0);
}

run().catch(console.error);
