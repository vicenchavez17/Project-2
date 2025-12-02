import React from "react";
import danny from "../assets/about/danny.png";
import tim from "../assets/about/tim.png";
import vinny from "../assets/about/vinny.png";

export default function AboutPage() {
  return (
    <div className="page-wrapper">
      <div className="container text-center">
        <h1 className="page-title">About the Creators</h1>

      <div className="row justify-content-center">
        <div className="col-12 col-md-4 mb-4">
          <div className="card bg-dark text-light border border-danger p-3">
            <img
              src={danny}
              alt="Creator 1"
              className="card-img-top rounded"
              style={{ objectFit: "cover", height: "250px" }}
            />
            <div className="card-body">
              <h5 className="card-title">
                Daniel
              </h5>
              <p className="card-text">
                  Daniel is our computer vision specialist who developed the core image analysis solutions. Using Vision and Gemini APIs, he created the intelligent systems that power our selfie analysis features.              </p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4 mb-4">
          <div className="card bg-dark text-light border border-danger p-3">
            <img
              src={tim}
              alt="Creator 2"
              className="card-img-top rounded"
              style={{ objectFit: "cover", height: "250px" }}
            />
            <div className="card-body">
              <h5 className="card-title">
                Tim
              </h5>
              <p className="card-text">
                  Tim handled all front-end development, crafting an intuitive user interface that makes our platform easy to use. He also integrated social media functionality to enhance user engagement and sharing capabilities.
              </p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4 mb-4">
          <div className="card bg-dark text-light border border-danger p-3">
            <img
              src={vinny}
              alt="Creator 3"
              className="card-img-top rounded"
              style={{ objectFit: "cover", height: "250px" }}
            />
            <div className="card-body">
              <h5 className="card-title">
                Vincente
              </h5>
              <p className="card-text">
                  Vicente built our secure backend infrastructure, implementing robust user authentication and storage solutions. His work ensures that user data remains protected while maintaining seamless access to our platform.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
