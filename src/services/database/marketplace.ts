import { fetchWithAuth } from '@/services/ai/client';
import { MarketplaceListing, MarketplaceDetail, MarketplaceCreateInput } from '@/types/marketplace';

export async function getMarketplaceListings(params?: {
  search?: string;
  category?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
}): Promise<MarketplaceListing[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.category) query.append('category', params.category);
  if (params?.condition) query.append('condition', params.condition);
  if (params?.minPrice !== undefined) query.append('minPrice', params.minPrice.toString());
  if (params?.maxPrice !== undefined) query.append('maxPrice', params.maxPrice.toString());
  if (params?.status) query.append('status', params.status);
  if (params?.sort) query.append('sort', params.sort);

  const qs = query.toString();
  return fetchWithAuth(`/api/marketplace${qs ? `?${qs}` : ''}`);
}

export async function getMyMarketplaceListings(): Promise<MarketplaceListing[]> {
  return fetchWithAuth('/api/marketplace/my');
}

export async function getMarketplaceListingById(id: string): Promise<MarketplaceDetail> {
  return fetchWithAuth(`/api/marketplace/${id}`);
}

export async function createMarketplaceListing(data: MarketplaceCreateInput): Promise<MarketplaceListing> {
  return fetchWithAuth('/api/marketplace', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMarketplaceListing(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    category: string;
    condition: string;
    price: number;
    images: string[];
    status: string;
    contact_info: string;
  }>
): Promise<MarketplaceListing> {
  return fetchWithAuth(`/api/marketplace/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function markMarketplaceItemSold(
  id: string,
  recordTransaction = false
): Promise<{ message: string; recordedToIncome: boolean }> {
  return fetchWithAuth(`/api/marketplace/${id}/sold`, {
    method: 'POST',
    body: JSON.stringify({ recordTransaction }),
  });
}

export async function deleteMarketplaceListing(id: string): Promise<void> {
  await fetchWithAuth(`/api/marketplace/${id}`, {
    method: 'DELETE',
  });
}

export async function expressMarketplaceInterest(
  id: string,
  message: string,
  contact?: string
): Promise<{ message: string }> {
  return fetchWithAuth(`/api/marketplace/${id}/interest`, {
    method: 'POST',
    body: JSON.stringify({ message, contact }),
  });
}

export async function reportMarketplaceListing(
  id: string,
  reason: string,
  details?: string
): Promise<{ message: string }> {
  return fetchWithAuth(`/api/marketplace/${id}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason, details }),
  });
}

