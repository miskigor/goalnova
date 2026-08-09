"use client";

import { Component, type ReactNode } from "react";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { PushNotificationsSettingsRow } from "@/components/pwa/PushNotificationsSettingsRow";

type BoundaryProps = { children: ReactNode };
type BoundaryState = { hasError: boolean };

/** Keeps Settings usable even if a PWA widget throws on a given device. */
class SettingsPwaErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export function SettingsInstallAppRow() {
  return (
    <SettingsPwaErrorBoundary>
      <InstallAppButton variant="row" />
    </SettingsPwaErrorBoundary>
  );
}

type NotifProps = {
  label: string;
  rowClassName: string;
};

export function SettingsNotificationsRow({ label, rowClassName }: NotifProps) {
  return (
    <SettingsPwaErrorBoundary>
      <PushNotificationsSettingsRow label={label} rowClassName={rowClassName} />
    </SettingsPwaErrorBoundary>
  );
}
