// src/components/ResetPasswordOTP.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ResetPasswordOTP.css';

const ResetPasswordOTP = () => {
  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const navigate = useNavigate();
  const email = localStorage.getItem('forgotPasswordEmail');

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else {
      setCanResend(true);
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleOtpChange = (element, index) => {
    const value = element.value.replace(/[^0-9]/g, '');
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-input-${index + 1}`).focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (otp.some((digit) => digit === '')) {
      setErrorMessage('Please enter the complete OTP.');
      return;
    }

    const enteredOtp = otp.join('');

    try {
      setIsLoading(true);
      const response = await axios.post('http://10.132.229.140:8080/v1/api/verify-reset-otp', {
        username: email,
        otp: enteredOtp,
      });

      if (response.status === 200) {
        navigate('/reset-password');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      if (error.response) {
        if (error.response.status === 401) {
          setErrorMessage('OTP expired or not correct.');
        } else {
          setErrorMessage(error.response.data.message || 'Failed to verify OTP. Please try again.');
        }
      } else {
        setErrorMessage('An error occurred. Please check your network and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://10.132.229.140:8080/v1/api/forgot-password', {
        username: email,
      });

      if (response.status === 200) {
        setErrorMessage('A new OTP has been sent to your registered mobile number.');
        setOtp(new Array(6).fill(''));
        setResendTimer(60);
        setCanResend(false);
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      if (error.response) {
        setErrorMessage(error.response.data.message || 'Failed to resend OTP. Please try again later.');
      } else {
        setErrorMessage('An error occurred. Please check your network and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rpo-container">
      <div className="rpo-box">
        <h2 className="rpo-title">Verify OTP for Password Reset</h2>
        {errorMessage && <div className="rpo-error-message">{errorMessage}</div>}
        <form onSubmit={handleVerify}>
          <div className="rpo-otp-input-container">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-input-${index}`}
                type="text"
                maxLength="1"
                className={`rpo-otp-input ${errorMessage ? 'rpo-input-error' : ''}`}
                value={digit}
                onChange={(e) => handleOtpChange(e.target, index)}
                disabled={isLoading}
              />
            ))}
          </div>
          <button type="submit" className="rpo-verify-button" disabled={isLoading}>
            {isLoading ? 'Verifying OTP...' : 'Verify OTP'}
          </button>
        </form>
        {canResend ? (
          <button className="rpo-resend-button" onClick={handleResendOtp} disabled={isLoading}>
            {isLoading ? 'Resending OTP...' : 'Resend OTP'}
          </button>
        ) : (
          <p className="rpo-resend-timer">
            Resend OTP in {resendTimer} second{resendTimer !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordOTP;
