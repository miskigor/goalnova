"use client";

import { useCallback, useEffect, useState } from "react";
import {
  dismissUploadFirstVideo,
  isUploadFirstVideoDismissed,
} from "@/lib/onboarding/uploadFirstVideo";

export function useUploadFirstVideoDismiss() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(isUploadFirstVideoDismissed());
  }, []);

  const dismiss = useCallback(() => {
    dismissUploadFirstVideo();
    setDismissed(true);
  }, []);

  return { dismissed, dismiss };
}
