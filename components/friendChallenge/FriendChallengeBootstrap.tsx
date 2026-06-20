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

type ConsumeOptions = {
  /** When true, skip auto-accept on `/challenge/:id` — the page handles join there. */
  skipIfOnChallengePage?: boolean;
  currentPathname?: string;
};

let consumeInFlight: Promise<boolean> | null = null;

async function consumePendingFriendChallengeInner(
  options?: ConsumeOptions,
): Promise<boolean> {
  const pendingId = readPendingFriendChallengeId();
  if (!pendingId) return false;

  if (options?.skipIfOnChallengePage && options.currentPathname) {
    const fromPath = challengeIdFromPathname(options.currentPathname);
    if (fromPath === pendingId) return false;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id ?? null;
  if (!uid) return false;

  const { data: challenge } = await rpcFriendChallengeGet(pendingId);
  if (!challenge || challenge.status !== "pending") {
    if (challenge?.status === "active" || challenge?.status === "completed") {
      clearPendingFriendChallengeId();
    }
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
  if (error.includes("not pending")) {
    clearPendingFriendChallengeId();
  }
  return false;
}

/** After sign-in, accept a pending friend-challenge invite stored from `/challenge/:id`. */
export function tryConsumePendingFriendChallenge(
  options?: ConsumeOptions,
): Promise<boolean> {
  if (!consumeInFlight) {
    consumeInFlight = consumePendingFriendChallengeInner(options).finally(() => {
      consumeInFlight = null;
    });
  }
  return consumeInFlight;
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
    const opts = { skipIfOnChallengePage: true, currentPathname: pathname };
    const run = async () => {
      if (cancelled) return;
      await tryConsumePendingFriendChallenge(opts);
    };
    void run();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void tryConsumePendingFriendChallenge(opts);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [pathname]);

  return null;
}
