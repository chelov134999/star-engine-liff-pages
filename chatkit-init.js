import { ChatKit } from 'https://cdn.openai.com/chatkit/latest/chatkit.min.js';

const CFG = window.__STAR_ENGINE_CONFIG__ || {};
const WORKFLOW_ID = 'wf_68f8bec1169c81908cfe94e6c85e2a4a0f2cd7e47374bcc5';
const CLIENT_SECRET = CFG.CHATKIT_CLIENT_SECRET || '';
const GATEWAY_SECRET = CFG.CHATKIT_GATEWAY_SECRET || '';
const LIFF_ID = CFG.LIFF_ID || '2008215846-5LwXlWVN';
const GATEWAY_BASE = (CFG.API_GATEWAY_BASE || `${(CFG.API_BASE || '').replace(/\/$/, '')}/ai`).replace(
  /\/$/,
  '',
);

const params = new URLSearchParams(window.location.search);
const state = {
  chatkit: null,
  leadId: '',
  lineUserId: '',
  ready: false,
};

const SYSTEM_PROMPT = `ChatKit 守護專家 Prompt v3

身分定位：你是「星級引擎守護專家」，在 LINE 裡陪跑品牌負責人。資料、工具、決策皆由星級引擎控管，ChatKit 只提供對話與建議。
Free-text First：任何選單 / Chips 僅提供建議選項，務必明確告知「可以直接輸入想討論的重點」。
CALM 節奏：一次一個行動（One-Action-Per-Turn），先同理再提洞察，最後給行動。四回合內要提出方案與付款選項。
回覆格式：輸出 JSON，結構 {"messages":[{"text":"...","source":"SERPAPI｜10/22 20:01","cta":{...}}]}；文字長度 50–120 字，允許換行。
來源標註：凡引用指標 / 競品 / 工具結果，結尾附 來源：{{source}}｜{{ts}}。
安全降級：
  • 工具失敗 / timeout：立刻說明「稍晚寄送摘要或寫信 ai@mdzh.io」，並指示使用者可回報 need_time。
  • 未找到資料 / lead 不存在：引導用戶回 S7 重新開啟，或直接寫信。
  • 付款 placeholder：明講「這是測試付款連結；完成後系統會自動開通並寄送確認信」。
語氣：沉著、有溫度，第一人稱「我們」。避免命令式，強調陪伴與共同行動。

Intents：greet、pain_reviews、pain_visibility、mixed_interest、price、ready_to_pay、need_time。
Slots：lead_id、plan_choice、pain_type、timeline、budget、ai_visibility。
Policy（CALM）：
  • 回合 0：首訊 ≤ 15 秒，送出摘要 + 守護任務選項。
  • 回合 1–3：每回合只處理一件事（詢問痛點／提出守護任務／出方案）。
  • 回合 4 前：完成方案比較（守望塔 1,980 vs 領航艦 5,800）與付款占位。
  • 如使用者表示 need_time，呼叫 /ai/log_event 並提供 Email 備援。

First Message：摘要守護重點 + 提醒可直接輸入問題。
建議 Chips：評論守護、AI 曝光、競品分析；同時標註「也可直接打字聊」。
自由輸入：永遠啟用，拒絕只靠按鈕互動。

可用工具：/ai/fetch_report、/ai/fetch_competitors、/ai/create_payment_link、/ai/log_event。
統一回應格式：{ "ok": true, "data": {...}, "source": "supabase-cache", "ts": "2025-10-22T04:59:15Z", "request_id": "..." }。
事件紀錄：log_event 必須支援 report_seen、task_selected、proposal_shown、paylink_clicked、paid、need_time、ab_arm。必要欄位：lead_id、ts、payload（含 arm / plan_choice / notes）。

轉換節奏與話術
1. 同理：引用最抓痛的 KPI（四大指標）與競品差距，告訴對方「現在位置在哪裡」。
2. 洞察：解釋如果不處理的風險 vs 處理後的收益，搭配來源。
3. 行動：
   • 守望塔 1,980：「省下人工整理評論的時間，系統自動偵測低星回覆」。
   • 領航艦 5,800：「含 AI 方案與顧問班，兩週完成口碑翻身」。
   • 強調付款為測試連結，成功後 24 小時內開通 AI 可讀網站。
4. Need Time：記錄事件、給 Email 備援 ai@mdzh.io，標記 pending_summary。

KPI 與競品話術
• 搜尋曝光：引用 coverage、delta，說明下一步。
• AI 可見度：指出哪個競品被引用，建議補語料。
• 危機警示：提醒最近低星與建議守望塔任務。
• 推薦熱度：說明聲量差距並給升級方案。

反對處理語料
• 價格：「守望塔 1,980 比請人一天更低，先守住低星。」 
• 信任：「所有數據都附來源與時間，例如 SERPAPI 或 Google Reviews。」 
• 時間：「回覆草稿與網站由系統生成，若需要時間可寄信 ai@mdzh.io。」 

會員升級語
• 守望塔：基礎監測，每日危機推播。
• 領航艦：全域守護 + 顧問班。
• 非會員：先體驗守望塔 14 天。

技術守則：短句、留白、Apple 式排版；資料缺漏先安撫，必要時轉人工信箱。工具連續失敗三次即降級.`;

const INTENTS = [
  { name: 'greet', examples: ['嗨', '哈囉', '有人在嗎'] },
  { name: 'pain_reviews', examples: ['最近被留好多一星', '差評怎麼辦'] },
  { name: 'pain_visibility', examples: ['AI 搜尋都看不到我', '搜尋不到我'] },
  { name: 'mixed_interest', examples: ['評論和搜尋都想看', '兩個都想聊'] },
  { name: 'price', examples: ['太貴', '價格多少'] },
  { name: 'ready_to_pay', examples: ['我要升級', '給我付款連結'] },
  { name: 'need_time', examples: ['先等等', '我考慮一下'] },
];

const SLOTS = [
  { name: 'lead_id', type: 'string' },
  { name: 'plan_choice', type: 'enum', values: ['sentry', 'navigator'] },
  { name: 'pain_type', type: 'enum', values: ['reviews', 'visibility', 'mixed'] },
  { name: 'timeline', type: 'string' },
  { name: 'budget', type: 'string' },
  { name: 'ai_visibility', type: 'number' },
];

const FIRST_MESSAGE = {
  text:
    '我是星級引擎守護專家。我剛看完你的報告：• 評價健康度 3.9★ • AI 曝光第 4（差一名進 Top3）。想先聊哪一塊？也可以直接輸入想法。',
  chips: ['評論守護', 'AI 曝光', '競品分析'],
  allowFreeText: true,
};

(async function bootstrap() {
  if (!CLIENT_SECRET || !GATEWAY_SECRET) {
    console.warn('[chatkit] missing secrets, skip init');
    exposeApi();
    return;
  }

  try {
    const { lineUserId } = await ensureLiff();
    state.lineUserId = lineUserId;

    const leadId = await resolveLeadId(lineUserId);
    state.leadId = leadId || '';

    const chatkit = new ChatKit({
      element: document.getElementById('chatkit-root'),
      workflow: {
        id: WORKFLOW_ID,
        clientSecret: CLIENT_SECRET,
      },
      user: {
        id: leadId ? `${leadId}` : `guest-${lineUserId}`,
        metadata: {
          lineUserId,
          entry: params.get('entry') || 's7',
        },
      },
    });

    registerTools(chatkit);

    chatkit.configure({
      systemPrompt: SYSTEM_PROMPT,
      intents: INTENTS,
      slots: SLOTS,
      policy: {
        framework: 'CALM',
        maxProposalTurns: 4,
        oneActionPerTurn: true,
      },
      firstMessage: FIRST_MESSAGE,
    });

    if (leadId) {
      try {
        chatkit.setSlot('lead_id', leadId);
      } catch (error) {
        console.warn('[chatkit] setSlot lead_id failed', error);
      }
    }

    state.chatkit = chatkit;
    state.ready = true;
  } catch (error) {
    console.error('[chatkit] init failed', error);
  } finally {
    exposeApi();
  }
})();

function exposeApi() {
  window.starChatKit = {
    get leadId() {
      return state.leadId || '';
    },
    focusChat() {
      const root = document.getElementById('chatkit-root');
      if (root) {
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    async logS7Event(ev, payload = {}) {
      if (!ev) return;
      const leadId = state.leadId || '';
      if (!leadId) return;
      const eventPayload = {
        lead_id: leadId,
        ev,
        payload: {
          entry: params.get('entry') || 's7',
          ...payload,
        },
      };
      try {
        await callGateway('/log_event', eventPayload);
      } catch (error) {
        console.warn('[chatkit] log event failed', ev, error);
      }
    },
  };
}

async function ensureLiff() {
  if (!window.liff || !LIFF_ID) {
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

function registerTools(chatkit) {
  chatkit.registerTools([
    {
      name: 'fetch_report',
      async handler(args = {}) {
        return callGateway('/fetch_report', args);
      },
    },
    {
      name: 'fetch_competitors',
      async handler(args = {}) {
        return callGateway('/fetch_competitors', args);
      },
    },
    {
      name: 'create_payment_link',
      async handler(args = {}) {
        const leadId = args?.lead_id || state.leadId;
        const plan = args?.plan;
        const idempotency = leadId && plan ? `${leadId}-${plan}` : undefined;
        return callGateway('/create_payment_link', args, {
          headers: idempotency ? { 'X-Idempotency-Key': idempotency } : undefined,
        });
      },
    },
    {
      name: 'log_event',
      async handler(args = {}) {
        return callGateway('/log_event', args);
      },
    },
  ]);
}

async function callGateway(path, body = {}, options = {}) {
  if (!GATEWAY_SECRET) {
    throw new Error('missing_gateway_secret');
  }
  const url =
    (path.startsWith('http') ? path : `${GATEWAY_BASE}${path.startsWith('/') ? path : `/${path}`}`) ||
    '';
  const json = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await sign(`${json}.${timestamp}`, GATEWAY_SECRET);

  const headers = {
    'Content-Type': 'application/json',
    'X-Client-ID': 'chatkit_openai',
    'X-Timestamp': timestamp,
    'X-Signature': signature,
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: json,
  });

  if (!response.ok) {
    let detail = null;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    throw detail;
  }

  try {
    return await response.json();
  } catch (error) {
    console.warn('[chatkit] gateway json parse failed', path, error);
    return null;
  }
}

async function sign(message, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureBytes = Array.from(new Uint8Array(signatureBuffer));
  return btoa(String.fromCharCode(...signatureBytes));
}
