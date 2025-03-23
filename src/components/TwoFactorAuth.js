// src/components/TwoFactorAuth.js

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './TwoFactorAuth.css';
import { UserContext } from '../contexts/UserContext';

const TwoFactorAuth = () => {
  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCounter, setResendCounter] = useState(30);

  const navigate = useNavigate();
  const { loginUser, user, sessionToken } = useContext(UserContext);

  // Handle digit changes in the 6 OTP fields
  const handleOtpChange = (element, index) => {
    // Only digits
    const value = element.value.replace(/[^0-9]/g, '');
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move focus right if a digit is entered
    if (value && index < 5) {
      document.getElementById(`tfa-otp-input-${index + 1}`).focus();
    }
    // Move focus left if digit is removed
    if (!value && index > 0) {
      document.getElementById(`tfa-otp-input-${index - 1}`).focus();
    }
  };

  const handleVerify = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    // Check if all digits are entered
    if (otp.some((digit) => digit === '')) {
      setErrorMessage('Please enter the complete OTP.');
      return;
    }

    // Grab the username from context
    const username = user?.username;
    if (!username) {
      setErrorMessage('Username is missing. Please log in again.');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:8080/v1/api/verify-otp',
        { username, otp: otp.join('') },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.status === 200) {
        // Expected shape of response:
        // { message, sessionToken, clientId, nationalId, fullName }
        const data = response.data;
        const { sessionToken: newToken, clientId } = data;

        // Put everything in context
        loginUser(data, newToken);

        // We no longer need the username once 2FA is successful
        // No need to remove from localStorage as it's managed by context

        // If clientId is now provided, user is fully verified => go to Dashboard
        if (clientId) {
          navigate('/dashboard');
        } else {
          // If for some reason the server doesn't return clientId
          setErrorMessage('No clientId returned. Please contact support.');
        }
      } else {
        // If status not 200, show an error
        setErrorMessage(
          response.data?.message || 'Failed to verify OTP. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);

      if (error.response) {
        setErrorMessage(
          `Error ${error.response.status}: ${
            error.response.data.message || 'Please try again.'
          }`
        );
      } else if (error.request) {
        setErrorMessage(
          'No response from the server. Please check your network connection.'
        );
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    }
  };

  const handleResendOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    const username = user?.username;
    if (!username) {
      setErrorMessage('Username is missing. Please log in again.');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:8080/v1/api/resend-otp',
        { username },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data?.message === 'OTP resent to your mobile phone.') {
        setSuccessMessage('OTP has been resent to your mobile phone.');
        setResendCounter(60);
      } else {
        setErrorMessage(
          response.data?.message ||
            'Failed to resend OTP. Please try again later.'
        );
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      if (error.response) {
        setErrorMessage(
          `Error ${error.response.status}: ${
            error.response.data.message || 'Please try again.'
          }`
        );
      } else if (error.request) {
        setErrorMessage(
          'No response from the server. Please check your network connection.'
        );
      } else {
        setErrorMessage('An error occurred. Please try again.');
      }
    }
  };

  // Countdown timer for resend
  useEffect(() => {
    if (resendCounter > 0) {
      const timer = setTimeout(() => setResendCounter(resendCounter - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCounter]);

  return (
    <div className="tfa-container">
      <div className="tfa-box">
        <h2 className="tfa-title">Enter OTP</h2>

        {errorMessage && <div className="tfa-error-message">{errorMessage}</div>}
        {successMessage && <div className="tfa-success-message">{successMessage}</div>}

        <div className="tfa-otp-input-container">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`tfa-otp-input-${index}`}
              type="text"
              maxLength="1"
              className="tfa-otp-input"
              value={digit}
              onChange={(e) => handleOtpChange(e.target, index)}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>

        <button className="tfa-verify-button" onClick={handleVerify}>
          Verify
        </button>

        <div className="tfa-resend-container">
          {resendCounter > 0 ? (
            <span className="tfa-resend-timer">
              Resend OTP in {resendCounter}s
            </span>
          ) : (
            <button className="tfa-resend-button" onClick={handleResendOtp}>
              Resend OTP
            </button>
          )}
        </div>
      </div>

      <div
        className="tfa-help-button"
        onClick={() => alert('Help is on the way!')}
      >
        <span>?</span>
      </div>
    </div>
  );
};

export default TwoFactorAuth;
