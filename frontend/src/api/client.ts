export const API_BASE_URL =
  import.meta.env.VITE_AUTHSTATUS_API_BASE_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:8000";

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: "include",
  });
}