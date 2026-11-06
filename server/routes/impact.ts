import express, { Request, Response } from 'express';
import { getDb } from '../services/db';
import { optionalAuth } from './auth';

const router = express.Router();

// Helper to sanitize student names into dignified aliases
function sanitizeStudentName(username?: string, email?: string): string {
  if (username && username.length > 0) {
    return `Student ${username.charAt(0).toUpperCase()}.`;
  }
  if (email && email.length > 0) {
    return `Student ${email.charAt(0).toUpperCase()}.`;
  }
  return 'Verified Student';
}

// ─── GET /api/impact/live-totals (Live Database Money Totals) ────────────────
router.get('/live-totals', optionalAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();

    // 1. Overall & TRYLAND Verified Totals
    // STRICT RULE: Only count verified sponsorships! Exclude pending, rejected, failed!
    const trySponResult = await db.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as verified_amount,
        COUNT(*) as verified_count
      FROM tryland_sponsorships
      WHERE status = 'verified'
    `);
    const verifiedTrylandAmount = Number(trySponResult.rows[0]?.verified_amount || 0);
    const verifiedTrylandCount = parseInt(trySponResult.rows[0]?.verified_count || '0', 10);

    // 2. TRYLAND Requests Aggregate
    const tryReqsResult = await db.query(`
      SELECT 
        r.id,
        r.bill_category,
        r.amount_requested,
        r.amount_funded,
        r.status,
        r.due_date,
        u.username,
        u.email
      FROM tryland_requests r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.status IN ('open', 'approved', 'partially_funded', 'fully_funded')
      ORDER BY r.created_at DESC
    `);

    let totalTrylandRequested = 0;
    let totalTrylandFunded = 0;
    let successfullyFundedRequestsCount = 0;

    const trylandRequestsProgress = tryReqsResult.rows.map((row: any) => {
      const requested = Number(row.amount_requested);
      const funded = Number(row.amount_funded);
      totalTrylandRequested += requested;
      totalTrylandFunded += funded;
      if (funded >= requested || row.status === 'fully_funded') {
        successfullyFundedRequestsCount++;
      }

      const percentage = requested > 0 ? Math.min(100, Math.round((funded / requested) * 100)) : 0;
      const remainingNeeded = Math.max(0, requested - funded);

      return {
        id: row.id,
        billCategory: row.bill_category,
        studentAlias: sanitizeStudentName(row.username, row.email),
        amountRequested: requested,
        amountFunded: funded,
        remainingNeeded,
        percentage,
        status: row.status,
        dueDate: row.due_date,
      };
    });

    const totalTrylandStillNeeded = Math.max(0, totalTrylandRequested - totalTrylandFunded);

    // 3. Overall & SPR Donate Verified Totals
    // STRICT RULE: Only count verified donations! Exclude pending, rejected, failed!
    const donateResult = await db.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as verified_amount,
        COUNT(*) as verified_count
      FROM donations
      WHERE status = 'verified'
    `);
    const verifiedDonateAmount = Number(donateResult.rows[0]?.verified_amount || 0);
    const verifiedDonateCount = parseInt(donateResult.rows[0]?.verified_count || '0', 10);

    // 4. SPR Donate Campaigns Aggregate
    const campResult = await db.query(`
      SELECT 
        id,
        title,
        category,
        target_amount,
        amount_raised,
        status,
        cover_image,
        end_date
      FROM donate_campaigns
      WHERE status != 'cancelled'
      ORDER BY created_at DESC
    `);

    let totalDonateTargets = 0;
    let totalDonateRaised = 0;
    let completedCampaignsCount = 0;

    const donateCampaignsProgress = campResult.rows.map((row: any) => {
      const target = Number(row.target_amount);
      const raised = Number(row.amount_raised);
      totalDonateTargets += target;
      totalDonateRaised += raised;
      if (raised >= target || row.status === 'completed') {
        completedCampaignsCount++;
      }

      const percentage = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
      const remainingNeeded = Math.max(0, target - raised);

      return {
        id: row.id,
        title: row.title,
        category: row.category,
        targetAmount: target,
        amountRaised: raised,
        remainingNeeded,
        percentage,
        status: row.status,
        coverImage: row.cover_image,
        endDate: row.end_date,
      };
    });

    const totalDonateRemainingNeeded = Math.max(0, totalDonateTargets - totalDonateRaised);

    // Combined Overall Totals
    const combinedTotalRaised = verifiedTrylandAmount + verifiedDonateAmount;
    const combinedSuccessfulTransactions = verifiedTrylandCount + verifiedDonateCount;

    res.json({
      currency: 'THB',
      currencySymbol: '฿',
      updatedAt: new Date().toISOString(),
      overall: {
        totalMoneyRaised: combinedTotalRaised,
        totalVerifiedDonations: verifiedDonateAmount,
        totalVerifiedSponsorships: verifiedTrylandAmount,
        successfulDonationsCount: verifiedDonateCount,
        successfulSponsorshipsCount: verifiedTrylandCount,
        combinedSuccessfulTransactions,
        successfullyFundedRequestsCount,
        completedCampaignsCount,
      },
      tryland: {
        totalFundingReceived: verifiedTrylandAmount,
        totalAmountRequested: totalTrylandRequested,
        totalAmountStillNeeded: totalTrylandStillNeeded,
        activeRequestsCount: trylandRequestsProgress.length,
        fullyFundedRequestsCount: successfullyFundedRequestsCount,
        requestsProgress: trylandRequestsProgress,
      },
      donate: {
        totalDonationsReceived: verifiedDonateAmount,
        totalCampaignTargets: totalDonateTargets,
        totalAmountRemaining: totalDonateRemainingNeeded,
        activeCampaignsCount: donateCampaignsProgress.length,
        completedCampaignsCount,
        campaignsProgress: donateCampaignsProgress,
      },
    });
  } catch (error) {
    console.error('Error fetching live impact totals:', error);
    res.status(500).json({ error: 'Failed to fetch live impact totals' });
  }
});

export default router;

