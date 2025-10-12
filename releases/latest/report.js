(function initReportPage() {
  const params = new URLSearchParams(window.location.search);
  const config = window.STAR_ENGINE_CONFIG || {};

  const reportEndpoint = config.reportEndpoint
    || config.reportDataUrl
    || config.report_data_url
    || 'https://chelov134999.app.n8n.cloud/webhook/report-data';
  const assistantEntryUrl = config.assistantEntryUrl || config.assistant_entry_url || '';
  const lineFallbackUrl = config.lineFallbackUrl || config.trialUrl || config.trial_url || 'https://line.me/R/ti/p/@star-up';
  const reportUrlBase = config.reportUrl || config.report_url || 'report.html';
  const formUrl = config.formUrl || config.form_url || 'index.html';

  const ANALYSIS_TIPS = [
    'AI 正在同步評論、曝光與守護任務…',
    '若資料偏多，系統會自動補齊後推播提醒。',
  ];
  const KPI_IDS = ['schema_score', 'ai_visibility_score', 'review_health_score'];

  const STATE_BADGES = {
    good: { label: '良好', emoji: '🟢' },
    watch: { label: '注意', emoji: '⚠️' },
    risk: { label: '危機', emoji: '🚨' },
    unknown: { label: '整理中', emoji: '…' },
  };

  const SOURCE_LABEL_OVERRIDES = {
    dataforseo_live: 'DataForSEO Live',
    dataforseo_cached: 'DataForSEO Cache',
    dataforseo_cache: 'DataForSEO Cache',
    dataforseo_queue: 'DataForSEO Queue',
    serpapi: 'SerpAPI',
    liff: 'LIFF',
    live: 'Live',
    cache: 'Cache',
    partial: 'Partial',
    ready: 'Ready',
    supabase: 'Supabase',
    grid_guard: 'Grid Guard',
  };

  const METRIC_DEFINITIONS = {
    schema_score: {
      label: 'Schema 結構化',
      unit: '分',
      defaultHint: 'AI 正在補齊 Schema 與結構化欄位資料。',
      thresholds: { good: 80, watch: 60 },
      hints: {
        good: 'Schema 已達標，持續維持資料更新即可。',
        watch: '建議補齊 FAQ／營業資訊欄位。',
        risk: 'Schema 未達啟用門檻，需優先補件。',
      },
    },
    ai_visibility_score: {
      label: 'AI 可見度',
      unit: '分',
      defaultHint: 'AI 正在比對曝光、搜尋與競品關鍵字。',
      thresholds: { good: 75, watch: 55 },
      hints: {
        good: 'AI 可見度穩定，維持品牌敘事節奏。',
        watch: '建議補強熱門搜尋節點與敘事。',
        risk: '可見度不足，請優先安排守護專家介入。',
      },
    },
    review_health_score: {
      label: '評論健康',
      unit: '分',
      defaultHint: 'AI 正在整理低星評論與回覆節奏。',
      thresholds: { good: 78, watch: 60 },
      hints: {
        good: '評論節奏良好，持續追蹤回覆率。',
        watch: '回覆率或新評小幅下降，建議補強守護任務。',
        risk: '評論健康亮紅燈，請立即處理低星與未回覆評論。',
      },
    },
  };

  const TASK_SECTION_CONFIG = {
    guardian: { emptyText: 'AI 正在整理守護三步驟。' },
    collection: { emptyText: '補件清單整理中，稍後指引你補齊缺漏。' },
    risk_reviews: { emptyText: '目前沒有需要立即補救的評論。' },
  };

  const dom = {
    metricCards: document.querySelectorAll('.metric-card'),
    toast: document.getElementById('report-toast'),
    loading: document.getElementById('report-loading'),
    error: document.getElementById('report-error'),
    errorMessage: document.getElementById('report-error-message'),
    errorRetry: document.getElementById('report-error-retry'),
    errorHome: document.getElementById('report-error-home'),
    ctaPrimary: document.getElementById('report-cta-primary'),
    ctaRefresh: document.getElementById('report-cta-refresh'),
    ctaSecondary: document.getElementById('report-cta-secondary'),
    ctaMetrics: document.getElementById('report-cta-metrics'),
    ctaPrimaryNote: document.getElementById('report-cta-primary-note'),
    stageLabel: document.getElementById('report-stage-label'),
    title: document.getElementById('report-title'),
    subtitle: document.getElementById('report-subtitle'),
    tasksSubtitle: document.getElementById('tasks-subtitle'),
    psychology: document.getElementById('report-psychology'),
    warningList: document.getElementById('report-warning-list'),
    guardianQuicklist: document.getElementById('report-guardian-quicklist'),
    stageTimer: document.getElementById('report-stage-timer'),
    stageHint: document.getElementById('report-stage-hint'),
    guardianBadge: document.getElementById('guardian-badge'),
    riskReviewBadge: document.getElementById('risk-review-badge'),
    strategySection: document.getElementById('report-strategy'),
    strategyCapsule: document.getElementById('report-strategy-capsule'),
  };

  const state = {
    token: params.get('token') || params.get('report_token') || '',
    leadId: params.get('lead_id') || params.get('leadId') || '',
    metricsRaw: null,
    metricsList: [],
    metricSnapshots: {},
    metricStage: 'initial',
    timestamps: {},
    tasks: {
      guardian: [],
      collection: [],
      risk_reviews: [],
    },
    tasksMetadata: {},
    warnings: [],
    reportUrlOverride: '',
    isLoading: false,
    analysis: {},
    guardianQuicklist: [],
    partialReadyAt: '',
    lastStatus: '',
  };

  function logEvent(name, payload) {
    if (typeof window.logEvent === 'function') {
      window.logEvent(name, payload);
    }
  }

  function showToast(message, duration = 2200) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.hidden = false;
    setTimeout(() => {
      dom.toast.hidden = true;
    }, duration);
  }

  function setLoading(isLoading) {
    state.isLoading = isLoading;
    if (dom.loading) {
      dom.loading.hidden = !isLoading;
    }
  }

  function showError(message) {
    if (dom.error) {
      dom.error.hidden = false;
    }
    if (dom.errorMessage) {
      dom.errorMessage.textContent = message || '暫時無法取得資料，請稍後再試。';
    }
  }

  function hideError() {
    if (dom.error) {
      dom.error.hidden = true;
    }
  }

  function determineMetricState(score, definition = {}) {
    if (score == null) return null;
    const value = Number(score);
    if (!Number.isFinite(value)) return null;
    const thresholds = definition.thresholds || {};
    const goodThreshold = Number.isFinite(thresholds.good) ? thresholds.good : 75;
    const watchThreshold = Number.isFinite(thresholds.watch) ? thresholds.watch : 55;
    if (value >= goodThreshold) return 'good';
    if (value >= watchThreshold) return 'watch';
    return 'risk';
  }

  function safeToNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function ensureArray(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null) return [];
    return [value];
  }

  function resolveTextCandidate(...candidates) {
    for (const candidate of candidates) {
      if (candidate === undefined || candidate === null) {
        continue;
      }
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) return trimmed;
        continue;
      }
      if (Array.isArray(candidate)) {
        const nested = resolveTextCandidate(...candidate);
        if (nested) return nested;
        continue;
      }
      if (typeof candidate === 'object') {
        const nested = resolveTextCandidate(
          candidate.text,
          candidate.message,
          candidate.summary,
          candidate.detail,
          candidate.subtitle,
          candidate.title,
          candidate.label,
          candidate.value
        );
        if (nested) return nested;
        continue;
      }
      const text = String(candidate).trim();
      if (text) return text;
    }
    return '';
  }

  function parseMetricScore(metric) {
    if (!metric || typeof metric !== 'object') return null;
    const candidates = [
      metric.display_score,
      metric.displayScore,
      metric.score,
      metric.value,
      metric.metric,
      metric.amount,
      metric.count,
      metric.raw_score,
      metric.raw?.score,
      metric.raw?.value,
    ];
    for (const candidate of candidates) {
      const numeric = safeToNumber(candidate);
      if (numeric !== null) {
        return numeric;
      }
    }
    return null;
  }

  function normalizeScoreForDisplay(value) {
    if (!Number.isFinite(value)) return null;
    return Math.abs(value) <= 1 ? value * 100 : value;
  }

  function formatMetricScore(value, unit = '') {
    if (value == null || value === '') return '資料補齊中';
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return unit ? `${value} ${unit}`.trim() : String(value);
    }
    const normalized = normalizeScoreForDisplay(num);
    if (normalized == null) {
      return unit ? `${num} ${unit}` : String(num);
    }
    const rounded = Math.abs(normalized - Math.round(normalized)) >= 0.25
      ? Number(normalized.toFixed(1))
      : Math.round(normalized);
    return unit ? `${rounded} ${unit}` : `${rounded}`;
  }

  function resolveMetricDefinition(metricId) {
    return METRIC_DEFINITIONS[metricId] || {
      label: metricId,
      unit: '',
      defaultHint: 'AI 正在更新指標。',
      thresholds: { good: 75, watch: 55 },
      hints: {},
    };
  }

  function normalizeStateKey(value) {
    if (value === undefined || value === null) return '';
    const text = String(value).trim().toLowerCase();
    if (!text) return '';
    if (text.includes('good') || text.includes('ok') || text.includes('healthy') || text === 'green') return 'good';
    if (text.includes('watch') || text.includes('warn') || text.includes('attention') || text.includes('medium') || text.includes('caution')) return 'watch';
    if (text.includes('risk') || text.includes('danger') || text.includes('critical') || text.includes('bad') || text === 'red') return 'risk';
    if (text.includes('pending') || text.includes('unknown')) return 'unknown';
    return text;
  }

  function extractMetricRaw(metric) {
    if (!metric || typeof metric !== 'object') return null;
    const raw = metric.raw;
    if (raw && typeof raw === 'object') {
      const value = raw.value ?? raw.count ?? raw.amount ?? raw.metric ?? raw.score;
      const unit = raw.unit || raw.suffix || raw.label || '';
      if (value !== undefined && value !== null && value !== '') {
        return { value, unit };
      }
    }
    const candidates = [
      [metric.raw_value, metric.raw_unit || metric.unit],
      [metric.rawValue, metric.rawUnit || metric.unit],
      [metric.base_value, metric.base_unit],
      [metric.display_raw, metric.raw_unit],
      [metric.raw_count, '筆'],
    ];
    for (const [value, unit] of candidates) {
      if (value !== undefined && value !== null && value !== '') {
        return { value, unit: unit || '' };
      }
    }
    return null;
  }

  function formatRawValue(raw) {
    if (!raw) return '—';
    const value = typeof raw === 'object' ? raw.value : raw;
    const unit = typeof raw === 'object' ? raw.unit || '' : '';
    if (value === undefined || value === null || value === '') return '—';
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return '—';
      const formatted = Math.abs(value) >= 1000
        ? value.toLocaleString('zh-Hant-TW')
        : Math.abs(value - Math.round(value)) >= 0.1
          ? value.toFixed(1)
          : String(Math.round(value));
      return unit ? `${formatted} ${unit}` : formatted;
    }
    return unit ? `${value} ${unit}` : String(value);
  }

  function formatSourceLabel(value) {
    if (!value) return '';
    const text = String(value).trim();
    if (!text) return '';
    const lower = text.toLowerCase();
    if (SOURCE_LABEL_OVERRIDES[lower]) return SOURCE_LABEL_OVERRIDES[lower];
    return text
      .replace(/[_\s-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function resolveMetricSource(metric = {}, stage = '') {
    const candidates = [
      metric.source_label,
      metric.sourceLabel,
      metric.source,
      metric.provider,
      metric.origin,
      metric.channel,
      metric.data_source,
    ];
    const value = candidates.find((item) => typeof item === 'string' && item.trim());
    if (value) return formatSourceLabel(value);
    if (stage === 'partial') return 'Partial';
    if (stage === 'ready') return 'Ready';
    return '資料補齊中';
  }

  function buildMetricView(metricId, metricData = null, stage = 'unknown') {
    const definition = resolveMetricDefinition(metricId);
    const label = metricData?.label || definition.label || metricId;
    const unit = metricData?.unit || definition.unit || '';
    const numericScore = parseMetricScore(metricData);
    const normalizedState = normalizeStateKey(metricData?.state || metricData?.state_key || metricData?.status);
    let stateKey = normalizedState || determineMetricState(numericScore, definition) || 'unknown';
    const badge = STATE_BADGES[stateKey] || STATE_BADGES.unknown;
    const scoreDisplayCandidate =
      metricData?.display_score_label
      || metricData?.display_score
      || metricData?.displayScore
      || metricData?.display_value;
    let scoreDisplay = scoreDisplayCandidate;
    if (scoreDisplay === undefined || scoreDisplay === null || scoreDisplay === '') {
      scoreDisplay = numericScore != null ? formatMetricScore(numericScore, unit) : '資料補齊中';
    } else if (typeof scoreDisplay === 'number') {
      scoreDisplay = formatMetricScore(scoreDisplay, unit);
    }
    let stateLabel = metricData?.state_label;
    if (!stateLabel || typeof stateLabel !== 'string') {
      stateLabel = `${badge.emoji} ${badge.label}`;
    } else if (!stateLabel.includes(badge.emoji)) {
      stateLabel = `${badge.emoji} ${stateLabel}`;
    }
    let hint = metricData?.hint
      || metricData?.description
      || metricData?.detail
      || (definition.hints && definition.hints[stateKey])
      || definition.defaultHint;
    const rawDisplay = formatRawValue(extractMetricRaw(metricData));
    if (numericScore == null) {
      stateKey = 'unknown';
      stateLabel = `${STATE_BADGES.unknown.emoji} 資料補齊中`;
      if (!scoreDisplay || scoreDisplay === '—') {
        scoreDisplay = '資料補齊中';
      }
      if (!hint) {
        hint = definition.defaultHint;
      }
    }
    return {
      id: metricId,
      label,
      unit,
      numericScore,
      scoreDisplay,
      stateKey,
      stateLabel,
      hint,
      rawDisplay,
      source: resolveMetricSource(metricData || {}, stage),
      stage,
    };
  }

  function formatDelta(value, unit = '') {
    if (!Number.isFinite(value) || value === 0) return '';
    const rounded = Math.abs(value) < 1 ? Number(value.toFixed(1)) : Math.round(value);
    if (rounded === 0) return '';
    const prefix = rounded > 0 ? `+${rounded}` : String(rounded);
    return unit ? `${prefix} ${unit}` : prefix;
  }

  function renderMetricCard(metricId, view, options = {}) {
    const cards = document.querySelectorAll(`.metric-card[data-metric="${metricId}"]`);
    if (!cards.length || !view) return;
    const { stage = view.stage, delta = null, updated = false } = options;
    const allowedStates = ['good', 'watch', 'risk'];

    cards.forEach((card) => {
      ['metric-card--state-good', 'metric-card--state-watch', 'metric-card--state-risk', 'metric-card--updated']
        .forEach((className) => card.classList.remove(className));
      if (allowedStates.includes(view.stateKey)) {
        card.classList.add(`metric-card--state-${view.stateKey}`);
      }
      if (updated) {
        card.classList.add('metric-card--updated');
      }
      if (stage) {
        card.dataset.metricStage = stage;
        card.dataset.stage = stage;
      }

      const labelEl = card.querySelector('.metric-card__label');
      if (labelEl) {
        labelEl.textContent = view.label;
      }
      const scoreEl = card.querySelector('[data-role="score"]');
      if (scoreEl) {
        scoreEl.textContent = view.scoreDisplay;
      }
      const stateEl = card.querySelector('[data-role="state"]');
      if (stateEl) {
        stateEl.textContent = view.stateLabel;
      }
      const hintEl = card.querySelector('[data-role="hint"]');
      if (hintEl) {
        hintEl.textContent = view.hint;
      }
      const rawEl = card.querySelector('[data-role="raw"]');
      if (rawEl) {
        rawEl.textContent = view.rawDisplay || '—';
      }
      const sourceEl = card.querySelector('[data-role="source"]');
      if (sourceEl) {
        sourceEl.textContent = view.source;
      }
      const deltaEl = card.querySelector('[data-role="delta"]');
      if (deltaEl) {
        const deltaText = formatDelta(delta, view.unit);
        deltaEl.textContent = deltaText;
        deltaEl.hidden = !deltaText;
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

  function collectMetricsMap(metrics, stage) {
    const map = new Map();
    if (!metrics) return map;

    const pushEntry = (entry, fallbackId) => {
      if (entry == null) return;
      const resolvedId = resolveMetricId(entry, fallbackId);
      if (!resolvedId) return;
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        map.set(resolvedId, { ...entry, id: resolvedId, stage });
      } else {
        map.set(resolvedId, { value: entry, id: resolvedId, stage });
      }
    };

    if (Array.isArray(metrics)) {
      metrics.forEach((item, index) => {
        pushEntry(item, `metric_${stage}_${index}`);
      });
    } else if (typeof metrics === 'object') {
      Object.entries(metrics).forEach(([key, value]) => {
        pushEntry(value, key);
      });
    }

    return map;
  }

  function renderMetrics(partialMetrics = null, readyMetrics = null) {
    let partialSource = partialMetrics;
    let readySource = readyMetrics;

    if (readyMetrics === null && (Array.isArray(partialMetrics) || partialMetrics == null)) {
      readySource = partialMetrics;
      partialSource = null;
    } else if (
      readyMetrics === null
      && partialMetrics
      && typeof partialMetrics === 'object'
      && (partialMetrics.partial !== undefined || partialMetrics.ready !== undefined)
    ) {
      partialSource = partialMetrics.partial ?? null;
      readySource = partialMetrics.ready ?? null;
    }

    const partialMap = collectMetricsMap(partialSource, 'partial');
    const readyMap = collectMetricsMap(readySource, 'ready');
    const activeMap = readyMap.size ? readyMap : partialMap;

    state.metricsRaw = Array.from(activeMap.values());
    state.metricsList = state.metricsRaw;

    KPI_IDS.forEach((metricId) => {
      const readyEntry = readyMap.get(metricId);
      const partialEntry = partialMap.get(metricId);
      const activeEntry = readyEntry || partialEntry || null;
      const stage = readyEntry ? 'ready' : partialEntry ? 'partial' : 'unknown';
      const view = buildMetricView(metricId, activeEntry, stage);
      const previousSnapshot = state.metricSnapshots[metricId];

      let deltaDisplay = null;
      let updated = false;
      if (readyEntry) {
        const baselineScore = previousSnapshot?.numericScore ?? parseMetricScore(partialEntry);
        const baselineDisplay = normalizeScoreForDisplay(baselineScore);
        const currentDisplay = normalizeScoreForDisplay(view.numericScore);
        if (baselineDisplay != null && currentDisplay != null) {
          const diff = currentDisplay - baselineDisplay;
          if (Math.abs(diff) >= 0.5) {
            deltaDisplay = diff;
            updated = true;
          }
        }
      }

      renderMetricCard(metricId, view, { stage, delta: deltaDisplay, updated });
      state.metricSnapshots[metricId] = {
        numericScore: view.numericScore,
        stage,
      };
    });

    state.metricStage = readyMap.size ? 'ready' : partialMap.size ? 'partial' : 'initial';
  }

  function normalizeTaskItem(item) {
    if (item == null) return null;
    if (typeof item === 'string') {
      return { title: item, detail: '', status: '', order: '', actionUrl: '', tag: '' };
    }
    if (Array.isArray(item)) {
      return { title: item.join('、'), detail: '', status: '', order: '', actionUrl: '', tag: '' };
    }
    const title = item.title || item.name || item.label || item.summary || item.text || '';
    const detail = item.detail || item.description || item.note || item.hint || '';
    const actionUrl = item.url || item.link || item.action_url || item.cta_url || '';
    const statusRaw = item.status || item.state || '';
    const status = typeof item.completed === 'boolean'
      ? (item.completed ? 'done' : 'pending')
      : normalizeStateKey(statusRaw);
    const order = item.order || item.step || item.index || item.position || '';
    const tag = item.tag || item.badge || '';
    return { title, detail, actionUrl, status, order, tag };
  }

  function renderTasks(tasks = {}, analysis = {}) {
    state.tasks = {
      guardian: Array.isArray(tasks.guardian) ? tasks.guardian : [],
      collection: Array.isArray(tasks.collection) ? tasks.collection : [],
      risk_reviews: Array.isArray(tasks.risk_reviews) ? tasks.risk_reviews : [],
    };
    state.tasksMetadata = tasks.metadata || {};
    state.guardianQuicklist = state.tasks.guardian
      .map((item) => normalizeTaskItem(item))
      .filter((item) => item && item.title)
      .map((item) => item.title);

    Object.entries(TASK_SECTION_CONFIG).forEach(([taskKey, config]) => {
      const containers = document.querySelectorAll(`[data-task="${taskKey}"]`);
      const items = Array.isArray(state.tasks[taskKey]) ? state.tasks[taskKey] : [];
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
          li.className = 'task-list__item';
          if (normalized.status) {
            li.dataset.status = normalized.status;
          }
          if (normalized.order) {
            const badge = document.createElement('span');
            badge.className = 'task-order';
            badge.textContent = normalized.order;
            li.appendChild(badge);
          }
          const titleEl = document.createElement('span');
          titleEl.className = 'task-title';
          titleEl.textContent = normalized.title;
          li.appendChild(titleEl);
          if (normalized.detail) {
            const detail = document.createElement('p');
            detail.className = 'task-detail';
            detail.textContent = normalized.detail;
            li.appendChild(detail);
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
          if (normalized.tag) {
            const tag = document.createElement('span');
            tag.className = 'task-tag';
            tag.textContent = normalized.tag;
            li.appendChild(tag);
          }
          listEl.appendChild(li);
        });
      });
    });

    if (dom.guardianBadge) {
      const badgeText = analysis.guardian_stage || analysis.guardian_focus || '';
      if (badgeText) {
        dom.guardianBadge.textContent = badgeText;
        dom.guardianBadge.hidden = false;
      } else {
        dom.guardianBadge.hidden = true;
      }
    }

    if (dom.riskReviewBadge) {
      const recentLowstar = state.tasksMetadata?.recentLowstarCount;
      if (recentLowstar !== null && recentLowstar !== undefined) {
        const count = Math.max(0, Math.round(recentLowstar));
        dom.riskReviewBadge.textContent = `低星 x${count}`;
        dom.riskReviewBadge.hidden = false;
      } else if (state.tasks.risk_reviews.length) {
        dom.riskReviewBadge.textContent = '列管項目';
        dom.riskReviewBadge.hidden = false;
      } else {
        dom.riskReviewBadge.hidden = true;
      }
    }
  }


  function normalizeWarningEntry(entry) {
    if (entry === undefined || entry === null) return '';
    if (typeof entry === 'string') return entry.trim();
    if (Array.isArray(entry)) {
      return entry.map(normalizeWarningEntry).filter(Boolean).join('｜');
    }
    if (typeof entry === 'object') {
      const parts = [entry.title, entry.message, entry.text, entry.summary, entry.detail, entry.hint]
        .map((part) => (typeof part === 'string' ? part.trim() : ''))
        .filter(Boolean);
      return parts.join('｜');
    }
    return String(entry);
  }

  function parseTimestamp(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return new Date(value);
    }
    const textValue = String(value).trim();
    if (!textValue) return null;
    const date = new Date(textValue);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  function formatSeconds(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:15';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function renderHero(analysis = {}, context = {}) {
    const {
      warnings: contextWarnings = [],
      guardianTasks = [],
      timestamps: contextTimestamps = {},
      goalLabel: contextGoalLabel,
      toneLabel: contextToneLabel,
      storeName: contextStoreName,
      heroTitle: contextHeroTitle,
      heroSubtitle: contextHeroSubtitle,
      psychology: contextPsychology,
      status: contextStatus,
    } = context || {};

    const timestamps = {
      ...(analysis.timestamps || {}),
      ...(contextTimestamps || {}),
    };

    const statusRaw = resolveTextCandidate(
      contextStatus,
      state.lastStatus,
      analysis.status,
      analysis.stage,
      analysis.partial?.status
    );
    const statusText = statusRaw ? statusRaw.toLowerCase() : '';
    let stageLabel = 'AI 入場券預審';
    if (statusText.includes('ready')) {
      stageLabel = 'AI 入場券｜Ready';
    } else if (statusText.includes('partial')) {
      stageLabel = 'AI 入場券｜Partial';
    } else if (statusText.includes('processing') || statusText.includes('running')) {
      stageLabel = 'AI 入場券｜處理中';
    }

    const goalLabel = resolveTextCandidate(
      contextGoalLabel,
      analysis.goal_label,
      analysis.partial?.goal_label,
      analysis.guardian_focus,
      analysis.primary_goal,
      analysis.focus,
      analysis.partial?.guardian_focus
    );
    if (dom.stageLabel) {
      const baseLabel = stageLabel;
      dom.stageLabel.textContent = goalLabel && !baseLabel.includes(goalLabel)
        ? `${baseLabel}｜${goalLabel}`
        : baseLabel;
    }

    const storeName = resolveTextCandidate(
      contextStoreName,
      analysis.store_name,
      analysis.partial?.store_name,
      analysis.place?.name,
      analysis.place_name
    );
    const toneLabel = resolveTextCandidate(
      contextToneLabel,
      analysis.tone_label,
      analysis.partial?.tone_label,
      analysis.guardian_tone
    );

    let heroTitle = resolveTextCandidate(
      contextHeroTitle,
      analysis.hero_title,
      analysis.partial?.hero_title,
      analysis.hero?.title
    );
    if (!heroTitle) {
      if (goalLabel && storeName) {
        heroTitle = `${storeName}｜${goalLabel}`;
      } else if (goalLabel) {
        heroTitle = `危機雷達：${goalLabel}`;
      } else if (storeName) {
        heroTitle = `${storeName}｜危機雷達摘要`;
      } else if (statusText.includes('ready')) {
        heroTitle = '危機雷達完成，守護任務準備就緒';
      } else if (statusText.includes('partial')) {
        heroTitle = '速查指標完成，AI 持續補齊細節';
      } else {
        heroTitle = '倒數 15 秒鎖定危機與守護任務';
      }
    }
    if (dom.title) {
      dom.title.textContent = heroTitle;
    }

    let heroSubtitle = resolveTextCandidate(
      contextHeroSubtitle,
      analysis.hero_subtitle,
      analysis.partial?.hero_subtitle,
      analysis.hero?.subtitle,
      toneLabel ? `任務節奏：${toneLabel}` : ''
    );
    if (!heroSubtitle) {
      if (statusText.includes('ready')) {
        heroSubtitle = 'AI 已同步三大指標與守護任務，差值更新後即時顯示。';
      } else if (statusText.includes('partial')) {
        heroSubtitle = 'AI 提供速查三大指標，完整報告生成後自動更新。';
      } else {
        heroSubtitle = 'AI 正在同步危機雷達，資料補齊後會自動推送完整報告。';
      }
    }
    if (dom.subtitle) {
      dom.subtitle.textContent = heroSubtitle;
    }

    const psychologyMessage =
      resolveTextCandidate(
        contextPsychology,
        analysis.psychology_message,
        analysis.partial?.psychology_message,
        analysis.psychology,
        analysis.customer_psychology,
        analysis.psychology_summary,
        analysis.primary_insight
      )
      || 'AI 正在整理你的客群心理摘要…';
    if (dom.psychology) {
      dom.psychology.textContent = psychologyMessage;
    }

    if (dom.warningList) {
      dom.warningList.innerHTML = '';
      const warningsSource = ensureArray(contextWarnings);
      const baseWarnings = warningsSource.length
        ? warningsSource
        : ensureArray(analysis.warnings ?? analysis.partial?.warnings ?? []);
      const warningItems = baseWarnings
        .map(normalizeWarningEntry)
        .filter(Boolean);
      const displayWarnings = warningItems.slice(0, 2);
      if (!displayWarnings.length) {
        const fallback = document.createElement('li');
        fallback.className = 'crisis-warnings__item';
        fallback.textContent = '目前沒有重大警示，AI 持續監控危機指標。';
        dom.warningList.appendChild(fallback);
      } else {
        displayWarnings.forEach((warning) => {
          const li = document.createElement('li');
          li.className = 'crisis-warnings__item';
          li.textContent = warning;
          dom.warningList.appendChild(li);
        });
      }
    }

    const guardianSource = state.guardianQuicklist && state.guardianQuicklist.length
      ? state.guardianQuicklist
      : ensureArray(guardianTasks)
        .map((item) => normalizeTaskItem(item))
        .filter((item) => item && item.title)
        .map((item) => item.title);
    if (dom.guardianQuicklist) {
      dom.guardianQuicklist.innerHTML = '';
      if (!guardianSource.length) {
        const li = document.createElement('li');
        li.className = 'crisis-actions__item';
        li.textContent = 'AI 正在整理守護任務…';
        dom.guardianQuicklist.appendChild(li);
      } else {
        guardianSource.slice(0, 2).forEach((text) => {
          const li = document.createElement('li');
          li.className = 'crisis-actions__item';
          li.textContent = text;
          dom.guardianQuicklist.appendChild(li);
        });
      }
    }
    if (dom.ctaPrimaryNote) {
      dom.ctaPrimaryNote.textContent = guardianSource[0] || 'AI 同步守護任務中…';
    }

    const parsedPartialReady = parseTimestamp(
      timestamps.partialReadyAt
      || timestamps.partial_ready_at
      || timestamps.partial_ready_at_iso
      || timestamps.partial_ready_at_ms
      || timestamps.partial_ready
    );
    const parsedStarted = parseTimestamp(
      timestamps.countdownStartedAt
      || timestamps.countdown_started_at
      || timestamps.startedAt
      || timestamps.started_at
      || timestamps.analysis_started_at
      || timestamps.created_at
    );
    let durationSeconds = null;
    if (parsedPartialReady && parsedStarted) {
      durationSeconds = Math.max(0, Math.round((parsedPartialReady.getTime() - parsedStarted.getTime()) / 1000));
      state.partialReadyAt = parsedPartialReady.toISOString();
    }
    if (dom.stageTimer) {
      dom.stageTimer.textContent = durationSeconds != null ? formatSeconds(durationSeconds) : '00:15';
    }
    if (dom.stageHint) {
      if (durationSeconds != null) {
        dom.stageHint.textContent = durationSeconds <= 60
          ? `已於 ${durationSeconds} 秒內完成危機指標，AI 正在補齊細節。`
          : `Partial 耗時 ${durationSeconds} 秒，AI 持續補齊資料。`;
      } else {
        dom.stageHint.textContent = '倒數結束立即顯示危機摘要。';
      }
    }
  }

  function normalizeStrategyEntry(entry) {
    if (entry === undefined || entry === null) return [];
    if (typeof entry === 'string') {
      return [{ title: '', detail: entry }];
    }
    if (Array.isArray(entry)) {
      return entry.flatMap(normalizeStrategyEntry);
    }
    if (typeof entry === 'object') {
      const title = entry.title || entry.focus || entry.heading || '';
      const detail = entry.detail || entry.description || entry.summary || entry.message || entry.text || '';
      if (!title && !detail) return [];
      return [{ title, detail }];
    }
    return [{ title: '', detail: String(entry) }];
  }

  function renderStrategyCapsule(analysis = {}, extra = {}) {
    if (!dom.strategySection || !dom.strategyCapsule) return;
    const sources = [
      analysis.strategy_capsule,
      analysis.strategy_capsules,
      analysis.strategy_summary,
      analysis.highlights,
      analysis.action_summary,
      analysis.partial?.strategy_capsule,
      analysis.primary_strategy,
      extra.strategy_capsule,
      extra.strategy_capsules,
      extra.strategy_summary,
      extra.highlights,
      extra.action_summary,
    ];
    const entries = sources.flatMap((source) => normalizeStrategyEntry(source)).filter((entry) => entry.detail);

    if (!entries.length) {
      dom.strategySection.hidden = true;
      dom.strategyCapsule.innerHTML = '<p>AI 正在編輯策略膠囊，稍後會同步更新。</p>';
      return;
    }

    dom.strategySection.hidden = false;
    dom.strategyCapsule.innerHTML = '';
    entries.slice(0, 3).forEach((entry) => {
      const block = document.createElement('div');
      block.className = 'strategy-capsule__item';
      if (entry.title) {
        const titleEl = document.createElement('strong');
        titleEl.textContent = entry.title;
        block.appendChild(titleEl);
      }
      const detailEl = document.createElement('p');
      detailEl.textContent = entry.detail;
      block.appendChild(detailEl);
      dom.strategyCapsule.appendChild(block);
    });
  }


  function buildUrlWithParams(baseUrl, paramsMap = {}, options = {}) {
    if (!baseUrl) return '#';
    const { hash } = options || {};
    try {
      const baseText = String(baseUrl);
      const [pathPartRaw, hashPart] = baseText.split('#', 2);
      const target = new URL(pathPartRaw || window.location.pathname, window.location.origin);
      Object.entries(paramsMap)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .forEach(([key, value]) => target.searchParams.set(key, value));
      const resolvedHash = hash !== undefined ? hash : hashPart;
      if (resolvedHash) {
        target.hash = resolvedHash.startsWith('#') ? resolvedHash : `#${resolvedHash}`;
      }
      return target.toString();
    } catch (error) {
      const params = new URLSearchParams();
      Object.entries(paramsMap)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .forEach(([key, value]) => params.set(key, value));
      const query = params.toString();
      const baseText = String(baseUrl);
      const [pathPartRaw, hashPart] = baseText.split('#', 2);
      const basePath = pathPartRaw || window.location.pathname;
      let result = basePath;
      if (query) {
        const separator = result.includes('?') ? '&' : '?';
        result = `${result}${separator}${query}`;
      }
      const resolvedHash = hash !== undefined ? hash : hashPart;
      if (resolvedHash) {
        const hashValue = resolvedHash.startsWith('#') ? resolvedHash : `#${resolvedHash}`;
        result = `${result}${hashValue}`;
      }
      return result;
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
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || response.statusText);
    }
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error('回應格式錯誤');
    }
  }

  async function fetchReport() {
    const headers = { 'Content-Type': 'application/json' };
    let url = reportEndpoint;
    let options = { method: 'GET', headers };

    const perform = async (targetUrl, fetchOptions) => requestJSON(targetUrl, fetchOptions);

    if (state.token) {
      try {
        const target = new URL(reportEndpoint);
        target.searchParams.set('token', state.token);
        url = target.toString();
      } catch (error) {
        url = `${reportEndpoint}?token=${encodeURIComponent(state.token)}`;
      }
      const fallback = () => perform(reportEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'getbytoken', token: state.token }),
      });
      try {
        return await perform(url, options);
      } catch (error) {
        return fallback();
      }
    }

    if (state.leadId) {
      try {
        const target = new URL(reportEndpoint);
        target.searchParams.set('lead_id', state.leadId);
        url = target.toString();
      } catch (error) {
        url = `${reportEndpoint}?lead_id=${encodeURIComponent(state.leadId)}`;
      }
    }

    return perform(url, options);
  }

  function extractMetrics(payload = {}) {
    const analysis = payload.analysis
      || payload.report?.analysis
      || payload.summary?.analysis
      || {};

    const partialCandidates = [
      payload.partial_metrics,
      payload.partial?.metrics,
      analysis.partial?.metrics,
      analysis.progress?.partial?.metrics,
      analysis?.metrics_partial,
    ];

    const readyCandidates = [
      payload.metrics,
      payload.metric_cards,
      payload.summary?.metrics,
      payload.report?.metrics,
      analysis.metrics,
    ];

    const findFirst = (list) => list.find((item) => item !== undefined && item !== null) || null;

    return {
      partial: findFirst(partialCandidates),
      ready: findFirst(readyCandidates),
    };
  }

  function extractAnalysis(payload = {}) {
    return payload.analysis
      || payload.report?.analysis
      || payload.summary?.analysis
      || payload.progress?.analysis
      || {};
  }

  function extractTasks(payload = {}, analysis = {}) {
    const collect = (...sources) => sources
      .flatMap((source) => ensureArray(source))
      .filter((item) => item !== undefined && item !== null);

    const guardian = collect(
      payload.guardian_tasks,
      payload.weekly_actions,
      payload.tasks?.priority_tasks,
      payload.tasks?.guardian,
      analysis.guardian_tasks,
      analysis.partial?.guardian_tasks,
      analysis.weekly_actions,
      analysis.partial?.weekly_actions,
    );

    const collection = collect(
      payload.collection_steps,
      payload.tasks?.collection_steps,
      analysis.collection_steps,
      analysis.partial?.collection_steps,
    );

    const riskReviews = collect(
      payload.recovery_tasks,
      payload.tasks?.repair_checklist,
      payload.tasks?.recovery_tasks,
      analysis.recovery_tasks,
      analysis.partial?.recovery_tasks,
      analysis.risk_reviews,
    );

    const recentLowstarCount = safeToNumber(
      analysis.metrics?.recent_lowstar_count
      ?? analysis.partial?.metrics?.recent_lowstar_count
      ?? payload.metrics_summary?.recent_lowstar_count
      ?? payload.summary?.metrics?.recent_lowstar_count
    );

    return {
      guardian,
      collection,
      risk_reviews: riskReviews,
      metadata: {
        recentLowstarCount: recentLowstarCount ?? null,
      },
    };
  }

  function extractWarnings(payload = {}, analysis = {}) {
    const candidates = [
      payload.warnings,
      payload.report?.warnings,
      payload.flags?.warnings,
      analysis.warnings,
      analysis.partial?.warnings,
    ];
    for (const candidate of candidates) {
      const list = ensureArray(candidate)
        .map((item) => (typeof item === 'string' ? item.trim() : item))
        .filter((item) => !(item === undefined || item === null || (typeof item === 'string' && !item)));
      if (list.length) {
        return list;
      }
    }
    return [];
  }


  function syncLinks() {
    const sharedParams = {
      lead_id: state.leadId || undefined,
      token: state.token || undefined,
    };
    if (dom.ctaSecondary) {
      dom.ctaSecondary.setAttribute('href', buildUrlWithParams(formUrl, sharedParams));
    }
    if (dom.ctaRefresh && dom.ctaRefresh.tagName === 'A') {
      const rerunParams = {
        ...sharedParams,
        ts: Date.now().toString(),
      };
      dom.ctaRefresh.setAttribute('href', buildUrlWithParams(formUrl, rerunParams));
    }
    if (dom.errorHome) {
      dom.errorHome.setAttribute('href', buildUrlWithParams(formUrl, sharedParams));
    }
    if (dom.ctaMetrics) {
      const base = state.reportUrlOverride || reportUrlBase || window.location.pathname;
      dom.ctaMetrics.setAttribute('href', buildUrlWithParams(base, sharedParams, { hash: 'report-metrics' }));
    }
  }

  async function loadReport(showToastOnSuccess = false) {
    setLoading(true);
    hideError();
    try {
      const data = await fetchReport();
      state.reportUrlOverride = data.report_url || data.reportUrl || '';
      if (data.report_token) {
        state.token = data.report_token;
      } else if (data.report?.token) {
        state.token = data.report.token;
      }
      if (data.lead_id) {
        state.leadId = data.lead_id;
      }
      state.lastStatus = data.status || data.state || data.stage || '';
      syncLinks();

      const metrics = extractMetrics(data);
      const analysis = extractAnalysis(data) || {};
      state.analysis = analysis;
      const reportMeta = data.report || {};
      const tasks = extractTasks(data, analysis);
      const warnings = extractWarnings(data, analysis);
      state.warnings = Array.isArray(warnings) ? warnings : [];
      const heroTimestamps = {
        ...(analysis.timestamps || {}),
        ...(reportMeta.timestamps || {}),
        ...(data.timestamps || {}),
      };

      renderMetrics(metrics.partial, metrics.ready);
      renderTasks(tasks, analysis);
      renderHero(analysis, {
        warnings: state.warnings,
        guardianTasks: tasks.guardian || [],
        timestamps: heroTimestamps,
        goalLabel: reportMeta.goal_label || analysis.goal_label,
        toneLabel: reportMeta.tone_label || analysis.tone_label,
        storeName: reportMeta.store_name || analysis.store_name || reportMeta.place?.name,
        heroTitle: reportMeta.hero_title,
        heroSubtitle: reportMeta.hero_subtitle,
        psychology: reportMeta.psychology || reportMeta.psychology_summary,
        status: data.stage || data.status || data.state,
      });
      renderStrategyCapsule(analysis, reportMeta);

      const hasMetrics = Boolean(
        (metrics.ready && (Array.isArray(metrics.ready) ? metrics.ready.length : Object.keys(metrics.ready || {}).length))
        || (metrics.partial && (Array.isArray(metrics.partial) ? metrics.partial.length : Object.keys(metrics.partial || {}).length))
      );
      const hasTasks = (state.tasks.guardian?.length || state.tasks.collection?.length || state.tasks.risk_reviews?.length);
      if (dom.tasksSubtitle && hasTasks) {
        dom.tasksSubtitle.textContent = '優先完成守護任務，其次處理補件與評論清單。';
      }

      if (showToastOnSuccess) {
        showToast('已更新最新結果', 1600);
      }
    } catch (error) {
      console.error('[report] load failed', error);
      showError(error.message || '暫時無法取得資料，請稍後再試。');
      showToast('載入失敗，請稍後再試', 2200);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssistantEntry() {
    if (!assistantEntryUrl) {
      showToast('尚未設定守護專家入口，請稍後再試。');
      return;
    }
    if (!state.leadId) {
      showToast('缺少 lead_id，請返回主頁重新申請。');
      return;
    }
    if (dom.ctaPrimary) {
      dom.ctaPrimary.disabled = true;
      dom.ctaPrimary.classList.add('btn--loading');
    }
    try {
      const payload = {
        lead_id: state.leadId,
        metrics: state.metricsRaw ?? state.metricsList,
        tasks: state.tasks,
      };
      const result = await requestJSON(assistantEntryUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      logEvent('cta_click', { action: 'assistant_entry_report', lead_id: state.leadId });
      if (result && result.ok === false) {
        const message = result.message || '同步守護專家失敗，請稍後再試。';
        showToast(message);
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
      const fallbackAssistantLink =
        result?.fallback_url
        || config.trialUrl
        || config.checkoutPrimaryUrl
        || config.checkoutSecondaryUrl
        || '';
      if (assistantLink) {
        showToast('已同步守護專家，開啟對話中…', 1600);
        window.open(assistantLink, '_blank', 'noopener');
        return;
      }
      if (fallbackAssistantLink) {
        const target = buildUrlWithParams(fallbackAssistantLink, { lead_id: state.leadId || undefined });
        showToast('已同步守護專家，使用 LINE 專家入口…', 2000);
        window.open(target, '_blank', 'noopener');
        return;
      }
      if (result?.report_url || state.reportUrlOverride || reportUrlBase) {
        showToast('已同步守護專家，開啟報表中…', 1800);
        const target = buildUrlWithParams(result?.report_url || state.reportUrlOverride || reportUrlBase, {
          lead_id: state.leadId,
          token: state.token,
        });
        window.open(target, '_blank');
        return;
      }
      showToast('已同步守護專家，稍後將於 LINE 推送通知。', 2200);
    } catch (error) {
      console.error('[assistant-entry/report]', error);
      showToast(`同步失敗：${error.message}`);
    } finally {
      if (dom.ctaPrimary) {
        dom.ctaPrimary.disabled = false;
        dom.ctaPrimary.classList.remove('btn--loading');
      }
    }
  }

  function handleRefresh() {
    if (state.isLoading) return;
    loadReport(true);
  }

  function bindEvents() {
    if (dom.ctaPrimary) {
      dom.ctaPrimary.addEventListener('click', handleAssistantEntry);
    }
    if (dom.ctaRefresh && dom.ctaRefresh.tagName === 'BUTTON') {
      dom.ctaRefresh.addEventListener('click', handleRefresh);
    }
    if (dom.errorRetry) {
      dom.errorRetry.addEventListener('click', handleRefresh);
    }
    if (dom.errorHome) {
      dom.errorHome.setAttribute('href', buildUrlWithParams(formUrl, { lead_id: state.leadId || undefined }));
    }
    if (dom.ctaSecondary) {
      dom.ctaSecondary.setAttribute('href', buildUrlWithParams(formUrl, { lead_id: state.leadId || undefined }));
    }
  }

  function init() {
    bindEvents();
    renderMetrics();
    renderTasks({}, {});
    renderHero({}, { warnings: [], guardianTasks: [], timestamps: {} });
    renderStrategyCapsule({}, {});
    syncLinks();
    loadReport();
  }

  init();
})();
