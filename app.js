(function () {
  const CONFIG = window.__STAR_ENGINE_CONFIG__ || {};
  const API_BASE =
    typeof CONFIG.API_BASE === 'string' && CONFIG.API_BASE.trim().length > 0
      ? CONFIG.API_BASE.replace(/\/$/, '')
      : '';

  const STORAGE_KEYS = {
    lead: 'star-engine/lead-context',
  };

  const STAGE_FLOW = [
    {
      id: 'S1',
      event: 'card1_cta',
      idle: 'S1 等待排程',
      active: 'AI 正在搜尋地圖與 AI 摘要中的品牌足跡…',
      complete: 'AI 已鎖定你的品牌足跡',
    },
    {
      id: 'S2',
      event: 'card2_cta',
      idle: 'S2 等待掃描完成',
      active: 'AI 正在同步評論與競品資訊…',
      complete: 'AI 掌握每日守護清單',
    },
    {
      id: 'S3',
      event: 'card3_cta',
      idle: 'S3 等待資料彙整',
      active: 'AI 正在生成品牌指紋…',
      complete: '品牌指紋建立完成',
    },
    {
      id: 'S4',
      event: 'card4_cta',
      idle: 'S4 等待競品比對',
      active: 'AI 正在比對附近競品…',
      complete: '競品 Top3 比對完成',
    },
    {
      id: 'S5',
      event: 'card5_cta',
      idle: 'S5 等待守護啟動',
      active: 'AI 正在配置巡邏任務…',
      complete: '守護巡邏就緒',
    },
    {
      id: 'S6',
      event: 'card6_cta_report',
      idle: 'S6 等待報告完成',
      active: 'AI 正在寫入初檢報告…',
      complete: 'AI 初檢報告已產生',
    },
  ];

  const analytics = window.starAnalytics;

  function trackEvent(eventName, payload = {}) {
    if (!eventName || !analytics || typeof analytics.track !== 'function') return;
    analytics.track(eventName, payload);
  }

  function formatTimestamp(isoString) {
    if (!isoString) return '--';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '--';
    return d.toLocaleString('zh-TW', {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function safeLocalStorage(callback, fallback = null) {
    try {
      return callback();
    } catch (error) {
      return fallback;
    }
  }

  function getStoredLead() {
    return safeLocalStorage(() => {
      const raw = window.localStorage.getItem(STORAGE_KEYS.lead);
      return raw ? JSON.parse(raw) : null;
    });
  }

  function setStoredLead(context) {
    if (!context) return;
    safeLocalStorage(() => {
      window.localStorage.setItem(STORAGE_KEYS.lead, JSON.stringify(context));
    });
  }

  function parseQueryContext() {
    const params = new URLSearchParams(window.location.search);
    return {
      leadId: params.get('lead_id') || params.get('leadId') || '',
      token: params.get('token') || '',
    };
  }

  function getLeadContext() {
    const stored = getStoredLead();
    const query = parseQueryContext();
    const leadId = query.leadId || stored?.leadId || '';
    const token = query.token || stored?.token || '';
    const createdAt = stored?.createdAt || (leadId ? new Date().toISOString() : null);
    const context = { leadId, token, createdAt };
    if (leadId || token) {
      setStoredLead(context);
    }
    return context;
  }

  function submitLead(payload) {
    if (!API_BASE) {
      throw new Error('missing_api_base');
    }
    return fetch(`${API_BASE}/lead-entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  function initLeadForm() {
    const form = document.getElementById('lead-form');
    if (!form) return;

    trackEvent('s0_view', { page: 'index' });
    initChatkitFooter(getLeadContext());

    const statusEl = form.querySelector('.form-status');
    const submitBtn = form.querySelector('button[type="submit"]');
    const labelEl = submitBtn?.querySelector('.btn-label');
    const originalLabel = labelEl?.textContent || '';
    document
      .querySelectorAll(
        '[data-analytics-event="s0_preview"], [data-analytics-event="s0_preview_click"]',
      )
      .forEach((link) => {
        link.addEventListener('click', () => trackEvent('s0_preview'));
      });

    const handoffOverlay = document.getElementById('handoff-overlay');
    const handoffProgress = handoffOverlay?.querySelector('[data-handoff-progress]');

    const inputs = Array.from(form.querySelectorAll('input'));

    const setStatus = (message, type) => {
      if (!statusEl) return;
      statusEl.textContent = message || '';
      statusEl.classList.remove('is-error', 'is-success');
      if (type) statusEl.classList.add(`is-${type}`);
    };

    const showHandoff = () => {
      if (!handoffOverlay) return;
      handoffOverlay.hidden = false;
      if (handoffProgress) {
        handoffProgress.style.animation = 'none';
        void handoffProgress.offsetWidth;
        handoffProgress.style.animation = '';
      }
      void handoffOverlay.offsetWidth;
      handoffOverlay.classList.add('is-active');
    };

    const hideHandoff = () => {
      if (!handoffOverlay) return;
      handoffOverlay.classList.remove('is-active');
      window.setTimeout(() => {
        if (!handoffOverlay.classList.contains('is-active')) {
          handoffOverlay.hidden = true;
        }
      }, 260);
    };

    const validateField = (input, { silent } = {}) => {
      if (!input) return false;
      const wrapper = input.closest('.field');
      const errorEl = wrapper?.querySelector('.field__error');
      const value = input.value.trim();
      let hasError = false;

      if (input.hasAttribute('required') && !value) {
        hasError = true;
        wrapper?.classList.add('is-error');
        if (errorEl) errorEl.textContent = input.dataset.errorEmpty || '此欄位為必填';
        if (!silent) {
          trackEvent('s0_error_empty_field', { field: input.name });
        }
      } else {
        wrapper?.classList.remove('is-error');
        if (errorEl) errorEl.textContent = '';
      }

      return hasError;
    };

    const stored = getStoredLead();
    if (stored?.leadId && statusEl) {
      statusEl.textContent = `你已申請過入場券（${stored.leadId}）。可直接前往流程進度。`;
      statusEl.classList.add('is-success');
    }

    inputs.forEach((input) => {
      input.addEventListener('focus', () => {
        window.setTimeout(() => {
          if (typeof input.scrollIntoView === 'function') {
            input.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }, 120);
      });

      input.addEventListener('blur', () => {
        validateField(input);
      });

      input.addEventListener('input', () => {
        if (input.closest('.field')?.classList.contains('is-error')) {
          validateField(input, { silent: true });
        }
      });

      input.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const selector = input.dataset.autofocusNext;
        if (selector) {
          const next = form.querySelector(selector);
          if (next) {
            next.focus();
            return;
          }
        }
        submitBtn?.focus();
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus('', null);

      const formData = new FormData(form);
      const payload = {};
      let hasError = false;

      inputs.forEach((input) => {
        const value = (formData.get(input.name) || '').toString().trim();
        payload[input.name] = value;
        if (validateField(input)) {
          hasError = true;
        }
      });

      if (hasError) {
        setStatus('請完整填寫城市、路段、門牌與店名。', 'error');
        return;
      }

      if (!API_BASE) {
        setStatus('系統設定異常，請稍後再試。', 'error');
        return;
      }

      submitBtn?.setAttribute('disabled', 'true');
      submitBtn?.classList.add('is-loading');
      const loadingText = submitBtn?.dataset.loadingText;
      if (labelEl && loadingText) {
        labelEl.textContent = loadingText;
      }

      try {
        const payloadSource = payload.source || 'landing-page';
        const response = await submitLead({
          city: payload.city,
          route: payload.route,
          number: payload.number,
          name: payload.name,
          source: payloadSource,
        });

        if (!response.ok) {
          throw new Error(`lead_entry_${response.status}`);
        }

        const result = await response.json();
        const leadId = result.lead_id;
        const token = result.token || '';

        if (!leadId) {
          throw new Error('missing_lead_id');
        }

        const context = {
          leadId,
          token,
          createdAt: new Date().toISOString(),
        };
        setStoredLead(context);

        trackEvent('s0_submit', { lead_id: leadId, source: payloadSource });

        setStatus(`AI 已收到資料（${leadId}），準備帶你進入流程。`, 'success');
        showHandoff();

        const params = new URLSearchParams({ lead_id: leadId });
        if (token) params.set('token', token);

        window.setTimeout(() => {
          window.location.href = `onboarding.html?${params.toString()}`;
        }, 820);
      } catch (error) {
        hideHandoff();
        setStatus('伺服器忙線，請稍後再試。資料已保留。', 'error');
      } finally {
        submitBtn?.classList.remove('is-loading');
        submitBtn?.removeAttribute('disabled');
        if (labelEl) {
          labelEl.textContent = originalLabel;
        }
      }
    });
  }

  function applyStageState(stageId, state, message) {
    const card = document.querySelector(`.stage-card[data-stage="${stageId}"]`);
    if (!card) return;
    card.classList.remove('is-active', 'is-complete');
    if (state === 'active') card.classList.add('is-active');
    if (state === 'complete') card.classList.add('is-complete');
    const statusEl = card.querySelector('[data-stage-status]');
    if (statusEl && message) {
      statusEl.textContent = message;
    }
  }

  function initialiseStagePlaceholders() {
    STAGE_FLOW.forEach((stage) => {
      applyStageState(stage.id, 'idle', stage.idle);
      const button = document.querySelector(
        `.stage-card[data-stage="${stage.id}"] [data-analytics-event]`,
      );
      if (button) {
        button.setAttribute('data-analytics-event', stage.event);
      }
    });
  }

  function applyReportLink(context) {
    const url = buildReportUrl(context);
    document
      .querySelectorAll('[data-report-link]')
      .forEach((el) => {
        if (el.tagName === 'A') {
          el.setAttribute('href', url);
        } else {
          el.dataset.reportHref = url;
        }
      });
  }

  function buildReportUrl(context) {
    if (!context) return 'report.html';
    const params = new URLSearchParams();
    if (context.leadId) params.set('lead_id', context.leadId);
    if (context.token) params.set('token', context.token);
    const query = params.toString();
    return query ? `report.html?${query}` : 'report.html';
  }

  function goToReport(context) {
    const url = buildReportUrl(context);
    window.location.href = url;
  }

  function buildChatkitUrl(context = {}) {
    const base = CONFIG.CHATKIT_URL;
    if (!base) return null;
    try {
      const url = new URL(base, window.location.href);
      if (context.leadId) {
        url.searchParams.set('lead_id', context.leadId);
      }
      return url.toString();
    } catch (error) {
      if (!context.leadId) return base;
      const separator = base.includes('?') ? '&' : '?';
      return `${base}${separator}lead_id=${encodeURIComponent(context.leadId)}`;
    }
  }

  function buildChatkitIntentUrl(context = {}, intent, extras = {}) {
    const baseUrl = buildChatkitUrl(context);
    if (!baseUrl) return null;
    try {
      const url = new URL(baseUrl);
      if (extras.entry) url.searchParams.set('entry', extras.entry);
      if (intent) url.searchParams.set('intent', intent);
      return url.toString();
    } catch {
      return baseUrl;
    }
  }

  function openChatKit(url, context = {}) {
    const targetUrl = url || buildChatkitUrl(context);
    if (!targetUrl) return;
    try {
      window.open(targetUrl, '_blank', 'noopener');
    } catch (error) {
      // ignore opener restrictions
    }
  }

  function navigateToChatkit(context = {}, { intent, entry } = {}) {
    const targetUrl = buildChatkitIntentUrl(context, intent, { entry });
    if (targetUrl) {
      openChatKit(targetUrl, context);
    }
  }

  function logFooterEvent(eventName, payload = {}) {
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

  function disableFooterAction(element) {
    if (!element) return;
    element.classList.add('is-disabled');
    element.setAttribute('aria-disabled', 'true');
    element.setAttribute('tabindex', '-1');
    element.addEventListener('click', (event) => event.preventDefault());
  }

  function initChatkitFooter(context = {}) {
    const footer = document.querySelector('[data-chatkit-footer]');
    if (!footer) return;

    let leadId = context.leadId || '';
    try {
      const storedLead = window.localStorage?.getItem('se_lead_id');
      if (!leadId && storedLead) {
        leadId = storedLead;
      } else if (leadId) {
        window.localStorage?.setItem('se_lead_id', leadId);
      }
    } catch {
      // storage may not be available
    }

    const baseContext = { ...context, leadId };
    const cta = footer.querySelector('[data-chatkit-footer-cta]');
    const quickLinks = footer.querySelectorAll('[data-chatkit-intent]');
    const emailLink = footer.querySelector('[data-chatkit-email]');
    const chatUrl = buildChatkitIntentUrl(baseContext, null, { entry: 'footer' });

    if (cta) {
      if (leadId && chatUrl) {
        cta.setAttribute('href', chatUrl);
        cta.classList.remove('is-disabled');
        cta.removeAttribute('aria-disabled');
        cta.removeAttribute('tabindex');
        cta.addEventListener('click', (event) => {
          event.preventDefault();
          logFooterEvent('s7_deeplink_clicked', {
            lead_id: leadId,
            channel: 'chatkit_footer',
            source: 'footer',
          });
          trackEvent(cta.dataset.analyticsEvent || 'se_chatkit_open', {
            lead_id: leadId,
            source: 'footer',
          });
          navigateToChatkit(baseContext, { entry: 'footer' });
        });
      } else {
        disableFooterAction(cta);
      }
    }

    quickLinks.forEach((link) => {
      const intent = link.getAttribute('data-chatkit-intent');
      const intentUrl = intent ? buildChatkitIntentUrl(baseContext, intent, { entry: 'footer' }) : null;
      if (!leadId || !intentUrl) {
        disableFooterAction(link);
        return;
      }
      link.setAttribute('href', intentUrl);
      link.classList.remove('is-disabled');
      link.removeAttribute('aria-disabled');
      link.removeAttribute('tabindex');
      link.addEventListener('click', (event) => {
        event.preventDefault();
        logFooterEvent('task_selected', {
          lead_id: leadId,
          source: 'footer',
          payload: { intent },
        });
        trackEvent('se_quick_intent_clicked', { lead_id: leadId, intent, source: 'footer' });
        navigateToChatkit(baseContext, { intent, entry: 'footer' });
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
          // ignore invalid mailto
        }
        emailLink.classList.remove('is-disabled');
        emailLink.removeAttribute('aria-disabled');
        emailLink.removeAttribute('tabindex');
        emailLink.addEventListener('click', () => {
          logFooterEvent('s7_email_fallback_clicked', {
            lead_id: leadId,
            channel: 'email',
            source: 'footer',
          });
          trackEvent('se_email_fallback_clicked', { lead_id: leadId, source: 'footer' });
        });
      } else {
        disableFooterAction(emailLink);
      }
    }
  }

  function initServiceSwiper() {
    const swiper = document.querySelector('[data-service-swiper]');
    if (!swiper) return;

    const viewport = swiper.querySelector('.service-swiper__viewport');
    const track = swiper.querySelector('[data-swiper-track]');
    if (!viewport || !track) return;

    const slides = Array.from(track.querySelectorAll('[data-swiper-slide]'));
    const dots = Array.from(swiper.querySelectorAll('[data-swiper-dot]'));
    if (!slides.length) return;

    const reduceMotion =
      CONFIG.REDUCED_MOTION ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let activeIndex = slides.findIndex((slide) => slide.classList.contains('is-active'));
    if (activeIndex < 0) activeIndex = 0;

    const setActive = (index) => {
      const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
      if (activeIndex === nextIndex) return;
      activeIndex = nextIndex;
      slides.forEach((slide, idx) => {
        slide.classList.toggle('is-active', idx === activeIndex);
      });
      dots.forEach((dot, idx) => {
        const isActive = idx === activeIndex;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    };

    const initialIndex = activeIndex;
    activeIndex = -1;
    setActive(initialIndex);

    const scrollToIndex = (index) => {
      const target = slides[index];
      if (!target) return;
      const offset = target.offsetLeft;
      if (reduceMotion) {
        viewport.scrollLeft = offset;
      } else {
        viewport.scrollTo({ left: offset, behavior: 'smooth' });
      }
      setActive(index);
    };

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', (event) => {
        event.preventDefault();
        scrollToIndex(idx);
      });
      dot.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          scrollToIndex(idx);
        }
      });
    });

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        const viewportRect = viewport.getBoundingClientRect();
        const viewportCenter = viewportRect.left + viewportRect.width / 2;
        let candidate = activeIndex;
        let minDelta = Number.POSITIVE_INFINITY;
        slides.forEach((slide, idx) => {
          const rect = slide.getBoundingClientRect();
          const slideCenter = rect.left + rect.width / 2;
          const delta = Math.abs(slideCenter - viewportCenter);
          if (delta < minDelta) {
            minDelta = delta;
            candidate = idx;
          }
        });
        if (candidate !== activeIndex) {
          setActive(candidate);
        }
      });
    };

    viewport.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      scrollToIndex(activeIndex);
    });

  }

  function initServiceSheets() {
    const sheetEls = Array.from(document.querySelectorAll('.sheet'));
    const triggers = Array.from(document.querySelectorAll('[data-sheet-open]'));
    if (!sheetEls.length || !triggers.length) return;

    const sheetsById = new Map(sheetEls.map((sheet) => [sheet.id, sheet]));
    const closeButtons = Array.from(document.querySelectorAll('[data-sheet-close]'));
    const reduceMotion =
      CONFIG.REDUCED_MOTION ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const active = {
      sheet: null,
      trigger: null,
    };

    const focusFirst = (sheet) => {
      if (!sheet) return;
      const focusable = sheet.querySelectorAll(focusableSelector);
      if (focusable.length) {
        const target = focusable[0];
        if (typeof target.focus === 'function') {
          target.focus({ preventScroll: true });
        }
      }
    };

    const closeSheet = () => {
      if (!active.sheet) return;
      const sheet = active.sheet;
      const trigger = active.trigger;
      const panel = sheet.querySelector('.sheet__panel');
      sheet.classList.remove('is-open');
      let closed = false;

      const finalize = () => {
        if (closed) return;
        closed = true;
        sheet.hidden = true;
        sheet.setAttribute('aria-hidden', 'true');
        if (active.sheet === sheet) {
          active.sheet = null;
          active.trigger = null;
          document.body.classList.remove('sheet-open');
        }
        if (!active.sheet && trigger && typeof trigger.focus === 'function') {
          trigger.focus({ preventScroll: true });
        }
      };

    if (!reduceMotion && panel) {
      let fallback = null;
      const onEnd = (event) => {
        if (event.target !== panel) return;
        if (fallback) {
          window.clearTimeout(fallback);
          fallback = null;
        }
        panel.removeEventListener('transitionend', onEnd);
        finalize();
      };
      panel.addEventListener('transitionend', onEnd);
      fallback = window.setTimeout(() => {
        panel.removeEventListener('transitionend', onEnd);
        finalize();
      }, 420);
    } else {
      finalize();
    }
  };

    const openSheet = (targetId, trigger) => {
      if (!targetId) return;
      const sheet = sheetsById.get(targetId);
      if (!sheet || active.sheet === sheet) return;
      if (active.sheet) {
        closeSheet();
      }
      sheet.hidden = false;
      sheet.setAttribute('aria-hidden', 'false');
      document.body.classList.add('sheet-open');
      window.requestAnimationFrame(() => {
        sheet.classList.add('is-open');
      });
      active.sheet = sheet;
      active.trigger = trigger || null;
      window.requestAnimationFrame(() => {
        focusFirst(sheet);
      });
    };

    triggers.forEach((trigger) => {
      const targetId = trigger.dataset.sheetOpen;
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        openSheet(targetId, trigger);
      });
    });

    closeButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        closeSheet();
      });
    });

    sheetEls.forEach((sheet) => {
      const backdrop = sheet.querySelector('.sheet__backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', (event) => {
          event.preventDefault();
          closeSheet();
        });
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && active.sheet) {
        event.preventDefault();
        closeSheet();
      } else if (event.key === 'Tab' && active.sheet) {
        const focusable = Array.from(
          active.sheet.querySelectorAll(focusableSelector),
        ).filter((el) => !el.hasAttribute('disabled'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus({ preventScroll: true });
          }
        } else if (document.activeElement === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    });
  }

  class NarrativeController {
    constructor(options) {
      const { context, stage, cards, progressBar, progressLabel } = options;

      this.context = context;
      this.stage = stage;
      this.cards = cards;
      this.progressBar = progressBar;
      this.progressLabel = progressLabel;
      this.reduceMotion =
        CONFIG.REDUCED_MOTION ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.transitionMs = this.reduceMotion ? 0 : this.readTransitionDuration();
      this.currentIndex = Math.max(
        0,
        this.cards.findIndex((card) => card.classList.contains('is-active')),
      );
      this.locked = false;
      const ResizeObs = window.ResizeObserver;
      this.resizeObserver = ResizeObs
        ? new ResizeObs((entries) => {
            if (!entries || !entries.length) return;
            this.fitHeight();
          })
        : {
            observe: () => {},
            disconnect: () => {},
          };

      this.initialise();
    }

    readTransitionDuration() {
      const raw = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue('--card-transition-duration')
        .trim();
      if (!raw) return 520;
      const numeric = parseFloat(raw);
      if (Number.isNaN(numeric)) return 520;
      if (numeric > 10) return numeric;
      return numeric * 1000;
    }

    initialise() {
      const activeIndex = this.currentIndex >= 0 ? this.currentIndex : 0;
      this.cards.forEach((card, idx) => {
        const active = idx === activeIndex;
        card.hidden = !active;
        card.classList.toggle('is-active', active);
        card.classList.remove('is-entering', 'is-exiting');
        card.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      this.currentIndex = activeIndex;
      const activeCard = this.cards[this.currentIndex];
      if (activeCard) {
        this.resizeObserver.observe(activeCard);
        this.fitHeight(activeCard);
        this.focusFirst(activeCard, { silent: true });
      }
      this.bindNavigation();
      this.updateProgress();
    }

    bindNavigation() {
      this.cards.forEach((card, idx) => {
        const buttons = card.querySelectorAll('[data-next]');
        if (!buttons.length) return;
        const targetIndex = idx + 1;
        if (targetIndex >= this.cards.length) return;
        buttons.forEach((btn) => {
          btn.addEventListener('click', (event) => {
            event.preventDefault();
            const analyticsEvent =
              btn.dataset.analyticsEvent ||
              btn.dataset.event ||
              `card${idx + 1}_cta`;
            this.goTo(targetIndex, analyticsEvent);
          });
        });
      });
    }

    goTo(targetIndex, analyticsEvent) {
      if (
        this.locked ||
        targetIndex === this.currentIndex ||
        targetIndex < 0 ||
        targetIndex >= this.cards.length
      ) {
        return;
      }

      const currentCard = this.cards[this.currentIndex];
      const nextCard = this.cards[targetIndex];
      if (!nextCard || !currentCard) return;

      if (analyticsEvent) {
        trackEvent(analyticsEvent, {
          lead_id: this.context.leadId,
          token: this.context.token,
          step: this.currentIndex + 1,
        });
      }

      this.locked = true;
      nextCard.hidden = false;
      nextCard.classList.add('is-entering');
      nextCard.setAttribute('aria-hidden', 'false');
      this.resizeObserver.disconnect();
      this.fitHeight(nextCard);

      if (this.reduceMotion || this.transitionMs === 0) {
        currentCard.classList.remove('is-active');
        currentCard.setAttribute('aria-hidden', 'true');
        currentCard.hidden = true;
        nextCard.classList.remove('is-entering');
        nextCard.classList.add('is-active');
        this.currentIndex = targetIndex;
        this.updateProgress();
        this.focusFirst(nextCard);
        this.resizeObserver.observe(nextCard);
        this.locked = false;
        return;
      }

      document.body.classList.add('modal-locked');
      currentCard.classList.remove('is-active');
      currentCard.classList.add('is-exiting');

      let completed = false;
      const finalize = () => {
        if (completed) return;
        completed = true;
        currentCard.classList.remove('is-exiting');
        currentCard.setAttribute('aria-hidden', 'true');
        currentCard.hidden = true;
        nextCard.classList.remove('is-entering');
        nextCard.classList.add('is-active');
        this.currentIndex = targetIndex;
        this.updateProgress();
        this.focusFirst(nextCard);
        this.resizeObserver.observe(nextCard);
        this.locked = false;
        document.body.classList.remove('modal-locked');
      };

      const onTransitionEnd = (event) => {
        if (event.target !== currentCard) return;
        currentCard.removeEventListener('transitionend', onTransitionEnd);
        finalize();
      };

      currentCard.addEventListener('transitionend', onTransitionEnd);
      window.setTimeout(finalize, this.transitionMs + 80);
    }

    updateProgress() {
      if (this.progressLabel) {
        this.progressLabel.textContent = `完成 ${this.currentIndex + 1} / ${this.cards.length}`;
      }
      if (this.progressBar) {
        const percent = ((this.currentIndex + 1) / this.cards.length) * 100;
        window.requestAnimationFrame(() => {
          this.progressBar.style.width = `${percent}%`;
        });
      }
    }

    fitHeight(targetCard = this.cards[this.currentIndex]) {
      if (!this.stage) return;
      if (this.reduceMotion) {
        this.stage.style.height = '';
        return;
      }
      const referenceCard = targetCard || this.cards[this.currentIndex];
      if (!referenceCard) return;

      this.stage.style.height = 'auto';
      const cardRect = referenceCard.getBoundingClientRect();
      const stageRect = this.stage.getBoundingClientRect();
      const offsetTop = cardRect.top - stageRect.top;
      const computed = window.getComputedStyle(this.stage);
      const paddingBottom = parseFloat(computed.paddingBottom) || 0;
      const total = offsetTop + cardRect.height + paddingBottom;
      this.stage.style.height = `${Math.ceil(total)}px`;
    }

    focusFirst(card, { silent } = {}) {
      if (!card) return;
      const focusable = card.querySelector(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable && typeof focusable.focus === 'function') {
        focusable.focus({ preventScroll: true });
      } else if (!silent && typeof card.focus === 'function') {
        card.focus({ preventScroll: true });
      }
    }
  }

  function initOnboarding() {
    const context = getLeadContext();
    initChatkitFooter(context);
    const leadIdEl = document.querySelector('[data-lead-id]');
    const createdEl = document.querySelector('[data-lead-created]');
    const statusEl = document.querySelector('[data-onboarding-status]');
    const chipEl = document.querySelector('[data-stage-chip]');
    const chatkitLink = document.querySelector('[data-chatkit-link]');
    const stageEl = document.getElementById('onboarding-stage');
    const progressBarEl = document.getElementById('progress-bar');
    const progressLabelEl = document.getElementById('progress-label');
    const cards = Array.from(document.querySelectorAll('.narrative-card'));
    const hasStageCards = document.querySelectorAll('.stage-card').length > 0;

    const chatkitUrl = buildChatkitUrl(context);

    if (chatkitLink) {
      const analyticsEvent =
        chatkitLink.dataset.analyticsEvent ||
        chatkitLink.dataset.event ||
        'card6_cta_chatkit';
      const handler = (event) => {
        event.preventDefault();
        if (analyticsEvent) {
          trackEvent(analyticsEvent, {
            lead_id: context.leadId,
            token: context.token,
            step: cards.length,
          });
        }
        openChatKit(chatkitUrl, context);
      };
      if (chatkitUrl) {
        chatkitLink.addEventListener('click', handler);
        if (chatkitLink.tagName === 'A') {
          chatkitLink.setAttribute('href', chatkitUrl);
          chatkitLink.setAttribute('target', '_blank');
          chatkitLink.setAttribute('rel', 'noopener noreferrer');
        }
      } else if (chatkitLink.tagName === 'A') {
        chatkitLink.setAttribute('href', '#');
        chatkitLink.setAttribute('aria-disabled', 'true');
      } else {
        chatkitLink.setAttribute('disabled', 'true');
        chatkitLink.addEventListener('click', (event) => event.preventDefault());
      }
    }

    if (leadIdEl) leadIdEl.textContent = context.leadId || '尚未建立';
    if (createdEl) createdEl.textContent = formatTimestamp(context.createdAt);
    if (!context.leadId) {
      if (statusEl) {
        statusEl.textContent = '找不到入場券資訊，請回到首頁重新申請。';
        statusEl.classList.add('is-error');
      }
      return;
    }

    applyReportLink(context);

    document.querySelectorAll('[data-report-link]').forEach((el) => {
      const eventName = el.dataset.analyticsEvent || el.dataset.event || 'card6_cta_report';
      el.addEventListener('click', (event) => {
        if (eventName) {
          trackEvent(eventName, {
            lead_id: context.leadId,
            token: context.token,
            step: cards.length,
          });
        }
        if (el.tagName !== 'A') {
          event.preventDefault();
          const href = el.dataset.reportHref || buildReportUrl(context);
          window.location.href = href;
        }
      });
    });

    if (stageEl && cards.length) {
      new NarrativeController({
        context,
        stage: stageEl,
        cards,
        progressBar: progressBarEl,
        progressLabel: progressLabelEl,
      });
    }

    initServiceSwiper();
    initServiceSheets();

    if (hasStageCards) {
      initialiseStagePlaceholders();
    }

    if (chipEl) chipEl.textContent = 'AI 初檢資料已交付 ChatKit';
    if (statusEl && !statusEl.textContent) {
      statusEl.textContent = 'ChatKit 會在 15 秒內送出首訊，請於 LINE 與守護專家接續對話。';
      statusEl.classList.remove('is-error');
    }

    if (hasStageCards) {
      STAGE_FLOW.forEach((stage) => {
        applyStageState(stage.id, 'complete', stage.complete);
      });
    }
  }

  window.starEngine = {
    trackEvent,
    formatTimestamp,
    getLeadContext,
    buildChatkitUrl,
  };

  const body = document.body;
  if (body.classList.contains('page-index')) {
    initLeadForm();
  } else if (body.classList.contains('page-onboarding')) {
    initOnboarding();
  }
})();
