import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaMoneyBill,
  FaCalculator,
  FaEnvelope,
  FaUserCircle,
  FaSignOutAlt,
  FaHandshake,
  FaBars,
  FaTimes,
} from 'react-icons/fa';
import './Sidebar.css';
import { UserContext } from '../contexts/UserContext';
import axios from 'axios';

const Sidebar = ({ isMobile, isSidebarOpen, toggleSidebar, onToggleSidebarWidth }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const location = useLocation();
  const { user, logoutUser } = useContext(UserContext);
  const prevLoanStatusRef = useRef(null);

  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      // Close sidebar on navigation in mobile
      toggleSidebar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    onToggleSidebarWidth(!isMinimized);
  };

  const handleLogout = () => {
    logoutUser();
  };

  // Poll the loan status endpoint and update unread message count when status changes.
  useEffect(() => {
    const pollLoanStatus = async () => {
      if (!user || !user.applicationId) return;
      try {
        const { data } = await axios.get(
          `http://10.132.229.140:8080/v1/api/loan-applications/status/${user.applicationId}`
        );
        // If status has changed, update the unread messages count.
        if (prevLoanStatusRef.current !== data.status) {
          prevLoanStatusRef.current = data.status;
          setUnreadMsgCount((prevCount) => prevCount + 1);
        }
      } catch (error) {
        console.error('Error polling loan status in Sidebar:', error);
      }
    };

    const intervalId = setInterval(pollLoanStatus, 10000); // Poll every 10 seconds.
    return () => clearInterval(intervalId);
  }, [user]);

  return (
    <>
      {isMobile && isSidebarOpen && (
        <div
          className="sb-overlay sb-active"
          onClick={toggleSidebar}
          aria-label="Close sidebar overlay"
        />
      )}

      <div
        className={`sb-sidebar ${isMinimized ? 'sb-minimized' : ''} ${
          isMobile && isSidebarOpen ? 'sb-mobile-visible' : ''
        }`}
      >
        <div className="sb-top-section">
          <div className="sb-app-logo">
            <Link to="/dashboard">
              <img src="/logowhite.png" alt="App Logo" className="sb-logo" />
            </Link>
          </div>

          {/* "X" button for closing sidebar on mobile */}
          {isMobile && isSidebarOpen && (
            <button
              className="sb-close-btn"
              onClick={toggleSidebar}
              aria-label="Close sidebar"
            >
              <FaTimes />
            </button>
          )}

          {/* Hamburger icon for minimizing sidebar on desktop */}
          {!isMobile && (
            <button
              className="sb-toggle-btn"
              onClick={toggleMinimize}
              aria-label={isMinimized ? 'Expand sidebar' : 'Minimize sidebar'}
            >
              <FaBars />
            </button>
          )}
        </div>

        <div className="sb-sidebar-separator"></div>

        <ul>
          <li>
            <Link to="/dashboard">
              <FaTachometerAlt className="sb-icon" />
              {!isMinimized && <span>Dashboard</span>}
            </Link>
          </li>
          <li>
            <Link to="/loans/all">
              <FaMoneyBill className="sb-icon" />
              {!isMinimized && <span>My Loans</span>}
            </Link>
          </li>
          {/* New menu option for Guarantor Loans */}
          <li>
            <Link to="/guarantor-loans">
              <FaHandshake className="sb-icon" />
              {!isMinimized && <span>Guarantor Loans</span>}
            </Link>
          </li>
          <li>
            <Link to="/calculator">
              <FaCalculator className="sb-icon" />
              {!isMinimized && <span>Loan Calculator</span>}
            </Link>
          </li>
          <li>
            <Link to="/messages">
              <FaEnvelope className="sb-icon" />
              {!isMinimized && <span>Messages</span>}
              {unreadMsgCount > 0 && (
                <span className="sb-unread-badge">{unreadMsgCount}</span>
              )}
            </Link>
          </li>
          <li>
            <Link to="/profile">
              <FaUserCircle className="sb-icon" />
              {!isMinimized && <span>Profile</span>}
            </Link>
          </li>
        </ul>

        <div className="sb-logout-icon">
          <button
            onClick={handleLogout}
            aria-label="Logout"
            className="sb-logout-button"
          >
            <FaSignOutAlt className="sb-icon-large" />
            {!isMinimized && <span></span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
