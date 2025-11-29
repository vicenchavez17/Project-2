import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "bootstrap/dist/css/bootstrap.css";

export default function SignInPage() {
  // Access login from context
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Track which form is visible
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Sign in form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Create account form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [apiError, setApiError] = useState("");

  // Fake Create API
  function fakeCreateAccountAPI(formData) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (formData.email.toLowerCase() === "taken@example.com") {
          reject({ message: "Email is already in use." });
        } else {
          resolve({ success: true });
        }
      }, 1000);
    });
  }

  // Fake Sign In API
  function fakeSignInAPI({ username, password }) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (username.toLowerCase() === "unknownuser") {
          reject({ message: "Username does not exist." });
        }

        resolve({
          success: true,
          token: "fake_jwt_token_12345",
        });
      }, 1000);
    });
  }

  const handleSignIn = async (e) => {
    e.preventDefault();
    setApiError("");

    try {
      const response = await fakeSignInAPI({ username, password });

      // Use AuthContext login()
      login(response.token, username);

      // Navigate to dashboard (selectimage)
      navigate("/selectimage");

    } catch (err) {
      setApiError(err.message || "Login failed.");
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setApiError("");

    try {
      await fakeCreateAccountAPI({
        name: newName,
        email: newEmail,
        username: newUsername,
        password: newPassword,
      });

      // Prefill the main sign in form
      setUsername(newUsername);
      setPassword(newPassword);

      // Close the create account area
      setIsCreatingAccount(false);

      // Clear the create form
      setNewName("");
      setNewEmail("");
      setNewUsername("");
      setNewPassword("");

    } catch (err) {
      setApiError(err.message || "Something went wrong.");
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
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
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
                />
              </div>

              <button type="submit" className="btn btn-primary w-100">
                Sign In
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

                  <button type="submit" className="btn btn-success">
                    Create
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
