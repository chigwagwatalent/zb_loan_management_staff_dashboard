import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas';
import { UserContext } from '../contexts/UserContext';
import {
  FaPlusCircle,
  FaQuestionCircle,
  FaTimes as FaTimesIcon,
  FaPencilAlt,
  FaCheck,
  FaTimes as FaTimesIconAlias
} from 'react-icons/fa';
import './GuarantorLoans.css';

const GuarantorLoans = () => {
  const { user, sessionToken } = useContext(UserContext);
  const staffId = user?.staffId;

  const [guarantorLoans, setGuarantorLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state for signature acceptance and action confirmation
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  // State for viewing loan details
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loanDetails, setLoanDetails] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);

  // State to track if user has scrolled through details
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const detailsContainerRef = useRef(null);
  const sigCanvasRef = useRef(null);
  const modalRef = useRef(null);

  // Fetch loans where the staff member is guarantor
  useEffect(() => {
    if (!staffId || !sessionToken) return;
    const fetchGuarantorLoans = async () => {
      try {
        const response = await fetch(`http://localhost:8080/v1/api/staff-loans/guarantor-loans/${staffId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch guarantor loans");
        }
        const data = await response.json();
        setGuarantorLoans(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchGuarantorLoans();
  }, [staffId, sessionToken]);

  // When the user clicks the "View" button, fetch the detailed loan info
  const handleViewClick = async (loan) => {
    setSelectedLoan(loan);
    try {
      const response = await fetch(`http://localhost:8080/v1/api/staff-loans/loan-details/${loan.loanId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch loan details');
      }
      const details = await response.json();
      setLoanDetails(details);
      setShowDetailsModal(true);
      setHasScrolledToBottom(false);
    } catch (err) {
      console.error(err);
      alert(err.message || "Error fetching loan details");
    }
  };

  // Handle scrolling inside details modal
  const handleDetailsScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 5) { // near bottom
      setHasScrolledToBottom(true);
    }
  };

  // Accept from within the details modal: close details and open signature modal
  const handleDetailsAccept = () => {
    setShowDetailsModal(false);
    setShowSignatureModal(true);
  };

  // Decline action using PATCH (axios)
  const handleDetailsDecline = async () => {
    try {
      const response = await axios.patch(
        `http://localhost:8080/v1/api/staff-loans/${selectedLoan.loanId}/guarantor/${staffId}/decline`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
        }
      );
      const result = response.data;
      setActionMessage(result.message || `You have successfully declined to be a guarantor of this loan (${selectedLoan.loanProductName}).`);
      setShowActionModal(true);
      // Update local state so that the action buttons are removed for this loan.
      setGuarantorLoans(prev =>
        prev.map(l => l.loanId === selectedLoan.loanId ? { ...l, guarantorDecision: "DECLINED" } : l)
      );
      setShowDetailsModal(false);
    } catch (err) {
      console.error(err);
      alert(err.message || "Error declining loan");
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setLoanDetails(null);
    setSelectedLoan(null);
  };

  // Accept action using PATCH (axios) within signature modal
  const handleSignatureSubmit = async () => {
    try {
      const response = await axios.patch(
        `http://localhost:8080/v1/api/staff-loans/${selectedLoan.loanId}/guarantor/${staffId}/accept`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
        }
      );
      const result = response.data;
      setActionMessage(result.message || `You have successfully accepted to be a guarantor of this loan (${selectedLoan.loanProductName}).`);
      setShowActionModal(true);
      // Update local state so that the action buttons are removed for this loan.
      setGuarantorLoans(prev =>
        prev.map(l => l.loanId === selectedLoan.loanId ? { ...l, guarantorDecision: "ACCEPTED" } : l)
      );
      // Clear signature canvas and close the modal.
      if (sigCanvasRef.current) {
        sigCanvasRef.current.clear();
      }
      setShowSignatureModal(false);
      setSelectedLoan(null);
    } catch (err) {
      console.error(err);
      alert(err.message || "Error accepting loan");
    }
  };

  const closeSignatureModal = () => {
    setShowSignatureModal(false);
    setSelectedLoan(null);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setActionMessage("");
  };

  if (loading) return <div className="gua-loading">Loading...</div>;
  if (error) return <div className="gua-error">Error: {error}</div>;

  return (
    <div className="gua-page">
      <div className="gua-container">
        <h2 className="gua-title">Guarantor Loans</h2>
        <hr className="gua-separator" />
        <table className="gua-table">
          <thead>
            <tr>
              <th>Owner</th>
              <th className="gua-col-product">Product</th>
              <th>Amount</th>
              <th className="gua-col-purpose">Purpose</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {guarantorLoans.map((loan) => (
              <tr key={loan.loanId}>
                <td>{loan.staffFirstName} {loan.staffLastName}</td>
                <td className="gua-col-product">{loan.loanProductName}</td>
                <td>{loan.loanAmount}</td>
                <td className="gua-col-purpose">{loan.purpose}</td>
                <td className="action-cell">
                  <button className="gua-btn gua-view-btn" onClick={() => handleViewClick(loan)}>
                    View
                  </button>
                  {loan.guarantorDecision && (
                    <span className="decision-text">
                      {loan.guarantorDecision === "ACCEPTED"
                        ? "Accepted"
                        : loan.guarantorDecision === "DECLINED"
                        ? "Declined"
                        : ""}
                    </span>
                  )}
                  {loan.guarantorDecision === null && (
                    <span className="notification-badge">!</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Details Modal */}
        {showDetailsModal && loanDetails && (
          <div
            className="gua-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="loan-details-title"
            onClick={(e) => {
              if (e.target.className === 'gua-modal-overlay') {
                setShowDetailsModal(false);
              }
            }}
          >
            <div
              className="gua-modal animate-modal"
              tabIndex="-1"
              ref={modalRef}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="gua-modal-title">Loan Details</h3>
              <button
                className="gua-close-modal-btn"
                onClick={() => setShowDetailsModal(false)}
                aria-label="Close Loan Details Modal"
              >
                <FaTimesIcon />
              </button>
              <hr className="gua-modal-separator" />
              <div 
                className="details-scroll-container" 
                onScroll={handleDetailsScroll} 
                ref={detailsContainerRef}
              >
                {/* Loan Details Table */}
                <table className="details-table">
                  <tbody>
                    <tr>
                      <td><strong>Application ID:</strong></td>
                      <td>{loanDetails.applicationId}</td>
                    </tr>
                    <tr>
                      <td><strong>Staff Name:</strong></td>
                      <td>{loanDetails.staffFirstName} {loanDetails.staffLastName}</td>
                    </tr>
                    <tr>
                      <td><strong>Loan Product:</strong></td>
                      <td>{loanDetails.loanProductName}</td>
                    </tr>
                    <tr>
                      <td><strong>Loan Amount:</strong></td>
                      <td>{loanDetails.loanAmount}</td>
                    </tr>
                    <tr>
                      <td><strong>Status:</strong></td>
                      <td>{loanDetails.status}</td>
                    </tr>
                    <tr>
                      <td><strong>Created At:</strong></td>
                      <td>{loanDetails.createdAt}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Account & Terms Details */}
                <table className="details-table">
                  <tbody>
                    <tr>
                      <td><strong>Repayment Account:</strong></td>
                      <td>{loanDetails.repaymentAccount}</td>
                    </tr>
                    <tr>
                      <td><strong>Disbursement Account:</strong></td>
                      <td>{loanDetails.disbursementAccount}</td>
                    </tr>
                    <tr>
                      <td><strong>Purpose:</strong></td>
                      <td>{loanDetails.purpose}</td>
                    </tr>
                    <tr>
                      <td><strong>T&amp;C Accepted:</strong></td>
                      <td>{loanDetails.termsAndConditionsAccepted ? "Yes" : "No"}</td>
                    </tr>
                    <tr>
                      <td><strong>Guarantor Required:</strong></td>
                      <td>{loanDetails.guarantorRequired ? "Yes" : "No"}</td>
                    </tr>
                    <tr>
                      <td><strong>Guarantor Decision:</strong></td>
                      <td>{loanDetails.guarantorDecision || "Pending"}</td>
                    </tr>
                    <tr>
                      <td><strong>Annual Basic Salary:</strong></td>
                      <td>{loanDetails.annualBasicSalary}</td>
                    </tr>
                    <tr>
                      <td><strong>Approver ID:</strong></td>
                      <td>{loanDetails.approverId}</td>
                    </tr>
                    <tr>
                      <td><strong>Security Details:</strong></td>
                      <td>{loanDetails.securityDetails}</td>
                    </tr>
                    <tr>
                      <td><strong>Loan Agreement Accepted:</strong></td>
                      <td>{loanDetails.loanAgreementAccepted ? "Yes" : "No"}</td>
                    </tr>
                    <tr>
                      <td><strong>Current/Savings Account:</strong></td>
                      <td>{loanDetails.currentOrSavingsAccount}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Supporting Documents Table */}
                {loanDetails.supportingDocuments && Object.keys(loanDetails.supportingDocuments).length > 0 ? (
                  <table className="docs-table">
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Download</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(loanDetails.supportingDocuments).map(([docKey, docValue]) => (
                        <tr key={docKey}>
                          <td>{docKey}</td>
                          <td>
                            <a href={docValue} target="_blank" rel="noopener noreferrer">
                              <button className="gua-btn">Download</button>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No supporting documents uploaded.</p>
                )}
              </div>
              <div className="gua-modal-buttons">
                {/* Buttons enabled only after scrolling to the bottom */}
                {selectedLoan && selectedLoan.guarantorDecision === null && (
                  <>
                    <button 
                      className="gua-btn gua-accept-btn" 
                      onClick={handleDetailsAccept} 
                      disabled={!hasScrolledToBottom}
                    >
                      Accept
                    </button>
                    <button 
                      className="gua-btn gua-decline-btn" 
                      onClick={handleDetailsDecline} 
                      disabled={!hasScrolledToBottom}
                    >
                      Decline
                    </button>
                  </>
                )}
                <button className="gua-btn gua-close-btn" onClick={closeDetailsModal}>
                  Close
                </button>
              </div>
              {!hasScrolledToBottom && (
                <p className="scroll-notice">Please scroll down to review the full application before taking action.</p>
              )}
            </div>
          </div>
        )}

        {/* Signature Modal for Accepting Loan */}
        {showSignatureModal && (
          <div className="gua-modal-overlay">
            <div className="gua-modal animate-modal">
              <h3 className="gua-modal-title">Sign to Accept Loan</h3>
              <p className="gua-modal-text">
                Please sign below to confirm your acceptance as guarantor for this loan.
              </p>
              <div className="gua-signature-canvas-container">
                <SignatureCanvas
                  penColor="black"
                  canvasProps={{ className: 'gua-signature-canvas' }}
                  ref={sigCanvasRef}
                />
              </div>
              <div className="gua-modal-buttons">
                <button className="gua-btn gua-submit-btn" onClick={handleSignatureSubmit}>
                  Submit Signature
                </button>
                <button className="gua-btn gua-cancel-btn" onClick={closeSignatureModal}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Confirmation Modal */}
        {showActionModal && (
          <div className="gua-modal-overlay">
            <div className="gua-modal animate-modal">
              <h3 className="gua-modal-title">Confirmation</h3>
              <p className="gua-modal-text">{actionMessage}</p>
              <div className="gua-modal-buttons">
                <button className="gua-btn gua-close-btn" onClick={closeActionModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GuarantorLoans;
