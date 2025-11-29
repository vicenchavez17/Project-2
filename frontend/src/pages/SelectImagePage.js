import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SelectImagePage() {
  const [selectedImage, setSelectedImage] = useState(null); // base64 preview
  const [selectedFile, setSelectedFile] = useState(null);   // actual File for upload
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const navigate = useNavigate();

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result);
    reader.readAsDataURL(file);
  };

  // Pinterest placeholder
  const handlePinterestSelect = () => {
    const placeholder =
      "https://via.placeholder.com/400x300.png?text=Pinterest+Image";

    // We have no file from Pinterest (yet), so disable API for now.
    setSelectedImage(placeholder);
    setSelectedFile(null);
  };

  // Undo
  const handleUndo = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setInputText("");
    setApiError("");
  };

  // Continue → Call backend API
  const handleContinue = async () => {
    if (!selectedFile) {
      setApiError("Only uploaded images can be processed right now.");
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("query", inputText);

      const response = await fetch("http://localhost:3000/recommend", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Server returned an error.");
      }

      const data = await response.json();

      // Pass to result page
      navigate("/result", {
        state: {
          image: selectedImage,              // user uploaded preview
          prompt: inputText,                // text user typed
          results: {
            text: "Your generated image result:", // until backend adds text
            images: ["data:image/png;base64," + data.image], // base64 output
          },
        },
      });
    } catch (err) {
      setApiError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container my-4 pt-3">
      <h2 className="text-center mb-4">Dashboard</h2>

      {apiError && (
        <div className="alert alert-danger text-center">{apiError}</div>
      )}

      {!selectedImage && (
        <div className="text-center">
          <label className="btn btn-primary me-3">
            Upload Image
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileUpload}
            />
          </label>

          <button
            className="btn btn-danger"
            onClick={handlePinterestSelect}
          >
            Sign in to Pinterest
          </button>
        </div>
      )}

      {selectedImage && (
        <div className="text-center">
          <img
            src={selectedImage}
            alt="Selected"
            className="img-fluid mt-3"
            style={{ maxHeight: "300px", borderRadius: "10px" }}
          />

          <div className="mt-3">
            <button className="btn btn-secondary" onClick={handleUndo}>
              Undo
            </button>
          </div>

          <div className="mt-4">
            <textarea
              className="form-control"
              rows="3"
              placeholder="Describe your image or add a message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          <button
            className="btn btn-success mt-4"
            disabled={
              loading ||
              !selectedImage ||
              inputText.trim().length === 0 ||
              !selectedFile /* prevents Pinterest placeholder */
            }
            onClick={handleContinue}
          >
            {loading ? "Processing..." : "Continue"}
          </button>
        </div>
      )}
    </div>
  );
}
