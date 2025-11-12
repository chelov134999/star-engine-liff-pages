import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import '../../../shared/guardian_v2/styles.scss';
import { GuardianHeader, QuickActionButton } from '../../../shared/guardian_v2/components';
import { setPlan as setPlanApi, triggerFlow as triggerFlowApi } from '../api/client';
import { hasGuardianAdminRole } from '../../../shared/guardian_v2/auth/session';
import { useGuardianAuth } from '../../../shared/guardian_v2/auth/useGuardianAuth';

type PlanCode = 'lite' | 'pro' | 'enterprise';

interface AdminAccountSummary {
  accountId: string;
  storeName: string;
  city: string;
  planCode: PlanCode;
  planSource: 'manual' | 'stripe' | 'trial';
}

const mockAccounts: AdminAccountSummary[] = [
  {
    accountId: 'acct-guardian-demo',
    storeName: '星級引擎 台北信義店',
    city: '台北市',
    planCode: 'pro',
    planSource: 'manual',
  },
  {
    accountId: 'acct-guardian-002',
    storeName: '星級引擎 台中公益店',
    city: '台中市',
    planCode: 'lite',
    planSource: 'trial',
  },
  {
    accountId: 'acct-guardian-003',
    storeName: '星級引擎 高雄夢時代店',
    city: '高雄市',
    planCode: 'enterprise',
    planSource: 'stripe',
  },
];

const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env ?? {} : {}) as Record<string, string>;
const readEnv = (key: string, fallback = ''): string => env[key] ?? env[`VITE_${key}`] ?? fallback;

const DEFAULT_REASON = readEnv('V2_ADMIN_PLAN_REASON', 'frontend-demo');
const DEFAULT_PLAN_SOURCE = readEnv('V2_ADMIN_PLAN_SOURCE', 'manual');
const RICH_MENU_ENTRIES = ['報表中心', '監控名單', '升級方案', '設定'];

const AdminPage: React.FC = () => {
  const {
    loading: authLoading,
    error: authError,
    roles,
    profile,
    defaultAccountId,
  } = useGuardianAuth();

  const HAS_ADMIN_ROLE = hasGuardianAdminRole(roles);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<AdminAccountSummary | null>(mockAccounts[0]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusSeverity, setStatusSeverity] = useState<'info' | 'error' | 'success'>('info');
  const [planLoading, setPlanLoading] = useState(false);
  const [flowLoading, setFlowLoading] = useState<Record<string, boolean>>({});
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    if (!defaultAccountId) return;
    const matched = mockAccounts.find((account) => account.accountId === defaultAccountId);
    if (matched) {
      setSelectedAccount(matched);
    }
  }, [defaultAccountId]);

  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) return mockAccounts;
    const keyword = searchTerm.toLowerCase();
    return mockAccounts.filter(
      (account) =>
        account.accountId.toLowerCase().includes(keyword) ||
        account.storeName.toLowerCase().includes(keyword) ||
        account.city.toLowerCase().includes(keyword),
    );
  }, [searchTerm]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusSeverity('info');
    setStatusMessage(`已更新搜尋結果，共 ${filteredAccounts.length} 筆`);
  };

  const handleSelectAccount = (account: AdminAccountSummary) => {
    setSelectedAccount(account);
    setStatusSeverity('success');
    setStatusMessage(`已選擇帳號：${account.storeName}`);
  };

  const handlePlanChange = async (nextPlan: PlanCode) => {
    if (!selectedAccount) return;
    if (!HAS_ADMIN_ROLE) {
      setStatusSeverity('error');
      setStatusMessage('需要 admin 權限才能切換方案。');
      return;
    }
    setPlanLoading(true);
    try {
      const result = await setPlanApi({
        accountId: selectedAccount.accountId,
        planCode: nextPlan,
        planSource: DEFAULT_PLAN_SOURCE,
        reason: DEFAULT_REASON,
      });
      const nextPlanSource =
        (result.data.planSource as AdminAccountSummary['planSource'] | undefined) ??
        selectedAccount.planSource;
      setSelectedAccount({ ...selectedAccount, planCode: nextPlan, planSource: nextPlanSource });
      setStatusSeverity('success');
      const planSource = result.data.planSource ? `（來源 ${result.data.planSource}）` : '';
      const eventHint = result.meta.eventId ? ` · 事件 ${result.meta.eventId.slice(0, 8)}` : '';
      setStatusMessage(`方案已更新為 ${nextPlan.toUpperCase()}${planSource}${eventHint} · LINE 推播已排程`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '方案切換發生錯誤';
      setStatusSeverity('error');
      setStatusMessage(message);
    } finally {
      setPlanLoading(false);
    }
  };

  const handleTriggerFlow = async (flow: string) => {
    if (!HAS_ADMIN_ROLE) {
      setStatusSeverity('error');
      setStatusMessage('需要 admin 權限才能觸發流程。');
      return;
    }
    setFlowLoading((prev) => ({ ...prev, [flow]: true }));
    try {
      if (!selectedAccount) {
        throw new Error('尚未選擇帳號，無法觸發流程');
      }
      const result = await triggerFlowApi({
        flow,
        accountId: selectedAccount.accountId,
        note: DEFAULT_REASON,
        testMode,
      });
      setStatusSeverity('info');
      const runSummary = `${result.data.runId.slice(0, 8)} · ${result.data.status}`;
      const modeLabel = testMode ? '（測試）' : '';
      setStatusMessage(`已送出流程 ${flow}${modeLabel} · run ${runSummary} · LINE 推播已排程`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '流程觸發失敗';
      setStatusSeverity('error');
      const modeLabel = testMode ? '（測試模式）' : '';
      setStatusMessage(`流程觸發失敗${modeLabel}：${message}`);
    } finally {
      setFlowLoading((prev) => {
        const next = { ...prev };
        delete next[flow];
        return next;
      });
    }
  };

  return (
    <div className="guardian-app guardian-admin">
      <GuardianHeader
        logoText="Guardian Admin"
        rightSlot={
          profile ? (
            <div className="guardian-user-chip">
              <span className="guardian-user-chip__emoji" role="img" aria-label="advisor">
                🛡️
              </span>
              <span className="guardian-user-chip__label">
                {profile.displayName}
                <small>LINE 顧問 · {HAS_ADMIN_ROLE ? 'Admin' : 'Viewer'}</small>
              </span>
            </div>
          ) : null
        }
      />

      <main className="guardian-main">
        {authLoading && <div className="guardian-status">正在初始化 LIFF 會話...</div>}

        {authError && (
          <div className="guardian-alert guardian-alert--critical">
            <span className="guardian-alert__body">
              {authError}
              <br />
              若頁面未自動重新導向，請重新整理或確認 LIFF / Supabase 設定。
            </span>
          </div>
        )}

        {!authLoading && !authError && !HAS_ADMIN_ROLE && (
          <div className="guardian-alert guardian-alert--critical">
            <span className="guardian-alert__body">目前為 viewer 模式，請使用具 guardian.admin 權限的帳號登入後再試。</span>
          </div>
        )}

        {!authLoading && !authError && (
          <section className="guardian-section">
            <h2>Rich Menu V2</h2>
            <div className="guardian-card guardian-card--menu">
              <p className="guardian-card__highlight">已同步最新 Rich Menu · 預期排序如下：</p>
              <nav className="guardian-rich-menu">
                {RICH_MENU_ENTRIES.map((entry) => (
                  <span key={entry} className="guardian-rich-menu__pill">
                    {entry}
                  </span>
                ))}
              </nav>
              <p>顧問歡迎訊息已啟用，流程觸發後會推播排程狀態與報表摘要。</p>
            </div>
          </section>
        )}

        <section className="guardian-section">
          <h2>搜尋帳號 / 門市</h2>
          <form className="guardian-form" onSubmit={handleSearchSubmit}>
            <label htmlFor="admin-search" className="guardian-field__label">
              帳號 / 店名
            </label>
            <input
              id="admin-search"
              className="guardian-field"
              placeholder="輸入帳號 ID、門市或關鍵字"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              list="admin-search-suggestions"
            />
            <datalist id="admin-search-suggestions">
              {mockAccounts.map((account) => (
                <option key={account.accountId} value={account.storeName} />
              ))}
            </datalist>
            <QuickActionButton label="搜尋" variant="primary" />
          </form>

          <div className="guardian-list">
            {filteredAccounts.map((account) => (
              <button
                key={account.accountId}
                type="button"
                className={`guardian-list__item${
                  selectedAccount?.accountId === account.accountId ? ' is-active' : ''
                }`}
                onClick={() => handleSelectAccount(account)}
              >
                <span>
                  {account.storeName} · {account.city}
                </span>
                <span className="guardian-card__highlight">
                  方案：{account.planCode.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="guardian-section">
          <h2>方案資訊</h2>
          {selectedAccount ? (
            <div className="guardian-card">
              <p>
                目前方案：
                <strong>{selectedAccount.planCode.toUpperCase()}</strong> · 來源：
                {selectedAccount.planSource}
              </p>
              <div className="guardian-hero__actions">
                <QuickActionButton
                  label="升級至 Enterprise"
                  variant="secondary"
                  onClick={() => handlePlanChange('enterprise')}
                  disabled={planLoading}
                />
                <QuickActionButton
                  label="保持 PRO"
                  variant="ghost"
                  onClick={() => handlePlanChange('pro')}
                  disabled={planLoading}
                />
                <QuickActionButton
                  label="降級至 Lite"
                  variant="ghost"
                  onClick={() => handlePlanChange('lite')}
                  disabled={planLoading}
                />
              </div>
              <p className="guardian-card__highlight">
                透過 Supabase RPC `api_v2_admin_set_plan` 切換方案，記得附上原因與權限檢查。
              </p>
            </div>
          ) : (
            <div className="guardian-empty-state">尚未選擇帳號。</div>
          )}
        </section>

        <section className="guardian-section">
          <h2>觸發流程</h2>
          <div className="guardian-form guardian-form--inline">
            <label className="guardian-field__label" htmlFor="guardian-flow-test-mode">
              測試模式（推播至個人 LINE）
            </label>
            <input
              id="guardian-flow-test-mode"
              type="checkbox"
              checked={testMode}
              onChange={(event) => setTestMode(event.target.checked)}
            />
          </div>
          <div className="guardian-hero__actions">
            <QuickActionButton
              label="重新產生報表"
              variant="primary"
              onClick={() => handleTriggerFlow('guardian_report_refresh')}
              disabled={Boolean(flowLoading['guardian_report_refresh'])}
            />
            <QuickActionButton
              label="重置守護任務"
              onClick={() => handleTriggerFlow('guardian_task_reset')}
              disabled={Boolean(flowLoading['guardian_task_reset'])}
            />
            <QuickActionButton
              label="送出通知測試"
              variant="ghost"
              onClick={() => handleTriggerFlow('guardian_notification_test')}
              disabled={Boolean(flowLoading['guardian_notification_test'])}
            />
          </div>
          <p className="guardian-card__highlight">
            執行前須確認登入者具備 `guardian.admin` 或 `guardian.ops` 權限；成功後會推播通知至 LINE。
          </p>
        </section>

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

export default AdminPage;
