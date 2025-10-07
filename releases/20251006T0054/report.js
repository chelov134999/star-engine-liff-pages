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
    heroSchema: document.getElementById('hero-schema'),
    heroSchemaHint: document.getElementById('hero-schema-hint'),
    heroVisibility: document.getElementById('hero-visibility'),
    heroVisibilityHint: document.getElementById('hero-visibility-hint'),
    heroReview: document.getElementById('hero-review'),
    heroReviewHint: document.getElementById('hero-review-hint'),
    heroNote: document.getElementById('hero-note'),
    heroCrisis: document.getElementById('hero-crisis'),
    entryStatus: document.getElementById('entry-status'),
    entryPrimary: document.getElementById('entry-primary'),
    entryNote: document.getElementById('entry-note'),
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

  function setHeroKpi(valueEl, hintEl, valueText, hintText) {
    if (!valueEl) return;
    const text = valueText ? String(valueText) : '尚未同步';
    valueEl.textContent = text;
    valueEl.classList.toggle('report-hero__kpi-value--pending', !valueText);
    if (hintEl) {
      hintEl.textContent = hintText || (valueText ? '已同步' : '資料整理中');
    }
  }

  function setEntryPassCard({ status, primary, note }) {
    if (dom.entryStatus) {
      dom.entryStatus.textContent = status || '檢核中';
    }
    if (dom.entryPrimary) {
      dom.entryPrimary.textContent = primary || '正在建立入場券預覽';
    }
    if (dom.entryNote) {
      dom.entryNote.textContent = note || 'AI 會持續同步狀態並透過 LINE 通知你。';
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
      label = '生成正式入場券';
      derivedDisabled = derivedDisabled ?? !canLaunchAssistant();
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
      showToast('守護專家暫時無法連線', 1800);
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
        showToast('守護專家暫時無法連線', 1800);
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
    const schemaDisplay = formatScoreDisplay(schemaValueRaw);
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
    const visibilityDisplay = formatScoreDisplay(visibilityValueRaw);
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
    let reviewDisplay = formatScoreDisplay(reviewValueRaw);
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

    if (dom.heroSchema) {
      setHeroKpi(dom.heroSchema, dom.heroSchemaHint, schemaDisplay, schemaHint);
    }
    if (dom.heroVisibility) {
      setHeroKpi(dom.heroVisibility, dom.heroVisibilityHint, visibilityDisplay, visibilityHint);
    }
    if (dom.heroReview) {
      setHeroKpi(dom.heroReview, dom.heroReviewHint, reviewDisplay, reviewHint);
    }

    if (dom.cognosEyebrow) {
      const greetingName = nickname || '星級引擎夥伴';
      dom.cognosEyebrow.textContent = `Hi ${greetingName}，我是你的入場券顧問 Cognos`;
    }
    if (dom.cognosTitle) {
      dom.cognosTitle.textContent = `${storeLabel} 入場券預覽摘要`;
    }
    const locationText = city ? `${city} 的競品與評論` : '附近的競品與評論';
    if (dom.cognosSubtitle) {
      dom.cognosSubtitle.textContent = reviewHighlight
        ? `最新評論：${reviewHighlight}`
        : `我已同步 ${locationText} 與可見度模型，完成後立即通知你。`;
    }

    if (dom.heroNote) {
      const noteCity = city ? `${city} 門市` : storeLabel;
      dom.heroNote.textContent = `AI 已完成 ${noteCity} 的入場券初審，以下是你的即時摘要。`;
    }

    if (dom.prefs && dom.prefGoalText && dom.prefToneText) {
      dom.prefGoalText.textContent = goalLabelRaw ? `目前策略：${goalLabel}` : '目前策略：尚未設定';
      dom.prefToneText.textContent = toneLabelRaw ? `語氣設定：${toneLabel}` : '語氣設定：尚未設定';
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

    const entryPassData = report.entry_pass || payload.entry_pass || payload.entryPass || {};
    const entryStatusResolved = resolveText(
      entryPassData.status,
      report.entry_pass_status,
      payload.entry_pass_status,
      payload.status?.entry_pass,
      reviewsFallback ? '評論同步中' : (schemaDisplay || visibilityDisplay || reviewDisplay ? '預覽完成' : '檢核中'),
    );
    const entryPrimaryResolved = resolveText(
      entryPassData.headline,
      entryPassData.primary,
      entryPassData.summary,
      report.entry_pass_primary,
      lossMessage,
      '正在建立入場券預覽',
    );
    const entryNoteResolved = resolveText(
      entryPassData.note,
      entryPassData.description,
      report.entry_pass_note,
      payload.entry_pass_note,
      reviewsFallback ? '評論資料補齊後會立即推播通知你。' : gainMessage,
    );

    setEntryPassCard({
      status: entryStatusResolved,
      primary: entryPrimaryResolved,
      note: entryNoteResolved,
    });

    const actionsRendered = renderActions && dom.actions
    const actionsRendered = renderActions && dom.actions
      ? renderActions(dom.actions, actionsSource, { emptyMessage: '' })
      : [];
    toggleEmptyState(dom.actionsEmpty, actionsRendered && actionsRendered.length > 0);

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

    const metricsSummary = latestReview
      ? { label: '最新評論摘要', text: truncateText(latestReview, 96) }
      : firstMetric
        ? {
            label: firstMetric.label || '關鍵指標',
            text: `目前為 ${
              firstMetric.currency
                ? formatCurrency(firstMetric.value)
                : (formatNumber(firstMetric.value) || firstMetric.value || '—')
            }`,
          }
        : null;

    const competitorSummary = topCompetitor
      ? {
          label: '競品第一名',
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
          label: '本週優先事項',
          text: truncateText(firstAction.text, 96),
        }
      : null;

    const draftSummary = firstDraft
      ? {
          label: firstDraft.tone ? `首選語氣：${firstDraft.tone}` : '首選草稿',
          text: truncateText(firstDraft.text, 96),
        }
      : null;

    const summaryFallbacks = {
      metrics: {
        label: '同步提醒',
        text: `${storeLabel} 最新評論整理中，很快送上亮點。`,
      },
      competitors: {
        label: '競品同步',
        text: `${city || '附近'} 競品差距分析中，完成後會第一時間通知你。`,
      },
      actions: {
        label: '行動建議',
        text: 'AI 正彙整本週優先事項，很快就緒。',
      },
      drafts: {
        label: '草稿準備中',
        text: 'AI 正為你撰寫回覆草稿，完成後自動推送。',
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

    setHeroKpi(dom.heroSchema, dom.heroSchemaHint);
    setHeroKpi(dom.heroVisibility, dom.heroVisibilityHint);
    setHeroKpi(dom.heroReview, dom.heroReviewHint);
    if (dom.heroNote) {
      dom.heroNote.textContent = '入場券預覽生成中，我會完成後立即通知你。';
    }
    if (dom.cognosSubtitle) {
      dom.cognosSubtitle.textContent = 'AI 正在彙整評論與可見度指標，請稍候幾秒。';
    }

    const etaSeconds = toNumber(payload?.status?.eta_seconds || payload?.status?.remaining_seconds || payload?.status?.eta || payload?.next_check);
    const pendingStatus = etaSeconds != null
      ? `入場券生成中（約 ${Math.max(Math.round(etaSeconds), 1)} 秒）`
      : '入場券生成中';
    setEntryPassCard({
      status: pendingStatus,
      primary: '資料同步中',
      note: 'AI 正在整理入場券所需資料，完成後會透過 LINE 提醒你。',
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
    setHeroKpi(dom.heroSchema, dom.heroSchemaHint);
    setHeroKpi(dom.heroVisibility, dom.heroVisibilityHint);
    setHeroKpi(dom.heroReview, dom.heroReviewHint);
    setEntryPassCard({
      status: '需要協助',
      primary: '請稍後再試',
      note: '我會稍後提醒你再次查看。',
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
