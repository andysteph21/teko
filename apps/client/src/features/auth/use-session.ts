// Session Supabase réactive — s'abonne aux changements d'état d'auth.

import type { Session } from "@teko/api-client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export interface SessionState {
  session: Session | null;
  loading: boolean;
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ session: null, loading: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, loading: false });
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false });
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  return state;
}
