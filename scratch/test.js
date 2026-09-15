

const API_URL = 'http://localhost:3000/api';
let userA = { email: 'userA@example.com', password: 'password123', token: '', id: '' };
let userB = { email: 'userB@example.com', password: 'password123', token: '', id: '' };

async function runTests() {
  console.log('--- STARTING BACKEND TESTS ---');
  
  // 1. Register User A
  console.log('\\n1. Register User A');
  let res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userA.email, password: userA.password })
  });
  let data = await res.json();
  if (res.ok) {
    console.log('✅ User A registered successfully:', data.user.id);
    userA.token = data.token;
    userA.id = data.user.id;
  } else if (res.status === 409) {
    console.log('User A already exists, logging in instead...');
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userA.email, password: userA.password })
    });
    data = await res.json();
    userA.token = data.token;
    userA.id = data.user.id;
    console.log('✅ User A logged in:', userA.id);
  } else {
    console.error('❌ Failed to register User A:', data);
    return;
  }

  // 2. Register User B
  console.log('\\n2. Register User B');
  res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userB.email, password: userB.password })
  });
  data = await res.json();
  if (res.ok) {
    console.log('✅ User B registered successfully:', data.user.id);
    userB.token = data.token;
    userB.id = data.user.id;
  } else if (res.status === 409) {
    console.log('User B already exists, logging in instead...');
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userB.email, password: userB.password })
    });
    data = await res.json();
    userB.token = data.token;
    userB.id = data.user.id;
    console.log('✅ User B logged in:', userB.id);
  } else {
    console.error('❌ Failed to register User B:', data);
    return;
  }

  // 3. Test Protected Route without JWT
  console.log('\\n3. Access Protected AI Route (No JWT)');
  res = await fetch(`${API_URL}/ai/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{role: 'user', content: 'hello'}] })
  });
  if (res.status === 401) {
    console.log('✅ Protected AI route correctly rejected unauthenticated request');
  } else {
    console.error(`❌ Expected 401, got ${res.status}`);
  }

  // 4. Test Protected Route with JWT (User A)
  console.log('\\n4. Access Protected AI Route (With User A JWT)');
  res = await fetch(`${API_URL}/ai/ask`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userA.token}`
    },
    body: JSON.stringify({ messages: [{role: 'user', content: 'What is 1+1?'}] })
  });
  data = await res.json();
  if (res.ok && data.reply) {
    console.log('✅ AI responded to authenticated request:', data.reply.substring(0, 50) + '...');
  } else {
    console.error(`❌ AI request failed:`, data);
  }

  console.log('\\n--- TESTS COMPLETE ---');
}

runTests().catch(console.error);
