export type TrylandCategory =
  | 'Educational expenses'
  | 'School supplies'
  | 'Learning equipment'
  | 'School-related activities'
  | 'Essential student bills';

export type TrylandStatus =
  | 'pending_verification'
  | 'open'
  | 'approved'
  | 'rejected'
  | 'partially_funded'
  | 'fully_funded'
  | 'completed';

export interface TrylandRequest {
  id: string;
  bill_category: TrylandCategory | string;
  amount_requested: number;
  amount_funded: number;
  explanation: string;
  due_date: string;
  status: TrylandStatus;
  created_at: string;
  student_alias: string;
  sponsors_count?: number;
  document_url?: string;
  rejection_reason?: string;
  isOwner?: boolean;
}

export interface TrylandSponsorship {
  id: string;
  request_id: string;
  sponsor_id: string;
  amount: number;
  note: string;
  status: string;
  created_at: string;
  bill_category?: string;
  amount_requested?: number;
  amount_funded?: number;
  due_date?: string;
  request_status?: string;
}

