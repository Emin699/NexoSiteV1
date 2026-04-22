import { useEffect, useState } from "react";
import { useRegisterUser } from "@workspace/api-client-react";

const USER_ID_KEY = "nexoshop_user_id";

// We monkey patch fetch locally to add X-User-Id since setAuthTokenGetter 
// only handles Authorization: Bearer token and the API needs X-User-Id
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

export function useAuth() {
  const [isReady, setIsReady] = useState(false);
  const registerUser = useRegisterUser();

  useEffect(() => {
    const initializeAuth = async () => {
      const storedId = localStorage.getItem(USER_ID_KEY);
      
      if (!storedId) {
        try {
          const user = await registerUser.mutateAsync({
            data: {
              firstName: "Demo",
              username: null,
            }
          });
          localStorage.setItem(USER_ID_KEY, user.id.toString());
        } catch (e) {
          console.error("Failed to register demo user", e);
        }
      }
      
      document.documentElement.classList.add("dark");
      setIsReady(true);
    };

    initializeAuth();
  }, []);

  return { isReady };
}
