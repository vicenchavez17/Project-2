import React from "react";
import homeImage1 from "../assets/home/homePage1.png";
import homeImage2 from "../assets/home/homePage3.png";
import homeImage3 from "../assets/home/homePage2.png";

export default function HomePage() {
  return (
    <div className="page-wrapper">
      <div className="container text-center">
        {/*<h1 className="page-title">OutFit AI</h1>*/}

      {/* Row 1: Image left, text right */}
      <div className="row align-items-center mb-5 py-4">
        <div className="col-12 col-md-6 mb-3 mb-md-0 pe-md-4">
          <img
            src={homeImage1}
            alt="Feature 1"
            className="img-fluid rounded border border-danger"
            style={{ maxHeight: "350px", height: "350px", width: "100%", objectFit: "cover" }}
          />
        </div>
        <div className="col-12 col-md-6 text-start text-md-start text-light ps-md-4">
          <h3>Welcome to OutFit AI</h3>
          <div className="accent-line"></div>
          <p>
            OutFit AI helps people find fresh clothing ideas using photos they already have. 
            Connect a photo and get curated item suggestions you can save or use for shopping.
          </p>
        </div>
      </div>

      {/* Row 2: Text left, image right */}
      <div className="row align-items-center mb-5 flex-md-row-reverse py-4">
        <div className="col-12 col-md-6 mb-3 mb-md-0 ps-md-4">
          <img
            src={homeImage2}
            alt="Feature 2"
            className="img-fluid rounded border border-danger"
            style={{ maxHeight: "350px", height: "350px", width: "100%", objectFit: "cover" }}
          />
        </div>
        <div className="col-12 col-md-6 text-start text-md-start text-light pe-md-4">
          <h3>AI Fashion Vision</h3>
          <div className="accent-line"></div>
          <p>
              Sign in with X/Twitter to upload any selfies and we'll recommend you something from that selfie.
          </p>
        </div>
      </div>

      {/* Row 3: Image left, text right */}
      <div className="row align-items-center py-4">
        <div className="col-12 col-md-6 mb-3 mb-md-0 pe-md-4">
          <img
            src={homeImage3}
            className="rounded border border-danger d-flex align-items-center justify-content-center"
            style={{ 
              height: "350px",
              width: "100%",
              backgroundColor: "#2a2a3e"
            }}
          />
        </div>
        <div className="col-12 col-md-6 text-start text-md-start text-light ps-md-4">
          <h3>Your Virtual Closet</h3>
          <div className="accent-line"></div>
          <p>
            All your generated outfit recommendations are automatically saved to your virtual closet. 
            Access your collection anytime to revisit your favorite looks and compare different styles 
            Your fashion inspiration is always just a click away!
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
