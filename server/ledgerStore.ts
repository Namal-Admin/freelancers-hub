import fs from 'fs';
import path from 'path';
import type {
  AdminMetrics,
  BrainstormIdea,
  DiscussionMessage,
  Freelancer,
  FreelancerWalletSummary,
  MarketplaceState,
  PaymentProviderId,
  PayoutMethod,
  PayoutRequest,
  Project,
  TopicRoom,
  Transaction,
} from '../src/types/marketplace.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'marketplace.json');

export const KENYAN_BANKS = [
  { code: '001', name: 'KCB Bank Kenya' },
  { code: '068', name: 'Equity Bank Kenya' },
  { code: '007', name: 'NCBA Bank Kenya' },
  { code: '011', name: 'Co-operative Bank of Kenya' },
  { code: '003', name: 'Absa Bank Kenya' },
  { code: '031', name: 'Stanbic Bank Kenya' },
];

export function computeSplit(grossAmount: number): {
  platformCommission: number;
  freelancerShare: number;
} {
  const platformCommission = Math.round(grossAmount * 0.1);
  const freelancerShare = grossAmount - platformCommission;
  return { platformCommission, freelancerShare };
}

export function getProviderLabel(provider: PaymentProviderId): string {
  switch (provider) {
    case 'flutterwave_mpesa':
      return 'Flutterwave · M-Pesa STK';
    case 'flutterwave_card':
      return 'Flutterwave · Visa / Mastercard';
    case 'pesapal':
      return 'Pesapal · M-Pesa & Card';
    case 'paypal':
      return 'PayPal · International';
  }
}

function createSeedState(): MarketplaceState {
  const freelancers: Freelancer[] = [
    {
      id: 'fl-amina',
      name: 'Amina Wanjiku',
      title: 'Senior Product & Web Designer',
      location: 'Nairobi, Kenya',
      avatarUrl: '/src/assets/images/avatar_amina_wanjiku_1795123427498.jpg',
      hourlyRateKes: 3500,
      projectStartingKes: 50000,
      rating: 4.9,
      completedJobs: 38,
      skills: ['Web Design', 'Figma Systems', 'Responsive UI', 'Conversion UX'],
      bio: 'Designs high-converting corporate websites and East African SaaS interfaces with full Figma handoff and mobile-first ergonomics.',
      subaccountId: 'RS_89A1F2E4C910',
      mpesaNumber: '254712345678',
      bankCode: '068',
      bankName: 'Equity Bank Kenya',
      bankAccountNumber: '0180294812034',
      bankAccountName: 'Amina Wanjiku Njoroge',
    },
    {
      id: 'fl-brian',
      name: 'Brian Omondi',
      title: 'Full-Stack & Payment Systems Engineer',
      location: 'Mombasa, Kenya',
      avatarUrl: '/src/assets/images/avatar_brian_omondi_1795123427225.jpg',
      hourlyRateKes: 4800,
      projectStartingKes: 85000,
      rating: 5.0,
      completedJobs: 29,
      skills: ['TypeScript', 'React & Node', 'Flutterwave API', 'Daraja STK'],
      bio: 'Builds resilient web platforms and multi-vendor marketplace integrations using Flutterwave subaccounts, M-Pesa STK Push, and card rails.',
      subaccountId: 'RS_42B9D3A1E807',
      mpesaNumber: '254722891045',
      bankCode: '001',
      bankName: 'KCB Bank Kenya',
      bankAccountNumber: '1104829103842',
      bankAccountName: 'Brian Omondi Otieno',
    },
    {
      id: 'fl-faith',
      name: 'Faith Mutua',
      title: 'Mobile Fintech & API Architect',
      location: 'Nairobi, Kenya',
      avatarUrl: '/src/assets/images/avatar_faith_mutua_1795123427245.jpg',
      hourlyRateKes: 5200,
      projectStartingKes: 75000,
      rating: 4.9,
      completedJobs: 24,
      skills: ['React Native', 'M-Pesa B2C', 'Webhook Security', 'PCI Compliance'],
      bio: 'Specializes in mobile commerce apps, reconciliation pipelines, and automated mobile money payouts for cross-border teams.',
      subaccountId: 'RS_77C5E1B8F312',
      mpesaNumber: '254733512904',
      bankCode: '007',
      bankName: 'NCBA Bank Kenya',
      bankAccountNumber: '8820194721',
      bankAccountName: 'Faith Mutua Mwangi',
    },
    {
      id: 'fl-david',
      name: 'David Kamau',
      title: 'Brand Identity & Motion Designer',
      location: 'Kisumu, Kenya',
      avatarUrl: '/src/assets/images/avatar_david_kamau_1795123427802.jpg',
      hourlyRateKes: 3200,
      projectStartingKes: 25000,
      rating: 4.8,
      completedJobs: 41,
      skills: ['Brand Identity', 'Packaging', 'Motion Graphics', 'Art Direction'],
      bio: 'Crafts distinctive packaging, visual identities, and interactive launch assets for Kenyan consumer brands and startups.',
      subaccountId: 'RS_19D4F7C2A650',
      mpesaNumber: '254701984321',
      bankCode: '011',
      bankName: 'Co-operative Bank of Kenya',
      bankAccountNumber: '0114892019201',
      bankAccountName: 'David Kamau Kariuki',
    },
  ];

  const projects: Project[] = [
    {
      id: 'proj-website-50k',
      title: 'Company Website Design — Savannah Logistics Ltd',
      clientName: 'Savannah Logistics Ltd',
      clientCountry: 'Kenya',
      freelancerId: 'fl-amina',
      category: 'Web & Product Design',
      currency: 'KES',
      totalBudget: 50000,
      scheduleType: 'single',
      createdAt: '2026-11-10T09:15:00.000Z',
      milestones: [
        {
          id: 'ms-web-1',
          title: 'Complete Company Website Design & Responsive Handoff',
          percentage: 100,
          grossAmount: 50000,
          freelancerShare: 45000,
          platformCommission: 5000,
          status: 'approved_released',
          dueDate: '2026-11-16',
          provider: 'flutterwave_mpesa',
          fundedAt: '2026-11-10T09:22:00.000Z',
          submittedAt: '2026-11-15T14:10:00.000Z',
          approvedAt: '2026-11-16T10:30:00.000Z',
          deliverableNote:
            'Delivered responsive 8-page Figma design system, production Webflow/React export, and mobile navigation kit.',
          deliverableUrl: 'https://deliverables.kazigrid.example/savannah-web-v2',
        },
      ],
    },
    {
      id: 'proj-dispatch-120k',
      title: 'Cargo Dispatch Portal & M-Pesa Checkout',
      clientName: 'Rift Valley Cargo',
      clientCountry: 'Kenya',
      freelancerId: 'fl-brian',
      category: 'Full-Stack Engineering',
      currency: 'KES',
      totalBudget: 120000,
      scheduleType: 'multi_30_40_30',
      createdAt: '2026-11-12T11:00:00.000Z',
      milestones: [
        {
          id: 'ms-disp-1',
          title: 'Milestone 1: System Architecture & Prototype (30%)',
          percentage: 30,
          grossAmount: 36000,
          freelancerShare: 32400,
          platformCommission: 3600,
          status: 'approved_released',
          dueDate: '2026-11-14',
          provider: 'flutterwave_card',
          fundedAt: '2026-11-12T11:12:00.000Z',
          submittedAt: '2026-11-14T08:45:00.000Z',
          approvedAt: '2026-11-14T16:00:00.000Z',
          deliverableNote:
            'Completed database schema, Flutterwave split subaccount configuration, and interactive dispatch wireframes.',
          deliverableUrl: 'https://deliverables.kazigrid.example/rift-arch-spec',
        },
        {
          id: 'ms-disp-2',
          title: 'Milestone 2: First Delivery — STK Push & Driver Portal (40%)',
          percentage: 40,
          grossAmount: 48000,
          freelancerShare: 43200,
          platformCommission: 4800,
          status: 'submitted_for_review',
          dueDate: '2026-11-19',
          provider: 'flutterwave_mpesa',
          fundedAt: '2026-11-15T10:05:00.000Z',
          submittedAt: '2026-11-19T09:15:00.000Z',
          deliverableNote:
            'Driver manifest portal and M-Pesa STK Push staging flow deployed. Ready for client acceptance test.',
          deliverableUrl: 'https://staging.kazigrid.example/rift-driver-portal',
        },
        {
          id: 'ms-disp-3',
          title: 'Milestone 3: Final QA, Production Cutover & Docs (30%)',
          percentage: 30,
          grossAmount: 36000,
          freelancerShare: 32400,
          platformCommission: 3600,
          status: 'unfunded',
          dueDate: '2026-11-26',
        },
      ],
    },
    {
      id: 'proj-nordic-80k',
      title: 'Cross-Border Payout Reconciliation API',
      clientName: 'NordicPay Advisory Ltd',
      clientCountry: 'United Kingdom',
      freelancerId: 'fl-faith',
      category: 'Fintech Integrations',
      currency: 'KES',
      totalBudget: 80000,
      scheduleType: 'single',
      createdAt: '2026-11-17T08:00:00.000Z',
      milestones: [
        {
          id: 'ms-nordic-1',
          title: 'Daraja & Flutterwave Webhook Audit + Ledger Sync',
          percentage: 100,
          grossAmount: 80000,
          freelancerShare: 72000,
          platformCommission: 8000,
          status: 'funded_pending_work',
          dueDate: '2026-11-24',
          provider: 'flutterwave_card',
          fundedAt: '2026-11-17T08:18:00.000Z',
        },
      ],
    },
    {
      id: 'proj-mara-25k',
      title: 'Packaging & Retail Label Suite — Mara Coffee',
      clientName: 'Mara Coffee Roasters',
      clientCountry: 'Kenya',
      freelancerId: 'fl-david',
      category: 'Brand Identity',
      currency: 'KES',
      totalBudget: 25000,
      scheduleType: 'single',
      createdAt: '2026-11-05T13:30:00.000Z',
      milestones: [
        {
          id: 'ms-mara-1',
          title: 'Print-Ready Coffee Bag Dielines & Label Concepts',
          percentage: 100,
          grossAmount: 25000,
          freelancerShare: 22500,
          platformCommission: 2500,
          status: 'refunded',
          dueDate: '2026-11-09',
          provider: 'pesapal',
          fundedAt: '2026-11-05T13:40:00.000Z',
          refundedAt: '2026-11-08T11:20:00.000Z',
        },
      ],
    },
  ];

  const transactions: Transaction[] = [
    {
      id: 'tx-1001',
      txRef: 'KG-FLW-904821',
      flwRef: 'FLW-KE-MPESA-882104',
      projectId: 'proj-website-50k',
      projectTitle: 'Company Website Design — Savannah Logistics Ltd',
      milestoneId: 'ms-web-1',
      milestoneTitle: 'Complete Company Website Design & Responsive Handoff',
      clientName: 'Savannah Logistics Ltd',
      freelancerId: 'fl-amina',
      freelancerName: 'Amina Wanjiku',
      provider: 'flutterwave_mpesa',
      providerLabel: getProviderLabel('flutterwave_mpesa'),
      paymentDetail: 'M-Pesa 254712***901',
      grossAmount: 50000,
      platformCommission: 5000,
      freelancerNet: 45000,
      status: 'completed',
      createdAt: '2026-11-10T09:22:00.000Z',
      updatedAt: '2026-11-16T10:30:00.000Z',
      splitSubaccountId: 'RS_89A1F2E4C910',
      gatewayMode: 'sandbox_protocol',
    },
    {
      id: 'tx-1002',
      txRef: 'KG-FLW-904855',
      flwRef: 'FLW-KE-CARD-449120',
      projectId: 'proj-dispatch-120k',
      projectTitle: 'Cargo Dispatch Portal & M-Pesa Checkout',
      milestoneId: 'ms-disp-1',
      milestoneTitle: 'Milestone 1: System Architecture & Prototype (30%)',
      clientName: 'Rift Valley Cargo',
      freelancerId: 'fl-brian',
      freelancerName: 'Brian Omondi',
      provider: 'flutterwave_card',
      providerLabel: getProviderLabel('flutterwave_card'),
      paymentDetail: 'Visa •••• 4242',
      grossAmount: 36000,
      platformCommission: 3600,
      freelancerNet: 32400,
      status: 'completed',
      createdAt: '2026-11-12T11:12:00.000Z',
      updatedAt: '2026-11-14T16:00:00.000Z',
      splitSubaccountId: 'RS_42B9D3A1E807',
      gatewayMode: 'sandbox_protocol',
    },
    {
      id: 'tx-1003',
      txRef: 'KG-FLW-904912',
      flwRef: 'FLW-KE-MPESA-991042',
      projectId: 'proj-dispatch-120k',
      projectTitle: 'Cargo Dispatch Portal & M-Pesa Checkout',
      milestoneId: 'ms-disp-2',
      milestoneTitle: 'Milestone 2: First Delivery — STK Push & Driver Portal (40%)',
      clientName: 'Rift Valley Cargo',
      freelancerId: 'fl-brian',
      freelancerName: 'Brian Omondi',
      provider: 'flutterwave_mpesa',
      providerLabel: getProviderLabel('flutterwave_mpesa'),
      paymentDetail: 'M-Pesa 254720***411',
      grossAmount: 48000,
      platformCommission: 4800,
      freelancerNet: 43200,
      status: 'pending_approval',
      createdAt: '2026-11-15T10:05:00.000Z',
      updatedAt: '2026-11-19T09:15:00.000Z',
      splitSubaccountId: 'RS_42B9D3A1E807',
      gatewayMode: 'sandbox_protocol',
    },
    {
      id: 'tx-1004',
      txRef: 'KG-FLW-904940',
      flwRef: 'FLW-UK-CARD-771209',
      projectId: 'proj-nordic-80k',
      projectTitle: 'Cross-Border Payout Reconciliation API',
      milestoneId: 'ms-nordic-1',
      milestoneTitle: 'Daraja & Flutterwave Webhook Audit + Ledger Sync',
      clientName: 'NordicPay Advisory Ltd',
      freelancerId: 'fl-faith',
      freelancerName: 'Faith Mutua',
      provider: 'flutterwave_card',
      providerLabel: getProviderLabel('flutterwave_card'),
      paymentDetail: 'Mastercard •••• 8819',
      grossAmount: 80000,
      platformCommission: 8000,
      freelancerNet: 72000,
      status: 'pending_approval',
      createdAt: '2026-11-17T08:18:00.000Z',
      updatedAt: '2026-11-17T08:18:00.000Z',
      splitSubaccountId: 'RS_77C5E1B8F312',
      gatewayMode: 'sandbox_protocol',
    },
    {
      id: 'tx-1005',
      txRef: 'KG-PSP-881034',
      flwRef: 'PSP-KE-773190',
      projectId: 'proj-mara-25k',
      projectTitle: 'Packaging & Retail Label Suite — Mara Coffee',
      milestoneId: 'ms-mara-1',
      milestoneTitle: 'Print-Ready Coffee Bag Dielines & Label Concepts',
      clientName: 'Mara Coffee Roasters',
      freelancerId: 'fl-david',
      freelancerName: 'David Kamau',
      provider: 'pesapal',
      providerLabel: getProviderLabel('pesapal'),
      paymentDetail: 'Pesapal M-Pesa 254798***112',
      grossAmount: 25000,
      platformCommission: 2500,
      freelancerNet: 22500,
      status: 'refunded',
      createdAt: '2026-11-05T13:40:00.000Z',
      updatedAt: '2026-11-08T11:20:00.000Z',
      splitSubaccountId: 'RS_19D4F7C2A650',
      gatewayMode: 'sandbox_protocol',
    },
    {
      id: 'tx-1006',
      txRef: 'KG-FLW-904978',
      flwRef: 'FLW-ERR-331029',
      projectId: 'proj-dispatch-120k',
      projectTitle: 'Cargo Dispatch Portal & M-Pesa Checkout',
      milestoneId: 'ms-disp-3',
      milestoneTitle: 'Milestone 3: Final QA, Production Cutover & Docs (30%)',
      clientName: 'Rift Valley Cargo',
      freelancerId: 'fl-brian',
      freelancerName: 'Brian Omondi',
      provider: 'flutterwave_mpesa',
      providerLabel: getProviderLabel('flutterwave_mpesa'),
      paymentDetail: 'M-Pesa 254720***411',
      grossAmount: 36000,
      platformCommission: 3600,
      freelancerNet: 32400,
      status: 'failed',
      failureReason: 'STK Push timed out — M-Pesa PIN prompt expired before confirmation.',
      createdAt: '2026-11-18T16:40:00.000Z',
      updatedAt: '2026-11-18T16:42:00.000Z',
      splitSubaccountId: 'RS_42B9D3A1E807',
      gatewayMode: 'sandbox_protocol',
    },
  ];

  const payoutRequests: PayoutRequest[] = [
    {
      id: 'po-501',
      freelancerId: 'fl-amina',
      freelancerName: 'Amina Wanjiku',
      method: 'mpesa',
      accountBankCode: 'MPS',
      destinationLabel: 'M-Pesa · 254712345678',
      accountNumber: '254712345678',
      amount: 20000,
      status: 'paid',
      transferRef: 'FLW-TRF-MPS-610294',
      requestedAt: '2026-11-16T11:05:00.000Z',
      processedAt: '2026-11-16T11:18:00.000Z',
      notes: 'Instant M-Pesa mobile money disbursement settled.',
    },
    {
      id: 'po-502',
      freelancerId: 'fl-amina',
      freelancerName: 'Amina Wanjiku',
      method: 'bank',
      accountBankCode: '068',
      destinationLabel: 'Equity Bank Kenya · •••• 2034',
      accountNumber: '0180294812034',
      amount: 15000,
      status: 'pending_admin',
      transferRef: 'REQ-BNK-782401',
      requestedAt: '2026-11-19T10:12:00.000Z',
      notes: 'Awaiting admin disbursement approval.',
    },
  ];

  const { topics, messages, ideas } = createDefaultCommunitySeed();

  return {
    freelancers,
    projects,
    transactions,
    payoutRequests,
    activeFreelancerId: 'fl-amina',
    gatewayConfigured: Boolean(process.env.FLUTTERWAVE_SECRET_KEY),
    topics,
    messages,
    ideas,
  };
}

function createDefaultCommunitySeed(): {
  topics: TopicRoom[];
  messages: DiscussionMessage[];
  ideas: BrainstormIdea[];
} {
  const topics: TopicRoom[] = [
    {
      id: 'topic-pricing-mpesa',
      title: 'Milestone Pricing & M-Pesa Payment Workflows',
      category: 'Payments & Pricing',
      description:
        'Discuss quoting clients in KES vs USD, structuring 30/40/30 milestones, and setting clear Flutterwave & M-Pesa expectations.',
      createdBy: 'Brian Omondi',
      createdAt: '2026-11-18T09:00:00.000Z',
    },
    {
      id: 'topic-product-critique',
      title: 'UI/UX Critique & Portfolio Brainstorm',
      category: 'Design & Craft',
      description:
        'Share landing page concepts, mobile checkout flows, and case study framing to win higher-value retainers.',
      createdBy: 'Amina Wanjiku',
      createdAt: '2026-11-18T11:30:00.000Z',
    },
    {
      id: 'topic-fintech-apis',
      title: 'Daraja STK Push, Flutterwave Subaccounts & Webhooks',
      category: 'Engineering',
      description:
        'Troubleshoot Kenyan payment integrations, idempotent webhook handling, and automated bank or M-Pesa MPS transfers.',
      createdBy: 'Faith Mutua',
      createdAt: '2026-11-19T07:45:00.000Z',
    },
    {
      id: 'topic-client-growth',
      title: 'Winning International Clients from East Africa',
      category: 'Growth & Proposals',
      description:
        'Brainstorm proposal templates, onboarding checklists, and cross-border billing with Visa, Mastercard, and PayPal.',
      createdBy: 'David Kamau',
      createdAt: '2026-11-19T08:15:00.000Z',
    },
  ];

  const messages: DiscussionMessage[] = [
    {
      id: 'msg-1',
      topicId: 'topic-pricing-mpesa',
      authorName: 'Brian Omondi',
      authorRole: 'Full-Stack Engineer',
      body: 'For builds above KSh 80,000, splitting into 30% kickoff, 40% staging delivery, and 30% final sign-off keeps cashflow predictable for both sides.',
      createdAt: '2026-11-19T09:10:00.000Z',
    },
    {
      id: 'msg-2',
      topicId: 'topic-pricing-mpesa',
      authorName: 'Amina Wanjiku',
      authorRole: 'Product Designer',
      body: 'Agreed—and reminding international clients they can pay via Visa or Mastercard while we withdraw locally to M-Pesa or Equity Bank removes a lot of friction.',
      replyToId: 'msg-1',
      replyToAuthor: 'Brian Omondi',
      createdAt: '2026-11-19T09:16:00.000Z',
    },
    {
      id: 'msg-3',
      topicId: 'topic-product-critique',
      authorName: 'Amina Wanjiku',
      authorRole: 'Product Designer',
      body: 'Drop a quick summary of any client checkout or onboarding flow you are designing this week—let us brainstorm ways to reduce drop-off.',
      createdAt: '2026-11-19T10:05:00.000Z',
    },
    {
      id: 'msg-4',
      topicId: 'topic-fintech-apis',
      authorName: 'Faith Mutua',
      authorRole: 'Fintech Architect',
      body: 'Tip for anyone using Flutterwave Kenya transfers: always include the meta sender, sender_country, and mobile_number fields alongside account_bank: "MPS".',
      createdAt: '2026-11-19T11:20:00.000Z',
    },
  ];

  const ideas: BrainstormIdea[] = [
    {
      id: 'idea-1',
      topicId: 'topic-pricing-mpesa',
      title: 'Automated Milestone Reminder 48h Before Due Date',
      summary:
        'Send a gentle M-Pesa/card funding reminder to clients before the next 40% or 30% milestone starts so delivery is never stalled.',
      tag: 'Workflow',
      authorName: 'Brian Omondi',
      authorRole: 'Full-Stack Engineer',
      votes: 7,
      votedBy: ['Amina Wanjiku', 'Faith Mutua'],
      createdAt: '2026-11-19T09:22:00.000Z',
    },
    {
      id: 'idea-2',
      topicId: 'topic-pricing-mpesa',
      title: 'Transparent KES/USD Estimator on Proposals',
      summary:
        'Show international clients their USD card estimate next to the KES milestone total before checkout.',
      tag: 'Pricing',
      authorName: 'Amina Wanjiku',
      authorRole: 'Product Designer',
      votes: 5,
      votedBy: ['Brian Omondi'],
      createdAt: '2026-11-19T09:40:00.000Z',
    },
    {
      id: 'idea-3',
      topicId: 'topic-product-critique',
      title: 'One-Click Deliverable Preview Card',
      summary:
        'Embed a clean staging preview summary directly inside the client approval modal to speed up milestone sign-offs.',
      tag: 'Feature',
      authorName: 'David Kamau',
      authorRole: 'Brand Designer',
      votes: 6,
      votedBy: ['Amina Wanjiku'],
      createdAt: '2026-11-19T10:30:00.000Z',
    },
    {
      id: 'idea-4',
      topicId: 'topic-fintech-apis',
      title: 'Instant STK Retry Link on Timeout',
      summary:
        'When an M-Pesa STK Push expires, generate a direct retry link for the client instead of making them re-open checkout.',
      tag: 'Feature',
      authorName: 'Faith Mutua',
      authorRole: 'Fintech Architect',
      votes: 9,
      votedBy: ['Brian Omondi', 'David Kamau'],
      createdAt: '2026-11-19T11:35:00.000Z',
    },
  ];

  return { topics, messages, ideas };
}

export function loadMarketplaceState(): MarketplaceState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const seeded = createSeedState();
      fs.writeFileSync(DATA_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
      return seeded;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<MarketplaceState>;
    const defaults = createDefaultCommunitySeed();
    const hydrated: MarketplaceState = {
      ...(parsed as MarketplaceState),
      topics: Array.isArray(parsed.topics) ? parsed.topics : defaults.topics,
      messages: Array.isArray(parsed.messages) ? parsed.messages : defaults.messages,
      ideas: Array.isArray(parsed.ideas) ? parsed.ideas : defaults.ideas,
      gatewayConfigured: Boolean(process.env.FLUTTERWAVE_SECRET_KEY),
    };
    return hydrated;
  } catch {
    const seeded = createSeedState();
    return seeded;
  }
}

export function saveMarketplaceState(state: MarketplaceState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DATA_FILE);
}

export function resetMarketplaceState(): MarketplaceState {
  const seeded = createSeedState();
  saveMarketplaceState(seeded);
  return seeded;
}

export function computeFreelancerWallet(
  state: MarketplaceState,
  freelancerId: string,
): FreelancerWalletSummary {
  const freelancerProjects = state.projects.filter(
    (p) => p.freelancerId === freelancerId,
  );
  const allMilestones = freelancerProjects.flatMap((p) => p.milestones);

  const lifetimeNetEarned = allMilestones
    .filter((m) => m.status === 'approved_released')
    .reduce((sum, m) => sum + m.freelancerShare, 0);

  const pendingEarnings = allMilestones
    .filter(
      (m) =>
        m.status === 'funded_pending_work' ||
        m.status === 'submitted_for_review',
    )
    .reduce((sum, m) => sum + m.freelancerShare, 0);

  const payouts = state.payoutRequests.filter(
    (p) => p.freelancerId === freelancerId,
  );

  const totalWithdrawn = payouts
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingWithdrawals = payouts
    .filter((p) => p.status === 'pending_admin' || p.status === 'processing')
    .reduce((sum, p) => sum + p.amount, 0);

  const availableEarnings = Math.max(
    0,
    lifetimeNetEarned - totalWithdrawn - pendingWithdrawals,
  );

  return {
    freelancerId,
    availableEarnings,
    pendingEarnings,
    totalWithdrawn,
    pendingWithdrawals,
    lifetimeNetEarned,
  };
}

export function computeAdminMetrics(state: MarketplaceState): AdminMetrics {
  const completedTx = state.transactions.filter((t) => t.status === 'completed');
  const pendingTx = state.transactions.filter(
    (t) => t.status === 'pending_approval',
  );
  const refundedTx = state.transactions.filter((t) => t.status === 'refunded');
  const failedTx = state.transactions.filter((t) => t.status === 'failed');

  const completedPayments = completedTx.reduce((s, t) => s + t.grossAmount, 0);
  const pendingPayments = pendingTx.reduce((s, t) => s + t.grossAmount, 0);
  const totalCollected = completedPayments + pendingPayments;
  const totalFreelancerEarnings = completedTx.reduce(
    (s, t) => s + t.freelancerNet,
    0,
  );
  const totalPlatformCommissions = completedTx.reduce(
    (s, t) => s + t.platformCommission,
    0,
  );
  const totalRefunds = refundedTx.reduce((s, t) => s + t.grossAmount, 0);
  const failedTransactionsCount = failedTx.length;
  const failedTransactionsAmount = failedTx.reduce(
    (s, t) => s + t.grossAmount,
    0,
  );

  const pendingPayouts = state.payoutRequests.filter(
    (p) => p.status === 'pending_admin',
  );

  return {
    totalCollected,
    totalFreelancerEarnings,
    totalPlatformCommissions,
    pendingPayments,
    completedPayments,
    totalRefunds,
    failedTransactionsCount,
    failedTransactionsAmount,
    pendingPayoutRequestsAmount: pendingPayouts.reduce(
      (s, p) => s + p.amount,
      0,
    ),
    pendingPayoutRequestsCount: pendingPayouts.length,
  };
}

export function calculatePayoutDestination(
  freelancer: Freelancer,
  method: PayoutMethod,
  customMpesa?: string,
  customBankCode?: string,
  customBankAccount?: string,
): {
  accountBankCode: string;
  accountNumber: string;
  destinationLabel: string;
} {
  if (method === 'mpesa') {
    const num = (customMpesa || freelancer.mpesaNumber).replace(/\s+/g, '');
    return {
      accountBankCode: 'MPS',
      accountNumber: num,
      destinationLabel: `M-Pesa · ${num}`,
    };
  }
  const code = customBankCode || freelancer.bankCode;
  const bank =
    KENYAN_BANKS.find((b) => b.code === code)?.name || freelancer.bankName;
  const acct = (customBankAccount || freelancer.bankAccountNumber).replace(
    /\s+/g,
    '',
  );
  const tail = acct.slice(-4);
  return {
    accountBankCode: code,
    accountNumber: acct,
    destinationLabel: `${bank} · •••• ${tail}`,
  };
}
