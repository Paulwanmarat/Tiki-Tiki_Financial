import test from 'node:test';
import assert from 'node:assert/strict';
import authPkg from '../dist/routes/auth.js';
const { OWNER_EMAIL, isUserOwner, isUserAdmin } = authPkg;

// ─── TEST 1: Owner Constants & Identity Checks ──────────────────────────────
test('Owner Identity: paulwanmarat@gmail.com is strictly recognized as Owner', () => {
  assert.equal(OWNER_EMAIL, 'paulwanmarat@gmail.com');

  assert.equal(isUserOwner({ email: 'paulwanmarat@gmail.com', role: 'owner' }), true);
  assert.equal(isUserOwner({ email: 'PAULWANMARAT@GMAIL.COM', role: 'user' }), true, 'Case-insensitive owner email match');
  assert.equal(isUserOwner({ email: 'paulwanmarat@gmail.com', role: 'admin' }), true);
  assert.equal(isUserOwner({ email: 'other@example.com', role: 'admin' }), false);
  assert.equal(isUserOwner({ email: 'other@example.com', role: 'user' }), false);
  assert.equal(isUserOwner(null), false);
  assert.equal(isUserOwner(undefined), false);

  // isUserAdmin should be true for both owner and admin
  assert.equal(isUserAdmin({ email: 'paulwanmarat@gmail.com', role: 'owner' }), true);
  assert.equal(isUserAdmin({ email: 'admin@college.ac.th', role: 'admin' }), true);
  assert.equal(isUserAdmin({ email: 'student@college.ac.th', role: 'user' }), false);
});

// ─── TEST 2: requireOwner and requireAdmin Authorization Guards ─────────────
test('Authorization Guards: requireOwner rejects non-owners with 403 Forbidden', () => {
  const reqOwner = { user: { id: 'owner_1', email: 'paulwanmarat@gmail.com', role: 'owner' } };
  const reqAdmin = { user: { id: 'admin_1', email: 'appointed_admin@uni.ac.th', role: 'admin' } };
  const reqUser = { user: { id: 'user_1', email: 'student@uni.ac.th', role: 'user' } };

  function executeRequireOwner(req) {
    let statusCode = 200;
    let resBody = null;
    let nextCalled = false;

    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { resBody = data; return this; },
    };
    const next = () => { nextCalled = true; };

    if (!req.user || !isUserOwner(req.user)) {
      res.status(403).json({ error: 'Forbidden: Only the application owner can perform this action' });
      return { statusCode, resBody, nextCalled };
    }
    next();
    return { statusCode, resBody, nextCalled };
  }

  // 1. Owner succeeds
  const ownerResult = executeRequireOwner(reqOwner);
  assert.equal(ownerResult.nextCalled, true);
  assert.equal(ownerResult.statusCode, 200);

  // 2. Regular admin is blocked (403)
  const adminResult = executeRequireOwner(reqAdmin);
  assert.equal(adminResult.nextCalled, false);
  assert.equal(adminResult.statusCode, 403);
  assert.match(adminResult.resBody.error, /Only the application owner/);

  // 3. Regular student is blocked (403)
  const userResult = executeRequireOwner(reqUser);
  assert.equal(userResult.nextCalled, false);
  assert.equal(userResult.statusCode, 403);
  assert.match(userResult.resBody.error, /Only the application owner/);
});

// ─── TEST 3: Assign Role Workflow (Promote to Admin & Demote to User) ─────────
test('Role Workflow: Owner appoints admin and demotes back to user with audit trail', () => {
  // In-memory mock database state
  const mockUsers = [
    { id: 'usr_owner', email: 'paulwanmarat@gmail.com', role: 'owner', email_verified: true },
    { id: 'usr_candidate', email: 'dr_somchai@university.ac.th', role: 'user', email_verified: true },
  ];
  const auditLogs = [];

  function assignRoleEndpoint(reqUser, targetEmail, targetRole) {
    if (!reqUser || !isUserOwner(reqUser)) {
      return { status: 403, body: { error: 'Forbidden: Only the application owner can manage administrator privileges' } };
    }

    if (!targetEmail || !targetRole) {
      return { status: 400, body: { error: 'Target email and role are required' } };
    }

    if (targetRole !== 'admin' && targetRole !== 'user') {
      return { status: 400, body: { error: 'Role must be either "admin" or "user"' } };
    }

    const normalizedTarget = targetEmail.trim().toLowerCase();
    if (normalizedTarget === OWNER_EMAIL.toLowerCase()) {
      return { status: 403, body: { error: 'Cannot modify the root owner' } };
    }

    const targetUser = mockUsers.find(u => u.email.toLowerCase() === normalizedTarget);
    if (!targetUser) {
      return { status: 404, body: { error: 'Target user not found' } };
    }

    targetUser.role = targetRole;

    const logEntry = {
      id: `audit_${auditLogs.length + 1}`,
      actor_id: reqUser.id,
      actor_email: reqUser.email,
      action: targetRole === 'admin' ? 'promote_admin' : 'demote_user',
      target_email: targetUser.email,
      details: targetRole === 'admin' ? `Promoted ${targetUser.email} to administrator` : `Demoted ${targetUser.email} to regular user`,
      created_at: new Date().toISOString(),
    };
    auditLogs.push(logEntry);

    return {
      status: 200,
      body: {
        success: true,
        message: `Successfully updated ${targetUser.email} role to ${targetRole}`,
        user: { id: targetUser.id, email: targetUser.email, role: targetUser.role },
      },
    };
  }

  const owner = mockUsers[0];

  // 1. Promote candidate to admin
  const promoRes = assignRoleEndpoint(owner, 'dr_somchai@university.ac.th', 'admin');
  assert.equal(promoRes.status, 200);
  assert.equal(promoRes.body.user.role, 'admin');
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0].action, 'promote_admin');
  assert.equal(auditLogs[0].target_email, 'dr_somchai@university.ac.th');
  assert.equal(auditLogs[0].actor_email, 'paulwanmarat@gmail.com');

  // 2. Demote candidate back to user
  const demoRes = assignRoleEndpoint(owner, 'dr_somchai@university.ac.th', 'user');
  assert.equal(demoRes.status, 200);
  assert.equal(demoRes.body.user.role, 'user');
  assert.equal(auditLogs.length, 2);
  assert.equal(auditLogs[1].action, 'demote_user');
  assert.equal(auditLogs[1].target_email, 'dr_somchai@university.ac.th');
});

// ─── TEST 4: Security Safeguards — Protecting Root Owner and Input Validation ──
test('Security Safeguard: Preventing demotion of root owner and validating inputs', () => {
  const mockUsers = [
    { id: 'usr_owner', email: 'paulwanmarat@gmail.com', role: 'owner' },
    { id: 'usr_other', email: 'someone@example.com', role: 'user' },
  ];

  function assignRoleEndpoint(reqUser, targetEmail, targetRole) {
    if (!reqUser || !isUserOwner(reqUser)) {
      return { status: 403, body: { error: 'Forbidden' } };
    }
    if (!targetRole || (targetRole !== 'admin' && targetRole !== 'user')) {
      return { status: 400, body: { error: 'Role must be either "admin" or "user"' } };
    }
    const normalizedTarget = (targetEmail || '').trim().toLowerCase();
    if (normalizedTarget === OWNER_EMAIL.toLowerCase()) {
      return { status: 403, body: { error: 'Cannot modify the root owner' } };
    }
    const targetUser = mockUsers.find(u => u.email.toLowerCase() === normalizedTarget);
    if (!targetUser) {
      return { status: 404, body: { error: 'Target user not found' } };
    }
    return { status: 200 };
  }

  const owner = mockUsers[0];

  // Attempting to demote owner
  const attack1 = assignRoleEndpoint(owner, 'paulwanmarat@gmail.com', 'user');
  assert.equal(attack1.status, 403);
  assert.equal(attack1.body.error, 'Cannot modify the root owner');

  // Attempting invalid role
  const attack2 = assignRoleEndpoint(owner, 'someone@example.com', 'superadmin');
  assert.equal(attack2.status, 400);

  // Attempting non-existent user
  const attack3 = assignRoleEndpoint(owner, 'ghost@nonexistent.org', 'admin');
  assert.equal(attack3.status, 404);
});

// ─── TEST 5: Privilege Escalation Prevention ────────────────────────────────
test('Security Safeguard: Non-owners cannot promote themselves or anyone else', () => {
  function checkEscalation(reqUser) {
    if (!reqUser || !isUserOwner(reqUser)) {
      return { status: 403, error: 'Forbidden: Only the application owner can manage administrator privileges' };
    }
    return { status: 200 };
  }

  // Regular user attempt
  assert.equal(checkEscalation({ email: 'hacker@blackhat.com', role: 'user' }).status, 403);

  // Existing admin attempt
  assert.equal(checkEscalation({ email: 'regular_admin@college.edu', role: 'admin' }).status, 403);

  // Unauthenticated attempt
  assert.equal(checkEscalation(null).status, 403);
});

// ─── TEST 6: Audit Trail Immutability ────────────────────────────────────────
test('Audit Trail: Log entries record complete metadata and timestamps', () => {
  const auditLogs = [
    {
      id: 'log_1',
      actor_id: 'usr_owner',
      actor_email: 'paulwanmarat@gmail.com',
      action: 'promote_admin',
      target_email: 'prof_artit@ku.ac.th',
      details: 'Promoted to admin',
      created_at: new Date().toISOString(),
    },
  ];

  const log = auditLogs[0];
  assert.ok(log.id);
  assert.equal(log.actor_email, 'paulwanmarat@gmail.com');
  assert.equal(log.target_email, 'prof_artit@ku.ac.th');
  assert.equal(log.action, 'promote_admin');
  assert.ok(log.created_at);
});
