(function () {
  const engine = window.starEngine || {};
  const config = window.__STAR_ENGINE_CONFIG__ || {};
  const shell = document.querySelector('[data-handoff]');
  const emptyState = document.querySelector('[data-empty-state]');

  const API_BASE = (config.API_BASE || '').replace(/\/$/, '');
  const LIFF_ID = config.LIFF_ID || config.CHATKIT_APP_ID || '';
  const LIFF_BASE_URL = LIFF_ID ? `https://liff.line.me/${LIFF_ID}` : '';
  const CHATKIT_BASE = resolveChatkitBase();
  const CHATKIT_REDIRECT_PAGE =
    (typeof config.CHATKIT_REDIRECT_URL === 'string' && config.CHATKIT_REDIRECT_URL.trim()) ||
    'https://liff.line.me/2008215846-5LwXlWVN';
  const CHATKIT_ENTRY = resolveChatkitEntry();
  const CHATKIT_FALLBACK =
    config.CHATKIT_FALLBACK_URL ||
    config.ENTRY_LIFF_URL ||
    'https://chelov134999.github.io/star-engine-liff-pages/index.html';
  const CHATKIT_MESSAGE_TEXT = '守護專家';
  const externalNotice = document.querySelector('[data-external-notice]');
  const externalMessage = externalNotice?.querySelector('[data-external-message]');
  const externalAction = externalNotice?.querySelector('[data-external-open]');

  document.addEventListener('DOMContentLoaded', () => {
    if (!shell) return;

    const rawContext = resolveContext();
    const context = enrichContext(rawContext);
    const hasLead = Boolean(context.leadId);

    toggleStates(hasLead);
    populateLeadInfo(context);
    setupChatkitCta(context);
    setupBackupLink(context);
  });

  function resolveContext() {
    if (typeof engine.getLeadContext === 'function') {
      return engine.getLeadContext() || {};
    }
    const params = new URLSearchParams(window.location.search);
    return {
      leadId: params.get('lead_id') || '',
      token: params.get('token') || '',
    };
  }

  function enrichContext(context) {
    const enriched = { ...context };
    try {
      const stored = window.localStorage?.getItem('se_lead_id');
      if (!enriched.leadId && stored) {
        enriched.leadId = stored;
      } else if (enriched.leadId) {
        window.localStorage?.setItem('se_lead_id', enriched.leadId);
      }
    } catch {
      // storage unavailable
    }
    return enriched;
  }

  function toggleStates(hasLead) {
    if (!shell) return;
    if (hasLead) {
      shell.hidden = false;
      if (emptyState) emptyState.hidden = true;
    } else {
      shell.hidden = false;
      if (emptyState) emptyState.hidden = false;
    }
  }

  function populateLeadInfo(context) {
    const leadEl = shell.querySelector('[data-lead-code]');
    if (leadEl) {
      leadEl.textContent = context.leadId || '—';
    }
  }

  function setupChatkitCta(context) {
    const button = shell.querySelector('[data-chatkit-cta]');
    if (!button) return;

    button.classList.remove('is-disabled');
    button.removeAttribute('aria-disabled');
    button.removeAttribute('tabindex');

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const payload = {
        source: 's7_footer',
        lead_id: context.leadId || null,
        intent: 'see_report',
      };
      trackChatEvent('chat_cta_click', payload);
      trackChatEvent('chat_dl_attempt', payload);
      logLeadEvent('s7_deeplink_clicked', {
        lead_id: context.leadId || null,
        channel: 'chatkit',
        source: 's7_footer',
      });

      await sendGuardianKeyword(context);
    });
  }

  function setupBackupLink(context) {
    const fallbackLink = shell.querySelector('[data-backup-link]');
    if (!fallbackLink) return;

    const template = fallbackLink.getAttribute('data-template');
    const resolvedHref = template
      ? template.replace('{{lead_id}}', encodeURIComponent(context.leadId || ''))
      : fallbackLink.getAttribute('href');

    if (resolvedHref) {
      fallbackLink.setAttribute('href', resolvedHref);
      fallbackLink.addEventListener('click', () => {
        logLeadEvent('s7_email_fallback_clicked', {
          lead_id: context.leadId || null,
          channel: 'email',
          source: 's7_footer',
        });
        trackChatEvent('chat_fallback_click', {
          source: 's7_footer',
          fallback: resolvedHref,
          lead_id: context.leadId || null,
        });
      });
    }
  }

  async function sendGuardianKeyword(context = {}) {
    const leadId = context.leadId || null;
    let lineContext = null;
    let liffReady = false;

    if (typeof engine.ensureLiffReady === 'function') {
      liffReady = await engine.ensureLiffReady();
    } else if (window.liff) {
      liffReady = true;
    }

    if (typeof engine.getLiffContext === 'function') {
      lineContext = await engine.getLiffContext();
    }
    if (!lineContext && liffReady && window.liff && typeof window.liff.getContext === 'function') {
      try {
        lineContext = window.liff.getContext();
      } catch (error) {
        console.warn('[chatkit] getContext failed', error);
      }
    }

    const lineUserId = lineContext && lineContext.userId ? lineContext.userId : null;
    const contextType = (lineContext && lineContext.type ? String(lineContext.type) : '').toLowerCase();
    const inClient = Boolean(
      window.liff && typeof window.liff.isInClient === 'function' ? window.liff.isInClient() : contextType && contextType !== 'external',
    );
    const canAttemptDirect = liffReady && inClient;
    let lastDirectError = null;

    if (typeof engine.ensureLineBinding === 'function' && leadId) {
      engine.ensureLineBinding({ leadId }).catch(() => {});
    }

    const sendDirectMessage = async () => {
      if (!canAttemptDirect) return false;
      if (typeof engine.sendChatkitMessage === 'function') {
        const sent = await engine.sendChatkitMessage();
        if (sent) return true;
      }
      if (window.liff && typeof window.liff.sendMessages === 'function') {
        try {
          await window.liff.sendMessages([{ type: 'text', text: CHATKIT_MESSAGE_TEXT }]);
          return true;
        } catch (error) {
          console.warn('[chatkit] sendMessages failed', error);
          lastDirectError = error;
        }
      }
      return false;
    };

    let dispatched = false;
    if (typeof engine.triggerGuardianWebhook === 'function') {
      try {
        dispatched = await engine.triggerGuardianWebhook({
          leadId,
          lineUserId,
          trigger: 's7_cta',
          intent: 'guardian_keyword',
        });
      } catch (error) {
        console.warn('[guardian] webhook dispatch failed', error);
      }
    }
    if (dispatched) {
      closeLiffView();
      return true;
    }

    if (!canAttemptDirect || lastDirectError) {
      const fallbackReason = !inClient ? 'not_in_client' : 'send_failed';
      trackChatEvent('chat_guardian_fallback', {
        lead_id: leadId || null,
        source: 's7_cta',
        reason: fallbackReason,
        context_type: contextType || 'unknown',
      });
      showExternalNotice(context, fallbackReason, lastDirectError);
      return false;
    }

    const finalAttempt = await sendDirectMessage();
    if (finalAttempt) {
      closeLiffView();
      return true;
    }

    showExternalNotice(context, 'send_failed', lastDirectError);
    return false;
  }

  function closeLiffView() {
    if (typeof engine.closeLiffWindow === 'function') {
      engine.closeLiffWindow();
    } else if (window.liff && typeof window.liff.closeWindow === 'function') {
      window.liff.closeWindow();
    }
  }

  function disableAction(element) {
    if (!element) return;
    element.classList.add('is-disabled');
    element.setAttribute('aria-disabled', 'true');
    element.setAttribute('tabindex', '-1');
    element.addEventListener('click', (event) => event.preventDefault());
  }

  function buildChatkitLink(context, { intent, source, fallback } = {}) {
    if (!CHATKIT_ENTRY) return null;
    try {
      const url = new URL(CHATKIT_ENTRY, window.location.href);
      if (CHATKIT_ENTRY === CHATKIT_REDIRECT_PAGE) {
        if (context.leadId) url.searchParams.set('lead_id', context.leadId);
        url.searchParams.set('intent', intent || 'see_report');
        const resolvedFallback = fallback || CHATKIT_FALLBACK;
        if (resolvedFallback && resolvedFallback !== CHATKIT_ENTRY) {
          url.searchParams.set('fallback', resolvedFallback);
        }
        if (source) url.searchParams.set('source', source);
      } else {
        if (context.leadId) url.searchParams.set('lead_id', context.leadId);
        url.searchParams.set('intent', intent || 'see_report');
        const resolvedFallback = fallback || CHATKIT_FALLBACK;
        if (resolvedFallback && resolvedFallback !== CHATKIT_ENTRY) {
          url.searchParams.set('fallback', resolvedFallback);
        }
        if (source) url.searchParams.set('source', source);
      }
      return url.toString();
    } catch (error) {
      console.warn('[chatkit] failed to build deeplink', error);
      return CHATKIT_ENTRY;
    }
  }

  function buildLiffDeepLink(view, context = {}) {
    if (!LIFF_BASE_URL) return '';
    const params = new URLSearchParams();
    if (view && view !== 'index') params.set('view', view);
    if (context.leadId) params.set('lead_id', context.leadId);
    if (context.token) params.set('token', context.token);
    return `${LIFF_BASE_URL}?${params.toString()}`;
  }

  function showExternalNotice(context, reason, error) {
    if (!externalNotice) return;
    const message =
      reason === 'not_in_client'
        ? '請在 LINE 聊天視窗中開啟此報告，再點擊「與守護專家聊聊」。'
        : '目前系統忙線，稍後再試，或直接在聊天室輸入「守護專家」。';
    if (externalMessage) {
      externalMessage.textContent = message;
    }
    if (externalAction) {
      const deepLink = buildLiffDeepLink('report', context);
      if (deepLink) {
        externalAction.href = deepLink;
        externalAction.hidden = false;
      } else {
        externalAction.href = '#';
        externalAction.hidden = true;
      }
    }
    if (reason === 'send_failed' && error) {
      console.warn('[chatkit] guardian CTA fallback', error);
    }
    externalNotice.hidden = false;
  }

  function resolveChatkitEntry() {
    if (CHATKIT_REDIRECT_PAGE) {
      return CHATKIT_REDIRECT_PAGE;
    }

    return CHATKIT_BASE;
  }

  function resolveChatkitBase() {
    if (config.CHATKIT_APP_ID) {
      return `https://liff.line.me/${config.CHATKIT_APP_ID}`;
    }

    if (config.CHATKIT_URL) {
      try {
        const url = new URL(config.CHATKIT_URL, window.location.href);
        url.search = '';
        url.hash = '';
        return url.toString();
      } catch (error) {
        console.warn('[chatkit] invalid CHATKIT_URL', error);
      }
    }

    return '';
  }

  function logLeadEvent(eventName, payload = {}) {
    if (!eventName || !API_BASE) return;
    const endpoint = `${API_BASE}/ai/log_event`;
    const body = JSON.stringify({
      ev: eventName,
      ts: new Date().toISOString(),
      ...payload,
    });

    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
        return;
      } catch {
        // fall through
      }
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  function trackChatEvent(eventName, payload = {}) {
    if (!eventName) return;
    const analyticsPayload = { ev: eventName, ts: Date.now(), ...payload };

    if (window.starAnalytics && typeof window.starAnalytics.track === 'function') {
      window.starAnalytics.track(eventName, payload);
      return;
    }

    if (!API_BASE) return;
    const endpoint = `${API_BASE}/analytics`;
    const body = JSON.stringify(analyticsPayload);

    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
        return;
      } catch {
        // ignore and fallback
      }
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }
})();
