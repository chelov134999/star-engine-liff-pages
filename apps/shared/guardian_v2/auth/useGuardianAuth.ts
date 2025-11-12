import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  GuardianLiffRedirectError,
  getGuardianAuthInfo,
  type GuardianLiffProfile,
} from './session';

export interface GuardianAuthState {
  loading: boolean;
  error: string | null;
  session: Session | null;
  user: User | null;
  roles: string[];
  defaultLeadId?: string | null;
  defaultAccountId?: string | null;
  profile?: GuardianLiffProfile | null;
}

const initialState: GuardianAuthState = {
  loading: true,
  error: null,
  session: null,
  user: null,
  roles: [],
  defaultLeadId: null,
  defaultAccountId: null,
  profile: null,
};

export const useGuardianAuth = (): GuardianAuthState => {
  const [state, setState] = useState<GuardianAuthState>(initialState);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const info = await getGuardianAuthInfo();
        if (!active) return;
        setState({
          loading: false,
          error: null,
          ...info,
        });
      } catch (error) {
        if (error instanceof GuardianLiffRedirectError) {
          // LIFF login will redirect，暫不更新狀態以避免閃爍
          return;
        }
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Guardian Auth 初始化失敗';
        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));
      }
    };

    hydrate();

    return () => {
      active = false;
    };
  }, []);

  return state;
};
