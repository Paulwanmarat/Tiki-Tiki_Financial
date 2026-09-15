

const API_URL = 'http://localhost:3000/api';
let userAToken = '';
let userBToken = '';
let userA_Id = '';
let userB_Id = '';

async function runTests() {
  console.log('--- STARTING API VERIFICATION ---');
  
  // 1. Health check
  try {
    const health = await fetch('http://localhost:3000/health');
    const healthData = await health.json();
    console.log('✅ /health:', healthData);
  } catch (err) {
    console.error('❌ Failed to connect to server. Is it running?');
    process.exit(1);
  }

  // 2. Registration (User A and User B)
  try {
    const resA = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `testA_${Date.now()}@test.com`, password: 'password123' })
    });
    const dataA = await resA.json();
    userAToken = dataA.token;
    userA_Id = dataA.user.id;
    console.log('✅ Registered User A:', userA_Id);

    const resB = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `testB_${Date.now()}@test.com`, password: 'password123' })
    });
    const dataB = await resB.json();
    userBToken = dataB.token;
    userB_Id = dataB.user.id;
    console.log('✅ Registered User B:', userB_Id);
  } catch (err) {
    console.error('❌ Registration failed:', err);
  }

  // 3. Unauthenticated request rejected
  try {
    const unauthRes = await fetch(`${API_URL}/transactions`);
    if (unauthRes.status === 401) {
      console.log('✅ Unauthenticated requests correctly rejected (401)');
    } else {
      console.error('❌ Unauthenticated request was NOT rejected. Status:', unauthRes.status);
    }
  } catch (err) {
    console.error('❌ Failed testing unauthenticated access');
  }

  // 4. Authenticated API Access & Isolation (User A creates a transaction)
  let transactionId = '';
  try {
    const txRes = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        type: 'expense',
        amount: 50,
        categoryId: 'food',
        description: 'Test isolation',
        date: new Date().toISOString()
      })
    });
    const txData = await txRes.json();
    transactionId = txData.id;
    if (transactionId) {
      console.log('✅ User A successfully created a transaction:', transactionId);
    }
  } catch (err) {
    console.error('❌ Failed creating transaction:', err);
  }

  // 5. User A cannot access User B data (and vice versa)
  try {
    const txListRes = await fetch(`${API_URL}/transactions`, {
      headers: { 'Authorization': `Bearer ${userBToken}` }
    });
    const txList = await txListRes.json();
    if (txList.length === 0) {
      console.log('✅ User B cannot see User A data (empty list)');
    } else {
      console.error('❌ Isolation failed. User B saw data:', txList);
    }
  } catch (err) {
    console.error('❌ Failed testing data isolation:', err);
  }

  // 6. User B cannot modify User A data
  try {
    await fetch(`${API_URL}/transactions/${transactionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userBToken}`
      },
      body: JSON.stringify({ amount: 100 })
    });
    
    const verifyRes = await fetch(`${API_URL}/transactions`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    const verifyList = await verifyRes.json();
    const theTx = verifyList.find((t: any) => t.id === transactionId);
    
    if (theTx && theTx.amount === 50) {
      console.log('✅ User B failed to modify User A data.');
    } else {
      console.error('❌ Isolation failed. Data was modified!');
    }
  } catch (err) {
    console.error('❌ Failed testing unauthorized modification:', err);
  }

  console.log('--- API VERIFICATION COMPLETE ---');
}

runTests();
