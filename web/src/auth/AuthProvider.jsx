import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AUTH_EXPIRED_EVENT,
  clearAccessToken,
  clearCachedUser,
  clearHasSession,
  getAccessToken,
  getCachedUser,
  getHasSession,
  setCachedUser,
} from "@/api/client";
import {
  fetchMe,
  keys,
  login,
  logout,
  refreshSession,
  register,
} from "@/api/endpoints";

import { AuthContext } from "./auth-context";

export default function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (getHasSession()) {
        try {
          await refreshSession();
        } catch {
          clearAccessToken();
          clearHasSession();
          clearCachedUser();
        }
      }
      if (!cancelled) setReady(true);
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onExpired() {
      clearAccessToken();
      clearHasSession();
      clearCachedUser();
      setSignedOut(true);
      queryClient.clear();
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [queryClient]);

  const cachedUser = ready && !signedOut && getHasSession() ? getCachedUser() : null;

  const { data: user } = useQuery({
    queryKey: keys.me,
    queryFn: fetchMe,
    enabled: ready && !signedOut && !!getAccessToken() && !getHasSession(),
    retry: false,
    staleTime: Infinity,
    initialData: cachedUser || undefined,
  });

  async function loadMe() {
    clearCachedUser();
    const fresh = await queryClient.fetchQuery({
      queryKey: keys.me,
      queryFn: fetchMe,
    });
    setCachedUser(fresh);
    setSignedOut(false);
    return fresh;
  }

  async function signIn(credentials) {
    await login(credentials);
    await loadMe();
  }

  async function signUp(payload) {
    await register(payload);
    await loadMe();
  }

  async function signOut() {
    await logout();
    setSignedOut(true);
    queryClient.clear();
  }

  const resolvedUser =
    user ?? (ready && !signedOut && getHasSession() ? getCachedUser() : null);

  return (
    <AuthContext
      value={{
        user: resolvedUser ?? null,
        isAuthenticated: !signedOut && Boolean(resolvedUser),
        isLoading: !ready,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext>
  );
}
