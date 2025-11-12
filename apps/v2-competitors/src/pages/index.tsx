import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
import { useGuardianAuth } from '../../../shared/guardian_v2/auth/useGuardianAuth';

type NavTab = 'pulse' | 'compare' | 'settings';
type ViewMode = 'overview' | 'alerts';
type StatusSeverity = 'success' | 'error' | 'info';

interface NewCompetitorForm {
  storeName: string;
  city: string;
  placeId: string;
  website: string;
  igUrl: string;
  fbUrl: string;
}

const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env ?? {} : {}) as Record<
  string,
  string
>;
const readEnv = (key: string, fallback = ''): string => env[key] ?? env[`VITE_${key}`] ?? fallback;

const ENV_FALLBACK_LEAD_ID = readEnv('V2_DEFAULT_LEAD_ID', '');

const navTabs: Array<{ label: string; value: NavTab }> = [
  { label: '市場脈動', value: 'pulse' },
  { label: '競品比較', value: 'compare' },
  { label: '設定', value: 'settings' },
];

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

const GuardianCompetitorsPage: React.FC = () => {
  const { loading: authLoading, error: authError, defaultLeadId, profile } = useGuardianAuth();
  const effectiveLeadId = defaultLeadId || ENV_FALLBACK_LEAD_ID;

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

  const refreshCompetitors = useCallback(async () => {
    if (!effectiveLeadId) {
      setError('尚未綁定預設 Lead，請確認 LIFF 帳號或 .env 設定。');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const payload = await listCompetitors({ leadId: effectiveLeadId, includeInactive: true });
      const nextCompetitors = payload.data ?? payload.competitors ?? [];
      setResponse(payload);
      setCompetitors(nextCompetitors);
      setAlerts(payload.alerts ?? []);
      setError(null);
    } catch (err) {
      console.error('[GuardianCompetitors] list error', err);
      const message = err instanceof Error ? err.message : '無法載入競品資料，請稍後再試。';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [effectiveLeadId]);

  useEffect(() => {
    if (authLoading) return;
    refreshCompetitors();
  }, [authLoading, refreshCompetitors]);

  const handleInputChange = (field: keyof NewCompetitorForm) => (value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const setStatus = (message: string, severity: StatusSeverity = 'info') => {
    setStatusMessage(message);
    setStatusSeverity(severity);
  };

  const handleCreateCompetitor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!effectiveLeadId) {
      setStatus('尚未綁定預設 Lead，無法新增競品。', 'error');
      return;
    }
    if (!formState.storeName || !formState.city || !formState.placeId) {
      setStatus('請填寫「競品名稱 / 城市 / Google Place ID」。', 'error');
      return;
    }
    if (
      (formState.website && !/^https?:\/\//i.test(formState.website)) ||
      (formState.igUrl && !/^https?:\/\//i.test(formState.igUrl)) ||
      (formState.fbUrl && !/^https?:\/\//i.test(formState.fbUrl))
    ) {
      setStatus('網址需以 http(s) 開頭（TODO: 補強格式驗證）', 'error');
      return;
    }

    setCreating(true);
    try {
      const created = await createCompetitor({
        leadId: effectiveLeadId,
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
      setStatus(message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (storeId: string, status: GuardianCompetitorStatus) => {
    if (!effectiveLeadId) {
      setStatus('尚未綁定預設 Lead，無法更新狀態。', 'error');
      return;
    }
    setUpdatingMap((prev) => ({ ...prev, [storeId]: true }));
    try {
      const updated = await updateCompetitorStatus({
        leadId: effectiveLeadId,
        storeId,
        status,
        reason: `frontend-${status}`,
      });
      setCompetitors((prev) =>
        prev
          .map((item) => {
            if (item.storeId !== storeId) return item;
            if (status === 'removed') return null;
            return {
              ...item,
              status: updated?.status ?? status,
              metadata: {
                ...item.metadata,
                statusReason: updated?.metadata?.statusReason ?? `frontend-${status}`,
                statusUpdatedAt: updated?.metadata?.statusUpdatedAt ?? new Date().toISOString(),
              },
            };
          })
          .filter((candidate): candidate is GuardianCompetitorListItem => Boolean(candidate)),
      );
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
        message = '尚未部署 api_v2_competitors_update_status，請聯絡終端 1。';
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
  const heroReviewCount =
    typeof metricsRecord.reviewCount === 'number' ? metricsRecord.reviewCount : null;
  const heroSentiment =
    typeof metricsRecord.avgSentiment === 'number' ? metricsRecord.avgSentiment : null;

  return (
    <div className="guardian-app">
      <GuardianHeader
        navItems={navItems}
        rightSlot={
          <div className="guardian-header__actions">
            {profile ? (
              <span className="guardian-user-chip">
                <span className="guardian-user-chip__emoji" role="img" aria-label="advisor">
                  🧭
                </span>
                <span className="guardian-user-chip__label">
                  {profile.displayName}
                  <small>競品監控</small>
                </span>
              </span>
            ) : null}
            <GuardianModeToggle
              value={viewMode}
              options={[
                { value: 'overview', label: '總覽' },
                { value: 'alerts', label: '警示' },
              ]}
              onChange={setViewMode}
            />
          </div>
        }
      />

      <main className="guardian-main">
        {(authLoading || loading) && <div className="guardian-status">載入中...</div>}
        {authError && (
          <div className="guardian-alert guardian-alert--critical">
            <span className="guardian-alert__body">{authError}</span>
          </div>
        )}
        {error && (
          <div className="guardian-alert guardian-alert--critical">
            <span className="guardian-alert__body">{error}</span>
          </div>
        )}

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
            {sortedCompetitors.slice(0, 5).map((item) => (
              <option key={item.storeId} value={item.storeName ?? ''} />
            ))}
          </datalist>
          <label htmlFor="competitor-place-id" className="guardian-field__label">
            Google Place ID
          </label>
          <input
            id="competitor-place-id"
            className="guardian-field"
            placeholder="ChIJxxxxxxxx"
            value={formState.placeId}
            onChange={(event) => handleInputChange('placeId')(event.target.value)}
          />
        </section>

        {!loading && !error && topCompetitor && (
          <GuardianHeroCard
            title={heroTitle}
            meta={`城市 ${heroCity} · 方案 ${heroPlan}`}
            metrics={[
              {
                label: '監控數量',
                value: competitors.length,
              },
              {
                label: '競品評論數',
                value: heroReviewCount ? heroReviewCount.toLocaleString() : '--',
              },
              {
                label: '平均情緒',
                value: heroSentiment ? heroSentiment.toFixed(2) : '--',
              },
            ]}
            actions={[
              {
                label: '匯出競品列表',
                variant: 'primary',
                onClick: () => console.log('[TODO] export competitors'),
              },
              {
                label: '設定通知',
                variant: 'ghost',
                onClick: () => setActiveTab('settings'),
              },
            ]}
          >
            {viewMode === 'overview' ? (
              <div className="guardian-competitor-matrix">
                {sortedCompetitors.slice(0, 6).map((item) => (
                  <div key={item.storeId} className="guardian-competitor-matrix__value">
                    <strong>{item.storeName}</strong>
                    <div>{item.city || '未提供城市'}</div>
                    <div className="guardian-card__highlight">{statusBadgeLabel(item.status)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="guardian-list">
                {alerts.map((alert) => (
                  <button
                    key={alert.alertId}
                    type="button"
                    className="guardian-list__item"
                    onClick={() => setStatus(`已標記警示：${alert.title}`, 'info')}
                  >
                    <span>
                      <strong>{alert.competitorName}</strong> · {alert.type}
                    </span>
                    <span className="guardian-card__highlight">{alert.createdAt}</span>
                  </button>
                ))}
                {alerts.length === 0 && (
                  <div className="guardian-empty-state">目前沒有新的警示。</div>
                )}
              </div>
            )}
          </GuardianHeroCard>
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
                      onClick={() =>
                        handleStatusChange(comp.storeId, comp.status === 'paused' ? 'active' : 'paused')
                      }
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
