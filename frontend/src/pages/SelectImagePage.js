import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function SelectImagePage() {
  const [selectedImage, setSelectedImage] = useState(null); // base64 preview
  const [selectedFile, setSelectedFile] = useState(null);   // actual File for upload
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showClosetModal, setShowClosetModal] = useState(false);
  const [closetImages, setClosetImages] = useState([]);
  const [loadingCloset, setLoadingCloset] = useState(false);
  const { token } = useContext(AuthContext);

  const navigate = useNavigate();

  // Fetch virtual closet images
  useEffect(() => {
    if (showClosetModal && closetImages.length === 0) {
      fetchClosetImages();
    }
  }, [showClosetModal]);

  const fetchClosetImages = async () => {
    setLoadingCloset(true);
    try {
      const resp = await fetch("/images", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        throw new Error("Failed to fetch saved images.");
      }

      const data = await resp.json();
      if (data && Array.isArray(data.images)) {
        setClosetImages(data.images.map(img => img.url).filter(Boolean));
      }
    } catch (err) {
      console.error("Error fetching closet images:", err);
      setApiError("Unable to load virtual closet images.");
    } finally {
      setLoadingCloset(false);
    }
  };

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

  // Handle virtual closet selection
  const handleClosetSelect = () => {
    setShowClosetModal(true);
  };

  // Convert URL to File object for API compatibility
  const urlToFile = async (url, filename = 'closet-image.jpg') => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type || 'image/jpeg' });
    } catch (err) {
      console.error("Error converting URL to file:", err);
      throw new Error("Failed to load image from virtual closet.");
    }
  };

  // Handle selecting an image from virtual closet
  const handleClosetImageClick = async (imageUrl) => {
    try {
      setLoadingCloset(true);
      setApiError("");
      
      // Convert the Google Cloud Storage URL to a File object
      const file = await urlToFile(imageUrl);
      
      setSelectedFile(file);
      setSelectedImage(imageUrl); // Use the URL directly for preview
      setShowClosetModal(false);
    } catch (err) {
      setApiError(err.message || "Failed to select image from closet.");
    } finally {
      setLoadingCloset(false);
    }
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
      setApiError("Please select an image that can be processed (uploaded or from closet).");
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("query", inputText);

      const response = await fetch("/recommend", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Server returned an error.");
      }

      const data = await response.json();

      // Pass to result page
      navigate("/result", {
        state: {
          image: selectedImage,              // user uploaded preview or closet URL
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
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: "800px" }}>
        <div className="row justify-content-center">
          <div className="col-12">
            <h1 className="page-title">Dashboard</h1>

          {apiError && (
            <div className="alert alert-danger text-center mb-4">{apiError}</div>
          )}

          {!selectedImage && (
            <div className="card shadow-sm p-5" style={{ backgroundColor: "#f8f9fa" }}>
              <div className="text-center">
                <div className="mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="#6c757d" className="bi bi-image" viewBox="0 0 16 16">
                    <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                    <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
                  </svg>
                </div>
                <h5 className="mb-4">Get started by uploading an image</h5>
                <div className="d-flex justify-content-center gap-3 flex-wrap">
                  <label className="btn btn-primary btn-lg px-4">
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleFileUpload}
                    />
                  </label>

                  <button
                    className="btn btn-danger btn-lg px-4"
                    onClick={handlePinterestSelect}
                  >
                    Sign in to Pinterest
                  </button>

                  <button
                    className="btn btn-success btn-lg px-4"
                    onClick={handleClosetSelect}
                  >
                    Choose from Closet
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedImage && (
            <div className="card shadow-sm p-4">
              <div className="row g-4">
                <div className="col-md-6">
                  <h5 className="mb-3">Selected Image</h5>
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="img-fluid rounded"
                    style={{ width: "100%", maxHeight: "400px", objectFit: "cover" }}
                  />
                  <div className="mt-3">
                    <button className="btn btn-outline-secondary w-100" onClick={handleUndo}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-counterclockwise me-2" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/>
                        <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/>
                      </svg>
                      Choose Different Image
                    </button>
                  </div>
                </div>

                <div className="col-md-6">
                  <h5 className="mb-3">Customize Your Request</h5>
                  <textarea
                    className="form-control mb-3"
                    rows="8"
                    placeholder="Describe what you're looking for... (e.g., 'Find me a red jacket like this' or 'Show me similar casual outfits')"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    style={{ resize: "none" }}
                  />
                  
                  <button
                    className="btn btn-success btn-lg w-100"
                    disabled={
                      loading ||
                      !selectedImage ||
                      !selectedFile /* prevents Pinterest placeholder */
                    }
                    onClick={handleContinue}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-right-circle me-2" viewBox="0 0 16 16">
                          <path fillRule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
                        </svg>
                        Continue
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Virtual Closet Modal */}
      {showClosetModal && (
        <div 
          className="modal show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowClosetModal(false)}
        >
          <div 
            className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Choose from Virtual Closet</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowClosetModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {loadingCloset && (
                  <div className="text-center py-4">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                )}
                
                {!loadingCloset && closetImages.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-muted">Your virtual closet is empty. Generate some images first!</p>
                  </div>
                )}

                {!loadingCloset && closetImages.length > 0 && (
                  <div className="row g-3">
                    {closetImages.map((url, index) => (
                      <div key={index} className="col-6 col-md-4">
                        <div 
                          className="card shadow-sm cursor-pointer h-100"
                          onClick={() => handleClosetImageClick(url)}
                          style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <img
                            src={url}
                            alt={`Closet item ${index + 1}`}
                            className="card-img-top"
                            style={{ 
                              objectFit: 'cover', 
                              height: '200px',
                              width: '100%'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowClosetModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
