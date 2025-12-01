import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "bootstrap/dist/css/bootstrap.css";

export default function SignInPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Track which form is visible
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Sign in form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Create account form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to call backend
  async function postJSON(url, body) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data;
  }

  // -------------------------
  // Handle Create Account
  // -------------------------
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setApiError("");
    setIsLoading(true);

    try {
      const result = await postJSON("/auth/register", {
        fullName: newName,
        username: newUsername,
        email: newEmail.toLowerCase(),
        password: newPassword,
      });

      // success: backend returns a token and user info
      const username = result.user?.username || newUsername;
      login(username, result.token);

      // Auto-fill the login form
      setEmail(newEmail);
      setPassword(newPassword);

      // Close create account form
      setIsCreatingAccount(false);

      // Redirect to selectimage
      navigate("/selectimage");
    } catch (err) {
      setApiError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------
  // Handle Login
  // -------------------------
  const handleSignIn = async (e) => {
    e.preventDefault();
    setApiError("");
    setIsLoading(true);

    try {
      const result = await postJSON("/auth/login", {
        email: email.toLowerCase(),
        password,
      });

      // Save token + user into context
      const username = result.user?.username || email.split('@')[0];
      login(username, result.token);

      // Move to selectimage
      navigate("/selectimage");
    } catch (err) {
      setApiError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container my-5">
      <div className="row justify-content-center">
        
        {/* Sign In Form */}
        <div className="col-md-5">
          <div className="card shadow-sm p-4">
            <h3 className="mb-3 text-center">Sign In</h3>

            {apiError && !isCreatingAccount && (
              <div className="alert alert-danger py-2">{apiError}</div>
            )}

            <form onSubmit={handleSignIn}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <div className="text-center mt-3">
              <button
                className="btn btn-link"
                onClick={() => {
                  setApiError("");
                  setIsCreatingAccount(true);
                }}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>

        {/* Create Account Form */}
        {isCreatingAccount && (
          <div className="col-md-5">
            <div className="card shadow-sm p-4">
              <h3 className="mb-3 text-center">Create Account</h3>

              {apiError && (
                <div className="alert alert-danger py-2">{apiError}</div>
              )}

              <form onSubmit={handleCreateAccount}>
                <div className="mb-3">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Choose a username"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                  />
                </div>

                <div className="d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setApiError("");
                      setIsCreatingAccount(false);
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
