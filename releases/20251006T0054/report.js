(function initReportPage() {
  const params = new URLSearchParams(window.location.search);
  const config = window.STAR_ENGINE_CONFIG || {};
  const reportEndpoint = config.reportDataUrl || config.report_data_url || 'https://chelov134999.app.n8n.cloud/webhook/report-data';
  const assistantUrlDefault = config.trialUrl || config.trial_url || '';
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
    ctaAssistant: document.getElementById('cta-assistant'),
    cognosEyebrow: document.getElementById('cognos-eyebrow'),
    cognosTitle: document.getElementById('cognos-title'),
    cognosSubtitle: document.getElementById('cognos-subtitle'),
    alertLoss: document.getElementById('alert-loss'),
    alertGain: document.getElementById('alert-gain'),
    prefs: document.getElementById('report-preferences'),
    prefGoal: document.getElementById('pref-goal'),
    prefTone: document.getElementById('pref-tone'),
    metrics: document.getElementById('report-metrics'),
    metricsEmpty: document.getElementById('report-metrics-empty'),
    competitors: document.getElementById('report-competitors'),
    competitorsEmpty: document.getElementById('report-competitors-empty'),
    actions: document.getElementById('report-actions'),
    actionsEmpty: document.getElementById('report-actions-empty'),
    drafts: document.getElementById('report-drafts'),
    draftsEmpty: document.getElementById('report-drafts-empty'),
  };

  const state = {
    token: params.get('token') || params.get('report_token') || '',
    leadId: params.get('lead_id') || params.get('leadId') || '',
    templateId: 'unknown',
    retry: 0,
    maxRetry: 3,
    assistantUrl: assistantUrlDefault,
    primaryAction: 'refresh',
  };

  if (dom.ctaAssistant && !state.assistantUrl) {
    dom.ctaAssistant.disabled = true;
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

  function updatePrimaryAction(action, { disabled = false } = {}) {
    state.primaryAction = action;
    if (!dom.ctaPrimary) return;
    const label = action === 'line' ? '回到 LINE' : '重新整理';
    dom.ctaPrimary.textContent = label;
    dom.ctaPrimary.disabled = disabled;
  }

  function toggleEmptyState(element, hasContent) {
    if (!element) return;
    element.hidden = hasContent;
  }

  function openAssistant(source = 'report') {
    if (!state.assistantUrl) {
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

    if (state.token) {
      options = {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'getbytoken', token: state.token }),
      };
    } else if (state.leadId) {
      const requestUrl = new URL(reportEndpoint);
      requestUrl.searchParams.set('lead_id', state.leadId);
      url = requestUrl.toString();
    }

    const response = await fetch(url, options);
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || response.statusText);
    }
    const payload = text ? JSON.parse(text) : {};
    return payload;
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
    const { renderMetrics, renderCompetitors, renderActions, renderDrafts } = window.ReportUtils || {};
    const report = payload.report || {};
    const preferences = payload.preferences || {};
    const psychology = payload.psychology || {};

    const metricsSource = report.metrics || report.kpi;
    const competitorsSource = report.competitors || report.competitors_agent;
    const actionsSource = report.weekly_actions;
    const draftsSource = report.reply_drafts;
    const nickname = report.owner_name || preferences.nickname || payload.nickname || '店長';
    const storeName = report.store_name || preferences.store_name || '你的門市';
    const city = report.city || preferences.city || payload.city || '';
    const goalLabel = report.goal_label || '—';
    const toneLabel = report.tone_label || '—';
    const ratingNow = report.rating_now || report.rating || report.score;
    const reviewsTotal = report.reviews_total || report.reviews || report.review_count;
    const latestReview = report.latest_review_summary || report.review_highlight || '';
    const lossEstimate = report.estimated_loss || report.projected_loss || psychology.loss_estimate || psychology.loss_amount;
    const gainEstimate = report.estimated_gain || report.projected_gain || psychology.gain_estimate || psychology.gain_amount;

    const locationText = city ? `${city} 的競品與評論` : '附近的競品與評論';
    const ratingText = ratingNow != null ? `${Number(ratingNow).toFixed ? Number(ratingNow).toFixed(1) : ratingNow} ★` : '';
    const reviewsText = formatNumber(reviewsTotal);
    const reviewHighlight = latestReview || (reviewsText ? `已同步 ${reviewsText} 則評論` : '');

    const lossMessage = lossEstimate ? `若不處理，預估流失 ${formatCurrency(lossEstimate)}。` : 'Google 資料已就緒，正在估算可能的流失金額。';
    const gainMessage = gainEstimate
      ? `把握本週機會，可望挽回 ${formatCurrency(gainEstimate)}。`
      : `看看我能為 ${storeName} 挽回多少營收。`;

    const assistantFromPayload = payload.assistant_url
      || payload.trial_url
      || payload.links?.assistant
      || payload.links?.assistant_url
      || '';

    state.templateId = psychology.template_id || payload.template_id || 'unknown';
    state.leadId = payload.lead_id || state.leadId;
    if (assistantFromPayload) {
      state.assistantUrl = assistantFromPayload;
    }

    if (dom.cognosEyebrow) {
      dom.cognosEyebrow.textContent = `Hi ${nickname}，我是 Cognos`;
    }
    if (dom.cognosTitle) {
      dom.cognosTitle.textContent = `我正在守護 ${storeName}`;
    }
    if (dom.cognosSubtitle) {
      const parts = [`我已定位 ${storeName}，正在蒐集 ${locationText}`];
      if (ratingText) parts.push(`目前評分 ${ratingText}`);
      if (reviewHighlight) parts.push(reviewHighlight);
      dom.cognosSubtitle.textContent = `${parts.join('，')}，稍後把行動方案送達。`;
    }

    if (dom.alertLoss) {
      dom.alertLoss.textContent = lossMessage;
    }
    if (dom.alertGain) {
      dom.alertGain.textContent = gainMessage;
    }

    if (dom.prefs) {
      dom.prefGoal.textContent = `目標：${goalLabel}`;
      dom.prefTone.textContent = `語氣：${toneLabel}`;
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
            logEvent('report_draft_copy', {
              lead_id: state.leadId,
              template_id: state.templateId,
            });
          } catch (error) {
            console.warn('[report] copy failed', error);
          }
        },
      })
      : [];
    toggleEmptyState(dom.draftsEmpty, draftsRendered && draftsRendered.length > 0);

    if (dom.ctaAssistant) {
      const allowAssistant = Boolean(state.assistantUrl);
      dom.ctaAssistant.disabled = !allowAssistant;
    }
  }

  function handleSuccess(payload) {
    renderReport(payload);
    setView({ content: true });
    state.retry = 0;
    updatePrimaryAction('refresh');
    if (dom.skeleton) {
      dom.skeleton.innerHTML = '';
      dom.skeleton.hidden = true;
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
    logEvent('report_load', {
      status: 'pending',
      lead_id: state.leadId,
      template_id: state.templateId,
      retry: state.retry,
    });

    if (state.retry >= state.maxRetry) {
      setView({ error: true });
      if (dom.errorMessage) {
        dom.errorMessage.textContent = '報表仍在生成，稍後會透過 LINE 通知你最新版本。';
      }
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
    if (dom.errorMessage) {
      dom.errorMessage.textContent = error?.message || '無法載入報表，請稍後再試。';
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
          const message = payload.status.message || '生成報表失敗，請稍後再試。';
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
        throw new Error(validation.message || '報表內容缺失，請稍後再試。');
      }

      handleSuccess(payload);
    } catch (error) {
      handleFailure(error);
    } finally {
      if (dom.skeleton) dom.skeleton.hidden = true;
    }
  }

  if (dom.ctaPrimary) {
    dom.ctaPrimary.addEventListener('click', () => {
      if (dom.ctaPrimary.disabled) return;
      if (state.primaryAction === 'line') {
        closeToLine();
        return;
      }
      logEvent('cta_click', {
        action: 'refresh',
        lead_id: state.leadId,
        template_id: state.templateId,
        source: 'report',
      });
      state.retry = 0;
      startFetch();
    });
  }

  if (dom.ctaAssistant) {
    dom.ctaAssistant.addEventListener('click', (event) => {
      event.preventDefault();
      if (dom.ctaAssistant.disabled) return;
      openAssistant('report');
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
