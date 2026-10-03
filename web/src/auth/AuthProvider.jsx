import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AUTH_EXPIRED_EVENT } from "@/api/client";
import {
  fetchCsrf,
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

    // The access cookie is httpOnly, so JavaScript cannot tell whether a session
    // exists. Ask the server to rotate the cookies instead: it either refreshes
    // an existing session or 401s, which just means anonymous.
    async function bootstrap() {
      await fetchCsrf();
      await refreshSession().catch(() => {});
      if (!cancelled) setReady(true);
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onExpired() {
      setSignedOut(true);
      queryClient.clear();
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [queryClient]);

  /**
   * The session is disabled rather than deleted on sign-out: clearing the cache
   * does not reliably reset a mounted observer, so a stale user would otherwise
   * keep rendering as signed in.
   */
  const { data: user } = useQuery({
    queryKey: keys.me,
    queryFn: fetchMe,
    enabled: ready && !signedOut,
    retry: false,
    staleTime: Infinity,
  });

  /**
   * Fills the cache before re-enabling, so the observer reveals an already
   * fetched user in the same commit. Awaiting this is what makes navigation
   * after sign-in safe: callers redirect as soon as signIn resolves, and the
   * route guards read isAuthenticated.
   */
  async function loadMe() {
    const fresh = await queryClient.fetchQuery({ queryKey: keys.me, queryFn: fetchMe });
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

  return (
    <AuthContext
      value={{
        user: user ?? null,
        isAuthenticated: !signedOut && Boolean(user),
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