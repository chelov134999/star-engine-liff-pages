(function () {
  const engine = window.starEngine || {};
  const CONFIG = window.__STAR_ENGINE_CONFIG__ || {};
  const REPORT_CACHE_KEY = 'star-engine/report-cache';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const main = document.querySelector('.report-content');
    if (!main) return;

    const context = engine.getLeadContext ? engine.getLeadContext() : { leadId: '', token: '' };
    updateLeadDisplay(context);
    hydrateFallback();
    hydratePlanButtons();

    const cached = loadCachedReport(context.leadId);
    if (cached?.data) {
      renderReport(cached.data, { fromCache: true });
    }

    if (!context.leadId && !context.token) {
      showFallback({ reason: 'missing_context' });
      return;
    }

    fetchLatestReport(context);
  }

  function fetchLatestReport(context) {
    const statusEl = document.querySelector('[data-report-status]');
    if (statusEl) {
      statusEl.textContent = 'AI 正在拉取最新資料…';
      statusEl.classList.remove('is-error', 'is-success');
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10000);

    engine
      .fetchReportData(context, { signal: controller.signal })
      .then((data) => {
        window.clearTimeout(timer);
        if (!data || !data.kpis) {
          throw new Error('invalid_payload');
        }
        renderReport(data, { fromCache: false });
        engine.trackEvent('s7_view_report', {
          ok: true,
          lead_id: data.lead_id || context.leadId || null,
        });
        engine.cacheReportData(data.lead_id || context.leadId || '', data);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        engine.trackEvent('s7_view_report', {
          ok: false,
          lead_id: context.leadId || null,
          message: error?.name === 'AbortError' ? 'timeout' : error?.message || 'error',
        });
        showFallback({ reason: error?.message || 'fetch_failed' });
      });
  }

  function updateLeadDisplay(context) {
    const leadEl = document.querySelector('[data-report-lead]');
    if (leadEl) leadEl.textContent = context.leadId || '—';
    const tokenWrapper = document.querySelector('[data-token-wrapper]');
    const tokenEl = document.querySelector('[data-report-token]');
    if (context.token && tokenWrapper && tokenEl) {
      tokenEl.textContent = context.token;
      tokenWrapper.hidden = false;
    }
  }

  function renderReport(data, options = {}) {
    toggleFallback(false);

    const statusEl = document.querySelector('[data-report-status]');
    if (statusEl) {
      statusEl.textContent = options.fromCache ? '顯示離線快取資料。' : 'AI 報告已更新。';
      statusEl.classList.toggle('is-success', !options.fromCache);
      statusEl.classList.toggle('is-error', false);
    }

    const leadEl = document.querySelector('[data-report-lead]');
    if (leadEl) {
      leadEl.textContent = data.lead_id || data.leadId || leadEl.textContent;
    }

    const lastEl = document.querySelector('[data-last-updated]');
    if (lastEl) lastEl.textContent = engine.formatTimestamp(data.sync?.last_updated);
    const nextEl = document.querySelector('[data-next-sync]');
    if (nextEl) nextEl.textContent = engine.formatTimestamp(data.sync?.next_sync);
    const tokenWrapper = document.querySelector('[data-token-wrapper]');
    const tokenEl = document.querySelector('[data-report-token]');
    if (data.token && tokenWrapper && tokenEl) {
      tokenEl.textContent = data.token;
      tokenWrapper.hidden = false;
    }

    renderKpis(data.kpis);
    renderCompetitors(data.competitors);
    renderTasks(data.tasks);
    renderMemberStatus(data.member_status);
  }

  function renderKpis(raw) {
    const map = normalizeKpis(raw);
    document.querySelectorAll('.kpi-card').forEach((card) => {
      const key = card.dataset.kpi;
      const slot = map[key] || {};
      const valueEl = card.querySelector('[data-value]');
      const sourceEl = card.querySelector('[data-source]');
      const noteEl = card.querySelector('[data-note]');

      if (valueEl) {
        valueEl.textContent = formatKpiValue(slot);
      }

      if (sourceEl) {
        sourceEl.textContent = slot.source || '—';
      }

      if (noteEl) {
        noteEl.textContent = slot.note || '';
        noteEl.classList.toggle('hidden', !slot.note);
      }
    });
  }

  function renderCompetitors(list) {
    const tbody = document.querySelector('[data-competitor-table] tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const competitors = Array.isArray(list) ? list.slice(0, 3) : [];
    if (competitors.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="4">目前尚未取得競品資料。</td>`;
      tbody.appendChild(row);
      return;
    }

    competitors.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td data-label="競品">${item.name || '—'}</td>
        <td data-label="Google 星等">${formatNullable(item.rating)}</td>
        <td data-label="回覆速度">${item.response_time || '—'}</td>
        <td data-label="AI 推薦率">${item.ai_recommendation || '—'}</td>
      `;
      tbody.appendChild(row);
    });
  }

  function renderTasks(tasks) {
    const groups = tasks || {};
    document.querySelectorAll('[data-task-group]').forEach((listEl) => {
      const groupId = listEl.dataset.taskGroup;
      const entries = normalizeTasks(groups[groupId]);
      listEl.innerHTML = '';
      if (entries.length === 0) {
        const li = document.createElement('li');
        li.className = 'muted';
        li.textContent = '尚未派發任務。';
        listEl.appendChild(li);
        return;
      }

      entries.forEach((task) => {
        const li = document.createElement('li');
        if (typeof task === 'string') {
          li.textContent = task;
        } else {
          li.innerHTML = `<strong>${task.title || '未命名任務'}</strong>${task.detail ? `<span>${task.detail}</span>` : ''}`;
        }
        listEl.appendChild(li);
      });
    });
  }

  function renderMemberStatus(status) {
    const data = status || {};
    const planEl = document.querySelector('[data-plan-tier]');
    if (planEl) planEl.textContent = data.plan || '—';
    const statusEl = document.querySelector('[data-plan-status]');
    if (statusEl) statusEl.textContent = data.status || '—';
    const syncEl = document.querySelector('[data-plan-sync]');
    if (syncEl) syncEl.textContent = engine.formatTimestamp(data.synced_at);
  }

  function showFallback(reason) {
    toggleFallback(true);
    const statusEl = document.querySelector('[data-report-status]');
    if (statusEl) {
      statusEl.textContent = '暫時無法取得最新資料，請稍後再試。';
      statusEl.classList.add('is-error');
    }
  }

  function toggleFallback(show) {
    const main = document.querySelector('.report-content');
    const fallback = document.querySelector('[data-empty-state]');
    if (!main || !fallback) return;
    if (show) {
      fallback.hidden = false;
    } else {
      fallback.hidden = true;
    }
  }

  function hydrateFallback() {
    const chatButton = document.querySelector('[data-empty-chat]');
    if (chatButton) {
      chatButton.addEventListener('click', () => {
        if (CONFIG.CHATKIT_URL) {
          window.open(CONFIG.CHATKIT_URL, '_blank', 'noopener');
        }
      });
    }
  }

  function hydratePlanButtons() {
    const chatBtn = document.querySelector('[data-plan-action="chat"]');
    if (chatBtn) {
      chatBtn.addEventListener('click', () => {
        if (CONFIG.CHATKIT_URL) {
          window.open(CONFIG.CHATKIT_URL, '_blank', 'noopener');
        }
      });
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
