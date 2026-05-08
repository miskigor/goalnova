"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  resolveChallengeCardAudience,
  type ChallengeCardAudience,
} from "@/lib/supabase/challengeCardAudience";

export type ChallengeCardAudienceState =
  | { status: "loading" }
  | { status: "unknown" }
  | ChallengeCardAudience;

export function useChallengeCardAudience(): ChallengeCardAudienceState {
  const [state, setState] = useState<ChallengeCardAudienceState>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      setState({ status: "loading" });
      const next = await resolveChallengeCardAudience();
      if (cancelled) return;
      if (next === null) {
        setState({ status: "unknown" });
        return;
      }
      setState(next);
    }

    void refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
