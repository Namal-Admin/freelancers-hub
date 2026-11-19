import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  RotateCcw,
  Search,
  ShieldAlert,
  Star,
  UserPlus,
} from 'lucide-react';
import type {
  Freelancer,
  Milestone,
  Project,
} from '../types/marketplace.ts';
import {
  formatDateShort,
  formatKes,
  getMilestoneStatusDisplay,
} from '../utils/format.ts';

interface ClientWorkspaceProps {
  freelancers: Freelancer[];
  projects: Project[];
  onOpenHireModal: (freelancerId?: string) => void;
  onOpenCheckout: (
    project: Project,
    milestone: Milestone,
    freelancer: Freelancer,
  ) => void;
  onApproveMilestone: (milestoneId: string) => Promise<void>;
  onRefundMilestone: (milestoneId: string, reason: string) => Promise<void>;
}

type ClientTab = 'projects' | 'talent' | 'rails';

export const ClientWorkspace: React.FC<ClientWorkspaceProps> = ({
  freelancers,
  projects,
  onOpenHireModal,
  onOpenCheckout,
  onApproveMilestone,
  onRefundMilestone,
}) => {
  const [activeTab, setActiveTab] = useState<ClientTab>('projects');
  const [talentQuery, setTalentQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<
    'all' | 'action_required' | 'completed'
  >('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});

  const freelancerMap = useMemo(
    () => new Map(freelancers.map((f) => [f.id, f])),
    [freelancers],
  );

  const filteredTalent = useMemo(() => {
    const q = talentQuery.trim().toLowerCase();
    if (!q) return freelancers;
    return freelancers.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        f.skills.some((s) => s.toLowerCase().includes(q)),
    );
  }, [freelancers, talentQuery]);

  const filteredProjects = useMemo(() => {
    if (projectFilter === 'all') return projects;
    if (projectFilter === 'action_required') {
      return projects.filter((p) =>
        p.milestones.some(
          (m) =>
            m.status === 'unfunded' || m.status === 'submitted_for_review',
        ),
      );
    }
    return projects.filter((p) =>
      p.milestones.every(
        (m) => m.status === 'approved_released' || m.status === 'refunded',
      ),
    );
  }, [projects, projectFilter]);

  const handleApprove = async (milestoneId: string) => {
    setBusyId(milestoneId);
    try {
      await onApproveMilestone(milestoneId);
    } finally {
      setBusyId(null);
    }
  };

  const handleRefund = async (milestoneId: string) => {
    setBusyId(milestoneId);
    try {
      await onRefundMilestone(
        milestoneId,
        'Client cancelled milestone prior to final deliverable approval.',
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'projects'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Projects & Milestones ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('talent')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'talent'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Browse Talent ({freelancers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rails')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'rails'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Payment Rails & Split Rules
          </button>
        </div>

        {activeTab === 'projects' && (
          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                ['all', 'All Contracts'],
                ['action_required', 'Action Required'],
                ['completed', 'Settled'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setProjectFilter(key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  projectFilter === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: PROJECTS & MILESTONES */}
      {activeTab === 'projects' && (
        <div className="space-y-5">
          {filteredProjects.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
              <p className="text-sm font-medium text-slate-900">
                No contracts match this filter.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Create a new freelance contract or switch back to all contracts.
              </p>
              <button
                type="button"
                onClick={() => setProjectFilter('all')}
                className="mt-4 rounded-md border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Show All Contracts
              </button>
            </div>
          ) : (
            filteredProjects.map((project) => {
              const freelancer = freelancerMap.get(project.freelancerId);
              if (!freelancer) return null;

              const fundedTotal = project.milestones
                .filter((m) => m.status !== 'unfunded' && m.status !== 'refunded')
                .reduce((sum, m) => sum + m.grossAmount, 0);

              return (
                <section
                  key={project.id}
                  className="rounded-lg border border-slate-200 bg-white"
                >
                  <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{project.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {project.clientName} ({project.clientCountry})
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {project.scheduleType === 'multi_30_40_30'
                            ? '30% / 40% / 30% Milestones'
                            : 'Single Milestone'}
                        </span>
                      </div>
                      <h3 className="mt-1 font-display text-base font-semibold text-slate-900">
                        {project.title}
                      </h3>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
                        <span>Freelancer: {freelancer.name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-500">
                          Subaccount {freelancer.subaccountId}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-6 sm:text-right">
                      <div>
                        <div className="text-xs text-slate-500">
                          Contract Total
                        </div>
                        <div className="mt-0.5 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                          {formatKes(project.totalBudget)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">
                          Active Funded
                        </div>
                        <div className="mt-0.5 font-mono text-base font-medium text-emerald-700 tabular-nums">
                          {formatKes(fundedTotal)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Milestone Rows */}
                  <div className="divide-y divide-slate-200">
                    {project.milestones.map((ms) => {
                      const statusMeta = getMilestoneStatusDisplay(ms.status);
                      const isBusy = busyId === ms.id;

                      return (
                        <div key={ms.id} className="px-6 py-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium text-slate-900">
                                  {ms.title}
                                </span>
                                <span aria-hidden="true" className="text-slate-300">
                                  ·
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 text-xs font-medium ${statusMeta.textClass}`}
                                >
                                  {ms.status === 'approved_released' ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : ms.status === 'refunded' ? (
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  ) : (
                                    <Clock className="h-3.5 w-3.5" />
                                  )}
                                  {statusMeta.label}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono tabular-nums">
                                <span>Gross: {formatKes(ms.grossAmount)}</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-emerald-700">
                                  Freelancer 90%: {formatKes(ms.freelancerShare)}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>
                                  Platform 10%: {formatKes(ms.platformCommission)}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-sans">
                                  Due {formatDateShort(ms.dueDate)}
                                </span>
                              </div>

                              {ms.deliverableNote && (
                                <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                  <span className="font-medium text-slate-900">
                                    Deliverable submitted:{' '}
                                  </span>
                                  <span>{ms.deliverableNote}</span>
                                  {ms.deliverableUrl && (
                                    <span className="ml-2 inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700">
                                      <ExternalLink className="h-3 w-3" />
                                      {ms.deliverableUrl}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {ms.status === 'unfunded' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenCheckout(project, ms, freelancer)
                                  }
                                  className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 whitespace-nowrap shrink-0"
                                >
                                  <CreditCard className="h-3.5 w-3.5" />
                                  Fund Milestone
                                </button>
                              )}

                              {(ms.status === 'submitted_for_review' ||
                                ms.status === 'funded_pending_work') && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleApprove(ms.id)}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap shrink-0"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {ms.status === 'submitted_for_review'
                                      ? 'Approve & Release'
                                      : 'Mark Complete & Release'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleRefund(ms.id)}
                                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
                                  >
                                    Issue Refund
                                  </button>
                                </>
                              )}

                              {ms.status === 'approved_released' && (
                                <span className="text-xs font-medium text-emerald-700 whitespace-nowrap">
                                  Released {formatDateShort(ms.approvedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: BROWSE TALENT */}
      {activeTab === 'talent' && (
        <div className="space-y-5">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={talentQuery}
              onChange={(e) => setTalentQuery(e.target.value)}
              placeholder="Search Kenyan specialists by skill or role..."
              className="w-full rounded-md border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {filteredTalent.map((f) => (
              <article
                key={f.id}
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-6"
              >
                <div>
                  <div className="flex items-start gap-4">
                    {imgFailed[f.id] ? (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 font-display text-lg font-semibold text-slate-700">
                        {f.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                    ) : (
                      <img
                        src={f.avatarUrl}
                        alt={f.name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setImgFailed((prev) => ({ ...prev, [f.id]: true }))
                        }
                        className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base font-semibold text-slate-900">
                        {f.name}
                      </h3>
                      <p className="text-sm text-slate-600">{f.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{f.location}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-slate-700 font-mono tabular-nums">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {f.rating.toFixed(1)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{f.completedJobs} jobs completed</span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-slate-600">
                    {f.bio}
                  </p>

                  <div className="mt-3 text-xs text-slate-500">
                    {f.skills.join(' · ')}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
                  <div>
                    <div className="text-xs text-slate-500">
                      Projects starting from
                    </div>
                    <div className="font-mono text-base font-semibold text-slate-900 tabular-nums">
                      {formatKes(f.projectStartingKes)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenHireModal(f.id)}
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 whitespace-nowrap shrink-0"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Hire {f.name.split(' ')[0]}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT RAILS & SAFEGUARDING */}
      {activeTab === 'rails' && (
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Supported Kenyan & International Payment Methods
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Flutterwave is configured as the primary marketplace split-payment
              rail, supporting Kenyan M-Pesa STK Push and global Visa/Mastercard
              collections alongside Pesapal and PayPal checkout options.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2.5 pr-4 font-medium">Provider / Rail</th>
                    <th className="py-2.5 pr-4 font-medium">Client Payment Support</th>
                    <th className="py-2.5 pr-4 font-medium">Freelancer Payouts</th>
                    <th className="py-2.5 font-medium">Marketplace Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-900">
                      Flutterwave (Primary)
                    </td>
                    <td className="py-3 pr-4">
                      Kenya M-Pesa STK Push (KES) · Visa & Mastercard
                    </td>
                    <td className="py-3 pr-4">
                      M-Pesa Mobile Money (MPS) & Kenyan Bank Transfers
                    </td>
                    <td className="py-3 text-emerald-700 font-medium">
                      90/10 Subaccount Split & Payouts
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-900">
                      M-Pesa (Safaricom Daraja)
                    </td>
                    <td className="py-3 pr-4">
                      STK Push · Local KES transactions
                    </td>
                    <td className="py-3 pr-4">
                      Direct mobile money disbursements where approved
                    </td>
                    <td className="py-3">Essential Kenyan local rail</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-900">
                      Visa & Mastercard
                    </td>
                    <td className="py-3 pr-4">
                      International & local project card payments
                    </td>
                    <td className="py-3 pr-4">
                      Settled via provider subaccounts
                    </td>
                    <td className="py-3">Global client onboarding</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-900">
                      Pesapal
                    </td>
                    <td className="py-3 pr-4">
                      M-Pesa · Local & international cards
                    </td>
                    <td className="py-3 pr-4">
                      East African merchant settlement
                    </td>
                    <td className="py-3">Regional collection option</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-900">
                      PayPal
                    </td>
                    <td className="py-3 pr-4">
                      International client balances & linked cards
                    </td>
                    <td className="py-3 pr-4">
                      Subject to country & account eligibility
                    </td>
                    <td className="py-3">International checkout option</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-5 text-sm text-slate-800">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <div className="font-display font-semibold text-slate-900">
                Safeguarding & Split-Settlement Compliance Notice
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-700">
                Split payments are not automatically legal escrow. Before
                marketing funds as held in escrow, confirm a provider-approved
                delayed-settlement or safeguarding arrangement, clear refund
                windows, and dispute procedures with Flutterwave or your chosen
                payment processor.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
