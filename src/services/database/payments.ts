import { fetchWithAuth } from '@/services/ai/client';
import { LiveImpactTotals, PaymentSubmission, AdminUserItem, AdminAuditLog } from '@/types/payments';

export async function getLiveImpactTotals(): Promise<LiveImpactTotals> {
  return fetchWithAuth('/api/impact/live-totals');
}

export async function getAdminPayments(params?: {
  status?: string;
  type?: string;
  search?: string;
}): Promise<PaymentSubmission[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.type) query.append('type', params.type);
  if (params?.search) query.append('search', params.search);
  const qs = query.toString();
  return fetchWithAuth(`/api/admin/payments${qs ? `?${qs}` : ''}`);
}

export async function verifyAdminPayment(
  type: 'tryland' | 'donate' | 'tree',
  id: string,
  action: 'approve' | 'reject',
  rejection_reason?: string
): Promise<{ success: boolean; message: string; status: string }> {
  return fetchWithAuth(`/api/admin/payments/${type}/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify({ action, rejection_reason }),
  });
}

export async function getAdminUsers(params?: {
  search?: string;
  role?: string;
}): Promise<AdminUserItem[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.role) query.append('role', params.role);
  const qs = query.toString();
  return fetchWithAuth(`/api/admin/users${qs ? `?${qs}` : ''}`);
}

export async function assignUserRole(
  email: string,
  role: 'admin' | 'user'
): Promise<{ success: boolean; message: string; user: AdminUserItem }> {
  return fetchWithAuth('/api/admin/users/assign-role', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function getAdminAuditLogs(): Promise<AdminAuditLog[]> {
  return fetchWithAuth('/api/admin/users/audit-logs');
}


