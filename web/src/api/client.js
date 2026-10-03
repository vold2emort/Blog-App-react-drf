import axios from "axios";

export const AUTH_EXPIRED_EVENT = "blog:auth-expired";

export const CSRF_COOKIE = "csrftoken";
export const CSRF_HEADER = "X-CSRFToken";

const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"]);

/**
 * Endpoints that must never trigger the interceptor's refresh-and-retry, or a
 * failed refresh would recurse. `/user/me/` is here because the provider
 * bootstraps with an explicit refresh instead.
 */
const NO_REFRESH_PATHS = [
  "/auth/csrf/",
  "/auth/login/",
  "/auth/login/refresh/",
  "/auth/logout/",
  "/user/register/",
  "/user/me/",
];

/**
 * The CSRF cookie is deliberately not httpOnly so the header can echo it back.
 * Any valid masking of the secret is accepted, so the raw cookie value works.
 */
function readCsrfToken() {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

const api = axios.create({ baseURL: "/api", withCredentials: true });

api.interceptors.request.use((config) => {
  if (UNSAFE_METHODS.has((config.method || "get").toLowerCase())) {
    const csrf = readCsrfToken();
    if (csrf) config.headers[CSRF_HEADER] = csrf;
  }
  return config;
});

let refreshInFlight = null;

/** Rotate the token cookies. Concurrent callers share one request. */
export function refreshSession() {
  refreshInFlight ??= api
    .post("/auth/login/refresh/")
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = NO_REFRESH_PATHS.some((path) =>
      original?.url?.startsWith(path),
    );

    if (error.response?.status !== 401 || isAuthEndpoint || original?._retried) {
      throw error;
    }

    original._retried = true;

    try {
      await refreshSession();
      return await api(original);
    } catch (refreshError) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      throw refreshError;
    }
  },
);

/** Flatten a DRF error body into `{ field: "message" }` for react-hook-form. */
export function fieldErrors(error) {
  const data = error?.response?.data;
  if (!data || typeof data !== "object") return {};
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "detail" || key === "non_field_errors") continue;
    out[key] = Array.isArray(value) ? value.join(" ") : String(value);
  }
  return out;
}

/** A single human-readable message for non-field failures. */
export function errorMessage(error) {
  const data = error?.response?.data;
  if (typeof data === "string" && data) return data;
  if (data && typeof data === "object") {
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return first.join(" ");
    if (typeof first === "string") return first;
  }
  if (error?.code === "ERR_NETWORK") {
    return "Cannot reach the server. Is the API running on port 8000?";
  }
  return "Something went wrong.";
}

export default api;