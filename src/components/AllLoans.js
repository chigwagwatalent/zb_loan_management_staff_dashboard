// src/components/AllLoans.js
import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  FaPlusCircle,
  FaQuestionCircle,
  FaTimes,
  FaPencilAlt,
  FaCheck,
  FaTimes as FaTimesIcon
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import './AllLoans.css';
import { UserContext } from '../contexts/UserContext';

// Updated Completeness Calculation:
// - 30% for main loan fields (loan product, amount, repaymentAccount, disbursementAccount, purpose, securityDetails)
// - 30% for acceptance of both terms & conditions and loan agreement
// - 40% for supporting documents – based on product type. For each required document, full weight is given;
//   for optional documents, half weight is awarded.
const calculateCompleteness = (details) => {
  if (!details) return 0;
  let score = 0;
  // Main fields (30%)
  if (
    details.loanProductName &&
    details.loanAmount &&
    details.repaymentAccount &&
    details.disbursementAccount &&
    details.purpose &&
    details.securityDetails
  ) {
    score += 30;
  }
  // Terms & Agreement (30%)
  if (details.termsAndConditionsAccepted && details.loanAgreementAccepted) {
    score += 30;
  }
  // Supporting Documents (40%)
  let docScore = 0;
  const maxDocScore = 40;
  // Use productType from details if available; otherwise fallback to default expected docs.
  const productType = details.productType || 'DEFAULT';
  let requiredDocs = [];
  let optionalDocs = [];
  switch(productType) {
    case 'PERSONAL_LOAN':
    case 'STAFF_GENERAL_LOAN':
      // Quotation is optional
      optionalDocs = [{ key: 'Quotation', label: 'Quotation' }];
      break;
    case 'STAFF_SCHOOL_FEES_FACILITY':
      requiredDocs = [{ key: 'Invoice', label: 'Invoice with Banking Details' }];
      break;
    case 'STAFF_MOTOR_VEHICLE_LOAN':
      requiredDocs = [
        { key: 'Police Clearance', label: 'Police Clearance' },
        { key: 'Agreement of Sale', label: 'Copy of Agreement of Sale' },
        { key: 'Drivers Licence', label: 'Copy of Drivers’ Licence' },
        { key: 'Valuation Report', label: 'Valuation Report' },
        { key: 'VSD Report', label: 'VSD Report' },
        { key: 'Vehicle Registration', label: 'Copy of Vehicle Registration Book' }
      ];
      break;
    case 'STAFF_MORTGAGES':
    case 'PENSION_MORTGAGES':
      requiredDocs = [
        { key: 'Title Deed', label: 'Title Deed' },
        { key: 'Agreement of Sale', label: 'Agreement of Sale' }
      ];
      break;
    default:
      // Fallback
      requiredDocs = [
        { key: 'Police Clearance', label: 'Police Clearance' },
        { key: 'Agreement of Sale', label: 'Agreement of Sale' }
      ];
      break;
  }
  // Determine total number of document items (optional count as half)
  const totalDocItems = requiredDocs.length + (optionalDocs.length > 0 ? 0.5 * optionalDocs.length : 0);
  const weightPerItem = totalDocItems > 0 ? maxDocScore / totalDocItems : 0;
  // Award full weight for each required document present
  for (let doc of requiredDocs) {
    if (details.supportingDocuments && details.supportingDocuments[doc.key]) {
      docScore += weightPerItem;
    }
  }
  // Award half weight for each optional document present
  for (let doc of optionalDocs) {
    if (details.supportingDocuments && details.supportingDocuments[doc.key]) {
      docScore += weightPerItem * 0.5;
    }
  }
  if (docScore > maxDocScore) docScore = maxDocScore;
  score += docScore;
  return score;
};

const AllLoans = () => {
  const navigate = useNavigate();
  const { user, sessionToken } = useContext(UserContext);
  const [loans, setLoans] = useState([]);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [errorFetchingDetails, setErrorFetchingDetails] = useState('');
  const [modalCompleteness, setModalCompleteness] = useState(0);
  const modalRef = useRef(null);

  // Get staffId from the UserContext (populated during login)
  const staffId = (user?.staffId || '').toString();

  // Fetch all loans for the staff
  useEffect(() => {
    if (!staffId) {
      console.warn('No staffId found, redirecting to login...');
      navigate('/login');
      return;
    }
    if (staffId.trim() === '') {
      console.error('Invalid staffId. Cannot fetch loans.');
      return;
    }
    fetch(`http://localhost:8080/v1/api/staff-loans/staff/${staffId}/details`, {
      headers: { Authorization: `Bearer ${sessionToken}` }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch loans: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        const loansData = Array.isArray(data) ? data : [data];
        const updatedLoans = loansData.map(loan => ({
          ...loan,
          completeness: calculateCompleteness(loan)
        }));
        setLoans(updatedLoans);
      })
      .catch(error => {
        console.error('Error fetching loans:', error);
      });
  }, [staffId, navigate, sessionToken]);

  // Poll for updated loan statuses every 10 seconds
  useEffect(() => {
    if (!staffId) return;
    const pollLoanStatuses = () => {
      fetch(`http://localhost:8080/v1/api/staff-loans/staff/${staffId}/details`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch loans: ${response.status} ${response.statusText}`);
          }
          return response.json();
        })
        .then(fetchedLoans => {
          setLoans(prevLoans =>
            prevLoans.map(loan => {
              const updatedLoan = fetchedLoans.find(l => l.applicationId === loan.applicationId);
              return updatedLoan
                ? { ...loan, ...updatedLoan, completeness: calculateCompleteness(updatedLoan) }
                : loan;
            })
          );
        })
        .catch(error => {
          console.error('Error polling loan statuses:', error);
        });
    };
    const intervalId = setInterval(pollLoanStatuses, 10000);
    return () => clearInterval(intervalId);
  }, [staffId, sessionToken]);

  // When modal is shown, focus on it for accessibility
  useEffect(() => {
    if (showModal && modalRef.current) {
      modalRef.current.focus();
    }
  }, [showModal]);

  // Format date strings
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Handler to fetch full loan details when "View" is clicked
  const handleViewClick = (applicationId) => {
    if (!staffId || !applicationId) {
      console.error('Missing staffId or applicationId.');
      return;
    }
    setShowModal(true);
    setIsLoadingDetails(true);
    setErrorFetchingDetails('');
    setSelectedLoanDetails(null);
    setModalCompleteness(0);

    fetch(`http://localhost:8080/v1/api/staff-loans/loan-details/${applicationId}`, {
      headers: { Authorization: `Bearer ${sessionToken}` }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch loan details: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        setSelectedLoanDetails(data);
        const comp = calculateCompleteness(data);
        setModalCompleteness(comp);
        setIsLoadingDetails(false);
      })
      .catch(error => {
        console.error('Error fetching loan details:', error);
        setErrorFetchingDetails('Could not load loan details. Please try again later.');
        setIsLoadingDetails(false);
      });
  };

  const handleApplyNewLoanClick = () => {
    navigate('/loan-application');
  };

  // Handler for resuming an incomplete application
  const handleResumeApplication = (applicationId, loanDetails) => {
    if (!staffId || !applicationId) {
      alert('Unable to resume application. Required information is missing.');
      return;
    }
    try {
      localStorage.setItem('staffId', staffId);
      localStorage.setItem('applicationId', applicationId);
      navigate(`/loan-application/${applicationId}`, { state: { fromResume: true, loanDetails } });
    } catch (error) {
      console.error('Error storing IDs in localStorage:', error);
      alert('Unable to resume this application. Please try again later.');
    }
  };

  const filterOptions = [
    { value: '', label: 'All' },
    { value: 'SUBMITTED', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' }
  ];

  const filteredLoans = filter ? loans.filter(loan => loan.status === filter) : loans;

  return (
    <div className="allloan-page">
      <h1 className="allloan-page-title">All Loans</h1>
      <hr className="allloan-title-separator" />

      <div className="allloan-loan-table">
        <div className="allloan-loan-actions">
          <Select
            className="allloan-loan-filter"
            classNamePrefix="allloan-react-select"
            options={filterOptions}
            placeholder="Filter Loans"
            onChange={(selectedOption) => setFilter(selectedOption ? selectedOption.value : '')}
            isClearable
          />
        </div>
        <table className="allloan-table">
          <thead>
            <tr>
              <th>Application ID</th>
              <th>Loan Product</th>
              <th>Purpose</th>
              <th>Application Date</th>
              <th>Loan Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.length > 0 ? (
              filteredLoans.map((loan) => {
                const { applicationId } = loan;
                if (!applicationId) {
                  return (
                    <tr key={Math.random()}>
                      <td colSpan="7">Invalid loan data.</td>
                    </tr>
                  );
                }
                const completeness = loan.completeness || 0;
                const isComplete = completeness === 100;
                const statusDisplay = isComplete ? (
                  <span className="rl-status-text">
                    {loan.status ? loan.status : 'Pending Approval'}
                  </span>
                ) : (
                  <div className="rl-completeness-container">
                    <div
                      className="rl-completeness-bar"
                      style={{ width: `${completeness}%` }}
                      aria-valuenow={completeness}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      role="progressbar"
                    >
                      <span className="rl-completeness-percentage">
                        {Math.round(completeness)}%
                      </span>
                    </div>
                  </div>
                );
                return (
                  <tr key={applicationId}>
                    <td>{applicationId}</td>
                    <td>{loan.loanProductName || 'N/A'}</td>
                    <td>{loan.purpose || 'N/A'}</td>
                    <td>{formatDate(loan.createdAt)}</td>
                    <td>
                      {loan.loanAmount !== undefined
                        ? `$${loan.loanAmount.toLocaleString()}`
                        : 'N/A'}
                    </td>
                    <td>{statusDisplay}</td>
                    <td>
                      <button
                        className="allloan-view-btn"
                        onClick={() => handleViewClick(applicationId)}
                        aria-label={`View details for application ${applicationId}`}
                      >
                        View
                      </button>
                      {!isComplete && (
                        <button
                          className="allloan-resume-button"
                          onClick={() => handleResumeApplication(applicationId, loan)}
                          aria-label={`Resume application ${applicationId}`}
                        >
                          <FaPencilAlt className="allloan-resume-icon" />
                          <span className="allloan-resume-text">Resume</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7">No loans found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button className="allloan-apply-loan-btn" onClick={handleApplyNewLoanClick}>
        <FaPlusCircle /> Apply for New Loan
      </button>

      <div className="allloan-help-button" title="Need Help?">
        <FaQuestionCircle size={24} />
      </div>

      {showModal && (
        <div
          className="allloan-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="loan-details-title"
          onClick={(e) => {
            if (e.target.className === 'allloan-modal-overlay') {
              setShowModal(false);
            }
          }}
        >
          <div
            className="allloan-modal-contents"
            tabIndex="-1"
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="loan-details-title">Loan Details</h2>
            <button
              className="allloan-close-modal-btn"
              onClick={() => setShowModal(false)}
              aria-label="Close Loan Details Modal"
            >
              <FaTimes />
            </button>
            <hr className="allloan-modal-separator" />
            {isLoadingDetails && <p>Loading details...</p>}
            {errorFetchingDetails && (
              <p className="allloan-error-text">{errorFetchingDetails}</p>
            )}
            {!isLoadingDetails && !errorFetchingDetails && selectedLoanDetails && (
              <div className="allloan-loan-details-container">
                {/* Loan Overview Section */}
                <div className="allloan-loan-section">
                  <h3 className="allloan-section-title">Loan Overview</h3>
                  <table className="allloan-details-table">
                    <tbody>
                      <tr>
                        <th>Application ID</th>
                        <td>{selectedLoanDetails.applicationId || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th>Loan Product</th>
                        <td>{selectedLoanDetails.loanProductName || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th>Loan Amount</th>
                        <td>
                          {selectedLoanDetails.loanAmount !== undefined
                            ? `$${selectedLoanDetails.loanAmount.toLocaleString()}`
                            : 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <th>Purpose</th>
                        <td>{selectedLoanDetails.purpose || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th>Created At</th>
                        <td>{formatDate(selectedLoanDetails.createdAt)}</td>
                      </tr>
                      <tr>
                        <th>Status</th>
                        <td>{selectedLoanDetails.status || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Account Details Section */}
                <div className="allloan-loan-section">
                  <h3 className="allloan-section-title">Account Details</h3>
                  <table className="allloan-details-table">
                    <tbody>
                      <tr>
                        <th>Repayment Account</th>
                        <td>{selectedLoanDetails.repaymentAccount || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th>Disbursement Account</th>
                        <td>{selectedLoanDetails.disbursementAccount || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th>Current/Savings Account</th>
                        <td>{selectedLoanDetails.currentOrSavingsAccount || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Guarantor & Approval Section */}
                <div className="allloan-loan-section">
                  <h3 className="allloan-section-title">Guarantor & Approval</h3>
                  <table className="allloan-details-table">
                    <tbody>
                      <tr>
                        <th>Guarantor Required</th>
                        <td>{selectedLoanDetails.guarantorRequired ? 'Yes' : 'No'}</td>
                      </tr>
                      <tr>
                        <th>Guarantor ID</th>
                        <td>{selectedLoanDetails.guarantorId || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th>Guarantor Decision</th>
                        <td>{selectedLoanDetails.guarantorDecision || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th>Approver ID</th>
                        <td>{selectedLoanDetails.approverId || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th>Annual Basic Salary</th>
                        <td>
                          {selectedLoanDetails.annualBasicSalary
                            ? `$${selectedLoanDetails.annualBasicSalary.toLocaleString()}`
                            : 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Security & Agreements Section */}
                <div className="allloan-loan-section">
                  <h3 className="allloan-section-title">Security & Agreements</h3>
                  <table className="allloan-details-table">
                    <tbody>
                      <tr>
                        <th>Security Details</th>
                        <td>{selectedLoanDetails.securityDetails || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th>Terms &amp; Conditions Accepted</th>
                        <td>{selectedLoanDetails.termsAndConditionsAccepted ? 'Yes' : 'No'}</td>
                      </tr>
                      <tr>
                        <th>Loan Agreement Accepted</th>
                        <td>{selectedLoanDetails.loanAgreementAccepted ? 'Yes' : 'No'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Supporting Documents Section */}
                <div className="allloan-loan-section">
                  <h3 className="allloan-section-title">Supporting Documents</h3>
                  <table className="allloan-details-table">
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLoanDetails.supportingDocuments &&
                        Object.entries(selectedLoanDetails.supportingDocuments).map(
                          ([docKey, docValue]) => (
                            <tr key={docKey}>
                              <td>{docKey}</td>
                              <td>
                                {docValue ? (
                                  <FaCheck color="green" />
                                ) : (
                                  <FaTimesIcon color="red" />
                                )}
                              </td>
                            </tr>
                          )
                        )}
                    </tbody>
                  </table>
                </div>

                {/* Completeness Progress Section */}
                <div className="allloan-loan-section completeness-section">
                  <h3 className="allloan-section-title">Application Completeness</h3>
                  <div className="rl-completeness-container">
                    <div
                      className="rl-completeness-bar"
                      style={{ width: `${modalCompleteness}%` }}
                      aria-valuenow={modalCompleteness}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      role="progressbar"
                    >
                      <span className="rl-completeness-percentage">
                        {Math.round(modalCompleteness)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resume Button (only if completeness is below 100%) */}
                {calculateCompleteness(selectedLoanDetails) < 100 && (
                  <div className="allloan-loan-section">
                    <button
                      className="allloan-resume-button modal-resume-button"
                      onClick={() =>
                        handleResumeApplication(selectedLoanDetails.applicationId, selectedLoanDetails)
                      }
                      aria-label={`Resume application ${selectedLoanDetails.applicationId}`}
                    >
                      <FaPencilAlt className="allloan-resume-icon" />
                      <span className="allloan-resume-text">Resume Application</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllLoans;
