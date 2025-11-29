import React from "react";
import mailImage from "../assets/contact/mail.png"

export default function ContactPage() {
  return (
    <div className="container text-center my-5">
      {/* Page Title */}
      <h1 className="mb-4 fw-bold">Contact</h1>

      {/* Contact info section */}
      <div className="mb-5">
        <p className="mb-1">Danny: dochoamorales@horizon.csueastbay.edu</p>
        <p className="mb-1">Tim: torlov@horizon.csueastbay.edu</p>
        <p className="mb-1">Vinny: vicentechavezmend@gmail.com</p>
      </div>

      {/* Image placeholder section */}
      <div className="d-flex justify-content-center">
          <img
            src={mailImage}
            alt="Contact illustration"
            className="img-fluid rounded"
            />
      </div>
    </div>
  );
}
