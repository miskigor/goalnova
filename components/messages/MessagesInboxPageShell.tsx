"use client";

import { useScoutVerification } from "@/hooks/useScoutVerification";
import { MessagesInboxView } from "@/components/messages/MessagesInboxView";
import { ScoutMobileLayoutCheck } from "@/components/scout/ScoutMobileLayoutCheck";

type Props = {
  title: string;
};

const INBOX_PAGE_TITLE_CLASS =
  "mb-5 min-w-0 break-words text-xl font-semibold tracking-tight text-gn-text max-lg:mb-2 max-lg:text-sm sm:mb-6 sm:text-2xl";

export function MessagesInboxPageShell({ title }: Props) {
  const scoutGate = useScoutVerification();
  const isScout =
    scoutGate.loaded && scoutGate.row?.role === "scout";

  return (
    <>
      {isScout ? <ScoutMobileLayoutCheck /> : null}
      <h1 className={INBOX_PAGE_TITLE_CLASS}>{title}</h1>
      <MessagesInboxView />
    </>
  );
}
