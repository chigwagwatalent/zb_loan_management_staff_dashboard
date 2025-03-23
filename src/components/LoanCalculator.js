import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoanCalculator.css';

const LoanCalculator = () => {
  const navigate = useNavigate();
  // Step can be 'selection' (choose loan type) or 'calculator' (show the personal calculator)
  const [step, setStep] = useState('selection');
  const [loanType, setLoanType] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [tenure, setTenure] = useState('');
  const [repaymentSchedule, setRepaymentSchedule] = useState('');
  const [maxLoan, setMaxLoan] = useState(null);

  // Multiplier rules:
  const getMultiplier = (tenure) => {
    const t = parseInt(tenure, 10);
    if (t === 3) return 1;
    if (t === 6) return 2;
    if (t === 12) return 4;
    if (t === 18) return 6;
    if (t === 24) return 8;
    if (t === 36) return 12;
    return 0;
  };

  const handleCalculate = () => {
    const income = parseFloat(monthlyIncome);
    if (!income || !tenure) {
      setMaxLoan(null);
      return;
    }
    const multiplier = getMultiplier(tenure);
    const calculated = income * multiplier;
    setMaxLoan(calculated);
  };

  const handleStartApplication = () => {
    // Redirect to the personal loan application page
    navigate('/loan-application');
  };

  return (
    <div className="cal-container">
      {step === 'selection' && (
        <div className="cal-selection">
          <h2 className="cal-selection-title">Select Loan Type</h2>
          <div className="cal-selection-buttons">
            <button
              className="cal-selection-button"
              onClick={() => {
                setLoanType('personal');
                setStep('calculator');
              }}
            >
              Personal Loan
            </button>
            <button
              className="cal-selection-button"
              onClick={() => setLoanType('corporate')}
            >
              Corporate Loan
            </button>
            <button
              className="cal-selection-button"
              onClick={() => setLoanType('sme')}
            >
              SME Loan
            </button>
          </div>
          {loanType && loanType !== 'personal' && (
            <div className="cal-error-message">
              <p>Sorry, currently only the Personal Loan Calculator is available.</p>
              <button
                className="cal-back-button"
                onClick={() => {
                  setLoanType('');
                }}
              >
                Back
              </button>
            </div>
          )}
        </div>
      )}
      {step === 'calculator' && loanType === 'personal' && (
        <div className="cal-card">
          <h1 className="cal-title">Personal Loan Calculator</h1>
          <div className="cal-form">
            <div className="cal-form-group">
              <label htmlFor="cal-monthlyIncome" className="cal-label">
                Monthly Income/Salary (USD):
              </label>
              <input
                type="number"
                id="cal-monthlyIncome"
                className="cal-input"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                placeholder="Enter your monthly income"
              />
            </div>
            <div className="cal-form-group">
              <label htmlFor="cal-tenure" className="cal-label">
                Loan Tenure (Months):
              </label>
              <select
                id="cal-tenure"
                className="cal-select"
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
              >
                <option value="">Select Tenure</option>
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
                <option value="12">12 Months</option>
                <option value="18">18 Months</option>
                <option value="24">24 Months</option>
                <option value="36">36 Months</option>
              </select>
            </div>
            <div className="cal-form-group">
              <label htmlFor="cal-repaymentSchedule" className="cal-label">
                Repayment Schedule:
              </label>
              <select
                id="cal-repaymentSchedule"
                className="cal-select"
                value={repaymentSchedule}
                onChange={(e) => setRepaymentSchedule(e.target.value)}
              >
                <option value="">Select Schedule</option>
                <option value="MONTHLY">Monthly</option>
                <option value="BIWEEKLY">Bi-Weekly</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>
            <button className="cal-button" onClick={handleCalculate}>
              Calculate Maximum Loan
            </button>
          </div>
          {maxLoan !== null && (
            <div className="cal-result">
              <div className="cal-pop">
                <p>Your maximum loan amount is:</p>
                <h2>${maxLoan.toFixed(2)}</h2>
              </div>
              <button className="cal-apply-button" onClick={handleStartApplication}>
                Start Loan Application
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LoanCalculator;
