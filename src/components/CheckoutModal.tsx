import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Globe,
  Loader2,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import type {
  Freelancer,
  Milestone,
  PaymentProviderId,
  Project,
} from '../types/marketplace.ts';
import { formatKes } from '../utils/format.ts';

interface CheckoutModalProps {
  project: Project;
  milestone: Milestone;
  freelancer: Freelancer;
  gatewayConfigured: boolean;
  onClose: () => void;
  onConfirmPayment: (payload: {
    milestoneId: string;
    provider: PaymentProviderId;
    paymentDetail: string;
    simulateFailure: boolean;
  }) => Promise<void>;
}

const PROVIDERS: Array<{
  id: PaymentProviderId;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'flutterwave_mpesa',
    label: 'Flutterwave M-Pesa',
    subtitle: 'STK Push · KES',
  },
  {
    id: 'flutterwave_card',
    label: 'Visa / Mastercard',
    subtitle: 'Flutterwave Split Card',
  },
  {
    id: 'pesapal',
    label: 'Pesapal',
    subtitle: 'M-Pesa & Local Card',
  },
  {
    id: 'paypal',
    label: 'PayPal',
    subtitle: 'International Client',
  },
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  project,
  milestone,
  freelancer,
  gatewayConfigured,
  onClose,
  onConfirmPayment,
}) => {
  const [provider, setProvider] = useState<PaymentProviderId>('flutterwave_mpesa');
  const [mpesaPhone, setMpesaPhone] = useState('254712889041');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('418');
  const [paypalEmail, setPaypalEmail] = useState('finance@nordicpay.co.uk');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stkPromptSent, setStkPromptSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (
      (provider === 'flutterwave_mpesa' || provider === 'pesapal') &&
      !/^254[17]\d{8}$/.test(mpesaPhone.replace(/\s+/g, ''))
    ) {
      setErrorMsg('Enter a valid Kenyan mobile number starting with 2547 or 2541.');
      return;
    }

    let detail = '';
    if (provider === 'flutterwave_mpesa') {
      const clean = mpesaPhone.replace(/\s+/g, '');
      detail = `M-Pesa ${clean.slice(0, 6)}***${clean.slice(-3)}`;
    } else if (provider === 'flutterwave_card') {
      const clean = cardNumber.replace(/\s+/g, '');
      detail = `Visa •••• ${clean.slice(-4) || '4242'}`;
    } else if (provider === 'pesapal') {
      detail = `Pesapal M-Pesa ${mpesaPhone.slice(-4)}`;
    } else {
      detail = `PayPal (${paypalEmail})`;
    }

    setSubmitting(true);
    if (provider === 'flutterwave_mpesa' || provider === 'pesapal') {
      setStkPromptSent(true);
      await new Promise((r) => setTimeout(r, 650));
    }

    try {
      await onConfirmPayment({
        milestoneId: milestone.id,
        provider,
        paymentDetail: detail,
        simulateFailure,
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Payment initiation failed.',
      );
      setStkPromptSent(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
    >
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="checkout-title"
              className="font-display text-lg font-semibold text-slate-900"
            >
              Fund Milestone Payment
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {project.title} · {milestone.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close checkout"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* 90/10 Split Summary */}
          <div className="grid grid-cols-1 gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
            <div>
              <div className="text-xs text-slate-500">Milestone Total</div>
              <div className="mt-1 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                {formatKes(milestone.grossAmount)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">
                Freelancer Share (90%)
              </div>
              <div className="mt-1 font-mono text-base font-medium text-emerald-700 tabular-nums">
                {formatKes(milestone.freelancerShare)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">
                Platform Commission (10%)
              </div>
              <div className="mt-1 font-mono text-base font-medium text-slate-700 tabular-nums">
                {formatKes(milestone.platformCommission)}
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">
                Select Payment Method
              </span>
              <span className="font-mono text-xs text-slate-500">
                Subaccount: {freelancer.subaccountId}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PROVIDERS.map((item) => {
                const active = provider === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setProvider(item.id);
                      setErrorMsg(null);
                    }}
                    className={`flex flex-col items-start rounded-md border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? 'border-emerald-600 bg-emerald-50/60 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-xs font-semibold whitespace-nowrap">
                      {item.label}
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-500 whitespace-nowrap">
                      {item.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider-Specific Inputs */}
          {(provider === 'flutterwave_mpesa' || provider === 'pesapal') && (
            <div className="space-y-3 rounded-md border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                <span>
                  {provider === 'flutterwave_mpesa'
                    ? 'Flutterwave M-Pesa STK Push (Kenya)'
                    : 'Pesapal M-Pesa Express Checkout'}
                </span>
              </div>
              <div>
                <label
                  htmlFor="mpesa-phone"
                  className="block text-xs font-medium text-slate-700"
                >
                  Safaricom M-Pesa Number
                </label>
                <input
                  id="mpesa-phone"
                  type="text"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="254712345678"
                  className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                  An STK Push prompt for {formatKes(milestone.grossAmount)} will
                  be sent to your handset.
                </p>
              </div>
              {stkPromptSent && (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>
                    STK Push dispatched to {mpesaPhone}. Awaiting M-Pesa PIN
                    confirmation...
                  </span>
                </div>
              )}
            </div>
          )}

          {provider === 'flutterwave_card' && (
            <div className="space-y-3 rounded-md border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <span>Visa / Mastercard (Flutterwave Split Checkout)</span>
              </div>
              <div>
                <label
                  htmlFor="card-num"
                  className="block text-xs font-medium text-slate-700"
                >
                  Card Number
                </label>
                <input
                  id="card-num"
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="card-exp"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Expiry
                  </label>
                  <input
                    id="card-exp"
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="card-cvv"
                    className="block text-xs font-medium text-slate-700"
                  >
                    CVV
                  </label>
                  <input
                    id="card-cvv"
                    type="text"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {provider === 'paypal' && (
            <div className="space-y-3 rounded-md border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <Globe className="h-4 w-4 text-emerald-600" />
                <span>PayPal International Checkout</span>
              </div>
              <div>
                <label
                  htmlFor="paypal-email"
                  className="block text-xs font-medium text-slate-700"
                >
                  Client PayPal Email
                </label>
                <input
                  id="paypal-email"
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Converted at settlement rate to {formatKes(milestone.grossAmount)}.
                </p>
              </div>
            </div>
          )}

          {/* Safeguarding & Failure Simulation Option */}
          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <span>
                {gatewayConfigured
                  ? 'Live Flutterwave v3 split-payment keys active. '
                  : 'Sandbox payment protocol active. '}
                Split payments record your 90% / 10% allocation against this
                project under a provider-backed delayed-settlement arrangement;
                freelancer earnings unlock for manual withdrawal only after you
                approve completed work.
              </span>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
              />
              <span>
                Test failed transaction handling (simulate STK timeout or card
                decline in Admin ledger)
              </span>
            </label>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
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
                  <span>Authorizing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Pay {formatKes(milestone.grossAmount)}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
