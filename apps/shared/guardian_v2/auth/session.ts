import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import liff from '@line/liff';

const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env ?? {} : {}) as Record<
  string,
  string
>;

const readEnv = (key: string): string | undefined =>
  env[key] ?? env[`VITE_${key}`] ?? process.env?.[key];

const isBrowser = typeof window !== 'undefined';

export interface GuardianSupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export const getGuardianSupabaseConfig = (): GuardianSupabaseConfig => ({
  supabaseUrl: readEnv('V2_SUPABASE_URL') ?? '',
  supabaseAnonKey: readEnv('V2_SUPABASE_ANON_KEY') ?? '',
});

const getServiceTokenFallback = (): string | null => {
  const explicitJwt = readEnv('V2_SUPABASE_JWT');
  if (explicitJwt) return explicitJwt;
  const serviceKey = readEnv('V2_SUPABASE_SERVICE_KEY');
  return serviceKey ?? null;
};

let supabaseClient: SupabaseClient | null = null;
let cachedSession: Session | null = null;
let liffInitPromise: Promise<void> | null = null;

export class GuardianLiffRedirectError extends Error {
  constructor() {
    super('LIFF login redirect triggered');
    this.name = 'GuardianLiffRedirectError';
  }
}

const ensureSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    const { supabaseUrl, supabaseAnonKey } = getGuardianSupabaseConfig();
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('缺少 Supabase 設定（V2_SUPABASE_URL / V2_SUPABASE_ANON_KEY）');
    }
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseClient;
};

const initGuardianLiff = async (): Promise<void> => {
  if (!isBrowser) return;
  if (!liffInitPromise) {
    const liffId = readEnv('V2_LIFF_ID');
    if (!liffId) throw new Error('缺少 LIFF 設定（V2_LIFF_ID）');
    liffInitPromise = liff
      .init({ liffId })
      .catch((error) => {
        liffInitPromise = null;
        throw error;
      });
  }
  await liffInitPromise;
};

const ensureLiffLoggedIn = async (): Promise<boolean> => {
  if (!isBrowser) return false;
  await initGuardianLiff();
  if (!liff.isLoggedIn()) {
    const redirectUri =
      readEnv('V2_LIFF_REDIRECT_URL') ||
      (typeof window !== 'undefined' ? window.location.href : undefined);
    liff.login({ redirectUri });
    throw new GuardianLiffRedirectError();
  }
  return true;
};

const fetchSessionThroughSupabase = async (): Promise<Session | null> => {
  if (!isBrowser) return null;
  await ensureLiffLoggedIn();
  const idToken = liff.getIDToken();
  if (!idToken) throw new Error('LIFF 尚未提供 ID Token');
  const supabase = ensureSupabaseClient();
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'line',
    token: idToken,
  });
  if (error) throw error;
  const session = data.session ?? (await supabase.auth.getSession()).data.session ?? null;
  cachedSession = session;
  return session;
};

export type GuardianLiffProfile = Awaited<ReturnType<typeof liff.getProfile>>;

export interface GuardianAuthInfo {
  session: Session | null;
  user: User | null;
  roles: string[];
  defaultLeadId?: string | null;
  defaultAccountId?: string | null;
  profile?: GuardianLiffProfile | null;
}

export const getGuardianSessionToken = async (): Promise<string | null> => {
  if (!isBrowser) {
    return getServiceTokenFallback();
  }
  if (cachedSession?.access_token) return cachedSession.access_token;
  const session = await fetchSessionThroughSupabase();
  return session?.access_token ?? null;
};

export const getGuardianAuthInfo = async (): Promise<GuardianAuthInfo> => {
  if (!isBrowser) {
    return {
      session: null,
      user: null,
      roles: ['guardian.admin', 'guardian.ops'],
      defaultLeadId: readEnv('V2_DEFAULT_LEAD_ID') ?? null,
      defaultAccountId: readEnv('V2_DEFAULT_ACCOUNT_ID') ?? null,
      profile: null,
    };
  }
  await ensureLiffLoggedIn();
  const supabase = ensureSupabaseClient();
  await getGuardianSessionToken();

  const [{ data: userResult, error: userError }, profile] = await Promise.all([
    supabase.auth.getUser(),
    liff.getProfile(),
  ]);
  if (userError) throw userError;

  const roles =
    (userResult.user?.user_metadata?.guardianRoles as string[] | undefined) ?? [];
  const defaultLeadId =
    (userResult.user?.user_metadata?.guardianDefaultLeadId as string | undefined) ??
    readEnv('V2_DEFAULT_LEAD_ID') ??
    null;
  const defaultAccountId =
    (userResult.user?.user_metadata?.guardianDefaultAccountId as string | undefined) ??
    readEnv('V2_DEFAULT_ACCOUNT_ID') ??
    null;

  if (!cachedSession) {
    cachedSession = (await supabase.auth.getSession()).data.session ?? null;
  }

  return {
    session: cachedSession,
    user: userResult.user ?? null,
    roles,
    defaultLeadId,
    defaultAccountId,
    profile,
  };
};

export const buildSupabaseHeaders = async (): Promise<Record<string, string>> => {
  const { supabaseAnonKey } = getGuardianSupabaseConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (supabaseAnonKey) headers.apikey = supabaseAnonKey;
  const token = await getGuardianSessionToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

export const hasGuardianAdminRole = (roles: string[]): boolean =>
  roles.includes('guardian.admin') || roles.includes('guardian.ops');

export const guardianAuthDebugState = () => ({
  cachedSession,
  isBrowser,
});
