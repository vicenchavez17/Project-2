import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function ProfilePage() {
  const { token } = useContext(AuthContext);

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    async function fetchImages() {
      setApiError("");

      try {
        const resp = await fetch("/images", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!resp.ok) {
          console.error("Failed to fetch images, status:", resp.status);
          setApiError("Failed to fetch saved images.");
          setImages([]);
          setLoading(false);
          return;
        }

        const data = await resp.json();

        if (!data || !Array.isArray(data.images)) {
          setImages([]);
        } else {
          const urls = data.images
            .map((i) => i.url)
            .filter(Boolean); // ensure no nulls
          setImages(urls);
        }
      } catch (err) {
        console.error("Error fetching images:", err);
        setApiError("Unable to connect to server.");
      }

      setLoading(false);
    }

    fetchImages();
  }, [token]);

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 className="page-title">Your Saved Images</h1>

      {loading && <p className="text-center">Loading...</p>}

      {apiError && (
        <div className="alert alert-danger text-center">{apiError}</div>
      )}

      {!loading && images.length === 0 && !apiError && (
        <p className="text-center">You have no saved images yet.</p>
      )}

      {/* Bootstrap responsive grid */}
      <div className="row">
        {images.map((url, index) => (
          <div key={index} className="col-6 col-md-4 col-lg-3 mb-4">
            <div className="card shadow-sm">
              <img
                src={url}
                alt={`Saved ${index}`}
                className="card-img-top"
                style={{ objectFit: "cover", height: "200px" }}
              />
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
