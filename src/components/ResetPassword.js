// src/components/ResetPassword.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './ResetPassword.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isResetComplete, setIsResetComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!password || !confirmPassword) {
      setErrorMessage('Both fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    const username = localStorage.getItem('forgotPasswordEmail');

    if (!username) {
      setErrorMessage('Email is missing. Please start the password reset process again.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:8080/v1/api/set-new-password', {
        username,
        newPassword: password,
      });

      if (response.status === 200) {
        setSuccessMessage('Password has been changed successfully!');
        setIsResetComplete(true);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      if (error.response) {
        if (error.response.status === 401) {
          setErrorMessage('Password change failed. Please try again.');
        } else {
          setErrorMessage(
            error.response.data.message || 'Failed to reset password. Please try again.'
          );
        }
      } else {
        setErrorMessage('An error occurred. Please check your network and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  return (
    <div className="rp-container">
      <div className="rp-box">
        {!isResetComplete ? (
          <>
            <h2 className="rp-title">Reset Your Password</h2>
            {errorMessage && <p className="rp-error-message">{errorMessage}</p>}
            {successMessage && <p className="rp-success-message">{successMessage}</p>}

            <form onSubmit={handleResetPassword} className="rp-form">
              <div className="rp-password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`rp-input ${errorMessage ? 'rp-input-error' : ''}`}
                  disabled={isLoading}
                  required
                />
                <span
                  onClick={togglePasswordVisibility}
                  className="rp-password-eye-icon"
                  aria-label="Toggle Password Visibility"
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') togglePasswordVisibility();
                  }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              <div className="rp-password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`rp-input ${errorMessage ? 'rp-input-error' : ''}`}
                  disabled={isLoading}
                  required
                />
                <span
                  onClick={toggleConfirmPasswordVisibility}
                  className="rp-password-eye-icon"
                  aria-label="Toggle Confirm Password Visibility"
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') toggleConfirmPasswordVisibility();
                  }}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              <button type="submit" className="rp-reset-password-button" disabled={isLoading}>
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>

            {errorMessage && !isResetComplete && (
              <p className="rp-back-to-login-text">
                <a href="/login" className="rp-back-to-login-link">Back to Log In</a>
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="rp-success-title">Password Reset Successful</h2>
            <p className="rp-success-message">
              Your password has been changed successfully. You can now log in with your new
              password.
            </p>
            <p className="rp-back-to-login-text">
              <a href="/login" className="rp-back-to-login-link">Go to Log In</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
