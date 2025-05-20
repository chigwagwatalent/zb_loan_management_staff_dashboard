// src/components/LoanCalculator.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoanCalculator.css';

const LoanCalculator = () => {
  const navigate = useNavigate();
  const [netSalary, setNetSalary] = useState('');
  const [tenure, setTenure] = useState('');
  const [maxLoan, setMaxLoan] = useState(null);

  const handleCalculate = () => {
    const salary = parseFloat(netSalary);
    const t = parseInt(tenure, 10);

    // validate inputs
    if (isNaN(salary) || isNaN(t) || salary <= 0 || t <= 0) {
      setMaxLoan(null);
      return;
    }

    const annualRate = 0.15;
    const monthlyRate = annualRate / 12;
    const pow = Math.pow(1 + monthlyRate, t);

    // annuity factor: ((1+i)^t - 1) / (i * (1+i)^t)
    const factor = (pow - 1) / (monthlyRate * pow);

    // maximum monthly repayment so that netSalary - repayment >= 30% of netSalary
    // repayment <= salary - 0.3 * salary = 0.7 * salary
    const maxMonthlyRepayment = 0.7 * salary;

    // maximum loan principal
    const loanAmount = factor * maxMonthlyRepayment;

    setMaxLoan(loanAmount);
  };

  const handleStartApplication = () => {
    navigate('/loan-application');
  };

  return (
    <div className="cal-container">
      <div className="cal-card">
        <h1 className="cal-title">Personal Loan Calculator</h1>
        <div className="cal-form">
          <div className="cal-form-group">
            <label htmlFor="netSalary" className="cal-label">
              Net Salary (USD):
            </label>
            <input
              type="number"
              id="netSalary"
              className="cal-input"
              value={netSalary}
              onChange={(e) => setNetSalary(e.target.value)}
              placeholder="Enter your net salary"
            />
          </div>
          <div className="cal-form-group">
            <label htmlFor="tenure" className="cal-label">
              Loan Tenure (Months):
            </label>
            <select
              id="tenure"
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
            <button
              className="cal-apply-button"
              onClick={handleStartApplication}
            >
              Start Loan Application
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanCalculator;
