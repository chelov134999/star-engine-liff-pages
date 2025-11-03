import {
  buildSupabaseHeaders,
  getGuardianSessionToken,
  getGuardianSupabaseConfig,
} from '../../../shared/guardian_v2/auth/session';

export interface AdminSetPlanPayload {
  accountId: string;
  planCode: 'lite' | 'pro' | 'enterprise';
  planSource?: string;
  planExpiresAt?: string;
  reason?: string;
}

export interface AdminFlowPayload {
  flow: string;
  accountId: string;
  note?: string;
  payload?: Record<string, unknown>;
}

export interface AdminSetPlanResponse {
  data: {
    accountId: string;
    planCode: string;
    planSource?: string;
    planExpiresAt?: string | null;
  };
  meta: {
    eventId: string;
    updatedAt: string;
  };
}

export interface AdminFlowResponse {
  data: {
    runId: string;
    flowCode: string;
    status: string;
  };
  meta: {
    createdAt: string;
  };
}

const { supabaseUrl: SUPABASE_URL } = getGuardianSupabaseConfig();

const callAdminRpc = async <T>(fnName: string, body: Record<string, unknown>): Promise<T> => {
  const token = await getGuardianSessionToken();
  if (!SUPABASE_URL || !token) {
    throw new Error('缺少 Supabase 設定，請更新 .env.local');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: await buildSupabaseHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.message || response.statusText || 'Admin RPC 呼叫失敗';
    throw new Error(message);
  }

  return (await response.json()) as T;
};

export const setPlan = async (payload: AdminSetPlanPayload): Promise<AdminSetPlanResponse> => {
  return callAdminRpc<AdminSetPlanResponse>('api_v2_admin_set_plan', {
    p_account: payload.accountId,
    p_plan_code: payload.planCode,
    p_plan_source: payload.planSource ?? null,
    p_expires_at: payload.planExpiresAt ?? null,
    p_notes: payload.reason ?? null,
  });
};

export const triggerFlow = async (payload: AdminFlowPayload): Promise<AdminFlowResponse> => {
  return callAdminRpc<AdminFlowResponse>('api_v2_admin_flows_run', {
    p_flow_code: payload.flow,
    p_payload: {
      accountId: payload.accountId,
      note: payload.note,
      ...(payload.payload ?? {}),
    },
  });
};

export const __INTERNALS__ = {
  SUPABASE_URL,
  callAdminRpc,
};
