import axios from "axios";

const ACCESS_KEY = "blog:access";
const REFRESH_KEY = "blog:refresh";

export const AUTH_EXPIRED_EVENT = "blog:auth-expired";

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

const NO_REFRESH_PATHS = [
  "/auth/login/",
  "/auth/login/refresh/",
  "/auth/logout/",
  "/user/register/",
];

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const access = tokenStore.access;
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

let refreshInFlight = null;

async function refreshAccessToken() {
  const refresh = tokenStore.refresh;
  refreshInFlight ??= axios
    .post("/api/auth/login/refresh/", { refresh })
    .finally(() => {
      refreshInFlight = null;
    });
  const { data } = await refreshInFlight;
  tokenStore.set({ access: data.access, refresh: data.refresh });
  return data.access;
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
      !tokenStore.refresh ||
      original?._retried
    ) {
      throw error;
    }

    original._retried = true;

    try {
      const access = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${access}`;
      return await api(original);
    } catch (refreshError) {
      tokenStore.clear();
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