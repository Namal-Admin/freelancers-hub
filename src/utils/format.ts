import type {
  MilestoneStatus,
  PayoutStatus,
  TransactionStatus,
} from '../types/marketplace.ts';

export function formatKes(amount: number): string {
  return `KSh ${Math.round(amount).toLocaleString('en-KE')}`;
}

export function formatDateShort(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function getMilestoneStatusDisplay(status: MilestoneStatus): {
  label: string;
  textClass: string;
} {
  switch (status) {
    case 'unfunded':
      return { label: 'Awaiting Funding', textClass: 'text-slate-600' };
    case 'funded_pending_work':
      return { label: 'Funded · In Progress', textClass: 'text-amber-700' };
    case 'submitted_for_review':
      return { label: 'Submitted · Review Ready', textClass: 'text-amber-700' };
    case 'approved_released':
      return { label: 'Approved · Released', textClass: 'text-emerald-700' };
    case 'refunded':
      return { label: 'Refunded', textClass: 'text-red-700' };
  }
}

export function getTransactionStatusDisplay(status: TransactionStatus): {
  label: string;
  textClass: string;
} {
  switch (status) {
    case 'completed':
      return { label: 'Completed', textClass: 'text-emerald-700' };
    case 'pending_approval':
      return { label: 'Pending Approval', textClass: 'text-amber-700' };
    case 'failed':
      return { label: 'Failed', textClass: 'text-red-700' };
    case 'refunded':
      return { label: 'Refunded', textClass: 'text-red-700' };
  }
}

export function getPayoutStatusDisplay(status: PayoutStatus): {
  label: string;
  textClass: string;
} {
  switch (status) {
    case 'paid':
      return { label: 'Paid', textClass: 'text-emerald-700' };
    case 'pending_admin':
      return { label: 'Pending Review', textClass: 'text-amber-700' };
    case 'processing':
      return { label: 'Processing', textClass: 'text-amber-700' };
    case 'failed':
      return { label: 'Returned', textClass: 'text-red-700' };
  }
}
