// src/components/ForgotPasswordForm.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ForgotPasswordForm.css';
import axios from 'axios';

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const navigate = useNavigate();

  // (by Ano) Handle form submission for sending OTP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setError('Email is required.');
      return;
    } else if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true); // Start loading

    try {
      const response = await axios.post('http://10.132.229.140:8080/v1/api/forgot-password', { username: email });

      if (response.status === 200) {
        // Successful OTP sent
        localStorage.setItem('forgotPasswordEmail', email); // Save email for OTP verification
        navigate('/reset-password-otp'); // Redirect to OTP verification immediately
      }
    } catch (err) {
      console.error('Error during forgot password:', err);
      
      if (err.response) {
        if (err.response.status === 404) {
          setError('Email/Username not found.');
        } else {
          // Handle other specific status codes if needed
          setError(err.response.data.message || 'Failed to send OTP. Please try again later.');
        }
      } else {
        // Handle network or other errors
        setError('An error occurred. Please check your network and try again.');
      }
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  return (
    <div className="fpf-forgot-password-container">
      <div className="fpf-forgot-password-form-container">
        <img src="/logo192.png" alt="logo" className="fpf-forgot-password-logo" />
        <h2 className="fpf-forgot-password-title">Forgot Your Password?</h2>
        <form onSubmit={handleSubmit} className="fpf-forgot-password-form">
          {error && (
            <p className="fpf-error-message">
              {error} <a href="/login" className="fpf-forgot-password-link">Back to Login</a>
            </p>
          )}
          <div className="fpf-input-container">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`fpf-input ${error ? 'fpf-input-error' : ''}`}
              disabled={isLoading} // Disable input while loading
              required
            />
          </div>
          <button type="submit" className="fpf-forgot-password-button" disabled={isLoading}>
            {isLoading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
        <div className="fpf-forgot-password-footer fpf-centered-footer">
          <a href="/login" className="fpf-back">Back to Login</a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
