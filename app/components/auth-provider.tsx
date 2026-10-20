"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getMe, getToken, saveToken, signIn, signUp, updatePreferredCurrency, type User } from "@/lib/api";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authenticate: (email: string, password: string, name?: string) => Promise<void>;
  setPreferredCurrency: (currency: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    if (!getToken()) {
      void Promise.resolve().then(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }
    getMe()
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch(() => clearToken())
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function authenticate(email: string, password: string, name?: string) {
    const result = name ? await signUp(name, email, password) : await signIn(email, password);
    saveToken(result.access_token);
    setUser(result.user);
    router.replace("/dashboard");
  }

  async function setPreferredCurrency(currency: string) {
    const updated = await updatePreferredCurrency(currency);
    setUser(updated);
  }

  function logout() {
    clearToken();
    setUser(null);
    router.replace("/");
  }

  return <AuthContext.Provider value={{ user, loading, authenticate, setPreferredCurrency, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}