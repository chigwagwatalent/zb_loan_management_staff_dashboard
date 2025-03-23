import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { UserProvider, UserContext } from './contexts/UserContext';
import LoanApplicationForm from './components/LoanApplicationForm';
import LoginForm from './components/LoginForm';
import TwoFactorAuth from './components/TwoFactorAuth';
import ResetPasswordOTP from './components/ResetPasswordOTP';
import ResetPassword from './components/ResetPassword';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Footer from './components/Footer';
import AllLoans from './components/AllLoans';
import Preloader from './components/Preloader';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import IndividualProfile from './components/IndividualProfile';
import LoanChat from './components/LoanChat';
import LoanCalculator from './components/LoanCalculator';

// NEW: Director Confirmation Page (public)
import LoanConfirmationPage from './components/LoanConfirmationPage';

// NEW: Guarantor Loans Page
import GuarantorLoans from './components/GuarantorLoans';

import './App.css';
import { FaBars } from 'react-icons/fa';

// Global Error Popup component
function GlobalErrorPopup({ message, onClose }) {
  const navigate = useNavigate();

  if (!message) return null;
  return (
    <div className="global-error-popup-overlay">
      <div className="global-error-popup">
        <p>{message}</p>
        <a href="https://www.zb.co.zw/contact" target="_blank" rel="noopener noreferrer">
          <button>Contact Support</button>
        </a>
        <button
          onClick={() => {
            onClose();
            navigate('/login');
          }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

function App() {
  const location = useLocation();
  const { user, sessionToken, loginUser } = useContext(UserContext);

  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  // Global error state to display the error popup
  const [globalError, setGlobalError] = useState('');

  // Define auth pages (only the pages that remain)
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/2fa' ||
    location.pathname === '/reset-password-otp' ||
    location.pathname === '/reset-password' ||
    location.pathname.startsWith('/director-confirmation');

  // 1) Listen for window size changes
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2) Fake a “preloader” for 1 second on route change
  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timeout);
  }, [location]);

  // 3) Attempt to restore session from localStorage if context is empty
  useEffect(() => {
    const storedToken = localStorage.getItem('sessionToken');
    const storedUser = localStorage.getItem('user');
    if (storedToken && !sessionToken) {
      try {
        const userObj = storedUser ? JSON.parse(storedUser) : null;
        if (userObj) {
          loginUser(userObj, storedToken);
        }
      } catch (err) {
        console.warn('Error parsing user from localStorage:', err);
      }
    }
  }, [sessionToken, loginUser]);

  // 4) Setup a global axios interceptor for specific endpoints and generic errors.
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        // Capture errors for specific endpoints or any network/server error
        const url = error.config && error.config.url;
        if (
          (url &&
            (url.includes('/login') ||
             url.includes('/otp-status') ||
             url.includes('/create-account') ||
             url.includes('/verify-password-update') ||
             url.includes('/reset-password'))) ||
          !error.response ||
          (error.response && error.response.status >= 500)
        ) {
          setGlobalError('An error occurred. Please contact support.');
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleToggleSidebarWidth = (isMinimized) => {
    setIsSidebarMinimized(isMinimized);
  };

  const ProtectedRoute = ({ children }) => {
    if (!user || !sessionToken) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <>
      {isLoading && <Preloader />}

      {/* Global Error Popup */}
      <GlobalErrorPopup message={globalError} onClose={() => setGlobalError('')} />

      {!isAuthPage && (
        <TopBar
          toggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          isMobile={isMobile}
        />
      )}

      <div className={`app-container ${isSidebarMinimized ? 'sidebar-minimized' : ''}`}>
        {!isAuthPage && (
          <Sidebar
            isMobile={isMobile}
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={toggleSidebar}
            onToggleSidebarWidth={handleToggleSidebarWidth}
          />
        )}
        {isMobile && isSidebarOpen && !isAuthPage && (
          <div className="overlay active" onClick={toggleSidebar}></div>
        )}

        <div className={`main-content ${isMobile ? 'mobile-content' : ''}`}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/forgot-password" element={<ForgotPasswordForm />} />
            <Route path="/2fa" element={<TwoFactorAuth />} />
            <Route path="/reset-password-otp" element={<ResetPasswordOTP />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/director-confirmation/:loanId" element={<LoanConfirmationPage />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <IndividualProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loan-application"
              element={
                <ProtectedRoute>
                  <LoanApplicationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loan-application/:applicationId"
              element={
                <ProtectedRoute>
                  <LoanApplicationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loans/all"
              element={
                <ProtectedRoute>
                  <AllLoans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guarantor-loans"
              element={
                <ProtectedRoute>
                  <GuarantorLoans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <LoanChat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calculator"
              element={
                <ProtectedRoute>
                  <LoanCalculator />
                </ProtectedRoute>
              }
            />
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {!isMobile && !isAuthPage && <Footer />}
      </div>
    </>
  );
}

export default function WrappedApp() {
  return (
    <Router>
      <UserProvider>
        <App />
      </UserProvider>
    </Router>
  );
}
