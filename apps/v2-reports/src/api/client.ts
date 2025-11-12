import { fetchGuardianReportsMock } from './mock';
import { GuardianReportListParams, GuardianReportResponse, GuardianViewMode } from '../types/api';
import {
  buildSupabaseHeaders,
  getGuardianSessionToken,
  getGuardianSupabaseConfig,
} from '../../../shared/guardian_v2/auth/session';

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

export const fetchReports = async (
  params: GuardianReportListParams,
): Promise<GuardianReportResponse> => {
  const token = await getGuardianSessionToken();
  if (!SUPABASE_URL || !token) {
    return fetchGuardianReportsMock({ viewMode: params.viewMode });
  }

  try {
    const payload: Record<string, unknown> = {
      p_lead: params.leadId,
      p_mode: params.viewMode === 'timeline' ? 'list' : 'latest',
    };

    if (params.reportType) payload.p_report_type = params.reportType;
    if (params.referenceDate) payload.p_date = params.referenceDate;
    return await callSupabaseRpc<GuardianReportResponse>('api_v2_reports', payload);
  } catch (error) {
    console.error('[GuardianReports] rpc error', error);
    throw error instanceof Error ? error : new Error('載入 Guardian 報表失敗');
  }
};

export const __INTERNALS__ = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  getGuardianSessionToken,
  callSupabaseRpc,
};
