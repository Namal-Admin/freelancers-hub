import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  Smartphone,
  X,
} from 'lucide-react';
import type { BankOption } from '../api/marketplaceApi.ts';
import type {
  Freelancer,
  FreelancerWalletSummary,
  PayoutMethod,
} from '../types/marketplace.ts';
import { formatKes } from '../utils/format.ts';

interface WithdrawModalProps {
  freelancer: Freelancer;
  wallet: FreelancerWalletSummary;
  banks: BankOption[];
  onClose: () => void;
  onSubmitWithdrawal: (payload: {
    freelancerId: string;
    method: PayoutMethod;
    amount: number;
    customMpesaNumber?: string;
    customBankCode?: string;
    customBankAccountNumber?: string;
  }) => Promise<void>;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  freelancer,
  wallet,
  banks,
  onClose,
  onSubmitWithdrawal,
}) => {
  const [method, setMethod] = useState<PayoutMethod>('mpesa');
  const [amountInput, setAmountInput] = useState(
    wallet.availableEarnings > 0 ? String(wallet.availableEarnings) : '0',
  );
  const [mpesaNumber, setMpesaNumber] = useState(freelancer.mpesaNumber);
  const [bankCode, setBankCode] = useState(freelancer.bankCode);
  const [bankAccountNumber, setBankAccountNumber] = useState(
    freelancer.bankAccountNumber,
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const amount = Math.round(Number(amountInput) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (amount < 500) {
      setErrorMsg('Minimum withdrawal amount is KSh 500.');
      return;
    }
    if (amount > wallet.availableEarnings) {
      setErrorMsg(
        `Amount exceeds your available balance of ${formatKes(wallet.availableEarnings)}.`,
      );
      return;
    }
    if (method === 'mpesa' && !/^254[17]\d{8}$/.test(mpesaNumber.trim())) {
      setErrorMsg('Enter a valid M-Pesa phone number formatted as 2547XXXXXXXX.');
      return;
    }
    if (method === 'bank' && bankAccountNumber.trim().length < 6) {
      setErrorMsg('Enter a valid Kenyan bank account number.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitWithdrawal({
        freelancerId: freelancer.id,
        method,
        amount,
        customMpesaNumber: method === 'mpesa' ? mpesaNumber.trim() : undefined,
        customBankCode: method === 'bank' ? bankCode : undefined,
        customBankAccountNumber:
          method === 'bank' ? bankAccountNumber.trim() : undefined,
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to submit withdrawal.',
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
      aria-labelledby="withdraw-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="withdraw-title"
              className="font-display text-lg font-semibold text-slate-900"
            >
              Request Manual Withdrawal
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {freelancer.name} · Flutterwave Subaccount {freelancer.subaccountId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close withdrawal dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 bg-slate-50 p-3.5">
            <div>
              <div className="text-xs text-slate-500">Available Earnings</div>
              <div className="mt-0.5 font-mono text-base font-semibold text-emerald-700 tabular-nums">
                {formatKes(wallet.availableEarnings)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">
                Pending Client Approval
              </div>
              <div className="mt-0.5 font-mono text-base font-medium text-amber-700 tabular-nums">
                {formatKes(wallet.pendingEarnings)}
              </div>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-700">
              Withdrawal Method
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('mpesa')}
                className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-left transition-colors ${
                  method === 'mpesa'
                    ? 'border-emerald-600 bg-emerald-50/60 text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">M-Pesa Mobile Money</div>
                  <div className="text-[11px] text-slate-500">
                    Code: MPS · Kenya
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMethod('bank')}
                className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-left transition-colors ${
                  method === 'bank'
                    ? 'border-emerald-600 bg-emerald-50/60 text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">Bank Transfer</div>
                  <div className="text-[11px] text-slate-500">
                    Kenyan Local Banks
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="withdraw-amount"
                className="block text-xs font-medium text-slate-700"
              >
                Withdrawal Amount (KES)
              </label>
              <button
                type="button"
                onClick={() => setAmountInput(String(wallet.availableEarnings))}
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                Withdraw Max
              </button>
            </div>
            <input
              id="withdraw-amount"
              type="number"
              min={500}
              max={wallet.availableEarnings}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {method === 'mpesa' ? (
            <div>
              <label
                htmlFor="withdraw-mpesa"
                className="block text-xs font-medium text-slate-700"
              >
                Recipient M-Pesa Number
              </label>
              <input
                id="withdraw-mpesa"
                type="text"
                value={mpesaNumber}
                onChange={(e) => setMpesaNumber(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="withdraw-bank"
                  className="block text-xs font-medium text-slate-700"
                >
                  Kenyan Bank
                </label>
                <select
                  id="withdraw-bank"
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
                  htmlFor="withdraw-acct"
                  className="block text-xs font-medium text-slate-700"
                >
                  Account Number
                </label>
                <input
                  id="withdraw-acct"
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          )}

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
              disabled={submitting || wallet.availableEarnings < 500}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Request {formatKes(amount)}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
