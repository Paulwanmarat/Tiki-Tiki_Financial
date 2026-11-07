import { fetchWithAuth } from '@/services/ai/client';
import { TrylandRequest, TrylandSponsorship } from '@/types/tryland';

export async function getTrylandRequests(params?: {
  category?: string;
  status?: string;
}): Promise<TrylandRequest[]> {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.status) query.append('status', params.status);

  const qs = query.toString();
  return fetchWithAuth(`/api/tryland${qs ? `?${qs}` : ''}`);
}

export async function getMyTrylandRequests(): Promise<TrylandRequest[]> {
  return fetchWithAuth('/api/tryland/my-requests');
}

export async function getMyTrylandSponsorships(): Promise<TrylandSponsorship[]> {
  return fetchWithAuth('/api/tryland/my-sponsorships');
}

export async function getTrylandRequestById(id: string): Promise<TrylandRequest> {
  return fetchWithAuth(`/api/tryland/${id}`);
}

export async function submitTrylandRequest(data: {
  bill_category: string;
  amount_requested: number;
  explanation: string;
  due_date: string;
  document_url?: string;
}): Promise<TrylandRequest & { message: string }> {
  return fetchWithAuth('/api/tryland/request', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sponsorTrylandBill(
  id: string,
  payload: {
    amount: number;
    note?: string;
    slip_url?: string;
    slip_reference?: string;
    transfer_time?: string;
    payment_reference?: string;
    guest_name?: string;
    guest_email?: string;
  }
): Promise<{
  success: boolean;
  message: string;
  sponsorshipId: string;
  paymentReference: string;
  amount: number;
  status: string;
}> {
  return fetchWithAuth(`/api/tryland/${id}/sponsor`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyTrylandRequest(
  id: string,
  action: 'approve' | 'reject',
  rejection_reason?: string
): Promise<{ message: string }> {
  return fetchWithAuth(`/api/tryland/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify({ action, rejection_reason }),
  });
}

export async function deleteTrylandRequest(id: string): Promise<{ success: boolean; message: string }> {
  return fetchWithAuth(`/api/tryland/request/${id}`, {
    method: 'DELETE',
  });
}

// ─── 🌳 TRYLAND Tree Planting Services ──────────────────────────────────────
export interface TreeInitiative {
  id: string;
  title: string;
  location: string;
  description: string;
  cost_per_tree: number;
  target_trees: number;
  trees_planted: number;
  amount_raised: number;
  status: 'active' | 'completed';
  donor_count: number;
}

export interface TreeStats {
  total_trees_planted: number;
  total_money_raised: number;
  total_contributors: number;
  co2_offset_kg: number;
}

export async function getTreeInitiatives(): Promise<{ initiatives: TreeInitiative[]; stats: TreeStats }> {
  return fetchWithAuth('/api/tryland/trees');
}

export async function donatePlantTrees(
  initiativeId: string,
  payload: {
    tree_count: number;
    amount: number;
    message?: string;
    slip_url?: string;
    slip_reference?: string;
    transfer_time?: string;
    payment_reference?: string;
    guest_name?: string;
    guest_email?: string;
  }
): Promise<{
  success: boolean;
  message: string;
  donationId: string;
  paymentReference: string;
  amount: number;
  treeCount: number;
  status: string;
}> {
  return fetchWithAuth(`/api/tryland/trees/${initiativeId}/donate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}


