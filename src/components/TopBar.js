// src/components/TopBar.js
import React, { useState, useEffect, useRef, useContext } from 'react';
import { FaBell, FaBars, FaTimes } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { UserContext } from '../contexts/UserContext';
import './TopBar.css';

const TopBar = ({ toggleSidebar, isSidebarOpen, isMobile }) => {
  const { user, sessionToken, logoutUser } = useContext(UserContext);
  const navigate = useNavigate();

  const [currentDateTime, setCurrentDateTime] = useState('');
  const [inviteCount, setInviteCount] = useState(0);
  const [invites, setInvites] = useState([]);
  const [isInvitationDropdownOpen, setIsInvitationDropdownOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState(null);

  const invitationRef = useRef(null);
  const profileRef = useRef(null);

  // Update current date/time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentDateTime(
        now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll the "invited" endpoint every 10 seconds
  useEffect(() => {
    const fetchInvites = async () => {
      if (!user?.staffId || !sessionToken) return;
      try {
        const { data } = await axios.get(
          `http://10.132.229.140:8080/v1/api/staff-loans/invited/${user.staffId}`,
          { headers: { Authorization: `Bearer ${sessionToken}` } }
        );
        if (data.message === 'No loan invited') {
          setInvites([]);
          setInviteCount(0);
        } else {
          setInvites([data]);
          setInviteCount(1);
        }
      } catch (err) {
        console.error('Error fetching loan invitations:', err);
      }
    };

    fetchInvites();
    const timer = setInterval(fetchInvites, 10000);
    return () => clearInterval(timer);
  }, [user, sessionToken]);

  // Toggle the invitation dropdown
  const toggleInvitationDropdown = () => {
    setIsInvitationDropdownOpen(open => !open);
  };

  // Close dropdowns/modals when clicking outside
  useEffect(() => {
    const handleClickOutside = e => {
      if (invitationRef.current && !invitationRef.current.contains(e.target)) {
        setIsInvitationDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsInviteModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open modal, clear invites, and fire green confetti
  const openInviteModal = invite => {
    setSelectedInvite(invite);
    setIsInviteModalOpen(true);
    setIsInvitationDropdownOpen(false);
    setInvites([]);
    setInviteCount(0);
    // green confetti celebration
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#83be07', '#028d18']
    });
  };

  const closeInviteModal = () => {
    setSelectedInvite(null);
    setIsInviteModalOpen(false);
  };

  // Navigate to application form at Step 2, clear invites
  const handleApply = loan => {
    setInvites([]);
    setInviteCount(0);
    navigate('/loan-application', {
      state: { selectedProduct: loan, startStep: 2 }
    });
  };

  // Handle logout
  const handleLogout = () => logoutUser();

  return (
    <div className="tb-topbar">
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
        <div className="tb-datetime">{currentDateTime}</div>

        {/* Invitation Bell */}
        <div
          className="tb-notification-icon"
          ref={invitationRef}
          onClick={toggleInvitationDropdown}
          aria-label="Loan Invitations"
          role="button"
          tabIndex={0}
          onKeyPress={e => e.key === 'Enter' && toggleInvitationDropdown()}
        >
          <FaBell />
          {inviteCount > 0 && (
            <span className="tb-notification-badge">{inviteCount}</span>
          )}
          {isInvitationDropdownOpen && (
            <div className="tb-notification-dropdown tb-active" role="menu">
              <ul>
                {invites.length > 0 ? (
                  invites.map(inv => (
                    <li key={inv.id}>
                      <p>
                        🎉 Dear {user.fullName}, you have been invited to apply for a new loan product with amount range{' '}
                        💰 {inv.minAmount} – {inv.maxAmount} 💰.
                      </p>
                      <div className="tb-modal-buttons">
                        <button
                          className="tb-view-button"
                          onClick={() => openInviteModal(inv)}
                        >
                          Details
                        </button>
                        <button
                          className="tb-apply-button bounce"
                          onClick={() => handleApply(inv)}
                        >
                          Apply Now 🚀
                        </button>
                      </div>
                    </li>
                  ))
                ) : (
                  <li>No new invitations</li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Profile */}
        <div
          className="tb-profile-section"
          ref={profileRef}
          aria-label="User profile"
          role="button"
          tabIndex={0}
        >
          <img src="/1.png" alt="Profile" className="tb-profile-pic" />
          <div className="tb-dropdown-menu">
            <ul>
              <li><Link to="/profile">Profile</Link></li>
              <li>
                <button onClick={handleLogout} className="sb-logout-button">
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Invitation Modal */}
      {isInviteModalOpen && selectedInvite && (
        <div className="tb-invite-modal-overlay">
          <div className="tb-invite-modal">
            <h2>🎊 Loan Invitation Details 🎊</h2>
            <p><strong>Code:</strong> {selectedInvite.loanProductCode}</p>
            <p><strong>Name:</strong> {selectedInvite.name}</p>
            <p><strong>Description:</strong> {selectedInvite.description}</p>
            <p>
              <strong>Amount Range:</strong> {selectedInvite.minAmount} – {selectedInvite.maxAmount}
            </p>
            <p><strong>Interest Rate:</strong> {selectedInvite.interestRate}%</p>

            <div className="tb-modal-buttons">
              <button
                className="tb-apply-button bounce"
                onClick={() => handleApply(selectedInvite)}
              >
                Apply Now 🚀
              </button>
              <button onClick={closeInviteModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopBar;
