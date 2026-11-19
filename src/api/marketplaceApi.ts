import type {
  AdminMetrics,
  Freelancer,
  FreelancerWalletSummary,
  MarketplaceState,
  PaymentProviderId,
  PayoutMethod,
} from '../types/marketplace.ts';

export interface BankOption {
  code: string;
  name: string;
}

export interface HydratedStateResponse {
  state: MarketplaceState;
  wallets: Record<string, FreelancerWalletSummary>;
  adminMetrics: AdminMetrics;
  banks: BankOption[];
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function fetchMarketplaceState(): Promise<HydratedStateResponse> {
  return requestJson<HydratedStateResponse>('/api/state');
}

export function resetDemoMarketplace(): Promise<HydratedStateResponse> {
  return requestJson<HydratedStateResponse>('/api/state/reset', {
    method: 'POST',
  });
}

export function setActiveFreelancer(freelancerId: string): Promise<{ ok: boolean }> {
  return requestJson('/api/freelancer/active', {
    method: 'POST',
    body: JSON.stringify({ freelancerId }),
  });
}

export function updateFreelancerPayoutSettings(
  freelancerId: string,
  payload: {
    mpesaNumber: string;
    bankCode: string;
    bankAccountNumber: string;
    bankAccountName: string;
  },
): Promise<{ freelancer: Freelancer }> {
  return requestJson(`/api/freelancers/${freelancerId}/payout-settings`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function createProjectContract(payload: {
  title: string;
  clientName: string;
  clientCountry: string;
  freelancerId: string;
  category: string;
  totalBudget: number;
  scheduleType: 'single' | 'multi_30_40_30';
}): Promise<{ project: unknown }> {
  return requestJson('/api/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fundMilestone(
  milestoneId: string,
  payload: {
    provider: PaymentProviderId;
    paymentDetail: string;
    simulateFailure?: boolean;
  },
): Promise<{ milestone: unknown; transaction: unknown; paymentLink?: string }> {
  return requestJson(`/api/milestones/${milestoneId}/fund`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitMilestoneDeliverable(
  milestoneId: string,
  payload: { deliverableNote: string; deliverableUrl: string },
): Promise<{ milestone: unknown }> {
  return requestJson(`/api/milestones/${milestoneId}/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function approveMilestoneWork(milestoneId: string): Promise<{ milestone: unknown }> {
  return requestJson(`/api/milestones/${milestoneId}/approve`, {
    method: 'POST',
  });
}

export function refundMilestonePayment(
  milestoneId: string,
  reason: string,
): Promise<{ milestone: unknown }> {
  return requestJson(`/api/milestones/${milestoneId}/refund`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function retryFailedTransaction(txId: string): Promise<{ transaction: unknown }> {
  return requestJson(`/api/transactions/${txId}/retry`, {
    method: 'POST',
  });
}

export function requestFreelancerWithdrawal(payload: {
  freelancerId: string;
  method: PayoutMethod;
  amount: number;
  customMpesaNumber?: string;
  customBankCode?: string;
  customBankAccountNumber?: string;
}): Promise<{ payoutRequest: unknown }> {
  return requestJson('/api/payouts/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function processPayoutRequest(
  payoutId: string,
  action: 'disburse' | 'reject',
): Promise<{ payoutRequest: unknown }> {
  return requestJson(`/api/payouts/${payoutId}/process`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

export function createTopicRoom(payload: {
  title: string;
  category: string;
  description: string;
  createdBy: string;
}): Promise<{ topic: unknown }> {
  return requestJson('/api/community/topics', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function postDiscussionMessage(payload: {
  topicId: string;
  authorName: string;
  authorRole: string;
  body: string;
  replyToId?: string;
  replyToAuthor?: string;
}): Promise<{ message: unknown }> {
  return requestJson('/api/community/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createBrainstormIdea(payload: {
  topicId: string;
  title: string;
  summary: string;
  tag: 'Workflow' | 'Pricing' | 'Feature' | 'Growth';
  authorName: string;
  authorRole: string;
}): Promise<{ idea: unknown }> {
  return requestJson('/api/community/ideas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function voteBrainstormIdea(
  ideaId: string,
  voterName: string,
): Promise<{ idea: unknown }> {
  return requestJson(`/api/community/ideas/${ideaId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ voterName }),
  });
}

