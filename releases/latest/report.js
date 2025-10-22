(function () {
  const engine = window.starEngine || {};
  const shell = document.querySelector('[data-handoff]');
  const emptyState = document.querySelector('[data-empty-state]');

  document.addEventListener('DOMContentLoaded', () => {
    if (!shell) return;

    const context = resolveContext();
    const hasLead = Boolean(context.leadId);

    toggleStates(hasLead);

    if (!hasLead) return;

    populateLeadInfo(shell, context);
    setupChatkitCta(shell, context);
    setupBackupLink(shell, context);
  });

  function resolveContext() {
    if (engine.getLeadContext && typeof engine.getLeadContext === 'function') {
      return engine.getLeadContext();
    }
    const params = new URLSearchParams(window.location.search);
    return {
      leadId: params.get('lead_id') || '',
      token: params.get('token') || '',
    };
  }

  function toggleStates(hasLead) {
    if (!shell) return;
    if (hasLead) {
      shell.hidden = false;
      if (emptyState) emptyState.hidden = true;
    } else {
      shell.hidden = true;
      if (emptyState) emptyState.hidden = false;
    }
  }

  function populateLeadInfo(root, context) {
    const leadEl = root.querySelector('[data-lead-code]');
    if (leadEl) {
      leadEl.textContent = context.leadId || '—';
    }
  }

  function setupChatkitCta(root, context) {
    const button = root.querySelector('[data-chatkit-cta]');
    if (!button) return;

    if (context.leadId) {
      button.classList.remove('is-disabled');
      button.removeAttribute('aria-disabled');
      button.removeAttribute('tabindex');
      button.addEventListener('click', (event) => {
        event.preventDefault();
        logLeadEvent('s7_deeplink_clicked', {
          lead_id: context.leadId || null,
          channel: 'chatkit',
        });
        if (engine.trackEvent && typeof engine.trackEvent === 'function') {
          engine.trackEvent('s7_deeplink_clicked', { lead_id: context.leadId || null });
        }
        if (window.starChatKit?.focusChat) {
          window.starChatKit.focusChat();
        } else {
          const deepLink = buildChatkitUrl(context);
          if (deepLink) {
            window.open(deepLink, '_blank', 'noopener,noreferrer');
          }
        }
      });
    } else {
      button.classList.add('is-disabled');
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('tabindex', '-1');
      button.addEventListener('click', (event) => event.preventDefault());
    }
  }

  function setupBackupLink(root, context) {
    const fallbackLink = root.querySelector('[data-backup-link]');
    if (!fallbackLink) return;

    const template = fallbackLink.getAttribute('data-template');
    if (context.leadId && template) {
      const resolved = template.replace('{{lead_id}}', encodeURIComponent(context.leadId));
      fallbackLink.setAttribute('href', resolved);
      fallbackLink.addEventListener('click', () => {
        logLeadEvent('s7_email_fallback_clicked', {
          lead_id: context.leadId || null,
          channel: 'email',
        });
        if (engine.trackEvent && typeof engine.trackEvent === 'function') {
          engine.trackEvent('s7_email_fallback_clicked', { lead_id: context.leadId || null });
        }
      });
    } else if (!context.leadId) {
      fallbackLink.setAttribute('aria-disabled', 'true');
      fallbackLink.setAttribute('tabindex', '-1');
      fallbackLink.addEventListener('click', (event) => event.preventDefault());
    }
  }

  function logLeadEvent(eventName, payload = {}) {
    const base = window.__STAR_ENGINE_CONFIG__?.API_BASE;
    if (!eventName || !base) return;

    if (window.starChatKit?.logS7Event) {
      window.starChatKit.logS7Event(eventName, payload).catch(() => {});
      return;
    }

    const endpoint = `${base.replace(/\/$/, '')}/ai/log_event`;
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
      } catch (error) {
        // ignore and fallback to fetch
      }
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  function buildChatkitUrl(context) {
    if (!context.leadId) return null;
    if (engine.buildChatkitUrl && typeof engine.buildChatkitUrl === 'function') {
      return engine.buildChatkitUrl(context);
    }
    const base = window.__STAR_ENGINE_CONFIG__?.CHATKIT_URL;
    if (!base) return null;
    try {
      const url = new URL(base, window.location.href);
      url.searchParams.set('lead_id', context.leadId);
      return url.toString();
    } catch {
      const separator = base.includes('?') ? '&' : '?';
      return `${base}${separator}lead_id=${encodeURIComponent(context.leadId)}`;
    }
  }

})();
