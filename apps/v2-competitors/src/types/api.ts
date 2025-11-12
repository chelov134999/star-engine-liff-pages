export type GuardianCompetitorMetric = 'review_volume' | 'sentiment' | 'visibility' | 'engagement';

export interface GuardianCompetitorAccount {
  accountId: string;
  storeId: string;
  storeName: string;
  city: string;
  planTier: 'lite' | 'pro' | 'enterprise';
}

export interface GuardianCompetitorTrendPoint {
  timestamp: string;
  metric: GuardianCompetitorMetric;
  selfValue: number;
  competitorValue: number;
  competitorStoreId: string;
}

export type GuardianCompetitorAlertSeverity = 'info' | 'warning' | 'critical';

export type GuardianCompetitorStatus = 'active' | 'paused' | 'removed';

export interface GuardianCompetitorAlert {
  id: string;
  occurredAt: string;
  competitorStoreId: string;
  competitorName: string;
  summary: string;
  severity: GuardianCompetitorAlertSeverity;
  recommendedAction?: string;
}

export interface GuardianCompetitorMetrics {
  reviewCount?: number | null;
  avgSentiment?: number | null;
  avgRating?: number | null;
  lastReviewedAt?: string | null;
  [key: string]: number | string | null | undefined;
}

export interface GuardianCompetitorMetadata {
  leadId?: string;
  accountId?: string;
  monitorType?: string;
  domain?: string;
  [key: string]: unknown;
}

export interface GuardianCompetitorListItem {
  storeId: string;
  storeName: string;
  city?: string | null;
  lastSeenAt?: string | null;
  metrics?: GuardianCompetitorMetrics;
  sentimentDelta?: number | null;
  status?: GuardianCompetitorStatus;
  placeId?: string | null;
  website?: string | null;
  igUrl?: string | null;
  fbUrl?: string | null;
  metadata?: GuardianCompetitorMetadata;
}

export interface GuardianCompetitorResponseMeta {
  generatedAt: string;
  requestId: string;
}

export interface GuardianCompetitorResponse {
  // `data` 為 Supabase RPC 回傳；`competitors` 為 mock 相容欄位
  data?: GuardianCompetitorListItem[];
  competitors?: GuardianCompetitorListItem[];
  account?: GuardianCompetitorAccount;
  trends?: GuardianCompetitorTrendPoint[];
  alerts?: GuardianCompetitorAlert[];
  meta: GuardianCompetitorResponseMeta;
}

export interface GuardianCompetitorCreatePayload {
  leadId: string;
  storeName: string;
  city: string;
  placeId: string;
  website?: string;
  igUrl?: string;
  fbUrl?: string;
}

export interface GuardianCompetitorApiError {
  error: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface GuardianCompetitorStatusUpdatePayload {
  leadId: string;
  storeId: string;
  status: GuardianCompetitorStatus;
  reason?: string;
}
