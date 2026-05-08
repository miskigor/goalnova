import type { MessageRow } from "@/lib/supabase/messages";
import { coerceDeletedFlag } from "@/lib/supabase/messages";

export type DbMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at?: string;
  deleted_for_sender?: boolean;
  deleted_for_recipient?: boolean;
};

export type UiMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt?: string;
  deletedForSender: boolean;
  deletedForRecipient: boolean;
};

export function mapMessageFromDb(row: DbMessage): UiMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    message: row.message,
    createdAt: row.created_at,
    deletedForSender: coerceDeletedFlag(row.deleted_for_sender),
    deletedForRecipient: coerceDeletedFlag(row.deleted_for_recipient),
  };
}

export function mapMessageRowFromSupabase(row: MessageRow): UiMessage {
  return mapMessageFromDb(row);
}
