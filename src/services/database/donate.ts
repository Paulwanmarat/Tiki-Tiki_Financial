import { fetchWithAuth } from '@/services/ai/client';
import { DonateCampaign, MyDonation } from '@/types/donate';

export async function getDonateCampaigns(params?: {
  category?: string;
  search?: string;
  status?: string;
}): Promise<DonateCampaign[]> {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.search) query.append('search', params.search);
  if (params?.status) query.append('status', params.status);

  const qs = query.toString();
  return fetchWithAuth(`/api/donate${qs ? `?${qs}` : ''}`);
}

export async function getDonateCampaignById(id: string): Promise<DonateCampaign> {
  return fetchWithAuth(`/api/donate/${id}`);
}

export async function getMyDonations(): Promise<MyDonation[]> {
  return fetchWithAuth('/api/donate/my-donations');
}

export async function createDonateCampaign(data: {
  title: string;
  description: string;
  objective: string;
  target_amount: number;
  cover_image?: string;
  category?: string;
  end_date?: string;
}): Promise<DonateCampaign> {
  return fetchWithAuth('/api/donate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function submitDonation(
  campaignId: string,
  payload: {
    amount: number;
    message?: string;
    is_anonymous?: boolean;
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
  status: string;
}> {
  return fetchWithAuth(`/api/donate/${campaignId}/donate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteDonateCampaign(id: string): Promise<{ success: boolean; message: string }> {
  return fetchWithAuth(`/api/donate/${id}`, {
    method: 'DELETE',
  });
}

