(function () {
  const CONFIG = window.__STAR_ENGINE_CONFIG__ || {};
  const API_BASE =
    typeof CONFIG.API_BASE === 'string' && CONFIG.API_BASE.trim().length > 0
      ? CONFIG.API_BASE.replace(/\/$/, '')
      : '';

  const STORAGE_KEYS = {
    lead: 'star-engine/lead-context',
    report: 'star-engine/report-cache',
  };

  const STAGE_FLOW = [
    {
      id: 'S1',
      event: 'card1_cta',
      idle: 'S1 等待排程',
      active: 'AI 正在搜尋地圖與 AI 摘要中的品牌足跡…',
      complete: 'AI 已鎖定你的品牌足跡',
    },
    {
      id: 'S2',
      event: 'card2_cta',
      idle: 'S2 等待掃描完成',
      active: 'AI 正在同步評論與競品資訊…',
      complete: 'AI 掌握每日守護清單',
    },
    {
      id: 'S3',
      event: 'card3_cta',
      idle: 'S3 等待資料彙整',
      active: 'AI 正在生成品牌指紋…',
      complete: '品牌指紋建立完成',
    },
    {
      id: 'S4',
      event: 'card4_cta',
      idle: 'S4 等待競品比對',
      active: 'AI 正在比對附近競品…',
      complete: '競品 Top3 比對完成',
    },
    {
      id: 'S5',
      event: 'card5_cta',
      idle: 'S5 等待守護啟動',
      active: 'AI 正在配置巡邏任務…',
      complete: '守護巡邏就緒',
    },
    {
      id: 'S6',
      event: 'card6_cta_report',
      idle: 'S6 等待報告完成',
      active: 'AI 正在寫入初檢報告…',
      complete: 'AI 初檢報告已產生',
    },
  ];

  const analytics = window.starAnalytics;

  function trackEvent(eventName, payload = {}) {
    if (!eventName || !analytics || typeof analytics.track !== 'function') return;
    analytics.track(eventName, payload);
  }

  function formatTimestamp(isoString) {
    if (!isoString) return '--';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '--';
    return d.toLocaleString('zh-TW', {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function safeLocalStorage(callback, fallback = null) {
    try {
      return callback();
    } catch (error) {
      return fallback;
    }
  }

  function getStoredLead() {
    return safeLocalStorage(() => {
      const raw = window.localStorage.getItem(STORAGE_KEYS.lead);
      return raw ? JSON.parse(raw) : null;
    });
  }

  function setStoredLead(context) {
    if (!context) return;
    safeLocalStorage(() => {
      window.localStorage.setItem(STORAGE_KEYS.lead, JSON.stringify(context));
    });
  }

  function cacheReportData(leadId, data) {
    if (!leadId || !data) return;
    const payload = {
      leadId,
      cachedAt: new Date().toISOString(),
      data,
    };
    safeLocalStorage(() => {
      window.localStorage.setItem(STORAGE_KEYS.report, JSON.stringify(payload));
    });
  }

  function parseQueryContext() {
    const params = new URLSearchParams(window.location.search);
    return {
      leadId: params.get('lead_id') || params.get('leadId') || '',
      token: params.get('token') || '',
    };
  }

  function getLeadContext() {
    const stored = getStoredLead();
    const query = parseQueryContext();
    const leadId = query.leadId || stored?.leadId || '';
    const token = query.token || stored?.token || '';
    const createdAt = stored?.createdAt || (leadId ? new Date().toISOString() : null);
    const context = { leadId, token, createdAt };
    if (leadId || token) {
      setStoredLead(context);
    }
    return context;
  }

  async function fetchReportData(context, options = {}) {
    if (!API_BASE) {
      throw new Error('missing_api_base');
    }
    const params = new URLSearchParams();
    if (context.token) {
      params.set('token', context.token);
    } else if (context.leadId) {
      params.set('lead_id', context.leadId);
    } else {
      throw new Error('missing_context');
    }

    const response = await fetch(`${API_BASE}/report-data?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: options.cache ?? 'no-cache',
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(`report_data_${response.status}`);
    }
    return response.json();
  }

  function submitLead(payload) {
    if (!API_BASE) {
      throw new Error('missing_api_base');
    }
    return fetch(`${API_BASE}/lead-entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  function initLeadForm() {
    const form = document.getElementById('lead-form');
    if (!form) return;

    trackEvent('s0_view', { page: 'index' });

    const statusEl = form.querySelector('.form-status');
    const submitBtn = form.querySelector('button[type="submit"]');
    const labelEl = submitBtn?.querySelector('.btn-label');
    const originalLabel = labelEl?.textContent || '';

    const stored = getStoredLead();
    if (stored?.leadId && statusEl) {
      statusEl.textContent = `你已申請過入場券（${stored.leadId}）。可直接前往流程進度。`;
      statusEl.classList.add('is-success');
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      statusEl?.classList.remove('is-success', 'is-error');
      if (statusEl) statusEl.textContent = '';

      const formData = new FormData(form);
      const payload = {};
      let hasError = false;

      form.querySelectorAll('.field-error').forEach((el) => {
        el.textContent = '';
      });

      form.querySelectorAll('[name]').forEach((input) => {
        const { name } = input;
        const value = (formData.get(name) || '').toString().trim();
        payload[name] = value;
        if (input.hasAttribute('required') && !value) {
          hasError = true;
          const fieldError = input.closest('.field')?.querySelector('.field-error');
          if (fieldError) {
            fieldError.textContent = input.dataset.errorEmpty || '此欄位為必填';
          }
          trackEvent('s0_error_empty_field', { field: name });
        }
      });

      if (hasError) {
        if (statusEl) {
          statusEl.textContent = '請確認必填欄位內容。';
          statusEl.classList.add('is-error');
        }
        return;
      }

      if (!API_BASE) {
        if (statusEl) {
          statusEl.textContent = 'API 設定缺失，請稍後再試。';
          statusEl.classList.add('is-error');
        }
        return;
      }

      submitBtn?.classList.add('is-loading');
      const loadingText = submitBtn?.dataset.loadingText;
      if (labelEl && loadingText) {
        labelEl.textContent = loadingText;
      }

      try {
        const response = await submitLead({
          city: payload.city,
          route: payload.route,
          number: payload.number,
          name: payload.name,
          source: payload.source || 'landing-page',
        });

        if (!response.ok) {
          throw new Error(`lead_entry_${response.status}`);
        }

        const result = await response.json();
        const leadId = result.lead_id;
        const token = result.token || '';

        if (!leadId) {
          throw new Error('missing_lead_id');
        }

        const context = {
          leadId,
          token,
          createdAt: new Date().toISOString(),
        };
        setStoredLead(context);

        trackEvent('s0_submit', { lead_id: leadId, source: payload.source });

        if (statusEl) {
          statusEl.textContent = `AI 已收到資料（${leadId}），稍後帶你進入流程。`;
          statusEl.classList.add('is-success');
        }

        window.setTimeout(() => {
          const params = new URLSearchParams({ lead_id: leadId });
          if (token) params.set('token', token);
          window.location.href = `onboarding.html?${params.toString()}`;
        }, 1000);
      } catch (error) {
        if (statusEl) {
          statusEl.textContent = '送出失敗，請稍後再試。';
          statusEl.classList.add('is-error');
        }
      } finally {
        submitBtn?.classList.remove('is-loading');
        if (labelEl) {
          labelEl.textContent = originalLabel;
        }
      }
    });
  }

  function applyStageState(stageId, state, message) {
    const card = document.querySelector(`.stage-card[data-stage="${stageId}"]`);
    if (!card) return;
    card.classList.remove('is-active', 'is-complete');
    if (state === 'active') card.classList.add('is-active');
    if (state === 'complete') card.classList.add('is-complete');
    const statusEl = card.querySelector('[data-stage-status]');
    if (statusEl && message) {
      statusEl.textContent = message;
    }
  }

  function initialiseStagePlaceholders() {
    STAGE_FLOW.forEach((stage) => {
      applyStageState(stage.id, 'idle', stage.idle);
      const button = document.querySelector(
        `.stage-card[data-stage="${stage.id}"] [data-analytics-event]`,
      );
      if (button) {
        button.setAttribute('data-analytics-event', stage.event);
      }
    });
  }

  function applyReportLink(context) {
    if (!context.leadId) return;
    const params = new URLSearchParams({ lead_id: context.leadId });
    if (context.token) params.set('token', context.token);
    document
      .querySelectorAll('[data-report-link]')
      .forEach((el) => el.setAttribute('href', `report.html?${params.toString()}`));
  }

  function initOnboarding() {
    const context = getLeadContext();
    const leadIdEl = document.querySelector('[data-lead-id]');
    const createdEl = document.querySelector('[data-lead-created]');
    const statusEl = document.querySelector('[data-onboarding-status]');
    const chipEl = document.querySelector('[data-stage-chip]');
    const chatkitLink = document.querySelector('[data-chatkit-link]');

    initialiseStagePlaceholders();
    applyReportLink(context);

    if (chatkitLink) {
      const url = CONFIG.CHATKIT_URL || '#';
      chatkitLink.setAttribute('href', url);
      if (CONFIG.CHATKIT_URL) {
        chatkitLink.setAttribute('target', '_blank');
        chatkitLink.setAttribute('rel', 'noopener noreferrer');
      }
    }

    if (leadIdEl) leadIdEl.textContent = context.leadId || '尚未建立';
    if (createdEl) createdEl.textContent = formatTimestamp(context.createdAt);
    if (!context.leadId && statusEl) {
      statusEl.textContent = '找不到入場券資訊，請回到首頁重新申請。';
      statusEl.classList.add('is-error');
      return;
    }

    if (chipEl) chipEl.textContent = 'AI 正在排程掃描';

    let attempt = 0;
    const maxAttempts = 6;

    const attemptFetch = async () => {
      if (attempt >= maxAttempts) {
        if (statusEl) {
          statusEl.textContent = 'AI 正在整理資料，請稍後再試或連絡守護團隊。';
          statusEl.classList.add('is-error');
        }
        if (chipEl) chipEl.textContent = 'AI 同步暫停';
        return;
      }

      const stage = STAGE_FLOW[Math.min(attempt, STAGE_FLOW.length - 1)];
      applyStageState(stage.id, 'active', stage.active);
      if (chipEl) {
        chipEl.textContent = `AI 正在執行第 ${attempt + 1} 次資料同步`;
      }
      if (statusEl) {
        statusEl.textContent = 'AI 正在取得最新資料，這通常需要 1～3 分鐘。';
        statusEl.classList.remove('is-error');
      }

      attempt += 1;

      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 8500);
        const data = await fetchReportData(context, { signal: controller.signal });
        window.clearTimeout(timer);

        if (data && data.kpis) {
          STAGE_FLOW.forEach((stageItem) =>
            applyStageState(stageItem.id, 'complete', stageItem.complete),
          );
          if (chipEl) chipEl.textContent = 'AI 初檢報告已就緒';
          if (statusEl) {
            statusEl.textContent = 'AI 初檢報告準備完成，立即前往 S7 查看細節。';
            statusEl.classList.remove('is-error');
          }
          cacheReportData(data.lead_id || context.leadId, data);
          return;
        }
      } catch (error) {
        // ignore and continue polling
      }

      window.setTimeout(attemptFetch, 6000);
    };

    attemptFetch();
  }

  window.starEngine = {
    trackEvent,
    formatTimestamp,
    getLeadContext,
    fetchReportData,
    cacheReportData,
  };

  const body = document.body;
  if (body.classList.contains('page-index')) {
    initLeadForm();
  } else if (body.classList.contains('page-onboarding')) {
    initOnboarding();
  }
})();
