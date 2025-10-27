(function () {
  const engine = window.starEngine || {};
  const config = window.__STAR_ENGINE_CONFIG__ || {};
  const shell = document.querySelector('[data-handoff]');
  const emptyState = document.querySelector('[data-empty-state]');

  const API_BASE = (config.API_BASE || '').replace(/\/$/, '');
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

      let sent = false;
      if (typeof engine.sendChatkitMessage === 'function') {
        sent = await engine.sendChatkitMessage();
      }

      if (!sent && typeof engine.ensureLiffReady === 'function') {
        await engine.ensureLiffReady();
      }

      if (!sent && window.liff && typeof window.liff.sendMessages === 'function') {
        try {
          await window.liff.sendMessages([{ type: 'text', text: CHATKIT_MESSAGE_TEXT }]);
          sent = true;
        } catch (error) {
          console.warn('[chatkit] sendMessages failed', error);
        }
      }

      if (sent) {
        if (typeof engine.closeLiffWindow === 'function') {
          engine.closeLiffWindow();
        } else if (window.liff && typeof window.liff.closeWindow === 'function') {
          window.liff.closeWindow();
        }
      }
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
