import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from 'react-router-dom';
import { 
  trackGenerationStart, 
  trackGenerationComplete, 
  trackTwitterConnect,
  trackError 
} from '../utils/analytics';

export default function SelectImagePage() {
  const { user, token } = useContext(AuthContext);

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null); // For preview URL
  const [inputText, setInputText] = useState("");
  const [twitterImages, setTwitterImages] = useState([]);
  const [twitterLoading, setTwitterLoading] = useState(false);
  const [twitterError, setTwitterError] = useState("");
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const [twitterAccess, setTwitterAccess] = useState(null);
  const [twitterUserId, setTwitterUserId] = useState(null);

  //
  // Listen for messages from the popup window
  //
  useEffect(() => {
    const handleMessage = (event) => {
      // Security: verify the message is from your domain
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "TWITTER_AUTH_SUCCESS") {
        const { accessToken, userId } = event.data;
        console.log("✅ Twitter auth successful via popup!");
        
        setTwitterAccess(accessToken);
        setTwitterUserId(userId);
        
        // Fetch images immediately
        fetchTwitterImages(accessToken, userId);
      } else if (event.data.type === "TWITTER_AUTH_ERROR") {
        setTwitterError(event.data.error || "Twitter authentication failed");
      }
    };

    window.addEventListener("message", handleMessage);
    
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  //
  // STEP 2 – Open Twitter auth in popup
  //
  const startTwitterLogin = () => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      "/twitter/auth",
      "Twitter Login",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );

    if (!popup) {
      setTwitterError("Please allow popups for this site to connect Twitter");
    } else {
      // Track Twitter connect attempt
      const userId = user?.email || 'anonymous';
      trackTwitterConnect(userId);
    }
  };

  //
  // STEP 3 – Fetch user's media after auth
  //
  const fetchTwitterImages = async (accessToken, userId) => {
    const token = accessToken || twitterAccess;
    const id = userId || twitterUserId;

    if (!token || !id) {
      setTwitterError("Missing Twitter credentials");
      return;
    }

    setTwitterLoading(true);
    setTwitterError("");

    try {
      const res = await fetch(
        `/twitter/media?accessToken=${token}&twitterUserId=${id}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Unable to fetch media");
      }

      const data = await res.json();
      
      if (!data.images || data.images.length === 0) {
        setTwitterError("No images found in your recent tweets. Try posting some images first!");
        setTwitterImages([]);
      } else {
        console.log(`Found ${data.images.length} images from Twitter`);
        const imageObjects = data.images.map((url, index) => ({
          id: `twitter-${index}`,
          url: url
        }));
        setTwitterImages(imageObjects);
      }
    } catch (err) {
      console.error("Twitter fetch error:", err);
      setTwitterError(err.message || "Failed to load Twitter images.");
    } finally {
      setTwitterLoading(false);
    }
  };

  //
  // STEP 4 – User selects a Twitter image
  //
  const handleTwitterImageSelect = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], "twitter-image.jpg", { type: blob.type });
      
      setSelectedFile(file);
      setSelectedImage(url); // Store original URL for preview
      setTwitterImages([]);
    } catch (err) {
      console.error("Error loading Twitter image:", err);
      setTwitterError("Failed to load selected image");
    }
  };

  //
  // STEP 5 – Undo selection
  //
  const undo = () => {
    setSelectedFile(null);
  };

  //
  // Handle local file upload
  //
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setTwitterImages([]);
    }
  };

  //
  // Continue to next page
  //
  const handleContinue = async () => {
    if (!selectedFile) {
      setApiError("Please select an image first.");
      return;
    }
    
    const startTime = Date.now();
    setLoading(true);
    setApiError("");
    
    // Track generation start
    const userId = user?.email || 'anonymous';
    const imageSource = selectedImage?.includes('twimg.com') ? 'twitter' : 'upload';
    trackGenerationStart(userId, imageSource);
    
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
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Server returned an error.");
      }
      
      const data = await response.json();
      
      // Track successful generation
      const duration = Date.now() - startTime;
      trackGenerationComplete(userId, duration, true);

      navigate("/result", {
        state: {
          image: URL.createObjectURL(selectedFile),              // user uploaded preview
          prompt: inputText,                 // text user typed
          shoppingLinks: data.shoppingLinks || [],  // shopping links from API
          results: {
            text: "Your generated image result:",
            images: ["data:image/png;base64," + data.image], // base64 output
          },
          generationTime: duration, // pass generation time to result page
        },
      });
    } catch (err) {
      console.error("API error:", err);
      setApiError(err.message || "Something went wrong.");
      
      // Track failed generation
      const duration = Date.now() - startTime;
      trackGenerationComplete(userId, duration, false);
      trackError('generation_error', err.message, userId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container my-4">
      {/* -------------------- Upload or Twitter Buttons -------------------- */}
      {!selectedFile && twitterImages.length === 0 && (
        <div className="mb-4 text-center">
          <h3>Select an Image</h3>

          <div className="d-flex justify-content-center gap-3 mt-4">
            <label className="btn btn-primary">
              Upload From Device
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleFileChange}
              />
            </label>

            <button className="btn btn-info" onClick={startTwitterLogin}>
              <i className="bi bi-twitter me-2"></i>
              Import From Twitter
            </button>
          </div>

          <p className="text-muted mt-3 small">
            Twitter Free tier: 100 reads/month
          </p>
        </div>
      )}

      {/* -------------------- TWITTER LOADING STATE -------------------- */}
      {twitterLoading && (
        <div className="text-center mt-4">
          <div className="spinner-border text-info" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading your Twitter images…</p>
        </div>
      )}

      {/* -------------------- TWITTER ERROR -------------------- */}
      {twitterError && (
        <div className="alert alert-danger text-center mt-4">
          {twitterError}
          <button
            className="btn btn-sm btn-outline-danger ms-3"
            onClick={() => setTwitterError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* -------------------- TWITTER MEDIA GALLERY -------------------- */}
      {twitterImages.length > 0 && !selectedFile && (
        <div className="mt-4">
          <h4 className="text-center mb-3">
            Your Twitter Media ({twitterImages.length} images)
          </h4>

          <div className="row">
            {twitterImages.map((img) => (
              <div className="col-6 col-md-4 col-lg-3 mb-3" key={img.id}>
                <img
                  src={img.url}
                  alt="Twitter image"
                  className="img-fluid rounded border"
                  style={{ 
                    cursor: "pointer",
                    objectFit: "cover",
                    aspectRatio: "1/1"
                  }}
                  onClick={() => handleTwitterImageSelect(img.url)}
                />
              </div>
            ))}
          </div>

          <div className="text-center mt-3">
            <button
              className="btn btn-secondary"
              onClick={() => setTwitterImages([])}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* -------------------- SELECTED IMAGE PREVIEW -------------------- */}
      {selectedFile && (
        <div className="text-center mt-4">
          <h4>Selected Image</h4>
          <img
            src={URL.createObjectURL(selectedFile)}
            alt="Selected"
            className="img-fluid rounded mt-3 border"
            style={{ maxHeight: "400px" }}
          />

          <div className="mt-3">
            <button className="btn btn-secondary" onClick={undo}>
              Choose Different Image
            </button>
          </div>
        </div>
      )}

      {/* -------------------- INPUT TEXT + CONTINUE BUTTON -------------------- */}
      {selectedFile && (
        <div className="mt-4">
          <label className="form-label">
            What apparel are you looking for?
          </label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="e.g., 'red shirt', 'blue jeans', 'baseball cap'..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          ></textarea>

          <button
            className="btn btn-success w-100 mt-3"
            disabled={!selectedFile || loading}
            onClick={handleContinue}
          >
          {loading ? (
            <>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Processing...
            </>
          ): (
            <>
            Continue
            </>
          )}
          </button>
        </div>
      )}
    </div>
  );
}