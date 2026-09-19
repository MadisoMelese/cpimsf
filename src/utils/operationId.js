/**
 * Generates a UUID v4 to use as an idempotency key / operation ID.
 * Every critical mutation must carry one of these so retries are safe.
 */
export function newOperationId() {
  return crypto.randomUUID();
}
