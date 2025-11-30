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
    <nav className="navbar fixed-bottom border-top w-100 p-0">
      {/* Top row containing theme toggle + user info + logout */}
      <div className="w-100 d-flex justify-content-between align-items-center px-3 py-2">

        {/* Theme Button */}
        <button
          onClick={toggleTheme}
          className={`btn btn-sm ${
            theme === "dark" ? "btn-outline-light" : "btn-outline-dark"
          }`}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>

        {/* Profile + Username + Logout */}
          <div className="d-flex align-items-center">

            {/* Profile Button (only when logged in) */}
            {user && (
              <button
                className={`btn btn-sm me-3 ${
                  theme === "dark" ? "btn-outline-light" : "btn-outline-dark"
                }`}
                onClick={() => navigate("/profile")}
              >
                Profile
              </button>
            )}

            {/* Username */}
            {user && (
              <span className="me-3 fw-bold">
                {user.username}
              </span>
            )}

            {/* Logout */}
            {user && (
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={handleLogout}
              >
                Logout
              </button>
            )}
          </div>
      </div>

      {/* Bottom row with nav links */}
      <div className="d-flex justify-content-around w-100 py-2">
        <NavItem to="/" label="Home" />
        <NavItem to="/about" label="About" />
        <NavItem to="/contact" label="Contact" />

        {user ? (
          <NavItem to="/selectimage" label="Create" />
        ) : (
          <NavItem to="/signin" label="Sign In" />
        )}
      </div>
    </nav>
  );
}
