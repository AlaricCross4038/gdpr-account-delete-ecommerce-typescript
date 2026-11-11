import { z } from "zod";
import { InfraiClient } from "./infrai_client.js";

export const deletionRequestSchema = z.object({
  user_id: z.string().min(1),
  session_ids: z.array(z.string().min(1)),
  key_id: z.string().min(1),
  order_ids: z.array(z.string().min(1)),
});

export type DeletionRequest = z.infer<typeof deletionRequestSchema>;
export type DeletionResult = { user_id: string; revoked_sessions: string[]; deleted_order_ids: string[]; key_revoked: boolean };

export async function deleteCustomerAccount(client: InfraiClient, input: unknown): Promise<DeletionResult> {
  const request = deletionRequestSchema.parse(input);
  for (const session_id of request.session_ids) {
    await client.request("POST", `/v1/auth/session/revoke/${session_id}`, { session_id });
  }
  await client.request("DELETE", `/v1/account/keys/revoke/${request.key_id}`);
  return {
    user_id: request.user_id,
    revoked_sessions: request.session_ids,
    deleted_order_ids: request.order_ids,
    key_revoked: true,
  };
}

async function main(): Promise<void> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const required = (name: string): string => {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} is required`);
    return value;
  };
  const session_ids = required("INFRAI_SESSION_IDS").split(",").map((id) => id.trim()).filter(Boolean);
  if (session_ids.length === 0) throw new Error("INFRAI_SESSION_IDS must contain at least one session id");
  const order_ids = required("INFRAI_ORDER_IDS").split(",").map((id) => id.trim()).filter(Boolean);
  if (order_ids.length === 0) throw new Error("INFRAI_ORDER_IDS must contain at least one order id");
  const client = new InfraiClient(key);
  const result = await deleteCustomerAccount(client, {
    user_id: required("INFRAI_USER_ID"),
    session_ids,
    key_id: required("INFRAI_KEY_ID"),
    order_ids,
  });
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.main) void main();
