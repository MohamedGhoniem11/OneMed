/**
 * Create an Error carrying an HTTP status. The central error handler turns it
 * into `{ message, requestId }`; 5xx details are never sent to clients.
 */
export function httpError(status, message, extra = {}) {
  return Object.assign(new Error(message), { status, ...extra });
}

export default httpError;
