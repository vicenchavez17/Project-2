import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import HomePage from './pages/HomePage';
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import SignInPage from "./pages/SignInPage";
import SelectImagePage from "./pages/SelectImagePage";
import ResultPage from "./pages/ResultPage";
import ProfilePage from "./pages/ProfilePage";
import Navbar from "./components/Navbar";
import { trackPageView } from './utils/analytics';

import 'bootstrap/dist/css/bootstrap.css';
import './theme/theme.css';
import './App.css';

// Component to track page views
function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location]);

  return null;
}

function App() {

  return (
    <BrowserRouter>
      {/* Decorative corner accents */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '2px',
        height: '40vh',
        background: 'linear-gradient(180deg, #fe5163 0%, transparent 100%)',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '2px',
        height: '40vh',
        background: 'linear-gradient(180deg, #fe5163 0%, transparent 100%)',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'fixed',
        bottom: '60px',
        left: 0,
        width: '2px',
        height: '30vh',
        background: 'linear-gradient(0deg, #fe5163 0%, transparent 100%)',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'fixed',
        bottom: '60px',
        right: 0,
        width: '2px',
        height: '30vh',
        background: 'linear-gradient(0deg, #fe5163 0%, transparent 100%)',
        zIndex: 0
      }}></div>

      <PageViewTracker />
      
      <div className="container mt-4 mb-5">
        <main className="flex-grow-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/selectimage" element={<SelectImagePage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
      </div>

      <Navbar />
      
    </BrowserRouter>
  );
}

export default App;
