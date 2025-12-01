// src/pages/ResultPage.js
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const MAIN_COLOR = "#fe5163";

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Expecting location.state = { image: <dataUrl or url>, prompt: "...", results: { text: "...", images: [url,...] } }
  // For now many callers will only set image & prompt; we provide sensible defaults.
  const originalImage = location.state?.image || null;
  const prompt = location.state?.prompt || "No prompt provided.";
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
        <div className="px-3" style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h1 className="page-title" style={{ margin: 0 }}>Result</h1>
          <div>
            <button
              className="btn btn-outline-secondary me-2"
              onClick={() => navigate("/selectimage")}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Top section: original image (left) and returned text (right) */}
        <div className="row gx-3 gy-3 align-items-start">
          <div className="col-12 col-md-6">
            <div
              className="card p-3"
              style={{
                height: "100%",
                border: `1px solid ${MAIN_COLOR}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {originalImage ? (
                <img
                  src={originalImage}
                  alt="Original"
                  className="result-image img-fluid"
                />
              ) : (
                <div
                  style={{
                    height: "350px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: MAIN_COLOR,
                  }}
                >
                  <span>[ Original image not available ]</span>
                </div>
              )}
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div
              className="card p-3"
              style={{
                minHeight: "150px",
                border: `1px solid ${MAIN_COLOR}`,
              }}
            >
              <h5 style={{ color: MAIN_COLOR }}>Received Text</h5>
              <p className="mt-2" style={{ whiteSpace: "pre-wrap" }}>
                {results.text || prompt}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr style={{ borderColor: MAIN_COLOR, margin: "1.75rem 0" }} />

        {/* Bottom section: generated images grid */}
        <div>
          <h5 style={{ color: MAIN_COLOR }}>Generated Images</h5>

          {/* If single image, center it; otherwise show 3 columns on md+ */}
          <div className="row gx-3 gy-3 mt-2">
            {resultImages.length === 1 ? (
              <div className="col-12 d-flex justify-content-center">
                <div
                  className="card p-2"
                  style={{
                    border: `1px solid ${MAIN_COLOR}`,
                    maxWidth: 640,
                    width: "100%",
                  }}
                >
                  <img
                    src={resultImages[0]}
                    alt="Generated 1"
                    className="result-image img-fluid"
                  />
                </div>
              </div>
            ) : (
              // Default grid: 3 columns on md+, 2 on sm, 1 on xs
              resultImages.map((src, idx) => (
                <div key={idx} className="col-12 col-sm-6 col-md-4">
                  <div
                    className="card p-2"
                    style={{
                      height: "100%",
                      border: `1px solid ${MAIN_COLOR}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={src}
                      alt={`Generated ${idx + 1}`}
                      className="result-image img-fluid"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
 