import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import type { Freelancer } from '../types/marketplace.ts';
import { formatKes } from '../utils/format.ts';

interface CreateProjectModalProps {
  freelancers: Freelancer[];
  initialFreelancerId?: string;
  onClose: () => void;
  onCreateProject: (payload: {
    title: string;
    clientName: string;
    clientCountry: string;
    freelancerId: string;
    category: string;
    totalBudget: number;
    scheduleType: 'single' | 'multi_30_40_30';
  }) => Promise<void>;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  freelancers,
  initialFreelancerId,
  onClose,
  onCreateProject,
}) => {
  const [title, setTitle] = useState('Company Website Redesign');
  const [clientName, setClientName] = useState('Kilimani Ventures Ltd');
  const [clientCountry, setClientCountry] = useState('Kenya');
  const [freelancerId, setFreelancerId] = useState(
    initialFreelancerId || freelancers[0]?.id || '',
  );
  const [category, setCategory] = useState('Web & Product Design');
  const [budgetInput, setBudgetInput] = useState('50000');
  const [scheduleType, setScheduleType] = useState<'single' | 'multi_30_40_30'>(
    'single',
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const parsedBudget = Math.max(0, Math.round(Number(budgetInput) || 0));

  const milestonePreview = useMemo(() => {
    if (scheduleType === 'single') {
      const comm = Math.round(parsedBudget * 0.1);
      return [
        {
          label: 'Full Delivery upon Approval (100%)',
          gross: parsedBudget,
          freelancer: parsedBudget - comm,
          commission: comm,
        },
      ];
    }
    const m1 = Math.round(parsedBudget * 0.3);
    const m2 = Math.round(parsedBudget * 0.4);
    const m3 = parsedBudget - m1 - m2;
    return [m1, m2, m3].map((gross, idx) => {
      const comm = Math.round(gross * 0.1);
      const pct = idx === 1 ? 40 : 30;
      const stage =
        idx === 0
          ? 'Kickoff & Discovery'
          : idx === 1
            ? 'First Delivery'
            : 'Final Approval';
      return {
        label: `Milestone ${idx + 1}: ${stage} (${pct}%)`,
        gross,
        freelancer: gross - comm,
        commission: comm,
      };
    });
  }, [parsedBudget, scheduleType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!title.trim() || !clientName.trim()) {
      setErrorMsg('Project title and client name are required.');
      return;
    }
    if (parsedBudget < 1000) {
      setErrorMsg('Minimum contract budget is KSh 1,000.');
      return;
    }
    setSubmitting(true);
    try {
      await onCreateProject({
        title: title.trim(),
        clientName: clientName.trim(),
        clientCountry: clientCountry.trim() || 'Kenya',
        freelancerId,
        category,
        totalBudget: parsedBudget,
        scheduleType,
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to create contract.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-project-title"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="create-project-title"
              className="font-display text-lg font-semibold text-slate-900"
            >
              Hire Talent & Configure Milestones
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Define single or 30/40/30 milestone splits with transparent 10%
              platform commission
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close contract builder"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="proj-title"
                className="block text-xs font-medium text-slate-700"
              >
                Project Title
              </label>
              <input
                id="proj-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="client-name"
                className="block text-xs font-medium text-slate-700"
              >
                Client / Company Name
              </label>
              <input
                id="client-name"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="client-country"
                className="block text-xs font-medium text-slate-700"
              >
                Client Country
              </label>
              <select
                id="client-country"
                value={clientCountry}
                onChange={(e) => setClientCountry(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              >
                <option value="Kenya">Kenya (M-Pesa / Local Card)</option>
                <option value="United Kingdom">
                  United Kingdom (Visa / Mastercard / PayPal)
                </option>
                <option value="United States">
                  United States (Visa / Mastercard / PayPal)
                </option>
                <option value="Uganda">Uganda (Card / Mobile)</option>
                <option value="Germany">Germany (Visa / Mastercard)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="freelancer-select"
                className="block text-xs font-medium text-slate-700"
              >
                Assigned Freelancer
              </label>
              <select
                id="freelancer-select"
                value={freelancerId}
                onChange={(e) => setFreelancerId(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              >
                {freelancers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="budget-kes"
                className="block text-xs font-medium text-slate-700"
              >
                Total Project Budget (KES)
              </label>
              <input
                id="budget-kes"
                type="number"
                min={1000}
                step={500}
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">
                Milestone Schedule Structure
              </span>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setBudgetInput('50000');
                    setScheduleType('single');
                    setTitle('Company Website Design');
                    setCategory('Web & Product Design');
                  }}
                  className="text-emerald-700 hover:underline whitespace-nowrap"
                >
                  Preset: KSh 50,000 Website
                </button>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBudgetInput('100000');
                    setScheduleType('multi_30_40_30');
                    setTitle('E-Commerce Store & M-Pesa Integration');
                    setCategory('Full-Stack Engineering');
                  }}
                  className="text-emerald-700 hover:underline whitespace-nowrap"
                >
                  Preset: KSh 100,000 (30/40/30)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setScheduleType('single')}
                className={`rounded-md border px-3 py-2.5 text-left transition-colors ${
                  scheduleType === 'single'
                    ? 'border-emerald-600 bg-emerald-50/60 text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-semibold">
                  Single Milestone (100%)
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  Best for fixed-scope projects up to KSh 60,000
                </div>
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('multi_30_40_30')}
                className={`rounded-md border px-3 py-2.5 text-left transition-colors ${
                  scheduleType === 'multi_30_40_30'
                    ? 'border-emerald-600 bg-emerald-50/60 text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-semibold">
                  Staged Milestones (30% / 40% / 30%)
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  30% kickoff, 40% first delivery, 30% final approval
                </div>
              </button>
            </div>
          </div>

          {/* Live Commission & Split Preview Table */}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 text-xs font-semibold text-slate-700">
              Projected Milestone & 90/10 Commission Split
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-1.5 font-medium">Milestone</th>
                    <th className="py-1.5 text-right font-medium">Client Pays</th>
                    <th className="py-1.5 text-right font-medium">
                      Freelancer (90%)
                    </th>
                    <th className="py-1.5 text-right font-medium">
                      Platform (10%)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {milestonePreview.map((row) => (
                    <tr key={row.label}>
                      <td className="py-2 pr-3 text-slate-800">{row.label}</td>
                      <td className="py-2 text-right font-mono font-medium text-slate-900 tabular-nums">
                        {formatKes(row.gross)}
                      </td>
                      <td className="py-2 text-right font-mono text-emerald-700 tabular-nums">
                        {formatKes(row.freelancer)}
                      </td>
                      <td className="py-2 text-right font-mono text-slate-600 tabular-nums">
                        {formatKes(row.commission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Contract...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Create Contract</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
