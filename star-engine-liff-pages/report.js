(function () {
  const engine = window.starEngine || {};
  const CONFIG = window.__STAR_ENGINE_CONFIG__ || {};
  const REPORT_CACHE_KEY = 'star-engine/report-cache';
  const FETCH_TIMEOUT_MS = 10000;
  const MAX_FETCH_DURATION_MS = 15000;
  const RETRY_DELAY_MS = 1200;
  let latestReport = null;

  const DEFAULT_SUMMARY =
    '你的品牌在 AI 搜尋中可見度一般、評論健康良好、語意覆蓋偏低。建議立刻回覆 3 則低星，並建立 AI 可讀網站。';
  const DEFAULT_NEXT_STEP =
    '下一步：先處理低星評論，再補齊網站語意，AI 才會更常推薦你。';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const shell = document.querySelector('.report-shell');
    if (!shell) return;

    const context = engine.getLeadContext ? engine.getLeadContext() : { leadId: '', token: '' };
    updateLeadDisplay(context);
    setupTokenToggle();
    setupLossToggle();
    setupActionButtons(context);

    const cached = loadCachedReport(context.leadId);
    if (cached?.data) {
      renderReport(cached.data, { fromCache: true });
    }

    if (!context.leadId && !context.token) {
      showFallback();
      return;
    }

    fetchLatestReport(context);
  }

  function fetchLatestReport(context, attemptState = {}) {
    const attempt = Number(attemptState.attempt || 1);
    const startedAt = attemptState.startedAt || Date.now();
    const elapsed = Date.now() - startedAt;
    const remainingBudget = Math.max(MAX_FETCH_DURATION_MS - elapsed, 3000);
    const statusMessage =
      attempt === 1
        ? 'AI 正在生成你的專屬報告…'
        : '資料整理中，正在為你再次同步…';

    setStatus(statusMessage, { state: 'neutral' });
    if (attempt === 1) {
      setLoader(true);
    }

    const controller = new AbortController();
    const timeoutMs =
      attempt === 1 ? Math.min(FETCH_TIMEOUT_MS, remainingBudget) : remainingBudget;
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    engine
      .fetchReportData(context, { signal: controller.signal })
      .then((data) => {
        window.clearTimeout(timer);

        if (isGeneratingReport(data)) {
          if (attempt < 2 && Date.now() - startedAt < MAX_FETCH_DURATION_MS) {
            window.setTimeout(() => {
              fetchLatestReport(context, { attempt: attempt + 1, startedAt });
            }, RETRY_DELAY_MS);
            return;
          }
          showGeneratingState(context);
          return;
        }

        const leadId = data.lead_id || context.leadId || '';
        const isPartial = isPartialReport(data);
        renderReport(data, { fromCache: false, partial: isPartial });
        engine.trackEvent('s7_view_report', {
          ok: true,
          lead_id: leadId || null,
          status: isPartial ? 'ready_partial' : 'ready',
        });
        if (leadId) {
          engine.cacheReportData(leadId, data);
        }
      })
      .catch((error) => {
        window.clearTimeout(timer);
        const isTimeout = error?.name === 'AbortError';
        if (isTimeout && attempt < 2 && Date.now() - startedAt < MAX_FETCH_DURATION_MS) {
          window.setTimeout(() => {
            fetchLatestReport(context, { attempt: attempt + 1, startedAt });
          }, RETRY_DELAY_MS);
          return;
        }
        engine.trackEvent('s7_view_report', {
          ok: false,
          lead_id: context.leadId || null,
          message: isTimeout ? 'timeout' : error?.message || 'error',
        });
        showFallback();
      });
  }

  function renderReport(data, options = {}) {
    latestReport = data;
    toggleFallback(false);

    const fromCache = Boolean(options.fromCache);
    const isPartial = Boolean(options.partial);
    const shell = document.querySelector('.report-shell');
    if (shell) {
      shell.dataset.reportState = isPartial ? 'partial' : 'ready';
    }

    if (isPartial) {
      setStatus('資料更新中（partial），剩餘指標即將補齊。', { state: 'partial' });
    } else {
      setStatus(fromCache ? '顯示離線快取資料。' : 'AI 報告已更新。', {
        state: fromCache ? 'neutral' : 'success',
      });
    }

    const leadEl = document.querySelector('[data-report-lead]');
    if (leadEl) leadEl.textContent = data.lead_id || data.leadId || leadEl.textContent;

    const summaryEl = document.querySelector('[data-report-summary]');
    if (summaryEl) summaryEl.textContent = data.summary?.headline || DEFAULT_SUMMARY;

    const nextEl = document.querySelector('[data-report-next-step]');
    if (nextEl) nextEl.textContent = data.summary?.next_step || DEFAULT_NEXT_STEP;

    const lastEl = document.querySelector('[data-last-updated]');
    if (lastEl) lastEl.textContent = engine.formatTimestamp(data.sync?.last_updated);

    const nextSyncEl = document.querySelector('[data-next-sync]');
    if (nextSyncEl) nextSyncEl.textContent = engine.formatTimestamp(data.sync?.next_sync);

    const tokenWrapper = document.querySelector('[data-token-wrapper]');
    const tokenValue = document.querySelector('[data-report-token]');
    if (data.token && tokenWrapper && tokenValue) {
      tokenWrapper.hidden = false;
      tokenValue.textContent = data.token;
    }

    renderKpis(data.kpis);
    renderCompetitors(data.competitors, data.losses);
    renderGuardTasks(data.tasks);
    setLoader(false);
  }

  function renderKpis(raw) {
    const map = normalizeKpis(raw);
    const defaults = {
      search_visibility: { note: 'Local Pack 命中 5 次｜近 7 日', desc: 'AI 是否把你列入 Top3 推薦。' },
      ai_visibility: { note: '缺 FAQ / Offer Schema', desc: 'AI 對你的品牌語意理解程度。' },
      crisis_alert: { note: '最近 7 天無低星', desc: '負評、異常訊號的即時狀態。' },
      recommendation_heat: { note: 'Top3 出現 3 次', desc: 'AI 與地圖推薦你的次數。' },
    };

    document.querySelectorAll('.kpi-card').forEach((card) => {
      const key = card.dataset.kpi;
      const slot = map[key] || {};
      const valueEl = card.querySelector('.kpi-card__value');
      const noteEl = card.querySelector('.kpi-card__note');
      const descEl = card.querySelector('.kpi-card__desc');
      const sourceEl = card.querySelector('.source-chip');

      if (valueEl) valueEl.textContent = formatKpiValue(slot);
      if (noteEl) noteEl.textContent = slot.note || defaults[key]?.note || '';
      if (descEl) descEl.textContent = defaults[key]?.desc || '';
      if (sourceEl) sourceEl.textContent = slot.source ? `來源：${slot.source}` : '來源：—';
    });
  }

  function renderCompetitors(list, losses) {
    const tbody = document.querySelector('.competitor-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const competitors = Array.isArray(list) ? list.slice(0, 3) : [];
    if (competitors.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="4">目前尚未取得競品資料。</td>`;
      tbody.appendChild(row);
    } else {
      competitors.forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td data-label="競品">${item.name || '—'}</td>
          <td data-label="Google 星等">${formatNullable(item.rating)}</td>
          <td data-label="回覆速度">${item.response_time || '—'}</td>
          <td data-label="AI 推薦率">${formatNullable(item.ai_recommendation)}</td>
        `;
        tbody.appendChild(row);
      });
    }

    const lossPanel = document.querySelector('[data-loss-panel]');
    if (lossPanel) {
      const panelList = [];
      if (Array.isArray(losses) && losses.length) {
        panelList.push(...losses);
      } else {
        panelList.push('每月可能少 1,200 名搜尋客', '平均星等恐再低 0.4★', '每月少被 AI 提名 38 次');
      }
      lossPanel.querySelector('ul').innerHTML = panelList.map((text) => `<li>${text}</li>`).join('');
    }
  }

  function renderGuardTasks(rawTasks) {
    const groups = rawTasks || {};
    const defaults = {
      immediate:
        '回覆最近 3 則低星評論（已附草稿），完成後 AI 會即刻重算評價。',
      next: '補充品牌主打清單與菜單亮點，提升 AI 語意覆蓋度。',
      guidance: '確認門牌、官網與 Google 商家資訊一致，AI 才能建立可信檔案。',
    };

    document.querySelectorAll('.guard-card').forEach((card) => {
      const key = card.dataset.task;
      const descEl = card.querySelector('[data-task-desc]');
      const source = normalizeTasks(groups[key]);
      if (descEl) {
        if (source.length) {
          descEl.textContent = source[0];
        } else {
          descEl.textContent = defaults[key] || '';
        }
      }
    });
  }

  function normalizeStatusToken(data) {
    const token = data?.status || data?.sync?.status;
    return typeof token === 'string' ? token.toLowerCase() : '';
  }

  function isPartialReport(data) {
    const token = normalizeStatusToken(data);
    return token === 'ready_partial' || token === 'partial';
  }

  function isGeneratingReport(data) {
    if (!data) return true;
    if (data.ok === false) return true;
    const token = normalizeStatusToken(data);
    if (token === 'generating' || token === 'pending' || token === 'queued') {
      return true;
    }
    return !data.kpis;
  }

  function showGeneratingState(context) {
    toggleFallback(false);
    const shell = document.querySelector('.report-shell');
    if (shell) {
      shell.dataset.reportState = 'generating';
    }

    const summaryEl = document.querySelector('[data-report-summary]');
    if (summaryEl) summaryEl.textContent = 'AI 報告正在整理，請稍候…';

    const nextEl = document.querySelector('[data-report-next-step]');
    if (nextEl) nextEl.textContent = 'AI 正在補齊 KPI，完成後會立即通知你。';

    renderPendingKpis();
    renderPendingCompetitors();
    renderPendingTasks();
    setStatus('資料生成中，真實 KPI 即將送達。', { state: 'pending' });
    setLoader(true);

    engine.trackEvent?.('s7_view_report', {
      ok: false,
      lead_id: context?.leadId || null,
      message: 'generating',
    });
  }

  function renderPendingKpis() {
    document.querySelectorAll('.kpi-card').forEach((card) => {
      const valueEl = card.querySelector('.kpi-card__value');
      const noteEl = card.querySelector('.kpi-card__note');
      const sourceEl = card.querySelector('.source-chip');
      if (valueEl) valueEl.textContent = '—';
      if (noteEl) noteEl.textContent = '資料生成中…';
      if (sourceEl) sourceEl.textContent = '來源：—';
    });
  }

  function renderPendingCompetitors() {
    const tbody = document.querySelector('.competitor-table tbody');
    if (tbody) {
      tbody.innerHTML =
        '<tr class="skeleton-row"><td colspan="4">AI 正在整理競品資料…</td></tr>';
    }
    const lossPanel = document.querySelector('[data-loss-panel]');
    if (lossPanel) {
      lossPanel.hidden = true;
      const list = lossPanel.querySelector('ul');
      if (list) list.innerHTML = '';
    }
  }

  function renderPendingTasks() {
    document.querySelectorAll('.guard-card [data-task-desc]').forEach((descEl) => {
      descEl.textContent = 'AI 正在計算守護任務，稍後會提供精準建議。';
    });
  }

  function setStatus(message, options = {}) {
    const statusEl = document.querySelector('[data-report-status]');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.classList.remove('is-error', 'is-success', 'is-partial', 'is-pending');
    if (options.state === 'error') statusEl.classList.add('is-error');
    if (options.state === 'success') statusEl.classList.add('is-success');
    if (options.state === 'partial') statusEl.classList.add('is-partial');
    if (options.state === 'pending') statusEl.classList.add('is-pending');
  }

  function showFallback() {
    toggleFallback(true);
    setStatus('暫時無法取得最新資料，請稍後再試。', { state: 'error' });
    setLoader(false);
  }

  function toggleFallback(show) {
    const fallback = document.querySelector('[data-empty-state]');
    if (!fallback) return;
    fallback.hidden = !show;
  }

  function setupTokenToggle() {
    const toggle = document.querySelector('[data-token-toggle]');
    const token = document.querySelector('[data-report-token]');
    if (!toggle || !token) return;

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      token.style.filter = expanded ? 'blur(6px)' : 'blur(0)';
    });
  }

  function setupLossToggle() {
    const button = document.querySelector('[data-loss-toggle]');
    const panel = document.querySelector('[data-loss-panel]');
    if (!button || !panel) return;

    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
    });
  }

  function setupActionButtons(context) {
    const buttons = document.querySelectorAll(
      '[data-plan-action], [data-footer-action], [data-task-action]',
    );

    buttons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const analyticsEvent = button.dataset.analyticsEvent;
        const origin =
          button.dataset.planAction || button.dataset.footerAction || button.dataset.taskAction;
        if (analyticsEvent) {
          engine.trackEvent(analyticsEvent, {
            lead_id: context.leadId || null,
            token: context.token || null,
            origin,
          });
        }

        const url = buildChatUrl(context, origin || 'chatkit');
        if (url) {
          window.open(url, '_blank', 'noopener');
        }
      });
    });
  }

  function setLoader(visible) {
    const loader = document.querySelector('[data-report-loader]');
    if (!loader) return;
    if (visible) {
      loader.hidden = false;
      window.requestAnimationFrame(() => {
        loader.classList.add('is-active');
      });
    } else {
      loader.classList.remove('is-active');
      window.setTimeout(() => {
        loader.hidden = true;
      }, 220);
    }
  }

  function buildChatUrl(context, action) {
    if (!CONFIG.CHATKIT_URL) return null;
    try {
      const base = new URL(CONFIG.CHATKIT_URL, window.location.href);
      const payload = {
        lead_id: context.leadId || null,
        action: action || 'chatkit',
        summary: {
          headline:
            latestReport?.summary?.headline ||
            document.querySelector('[data-report-summary]')?.textContent ||
            DEFAULT_SUMMARY,
          next_step:
            latestReport?.summary?.next_step ||
            document.querySelector('[data-report-next-step]')?.textContent ||
            DEFAULT_NEXT_STEP,
        },
        kpis: extractKpiSnapshot(latestReport?.kpis),
        timestamp: new Date().toISOString(),
      };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      base.searchParams.set('context', encoded);
      return base.toString();
    } catch {
      return CONFIG.CHATKIT_URL;
    }
  }

  function loadCachedReport(leadId) {
    try {
      const raw = window.localStorage.getItem(REPORT_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (leadId && parsed.leadId && parsed.leadId !== leadId) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function normalizeKpis(raw) {
    const result = {};
    if (!raw) return result;
    if (Array.isArray(raw)) {
      raw.forEach((item) => {
        const key = item?.id || item?.key || item?.code;
        if (key) result[key] = item;
      });
      return result;
    }
    return { ...raw };
  }

  function normalizeTasks(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }

  function extractKpiSnapshot(raw) {
    const map = normalizeKpis(raw);
    const snapshot = {};
    Object.keys(map).forEach((key) => {
      snapshot[key] = {
        value: map[key]?.value ?? null,
        note: map[key]?.note ?? null,
        source: map[key]?.source ?? null,
      };
    });
    return snapshot;
  }

  function formatKpiValue(entry) {
    if (!entry || entry.value === undefined || entry.value === null || entry.value === '') {
      return '資料更新中';
    }
    if (typeof entry.value === 'number') {
      return `${entry.value}${entry.unit || ''}`;
    }
    return `${entry.value}${entry.unit || ''}`;
  }

  function formatNullable(value) {
    if (value === null || value === undefined || value === '') return '—';
    return value;
  }
})();
