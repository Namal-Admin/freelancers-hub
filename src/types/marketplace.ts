export type UserRole = 'client' | 'freelancer' | 'admin' | 'community';

export interface TopicRoom {
  id: string;
  title: string;
  category: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface DiscussionMessage {
  id: string;
  topicId: string;
  authorName: string;
  authorRole: string;
  body: string;
  replyToId?: string;
  replyToAuthor?: string;
  createdAt: string;
}

export interface BrainstormIdea {
  id: string;
  topicId: string;
  title: string;
  summary: string;
  tag: 'Workflow' | 'Pricing' | 'Feature' | 'Growth';
  authorName: string;
  authorRole: string;
  votes: number;
  votedBy: string[];
  createdAt: string;
}

export interface RoomParticipant {
  clientId: string;
  name: string;
  role: string;
  topicId: string;
  joinedAt: string;
}

export interface MarketplaceState {
  freelancers: Freelancer[];
  projects: Project[];
  transactions: Transaction[];
  payoutRequests: PayoutRequest[];
  activeFreelancerId: string;
  gatewayConfigured: boolean;
  topics: TopicRoom[];
  messages: DiscussionMessage[];
  ideas: BrainstormIdea[];
}

export type PaymentProviderId =
  | 'flutterwave_mpesa'
  | 'flutterwave_card'
  | 'pesapal'
  | 'paypal';

export type MilestoneStatus =
  | 'unfunded'
  | 'funded_pending_work'
  | 'submitted_for_review'
  | 'approved_released'
  | 'refunded';

export type TransactionStatus =
  | 'pending_approval'
  | 'completed'
  | 'failed'
  | 'refunded';

export type PayoutMethod = 'mpesa' | 'bank';

export type PayoutStatus = 'pending_admin' | 'processing' | 'paid' | 'failed';

export interface Freelancer {
  id: string;
  name: string;
  title: string;
  location: string;
  avatarUrl: string;
  hourlyRateKes: number;
  projectStartingKes: number;
  rating: number;
  completedJobs: number;
  skills: string[];
  bio: string;
  subaccountId: string;
  mpesaNumber: string;
  bankCode: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

export interface Milestone {
  id: string;
  title: string;
  percentage: number;
  grossAmount: number;
  freelancerShare: number;
  platformCommission: number;
  status: MilestoneStatus;
  dueDate: string;
  deliverableNote?: string;
  deliverableUrl?: string;
  fundedAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  refundedAt?: string;
  provider?: PaymentProviderId;
}

export interface Project {
  id: string;
  title: string;
  clientName: string;
  clientCountry: string;
  freelancerId: string;
  category: string;
  currency: 'KES';
  totalBudget: number;
  scheduleType: 'single' | 'multi_30_40_30';
  createdAt: string;
  milestones: Milestone[];
}

export interface Transaction {
  id: string;
  txRef: string;
  flwRef: string;
  projectId: string;
  projectTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  provider: PaymentProviderId;
  providerLabel: string;
  paymentDetail: string;
  grossAmount: number;
  platformCommission: number;
  freelancerNet: number;
  status: TransactionStatus;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  splitSubaccountId: string;
  gatewayMode: 'flutterwave_live' | 'sandbox_protocol';
}

export interface PayoutRequest {
  id: string;
  freelancerId: string;
  freelancerName: string;
  method: PayoutMethod;
  accountBankCode: string;
  destinationLabel: string;
  accountNumber: string;
  amount: number;
  status: PayoutStatus;
  transferRef: string;
  requestedAt: string;
  processedAt?: string;
  notes?: string;
}

export interface AdminMetrics {
  totalCollected: number;
  totalFreelancerEarnings: number;
  totalPlatformCommissions: number;
  pendingPayments: number;
  completedPayments: number;
  totalRefunds: number;
  failedTransactionsCount: number;
  failedTransactionsAmount: number;
  pendingPayoutRequestsAmount: number;
  pendingPayoutRequestsCount: number;
}

export interface FreelancerWalletSummary {
  freelancerId: string;
  availableEarnings: number;
  pendingEarnings: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  lifetimeNetEarned: number;
}
