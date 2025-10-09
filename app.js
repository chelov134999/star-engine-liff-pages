const params = new URLSearchParams(window.location.search);
const config = window.STAR_ENGINE_CONFIG || {};

const endpoints = {
  lead: config.webhookUrl,
  quiz: config.quizUrl || config.webhookUrl,
  analysisStatus: config.analysisStatusUrl || `${config.webhookUrl}/status`,
  weeklyDraft: config.weeklyDraftUrl || '',
};

const reportUrl = config.reportUrl || config.report_url || 'report.html';
const formUrl = config.formUrl || config.form_url || window.location.href;
const plansPageUrl = config.plansPageUrl || config.planPageUrl || 'plans.html';
const sampleReportUrl = config.sampleReportUrl || 'sample-report.html';
const lineFallbackUrl = config.trialUrl
  || config.trial_url
  || config.lineFallbackUrl
  || 'https://line.me/R/ti/p/@star-up';

const ANALYSIS_COUNTDOWN_SECONDS = 60;
const TIP_ROTATE_INTERVAL_MS = 9000;
const ANALYSIS_TIPS = [
  '建立結構化資料欄位，生成 AI 可讀 Schema。',
  '比對商圈資料並建立 AI 可見度模型。',
  '檢查評論健康，整理守護任務草稿。',
];
const TRANSITION_TIP_INTERVAL_MS = 1500;
const TRANSITION_TIPS = [
  '建立結構化資料…',
  '建立 AI 可見度模型…',
  '檢查評論健康…',
];
const DEFAULT_TIMEOUT_NOTE = '資料較大，完成後會自動推播。';
const DATAFORSEO_TIMEOUT_NOTE = 'Google 資料已就緒，評論補齊後會再次通知你。';

const logEvent = (...args) => {
  if (typeof window.logEvent === 'function') {
    window.logEvent(...args);
  }
};

const STAGES = ['s0', 's1', 's2', 's3', 's4', 's5'];
const PROGRESS_TICKS = [
  { percent: 35, label: '建立結構化資料', description: '補齊 AI 可讀欄位' },
  { percent: 65, label: '建立 AI 可見度模型', description: '比對商圈與曝光差距' },
  { percent: 85, label: '檢查評論健康', description: '整理評論樣本與守護風險' },
];
const PROGRESS_TIMEOUT_MS = 75 * 1000;
const TRANSITION_DURATION_MS = 3000;
const POLL_INTERVAL_MS = 5000;
const MAX_TONE_SELECTION = 2;
const NINETY_HINT_DELAY_MS = 15_000;
const PROGRESS_FAKE_LIMIT = PROGRESS_TICKS[0].percent;

const els = {
  stages: {
    s0: document.getElementById('stage-s0'),
    s1: document.getElementById('stage-s1'),
    s2: document.getElementById('stage-s2'),
    s3: document.getElementById('stage-s3'),
    s4: document.getElementById('stage-s4'),
    s5: document.getElementById('stage-s5'),
  },
  leadForm: document.getElementById('lead-form'),
  submitBtn: document.getElementById('cta-start'),
  quizForm: document.getElementById('quiz-form'),
  quizSubmit: document.getElementById('quiz-submit'),
  quizSkip: document.getElementById('quiz-skip'),
  quizError: document.getElementById('quiz-error'),
  quizCompetitors: document.getElementById('quiz-competitors'),
  quizContext: document.getElementById('quiz-context'),
  summaryGoal: document.getElementById('summary-goal'),
  summaryTone: document.getElementById('summary-tone'),
  summaryCompetitors: document.getElementById('summary-competitors'),
  summaryConfirm: document.getElementById('summary-confirm'),
  summaryBack: document.getElementById('summary-back'),
  summaryContext: document.getElementById('summary-context'),
  progressBarS2: document.getElementById('progress-bar'),
  progressLabelS2: document.getElementById('progress-label'),
  progressEtaS2: document.getElementById('progress-eta'),
  progressBarS3: document.getElementById('progress-bar-s3'),
  progressLabelS3: document.getElementById('progress-label-s3'),
  progressEtaS3: document.getElementById('progress-eta-s3'),
  analysisTimer: document.getElementById('analysis-timer') || document.getElementById('progress-countdown'),
  analysisCountdownNumber: document.getElementById('analysis-countdown-number') || document.getElementById('progress-countdown-number'),
  analysisTip: document.getElementById('analysis-tip') || document.getElementById('progress-tip'),
  previewSchemaCard: document.getElementById('preview-schema-card'),
  previewSchemaScore: document.getElementById('preview-schema-score'),
  previewSchemaStatus: document.getElementById('preview-schema-status'),
  previewSchemaHint: document.getElementById('preview-schema-hint'),
  previewSchemaNext: document.getElementById('preview-schema-next'),
  previewSchemaUpdated: document.getElementById('preview-schema-updated'),
  previewVisibilityCard: document.getElementById('preview-visibility-card'),
  previewVisibilityScore: document.getElementById('preview-visibility-score'),
  previewVisibilityStatus: document.getElementById('preview-visibility-status'),
  previewVisibilityHint: document.getElementById('preview-visibility-hint'),
  previewVisibilityNext: document.getElementById('preview-visibility-next'),
  previewVisibilityUpdated: document.getElementById('preview-visibility-updated'),
  previewReviewCard: document.getElementById('preview-review-card'),
  previewReviewScore: document.getElementById('preview-review-score'),
  previewReviewStatus: document.getElementById('preview-review-status'),
  previewReviewHint: document.getElementById('preview-review-hint'),
  previewReviewNext: document.getElementById('preview-review-next'),
  previewReviewUpdated: document.getElementById('preview-review-updated'),
  previewStatusCard: document.getElementById('preview-status-card'),
  previewEntryStatus: document.getElementById('preview-entry-status'),
  previewEntryPrimary: document.getElementById('preview-entry-primary'),
  previewEntryNextSteps: document.getElementById('preview-entry-next-steps'),
  previewEntryNote: document.getElementById('preview-entry-note'),
  previewMetrics: document.getElementById('preview-metrics'),
  previewMetricsEmpty: document.getElementById('preview-metrics-empty'),
  previewCompetitors: document.getElementById('preview-competitors'),
  previewCompetitorsEmpty: document.getElementById('preview-competitors-empty'),
  previewActions: document.getElementById('preview-actions'),
  previewActionsEmpty: document.getElementById('preview-actions-empty'),
  previewDrafts: document.getElementById('preview-drafts'),
  previewDraftsEmpty: document.getElementById('preview-drafts-empty'),
  resultWarning: document.getElementById('result-warning'),
  resultWarningText: document.getElementById('result-warning-text'),
  ctaSecondary: document.getElementById('cta-secondary'),
  ctaLine: document.getElementById('cta-line'),
  timeoutSample: document.getElementById('timeout-sample'),
  timeoutWeekly: document.getElementById('timeout-weekly'),
  timeoutReport: document.getElementById('timeout-report'),
  timeoutNote: document.getElementById('timeout-note'),
  timeoutCountdown: document.getElementById('timeout-countdown'),
  timeoutBack: document.getElementById('timeout-back'),
  copyActions: document.getElementById('copy-actions'),
  toast: document.getElementById('toast'),
  transitionBar: document.getElementById('transition-bar'),
  transitionCounter: document.getElementById('transition-counter'),
  transitionTip: document.getElementById('transition-tip'),
  aboutLink: document.getElementById('about-link'),
};

const state = {
  stage: 's0',
  liffReady: false,
  userId: '',
  leadId: '',
  leadPayload: null,
  quiz: {
    goal: '',
    tone: [],
    competitorsInput: [],
  },
  progress: {
    startAt: 0,
    percent: 0,
    frontPercent: 0,
    tickerIndex: 0,
    timerId: null,
    pollId: null,
    messageId: null,
    timeoutFired: false,
    ninetyReachedAt: 0,
    lastStage: '',
    countdownRemaining: 0,
    countdownTimerId: null,
    tipTimerId: null,
    tipIndex: 0,
    pendingLogged: false,
    completionLogged: false,
    timeoutCountdownId: null,
    timeoutStartedAt: 0,
  },
  transition: {
    countdownId: null,
    timeoutId: null,
    started: false,
    tipId: null,
  },
  report: null,
  psychology: null,
  reportToken: '',
  templateId: 'unknown',
  planUrl: '',
  sampleUrl: '',
  reportPageUrl: '',
  timeoutContext: {},
  latestWarnings: [],
  mode: params.get('view') === 'report' ? 'report' : 'form',
};

function updateContextHints() {
  const place = state.leadPayload || {};
  const storeName = place.name || '';
  const city = place.city || '';
  const contextText = storeName
    ? `我已定位 ${storeName}，正在蒐集 ${city ? `${city} 的` : '附近'}競品與評論。`
    : city
      ? `我正在蒐集 ${city} 的競品與評論。`
      : '我正在蒐集附近競品與評論。';

  if (els.quizContext) {
    els.quizContext.textContent = contextText;
    els.quizContext.hidden = false;
  }
  if (els.summaryContext) {
    els.summaryContext.textContent = contextText;
    els.summaryContext.hidden = false;
  }
}

function setTransitionTip(message, hidden = false) {
  if (!els.transitionTip) return;
  if (typeof message === 'string') {
    els.transitionTip.textContent = message;
  }
  els.transitionTip.hidden = hidden;
}

function stopTransitionTips() {
  if (state.transition.tipId) {
    clearInterval(state.transition.tipId);
    state.transition.tipId = null;
  }
  setTransitionTip('守護專家正在準備提示…', true);
}

function startTransitionTips() {
  if (!els.transitionTip || !TRANSITION_TIPS.length) return;
  stopTransitionTips();
  let index = 0;
  setTransitionTip(TRANSITION_TIPS[index], false);
  if (TRANSITION_TIPS.length === 1) {
    return;
  }
  state.transition.tipId = setInterval(() => {
    index = (index + 1) % TRANSITION_TIPS.length;
    setTransitionTip(TRANSITION_TIPS[index], false);
  }, TRANSITION_TIP_INTERVAL_MS);
}

function buildUrlWithParams(baseUrl, params = {}) {
  if (!baseUrl) return '#';
  try {
    const url = new URL(baseUrl, window.location.origin);
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    return url.toString();
  } catch (error) {
    console.warn('[url] build failed', error);
    return baseUrl;
  }
}

function generateLeadId() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6);
  return `se_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}_${rand}`;
}

function showToast(message, duration = 2600) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.hidden = false;
  setTimeout(() => {
    els.toast.hidden = true;
  }, duration);
}

function openAboutPage() {
  const fallbackUrl = 'about.html';
  const timestamp = Date.now();
  if (state.liffReady && config.aboutUrl && window.liff?.openWindow) {
    const targetUrl = buildUrlWithParams(config.aboutUrl, { ts: timestamp });
    window.liff.openWindow({ url: targetUrl, external: false });
    return;
  }
  const target = buildUrlWithParams(fallbackUrl, { ts: timestamp });
  window.open(target, '_blank');
}

function setStage(nextStage) {
  state.stage = nextStage;
  STAGES.forEach((stage) => {
    if (!els.stages[stage]) return;
    const isActive = stage === nextStage;
    els.stages[stage].hidden = !isActive;
    if (isActive) {
      els.stages[stage].classList.add('stage--active');
    } else {
      els.stages[stage].classList.remove('stage--active');
    }
  });
}

function updateProgressUI(percent, etaSeconds, stageLabel = '') {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  if (safePercent >= 90 && !state.progress.ninetyReachedAt) {
    state.progress.ninetyReachedAt = Date.now();
  }

  const elapsedSinceNinety = state.progress.ninetyReachedAt
    ? Date.now() - state.progress.ninetyReachedAt
    : 0;
  const showAlmostDone = safePercent >= 90 && elapsedSinceNinety >= NINETY_HINT_DELAY_MS;

  const resolveTick = () => {
    if (!Array.isArray(PROGRESS_TICKS) || !PROGRESS_TICKS.length) {
      return { label: '建立結構化資料', description: '正在建立結構化資料欄位' };
    }
    let candidate = PROGRESS_TICKS[0];
    for (const tick of PROGRESS_TICKS) {
      if (typeof tick.percent === 'number' && safePercent >= tick.percent) {
        candidate = tick;
      }
    }
    return candidate || { label: '建立結構化資料', description: '正在建立結構化資料欄位' };
  };

  const tick = resolveTick();
  let label = `${tick.label || '建立結構化資料'} · 進度 ${safePercent}%`;
  let description = tick.description || '正在建立結構化資料欄位';
  let customDescription = false;

  if (stageLabel && typeof stageLabel === 'object') {
    if (stageLabel.label) {
      label = `${stageLabel.label} · 進度 ${safePercent}%`;
    }
    if (stageLabel.description) {
      description = stageLabel.description;
      customDescription = true;
    }
  } else if (typeof stageLabel === 'string' && stageLabel.trim()) {
    description = stageLabel.trim();
    customDescription = true;
  }

  if (showAlmostDone) {
    label = '彙整完成 · 進度 90%';
    description = '守護專家正在整理結果';
    customDescription = true;
  }

  if (!customDescription && etaSeconds != null) {
    const eta = Math.max(0, Math.round(etaSeconds));
    if (eta > 0) {
      description = `${description} · 約 ${eta} 秒完成`;
    }
  }

  if (els.progressBarS2) {
    els.progressBarS2.style.width = `${safePercent}%`;
  }
  if (els.progressBarS3) {
    els.progressBarS3.style.width = `${safePercent}%`;
  }
  if (els.progressLabelS2) {
    els.progressLabelS2.textContent = label;
  }
  if (els.progressLabelS3) {
    els.progressLabelS3.textContent = label;
  }
  if (els.progressEtaS2) {
    els.progressEtaS2.textContent = description;
  }
  if (els.progressEtaS3) {
    els.progressEtaS3.textContent = description;
  }

  state.progress.percent = safePercent;
}

function stopAnalysisCountdown() {
  if (state.progress.countdownTimerId) {
    clearInterval(state.progress.countdownTimerId);
    state.progress.countdownTimerId = null;
  }
  if (state.progress.tipTimerId) {
    clearInterval(state.progress.tipTimerId);
    state.progress.tipTimerId = null;
  }
  state.progress.countdownRemaining = 0;
  state.progress.tipIndex = 0;
  if (els.analysisTimer) {
    els.analysisTimer.hidden = true;
  }
}

function setAnalysisTip(text) {
  if (!els.analysisTip) return;
  els.analysisTip.textContent = text;
}

function updateCountdownNumber() {
  if (!els.analysisCountdownNumber) return;
  const value = Math.max(0, Math.round(state.progress.countdownRemaining));
  els.analysisCountdownNumber.textContent = value;
}

function rotateAnalysisTip() {
  if (!ANALYSIS_TIPS.length) return;
  state.progress.tipIndex = (state.progress.tipIndex + 1) % ANALYSIS_TIPS.length;
  setAnalysisTip(ANALYSIS_TIPS[state.progress.tipIndex]);
}

function startAnalysisCountdown() {
  stopAnalysisCountdown();
  state.progress.countdownRemaining = ANALYSIS_COUNTDOWN_SECONDS;
  state.progress.tipIndex = 0;
  if (els.analysisTimer) {
    els.analysisTimer.hidden = false;
  }
  updateCountdownNumber();
  setAnalysisTip(ANALYSIS_TIPS[0] || 'AI 正在分析資料…');
  state.progress.countdownTimerId = setInterval(() => {
    state.progress.countdownRemaining -= 1;
    if (state.progress.countdownRemaining <= 0) {
      stopAnalysisCountdown();
      if (!state.progress.timeoutFired && state.stage !== 's4') {
        triggerTimeout({ reason: 'countdown_expired' });
      }
      return;
    }
    updateCountdownNumber();
  }, 1000);

  if (ANALYSIS_TIPS.length > 1) {
    state.progress.tipTimerId = setInterval(() => {
      rotateAnalysisTip();
    }, TIP_ROTATE_INTERVAL_MS);
  }
}

function mergeContextArray(prev = [], next = []) {
  const set = new Set(prev);
  next.forEach((item) => {
    if (item != null) {
      set.add(item);
    }
  });
  return Array.from(set);
}

function startTimeoutCountdown(durationSeconds = 60) {
  if (!els.timeoutCountdown) return;
  stopTimeoutCountdown();
  state.progress.timeoutStartedAt = Date.now();
  let remaining = Math.max(0, Math.floor(durationSeconds));

  const updateLabel = () => {
    if (!els.timeoutCountdown) return;
    els.timeoutCountdown.textContent = remaining > 0
      ? `已排程推送，預估 ${remaining} 秒內完成 LINE 通知。`
      : '已排程推送，請留意稍後的 LINE 通知。';
    els.timeoutCountdown.hidden = false;
  };

  updateLabel();

  if (remaining === 0) {
    state.progress.timeoutCountdownId = null;
    return;
  }

  state.progress.timeoutCountdownId = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      remaining = 0;
      updateLabel();
      if (state.progress.timeoutCountdownId) {
        clearInterval(state.progress.timeoutCountdownId);
        state.progress.timeoutCountdownId = null;
      }
      return;
    }
    updateLabel();
  }, 1000);
}

function stopTimeoutCountdown() {
  if (state.progress.timeoutCountdownId) {
    clearInterval(state.progress.timeoutCountdownId);
    state.progress.timeoutCountdownId = null;
  }
  state.progress.timeoutStartedAt = 0;
  if (els.timeoutCountdown) {
    els.timeoutCountdown.textContent = '';
    els.timeoutCountdown.hidden = true;
  }
}

function updateTimeoutUI() {
  if (!els.timeoutNote) return;
  const context = state.timeoutContext || {};
  const warnings = Array.isArray(context.warnings) ? context.warnings : [];
  const flags = context.flags || {};
  const hasDataforseoIssue = Boolean(flags.dataforseo_missing) || warnings.includes('dataforseo_missing');
  els.timeoutNote.textContent = hasDataforseoIssue ? DATAFORSEO_TIMEOUT_NOTE : DEFAULT_TIMEOUT_NOTE;
  if (els.timeoutReport) {
    els.timeoutReport.hidden = !hasDataforseoIssue;
  }
}

function resetProgressUI() {
  state.progress.percent = 0;
  state.progress.frontPercent = 0;
  state.progress.ninetyReachedAt = 0;
  stopAnalysisCountdown();

  if (els.progressBarS2) {
    els.progressBarS2.style.width = '0%';
  }
  if (els.progressBarS3) {
    els.progressBarS3.style.width = '0%';
  }

  const baseLabel = '建立結構化資料 · 進度 0%';
  const baseEta = '正在建立結構化資料欄位';

  if (els.progressLabelS2) {
    els.progressLabelS2.textContent = baseLabel;
  }
  if (els.progressLabelS3) {
    els.progressLabelS3.textContent = baseLabel;
  }
  if (els.progressEtaS2) {
    els.progressEtaS2.textContent = baseEta;
  }
  if (els.progressEtaS3) {
    els.progressEtaS3.textContent = baseEta;
  }
}

function animateFrontProgress(targetPercent, duration = TRANSITION_DURATION_MS) {
  const isStillInFakeZone = state.progress.percent < PROGRESS_FAKE_LIMIT;
  const effectiveTarget = isStillInFakeZone
    ? Math.min(targetPercent, PROGRESS_FAKE_LIMIT)
    : targetPercent;

  const startPercent = state.progress.frontPercent || 0;
  const start = performance.now();
  state.progress.frontPercent = Math.max(state.progress.frontPercent, startPercent);

  const step = (now) => {
    const elapsed = now - start;
    const ratio = Math.min(1, elapsed / duration);
    const current = startPercent + (effectiveTarget - startPercent) * ratio;
    if (current > state.progress.percent) {
      updateProgressUI(current);
    }
    if (ratio < 1 && state.stage !== 's4' && state.stage !== 's5') {
      requestAnimationFrame(step);
    } else {
      state.progress.frontPercent = Math.max(state.progress.frontPercent, effectiveTarget);
    }
  };

  requestAnimationFrame(step);
}

function stopProgressTimers() {
  if (state.progress.timerId) {
    clearTimeout(state.progress.timerId);
    state.progress.timerId = null;
  }
  if (state.progress.pollId) {
    clearInterval(state.progress.pollId);
    state.progress.pollId = null;
  }
  if (state.progress.messageId) {
    clearInterval(state.progress.messageId);
    state.progress.messageId = null;
  }
  if (state.transition.countdownId) {
    clearInterval(state.transition.countdownId);
    state.transition.countdownId = null;
  }
  if (state.transition.timeoutId) {
    clearTimeout(state.transition.timeoutId);
    state.transition.timeoutId = null;
  }
  state.transition.started = false;
  stopAnalysisCountdown();
  stopTransitionTips();
  stopTimeoutCountdown();
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
    state.userId = await liff.getProfile().then((profile) => profile?.userId || '')
      .catch(() => liff.getContext?.()?.userId || '') || '';
  } catch (error) {
    console.warn('[LIFF] init failed', error);
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
    try {
      return text ? JSON.parse(text) : {};
    } catch (error) {
      throw new Error('回應格式錯誤');
    }
  }

  // 部分 Webhook 以純文字 ok 回應
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
  const placeInput = {
    city: (formData.get('city') || '').trim(),
    route: (formData.get('route') || '').trim(),
    number: (formData.get('number') || '').trim(),
    name: (formData.get('name') || '').trim(),
  };

  if (!placeInput.city || !placeInput.route || !placeInput.number || !placeInput.name) {
    showToast('請完整填寫四個欄位');
    return;
  }

  els.submitBtn.disabled = true;
  els.submitBtn.textContent = '啟動中…';

  try {
    const leadId = generateLeadId();
    const payload = {
      lead_id: leadId,
      source: 'liff-web',
      line_user_id: state.userId || '',
      submitted_at: new Date().toISOString(),
      quiz: {
        goal: 'instant_lowstar',
        tone: [],
        competitors_input: [],
        competitors_auto: [],
      },
      place: {
        city: placeInput.city,
        road: placeInput.route,
        addr_no: placeInput.number,
        name: placeInput.name,
      },
    };

    const leadRequest = requestJSON(endpoints.lead, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    state.leadId = payload.lead_id;
    state.leadPayload = payload.place;
    state.quiz = { goal: '', tone: [], competitorsInput: [], skipped: false };
    state.progress.startAt = Date.now();
    state.progress.frontPercent = 0;
    state.progress.timeoutFired = false;
    state.progress.tickerIndex = 0;
    state.progress.ninetyReachedAt = 0;
    state.progress.lastStage = 'collecting';
    state.progress.pendingLogged = false;
    state.progress.completionLogged = false;
    state.timeoutContext = {};
    state.latestWarnings = [];
    updateTimeoutUI();

    resetProgressUI();
    updateContextHints();

    if (els.transitionCounter) {
      els.transitionCounter.textContent = '…';
    }
    if (els.transitionBar) {
      els.transitionBar.style.transition = 'none';
      els.transitionBar.style.width = '0%';
    }

    setStage('s1');
    startTransitionToQuiz();

    const result = await leadRequest;
    state.leadId = result.lead_id || payload.lead_id;
    state.leadPayload = payload.place;
    updateContextHints();
  } catch (error) {
    console.error(error);
    showToast(`送出失敗：${error.message}`);
    if (state.transition.countdownId) {
      clearInterval(state.transition.countdownId);
      state.transition.countdownId = null;
    }
    if (state.transition.timeoutId) {
      clearTimeout(state.transition.timeoutId);
      state.transition.timeoutId = null;
    }
    if (state.progress.messageId) {
      clearInterval(state.progress.messageId);
      state.progress.messageId = null;
    }
    state.transition.started = false;
    stopTransitionTips();
    state.leadId = '';
    state.leadPayload = null;
    state.quiz = { goal: '', tone: [], competitorsInput: [], skipped: false };
    setStage('s0');
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = '申請 AI 入場券';
  }
}

function startTransitionToQuiz() {
  if (state.transition.countdownId) {
    clearInterval(state.transition.countdownId);
    state.transition.countdownId = null;
  }
  if (state.transition.timeoutId) {
    clearTimeout(state.transition.timeoutId);
    state.transition.timeoutId = null;
  }

  state.transition.started = true;
  startTransitionTips();

  if (els.transitionBar) {
    els.transitionBar.style.transition = 'none';
    els.transitionBar.style.width = '0%';
    requestAnimationFrame(() => {
      els.transitionBar.style.transition = 'width 3s ease';
      els.transitionBar.style.width = '100%';
    });
  }

  if (els.transitionCounter) {
    let remaining = 3;
    els.transitionCounter.textContent = remaining;
    state.transition.countdownId = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(state.transition.countdownId);
        state.transition.countdownId = null;
        els.transitionCounter.textContent = '0';
      } else {
        els.transitionCounter.textContent = remaining;
      }
    }, 1000);
  }

  state.transition.timeoutId = setTimeout(() => {
    stopTransitionTips();
    setStage('s2');
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = '申請 AI 入場券';
    resetProgressUI();
    state.transition.started = false;
  }, TRANSITION_DURATION_MS);
}

function collectQuizValues() {
  const form = els.quizForm;
  if (!form) return null;

  const formData = new FormData(form);
  const goal = formData.get('quiz-goal');
  const tone = formData.getAll('quiz-tone');
  const competitorsRaw = (formData.get('quiz-competitors') || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  return { goal, tone, competitorsInput: competitorsRaw };
}

function validateQuiz(values) {
  if (!values.goal) {
    return '請選擇您最想先解決的目標。';
  }
  if (values.tone.length === 0) {
    return '請至少選擇一個回覆語氣，或使用「稍後再答」。';
  }
  if (values.tone.length > MAX_TONE_SELECTION) {
    return '回覆語氣最多選擇 2 項。';
  }
  return '';
}

async function handleQuizSubmit(event) {
  event.preventDefault();
  const values = collectQuizValues();
  if (!values) return;
  const error = validateQuiz(values);
  if (error) {
    els.quizError.textContent = error;
    els.quizError.hidden = false;
    return;
  }
  els.quizError.hidden = true;
  await submitQuiz(values);
}

async function handleQuizSkip() {
  const fallback = {
    goal: state.quiz.goal || 'instant_lowstar',
    tone: ['direct_fix', 'soothing'],
    competitorsInput: [],
  };
  await submitQuiz(fallback, true);
}

async function submitQuiz(values, skipped = false) {
  if (!state.leadId) {
    showToast('尚未建立 Lead，請重新填寫。');
    resetFlow();
    return;
  }

  state.quiz = { ...values, skipped };
  els.quizSubmit.disabled = true;
  els.quizSkip.disabled = true;
  els.quizSubmit.textContent = skipped ? '使用預設語氣…' : '送出設定…';

  try {
    await requestJSON(endpoints.quiz, {
      method: 'POST',
      body: JSON.stringify({
        lead_id: state.leadId,
        quiz: {
          goal: values.goal,
          tone: values.tone,
          competitors_input: values.competitorsInput,
          skipped,
        },
        intent: 'quiz',
      }),
    });

    updateSummary(values, skipped);
    setStage('s3');
    resetProgressUI();
  } catch (error) {
    console.error(error);
    showToast(`儲存設定失敗：${error.message}`);
  } finally {
    els.quizSubmit.disabled = false;
    els.quizSkip.disabled = false;
    els.quizSubmit.textContent = '完成設定';
  }
}

function updateSummary(values, skipped) {
  const goalMap = {
    instant_lowstar: '立即掌握 1–3★ 低星',
    save_time: '省時，一鍵回覆草稿',
    beat_competitors: '看我與附近對手差距',
    weekly_focus: '幫我列出本週三件事',
  };
  const toneMap = {
    soothing: '溫和安撫',
    direct_fix: '直接解決',
    authority: '專業權威',
    apology: '道歉＋補救',
  };

  els.summaryGoal.textContent = goalMap[values.goal] || values.goal || '—';
  els.summaryTone.textContent = values.tone.length
    ? values.tone.map((key) => toneMap[key] || key).join('、')
    : '預設：直接解決＋溫和安撫';
  els.summaryCompetitors.textContent = values.competitorsInput.length
    ? values.competitorsInput.join('、')
    : skipped ? '系統自動挑選中…（預設）' : '系統自動挑選中…';
}

function acknowledgeSummary() {
  showToast('設定已鎖定，稍待即可收到完整報告。', 2000);
  // Prevent double submission
  els.summaryConfirm.disabled = true;
  els.summaryConfirm.textContent = '已確認';
  if (!state.progress.pollId) {
    startPolling();
  }
}

function returnToQuizFromSummary() {
  stopProgressTimers();
  resetProgressUI();
  state.progress.timeoutFired = false;
  state.progress.lastStage = '';
  if (els.summaryConfirm) {
    els.summaryConfirm.disabled = false;
    els.summaryConfirm.textContent = '確認設定，開始分析';
  }
  setStage('s2');
}

function startPolling() {
  if (!state.leadId || !endpoints.analysisStatus) return;
  if (state.progress.pollId) {
    clearInterval(state.progress.pollId);
  }
  state.progress.ninetyReachedAt = 0;
  state.progress.lastStage = '';
  state.progress.timeoutFired = false;
  state.progress.completionLogged = false;
  if (!state.progress.pendingLogged) {
    logEvent('analysis_pending_start', {
      lead_id: state.leadId,
      template_id: state.templateId,
    });
    state.progress.pendingLogged = true;
  }
  stopAnalysisCountdown();
  stopTimeoutCountdown();
  startAnalysisCountdown();
  state.timeoutContext = {};
  updateTimeoutUI();
  const poll = async () => {
    try {
      const url = new URL(endpoints.analysisStatus);
      url.searchParams.set('lead_id', state.leadId);
      const result = await requestJSON(url.toString(), { method: 'GET' });
      handleStatusResponse(result);
    } catch (error) {
      console.warn('[analysis-status]', error.message);
    }
  };
  poll();
  state.progress.pollId = setInterval(poll, POLL_INTERVAL_MS);

  if (state.progress.timerId) {
    clearTimeout(state.progress.timerId);
  }
  state.progress.timerId = setTimeout(() => {
    if (state.stage !== 's4' && !state.progress.timeoutFired) {
      triggerTimeout();
    }
  }, PROGRESS_TIMEOUT_MS);
}

function handleAnalysisCompleted(context = {}) {
  state.progress.timeoutFired = false;
  stopProgressTimers();
  stopAnalysisCountdown();
  if (!state.progress.completionLogged) {
    const elapsed = state.progress.startAt ? Date.now() - state.progress.startAt : null;
    logEvent('analysis_completed', {
      lead_id: state.leadId,
      template_id: state.templateId,
      elapsed_ms: elapsed,
      warnings: context.warnings || [],
    });
    state.progress.completionLogged = true;
  }
  state.timeoutContext = {};
  updateTimeoutUI();
  renderAnalysisReport(context);
}

function handleStatusResponse(payload) {
  if (!payload || typeof payload !== 'object') return;
  if (!state.leadId || payload.lead_id !== state.leadId) return;

  const stage = (payload.stage || '').toLowerCase();
  const lifecycleState = (payload.state || '').toLowerCase();
  const percent = typeof payload.percent === 'number' ? payload.percent : state.progress.percent;
  const etaSeconds = typeof payload.eta_seconds === 'number' ? payload.eta_seconds : null;
  const statusValue = typeof payload.status === 'string'
    ? payload.status
    : (payload.status && typeof payload.status === 'object' ? payload.status.state || '' : '');
  const isComplete = statusValue.toLowerCase() === 'complete' || lifecycleState === 'ready';
  const warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
  const flags = payload.flags || (payload.report && payload.report.flags) || {};
  const stageHints = {
    collecting: { description: '正在建立結構化資料欄位' },
    processing: { description: '正在建立 AI 可見度模型' },
    analyzing: { description: '正在檢查評論健康與守護任務' },
    scheduled: { label: 'AI 入場券預審排隊中', description: '資料量較大，完成後會自動推播' },
    timeout: { label: 'AI 入場券預審排隊中', description: '資料量較大，完成後會自動推播' },
    ready: { label: 'AI 入場券預審完成', description: '正在回傳結果，稍待即可查看' },
  };

  if (stage === 'collecting' && state.stage === 's1') {
    stopTransitionTips();
    setStage('s2');
  }

  if (typeof percent === 'number') {
    const mergedPercent = Math.max(state.progress.frontPercent, percent);
    updateProgressUI(mergedPercent, etaSeconds, stageHints[stage] || null);
    state.progress.frontPercent = Math.max(state.progress.frontPercent, mergedPercent);
  }

  const isPending = lifecycleState === 'pending' || statusValue === 'pending';
  if (isPending) {
    updateProgressUI(state.progress.percent, etaSeconds, {
      label: 'AI 入場券預審排隊中',
      description: '資料量較大，完成後會自動推播',
    });
  }

  if (payload.report) {
    state.report = payload.report;
    if (!state.reportToken && payload.report.token) {
      state.reportToken = payload.report.token;
    }
    if (payload.report.template_id) {
      state.templateId = payload.report.template_id;
    }
  }

  if (payload.psychology) {
    state.psychology = payload.psychology;
    if (payload.psychology.template_id) {
      state.templateId = payload.psychology.template_id;
    }
  }

  if (payload.report_token) {
    state.reportToken = payload.report_token;
  }
  if (payload.template_id) {
    state.templateId = payload.template_id;
  }

  if (payload.lead_id) {
    state.leadId = payload.lead_id;
  }

  state.progress.lastStage = stage;

  if (stage === 'processing' && state.progress.frontPercent < 55) {
    animateFrontProgress(55, 2000);
  }

  if (stage === 'analyzing' && state.progress.frontPercent < 85) {
    animateFrontProgress(85, 2000);
  }

  if (isComplete) {
    updateProgressUI(100, 0, stageHints.ready);
    handleAnalysisCompleted({ warnings, flags });
    return;
  }

  if (stage === 'ready') {
    updateProgressUI(100, 0, stageHints.ready);
    handleAnalysisCompleted({ warnings, flags });
  } else if (stage === 'scheduled' || stage === 'timeout') {
    triggerTimeout({ warnings, flags });
  } else if (stage === 'failed' || statusValue.toLowerCase() === 'failed') {
    showToast('分析失敗，請稍後再試或聯絡支援。');
    triggerTimeout({ warnings, flags });
  }
}

function renderAnalysisReport(context = {}) {
  if (!state.report) {
    showToast('尚未取得報告內容，請稍後再試。');
    return;
  }

  const report = state.report;
  const psychology = state.psychology || {};
  const utils = window.ReportUtils || {};
  const {
    renderMetrics,
    renderCompetitors,
    renderActions,
    renderDrafts,
    pickMetric,
  } = utils;

  const warnings = Array.isArray(context.warnings) ? context.warnings : state.latestWarnings;
  const flags = context.flags || report.flags || {};

  state.latestWarnings = warnings || [];
  state.timeoutContext = {};
  updateTimeoutUI();
  stopAnalysisCountdown();

  if (els.resultWarning && els.resultWarningText) {
    const hasDataforseoIssue = Boolean(flags.dataforseo_missing) || (warnings || []).includes('dataforseo_missing');
    if (hasDataforseoIssue) {
      els.resultWarning.hidden = false;
      els.resultWarningText.textContent = 'Google 評論資料仍在補齊，我會在同步完成後再次通知你。';
    } else if (warnings && warnings.length) {
      els.resultWarning.hidden = false;
      els.resultWarningText.textContent = warnings.join('、');
    } else {
      els.resultWarning.hidden = true;
      els.resultWarningText.textContent = '';
    }
  }

  const resolveText = (...values) => {
    for (const value of values) {
      if (value == null) continue;
      const text = String(value).trim();
      if (text) return text;
    }
    return '';
  };

  const formatScoreDisplay = (value, { unit = '' } = {}) => {
    if (value == null) return '';
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return '';
      const parsed = Number(trimmed);
      if (!Number.isNaN(parsed)) {
        value = parsed;
      } else {
        return trimmed;
      }
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return '';
    }
    const normalized = Math.abs(number) <= 1 ? number * 100 : number;
    const formatted = Number.isInteger(normalized) ? normalized : Number(normalized.toFixed(1));
    return `${formatted}${unit}`.trim();
  };

  const normalizeScoreValue = (value) => {
    if (value == null || value === '') return null;
    let candidate = value;
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (!trimmed) return null;
      const match = trimmed.match(/-?\d+(?:\.\d+)?/);
      if (!match) return null;
      candidate = Number(match[0]);
    }
    const number = Number(candidate);
    if (!Number.isFinite(number)) return null;
    const normalized = Math.abs(number) <= 1 ? number * 100 : number;
    return Math.max(0, Math.min(100, Math.round(normalized)));
  };

  const TIMESTAMP_KEYS = [
    'checked_at',
    'checkedAt',
    'updated_at',
    'updatedAt',
    'last_checked_at',
    'lastCheckedAt',
    'refreshed_at',
    'refreshedAt',
    'computed_at',
    'computedAt',
    'generated_at',
    'generatedAt',
    'timestamp',
    'ts',
  ];

  const parseTimestampValue = (value) => {
    if (value == null || value === '') return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return null;
      if (value > 1e12) return new Date(value);
      if (value > 1e9) return new Date(value * 1000);
      return null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (/^\d{13}$/.test(trimmed)) return new Date(Number(trimmed));
      if (/^\d{10}$/.test(trimmed)) return new Date(Number(trimmed) * 1000);
      if (/^20\d{6}T\d{4}$/.test(trimmed)) {
        const year = Number(trimmed.slice(0, 4));
        const month = Number(trimmed.slice(4, 6)) - 1;
        const day = Number(trimmed.slice(6, 8));
        const hour = Number(trimmed.slice(9, 11));
        const minute = Number(trimmed.slice(11, 13));
        const result = new Date(year, month, day, hour, minute);
        return Number.isNaN(result.getTime()) ? null : result;
      }
      const parsed = new Date(trimmed);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const extractTimestampValue = (source, visited = new Set()) => {
    if (source == null) return null;
    const parsedDirect = parseTimestampValue(source);
    if (parsedDirect) return parsedDirect;
    if (typeof source !== 'object') return null;
    if (visited.has(source)) return null;
    visited.add(source);

    if (Array.isArray(source)) {
      for (const item of source) {
        const parsed = extractTimestampValue(item, visited);
        if (parsed) return parsed;
      }
      return null;
    }

    for (const key of TIMESTAMP_KEYS) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const parsed = parseTimestampValue(source[key]);
        if (parsed) return parsed;
      }
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      if (Object.prototype.hasOwnProperty.call(source, camelKey)) {
        const parsed = parseTimestampValue(source[camelKey]);
        if (parsed) return parsed;
      }
    }

    for (const [key, value] of Object.entries(source)) {
      if (!value) continue;
      const canonicalKey = key.toLowerCase();
      if (TIMESTAMP_KEYS.some((candidate) => canonicalKey.includes(candidate.replace(/_/g, '')))) {
        const parsed = parseTimestampValue(value);
        if (parsed) return parsed;
      }
    }

    if (source.meta) {
      const parsed = extractTimestampValue(source.meta, visited);
      if (parsed) return parsed;
    }
    if (source.metadata) {
      const parsed = extractTimestampValue(source.metadata, visited);
      if (parsed) return parsed;
    }
    if (source.raw) {
      const parsed = extractTimestampValue(source.raw, visited);
      if (parsed) return parsed;
    }

    for (const value of Object.values(source)) {
      if (value && typeof value === 'object') {
        const parsed = extractTimestampValue(value, visited);
        if (parsed) return parsed;
      }
    }

    return null;
  };

  const resolveFirstTimestamp = (...sources) => {
    for (const source of sources) {
      const parsed = extractTimestampValue(source);
      if (parsed) return parsed;
    }
    return null;
  };

  const formatRelativeTimestampLabel = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const safeDiff = Number.isFinite(diffMs) ? diffMs : 0;
    const clampedDiff = safeDiff < 0 ? 0 : safeDiff;
    const minutes = Math.floor(clampedDiff / 60000);
    if (minutes < 1) return '更新於 1 分鐘內';
    if (minutes < 60) return `更新於 ${minutes} 分鐘前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `更新於 ${hours} 小時前`;
    const days = Math.floor(hours / 24);
    if (days < 60) return `更新於 ${days} 天前`;
    const months = Math.floor(days / 30);
    return `更新於 ${months} 個月前`;
  };

  const createCardState = (score, options = {}) => {
    const {
      pendingNext,
      goodNext,
      warnNext,
      riskNext,
      goodStatus,
      warnStatus,
      riskStatus,
    } = options;

    if (score == null) {
      return {
        level: '',
        status: '同步中',
        next: pendingNext || 'AI 正在整理指標，稍後會提供補件建議。',
      };
    }

    if (score >= 80) {
      return {
        level: 'entry-pass-card--state-good',
        status: goodStatus || '可簽發',
        next: goodNext || '維持亮綠燈，持續追蹤即可。',
      };
    }

    if (score >= 50) {
      return {
        level: 'entry-pass-card--state-warn',
        status: warnStatus || '待補件',
        next: warnNext || '優先補齊黃色指標，加速簽發。',
      };
    }

    return {
      level: 'entry-pass-card--state-risk',
      status: riskStatus || '需緊急守護',
      next: riskNext || '立即處理紅色指標，守護評論健康。',
    };
  };

  const updatePreviewCard = (refs, data = {}) => {
    if (!refs) return;
    const {
      cardEl,
      scoreEl,
      statusEl,
      hintEl,
      nextEl,
      updatedEl,
    } = refs;
    const {
      score = '—',
      status = '同步中',
      hint = 'AI 正在整理資料。',
      next = '稍後會提供補件建議。',
      level = '',
      updated = '',
    } = data;

    if (scoreEl) scoreEl.textContent = score || '—';
    if (statusEl) statusEl.textContent = status || '同步中';
    if (hintEl) hintEl.textContent = hint || 'AI 正在整理資料。';
    if (nextEl) nextEl.textContent = next || '稍後會提供補件建議。';
    if (updatedEl) {
      if (updated) {
        updatedEl.textContent = updated;
        updatedEl.hidden = false;
      } else {
        updatedEl.hidden = true;
      }
    }
    if (cardEl) {
      cardEl.classList.remove('entry-pass-card--state-good', 'entry-pass-card--state-warn', 'entry-pass-card--state-risk');
      if (level) {
        cardEl.classList.add(level);
      }
    }
  };

  const setPreviewEntryStatus = ({ status, primary, note, nextSteps }) => {
    if (els.previewEntryStatus) {
      els.previewEntryStatus.textContent = status || '檢核中';
    }
    if (els.previewEntryPrimary) {
      els.previewEntryPrimary.textContent = primary || 'AI 正在生成正式入場券，補齊黃色與紅色指標即可簽發。';
    }
    if (els.previewEntryNote) {
      els.previewEntryNote.textContent = note || '完成後會自動推播結果並同步到 LINE。';
    }
    if (els.previewStatusCard) {
      const normalizedStatus = (status || '').trim();
      els.previewStatusCard.classList.toggle('entry-pass-status-card--ready', /可簽發/.test(normalizedStatus));
      els.previewStatusCard.classList.toggle('entry-pass-status-card--pause', /暫停|待守護/.test(normalizedStatus));
    }
    if (els.previewEntryNextSteps) {
      els.previewEntryNextSteps.innerHTML = '';
      const steps = Array.isArray(nextSteps) ? nextSteps.filter(Boolean) : [];
      if (steps.length) {
        steps.slice(0, 3).forEach((item) => {
          const li = document.createElement('li');
          li.className = 'entry-pass-status-card__item';
          li.textContent = item;
          els.previewEntryNextSteps.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.className = 'entry-pass-status-card__item';
        li.textContent = 'AI 正在整理下一步補件建議';
        els.previewEntryNextSteps.appendChild(li);
      }
    }
  };

  const entryPassData = report.entry_pass || {};
  const entryPassCards = entryPassData.cards || entryPassData.sections || {};
  const preferences = report.preferences || {};

  const schemaMetric = pickMetric
    ? pickMetric(report.metrics, ['schema_score', 'schema'])
      || pickMetric(report.metrics?.overview, ['schema_score', 'schema'])
      || pickMetric(report.kpi, ['schema_score', 'schema'])
    : null;
  const schemaValueRaw = schemaMetric?.value
    ?? report.schema_score
    ?? report.schemaScore
    ?? report.schema?.score
    ?? report.metrics?.schema_score
    ?? report.metrics?.schema?.score;
  const schemaDisplay = formatScoreDisplay(schemaValueRaw, { unit: '' });
  const schemaScoreNumeric = normalizeScoreValue(schemaValueRaw);
  const schemaHint = resolveText(
    schemaMetric?.hint,
    schemaMetric?.raw?.hint,
    schemaMetric?.raw?.note,
    report.schema_hint,
    report.schema?.hint,
    schemaDisplay ? '結構化資料已同步' : 'Schema 結構化資料檢測中',
  );

  const visibilityMetric = pickMetric
    ? pickMetric(report.metrics, ['ai_visibility_score', 'visibility_score', 'ai_visibility'])
      || pickMetric(report.metrics?.overview, ['ai_visibility_score', 'visibility_score', 'ai_visibility'])
      || pickMetric(report.kpi, ['ai_visibility_score', 'visibility_score'])
    : null;
  const visibilityValueRaw = visibilityMetric?.value
    ?? report.ai_visibility_score
    ?? report.aiVisibilityScore
    ?? report.ai_visibility?.score
    ?? report.visibility_score;
  const visibilityDisplay = formatScoreDisplay(visibilityValueRaw, { unit: '' });
  const visibilityScoreNumeric = normalizeScoreValue(visibilityValueRaw);
  const visibilityHint = resolveText(
    visibilityMetric?.hint,
    visibilityMetric?.raw?.hint,
    visibilityMetric?.raw?.note,
    report.ai_visibility_hint,
    report.visibility_hint,
    visibilityDisplay ? 'AI 可見度已完成評估' : 'AI 正在評估可見度',
  );

  const reviewMetric = pickMetric
    ? pickMetric(report.metrics, ['review_health', 'reviews_health', 'review_health_score'])
      || pickMetric(report.metrics?.overview, ['review_health', 'reviews_health', 'review_health_score'])
      || pickMetric(report.kpi, ['review_health'])
    : null;
  const reviewValueRaw = reviewMetric?.value
    ?? report.review_health
    ?? report.reviews_health
    ?? report.review_health_score
    ?? report.metrics?.review_health
    ?? report.metrics?.review?.health;
  let reviewDisplay = formatScoreDisplay(reviewValueRaw, { unit: '' });
  let reviewScoreNumeric = normalizeScoreValue(reviewValueRaw);
  if (!reviewScoreNumeric && typeof reviewValueRaw === 'string') {
    const reviewKey = reviewValueRaw.trim().toLowerCase();
    const reviewMap = { safe: 92, watch: 68, alert: 42, danger: 28 };
    if (reviewMap[reviewKey] != null) {
      reviewScoreNumeric = reviewMap[reviewKey];
    }
    if (!reviewDisplay) {
      const reviewDisplayMap = { safe: '安全', watch: '觀察', alert: '警示', danger: '重大關注' };
      reviewDisplay = reviewDisplayMap[reviewKey] || reviewValueRaw.trim();
    }
  }
  if (!reviewDisplay && typeof reviewValueRaw === 'string' && reviewValueRaw.trim()) {
    reviewDisplay = reviewValueRaw.trim();
  }
  const reviewHint = resolveText(
    reviewMetric?.hint,
    reviewMetric?.raw?.hint,
    reviewMetric?.raw?.note,
    report.review_health_hint,
    report.reviews_health_hint,
    reviewDisplay ? '評論健康度已更新' : '評論健康度同步中',
  );

  const schemaCardSource = entryPassCards.schema
    || entryPassData.schema
    || entryPassCards.schema_card
    || {};
  const visibilityCardSource = entryPassCards.visibility
    || entryPassData.visibility
    || entryPassCards.visibility_card
    || {};
  const reviewCardSource = entryPassCards.review
    || entryPassData.review
    || entryPassCards.review_card
    || {};

  const schemaState = createCardState(schemaScoreNumeric, {
    pendingNext: schemaCardSource.pending_next,
    goodNext: schemaCardSource.good_next,
    warnNext: schemaCardSource.warn_next,
    riskNext: schemaCardSource.risk_next,
    goodStatus: schemaCardSource.good_status,
    warnStatus: schemaCardSource.warn_status,
    riskStatus: schemaCardSource.risk_status,
  });
  const visibilityState = createCardState(visibilityScoreNumeric, {
    pendingNext: visibilityCardSource.pending_next,
    goodNext: visibilityCardSource.good_next,
    warnNext: visibilityCardSource.warn_next,
    riskNext: visibilityCardSource.risk_next,
    goodStatus: visibilityCardSource.good_status,
    warnStatus: visibilityCardSource.warn_status,
    riskStatus: visibilityCardSource.risk_status,
  });
  const reviewState = createCardState(reviewScoreNumeric, {
    pendingNext: reviewCardSource.pending_next,
    goodNext: reviewCardSource.good_next,
    warnNext: reviewCardSource.warn_next,
    riskNext: reviewCardSource.risk_next,
    goodStatus: reviewCardSource.good_status,
    warnStatus: reviewCardSource.warn_status,
    riskStatus: reviewCardSource.risk_status,
  });

  const schemaStatus = resolveText(schemaCardSource.status, schemaCardSource.state, schemaState.status);
  const schemaHintResolved = resolveText(schemaCardSource.hint, schemaCardSource.description, schemaHint);
  const schemaNext = resolveText(schemaCardSource.next, schemaCardSource.action, schemaCardSource.recommendation, schemaState.next);

  const visibilityStatus = resolveText(visibilityCardSource.status, visibilityCardSource.state, visibilityState.status);
  const visibilityHintResolved = resolveText(visibilityCardSource.hint, visibilityCardSource.description, visibilityHint);
  const visibilityNext = resolveText(visibilityCardSource.next, visibilityCardSource.action, visibilityCardSource.recommendation, visibilityState.next);

  const reviewStatus = resolveText(reviewCardSource.status, reviewCardSource.state, reviewState.status);
  const reviewHintResolved = resolveText(reviewCardSource.hint, reviewCardSource.description, reviewHint);
  const reviewNext = resolveText(reviewCardSource.next, reviewCardSource.action, reviewCardSource.recommendation, reviewState.next);

  const schemaTimestamp = resolveFirstTimestamp(
    schemaMetric?.raw,
    schemaCardSource,
    schemaCardSource?.meta,
    schemaCardSource?.metadata,
    entryPassCards.schema_checked_at,
    entryPassCards.schema?.checked_at,
    entryPassData.schema_checked_at,
    entryPassData.schema?.checked_at,
    report.schema_checked_at,
    report.schema_updated_at,
    report.schema?.checked_at,
    report.schema?.updated_at,
    report.metrics?.schema_checked_at,
    report.metrics?.schema?.checked_at,
    report.metrics?.schema?.updated_at,
  );
  const schemaUpdatedLabel = schemaTimestamp ? formatRelativeTimestampLabel(schemaTimestamp) : '';

  const visibilityTimestamp = resolveFirstTimestamp(
    visibilityMetric?.raw,
    visibilityCardSource,
    visibilityCardSource?.meta,
    visibilityCardSource?.metadata,
    entryPassCards.visibility_checked_at,
    entryPassCards.visibility?.checked_at,
    entryPassData.visibility_checked_at,
    entryPassData.visibility?.checked_at,
    report.ai_visibility_checked_at,
    report.visibility_checked_at,
    report.ai_visibility?.checked_at,
    report.visibility?.checked_at,
    report.metrics?.ai_visibility_checked_at,
    report.metrics?.visibility_checked_at,
    report.metrics?.visibility?.checked_at,
  );
  const visibilityUpdatedLabel = visibilityTimestamp ? formatRelativeTimestampLabel(visibilityTimestamp) : '';

  const reviewTimestamp = resolveFirstTimestamp(
    reviewMetric?.raw,
    reviewCardSource,
    reviewCardSource?.meta,
    reviewCardSource?.metadata,
    entryPassCards.review_checked_at,
    entryPassCards.review?.checked_at,
    entryPassData.review_checked_at,
    entryPassData.review?.checked_at,
    report.review_health_checked_at,
    report.reviews_health_checked_at,
    report.review?.checked_at,
    report.metrics?.review_health_checked_at,
    report.metrics?.review_checked_at,
    report.metrics?.review?.checked_at,
  );
  const reviewUpdatedLabel = reviewTimestamp ? formatRelativeTimestampLabel(reviewTimestamp) : '';

  updatePreviewCard({
    cardEl: els.previewSchemaCard,
    scoreEl: els.previewSchemaScore,
    statusEl: els.previewSchemaStatus,
    hintEl: els.previewSchemaHint,
    nextEl: els.previewSchemaNext,
    updatedEl: els.previewSchemaUpdated,
  }, {
    score: schemaDisplay || '—',
    status: schemaStatus,
    hint: schemaHintResolved || 'AI 正在建立結構化資料。',
    next: schemaNext,
    level: schemaState.level,
    updated: schemaUpdatedLabel,
  });

  updatePreviewCard({
    cardEl: els.previewVisibilityCard,
    scoreEl: els.previewVisibilityScore,
    statusEl: els.previewVisibilityStatus,
    hintEl: els.previewVisibilityHint,
    nextEl: els.previewVisibilityNext,
    updatedEl: els.previewVisibilityUpdated,
  }, {
    score: visibilityDisplay || '—',
    status: visibilityStatus,
    hint: visibilityHintResolved || 'AI 正在評估可見度。',
    next: visibilityNext,
    level: visibilityState.level,
    updated: visibilityUpdatedLabel,
  });

  updatePreviewCard({
    cardEl: els.previewReviewCard,
    scoreEl: els.previewReviewScore,
    statusEl: els.previewReviewStatus,
    hintEl: els.previewReviewHint,
    nextEl: els.previewReviewNext,
    updatedEl: els.previewReviewUpdated,
  }, {
    score: reviewDisplay || '—',
    status: reviewStatus,
    hint: reviewHintResolved || '評論健康度同步中',
    next: reviewNext,
    level: reviewState.level,
    updated: reviewUpdatedLabel,
  });

  const entryStatusSource = entryPassData.status || entryPassData.state || {};
  const entryStatus = resolveText(
    entryStatusSource.label,
    entryStatusSource.status,
    entryPassData.status_text,
    entryPassData.status,
    entryPassData.state,
    '檢核中',
  );
  const entryPrimary = resolveText(
    entryStatusSource.primary,
    entryPassData.primary,
    entryStatusSource.note,
    'AI 正在生成正式入場券，補齊黃色與紅色指標即可簽發。',
  );
  const entryNote = resolveText(
    entryStatusSource.note,
    entryPassData.note,
    '完成後會自動推播結果並同步到 LINE。',
  );
  const entrySteps = entryStatusSource.next_steps
    || entryPassData.next_steps
    || entryPassData.nextSteps
    || [];

  setPreviewEntryStatus({
    status: entryStatus,
    primary: entryPrimary,
    note: entryNote,
    nextSteps: Array.isArray(entrySteps) ? entrySteps : [entrySteps].filter(Boolean),
  });

  const metricsSource = entryPassData.metrics
    || report.metrics?.priority
    || report.metrics?.top
    || report.metrics?.summary
    || report.metrics
    || [];

  const renderWithFallback = (renderFn, container, data, { emptyMessage, fallback }) => {
    if (!container) return [];
    if (typeof renderFn === 'function') {
      return renderFn(container, data, { emptyMessage });
    }
    if (typeof fallback === 'function') {
      return fallback();
    }
    container.innerHTML = '';
    return [];
  };

  const metricsRendered = renderWithFallback(renderMetrics, els.previewMetrics, metricsSource, {
    emptyMessage: 'AI 正在比對欄位，稍後提供補件建議。',
    fallback: () => {
      const items = Array.isArray(metricsSource) ? metricsSource.slice(0, 4) : [];
      els.previewMetrics.innerHTML = '';
      items.forEach((item) => {
        const block = document.createElement('div');
        block.className = 'report-metric';
        const title = document.createElement('h3');
        title.textContent = resolveText(item.label, item.title, item.name, '指標');
        const value = document.createElement('p');
        value.className = 'report-metric__value';
        value.textContent = resolveText(item.value, item.score, '—');
        block.append(title, value);
        els.previewMetrics.appendChild(block);
      });
      return items;
    },
  });
  if (els.previewMetricsEmpty) {
    els.previewMetricsEmpty.hidden = Boolean(metricsRendered?.length);
  }

  const competitorsPreferred = report.competitors || report.competitors_agent || [];
  const competitorFallback = (report.competitors_selected || []).concat(report.competitors_auto || []);
  const competitors = competitorsPreferred.length ? competitorsPreferred : competitorFallback;

  const competitorsRendered = renderWithFallback(renderCompetitors, els.previewCompetitors, competitors.slice(0, 5), {
    emptyMessage: '競品資料同步中，完成後會推播提醒。',
    fallback: () => {
      els.previewCompetitors.innerHTML = '';
      competitors.slice(0, 5).forEach((item) => {
        const li = document.createElement('li');
        li.className = 'report-competitor';
        li.textContent = `${item.name || '未命名店家'}｜${item.rating || '—'}★｜${item.reviews_total || item.reviews || ''} 則評論`;
        els.previewCompetitors.appendChild(li);
      });
      return competitors.slice(0, 5);
    },
  });
  if (els.previewCompetitorsEmpty) {
    els.previewCompetitorsEmpty.hidden = Boolean(competitorsRendered?.length);
  }

  const weeklyActions = report.weekly_actions || [];
  const replyDrafts = report.reply_drafts || [];
  let renderedActions = weeklyActions;

  renderedActions = renderWithFallback(renderActions, els.previewActions, weeklyActions.slice(0, 3), {
    emptyMessage: '守護任務整理中，稍後會推播。',
    fallback: () => {
      els.previewActions.innerHTML = '';
      weeklyActions.slice(0, 3).forEach((item) => {
        const li = document.createElement('li');
        li.className = 'report-action';
        const text = document.createElement('p');
        text.className = 'report-action__text';
        text.textContent = String(item);
        li.appendChild(text);
        els.previewActions.appendChild(li);
      });
      return weeklyActions.slice(0, 3).map((item) => ({ text: String(item) }));
    },
  });
  if (els.previewActionsEmpty) {
    els.previewActionsEmpty.hidden = Boolean(renderedActions?.length);
  }

  renderWithFallback(renderDrafts, els.previewDrafts, replyDrafts.slice(0, 3), {
    emptyMessage: '草稿準備中，稍後會自動推播。',
    fallback: () => {
      els.previewDrafts.innerHTML = '';
      replyDrafts.slice(0, 3).forEach((draft, index) => {
        const card = document.createElement('article');
        card.className = 'report-draft';
        const header = document.createElement('header');
        header.className = 'report-draft__header';
        const title = document.createElement('strong');
        title.textContent = `草稿 #${index + 1}`;
        header.appendChild(title);
        card.appendChild(header);
        const body = document.createElement('p');
        body.className = 'report-draft__body';
        body.textContent = draft.text || draft;
        card.appendChild(body);
        els.previewDrafts.appendChild(card);
      });
      return replyDrafts.slice(0, 3).map((draft, index) => ({ title: `草稿 #${index + 1}`, text: draft.text || draft }));
    },
  });
  if (els.previewDraftsEmpty) {
    els.previewDraftsEmpty.hidden = Boolean((replyDrafts || []).length);
  }

  if (els.copyActions) {
    els.copyActions.onclick = async () => {
      const list = (Array.isArray(renderedActions) ? renderedActions : [])
        .map((item) => item.text || item);
      if (!list.length) {
        showToast('尚無可複製的任務');
        return;
      }
      try {
        await navigator.clipboard.writeText(list.map((text) => `• ${text}`).join('\n'));
        showToast('已複製本週任務', 1800);
        logEvent('cta_click', {
          action: 'copy_actions',
          lead_id: state.leadId,
          template_id: state.templateId,
          source: 'preview',
        });
      } catch (error) {
        showToast('複製失敗，請手動複製');
      }
    };
  }

  if (els.summaryGoal) {
    els.summaryGoal.textContent = report.goal_label || els.summaryGoal.textContent;
  }
  if (els.summaryTone) {
    els.summaryTone.textContent = report.tone_label || els.summaryTone.textContent;
  }

  state.sampleUrl = buildUrlWithParams(sampleReportUrl, {
    lead_id: state.leadId || '',
    template_id: state.templateId || 'unknown',
  });
  state.reportPageUrl = buildUrlWithParams(reportUrl, {
    token: state.reportToken || report.token || '',
    lead_id: state.leadId || '',
    ts: Date.now(),
  });

  if (els.ctaSecondary) {
    const disabled = !state.reportPageUrl;
    els.ctaSecondary.disabled = disabled;
    els.ctaSecondary.classList.toggle('btn--disabled', disabled);
  }

  logEvent('report_preview_ready', {
    lead_id: state.leadId,
    template_id: state.templateId,
  });

  setStage('s4');
}

function triggerTimeout(context = {}) {
  const wasTimedOut = state.progress.timeoutFired;
  const previousContext = state.timeoutContext || {};
  const mergedWarnings = mergeContextArray(previousContext.warnings || [], context.warnings || []);
  const mergedFlags = {
    ...(previousContext.flags || {}),
    ...(context.flags || {}),
  };
  state.timeoutContext = {
    ...previousContext,
    ...context,
    flags: mergedFlags,
    warnings: mergedWarnings,
  };
  updateTimeoutUI();

  if (wasTimedOut) {
    return;
  }

  state.progress.timeoutFired = true;
  if (state.progress.timerId) {
    clearTimeout(state.progress.timerId);
    state.progress.timerId = null;
  }
  stopAnalysisCountdown();
  startTimeoutCountdown();
  updateProgressUI(Math.max(state.progress.percent || 90, 90), null, '資料量較大，完成後會自動推播結果');
  if (els.timeoutSample && state.sampleUrl) {
    els.timeoutSample.href = state.sampleUrl;
  }
  setStage('s5');
}

async function handleWeeklyDraft() {
  if (!endpoints.weeklyDraft) {
    showToast('尚未設定試算服務');
    return;
  }
  if (!state.leadId) {
    showToast('尚未取得 Lead 編號');
    return;
  }
  try {
    const result = await requestJSON(endpoints.weeklyDraft, {
      method: 'POST',
      body: JSON.stringify({
        lead_id: state.leadId,
        mode: 'trial',
        tone: state.quiz.tone.length ? state.quiz.tone : ['direct_fix', 'soothing'],
        goal: state.quiz.goal || 'instant_lowstar',
      }),
    });
    if (result && result.ok === false) {
      throw new Error(result.message || '推送失敗');
    }
    showToast('已推送試算三件事，請查看 LINE。');
  } catch (error) {
    logEvent('weekly_draft_failed', {
      lead_id: state.leadId || '',
      error: error?.message || String(error || ''),
    });
    showToast(`推送失敗：${error.message}`);
  }
}

function resetFlow() {
  stopProgressTimers();
  state.transition.started = false;
  state.stage = 's0';
  state.leadId = '';
  state.leadPayload = null;
  state.quiz = { goal: '', tone: [], competitorsInput: [], skipped: false };
  state.progress = {
    startAt: 0,
    percent: 0,
    frontPercent: 0,
    tickerIndex: 0,
    timerId: null,
    pollId: null,
    messageId: null,
    timeoutFired: false,
    ninetyReachedAt: 0,
    lastStage: '',
    countdownRemaining: 0,
    countdownTimerId: null,
    tipTimerId: null,
    tipIndex: 0,
    pendingLogged: false,
    completionLogged: false,
    timeoutCountdownId: null,
    timeoutStartedAt: 0,
  };
  state.transition = {
    countdownId: null,
    timeoutId: null,
    started: false,
    tipId: null,
  };
  state.report = null;
  state.psychology = null;
  state.reportToken = '';
  state.templateId = 'unknown';
  state.planUrl = '';
  state.sampleUrl = '';
  state.reportPageUrl = '';
  state.timeoutContext = {};
  state.latestWarnings = [];
  updateTimeoutUI();

  if (els.leadForm) {
    els.leadForm.reset();
  }
  if (els.submitBtn) {
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = '申請 AI 入場券';
  }
  if (els.quizForm) {
    els.quizForm.reset();
    els.quizError.hidden = true;
  }
  if (els.quizContext) {
    els.quizContext.hidden = true;
  }
  if (els.summaryContext) {
    els.summaryContext.hidden = true;
  }
  if (els.summaryConfirm) {
    els.summaryConfirm.disabled = false;
    els.summaryConfirm.textContent = '確認設定，開始分析';
  }
  resetProgressUI();
  setStage('s0');
}

function redirectToReport() {
  if (!reportUrl) {
    showToast('尚未設定入場券預覽頁面', 2000);
    return;
  }

  const token = state.reportToken || state.report?.token || '';
  if (!token) {
    showToast('入場券尚未準備完成，請稍後再試。', 2000);
    return;
  }

  state.reportPageUrl = buildUrlWithParams(reportUrl, {
    token,
    lead_id: state.leadId || '',
    ts: Date.now(),
  });

  logEvent('cta_click', {
    action: 'report',
    lead_id: state.leadId,
    template_id: state.templateId,
    source: 'preview',
  });

  openReportWindow(state.reportPageUrl);
}

function openReportWindow(targetUrl) {
  if (!targetUrl) return false;

  let externalAttempted = false;
  const { liff } = window;
  if (liff && typeof liff.openWindow === 'function') {
    try {
      liff.openWindow({ url: targetUrl, external: true });
      externalAttempted = true;
    } catch (error) {
      console.warn('[liff] openWindow failed', error);
    }
  }

  if (!externalAttempted) {
    window.location.href = targetUrl;
    return true;
  }

  window.setTimeout(() => {
    if (document.visibilityState === 'visible') {
      window.location.href = targetUrl;
    }
  }, 600);

  return true;
}

function closeToLine() {
  const { liff } = window;
  try {
    if (liff?.closeWindow) {
      liff.closeWindow();
      return;
    }
  } catch (error) {
    console.warn('[LIFF] closeWindow failed', error);
  }
  if (lineFallbackUrl) {
    window.location.href = buildUrlWithParams(lineFallbackUrl, { ts: Date.now() });
  }
}

function handleSecondaryCta(event) {
  event?.preventDefault?.();
  redirectToReport();
}

function attachEventListeners() {
  els.leadForm?.addEventListener('submit', handleLeadSubmit);
  els.quizForm?.addEventListener('submit', handleQuizSubmit);
  els.quizSkip?.addEventListener('click', handleQuizSkip);
  els.summaryConfirm?.addEventListener('click', acknowledgeSummary);
  els.summaryBack?.addEventListener('click', returnToQuizFromSummary);
  els.timeoutBack?.addEventListener('click', resetFlow);
  els.timeoutWeekly?.addEventListener('click', handleWeeklyDraft);
  els.timeoutReport?.addEventListener('click', (event) => {
    event.preventDefault();
    logEvent('cta_click', {
      action: 'timeout_report',
      lead_id: state.leadId,
      template_id: state.templateId,
      source: 'timeout',
    });
    redirectToReport();
  });
  els.copyActions?.addEventListener('click', (event) => {
    event.preventDefault();
  });
  els.ctaSecondary?.addEventListener('click', handleSecondaryCta);
  els.ctaLine?.addEventListener('click', (event) => {
    event.preventDefault();
    closeToLine();
  });
  els.aboutLink?.addEventListener('click', (event) => {
    event.preventDefault();
    openAboutPage();
  });
}

(function bootstrap() {
  const viewMode = params.get('view');
  if (state.mode === 'report') {
    redirectToReport();
    return;
  }

  if (viewMode === 'about') {
    const target = buildUrlWithParams('about.html', { ts: Date.now() });
    window.location.replace(target);
    return;
  }

  if (els.timeoutSample && sampleReportUrl) {
    els.timeoutSample.href = sampleReportUrl;
  }
  if (els.aboutLink) {
    els.aboutLink.href = 'about.html';
  }

  attachEventListeners();
  resetFlow();
  initLiff();
})();
