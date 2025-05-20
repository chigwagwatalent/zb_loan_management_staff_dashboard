// src/components/Dashboard.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  FaDollarSign,
  FaCheckCircle,
  FaCalendarAlt,
  FaQuestionCircle,
  FaPencilAlt,
  FaCalculator,
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Dashboard.css';
import { UserContext } from '../contexts/UserContext';
import axios from 'axios';
import LoanCalculator from './LoanCalculator';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, sessionToken } = useContext(UserContext);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 768;
  const popupRef = useRef(null);

  const [showPopup, setShowPopup] = useState(false);
  const [showCalculatorPopup, setShowCalculatorPopup] = useState(false);
  const [profileComplete, setProfileComplete] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [loans, setLoans] = useState([]);
  const [numberOfLoans, setNumberOfLoans] = useState(0);
  const [pendingLoans, setPendingLoans] = useState(0);
  const [runningLoans, setRunningLoans] = useState([]);
  const [approvedLoans, setApprovedLoans] = useState([]);
  const [nextPaymentInfo, setNextPaymentInfo] = useState(null);
  const [paymentSchedules, setPaymentSchedules] = useState([]);
  const [selectedScheduleForPopup, setSelectedScheduleForPopup] = useState([]);
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);

  // Announcement slides
  const announcementSlides = [
    'Apply for Staff Loans in just 6 simple steps!',
    'Staff members can be guarantors for each other’s loans!',
    'Benefit from competitive rates and exclusive staff privileges!',
  ];
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState('in');
  const [activeSection, setActiveSection] = useState(null);
  const [activeFAQ, setActiveFAQ] = useState(null);
  const [staffProducts, setStaffProducts] = useState([]);

  const faqs = [
    {
      question: "How to apply for a loan?",
      answer: "Click on the 'Apply' button for the desired loan product and follow the steps.",
    },
    {
      question: "How to check the amount I qualify for?",
      answer: "Use our loan calculator to determine your eligibility and the amount you qualify for.",
    },
    {
      question: "Which documents do I need for an application?",
      answer: "You will need an ID document, proof of residence, and a passport photo.",
    },
  ];

  // Update window width on resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // For this dashboard, assume profile data is available in user context.
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!sessionToken) return;
      if (user?.staffId) {
        setProfileData(user);
        setProfileComplete(true);
      }
    };
    fetchProfileData();
  }, [user, sessionToken]);

  // Define a function to compute completeness of a loan using its details.
  const computeLoanCompleteness = (details) => {
    let score = 0;
    if (details.loanProductName && details.loanProductName.trim() !== '') score += 10;
    if (details.loanAmount && Number(details.loanAmount) > 0) score += 10;
    if (details.repaymentAccount && details.repaymentAccount.trim() !== '') score += 10;
    if (details.disbursementAccount && details.disbursementAccount.trim() !== '') score += 10;
    if (details.purpose && details.purpose.trim() !== '') score += 10;
    if (details.termsAndConditionsAccepted === true) score += 15;
    if (details.loanAgreementAccepted === true) score += 15;
    if (
      details.supportingDocuments &&
      details.supportingDocuments["Police Clearance"] &&
      details.supportingDocuments["Agreement of Sale"]
    ) {
      score += 10;
    }
    if (details.securityDetails && details.securityDetails.trim() !== '') score += 10;
    return score;
  };

  // Fetch loans and compute completeness.
  useEffect(() => {
    const fetchLoans = async () => {
      if (user?.staffId) {
        try {
          const response = await fetch(
            `http://10.132.229.140:8080/v1/api/staff-loans/staff/${user.staffId}/details`,
            { headers: { Authorization: `Bearer ${sessionToken}` } }
          );
          if (!response.ok)
            throw new Error(`Failed to fetch loans: ${response.status} ${response.statusText}`);
          const data = await response.json();
          const loansData = Array.isArray(data) ? data : [data];

          const updatedLoans = await Promise.all(
            loansData.map(async (loan) => {
              const { applicationId } = loan;
              if (!applicationId) return { ...loan, completeness: 0 };
              try {
                const detailRes = await fetch(
                  `http://10.132.229.140:8080/v1/api/staff-loans/loan-details/${applicationId}`,
                  { headers: { Authorization: `Bearer ${sessionToken}` } }
                );
                if (!detailRes.ok)
                  throw new Error(`Failed to fetch details for ${applicationId}`);
                const details = await detailRes.json();
                const completeness = computeLoanCompleteness(details);
                return { ...loan, completeness, details };
              } catch (err) {
                console.error(`Error computing completeness for loan ${applicationId}:`, err);
                return { ...loan, completeness: 0 };
              }
            })
          );

          setLoans(updatedLoans);
          setNumberOfLoans(updatedLoans.length);
          const pendingCount = updatedLoans.filter(
            (loan) => loan.status !== 'ACCEPTED' && (loan.completeness || 0) < 100
          ).length;
          setPendingLoans(pendingCount);
          const approved = updatedLoans.filter((loan) => loan.status === 'ACCEPTED');
          setApprovedLoans(approved);
          setRunningLoans(approved);
        } catch (error) {
          console.error('Error fetching loans:', error);
        }
      }
    };
    if (user && sessionToken) {
      fetchLoans();
    }
  }, [navigate, sessionToken, user]);

  // Fetch payment schedules for each loan.
  useEffect(() => {
    if (loans.length === 0) return;
    const fetchSchedules = async () => {
      const schedules = [];
      await Promise.all(
        loans.map(async (loan) => {
          const { applicationId } = loan;
          if (!applicationId) return;
          try {
            const response = await axios.get(
              `http://10.132.229.140:8080/v1/api/loan-applications/loan-schedule/${applicationId}`,
              { headers: { Authorization: `Bearer ${sessionToken}` } }
            );
            let loanSchedules = response.data;
            if (!Array.isArray(loanSchedules)) loanSchedules = [loanSchedules];
            loanSchedules = loanSchedules.map((sched) => ({ ...sched, applicationId }));
            schedules.push(...loanSchedules);
          } catch (err) {
            console.error(`Error fetching schedule for ${applicationId}:`, err);
          }
        })
      );
      setPaymentSchedules(schedules);
      const today = new Date();
      const futureSchedules = schedules.filter(
        (schedule) => new Date(schedule.paymentDate) >= today
      );
      if (futureSchedules.length > 0) {
        futureSchedules.sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate));
        const nextSchedule = futureSchedules[0];
        setNextPaymentInfo({
          date: nextSchedule.paymentDate,
          amount: nextSchedule.scheduledPayment,
          applicationId: nextSchedule.applicationId,
          loanNumber: nextSchedule.loanNumber,
        });
      }
    };
    fetchSchedules();
  }, [loans, sessionToken]);

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setSlideDirection('out');
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % announcementSlides.length);
        setSlideDirection('in');
      }, 500);
    }, 5000);
    return () => clearInterval(slideInterval);
  }, [announcementSlides.length]);

  const tileClassName = ({ date, view }) => {
    if (view === 'month' && paymentSchedules.length > 0) {
      for (let sched of paymentSchedules) {
        const schedDate = new Date(sched.paymentDate);
        if (
          date.getFullYear() === schedDate.getFullYear() &&
          date.getMonth() === schedDate.getMonth() &&
          date.getDate() === schedDate.getDate()
        ) {
          return 'dash-highlight-date';
        }
      }
    }
    return null;
  };

  const handleDayClick = (value) => {
    if (paymentSchedules.length > 0) {
      const matching = paymentSchedules.filter((schedule) => {
        const schedDate = new Date(schedule.paymentDate);
        return (
          schedDate.getFullYear() === value.getFullYear() &&
          schedDate.getMonth() === value.getMonth() &&
          schedDate.getDate() === value.getDate()
        );
      });
      if (matching.length > 0) {
        setSelectedScheduleForPopup(matching);
        setShowSchedulePopup(true);
      }
    }
  };

  const closeSchedulePopup = () => setShowSchedulePopup(false);

  // Updated resume handler to pass the resume flag and loan details.
  const handleContinueApplication = (loan) => {
    if (!loan.details) {
      console.error('Loan details missing.');
      return;
    }
    navigate(`/loan-application/${loan.applicationId}`, { state: { fromResume: true, loanDetails: loan.details } });
  };

  const handleApplyForProduct = (product) => {
    navigate('/loan-application', { state: { selectedProduct: product, startStep: 2 } });
  };

  const toggleAccordion = (sectionName) =>
    setActiveSection((prev) => (prev === sectionName ? null : sectionName));

  // Fetch staff loan products (filtered by clientType "STAFF_LOAN")
  useEffect(() => {
    const fetchStaffLoanProducts = async () => {
      try {
        const res = await fetch('http://10.132.229.140:8080/v1/api/loan-products', {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (!res.ok) throw new Error('Failed to fetch loan products');
        const data = await res.json();
        const filteredProducts = data.filter((prod) => prod.clientType === 'STAFF');
        setStaffProducts(filteredProducts);
      } catch (error) {
        console.error('Error fetching loan products:', error);
      }
    };
    if (sessionToken) fetchStaffLoanProducts();
  }, [sessionToken]);

  useEffect(() => {
    if (!user) return;
    if (!sessionStorage.getItem('hasSeenPopup')) {
      setShowPopup(true);
      sessionStorage.setItem('hasSeenPopup', 'true');
    }
  }, [user]);

  useEffect(() => {
    if (showPopup && popupRef.current) popupRef.current.focus();
  }, [showPopup]);

  const closePopup = () => setShowPopup(false);
  const handleApplyLoan = () => {
    navigate('/loan-application');
    setShowPopup(false);
  };
  const handleCompleteProfile = () => navigate('/profile');
  const handleLoanCalculator = () => setShowCalculatorPopup(true);
  const closeCalculatorPopup = () => setShowCalculatorPopup(false);
  const handleViewLoan = (loan) => navigate(`/loan-details/${loan.applicationId}`, { state: { loan } });
  const getNextRepaymentDate = (loan) => {
    const today = new Date();
    const schedulesForLoan = paymentSchedules.filter((sched) => sched.applicationId === loan.applicationId);
    if (!schedulesForLoan.length) return 'N/A';
    const futureSchedules = schedulesForLoan.filter((sched) => new Date(sched.paymentDate) >= today);
    if (!futureSchedules.length) return 'N/A';
    futureSchedules.sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate));
    return new Date(futureSchedules[0].paymentDate).toLocaleDateString();
  };
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getCompletenessColor = (completeness) => {
    if (completeness < 33) return 'red';
    if (completeness < 75) return 'yellow';
    return 'green';
  };

  return (
    <div className="dash-dashboard-content">
      {showPopup && (
        <div className="dash-popup-overlay">
          <div className="dash-popup" role="dialog" aria-modal="true" tabIndex="-1" ref={popupRef}>
            <h2>Apply for Staff Loans in just 6 simple steps!</h2>
            <p>Get the funds you need with a quick and easy application process.</p>
            <button className="dash-apply-button" onClick={handleApplyLoan} aria-label="Apply for a Loan">
              Apply for a Loan
            </button>
            <button className="dash-close-button" onClick={closePopup} aria-label="Close Popup">
              Close
            </button>
          </div>
        </div>
      )}

      {showCalculatorPopup && (
        <div className="dash-calculator-popup-overlay">
          <div className="dash-calculator-popup" role="dialog" aria-modal="true">
            <button className="dash-calculator-close-button" onClick={closeCalculatorPopup} aria-label="Close Calculator">
              &times;
            </button>
            <div className="dash-calculator-container">
              <LoanCalculator />
            </div>
          </div>
        </div>
      )}

      {showSchedulePopup && (
        <div className="dash-schedule-popup-overlay">
          <div className="dash-schedule-popup" role="dialog" aria-modal="true">
            <h2>Payment Details</h2>
            {selectedScheduleForPopup.map((schedule, index) => (
              <div key={index} className="dash-schedule-item">
                <p><strong>Loan Number:</strong> {schedule.loanNumber}</p>
                <p><strong>Payment Date:</strong> {new Date(schedule.paymentDate).toLocaleDateString()}</p>
                <p>
                  <strong>Scheduled Payment:</strong> ${Number(schedule.scheduledPayment).toFixed(2)}
                </p>
              </div>
            ))}
            <button className="dash-close-button" onClick={closeSchedulePopup} aria-label="Close Popup">
              Close
            </button>
          </div>
        </div>
      )}

      <section className="dash-welcome-container">
        {!profileComplete && (
          <div className="dash-profile-notification">
            <p>Please complete your profile to access all features.</p>
            <button className="dash-complete-profile-button" onClick={handleCompleteProfile} aria-label="Complete Profile">
              Click Here
            </button>
          </div>
        )}
        <div className="dash-welcome-header">
          <h1 className="dash-welcome-message">
            Welcome, <b>{user?.fullName || 'User'}</b> to MyZB Loans!
          </h1>
          <button className="dash-apply-loan-btn" onClick={handleApplyLoan}>
            Apply for Loan
          </button>
        </div>
        <div className="dash-welcome-separator" />
      </section>

      {isMobile ? (
        <>
          <section className="dash-announcement-container">
            <div className="dash-card dash-announcement-card">
              <h4>Announcements</h4>
              <div className="announcement-shadow-text">My ZBLoans</div>
              <div className="separator" />
              <p className={`dash-slide-${slideDirection}`}>{announcementSlides[currentSlide]}</p>
            </div>
          </section>
          <section className="dash-statistics-cards">
            <div className="dash-stat-card">
              <FaDollarSign className="dash-card-icon" />
              <div className="dash-card-text">
                <p>Total Loans</p>
                <h1>{numberOfLoans}</h1>
              </div>
            </div>
            <div className="dash-stat-card">
              <FaCheckCircle className="dash-card-icon" />
              <div className="dash-card-text">
                <p>Applications</p>
                <h1>{pendingLoans}</h1>
              </div>
            </div>
            <div className="dash-stat-card">
              <FaCheckCircle className="dash-card-icon" />
              <div className="dash-card-text">
                <p>Running Loans</p>
                <h1>{approvedLoans.length}</h1>
              </div>
            </div>
            <div className="dash-stat-card dash-loan-calculator-card" onClick={handleLoanCalculator}>
              <FaCalculator className="dash-card-icon" />
              <div className="dash-card-text">
                <p>Loan Calculator</p>
                <h5>Click to calculate</h5>
              </div>
            </div>
          </section>
          <section className="dash-calendar-container">
            <div className="dash-card dash-calendar-card">
              <Calendar
                className="dash-custom-calendar"
                activeStartDate={nextPaymentInfo?.date ? new Date(nextPaymentInfo.date) : undefined}
                tileClassName={tileClassName}
                onClickDay={handleDayClick}
              />
              <p className="dash-upcoming-date">
                <FaCalendarAlt /> Next Payment Due:{' '}
                <b>{nextPaymentInfo?.date ? new Date(nextPaymentInfo.date).toLocaleDateString() : 'N/A'}</b>
                {typeof nextPaymentInfo?.amount === 'number' && (
                  <span> - Amount: ${Number(nextPaymentInfo.amount).toFixed(2)}</span>
                )}
              </p>
            </div>
          </section>
          <section className="dash-layout-row">
            <div className="dash-card dash-loan-products">
              <h2 className="section-title">Staff Loans</h2>
              <div className="separator" />
              <div className="dash-accordion">
                <div className={`dash-accordion-item ${activeSection === 'STAFF_LOANS' ? 'active' : ''}`}>
                  <button
                    className="dash-accordion-header"
                    onClick={() => toggleAccordion('STAFF_LOANS')}
                    aria-expanded={activeSection === 'STAFF_LOANS'}
                    aria-controls="dash-accordion-content-staff-loans"
                  >
                    Staff Loans
                  </button>
                  <div id="dash-accordion-content-staff-loans" className="dash-accordion-content">
                    <div className="dash-product-list">
                      {staffProducts.length > 0 ? (
                        staffProducts.map((product) => (
                          <div key={product.id} className="dash-product-item">
                            <div className="dash-product-row">
                              <h3 className="dash-product-name">{product.name}</h3>
                              <button
                                className="dash-apply-button"
                                onClick={() => handleApplyForProduct(product)}
                                aria-label={`Apply for ${product.name}`}
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p>No Staff Loans available.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="dash-card dash-running-applications-table">
              <h2>Running Applications</h2>
              <div className="separator" />
              <table className="dash-styled-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="dash-application-date-column">Date</th>
                    <th className="dash-requested-amount">Amount</th>
                    <th className="dash-completeness-column">Completeness</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.filter(loan => loan.status !== 'ACCEPTED' && (loan.completeness || 0) < 100).length > 0 ? (
                    loans
                      .filter(loan => loan.status !== 'ACCEPTED' && (loan.completeness || 0) < 100)
                      .map((loan) => {
                        const { applicationId, createdAt, loanAmount, completeness } = loan;
                        if (!applicationId) {
                          return (
                            <tr key={Math.random()}>
                              <td colSpan="5">Invalid loan data.</td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={applicationId}>
                            <td>{loan.loanProductName || 'N/A'}</td>
                            <td className="dash-application-date-column">{formatDate(createdAt)}</td>
                            <td className="dash-requested-amount">
                              ${loan.loanAmount?.toLocaleString() || '0'}
                            </td>
                            <td>
                              <div className="dash-completeness-container">
                                <div
                                  className={`dash-completeness-bar ${getCompletenessColor(completeness || 0)}`}
                                  style={{ width: `${completeness || 0}%` }}
                                  aria-valuenow={completeness || 0}
                                  aria-valuemin="0"
                                  aria-valuemax="100"
                                  role="progressbar"
                                />
                                <span className="dash-completeness-percentage">
                                  {Math.round(completeness || 0)}%
                                </span>
                              </div>
                            </td>
                            <td>
                              <button
                                className="dash-resume-button"
                                onClick={() => handleContinueApplication(loan)}
                                aria-label={`Resume application ${applicationId}`}
                              >
                                <FaPencilAlt className="dash-resume-icon" />
                                <span className="dash-resume-text">Resume</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan="5">No running applications.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="dash-statistics-cards">
            <div className="dash-stat-card">
              <FaDollarSign className="dash-card-icon" />
              <div className="dash-card-text">
                <p>Total Loans</p>
                <h1>{numberOfLoans}</h1>
              </div>
            </div>
            <div className="dash-stat-card">
              <FaCheckCircle className="dash-card-icon" />
              <div className="dash-card-text">
                <p>Applications</p>
                <h1>{pendingLoans}</h1>
              </div>
            </div>
            <div className="dash-stat-card">
              <FaCheckCircle className="dash-card-icon" />
              <div className="dash-card-text">
                <p>Running Loans</p>
                <h1>{approvedLoans.length}</h1>
              </div>
            </div>
            <div className="dash-stat-card dash-loan-calculator-card" onClick={handleLoanCalculator}>
              <FaCalculator className="dash-card-icon" />
              <div className="dash-card-text">
                <p>Loan Calculator</p>
                <h5>Click to calculate</h5>
              </div>
            </div>
          </section>
          <section className="dash-layout-row">
            <div className="dash-card dash-calendar-card">
              <Calendar
                className="dash-custom-calendar"
                activeStartDate={nextPaymentInfo?.date ? new Date(nextPaymentInfo.date) : undefined}
                tileClassName={tileClassName}
                onClickDay={handleDayClick}
              />
              <p className="dash-upcoming-date">
                <FaCalendarAlt /> Next Payment Due:{' '}
                <b>{nextPaymentInfo?.date ? new Date(nextPaymentInfo.date).toLocaleDateString() : 'N/A'}</b>
                {typeof nextPaymentInfo?.amount === 'number' && (
                  <span> - Amount: ${Number(nextPaymentInfo.amount).toFixed(2)}</span>
                )}
              </p>
            </div>
            <div className="dash-card dash-announcement-card">
              <h4>Announcements</h4>
              <div className="announcement-shadow-text">My ZBLoans</div>
              <div className="separator" />
              <p className={`dash-slide-${slideDirection}`}>{announcementSlides[currentSlide]}</p>
            </div>
          </section>
          <section className="dash-layout-row">
            <div className="dash-card dash-loan-products">
              <h2 className="section-title">Staff Loans</h2>
              <div className="separator" />
              <div className="dash-accordion">
                <div className={`dash-accordion-item ${activeSection === 'STAFF_LOANS' ? 'active' : ''}`}>
                  <button
                    className="dash-accordion-header"
                    onClick={() => toggleAccordion('STAFF_LOANS')}
                    aria-expanded={activeSection === 'STAFF_LOANS'}
                    aria-controls="dash-accordion-content-staff-loans"
                  >
                    Staff Loans
                  </button>
                  <div id="dash-accordion-content-staff-loans" className="dash-accordion-content">
                    <div className="dash-product-list">
                      {staffProducts.length > 0 ? (
                        staffProducts.map((product) => (
                          <div key={product.id} className="dash-product-item">
                            <div className="dash-product-row">
                              <h3 className="dash-product-name">{product.name}</h3>
                              <button
                                className="dash-apply-button"
                                onClick={() => handleApplyForProduct(product)}
                                aria-label={`Apply for ${product.name}`}
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p>No Staff Loans available.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="dash-card dash-running-applications-table">
              <h2>Running Applications</h2>
              <div className="separator" />
              <table className="dash-styled-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="dash-application-date-column">Date</th>
                    <th className="dash-requested-amount">Amount</th>
                    <th className="dash-completeness-column">Completeness</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.filter(loan => loan.status !== 'ACCEPTED' && (loan.completeness || 0) < 100).length > 0 ? (
                    loans
                      .filter(loan => loan.status !== 'ACCEPTED' && (loan.completeness || 0) < 100)
                      .map((loan) => {
                        const { applicationId, createdAt, loanAmount, completeness } = loan;
                        if (!applicationId) {
                          return (
                            <tr key={Math.random()}>
                              <td colSpan="5">Invalid loan data.</td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={applicationId}>
                            <td>{loan.loanProductName || 'N/A'}</td>
                            <td className="dash-application-date-column">{formatDate(createdAt)}</td>
                            <td className="dash-requested-amount">
                              ${loan.loanAmount?.toLocaleString() || '0'}
                            </td>
                            <td>
                              <div className="dash-completeness-container">
                                <div
                                  className={`dash-completeness-bar ${getCompletenessColor(completeness || 0)}`}
                                  style={{ width: `${completeness || 0}%` }}
                                  aria-valuenow={completeness || 0}
                                  aria-valuemin="0"
                                  aria-valuemax="100"
                                  role="progressbar"
                                />
                                <span className="dash-completeness-percentage">
                                  {Math.round(completeness || 0)}%
                                </span>
                              </div>
                            </td>
                            <td>
                              <button
                                className="dash-resume-button"
                                onClick={() => handleContinueApplication(loan)}
                                aria-label={`Resume application ${applicationId}`}
                              >
                                <FaPencilAlt className="dash-resume-icon" />
                                <span className="dash-resume-text">Resume</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan="5">No running applications.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="dash-layout-row">
            <div className="dash-card dash-running-loans-table">
              <h2>Running Loans</h2>
              <div className="separator" />
              <table className="dash-styled-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="dash-requested-amount">Amount</th>
                    <th>Repayment Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedLoans.length > 0 ? (
                    approvedLoans.map((loan) => {
                      const { applicationId } = loan;
                      if (!applicationId) {
                        return (
                          <tr key={Math.random()}>
                            <td colSpan="4">Invalid loan data.</td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={applicationId}>
                          <td>{loan.loanProductName || 'N/A'}</td>
                          <td className="dash-requested-amount">
                            ${loan.loanAmount?.toLocaleString() || '0'}
                          </td>
                          <td>{getNextRepaymentDate(loan)}</td>
                          <td>
                            <button
                              className="dash-view-details-button"
                              onClick={() => handleViewLoan(loan)}
                              aria-label={`View loan ${applicationId}`}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4">No running loans.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="dash-card dash-faq-card">
              <h2>FAQs</h2>
              <div className="separator" />
              {faqs.map((faq, index) => (
                <div key={index} className="dash-faq-item">
                  <div
                    className="dash-faq-question"
                    onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
                  >
                    <span>{faq.question}</span>
                    <span className="dash-faq-arrow">{activeFAQ === index ? '-' : '+'}</span>
                  </div>
                  {activeFAQ === index && <div className="dash-faq-answer">{faq.answer}</div>}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="dash-help-button">
        <FaQuestionCircle size={24} />
      </div>
    </div>
  );
};

export default Dashboard;
