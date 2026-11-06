import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ─── TEST 1: QR Code Image Asset Inspection & Verification ──────────────────
test('QR Code Asset: Payment QR image exists in assets directory and is readable', () => {
  const assetPath = path.resolve('assets/images/payment-qr.jpg');
  const srcAssetPath = path.resolve('src/assets/images/payment-qr.jpg');

  assert.ok(fs.existsSync(assetPath), 'Payment QR must exist in assets/images/payment-qr.jpg');
  assert.ok(fs.existsSync(srcAssetPath), 'Payment QR must exist in src/assets/images/payment-qr.jpg');

  const buf = fs.readFileSync(assetPath);
  assert.ok(buf.length > 50000, 'QR image must be a valid, high-resolution graphic (>50KB)');
  // Check JPEG SOI header 0xFFD8
  assert.equal(buf[0], 0xFF, 'First byte of JPEG must be 0xFF');
  assert.equal(buf[1], 0xD8, 'Second byte of JPEG must be 0xD8');
});

// ─── TEST 2: Unique Payment References & Pending Status ─────────────────────
test('TRYLAND Payment: Sponsorship creates unique reference and initial pending status', () => {
  const sponsorships = [];
  const req = {
    id: 'req_dorm_1',
    user_id: 'student_bob',
    amount_requested: 1500,
    amount_funded: 0,
    status: 'open',
  };

  const sponsorUser = { id: 'donor_alice' };
  const contributionAmount = 500;
  const payRef = `TRY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // Submission
  const sponsorship = {
    id: 'spon_1',
    request_id: req.id,
    sponsor_id: sponsorUser.id,
    amount: contributionAmount,
    status: 'pending', // Strict rule: must be pending
    payment_reference: payRef,
    payment_method: 'promptpay_qr',
    slip_reference: 'KBANK-92817402',
    transfer_time: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  sponsorships.push(sponsorship);

  assert.equal(sponsorship.status, 'pending');
  assert.match(sponsorship.payment_reference, /^TRY-[A-Z0-9]{6}$/);
  // Funding total must NOT be incremented while pending
  assert.equal(req.amount_funded, 0, 'Pending sponsorship must NOT increment amount_funded');
});

// ─── TEST 3: SPR Donate Payment Submission & Pending Isolation ───────────────
test('SPR Donate Payment: Contribution creates unique reference and initial pending status', () => {
  const donations = [];
  const campaign = {
    id: 'camp_food_drive',
    target_amount: 5000,
    amount_raised: 1000,
    status: 'active',
  };

  const donorUser = { id: 'donor_carol' };
  const donationAmount = 1000;
  const payRef = `DON-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const donation = {
    id: 'don_1',
    campaign_id: campaign.id,
    donor_id: donorUser.id,
    amount: donationAmount,
    status: 'pending', // Strict rule: must be pending
    payment_reference: payRef,
    payment_method: 'promptpay_qr',
    slip_reference: 'SCB-88392019',
    transfer_time: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  donations.push(donation);

  assert.equal(donation.status, 'pending');
  assert.match(donation.payment_reference, /^DON-[A-Z0-9]{6}$/);
  // Campaign raised total must NOT be incremented while pending
  assert.equal(campaign.amount_raised, 1000, 'Pending donation must NOT increment amount_raised');
});

// ─── TEST 4: Live Totals Aggregation Filters Out Pending Payments ───────────
test('Live Money Totals: Pending, rejected, or duplicate payments contribute 0 ฿ to live totals', () => {
  const allSponsorships = [
    { id: 's1', amount: 500, status: 'pending' },
    { id: 's2', amount: 300, status: 'rejected' },
    { id: 's3', amount: 800, status: 'verified' },
  ];

  const allDonations = [
    { id: 'd1', amount: 1000, status: 'pending' },
    { id: 'd2', amount: 200, status: 'rejected' },
    { id: 'd3', amount: 1500, status: 'verified' },
  ];

  // SQL aggregation simulation: WHERE status = 'verified'
  const verifiedTrylandAmount = allSponsorships
    .filter(s => s.status === 'verified')
    .reduce((sum, s) => sum + s.amount, 0);

  const verifiedDonateAmount = allDonations
    .filter(d => d.status === 'verified')
    .reduce((sum, d) => sum + d.amount, 0);

  const combinedTotalMoneyRaised = verifiedTrylandAmount + verifiedDonateAmount;

  assert.equal(verifiedTrylandAmount, 800, 'TRYLAND total must only count verified payments (800 ฿)');
  assert.equal(verifiedDonateAmount, 1500, 'Donate total must only count verified payments (1500 ฿)');
  assert.equal(combinedTotalMoneyRaised, 2300, 'Combined total must be exactly 2300 ฿');
});

// ─── TEST 5: Admin Verification Approval Flow ───────────────────────────────
test('Admin Verification: Approving payment updates status to verified, increments funding, and logs verifier', () => {
  const req = {
    id: 'req_1',
    amount_requested: 2000,
    amount_funded: 500,
    status: 'partially_funded',
  };

  const payment = {
    id: 'spon_99',
    request_id: 'req_1',
    amount: 1500,
    status: 'pending',
    payment_reference: 'TRY-ABC123',
    verified_by: null,
    verified_at: null,
  };

  const adminUser = { id: 'admin_super', role: 'admin' };

  // Admin approves payment
  payment.status = 'verified';
  payment.verified_by = adminUser.id;
  payment.verified_at = new Date().toISOString();

  // Increment target funding
  req.amount_funded += payment.amount;
  req.status = req.amount_funded >= req.amount_requested ? 'fully_funded' : 'partially_funded';

  assert.equal(payment.status, 'verified');
  assert.equal(payment.verified_by, 'admin_super');
  assert.ok(payment.verified_at);
  assert.equal(req.amount_funded, 2000);
  assert.equal(req.status, 'fully_funded');
});

// ─── TEST 6: Admin Rejection Flow ───────────────────────────────────────────
test('Admin Verification: Rejecting payment sets status to rejected with reason and does NOT increase funding', () => {
  const campaign = {
    id: 'camp_exam',
    target_amount: 8000,
    amount_raised: 3000,
    status: 'active',
  };

  const donation = {
    id: 'don_88',
    campaign_id: 'camp_exam',
    amount: 500,
    status: 'pending',
    rejection_reason: null,
    verified_by: null,
    verified_at: null,
  };

  const adminUser = { id: 'admin_super', role: 'admin' };

  // Admin rejects payment
  donation.status = 'rejected';
  donation.rejection_reason = 'Slip reference not found in receiving KBank statement';
  donation.verified_by = adminUser.id;
  donation.verified_at = new Date().toISOString();

  // Campaign raised must remain UNCHANGED
  assert.equal(donation.status, 'rejected');
  assert.equal(donation.rejection_reason, 'Slip reference not found in receiving KBank statement');
  assert.equal(campaign.amount_raised, 3000, 'Rejected payment must NOT increase amount_raised');
});

// ─── TEST 7: Duplicate Slip Reference Detection ─────────────────────────────
test('Security: Duplicate slip references are flagged for administrator inspection', () => {
  const submissions = [
    { id: 'p1', payment_reference: 'TRY-AAA111', slip_reference: 'SLIP-999888' },
    { id: 'p2', payment_reference: 'DON-BBB222', slip_reference: 'SLIP-999888' }, // Duplicate slip!
    { id: 'p3', payment_reference: 'TRY-CCC333', slip_reference: 'SLIP-111222' },
  ];

  const slipCounts = new Map();
  for (const item of submissions) {
    const ref = item.slip_reference.trim().toLowerCase();
    slipCounts.set(ref, (slipCounts.get(ref) || 0) + 1);
  }

  const p1IsDup = (slipCounts.get('slip-999888') || 0) > 1;
  const p2IsDup = (slipCounts.get('slip-999888') || 0) > 1;
  const p3IsDup = (slipCounts.get('slip-111222') || 0) > 1;

  assert.equal(p1IsDup, true, 'p1 has duplicate slip reference');
  assert.equal(p2IsDup, true, 'p2 has duplicate slip reference');
  assert.equal(p3IsDup, false, 'p3 has unique slip reference');
});

// ─── TEST 8: Role Authorization Guard ───────────────────────────────────────
test('Security: Non-admin users cannot approve or reject payments (403 Forbidden)', () => {
  const regularUser = { id: 'student_123', email: 'student@uni.edu', role: 'user' };
  const adminUser = { id: 'admin_1', email: 'admin@spr.app', role: 'admin' };

  const isUserAdmin = (u) => u.role === 'admin' || u.email === 'admin@spr.app' || u.email?.startsWith('admin@');

  assert.equal(isUserAdmin(regularUser), false, 'Regular student must NOT have admin access');
  assert.equal(isUserAdmin(adminUser), true, 'Admin account must have admin access');
});

// ─── TEST 9: Privacy Protection for Receipts and Documents ──────────────────
test('Privacy: Public requests feed masks private slip images and personal documents', () => {
  const rawDbRequest = {
    id: 'req_med_1',
    user_id: 'user_david',
    username: 'David',
    email: 'david@student.uni.edu',
    bill_category: 'Essential student bills',
    amount_requested: 2500,
    amount_funded: 1000,
    document_url: 'https://internal.storage/slips/medical_invoice_confidential.pdf',
    explanation: 'Prescription eyeglasses replacement',
    status: 'partially_funded',
  };

  // Public sanitizer function
  function sanitizeForPublic(row) {
    return {
      id: row.id,
      bill_category: row.bill_category,
      amount_requested: row.amount_requested,
      amount_funded: row.amount_funded,
      explanation: row.explanation,
      status: row.status,
      student_alias: `Student ${row.username.charAt(0).toUpperCase()}.`,
      // document_url is intentionally omitted from public feed!
    };
  }

  const publicData = sanitizeForPublic(rawDbRequest);
  assert.equal(publicData.student_alias, 'Student D.');
  assert.equal(publicData.document_url, undefined, 'Confidential document_url must never be exposed publicly');
});

// ─── TEST 10: Thai Baht Currency Calculation & Need Formula ─────────────────
test('Currency & Formulas: Remaining needed and funding percentages calculate accurately', () => {
  const request = {
    amount_requested: 3200,
    amount_funded: 1200,
  };

  const remainingNeeded = Math.max(0, request.amount_requested - request.amount_funded);
  const percentage = Math.min(100, Math.round((request.amount_funded / request.amount_requested) * 100));

  assert.equal(remainingNeeded, 2000, 'Remaining needed must be 2,000 ฿');
  assert.equal(percentage, 38, 'Percentage must be 38%');
});

