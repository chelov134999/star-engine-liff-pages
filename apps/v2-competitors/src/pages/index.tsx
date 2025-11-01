import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import '../../../shared/guardian_v2/styles.scss';
import {
  GuardianHeader,
  GuardianHeroCard,
  GuardianModeToggle,
  QuickActionButton,
} from '../../../shared/guardian_v2/components';
import { createCompetitor, listCompetitors, updateCompetitorStatus } from '../api/client';
import {
  GuardianCompetitorAlert,
  GuardianCompetitorListItem,
  GuardianCompetitorResponse,
  GuardianCompetitorStatus,
} from '../types/api';

type NavTab = 'pulse' | 'compare' | 'settings';
type ViewMode = 'overview' | 'alerts';

type MetricKey = 'reviewCount' | 'avgSentiment' | 'avgRating' | 'lastReviewedAt';

type StatusSeverity = 'success' | 'error' | 'info';

const navTabs: Array<{ label: string; value: NavTab }> = [
  { label: '市場脈動', value: 'pulse' },
  { label: '競品比較', value: 'compare' },
  { label: '設定', value: 'settings' },
];

const metricLabels: Record<MetricKey, string> = {
  reviewCount: '評論數',
  avgSentiment: '平均情緒',
  avgRating: '平均評分',
  lastReviewedAt: '最後評論時間',
};

const metricKeys: MetricKey[] = ['reviewCount', 'avgSentiment', 'avgRating', 'lastReviewedAt'];

const formatMetricValue = (metric: MetricKey, value: unknown): string => {
  if (value === null || value === undefined) return '--';
  if (metric === 'avgSentiment' || metric === 'avgRating') {
    return typeof value === 'number' ? value.toFixed(2) : String(value);
  }
  if (metric === 'reviewCount') {
    return typeof value === 'number' ? value.toLocaleString() : String(value);
  }
  if (metric === 'lastReviewedAt') {
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime())
        ? value
        : parsed.toLocaleString('zh-TW', { hour12: false });
    }
    return '--';
  }
  return String(value);
};

interface NewCompetitorForm {
  storeName: string;
  city: string;
  placeId: string;
  website: string;
  igUrl: string;
  fbUrl: string;
}

const initialFormState: NewCompetitorForm = {
  storeName: '',
  city: '',
  placeId: '',
  website: '',
  igUrl: '',
  fbUrl: '',
};

const statusBadgeLabel = (status?: GuardianCompetitorStatus) => {
  switch (status) {
    case 'paused':
      return '已暫停';
    case 'removed':
      return '已移除';
    default:
      return '運行中';
  }
};

const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env ?? {} : {}) as Record<string, string>;
const readEnv = (key: string, fallback = ''): string => env[key] ?? env[`VITE_${key}`] ?? fallback;

const DEFAULT_LEAD_ID = readEnv('V2_DEFAULT_LEAD_ID', '');

const GuardianCompetitorsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('pulse');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<GuardianCompetitorResponse | null>(null);
  const [competitors, setCompetitors] = useState<GuardianCompetitorListItem[]>([]);
  const [alerts, setAlerts] = useState<GuardianCompetitorAlert[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusSeverity, setStatusSeverity] = useState<StatusSeverity | null>(null);
  const [updatingMap, setUpdatingMap] = useState<Record<string, boolean>>({});
  const [formState, setFormState] = useState<NewCompetitorForm>(initialFormState);

  const navItems = useMemo(
    () =>
      navTabs.map((tab) => ({
        label: tab.label,
        active: activeTab === tab.value,
        onClick: () => setActiveTab(tab.value),
      })),
    [activeTab],
  );

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    if (!DEFAULT_LEAD_ID) {
      setError('請在 .env.local 設定 V2_DEFAULT_LEAD_ID，例如 guardian_demo_lead');
      setLoading(false);
      return;
    }

    listCompetitors({ leadId: DEFAULT_LEAD_ID, includeInactive: true })
      .then((payload) => {
        if (!isMounted) return;
        const nextCompetitors = payload.data ?? payload.competitors ?? [];
        setResponse(payload);
        setCompetitors(nextCompetitors);
        setAlerts(payload.alerts ?? []);
        setError(null);
      })
      .catch((err) => {
        console.error('[GuardianCompetitors] load error', err);
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : '無法載入競品資料，請稍後再試。';
        setError(message || '無法載入競品資料，請稍後再試。');
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleInputChange = (field: keyof NewCompetitorForm) => (value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const setStatus = (message: string, severity: StatusSeverity = 'info') => {
    setStatusMessage(message);
    setStatusSeverity(severity);
  };

  const handleCreateCompetitor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.storeName || !formState.city || !formState.placeId) {
      setStatus('請填寫「競品名稱 / 城市 / Google Place ID」。', 'error');
      return;
    }

    if (
      (formState.website && !/^https?:\/\//i.test(formState.website)) ||
      (formState.igUrl && !/^https?:\/\//i.test(formState.igUrl)) ||
      (formState.fbUrl && !/^https?:\/\//i.test(formState.fbUrl))
    ) {
      // TODO: 改為更完整的 URL 驗證（目前僅檢查是否以 http/https 開頭）
      setStatus('網址需以 http(s) 開頭（TODO: 補強格式驗證）', 'error');
      return;
    }

    setCreating(true);
    try {
      if (!DEFAULT_LEAD_ID) {
        setStatus('缺少 V2_DEFAULT_LEAD_ID，無法新增競品。', 'error');
        return;
      }

      const created = await createCompetitor({
        leadId: DEFAULT_LEAD_ID,
        ...formState,
      });
      setCompetitors((prev) => {
        const existing = prev.filter((item) => item.storeId !== created.storeId);
        return [...existing, created];
      });
      setStatus(`已建立競品：${created.storeName}`, 'success');
      setFormState(initialFormState);
    } catch (err) {
      console.error('[GuardianCompetitors] create error', err);
      const message = err instanceof Error ? err.message : '建立競品失敗，請稍後再試。';
      setStatus(message || '建立競品失敗，請稍後再試。', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleAlertAction = (alert: GuardianCompetitorAlert) => {
    console.log('[TODO] follow competitor alert', alert);
    setStatus(`已記錄競品事件：${alert.competitorName}`, 'info');
  };

  const handleStatusChange = async (storeId: string, status: GuardianCompetitorStatus) => {
    setUpdatingMap((prev) => ({ ...prev, [storeId]: true }));
    try {
      if (!DEFAULT_LEAD_ID) {
        setStatus('缺少 V2_DEFAULT_LEAD_ID，無法調整競品狀態。', 'error');
        return;
      }

      const updated = await updateCompetitorStatus({
        leadId: DEFAULT_LEAD_ID,
        storeId,
        status,
      });
      setCompetitors((prev) => {
        const next = prev
          .map((comp) => {
            if (comp.storeId !== storeId) return comp;
            if (status === 'removed') {
              return null;
            }
            return { ...comp, status: updated?.status ?? status };
          })
          .filter((item): item is GuardianCompetitorListItem => Boolean(item));
        return next;
      });
      if (status === 'removed') {
        setStatus('已移除競品。', 'success');
      } else if (status === 'paused') {
        setStatus('已暫停監控。', 'info');
      } else {
        setStatus('已恢復監控。', 'success');
      }
    } catch (err) {
      console.error('[GuardianCompetitors] update status error', err);
      let message = err instanceof Error ? err.message : '更新競品狀態失敗。';
      if (message.includes('api_v2_competitors_update_status')) {
        message = '尚未部署 api_v2_competitors_update_status，請通知終端 1。';
      }
      setStatus(message, 'error');
    } finally {
      setUpdatingMap((prev) => {
        const next = { ...prev };
        delete next[storeId];
        return next;
      });
    }
  };

  const sortedCompetitors = competitors
    .slice()
    .sort((a, b) => (a.storeName || '').localeCompare(b.storeName || ''));
  const topCompetitor = sortedCompetitors[0];
  const heroTitle = response?.account?.storeName ?? 'Guardian 競品監控';
  const heroCity =
    response?.account?.city ?? topCompetitor?.city ?? (response ? '未提供城市' : '載入中');
  const heroPlan = response?.account?.planTier
    ? response.account.planTier.toUpperCase()
    : 'N/A';
  const metricsRecord = (topCompetitor?.metrics ?? {}) as Record<string, unknown>;
  const heroReviewCountRaw = metricsRecord.reviewCount ?? metricsRecord.review_volume;
  const heroSentimentRaw = metricsRecord.avgSentiment ?? metricsRecord.sentiment;
  const heroReviewCount = typeof heroReviewCountRaw === 'number' ? heroReviewCountRaw : null;
  const heroSentiment = typeof heroSentimentRaw === 'number' ? heroSentimentRaw : null;

  return (
    <div className="guardian-app">
      <GuardianHeader
        navItems={navItems}
        rightSlot={
          <GuardianModeToggle
            value={viewMode}
            options={[
              { value: 'overview', label: 'A' },
              { value: 'alerts', label: 'B' },
            ]}
            onChange={setViewMode}
          />
        }
      />

      <main className="guardian-main">
        <section className="guardian-search">
          <label htmlFor="competitor-city" className="guardian-field__label">
            城市
          </label>
          <input
            id="competitor-city"
            className="guardian-field"
            placeholder="輸入城市"
            value={formState.city}
            onChange={(event) => handleInputChange('city')(event.target.value)}
          />
          <label htmlFor="competitor-store" className="guardian-field__label">
            店名
          </label>
          <input
            id="competitor-store"
            className="guardian-field"
            placeholder="輸入競品店名"
            list="competitor-store-list"
            value={formState.storeName}
            onChange={(event) => handleInputChange('storeName')(event.target.value)}
          />
          <datalist id="competitor-store-list">
            <option value="海味火鍋" />
            <option value="辣麵研所" />
            <option value="椒麻串堂" />
          </datalist>
          <label htmlFor="competitor-place" className="guardian-field__label">
            Google Place ID
          </label>
          <input
            id="competitor-place"
            className="guardian-field"
            placeholder="輸入 Google Place ID"
            value={formState.placeId}
            onChange={(event) => handleInputChange('placeId')(event.target.value)}
          />
        </section>

        {loading && <div className="guardian-status">載入競品資料中...</div>}
        {error && (
          <div className="guardian-alert guardian-alert--critical">
            <span className="guardian-alert__body">{error}</span>
          </div>
        )}

        {!loading && !error && response && (
          <GuardianHeroCard
            title={heroTitle}
            meta={`目前方案 ${heroPlan} · 自家城市 ${heroCity}`}
            metrics={[
              {
                label: '主要競品評論數',
                value: heroReviewCount !== null ? heroReviewCount.toLocaleString() : '--',
                description: topCompetitor?.storeName
                  ? `${topCompetitor.storeName} 最近評論數 ${heroReviewCount !== null ? heroReviewCount.toLocaleString() : '--'}`
                  : '待資料同步',
              },
              {
                label: '主要競品平均情緒',
                value: heroSentiment !== null ? heroSentiment.toFixed(2) : '--',
                description:
                  typeof topCompetitor?.sentimentDelta === 'number'
                    ? `情緒差距 ${topCompetitor.sentimentDelta.toFixed(2)}`
                    : undefined,
              },
            ]}
            actions={[
              {
                label: '建立競品警報',
                variant: 'primary',
                onClick: () => console.log('[TODO] create competitor alert'),
              },
              {
                label: '下載比較報表',
                variant: 'ghost',
                onClick: () => console.log('[TODO] download competitor report'),
              },
            ]}
          >
            {/* TODO: 依 Mode A/B 拆分不同 KPI 與趨勢圖，待接上實際 API */}
            <div className="guardian-hero__placeholder">(趨勢圖 placeholder)</div>
          </GuardianHeroCard>
        )}

        {!loading && !error && competitors.length > 0 && viewMode === 'overview' && (
          <section className="guardian-section">
            <h3>競品指標矩陣</h3>
            <div className="guardian-competitor-matrix">
              <div className="guardian-competitor-matrix__header">指標</div>
              <div className="guardian-competitor-matrix__header">自家</div>
              {sortedCompetitors.map((comp) => (
                <div key={`header-${comp.storeId}`} className="guardian-competitor-matrix__header">
                  {comp.storeName}
                </div>
              ))}

              {metricKeys.map((metric) => (
                <React.Fragment key={metric}>
                  <div className="guardian-competitor-matrix__metric">{metricLabels[metric]}</div>
                  <div className="guardian-competitor-matrix__value">--</div>
                  {sortedCompetitors.map((comp) => {
                    const rawValue = comp.metrics?.[metric];
                    return (
                      <div
                        key={`${metric}-${comp.storeId}`}
                        className="guardian-competitor-matrix__value"
                      >
                        {formatMetricValue(metric, rawValue)}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </section>
        )}

        {!loading && !error && viewMode === 'alerts' && alerts.length > 0 && (
          <section className="guardian-section">
            <h3>競品事件與建議行動</h3>
            <ul className="guardian-alert-list">
              {alerts.map((alert) => (
                <li key={alert.id} className={`guardian-alert guardian-alert--${alert.severity}`}>
                  <span className="guardian-alert__time">{alert.occurredAt}</span>
                  <div className="guardian-alert__body">
                    <strong>{alert.competitorName}</strong>
                    <p>{alert.summary}</p>
                    {alert.recommendedAction && (
                      <QuickActionButton
                        label="記錄建議"
                        onClick={() => handleAlertAction(alert)}
                        variant="secondary"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="guardian-section">
          <h3>新增競品</h3>
          <form className="guardian-form" onSubmit={handleCreateCompetitor}>
            <label className="guardian-field__label" htmlFor="new-competitor-name">
              競品名稱
            </label>
            <input
              id="new-competitor-name"
              className="guardian-field"
              placeholder="輸入競品名稱"
              value={formState.storeName}
              onChange={(event) => handleInputChange('storeName')(event.target.value)}
              required
            />
            <label className="guardian-field__label" htmlFor="new-competitor-city">
              城市
            </label>
            <input
              id="new-competitor-city"
              className="guardian-field"
              placeholder="輸入城市"
              value={formState.city}
              onChange={(event) => handleInputChange('city')(event.target.value)}
              required
            />
            <label className="guardian-field__label" htmlFor="new-competitor-place-id">
              Google Place ID
            </label>
            <input
              id="new-competitor-place-id"
              className="guardian-field"
              placeholder="ChIJxxxxxxxx"
              value={formState.placeId}
              onChange={(event) => handleInputChange('placeId')(event.target.value)}
              required
            />
            <label className="guardian-field__label" htmlFor="new-competitor-website">
              官方網站（選填）
            </label>
            <input
              id="new-competitor-website"
              className="guardian-field"
              placeholder="https://example.com"
              value={formState.website}
              onChange={(event) => handleInputChange('website')(event.target.value)}
            />
            <label className="guardian-field__label" htmlFor="new-competitor-ig">
              IG 連結（選填）
            </label>
            <input
              id="new-competitor-ig"
              className="guardian-field"
              placeholder="https://www.instagram.com/..."
              value={formState.igUrl}
              onChange={(event) => handleInputChange('igUrl')(event.target.value)}
            />
            <label className="guardian-field__label" htmlFor="new-competitor-fb">
              FB 連結（選填）
            </label>
            <input
              id="new-competitor-fb"
              className="guardian-field"
              placeholder="https://www.facebook.com/..."
              value={formState.fbUrl}
              onChange={(event) => handleInputChange('fbUrl')(event.target.value)}
            />
            <button
              type="submit"
              className="guardian-btn guardian-btn--secondary"
              disabled={creating}
            >
              {creating ? '建立中…' : '建立'}
            </button>
          </form>
          <p className="guardian-card__highlight">
            TODO：串接實際 API 後，需檢查資料驗證與權限，並處理 placeId / website / IG / FB 欄位格式。
          </p>
        </section>

        {!loading && competitors.length > 0 && (
          <section className="guardian-section">
            <h3>競品管理</h3>
            <div className="guardian-list">
              {competitors.map((comp) => (
                <div key={`manage-${comp.storeId}`} className="guardian-list__item">
                  <div>
                    <strong>{comp.storeName}</strong>
                    <div className="guardian-card__highlight">
                      {statusBadgeLabel(comp.status)} · 最後更新 {comp.lastSeenAt ?? '—'}
                    </div>
                  </div>
                  <div className="guardian-hero__actions">
                    <QuickActionButton
                      label={comp.status === 'paused' ? '恢復' : '暫停'}
                      variant="secondary"
                      onClick={() => handleStatusChange(comp.storeId, comp.status === 'paused' ? 'active' : 'paused')}
                      disabled={Boolean(updatingMap[comp.storeId])}
                    />
                    <QuickActionButton
                      label="移除"
                      variant="ghost"
                      onClick={() => handleStatusChange(comp.storeId, 'removed')}
                      disabled={Boolean(updatingMap[comp.storeId])}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {statusMessage && (
          <div
            className={`guardian-alert ${
              statusSeverity === 'error' ? 'guardian-alert--critical' : 'guardian-alert--info'
            }`}
          >
            <span className="guardian-alert__body">{statusMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
};

export default GuardianCompetitorsPage;
