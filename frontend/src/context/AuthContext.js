import { createContext, useState, useEffect } from "react";

// Helper to read the auth cookie
function getAuthTokenFromCookie() {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("authToken="));

  return cookie ? cookie.split("=")[1] : null;
}

// Create the context
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null); // { username: "Tim" }

  // Load token+username on app start
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      setUser(null);
    }
  }, []);

  // Called when user signs in
  const login = (tokenValue, usernameValue) => {
    // Save cookie
    document.cookie = `authToken=${tokenValue}; path=/; SameSite=Strict`;

    // Update state
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify({username: usernameValue}));
    setUser({username: usernameValue});
  };

  // Called when user logs out
  const logout = () => {
    // Remove cookie
    document.cookie =
      "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict";

    // Clear state
    localStorage.setItem("logout-event", Date.now());
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
  };

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "logout-event") {
        setUser(null);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);


  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
