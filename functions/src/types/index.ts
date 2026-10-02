import type { Timestamp } from 'firebase-admin/firestore';

export interface UserAiQuota {
  monthlyLimit: number;
  used: number;
  resetDate: string; // ISO formato YYYY-MM-DD
  totalTokensConsumed: number;
}

export interface UserDocument {
  displayName?: string;
  email?: string;
  plan?: 'free' | 'premium';
  premiumSince?: Timestamp | string | null;
  premiumUntil?: Timestamp | string | null;
  aiQuota?: UserAiQuota;
  createdAt?: Timestamp | string;
  lastActiveAt?: Timestamp | string;
}

export interface AuthUserContext {
  uid: string;
  email?: string;
  displayName?: string;
}

export interface GeminiProxyRequestBody {
  model?: string;
  contents: Array<{
    role?: string;
    parts: Array<{ text: string } | Record<string, any>>;
  }>;
  systemInstruction?: any;
  generationConfig?: any;
  safetySettings?: any;
}

export interface QuotaCheckResult {
  allowed: boolean;
  status?: number;
  error?: string;
  upgradeUrl?: string;
  quota?: UserAiQuota;
}
