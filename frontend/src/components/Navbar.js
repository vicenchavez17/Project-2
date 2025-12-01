import { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import { AuthContext } from "../context/AuthContext";

import NavItem from "./NavItem";

export default function Navbar() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user]);

  return (
    <nav className="navbar-modern fixed-top w-100">
      <div className="navbar-container">
        {/* Left: Brand Logo */}
        <div className="navbar-brand" onClick={() => navigate("/")}>
          <span className="brand-text">OutFit AI</span>
          <span className="brand-icon">✨</span>
        </div>

        {/* Center: Nav Links */}
        <div className="navbar-links">
          <NavItem to="/" label="Home" />
          <NavItem to="/about" label="About" />
          <NavItem to="/contact" label="Contact" />
          {user ? (
            <NavItem to="/selectimage" label="Create" />
          ) : (
            <NavItem to="/signin" label="Sign In" />
          )}
        </div>

        {/* Right: Theme Toggle + User Section */}
        <div className="navbar-actions">
          {/* Theme Toggle Icon */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {/* User Section */}
          {user && (
            <div className="user-section">
              <button
                className="profile-btn"
                onClick={() => navigate("/profile")}
                title="View Profile"
              >
                <span className="profile-icon">👤</span>
                <span className="username-text">{user.username}</span>
              </button>
              <button
                className="logout-btn"
                onClick={handleLogout}
                title="Logout"
              >
                <span className="logout-icon">🚪</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
