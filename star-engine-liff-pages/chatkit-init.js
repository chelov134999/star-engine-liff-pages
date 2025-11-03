const CFG = window.__STAR_ENGINE_CONFIG__ || {};
const WORKFLOW_ID = CFG.CHATKIT_WORKFLOW_ID || 'wf_68f8bec1169c81908cfe94e6c85e2a4a0f2cd7e47374bcc5';
const LIFF_ID = CFG.LIFF_ID || '2008215846-5LwXlWVN';
const API_BASE = toText(CFG.API_BASE);
const TOKEN_ENDPOINT = toText(CFG.CHATKIT_TOKEN_ENDPOINT);
const CHATKIT_URL = toText(CFG.CHATKIT_URL);
const CHATKIT_SDK_URL = toText(CFG.CHATKIT_SDK_URL);

const params = new URLSearchParams(window.location.search);
const state = {
  chatkit: null,
  leadId: '',
  lineUserId: '',
  clientSecret: '',
  clientSecretExpiresAt: '',
  session: null,
  sessionId: '',
  workflow: null,
  tokenMeta: {},
  ready: false,
};

if (!Array.isArray(window.__guardianDebug)) {
  window.__guardianDebug = [];
}
window.__guardianDebug.push({
  label: 'bootstrap_init',
  at: new Date().toISOString(),
  payload: {},
});

const FIRST_MESSAGE = {
  text:
    '我是星級引擎守護專家。我剛看完你的報告：• 評價健康度 3.9★ • AI 曝光第 4（差一名進 Top3）。想先聊哪一塊？也可以直接輸入想法。',
  chips: ['評論守護', 'AI 曝光', '競品分析'],
};

let bundleReadyPromise = null;

(async function bootstrap() {
  if (!API_BASE || !TOKEN_ENDPOINT) {
    console.warn('[chatkit] missing API base or token endpoint, skip init');
    renderBootstrapError('缺少後端設定，無法啟動守護專家。');
    exposeApi();
    return;
  }

  try {
    await loadChatKitBundle();
    pushDebug('bundle_ready');

    const { lineUserId } = await ensureLiff();
    state.lineUserId = lineUserId;

    const leadId = await resolveLeadId(lineUserId);
    state.leadId = leadId || '';

    const chatkitElement = await ensureChatKitElement();
    state.chatkit = chatkitElement;
    attachEventHandlers(chatkitElement);

    await applyOptions(chatkitElement);

    state.ready = true;
    pushDebug('chatkit_ready', { leadId: state.leadId || null });
    clearBootstrapMessage();
  } catch (error) {
    console.error('[chatkit] init failed', error);
    pushDebug('chatkit_init_error', {
      message: error?.message || String(error),
    });
    renderBootstrapError('守護專家忙線，請稍後再試或聯絡 ai@mdzh.io。');
  } finally {
    exposeApi();
  }
})();

function toText(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value.trim();
  return String(value).trim();
}

function getChatKitScriptUrl() {
  const override = toText(CHATKIT_SDK_URL);
  if (override) {
    return override;
  }
  const base = CHATKIT_URL || '/chatkit/';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}chatkit.js`;
}

async function loadChatKitBundle() {
  if (customElements.get('openai-chatkit')) return;

  const existingScript = document.querySelector('script[data-chatkit-bundle]');
  if (existingScript) {
    await customElements.whenDefined('openai-chatkit');
    pushDebug('bundle_cached');
    return;
  }

  if (!bundleReadyPromise) {
    bundleReadyPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = getChatKitScriptUrl();
      script.async = false;
      script.dataset.chatkitBundle = '1';
      script.onload = resolve;
      script.onerror = () => {
        bundleReadyPromise = null;
        pushDebug('bundle_error', { src: script.src });
        reject(new Error('chatkit_bundle_failed'));
      };
      document.head.appendChild(script);
    }).then(() => customElements.whenDefined('openai-chatkit'));
    pushDebug('bundle_load_start', { src: getChatKitScriptUrl() });
  }

  await bundleReadyPromise;
}

async function ensureChatKitElement() {
  const root = document.getElementById('chatkit-root');
  if (!root) {
    throw new Error('missing_chatkit_root');
  }

  let element = root.querySelector('openai-chatkit');
  if (!element) {
    element = document.createElement('openai-chatkit');
    element.style.minHeight = 'inherit';
    element.style.display = 'block';
    root.innerHTML = '';
    root.appendChild(element);
  }

  return element;
}

function attachEventHandlers(element) {
  element.addEventListener('chatkit.error', (event) => {
    console.warn('[chatkit] runtime error', event?.detail);
  });

  element.addEventListener('chatkit.thread.load.end', () => {
    state.ready = true;
    clearBootstrapMessage();
  });
}

function buildStartScreen() {
  const prompts = Array.isArray(FIRST_MESSAGE.chips)
    ? FIRST_MESSAGE.chips.map((label) => ({ label, prompt: label }))
    : [];
  return {
    greeting: toText(FIRST_MESSAGE.text),
    prompts,
  };
}

function pushDebug(label, payload = {}) {
  try {
    window.__guardianDebug.push({
      label,
      payload,
      at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[chatkit] pushDebug failed', error);
  }
}

async function applyOptions(element) {
  const options = {
    api: {
      getClientSecret: getClientSecret,
    },
    locale: 'zh-Hant',
    theme: {
      colorScheme: 'dark',
      radius: 'round',
      density: 'normal',
    },
    header: {
      title: {
        enabled: true,
        text: '星級引擎守護專家',
      },
    },
    history: {
      enabled: false,
    },
    composer: {
      placeholder: '直接輸入你想討論的重點',
    },
    startScreen: buildStartScreen(),
    onClientTool: handleClientTool,
  };

  pushDebug('options_applying', {
    workflowId: WORKFLOW_ID,
    leadId: state.leadId || null,
  });
  const workflowConfig = state.workflow && state.workflow.id ? state.workflow : { id: WORKFLOW_ID };
  state.workflow = workflowConfig;
  if (!element.workflow || element.workflow.id !== workflowConfig.id) {
    element.workflow = workflowConfig;
  }
  element.setOptions(options);
  pushDebug('options_applied', { leadId: state.leadId || null });
}

async function getClientSecret(currentSecret) {
  const markSuccess = (source, expiresAt) => {
    pushDebug('token_acquired', {
      source,
      expiresAt: expiresAt || '',
      leadId: state.leadId || null,
    });
  };

  try {
    if (
      currentSecret &&
      state.clientSecret === currentSecret &&
      isSecretValid(state.clientSecretExpiresAt)
    ) {
      markSuccess('workflow_hint', state.clientSecretExpiresAt);
      return currentSecret;
    }

    if (state.clientSecret && isSecretValid(state.clientSecretExpiresAt)) {
      markSuccess('state_cache', state.clientSecretExpiresAt);
      return state.clientSecret;
    }

    const tokenInfo = await resolveClientSecret();
    const secret = toText(tokenInfo?.client_secret || tokenInfo?.clientSecret || '');
    if (!secret) {
      throw new Error('missing_client_secret');
    }
    state.clientSecret = secret;
    const rawExpires = tokenInfo?.expires_at ?? tokenInfo?.expiresAt ?? null;
    let expiresIso = '';
    if (typeof rawExpires === 'number') {
      const ms = rawExpires > 9_999_999_999 ? rawExpires : rawExpires * 1000;
      expiresIso = new Date(ms).toISOString();
    } else {
      const parsed = Number(rawExpires);
      if (Number.isFinite(parsed) && parsed > 0) {
        const ms = parsed > 9_999_999_999 ? parsed : parsed * 1000;
        expiresIso = new Date(ms).toISOString();
      } else {
        const textValue = toText(rawExpires);
        if (textValue) {
          expiresIso = textValue;
        }
      }
    }
    state.clientSecretExpiresAt = expiresIso;
    state.session = tokenInfo?.session || tokenInfo?.data?.session || null;
    state.sessionId = toText(
      (state.session && state.session.id) || tokenInfo?.session_id || tokenInfo?.id || ''
    );
    state.workflow = tokenInfo?.workflow || state.workflow || { id: WORKFLOW_ID };
    state.tokenMeta = {
      status: tokenInfo?.status || null,
      rate_limits: tokenInfo?.rate_limits || null,
    };
    pushDebug('token_response', {
      workflowId: state.workflow && state.workflow.id ? state.workflow.id : WORKFLOW_ID,
      sessionId: state.sessionId || null,
      expiresAt: expiresIso || '',
      status: state.tokenMeta.status || null,
    });
    markSuccess('fetch', expiresIso);
    return secret;
  } catch (error) {
    pushDebug('token_error', {
      message: error?.message || String(error),
    });
    throw error;
  }
}

function isSecretValid(expiresAt) {
  if (!expiresAt) return false;
  const expires = Date.parse(expiresAt);
  if (Number.isNaN(expires)) return false;
  const now = Date.now();
  return expires - now > 60_000; // refresh if less than 60s remaining
}

async function resolveClientSecret() {
  const endpoint = TOKEN_ENDPOINT || `${API_BASE.replace(/\/$/, '')}/chatkit/token`;
  const payload = withLeadMetadata({ workflow_id: WORKFLOW_ID });
  pushDebug('token_request_sent', {
    endpoint,
    leadId: state.leadId || null,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`token_request_failed:${response.status}:${detail.slice(0, 160)}`);
  }

  return response.json();
}

async function handleClientTool(toolCall) {
  const toolName = toText(toolCall?.name);
  if (!toolName) {
    return {};
  }

  const payload = withLeadMetadata(toolCall?.params || {});
  const headers = {};

  if (toolName === 'create_payment_link') {
    const leadId = toText(payload.lead_id);
    const plan = toText(payload.plan);
    if (leadId && plan) {
      headers['X-Idempotency-Key'] = `${leadId}-${plan}`;
    }
  }

  try {
    return await callGateway(toolName, payload, { headers });
  } catch (error) {
    console.warn('[chatkit] client tool failed', toolName, error);
    throw error;
  }
}

function withLeadMetadata(body = {}) {
  const enriched = { ...(body || {}) };

  if (state.leadId && !enriched.lead_id) {
    enriched.lead_id = state.leadId;
  }
  if (state.lineUserId && !enriched.line_user_id) {
    enriched.line_user_id = state.lineUserId;
  }

  const workflowId = toText(state.workflow && state.workflow.id ? state.workflow.id : WORKFLOW_ID);
  if (workflowId && !enriched.workflow_id) {
    enriched.workflow_id = workflowId;
  }

  if (!enriched.entry) {
    enriched.entry = params.get('entry') || 's7';
  }

  return enriched;
}

async function callGateway(action, body = {}, options = {}) {
  if (!API_BASE) {
    throw new Error('missing_api_base');
  }

  const base = `${API_BASE.replace(/\/$/, '')}/chatkit`;
  const url = action.startsWith('http')
    ? action
    : `${base}${action.startsWith('/') ? action : `/${action}`}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (state.leadId) {
    headers['X-ChatKit-Lead-ID'] = state.leadId;
  }
  if (state.lineUserId) {
    headers['X-ChatKit-Line-User-ID'] = state.lineUserId;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = null;
    try {
      detail = await response.json();
    } catch (error) {
      detail = await response.text().catch(() => '');
    }
    throw detail;
  }

  try {
    return await response.json();
  } catch (error) {
    console.warn('[chatkit] gateway json parse failed', action, error);
    return null;
  }
}

function clearBootstrapMessage() {
  const placeholder = document.querySelector('.chatkit-placeholder');
  if (placeholder) {
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.innerHTML = '';
  }
}

function renderBootstrapError(message) {
  const placeholder = document.querySelector('.chatkit-placeholder');
  if (!placeholder) return;
  placeholder.innerHTML = `
    <span class="chatkit-placeholder__icon" aria-hidden="true">!</span>
    <div>${message}</div>
    <div style="font-size:13px;">若持續出現，請寫信至 <a href="mailto:ai@mdzh.io">ai@mdzh.io</a>。</div>
  `;
  placeholder.removeAttribute('aria-hidden');
}

function exposeApi() {
  window.starChatKit = {
    get leadId() {
      return state.leadId || '';
    },
    get tokenExpiresAt() {
      return state.clientSecretExpiresAt || '';
    },
    focusChat() {
      const root = document.getElementById('chatkit-root');
      if (root) {
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    async logS7Event(ev, payload = {}) {
      if (!ev) return;
      const eventPayload = withLeadMetadata({ ev, payload });
      try {
        await callGateway('log_event', eventPayload);
      } catch (error) {
        console.warn('[chatkit] log event failed', ev, error);
      }
    },
  };
}

async function ensureLiff() {
  if (!window.liff || !LIFF_ID) {
    pushDebug('liff_disabled');
    return { lineUserId: `web-${Date.now()}` };
  }

  try {
    await window.liff.init({ liffId: LIFF_ID });
  } catch (error) {
    console.warn('[chatkit] liff init failed', error);
    return { lineUserId: `web-${Date.now()}` };
  }

  if (!window.liff.isLoggedIn()) {
    window.liff.login({ redirectUri: window.location.href });
    throw new Error('redirecting_to_liff_login');
  }

  try {
    const profile = await window.liff.getProfile();
    return { lineUserId: profile?.userId || `liff-${Date.now()}` };
  } catch (error) {
    console.warn('[chatkit] liff profile failed', error);
    return { lineUserId: `liff-${Date.now()}` };
  }
}

async function resolveLeadId(lineUserId) {
  const leadFromQuery = params.get('lead_id');
  if (leadFromQuery) return leadFromQuery;

  if (!CFG.API_BASE) return '';
  try {
    const res = await fetch(`${CFG.API_BASE.replace(/\/$/, '')}/lookup-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line_user_id: lineUserId }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data?.lead_id || '';
  } catch (error) {
    console.warn('[chatkit] lookup lead failed', error);
    return '';
  }
}
