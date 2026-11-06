import { fetchWithAuth } from '@/services/ai/client';
import { Project, ProjectDetail, SubscriptionStatus, ProjectAIMessage } from '@/types/projects';

export async function getProjects(params?: {
  category?: string;
  difficulty?: string;
  search?: string;
}): Promise<Project[]> {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.difficulty) query.append('difficulty', params.difficulty);
  if (params?.search) query.append('search', params.search);

  const qs = query.toString();
  return fetchWithAuth(`/api/projects${qs ? `?${qs}` : ''}`);
}

export async function getProjectById(id: string): Promise<ProjectDetail> {
  return fetchWithAuth(`/api/projects/${id}`);
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return fetchWithAuth('/api/projects/subscription/status');
}

export async function activatePilotSubscription(): Promise<{ plan: string; message: string }> {
  return fetchWithAuth('/api/projects/subscription/activate-pilot', {
    method: 'POST',
  });
}

export async function getProjectAIHistory(projectId: string): Promise<ProjectAIMessage[]> {
  return fetchWithAuth(`/api/projects/${projectId}/ai-history`);
}

export async function askProjectAI(
  projectId: string,
  message: string
): Promise<{ reply: string; userMessageId: string; assistantMessageId: string }> {
  return fetchWithAuth(`/api/projects/${projectId}/ai-ask`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

