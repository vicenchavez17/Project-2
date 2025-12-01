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

        {/* Username + Logout */}
        <div className="d-flex align-items-center">
          {user && (
            <span className="me-3 fw-bold">
              {user.username || user.email}
            </span>
          )}

          {user && (
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={ handleLogout }
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
          <NavItem to="/selectimage" label="Upload" />
        ) : (
          <NavItem to="/signin" label="Sign In" />
        )}
      </div>
    </nav>
  );
}
