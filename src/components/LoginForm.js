import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import './LoginForm.css';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { loginUser } = useContext(UserContext);

  // "Remember" the username from a prior session
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData && userData.username) {
          setUsername(userData.username);
          setRememberMe(true);
        }
      } catch (err) {
        console.error('Error parsing stored user:', err);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);

    try {
      // Use the new staff login endpoint
      const response = await fetch('http://localhost:8080/v1/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        // Destructure the new response fields from the staff login endpoint
        const { staffId, fullName, role, sessionId, token, nationalId } = data;

        // Capture everything in the user context
        loginUser(
          {
            staffId,
            fullName,
            role,
            sessionId,
            nationalId,
            username,
          },
          token
        );

        // Navigate to the dashboard after a successful login
        navigate('/dashboard');
      } else if (response.status === 401) {
        setErrorMessage('Invalid username or password. Please try again.');
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('An error occurred:', error);
      setErrorMessage('An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="lf-container">
      <div className="lf-form-container">
        <img src="/logo192.png" alt="logo" className="lf-logo" />
        <h2 className="lf-title">ZB Staff Loans Portal</h2>
        {errorMessage && <div className="lf-error-message">{errorMessage}</div>}

        <form onSubmit={handleSubmit}>
          <div className="lf-input-container">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`lf-inputs ${errorMessage ? 'lf-input-error' : ''}`}
              disabled={isLoading}
              required
            />
          </div>

          <div className="lf-input-container lf-password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`lf-inputs ${errorMessage ? 'lf-input-error' : ''}`}
              disabled={isLoading}
              required
              // Disable copy, paste, cut, and context menu actions on the password field
              onPaste={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
            />
            <span
              onClick={togglePasswordVisibility}
              className="lf-password-eye-icon"
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

          <div className="lf-remember-me-container">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="lf-checkbox"
              id="rememberMe"
              disabled={isLoading}
            />
            <label htmlFor="rememberMe" className="lf-checkbox-labels">
              Remember Me
            </label>
          </div>

          <button type="submit" className="lf-button" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="lf-forgot-password-text">
          <Link to="/forgot-password" className="lf-link-text">
            Forgot Password?
          </Link>
        </p>
      </div>

      <div className="lf-footer">© 2024 ZB-Loans All rights reserved.</div>
      <div className="lf-help-button">
        <span></span>
      </div>
    </div>
  );
};

export default LoginForm;
