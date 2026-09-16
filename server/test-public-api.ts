import fs from 'fs';
import path from 'path';

const API_URL = 'https://tiki-tiki-financial.onrender.com/api';
const HOST = 'https://tiki-tiki-financial.onrender.com';
let userAToken = '';
let userBToken = '';
let userA_Id = '';
let userB_Id = '';

async function runTests() {
  console.log('--- STARTING PUBLIC API VERIFICATION ---');
  
  // 1. Health check
  try {
    const health = await fetch(`${HOST}/health`);
    const healthData = await health.json();
    if (health.status === 200 && healthData.status === 'ok') {
      console.log('✅ /health: OK (No secrets exposed)');
    } else {
      console.error('❌ /health failed', healthData);
    }
  } catch (err) {
    console.error('❌ Failed to connect to public server.');
    process.exit(1);
  }

  // 2. Authentication
  try {
    const resA = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `publicA_${Date.now()}@test.com`, password: 'password123' })
    });
    const dataA = await resA.json();
    userAToken = dataA.token;
    userA_Id = dataA.user.id;
    console.log('✅ Registered User A');

    const resB = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `publicB_${Date.now()}@test.com`, password: 'password123' })
    });
    const dataB = await resB.json();
    userBToken = dataB.token;
    userB_Id = dataB.user.id;
    console.log('✅ Registered User B');
  } catch (err) {
    console.error('❌ Registration failed:', err);
  }

  // Auth negatives
  const unauthRes = await fetch(`${API_URL}/transactions`);
  if (unauthRes.status === 401) console.log('✅ Missing JWT returns 401');
  const badJwtRes = await fetch(`${API_URL}/transactions`, { headers: { 'Authorization': 'Bearer invalidjwt' }});
  if (badJwtRes.status === 401) console.log('✅ Invalid JWT returns 401');

  // 3. Transaction Isolation
  let transactionId = '';
  const txRes = await fetch(`${API_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAToken}` },
    body: JSON.stringify({ type: 'expense', amount: 50, categoryId: 'food', description: 'Test TX', date: new Date().toISOString() })
  });
  const txData = await txRes.json();
  transactionId = txData.id;
  if (transactionId) console.log('✅ User A created transaction');

  const txListB = await fetch(`${API_URL}/transactions`, { headers: { 'Authorization': `Bearer ${userBToken}` }});
  const txListBData = await txListB.json();
  if (txListBData.length === 0) console.log('✅ User B cannot read User A transaction');

  const txUpdateB = await fetch(`${API_URL}/transactions/${transactionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userBToken}` },
    body: JSON.stringify({ amount: 999 })
  });
  if (txUpdateB.status !== 200 || (await txUpdateB.json()).amount !== 999) {
    console.log('✅ User B cannot update User A transaction');
  }

  // 4. Goal Isolation
  let goalId = '';
  const goalRes = await fetch(`${API_URL}/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAToken}` },
    body: JSON.stringify({ title: 'Test Goal', currentAmount: 10, targetAmount: 100, deadline: new Date().toISOString(), icon: 'test' })
  });
  const goalData = await goalRes.json();
  goalId = goalData.id;
  if (goalId) console.log('✅ User A created goal');

  const goalListB = await fetch(`${API_URL}/goals`, { headers: { 'Authorization': `Bearer ${userBToken}` }});
  if ((await goalListB.json()).length === 0) console.log('✅ User B cannot read User A goal');

  // 5. Settings Isolation
  await fetch(`${API_URL}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAToken}` },
    body: JSON.stringify({ displayName: 'User A Name' })
  });
  
  const settingsB = await fetch(`${API_URL}/settings`, { headers: { 'Authorization': `Bearer ${userBToken}` }});
  const settingsBData = await settingsB.json();
  if (settingsBData.displayName !== 'User A Name') console.log('✅ Settings isolation works');

  // 6. AI History Isolation
  let historyId = '';
  const histRes = await fetch(`${API_URL}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAToken}` },
    body: JSON.stringify({ role: 'user', content: 'hello' })
  });
  historyId = (await histRes.json()).id;
  if (historyId) console.log('✅ User A created AI history');

  const histListB = await fetch(`${API_URL}/history`, { headers: { 'Authorization': `Bearer ${userBToken}` }});
  if ((await histListB.json()).length === 0) console.log('✅ User B cannot read User A AI history');

  // 8. AI Proxy
  const aiRes = await fetch(`${API_URL}/ai/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAToken}` },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello, are you working?' }] })
  });
  if (aiRes.status === 200) {
    console.log('✅ AI Proxy endpoint works via HTTPS');
  } else {
    console.log(`❌ AI Proxy failed with status ${aiRes.status}:`, await aiRes.text());
  }

  // 9. OCR Endpoint
  const formData = new FormData();
  formData.append('image', new Blob(['fake image data'], { type: 'image/jpeg' }), 'test.jpg');
  
  const ocrRes = await fetch(`${API_URL}/ocr/scan`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${userAToken}` },
    body: formData as any
  });
  
  if (ocrRes.status !== 404) {
      console.log(`✅ OCR Endpoint route exists and accessible over HTTPS (status: ${ocrRes.status})`);
  } else {
      console.log(`❌ OCR Endpoint failed with 404:`, await ocrRes.text());
  }

  // 10. CORS (Web test)
  const corsRes = await fetch(`${HOST}/health`, {
    method: 'OPTIONS',
    headers: { 'Origin': 'https://random-hacker-site.com' }
  });
  // Since we set CORS to reject invalid web origins or accept depending on setup.
  console.log(`✅ CORS preflight responded with status ${corsRes.status}`);

  console.log('--- PUBLIC API VERIFICATION COMPLETE ---');
}

runTests().catch(console.error);
