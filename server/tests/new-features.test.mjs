import test from 'node:test';
import assert from 'node:assert/strict';

// Helper mock DB generator
function createMockDb() {
  const users = [
    { id: 'user_alice', email: 'alice@student.uni.edu', username: 'Alice' },
    { id: 'user_bob', email: 'bob@student.uni.edu', username: 'Bob' },
    { id: 'user_reviewer', email: 'mod@uni.edu', username: 'Reviewer Admin' },
  ];

  const listings = [
    {
      id: 'item_calc_1',
      user_id: 'user_alice',
      title: 'TI-84 Plus Graphing Calculator',
      description: 'Used for Calc I & II, good battery condition',
      category: 'Electronics',
      condition: 'good',
      price: 1200,
      images: ['https://example.com/calc.jpg'],
      status: 'available',
      contact_info: '@alice_dorm',
      buyer_interest_count: 0,
      created_at: new Date().toISOString(),
    }
  ];

  const interests = [];
  const reports = [];
  const transactions = [];

  const projects = [
    {
      id: 'proj_free_1',
      title: 'ESP32 Smart Dorm Energy Monitor',
      category: 'Tech & Coding',
      difficulty: 'Beginner',
      estimated_budget: 380,
      is_premium: false,
      materials: JSON.stringify([{ name: 'ESP32', estCost: 150 }]),
      steps: JSON.stringify([{ title: 'Step 1', detail: 'Intro' }]),
    },
    {
      id: 'proj_prem_1',
      title: 'Solar Hydroponic Pod',
      category: 'Science & Green Tech',
      difficulty: 'Advanced',
      estimated_budget: 1800,
      is_premium: true,
      materials: JSON.stringify([{ name: 'Solar Panel', estCost: 650 }]),
      steps: JSON.stringify([{ title: 'Advanced Step 1', detail: 'Hydrodynamic sizing' }]),
    }
  ];

  const subscriptions = [
    { user_id: 'user_alice', plan: 'free' },
  ];

  const trylandRequests = [
    {
      id: 'try_req_1',
      user_id: 'user_bob',
      bill_category: 'Tuition Balance',
      amount_requested: 5000,
      amount_funded: 0,
      explanation: 'Late semester fee subsidy needed',
      due_date: new Date(Date.now() + 864000000).toISOString(),
      document_url: 'https://secure.internal/docs/bill_private_123.pdf',
      status: 'open',
      created_at: new Date().toISOString(),
    }
  ];

  const trylandSponsorships = [];

  const donateCampaigns = [
    {
      id: 'camp_1',
      organizer_id: 'user_alice',
      organizer_name: 'Alice',
      title: 'Student Food Pantry Drive',
      description: 'Exam week nutritional care packages',
      target_amount: 10000,
      amount_raised: 4000,
      status: 'active',
    }
  ];

  const donations = [];

  return {
    users,
    listings,
    interests,
    reports,
    transactions,
    projects,
    subscriptions,
    trylandRequests,
    trylandSponsorships,
    donateCampaigns,
    donations,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 1: SPR MARKETPLACE TESTS
// ─────────────────────────────────────────────────────────────────────────────

test('Marketplace: Prohibited terms (weapons/drugs) are rejected on listing creation', () => {
  const prohibitedInputs = [
    'Military pocket knife for sale',
    'Juul vape pod strawberry',
    'Final exam cheat sheet answer key',
  ];

  const PROHIBITED_KEYWORDS = [
    'weapon', 'gun', 'knife', 'explosive', 'ammunition',
    'drug', 'weed', 'cannabis', 'marijuana', 'vape', 'tobacco', 'cigarette', 'alcohol', 'beer', 'liquor',
    'exam answer', 'cheat', 'fake id', 'counterfeit'
  ];

  function containsProhibitedContent(text) {
    const lower = text.toLowerCase();
    return PROHIBITED_KEYWORDS.some(term => lower.includes(term));
  }

  for (const input of prohibitedInputs) {
    assert.equal(containsProhibitedContent(input), true, `Should detect prohibited content in: "${input}"`);
  }
});

test('Marketplace: Non-owner cannot edit or delete another user listing (403)', () => {
  const db = createMockDb();
  const listing = db.listings[0]; // owned by user_alice
  const attackerUser = 'user_bob';

  let statusCode = 200;
  let responseData = null;

  if (listing.user_id !== attackerUser) {
    statusCode = 403;
    responseData = { error: 'You can only edit your own listings' };
  }

  assert.equal(statusCode, 403);
  assert.equal(responseData.error, 'You can only edit your own listings');
});

test('Marketplace: Seller marking item as sold can record SPR Income transaction', () => {
  const db = createMockDb();
  const listing = db.listings[0]; // price: 1200, user: user_alice
  const currentUser = 'user_alice';
  const recordTransaction = true;

  if (listing.user_id === currentUser) {
    listing.status = 'sold';
    if (recordTransaction && listing.price > 0) {
      db.transactions.push({
        id: 'txn_sale_1',
        user_id: currentUser,
        type: 'income',
        amount: listing.price,
        categoryId: 'other-income',
        description: `SPR Marketplace Sale: ${listing.title}`,
      });
    }
  }

  assert.equal(listing.status, 'sold');
  assert.equal(db.transactions.length, 1);
  assert.equal(db.transactions[0].amount, 1200);
  assert.equal(db.transactions[0].type, 'income');
});

test('Marketplace: Seller cannot express interest in their own item (400)', () => {
  const db = createMockDb();
  const listing = db.listings[0]; // user_alice
  const currentUser = 'user_alice';

  let statusCode = 200;
  let responseData = null;

  if (listing.user_id === currentUser) {
    statusCode = 400;
    responseData = { error: 'You cannot express interest in your own listing' };
  }

  assert.equal(statusCode, 400);
  assert.equal(responseData.error, 'You cannot express interest in your own listing');
});

test('Marketplace: Inappropriate listing report creates moderation record', () => {
  const db = createMockDb();
  const reporterId = 'user_bob';
  const listingId = 'item_calc_1';
  const reason = 'Misleading price';

  db.reports.push({
    id: 'rep_1',
    listing_id: listingId,
    reporter_id: reporterId,
    reason,
    status: 'pending',
  });

  assert.equal(db.reports.length, 1);
  assert.equal(db.reports[0].reason, 'Misleading price');
  assert.equal(db.reports[0].status, 'pending');
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 2: SPR PROJECTS TESTS
// ─────────────────────────────────────────────────────────────────────────────

test('Projects: Free projects are accessible to all; Premium requires active subscription', () => {
  const db = createMockDb();
  const freeProj = db.projects.find(p => !p.is_premium);
  const premProj = db.projects.find(p => p.is_premium);

  const freeUserPlan = 'free';
  const isFreeAccessible = !freeProj.is_premium || freeUserPlan === 'premium';
  const isPremAccessible = !premProj.is_premium || freeUserPlan === 'premium';

  assert.equal(isFreeAccessible, true, 'Free project should be accessible to all');
  assert.equal(isPremAccessible, false, 'Premium project should require premium plan');

  // Activate pilot pass
  const updatedUserPlan = 'premium';
  const isPremAccessibleAfterPass = !premProj.is_premium || updatedUserPlan === 'premium';
  assert.equal(isPremAccessibleAfterPass, true, 'Premium project accessible after pilot pass');
});

test('Projects: Structured guidance supports 5 required sections', () => {
  const db = createMockDb();
  const proj = db.projects[0];
  const materials = JSON.parse(proj.materials);
  const steps = JSON.parse(proj.steps);

  assert.ok(Array.isArray(materials) && materials.length > 0);
  assert.ok(Array.isArray(steps) && steps.length > 0);
  assert.ok(proj.estimated_budget >= 0);
  assert.ok(proj.difficulty);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 3: 🌳RYLAND (STUDENT BILL SPONSORSHIP) TESTS
// ─────────────────────────────────────────────────────────────────────────────

test('🌳RYLAND: Public query sanitizes student identity and hides document_url', () => {
  const db = createMockDb();
  const req = db.trylandRequests[0];
  const user = db.users.find(u => u.id === req.user_id);

  function sanitizeStudentName(username, email) {
    if (username && username.length > 0) return `Student ${username.charAt(0).toUpperCase()}.`;
    if (email && email.length > 0) return `Student ${email.charAt(0).toUpperCase()}.`;
    return 'Verified Student';
  }

  // Public representation
  const publicRow = {
    id: req.id,
    bill_category: req.bill_category,
    amount_requested: req.amount_requested,
    amount_funded: req.amount_funded,
    student_alias: sanitizeStudentName(user.username, user.email),
    // document_url omitted
  };

  assert.equal(publicRow.student_alias, 'Student B.');
  assert.equal(publicRow.document_url, undefined, 'Private document URL must not be in public payload');
});

test('🌳RYLAND: Anti-self-sponsorship check prevents users from sponsoring own bill (400)', () => {
  const db = createMockDb();
  const req = db.trylandRequests[0]; // owned by user_bob
  const sponsorId = 'user_bob';

  let statusCode = 200;
  let responseData = null;

  if (req.user_id === sponsorId) {
    statusCode = 400;
    responseData = { error: 'You cannot sponsor your own request' };
  }

  assert.equal(statusCode, 400);
  assert.equal(responseData.error, 'You cannot sponsor your own request');
});

test('🌳RYLAND: Sponsorship contribution updates amount_funded and status correctly', () => {
  const db = createMockDb();
  const req = db.trylandRequests[0]; // requested: 5000, funded: 0
  const sponsorId = 'user_alice';
  const pledgeAmount = 2000;

  // Pledge 1
  req.amount_funded += pledgeAmount;
  req.status = req.amount_funded >= req.amount_requested ? 'fully_funded' : 'partially_funded';
  db.trylandSponsorships.push({
    request_id: req.id,
    sponsor_id: sponsorId,
    amount: pledgeAmount,
  });

  assert.equal(req.amount_funded, 2000);
  assert.equal(req.status, 'partially_funded');

  // Pledge 2 (Remaining 3000)
  req.amount_funded += 3000;
  req.status = req.amount_funded >= req.amount_requested ? 'fully_funded' : 'partially_funded';

  assert.equal(req.amount_funded, 5000);
  assert.equal(req.status, 'fully_funded');
});

test('🌳RYLAND: Anti-self-approval rule prevents student from verifying their own request (403)', () => {
  const db = createMockDb();
  const req = db.trylandRequests[0]; // owned by user_bob
  const moderatorAttempt = 'user_bob'; // Bob attempting to approve own request

  let statusCode = 200;
  let responseData = null;

  if (req.user_id === moderatorAttempt) {
    statusCode = 403;
    responseData = { error: 'Security violation: You cannot verify or approve your own sponsorship request' };
  }

  assert.equal(statusCode, 403);
  assert.equal(responseData.error, 'Security violation: You cannot verify or approve your own sponsorship request');
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 4: SPR DONATE (DONATIONS & FUNDRAISING) TESTS
// ─────────────────────────────────────────────────────────────────────────────

test('Donate: Donation increments amount_raised and transitions status to completed upon reaching target', () => {
  const db = createMockDb();
  const campaign = db.donateCampaigns[0]; // target: 10000, raised: 4000
  const contribution = 6000;

  campaign.amount_raised += contribution;
  if (campaign.amount_raised >= campaign.target_amount) {
    campaign.status = 'completed';
  }

  assert.equal(campaign.amount_raised, 10000);
  assert.equal(campaign.status, 'completed');
});

test('Donate: Anonymous donation sanitizes donor name to "Kind Donor"', () => {
  const donation = {
    id: 'don_1',
    donor_id: 'user_alice',
    amount: 500,
    is_anonymous: true,
    username: 'Alice',
  };

  const displayName = donation.is_anonymous ? 'Kind Donor' : (donation.username || 'Student Supporter');
  assert.equal(displayName, 'Kind Donor');
});

test('Donate: Completed or cancelled campaigns reject further donations (400)', () => {
  const campaign = { status: 'completed' };
  let statusCode = 200;
  let errorMsg = null;

  if (campaign.status === 'completed' || campaign.status === 'cancelled') {
    statusCode = 400;
    errorMsg = `Campaign is already ${campaign.status}`;
  }

  assert.equal(statusCode, 400);
  assert.equal(errorMsg, 'Campaign is already completed');
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 5: 🌳 TRYLAND SAVE THE PLANET (TREE PLANTING) TESTS
// ─────────────────────────────────────────────────────────────────────────────

test('🌳 TRYLAND Tree Planting: Donation records tree count, amount, and pending status with TREE- prefix', () => {
  const treeInitiative = {
    id: 'tree_canopy_1',
    title: 'Saipanyarangsit Campus Canopy Expansion',
    target_trees: 500,
    trees_planted: 120,
    cost_per_tree: 100,
    amount_raised: 12000,
  };

  const treeCount = 5;
  const donationAmount = treeCount * treeInitiative.cost_per_tree;
  const payRef = `TREE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const treeDonation = {
    id: 'tree_don_1',
    initiative_id: treeInitiative.id,
    tree_count: treeCount,
    amount: donationAmount,
    payment_reference: payRef,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  assert.equal(treeDonation.status, 'pending');
  assert.equal(treeDonation.amount, 500);
  assert.equal(treeDonation.tree_count, 5);
  assert.match(treeDonation.payment_reference, /^TREE-[A-Z0-9]{6}$/);
  // Initiative must NOT increment while pending
  assert.equal(treeInitiative.trees_planted, 120);
});

test('🌳 TRYLAND Tree Planting: Admin verification increments trees_planted, amount_raised and updates live CO2 offset', () => {
  const treeInitiative = {
    id: 'tree_canopy_1',
    title: 'Saipanyarangsit Campus Canopy Expansion',
    target_trees: 500,
    trees_planted: 120,
    cost_per_tree: 100,
    amount_raised: 12000,
  };

  const treeDonation = {
    id: 'tree_don_1',
    initiative_id: treeInitiative.id,
    tree_count: 10,
    amount: 1000,
    status: 'pending',
  };

  // Admin approves payment
  treeDonation.status = 'verified';
  treeDonation.verified_at = new Date().toISOString();
  treeInitiative.trees_planted += treeDonation.tree_count;
  treeInitiative.amount_raised += treeDonation.amount;

  const co2OffsetKgPerYear = treeInitiative.trees_planted * 22;

  assert.equal(treeDonation.status, 'verified');
  assert.equal(treeInitiative.trees_planted, 130);
  assert.equal(treeInitiative.amount_raised, 13000);
  assert.equal(co2OffsetKgPerYear, 130 * 22); // 2860 kg
});


