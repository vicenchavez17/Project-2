import React from "react";
import homeImage1 from "../assets/home/home1.png";
import homeImage2 from "../assets/home/home2.png";

export default function HomePage() {
  return (
    <div className="container text-center my-5">
      {/*<h1 className="mb-5">OutFit AI</h1>*/}

      {/* Row 1: Image left, text right */}
      <div className="row align-items-center mb-5">
        <div className="col-12 col-md-6 mb-4 mb-md-0">
          <img
            src={homeImage1}
            alt="Feature 1"
            className="img-fluid rounded border border-danger"
            style={{ maxHeight: "350px", objectFit: "cover" }}
          />
        </div>
        <div className="col-12 col-md-6 text-start text-md-start text-light">
          <h3>Welcome to OutFit AI</h3>
          <p>
            OutFit AI helps people find fresh clothing ideas using photos they already have. 
            Connect a photo and get curated item suggestions you can save or use for shopping.
          </p>
        </div>
      </div>

      {/* Row 2: Text left, image right */}
      <div className="row align-items-center mb-5 flex-md-row-reverse">
        <div className="col-12 col-md-6 mb-4 mb-md-0">
          <img
            src={homeImage2}
            alt="Feature 2"
            className="img-fluid rounded border border-danger"
            style={{ maxHeight: "350px", objectFit: "cover" }}
          />
        </div>
        <div className="col-12 col-md-6 text-start text-md-start text-light">
          <h3>AI Fashion Vision</h3>
          <p>
            After signing in with Google Photos or Pintrest, you can upload any photo of yourself and we'll find the perfect match for you.
          </p>
        </div>
      </div>
    </div>
  );
}
