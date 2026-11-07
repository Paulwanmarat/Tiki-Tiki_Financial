export type ProjectDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface ProjectMaterial {
  name: string;
  estCost: number;
  source?: string;
}

export interface ProjectStep {
  title: string;
  detail: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: ProjectDifficulty;
  estimated_budget: number;
  estimated_days: number;
  materials: ProjectMaterial[];
  steps: ProjectStep[];
  expected_outcome: string;
  resources: string[];
  images: string[];
  is_premium: boolean;
  created_by?: string;
  author_name?: string;
  created_at: string;
}

export interface ProjectDetail extends Project {
  isUserPremium: boolean;
  canAccessFullContent: boolean;
}

export interface SubscriptionStatus {
  plan: 'free' | 'premium';
  isPremium: boolean;
  hasActiveGateway: boolean;
  notice: string;
}

export interface ProjectAIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

