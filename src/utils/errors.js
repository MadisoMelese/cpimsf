/**
 * Extracts a human-readable message from any kind of error thrown by the API.
 *
 * Backend error shape:  { error: { message, code, details } }
 * Fallback chain:
 *   1. response body message (our API convention)
 *   2. axios network error message
 *   3. plain Error message
 *   4. provided fallback string
 */
export function parseApiError(err, fallback = 'An unexpected error occurred') {
  if (!err) return fallback;

  // Axios response error — our backend's { error: { message } } shape
  const body = err?.response?.data;
  if (body?.error?.message) return body.error.message;
  if (body?.message)        return body.message;

  // Axios network / timeout errors
  if (err.message) return err.message;

  return fallback;
}

/**
 * Returns true when the error is a specific HTTP status code.
 */
export function isHttpStatus(err, status) {
  return err?.response?.status === status;
}

/**
 * Returns the HTTP status code of an axios error, or null.
 */
export function httpStatus(err) {
  return err?.response?.status ?? null;
}
