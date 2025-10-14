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

const ANALYSIS_COUNTDOWN_SECONDS = 15;
const TRANSITION_SECONDS = 3;
const TRANSITION_COMPLETE_DELAY_MS = 1200;
const TRANSITION_COMPLETE_MESSAGE = '守護專家已收到速查結果；完整報告約 15 分鐘送達';
const POST_COUNTDOWN_MESSAGE = '守護專家已收到速查結果；完整報告約 15 分鐘送達';
const ANALYSIS_TIMEOUT_MS = 10 * 60 * 1000;
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
  ready: '速查完成，完整報告整理中（約 15 分鐘送達）。',
  ready_partial: '速查完成，完整報告整理中（約 15 分鐘送達）。',
  partial: '速查結果已整理，完整報告生成中（約 15 分鐘送達）。',
};

const PARTIAL_NOTICE_TEXT = '目前是速查版，資料補齊中，完整資料生成後自動更新';
const PARTIAL_LIVE_FALLBACK_TEXT = '目前以 Live fallback 顯示重點，資料補齊中，完整報告稍後自動更新';
const REPORT_CTA_READY_TEXT = '點下去看即時報告';
const REPORT_CTA_PARTIAL_TEXT = '點下去看即時報告（速查版）';
const DEFAULT_PARTIAL_CARDS = [
  {
    id: 'structured_site',
    title: '結構化網站生成中',
    description: 'AI 正在整理門市資訊，建立速查版展示頁並同步資料結構。',
    icon: '🧱',
  },
  {
    id: 'guardian_intro',
    title: '守護任務排程',
    description: '守護專家持續整理評論、曝光與任務優先順序，完整清單稍後送達。',
    icon: '🛡️',
  },
];

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
  priority_tasks: {
    emptyText: 'AI 正在整理守護任務。',
    partialEmptyText: '速查版暫提供重點摘要，完整守護任務補齊中。',
  },
  collection_steps: {
    emptyText: '補件清單整理中，稍後指引你補齊缺漏。',
    partialEmptyText: '補件步驟尚在生成，稍後會同步最新指引。',
  },
  repair_checklist: {
    emptyText: '目前沒有需要立即補救的評論。',
    partialEmptyText: '風險評論清單整理中，完成後會第一時間提醒你。',
  },
};

const METRIC_SOURCE_HINTS = [
  {
    token: 'serpapi',
    label: 'SERPAPI',
    className: 'metric-card--source-serpapi',
    patterns: [/serp[-_\s]?api/i, /\bgoogle\s*serp\b/i],
  },
  {
    token: 'live',
    label: 'LIVE',
    className: 'metric-card--source-live',
    patterns: [/\blive\b/i, /\b即時\b/i, /\breal[-\s]?time\b/i, /\b現場\b/i, /\b即刻\b/i],
  },
  {
    token: 'cache',
    label: 'CACHE',
    className: 'metric-card--source-cache',
    patterns: [/fallback/i, /cache/i, /cached/i, /supabase/i, /快取/i, /備援/i, /backup/i],
  },
];

const METRIC_SOURCE_PRIORITY = ['serpapi', 'live', 'cache'];
const METRIC_SOURCE_VALUE_KEYS = [
  'source',
  'source_name',
  'source_label',
  'source_provider',
  'provider',
  'provider_name',
  'provider_label',
  'provider_key',
  'provider_display',
  'origin',
  'channel',
  'mode',
  'name',
  'label',
  'title',
];
const METRIC_SOURCE_ARRAY_KEYS = [
  'sources',
  'providers',
  'source_list',
  'provider_list',
  'channels',
  'origins',
  'tags',
  'labels',
  'identifiers',
  'details',
];
const METRIC_SOURCE_FLAG_KEYS = ['fallback', 'is_fallback', 'isFallback', 'cache', 'is_cache', 'from_cache', 'uses_cache'];
const METRIC_SOURCE_RECURSIVE_KEYS = ['metadata', 'meta', 'context', 'detail', 'details', 'extra', 'provider_metadata'];

const METRIC_RAW_LABEL_KEYS = ['raw_label', 'rawLabel', 'original_label', 'originalLabel', 'label_raw', 'labelRaw'];
const METRIC_RAW_UNIT_KEYS = ['raw_unit', 'rawUnit', 'original_unit', 'originalUnit', 'unit_raw', 'unitRaw'];
const METRIC_RAW_VALUE_KEYS = [
  'raw_value',
  'rawValue',
  'raw_score',
  'rawScore',
  'raw',
  'raw_count',
  'rawCount',
  'original_value',
  'originalValue',
  'original',
  'baseline_value',
  'baselineValue',
  'baseline',
  'value_raw',
  'valueRaw',
  'source_value',
  'sourceValue',
  'actual',
  'actual_value',
  'actualValue',
  'count',
  'total',
  'pending',
  'live_value',
  'cache_value',
];
const METRIC_RAW_NESTED_KEYS = ['raw', 'original', 'baseline', 'live', 'cache', 'fallback', 'source', 'details', 'detail', 'context', 'metadata', 'meta', 'extra'];

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
  analysisTimer: document.getElementById('analysis-timer') || document.getElementById('progress-countdown'),
  analysisCountdownNumber: document.getElementById('analysis-countdown-number') || document.getElementById('progress-countdown-number'),
  analysisTip: document.getElementById('analysis-tip') || document.getElementById('progress-tip'),
  resultWarning: document.getElementById('result-warning'),
  resultWarningText: document.getElementById('result-warning-text'),
  resultPartial: document.getElementById('result-partial'),
  resultPartialText: document.getElementById('result-partial-text'),
  partialOverview: document.getElementById('partial-overview'),
  partialOverviewList: document.getElementById('partial-overview-list'),
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
  metricTimestamps: {},
  pollTimer: null,
  pollDebounceId: null,
  submitLocked: false,
  tasks: {
    priority_tasks: [],
    collection_steps: [],
    repair_checklist: [],
  },
  pollId: null,
  timeoutId: null,
  transitionId: null,
  transitionCompleteTimeout: null,
  transitionCompleteShown: false,
  transitionRemaining: TRANSITION_SECONDS,
  analysisCountdownId: null,
  analysisTipId: null,
  analysisCountdownFrameId: null,
  analysisRemaining: ANALYSIS_COUNTDOWN_SECONDS,
  analysisTipIndex: 0,
  analysisCountdownActive: false,
  analysisCountdownCompleted: false,
  postCountdownNotified: false,
  resultActivatedFromCountdown: false,
  warnings: [],
  reportUrlOverride: '',
  isPartialResult: false,
  defaultReportCtaText: (els.ctaReport && els.ctaReport.textContent) || '查看速查詳情',
  partialCards: [],
  partialNotice: '',
};

const originalLogEvent =
  typeof window !== 'undefined' && typeof window.logEvent === 'function'
    ? window.logEvent
    : null;

function logEvent(...args) {
  if (typeof window === 'undefined') return;
  const candidate =
    typeof window.logEvent === 'function' && window.logEvent !== logEvent
      ? window.logEvent
      : originalLogEvent;
  if (typeof candidate === 'function' && candidate !== logEvent) {
    candidate.apply(window, args);
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

function gatherSourceCandidates(target, depth = 0, collected = [], visited = new WeakSet()) {
  if (depth > 3 || target == null) {
    return collected;
  }
  if (typeof target === 'object') {
    if (visited.has(target)) {
      return collected;
    }
    visited.add(target);
  }
  if (Array.isArray(target)) {
    target.forEach((item) => gatherSourceCandidates(item, depth + 1, collected, visited));
    return collected;
  }
  if (typeof target !== 'object') {
    collected.push(target);
    return collected;
  }

  METRIC_SOURCE_VALUE_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      collected.push(target[key]);
    }
  });

  METRIC_SOURCE_ARRAY_KEYS.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(target, key)) return;
    const value = target[key];
    if (Array.isArray(value)) {
      value.forEach((entry) => gatherSourceCandidates(entry, depth + 1, collected, visited));
    } else if (value && typeof value === 'object') {
      gatherSourceCandidates(value, depth + 1, collected, visited);
    } else if (value != null) {
      collected.push(value);
    }
  });

  METRIC_SOURCE_FLAG_KEYS.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(target, key)) return;
    const raw = target[key];
    if (raw === true || (typeof raw === 'string' && raw.toLowerCase() === 'true')) {
      collected.push('cache');
    }
  });

  METRIC_SOURCE_RECURSIVE_KEYS.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(target, key)) return;
    gatherSourceCandidates(target[key], depth + 1, collected, visited);
  });

  return collected;
}

function normalizeSourceToken(value) {
  if (value == null) return null;
  if (typeof value === 'boolean') {
    return value ? 'live' : null;
  }
  if (typeof value === 'number') {
    return null;
  }
  const text = String(value).trim();
  if (!text) return null;
  const normalized = text.toLowerCase();
  for (const hint of METRIC_SOURCE_HINTS) {
    if (hint.patterns.some((pattern) => pattern.test(normalized))) {
      return hint.token;
    }
  }
  if (normalized.includes('fallback') || normalized.includes('cache')) {
    return 'cache';
  }
  return null;
}

function resolveMetricSourceInfo(metricId, metricData = {}) {
  if (!metricData || typeof metricData !== 'object') {
    return { text: '', classNames: [], tokens: [], hasCache: false };
  }
  const collected = gatherSourceCandidates(metricData);
  const tokens = [];
  collected.forEach((entry) => {
    const token = normalizeSourceToken(entry);
    if (token && !tokens.includes(token)) {
      tokens.push(token);
    }
  });

  if (!tokens.length && metricId === 'ai_visibility') {
    if (metricData.fallback === true || String(metricData.fallback).toLowerCase() === 'true') {
      tokens.push('cache');
    }
  }

  if (!tokens.length) {
    return { text: '', classNames: [], tokens: [], hasCache: false };
  }

  const prioritized = METRIC_SOURCE_PRIORITY.filter((token) => tokens.includes(token));
  const others = tokens.filter((token) => !METRIC_SOURCE_PRIORITY.includes(token));
  const ordered = [...prioritized, ...others];

  const deduped = [];
  ordered.forEach((token) => {
    if (token === 'live' && ordered.includes('serpapi')) {
      return;
    }
    if (!deduped.includes(token)) {
      deduped.push(token);
    }
  });

  const labels = deduped
    .map((token) => {
      const hint = METRIC_SOURCE_HINTS.find((item) => item.token === token);
      return hint?.label || null;
    })
    .filter(Boolean);

  const classNames = deduped
    .map((token) => {
      const hint = METRIC_SOURCE_HINTS.find((item) => item.token === token);
      return hint?.className || null;
    })
    .filter(Boolean);

  if (!labels.length) {
    return { text: '', classNames: [], tokens: deduped, hasCache: deduped.includes('cache') };
  }

  return {
    text: labels.join(' / '),
    classNames: Array.from(new Set(classNames)),
    tokens: deduped,
    hasCache: deduped.includes('cache'),
  };
}

function formatRawValueDisplay(value, unit = '') {
  if (value == null || value === '') return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    const abs = Math.abs(value);
    let formatted;
    if (abs >= 100) {
      formatted = Math.round(value).toString();
    } else if (abs >= 10) {
      formatted = value.toFixed(1);
    } else if (abs >= 1) {
      formatted = value.toFixed(2);
    } else {
      formatted = value.toFixed(3);
    }
    formatted = formatted.replace(/\.?0+$/, '');
    if (formatted === '-0') {
      formatted = '0';
    }
    return unit ? `${formatted} ${unit}`.trim() : formatted;
  }
  const text = String(value).trim();
  if (!text) return '';
  return unit ? `${text} ${unit}`.trim() : text;
}

function normalizeRawCandidate(input, contextLabel = '', contextUnit = '') {
  if (input == null) return null;
  if (typeof input === 'number') {
    return { value: input, label: contextLabel, unit: contextUnit };
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      return { value: numeric, label: contextLabel, unit: contextUnit };
    }
    return { value: trimmed, label: contextLabel, unit: contextUnit };
  }
  if (Array.isArray(input)) {
    for (const entry of input) {
      const normalized = normalizeRawCandidate(entry, contextLabel, contextUnit);
      if (normalized) return normalized;
    }
    return null;
  }
  if (typeof input === 'object') {
    const nestedLabel =
      METRIC_RAW_LABEL_KEYS.map((key) => input[key]).find((value) => value != null && value !== '')
      || input.label
      || input.title
      || input.name
      || contextLabel;
    const nestedUnit =
      METRIC_RAW_UNIT_KEYS.map((key) => input[key]).find((value) => value != null && value !== '')
      || input.unit
      || input.unit_label
      || contextUnit;
    const valueKeys = ['value', 'score', 'raw', 'count', 'total', 'amount', 'current', 'actual', 'number'];
    for (const key of valueKeys) {
      if (Object.prototype.hasOwnProperty.call(input, key) && input[key] != null && input[key] !== '') {
        return { value: input[key], label: nestedLabel, unit: nestedUnit };
      }
    }
    if (typeof input.toString === 'function') {
      const textValue = input.toString();
      if (textValue && textValue !== '[object Object]') {
        return { value: textValue, label: nestedLabel, unit: nestedUnit };
      }
    }
  }
  return null;
}

function resolveMetricRawInfo(metricId, metricData = {}, scoreRaw) {
  if (!metricData || typeof metricData !== 'object') {
    return { text: '', value: null, unit: '', label: '' };
  }

  const visited = new WeakSet();
  const queue = [metricData];
  const fallbackLabel =
    METRIC_RAW_LABEL_KEYS.map((key) => metricData[key]).find((value) => value != null && value !== '') || '';
  const fallbackUnit =
    METRIC_RAW_UNIT_KEYS.map((key) => metricData[key]).find((value) => value != null && value !== '') || '';

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;
    if (visited.has(current)) continue;
    visited.add(current);

    const currentLabel =
      METRIC_RAW_LABEL_KEYS.map((key) => current[key]).find((value) => value != null && value !== '') || fallbackLabel;
    const currentUnit =
      METRIC_RAW_UNIT_KEYS.map((key) => current[key]).find((value) => value != null && value !== '') || fallbackUnit;

    for (const key of METRIC_RAW_VALUE_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(current, key)) continue;
      const candidate = current[key];
      const normalized = normalizeRawCandidate(candidate, currentLabel, currentUnit);
      if (!normalized) continue;

      const rawValue = normalized.value;
      if (scoreRaw != null) {
        const scoreNumber = Number(scoreRaw);
        const rawNumber = Number(rawValue);
        if (Number.isFinite(scoreNumber) && Number.isFinite(rawNumber) && Math.abs(scoreNumber - rawNumber) < 1e-6) {
          continue;
        }
      }

      const labelText = (normalized.label || currentLabel || fallbackLabel || '原始值').toString().replace(/[：:]\s*$/, '');
      const unitText = normalized.unit || currentUnit || fallbackUnit || '';
      const display = formatRawValueDisplay(rawValue, unitText);
      if (!display) continue;

      return {
        text: `${labelText}：${display}`,
        value: rawValue,
        unit: unitText,
        label: labelText,
      };
    }

    METRIC_RAW_NESTED_KEYS.forEach((nestedKey) => {
      if (!Object.prototype.hasOwnProperty.call(current, nestedKey)) return;
      const nestedValue = current[nestedKey];
      if (Array.isArray(nestedValue)) {
        nestedValue.forEach((entry) => queue.push(entry));
      } else if (nestedValue != null) {
        queue.push(nestedValue);
      }
    });
  }

  return { text: '', value: null, unit: '', label: '' };
}

function prepareMetricDisplay(metricId, metricData = null) {
  const definition = resolveMetricDefinition(metricId);
  const scoreRaw = parseMetricScore(metricData);
  const stateKey = scoreRaw != null ? determineMetricState(scoreRaw) : null;
  const definitionState = stateKey && definition.states ? definition.states[stateKey] : null;
  const preset = stateKey ? METRIC_STATE_PRESETS[stateKey] : null;
  const label = metricData?.label || definition.label;
  const hintText = metricData?.hint || metricData?.description || definitionState?.hint || preset?.hint || definition.defaultHint;
  const stateLabel = metricData?.state_label || definitionState?.label || preset?.label || (stateKey ? stateKey.toUpperCase() : '整理中');
  const iconMap = definition.icons || {};
  const iconValue = metricData?.icon || definitionState?.icon || preset?.icon || iconMap[stateKey] || iconMap.default;
  const unit = metricData?.unit || definition.unit || '';
  const scoreDisplay = metricData?.display_score || formatMetricScore(scoreRaw, unit);
  const sourceInfo = resolveMetricSourceInfo(metricId, metricData);
  const rawInfo = resolveMetricRawInfo(metricId, metricData, scoreRaw);

  return {
    label,
    hintText,
    stateLabel,
    iconValue,
    unit,
    scoreDisplay,
    scoreRaw,
    stateKey,
    sourceInfo,
    rawInfo,
  };
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

const METRIC_TIMESTAMP_SUFFIXES = ['checked_at', 'updated_at', 'last_checked_at', 'refreshed_at'];

function parseTimestampValue(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 1e12) {
      return new Date(value);
    }
    if (value > 1e9) {
      return new Date(value * 1000);
    }
  }
  const text = String(value).trim();
  if (!text) return null;
  const normalized = text.replace(/\s+/g, ' ');
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
}

function extractTimestampFromEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const candidates = [];
  METRIC_TIMESTAMP_SUFFIXES.forEach((suffix) => {
    if (entry[suffix]) {
      candidates.push(entry[suffix]);
    }
  });
  if (entry.timestamp) candidates.push(entry.timestamp);
  if (entry.ts) candidates.push(entry.ts);
  if (Array.isArray(entry.timestamps)) {
    candidates.push(...entry.timestamps);
  }
  if (entry.metadata && typeof entry.metadata === 'object') {
    METRIC_TIMESTAMP_SUFFIXES.forEach((suffix) => {
      if (entry.metadata[suffix]) {
        candidates.push(entry.metadata[suffix]);
      }
    });
  }
  if (entry.value && (typeof entry.value === 'string' || typeof entry.value === 'number')) {
    candidates.push(entry.value);
  }
  for (const candidate of candidates) {
    const parsed = parseTimestampValue(candidate);
    if (parsed) return parsed;
  }
  return null;
}

function resolveMetricTimestamp(metricId, map) {
  const direct = extractTimestampFromEntry(map[metricId]);
  if (direct) return direct;
  for (const suffix of METRIC_TIMESTAMP_SUFFIXES) {
    const altEntry = map[`${metricId}_${suffix}`];
    const fallback = extractTimestampFromEntry(altEntry);
    if (fallback) return fallback;
  }
  return null;
}

function formatRelativeTimestamp(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs)) return '';
  const delta = diffMs < 0 ? 0 : diffMs;
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return '更新於 1 分鐘內';
  if (minutes < 60) return `更新於 ${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `更新於 ${hours} 小時前`;
  const days = Math.floor(hours / 24);
  return `更新於 ${days} 天前`;
}

function getMetricTimestamp(metricId, metricData) {
  const stored = state.metricTimestamps?.[metricId];
  if (stored) return stored;
  return extractTimestampFromEntry(metricData);
}

function renderMetricCard(metricId, metricData = null) {
  const cards = document.querySelectorAll(`.metric-card[data-metric="${metricId}"]`);
  if (!cards.length) return;

  const presentation = prepareMetricDisplay(metricId, metricData);
  const timestamp = getMetricTimestamp(metricId, metricData);

  cards.forEach((card) => {
    card.classList.remove('metric-card--source-serpapi', 'metric-card--source-live', 'metric-card--source-cache');
    applyMetricStateClass(card, presentation.stateKey);
    const iconEl = card.querySelector('.metric-card__icon');
    if (iconEl && presentation.iconValue) {
      iconEl.textContent = presentation.iconValue;
    }
    const labelEl = card.querySelector('.metric-card__label');
    if (labelEl) {
      labelEl.textContent = presentation.label;
    }
    const scoreEl = card.querySelector('[data-role="score"]');
    if (scoreEl) {
      scoreEl.textContent = presentation.scoreDisplay;
    }
    const stateEl = card.querySelector('[data-role="state"]');
    if (stateEl) {
      stateEl.textContent = presentation.scoreRaw == null ? '整理中' : presentation.stateLabel;
    }
    const hintEl = card.querySelector('[data-role="hint"]');
    if (hintEl) {
      hintEl.textContent = presentation.hintText;
    }
    const sourceEl = card.querySelector('[data-role="source"]');
    if (sourceEl) {
      if (presentation.sourceInfo.text) {
        sourceEl.textContent = presentation.sourceInfo.text;
        sourceEl.hidden = false;
      } else {
        sourceEl.hidden = true;
      }
    }
    const rawEl = card.querySelector('[data-role="raw"]');
    if (rawEl) {
      if (presentation.rawInfo.text) {
        rawEl.textContent = presentation.rawInfo.text;
        rawEl.hidden = false;
      } else {
        rawEl.hidden = true;
      }
    }
    const updatedEl = card.querySelector('[data-role="updated"]');
    if (updatedEl) {
      if (timestamp) {
        const relative = formatRelativeTimestamp(timestamp);
        if (relative) {
          updatedEl.textContent = relative;
          updatedEl.hidden = false;
        } else {
          updatedEl.hidden = true;
        }
      } else {
        updatedEl.hidden = true;
      }
    }
    if (Array.isArray(presentation.sourceInfo.classNames) && presentation.sourceInfo.classNames.length) {
      presentation.sourceInfo.classNames.forEach((className) => {
        if (className) {
          card.classList.add(className);
        }
      });
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
  state.metricTimestamps = {};

  Object.keys(METRIC_DEFINITIONS).forEach((metricId) => {
    const resolvedTimestamp = resolveMetricTimestamp(metricId, map);
    if (resolvedTimestamp) {
      state.metricTimestamps[metricId] = resolvedTimestamp;
    }
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
  const placeholder = Boolean(item.placeholder || item.is_placeholder || item.isPlaceholder);
  const actionUrl = item.url || item.link || item.action_url;
  return { title, detail, actionUrl, placeholder };
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
          const emptyMessage = state.isPartialResult ? config.partialEmptyText || config.emptyText : config.emptyText;
          emptyEl.textContent = emptyMessage;
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
        if (normalized.placeholder) {
          li.classList.add('task-item--placeholder');
        }
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
        if (normalized.actionUrl && !normalized.placeholder) {
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
  const messages = extractWarningMessages(warnings);
  if (!messages.length) {
    els.resultWarning.hidden = true;
    els.resultWarningText.textContent = '';
    return;
  }
  els.resultWarning.hidden = false;
  els.resultWarningText.textContent = messages.join('、');
}

function normalizeWarningEntry(entry, index = 0) {
  if (entry == null) return null;
  if (typeof entry === 'string') {
    const text = entry.trim();
    if (!text) return null;
    return {
      text,
      code: text.toLowerCase().replace(/\s+/g, '_'),
      index,
    };
  }
  if (typeof entry === 'object') {
    const text = String(
      entry.text
        || entry.message
        || entry.description
        || entry.detail
        || entry.note
        || entry.title
        || '',
    ).trim();
    const code = String(entry.code || entry.id || entry.type || '').trim().toLowerCase();
    if (!text && !code) return null;
    return {
      ...entry,
      text: text || code || '',
      code,
      index,
    };
  }
  return null;
}

function ensureWarningObjects(warnings = []) {
  if (!warnings) return [];
  const source = Array.isArray(warnings) ? warnings : [warnings];
  const normalized = [];
  source.forEach((entry, idx) => {
    if (entry && typeof entry === 'object' && 'text' in entry) {
      const text = String(entry.text || '').trim();
      const code = entry.code ? String(entry.code).trim().toLowerCase() : '';
      if (text || code) {
        normalized.push({ ...entry, text, code, index: idx });
      }
      return;
    }
    const normalizedEntry = normalizeWarningEntry(entry, idx);
    if (normalizedEntry) {
      normalized.push(normalizedEntry);
    }
  });
  const dedup = new Map();
  normalized.forEach((item) => {
    const key = `${item.code || ''}|${item.text || ''}`;
    if (!dedup.has(key)) {
      dedup.set(key, item);
    }
  });
  return Array.from(dedup.values());
}

function extractWarningMessages(warnings = []) {
  return ensureWarningObjects(warnings)
    .map((entry) => {
      if (entry.text) return entry.text;
      const code = (entry.code || '').toLowerCase();
      if (code.includes('fallback')) {
        return '部分欄位以 Live fallback 顯示，資料補齊中。';
      }
      return '';
    })
    .filter(Boolean);
}

function hasLiveFallbackWarning(warnings = []) {
  return ensureWarningObjects(warnings).some((entry) => {
    const code = (entry.code || '').toLowerCase();
    const text = (entry.text || '').toLowerCase();
    return code.includes('fallback') || text.includes('live fallback') || text.includes('fallback');
  });
}

function normalizePartialCards(input) {
  if (!input) return [];
  const rawList = [];
  if (Array.isArray(input)) {
    rawList.push(...input);
  } else if (typeof input === 'object') {
    if (Array.isArray(input.items)) {
      rawList.push(...input.items);
    }
    Object.entries(input).forEach(([key, value]) => {
      if (key === 'items') return;
      if (Array.isArray(value)) {
        rawList.push(...value);
        return;
      }
      if (value && typeof value === 'object') {
        rawList.push({ id: value.id || key, ...value });
      } else {
        rawList.push({ id: key, title: String(value) });
      }
    });
  } else if (typeof input === 'string') {
    rawList.push({ title: input });
  }

  const normalized = [];
  rawList.forEach((item, index) => {
    if (item == null) return;
    if (typeof item === 'string') {
      const text = item.trim();
      if (!text) return;
      normalized.push({
        id: `card_${index}`,
        title: text,
        description: '',
      });
      return;
    }
    const title = item.title || item.heading || item.name || '';
    const description = item.description || item.detail || item.text || item.body || '';
    const icon = item.icon || item.emoji || '';
    const badge = item.badge || item.tag || '';
    const items = Array.isArray(item.items)
      ? item.items
          .map((entry) => {
            if (typeof entry === 'string') return entry;
            if (entry && typeof entry === 'object') {
              return entry.title || entry.text || entry.description || entry.detail || '';
            }
            return '';
          })
          .filter(Boolean)
      : [];
    if (!title && !description && !items.length) return;
    normalized.push({
      id: item.id || item.key || `card_${index}`,
      title: title || '進度說明',
      description,
      icon,
      badge,
      items,
    });
  });

  const dedup = new Map();
  normalized.forEach((card) => {
    const key = card.id || card.title;
    if (!dedup.has(key)) {
      dedup.set(key, card);
    }
  });
  return Array.from(dedup.values());
}

function renderPartialOverview(cards = []) {
  if (!els.partialOverview || !els.partialOverviewList) return;
  if (!state.isPartialResult) {
    els.partialOverview.hidden = true;
    els.partialOverviewList.innerHTML = '';
    return;
  }

  const normalized = normalizePartialCards(cards);
  const dataset = normalized.length ? normalized : DEFAULT_PARTIAL_CARDS;

  els.partialOverview.hidden = false;
  els.partialOverviewList.innerHTML = '';

  dataset.forEach((card) => {
    if (!card || typeof card !== 'object') return;
    const article = document.createElement('article');
    article.className = 'partial-card';
    if (card.icon) {
      const iconEl = document.createElement('div');
      iconEl.className = 'partial-card__icon';
      iconEl.textContent = card.icon;
      article.appendChild(iconEl);
    }

    const bodyEl = document.createElement('div');
    bodyEl.className = 'partial-card__body';

    const titleEl = document.createElement('h4');
    titleEl.textContent = card.title || '進度說明';
    bodyEl.appendChild(titleEl);

    if (card.badge) {
      const badgeEl = document.createElement('span');
      badgeEl.className = 'partial-card__badge';
      badgeEl.textContent = card.badge;
      bodyEl.appendChild(badgeEl);
    }

    if (card.description) {
      const descEl = document.createElement('p');
      descEl.textContent = card.description;
      bodyEl.appendChild(descEl);
    }

    if (Array.isArray(card.items) && card.items.length) {
      const listEl = document.createElement('ul');
      listEl.className = 'partial-card__list';
      card.items.forEach((itemText) => {
        const text = String(itemText || '').trim();
        if (!text) return;
        const li = document.createElement('li');
        li.textContent = text;
        listEl.appendChild(li);
      });
      if (listEl.children.length) {
        bodyEl.appendChild(listEl);
      }
    }

    article.appendChild(bodyEl);
    els.partialOverviewList.appendChild(article);
  });
}

function setPartialResultMode(enabled, context = {}) {
  const warnings = context.warnings || state.warnings;
  const liveFallback = enabled ? hasLiveFallbackWarning(warnings) : false;
  const noticeFromContext = context.notice || state.partialNotice || '';
  const partialNotice = noticeFromContext || (liveFallback ? PARTIAL_LIVE_FALLBACK_TEXT : PARTIAL_NOTICE_TEXT);

  state.isPartialResult = enabled;

  if (enabled) {
    if (noticeFromContext) {
      state.partialNotice = noticeFromContext;
    }
  } else {
    state.partialCards = [];
    state.partialNotice = '';
  }

  if (els.resultPartialText) {
    els.resultPartialText.textContent = partialNotice;
  }

  if (els.resultPartial) {
    els.resultPartial.hidden = !enabled;
  }

  if (els.ctaReport) {
    if (state.defaultReportCtaText == null) {
      const resolvedText = els.ctaReport.textContent && els.ctaReport.textContent.trim();
      state.defaultReportCtaText = resolvedText || REPORT_CTA_READY_TEXT;
    }
    els.ctaReport.disabled = false;
    els.ctaReport.textContent = enabled ? REPORT_CTA_PARTIAL_TEXT : state.defaultReportCtaText || REPORT_CTA_READY_TEXT;
  }

  if (enabled) {
    let cardsToRender = state.partialCards;
    if (context.partialCards !== undefined) {
      const normalizedCards = normalizePartialCards(context.partialCards);
      state.partialCards = normalizedCards;
      cardsToRender = normalizedCards;
    }
    renderPartialOverview(cardsToRender);
  } else {
    renderPartialOverview([]);
  }
}

function stopTransitionCountdown() {
  if (state.transitionId) {
    clearInterval(state.transitionId);
    state.transitionId = null;
  }
  if (state.transitionCompleteTimeout) {
    clearTimeout(state.transitionCompleteTimeout);
    state.transitionCompleteTimeout = null;
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
  state.transitionCompleteShown = false;
  updateTransitionCounter();
  if (els.transitionTip) {
    els.transitionTip.textContent = 'AI 正在準備詳細分析…';
    els.transitionTip.classList.remove('transition-tip--complete');
  }
  const transitionPanel = els.stages?.s1?.querySelector('.stage-panel--transition');
  if (transitionPanel) {
    transitionPanel.classList.remove('stage-panel--complete');
  }
  state.transitionId = setInterval(() => {
    state.transitionRemaining -= 1;
    if (state.transitionRemaining <= 0) {
      state.transitionRemaining = 0;
      updateTransitionCounter();
      stopTransitionCountdown();
      completeTransitionPreview();
      return;
    }
    updateTransitionCounter();
  }, 1000);
}

function completeTransitionPreview() {
  if (state.transitionCompleteShown) return;
  state.transitionCompleteShown = true;
  if (els.transitionTip) {
    els.transitionTip.textContent = TRANSITION_COMPLETE_MESSAGE;
    els.transitionTip.classList.add('transition-tip--complete');
  }
  const transitionPanel = els.stages?.s1?.querySelector('.stage-panel--transition');
  if (transitionPanel) {
    transitionPanel.classList.add('stage-panel--complete');
  }
  state.transitionCompleteTimeout = setTimeout(() => {
    state.transitionCompleteTimeout = null;
    if (state.stage === 's1') {
      setStage('s2');
    }
  }, TRANSITION_COMPLETE_DELAY_MS);
}

function stopAnalysisCountdown() {
  if (state.analysisCountdownId) {
    clearInterval(state.analysisCountdownId);
    state.analysisCountdownId = null;
  }
  if (state.analysisCountdownFrameId && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(state.analysisCountdownFrameId);
    state.analysisCountdownFrameId = null;
  }
  if (state.analysisTipId) {
    clearInterval(state.analysisTipId);
    state.analysisTipId = null;
  }
  state.analysisRemaining = 0;
  state.analysisTipIndex = 0;
  state.analysisCountdownActive = false;
  if (els.analysisTimer) {
    els.analysisTimer.hidden = false;
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
  state.analysisCountdownActive = true;
  state.analysisCountdownCompleted = false;
  state.postCountdownNotified = false;
  state.resultActivatedFromCountdown = false;
  const deadline = Date.now() + ANALYSIS_COUNTDOWN_SECONDS * 1000;
  if (els.analysisTimer) {
    els.analysisTimer.hidden = false;
  }
  if (els.analysisTip) {
    els.analysisTip.textContent = ANALYSIS_TIPS[0];
  }
  updateAnalysisCountdown();

  const finalize = () => {
    state.analysisRemaining = 0;
    updateAnalysisCountdown();
    stopAnalysisCountdown();
    state.analysisCountdownActive = false;
    state.analysisCountdownFrameId = null;
    finalizeAnalysisCountdown('timer');
  };

  const tick = () => {
    const remainingMs = Math.max(0, deadline - Date.now());
    state.analysisRemaining = Math.ceil(remainingMs / 1000);
    updateAnalysisCountdown();
    if (remainingMs <= 0) {
      finalize();
      return;
    }
    state.analysisCountdownFrameId = requestAnimationFrame(tick);
  };

  if (typeof requestAnimationFrame === 'function') {
    state.analysisCountdownFrameId = requestAnimationFrame(tick);
  } else {
    state.analysisCountdownId = setInterval(() => {
      state.analysisRemaining = Math.max(0, state.analysisRemaining - 1);
      updateAnalysisCountdown();
      if (state.analysisRemaining <= 0) {
        clearInterval(state.analysisCountdownId);
        state.analysisCountdownId = null;
        finalize();
      }
    }, 1000);
  }

  if (ANALYSIS_TIPS.length > 1) {
    state.analysisTipId = setInterval(() => {
      rotateAnalysisTip();
    }, 9000);
  }
}


function showPostCountdownMessage() {
  if (state.postCountdownNotified) return;
  state.postCountdownNotified = true;
  if (els.analysisDescription) {
    els.analysisDescription.textContent = POST_COUNTDOWN_MESSAGE;
  }
  if (!state.partialNotice) {
    state.partialNotice = POST_COUNTDOWN_MESSAGE;
  }
  if (state.isPartialResult) {
    setPartialResultMode(true, {
      warnings: state.warnings,
      notice: state.partialNotice,
      partialCards: state.partialCards,
    });
  }
}

function activateResultStageFromCountdown() {
  if (state.stage !== 's2') return;
  setStage('s4');
  state.resultActivatedFromCountdown = true;
  const notice = state.partialNotice || POST_COUNTDOWN_MESSAGE;
  setPartialResultMode(true, {
    warnings: state.warnings,
    notice,
    partialCards: state.partialCards,
  });
  updateResultWarning(state.warnings);
  const metricsDataset = state.metricsRaw ?? state.metricsList ?? [];
  renderMetricsCards(metricsDataset);
  renderTasks(state.tasks);
}

function finalizeAnalysisCountdown(reason = 'timer') {
  if (state.analysisCountdownCompleted) return;
  state.analysisCountdownCompleted = true;
  showPostCountdownMessage();
  if (reason === 'timer' && state.stage === 's2') {
    activateResultStageFromCountdown();
  }
}

function clearPollingInterval() {
  if (state.pollTimer !== null) {
    clearTimeout(state.pollTimer);
  }
  state.pollTimer = null;
  if (state.pollDebounceId) {
    clearTimeout(state.pollDebounceId);
    state.pollDebounceId = null;
  }
}

function clearAnalysisTimeout() {
  if (state.timeoutId) {
    clearTimeout(state.timeoutId);
    state.timeoutId = null;
  }
}

function stopPolling() {
  clearPollingInterval();
  clearAnalysisTimeout();
}

function startPolling() {
  stopPolling();
  const poll = async () => {
    if (!endpoints.analysisStatus || !state.leadId) return;
    try {
      const url = new URL(endpoints.analysisStatus);
      url.searchParams.set('lead_id', state.leadId);
      url.searchParams.set('_', Date.now().toString());
      const payload = await requestJSON(url.toString(), { method: 'GET' });
      handleStatusResponse(payload);
    } catch (error) {
      console.warn('[analysis-status]', error.message || error);
    } finally {
      if (state.pollTimer !== null) {
        clearTimeout(state.pollTimer);
        state.pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }
  };
  state.pollTimer = setTimeout(() => {}, 0); // kick off timer chain
  if (state.pollDebounceId) {
    clearTimeout(state.pollDebounceId);
    state.pollDebounceId = null;
  }
  poll();
  state.timeoutId = setTimeout(() => {
    if (state.stage !== 's4' && state.stage !== 's5') {
      triggerTimeout({ reason: 'timeout' });
    }
  }, ANALYSIS_TIMEOUT_MS);
}

function setStage(nextStage) {
  if (state.stage === nextStage) return;
  const previousStage = state.stage;
  state.stage = nextStage;
  Object.entries(els.stages).forEach(([key, element]) => {
    if (!element) return;
    const active = key === nextStage;
    element.hidden = !active;
    element.classList.toggle('stage--active', active);
  });

  if (nextStage === 's2') {
    startAnalysisCountdown();
  } else if (previousStage === 's2') {
    stopAnalysisCountdown();
    if (!state.resultActivatedFromCountdown) {
      state.analysisCountdownCompleted = false;
    }
  }

  if (nextStage !== 's1') {
    stopTransitionCountdown();
    if (els.transitionTip) {
      els.transitionTip.classList.remove('transition-tip--complete');
    }
    const transitionPanel = els.stages?.s1?.querySelector('.stage-panel--transition');
    if (transitionPanel) {
      transitionPanel.classList.remove('stage-panel--complete');
    }
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

  if (state.submitLocked) {
    showToast('AI 正在檢測中，請稍候完成結果。');
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
  state.metricTimestamps = {};
  state.analysisCountdownActive = false;
  state.analysisCountdownCompleted = false;
  state.postCountdownNotified = false;
  state.resultActivatedFromCountdown = false;
  setPartialResultMode(false);
  renderMetricsCards([]);
  renderTasks({});
  syncLinks();
  setStage('s1');
  startTransitionCountdown();
  startPolling();
  state.submitLocked = true;

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
    state.submitLocked = false;
  } finally {
    // 持續鎖定按鈕，待流程完成或超時時再釋放
  }
}

function applyStatusHints(stage = '') {
  const hint = STATUS_HINTS[stage] || STATUS_HINTS.collecting;
  if (!state.postCountdownNotified && els.analysisDescription) {
    els.analysisDescription.textContent = hint;
  }
  if (stage && els.analysisTip) {
    if (!state.postCountdownNotified || els.analysisTip.textContent.includes('AI 正在')) {
      els.analysisTip.textContent = hint;
    }
  }
}

function handleAnalysisCompleted(context = {}) {
  const isPartial = Boolean(context.partial);
  state.submitLocked = false;
  stopAnalysisCountdown();
  finalizeAnalysisCountdown('analysis_completed');
  clearAnalysisTimeout();
  if (!isPartial) {
    stopPolling();
  }

  const noticeInput = typeof context.notice === 'string' ? context.notice : '';
  const mergedNotice = noticeInput || state.partialNotice || (isPartial ? POST_COUNTDOWN_MESSAGE : '');
  const mergedWarnings = context.warnings || state.warnings;
  const mergedContext = {
    ...context,
    warnings: mergedWarnings,
    notice: mergedNotice,
  };
  if (context.partialCards === undefined && state.partialCards) {
    mergedContext.partialCards = state.partialCards;
  }

  setStage('s4');
  setPartialResultMode(isPartial, mergedContext);
  showPostCountdownMessage();
  updateResultWarning(mergedWarnings);
  renderMetricsCards(state.metricsRaw);
  renderTasks(state.tasks);
  if (context.report_url) {
    state.reportUrlOverride = context.report_url;
  }
}

function triggerTimeout(context = {}) {
  clearAnalysisTimeout();
  setStage('s5');
  setPartialResultMode(false);
  state.submitLocked = false;
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

const STAGE_PRIORITY_MAP = {
  s0: 0,
  scheduled: 0,
  s1: 1,
  collecting: 1,
  s2: 2,
  processing: 2,
  analyzing: 2,
  s3: 3,
  partial: 3,
  ready_partial: 3,
  partial_ready: 3,
  s4: 4,
  ready: 4,
  complete: 4,
  completed: 4,
  s5: 5,
  timeout: 5,
};

function resolveStagePriority(value) {
  if (value === undefined || value === null) return -1;
  const text = String(value).trim().toLowerCase();
  if (!text) return -1;
  if (Object.prototype.hasOwnProperty.call(STAGE_PRIORITY_MAP, text)) {
    return STAGE_PRIORITY_MAP[text];
  }
  const fallback = text.startsWith('s') ? text : `s${text}`;
  if (Object.prototype.hasOwnProperty.call(STAGE_PRIORITY_MAP, fallback)) {
    return STAGE_PRIORITY_MAP[fallback];
  }
  return -1;
}

function handleStatusResponse(payload) {
  if (!payload || typeof payload !== 'object') return;
  if (payload.lead_id && payload.lead_id !== state.leadId) return;

  const metricsPayload = payload.metrics ?? payload.partial_metrics ?? payload.partial?.metrics;
  if (metricsPayload !== undefined) {
    renderMetricsCards(metricsPayload);
  }

  const tasksPayload = payload.tasks ?? payload.partial_tasks ?? payload.partial?.tasks;
  if (tasksPayload !== undefined) {
    renderTasks(tasksPayload || {});
  } else if (payload.guardian_placeholders) {
    renderTasks(payload.guardian_placeholders);
  }

  let warningsExplicit = false;
  const warningsInput = [];
  if ('warnings' in payload) {
    warningsExplicit = true;
    const value = payload.warnings;
    if (value != null) {
      if (Array.isArray(value)) {
        warningsInput.push(...value);
      } else {
        warningsInput.push(value);
      }
    }
  }
  if (payload.partial && typeof payload.partial === 'object' && 'warnings' in payload.partial) {
    warningsExplicit = true;
    const value = payload.partial.warnings;
    if (value != null) {
      if (Array.isArray(value)) {
        warningsInput.push(...value);
      } else {
        warningsInput.push(value);
      }
    }
  }
  if (warningsExplicit) {
    state.warnings = ensureWarningObjects(warningsInput);
    updateResultWarning(state.warnings);
  }

  if (payload.report_token) {
    state.reportToken = payload.report_token;
  } else if (payload.report?.token) {
    state.reportToken = payload.report.token;
  }
  if (payload.report_url) {
    state.reportUrlOverride = payload.report_url;
  }

  const partialCardsCandidate =
    payload.partial_cards
    ?? payload.partialCards
    ?? payload.partial_overview
    ?? payload.partialOverview
    ?? payload.partial?.cards
    ?? payload.partial?.overview;
  if (partialCardsCandidate !== undefined) {
    state.partialCards = normalizePartialCards(partialCardsCandidate);
  }

  const partialNoticeCandidate = payload.partial_notice
    ?? payload.partialNotice
    ?? (payload.partial && payload.partial.notice);
  if (partialNoticeCandidate !== undefined) {
    state.partialNotice = partialNoticeCandidate ? String(partialNoticeCandidate) : '';
  }

  const statusValue = String(payload.status || payload.state || '').toLowerCase();
  const stageValue = String(payload.stage || '').toLowerCase();
  const incomingStageKey = stageValue || statusValue;
  const incomingPriority = resolveStagePriority(incomingStageKey);
  const currentPriority = resolveStagePriority(state.stage);
  if (incomingPriority >= 0 && currentPriority >= 0 && incomingPriority < currentPriority) {
    logEvent('stage_guard_skip', {
      lead_id: state.leadId || '',
      current_stage: state.stage,
      incoming_stage: incomingStageKey,
      current_priority: currentPriority,
      incoming_priority: incomingPriority,
    });
    return;
  }
  const shouldActivateAnalysis = ['collecting', 'processing', 'analyzing'].includes(stageValue) || statusValue === 'pending';

  if (shouldActivateAnalysis) {
    if (state.stage !== 's2') {
      setStage('s2');
    } else if (!state.analysisCountdownActive && !state.analysisCountdownCompleted) {
      startAnalysisCountdown();
    }
  }

  applyStatusHints(stageValue);

  if (stageValue === 'scheduled' || stageValue === 'timeout' || statusValue === 'timeout') {
    triggerTimeout({ stage: stageValue, reason: statusValue, warnings: state.warnings, report_url: payload.report_url });
    return;
  }

  const isPartial = statusValue === 'partial' || statusValue === 'ready_partial' || stageValue === 'partial' || stageValue === 'ready_partial';
  const isComplete = statusValue === 'ready' || statusValue === 'complete' || stageValue === 'ready' || stageValue === 'complete';

  if (isPartial) {
    handleAnalysisCompleted({
      warnings: state.warnings,
      report_url: payload.report_url,
      partial: true,
      partialCards: state.partialCards,
      notice: state.partialNotice,
    });
    return;
  }

  if (isComplete) {
    handleAnalysisCompleted({ warnings: state.warnings, report_url: payload.report_url, partial: false });
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
  const resolveFallbackLink = (result) =>
    result?.fallback_url
    || config.guardianFallbackUrl
    || config.assistantFallbackUrl
    || config.trialUrl
    || config.checkoutPrimaryUrl
    || config.checkoutSecondaryUrl
    || '';
  const openAssistantLink = (url, message, appendLeadId = true) => {
    if (!url) return false;
    const target = appendLeadId ? buildUrlWithParams(url, { lead_id: state.leadId || undefined }) : url;
    if (message) {
      showToast(message, 2000);
    }
    window.open(target, '_blank', 'noopener');
    return true;
  };
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
      const fallbackLink = resolveFallbackLink(result);
      openAssistantLink(fallbackLink, '改用 LINE 守護專家入口…');
      return;
    }
    const assistantLink =
      result?.assistant_url
      || result?.assistantUrl
      || result?.chat_url
      || result?.chatUrl
      || result?.line_url
      || result?.lineUrl
      || result?.url
      || '';
    if (assistantLink) {
      openAssistantLink(assistantLink, '已同步守護專家，開啟對話中…', false);
      return;
    }
    const fallbackAssistantLink = resolveFallbackLink(result);
    if (openAssistantLink(fallbackAssistantLink, '已同步守護專家，使用 LINE 守護專家入口…')) {
      return;
    }
    if (result?.report_url || state.reportUrlOverride || reportUrlBase) {
      showToast('已同步守護專家，開啟報表中…', 1800);
      openReport(result?.report_url);
      return;
    }
    showToast('已同步守護專家，稍後將於 LINE 推送通知。', 2200);
  } catch (error) {
    console.error('[assistant-entry]', error);
    showToast(`同步失敗：${error.message}`);
    const fallbackLink = resolveFallbackLink();
    openAssistantLink(fallbackLink, '改用 LINE 守護專家入口…');
  } finally {
    if (els.ctaSecondary) {
      els.ctaSecondary.disabled = false;
      els.ctaSecondary.classList.remove('btn--loading');
    }
  }
}

function openReport(customUrl) {
  const base = customUrl || state.reportUrlOverride || reportUrlBase;
  if (!base) {
    showToast('報告尚未生成，請稍後再試。');
    return;
  }
  const target = buildUrlWithParams(base, {
    lead_id: state.leadId,
    token: state.reportToken,
  });
  if (state.isPartialResult) {
    showToast('速查版報告已備妥，完整資料將持續更新。', 3200);
  }
  const opened = window.open(target, '_blank');
  if (!opened) {
    window.location.assign(target);
  }
}

function returnHome() {
  window.location.href = formUrl;
  state.submitLocked = false;
}

function handleReportButtonClick(event) {
  if (event) {
    event.preventDefault();
  }
  const stagePriority = resolveStagePriority(state.stage);
  const readyPriority = resolveStagePriority('s4');
  if (stagePriority < readyPriority && !state.reportUrlOverride) {
    focusOnDetails();
    return;
  }
  if (!state.leadId && !state.reportToken) {
    focusOnDetails();
    return;
  }
  openReport();
}

function focusOnDetails() {
  if (state.stage === 's4') {
    const target = document.getElementById('result-metric-board');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      return;
    }
  } else if (state.stage === 's2') {
    const target = document.getElementById('analysis-metric-board');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      return;
    }
  } else if (state.stage === 's5') {
    showToast('資料補齊中，完成後會推送通知。');
    return;
  } else if (state.stage === 's1') {
    showToast('倒數結束後會立即顯示速查指標，請稍候。');
    return;
  } else if (state.stage === 's0') {
    showToast('請先填寫門市資料啟動速查流程。');
    return;
  }
  const fallbackTarget = document.getElementById('analysis-metric-board') || document.getElementById('result-metric-board');
  if (fallbackTarget) {
    fallbackTarget.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    return;
  }
  showToast('速查詳情整理中，請稍候。');
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
    els.ctaReport.addEventListener('click', handleReportButtonClick);
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
  setPartialResultMode(false);
  renderMetricsCards([]);
  renderTasks({});
  updateResultWarning([]);
  syncLinks();
  if (els.analysisTimer) {
    els.analysisTimer.hidden = true;
  }
}

bootstrap();
