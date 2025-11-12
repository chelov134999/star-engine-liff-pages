import {
  GuardianInsightSummary,
  GuardianReportCard,
  GuardianReportResponse,
  GuardianReportTimelineItem,
  GuardianViewMode,
} from '../types/api';

const mockInsights: GuardianInsightSummary[] = [
  {
    id: 'insight-001',
    type: 'time_anomaly',
    title: '晚餐評論暴增 3.2σ',
    highlight: '負評主要集中在 19:00-20:00 時段',
    severity: 'warning',
    metricValue: 3.2,
    metricUnit: 'σ',
    trend: 'up',
    ctaLabel: '檢視細節',
    ctaAction: 'open:time_anomaly:insight-001',
    actions: [
      {
        label: '檢視晚餐詳情',
        action: 'open:time_anomaly:insight-001',
        variant: 'secondary',
      },
    ],
  },
  {
    id: 'insight-002',
    type: 'dish_issue',
    title: '麻婆豆腐 TF-IDF 2.1',
    highlight: '近 7 日負評 12 則、平均情緒 -0.45',
    severity: 'critical',
    metricValue: 2.1,
    metricUnit: 'tfidf',
    trend: 'up',
    ctaLabel: '加入守護任務',
    ctaAction: 'action:create_task:dish_issue:insight-002',
    actions: [
      {
        label: '加入守護任務',
        action: 'action:create_task:dish_issue:insight-002',
      },
      {
        label: '查看評論',
        action: 'open:reviews:dish_issue:insight-002',
        variant: 'ghost',
      },
    ],
  },
  {
    id: 'insight-003',
    type: 'competitor_win_time',
    title: '競品「海味火鍋」午餐暴衝',
    highlight: '競品評論量 +68%，自家 -15%',
    severity: 'warning',
    metricValue: 68,
    metricUnit: '%',
    trend: 'up',
    ctaLabel: '比較競品策略',
    ctaAction: 'nav:/apps/v2-competitors?focus=insight-003',
    actions: [
      {
        label: '比較競品策略',
        action: 'nav:/apps/v2-competitors?focus=insight-003',
        variant: 'primary',
      },
    ],
  },
];

const mockTimeline: GuardianReportTimelineItem[] = [
  {
    id: 'event-20241030-01',
    timestamp: '2024-10-30T03:20:00Z',
    summary: '守護任務「負評回覆」自動派送給店長',
    linkedInsightType: 'dish_issue',
    recommendedAction: '確認任務回覆狀態',
  },
  {
    id: 'event-20241029-02',
    timestamp: '2024-10-29T11:05:00Z',
    summary: '觸發競品午餐異常，已建立對手雙向比較卡',
    linkedInsightType: 'competitor_win_time',
  },
];

const mockCards: GuardianReportCard[] = [
  {
    reportId: 'rpt-20241030-a1',
    reportDate: '2024-10-30',
    generatedAt: '2024-10-30T03:30:00Z',
    accountName: '星級引擎 台北信義店',
    coverageScore: 89,
    aiSpendUsd: 2.45,
    planTier: 'pro',
    insights: mockInsights,
  },
];

export const mockReportResponse: GuardianReportResponse = {
  data: mockCards,
  timeline: mockTimeline,
  pagination: {
    cursor: null,
    hasNext: false,
    total: 1,
  },
  meta: {
    generatedAt: '2024-10-30T03:30:10Z',
    requestId: 'mock-request-guardian-reports',
  },
};

export const fetchGuardianReportsMock = async (
  _params: { viewMode?: GuardianViewMode } = {},
): Promise<GuardianReportResponse> => {
  return Promise.resolve(mockReportResponse);
};
