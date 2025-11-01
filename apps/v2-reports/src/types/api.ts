export type GuardianViewMode = 'insight' | 'timeline';

export interface GuardianReportListParams {
  leadId: string;
  viewMode?: GuardianViewMode;
  reportType?: string;
  referenceDate?: string; // ISO 8601 date (ex: 2024-11-01)
}

export type GuardianInsightType = 'time_anomaly' | 'dish_issue' | 'competitor_win_time';

export type GuardianInsightSeverity = 'info' | 'warning' | 'critical';

export interface GuardianInsightAction {
  label: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export interface GuardianInsightSummary {
  id: string;
  type: GuardianInsightType;
  title: string;
  highlight: string;
  severity: GuardianInsightSeverity;
  metricValue?: number;
  metricUnit?: string;
  trend?: 'up' | 'down' | 'flat';
  ctaLabel?: string;
  ctaAction?: string;
  actions?: GuardianInsightAction[];
}

export interface GuardianReportCard {
  reportId: string;
  reportDate: string; // ISO date
  generatedAt: string; // ISO timestamp
  accountName: string;
  accountId?: string;
  schemaVersion?: string;
  coverageScore: number; // 0-100
  aiSpendUsd: number;
  planTier: 'lite' | 'pro' | 'enterprise';
  planSource?: string;
  summary?: string;
  metrics?: Record<string, unknown>;
  insights: GuardianInsightSummary[];
}

export interface GuardianReportTimelineItem {
  id: string;
  timestamp: string;
  summary: string;
  linkedInsightType: GuardianInsightType;
  recommendedAction?: string;
}

export interface GuardianReportResponse {
  data: GuardianReportCard[];
  timeline?: GuardianReportTimelineItem[];
  pagination?: {
    cursor?: string;
    hasNext: boolean;
    total?: number;
  };
  meta: {
    generatedAt: string;
    requestId: string;
    window?: string;
  };
}

export interface GuardianReportError {
  error: string;
  message: string;
  requestId?: string;
  retryAfterSeconds?: number;
}
