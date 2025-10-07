(function initReportPage() {
  const params = new URLSearchParams(window.location.search);
  const config = window.STAR_ENGINE_CONFIG || {};
  const reportEndpoint = config.reportDataUrl || config.report_data_url || 'https://chelov134999.app.n8n.cloud/webhook/report-data';
  const assistantUrlDefault = config.trialUrl || config.trial_url || '';
  const assistantEntryUrlDefault = config.assistantEntryUrl || config.assistant_entry_url || '';
  const lineFallbackUrl = config.lineFallbackUrl || 'https://line.me/R/ti/p/@star-up';

  const dom = {
    skeleton: document.getElementById('report-skeleton'),
    loading: document.getElementById('report-loading'),
    content: document.getElementById('report-content'),
    error: document.getElementById('report-error'),
    errorMessage: document.getElementById('report-error-message'),
    errorRetry: document.getElementById('error-retry'),
    errorReturn: document.getElementById('error-return-line'),
    btnReturnLine: document.getElementById('btn-return-line'),
    ctaPrimary: document.getElementById('cta-primary'),
    ctaLine: document.getElementById('cta-line'),
    schemaCard: document.getElementById('schema-card'),
    schemaScore: document.getElementById('schema-score'),
    schemaStatus: document.getElementById('schema-status'),
    schemaHint: document.getElementById('schema-hint'),
    schemaNext: document.getElementById('schema-next'),
    visibilityCard: document.getElementById('visibility-card'),
    visibilityScore: document.getElementById('visibility-score'),
    visibilityStatus: document.getElementById('visibility-status'),
    visibilityHint: document.getElementById('visibility-hint'),
    visibilityNext: document.getElementById('visibility-next'),
    reviewCard: document.getElementById('review-card'),
    reviewScore: document.getElementById('review-score'),
    reviewStatus: document.getElementById('review-status'),
    reviewHint: document.getElementById('review-hint'),
    reviewNext: document.getElementById('review-next'),
    heroNote: document.getElementById('hero-note'),
    heroCrisis: document.getElementById('hero-crisis'),
    entryStatus: document.getElementById('entry-status'),
    entryPrimary: document.getElementById('entry-primary'),
    entryNote: document.getElementById('entry-note'),
    entryNextSteps: document.getElementById('entry-next-steps'),
    indicator: document.getElementById('report-indicator'),
    cognosEyebrow: document.getElementById('cognos-eyebrow'),
    cognosTitle: document.getElementById('cognos-title'),
    cognosSubtitle: document.getElementById('cognos-subtitle'),
    prefs: document.getElementById('report-preferences'),
    prefGoal: document.getElementById('pref-goal'),
    prefGoalText: document.getElementById('pref-goal-text'),
    prefTone: document.getElementById('pref-tone'),
    prefToneText: document.getElementById('pref-tone-text'),
    metrics: document.getElementById('report-metrics'),
    metricsEmpty: document.getElementById('report-metrics-empty'),
    competitors: document.getElementById('report-competitors'),
    competitorsEmpty: document.getElementById('report-competitors-empty'),
    actions: document.getElementById('report-actions'),
    actionsEmpty: document.getElementById('report-actions-empty'),
    drafts: document.getElementById('report-drafts'),
    draftsEmpty: document.getElementById('report-drafts-empty'),
    summaryMetrics: document.getElementById('summary-metrics'),
    summaryMetricsLabel: document.getElementById('summary-metrics-label'),
    summaryMetricsText: document.getElementById('summary-metrics-text'),
    summaryCompetitors: document.getElementById('summary-competitors'),
    summaryCompetitorsLabel: document.getElementById('summary-competitors-label'),
    summaryCompetitorsText: document.getElementById('summary-competitors-text'),
    summaryActions: document.getElementById('summary-actions'),
    summaryActionsLabel: document.getElementById('summary-actions-label'),
    summaryActionsText: document.getElementById('summary-actions-text'),
    summaryDrafts: document.getElementById('summary-drafts'),
    summaryDraftsLabel: document.getElementById('summary-drafts-label'),
    summaryDraftsText: document.getElementById('summary-drafts-text'),
    toast: document.getElementById('report-toast'),
  };

  const state = {
    token: params.get('token') || params.get('report_token') || '',
    leadId: params.get('lead_id') || params.get('leadId') || '',
    templateId: 'unknown',
    retry: 0,
    maxRetry: 3,
    assistantUrl: assistantUrlDefault,
    assistantEntryUrl: assistantEntryUrlDefault,
    assistantLabel: config.assistantLabel || 'AI 守護專家',
    primaryAction: 'assistant',
    primaryLabel: '',
    reportPageUrl: '',
  };

  let toastTimer = null;
  function setAnchorState(anchor, enabled, href = '#') {
    if (!anchor) return;
    if (anchor.tagName !== 'A') {
      anchor.classList.toggle('btn--disabled', !enabled);
      anchor.setAttribute('aria-disabled', enabled ? 'false' : 'true');
      return;
    }
    anchor.setAttribute('href', enabled ? href : '#');
    anchor.classList.toggle('btn--disabled', anchor.classList.contains('btn') && !enabled);
    anchor.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    if (!enabled) {
      anchor.setAttribute('tabindex', '-1');
    } else {
      anchor.removeAttribute('tabindex');
    }
  }

  if (dom.ctaLine) {
    setAnchorState(dom.ctaLine, Boolean(lineFallbackUrl), lineFallbackUrl);
    dom.ctaLine.setAttribute('target', '_blank');
    dom.ctaLine.setAttribute('rel', 'noopener');
  }

  function setSummaryBlock(container, labelEl, textEl, { label, text }) {
    if (!container || !labelEl || !textEl) return;
    if (!text) {
      container.hidden = true;
      textEl.textContent = '';
      return;
    }
    if (label) {
      labelEl.textContent = label;
    }
    textEl.textContent = text;
    container.hidden = false;
  }

  function truncateText(value, max = 80) {
    if (!value) return '';
    const pure = String(value).trim();
    if (!pure) return '';
    return pure.length > max ? `${pure.slice(0, max)}…` : pure;
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function formatNumber(value) {
    const number = toNumber(value);
    if (number == null) return '';
    return number.toLocaleString('zh-Hant-TW');
  }

  function formatCurrency(value) {
    const number = toNumber(value);
    if (number == null) return '';
    return `NT$${number.toLocaleString('zh-Hant-TW')}`;
  }

  function formatScoreDisplay(value, { unit = ' 分' } = {}) {
    if (value == null) return '';
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return '';
      const parsed = Number(trimmed);
      if (Number.isNaN(parsed)) {
        return trimmed;
      }
      value = parsed;
    }

    const number = Number(value);
    if (!Number.isFinite(number)) {
      return '';
    }

    const normalized = Math.abs(number) <= 1 ? number * 100 : number;
    const formatted = Number.isInteger(normalized) ? normalized : Number(normalized.toFixed(1));
    return `${formatted}${unit}`.trim();
  }

  function normalizeScoreValue(value) {
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
  }

  function showToast(message, duration = 800) {
    if (!dom.toast) return;
    dom.toast.textContent = message || '';
    dom.toast.classList.add('toast--visible');
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => {
      dom.toast.classList.remove('toast--visible');
    }, duration);
  }

  function updateDashboardCard(cardRefs, data = {}) {
    if (!cardRefs) return;
    const {
      cardEl,
      scoreEl,
      statusEl,
      hintEl,
      nextEl,
    } = cardRefs;
    const {
      score = '—',
      status = '檢核中',
      hint = 'AI 正在同步資料。',
      next = '建議稍後更新。',
      level = '',
    } = data;

    if (scoreEl) {
      scoreEl.textContent = score || '—';
    }
    if (statusEl) {
      statusEl.textContent = status || '檢核中';
    }
    if (hintEl) {
      hintEl.textContent = hint || 'AI 正在同步資料。';
    }
    if (nextEl) {
      nextEl.textContent = next || '建議稍後更新。';
    }
    if (cardEl) {
      cardEl.classList.remove('entry-pass-card--state-good', 'entry-pass-card--state-warn', 'entry-pass-card--state-risk');
      if (level) {
        cardEl.classList.add(level);
      }
    }
  }

  function setEntryPassCard({ status, primary, note, nextSteps }) {
    if (dom.entryStatus) {
      dom.entryStatus.textContent = status || '檢核中';
    }
    if (dom.entryPrimary) {
      dom.entryPrimary.textContent = primary || '正在建立入場券預覽';
    }
    if (dom.entryNote) {
      dom.entryNote.textContent = note || 'AI 會持續同步狀態並透過 LINE 通知你。';
    }
    if (dom.heroCrisis) {
      const normalizedStatus = (status || '').trim();
      dom.heroCrisis.classList.toggle('entry-pass-status-card--ready', /可簽發/.test(normalizedStatus));
      dom.heroCrisis.classList.toggle('entry-pass-status-card--pause', /暫停/.test(normalizedStatus));
    }
    if (dom.entryNextSteps) {
      dom.entryNextSteps.innerHTML = '';
      const steps = Array.isArray(nextSteps) ? nextSteps.filter(Boolean) : [];
      if (steps.length) {
        steps.slice(0, 3).forEach((item) => {
          const li = document.createElement('li');
          li.className = 'entry-pass-status-card__item';
          li.textContent = item;
          dom.entryNextSteps.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.className = 'entry-pass-status-card__item';
        li.textContent = 'AI 正在整理下一步建議';
        dom.entryNextSteps.appendChild(li);
      }
    }
  }

  function isReviewsFallback(payload = {}, report = {}) {
    const status = payload.status || {};
    const reviewsStatus = status.reviews || status.review || {};
    const dataSources = report.data_sources || report.dataSources || {};
    const flags = [
      report.reviews_fallback,
      report.reviewsFallback,
      dataSources.reviews_fallback,
      dataSources.reviewsFallback,
      reviewsStatus.fallback,
      status.reviews_fallback,
      status.reviewsFallback,
      payload.meta?.reviews_fallback,
    ];

    if (flags.some(Boolean)) return true;

    const providers = [
      report.reviews_provider,
      report.reviewsProvider,
      report.reviews_source,
      reviewsStatus.provider,
      reviewsStatus.source,
      status.reviews_provider,
      status.reviewsProvider,
      status.reviews_source,
      dataSources.reviews,
    ].filter(Boolean).map((value) => String(value).toLowerCase());

    return providers.some((value) => value.includes('google_place') || value.includes('fallback'));
  }

  function canLaunchAssistant() {
    return Boolean(state.assistantEntryUrl || state.assistantUrl);
  }

  function setPrimaryLoading(isLoading, loadingLabel = '生成中…') {
    if (!dom.ctaPrimary) return;
    if (isLoading) {
      dom.ctaPrimary.classList.add('btn--loading', 'btn--disabled');
      dom.ctaPrimary.disabled = true;
      dom.ctaPrimary.setAttribute('aria-disabled', 'true');
      dom.ctaPrimary.setAttribute('aria-busy', 'true');
      dom.ctaPrimary.textContent = loadingLabel;
      return;
    }

    dom.ctaPrimary.classList.remove('btn--loading');
    dom.ctaPrimary.removeAttribute('aria-busy');
    updatePrimaryAction(state.primaryAction);
  }

  function updatePrimaryAction(action, { disabled } = {}) {
    const resolvedAction = action || 'assistant';
    state.primaryAction = resolvedAction;

    if (!dom.ctaPrimary) {
      return;
    }

    let label = '生成正式入場券';
    let derivedDisabled = disabled;

    if (resolvedAction === 'line') {
      label = '回到 LINE';
      derivedDisabled = derivedDisabled ?? !lineFallbackUrl;
    } else if (resolvedAction === 'refresh') {
      label = '重新整理';
      derivedDisabled = derivedDisabled ?? false;
    } else {
      state.primaryAction = 'assistant';
      const canLaunch = canLaunchAssistant();
      derivedDisabled = derivedDisabled ?? !canLaunch;
      label = canLaunch ? '生成正式入場券' : '守護專家準備中';
    }

    state.primaryLabel = label;
    dom.ctaPrimary.dataset.action = state.primaryAction;
    dom.ctaPrimary.textContent = label;
    const isDisabled = Boolean(derivedDisabled);
    dom.ctaPrimary.disabled = isDisabled;
    dom.ctaPrimary.classList.toggle('btn--disabled', isDisabled);
    dom.ctaPrimary.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
  }

  function toggleEmptyState(element, hasContent) {
    if (!element) return;
    element.hidden = hasContent;
  }

  async function openAssistant(source = 'report') {
    const entryUrl = state.assistantEntryUrl || assistantEntryUrlDefault;
    const fallbackUrl = state.assistantUrl || assistantUrlDefault;

    if (!entryUrl && !fallbackUrl) {
      showToast('守護專家暫時無法連線，請稍後再試。', 1800);
      return;
    }

    if (entryUrl) {
      setPrimaryLoading(true);
      const requestBody = {
        lead_id: state.leadId || '',
        report_token: state.token || '',
        report_page_url: state.reportPageUrl || window.location.href,
      };

      try {
        logEvent('cta_click', {
          action: 'assistant',
          lead_id: state.leadId,
          template_id: state.templateId,
          source,
          channel: 'entry_pass',
        });

        const response = await fetch(entryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const raw = await response.text();
        if (!response.ok) {
          const error = new Error(raw || response.statusText);
          error.status = response.status;
          throw error;
        }

        let data = {};
        if (raw) {
          try {
            data = JSON.parse(raw);
          } catch (parseError) {
            console.warn('[assistant] 無法解析回應', parseError);
          }
        }

        const targetUrl = data.deeplink
          || data.redirect_url
          || data.redirectUrl
          || data.assistant_url
          || data.assistantUrl
          || data.url
          || (typeof data === 'string' ? data : '');

        if (!targetUrl) {
          throw new Error('缺少導向網址');
        }

        logEvent('assistant_launch', {
          channel: 'entry_pass',
          lead_id: state.leadId,
          template_id: state.templateId,
          source,
        });
        window.location.href = targetUrl;
        return;
      } catch (error) {
        console.error('[assistant] entry request failed', error);
        logEvent('assistant_entry_error', {
          lead_id: state.leadId,
          template_id: state.templateId,
          source,
          message: error?.message || String(error),
        });
        showToast('守護專家暫時無法連線，請稍後再試。', 1800);
      } finally {
        setPrimaryLoading(false);
      }
      return;
    }

    logEvent('cta_click', {
      action: 'assistant',
      lead_id: state.leadId,
      template_id: state.templateId,
      source,
      channel: 'fallback',
    });
    window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
  }

  function setView({ skeleton = false, loading = false, content = false, error = false }) {
    if (dom.skeleton) dom.skeleton.hidden = !skeleton;
    if (dom.loading) dom.loading.hidden = !loading;
    if (dom.content) dom.content.hidden = !content;
    if (dom.error) dom.error.hidden = !error;
  }

  function closeToLine() {
    try {
      if (window.liff?.closeWindow) {
        window.liff.closeWindow();
        return;
      }
    } catch (error) {
      console.warn('[liff] closeWindow failed', error);
    }
    window.location.href = lineFallbackUrl;
  }

  async function requestReport() {
    const headers = { 'Content-Type': 'application/json' };
    let url = reportEndpoint;
    let options = { method: 'GET', headers };
    let fallbackRequest = null;

    const performRequest = async (targetUrl, fetchOptions) => {
      const response = await fetch(targetUrl, fetchOptions);
      const text = await response.text();
      if (!response.ok) {
        const error = new Error(text || response.statusText);
        error.status = response.status;
        error.body = text;
        error.url = targetUrl;
        throw error;
      }
      return text ? JSON.parse(text) : {};
    };

    if (state.token) {
      const requestUrl = new URL(reportEndpoint);
      requestUrl.searchParams.set('token', state.token);
      url = requestUrl.toString();
      fallbackRequest = () => performRequest(reportEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'getbytoken', token: state.token }),
      });
    } else if (state.leadId) {
      const requestUrl = new URL(reportEndpoint);
      requestUrl.searchParams.set('lead_id', state.leadId);
      url = requestUrl.toString();
    }

    try {
      return await performRequest(url, options);
    } catch (error) {
      const message = (error?.message || '').toLowerCase();
      const shouldRetryWithFallback = Boolean(
        fallbackRequest
        && (error?.status === 404
          || error?.status === 405
          || message.includes('not registered for post')
          || message.includes('unsupported method')),
      );

      if (shouldRetryWithFallback) {
        return fallbackRequest();
      }

      throw error;
    }
  }

  function validatePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return { ok: false, message: '回應為空' };
    }

    const report = payload.report;
    if (!report || typeof report !== 'object') {
      return { ok: false, message: '缺少報告內容' };
    }

    return { ok: true };
  }

  function renderReport(payload) {
    const {
      renderMetrics,
      renderCompetitors,
      renderActions,
      renderDrafts,
      pickMetric,
    } = window.ReportUtils || {};
    const report = payload.report || {};
    const preferences = payload.preferences || {};
    const psychology = payload.psychology || {};

    const resolveText = (...values) => {
      for (const value of values) {
        if (value == null) continue;
        const text = String(value).trim();
        if (text) return text;
      }
      return '';
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
          status: '檢核中',
          next: pendingNext || 'AI 正在同步資料。',
        };
      }

      if (score >= 80) {
        return {
          level: 'entry-pass-card--state-good',
          status: goodStatus || '已同步',
          next: goodNext || '維持目前節奏，持續追蹤。',
        };
      }

      if (score >= 50) {
        return {
          level: 'entry-pass-card--state-warn',
          status: warnStatus || '需補強',
          next: warnNext || '補強關鍵欄位，提升簽發率。',
        };
      }

      return {
        level: 'entry-pass-card--state-risk',
        status: riskStatus || '未達標',
        next: riskNext || '優先補齊核心欄位，加速簽發。',
      };
    };

    const formatRatingValue = (value) => {
      if (value == null) return '';
      const number = Number(value);
      if (!Number.isFinite(number)) return '';
      const rounded = Math.round(number * 10) / 10;
      return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
    };

    const normalizePercentValue = (value) => {
      if (value == null) return null;
      const number = Number(value);
      if (!Number.isFinite(number)) return null;
      if (Math.abs(number) <= 1) {
        return number * 100;
      }
      return number;
    };

    const percentLabel = (value) => {
      if (value == null) return '';
      const abs = Math.abs(value);
      if (abs === 0) return '0%';
      if (abs >= 10) return `${Math.round(abs)}%`;
      return `${abs.toFixed(1)}%`;
    };

    const metricsSource = report.metrics || report.kpi;
    const competitorsSource = report.competitors || report.competitors_agent;
    const actionsSource = report.weekly_actions;
    const draftsSource = report.reply_drafts;

    const nickname = resolveText(report.owner_name, preferences.nickname, payload.nickname, payload.owner_name) || '店長';
    const storeNameResolved = resolveText(report.store_name, preferences.store_name, payload.store_name);
    const storeName = storeNameResolved || '你的門市';
    const storeLabel = storeNameResolved || storeName;
    const city = resolveText(report.city, preferences.city, payload.city);
    const locationDisplay = city ? `${city}・${storeLabel}` : storeLabel;

    const goalLabelRaw = resolveText(report.goal_label, preferences.goal_label, payload.goal_label);
    const toneLabelRaw = resolveText(report.tone_label, preferences.tone_label, payload.tone_label);
    const goalLabel = goalLabelRaw || '—';
    const toneLabel = toneLabelRaw || '—';
    const preferenceSummaryParts = [];
    if (goalLabelRaw) preferenceSummaryParts.push(`目標鎖定「${goalLabel}」`);
    if (toneLabelRaw) preferenceSummaryParts.push(`語氣採用「${toneLabel}」`);

    const reviewsTotal = toNumber(report.store_review_count ?? report.reviews_total ?? report.reviews ?? report.review_count);
    const reviewsText = reviewsTotal != null ? formatNumber(reviewsTotal) : '';
    const latestReview = resolveText(report.latest_review_summary, report.review_highlight, report.review_summary);

    const lossEstimate = report.estimated_loss || report.projected_loss || psychology.loss_estimate || psychology.loss_amount;
    const gainEstimate = report.estimated_gain || report.projected_gain || psychology.gain_estimate || psychology.gain_amount;

    const reviewHighlight = latestReview || (reviewsText ? `已同步 ${reviewsText} 則評論` : '');
    const lossMessage = lossEstimate
      ? `若不處理，預估流失 ${formatCurrency(lossEstimate)}。`
      : `AI 正在估算 ${storeLabel} 可能的流失風險。`;
    const gainMessage = gainEstimate
      ? `把握本週機會，可望挽回 ${formatCurrency(gainEstimate)}。`
      : `看看我能為 ${storeLabel} 挽回多少營收。`;
    const reviewsFallback = isReviewsFallback(payload, report);

    const entryPassData = report.entry_pass || payload.entry_pass || payload.entryPass || {};
    const entryPassCards = entryPassData.cards || entryPassData.sections || {};

    const assistantFromPayload = payload.assistant_url
      || payload.trial_url
      || payload.links?.assistant
      || payload.links?.assistant_url
      || '';
    const assistantEntryFromPayload = payload.assistant_entry_url
      || payload.links?.assistant_entry
      || payload.links?.assistant_entry_url
      || report.assistant_entry_url
      || '';

    state.templateId = psychology.template_id || payload.template_id || 'unknown';
    state.leadId = payload.lead_id || state.leadId;
    if (assistantFromPayload) {
      state.assistantUrl = assistantFromPayload;
    }
    if (assistantEntryFromPayload) {
      state.assistantEntryUrl = assistantEntryFromPayload;
    }

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
      schemaDisplay ? `${storeLabel} 的結構化資料已同步` : 'Schema 結構化資料檢測中',
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

    updateDashboardCard({
      cardEl: dom.schemaCard,
      scoreEl: dom.schemaScore,
      statusEl: dom.schemaStatus,
      hintEl: dom.schemaHint,
      nextEl: dom.schemaNext,
    }, {
      score: schemaDisplay || '—',
      status: schemaStatus,
      hint: schemaHintResolved || 'AI 正在建立結構化資料。',
      next: schemaNext,
      level: schemaState.level,
    });

    updateDashboardCard({
      cardEl: dom.visibilityCard,
      scoreEl: dom.visibilityScore,
      statusEl: dom.visibilityStatus,
      hintEl: dom.visibilityHint,
      nextEl: dom.visibilityNext,
    }, {
      score: visibilityDisplay || '—',
      status: visibilityStatus,
      hint: visibilityHintResolved || 'AI 正在評估可見度。',
      next: visibilityNext,
      level: visibilityState.level,
    });

    updateDashboardCard({
      cardEl: dom.reviewCard,
      scoreEl: dom.reviewScore,
      statusEl: dom.reviewStatus,
      hintEl: dom.reviewHint,
      nextEl: dom.reviewNext,
    }, {
      score: reviewDisplay || '—',
      status: reviewStatus,
      hint: reviewHintResolved || '評論健康度同步中',
      next: reviewNext,
      level: reviewState.level,
    });

    if (dom.cognosEyebrow) {
      const greetingName = nickname || '星級引擎夥伴';
      dom.cognosEyebrow.textContent = `Hi ${greetingName}，我是你的入場券顧問 Cognos`;
    }
    if (dom.cognosTitle) {
      dom.cognosTitle.textContent = `${storeLabel} 入場券預審摘要`;
    }
    const locationText = city ? `${city} 的競品與評論` : '附近的競品與評論';
    if (dom.cognosSubtitle) {
      dom.cognosSubtitle.textContent = reviewHighlight
        ? `最新評論：${reviewHighlight}`
        : `我已同步 ${locationText} 與可見度模型，完成後立即通知你。`;
    }

    if (dom.heroNote) {
      const noteCity = city ? `${city} 門市` : storeLabel;
      dom.heroNote.textContent = `AI 已完成 ${noteCity} 的入場券預審，以下是守護專家的即時指引。`;
    }

    if (dom.prefs && dom.prefGoalText && dom.prefToneText) {
      dom.prefGoalText.textContent = goalLabelRaw ? `策略：${goalLabel}` : '策略：未設定';
      dom.prefToneText.textContent = toneLabelRaw ? `語氣：${toneLabel}` : '語氣：未設定';
      dom.prefs.hidden = false;
    }

    const metricsRendered = renderMetrics && dom.metrics
      ? renderMetrics(dom.metrics, metricsSource, { emptyMessage: '' })
      : [];
    toggleEmptyState(dom.metricsEmpty, metricsRendered && metricsRendered.length > 0);

    const competitorsRendered = renderCompetitors && dom.competitors
      ? renderCompetitors(dom.competitors, competitorsSource, { emptyMessage: '' })
      : [];
    toggleEmptyState(dom.competitorsEmpty, competitorsRendered && competitorsRendered.length > 0);

    const topCompetitor = competitorsRendered[0];

    const cardLevels = [schemaState.level, visibilityState.level, reviewState.level];
    const hasRiskLevel = cardLevels.includes('entry-pass-card--state-risk');
    const hasWarnLevel = cardLevels.includes('entry-pass-card--state-warn');
    const hasScoreData = cardLevels.some((level) => Boolean(level));
    const entryAutoStatus = hasRiskLevel
      ? '暫停曝光'
      : hasWarnLevel
        ? '檢核中'
        : hasScoreData
          ? '可簽發'
          : '檢核中';
    const entryAutoPrimary = hasRiskLevel
      ? '指標未達標，暫停曝光，請先補齊紅色指標。'
      : hasWarnLevel
        ? '補齊黃色指標後即可簽發入場券。'
        : hasScoreData
          ? '所有指標就緒，可簽發入場券。'
          : '正在建立入場券預審結果';
    const entryAutoNote = hasRiskLevel
      ? '守護專家會守護進度，待補件完成後重新評估簽發。'
      : '守護專家會持續監控並推播異動提醒。';

    const entryStatusResolved = resolveText(
      entryPassData.status,
      report.entry_pass_status,
      payload.entry_pass_status,
      payload.status?.entry_pass,
      reviewsFallback ? '評論同步中' : entryAutoStatus,
    );
    const entryPrimaryResolved = resolveText(
      entryPassData.headline,
      entryPassData.primary,
      entryPassData.summary,
      report.entry_pass_primary,
      entryAutoPrimary,
      lossMessage,
      entryAutoPrimary,
    );
    const entryNoteResolved = resolveText(
      entryPassData.note,
      entryPassData.description,
      report.entry_pass_note,
      payload.entry_pass_note,
      entryAutoNote,
      reviewsFallback ? '評論資料補齊後會立即推播通知你。' : gainMessage,
    );

    const actionsRendered = renderActions && dom.actions
      ? renderActions(dom.actions, actionsSource, { emptyMessage: '' })
      : [];
    toggleEmptyState(dom.actionsEmpty, actionsRendered && actionsRendered.length > 0);

    const entryNextStepsFromData = [];
    const candidateLists = [
      entryPassData.next_steps,
      entryPassData.nextSteps,
      entryPassData.recommendations,
      entryPassData.actions,
      entryPassData.todos,
      entryPassData.todo,
    ];
    candidateLists.forEach((source) => {
      if (!source) return;
      if (Array.isArray(source)) {
        source.forEach((item) => {
          if (!item) return;
          const text = typeof item === 'string' ? item.trim() : (item.text || item.title || item.action || '').trim();
          if (text) {
            entryNextStepsFromData.push(text);
          }
        });
      } else if (typeof source === 'string') {
        const text = source.trim();
        if (text) {
          entryNextStepsFromData.push(text);
        }
      }
    });

    const entryNextSteps = [...entryNextStepsFromData,
      ...actionsRendered
        .filter((item) => item && typeof item === 'object')
        .map((item) => (item.text || item.note || '').trim())
    ]
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 3);

    setEntryPassCard({
      status: entryStatusResolved,
      primary: entryPrimaryResolved,
      note: entryNoteResolved,
      nextSteps: entryNextSteps,
    });

    const draftsRendered = renderDrafts && dom.drafts
      ? renderDrafts(dom.drafts, draftsSource, {
        emptyMessage: '',
        onCopy: async (text) => {
          try {
            await navigator.clipboard.writeText(text);
            showToast('複製成功');
            logEvent('report_draft_copy', {
              lead_id: state.leadId,
              template_id: state.templateId,
            });
          } catch (error) {
            console.warn('[report] copy failed', error);
            showToast('複製失敗，請稍後再試');
          }
        },
      })
      : [];
    toggleEmptyState(dom.draftsEmpty, draftsRendered && draftsRendered.length > 0);

    const firstMetric = metricsRendered[0];
    const firstAction = actionsRendered[0];
    const firstDraft = draftsRendered[0];

    const metricsSummary = firstMetric
      ? {
          label: '補件優先順序',
          text: truncateText(
            firstMetric.note
              || firstMetric.detail
              || firstMetric.label
              || `目前為 ${
                firstMetric.currency
                  ? formatCurrency(firstMetric.value)
                  : (formatNumber(firstMetric.value) || firstMetric.value || '—')
              }`,
            96,
          ),
        }
      : latestReview
        ? { label: '評論亮點', text: truncateText(latestReview, 96) }
        : null;

    const competitorSummary = topCompetitor
      ? {
          label: '競品預警',
          text: truncateText(
            `${topCompetitor.name || '競品'}${
              topCompetitor.rating != null
                ? ` ｜ ${Number(topCompetitor.rating).toFixed ? Number(topCompetitor.rating).toFixed(1) : topCompetitor.rating} ★`
                : ''
            }${
              topCompetitor.reviews != null ? ` ｜ ${formatNumber(topCompetitor.reviews)} 則` : ''
            }`,
            96,
          ),
        }
      : null;

    const actionsSummary = firstAction
      ? {
          label: '守護任務焦點',
          text: truncateText(firstAction.text, 96),
        }
      : null;

    const draftSummary = firstDraft
      ? {
          label: firstDraft.tone ? `草稿語氣：${firstDraft.tone}` : 'AI 草稿',
          text: truncateText(firstDraft.text, 96),
        }
      : null;

    const summaryFallbacks = {
      metrics: {
        label: '補件提醒',
        text: `${storeLabel} 的補件項目正在整理，完成後會立即推播給你。`,
      },
      competitors: {
        label: '競品預警',
        text: `${city || '附近'} 競品差距分析中，完成後會第一時間通知你。`,
      },
      actions: {
        label: '守護任務',
        text: 'AI 正彙整本週守護任務，很快送上建議。',
      },
      drafts: {
        label: 'AI 草稿',
        text: '我已為你準備草稿，補件時直接使用。',
      },
    };

    setSummaryBlock(dom.summaryMetrics, dom.summaryMetricsLabel, dom.summaryMetricsText, metricsSummary || summaryFallbacks.metrics);
    setSummaryBlock(dom.summaryCompetitors, dom.summaryCompetitorsLabel, dom.summaryCompetitorsText, competitorSummary || summaryFallbacks.competitors);
    setSummaryBlock(dom.summaryActions, dom.summaryActionsLabel, dom.summaryActionsText, actionsSummary || summaryFallbacks.actions);
    setSummaryBlock(dom.summaryDrafts, dom.summaryDraftsLabel, dom.summaryDraftsText, draftSummary || summaryFallbacks.drafts);

    if (dom.cognosSubtitle) {
      if (competitorSummary && competitorSummary.text) {
        dom.cognosSubtitle.textContent = competitorSummary.text;
      } else if (metricsSummary && metricsSummary.text) {
        dom.cognosSubtitle.textContent = metricsSummary.text;
      } else {
        const preferenceFallback = preferenceSummaryParts.length
          ? `${preferenceSummaryParts.join('，')}，我會依此更新提醒。`
          : `我正持續整理 ${locationText}，完成後立即通知你。`;
        dom.cognosSubtitle.textContent = preferenceFallback;
      }
    }

    const preferenceReminder = preferenceSummaryParts.length
      ? `${preferenceSummaryParts.join('，')}，我會依此協助。`
      : '';
    const resolvedReportUrl = payload.report_url
      || payload.links?.report
      || report.report_url
      || '';
    if (resolvedReportUrl) {
      state.reportPageUrl = resolvedReportUrl;
    }
    if (!state.reportPageUrl && payload.report_token) {
      const base = new URL(window.location.href);
      base.searchParams.set('token', payload.report_token);
      state.reportPageUrl = base.toString();
    }
    updatePrimaryAction('assistant');
  }

  function handleSuccess(payload) {
    renderReport(payload);
    setView({ content: true });
    state.retry = 0;
    updatePrimaryAction('assistant');
    if (dom.indicator) {
      dom.indicator.textContent = '分析完成';
    }
    if (dom.skeleton) {
      dom.skeleton.innerHTML = '';
      dom.skeleton.hidden = true;
      dom.skeleton.remove();
      dom.skeleton = null;
    }
    logEvent('report_load', {
      status: 'complete',
      lead_id: state.leadId,
      template_id: state.templateId,
    });
  }

  function handlePending(payload) {
    setView({ loading: true });
    updatePrimaryAction('line');
    if (dom.indicator) {
      dom.indicator.textContent = '入場券資料整理中';
    }

    updateDashboardCard({
      cardEl: dom.schemaCard,
      scoreEl: dom.schemaScore,
      statusEl: dom.schemaStatus,
      hintEl: dom.schemaHint,
      nextEl: dom.schemaNext,
    }, {
      score: '—',
      status: '檢核中',
      hint: 'AI 正在建立結構化資料。',
      next: '補件建議稍後更新。',
      level: '',
    });
    updateDashboardCard({
      cardEl: dom.visibilityCard,
      scoreEl: dom.visibilityScore,
      statusEl: dom.visibilityStatus,
      hintEl: dom.visibilityHint,
      nextEl: dom.visibilityNext,
    }, {
      score: '—',
      status: '分析中',
      hint: 'AI 正在建立可見度模型。',
      next: '曝光補強建議整理中。',
      level: '',
    });
    updateDashboardCard({
      cardEl: dom.reviewCard,
      scoreEl: dom.reviewScore,
      statusEl: dom.reviewStatus,
      hintEl: dom.reviewHint,
      nextEl: dom.reviewNext,
    }, {
      score: '—',
      status: '整理中',
      hint: 'AI 正在彙整評論資料。',
      next: '評論優先處理順序即將更新。',
      level: '',
    });
    if (dom.heroNote) {
      dom.heroNote.textContent = '入場券預覽生成中，我會完成後立即通知你。';
    }
    if (dom.cognosSubtitle) {
      dom.cognosSubtitle.textContent = 'AI 正在彙整評論與可見度指標，請稍候幾秒。';
    }

    const etaSeconds = toNumber(payload?.status?.eta_seconds || payload?.status?.remaining_seconds || payload?.status?.eta || payload?.next_check);
    const pendingStatus = etaSeconds != null
      ? `檢核中（約 ${Math.max(Math.round(etaSeconds), 1)} 秒）`
      : '檢核中';
    setEntryPassCard({
      status: pendingStatus,
      primary: '資料同步中',
      note: 'AI 正在整理入場券所需資料，完成後會透過 LINE 提醒你。',
      nextSteps: ['資料量較大，完成後自動推播。'],
    });

    logEvent('report_load', {
      status: 'pending',
      lead_id: state.leadId,
      template_id: state.templateId,
      retry: state.retry,
    });

    if (state.retry >= state.maxRetry) {
      setView({ error: true });
      if (dom.errorMessage) {
        dom.errorMessage.textContent = '入場券預覽仍在生成，稍後會透過 LINE 通知你最新版本。';
      }
      setEntryPassCard({
        status: '需要協助',
        primary: '請稍後再試',
        note: '我會透過 LINE 再次提醒你最新版本。',
      });
      logEvent('report_load', {
        status: 'timeout',
        lead_id: state.leadId,
        template_id: state.templateId,
      });
      return;
    }

    const nextCheck = Number(payload.next_check || 10) * 1000;
    state.retry += 1;
    setTimeout(startFetch, Math.min(Math.max(nextCheck, 5000), 20000));
  }

  function handleFailure(error) {
    setView({ error: true });
    updatePrimaryAction('refresh');
    if (dom.indicator) {
      dom.indicator.textContent = '需要協助';
    }
    updateDashboardCard({
      cardEl: dom.schemaCard,
      scoreEl: dom.schemaScore,
      statusEl: dom.schemaStatus,
      hintEl: dom.schemaHint,
      nextEl: dom.schemaNext,
    }, {
      score: '—',
      status: '暫停曝光',
      hint: '暫時無法取得結構化資料。',
      next: '稍後重新整理後再試一次。',
      level: '',
    });
    updateDashboardCard({
      cardEl: dom.visibilityCard,
      scoreEl: dom.visibilityScore,
      statusEl: dom.visibilityStatus,
      hintEl: dom.visibilityHint,
      nextEl: dom.visibilityNext,
    }, {
      score: '—',
      status: '暫停曝光',
      hint: '暫時無法取得可見度資料。',
      next: '請稍後重新整理頁面。',
      level: '',
    });
    updateDashboardCard({
      cardEl: dom.reviewCard,
      scoreEl: dom.reviewScore,
      statusEl: dom.reviewStatus,
      hintEl: dom.reviewHint,
      nextEl: dom.reviewNext,
    }, {
      score: '—',
      status: '暫停曝光',
      hint: '暫時無法取得評論資料。',
      next: '稍後再試，或通知守護專家協助。',
      level: '',
    });
    setEntryPassCard({
      status: '暫停曝光',
      primary: '守護專家正在排除，請稍後再試。',
      note: '我會稍後提醒你再次查看。',
      nextSteps: ['重新整理頁面或通知守護專家協助。'],
    });
    if (dom.heroNote) {
      dom.heroNote.textContent = '目前入場券整理遇到狀況，我會盡快為你補齊。';
    }
    if (dom.cognosSubtitle) {
      dom.cognosSubtitle.textContent = '我正在與備援流程確認狀態，完成後會立即通知你。';
    }
    if (dom.errorMessage) {
      dom.errorMessage.textContent = error?.message || '暫時載入不到入場券預覽，我會稍後提醒你再試一次。';
    }
    logEvent('report_load', {
      status: 'failed',
      lead_id: state.leadId,
      template_id: state.templateId,
      error: error?.message || String(error),
    });
  }

  async function startFetch() {
    try {
      updatePrimaryAction('line');
      if (!state.retry) {
        setView({ skeleton: true });
      }
      const payload = await requestReport();

      if (payload.status && typeof payload.status === 'object') {
        const stateValue = payload.status.state || payload.status;
        if (stateValue === 'failed') {
          const message = payload.status.message || '生成入場券預覽失敗，請稍後再試。';
          throw new Error(message);
        }
      }

      const status = (typeof payload.status === 'string') ? payload.status : payload.status?.state;
      if (status === 'pending') {
        handlePending(payload);
        return;
      }

      const validation = validatePayload(payload);
      if (!validation.ok) {
        throw new Error(validation.message || '入場券內容缺失，請稍後再試。');
      }

      handleSuccess(payload);
    } catch (error) {
      handleFailure(error);
    } finally {
      if (dom.skeleton) dom.skeleton.hidden = true;
    }
  }

  if (dom.ctaPrimary) {
    dom.ctaPrimary.addEventListener('click', async (event) => {
      const isDisabled = dom.ctaPrimary.classList.contains('btn--disabled')
        || dom.ctaPrimary.getAttribute('aria-disabled') === 'true'
        || dom.ctaPrimary.disabled;
      if (isDisabled) {
        event.preventDefault();
        showToast('稍候幾秒，我正為你準備最新版。');
        return;
      }

      if (state.primaryAction === 'assistant') {
        event.preventDefault();
        await openAssistant('report');
        return;
      }

      if (state.primaryAction === 'line') {
        event.preventDefault();
        closeToLine();
        return;
      }

      if (state.primaryAction === 'refresh') {
        event.preventDefault();
        logEvent('cta_click', {
          action: 'refresh',
          lead_id: state.leadId,
          template_id: state.templateId,
          source: 'report',
        });
        state.retry = 0;
        startFetch();
        return;
      }

      event.preventDefault();
    });
  }

  const closeButtons = [dom.btnReturnLine, dom.errorReturn];
  closeButtons.forEach((button) => {
    if (!button) return;
    button.addEventListener('click', () => {
      closeToLine();
    });
  });

  if (dom.errorRetry) {
    dom.errorRetry.addEventListener('click', () => {
      state.retry = 0;
      setView({ skeleton: true });
      startFetch();
    });
  }

  startFetch();
})();
