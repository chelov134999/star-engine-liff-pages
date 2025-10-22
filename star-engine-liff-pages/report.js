(function () {
  const engine = window.starEngine || {};
  const shell = document.querySelector('[data-handoff]');
  const emptyState = document.querySelector('[data-empty-state]');

  document.addEventListener('DOMContentLoaded', () => {
    if (!shell) return;

    const context = resolveContext();
    const hasLead = Boolean(context.leadId);

    toggleStates(hasLead);
    populateLeadInfo(shell, context);
    setupChatkitCta(shell, context);
    setupBackupLink(shell, context);
    initChatkitFooter(context);
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

    const chatUrl = buildChatkitIntentUrl(context, null, { entry: 'cta' });
    const hasLead = Boolean(context.leadId);

    if (chatUrl && hasLead) {
      button.classList.remove('is-disabled');
      button.removeAttribute('aria-disabled');
      button.removeAttribute('tabindex');
      button.setAttribute('href', chatUrl);
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const leadId = context.leadId || null;
        logLeadEvent('s7_deeplink_clicked', {
          lead_id: leadId,
          channel: 'chatkit',
          source: 'cta',
        });
        if (engine.trackEvent && typeof engine.trackEvent === 'function') {
          engine.trackEvent('s7_deeplink_clicked', { lead_id: leadId, source: 'cta' });
        }
        navigateToChatkit(context, { entry: 'cta' });
      });
    } else {
      disableAction(button);
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
          source: 'cta_backup',
        });
        if (engine.trackEvent && typeof engine.trackEvent === 'function') {
          engine.trackEvent('s7_email_fallback_clicked', {
            lead_id: context.leadId || null,
            source: 'cta_backup',
          });
        }
      });
    } else {
      disableAction(fallbackLink);
    }
  }

  function initChatkitFooter(context) {
    const footer = document.querySelector('[data-chatkit-footer]');
    if (!footer) return;

    const resolvedContext = { ...context };
    try {
      const storedLead = window.localStorage?.getItem('se_lead_id');
      if (!resolvedContext.leadId && storedLead) {
        resolvedContext.leadId = storedLead;
      } else if (resolvedContext.leadId) {
        window.localStorage?.setItem('se_lead_id', resolvedContext.leadId);
      }
    } catch {
      // private mode or disabled storage
    }

    const leadId = resolvedContext.leadId || '';
    const cta = footer.querySelector('[data-chatkit-footer-cta]');
    const quickLinks = footer.querySelectorAll('[data-chatkit-intent]');
    const emailLink = footer.querySelector('[data-chatkit-email]');
    const chatUrl = buildChatkitIntentUrl(resolvedContext, null, { entry: 'footer' });

    if (cta) {
      if (chatUrl && leadId) {
        cta.setAttribute('href', chatUrl);
        cta.classList.remove('is-disabled');
        cta.removeAttribute('aria-disabled');
        cta.removeAttribute('tabindex');
        cta.addEventListener('click', (event) => {
          event.preventDefault();
          logLeadEvent('s7_deeplink_clicked', {
            lead_id: leadId,
            channel: 'chatkit_footer',
            source: 'footer',
          });
          if (engine.trackEvent && typeof engine.trackEvent === 'function') {
            engine.trackEvent('s7_deeplink_clicked', { lead_id: leadId, source: 'footer' });
          }
          navigateToChatkit(resolvedContext, { entry: 'footer' });
        });
      } else {
        disableAction(cta);
      }
    }

    quickLinks.forEach((link) => {
      const intent = link.getAttribute('data-chatkit-intent');
      const intentUrl = intent ? buildChatkitIntentUrl(resolvedContext, intent, { entry: 'footer' }) : null;
      if (!intentUrl || !leadId) {
        disableAction(link);
        return;
      }
      link.setAttribute('href', intentUrl);
      link.classList.remove('is-disabled');
      link.removeAttribute('aria-disabled');
      link.removeAttribute('tabindex');
      link.addEventListener('click', (event) => {
        event.preventDefault();
        logLeadEvent('task_selected', {
          lead_id: leadId,
          source: 'footer',
          payload: { intent },
        });
        if (engine.trackEvent && typeof engine.trackEvent === 'function') {
          engine.trackEvent('task_selected', { lead_id: leadId, intent, source: 'footer' });
        }
        navigateToChatkit(resolvedContext, { intent, entry: 'footer' });
      });
    });

    if (emailLink) {
      if (leadId) {
        try {
          const mailto = new URL(emailLink.getAttribute('href') || '', window.location.href);
          mailto.searchParams.set(
            'body',
            `請在此留下您的入場券編號：${leadId}\n\n（我們會在 24 小時內寄出摘要）`,
          );
          emailLink.setAttribute('href', mailto.toString());
        } catch {
          // silently ignore malformed mailto url
        }
        emailLink.classList.remove('is-disabled');
        emailLink.removeAttribute('aria-disabled');
        emailLink.removeAttribute('tabindex');
        emailLink.addEventListener('click', () => {
          logLeadEvent('s7_email_fallback_clicked', {
            lead_id: leadId,
            channel: 'email',
            source: 'footer',
          });
          if (engine.trackEvent && typeof engine.trackEvent === 'function') {
            engine.trackEvent('s7_email_fallback_clicked', { lead_id: leadId, source: 'footer' });
          }
        });
      } else {
        disableAction(emailLink);
      }
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
      } catch {
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

  function buildChatkitIntentUrl(context, intent, options = {}) {
    const baseUrl = buildChatkitUrl(context);
    if (!baseUrl) return null;
    try {
      const url = new URL(baseUrl);
      if (options.entry) url.searchParams.set('entry', options.entry);
      if (intent) url.searchParams.set('intent', intent);
      return url.toString();
    } catch {
      return baseUrl;
    }
  }

  function navigateToChatkit(context, { intent, entry } = {}) {
    const targetUrl = buildChatkitIntentUrl(context, intent, { entry });
    if (window.starChatKit?.focusChat) {
      window.starChatKit.focusChat();
      return;
    }
    if (window.starChatKit?.showChat) {
      window.starChatKit.showChat();
      return;
    }
    if (targetUrl) {
      window.location.href = targetUrl;
    }
  }

  function disableAction(element) {
    if (!element) return;
    element.classList.add('is-disabled');
    element.setAttribute('aria-disabled', 'true');
    element.setAttribute('tabindex', '-1');
    element.addEventListener('click', (event) => event.preventDefault());
  }
})();
