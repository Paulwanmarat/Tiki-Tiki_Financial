export interface DonateDonor {
  id: string;
  amount: number;
  message: string;
  created_at: string;
  donor_name: string;
}

export interface DonateCampaign {
  id: string;
  organizer_id: string;
  organizer_name: string;
  title: string;
  description: string;
  objective: string;
  target_amount: number;
  amount_raised: number;
  cover_image: string;
  category: string;
  status: 'active' | 'completed' | 'cancelled';
  end_date?: string;
  created_at: string;
  updated_at: string;
  donor_count?: number;
  donors?: DonateDonor[];
}

export interface MyDonation {
  id: string;
  campaign_id: string;
  donor_id: string;
  amount: number;
  message: string;
  is_anonymous: boolean;
  status: string;
  created_at: string;
  campaign_title: string;
  campaign_category: string;
  cover_image: string;
}

export const THINKPAD_DONATE_CAMPAIGN: DonateCampaign = {
  id: 'camp_thinkpad_t14_x1_carbon_aura',
  organizer_id: 'system_organizer',
  organizer_name: 'SPR Student Union',
  title: 'Thinkpad T14 Gen14 X1 Carbon Aura Edition',
  description: 'High-performance computing laptop workstation for student engineering, academic research, and deep development.',
  objective: 'Fund a Thinkpad T14 Gen14 X1 Carbon Aura Edition workstation to equip students with top-tier hardware for coursework and innovation simulations.',
  target_amount: 150000,
  amount_raised: 0,
  cover_image: 'https://p2-ofp.static.pub/ShareResource/optimized/pdp/thinkpad/thinkpad-x1-series/len101t0159/thinkpad-x1-carbon-gen-14-aura-edition-14-intel-hero.png?width=584&height=584',
  category: 'Student Hardware & Technology',
  status: 'active',
  created_at: '2026-11-14T00:00:00.000Z',
  updated_at: '2026-11-14T00:00:00.000Z',
  donor_count: 0,
  donors: [],
};

export const DEFAULT_DONATE_CAMPAIGNS: DonateCampaign[] = [THINKPAD_DONATE_CAMPAIGN];


