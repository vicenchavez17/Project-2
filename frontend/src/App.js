import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from './pages/HomePage';
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import SignInPage from "./pages/SignInPage";
import SelectImagePage from "./pages/SelectImagePage";
import ResultPage from "./pages/ResultPage";
import Navbar from "./components/Navbar";

import 'bootstrap/dist/css/bootstrap.css';
import './theme/theme.css';
import './App.css';

function App() {

  return (
    <BrowserRouter>

      <div className="container mt-4 mb-5">
        <main className="flex-grow-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/selectimage" element={<SelectImagePage />} />
            <Route path="/result" element={<ResultPage />} />
          </Routes>
        </main>
      </div>

      <Navbar />
      
    </BrowserRouter>
  );
}

export default App;
