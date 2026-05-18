"use client";

import { useCallback, useEffect, useState } from "react";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import { fetchStaffAccess } from "@/lib/supabase/adminScoutVerification";
import {
  fetchScoutAiInsightAccess,
  type ScoutAiInsightAccess,
} from "@/lib/supabase/scoutAiInsight";
import { supabase } from "@/lib/supabase/client";

export type ScoutAiInsightViewerState = {
  loaded: boolean;
  viewerRole: string | null;
  isStaff: boolean;
  isPlayer: boolean;
  isScout: boolean;
  isApprovedScout: boolean;
  isUnverifiedScout: boolean;
  access: ScoutAiInsightAccess | null;
  accessError: string | null;
  refresh: () => Promise<void>;
};

export function useScoutAiInsightAccess(videoId: string): ScoutAiInsightViewerState {
  const scoutGate = useScoutVerification();
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [access, setAccess] = useState<ScoutAiInsightAccess | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!videoId.trim()) {
      setLoaded(true);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id ?? null;
    if (!uid) {
      setViewerRole(null);
      setIsStaff(false);
      setAccess(null);
      setAccessError(null);
      setLoaded(true);
      return;
    }

    const [userResult, staff] = await Promise.all([
      supabase.from("users").select("role").eq("id", uid).maybeSingle(),
      fetchStaffAccess(),
    ]);

    const role = String(userResult.data?.role ?? "").trim();
    setViewerRole(role);
    setIsStaff(staff.isStaff);

    const showScoutInsight =
      staff.isStaff ||
      (scoutGate.loaded &&
        scoutGate.row?.role === "scout" &&
        (scoutGate.isApprovedScout || scoutGate.isUnverifiedScout));

    if (!showScoutInsight) {
      setAccess(null);
      setAccessError(null);
      setLoaded(true);
      return;
    }

    if (!scoutGate.isApprovedScout && !staff.isStaff) {
      setAccess(null);
      setAccessError(null);
      setLoaded(true);
      return;
    }

    const result = await fetchScoutAiInsightAccess({ videoId, forRun: false });
    if (result.errorMessage) {
      setAccess(null);
      setAccessError(result.errorMessage);
    } else {
      setAccess(result.data);
      setAccessError(null);
    }
    setLoaded(true);
  }, [
    videoId,
    scoutGate.loaded,
    scoutGate.row?.role,
    scoutGate.isApprovedScout,
    scoutGate.isUnverifiedScout,
  ]);

  useEffect(() => {
    setLoaded(false);
    void refresh();
  }, [refresh]);

  const isScout = scoutGate.loaded && scoutGate.row?.role === "scout";

  return {
    loaded: loaded && scoutGate.loaded,
    viewerRole,
    isStaff,
    isPlayer: viewerRole === "player",
    isScout,
    isApprovedScout: scoutGate.isApprovedScout || isStaff,
    isUnverifiedScout: isScout && scoutGate.isUnverifiedScout && !isStaff,
    access,
    accessError,
    refresh,
  };
}
