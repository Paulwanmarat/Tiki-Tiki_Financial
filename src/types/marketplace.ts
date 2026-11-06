export type MarketplaceCategory =
  | 'Textbooks'
  | 'Electronics'
  | 'Dorm & Living'
  | 'Clothing'
  | 'School Supplies'
  | 'Hobbies & Sports'
  | 'Other';

export type MarketplaceCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

export type MarketplaceStatus = 'available' | 'pending_handover' | 'sold' | 'removed';

export interface MarketplaceListing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: MarketplaceCategory | string;
  condition: MarketplaceCondition;
  price: number;
  images: string[];
  status: MarketplaceStatus;
  contact_info: string;
  buyer_interest_count: number;
  seller_name?: string;
  seller_avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceDetail extends MarketplaceListing {
  hasExpressedInterest: boolean;
  myInterest?: {
    id: string;
    message: string;
    contact: string;
    created_at: string;
  } | null;
  buyerInterests?: Array<{
    id: string;
    user_id: string;
    buyer_name?: string;
    buyer_avatar?: string;
    message: string;
    contact: string;
    created_at: string;
  }>;
  isOwner: boolean;
}

