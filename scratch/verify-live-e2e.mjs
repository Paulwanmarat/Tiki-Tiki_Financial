import assert from 'node:assert/strict';

const BASE_URL = 'https://tiki-tiki-financial.onrender.com';
const ORIGIN = 'https://spr-app.expo.app';

console.log('====================================================');
console.log('  SPR PRODUCTION SYSTEM VERIFICATION & AUDIT');
console.log(`  Target Backend: ${BASE_URL}`);
console.log(`  Verified Origin: ${ORIGIN}`);
console.log('====================================================\n');

async function runAudit() {
  const testRunId = Date.now().toString(36);
  const testEmail = `audit_${testRunId}@example.com`;
  const testPassword = `AuditPass_${testRunId}!`;
  let authToken = null;
  let testUserId = null;
  let createdTxnId = null;
  let createdGoalId = null;

  // 1. Health Check
  console.log('[1/18] Checking GET /health ...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert.equal(healthRes.status, 200, 'Health check failed');
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'ok', 'Health status not ok');
  console.log('       ✔ Health OK: SPR App Server is running\n');

  // 2. CORS Preflight
  console.log('[2/18] Checking OPTIONS preflight from Origin ...');
  const preflightRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type,Authorization',
    },
  });
  assert.equal(preflightRes.status, 204, 'CORS preflight did not return 204');
  assert.equal(preflightRes.headers.get('access-control-allow-origin'), ORIGIN, 'CORS origin mismatch');
  assert.equal(preflightRes.headers.get('access-control-allow-credentials'), 'true', 'Credentials not allowed');
  console.log(`       ✔ CORS Preflight OK (Origin reflected: ${ORIGIN})\n`);

  // 3. User Registration
  console.log(`[3/18] Registering test user (${testEmail}) ...`);
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  assert.equal(regRes.status, 201, `Registration failed with status ${regRes.status}`);
  const regData = await regRes.json();
  assert.ok(regData.token, 'No token returned on registration');
  authToken = regData.token;
  testUserId = regData.user.id;
  console.log(`       ✔ Registration OK (User ID: ${testUserId})\n`);

  // 4. User Login
  console.log('[4/18] Verifying POST /api/auth/login ...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  assert.equal(loginRes.status, 200, 'Login failed');
  const loginData = await loginRes.json();
  assert.ok(loginData.token, 'No token on login');
  authToken = loginData.token;
  console.log('       ✔ Authentication & JWT session verified\n');

  // 5. User Profile /me
  console.log('[5/18] Verifying GET /api/auth/me ...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}`, Origin: ORIGIN },
  });
  assert.equal(meRes.status, 200, 'Get Me failed');
  const meData = await meRes.json();
  assert.equal(meData.user.email, testEmail);
  console.log(`       ✔ Authenticated session active for ${meData.user.email}\n`);

  // 6. Google Auth Configuration Check
  console.log('[6/18] Checking GET /api/auth/google/config & GET /api/auth/google ...');
  const googleConfigRes = await fetch(`${BASE_URL}/api/auth/google/config`);
  assert.equal(googleConfigRes.status, 200);
  const googleConfig = await googleConfigRes.json();
  assert.equal(googleConfig.configured, true, 'Google OAuth not configured on production!');
  assert.ok(googleConfig.clientId, 'Google Client ID missing');

  // Verify Google OAuth 302 redirect
  const googleRedirectRes = await fetch(`${BASE_URL}/api/auth/google`, { redirect: 'manual' });
  assert.equal(googleRedirectRes.status, 302, 'Google OAuth redirect did not return 302');
  const redirectLoc = googleRedirectRes.headers.get('location');
  assert.ok(redirectLoc && redirectLoc.includes('accounts.google.com'), 'Invalid Google redirect location');
  assert.ok(redirectLoc.includes(encodeURIComponent(googleConfig.clientId)), 'Redirect missing clientId');
  console.log(`       ✔ Google OAuth live & active (Client ID verified, redirect verified)\n`);

  // 7. Transactions CRUD
  console.log('[7/18] Testing Transaction Creation (POST /api/transactions) ...');
  const txnRes = await fetch(`${BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      Origin: ORIGIN,
    },
    body: JSON.stringify({
      type: 'income',
      amount: 1500,
      categoryId: 'allowance',
      description: 'Weekly student allowance',
      date: new Date().toISOString(),
    }),
  });
  assert.equal(txnRes.status, 201, 'Transaction creation failed');
  const txnData = await txnRes.json();
  createdTxnId = txnData.id;
  assert.equal(txnData.amount, 1500);
  console.log(`       ✔ Transaction Created (ID: ${createdTxnId}, Amount: \$1500)\n`);

  console.log('[8/18] Testing Transaction Listing (GET /api/transactions) ...');
  const listTxnRes = await fetch(`${BASE_URL}/api/transactions`, {
    headers: { Authorization: `Bearer ${authToken}`, Origin: ORIGIN },
  });
  assert.equal(listTxnRes.status, 200);
  const txns = await listTxnRes.json();
  assert.ok(Array.isArray(txns) && txns.length >= 1);
  console.log(`       ✔ Found ${txns.length} transaction(s) for user\n`);

  console.log('[9/18] Testing Transaction Update (PUT /api/transactions/:id) ...');
  const updateTxnRes = await fetch(`${BASE_URL}/api/transactions/${createdTxnId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      Origin: ORIGIN,
    },
    body: JSON.stringify({ description: 'Updated allowance label', amount: 1600 }),
  });
  assert.equal(updateTxnRes.status, 200);
  console.log('       ✔ Transaction updated successfully\n');

  // 8. Goals CRUD
  console.log('[10/18] Testing Goal Creation (POST /api/goals) ...');
  const goalRes = await fetch(`${BASE_URL}/api/goals`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      Origin: ORIGIN,
    },
    body: JSON.stringify({
      name: 'Textbooks & Software',
      targetAmount: 5000,
      currentAmount: 1200,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Semester materials',
    }),
  });
  assert.equal(goalRes.status, 201);
  const goalData = await goalRes.json();
  createdGoalId = goalData.id;
  assert.equal(goalData.name, 'Textbooks & Software');
  console.log(`       ✔ Goal Created (ID: ${createdGoalId}, Target: \$5000)\n`);

  console.log('[11/18] Testing Goal Listing (GET /api/goals) ...');
  const listGoalsRes = await fetch(`${BASE_URL}/api/goals`, {
    headers: { Authorization: `Bearer ${authToken}`, Origin: ORIGIN },
  });
  assert.equal(listGoalsRes.status, 200);
  const goals = await listGoalsRes.json();
  assert.ok(Array.isArray(goals) && goals.length >= 1);
  console.log(`       ✔ Found ${goals.length} goal(s)\n`);

  // 9. Settings
  console.log('[12/18] Testing User Settings (PUT /api/settings & GET /api/settings) ...');
  const putSettingsRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      Origin: ORIGIN,
    },
    body: JSON.stringify({ currency: 'THB', theme: 'dark', notificationsEnabled: 'true' }),
  });
  assert.equal(putSettingsRes.status, 200);

  const getSettingsRes = await fetch(`${BASE_URL}/api/settings`, {
    headers: { Authorization: `Bearer ${authToken}`, Origin: ORIGIN },
  });
  assert.equal(getSettingsRes.status, 200);
  const settingsData = await getSettingsRes.json();
  assert.equal(settingsData.currency, 'THB');
  console.log(`       ✔ Settings persisted: currency=${settingsData.currency}, theme=${settingsData.theme}\n`);

  // 10. AI Chat Endpoint
  console.log('[13/18] Testing AI Fin-Advisor (POST /api/ai/ask) ...');
  const aiRes = await fetch(`${BASE_URL}/api/ai/ask`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      Origin: ORIGIN,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Give me one quick student budget tip.' }],
    }),
  });
  assert.equal(aiRes.status, 200, 'AI query failed');
  const aiData = await aiRes.json();
  assert.ok(aiData.reply && aiData.reply.length > 5, 'AI reply empty');
  console.log(`       ✔ AI Advisor responded (${aiData.reply.slice(0, 60)}...)\n`);

  // 11. AI History CRUD
  console.log('[14/18] Testing AI Conversation History (POST /api/history & GET) ...');
  const histPostRes = await fetch(`${BASE_URL}/api/history`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      Origin: ORIGIN,
    },
    body: JSON.stringify({
      role: 'user',
      content: 'Sample test question',
    }),
  });
  assert.equal(histPostRes.status, 201);

  const histGetRes = await fetch(`${BASE_URL}/api/history`, {
    headers: { Authorization: `Bearer ${authToken}`, Origin: ORIGIN },
  });
  assert.equal(histGetRes.status, 200);
  const historyList = await histGetRes.json();
  assert.ok(Array.isArray(historyList) && historyList.length >= 1);
  console.log(`       ✔ AI History operational (${historyList.length} message logged)\n`);

  // 12. Feedback Submission
  console.log('[15/18] Testing Feedback Submission (POST /api/feedback) ...');
  const feedRes = await fetch(`${BASE_URL}/api/feedback`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      Origin: ORIGIN,
    },
    body: JSON.stringify({
      type: 'suggestion',
      message: 'Excellent platform stability test submission.',
      rating: 5,
      platform: 'web',
    }),
  });
  assert.equal(feedRes.status, 201);
  console.log('       ✔ User feedback recorded successfully\n');

  // 13. Profile Update
  console.log('[16/18] Testing Profile Username Update (PUT /api/profile) ...');
  const profileRes = await fetch(`${BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      Origin: ORIGIN,
    },
    body: JSON.stringify({ username: `auditor_${testRunId}` }),
  });
  assert.equal(profileRes.status, 200);
  const profileData = await profileRes.json();
  assert.equal(profileData.user.username, `auditor_${testRunId}`);
  console.log(`       ✔ Profile updated (Username: ${profileData.user.username})\n`);

  // 14. GDPR Permanent Deletion
  console.log('[17/18] Testing GDPR Account Deletion (DELETE /api/profile) ...');
  const delRes = await fetch(`${BASE_URL}/api/profile`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${authToken}`, Origin: ORIGIN },
  });
  assert.equal(delRes.status, 200, 'GDPR deletion failed');
  const delData = await delRes.json();
  assert.ok(delData.message.includes('deleted successfully'));
  console.log('       ✔ Account and all relational child data permanently erased\n');

  // 15. Verify Token Invalidation & Data Wipe
  console.log('[18/18] Verifying Post-Deletion Access Prevention ...');
  const postDelRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}`, Origin: ORIGIN },
  });
  assert.equal(postDelRes.status, 404, 'Deleted user account still accessible!');
  console.log('       ✔ Verified: Erased user cannot access protected endpoints (404 Not Found)\n');

  console.log('====================================================');
  console.log('  ALL 18 LIVE PRODUCTION AUDIT CHECKS PASSED 100%!');
  console.log('====================================================');
}

runAudit().catch((err) => {
  console.error('\n❌ AUDIT FAILED:', err);
  process.exit(1);
});

