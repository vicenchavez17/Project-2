// src/pages/ResultPage.js
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const MAIN_COLOR = "#fe5163";

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Expecting location.state = { image: <dataUrl or url>, prompt: "...", shoppingLinks: [...], results: { text: "...", images: [url,...] } }
  // For now many callers will only set image & prompt; we provide sensible defaults.
  const originalImage = location.state?.image || null;
  const prompt = location.state?.prompt || "No prompt provided.";
  const shoppingLinks = location.state?.shoppingLinks || [];
  const results = location.state?.results || {
    text:
      "This is placeholder response text from the API. When your backend is ready this will show the returned paragraph describing the results.",
    images: [
      "https://via.placeholder.com/400x300.png?text=Result+1",
      "https://via.placeholder.com/400x300.png?text=Result+2",
      "https://via.placeholder.com/400x300.png?text=Result+3",
    ],
  };

  // number of result images (can be 1 or 3+)
  const resultImages = results.images || [];

  return (
    <div className="page-wrapper">
      <div className="container-fluid px-0">
        <div className="px-3 px-md-4" style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="page-title" style={{ margin: 0, marginBottom: "0.5rem" }}>Your Result</h1>
              <p style={{ color: "#999", margin: 0, fontSize: "0.95rem" }}>
                {prompt || "Your AI-generated outfit recommendation"}
              </p>
            </div>
            <div>
              <button
                className="btn btn-outline-secondary"
                onClick={() => navigate("/selectimage")}
                style={{
                  borderColor: MAIN_COLOR,
                  color: MAIN_COLOR,
                  padding: "0.5rem 1.5rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = MAIN_COLOR;
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = MAIN_COLOR;
                }}
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>

          {/* Main section: original image (left) and generated image (right) */}
          <div className="row gx-4 gy-4 align-items-stretch">
            {/* Original Image */}
            <div className="col-12 col-md-6">
              <div
                className="card p-3"
                style={{
                  height: "100%",
                  border: `2px solid ${MAIN_COLOR}`,
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(254, 81, 99, 0.03) 0%, rgba(254, 81, 99, 0.08) 100%)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                }}
              >
                <div className="d-flex align-items-center mb-3">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={MAIN_COLOR}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginRight: "8px" }}
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <h5 style={{ color: MAIN_COLOR, margin: 0, fontWeight: "600" }}>Original Image</h5>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "white",
                    borderRadius: "8px",
                    padding: "1rem",
                    minHeight: "400px",
                  }}
                >
                  {originalImage ? (
                    <img
                      src={originalImage}
                      alt="Original"
                      className="result-image img-fluid"
                      style={{
                        maxHeight: "450px",
                        borderRadius: "6px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: "350px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#999",
                      }}
                    >
                      <span>[ Original image not available ]</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Generated Image and Shopping Links */}
            <div className="col-12 col-md-6">
              <div
                className="card p-3"
                style={{
                  height: "100%",
                  border: `2px solid ${MAIN_COLOR}`,
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(254, 81, 99, 0.03) 0%, rgba(254, 81, 99, 0.08) 100%)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                }}
              >
                {/* Generated Image */}
                <div className="mb-4">
                  <div className="d-flex align-items-center mb-3">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={MAIN_COLOR}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ marginRight: "8px" }}
                    >
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                      <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                      <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                      <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    <h5 style={{ color: MAIN_COLOR, margin: 0, fontWeight: "600" }}>AI Generated</h5>
                  </div>
                  {resultImages.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "white",
                        borderRadius: "8px",
                        padding: "1rem",
                        minHeight: "300px",
                      }}
                    >
                      <img
                        src={resultImages[0]}
                        alt="Generated"
                        className="result-image img-fluid"
                        style={{
                          maxHeight: "320px",
                          borderRadius: "6px",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "white",
                        borderRadius: "8px",
                        padding: "1rem",
                        height: "300px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#999",
                      }}
                    >
                      <span>[ No generated image ]</span>
                    </div>
                  )}
                </div>

                {/* Shopping Links */}
                <div>
                  <div className="d-flex align-items-center mb-3">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={MAIN_COLOR}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ marginRight: "8px" }}
                    >
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <h5 style={{ color: MAIN_COLOR, margin: 0, fontWeight: "600" }}>Shop Similar Items</h5>
                  </div>
                  <div
                    style={{
                      background: "white",
                      borderRadius: "8px",
                      padding: "1rem",
                    }}
                  >
                    {shoppingLinks && shoppingLinks.length > 0 ? (
                      <div>
                        {shoppingLinks.map((link, idx) => (
                          <div key={idx} className={idx > 0 ? "mt-2" : ""}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: MAIN_COLOR,
                                textDecoration: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "12px 16px",
                                border: `2px solid ${MAIN_COLOR}`,
                                borderRadius: "8px",
                                transition: "all 0.3s ease",
                                fontWeight: "500",
                                background: "rgba(254, 81, 99, 0.05)",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = MAIN_COLOR;
                                e.currentTarget.style.color = "white";
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(254, 81, 99, 0.3)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "rgba(254, 81, 99, 0.05)";
                                e.currentTarget.style.color = MAIN_COLOR;
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                style={{ marginRight: "12px", flexShrink: 0 }}
                              >
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                              </svg>
                              <span style={{ wordBreak: "break-word", flex: 1 }}>
                                {link.title || link.url}
                              </span>
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: "#999", margin: 0, textAlign: "center", padding: "1rem" }}>
                        No shopping links available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
      </div>
    </div>
  );
}
 