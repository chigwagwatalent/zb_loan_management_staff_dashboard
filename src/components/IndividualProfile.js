import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import './IndividualProfile.css';
import { UserContext } from '../contexts/UserContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

function IndividualProfile() {
  const { user, sessionToken } = useContext(UserContext);
  const [zbAccounts, setZbAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for Settings Accordion
  const [activeSettings, setActiveSettings] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // State for Change Password Popup
  const [showPasswordChangePopup, setShowPasswordChangePopup] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verifyPasswordError, setVerifyPasswordError] = useState('');

  // Fetch ZB accounts using the user's nationalId
  useEffect(() => {
    const fetchZbAccounts = async () => {
      if (!user?.nationalId) {
        setLoading(false);
        return;
      }
      try {
        const response = await axios.post(
          'http://localhost:8080/v1/api/account-lookup',
          { nationalId: user.nationalId },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
          }
        );
        // Assume response.data is an object where keys are currencies and values are account numbers.
        const entries = Object.entries(response.data || {});
        setZbAccounts(entries);
      } catch (err) {
        console.error("Error fetching ZB accounts:", err);
        setError("Failed to fetch ZB accounts.");
      } finally {
        setLoading(false);
      }
    };

    fetchZbAccounts();
  }, [user, sessionToken]);

  // Handle Two Factor Authentication toggle
  const handleTwoFactorToggle = async () => {
    if (!user?.clientId) return;
    try {
      if (!twoFactorEnabled) {
        const response = await axios.put(
          `http://localhost:8080/v1/api/otp-status/${user.clientId}`,
          { otpStatus: true },
          { headers: { Authorization: `Bearer ${sessionToken}` } }
        );
        if (response.status === 200) {
          setTwoFactorEnabled(true);
        }
      } else {
        const response = await axios.put(
          `http://localhost:8080/v1/api/otp-status/${user.clientId}`,
          { otpStatus: false },
          { headers: { Authorization: `Bearer ${sessionToken}` } }
        );
        if (response.status === 200) {
          setTwoFactorEnabled(false);
        }
      }
    } catch (err) {
      console.error("Error toggling Two Factor Authentication:", err);
    }
  };

  // Handle Change Password popup open
  const handlePasswordChange = () => {
    setShowPasswordChangePopup(true);
  };

  // Close Change Password popup and reset form
  const closePasswordChangePopup = () => {
    setShowPasswordChangePopup(false);
    setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setVerifyPasswordError('');
  };

  const handlePasswordChangeInput = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const toggleOldPasswordVisibility = () => {
    setShowOldPassword(prev => !prev);
  };

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(prev => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setVerifyPasswordError('New Password and Confirm Password do not match.');
      return;
    }
    try {
      const response = await axios.put(
        `http://localhost:8080/v1/api/verify-password-update/${user.clientId}`,
        { oldPassword: passwordData.oldPassword, newPassword: passwordData.newPassword },
        { headers: { Authorization: `Bearer ${sessionToken}` } }
      );
      if (response.status === 200) {
        closePasswordChangePopup();
        // Optionally, display a success message here.
      } else {
        setVerifyPasswordError('Password update failed. Please try again.');
      }
    } catch (err) {
      console.error("Error updating password:", err);
      setVerifyPasswordError('Password update failed. Please try again.');
    }
  };

  return (
    <div className="ip-profile-container">
      <div className="ip-profile-form-container">
        <h2 className="ip-page-titles">My Profile</h2>
        <div className="profile-card">
          <p>
            <strong>Full Name:</strong> {user?.fullName || "N/A"}
          </p>
          <p>
            <strong>Role:</strong> {user?.role || "N/A"}
          </p>
          <p>
            <strong>National ID:</strong> {user?.nationalId || "N/A"}
          </p>
        </div>
        <div className="ip-fetched-zb-accounts">
          <h3>ZB Accounts</h3>
          {loading ? (
            <p>Loading ZB Accounts...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : zbAccounts.length > 0 ? (
            <ul>
              {zbAccounts.map(([currency, accountNumber], index) => (
                <li key={index}>
                  <strong>{currency}:</strong> {accountNumber}
                </li>
              ))}
            </ul>
          ) : (
            <p>No ZB Accounts found.</p>
          )}
        </div>
        {/* Settings Accordion */}
        <div className="ip-accordion-item">
          <div
            className="ip-accordion-header"
            onClick={() => setActiveSettings(!activeSettings)}
          >
            <h3>Settings</h3>
            <span className="ip-accordion-toggle">
              {activeSettings ? '-' : '+'}
            </span>
          </div>
          {activeSettings && (
            <div className="ip-accordion-content">
              <div className="ip-settings-item">
                <label className="ip-switch">
                  <input
                    type="checkbox"
                    checked={twoFactorEnabled}
                    onChange={handleTwoFactorToggle}
                  />
                  <span className="ip-slider round"></span>
                </label>
                <div className="ip-settings-description">
                  <h4>Two Factor Authentication</h4>
                  <p>
                    Enhance your account security by enabling Two Factor Authentication.
                  </p>
                </div>
              </div>
              <div className="ip-settings-item">
                <button
                  type="button"
                  className="ip-change-password-button"
                  onClick={handlePasswordChange}
                >
                  Change Password
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Popup */}
      {showPasswordChangePopup && (
        <div className="ip-popup-overlay">
          <div className="ip-popup" role="dialog" aria-modal="true">
            <h2>Change Password</h2>
            <form onSubmit={handlePasswordSubmit}>
              <div className="ip-form-group">
                <label>Old Password:</label>
                <div className="ip-password-input">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    name="oldPassword"
                    value={passwordData.oldPassword}
                    onChange={handlePasswordChangeInput}
                    required
                  />
                  <span
                    onClick={toggleOldPasswordVisibility}
                    className="ip-toggle-visibility"
                  >
                    {showOldPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>
              <div className="ip-form-group">
                <label>New Password:</label>
                <div className="ip-password-input">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChangeInput}
                    required
                  />
                  <span
                    onClick={toggleNewPasswordVisibility}
                    className="ip-toggle-visibility"
                  >
                    {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>
              <div className="ip-form-group">
                <label>Confirm Password:</label>
                <div className="ip-password-input">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChangeInput}
                    required
                  />
                  <span
                    onClick={toggleConfirmPasswordVisibility}
                    className="ip-toggle-visibility"
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>
              {verifyPasswordError && (
                <div className="error-message">{verifyPasswordError}</div>
              )}
              <div className="ip-popup-buttons">
                <button type="submit" className="ip-apply-button">
                  Change Password
                </button>
                <button
                  type="button"
                  className="ip-close-button"
                  onClick={closePasswordChangePopup}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default IndividualProfile;
