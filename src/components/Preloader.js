// src/components/Preloader.js
import React from 'react';
import './Preloader.css';

const Preloader = () => {
  return (
    <div className="preloader-overlay">
      <div className="preloader-content">
        <img src="/logo192.png" alt="Loading..." className="preloader-logo" /> {/* Updated path */}
      </div>
    </div>
  );
};

export default Preloader;
