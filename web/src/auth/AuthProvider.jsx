import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AUTH_EXPIRED_EVENT, tokenStore } from "@/api/client";
import { fetchMe, keys, login, logout, register } from "@/api/endpoints";

import { AuthContext } from "./auth-context";

export default function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [access, setAccess] = useState(() => tokenStore.access);

  useEffect(() => {
    function onExpired() {
      setAccess(null);
      queryClient.clear();
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [queryClient]);

  const { data: user, isPending } = useQuery({
    queryKey: keys.me,
    queryFn: fetchMe,
    enabled: Boolean(access),
    retry: false,
    staleTime: Infinity,
  });

  async function signIn(credentials) {
    await login(credentials);
    setAccess(tokenStore.access);
  }

  async function signUp(payload) {
    await register(payload);
    setAccess(tokenStore.access);
  }

  async function signOut() {
    await logout();
    setAccess(null);
    queryClient.clear();
  }

  return (
    <AuthContext
      value={{
        user: user ?? null,
        isAuthenticated: Boolean(access),
        isLoading: Boolean(access) && isPending,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext>
  );
}