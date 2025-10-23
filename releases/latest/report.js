(function () {
  const engine = window.starEngine || {};
  const config = window.__STAR_ENGINE_CONFIG__ || {};
  const shell = document.querySelector('[data-handoff]');
  const emptyState = document.querySelector('[data-empty-state]');

  const API_BASE = (config.API_BASE || '').replace(/\/$/, '');
  const CHATKIT_BASE = resolveChatkitBase();
  const CHATKIT_FALLBACK =
    config.CHATKIT_FALLBACK_URL || config.ENTRY_LIFF_URL || 'https://liff.line.me/STAR_ENGINE_INDEX';

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

    const deepLink = buildChatkitLink(context, { intent: 'see_report', source: 's7_footer' });
    if (!deepLink) {
      disableAction(button);
      return;
    }

    button.setAttribute('href', deepLink);
    button.setAttribute('rel', 'noopener noreferrer');
    button.classList.remove('is-disabled');
    button.removeAttribute('aria-disabled');
    button.removeAttribute('tabindex');

    button.addEventListener('click', () => {
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
    if (!CHATKIT_BASE) return null;
    try {
      const url = new URL(CHATKIT_BASE);
      if (context.leadId) {
        url.searchParams.set('lead_id', context.leadId);
      }
      url.searchParams.set('intent', intent || 'see_report');
      url.searchParams.set('fallback', fallback || CHATKIT_FALLBACK);
      if (source) {
        url.searchParams.set('source', source);
      }
      return url.toString();
    } catch (error) {
      console.warn('[chatkit] failed to build deeplink', error);
      return CHATKIT_BASE;
    }
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
