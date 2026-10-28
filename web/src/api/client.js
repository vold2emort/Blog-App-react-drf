import axios from "axios";

export const AUTH_EXPIRED_EVENT = "blog:auth-expired";

const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"]);

/**
 * Endpoints that must never trigger the interceptor's refresh-and-retry.
 */
const NO_REFRESH_PATHS = [
  "/auth/login/",
  "/auth/login/refresh/",
  "/auth/logout/",
  "/user/register/",
];

let accessToken = null;

const HAS_SESSION_KEY = "blog:hasSession";
const USER_KEY = "blog:user";

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
}

export function clearAccessToken() {
  accessToken = null;
}

export function getHasSession() {
  try {
    return localStorage.getItem(HAS_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setHasSession() {
  try {
    localStorage.setItem(HAS_SESSION_KEY, "1");
  } catch {
    // ignore
  }
}

export function clearHasSession() {
  try {
    localStorage.removeItem(HAS_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function getCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    // ignore
  }
}

export function clearCachedUser() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshInFlight = null;

/** Rotate the token using refresh cookie. */
export function refreshSession() {
  refreshInFlight ??= api
    .post("/auth/login/refresh/")
    .then((response) => {
      const token = response?.data?.access;
      if (token) {
        setAccessToken(token);
      }
      return response;
    })
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

    if (
      error.response?.status !== 401 ||
      isAuthEndpoint ||
      original?._retried
    ) {
      throw error;
    }

    original._retried = true;

    try {
      await refreshSession();
      return await api(original);
    } catch (refreshError) {
      clearAccessToken();
      clearHasSession();
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
