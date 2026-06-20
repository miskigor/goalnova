"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  clearPendingFriendChallengeId,
  readPendingFriendChallengeId,
  rememberFriendChallengeId,
} from "@/lib/friendChallenge/friendChallengeInviteStorage";
import {
  rpcFriendChallengeAccept,
  rpcFriendChallengeGet,
} from "@/lib/supabase/friendChallenges";
import { supabase } from "@/lib/supabase/client";

const CHALLENGE_PATH_RE = /^\/challenge\/([^/?#]+)/;

function challengeIdFromPathname(pathname: string): string | null {
  const normalized = pathname.replace(/^\/(en|hr|de|bs|es|pt|sr|fr|it|nl|tr|ar)(?=\/)/, "");
  const match = normalized.match(CHALLENGE_PATH_RE);
  return match?.[1]?.trim() || null;
}

/** After sign-in, accept a pending friend-challenge invite stored from `/challenge/:id`. */
export async function tryConsumePendingFriendChallenge(): Promise<boolean> {
  const pendingId = readPendingFriendChallengeId();
  if (!pendingId) return false;

  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id ?? null;
  if (!uid) return false;

  const { data: challenge } = await rpcFriendChallengeGet(pendingId);
  if (!challenge || challenge.status !== "pending") {
    clearPendingFriendChallengeId();
    return false;
  }
  if (challenge.challenger_id === uid) {
    return false;
  }

  const { error } = await rpcFriendChallengeAccept(pendingId);
  if (!error) {
    clearPendingFriendChallengeId();
    return true;
  }
  return false;
}

export function FriendChallengeBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    const fromPath = challengeIdFromPathname(pathname);
    if (fromPath) {
      rememberFriendChallengeId(fromPath);
    }
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await tryConsumePendingFriendChallenge();
    };
    void run();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void tryConsumePendingFriendChallenge();
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
