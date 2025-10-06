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
    heroRating: document.getElementById('hero-rating'),
    heroRatingHint: document.getElementById('hero-rating-hint'),
    heroReviews: document.getElementById('hero-reviews'),
    heroReviewsHint: document.getElementById('hero-reviews-hint'),
    heroGap: document.getElementById('hero-gap'),
    heroGapHint: document.getElementById('hero-gap-hint'),
    heroNote: document.getElementById('hero-note'),
    heroInsight: document.getElementById('hero-insight'),
    heroInsightText: document.getElementById('hero-insight-text'),
    indicator: document.getElementById('report-indicator'),
    trust: document.getElementById('report-trust'),
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
  function setAnchorState(anchor, enabled, href = '#') {
    if (!anchor) return;
    anchor.setAttribute('href', enabled ? href : '#');
    anchor.classList.toggle('btn--disabled', !enabled);
    anchor.setAttribute('aria-disabled', enabled ? 'false' : 'true');
  }

  if (dom.ctaAssistant) {
    setAnchorState(dom.ctaAssistant, Boolean(state.assistantUrl), state.assistantUrl || '#');
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

  function updatePrimaryAction(action, { disabled = false } = {}) {
    state.primaryAction = action;
    if (!dom.ctaPrimary) return;
    let label = '查看完整報表';
    let targetHref = state.reportPageUrl || '#';

    if (action === 'line') {
      label = '回到 LINE';
      targetHref = lineFallbackUrl;
    } else if (action === 'refresh') {
      label = '重新整理';
      targetHref = '#';
    } else if (action === 'report') {
      targetHref = state.reportPageUrl || '#';
      disabled = disabled || !state.reportPageUrl;
    }

    dom.ctaPrimary.textContent = label;
    setAnchorState(dom.ctaPrimary, !disabled, targetHref || '#');
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
      dom.cognosTitle.textContent = `${storeName} 初檢摘要`;
    }
    if (dom.cognosSubtitle) {
      dom.cognosSubtitle.textContent = reviewHighlight
        ? `最新評論：${reviewHighlight}`
        : `我正持續整理 ${locationText}，完成後即時通知你。`;
    }

    if (dom.heroRating) {
      dom.heroRating.textContent = ratingText || '—';
    }
    if (dom.heroRatingHint) {
      dom.heroRatingHint.textContent = ratingText ? '最新星等已同步' : '同步中';
    }
    if (dom.heroReviews) {
      dom.heroReviews.textContent = reviewsText ? `${reviewsText} 則` : '—';
    }
    if (dom.heroReviewsHint) {
      dom.heroReviewsHint.textContent = reviewsText ? '評論總數即時更新' : '評論整理中';
    }
    if (dom.heroNote) {
      const noteCity = city ? `${city} 門市` : '你的門市';
      dom.heroNote.textContent = `AI 已完成 ${noteCity} 的初檢，重點如下；完整報表詳見下方。`;
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

    if (dom.trust) {
      const trustParts = [];
      if (goalLabel && goalLabel !== '—') {
        trustParts.push(`目標鎖定「${goalLabel}」`);
      }
      if (toneLabel && toneLabel !== '—') {
        trustParts.push(`語氣採用「${toneLabel}」`);
      }
      dom.trust.textContent = trustParts.length
        ? `${trustParts.join('，')}，後續推播會同步更新。`
        : '我已保存你的偏好設定，報表更新會即時通知。';
    }

    const metricsRendered = renderMetrics && dom.metrics
      ? renderMetrics(dom.metrics, metricsSource, { emptyMessage: '' })
      : [];
    toggleEmptyState(dom.metricsEmpty, metricsRendered && metricsRendered.length > 0);

    const competitorsRendered = renderCompetitors && dom.competitors
      ? renderCompetitors(dom.competitors, competitorsSource, { emptyMessage: '' })
      : [];
    toggleEmptyState(dom.competitorsEmpty, competitorsRendered && competitorsRendered.length > 0);

    const ratingNumber = toNumber(ratingNow);
    const topCompetitor = competitorsRendered[0];
    const competitorRating = toNumber(topCompetitor?.rating);
    let gapValue = '—';
    let gapHint = '競品比較載入中';
    let gapDescription = '';

    if (ratingNumber != null && competitorRating != null) {
      const diff = ratingNumber - competitorRating;
      const diffAbs = Math.abs(diff);
      const diffLabel = diffAbs ? diffAbs.toFixed(1) : '0';
      if (diffAbs < 0.05) {
        gapValue = '與主要競品持平';
        gapHint = `${topCompetitor?.name || '競品'} ${competitorRating.toFixed ? competitorRating.toFixed(1) : competitorRating} ★`;
        gapDescription = `與 ${topCompetitor?.name || '主要競品'} 持平`;
      } else if (diff > 0) {
        gapValue = `領先 ${diffLabel} ★`;
        gapHint = `${topCompetitor?.name || '競品'} ${competitorRating.toFixed ? competitorRating.toFixed(1) : competitorRating} ★`;
        gapDescription = `領先 ${topCompetitor?.name || '競品'} ${diffLabel} ★`;
      } else {
        gapValue = `落後 ${diffLabel} ★`;
        gapHint = `${topCompetitor?.name || '競品'} ${competitorRating.toFixed ? competitorRating.toFixed(1) : competitorRating} ★`;
        gapDescription = `落後 ${topCompetitor?.name || '競品'} ${diffLabel} ★`;
      }
    } else if (topCompetitor) {
      gapHint = `${topCompetitor.name} 資料整理中`;
    }

    if (dom.heroGap) {
      dom.heroGap.textContent = gapValue;
    }
    if (dom.heroGapHint) {
      dom.heroGapHint.textContent = gapHint;
    }

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

    const firstMetric = metricsRendered[0];
    const firstAction = actionsRendered[0];
    const firstDraft = draftsRendered[0];

    const metricsSummary = latestReview
      ? { label: '最新評論摘要', text: truncateText(latestReview, 96) }
      : firstMetric
        ? {
            label: firstMetric.label || '關鍵指標',
            text: `目前為 ${firstMetric.currency ? formatCurrency(firstMetric.value) : (formatNumber(firstMetric.value) || firstMetric.value || '—')}`,
          }
        : null;

    const competitorSummary = topCompetitor
      ? {
          label: '競品第一名',
          text: truncateText(
            `${topCompetitor.name || '競品'}${topCompetitor.rating != null ? ` ｜ ${Number(topCompetitor.rating).toFixed ? Number(topCompetitor.rating).toFixed(1) : topCompetitor.rating} ★` : ''}${topCompetitor.reviews != null ? ` ｜ ${formatNumber(topCompetitor.reviews)} 則` : ''}`,
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

    setSummaryBlock(dom.summaryMetrics, dom.summaryMetricsLabel, dom.summaryMetricsText, metricsSummary || { text: '' });
    setSummaryBlock(dom.summaryCompetitors, dom.summaryCompetitorsLabel, dom.summaryCompetitorsText, competitorSummary || { text: '' });
    setSummaryBlock(dom.summaryActions, dom.summaryActionsLabel, dom.summaryActionsText, actionsSummary || { text: '' });
    setSummaryBlock(dom.summaryDrafts, dom.summaryDraftsLabel, dom.summaryDraftsText, draftSummary || { text: '' });

    if (dom.cognosSubtitle) {
      if (competitorSummary && competitorSummary.text) {
        dom.cognosSubtitle.textContent = `${competitorSummary.text}${gapDescription ? `（${gapDescription}）` : ''}`;
      } else if (metricsSummary && metricsSummary.text) {
        dom.cognosSubtitle.textContent = metricsSummary.text;
      } else {
        dom.cognosSubtitle.textContent = '我正持續整理評論與競品差距，完成後立即通知你。';
      }
    }

    const insightText = gapDescription
      ? `${gapDescription}。${firstAction ? `建議優先處理：${truncateText(firstAction.text, 60)}` : '建議持續關注評論更新。'}`
      : (metricsSummary?.text || actionsSummary?.text || draftSummary?.text || '我會持續監控評論與競品狀態。');

    if (dom.heroInsight && dom.heroInsightText) {
      if (insightText) {
        dom.heroInsight.hidden = false;
        dom.heroInsightText.textContent = insightText;
      } else {
        dom.heroInsight.hidden = true;
        dom.heroInsightText.textContent = '';
      }
    }

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
    updatePrimaryAction('report', { disabled: !state.reportPageUrl });

    if (dom.ctaAssistant) {
      setAnchorState(dom.ctaAssistant, Boolean(state.assistantUrl), state.assistantUrl || '#');
    }
  }

  function handleSuccess(payload) {
    renderReport(payload);
    setView({ content: true });
    state.retry = 0;
    updatePrimaryAction('report', { disabled: !state.reportPageUrl });
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
      dom.indicator.textContent = 'AI 整理中';
    }
    if (dom.trust) {
      dom.trust.textContent = '資料較多，我會完成後立刻通知你。';
    }
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
    if (dom.indicator) {
      dom.indicator.textContent = '需要協助';
    }
    if (dom.trust) {
      dom.trust.textContent = '我正在重新整理資料，稍後會提醒你再次查看。';
    }
    if (dom.errorMessage) {
      dom.errorMessage.textContent = error?.message || '暫時載入不到報表，我會稍後提醒你再試一次。';
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
    dom.ctaPrimary.addEventListener('click', (event) => {
      const isDisabled = dom.ctaPrimary.classList.contains('btn--disabled');
      if (isDisabled) {
        event.preventDefault();
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

      if (state.primaryAction === 'report') {
        logEvent('cta_click', {
          action: 'open_report',
          lead_id: state.leadId,
          template_id: state.templateId,
          source: 'report',
        });
        return;
      }

      event.preventDefault();
    });
  }

  if (dom.ctaAssistant) {
    dom.ctaAssistant.addEventListener('click', (event) => {
      event.preventDefault();
      if (dom.ctaAssistant.classList.contains('btn--disabled')) return;
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
