import React, { useCallback, useEffect, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Download,
  Landmark,
  Menu,
  MessageSquare,
  Plus,
  RotateCcw,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import {
  approveMilestoneWork,
  createBrainstormIdea,
  createProjectContract,
  createTopicRoom,
  fetchMarketplaceState,
  fundMilestone,
  postDiscussionMessage,
  processPayoutRequest,
  refundMilestonePayment,
  requestFreelancerWithdrawal,
  resetDemoMarketplace,
  retryFailedTransaction,
  setActiveFreelancer,
  submitMilestoneDeliverable,
  updateFreelancerPayoutSettings,
  voteBrainstormIdea,
  type HydratedStateResponse,
} from './api/marketplaceApi.ts';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { ClientWorkspace } from './components/ClientWorkspace.tsx';
import { CommunityWorkspace } from './components/CommunityWorkspace.tsx';
import { CreateProjectModal } from './components/CreateProjectModal.tsx';
import { FreelancerWorkspace } from './components/FreelancerWorkspace.tsx';
import { WithdrawModal } from './components/WithdrawModal.tsx';
import type {
  BrainstormIdea,
  DiscussionMessage,
  Freelancer,
  Milestone,
  PaymentProviderId,
  PayoutMethod,
  Project,
  TopicRoom,
  UserRole,
} from './types/marketplace.ts';
import { formatKes } from './utils/format.ts';

interface ToastBanner {
  id: number;
  tone: 'success' | 'error';
  message: string;
}

export default function App() {
  const [role, setRole] = useState<UserRole>('client');
  const [data, setData] = useState<HydratedStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [hireModalOpen, setHireModalOpen] = useState(false);
  const [hireFreelancerId, setHireFreelancerId] = useState<string | undefined>(
    undefined,
  );
  const [checkoutTarget, setCheckoutTarget] = useState<{
    project: Project;
    milestone: Milestone;
    freelancer: Freelancer;
  } | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [createTopicModalOpen, setCreateTopicModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastBanner | null>(null);

  const notify = useCallback(
    (tone: 'success' | 'error', message: string) => {
      const id = Date.now();
      setToast({ id, tone, message });
      setTimeout(() => {
        setToast((curr) => (curr?.id === id ? null : curr));
      }, 4500);
    },
    [],
  );

  const refreshState = useCallback(async () => {
    try {
      const res = await fetchMarketplaceState();
      setData(res);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Unable to load marketplace state.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const handleCreateProject = async (payload: {
    title: string;
    clientName: string;
    clientCountry: string;
    freelancerId: string;
    category: string;
    totalBudget: number;
    scheduleType: 'single' | 'multi_30_40_30';
  }) => {
    await createProjectContract(payload);
    await refreshState();
    notify('success', `Contract "${payload.title}" created with milestones.`);
  };

  const handleConfirmPayment = async (payload: {
    milestoneId: string;
    provider: PaymentProviderId;
    paymentDetail: string;
    simulateFailure: boolean;
  }) => {
    try {
      await fundMilestone(payload.milestoneId, {
        provider: payload.provider,
        paymentDetail: payload.paymentDetail,
        simulateFailure: payload.simulateFailure,
      });
      await refreshState();
      notify(
        'success',
        'Milestone funded and recorded in the split-payment ledger.',
      );
    } catch (err) {
      await refreshState();
      const msg =
        err instanceof Error ? err.message : 'Payment failed at gateway.';
      notify('error', msg);
      throw err;
    }
  };

  const handleApproveMilestone = async (milestoneId: string) => {
    await approveMilestoneWork(milestoneId);
    await refreshState();
    notify(
      'success',
      'Work approved. 90% credited to freelancer available balance and 10% platform commission finalized.',
    );
  };

  const handleRefundMilestone = async (milestoneId: string, reason: string) => {
    await refundMilestonePayment(milestoneId, reason);
    await refreshState();
    notify('success', 'Milestone payment refunded and recorded in ledger.');
  };

  const handleSubmitDeliverable = async (
    milestoneId: string,
    note: string,
    url: string,
  ) => {
    await submitMilestoneDeliverable(milestoneId, {
      deliverableNote: note,
      deliverableUrl: url,
    });
    await refreshState();
    notify('success', 'Deliverable submitted for client approval.');
  };

  const handleRequestWithdrawal = async (payload: {
    freelancerId: string;
    method: PayoutMethod;
    amount: number;
    customMpesaNumber?: string;
    customBankCode?: string;
    customBankAccountNumber?: string;
  }) => {
    await requestFreelancerWithdrawal(payload);
    await refreshState();
    notify(
      'success',
      `Withdrawal request for ${formatKes(payload.amount)} queued for admin disbursement.`,
    );
  };

  const handleProcessPayout = async (
    payoutId: string,
    action: 'disburse' | 'reject',
  ) => {
    await processPayoutRequest(payoutId, action);
    await refreshState();
    notify(
      'success',
      action === 'disburse'
        ? 'Payout disbursed via Flutterwave transfer.'
        : 'Payout request returned to freelancer available balance.',
    );
  };

  const handleRetryTransaction = async (txId: string) => {
    await retryFailedTransaction(txId);
    await refreshState();
    notify('success', 'Failed payment retried and settled to pending review.');
  };

  const handleSavePayoutSettings = async (
    freelancerId: string,
    payload: {
      mpesaNumber: string;
      bankCode: string;
      bankAccountNumber: string;
      bankAccountName: string;
    },
  ) => {
    await updateFreelancerPayoutSettings(freelancerId, payload);
    await refreshState();
    notify('success', 'Freelancer payout destinations saved.');
  };

  const handleSwitchFreelancer = async (freelancerId: string) => {
    await setActiveFreelancer(freelancerId);
    await refreshState();
  };

  const handleResetDemo = async () => {
    const res = await resetDemoMarketplace();
    setData(res);
    notify('success', 'Marketplace ledger restored to initial demo state.');
  };

  const handleExportCsv = () => {
    if (!data) return;
    const headers = [
      'txRef',
      'flwRef',
      'project',
      'client',
      'freelancer',
      'provider',
      'grossAmountKES',
      'freelancerNetKES',
      'platformCommissionKES',
      'status',
      'createdAt',
    ];
    const rows = data.state.transactions.map((t) =>
      [
        t.txRef,
        t.flwRef,
        `"${t.projectTitle.replace(/"/g, '""')}"`,
        `"${t.clientName.replace(/"/g, '""')}"`,
        `"${t.freelancerName.replace(/"/g, '""')}"`,
        `"${t.providerLabel}"`,
        t.grossAmount,
        t.freelancerNet,
        t.platformCommission,
        t.status,
        t.createdAt,
      ].join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `freelance-hub-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify('success', 'Transaction ledger CSV downloaded.');
  };

  const handleCreateTopic = async (payload: {
    title: string;
    category: string;
    description: string;
    createdBy: string;
  }) => {
    await createTopicRoom(payload);
    await refreshState();
    notify('success', `Topic room "${payload.title}" created.`);
  };

  const handlePostMessage = async (payload: {
    topicId: string;
    authorName: string;
    authorRole: string;
    body: string;
    replyToId?: string;
    replyToAuthor?: string;
  }) => {
    await postDiscussionMessage(payload);
  };

  const handleCreateIdea = async (payload: {
    topicId: string;
    title: string;
    summary: string;
    tag: 'Workflow' | 'Pricing' | 'Feature' | 'Growth';
    authorName: string;
    authorRole: string;
  }) => {
    await createBrainstormIdea(payload);
    notify('success', 'Brainstorm idea added to board.');
  };

  const handleVoteIdea = async (ideaId: string, voterName: string) => {
    await voteBrainstormIdea(ideaId, voterName);
  };

  const handleRealtimeEvent = useCallback(
    (event: { type: string; payload: unknown }) => {
      setData((curr) => {
        if (!curr) return curr;
        if (event.type === 'topic:created') {
          const topic = event.payload as TopicRoom;
          if (curr.state.topics.some((t) => t.id === topic.id)) return curr;
          return {
            ...curr,
            state: {
              ...curr.state,
              topics: [topic, ...curr.state.topics],
            },
          };
        }
        if (event.type === 'message:created') {
          const msg = event.payload as DiscussionMessage;
          if (curr.state.messages.some((m) => m.id === msg.id)) return curr;
          return {
            ...curr,
            state: {
              ...curr.state,
              messages: [...curr.state.messages, msg],
            },
          };
        }
        if (event.type === 'idea:created') {
          const idea = event.payload as BrainstormIdea;
          if (curr.state.ideas.some((i) => i.id === idea.id)) return curr;
          return {
            ...curr,
            state: {
              ...curr.state,
              ideas: [idea, ...curr.state.ideas],
            },
          };
        }
        if (event.type === 'idea:voted') {
          const updated = event.payload as BrainstormIdea;
          return {
            ...curr,
            state: {
              ...curr.state,
              ideas: curr.state.ideas.map((i) =>
                i.id === updated.id ? updated : i,
              ),
            },
          };
        }
        return curr;
      });
    },
    [],
  );

  const activeFreelancer =
    data?.state.freelancers.find(
      (f) => f.id === data.state.activeFreelancerId,
    ) || data?.state.freelancers[0];

  const activeWallet =
    activeFreelancer && data
      ? data.wallets[activeFreelancer.id]
      : undefined;

  const breadcrumbLabel =
    role === 'client'
      ? 'Workspace / Client Marketplace'
      : role === 'freelancer'
        ? 'Workspace / Freelancer Wallet & Jobs'
        : role === 'community'
          ? 'Workspace / Community & Brainstorm'
          : 'Workspace / Admin Payment Console';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Left Sidebar (256px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-150 lg:static lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setRole('client');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Freelance Hub
          </a>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4" aria-label="Workspace roles">
          <div className="px-3 pb-2 text-[11px] font-medium text-slate-400">
            Role Workspaces
          </div>

          <button
            type="button"
            onClick={() => {
              setRole('client');
              setMobileNavOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
              role === 'client'
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Briefcase className="h-4 w-4 shrink-0" />
            <span>Client Marketplace</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole('freelancer');
              setMobileNavOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
              role === 'freelancer'
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Wallet className="h-4 w-4 shrink-0" />
            <span>Freelancer Wallet</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole('admin');
              setMobileNavOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
              role === 'admin'
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-3">
              <Landmark className="h-4 w-4 shrink-0" />
              <span>Admin Console</span>
            </span>
            {data && data.adminMetrics.pendingPayoutRequestsCount > 0 && (
              <span className="font-mono text-xs font-semibold text-amber-700 tabular-nums">
                {data.adminMetrics.pendingPayoutRequestsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setRole('community');
              setMobileNavOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
              role === 'community'
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span>Discussions & Ideas</span>
            </span>
            {data && (
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {data.state.topics.length}
              </span>
            )}
          </button>

          {data && (
            <div className="mt-6 border-t border-slate-200 pt-5 px-3 space-y-3">
              <div className="text-[11px] font-medium text-slate-400">
                Settlement Summary
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Commission Rate</span>
                  <span className="font-mono font-medium text-slate-900 tabular-nums">
                    10%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Collected</span>
                  <span className="font-mono font-medium text-slate-900 tabular-nums">
                    {formatKes(data.adminMetrics.totalCollected)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">10% Fee Earned</span>
                  <span className="font-mono font-medium text-emerald-700 tabular-nums">
                    {formatKes(data.adminMetrics.totalPlatformCommissions)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-slate-200 p-4 space-y-2">
          <div className="flex items-center gap-2 px-2 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
            <span>
              {data?.state.gatewayConfigured
                ? 'Flutterwave Live Keys'
                : 'Flutterwave Split Sandbox'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void handleResetDemo()}
            className="flex w-full items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Demo Ledger</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header Contract: Breadcrumb on Left, Single Primary Action on Right */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="truncate font-display text-sm font-semibold text-slate-900 sm:text-base">
              {breadcrumbLabel}
            </h1>
          </div>

          <div className="shrink-0">
            {role === 'client' && (
              <button
                type="button"
                onClick={() => {
                  setHireFreelancerId(undefined);
                  setHireModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Hire & Create Contract
              </button>
            )}
            {role === 'freelancer' && (
              <button
                type="button"
                disabled={!activeWallet || activeWallet.availableEarnings < 500}
                onClick={() => setWithdrawOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Wallet className="h-3.5 w-3.5" />
                Request Withdrawal
              </button>
            )}
            {role === 'admin' && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Export Ledger CSV
              </button>
            )}
            {role === 'community' && (
              <button
                type="button"
                onClick={() => setCreateTopicModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                New Topic Room
              </button>
            )}
          </div>
        </header>

        {/* Inline Toast Banner */}
        {toast && (
          <div className="px-4 pt-4 sm:px-8">
            <div
              role="status"
              className={`flex items-center justify-between rounded-md border px-4 py-3 text-xs font-medium ${
                toast.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {toast.message}
              </span>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="ml-4 text-xs underline opacity-80 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Viewport Body */}
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-8">
          {loading && (
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white" />
              <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />
            </div>
          )}

          {!loading && loadError && (
            <div className="rounded-lg border border-red-200 bg-white p-6 text-center">
              <p className="text-sm font-medium text-red-700">{loadError}</p>
              <button
                type="button"
                onClick={() => void refreshState()}
                className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white"
              >
                Retry Connection
              </button>
            </div>
          )}

          {!loading && !loadError && data && (
            <>
              {role === 'client' && (
                <ClientWorkspace
                  freelancers={data.state.freelancers}
                  projects={data.state.projects}
                  onOpenHireModal={(fId) => {
                    setHireFreelancerId(fId);
                    setHireModalOpen(true);
                  }}
                  onOpenCheckout={(project, milestone, freelancer) =>
                    setCheckoutTarget({ project, milestone, freelancer })
                  }
                  onApproveMilestone={handleApproveMilestone}
                  onRefundMilestone={handleRefundMilestone}
                />
              )}

              {role === 'freelancer' && (
                <FreelancerWorkspace
                  freelancers={data.state.freelancers}
                  activeFreelancerId={data.state.activeFreelancerId}
                  wallets={data.wallets}
                  projects={data.state.projects}
                  payoutRequests={data.state.payoutRequests}
                  banks={data.banks}
                  onSwitchFreelancer={handleSwitchFreelancer}
                  onOpenWithdraw={() => setWithdrawOpen(true)}
                  onSubmitDeliverable={handleSubmitDeliverable}
                  onSavePayoutSettings={handleSavePayoutSettings}
                />
              )}

              {role === 'admin' && (
                <AdminDashboard
                  metrics={data.adminMetrics}
                  transactions={data.state.transactions}
                  payoutRequests={data.state.payoutRequests}
                  onProcessPayout={handleProcessPayout}
                  onRetryTransaction={handleRetryTransaction}
                  onRefundMilestone={handleRefundMilestone}
                />
              )}

              {role === 'community' && (
                <CommunityWorkspace
                  topics={data.state.topics}
                  messages={data.state.messages}
                  ideas={data.state.ideas}
                  createTopicModalOpen={createTopicModalOpen}
                  onCloseCreateTopicModal={() => setCreateTopicModalOpen(false)}
                  onOpenCreateTopicModal={() => setCreateTopicModalOpen(true)}
                  onCreateTopic={handleCreateTopic}
                  onPostMessage={handlePostMessage}
                  onCreateIdea={handleCreateIdea}
                  onVoteIdea={handleVoteIdea}
                  onRealtimeEvent={handleRealtimeEvent}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      {hireModalOpen && data && (
        <CreateProjectModal
          freelancers={data.state.freelancers}
          initialFreelancerId={hireFreelancerId}
          onClose={() => setHireModalOpen(false)}
          onCreateProject={handleCreateProject}
        />
      )}

      {checkoutTarget && data && (
        <CheckoutModal
          project={checkoutTarget.project}
          milestone={checkoutTarget.milestone}
          freelancer={checkoutTarget.freelancer}
          gatewayConfigured={data.state.gatewayConfigured}
          onClose={() => setCheckoutTarget(null)}
          onConfirmPayment={handleConfirmPayment}
        />
      )}

      {withdrawOpen && data && activeFreelancer && activeWallet && (
        <WithdrawModal
          freelancer={activeFreelancer}
          wallet={activeWallet}
          banks={data.banks}
          onClose={() => setWithdrawOpen(false)}
          onSubmitWithdrawal={handleRequestWithdrawal}
        />
      )}
    </div>
  );
}
