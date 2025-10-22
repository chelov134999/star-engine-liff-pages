(function initSerpReport() {
  const params = new URLSearchParams(window.location.search);
  const config = window.STAR_ENGINE_CONFIG || {};
  const ReportUtils = window.ReportUtils || {};

  const endpoints = {
    report:
      config.serpEndpoint
      || config.serpReportEndpoint
      || config.reportEndpoint
      || config.reportUrl
      || 'https://chelov134999.app.n8n.cloud/webhook/report-data',
    assistantEntry: config.assistantEntryUrl || config.assistant_entry_url || '',
    detail: config.serpDetailUrl || config.serpReportUrl || config.reportUrl || 'report.html',
    plan: config.checkoutPrimaryUrl || config.checkoutSecondaryUrl || config.plansPageUrl || 'plans.html',
    form: config.formUrl || 'index.html',
  };

  const dom = {
    toast: document.getElementById('serp-toast'),
    loading: document.getElementById('serp-loading'),
    error: document.getElementById('serp-error'),
    errorMessage: document.getElementById('serp-error-message'),
    errorRetry: document.getElementById('serp-error-retry'),
    errorHome: document.getElementById('serp-error-home'),
    heroStage: document.getElementById('serp-hero-stage'),
    heroTitle: document.getElementById('serp-hero-title'),
    heroSubtitle: document.getElementById('serp-hero-subtitle'),
    countdown: document.getElementById('serp-countdown'),
    countdownHint: document.getElementById('serp-countdown-hint'),
    heroCommitment: document.getElementById('serp-hero-commitment'),
    exposureTitle: document.getElementById('serp-exposure-title'),
    exposureMetric: document.getElementById('serp-exposure-metric'),
    exposureList: document.getElementById('serp-exposure-list'),
    exposureSource: document.getElementById('serp-exposure-source'),
    recommendationTitle: document.getElementById('serp-recommendation-title'),
    recommendationMetric: document.getElementById('serp-recommendation-metric'),
    recommendationList: document.getElementById('serp-recommendation-list'),
    recommendationSource: document.getElementById('serp-recommendation-source'),
    alertTitle: document.getElementById('serp-alert-title'),
    alertMetric: document.getElementById('serp-alert-metric'),
    alertList: document.getElementById('serp-alert-list'),
    alertSource: document.getElementById('serp-alert-source'),
    taskImmediateList: document.getElementById('serp-task-immediate-list'),
    taskImmediateBadge: document.getElementById('serp-task-immediate-count'),
    taskNextList: document.getElementById('serp-task-next-list'),
    taskNextBadge: document.getElementById('serp-task-next-count'),
    taskSelfList: document.getElementById('serp-task-self-list'),
    taskSelfBadge: document.getElementById('serp-task-self-count'),
    guardianStatus: document.getElementById('serp-guardian-status'),
    guardianTitle: document.getElementById('serp-guardian-title'),
    guardianDescription: document.getElementById('serp-guardian-description'),
    guardianNextSync: document.getElementById('serp-next-sync'),
    guardianAutomation: document.getElementById('serp-guardian-automation'),
    guardianStub: document.getElementById('serp-guardian-stub'),
    ctaPrimary: document.getElementById('serp-cta-primary'),
    ctaPrimaryNote: document.getElementById('serp-cta-primary-note'),
    ctaSecondary: document.getElementById('serp-cta-secondary'),
    ctaUpgrade: document.getElementById('serp-cta-upgrade'),
    detailExposure: document.getElementById('serp-detail-exposure'),
    detailRecommendation: document.getElementById('serp-detail-recommendation'),
    detailAlerts: document.getElementById('serp-detail-alerts'),
  };

  const state = {
    leadId: params.get('lead_id') || params.get('leadId') || '',
    token: params.get('token') || params.get('report_token') || '',
    isLoading: false,
    lastPayload: null,
  };

  function logEvent(name, payload) {
    if (typeof window.logEvent === 'function') {
      window.logEvent(name, payload);
    }
  }

  function ensureArray(value) {
    if (!value && value !== 0) return [];
    if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null);
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
          candidate.description,
          candidate.label,
          candidate.value,
        );
        if (nested) return nested;
        continue;
      }
      const text = String(candidate).trim();
      if (text) return text;
    }
    return '';
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
      throw new Error(text || response.statusText || '網路錯誤');
    }
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error('回應格式錯誤');
    }
  }

  async function fetchReport() {
    let url = endpoints.report;
    const headers = { 'Content-Type': 'application/json' };
    const perform = (targetUrl, fetchOptions) => requestJSON(targetUrl, fetchOptions);
    if (state.token) {
      try {
        const target = new URL(endpoints.report);
        target.searchParams.set('token', state.token);
        url = target.toString();
      } catch (error) {
        url = `${endpoints.report}?token=${encodeURIComponent(state.token)}`;
      }
      const fallback = () => perform(endpoints.report, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'getbytoken', token: state.token }),
      });
      try {
        return await perform(url, { method: 'GET', headers });
      } catch (error) {
        return fallback();
      }
    }

    if (state.leadId) {
      try {
        const target = new URL(endpoints.report);
        target.searchParams.set('lead_id', state.leadId);
        url = target.toString();
      } catch (error) {
        url = `${endpoints.report}?lead_id=${encodeURIComponent(state.leadId)}`;
      }
    }

    return perform(url, { method: 'GET', headers });
  }

  function getSerpSource(payload) {
    const candidates = [
      payload.serp,
      payload.serp_report,
      payload.serp_insights,
      payload.serpSummary,
      payload.serpSummary?.data,
      payload.report?.serp,
      payload.report?.serp_report,
      payload.report?.serp_insights,
      payload.analysis?.serp,
      payload.analysis?.serp_report,
      payload.analysis?.serp_insights,
      payload.summary?.serp,
      payload.summary?.serp_report,
      payload.partial?.serp,
    ];
    return candidates.find((item) => item && typeof item === 'object') || {};
  }

  function resolveMetric(serp, keys) {
    if (!serp) return null;
    const sources = [
      serp.metrics,
      serp.kpis,
      serp.cards,
      serp.items,
      serp.sections,
      serp.summary?.metrics,
      serp.overview?.metrics,
      serp.overview,
      serp,
    ];
    for (const source of sources) {
      if (!source) continue;
      if (ReportUtils.pickMetric) {
        const metric = ReportUtils.pickMetric(source, keys);
        if (metric) return metric;
      }
      if (Array.isArray(source)) {
        for (const entry of source) {
          if (!entry || typeof entry !== 'object') continue;
          const idCandidates = [
            entry.id,
            entry.key,
            entry.slug,
            entry.metric_id,
            entry.metricId,
            entry.name,
            entry.label,
            entry.title,
            entry.topic,
            entry.section,
          ]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase());
          if (idCandidates.some((value) => keys.some((key) => value.includes(key)))) {
            return entry;
          }
        }
      }
      if (typeof source === 'object') {
        for (const key of Object.keys(source)) {
          if (keys.some((k) => key.toLowerCase().includes(k))) {
            const value = source[key];
            if (value && typeof value === 'object') {
              return value;
            }
          }
        }
      }
    }
    return null;
  }

  function normalizeMetric(metric, defaults = {}) {
    if (!metric || typeof metric !== 'object') {
      return {
        title: defaults.title || '資料補齊中',
        metric: defaults.metric || '—',
        bullets: defaults.bullets || ['AI 正在整理資料。'],
        source: defaults.source || '資料補齊中',
        detail: defaults.detail || '',
      };
    }
    const title = resolveTextCandidate(
      metric.title,
      metric.label,
      metric.name,
      defaults.title,
    ) || defaults.title || '資料補齊中';

    const metricValue = metric.metric
      ?? metric.value
      ?? metric.score
      ?? metric.rank
      ?? metric.position
      ?? metric.primary
      ?? metric.percent
      ?? metric.category;
    let metricDisplay = '—';
    if (metricValue !== undefined && metricValue !== null && metricValue !== '') {
      if (typeof metricValue === 'number') {
        metricDisplay = ReportUtils.formatNumber ? ReportUtils.formatNumber(metricValue) : String(metricValue);
      } else if (Array.isArray(metricValue)) {
        metricDisplay = metricValue.map((item) => (typeof item === 'number' && ReportUtils.formatNumber ? ReportUtils.formatNumber(item) : String(item))).join(' / ');
      } else {
        metricDisplay = String(metricValue);
      }
    }

    const knowledge = resolveTextCandidate(
      metric.knowledge_panel,
      metric.knowledgePanel,
      metric.knowledge,
      metric.snippet,
      metric.summary,
      metric.description,
      metric.hint,
      metric.note,
    );

    const bullets = (
      ensureArray(metric.highlights)
        .concat(ensureArray(metric.points))
        .concat(ensureArray(metric.bullets))
        .concat(ensureArray(metric.notes))
        .concat(ensureArray(metric.alerts))
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          if (item && typeof item === 'object') {
            return resolveTextCandidate(item.title, item.text, item.message, item.detail, item.description);
          }
          return '';
        })
        .filter(Boolean)
    );

    if (knowledge && !bullets.length) {
      bullets.push(knowledge);
    } else if (knowledge) {
      bullets.unshift(knowledge);
    }

    if (!bullets.length) {
      bullets.push(defaults.fallbackBullet || 'AI 正在整理資料。');
    }

    const sourceLabel = resolveTextCandidate(
      metric.source_label,
      metric.sourceLabel,
      metric.source,
      metric.origin,
      defaults.source,
    ) || defaults.source || '資料補齊中';

    const detail = resolveTextCandidate(
      metric.detail,
      metric.details,
      metric.rich_snippet,
      metric.richSnippet,
      metric.full_text,
      metric.fullText,
      metric.longform,
      defaults.detail,
    );

    return {
      title,
      metric: metricDisplay,
      bullets,
      source: sourceLabel,
      detail,
    };
  }

  function normalizeReview(review) {
    if (!review) return '';
    if (typeof review === 'string') return review.trim();
    const rating = resolveTextCandidate(review.rating, review.stars, review.score);
    const time = resolveTextCandidate(review.time_relative, review.relative_time, review.relativeTime, review.date_text, review.time);
    const author = resolveTextCandidate(review.author, review.author_name, review.reviewer);
    const text = resolveTextCandidate(review.snippet, review.text, review.content, review.comment);
    const parts = [];
    if (rating) parts.push(`${rating}★`);
    if (time) parts.push(time);
    if (author) parts.push(`by ${author}`);
    if (text) parts.push(`「${text}」`);
    return parts.join(' · ');
  }

  function categorizeTask(item) {
    if (!item) {
      return { category: 'self', text: '' };
    }
    if (typeof item === 'string') {
      return { category: 'self', text: item.trim() };
    }
    const text = resolveTextCandidate(item.title, item.text, item.message, item.detail, item.description, item.action) || '';
    const severity = resolveTextCandidate(
      item.severity,
      item.level,
      item.status,
      item.priority,
      item.category,
    ).toLowerCase();
    let category = 'self';
    if (severity.includes('critical') || severity.includes('high') || severity.includes('urgent') || severity.includes('immediate')) {
      category = 'immediate';
    } else if (severity.includes('medium') || severity.includes('next') || severity.includes('follow')) {
      category = 'next';
    } else if (severity.includes('watch')) {
      category = 'next';
    }
    return { category, text };
  }

  function normalizeTasks(serp) {
    const result = {
      immediate: [],
      next: [],
      self: [],
    };
    const sources = [
      serp.alerts,
      serp.risks,
      serp.tasks,
      serp.guardian_tasks,
      serp.recommendations,
      serp.actions,
    ];
    sources.forEach((source) => {
      ensureArray(source)
        .map(categorizeTask)
        .forEach(({ category, text }) => {
          if (!text) return;
          if (!result[category]) {
            result[category] = [];
          }
          result[category].push(text);
        });
    });
    return result;
  }

  function normalizeGuardian(payload, serp) {
    const guardianSource = serp.guardian || payload.guardian || payload.analysis?.guardian || payload.flags || {};
    const stubFlag = Boolean(
      guardianSource.stub
      || guardianSource.is_stub
      || guardianSource.stub_mode
      || guardianSource.serp_stub
      || guardianSource.serpapi_stub
      || payload.flags?.serpapi_stub
      || payload.flags?.serp_stub,
    );
    const nextSyncRaw = resolveTextCandidate(
      guardianSource.next_dataforseo_sync,
      guardianSource.next_sync,
      guardianSource.next_refresh,
      guardianSource.next_dataforseo,
      guardianSource.nextDataforseoSync,
      guardianSource.nextSync,
      payload.flags?.next_dataforseo_sync,
      payload.analysis?.next_dataforseo_sync,
    );
    const automation = resolveTextCandidate(
      guardianSource.automation_note,
      guardianSource.guardian_note,
      guardianSource.schedule,
      guardianSource.schedule_note,
      '每日 02:00 自動更新',
    );
    return {
      status: resolveTextCandidate(guardianSource.status_label, guardianSource.status, guardianSource.state, '守護排程確認中'),
      title: resolveTextCandidate(guardianSource.title, guardianSource.headline, guardianSource.summary, '等待排程同步'),
      description: resolveTextCandidate(
        guardianSource.description,
        guardianSource.detail,
        guardianSource.message,
        'DataForSEO 正在串接，完成後會自動補齊 SERP 與競品差距。',
      ),
      nextSync: nextSyncRaw || '尚無排程',
      automation,
      stub: stubFlag ? '目前為 Stub 模擬資料' : '已切換正式資料',
      stubFlag,
    };
  }

  function updateList(element, items, emptyMessage) {
    if (!element) return;
    element.innerHTML = '';
    const list = ensureArray(items).filter((item) => typeof item === 'string' && item.trim());
    if (!list.length) {
      const li = document.createElement('li');
      li.textContent = emptyMessage || 'AI 正在整理資料。';
      element.appendChild(li);
      return;
    }
    list.forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      element.appendChild(li);
    });
  }

  function toggleBadge(badge, items) {
    if (!badge) return;
    const count = ensureArray(items).length;
    if (count > 0) {
      badge.hidden = false;
      badge.textContent = `${count} 項`;
    } else {
      badge.hidden = true;
    }
  }

  function renderSerp(payload) {
    state.lastPayload = payload;
    const serp = getSerpSource(payload);
    const exposureMetric = normalizeMetric(
      resolveMetric(serp, ['exposure', 'search_exposure', 'searchvisibility', 'visibility', 'localpack']),
      {
        title: '搜尋曝光',
        fallbackBullet: 'SerpAPI 正在比對 Local Pack 與品牌曝光。',
      },
    );
    const recommendationMetric = normalizeMetric(
      resolveMetric(serp, ['recommendation', 'heat', 'popularity', 'snippet', 'featured', 'topstories']),
      {
        title: '推薦熱度',
        fallbackBullet: 'SerpAPI 正在擷取熱門摘要與網站展示。',
      },
    );
    const alertMetricRaw = resolveMetric(serp, ['alert', 'crisis', 'risk', 'danger', 'negative', 'review']);
    let alertMetric = normalizeMetric(alertMetricRaw, {
      title: '危機警示',
      fallbackBullet: 'AI 正在解析最新差評與搜尋缺口。',
    });
    if (alertMetricRaw && !alertMetric.detail) {
      const review = normalizeReview(alertMetricRaw.review || alertMetricRaw.latest || alertMetricRaw.data);
      if (review) {
        alertMetric.bullets.unshift(review);
      }
    }

    const tasks = normalizeTasks(serp);
    const guardian = normalizeGuardian(payload, serp);

    const countdownSeconds = Number(
      serp.countdown_seconds
        ?? serp.countdown
        ?? serp.timer
        ?? serp.timing?.seconds
        ?? payload.timings?.serp_seconds,
    );

    const countdownHint = resolveTextCandidate(
      serp.countdown_hint,
      serp.hint,
      serp.message,
      serp.notice,
      '倒數結束立即顯示真實數據。',
    );

    const countdownText = Number.isFinite(countdownSeconds) && countdownSeconds > 0
      ? `00:${String(Math.min(599, Math.max(1, Math.round(countdownSeconds)))).padStart(2, '0')}`
      : '00:15';

    const commitment = resolveTextCandidate(
      serp.commitment,
      serp.promise,
      serp.guardian_commitment,
      '我們已安排 nightly 守護，凌晨 02:00 會自動同步最新搜尋狀態。',
    );

    const stageLabel = resolveTextCandidate(
      serp.stage_label,
      serp.stage,
      serp.status,
      payload.stage,
      payload.status,
      'SerpAPI 守護中',
    );

    const heroSubtitle = resolveTextCandidate(
      serp.subtitle,
      serp.summary,
      serp.description,
      'AI 正在檢查你的品牌在搜尋引擎的曝光、推薦熱度與最新危機。',
    );

    if (dom.heroStage) {
      dom.heroStage.textContent = stageLabel;
    }
    if (dom.heroTitle) {
      dom.heroTitle.textContent = resolveTextCandidate(serp.title, '即時曝光與危機掃描');
    }
    if (dom.heroSubtitle) {
      dom.heroSubtitle.textContent = heroSubtitle;
    }
    if (dom.countdown) {
      dom.countdown.textContent = countdownText;
    }
    if (dom.countdownHint) {
      dom.countdownHint.textContent = countdownHint || '倒數結束立即顯示真實數據。';
    }
    if (dom.heroCommitment) {
      dom.heroCommitment.textContent = commitment;
    }

    if (dom.exposureTitle) dom.exposureTitle.textContent = exposureMetric.title;
    if (dom.exposureMetric) dom.exposureMetric.textContent = exposureMetric.metric || '—';
    if (dom.exposureSource) dom.exposureSource.textContent = exposureMetric.source || 'SerpAPI';
    updateList(dom.exposureList, exposureMetric.bullets, 'SerpAPI 正在比對 Local Pack 與品牌曝光。');

    if (dom.recommendationTitle) dom.recommendationTitle.textContent = recommendationMetric.title;
    if (dom.recommendationMetric) dom.recommendationMetric.textContent = recommendationMetric.metric || '—';
    if (dom.recommendationSource) dom.recommendationSource.textContent = recommendationMetric.source || 'SerpAPI';
    updateList(dom.recommendationList, recommendationMetric.bullets, 'SerpAPI 正在擷取熱門摘要與網站展示。');

    if (dom.alertTitle) dom.alertTitle.textContent = alertMetric.title;
    if (dom.alertMetric) dom.alertMetric.textContent = alertMetric.metric || '—';
    if (dom.alertSource) dom.alertSource.textContent = alertMetric.source || 'SerpAPI';
    updateList(dom.alertList, alertMetric.bullets, 'AI 正在解析最新差評與搜尋缺口。');

    updateList(dom.taskImmediateList, tasks.immediate, '沒有需要立即補救的項目。');
    updateList(dom.taskNextList, tasks.next, '目前沒有下一步守護建議，保持觀察即可。');
    updateList(dom.taskSelfList, tasks.self, '整理中，稍後會提供自助守護指引。');

    toggleBadge(dom.taskImmediateBadge, tasks.immediate);
    toggleBadge(dom.taskNextBadge, tasks.next);
    toggleBadge(dom.taskSelfBadge, tasks.self);

    if (dom.guardianStatus) dom.guardianStatus.textContent = guardian.status;
    if (dom.guardianTitle) dom.guardianTitle.textContent = guardian.title;
    if (dom.guardianDescription) dom.guardianDescription.textContent = guardian.description;
    if (dom.guardianNextSync) dom.guardianNextSync.textContent = guardian.nextSync;
    if (dom.guardianAutomation) dom.guardianAutomation.textContent = guardian.automation;
    if (dom.guardianStub) dom.guardianStub.textContent = guardian.stub;

    if (dom.detailExposure) {
      dom.detailExposure.textContent = exposureMetric.detail || exposureMetric.bullets.join('；');
    }
    if (dom.detailRecommendation) {
      dom.detailRecommendation.textContent = recommendationMetric.detail || recommendationMetric.bullets.join('；');
    }
    if (dom.detailAlerts) {
      const alertDetails = ensureArray(alertMetric.bullets)
        .concat(ensureArray(tasks.immediate))
        .map((item) => (typeof item === 'string' ? item : ''))
        .filter(Boolean)
        .join('；');
      dom.detailAlerts.textContent = alertMetric.detail || alertDetails || 'AI 正在彙整危機清單。';
    }

    if (dom.ctaPrimaryNote) {
      const firstImmediate = ensureArray(tasks.immediate)[0] || ensureArray(alertMetric.bullets)[0];
      dom.ctaPrimaryNote.textContent = firstImmediate || 'AI 同步守護任務中…';
    }
  }

  function syncLinks() {
    const sharedParams = {
      lead_id: state.leadId || undefined,
      token: state.token || undefined,
    };
    if (dom.ctaSecondary) {
      dom.ctaSecondary.setAttribute('href', buildUrlWithParams(endpoints.detail, sharedParams));
    }
    if (dom.ctaUpgrade) {
      dom.ctaUpgrade.setAttribute('href', buildUrlWithParams(endpoints.plan, sharedParams));
    }
    if (dom.errorHome) {
      dom.errorHome.setAttribute('href', buildUrlWithParams(endpoints.form, sharedParams));
    }
  }

  async function handleAssistantEntry() {
    if (!endpoints.assistantEntry) {
      showToast('尚未設定守護專家入口，請稍後再試。');
      return;
    }
    if (!state.leadId) {
      showToast('缺少 lead_id，請返回主頁重新啟動流程。');
      return;
    }
    if (dom.ctaPrimary) {
      dom.ctaPrimary.disabled = true;
      dom.ctaPrimary.classList.add('btn--loading');
    }
    try {
      const payload = {
        lead_id: state.leadId,
        serp: state.lastPayload?.serp || getSerpSource(state.lastPayload || {}),
        report: state.lastPayload,
      };
      const result = await requestJSON(endpoints.assistantEntry, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      logEvent('cta_click', { action: 'assistant_entry_serp', lead_id: state.leadId });
      if (result && result.ok === false) {
        const fallbackMessage = result.message || '同步守護專家失敗，請稍後再試。';
        showToast(fallbackMessage);
        return;
      }
      const assistantLink =
        result?.assistant_url
        || result?.assistantUrl
        || result?.chat_url
        || result?.chatUrl
        || result?.line_url
        || result?.lineUrl
        || '';
      const fallbackLink =
        result?.fallback_url
        || config.guardianFallbackUrl
        || config.assistantFallbackUrl
        || config.trialUrl
        || config.checkoutPrimaryUrl
        || config.checkoutSecondaryUrl
        || '';
      if (assistantLink) {
        showToast('已同步守護專家，開啟對話中…', 1800);
        window.open(buildUrlWithParams(assistantLink, { lead_id: state.leadId || undefined }), '_blank', 'noopener');
        return;
      }
      if (fallbackLink) {
        showToast('已同步守護專家，使用 LINE 專家入口…', 2000);
        window.open(buildUrlWithParams(fallbackLink, { lead_id: state.leadId || undefined }), '_blank', 'noopener');
        return;
      }
      showToast('守護專家已同步，稍後將於 LINE 推送通知。', 2200);
    } catch (error) {
      console.error('[serp-report] assistant entry failed', error);
      showToast(`同步失敗：${error.message}`);
    } finally {
      if (dom.ctaPrimary) {
        dom.ctaPrimary.disabled = false;
        dom.ctaPrimary.classList.remove('btn--loading');
      }
    }
  }

  async function loadSerpReport(showToastOnSuccess = false) {
    setLoading(true);
    hideError();
    try {
      const data = await fetchReport();
      if (data.report_token) {
        state.token = data.report_token;
      } else if (data.report?.token) {
        state.token = data.report.token;
      }
      if (!state.leadId && data.lead_id) {
        state.leadId = data.lead_id;
      }
      renderSerp(data);
      syncLinks();
      if (showToastOnSuccess) {
        showToast('已更新最新結果', 1600);
      }
    } catch (error) {
      console.error('[serp-report] load failed', error);
      showError(error.message || '暫時無法取得資料，請稍後再試。');
      showToast('載入失敗，請稍後再試', 2200);
    } finally {
      setLoading(false);
    }
  }

  function bindEvents() {
    if (dom.ctaPrimary) {
      dom.ctaPrimary.addEventListener('click', handleAssistantEntry);
    }
    if (dom.errorRetry) {
      dom.errorRetry.addEventListener('click', () => loadSerpReport(true));
    }
  }

  function bootstrap() {
    bindEvents();
    syncLinks();
    loadSerpReport();
  }

  bootstrap();
})();
