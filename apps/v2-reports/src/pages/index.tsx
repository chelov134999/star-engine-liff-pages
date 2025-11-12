import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '../../../shared/guardian_v2/styles.scss';
import {
  GuardianHeader,
  GuardianHeroCard,
  GuardianModeToggle,
  QuickActionButton,
} from '../../../shared/guardian_v2/components';
import { fetchReports } from '../api/client';
import {
  GuardianInsightSummary,
  GuardianReportResponse,
  GuardianViewMode,
} from '../types/api';
import { useGuardianAuth } from '../../../shared/guardian_v2/auth/useGuardianAuth';

type NavTab = 'today' | 'history' | 'custom';

const navTabs: Array<{ label: string; value: NavTab }> = [
  { label: '今日洞察', value: 'today' },
  { label: '歷史走勢', value: 'history' },
  { label: '自訂報表', value: 'custom' },
];

const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env ?? {} : {}) as Record<string, string>;
const readEnv = (key: string, fallback = ''): string => env[key] ?? env[`VITE_${key}`] ?? fallback;

const ENV_FALLBACK_LEAD_ID = readEnv('V2_DEFAULT_LEAD_ID', '');

const GuardianReportsPage: React.FC = () => {
  const { loading: authLoading, error: authError, defaultLeadId, profile } = useGuardianAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('today');
  const [viewMode, setViewMode] = useState<GuardianViewMode>('insight');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<GuardianReportResponse | null>(null);

  const navItems = useMemo(
    () =>
      navTabs.map((tab) => ({
        label: tab.label,
        active: activeTab === tab.value,
        onClick: () => setActiveTab(tab.value),
      })),
    [activeTab],
  );

  const effectiveLeadId = defaultLeadId || ENV_FALLBACK_LEAD_ID;

  const loadReports = useCallback(async () => {
    if (!effectiveLeadId) {
      setError('尚未綁定預設 Lead，請確認 LIFF 帳號或 .env.local 的 V2_DEFAULT_LEAD_ID。');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetchReports({
        leadId: effectiveLeadId,
        viewMode,
        referenceDate: new Date().toISOString().slice(0, 10),
      });
      setReportData(response);
    } catch (err) {
      console.error('[GuardianReports] load error', err);
      const message = err instanceof Error ? err.message : '載入失敗，請稍後重試。';
      setError(message || '載入失敗，請稍後重試。');
    } finally {
      setLoading(false);
    }
  }, [effectiveLeadId, viewMode]);

  useEffect(() => {
    if (authLoading) return;
    loadReports();
  }, [authLoading, loadReports]);

  const renderInsights = (insights: GuardianInsightSummary[]) => (
    <div className="guardian-insight-grid">
      {insights.map((item) => (
        <article key={item.id} className={`guardian-card guardian-card--${item.severity}`}>
          <header>
            <span className="guardian-card__type">{item.type}</span>
            <h3>{item.title}</h3>
          </header>
          <p className="guardian-card__highlight">{item.highlight}</p>
          <footer>
            {item.actions && item.actions.length > 0 ? (
              item.actions.map((action) => (
                <QuickActionButton
                  key={`${item.id}-${action.action}`}
                  label={action.label}
                  variant={action.variant ?? 'secondary'}
                  onClick={() => console.log('[TODO] insight action', action.action)}
                />
              ))
            ) : item.ctaLabel ? (
              <QuickActionButton
                label={item.ctaLabel}
                variant="secondary"
                onClick={() => console.log('[TODO] insight action', item.ctaAction)}
              />
            ) : (
              <span className="guardian-card__empty">暫無建議</span>
            )}
          </footer>
        </article>
      ))}
    </div>
  );

  const heroCard = reportData?.data?.[0];
  const hasReports = Boolean(reportData?.data?.length);
  const hasTimeline = Boolean(reportData?.timeline?.length);

  return (
    <div className="guardian-app">
      <GuardianHeader
        navItems={navItems}
        rightSlot={
          <div className="guardian-header__actions">
            {profile ? (
              <span className="guardian-user-chip">
                <span className="guardian-user-chip__emoji" role="img" aria-label="guardian">
                  📊
                </span>
                <span className="guardian-user-chip__label">
                  {profile.displayName}
                  <small>報表中心</small>
                </span>
              </span>
            ) : null}
            <GuardianModeToggle
              value={viewMode}
              options={[
                { value: 'insight', label: 'A' },
                { value: 'timeline', label: 'B' },
              ]}
              onChange={setViewMode}
            />
          </div>
        }
      />

      <main className="guardian-main">
        <section className="guardian-search">
          <label htmlFor="guardian-city" className="guardian-field__label">
            城市
          </label>
          <input id="guardian-city" className="guardian-field" placeholder="輸入城市名稱" />
          <label htmlFor="guardian-store" className="guardian-field__label">
            店名
          </label>
          <input
            id="guardian-store"
            className="guardian-field"
            placeholder="輸入店名或編號"
            list="guardian-store-list"
          />
          <datalist id="guardian-store-list">
            <option value="Guardian 官方示範店" />
            <option value="星級引擎 台北信義店" />
            <option value="星級引擎 台中公益店" />
          </datalist>
        </section>

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

        {!loading && !error && heroCard && (
          <GuardianHeroCard
            title={heroCard.accountName}
            meta={`報表日期 ${heroCard.reportDate} · 方案 ${heroCard.planTier.toUpperCase()}`}
            metrics={[
              {
                label: '守護分數',
                value: heroCard.coverageScore,
              },
              {
                label: 'AI 成本',
                value: `$${heroCard.aiSpendUsd.toFixed(2)}`,
              },
            ]}
            actions={[
              {
                label: '查看完整報表',
                variant: 'primary',
                onClick: () => console.log('[TODO] open full report', heroCard.reportId),
              },
              {
                label: '下載 PDF',
                variant: 'ghost',
                onClick: () => console.log('[TODO] download pdf', heroCard.reportId),
              },
            ]}
          >
            {/* TODO: 依 API 回傳拆分 A/B mode 的 metrics / insights，並讓 pills 篩選實際控制資料 */}
            <nav className="guardian-pills">
              <button type="button" className="guardian-pill guardian-pill--active">
                餐段異常
              </button>
              <button type="button" className="guardian-pill">
                菜品警示
              </button>
              <button type="button" className="guardian-pill">
                競品事件
              </button>
            </nav>
            {viewMode === 'insight' && renderInsights(heroCard.insights)}
          </GuardianHeroCard>
        )}

        {!loading && !error && !hasReports && (
          <div className="guardian-empty-state">
            尚未產生報表，待終端 1 API 串接後載入正式資料。
          </div>
        )}

        {!loading && !error && viewMode === 'timeline' && hasTimeline && (
          <section className="guardian-section">
            <h3>觸發事件時間軸</h3>
            <ul className="guardian-timeline">
              {reportData?.timeline?.map((item) => (
                <li key={item.id}>
                  <span className="guardian-timeline__time">{item.timestamp}</span>
                  <span className="guardian-timeline__summary">{item.summary}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
};

export default GuardianReportsPage;
