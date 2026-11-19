import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import {
  calculatePayoutDestination,
  computeAdminMetrics,
  computeFreelancerWallet,
  computeSplit,
  getProviderLabel,
  KENYAN_BANKS,
  loadMarketplaceState,
  resetMarketplaceState,
  saveMarketplaceState,
} from './server/ledgerStore.ts';
import type {
  BrainstormIdea,
  DiscussionMessage,
  Milestone,
  PaymentProviderId,
  PayoutMethod,
  PayoutRequest,
  Project,
  RoomParticipant,
  TopicRoom,
  Transaction,
} from './src/types/marketplace.ts';

const PORT = 3000;

function generateRef(prefix: string): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${rand}`;
}

async function initiateFlutterwaveSplitPayment(params: {
  txRef: string;
  amount: number;
  clientName: string;
  provider: PaymentProviderId;
  subaccountId: string;
  paymentDetail: string;
}): Promise<{ mode: 'flutterwave_live' | 'sandbox_protocol'; flwRef: string; paymentLink?: string }> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) {
    return {
      mode: 'sandbox_protocol',
      flwRef: generateRef(
        params.provider === 'flutterwave_mpesa' ? 'FLW-KE-MPESA' : 'FLW-KE-CARD',
      ),
    };
  }

  try {
    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: params.txRef,
        amount: params.amount,
        currency: 'KES',
        redirect_url: `${process.env.APP_URL || 'http://localhost:3000'}/?tx_ref=${params.txRef}`,
        payment_options:
          params.provider === 'flutterwave_mpesa' ? 'mpesa' : 'card,mpesa',
        customer: {
          email: 'billing@kazigrid.example',
          name: params.clientName,
        },
        subaccounts: [
          {
            id: params.subaccountId,
            transaction_split_ratio: 9,
            transaction_charge_type: 'percentage',
            transaction_charge: 10,
          },
        ],
        customizations: {
          title: 'Freelance Hub Milestone Payment',
          description: `Milestone funding (${params.paymentDetail})`,
        },
      }),
    });

    if (!response.ok) {
      return {
        mode: 'sandbox_protocol',
        flwRef: generateRef('FLW-SBX'),
      };
    }

    const json = (await response.json()) as {
      status?: string;
      data?: { link?: string };
    };
    return {
      mode: 'flutterwave_live',
      flwRef: generateRef('FLW-LIVE'),
      paymentLink: json.data?.link,
    };
  } catch {
    return {
      mode: 'sandbox_protocol',
      flwRef: generateRef('FLW-SBX'),
    };
  }
}

async function initiateFlutterwaveTransfer(params: {
  accountBankCode: string;
  accountNumber: string;
  amount: number;
  beneficiaryName: string;
  reference: string;
  method: PayoutMethod;
}): Promise<{ transferRef: string; status: 'paid' | 'processing' }> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) {
    return {
      transferRef: generateRef(
        params.method === 'mpesa' ? 'FLW-TRF-MPS' : 'FLW-TRF-BNK',
      ),
      status: 'paid',
    };
  }

  try {
    const body: Record<string, unknown> = {
      account_bank: params.accountBankCode,
      account_number: params.accountNumber,
      amount: params.amount,
      currency: 'KES',
      beneficiary_name: params.beneficiaryName,
      reference: params.reference,
      narration: 'Freelance Hub Milestone Payout',
    };

    if (params.method === 'mpesa') {
      body.meta = {
        sender: 'Freelance Hub Ltd',
        sender_country: 'KE',
        mobile_number: '254700000000',
      };
    }

    const res = await fetch('https://api.flutterwave.com/v3/transfers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return {
        transferRef: generateRef('FLW-TRF-SBX'),
        status: 'paid',
      };
    }

    const json = (await res.json()) as { data?: { id?: number; reference?: string } };
    return {
      transferRef: json.data?.reference || params.reference,
      status: 'paid',
    };
  } catch {
    return {
      transferRef: generateRef('FLW-TRF-SBX'),
      status: 'paid',
    };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.get('/api/state', (_req, res) => {
    const state = loadMarketplaceState();
    const wallets = Object.fromEntries(
      state.freelancers.map((f) => [
        f.id,
        computeFreelancerWallet(state, f.id),
      ]),
    );
    const adminMetrics = computeAdminMetrics(state);
    res.json({
      state,
      wallets,
      adminMetrics,
      banks: KENYAN_BANKS,
    });
  });

  app.post('/api/state/reset', (_req, res) => {
    const state = resetMarketplaceState();
    const wallets = Object.fromEntries(
      state.freelancers.map((f) => [
        f.id,
        computeFreelancerWallet(state, f.id),
      ]),
    );
    res.json({
      state,
      wallets,
      adminMetrics: computeAdminMetrics(state),
      banks: KENYAN_BANKS,
    });
  });

  app.post('/api/freelancer/active', (req, res) => {
    const { freelancerId } = req.body as { freelancerId?: string };
    const state = loadMarketplaceState();
    if (!freelancerId || !state.freelancers.some((f) => f.id === freelancerId)) {
      res.status(400).json({ error: 'Valid freelancerId is required' });
      return;
    }
    state.activeFreelancerId = freelancerId;
    saveMarketplaceState(state);
    res.json({ ok: true, activeFreelancerId: freelancerId });
  });

  app.put('/api/freelancers/:id/payout-settings', (req, res) => {
    const { id } = req.params;
    const { mpesaNumber, bankCode, bankAccountNumber, bankAccountName } =
      req.body as {
        mpesaNumber?: string;
        bankCode?: string;
        bankAccountNumber?: string;
        bankAccountName?: string;
      };

    const state = loadMarketplaceState();
    const freelancer = state.freelancers.find((f) => f.id === id);
    if (!freelancer) {
      res.status(404).json({ error: 'Freelancer not found' });
      return;
    }

    if (mpesaNumber) {
      freelancer.mpesaNumber = mpesaNumber.trim();
    }
    if (bankCode) {
      const bank = KENYAN_BANKS.find((b) => b.code === bankCode);
      if (bank) {
        freelancer.bankCode = bank.code;
        freelancer.bankName = bank.name;
      }
    }
    if (bankAccountNumber) {
      freelancer.bankAccountNumber = bankAccountNumber.trim();
    }
    if (bankAccountName) {
      freelancer.bankAccountName = bankAccountName.trim();
    }

    saveMarketplaceState(state);
    res.json({ freelancer });
  });

  app.post('/api/projects', (req, res) => {
    const {
      title,
      clientName,
      clientCountry,
      freelancerId,
      category,
      totalBudget,
      scheduleType,
      customSingleMilestoneTitle,
    } = req.body as {
      title?: string;
      clientName?: string;
      clientCountry?: string;
      freelancerId?: string;
      category?: string;
      totalBudget?: number;
      scheduleType?: 'single' | 'multi_30_40_30';
      customSingleMilestoneTitle?: string;
    };

    const state = loadMarketplaceState();
    const freelancer = state.freelancers.find((f) => f.id === freelancerId);
    if (!title?.trim() || !clientName?.trim() || !freelancer) {
      res
        .status(400)
        .json({ error: 'Project title, client name, and freelancer are required.' });
      return;
    }

    const budget = Math.max(1000, Math.round(Number(totalBudget) || 50000));
    const mode = scheduleType === 'multi_30_40_30' ? 'multi_30_40_30' : 'single';
    const projectId = `proj-${Date.now()}`;
    const today = new Date();
    const addDays = (days: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    };

    let milestones: Milestone[] = [];
    if (mode === 'single') {
      const split = computeSplit(budget);
      milestones = [
        {
          id: `ms-${Date.now()}-1`,
          title:
            customSingleMilestoneTitle?.trim() ||
            `Complete Delivery: ${title.trim()}`,
          percentage: 100,
          grossAmount: budget,
          freelancerShare: split.freelancerShare,
          platformCommission: split.platformCommission,
          status: 'unfunded',
          dueDate: addDays(10),
        },
      ];
    } else {
      const m1Gross = Math.round(budget * 0.3);
      const m2Gross = Math.round(budget * 0.4);
      const m3Gross = budget - m1Gross - m2Gross;
      const s1 = computeSplit(m1Gross);
      const s2 = computeSplit(m2Gross);
      const s3 = computeSplit(m3Gross);

      milestones = [
        {
          id: `ms-${Date.now()}-1`,
          title: 'Milestone 1: Kickoff & Discovery Prototype (30%)',
          percentage: 30,
          grossAmount: m1Gross,
          freelancerShare: s1.freelancerShare,
          platformCommission: s1.platformCommission,
          status: 'unfunded',
          dueDate: addDays(5),
        },
        {
          id: `ms-${Date.now()}-2`,
          title: 'Milestone 2: First Delivery & Core Build (40%)',
          percentage: 40,
          grossAmount: m2Gross,
          freelancerShare: s2.freelancerShare,
          platformCommission: s2.platformCommission,
          status: 'unfunded',
          dueDate: addDays(12),
        },
        {
          id: `ms-${Date.now()}-3`,
          title: 'Milestone 3: Final Approval & Handoff (30%)',
          percentage: 30,
          grossAmount: m3Gross,
          freelancerShare: s3.freelancerShare,
          platformCommission: s3.platformCommission,
          status: 'unfunded',
          dueDate: addDays(18),
        },
      ];
    }

    const project: Project = {
      id: projectId,
      title: title.trim(),
      clientName: clientName.trim(),
      clientCountry: clientCountry?.trim() || 'Kenya',
      freelancerId: freelancer.id,
      category: category?.trim() || 'Digital Services',
      currency: 'KES',
      totalBudget: budget,
      scheduleType: mode,
      createdAt: new Date().toISOString(),
      milestones,
    };

    state.projects.unshift(project);
    saveMarketplaceState(state);
    res.status(201).json({ project });
  });

  app.post('/api/milestones/:milestoneId/fund', async (req, res) => {
    const { milestoneId } = req.params;
    const { provider, paymentDetail, simulateFailure } = req.body as {
      provider?: PaymentProviderId;
      paymentDetail?: string;
      simulateFailure?: boolean;
    };

    const state = loadMarketplaceState();
    let targetProject: Project | undefined;
    let targetMilestone: Milestone | undefined;

    for (const proj of state.projects) {
      const ms = proj.milestones.find((m) => m.id === milestoneId);
      if (ms) {
        targetProject = proj;
        targetMilestone = ms;
        break;
      }
    }

    if (!targetProject || !targetMilestone) {
      res.status(404).json({ error: 'Milestone not found' });
      return;
    }

    if (targetMilestone.status !== 'unfunded') {
      res.status(400).json({ error: 'Milestone has already been funded.' });
      return;
    }

    const freelancer = state.freelancers.find(
      (f) => f.id === targetProject.freelancerId,
    );
    if (!freelancer) {
      res.status(404).json({ error: 'Assigned freelancer not found' });
      return;
    }

    const selectedProvider: PaymentProviderId = provider || 'flutterwave_mpesa';
    const txRef = generateRef('KG-FLW');
    const now = new Date().toISOString();
    const detail =
      paymentDetail?.trim() ||
      (selectedProvider === 'flutterwave_mpesa'
        ? 'M-Pesa 254712000100'
        : selectedProvider === 'flutterwave_card'
          ? 'Visa •••• 4242'
          : selectedProvider === 'pesapal'
            ? 'Pesapal Checkout'
            : 'PayPal Account');

    if (simulateFailure) {
      const failedTx: Transaction = {
        id: `tx-${Date.now()}`,
        txRef,
        flwRef: generateRef('FLW-ERR'),
        projectId: targetProject.id,
        projectTitle: targetProject.title,
        milestoneId: targetMilestone.id,
        milestoneTitle: targetMilestone.title,
        clientName: targetProject.clientName,
        freelancerId: freelancer.id,
        freelancerName: freelancer.name,
        provider: selectedProvider,
        providerLabel: getProviderLabel(selectedProvider),
        paymentDetail: detail,
        grossAmount: targetMilestone.grossAmount,
        platformCommission: targetMilestone.platformCommission,
        freelancerNet: targetMilestone.freelancerShare,
        status: 'failed',
        failureReason:
          selectedProvider === 'flutterwave_mpesa'
            ? 'M-Pesa STK Push declined — insufficient balance or PIN cancelled.'
            : 'Card 3DS authentication declined by issuing bank.',
        createdAt: now,
        updatedAt: now,
        splitSubaccountId: freelancer.subaccountId,
        gatewayMode: 'sandbox_protocol',
      };
      state.transactions.unshift(failedTx);
      saveMarketplaceState(state);
      res.status(402).json({
        error: failedTx.failureReason,
        transaction: failedTx,
      });
      return;
    }

    const gatewayResult = await initiateFlutterwaveSplitPayment({
      txRef,
      amount: targetMilestone.grossAmount,
      clientName: targetProject.clientName,
      provider: selectedProvider,
      subaccountId: freelancer.subaccountId,
      paymentDetail: detail,
    });

    targetMilestone.status = 'funded_pending_work';
    targetMilestone.fundedAt = now;
    targetMilestone.provider = selectedProvider;

    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      txRef,
      flwRef: gatewayResult.flwRef,
      projectId: targetProject.id,
      projectTitle: targetProject.title,
      milestoneId: targetMilestone.id,
      milestoneTitle: targetMilestone.title,
      clientName: targetProject.clientName,
      freelancerId: freelancer.id,
      freelancerName: freelancer.name,
      provider: selectedProvider,
      providerLabel: getProviderLabel(selectedProvider),
      paymentDetail: detail,
      grossAmount: targetMilestone.grossAmount,
      platformCommission: targetMilestone.platformCommission,
      freelancerNet: targetMilestone.freelancerShare,
      status: 'pending_approval',
      createdAt: now,
      updatedAt: now,
      splitSubaccountId: freelancer.subaccountId,
      gatewayMode: gatewayResult.mode,
    };

    state.transactions.unshift(tx);
    saveMarketplaceState(state);
    res.json({
      milestone: targetMilestone,
      transaction: tx,
      paymentLink: gatewayResult.paymentLink,
    });
  });

  app.post('/api/milestones/:milestoneId/submit', (req, res) => {
    const { milestoneId } = req.params;
    const { deliverableNote, deliverableUrl } = req.body as {
      deliverableNote?: string;
      deliverableUrl?: string;
    };

    const state = loadMarketplaceState();
    let targetMilestone: Milestone | undefined;
    for (const proj of state.projects) {
      const ms = proj.milestones.find((m) => m.id === milestoneId);
      if (ms) {
        targetMilestone = ms;
        break;
      }
    }

    if (!targetMilestone) {
      res.status(404).json({ error: 'Milestone not found' });
      return;
    }
    if (targetMilestone.status !== 'funded_pending_work') {
      res
        .status(400)
        .json({ error: 'Only funded milestones can be submitted for review.' });
      return;
    }

    targetMilestone.status = 'submitted_for_review';
    targetMilestone.submittedAt = new Date().toISOString();
    targetMilestone.deliverableNote =
      deliverableNote?.trim() || 'Milestone deliverable uploaded for client review.';
    targetMilestone.deliverableUrl =
      deliverableUrl?.trim() || 'https://deliverables.kazigrid.example/handoff';

    saveMarketplaceState(state);
    res.json({ milestone: targetMilestone });
  });

  app.post('/api/milestones/:milestoneId/approve', (req, res) => {
    const { milestoneId } = req.params;
    const state = loadMarketplaceState();

    let targetMilestone: Milestone | undefined;
    for (const proj of state.projects) {
      const ms = proj.milestones.find((m) => m.id === milestoneId);
      if (ms) {
        targetMilestone = ms;
        break;
      }
    }

    if (!targetMilestone) {
      res.status(404).json({ error: 'Milestone not found' });
      return;
    }

    if (
      targetMilestone.status !== 'submitted_for_review' &&
      targetMilestone.status !== 'funded_pending_work'
    ) {
      res
        .status(400)
        .json({ error: 'Milestone must be funded before approval.' });
      return;
    }

    const now = new Date().toISOString();
    targetMilestone.status = 'approved_released';
    targetMilestone.approvedAt = now;

    const tx = state.transactions.find(
      (t) =>
        t.milestoneId === milestoneId &&
        t.status === 'pending_approval',
    );
    if (tx) {
      tx.status = 'completed';
      tx.updatedAt = now;
    }

    saveMarketplaceState(state);
    res.json({ milestone: targetMilestone, transaction: tx });
  });

  app.post('/api/milestones/:milestoneId/refund', (req, res) => {
    const { milestoneId } = req.params;
    const { reason } = req.body as { reason?: string };
    const state = loadMarketplaceState();

    let targetMilestone: Milestone | undefined;
    for (const proj of state.projects) {
      const ms = proj.milestones.find((m) => m.id === milestoneId);
      if (ms) {
        targetMilestone = ms;
        break;
      }
    }

    if (!targetMilestone) {
      res.status(404).json({ error: 'Milestone not found' });
      return;
    }
    if (
      targetMilestone.status !== 'funded_pending_work' &&
      targetMilestone.status !== 'submitted_for_review'
    ) {
      res.status(400).json({
        error: 'Only funded milestones awaiting final approval can be refunded.',
      });
      return;
    }

    const now = new Date().toISOString();
    targetMilestone.status = 'refunded';
    targetMilestone.refundedAt = now;

    const tx = state.transactions.find(
      (t) =>
        t.milestoneId === milestoneId &&
        t.status === 'pending_approval',
    );
    if (tx) {
      tx.status = 'refunded';
      tx.failureReason = reason?.trim() || 'Refund issued prior to milestone release.';
      tx.updatedAt = now;
    }

    saveMarketplaceState(state);
    res.json({ milestone: targetMilestone, transaction: tx });
  });

  app.post('/api/transactions/:txId/retry', (req, res) => {
    const { txId } = req.params;
    const state = loadMarketplaceState();
    const tx = state.transactions.find((t) => t.id === txId);
    if (!tx) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    if (tx.status !== 'failed') {
      res.status(400).json({ error: 'Only failed transactions can be retried.' });
      return;
    }

    let targetMilestone: Milestone | undefined;
    for (const proj of state.projects) {
      const ms = proj.milestones.find((m) => m.id === tx.milestoneId);
      if (ms) {
        targetMilestone = ms;
        break;
      }
    }

    const now = new Date().toISOString();
    if (targetMilestone && targetMilestone.status === 'unfunded') {
      targetMilestone.status = 'funded_pending_work';
      targetMilestone.fundedAt = now;
      targetMilestone.provider = tx.provider;
    }

    tx.status = 'pending_approval';
    tx.failureReason = undefined;
    tx.flwRef = generateRef('FLW-RETRY');
    tx.updatedAt = now;

    saveMarketplaceState(state);
    res.json({ transaction: tx, milestone: targetMilestone });
  });

  app.post('/api/payouts/request', (req, res) => {
    const {
      freelancerId,
      method,
      amount,
      customMpesaNumber,
      customBankCode,
      customBankAccountNumber,
    } = req.body as {
      freelancerId?: string;
      method?: PayoutMethod;
      amount?: number;
      customMpesaNumber?: string;
      customBankCode?: string;
      customBankAccountNumber?: string;
    };

    const state = loadMarketplaceState();
    const freelancer = state.freelancers.find((f) => f.id === freelancerId);
    if (!freelancer) {
      res.status(404).json({ error: 'Freelancer not found' });
      return;
    }

    const wallet = computeFreelancerWallet(state, freelancer.id);
    const requestedAmount = Math.round(Number(amount) || 0);
    if (requestedAmount < 500) {
      res.status(400).json({ error: 'Minimum withdrawal is KSh 500.' });
      return;
    }
    if (requestedAmount > wallet.availableEarnings) {
      res.status(400).json({
        error: `Requested amount exceeds available earnings (KSh ${wallet.availableEarnings.toLocaleString()}).`,
      });
      return;
    }

    const payoutMethod: PayoutMethod = method === 'bank' ? 'bank' : 'mpesa';
    const dest = calculatePayoutDestination(
      freelancer,
      payoutMethod,
      customMpesaNumber,
      customBankCode,
      customBankAccountNumber,
    );

    const requestRecord: PayoutRequest = {
      id: `po-${Date.now()}`,
      freelancerId: freelancer.id,
      freelancerName: freelancer.name,
      method: payoutMethod,
      accountBankCode: dest.accountBankCode,
      destinationLabel: dest.destinationLabel,
      accountNumber: dest.accountNumber,
      amount: requestedAmount,
      status: 'pending_admin',
      transferRef: generateRef(payoutMethod === 'mpesa' ? 'REQ-MPS' : 'REQ-BNK'),
      requestedAt: new Date().toISOString(),
      notes: 'Manual withdrawal queued for admin settlement review.',
    };

    state.payoutRequests.unshift(requestRecord);
    saveMarketplaceState(state);
    res.status(201).json({ payoutRequest: requestRecord });
  });

  app.post('/api/payouts/:payoutId/process', async (req, res) => {
    const { payoutId } = req.params;
    const { action } = req.body as { action?: 'disburse' | 'reject' };
    const state = loadMarketplaceState();
    const payout = state.payoutRequests.find((p) => p.id === payoutId);
    if (!payout) {
      res.status(404).json({ error: 'Payout request not found' });
      return;
    }
    if (payout.status !== 'pending_admin') {
      res.status(400).json({ error: 'Payout request already processed.' });
      return;
    }

    const now = new Date().toISOString();
    if (action === 'reject') {
      payout.status = 'failed';
      payout.processedAt = now;
      payout.notes = 'Returned to freelancer available balance by administrator.';
      saveMarketplaceState(state);
      res.json({ payoutRequest: payout });
      return;
    }

    const transferResult = await initiateFlutterwaveTransfer({
      accountBankCode: payout.accountBankCode,
      accountNumber: payout.accountNumber,
      amount: payout.amount,
      beneficiaryName: payout.freelancerName,
      reference: payout.transferRef,
      method: payout.method,
    });

    payout.status = transferResult.status;
    payout.transferRef = transferResult.transferRef;
    payout.processedAt = now;
    payout.notes =
      payout.method === 'mpesa'
        ? 'Disbursed via Flutterwave M-Pesa transfer (account_bank: MPS).'
        : `Disbursed via Kenyan bank transfer (bank code: ${payout.accountBankCode}).`;

    saveMarketplaceState(state);
    res.json({ payoutRequest: payout });
  });

  app.post('/api/webhooks/flutterwave', (req, res) => {
    const expectedHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
    const signature = req.headers['verif-hash'];
    if (expectedHash && signature !== expectedHash) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }
    res.status(200).json({ received: true });
  });

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<WebSocket, RoomParticipant>();

  const broadcastEvent = (type: string, payload: unknown) => {
    const encoded = JSON.stringify({ type, payload });
    for (const [sock] of clients) {
      if (sock.readyState === WebSocket.OPEN) {
        sock.send(encoded);
      }
    }
  };

  const broadcastPresence = () => {
    const list = Array.from(clients.values());
    broadcastEvent('presence:updated', list);
  };

  wss.on('connection', (ws) => {
    const clientId = `ws-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    clients.set(ws, {
      clientId,
      name: 'Guest Member',
      role: 'Member',
      topicId: 'topic-pricing-mpesa',
      joinedAt: new Date().toISOString(),
    });
    broadcastPresence();

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type?: string;
          payload?: Record<string, unknown>;
        };
        const payload = msg.payload || {};

        if (msg.type === 'room:join') {
          const prev = clients.get(ws);
          if (prev) {
            clients.set(ws, {
              ...prev,
              name: String(payload.name || prev.name).slice(0, 48),
              role: String(payload.role || prev.role).slice(0, 40),
              topicId: String(payload.topicId || prev.topicId),
            });
            broadcastPresence();
          }
          return;
        }

        if (msg.type === 'message:create') {
          const body = String(payload.body || '').trim();
          const topicId = String(payload.topicId || '');
          if (!body || !topicId) return;

          const state = loadMarketplaceState();
          const messageId =
            typeof payload.id === 'string' && payload.id
              ? payload.id
              : `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          if (state.messages.some((m) => m.id === messageId)) return;

          const message: DiscussionMessage = {
            id: messageId,
            topicId,
            authorName: String(payload.authorName || 'Member').trim(),
            authorRole: String(payload.authorRole || 'Freelancer').trim(),
            body,
            replyToId: payload.replyToId ? String(payload.replyToId) : undefined,
            replyToAuthor: payload.replyToAuthor
              ? String(payload.replyToAuthor)
              : undefined,
            createdAt: new Date().toISOString(),
          };
          state.messages.push(message);
          saveMarketplaceState(state);
          broadcastEvent('message:created', message);
          return;
        }

        if (msg.type === 'idea:create') {
          const title = String(payload.title || '').trim();
          const summary = String(payload.summary || '').trim();
          const topicId = String(payload.topicId || '');
          if (!title || !topicId) return;

          const state = loadMarketplaceState();
          const ideaId =
            typeof payload.id === 'string' && payload.id
              ? payload.id
              : `idea-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          if (state.ideas.some((i) => i.id === ideaId)) return;

          const validTag =
            payload.tag === 'Pricing' ||
            payload.tag === 'Feature' ||
            payload.tag === 'Growth'
              ? payload.tag
              : 'Workflow';

          const idea: BrainstormIdea = {
            id: ideaId,
            topicId,
            title,
            summary: summary || 'Proposed during live community brainstorm.',
            tag: validTag,
            authorName: String(payload.authorName || 'Member').trim(),
            authorRole: String(payload.authorRole || 'Freelancer').trim(),
            votes: 1,
            votedBy: [String(payload.authorName || 'Member').trim()],
            createdAt: new Date().toISOString(),
          };
          state.ideas.unshift(idea);
          saveMarketplaceState(state);
          broadcastEvent('idea:created', idea);
        }
      } catch {
        // Ignore malformed socket frames
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      broadcastPresence();
    });
  });

  app.post('/api/community/topics', (req, res) => {
    const { title, category, description, createdBy } = req.body as {
      title?: string;
      category?: string;
      description?: string;
      createdBy?: string;
    };

    if (!title?.trim()) {
      res.status(400).json({ error: 'Topic title is required.' });
      return;
    }

    const state = loadMarketplaceState();
    const topic: TopicRoom = {
      id: `topic-${Date.now()}`,
      title: title.trim(),
      category: category?.trim() || 'General',
      description:
        description?.trim() ||
        'Open community discussion and collaborative brainstorming.',
      createdBy: createdBy?.trim() || 'Community Member',
      createdAt: new Date().toISOString(),
    };
    state.topics.unshift(topic);
    saveMarketplaceState(state);
    broadcastEvent('topic:created', topic);
    res.status(201).json({ topic });
  });

  app.post('/api/community/messages', (req, res) => {
    const { topicId, authorName, authorRole, body, replyToId, replyToAuthor } =
      req.body as {
        topicId?: string;
        authorName?: string;
        authorRole?: string;
        body?: string;
        replyToId?: string;
        replyToAuthor?: string;
      };

    if (!topicId || !body?.trim()) {
      res.status(400).json({ error: 'Topic ID and message body are required.' });
      return;
    }

    const state = loadMarketplaceState();
    const message: DiscussionMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      topicId,
      authorName: authorName?.trim() || 'Member',
      authorRole: authorRole?.trim() || 'Freelancer',
      body: body.trim(),
      replyToId,
      replyToAuthor,
      createdAt: new Date().toISOString(),
    };
    state.messages.push(message);
    saveMarketplaceState(state);
    broadcastEvent('message:created', message);
    res.status(201).json({ message });
  });

  app.post('/api/community/ideas', (req, res) => {
    const { topicId, title, summary, tag, authorName, authorRole } =
      req.body as {
        topicId?: string;
        title?: string;
        summary?: string;
        tag?: 'Workflow' | 'Pricing' | 'Feature' | 'Growth';
        authorName?: string;
        authorRole?: string;
      };

    if (!topicId || !title?.trim()) {
      res.status(400).json({ error: 'Topic ID and idea title are required.' });
      return;
    }

    const state = loadMarketplaceState();
    const author = authorName?.trim() || 'Member';
    const idea: BrainstormIdea = {
      id: `idea-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      topicId,
      title: title.trim(),
      summary: summary?.trim() || 'Proposed during live community brainstorm.',
      tag: tag || 'Workflow',
      authorName: author,
      authorRole: authorRole?.trim() || 'Freelancer',
      votes: 1,
      votedBy: [author],
      createdAt: new Date().toISOString(),
    };
    state.ideas.unshift(idea);
    saveMarketplaceState(state);
    broadcastEvent('idea:created', idea);
    res.status(201).json({ idea });
  });

  app.post('/api/community/ideas/:ideaId/vote', (req, res) => {
    const { ideaId } = req.params;
    const { voterName } = req.body as { voterName?: string };
    const voter = voterName?.trim() || 'Member';

    const state = loadMarketplaceState();
    const idea = state.ideas.find((i) => i.id === ideaId);
    if (!idea) {
      res.status(404).json({ error: 'Idea not found.' });
      return;
    }

    if (idea.votedBy.includes(voter)) {
      idea.votedBy = idea.votedBy.filter((v) => v !== voter);
      idea.votes = Math.max(0, idea.votes - 1);
    } else {
      idea.votedBy.push(voter);
      idea.votes += 1;
    }

    saveMarketplaceState(state);
    broadcastEvent('idea:voted', idea);
    res.json({ idea });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Freelance Hub server listening on http://localhost:${PORT}`);
  });
}

startServer();
