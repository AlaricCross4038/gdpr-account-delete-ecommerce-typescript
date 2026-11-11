import test from "node:test";
import assert from "node:assert/strict";
import { deleteCustomerAccount } from "./account_deletion.js";

test("deletion revokes every session and the account key before returning deleted orders", async () => {
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];
  const client = { request: async (method: string, path: string, body?: unknown) => {
    calls.push(body === undefined ? { method, path } : { method, path, body });
    return {};
  } };
  const result = await deleteCustomerAccount(client as never, {
    user_id: "u_1", session_ids: ["s_1", "s_2"], key_id: "k_1", order_ids: ["o_1"],
  });
  assert.deepEqual(calls, [
    { method: "POST", path: "/v1/auth/session/revoke/s_1", body: { session_id: "s_1" } },
    { method: "POST", path: "/v1/auth/session/revoke/s_2", body: { session_id: "s_2" } },
    { method: "DELETE", path: "/v1/account/keys/revoke/k_1" },
  ]);
  assert.deepEqual(result, { user_id: "u_1", revoked_sessions: ["s_1", "s_2"], deleted_order_ids: ["o_1"], key_revoked: true });
});
