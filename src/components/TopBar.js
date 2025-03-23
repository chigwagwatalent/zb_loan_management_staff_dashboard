// src/components/TopBar.js
import React, { useState, useEffect, useRef, useContext } from 'react';
import { FaBell, FaBars, FaTimes } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserContext } from '../contexts/UserContext';
import './TopBar.css';

const TopBar = ({ toggleSidebar, isSidebarOpen, isMobile }) => {
  const { user, logoutUser } = useContext(UserContext);
  const navigate = useNavigate();

  const [currentDateTime, setCurrentDateTime] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const topbarRef = useRef(null);

  // Update current date/time every second.
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentDateTime(
        now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll the guarantor loans endpoint every 10 seconds to fetch loans with null "guarantorDecision".
  useEffect(() => {
    const fetchGuarantorLoans = async () => {
      if (!user || !user.staffId) return;
      try {
        const response = await axios.get(
          `http://localhost:8080/v1/api/staff-loans/guarantor-loans/${user.staffId}`
        );
        // Filter loans that require a decision.
        const unattendedLoans = response.data.filter(
          (loan) => loan.guarantorDecision === null
        );
        setNotifications(unattendedLoans);
        setNotificationCount(unattendedLoans.length);
      } catch (error) {
        console.error('Error fetching guarantor loans:', error);
      }
    };

    fetchGuarantorLoans();
    const intervalId = setInterval(fetchGuarantorLoans, 10000);
    return () => clearInterval(intervalId);
  }, [user]);

  // Toggle the notification dropdown.
  const toggleNotificationDropdown = () => {
    setIsNotificationDropdownOpen((prev) => !prev);
  };

  // Toggle the profile dropdown.
  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen((prev) => !prev);
  };

  // Close dropdowns when clicking outside.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsNotificationDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigate to the Guarantor Loans page when the notification button is clicked.
  const openGuarantorLoans = () => {
    navigate('/guarantor-loans');
  };

  // Handle logout.
  const handleLogout = () => {
    logoutUser();
  };

  return (
    <div className="tb-topbar" ref={topbarRef}>
      <div className="tb-left-section">
        {isMobile && (
          <button
            className="tb-toggle-btn"
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {isSidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
        )}
      </div>
      <div className="tb-right-section">
        <div className="tb-datetime" aria-label="Current date and time">
          {currentDateTime}
        </div>
        <div
          className="tb-notification-icon"
          ref={notificationRef}
          onClick={toggleNotificationDropdown}
          aria-label="Notifications"
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter') toggleNotificationDropdown();
          }}
        >
          <FaBell />
          {notificationCount > 0 && (
            <span className="tb-notification-badge">{notificationCount}</span>
          )}
          {isNotificationDropdownOpen && (
            <div className="tb-notification-dropdown tb-active" role="menu">
              <ul>
                {notifications.length > 0 ? (
                  notifications.map((loan) => (
                    <li key={loan.loanId}>
                      <span>
                        Guarantor decision pending for Loan #{loan.loanId} –{' '}
                        {loan.loanProductName}
                      </span>
                      <button
                        className="tb-view-button"
                        onClick={openGuarantorLoans}
                      >
                        Open Guarantor Loans
                      </button>
                    </li>
                  ))
                ) : (
                  <li>No new notifications</li>
                )}
              </ul>
            </div>
          )}
        </div>
        <div
          className="tb-profile-section"
          ref={profileRef}
          onClick={toggleProfileDropdown}
          aria-label="User profile"
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter') toggleProfileDropdown();
          }}
        >
          <img src="/1.png" alt="Profile" className="tb-profile-pic" />
          {isProfileDropdownOpen && (
            <div className="tb-dropdown-menu tb-active" role="menu">
              <ul>
                <div className='sb-logout-button'> 
                <li>
                  <Link to="/profile" >Profile</Link>
                </li>
                </div>
                <li>
                  <button onClick={handleLogout} className="sb-logout-button">
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
