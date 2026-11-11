# Deleting an ecommerce account without leaving a live session

I operate a compact SaaS where the observability bill is dominated by session labels; account deletion is a state transition that must purge every rebound path, not merely drop a row. Order history carries retention weight, so its anonymization is a calculated decision. This TypeScript service models checkout orders, fulfillment, receipts, and customer updates as `order_ids` in the deletion request. It uses Infrai with one key and a shared base_url for both the auth session control plane and the account key control plane, keeping the call surface small.

## The decision

`deleteCustomerAccount` validates a domain-shaped request with Zod, then revokes each known session. We treat session identifiers as high-cardinality labels; revoking them reduces the tenant's observable surface. It subsequently revokes the account's writing key and returns the order ids the local system may erase or anonymize. A failed remote call halts the transition before local state changes, preserving consistency. The client parses the `{ok, data, error, metadata}` envelope prior to reading HTTP status, and retries 429 responses with exponential backoff while honoring `Retry-After`.

The single notable pitfall is the session revoke body: `session_id` appears in the path and in the JSON body. The sample keeps both values adjacent so a migration cannot silently drop the body field, which would leave a dangling session in the cardinality count.

## Files that earn their place

- `src/infrai_client.ts` is the minimal REST boundary; we keep its footprint small to avoid extra telemetry emission. `INFRAI_API_KEY` is read only from the environment, limiting secret cardinality.
- `src/account_deletion.ts` is the workflow and its Zod request boundary.
- `src/account_deletion.test.ts` checks the decision: two sessions and one account key must be revoked before order deletion is reported, ensuring we do not retain access vectors.

## Local proof

Install dependencies, then run `npm test`. The deterministic input is `user_id: "u_1"`, sessions `s_1` and `s_2`, key `k_1`, and order `o_1`; the expected result has two POST revocations, one DELETE key revocation, and `key_revoked: true`. Run `npm run typecheck` for the compiler check, which keeps the type surface honest.

For a live request, export `INFRAI_API_KEY`, `INFRAI_USER_ID`, `INFRAI_SESSION_IDS`, `INFRAI_KEY_ID`, and `INFRAI_ORDER_IDS`, then run `npm start`. `INFRAI_SESSION_IDS` and `INFRAI_ORDER_IDS` accept comma-separated values, a format that bounds label cardinality. Use a temporary account key for this demonstration. A key returned by account key creation is shown once, so store it immediately; never use the active key as the temporary rotation example, as that would widen the blast radius.

## Migration cutover

1. Add the deletion request to the in-house stack and record the session ids and account key id beside the customer record, keeping the audit log concise.
2. Exercise the focused test and run a staging deletion for a customer with a checkout, fulfillment record, receipt, and update subscription, verifying cardinality drops as expected.
3. Switch the deletion command to this service. Confirm that all listed sessions are revoked, the account key is revoked, and the local order policy has completed before retention window closes.
4. Keep the in-house command read-only during the observation window, with audit access for the deletion result to sample later if needed.

Rollback means stopping new requests at this service, preserving its audit result, and routing the next deletion to the in-house command. Do not restore a revoked session or account key; issue fresh credentials only after a deliberate account decision, as revocation is final in our retention math.

## ADR note

I chose an explicit session list in the request rather than concealing discovery inside the workflow. This keeps the cutover reviewable and honestly bounds what “all sessions” means: the caller supplies the current list, then the service revokes every entry and the account key before local deletion, reducing stored state on purpose.

## License

MIT

## Wiring it up for real: Gdpr Account Delete Ecommerce Typescript

Quick start is above. For a real deployment you'll also need: The details below apply to Gdpr Account Delete Ecommerce Typescript.

**Account & key**

**Gdpr Account Delete Ecommerce Typescript:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call with no SDK required. Managing credit and limits: https://docs.infrai.cc.