import type { MessageRow } from "@/lib/supabase/messages";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export function isMessageVisibleForUser(
  message: Pick<
    MessageRow,
    "sender_id" | "receiver_id" | "deleted_for_sender" | "deleted_for_recipient"
  >,
  currentUserId: string,
): boolean {
  if (message.sender_id === currentUserId) {
    return message.deleted_for_sender !== true;
  }
  if (message.receiver_id === currentUserId) {
    return message.deleted_for_recipient !== true;
  }
  return false;
}

export async function deleteMessageForCurrentUser(
  message: Pick<MessageRow, "id" | "sender_id" | "receiver_id">,
  currentUserId: string,
  supabase: SupabaseClient<Database>,
): Promise<MessageRow> {
  const uid = currentUserId.trim();
  const messageId = message.id.trim();

  console.log("DELETE START", {
    currentUserId: uid,
    messageId,
    sender_id: message.sender_id,
    receiver_id: message.receiver_id,
  });

  const isSender = message.sender_id === uid;
  const isReceiver = message.receiver_id === uid;

  if (!isSender && !isReceiver) {
    throw new Error("Current user is not sender/receiver for this message.");
  }

  const patch = isSender
    ? { deleted_for_sender: true }
    : { deleted_for_recipient: true };
  const ownershipCol = isSender ? "sender_id" : "receiver_id";

  const { data, error } = await supabase
    .from("messages")
    .update(patch)
    .eq("id", messageId)
    .eq(ownershipCol, uid)
    .select(
      "id,sender_id,receiver_id,message,created_at,deleted_for_sender,deleted_for_recipient",
    )
    .single();

  if (error) throw error;
  if (!data) {
    throw new Error("Delete update returned no row.");
  }

  console.log("DELETE UPDATED ROW", {
    id: data.id,
    sender_id: data.sender_id,
    receiver_id: data.receiver_id,
    deleted_for_sender: data.deleted_for_sender,
    deleted_for_recipient: data.deleted_for_recipient,
  });

  return data as MessageRow;
}
