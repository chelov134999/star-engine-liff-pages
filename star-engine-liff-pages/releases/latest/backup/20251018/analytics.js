(function () {
  const queue = [];
  let sending = false;

  function getConfig() {
    return window.__STAR_ENGINE_CONFIG__ || {};
  }

  function getApiBase() {
    const { API_BASE } = getConfig();
    return API_BASE;
  }

  function track(eventName, payload = {}) {
    if (!eventName) return;
    const eventPayload = {
      ev: eventName,
      ts: new Date().toISOString(),
      url: window.location.href,
      ua: window.navigator?.userAgent || 'unknown',
      ...payload,
    };
    queue.push({ data: eventPayload, retries: 0 });
    flushQueue();
  }

  async function flushQueue() {
    if (sending || queue.length === 0) return;
    const apiBase = getApiBase();
    if (!apiBase || typeof fetch !== 'function') {
      return;
    }

    sending = true;
    const item = queue.shift();

    try {
      await fetch(`${apiBase}/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item.data),
      });
    } catch (error) {
      if (item.retries < 2) {
        queue.unshift({ data: item.data, retries: item.retries + 1 });
      }
    } finally {
      sending = false;
      if (queue.length > 0) {
        setTimeout(flushQueue, 300);
      }
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-analytics-event]');
    if (!target) return;
    const eventName = target.dataset.analyticsEvent;
    if (!eventName) return;
    let payload = {};
    if (target.dataset.analyticsPayload) {
      try {
        payload = JSON.parse(target.dataset.analyticsPayload);
      } catch {
        payload = {};
      }
    }
    track(eventName, payload);
  });

  window.starAnalytics = {
    track,
  };

  setInterval(() => {
    if (!sending) {
      flushQueue();
    }
  }, 4000);
})();
