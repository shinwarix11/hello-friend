/**
 * Public, unauthenticated host for SDK and external REST API traffic.
 * The id-preview host is an authenticated browser preview and must never be
 * emitted as an integration URL because non-browser clients are redirected.
 */
export const PUBLIC_API_ORIGIN =
  "https://project--9347818a-431f-4584-98ac-b0d367707e9b-dev.lovable.app";

export const PUBLIC_API_BASE_URL = `${PUBLIC_API_ORIGIN}/api/public/v1`;