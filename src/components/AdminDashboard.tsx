import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react';
import type {
  AdminMetrics,
  PayoutRequest,
  Transaction,
  TransactionStatus,
} from '../types/marketplace.ts';
import {
  formatDateTime,
  formatKes,
  getPayoutStatusDisplay,
  getTransactionStatusDisplay,
} from '../utils/format.ts';

interface AdminDashboardProps {
  metrics: AdminMetrics;
  transactions: Transaction[];
  payoutRequests: PayoutRequest[];
  onProcessPayout: (
    payoutId: string,
    action: 'disburse' | 'reject',
  ) => Promise<void>;
  onRetryTransaction: (txId: string) => Promise<void>;
  onRefundMilestone: (milestoneId: string, reason: string) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  metrics,
  transactions,
  payoutRequests,
  onProcessPayout,
  onRetryTransaction,
  onRefundMilestone,
}) => {
  const [txStatusFilter, setTxStatusFilter] = useState<
    'all' | TransactionStatus
  >('all');
  const [txSearch, setTxSearch] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return transactions.filter((t) => {
      if (txStatusFilter !== 'all' && t.status !== txStatusFilter) return false;
      if (!q) return true;
      return (
        t.txRef.toLowerCase().includes(q) ||
        t.flwRef.toLowerCase().includes(q) ||
        t.clientName.toLowerCase().includes(q) ||
        t.freelancerName.toLowerCase().includes(q) ||
        t.projectTitle.toLowerCase().includes(q)
      );
    });
  }, [transactions, txStatusFilter, txSearch]);

  const handlePayoutAction = async (
    payoutId: string,
    action: 'disburse' | 'reject',
  ) => {
    setBusyKey(payoutId);
    try {
      await onProcessPayout(payoutId, action);
    } finally {
      setBusyKey(null);
    }
  };

  const handleRetry = async (txId: string) => {
    setBusyKey(txId);
    try {
      await onRetryTransaction(txId);
    } finally {
      setBusyKey(null);
    }
  };

  const handleRefund = async (milestoneId: string, txId: string) => {
    setBusyKey(txId);
    try {
      await onRefundMilestone(
        milestoneId,
        'Administrative refund issued before milestone approval.',
      );
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Primary Financial KPI Strip (4 Columns) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            Total Money Collected
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatKes(metrics.totalCollected)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Active & settled gross milestone volume
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            Total Freelancer Earnings
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
            {formatKes(metrics.totalFreelancerEarnings)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            90% net share released on approved work
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            Total Platform Commissions
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatKes(metrics.totalPlatformCommissions)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Realized 10% platform commission
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            Pending Payments
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-amber-700 tabular-nums">
            {formatKes(metrics.pendingPayments)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Funded milestones awaiting client approval
          </div>
        </div>
      </div>

      {/* Settlement Health KPI Strip (3 Columns) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            Completed Payments
          </div>
          <div className="mt-2 font-mono text-xl font-semibold text-emerald-700 tabular-nums">
            {formatKes(metrics.completedPayments)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Client-approved & split-settled
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Refunds</div>
          <div className="mt-2 font-mono text-xl font-semibold text-red-700 tabular-nums">
            {formatKes(metrics.totalRefunds)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Reversed prior to work acceptance
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            Failed Transactions
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono text-xl font-semibold text-red-700 tabular-nums">
            <span>{metrics.failedTransactionsCount}</span>
            <span className="text-sm font-normal text-slate-500">
              ({formatKes(metrics.failedTransactionsAmount)})
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            STK timeouts or declined card attempts
          </div>
        </div>
      </div>

      {/* Freelancer Payout Requests Queue */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Freelancer Payout Requests
            </h2>
            <p className="text-xs text-slate-500">
              Manual withdrawal queue via Flutterwave M-Pesa (MPS) and Kenyan
              Bank Transfers
            </p>
          </div>
          <div className="font-mono text-xs font-medium text-amber-700 tabular-nums">
            {metrics.pendingPayoutRequestsCount} pending ·{' '}
            {formatKes(metrics.pendingPayoutRequestsAmount)}
          </div>
        </div>

        {payoutRequests.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No freelancer withdrawal requests submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="px-6 py-3 font-medium">Freelancer</th>
                  <th className="px-4 py-3 font-medium">Method & Destination</th>
                  <th className="px-4 py-3 font-medium">Transfer Ref</th>
                  <th className="px-4 py-3 font-medium">Requested</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-6 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payoutRequests.map((po) => {
                  const statusMeta = getPayoutStatusDisplay(po.status);
                  const isBusy = busyKey === po.id;
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        {po.freelancerName}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        <div className="font-medium">
                          {po.method === 'mpesa'
                            ? 'M-Pesa Mobile Money'
                            : 'Kenyan Bank Transfer'}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {po.destinationLabel} (Bank: {po.accountBankCode})
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600">
                        {po.transferRef}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 tabular-nums">
                        {formatDateTime(po.requestedAt)}
                      </td>
                      <td
                        className={`px-4 py-3.5 font-medium ${statusMeta.textClass}`}
                      >
                        {statusMeta.label}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatKes(po.amount)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {po.status === 'pending_admin' ? (
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handlePayoutAction(po.id, 'disburse')
                              }
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Disburse
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handlePayoutAction(po.id, 'reject')}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Return
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Complete Transaction History */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Transaction History
            </h2>
            <p className="text-xs text-slate-500">
              Split-payment ledger across Flutterwave M-Pesa, Visa/Mastercard,
              Pesapal, and PayPal
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Filter by txRef, client, freelancer..."
                className="w-full rounded-md border border-slate-200 py-1.5 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none sm:w-56"
              />
            </div>

            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {(
                [
                  ['all', 'All'],
                  ['pending_approval', 'Pending'],
                  ['completed', 'Completed'],
                  ['failed', 'Failed'],
                  ['refunded', 'Refunded'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTxStatusFilter(key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    txStatusFilter === key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No transactions match your current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="px-6 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Project & Parties</th>
                  <th className="px-4 py-3 font-medium">Payment Rail</th>
                  <th className="px-4 py-3 text-right font-medium">Gross</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Freelancer (90%)
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Fee (10%)
                  </th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTransactions.map((tx) => {
                  const statusMeta = getTransactionStatusDisplay(tx.status);
                  const isBusy = busyKey === tx.id;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3.5 align-top">
                        <div className="font-mono font-medium text-slate-900">
                          {tx.txRef}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {tx.flwRef}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
                          {formatDateTime(tx.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-medium text-slate-900">
                          {tx.projectTitle}
                        </div>
                        <div className="mt-0.5 text-slate-500">
                          {tx.clientName} → {tx.freelancerName}
                        </div>
                        {tx.failureReason && (
                          <div className="mt-1 text-[11px] text-red-700">
                            {tx.failureReason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-medium text-slate-800">
                          {tx.providerLabel}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {tx.paymentDetail}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right align-top font-mono font-semibold text-slate-900 tabular-nums">
                        {formatKes(tx.grossAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-right align-top font-mono text-emerald-700 tabular-nums">
                        {formatKes(tx.freelancerNet)}
                      </td>
                      <td className="px-4 py-3.5 text-right align-top font-mono text-slate-700 tabular-nums">
                        {formatKes(tx.platformCommission)}
                      </td>
                      <td
                        className={`px-4 py-3.5 align-top font-medium ${statusMeta.textClass}`}
                      >
                        {statusMeta.label}
                      </td>
                      <td className="px-6 py-3.5 text-right align-top">
                        {tx.status === 'failed' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleRetry(tx.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Retry
                          </button>
                        )}
                        {tx.status === 'pending_approval' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleRefund(tx.milestoneId, tx.id)
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Refund
                          </button>
                        )}
                        {(tx.status === 'completed' ||
                          tx.status === 'refunded') && (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
