import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";

export default function NavItem({ to, label }) {
  const { theme } = useContext(ThemeContext);

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `nav-link ${
          isActive
            ? "fw-bold text-warning"
            : theme === "dark"
            ? "text-light"
            : "text-dark"
        }`
      }
    >
      {label}
    </NavLink>
  );
}
