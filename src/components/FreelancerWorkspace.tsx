import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Info,
  Send,
  Wallet,
} from 'lucide-react';
import type { BankOption } from '../api/marketplaceApi.ts';
import type {
  Freelancer,
  FreelancerWalletSummary,
  PayoutRequest,
  Project,
} from '../types/marketplace.ts';
import {
  formatDateShort,
  formatDateTime,
  formatKes,
  getMilestoneStatusDisplay,
  getPayoutStatusDisplay,
} from '../utils/format.ts';

interface FreelancerWorkspaceProps {
  freelancers: Freelancer[];
  activeFreelancerId: string;
  wallets: Record<string, FreelancerWalletSummary>;
  projects: Project[];
  payoutRequests: PayoutRequest[];
  banks: BankOption[];
  onSwitchFreelancer: (id: string) => Promise<void>;
  onOpenWithdraw: () => void;
  onSubmitDeliverable: (
    milestoneId: string,
    note: string,
    url: string,
  ) => Promise<void>;
  onSavePayoutSettings: (
    freelancerId: string,
    payload: {
      mpesaNumber: string;
      bankCode: string;
      bankAccountNumber: string;
      bankAccountName: string;
    },
  ) => Promise<void>;
}

type FreelancerTab = 'milestones' | 'withdrawals' | 'settings';

export const FreelancerWorkspace: React.FC<FreelancerWorkspaceProps> = ({
  freelancers,
  activeFreelancerId,
  wallets,
  projects,
  payoutRequests,
  banks,
  onSwitchFreelancer,
  onOpenWithdraw,
  onSubmitDeliverable,
  onSavePayoutSettings,
}) => {
  const [activeTab, setActiveTab] = useState<FreelancerTab>('milestones');
  const [deliverableNotes, setDeliverableNotes] = useState<
    Record<string, string>
  >({});
  const [deliverableUrls, setDeliverableUrls] = useState<
    Record<string, string>
  >({});
  const [submittingMsId, setSubmittingMsId] = useState<string | null>(null);

  const freelancer = useMemo(
    () =>
      freelancers.find((f) => f.id === activeFreelancerId) || freelancers[0],
    [freelancers, activeFreelancerId],
  );

  const wallet = wallets[freelancer.id] || {
    freelancerId: freelancer.id,
    availableEarnings: 0,
    pendingEarnings: 0,
    totalWithdrawn: 0,
    pendingWithdrawals: 0,
    lifetimeNetEarned: 0,
  };

  const [mpesaNumber, setMpesaNumber] = useState(freelancer.mpesaNumber);
  const [bankCode, setBankCode] = useState(freelancer.bankCode);
  const [bankAccountNumber, setBankAccountNumber] = useState(
    freelancer.bankAccountNumber,
  );
  const [bankAccountName, setBankAccountName] = useState(
    freelancer.bankAccountName,
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const syncFormToFreelancer = (next: Freelancer) => {
    setMpesaNumber(next.mpesaNumber);
    setBankCode(next.bankCode);
    setBankAccountNumber(next.bankAccountNumber);
    setBankAccountName(next.bankAccountName);
    setSettingsSaved(false);
  };

  const myProjects = useMemo(
    () => projects.filter((p) => p.freelancerId === freelancer.id),
    [projects, freelancer.id],
  );

  const myPayouts = useMemo(
    () => payoutRequests.filter((p) => p.freelancerId === freelancer.id),
    [payoutRequests, freelancer.id],
  );

  const handleDeliverableSubmit = async (milestoneId: string) => {
    setSubmittingMsId(milestoneId);
    try {
      await onSubmitDeliverable(
        milestoneId,
        deliverableNotes[milestoneId] ||
          'Completed milestone deliverables uploaded for client verification.',
        deliverableUrls[milestoneId] ||
          'https://deliverables.kazigrid.example/release',
      );
    } finally {
      setSubmittingMsId(null);
    }
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      await onSavePayoutSettings(freelancer.id, {
        mpesaNumber,
        bankCode,
        bankAccountNumber,
        bankAccountName,
      });
      setSettingsSaved(true);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Freelancer Profile Selector + Manual Withdrawal Action */}
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Active Freelancer Account</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              Flutterwave Subaccount {freelancer.subaccountId}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <select
              aria-label="Switch active freelancer"
              value={freelancer.id}
              onChange={(e) => {
                const next = freelancers.find((f) => f.id === e.target.value);
                if (next) syncFormToFreelancer(next);
                void onSwitchFreelancer(e.target.value);
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-display text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
            >
              {freelancers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} — {f.title}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">{freelancer.location}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenWithdraw}
          disabled={wallet.availableEarnings < 500}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Wallet className="h-3.5 w-3.5" />
          Request Withdrawal ({formatKes(wallet.availableEarnings)})
        </button>
      </div>

      {/* 4-Column Wallet Ledger Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            Available Earnings
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
            {formatKes(wallet.availableEarnings)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Ready for manual M-Pesa or bank payout
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            Pending Earnings
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-amber-700 tabular-nums">
            {formatKes(wallet.pendingEarnings)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Funded milestones awaiting client approval
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            Withdrawal History Total
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatKes(wallet.totalWithdrawn)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {wallet.pendingWithdrawals > 0
              ? `${formatKes(wallet.pendingWithdrawals)} pending admin transfer`
              : 'All requested payouts settled'}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            Lifetime Net (After 10% Fee)
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatKes(wallet.lifetimeNetEarned)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            90% net split across approved milestones
          </div>
        </div>
      </div>

      {/* Regulated Ledger Disclosure */}
      <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <span>
          This wallet displays a ledger of payment-provider-backed project
          earnings routed through Flutterwave split subaccounts—not an
          unregulated deposit-taking wallet. Funds become eligible for manual
          withdrawal once the client approves completed milestone deliverables.
        </span>
      </div>

      {/* Sub-tabs */}
      <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('milestones')}
          className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'milestones'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Assigned Milestones ({myProjects.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('withdrawals')}
          className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'withdrawals'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Withdrawal History ({myPayouts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'settings'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          M-Pesa & Bank Destinations
        </button>
      </div>

      {/* SUBTAB 1: ASSIGNED MILESTONES */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          {myProjects.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No active contracts assigned to {freelancer.name} yet.
            </div>
          ) : (
            myProjects.map((project) => (
              <div
                key={project.id}
                className="rounded-lg border border-slate-200 bg-white"
              >
                <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs text-slate-500">
                      {project.clientName} · {project.clientCountry}
                    </div>
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      {project.title}
                    </h3>
                  </div>
                  <div className="font-mono text-sm font-medium text-slate-700 tabular-nums">
                    Total {formatKes(project.totalBudget)}
                  </div>
                </div>

                <div className="divide-y divide-slate-200">
                  {project.milestones.map((ms) => {
                    const statusMeta = getMilestoneStatusDisplay(ms.status);
                    return (
                      <div key={ms.id} className="space-y-3 px-6 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {ms.title}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                              <span className="text-emerald-700 font-medium">
                                Your 90% Share: {formatKes(ms.freelancerShare)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                Gross {formatKes(ms.grossAmount)} (10% fee{' '}
                                {formatKes(ms.platformCommission)})
                              </span>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusMeta.textClass}`}
                          >
                            {ms.status === 'approved_released' ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Clock className="h-3.5 w-3.5" />
                            )}
                            {statusMeta.label}
                          </span>
                        </div>

                        {ms.status === 'funded_pending_work' && (
                          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                            <div className="text-xs font-medium text-slate-700">
                              Submit Completed Work for Client Approval
                            </div>
                            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <input
                                type="text"
                                placeholder="Deliverable summary (e.g., staging site & Figma links)"
                                value={deliverableNotes[ms.id] || ''}
                                onChange={(e) =>
                                  setDeliverableNotes((prev) => ({
                                    ...prev,
                                    [ms.id]: e.target.value,
                                  }))
                                }
                                className="sm:col-span-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                              />
                              <input
                                type="text"
                                placeholder="Deliverable URL"
                                value={deliverableUrls[ms.id] || ''}
                                onChange={(e) =>
                                  setDeliverableUrls((prev) => ({
                                    ...prev,
                                    [ms.id]: e.target.value,
                                  }))
                                }
                                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                              />
                            </div>
                            <div className="mt-3 flex justify-end">
                              <button
                                type="button"
                                disabled={submittingMsId === ms.id}
                                onClick={() => handleDeliverableSubmit(ms.id)}
                                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                              >
                                <Send className="h-3.5 w-3.5" />
                                Submit Deliverable
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUBTAB 2: WITHDRAWAL HISTORY */}
      {activeTab === 'withdrawals' && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Withdrawal History
            </h3>
            <span className="text-xs text-slate-500">
              M-Pesa & Kenyan Bank Transfers
            </span>
          </div>

          {myPayouts.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No withdrawal requests yet. Once a client approves a milestone,
              click Request Withdrawal above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <th className="px-6 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium">Destination</th>
                    <th className="px-4 py-3 font-medium">Requested</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {myPayouts.map((po) => {
                    const statusMeta = getPayoutStatusDisplay(po.status);
                    return (
                      <tr key={po.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-3 font-mono text-slate-900">
                          {po.transferRef}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {po.method === 'mpesa' ? 'M-Pesa (MPS)' : 'Bank Transfer'}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {po.destinationLabel}
                        </td>
                        <td className="px-4 py-3 text-slate-500 tabular-nums">
                          {formatDateTime(po.requestedAt)}
                        </td>
                        <td className={`px-4 py-3 font-medium ${statusMeta.textClass}`}>
                          {statusMeta.label}
                        </td>
                        <td className="px-6 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {formatKes(po.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: PAYOUT DESTINATIONS */}
      {activeTab === 'settings' && (
        <form
          onSubmit={handleSettingsSave}
          className="rounded-lg border border-slate-200 bg-white p-6 space-y-4 max-w-2xl"
        >
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Saved M-Pesa & Bank Payout Destinations
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Used when initiating manual Flutterwave transfers (account_bank:
              MPS for M-Pesa or your Kenyan bank code).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="set-mpesa"
                className="block text-xs font-medium text-slate-700"
              >
                M-Pesa Mobile Number
              </label>
              <input
                id="set-mpesa"
                type="text"
                value={mpesaNumber}
                onChange={(e) => setMpesaNumber(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="set-bank"
                className="block text-xs font-medium text-slate-700"
              >
                Kenyan Bank
              </label>
              <select
                id="set-bank"
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              >
                {banks.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="set-acct-num"
                className="block text-xs font-medium text-slate-700"
              >
                Bank Account Number
              </label>
              <input
                id="set-acct-num"
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="set-acct-name"
                className="block text-xs font-medium text-slate-700"
              >
                Beneficiary Account Name
              </label>
              <input
                id="set-acct-name"
                type="text"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {settingsSaved ? (
              <span className="text-xs font-medium text-emerald-700">
                Payout destinations updated ({formatDateShort(new Date().toISOString())}).
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={savingSettings}
              className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Save Payout Details'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
