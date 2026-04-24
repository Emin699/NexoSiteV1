import { useEffect, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "nexoshop_token";
const USER_EMAIL_KEY = "nexoshop_email";
const USER_NAME_KEY = "nexoshop_name";

setAuthTokenGetter(() => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
});

export function storeAuth(token: string | null | undefined, firstName: string, email: string) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  localStorage.setItem(USER_NAME_KEY, firstName);
  localStorage.setItem(USER_EMAIL_KEY, email);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
}

export function useAuth() {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    document.documentElement.classList.add("dark");
    if (token) setIsAuthenticated(true);
    setIsReady(true);
  }, []);

  const handleAuth = (token: string | null | undefined, firstName: string, email: string) => {
    storeAuth(token, firstName, email);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    clearAuth();
    setIsAuthenticated(false);
  };

  return { isReady, isAuthenticated, handleAuth, handleLogout };
}
