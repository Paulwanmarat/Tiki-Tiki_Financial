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

