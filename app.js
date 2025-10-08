const params = new URLSearchParams(window.location.search);
const config = window.STAR_ENGINE_CONFIG || {};

const endpoints = {
  lead: config.webhookUrl,
  analysisStatus: config.analysisStatusUrl || `${config.webhookUrl || ''}/status`,
  assistantEntry: config.assistantEntryUrl || config.assistant_entry_url || '',
};

const reportUrlBase = config.reportUrl || config.report_url || 'report.html';
const formUrl = config.formUrl || config.form_url || window.location.href;
const plansPageUrl = config.plansPageUrl || config.planPageUrl || 'plans.html';
const sampleReportUrl = config.sampleReportUrl || 'sample-report.html';

const ANALYSIS_COUNTDOWN_SECONDS = 60;
const TRANSITION_SECONDS = 3;
const ANALYSIS_TIMEOUT_MS = 75 * 1000;
const POLL_INTERVAL_MS = 5000;
const ANALYSIS_TIPS = [
  'AI 正在建立結構化資料欄位…',
  '同步抓取 Google 評論與商圈競品…',
  '整理守護任務與補件清單…',
];
const STATUS_HINTS = {
  collecting: 'AI 正在建立結構化資料欄位。',
  processing: 'AI 正在比對商圈與可見度模型。',
  analyzing: 'AI 正在整理守護任務與補件清單。',
  scheduled: '資料量較大，AI 正在排程生成入場券。',
  timeout: '資料量較大，完成後會自動推播。',
  ready: '分析完成，整理報告中。',
};

const METRIC_STATE_PRESETS = {
  good: { label: '狀態良好', hint: '保持目前節奏即可。', icon: '🟢' },
  watch: { label: '需要關注', hint: '建議安排守護任務追蹤。', icon: '⚠️' },
  risk: { label: '立即處理', hint: '請優先處理風險項目。', icon: '🚨' },
};

const METRIC_DEFINITIONS = {
  review_health: {
    label: '評價健康',
    unit: '分',
    defaultHint: 'AI 正在檢查低星評論與回覆速度。',
    icons: { default: '🛡️', good: '🛡️', watch: '⚠️', risk: '🚨' },
    states: {
      good: { label: '健康', hint: '評論維持穩定，持續維運即可。' },
      watch: { label: '需留意', hint: '建議優先回覆待辦評論。' },
      risk: { label: '急需處理', hint: '請立即處理低星或未回覆評論。' },
    },
  },
  ai_visibility: {
    label: 'AI 可見度',
    unit: '分',
    defaultHint: 'AI 正在比對曝光與搜尋表現。',
    icons: { default: '📡', good: '📡', watch: '🟡', risk: '🚨' },
    states: {
      good: { label: '曝光穩定', hint: '持續更新內容維持可見度。' },
      watch: { label: '需加強', hint: '建議加強熱門關鍵字佈局。' },
      risk: { label: '嚴重不足', hint: '請安排守護專家補強曝光。' },
    },
  },
  pending_reviews: {
    label: '待辦評論',
    unit: '分',
    defaultHint: 'AI 正在排列守護任務與補件步驟。',
    icons: { default: '📝', good: '📝', watch: '📝', risk: '🚨' },
    states: {
      good: { label: '控管良好', hint: '評論待辦少，維持目前配置。' },
      watch: { label: '需跟進', hint: '建議排程回覆重要評論。' },
      risk: { label: '請立即處理', hint: '多筆待辦評論需立刻處理。' },
    },
  },
};

const TASK_SECTION_CONFIG = {
  priority_tasks: { emptyText: 'AI 正在整理守護任務。' },
  collection_steps: { emptyText: '補件清單整理中，稍後指引你補齊缺漏。' },
  repair_checklist: { emptyText: '目前沒有需要立即補救的評論。' },
};

const els = {
  stages: {
    s0: document.getElementById('stage-s0'),
    s1: document.getElementById('stage-s1'),
    s2: document.getElementById('stage-s2'),
    s4: document.getElementById('stage-s4'),
    s5: document.getElementById('stage-s5'),
  },
  leadForm: document.getElementById('lead-form'),
  submitBtn: document.getElementById('cta-start'),
  transitionCounter: document.getElementById('transition-counter'),
  transitionTip: document.getElementById('transition-tip'),
  analysisDescription: document.getElementById('analysis-description'),
  analysisTimer: document.getElementById('analysis-timer'),
  analysisCountdownNumber: document.getElementById('analysis-countdown-number'),
  analysisTip: document.getElementById('analysis-tip'),
  resultWarning: document.getElementById('result-warning'),
  resultWarningText: document.getElementById('result-warning-text'),
  ctaSecondary: document.getElementById('cta-secondary'),
  ctaReport: document.getElementById('cta-report'),
  ctaPlan: document.getElementById('cta-plan'),
  returnHome: document.getElementById('return-home'),
  timeoutSample: document.getElementById('timeout-sample'),
  timeoutWeekly: document.getElementById('timeout-weekly'),
  timeoutReport: document.getElementById('timeout-report'),
  timeoutBack: document.getElementById('timeout-back'),
  timeoutNote: document.getElementById('timeout-note'),
  toast: document.getElementById('toast'),
};

const state = {
  stage: 's0',
  liffReady: false,
  userId: '',
  leadId: params.get('lead_id') || '',
  reportToken: params.get('token') || '',
  metricsMap: {},
  metricsRaw: null,
  metricsList: [],
  tasks: {
    priority_tasks: [],
    collection_steps: [],
    repair_checklist: [],
  },
  pollId: null,
  timeoutId: null,
  transitionId: null,
  transitionRemaining: TRANSITION_SECONDS,
  analysisCountdownId: null,
  analysisTipId: null,
  analysisRemaining: ANALYSIS_COUNTDOWN_SECONDS,
  analysisTipIndex: 0,
  warnings: [],
  reportUrlOverride: '',
};

function logEvent(...args) {
  if (typeof window.logEvent === 'function') {
    window.logEvent(...args);
  }
}

function generateLeadId() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6);
  return `se_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}_${rand}`;
}

function buildUrlWithParams(baseUrl, paramsMap = {}) {
  if (!baseUrl) return '#';
  try {
    const target = new URL(baseUrl, window.location.origin);
    Object.entries(paramsMap)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .forEach(([key, value]) => target.searchParams.set(key, value));
    return target.toString();
  } catch (error) {
    return baseUrl;
  }
}

function showToast(message, duration = 2600) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.hidden = false;
  setTimeout(() => {
    if (els.toast) {
      els.toast.hidden = true;
    }
  }, duration);
}

function determineMetricState(score) {
  if (score == null || Number.isNaN(Number(score))) return null;
  const value = Number(score);
  if (value >= 75) return 'good';
  if (value >= 55) return 'watch';
  return 'risk';
}

function parseMetricScore(metric) {
  if (!metric) return null;
  if (metric.display_score) return metric.display_score;
  if (metric.score !== undefined) return metric.score;
  if (metric.value !== undefined) return metric.value;
  return null;
}

function formatMetricScore(value, unit = '') {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (Number.isFinite(num)) {
    const normalized = Math.abs(num) <= 1 ? num * 100 : num;
    const rounded = Math.round(normalized);
    return unit ? `${rounded} ${unit}` : `${rounded}`;
  }
  return String(value);
}

function resolveMetricDefinition(metricId) {
  return METRIC_DEFINITIONS[metricId] || {
    label: metricId,
    unit: '',
    defaultHint: 'AI 正在更新指標。',
    icons: { default: '⭐' },
    states: {},
  };
}

function applyMetricStateClass(card, stateKey) {
  ['metric-card--state-good', 'metric-card--state-watch', 'metric-card--state-risk']
    .forEach((className) => card.classList.remove(className));
  if (stateKey) {
    card.classList.add(`metric-card--state-${stateKey}`);
  }
}

function renderMetricCard(metricId, metricData = null) {
  const definition = resolveMetricDefinition(metricId);
  const cards = document.querySelectorAll(`.metric-card[data-metric="${metricId}"]`);
  if (!cards.length) return;

  const scoreRaw = parseMetricScore(metricData);
  const stateKey = scoreRaw != null ? determineMetricState(scoreRaw) : null;
  const definitionState = stateKey && definition.states ? definition.states[stateKey] : null;
  const preset = stateKey ? METRIC_STATE_PRESETS[stateKey] : null;
  const label = definition.label;
  const hintText = metricData?.hint || metricData?.description || definitionState?.hint || preset?.hint || definition.defaultHint;
  const stateLabel = metricData?.state_label || definitionState?.label || preset?.label || (stateKey ? stateKey.toUpperCase() : '整理中');
  const iconMap = definition.icons || {};
  const iconValue = metricData?.icon || definitionState?.icon || preset?.icon || iconMap[stateKey] || iconMap.default;
  const unit = metricData?.unit || definition.unit || '';
  const scoreDisplay = metricData?.display_score || formatMetricScore(scoreRaw, unit);

  cards.forEach((card) => {
    applyMetricStateClass(card, stateKey);
    const iconEl = card.querySelector('.metric-card__icon');
    if (iconEl && iconValue) {
      iconEl.textContent = iconValue;
    }
    const labelEl = card.querySelector('.metric-card__label');
    if (labelEl) {
      labelEl.textContent = metricData?.label || label;
    }
    const scoreEl = card.querySelector('[data-role="score"]');
    if (scoreEl) {
      scoreEl.textContent = scoreDisplay;
    }
    const stateEl = card.querySelector('[data-role="state"]');
    if (stateEl) {
      stateEl.textContent = scoreRaw == null ? '整理中' : stateLabel;
    }
    const hintEl = card.querySelector('[data-role="hint"]');
    if (hintEl) {
      hintEl.textContent = hintText;
    }
  });
}

function resolveMetricId(candidate = {}, fallback) {
  if (!candidate || typeof candidate !== 'object') {
    return fallback;
  }
  return candidate.id
    || candidate.metric_id
    || candidate.metricId
    || candidate.key
    || candidate.code
    || fallback;
}

function normalizeMetricsInput(metrics) {
  const list = [];
  const map = {};

  const pushEntry = (entry, fallbackId) => {
    if (entry == null) return;
    const resolvedId = resolveMetricId(entry, fallbackId);
    const normalized = resolvedId && (!entry.id || entry.id !== resolvedId)
      ? { ...entry, id: resolvedId }
      : entry;
    if (resolvedId) {
      map[resolvedId] = normalized;
    }
    list.push(normalized);
  };

  if (Array.isArray(metrics)) {
    metrics.forEach((item, index) => {
      pushEntry(item, `metric_${index}`);
    });
  } else if (metrics && typeof metrics === 'object') {
    Object.entries(metrics).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        pushEntry(value, key);
      } else {
        pushEntry({ value }, key);
      }
    });
  }

  return { list, map };
}

function renderMetricsCards(metrics = []) {
  state.metricsRaw = metrics;
  const { list, map } = normalizeMetricsInput(metrics);
  state.metricsList = list;
  state.metricsMap = map;

  Object.keys(METRIC_DEFINITIONS).forEach((metricId) => {
    renderMetricCard(metricId, map[metricId] || null);
  });
}

function normalizeTaskItem(item) {
  if (item == null) return null;
  if (typeof item === 'string') {
    return { title: item, detail: '' };
  }
  if (Array.isArray(item)) {
    return { title: item.join('、'), detail: '' };
  }
  const title = item.title || item.name || item.label || item.summary || '';
  const detail = item.detail || item.description || item.note || item.hint || '';
  return { title, detail, actionUrl: item.url || item.link || item.action_url };
}

function renderTasks(tasks = {}) {
  state.tasks = {
    priority_tasks: Array.isArray(tasks.priority_tasks) ? tasks.priority_tasks : [],
    collection_steps: Array.isArray(tasks.collection_steps) ? tasks.collection_steps : [],
    repair_checklist: Array.isArray(tasks.repair_checklist) ? tasks.repair_checklist : [],
  };

  Object.entries(TASK_SECTION_CONFIG).forEach(([taskKey, config]) => {
    const containers = document.querySelectorAll(`[data-task="${taskKey}"]`);
    const items = state.tasks[taskKey] || [];
    containers.forEach((container) => {
      const listEl = container.querySelector('[data-role="list"]');
      const emptyEl = container.querySelector('[data-role="empty"]');
      if (!listEl) return;
      listEl.innerHTML = '';
      if (!items.length) {
        if (emptyEl) {
          emptyEl.textContent = config.emptyText;
          emptyEl.hidden = false;
        }
        return;
      }
      if (emptyEl) {
        emptyEl.hidden = true;
      }
      items.forEach((rawItem) => {
        const normalized = normalizeTaskItem(rawItem);
        if (!normalized || !normalized.title) return;
        const li = document.createElement('li');
        if (normalized.detail) {
          const titleEl = document.createElement('strong');
          titleEl.textContent = normalized.title;
          li.appendChild(titleEl);
          const detailEl = document.createElement('p');
          detailEl.textContent = normalized.detail;
          li.appendChild(detailEl);
        } else {
          li.textContent = normalized.title;
        }
        if (normalized.actionUrl) {
          const link = document.createElement('a');
          link.href = normalized.actionUrl;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = '立即處理';
          link.className = 'task-link';
          li.appendChild(link);
        }
        listEl.appendChild(li);
      });
    });
  });
}

function updateResultWarning(warnings = []) {
  if (!els.resultWarning || !els.resultWarningText) return;
  if (!warnings || !warnings.length) {
    els.resultWarning.hidden = true;
    els.resultWarningText.textContent = '';
    return;
  }
  els.resultWarning.hidden = false;
  els.resultWarningText.textContent = warnings.join('、');
}

function stopTransitionCountdown() {
  if (state.transitionId) {
    clearInterval(state.transitionId);
    state.transitionId = null;
  }
}

function updateTransitionCounter() {
  if (els.transitionCounter) {
    els.transitionCounter.textContent = String(Math.max(0, state.transitionRemaining));
  }
}

function startTransitionCountdown() {
  stopTransitionCountdown();
  state.transitionRemaining = TRANSITION_SECONDS;
  updateTransitionCounter();
  if (els.transitionTip) {
    els.transitionTip.textContent = 'AI 正在準備詳細分析…';
  }
  state.transitionId = setInterval(() => {
    state.transitionRemaining -= 1;
    updateTransitionCounter();
    if (state.transitionRemaining <= 0) {
      stopTransitionCountdown();
      setStage('s2');
    }
  }, 1000);
}

function stopAnalysisCountdown() {
  if (state.analysisCountdownId) {
    clearInterval(state.analysisCountdownId);
    state.analysisCountdownId = null;
  }
  if (state.analysisTipId) {
    clearInterval(state.analysisTipId);
    state.analysisTipId = null;
  }
}

function updateAnalysisCountdown() {
  if (els.analysisCountdownNumber) {
    els.analysisCountdownNumber.textContent = String(Math.max(0, state.analysisRemaining));
  }
}

function rotateAnalysisTip() {
  if (!ANALYSIS_TIPS.length || !els.analysisTip) return;
  state.analysisTipIndex = (state.analysisTipIndex + 1) % ANALYSIS_TIPS.length;
  els.analysisTip.textContent = ANALYSIS_TIPS[state.analysisTipIndex];
}

function startAnalysisCountdown() {
  stopAnalysisCountdown();
  state.analysisRemaining = ANALYSIS_COUNTDOWN_SECONDS;
  state.analysisTipIndex = 0;
  if (els.analysisTimer) {
    els.analysisTimer.hidden = false;
  }
  if (els.analysisTip) {
    els.analysisTip.textContent = ANALYSIS_TIPS[0];
  }
  updateAnalysisCountdown();
  state.analysisCountdownId = setInterval(() => {
    state.analysisRemaining -= 1;
    updateAnalysisCountdown();
    if (state.analysisRemaining <= 0) {
      stopAnalysisCountdown();
      if (state.stage !== 's4' && state.stage !== 's5') {
        triggerTimeout({ reason: 'countdown_expired' });
      }
    }
  }, 1000);

  if (ANALYSIS_TIPS.length > 1) {
    state.analysisTipId = setInterval(() => {
      rotateAnalysisTip();
    }, 9000);
  }
}

function stopPolling() {
  if (state.pollId) {
    clearInterval(state.pollId);
    state.pollId = null;
  }
  if (state.timeoutId) {
    clearTimeout(state.timeoutId);
    state.timeoutId = null;
  }
}

function startPolling() {
  stopPolling();
  const poll = async () => {
    if (!endpoints.analysisStatus || !state.leadId) return;
    try {
      const url = new URL(endpoints.analysisStatus);
      url.searchParams.set('lead_id', state.leadId);
      const payload = await requestJSON(url.toString(), { method: 'GET' });
      handleStatusResponse(payload);
    } catch (error) {
      console.warn('[analysis-status]', error.message || error);
    }
  };
  poll();
  state.pollId = setInterval(poll, POLL_INTERVAL_MS);
  state.timeoutId = setTimeout(() => {
    if (state.stage !== 's4' && state.stage !== 's5') {
      triggerTimeout({ reason: 'timeout' });
    }
  }, ANALYSIS_TIMEOUT_MS);
}

function setStage(nextStage) {
  if (state.stage === nextStage) return;
  state.stage = nextStage;
  Object.entries(els.stages).forEach(([key, element]) => {
    if (!element) return;
    const active = key === nextStage;
    element.hidden = !active;
    element.classList.toggle('stage--active', active);
  });

  if (nextStage === 's2') {
    startAnalysisCountdown();
  } else if (nextStage !== 's1') {
    stopAnalysisCountdown();
  }

  if (nextStage !== 's1') {
    stopTransitionCountdown();
  }
}

async function requestJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || response.statusText);
  }

  if (contentType.includes('application/json')) {
    return text ? JSON.parse(text) : {};
  }

  const trimmed = (text || '').trim().toLowerCase();
  if (!trimmed || trimmed === 'ok') {
    return { ok: true };
  }

  return { ok: true, message: text };
}

async function handleLeadSubmit(event) {
  event.preventDefault();
  if (!els.leadForm?.reportValidity?.()) return;

  const formData = new FormData(els.leadForm);
  const city = (formData.get('city') || '').trim();
  const route = (formData.get('route') || '').trim();
  const number = (formData.get('number') || '').trim();
  const name = (formData.get('name') || '').trim();

  if (!city || !route || !number || !name) {
    showToast('請完整填寫四個欄位');
    return;
  }

  const leadId = generateLeadId();
  const payload = {
    lead_id: leadId,
    source: 'liff-web',
    line_user_id: state.userId || '',
    submitted_at: new Date().toISOString(),
    place: {
      city,
      road: route,
      addr_no: number,
      name,
    },
  };

  state.leadId = leadId;
  state.reportToken = '';
  state.metricsMap = {};
  state.metricsRaw = null;
  state.metricsList = [];
  renderMetricsCards([]);
  renderTasks({});
  syncLinks();
  setStage('s1');
  startTransitionCountdown();
  startPolling();

  if (els.submitBtn) {
    els.submitBtn.disabled = true;
    els.submitBtn.textContent = '啟動中…';
  }

  try {
    await requestJSON(endpoints.lead, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    logEvent('lead_submitted', { lead_id: leadId });
  } catch (error) {
    console.error('[lead] submit failed', error);
    showToast(`送出失敗：${error.message}`);
    stopPolling();
    setStage('s0');
  } finally {
    if (els.submitBtn) {
      els.submitBtn.disabled = false;
      els.submitBtn.textContent = '申請 AI 入場券';
    }
  }
}

function applyStatusHints(stage = '') {
  const hint = STATUS_HINTS[stage] || STATUS_HINTS.collecting;
  if (els.analysisDescription) {
    els.analysisDescription.textContent = hint;
  }
  if (stage && els.analysisTip && els.analysisTip.textContent.includes('AI 正在')) {
    els.analysisTip.textContent = hint;
  }
}

function handleAnalysisCompleted(context = {}) {
  stopPolling();
  updateResultWarning(context.warnings || state.warnings);
  renderMetricsCards(state.metricsRaw);
  renderTasks(state.tasks);
  setStage('s4');
  if (context.report_url) {
    state.reportUrlOverride = context.report_url;
  }
}

function triggerTimeout(context = {}) {
  stopPolling();
  setStage('s5');
  const note = context.note || STATUS_HINTS.timeout;
  if (els.timeoutNote) {
    els.timeoutNote.textContent = note;
  }
  if (context.report_url) {
    state.reportUrlOverride = context.report_url;
    if (els.timeoutReport) {
      els.timeoutReport.hidden = false;
      els.timeoutReport.onclick = () => openReport(context.report_url);
    }
  }
  logEvent('analysis_timeout', { lead_id: state.leadId, reason: context.reason || context.stage || 'timeout' });
}

function handleStatusResponse(payload) {
  if (!payload || typeof payload !== 'object') return;
  if (payload.lead_id && payload.lead_id !== state.leadId) return;

  if (payload.metrics) {
    renderMetricsCards(payload.metrics);
  }
  if (payload.tasks) {
    renderTasks(payload.tasks);
  }
  if (Array.isArray(payload.warnings)) {
    state.warnings = payload.warnings;
  }
  if (payload.report_token) {
    state.reportToken = payload.report_token;
  } else if (payload.report?.token) {
    state.reportToken = payload.report.token;
  }
  if (payload.report_url) {
    state.reportUrlOverride = payload.report_url;
  }

  const statusValue = String(payload.status || payload.state || '').toLowerCase();
  const stageValue = String(payload.stage || '').toLowerCase();
  const shouldActivateAnalysis = ['collecting', 'processing', 'analyzing'].includes(stageValue) || statusValue === 'pending';

  if (shouldActivateAnalysis) {
    if (state.stage !== 's2') {
      setStage('s2');
    } else if (!state.analysisCountdownId) {
      startAnalysisCountdown();
    }
  }

  applyStatusHints(stageValue);

  if (stageValue === 'scheduled' || stageValue === 'timeout' || statusValue === 'timeout') {
    triggerTimeout({ stage: stageValue, reason: statusValue, warnings: state.warnings, report_url: payload.report_url });
    return;
  }

  if (statusValue === 'ready' || statusValue === 'complete' || stageValue === 'ready' || stageValue === 'complete') {
    handleAnalysisCompleted({ warnings: state.warnings, report_url: payload.report_url });
    return;
  }
}

async function handleAssistantEntry() {
  if (!state.leadId) {
    showToast('請先完成免費檢測流程');
    return;
  }
  if (!endpoints.assistantEntry) {
    showToast('尚未設定守護專家入口，請稍後再試。');
    return;
  }
  if (els.ctaSecondary) {
    els.ctaSecondary.disabled = true;
    els.ctaSecondary.classList.add('btn--loading');
  }
  try {
    const payload = {
      lead_id: state.leadId,
      metrics: state.metricsRaw ?? state.metricsList,
      tasks: state.tasks,
    };
    const result = await requestJSON(endpoints.assistantEntry, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    logEvent('cta_click', { action: 'assistant_entry', lead_id: state.leadId });
    if (result && result.ok === false) {
      const message = result.message || '同步守護專家失敗，請稍後再試。';
      showToast(message);
      return;
    }
    showToast('已同步守護專家，開啟報表中…', 1800);
    if (result?.report_url) {
      openReport(result.report_url);
    } else {
      openReport();
    }
  } catch (error) {
    console.error('[assistant-entry]', error);
    showToast(`同步失敗：${error.message}`);
  } finally {
    if (els.ctaSecondary) {
      els.ctaSecondary.disabled = false;
      els.ctaSecondary.classList.remove('btn--loading');
    }
  }
}

function openReport(customUrl) {
  const base = customUrl || state.reportUrlOverride || reportUrlBase;
  const target = buildUrlWithParams(base, {
    lead_id: state.leadId,
    token: state.reportToken,
  });
  window.open(target, '_blank');
}

function returnHome() {
  window.location.href = formUrl;
}

async function initLiff() {
  const liffId = config.formLiffId || config.liffId || '';
  if (!window.liff || !liffId) return;
  try {
    await liff.init({ liffId });
    await liff.ready;
    if (!liff.isLoggedIn()) {
      liff.login({ scope: ['profile', 'openid'] });
      return;
    }
    state.liffReady = true;
    const profile = await liff.getProfile();
    state.userId = profile?.userId || '';
  } catch (error) {
    console.warn('[LIFF] init failed', error);
  }
}

function bindEvents() {
  if (els.leadForm) {
    els.leadForm.addEventListener('submit', handleLeadSubmit);
  }
  if (els.ctaSecondary) {
    els.ctaSecondary.addEventListener('click', handleAssistantEntry);
  }
  if (els.ctaReport) {
    els.ctaReport.addEventListener('click', () => openReport());
  }
  if (els.returnHome) {
    els.returnHome.addEventListener('click', returnHome);
  }
  if (els.timeoutBack) {
    els.timeoutBack.addEventListener('click', returnHome);
  }
  if (els.timeoutWeekly) {
    els.timeoutWeekly.addEventListener('click', () => {
      renderTasks(state.tasks);
      showToast('守護任務整理中，完成後會通知你。');
    });
  }
}

function syncLinks() {
  if (els.ctaPlan) {
    els.ctaPlan.setAttribute('href', plansPageUrl);
  }
  if (els.timeoutSample) {
    const formatted = buildUrlWithParams(sampleReportUrl, { lead_id: state.leadId || undefined });
    els.timeoutSample.setAttribute('href', formatted);
  }
}

function bootstrap() {
  bindEvents();
  initLiff();
  renderMetricsCards([]);
  renderTasks({});
  updateResultWarning([]);
  syncLinks();
}

bootstrap();
