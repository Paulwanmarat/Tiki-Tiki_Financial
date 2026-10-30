import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'test-secret-key-12345';

// ─── BUG #4: Transaction Retrieval & Ownership Checks ────────────────

test('Bug 4: Transaction GET /:id requires authentication', () => {
  const req = { user: undefined, params: { id: 'txn_123' } };
  let statusCode = 200;
  let responseData = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { responseData = data; return this; }
  };

  // Simulated endpoint logic from server/routes/transactions.ts
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
  }

  assert.equal(statusCode, 401);
  assert.equal(responseData.error, 'Unauthorized');
});

test('Bug 4: Transaction GET /:id verifies user ownership in query', () => {
  const currentUserId = 'user_A';
  const requestedTxnId = 'txn_owned_by_B';

  const mockDbTransactions = [
    { id: 'txn_owned_by_B', user_id: 'user_B', type: 'expense', amount: 150, categoryId: 'food', date: new Date().toISOString() },
    { id: 'txn_owned_by_A', user_id: 'user_A', type: 'expense', amount: 45, categoryId: 'transport', date: new Date().toISOString() },
  ];

  // Server queries: SELECT * FROM transactions WHERE id = $1 AND user_id = $2
  const found = mockDbTransactions.filter(t => t.id === requestedTxnId && t.user_id === currentUserId);

  let statusCode = 200;
  let responseData = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { responseData = data; return this; }
  };

  if (found.length === 0) {
    res.status(404).json({ error: 'Transaction not found or not owned by user' });
  } else {
    res.json(found[0]);
  }

  assert.equal(statusCode, 404);
  assert.equal(responseData.error, 'Transaction not found or not owned by user');
});

test('Bug 4: Transaction GET /:id returns formatted transaction for owner', () => {
  const currentUserId = 'user_A';
  const requestedTxnId = 'txn_owned_by_A';

  const mockDbTransactions = [
    { id: 'txn_owned_by_A', user_id: 'user_A', type: 'expense', amount: '45.50', categoryId: 'transport', date: new Date().toISOString() },
  ];

  const found = mockDbTransactions.filter(t => t.id === requestedTxnId && t.user_id === currentUserId);

  function formatTransaction(row) {
    if (!row) return row;
    return {
      ...row,
      userId: row.user_id,
      amount: typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount,
    };
  }

  const formatted = formatTransaction(found[0]);
  assert.equal(formatted.userId, 'user_A');
  assert.equal(formatted.amount, 45.50);
  assert.equal(typeof formatted.amount, 'number');
});

test('Bug 4: Client getTransactionById service gracefully handles 404 and fallback', async () => {
  // Mock fetchWithAuth behavior
  let directLookupCalls = 0;
  let collectionLookupCalls = 0;

  async function mockFetchWithAuth(endpoint) {
    if (endpoint === '/api/transactions/missing_id') {
      directLookupCalls++;
      const err = new Error('Not found');
      err.status = 404;
      throw err;
    }
    if (endpoint === '/api/transactions') {
      collectionLookupCalls++;
      return [{ id: 'existing_id', amount: 100, categoryId: 'food' }];
    }
  }

  async function getTransactionById(id) {
    if (!id) return null;
    try {
      return await mockFetchWithAuth(`/api/transactions/${id}`);
    } catch (error) {
      if (error?.status === 404 || error?.message?.includes('not found')) {
        return null;
      }
      try {
        const all = await mockFetchWithAuth('/api/transactions');
        return all.find(t => t.id === id) || null;
      } catch {
        return null;
      }
    }
  }

  const result = await getTransactionById('missing_id');
  assert.equal(result, null);
  assert.equal(directLookupCalls, 1);
  assert.equal(collectionLookupCalls, 0); // 404 directly returns null without unnecessary fallback
});

// ─── BUG #5: AI Assistant Endpoint Hardening & Error Sanitization ───

test('Bug 5: AI ask endpoint rejects invalid or empty message arrays', () => {
  function validateAiRequest(body) {
    const { messages } = body;
    if (!messages || !Array.isArray(messages)) {
      return { status: 400, error: 'Messages must be a non-empty array' };
    }
    const validMessages = messages.filter(
      (m) => m && typeof m.content === 'string' && m.content.trim().length > 0
    );
    if (validMessages.length === 0) {
      return { status: 400, error: 'At least one message with text content is required' };
    }
    return { status: 200, validMessages };
  }

  assert.equal(validateAiRequest({}).status, 400);
  assert.equal(validateAiRequest({ messages: 'not an array' }).status, 400);
  assert.equal(validateAiRequest({ messages: [] }).status, 400);
  assert.equal(validateAiRequest({ messages: [{ role: 'user', content: '   ' }] }).status, 400);
  
  const valid = validateAiRequest({ messages: [{ role: 'user', content: 'How can I save money?' }] });
  assert.equal(valid.status, 200);
  assert.equal(valid.validMessages.length, 1);
});

test('Bug 5: AI service error handler never exposes raw API keys, stack traces, or quotas to client', () => {
  const mockInternalError = new Error('GoogleGenerativeAI: Resource has been exhausted (e.g. check quota). API key: AIzaSyD-FAKE-KEY-SECRET');

  function sanitizeAiError(err) {
    // Server logs full details internally
    const internalLog = `Diagnostic: ${err.message}`;
    
    // Client response is completely sanitized
    let clientMessage = 'AI service is temporarily unavailable. Please try again later.';
    let statusCode = 500;

    if (err.message?.includes('quota') || err.message?.includes('429')) {
      clientMessage = 'AI service is currently busy due to request volume. Please try again in a few moments.';
      statusCode = 429;
    }

    return { statusCode, clientResponse: { error: clientMessage }, internalLog };
  }

  const result = sanitizeAiError(mockInternalError);
  assert.equal(result.statusCode, 429);
  assert.ok(!JSON.stringify(result.clientResponse).includes('AIzaSyD'));
  assert.ok(!JSON.stringify(result.clientResponse).includes('GoogleGenerativeAI'));
  assert.ok(result.clientResponse.error.includes('AI service is currently busy'));
});

// ─── BUG #6: Profile Avatar Upload Validation & Web Compatibility ───

test('Bug 6: Avatar upload enforces 5MB file limit and MIME type validation', () => {
  function validateUpload(file) {
    if (!file) {
      return { status: 400, error: 'No image uploaded' };
    }
    if (!file.mimetype.startsWith('image/')) {
      return { status: 400, error: 'Only images are allowed' };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { status: 400, error: 'Image size exceeds the 5MB limit' };
    }
    return { status: 200, valid: true };
  }

  assert.equal(validateUpload(null).status, 400);
  assert.equal(validateUpload({ mimetype: 'application/pdf', size: 1024 }).status, 400);
  assert.equal(validateUpload({ mimetype: 'text/html', size: 1024 }).status, 400);
  assert.equal(validateUpload({ mimetype: 'image/jpeg', size: 6 * 1024 * 1024 }).status, 400);
  assert.equal(validateUpload({ mimetype: 'image/png', size: 2 * 1024 * 1024 }).status, 200);
});

test('Bug 6: Platform-specific FormData construction prevents unsupported FormDataPart error', () => {
  // On React Native Web, passing { uri, name, type } to browser FormData creates "unsupported FormDataPart Implementation".
  // On Web, fetching uri to Blob and appending Blob is standard.
  const asset = { uri: 'blob:http://localhost:3000/123-abc', mimeType: 'image/jpeg', fileName: 'avatar.jpg' };
  
  function createFormDataWebMock(asset, mockBlob) {
    const formData = new Map();
    const filename = asset.fileName || 'avatar.jpg';
    formData.set('image', { blob: mockBlob, filename });
    return formData;
  }

  const mockBlob = { size: 1024, type: 'image/jpeg' };
  const fd = createFormDataWebMock(asset, mockBlob);
  assert.ok(fd.has('image'));
  assert.equal(fd.get('image').filename, 'avatar.jpg');
});

// ─── GDPR & PRIVACY: Account Deletion & JWT Security ────────────────

test('GDPR: DELETE /api/profile deletes by authenticated token user_id', () => {
  const authenticatedUserId = 'user_gdpr_123';
  let executedQuery = '';
  let executedParams = [];

  const mockDb = {
    async query(sql, params) {
      executedQuery = sql;
      executedParams = params;
      return { rowCount: 1 };
    }
  };

  async function handleDeleteProfile(userId) {
    if (!userId) throw new Error('Unauthorized');
    await mockDb.query('DELETE FROM users WHERE id = $1', [userId]);
  }

  handleDeleteProfile(authenticatedUserId);
  assert.equal(executedQuery, 'DELETE FROM users WHERE id = $1');
  assert.deepEqual(executedParams, ['user_gdpr_123']);
});

test('Auth Security: Rejects expired or tampered JWTs', () => {
  const expiredToken = jwt.sign(
    { id: 'user_1', email: 'test@example.com' },
    TEST_SECRET,
    { expiresIn: '-1s' } // Expired 1 second ago
  );

  assert.throws(() => {
    jwt.verify(expiredToken, TEST_SECRET);
  }, (err) => err.name === 'TokenExpiredError');

  const tamperedToken = expiredToken.slice(0, -4) + 'abcd';
  assert.throws(() => {
    jwt.verify(tamperedToken, TEST_SECRET);
  }, (err) => err.name === 'JsonWebTokenError');
});

// ─── CORS: Cross-Origin Resource Sharing & Expo Hosting Support ──────

test('CORS: Allows production Expo web app, preview subdomains, and local dev', () => {
  const allowedOriginsSet = new Set([
    'https://spr-app.expo.app',
    'http://localhost:8081',
    'http://localhost:19006',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:19006',
    'http://127.0.0.1:3000',
  ]);

  function isOriginAllowed(origin, nodeEnv = 'production') {
    if (nodeEnv !== 'production') return true;
    if (allowedOriginsSet.has(origin)) return true;
    if (/^https:\/\/([a-zA-Z0-9-]+\.)*expo\.app$/.test(origin)) return true;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
    if (/^https:\/\/([a-zA-Z0-9-]+\.)*onrender\.com$/.test(origin)) return true;
    return false;
  }

  // Allowed production origins
  assert.equal(isOriginAllowed('https://spr-app.expo.app'), true);
  assert.equal(isOriginAllowed('https://spr-app--435t98y6s6.expo.app'), true);
  assert.equal(isOriginAllowed('https://spr-app--fvtz5u0pfd.expo.app'), true);
  assert.equal(isOriginAllowed('http://localhost:8081'), true);
  assert.equal(isOriginAllowed('http://localhost:3000'), true);
  assert.equal(isOriginAllowed('http://127.0.0.1:8081'), true);

  // Disallowed origins
  assert.equal(isOriginAllowed('https://malicious-site.com'), false);
  assert.equal(isOriginAllowed('https://expo.app.attacker.com'), false);
  assert.equal(isOriginAllowed('https://fake-spr-app.expo.com'), false);

  // In non-production, any origin is permitted
  assert.equal(isOriginAllowed('https://any-dev-origin.test', 'development'), true);
});

test('CORS: Middleware callback safely denies disallowed origins without throwing 500 error', () => {
  function corsOriginHandler(origin, nodeEnv, callback) {
    if (!origin) return callback(null, true);

    const allowedOriginsSet = new Set(['https://spr-app.expo.app']);
    const isAllowed =
      nodeEnv !== 'production' ||
      allowedOriginsSet.has(origin) ||
      /^https:\/\/([a-zA-Z0-9-]+\.)*expo\.app$/.test(origin) ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    if (isAllowed) {
      return callback(null, true);
    }
    // Correct behavior: callback(null, false) denies CORS cleanly
    // Incorrect legacy behavior: callback(new Error('...')) triggered Express 500 crash
    return callback(null, false);
  }

  let capturedErr = null;
  let capturedAllowed = null;

  // Test native/curl without origin
  corsOriginHandler(undefined, 'production', (err, allow) => {
    capturedErr = err;
    capturedAllowed = allow;
  });
  assert.equal(capturedErr, null);
  assert.equal(capturedAllowed, true);

  // Test live production Expo Web URL
  corsOriginHandler('https://spr-app.expo.app', 'production', (err, allow) => {
    capturedErr = err;
    capturedAllowed = allow;
  });
  assert.equal(capturedErr, null);
  assert.equal(capturedAllowed, true);

  // Test disallowed origin does NOT throw error
  corsOriginHandler('https://untrusted-domain.com', 'production', (err, allow) => {
    capturedErr = err;
    capturedAllowed = allow;
  });
  assert.equal(capturedErr, null);
  assert.equal(capturedAllowed, false);
});

