import {
  fetchGuardianCompetitorsMock,
  createGuardianCompetitorMock,
  updateGuardianCompetitorStatusMock,
} from './mock';
import {
  GuardianCompetitorCreatePayload,
  GuardianCompetitorListItem,
  GuardianCompetitorResponse,
  GuardianCompetitorResponseMeta,
  GuardianCompetitorStatusUpdatePayload,
} from '../types/api';
import {
  buildSupabaseHeaders,
  getGuardianSessionToken,
  getGuardianSupabaseConfig,
} from '../../../shared/guardian_v2/auth/session';

interface GuardianCompetitorListParams {
  leadId: string;
  includeInactive?: boolean;
}

const { supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY } = getGuardianSupabaseConfig();

const callSupabaseRpc = async <T>(fnName: string, body: Record<string, unknown>): Promise<T> => {
  const token = await getGuardianSessionToken();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !token) {
    throw new Error('Supabase 環境未設定，已回退使用 mock 資料');
  }

  const headers = await buildSupabaseHeaders();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.message || response.statusText || 'Guardian RPC 呼叫失敗';
    throw new Error(message);
  }

  return (await response.json()) as T;
};

interface GuardianCompetitorListRpcResponse {
  data?: GuardianCompetitorListItem[];
  competitors?: GuardianCompetitorListItem[];
  alerts?: GuardianCompetitorResponse['alerts'];
  trends?: GuardianCompetitorResponse['trends'];
  account?: GuardianCompetitorResponse['account'];
  meta?: GuardianCompetitorResponseMeta;
}

interface GuardianCompetitorInsertRpcResponse {
  data?: GuardianCompetitorListItem;
  meta?: GuardianCompetitorResponseMeta;
}

export const listCompetitors = async (
  params: GuardianCompetitorListParams,
): Promise<GuardianCompetitorResponse> => {
  const token = await getGuardianSessionToken();
  if (!SUPABASE_URL || !token) {
    return fetchGuardianCompetitorsMock();
  }

  try {
    const payload: Record<string, unknown> = {
      p_lead: params.leadId,
    };

    if (params.includeInactive) payload.p_include_inactive = true;

    const rpcResult = await callSupabaseRpc<GuardianCompetitorListRpcResponse>(
      'api_v2_competitors_list',
      payload,
    );

    const competitors = rpcResult.data ?? rpcResult.competitors ?? [];
    const meta: GuardianCompetitorResponseMeta =
      rpcResult.meta ?? {
        generatedAt: new Date().toISOString(),
        requestId: 'missing-meta',
      };

    return {
      data: competitors,
      competitors,
      account: rpcResult.account,
      alerts: rpcResult.alerts ?? [],
      trends: rpcResult.trends ?? [],
      meta,
    };
  } catch (error) {
    console.error('[GuardianCompetitors] list error', error);
    throw error instanceof Error ? error : new Error('無法載入競品資料');
  }
};

export const createCompetitor = async (
  payload: GuardianCompetitorCreatePayload,
): Promise<GuardianCompetitorListItem> => {
  const token = await getGuardianSessionToken();
  if (!SUPABASE_URL || !token) {
    return createGuardianCompetitorMock(payload);
  }

  try {
    const noteParts = [
      payload.igUrl ? `ig:${payload.igUrl}` : null,
      payload.fbUrl ? `fb:${payload.fbUrl}` : null,
    ].filter(Boolean);

    const rpcResult = await callSupabaseRpc<GuardianCompetitorInsertRpcResponse>(
      'api_v2_competitors_insert',
      {
        p_lead: payload.leadId,
        p_store_name: payload.storeName,
        p_city: payload.city,
        p_place_id: payload.placeId,
        p_website: payload.website ?? null,
        p_note: noteParts.length ? noteParts.join(' | ') : null,
      },
    );

    if (rpcResult?.data) return rpcResult.data;

    if (rpcResult && 'storeId' in rpcResult) {
      return rpcResult as unknown as GuardianCompetitorListItem;
    }

    throw new Error('Supabase 未回傳競品資料，請確認 RPC 定義');
  } catch (error) {
    console.error('[GuardianCompetitors] create error', error);
    throw error instanceof Error ? error : new Error('建立競品失敗');
  }
};

export const updateCompetitorStatus = async (
  payload: GuardianCompetitorStatusUpdatePayload,
): Promise<GuardianCompetitorListItem | null> => {
  const token = await getGuardianSessionToken();
  if (!SUPABASE_URL || !token) {
    return updateGuardianCompetitorStatusMock(payload.storeId, payload.status);
  }

  try {
    const rpcResult = await callSupabaseRpc<GuardianCompetitorInsertRpcResponse | null>(
      'api_v2_competitors_update_status',
      {
        p_lead: payload.leadId,
        p_store_id: payload.storeId,
        p_status: payload.status,
        p_reason: payload.reason ?? null,
      },
    );

    if (!rpcResult) return null;
    if ('data' in rpcResult && rpcResult.data) {
      return rpcResult.data;
    }
    if (typeof rpcResult === 'object' && rpcResult !== null) {
      return rpcResult as unknown as GuardianCompetitorListItem;
    }
    return null;
  } catch (error) {
    console.error('[GuardianCompetitors] update status error', error);
    throw error instanceof Error ? error : new Error('更新競品狀態失敗');
  }
};

export const __INTERNALS__ = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  callSupabaseRpc,
};
