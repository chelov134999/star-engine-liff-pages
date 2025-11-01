const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env ?? {} : {}) as Record<
  string,
  string
>;

const readEnv = (key: string): string | undefined =>
  env[key] ?? env[`VITE_${key}`] ?? process.env?.[key];

export interface GuardianSupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export const getGuardianSupabaseConfig = (): GuardianSupabaseConfig => ({
  supabaseUrl: readEnv('V2_SUPABASE_URL') ?? '',
  supabaseAnonKey: readEnv('V2_SUPABASE_ANON_KEY') ?? '',
});

/**
 * TODO: 導入 LIFF / Supabase Auth 後，改為從 session 取得短期 JWT。
 * 目前以 Service Key / Admin JWT 充當測試憑證，確保前端可先驗證 RPC。
 */
export const getGuardianSessionToken = async (): Promise<string | null> => {
  const explicitJwt = readEnv('V2_SUPABASE_JWT');
  if (explicitJwt) return explicitJwt;
  const serviceKey = readEnv('V2_SUPABASE_SERVICE_KEY');
  return serviceKey ?? null;
};

export const buildSupabaseHeaders = async (): Promise<Record<string, string>> => {
  const { supabaseAnonKey } = getGuardianSupabaseConfig();
  const token = await getGuardianSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (supabaseAnonKey) headers.apikey = supabaseAnonKey;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};
