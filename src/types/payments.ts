export interface PaymentSubmission {
  id: string;
  type: 'tryland' | 'donate' | 'tree';
  payment_reference: string;
  payment_method: string;
  amount: number;
  status: 'pending' | 'verified' | 'rejected';
  message?: string;
  slip_url?: string;
  slip_reference?: string;
  transfer_time?: string;
  created_at: string;
  verified_at?: string;
  rejection_reason?: string;
  target_id: string;
  target_title: string;
  target_total: number;
  target_current: number;
  submitter_email?: string;
  submitter_name?: string;
  verifier_email?: string;
  verifier_name?: string;
  is_duplicate_slip?: boolean;
}

export interface RequestProgress {
  id: string;
  billCategory: string;
  studentAlias: string;
  amountRequested: number;
  amountFunded: number;
  remainingNeeded: number;
  percentage: number;
  status: string;
  dueDate: string;
}

export interface CampaignProgress {
  id: string;
  title: string;
  category: string;
  targetAmount: number;
  amountRaised: number;
  remainingNeeded: number;
  percentage: number;
  status: string;
  coverImage?: string;
  endDate?: string;
}

export interface AppUsageStats {
  totalUsers: number;
  dailyActiveUsers: number;
  dailyTransactionsLogged: number;
  totalTransactionsLogged: number;
  activeGoalsCount: number;
}

export interface LiveImpactTotals {
  currency: string;
  currencySymbol: string;
  updatedAt: string;
  appUsage?: AppUsageStats;
  overall: {
    totalMoneyRaised: number;
    totalVerifiedDonations: number;
    totalVerifiedSponsorships: number;
    successfulDonationsCount: number;
    successfulSponsorshipsCount: number;
    combinedSuccessfulTransactions: number;
    successfullyFundedRequestsCount: number;
    completedCampaignsCount: number;
    totalTreesPlanted?: number;
    totalTreeFunding?: number;
    totalVerifiedTreeDonations?: number;
    successfulTreeDonationsCount?: number;
  };
  tryland: {
    totalFundingReceived: number;
    totalAmountRequested: number;
    totalAmountStillNeeded: number;
    activeRequestsCount: number;
    fullyFundedRequestsCount: number;
    requestsProgress: RequestProgress[];
  };
  donate: {
    totalDonationsReceived: number;
    totalCampaignTargets: number;
    totalAmountRemaining: number;
    activeCampaignsCount: number;
    completedCampaignsCount: number;
    campaignsProgress: CampaignProgress[];
  };
  trees?: {
    totalTreesPlanted: number;
    totalFundingReceived: number;
    totalTargetTrees: number;
    activeInitiativesCount: number;
    initiativesProgress: {
      id: string;
      title: string;
      treesPlanted: number;
      targetTrees: number;
      amountRaised: number;
      costPerTree: number;
      percentage: number;
    }[];
  };
}

export interface AdminUserItem {
  id: string;
  email: string;
  username?: string;
  role: 'owner' | 'admin' | 'user';
  email_verified: boolean;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  actor_id: string;
  actor_email: string;
  action: string;
  target_email: string;
  details: string;
  created_at: string;
}


