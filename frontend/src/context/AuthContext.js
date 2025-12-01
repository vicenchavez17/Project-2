import { createContext, useState, useEffect } from "react";
import authClient from "../services/authClient";

// Create the context
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null); // { username, fullName, email }

  // Initialize from persisted token (if any)
  useEffect(() => {
    const t = authClient.getToken();
    if (t) {
      setTokenState(t);
      // fetch authoritative profile
      authClient
        .getProfile(t)
        .then((data) => {
          if (data && data.user) {
            setUser(data.user);
            try {
              localStorage.setItem("user", JSON.stringify(data.user));
            } catch (e) {}
          }
        })
        .catch(() => {
          // invalid token; clear
          authClient.clearToken();
          setTokenState(null);
          setUser(null);
        });
    }
  }, []);

  // Backwards-compatible login helper used across the app.
  // Usage: login(identifierOrToken, tokenOpt)
  // - If called as login(emailOrUsername, token) we use token parameter.
  // - If called as login(token) we use token directly.
  const login = async (a, b) => {
    let t = null;
    if (b) {
      t = b; // caller provided token as second arg
    } else if (typeof a === "string" && a.split(".").length === 3) {
      t = a; // caller passed token as first arg
    }

    if (!t) {
      // no token provided, attempt to authenticate using identifier+password via authClient
      // (not used by current callers but handy)
      throw new Error('No token provided to login()');
    }

    // persist token and fetch profile
    authClient.setToken(t);
    setTokenState(t);
    try {
      const profile = await authClient.getProfile(t);
      if (profile && profile.user) {
        setUser(profile.user);
        localStorage.setItem("user", JSON.stringify(profile.user));
      }
    } catch (err) {
      // token invalid
      authClient.clearToken();
      setTokenState(null);
      setUser(null);
      throw err;
    }
  };

  const register = async ({ fullName, username, email, password }) => {
    const res = await authClient.register({ fullName, username, email, password });
    // res expected { token }
    if (res && res.token) {
      await login(res.token);
      return res;
    }
    throw new Error('Registration failed');
  };

  const logout = () => {
    authClient.clearToken();
    localStorage.setItem("logout-event", Date.now());
    localStorage.removeItem("user");
    setUser(null);
    setTokenState(null);
  };

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "logout-event") {
        setUser(null);
        setTokenState(null);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
