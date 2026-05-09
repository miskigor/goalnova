"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import { UploadVideoCtaButton } from "@/components/upload/UploadVideoCtaButton";
import { logFullSupabaseError } from "@/lib/supabase/logError";

type Status = "loading" | "empty" | "has" | "error";

/**
 * When the profile owner is a player with no uploaded videos yet, show CTA copy + button.
 */
export function ProfilePlayerUploadPrompt({ userId }: { userId: string }) {
  const tFeed = useTranslations("homeFeed");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setStatus("loading");
      const { count, error } = await supabase
        .from("videos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (cancelled) return;
      if (error) {
        logFullSupabaseError("[ProfilePlayerUploadPrompt] video count", error, {
          userId,
        });
        setStatus("error");
        return;
      }
      setStatus((count ?? 0) > 0 ? "has" : "empty");
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (status !== "empty") {
    return null;
  }

  return (
    <div
      className="min-w-0 max-w-full rounded-2xl border border-gn-accent/25 bg-gradient-to-b from-gn-accent/10 to-gn-surface/30 px-4 py-8 text-center shadow-[0_8px_32px_-12px_rgba(249,115,22,0.25)]"
      role="region"
      aria-label={tFeed("emptyFirstVideo")}
    >
      <p className="mx-auto max-w-full min-w-0 break-words text-sm font-medium text-gn-text sm:max-w-sm">
        {tFeed("emptyFirstVideo")}
      </p>
      <div className="mt-5 flex justify-center">
        <UploadVideoCtaButton className="!w-auto max-w-full" />
      </div>
    </div>
  );
}
