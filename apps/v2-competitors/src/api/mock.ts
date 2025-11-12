import {
  GuardianCompetitorAlert,
  GuardianCompetitorResponse,
  GuardianCompetitorTrendPoint,
  GuardianCompetitorMetric,
} from '../types/api';

const trendPoints: GuardianCompetitorTrendPoint[] = [
  {
    timestamp: '2024-10-28T02:00:00Z',
    metric: 'review_volume',
    selfValue: 45,
    competitorValue: 72,
    competitorStoreId: 'comp-001',
  },
  {
    timestamp: '2024-10-28T02:00:00Z',
    metric: 'sentiment',
    selfValue: 0.32,
    competitorValue: 0.58,
    competitorStoreId: 'comp-001',
  },
  {
    timestamp: '2024-10-29T02:00:00Z',
    metric: 'review_volume',
    selfValue: 52,
    competitorValue: 88,
    competitorStoreId: 'comp-001',
  },
  {
    timestamp: '2024-10-29T02:00:00Z',
    metric: 'sentiment',
    selfValue: 0.28,
    competitorValue: 0.64,
    competitorStoreId: 'comp-001',
  },
];

const alerts: GuardianCompetitorAlert[] = [
  {
    id: 'alert-001',
    occurredAt: '2024-10-29T11:05:00Z',
    competitorStoreId: 'comp-001',
    competitorName: '海味火鍋',
    summary: '午餐時段評論量 +68%，情緒平均 0.64',
    severity: 'warning',
    recommendedAction: '推出午餐限定折扣或強化評論互動',
  },
  {
    id: 'alert-002',
    occurredAt: '2024-10-28T22:15:00Z',
    competitorStoreId: 'comp-002',
    competitorName: '辣麵研所',
    summary: '推出「宵夜雙人餐」，社群互動率升 32%',
    severity: 'info',
  },
];

const competitorMetrics = (metric: GuardianCompetitorMetric): number => {
  switch (metric) {
    case 'review_volume':
      return 88;
    case 'sentiment':
      return 0.64;
    case 'visibility':
      return 1.2;
    case 'engagement':
      return 0.43;
    default:
      return 0;
  }
};

export const mockCompetitorResponse: GuardianCompetitorResponse = {
  account: {
    accountId: 'acct-guardian-demo',
    storeId: 'store-primary',
    storeName: '星級引擎 台北信義店',
    city: '台北市',
    planTier: 'pro',
  },
  competitors: [
    {
      storeId: 'comp-001',
      storeName: '海味火鍋',
      city: '台北市',
      lastSeenAt: '2024-10-29T11:05:00Z',
      status: 'active',
      placeId: 'ChIJSeaFood123',
      website: 'https://seafood.example.com',
      igUrl: 'https://www.instagram.com/seafood',
      metrics: {
        reviewCount: competitorMetrics('review_volume'),
        avgSentiment: competitorMetrics('sentiment'),
        avgRating: 4.2,
        lastReviewedAt: '2024-10-29T11:05:00Z',
        review_volume: competitorMetrics('review_volume'),
        sentiment: competitorMetrics('sentiment'),
        visibility: competitorMetrics('visibility'),
        engagement: competitorMetrics('engagement'),
      },
      sentimentDelta: 0.28,
    },
    {
      storeId: 'comp-002',
      storeName: '辣麵研所',
      city: '台北市',
      lastSeenAt: '2024-10-28T22:15:00Z',
      status: 'paused',
      placeId: 'ChIJNoodleLab456',
      fbUrl: 'https://www.facebook.com/noodlelab',
      metrics: {
        reviewCount: 56,
        avgSentiment: 0.51,
        avgRating: 3.9,
        lastReviewedAt: '2024-10-28T22:15:00Z',
        review_volume: 56,
        sentiment: 0.51,
        visibility: 0.92,
        engagement: 0.37,
      },
      sentimentDelta: 0.12,
    },
  ],
  trends: trendPoints,
  alerts,
  meta: {
    generatedAt: '2024-10-30T03:20:10Z',
    requestId: 'mock-request-guardian-competitors',
  },
};

export const fetchGuardianCompetitorsMock = async () => {
  return Promise.resolve(JSON.parse(JSON.stringify(mockCompetitorResponse)) as GuardianCompetitorResponse);
};

export const createGuardianCompetitorMock = async (payload: {
  leadId: string;
  storeName: string;
  city: string;
  placeId: string;
  website?: string;
  igUrl?: string;
  fbUrl?: string;
}) => {
  const newCompetitor = {
    storeId: `mock-${Date.now()}`,
    storeName: payload.storeName,
    city: payload.city,
    lastSeenAt: new Date().toISOString(),
    status: 'active' as const,
    placeId: payload.placeId,
    website: payload.website,
    igUrl: payload.igUrl,
    fbUrl: payload.fbUrl,
    metrics: {
      reviewCount: 0,
      avgSentiment: 0,
      avgRating: 0,
      lastReviewedAt: null,
      review_volume: 0,
      sentiment: 0,
      visibility: 0,
      engagement: 0,
    },
    sentimentDelta: 0,
  };
  mockCompetitorResponse.competitors.push(newCompetitor);
  return newCompetitor;
};

export const updateGuardianCompetitorStatusMock = async (
  storeId: string,
  status: 'paused' | 'removed' | 'active',
) => {
  const target = mockCompetitorResponse.competitors.find((comp) => comp.storeId === storeId);
  if (target) {
    target.status = status;
  }
  return target ?? null;
};
