import { useEffect, useState } from "react";

const USER_ID_KEY = "nexoshop_user_id";
const USER_EMAIL_KEY = "nexoshop_email";
const USER_NAME_KEY = "nexoshop_name";

const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const userId = localStorage.getItem(USER_ID_KEY);
  if (userId) {
    init = init || {};
    init.headers = new Headers(init.headers);
    init.headers.set("X-User-Id", userId);
  }
  return originalFetch(input, init);
};

export function storeAuth(userId: number, firstName: string, email: string) {
  localStorage.setItem(USER_ID_KEY, String(userId));
  localStorage.setItem(USER_NAME_KEY, firstName);
  localStorage.setItem(USER_EMAIL_KEY, email);
}

export function clearAuth() {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
}

export function useAuth() {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem(USER_ID_KEY);
    document.documentElement.classList.add("dark");
    if (userId) setIsAuthenticated(true);
    setIsReady(true);
  }, []);

  const handleAuth = (userId: number, firstName: string, email: string) => {
    storeAuth(userId, firstName, email);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    clearAuth();
    setIsAuthenticated(false);
  };

  return { isReady, isAuthenticated, handleAuth, handleLogout };
}
