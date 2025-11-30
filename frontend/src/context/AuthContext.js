import { createContext, useState, useEffect } from "react";
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
const login = (emailOrUsername, tokenValue) => {
  // Save JWT in HttpOnly cookie? (You said frontend cookie for now)
  //document.cookie = `authToken=${tokenValue}; path=/; SameSite=Strict`;

  // Save token in localStorage for quick access (non-sensitive)
  localStorage.setItem("token", tokenValue);
  setToken(tokenValue);

  // Save user info
  localStorage.setItem(
    "user",
    JSON.stringify({ username: emailOrUsername })
  );

  // Update context state
  setUser({ username: emailOrUsername });
};

  // Called when user logs out
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);

    // notify other tabs
    localStorage.setItem("logout-event", Date.now());

    // redirect handled inside Navbar logout button
  };


  useEffect(() => {
    const syncLogout = (e) => {
      if (e.key === "logout-event") {
        setUser(null);
        localStorage.removeItem("token");
      }
    };

    window.addEventListener("storage", syncLogout);

    return () => window.removeEventListener("storage", syncLogout);
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
