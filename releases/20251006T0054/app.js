const params = new URLSearchParams(window.location.search);
const config = window.STAR_ENGINE_CONFIG || {};

const endpoints = {
  lead: config.webhookUrl,
  quiz: config.quizUrl || config.webhookUrl,
  analysisStatus: config.analysisStatusUrl || `${config.webhookUrl}/status`,
};

const reportUrl = config.reportUrl || config.report_url || 'report.html';
const formUrl = config.formUrl || config.form_url || window.location.href;
const assistantUrl = config.trialUrl || config.trial_url || '';

const ANALYSIS_COUNTDOWN_SECONDS = 20;
const TIP_ROTATE_INTERVAL_MS = 9000;
const ANALYSIS_TIPS = [
  '我先幫你比對最近的評論走勢與關鍵字。',
  '同時整理同商圈的競品星等與評論量。',
  '接著套用語氣偏好，準備專屬回覆草稿。'
];
const DEFAULT_STATUS_LABEL = '定位商圈中';
const ANALYSIS_STATUS_LABELS = {
  collecting: '定位商圈中',
  processing: '整理評論與競品',
  analyzing: '彙整行動與草稿',
  ready: '分析完成',
  scheduled: '排程推送中',
  timeout: '排程推送中',
  failed: '分析遇到狀況',
};
const POST_COUNTDOWN_MESSAGE = 'AI 正在整理資料，隨時向你回報進度。';
const ANALYSIS_TIMEOUT_THRESHOLD_MS = 90 * 1000;
const TRANSITION_TIP_INTERVAL_MS = 1500;
const TRANSITION_TIPS = [
  '同步定位商圈與鄰近競品資料…',
  '抓取最新 Google Maps 評論與風險指標…',
  '套用您選擇的語氣與優先要務…',
  '整理趨勢後，將自動載入專屬設定。',
];
const DEFAULT_TIMEOUT_NOTE = 'Google 資料已就緒，評論補齊後會另行通知。';
const DATAFORSEO_TIMEOUT_NOTE = 'Google 資料已就緒，評論補齊後會另行通知。';

const logEvent = (...args) => {
  if (typeof window.logEvent === 'function') {
    window.logEvent(...args);
  }
};

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value) {
  const number = toFiniteNumber(value);
  if (number == null) return '';
  return number.toLocaleString('zh-Hant-TW');
}

function formatDecimal(value, digits = 1) {
  const number = toFiniteNumber(value);
  if (number == null) return '';
  return number.toFixed(digits);
}

const STAGES = ['s0', 's1', 's2', 's3', 's4', 's5'];
const PROGRESS_TICKS = [
  { percent: 45, label: '定位門市與評論… 進度 45%', eta: '近 7 天評論同步中' },
  { percent: 60, label: '檢視競品差距… 進度 60%', eta: '同商圈競品定位完成' },
  { percent: 75, label: '組裝專屬草稿… 進度 75%', eta: '撰寫本週優先行動' }
];
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
  submitBtn: document.getElementById('submit-btn'),
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
  progressCountdown: document.getElementById('progress-countdown'),
  progressTimer: document.getElementById('progress-timer'),
  progressCountdownNumber: document.getElementById('progress-countdown-number'),
  progressWaiting: document.getElementById('progress-waiting'),
  progressTip: document.getElementById('progress-tip'),
  progressStatusLabel: document.getElementById('progress-status-label'),
  resultRadarList: document.getElementById('result-radar-list'),
  resultActionsList: document.getElementById('result-actions-list'),
  resultDraftsList: document.getElementById('result-drafts-list'),
  resultWarning: document.getElementById('result-warning'),
  resultWarningText: document.getElementById('result-warning-text'),
  resultKpiRating: document.getElementById('result-kpi-rating'),
  resultKpiRatingHint: document.getElementById('result-kpi-rating-hint'),
  resultKpiReviews: document.getElementById('result-kpi-reviews'),
  resultKpiReviewsHint: document.getElementById('result-kpi-reviews-hint'),
  resultKpiGap: document.getElementById('result-kpi-gap'),
  resultKpiGapHint: document.getElementById('result-kpi-gap-hint'),
  ctaReport: document.getElementById('cta-report'),
  ctaAssistant: document.getElementById('cta-assistant'),
  returnHome: document.getElementById('return-home'),
  timeoutReport: document.getElementById('timeout-report'),
  timeoutAssistant: document.getElementById('timeout-assistant'),
  timeoutNote: document.getElementById('timeout-note'),
  timeoutStatusLabel: document.getElementById('timeout-status-label'),
  timeoutSpinner: document.getElementById('timeout-spinner'),
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
    postCountdownActive: false,
    postCountdownStartedAt: 0,
    currentStatusKey: 'collecting',
    currentStatusLabel: DEFAULT_STATUS_LABEL,
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
  assistantUrl: assistantUrl,
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
  setTransitionTip('智能體正在準備提示…', true);
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

function extractTokenFromUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return url.searchParams.get('token') || '';
  } catch (error) {
    console.warn('[url] token parse failed', error);
    return '';
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

  let label = stageLabel || `整合資料中… 進度 ${safePercent}%`;
  if (showAlmostDone) {
    label = '快完成了，我在整理報告重點';
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

  let etaLabel = state.progress.postCountdownActive
    ? 'AI 正在整理資料，請稍候'
    : '預估 1 分鐘內完成';
  if (showAlmostDone && !state.progress.postCountdownActive) {
    etaLabel = '快完成了，正在合併專屬草稿';
  } else if (!state.progress.postCountdownActive && etaSeconds != null) {
    etaLabel = `預估完成 ${Math.max(0, Math.round(etaSeconds))} 秒`;
  }
  if (els.progressEtaS2) {
    els.progressEtaS2.textContent = etaLabel;
  }
  if (els.progressEtaS3) {
    els.progressEtaS3.textContent = etaLabel;
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
  state.progress.postCountdownActive = false;
  state.progress.postCountdownStartedAt = 0;
  if (els.progressCountdown) {
    els.progressCountdown.hidden = true;
  }
  showProgressWaiting(false);
  showProgressTimer(true);
  if (els.progressCountdownNumber) {
    els.progressCountdownNumber.textContent = ANALYSIS_COUNTDOWN_SECONDS;
  }
  if (els.progressTip) {
    els.progressTip.textContent = ANALYSIS_TIPS[0] || 'AI 正在分析資料…';
  }
  updateProgressStatus(DEFAULT_STATUS_LABEL);
}

function setProgressTip(text) {
  if (!els.progressTip) return;
  els.progressTip.textContent = text;
}

function syncPostCountdownTip() {
  if (!state.progress.postCountdownActive) return;
  const statusLabel = state.progress.currentStatusLabel || DEFAULT_STATUS_LABEL;
  const statusText = statusLabel ? `AI 正在整理資料｜${statusLabel}` : 'AI 正在整理資料';
  setProgressTip(statusText);
}

function updateProgressStatus(label = DEFAULT_STATUS_LABEL) {
  state.progress.currentStatusLabel = label;
  if (els.progressStatusLabel) {
    els.progressStatusLabel.textContent = label;
  }
  if (els.timeoutStatusLabel) {
    els.timeoutStatusLabel.textContent = label;
  }
  syncPostCountdownTip();
}

function updateCountdownNumber() {
  if (!els.progressCountdownNumber) return;
  const value = Math.max(0, Math.round(state.progress.countdownRemaining));
  els.progressCountdownNumber.textContent = value;
}

function showProgressTimer(show) {
  if (els.progressTimer) {
    els.progressTimer.hidden = !show;
  }
  if (show && els.progressCountdownNumber) {
    els.progressCountdownNumber.textContent = Math.max(0, Math.round(state.progress.countdownRemaining || ANALYSIS_COUNTDOWN_SECONDS));
  }
}

function showProgressWaiting(show) {
  if (els.progressWaiting) {
    els.progressWaiting.hidden = !show;
  }
}

function enterPostCountdownWait() {
  if (state.progress.postCountdownActive) return;
  state.progress.postCountdownActive = true;
  state.progress.postCountdownStartedAt = Date.now();
  state.progress.countdownRemaining = 0;
  if (state.progress.countdownTimerId) {
    clearInterval(state.progress.countdownTimerId);
    state.progress.countdownTimerId = null;
  }
  if (state.progress.tipTimerId) {
    clearInterval(state.progress.tipTimerId);
    state.progress.tipTimerId = null;
  }
  showProgressTimer(false);
  showProgressWaiting(true);
  if (els.progressCountdownNumber) {
    els.progressCountdownNumber.textContent = '—';
  }
  setProgressTip(POST_COUNTDOWN_MESSAGE);
  syncPostCountdownTip();
}

function rotateAnalysisTip() {
  if (!ANALYSIS_TIPS.length) return;
  state.progress.tipIndex = (state.progress.tipIndex + 1) % ANALYSIS_TIPS.length;
  setProgressTip(ANALYSIS_TIPS[state.progress.tipIndex]);
}

function startAnalysisCountdown() {
  if (!els.progressCountdown) return;
  stopAnalysisCountdown();
  state.progress.countdownRemaining = ANALYSIS_COUNTDOWN_SECONDS;
  state.progress.tipIndex = 0;
  state.progress.postCountdownActive = false;
  state.progress.postCountdownStartedAt = 0;
  els.progressCountdown.hidden = false;
  showProgressTimer(true);
  showProgressWaiting(false);
  updateProgressStatus(DEFAULT_STATUS_LABEL);
  updateCountdownNumber();
  setProgressTip(ANALYSIS_TIPS[0] || 'AI 正在分析資料…');
  state.progress.countdownTimerId = setInterval(() => {
    state.progress.countdownRemaining -= 1;
    if (state.progress.countdownRemaining <= 0) {
      enterPostCountdownWait();
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

function updateTimeoutUI() {
  const context = state.timeoutContext || {};
  const warnings = Array.isArray(context.warnings) ? context.warnings : [];
  const flags = context.flags || {};
  const hasDataforseoIssue = Boolean(flags.dataforseo_missing) || warnings.includes('dataforseo_missing');
  const statusLabel = context.status_label || ANALYSIS_STATUS_LABELS[context.status_key] || DEFAULT_STATUS_LABEL;

  if (els.timeoutStatusLabel) {
    els.timeoutStatusLabel.textContent = statusLabel;
  }

  let noteText = hasDataforseoIssue ? DATAFORSEO_TIMEOUT_NOTE : DEFAULT_TIMEOUT_NOTE;
  if (context.reason === 'analysis_timeout') {
    noteText = 'AI 正在收尾，資料量較大，稍後會自動送達完整報表。';
  }
  if (typeof context.note === 'string' && context.note.trim()) {
    noteText = context.note.trim();
  }

  if (els.timeoutNote) {
    els.timeoutNote.textContent = noteText;
  }

  if (els.timeoutSpinner) {
    els.timeoutSpinner.dataset.phase = context.status_key || '';
  }

  if (els.timeoutReport) {
    const allowReport = Boolean(state.reportPageUrl);
    els.timeoutReport.hidden = false;
    els.timeoutReport.setAttribute('href', allowReport ? state.reportPageUrl : '#');
    els.timeoutReport.classList.toggle('btn--disabled', !allowReport);
    els.timeoutReport.setAttribute('aria-disabled', allowReport ? 'false' : 'true');
  }

  if (els.timeoutAssistant) {
    const allowAssistant = Boolean(state.assistantUrl);
    els.timeoutAssistant.hidden = false;
    els.timeoutAssistant.setAttribute('href', allowAssistant ? state.assistantUrl : '#');
    els.timeoutAssistant.classList.toggle('btn--disabled', !allowAssistant);
    els.timeoutAssistant.setAttribute('aria-disabled', allowAssistant ? 'false' : 'true');
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

  const baseLabel = '定位你的門市… 進度 0%';
  const baseEta = '我正在準備評論與競品資料';

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
    els.submitBtn.textContent = '啟動 AI 初檢';
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
    els.submitBtn.textContent = '啟動 AI 初檢';
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
  const resolvedReportUrl = payload.report_url || payload.report?.report_url || '';
  const resolvedAssistantUrl = payload.assistant_url
    || payload.trial_url
    || payload.links?.assistant
    || payload.links?.assistant_url
    || '';

  if (resolvedReportUrl) {
    state.reportPageUrl = resolvedReportUrl;
    const extracted = extractTokenFromUrl(resolvedReportUrl);
    if (extracted) {
      state.reportToken = extracted;
    }
  }

  if (resolvedAssistantUrl) {
    state.assistantUrl = resolvedAssistantUrl;
  } else if (!state.assistantUrl) {
    state.assistantUrl = assistantUrl;
  }
  const stageHints = {
    collecting: '正在定位你的門市與商圈…',
    processing: '整理評論與競品趨勢…',
    analyzing: '彙整行動建議與草稿…',
    scheduled: '我已排程完成後立即通知',
    timeout: '我已排程完成後立即通知',
    ready: '分析完成！正在回傳結果…',
  };

  const statusKey = isComplete ? 'ready' : (lifecycleState || stage);
  state.progress.currentStatusKey = statusKey;
  const statusLabel = ANALYSIS_STATUS_LABELS[statusKey] || DEFAULT_STATUS_LABEL;
  updateProgressStatus(statusLabel);

  if (stage === 'collecting' && state.stage === 's1') {
    stopTransitionTips();
    setStage('s2');
  }

  if (typeof percent === 'number') {
    const mergedPercent = Math.max(state.progress.frontPercent, percent);
    updateProgressUI(mergedPercent, etaSeconds, stageHints[stage]);
    state.progress.frontPercent = Math.max(state.progress.frontPercent, mergedPercent);
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

  const enrichedContext = {
    warnings,
    flags,
    report_url: resolvedReportUrl || state.reportPageUrl,
    status_key: statusKey,
    status_label: statusLabel,
    stage,
  };

  const elapsed = state.progress.startAt ? Date.now() - state.progress.startAt : 0;
  if ((stage === 'analyzing' || stage === 'processing') && elapsed >= ANALYSIS_TIMEOUT_THRESHOLD_MS && !state.progress.postCountdownActive) {
    enterPostCountdownWait();
    syncPostCountdownTip();
  }

  if (isComplete) {
    updateProgressUI(100, 0, stageHints.ready);
    handleAnalysisCompleted(enrichedContext);
    return;
  }

  if (stage === 'ready') {
    updateProgressUI(100, 0, stageHints.ready);
    handleAnalysisCompleted(enrichedContext);
  } else if (stage === 'scheduled' || stage === 'timeout') {
    triggerTimeout(enrichedContext);
  } else if (stage === 'failed' || statusValue.toLowerCase() === 'failed') {
    handleAnalysisFailed(enrichedContext, payload.status?.message);
  }
}

function renderAnalysisReport(context = {}) {
  if (!state.report) {
    showToast('尚未取得報告內容，請稍後再試。');
    return;
  }

  const report = state.report;
  const utils = window.ReportUtils || {};
  const warnings = Array.isArray(context.warnings) ? context.warnings : state.latestWarnings;
  const flags = context.flags || report.flags || {};

  state.latestWarnings = warnings || [];
  if (context.report_url) {
    state.reportPageUrl = context.report_url;
    const extractedToken = extractTokenFromUrl(context.report_url);
    if (extractedToken) {
      state.reportToken = extractedToken;
    }
  }
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

  const competitorsPreferred = report.competitors || report.competitors_agent || [];
  const competitorFallback = (report.competitors_selected || []).concat(report.competitors_auto || []);
  const competitors = competitorsPreferred.length ? competitorsPreferred : competitorFallback;
  const weeklyActions = report.weekly_actions || [];
  const replyDrafts = report.reply_drafts || [];

  const ratingNow = report.rating_now ?? report.rating ?? report.score ?? null;
  const reviewsTotal = report.reviews_total ?? report.reviews ?? report.review_count ?? null;
  const ratingValue = ratingNow != null ? `${formatDecimal(ratingNow, 1)} ★` : '—';
  const ratingHint = ratingNow != null ? '最新星等已同步' : '同步中';
  const reviewsValue = reviewsTotal != null ? `${formatNumber(reviewsTotal)} 則` : '—';
  const reviewsHint = reviewsTotal != null ? '評論總量即時更新' : '整理評論細節';
  let competitorGapValue = report.gap_summary || report.competitor_gap || report.gap_text || report.competitor_gap_label || '';
  let competitorGapHint = report.gap_hint || report.gap_detail || '';

  if (!competitorGapValue && ratingNow != null && competitors.length) {
    const primaryCompetitor = competitors[0];
    const competitorRating = toFiniteNumber(primaryCompetitor?.rating ?? primaryCompetitor?.score);
    const ratingNumber = toFiniteNumber(ratingNow);
    if (ratingNumber != null && competitorRating != null) {
      const diff = ratingNumber - competitorRating;
      const absoluteDiff = Math.abs(diff);
      if (absoluteDiff < 0.05) {
        competitorGapValue = '與主要競品持平';
      } else if (diff > 0) {
        competitorGapValue = `領先 ${formatDecimal(absoluteDiff, 1)} ★`;
      } else {
        competitorGapValue = `落後 ${formatDecimal(absoluteDiff, 1)} ★`;
      }
      if (primaryCompetitor?.name) {
        competitorGapHint = `主要競品：${primaryCompetitor.name}`;
      }
    }
  }

  if (!competitorGapValue) {
    competitorGapValue = '—';
  }
  if (!competitorGapHint) {
    competitorGapHint = '競品比較載入中';
  }

  if (els.resultKpiRating) {
    els.resultKpiRating.textContent = ratingValue;
  }
  if (els.resultKpiRatingHint) {
    els.resultKpiRatingHint.textContent = ratingHint;
  }
  if (els.resultKpiReviews) {
    els.resultKpiReviews.textContent = reviewsValue;
  }
  if (els.resultKpiReviewsHint) {
    els.resultKpiReviewsHint.textContent = reviewsHint;
  }
  if (els.resultKpiGap) {
    els.resultKpiGap.textContent = competitorGapValue;
  }
  if (els.resultKpiGapHint) {
    els.resultKpiGapHint.textContent = competitorGapHint;
  }

  let renderedActions = weeklyActions;

  if (els.resultRadarList) {
    if (utils.renderCompetitors) {
      utils.renderCompetitors(els.resultRadarList, competitors.slice(0, 5), {
        emptyMessage: '競品資料整理中，稍後自動更新。',
      });
    } else {
      els.resultRadarList.innerHTML = '';
      competitors.slice(0, 5).forEach((item) => {
        const li = document.createElement('li');
        li.className = 'report-competitor';
        li.textContent = `${item.name || '未命名店家'}｜${item.rating || '—'}｜${item.reviews_total || ''}`;
        els.resultRadarList.appendChild(li);
      });
    }
  }

  if (els.resultActionsList) {
    if (utils.renderActions) {
      renderedActions = utils.renderActions(els.resultActionsList, weeklyActions.slice(0, 3), {
        emptyMessage: '本週行動清單準備中。',
      });
    } else {
      els.resultActionsList.innerHTML = '';
      weeklyActions.slice(0, 3).forEach((item) => {
        const li = document.createElement('li');
        li.textContent = String(item);
        els.resultActionsList.appendChild(li);
      });
    }
  }

  if (els.resultDraftsList) {
    if (utils.renderDrafts) {
      utils.renderDrafts(els.resultDraftsList, replyDrafts.slice(0, 3), {
        copyLabel: '複製草稿',
        onCopy: async (text) => {
          try {
            await navigator.clipboard.writeText(text);
            showToast('已複製草稿', 1800);
            logEvent('cta_click', {
              action: 'copy_draft',
              lead_id: state.leadId,
              template_id: state.templateId,
              source: 'preview',
            });
          } catch (error) {
            showToast('複製失敗，請手動複製');
          }
        },
      });
    } else {
      els.resultDraftsList.innerHTML = '';
      replyDrafts.slice(0, 3).forEach((draft, index) => {
        const card = document.createElement('div');
        card.className = 'draft-item';
        const title = document.createElement('strong');
        title.textContent = `草稿 #${index + 1}`;
        const body = document.createElement('p');
        body.textContent = draft.text || draft;
        card.append(title, body);
        els.resultDraftsList.appendChild(card);
      });
    }
  }

  if (els.copyActions) {
    els.copyActions.onclick = async () => {
      const list = (Array.isArray(renderedActions) ? renderedActions : []).map((item) => item.text || item);
      if (!list.length) {
        showToast('尚無可複製的任務');
        return;
      }
      try {
        await navigator.clipboard.writeText(list.map((text) => `• ${text}`).join('\n'));
        showToast('已複製本週三件事', 1800);
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

  if (!context.report_url) {
    const token = state.reportToken || report.token || '';
    if (reportUrl) {
      state.reportPageUrl = buildUrlWithParams(reportUrl, {
        token,
        lead_id: state.leadId || '',
        ts: Date.now(),
      });
    }
  }

  if (!state.reportPageUrl && reportUrl) {
    state.reportPageUrl = buildUrlWithParams(reportUrl, {
      lead_id: state.leadId || '',
      ts: Date.now(),
    });
  }

  if (!state.assistantUrl) {
    state.assistantUrl = assistantUrl;
  }

  if (els.ctaReport) {
    if (state.reportPageUrl) {
      els.ctaReport.setAttribute('href', state.reportPageUrl);
      els.ctaReport.classList.remove('btn--disabled');
      els.ctaReport.setAttribute('aria-disabled', 'false');
    } else {
      els.ctaReport.setAttribute('href', '#');
      els.ctaReport.classList.add('btn--disabled');
      els.ctaReport.setAttribute('aria-disabled', 'true');
    }
  }

  if (els.ctaAssistant) {
    const hasAssistant = Boolean(state.assistantUrl);
    if (hasAssistant) {
      els.ctaAssistant.setAttribute('href', state.assistantUrl);
      els.ctaAssistant.classList.remove('btn--disabled');
      els.ctaAssistant.setAttribute('aria-disabled', 'false');
    } else {
      els.ctaAssistant.setAttribute('href', '#');
      els.ctaAssistant.classList.add('btn--disabled');
      els.ctaAssistant.setAttribute('aria-disabled', 'true');
    }
  }

  logEvent('report_preview_ready', {
    lead_id: state.leadId,
    template_id: state.templateId,
  });

  updateProgressStatus(ANALYSIS_STATUS_LABELS.ready || DEFAULT_STATUS_LABEL);
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
  const statusKey = context.status_key || state.progress.currentStatusKey || 'timeout';
  const statusLabel = context.status_label || ANALYSIS_STATUS_LABELS[statusKey] || DEFAULT_STATUS_LABEL;
  state.timeoutContext = {
    ...previousContext,
    ...context,
    flags: mergedFlags,
    warnings: mergedWarnings,
    status_key: statusKey,
    status_label: statusLabel,
  };
  state.progress.currentStatusKey = statusKey;

  if (context.report_url) {
    state.reportPageUrl = context.report_url;
    const extractedToken = extractTokenFromUrl(context.report_url);
    if (extractedToken) {
      state.reportToken = extractedToken;
    }
  }

  updateTimeoutUI();
  updateProgressStatus(statusLabel);

  const stageKey = (context.stage || context.status_key || '').toLowerCase();
  const shouldShowTimeoutStage = stageKey === 'scheduled' || stageKey === 'timeout';

  if (!shouldShowTimeoutStage) {
    enterPostCountdownWait();
    syncPostCountdownTip();
    return;
  }

  if (wasTimedOut) {
    return;
  }

  state.progress.timeoutFired = true;
  if (state.progress.timerId) {
    clearTimeout(state.progress.timerId);
    state.progress.timerId = null;
  }
  stopAnalysisCountdown();
  setStage('s5');
}

function handleAnalysisFailed(context = {}, message = '') {
  const fallback = '分析過程遇到狀況，已替你通知專業顧問協助處理。';
  const note = (typeof message === 'string' && message.trim()) ? message.trim() : fallback;
  state.progress.timeoutFired = false;
  state.timeoutContext = { ...state.timeoutContext, ...context };
  enterPostCountdownWait();
  updateProgressStatus(ANALYSIS_STATUS_LABELS.failed || DEFAULT_STATUS_LABEL);
  setProgressTip(`AI 正在整理資料｜分析遇到狀況；${note}`);
  showToast(note, 2800);
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
    postCountdownActive: false,
    postCountdownStartedAt: 0,
    currentStatusKey: 'collecting',
    currentStatusLabel: DEFAULT_STATUS_LABEL,
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
  state.assistantUrl = assistantUrl;
  state.reportPageUrl = '';
  state.timeoutContext = {};
  state.latestWarnings = [];
  updateTimeoutUI();

  if (els.leadForm) {
    els.leadForm.reset();
  }
  if (els.submitBtn) {
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = '啟動 AI 初檢';
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
  const target = state.reportPageUrl;

  if (!target) {
    showToast('報表尚未準備完成，請稍後再試。', 2000);
    return;
  }

  logEvent('cta_click', {
    action: 'report',
    lead_id: state.leadId,
    template_id: state.templateId,
    source: 'preview',
  });

  window.location.href = target;
}

function openAssistant(source = 'preview') {
  if (!state.assistantUrl) {
    showToast('專業助理暫時無法連線，請稍後再試。');
    return;
  }
  logEvent('cta_click', {
    action: 'assistant',
    lead_id: state.leadId,
    template_id: state.templateId,
    source,
  });
  window.open(state.assistantUrl, '_blank', 'noopener,noreferrer');
}

function attachEventListeners() {
  els.leadForm?.addEventListener('submit', handleLeadSubmit);
  els.quizForm?.addEventListener('submit', handleQuizSubmit);
  els.quizSkip?.addEventListener('click', handleQuizSkip);
  els.summaryConfirm?.addEventListener('click', acknowledgeSummary);
  els.summaryBack?.addEventListener('click', returnToQuizFromSummary);
  els.returnHome?.addEventListener('click', resetFlow);
  els.timeoutBack?.addEventListener('click', resetFlow);
  els.timeoutReport?.addEventListener('click', (event) => {
    event.preventDefault();
    if (els.timeoutReport.classList.contains('btn--disabled')) {
      showToast('報表仍在整理，我會完成後再通知你。');
      return;
    }
    logEvent('cta_click', {
      action: 'timeout_report',
      lead_id: state.leadId,
      template_id: state.templateId,
      source: 'timeout',
    });
    redirectToReport();
  });
  els.timeoutAssistant?.addEventListener('click', (event) => {
    event.preventDefault();
    if (els.timeoutAssistant.classList.contains('btn--disabled')) {
      showToast('顧問稍後聯繫你，請先稍候。');
      return;
    }
    openAssistant('timeout');
  });
  els.copyActions?.addEventListener('click', (event) => {
    event.preventDefault();
  });
  els.ctaReport?.addEventListener('click', (event) => {
    event.preventDefault();
    if (els.ctaReport.classList.contains('btn--disabled')) {
      showToast('報表尚在生成，完成後會自動開啟。', 2400);
      return;
    }
    redirectToReport();
  });
  els.ctaAssistant?.addEventListener('click', (event) => {
    event.preventDefault();
    if (els.ctaAssistant.classList.contains('btn--disabled')) {
      showToast('AI 專業助理暫時離線，稍後再試。');
      return;
    }
    openAssistant('preview');
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

  if (els.aboutLink) {
    els.aboutLink.href = 'about.html';
  }

  if (els.ctaAssistant && assistantUrl && 'href' in els.ctaAssistant) {
    els.ctaAssistant.href = assistantUrl;
  }

  if (els.timeoutAssistant && assistantUrl && 'href' in els.timeoutAssistant) {
    els.timeoutAssistant.href = assistantUrl;
  }

  attachEventListeners();
  resetFlow();
  initLiff();
})();
