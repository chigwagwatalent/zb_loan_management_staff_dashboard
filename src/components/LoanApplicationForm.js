// src/components/StaffLoanApplicationForm.jsx
import React, { useState, useContext, useEffect } from 'react'; 
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import './LoanApplicationForm.css';

const StaffLoanApplicationForm = () => {
  const { user, sessionToken, logoutUser } = useContext(UserContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { applicationId: routeApplicationId } = useParams();

  // Current step 1-6
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationId, setApplicationId] = useState(routeApplicationId || null);

  // Loan product and products list
  const [loanProducts, setLoanProducts] = useState([]);
  const [selectedLoanProduct, setSelectedLoanProduct] = useState(null);

  // Data for staff loan application; added netSalary for step 2
  const [staffLoanData, setStaffLoanData] = useState({
    loanAmount: '',
    repaymentAccount: '',
    disbursementAccount: '',
    repaymentSchedule: '',
    currencyId: '',
    tenureDuration: '',
    netSalary: '',
    // Step 3 fields:
    purpose: '',
    guarantorRequired: true,
    guarantorId: '',
    annualBasicSalary: '',
    approverId: '',
    // Step 4 fields:
    loanAgreementAccepted: false,
    currentOrSavingsAccount: '',
    supportingDocuments: {},
    securityDetails: ''
  });

  // State for maximum allowed loan in step 2
  const [maxAllowedLoan, setMaxAllowedLoan] = useState(null);

  // Guarantor and Approver list fetched from API
  const [guarantors, setGuarantors] = useState([]);
  const [approvers, setApprovers] = useState([]);
  // Terms accepted state for step 5
  const [termsAccepted, setTermsAccepted] = useState(false);
  // Upload indicator (if needed)
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
  // To capture errors per step
  const [errors, setErrors] = useState({});
  // Show success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // New state to hold fetched accounts from the lookup endpoint
  const [fetchedAccounts, setFetchedAccounts] = useState({});
  // States to track if the user wishes to enter an account manually
  const [repaymentAccountManual, setRepaymentAccountManual] = useState(false);
  const [disbursementAccountManual, setDisbursementAccountManual] = useState(false);

  // New state to hold the list of currencies fetched from the API
  const [currencies, setCurrencies] = useState([]);

  // Fetch loan products and filter for staff loans
  useEffect(() => {
    const fetchLoanProducts = async () => {
      try {
        const response = await axios.get('http://10.132.229.140:8080/v1/api/loan-products', {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (response.status === 200) {
          const staffProducts = response.data.filter(p => p.clientType === 'STAFF');
          setLoanProducts(staffProducts);
        }
      } catch (error) {
        console.error('Error fetching loan products:', error);
      }
    };
    fetchLoanProducts();
  }, [sessionToken]);

  // Fetch accounts for Repayment and Disbursement using the nationalId from local storage or user context
  useEffect(() => {
    const storedNationalId = localStorage.getItem("nationalId") || user?.nationalId;
    if (storedNationalId) {
      const sanitizedNationalId = storedNationalId.replace(/[^a-zA-Z0-9]/g, '');
      axios.post(
        'http://10.132.229.140:8080/v1/api/account-lookup',
        { nationalId: sanitizedNationalId },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      )
      .then(response => {
        setFetchedAccounts(response.data || {});
      })
      .catch(err => {
        console.error("Error fetching accounts:", err);
      });
    }
  }, [sessionToken, user]);

  // Fetch currencies for the new currency selection field
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await axios.get('http://10.132.229.140:8080/v1/api/currencies');
        if (response.status === 200) {
          setCurrencies(response.data);
        }
      } catch (error) {
        console.error('Error fetching currencies:', error);
      }
    };
    fetchCurrencies();
  }, []);

  // When step 3 is active, fetch guarantors and approvers for the current staff
  useEffect(() => {
    if (currentStep === 3 && user && user.staffId) {
      const fetchStaffOptions = async () => {
        try {
          const response = await axios.get(
            `http://10.132.229.140:8080/v1/api/staff-loans/guarantors/${user.staffId}`,
            { headers: { Authorization: `Bearer ${sessionToken}` } }
          );
          if (response.status === 200) {
            setGuarantors(response.data);
            setApprovers(response.data);
          }
        } catch (error) {
          console.error('Error fetching staff options:', error);
        }
      };
      fetchStaffOptions();
    }
  }, [currentStep, user, sessionToken]);

  // Compute maxAllowedLoan whenever netSalary or tenureDuration changes
  useEffect(() => {
    const salary = parseFloat(staffLoanData.netSalary);
    const tenure = parseInt(staffLoanData.tenureDuration, 10);
    if (salary > 0 && tenure > 0) {
      const annualRate = 0.15;
      const monthlyRate = annualRate / 12;
      const pow = Math.pow(1 + monthlyRate, tenure);
      const factor = (pow - 1) / (monthlyRate * pow);
      const maxMonthlyRepayment = 0.7 * salary;
      const maxLoanVal = factor * maxMonthlyRepayment;
      setMaxAllowedLoan(maxLoanVal);
    } else {
      setMaxAllowedLoan(null);
    }
  }, [staffLoanData.netSalary, staffLoanData.tenureDuration]);

  // Update form if navigating from resume or with a selected product from dashboard
  useEffect(() => {
    if (location.state) {
      if (location.state.fromResume && location.state.loanDetails) {
        const resumeData = location.state.loanDetails;
        setStaffLoanData(prev => ({ ...prev, ...resumeData }));
        const step = determineStep(resumeData);
        setCurrentStep(step);
      } else if (location.state.selectedProduct) {
        setSelectedLoanProduct(location.state.selectedProduct);
        if (location.state.startStep) {
          setCurrentStep(location.state.startStep);
        }
      }
    }
  }, [location.state]);

  // Helper function to determine the correct step to resume from
  const determineStep = (loanDetails) => {
    let step = 3; // default to step 3 for resume
    if (
      !loanDetails.purpose ||
      (loanDetails.guarantorRequired && !loanDetails.guarantorId) ||
      !loanDetails.annualBasicSalary ||
      !loanDetails.approverId
    ) {
      step = 3;
    } else if (
      !loanDetails.currentOrSavingsAccount ||
      !loanDetails.securityDetails ||
      !loanDetails.supportingDocuments?.["Police Clearance"] ||
      !loanDetails.supportingDocuments?.["Agreement of Sale"]
    ) {
      step = 4;
    } else if (!loanDetails.termsAndConditionsAccepted || !loanDetails.loanAgreementAccepted) {
      step = 5;
    } else {
      step = 6;
    }
    return step < 3 ? 3 : step;
  };

  // Helper function to return the required supporting documents
  const getRequiredDocuments = () => {
    if (!selectedLoanProduct || !selectedLoanProduct.productType) return [];
    const type = selectedLoanProduct.productType;
    switch (type) {
      case 'PERSONAL_LOAN':
      case 'STAFF_GENERAL_LOAN':
        return [{ key: 'Quotation', label: 'Upload Quotation (Optional)', required: false }];
      case 'STAFF_SCHOOL_FEES_FACILITY':
        return [{ key: 'Invoice', label: 'Upload Invoice with Banking Details', required: true }];
      case 'STAFF_MOTOR_VEHICLE_LOAN':
        return [
          { key: 'Police Clearance', label: 'Upload Police Clearance', required: true },
          { key: 'Agreement of Sale', label: 'Upload Copy of Agreement of Sale', required: true },
          { key: 'Drivers Licence', label: 'Upload Copy of Drivers’ Licence', required: true },
          { key: 'Valuation Report', label: 'Upload Valuation Report', required: true },
          { key: 'VSD Report', label: 'Upload VSD Report', required: true },
          { key: 'Vehicle Registration', label: 'Upload Copy of Vehicle Registration Book', required: true }
        ];
      case 'STAFF_MORTGAGES':
        return [
          { key: 'Title Deed', label: 'Upload Title Deed', required: true },
          { key: 'Agreement of Sale', label: 'Upload Agreement of Sale', required: true }
        ];
      case 'PENSION_MORTGAGES':
        return [
          { key: 'Title Deed', label: 'Upload Title Deed', required: true },
          { key: 'Agreement of Sale', label: 'Upload Agreement of Sale', required: true }
        ];
      default:
        return [];
    }
  };

  // Handle updates to staffLoanData
  const handleChange = (field, value) => {
    setStaffLoanData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // For updating supporting document URLs from file upload (creates blob URL)
  const handleDocChange = (docType, file) => {
    const blobUrl = file ? URL.createObjectURL(file) : '';
    setStaffLoanData(prev => ({
      ...prev,
      supportingDocuments: { ...prev.supportingDocuments, [docType]: blobUrl }
    }));
    setErrors(prev => ({
      ...prev,
      supportingDocuments: { ...prev.supportingDocuments, [docType]: '' }
    }));
  };

  // Reset form function for new application
  const resetForm = () => {
    setCurrentStep(1);
    setApplicationId(null);
    setSelectedLoanProduct(null);
    setStaffLoanData({
      loanAmount: '',
      repaymentAccount: '',
      disbursementAccount: '',
      repaymentSchedule: '',
      currencyId: '',
      tenureDuration: '',
      netSalary: '',
      purpose: '',
      guarantorRequired: true,
      guarantorId: '',
      annualBasicSalary: '',
      approverId: '',
      loanAgreementAccepted: false,
      currentOrSavingsAccount: '',
      supportingDocuments: {},
      securityDetails: ''
    });
    setTermsAccepted(false);
    setErrors({});
    setRepaymentAccountManual(false);
    setDisbursementAccountManual(false);
    setMaxAllowedLoan(null);
  };

  // ---------- STEP 1: Select Loan Product ----------
  const submitStep1 = () => {
    if (!selectedLoanProduct) {
      setErrors(prev => ({ ...prev, step1: 'Please select a loan product.' }));
      return;
    }
    setErrors(prev => ({ ...prev, step1: '' }));
    setCurrentStep(2);
  };

  // ---------- STEP 2: Application Starts ----------
  const submitStep2 = async () => {
    if (
      !staffLoanData.currencyId ||
      !staffLoanData.netSalary ||
      !staffLoanData.tenureDuration ||
      !staffLoanData.loanAmount ||
      !staffLoanData.repaymentSchedule ||
      !staffLoanData.repaymentAccount ||
      !staffLoanData.disbursementAccount
    ) {
      setErrors(prev => ({ ...prev, step2: 'Please fill in all required fields.' }));
      return;
    }
    setErrors(prev => ({ ...prev, step2: '' }));
    try {
      const payload = {
        applicationId: applicationId,
        staffId: user.staffId || 1,
        loanProductId: selectedLoanProduct.id,
        currencyId: staffLoanData.currencyId,
        netSalary: parseFloat(staffLoanData.netSalary),
        tenureDuration: parseInt(staffLoanData.tenureDuration, 10),
        loanAmount: parseFloat(staffLoanData.loanAmount),
        repaymentSchedule: staffLoanData.repaymentSchedule,
        repaymentAccount: staffLoanData.repaymentAccount,
        disbursementAccount: staffLoanData.disbursementAccount
      };
      const response = await axios.put('http://10.132.229.140:8080/v1/api/staff-loans/step1', payload, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const newApplicationId = response?.data?.applicationId;
      setApplicationId(newApplicationId);
      localStorage.setItem('applicationId', newApplicationId);
      setCurrentStep(3);
    } catch (error) {
      console.error('Error submitting step 2:', error);
      setErrors(prev => ({ ...prev, step2: 'Failed to submit application. Please try again.' }));
    }
  };

  // ---------- STEP 3: Guarantor & Approver Selection ----------
  const submitStep3 = async () => {
    if (!staffLoanData.purpose) {
      setErrors(prev => ({ ...prev, step3: 'Please enter the purpose of the loan.' }));
      return;
    }
    if (staffLoanData.guarantorRequired && !staffLoanData.guarantorId) {
      setErrors(prev => ({ ...prev, step3: 'Please select a guarantor.' }));
      return;
    }
    if (!staffLoanData.annualBasicSalary || parseFloat(staffLoanData.annualBasicSalary) <= 0) {
      setErrors(prev => ({ ...prev, step3: 'Please enter a valid annual basic salary.' }));
      return;
    }
    if (!staffLoanData.approverId) {
      setErrors(prev => ({ ...prev, step3: 'Please select an approver.' }));
      return;
    }
    setErrors(prev => ({ ...prev, step3: '' }));
    try {
      const payload = {
        purpose: staffLoanData.purpose,
        guarantorRequired: staffLoanData.guarantorRequired,
        guarantorId: staffLoanData.guarantorRequired ? parseInt(staffLoanData.guarantorId, 10) : null,
        annualBasicSalary: parseFloat(staffLoanData.annualBasicSalary),
        approverId: parseInt(staffLoanData.approverId, 10)
      };
      const endpoint = `http://10.132.229.140:8080/v1/api/staff-loans/${applicationId}/step2`;
      const response = await axios.put(endpoint, payload, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (response.status === 200) {
        setCurrentStep(4);
      }
    } catch (error) {
      console.error('Error submitting step 3:', error);
      setErrors(prev => ({ ...prev, step3: 'Failed to submit guarantor/approver details. Please try again.' }));
    }
  };

  // ---------- STEP 4: Supporting Documents ----------
  const submitStep4 = async () => {
    if (!staffLoanData.currentOrSavingsAccount || !staffLoanData.securityDetails) {
      setErrors(prev => ({ ...prev, step4: 'Please fill in the current account and security details.' }));
      return;
    }
    const requiredDocs = getRequiredDocuments();
    for (let doc of requiredDocs) {
      if (doc.required && !staffLoanData.supportingDocuments[doc.key]) {
        setErrors(prev => ({ 
          ...prev, 
          step4: `Please upload ${doc.label.replace('Upload', '').replace('(Optional)', '').trim()}.` 
        }));
        return;
      }
    }
    setErrors(prev => ({ ...prev, step4: '' }));
    try {
      const payload = {
        loanAgreementAccepted: staffLoanData.loanAgreementAccepted,
        currentOrSavingsAccount: staffLoanData.currentOrSavingsAccount,
        supportingDocuments: staffLoanData.supportingDocuments,
        securityDetails: staffLoanData.securityDetails
      };
      const endpoint = `http://10.132.229.140:8080/v1/api/staff-loans/${applicationId}/step3`;
      const response = await axios.put(endpoint, payload, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (response.status === 200) {
        setCurrentStep(5);
      }
    } catch (error) {
      console.error('Error submitting step 4:', error);
      setErrors(prev => ({ ...prev, step4: 'Failed to submit supporting documents. Please try again.' }));
    }
  };

  // ---------- STEP 5: Terms and Conditions ----------
  const submitStep5 = async () => {
    if (!termsAccepted) {
      setErrors(prev => ({ ...prev, step5: 'You must accept the terms and conditions.' }));
      return;
    }
    setErrors(prev => ({ ...prev, step5: '' }));
    try {
      const endpoint = `http://10.132.229.140:8080/v1/api/staff-loans/${applicationId}/accept-terms?accepted=true`;
      const response = await axios.patch(endpoint, null, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (response.status === 200) {
        setStaffLoanData(prev => ({ ...prev, termsAndConditionsAccepted: true }));
        setCurrentStep(6);
      }
    } catch (error) {
      console.error('Error submitting step 5:', error);
      setErrors(prev => ({ ...prev, step5: 'Failed to submit terms acceptance. Please try again.' }));
    }
  };

  // ---------- STEP 6: Verification of Details ----------
  const finalizeSubmission = () => {
    setShowSuccessPopup(true);
  };

  // ---------- Render Popup ----------
  const renderSuccessPopup = () => (
    <div className="sla-popup-overlay">
      <div className="sla-popup">
        <h2>Congratulations!</h2>
        <p>Your loan application has been successfully submitted.</p>
        <div className="sla-popup-buttons">
          <button
            className="sla-gradient-button"
            onClick={() => {
              setShowSuccessPopup(false);
              navigate('/dashboard');
            }}
          >
            Back To Dashboard
          </button>
          <button
            className="sla-gradient-button"
            onClick={() => {
              setShowSuccessPopup(false);
              resetForm();
            }}
          >
            Apply for Another Loan
          </button>
        </div>
      </div>
    </div>
  );

  // ---------- RENDERING EACH STEP ----------

  const renderStep1 = () => (
    <div>
      <h2>Step 1: Select Loan Product</h2>
      <div className="sla-separator" />
      {errors.step1 && <p className="sla-error">{errors.step1}</p>}
      <div className="sla-form-group">
        <label htmlFor="loanProduct">Loan Product:</label>
        <select
          id="loanProduct"
          value={selectedLoanProduct?.id || ''}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            const found = loanProducts.find(lp => lp.id === val);
            setSelectedLoanProduct(found || null);
          }}
        >
          <option value="">Select a Staff Loan Product</option>
          {loanProducts.map(lp => (
            <option key={lp.id} value={lp.id}>
              {lp.name} - {lp.clientType}
            </option>
          ))}
        </select>
      </div>
      {selectedLoanProduct && (
        <div className="sla-product-details sla-animate">
          <p><strong>Name:</strong> {selectedLoanProduct.name}</p>
          <p><strong>Description:</strong> {selectedLoanProduct.description}</p>
          <p>
            <strong>Limits:</strong> {selectedLoanProduct.currencyCode}{' '}
            {Number(selectedLoanProduct.minAmount).toLocaleString()} - {selectedLoanProduct.currencyCode}{' '}
            {Number(selectedLoanProduct.maxAmount).toLocaleString()}
          </p>
        </div>
      )}
      <div className="sla-navigation-buttons">
        <button className="sla-gradient-button" onClick={submitStep1}>Next</button>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const selectedCurrency = currencies.find(c => c.id.toString() === staffLoanData.currencyId)?.code;
    const filteredAccounts = Object.entries(fetchedAccounts).filter(([currency, account]) => {
      return selectedCurrency ? currency === selectedCurrency : true;
    });

    return (
      <div>
        <h2>Step 2: Application Starts</h2>
        <div className="sla-separator" />
        {selectedLoanProduct && (
          <p>
            <strong>Selected Product:</strong> {selectedLoanProduct.name}
          </p>
        )}
        {errors.step2 && <p className="sla-error">{errors.step2}</p>}

        {/* Currency Selection */}
        <div className="sla-form-group">
          <label htmlFor="currency">Currency:</label>
          <select
            id="currency"
            value={staffLoanData.currencyId}
            onChange={(e) => handleChange('currencyId', e.target.value)}
          >
            <option value="">Select Currency</option>
            {currencies.map(currency => (
              <option key={currency.id} value={currency.id}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>
        </div>

        {/* Net Salary */}
        <div className="sla-form-group">
          <label htmlFor="netSalary">Net Salary:</label>
          <input
            type="number"
            id="netSalary"
            value={staffLoanData.netSalary}
            onChange={(e) => handleChange('netSalary', e.target.value)}
          />
        </div>

        {/* Tenure Duration */}
        <div className="sla-form-group">
          <label htmlFor="tenureDuration">Tenure (Months):</label>
          <input
            type="number"
            id="tenureDuration"
            value={staffLoanData.tenureDuration}
            onChange={(e) => handleChange('tenureDuration', e.target.value)}
          />
        </div>

        {/* Loan Amount */}
        <div className="sla-form-group">
          <label htmlFor="loanAmount">Loan Amount:</label>
          <input
            type="number"
            id="loanAmount"
            value={staffLoanData.loanAmount}
            onChange={(e) => {
              const { value } = e.target;
              if (value === '') {
                handleChange('loanAmount', '');
                return;
              }
              const num = parseFloat(value);
              if (maxAllowedLoan && num > maxAllowedLoan) {
                handleChange('loanAmount', maxAllowedLoan.toFixed(2));
              } else {
                handleChange('loanAmount', value);
              }
            }}
            max={maxAllowedLoan ? maxAllowedLoan.toFixed(2) : undefined}
          />
        </div>

        {/* Display maximum allowed */}
        {maxAllowedLoan !== null && (
          <p style={{ marginTop: '5px', fontStyle: 'italic' }}>
            Maximum allowed loan: {selectedCurrency || ''} {maxAllowedLoan.toFixed(2)}
          </p>
        )}

        {/* Repayment Schedule */}
        <div className="sla-form-group">
          <label htmlFor="repaymentSchedule">Repayment Schedule:</label>
          <select
            id="repaymentSchedule"
            value={staffLoanData.repaymentSchedule}
            onChange={(e) => handleChange('repaymentSchedule', e.target.value)}
          >
            <option value="">Select Repayment Schedule</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>

        {/* Repayment Account */}
        <div className="sla-form-group">
          <label htmlFor="repaymentAccount">Repayment Account:</label>
          {Object.keys(fetchedAccounts).length > 0 && !repaymentAccountManual ? (
            <select
              id="repaymentAccount"
              value={staffLoanData.repaymentAccount}
              onChange={(e) => {
                if (e.target.value === "manual") {
                  setRepaymentAccountManual(true);
                  handleChange('repaymentAccount', '');
                } else {
                  handleChange('repaymentAccount', e.target.value);
                }
              }}
            >
              <option value="">Select Repayment Account</option>
              {filteredAccounts.map(([currency, account]) => (
                <option key={currency} value={account}>
                  {currency}: {account}
                </option>
              ))}
              <option value="manual">Other (Enter manually)</option>
            </select>
          ) : (
            <input
              type="text"
              id="repaymentAccount"
              value={staffLoanData.repaymentAccount}
              onChange={(e) => handleChange('repaymentAccount', e.target.value)}
            />
          )}
        </div>

        {/* Disbursement Account */}
        <div className="sla-form-group">
          <label htmlFor="disbursementAccount">Disbursement Account:</label>
          {Object.keys(fetchedAccounts).length > 0 && !disbursementAccountManual ? (
            <select
              id="disbursementAccount"
              value={staffLoanData.disbursementAccount}
              onChange={(e) => {
                if (e.target.value === "manual") {
                  setDisbursementAccountManual(true);
                  handleChange('disbursementAccount', '');
                } else {
                  handleChange('disbursementAccount', e.target.value);
                }
              }}
            >
              <option value="">Select Disbursement Account</option>
              {filteredAccounts.map(([currency, account]) => (
                <option key={currency} value={account}>
                  {currency}: {account}
                </option>
              ))}
              <option value="manual">Other (Enter manually)</option>
            </select>
          ) : (
            <input
              type="text"
              id="disbursementAccount"
              value={staffLoanData.disbursementAccount}
              onChange={(e) => handleChange('disbursementAccount', e.target.value)}
            />
          )}
        </div>

        <div className="sla-navigation-buttons">
          <button className="sla-gradient-button" onClick={() => setCurrentStep(1)}>Previous</button>
          <button className="sla-gradient-button" onClick={submitStep2}>Next</button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div>
      <h2>Step 3: Guarantor & Approver Selection</h2>
      <div className="sla-separator" />
      {errors.step3 && <p className="sla-error">{errors.step3}</p>}
      <div className="sla-form-group">
        <label htmlFor="purpose">Purpose of Loan:</label>
        <input
          type="text"
          id="purpose"
          value={staffLoanData.purpose}
          onChange={(e) => handleChange('purpose', e.target.value)}
        />
      </div>
      <div className="sla-form-group">
        <label>Guarantor Required:</label>
        <label className="switch">
          <input
            type="checkbox"
            checked={staffLoanData.guarantorRequired}
            onChange={(e) => handleChange('guarantorRequired', e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
      </div>
      {staffLoanData.guarantorRequired && (
        <div className="sla-form-group">
          <label htmlFor="guarantor">Select Guarantor:</label>
          <select
            id="guarantor"
            value={staffLoanData.guarantorId}
            onChange={(e) => handleChange('guarantorId', e.target.value)}
          >
            <option value="">Select Guarantor</option>
            {guarantors.map(g => (
              <option key={g.id} value={g.id}>
                {g.firstName} {g.lastName}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="sla-form-group">
        <label htmlFor="annualBasicSalary">Annual Basic Salary:</label>
        <input
          type="number"
          id="annualBasicSalary"
          value={staffLoanData.annualBasicSalary}
          onChange={(e) => handleChange('annualBasicSalary', e.target.value)}
        />
      </div>
      <div className="sla-form-group">
        <label htmlFor="approverId">Select Approver:</label>
        <select
          id="approverId"
          value={staffLoanData.approverId}
          onChange={(e) => handleChange('approverId', e.target.value)}
        >
          <option value="">Select Approver</option>
          {approvers.map(a => (
            <option key={a.id} value={a.id}>
              {a.firstName} {a.lastName}
            </option>
          ))}
        </select>
      </div>
      <div className="sla-navigation-buttons">
        <button className="sla-gradient-button" onClick={() => setCurrentStep(2)}>Previous</button>
        <button className="sla-gradient-button" onClick={submitStep3}>Next</button>
      </div>
    </div>
  );

  const renderStep4 = () => {
    const requiredDocs = getRequiredDocuments();
    return (
      <div>
        <h2>Step 4: Supporting Documents</h2>
        <div className="sla-separator" />
        {errors.step4 && <p className="sla-error">{errors.step4}</p>}
        <div className="sla-form-group">
          <label>Accept Loan Agreement:</label>
          <label className="sla-custom-checkbox">
            <input
              type="checkbox"
              checked={staffLoanData.loanAgreementAccepted}
              onChange={(e) => handleChange('loanAgreementAccepted', e.target.checked)}
            />
            <span className="sla-checkbox-indicator"></span>
            <span className="sla-checkbox-text">Accepted</span>
          </label>
        </div>
        <div className="sla-form-group">
          <label htmlFor="currentOrSavingsAccount">Current/Savings Account:</label>
          <input
            type="text"
            id="currentOrSavingsAccount"
            value={staffLoanData.currentOrSavingsAccount}
            onChange={(e) => handleChange('currentOrSavingsAccount', e.target.value)}
          />
        </div>
        {requiredDocs.map(doc => (
          <div className="sla-form-group" key={doc.key}>
            <label htmlFor={doc.key}>{doc.label}:</label>
            <input
              type="file"
              id={doc.key}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleDocChange(doc.key, file);
                }
              }}
            />
          </div>
        ))}
        <div className="sla-form-group">
          <label htmlFor="securityDetails">Security Details:</label>
          <textarea
            id="securityDetails"
            value={staffLoanData.securityDetails}
            onChange={(e) => handleChange('securityDetails', e.target.value)}
          />
        </div>
        <div className="sla-navigation-buttons">
          <button className="sla-gradient-button" onClick={() => setCurrentStep(3)}>Previous</button>
          <button className="sla-gradient-button" onClick={submitStep4}>Next</button>
        </div>
      </div>
    );
  };

  const renderStep5 = () => (
    <div>
      <h2>Step 5: Terms and Conditions</h2>
      <div className="sla-separator" />
      {errors.step5 && <p className="sla-error">{errors.step5}</p>}
      <div
        className="sla-terms-content"
        style={{ height: '200px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}
      >
        <h3>Terms and Conditions</h3>
        <p>
          These are the dummy terms and conditions. Please read and accept the conditions to continue with your application.
        </p>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam a dui nec metus feugiat cursus.</p>
      </div>
      <div className="sla-form-group">
        <label className="sla-custom-checkbox">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span className="sla-checkbox-indicator"></span>
          <span className="sla-checkbox-text">I accept the terms and conditions.</span>
        </label>
      </div>
      <div className="sla-navigation-buttons">
        <button className="sla-gradient-button" onClick={() => setCurrentStep(4)}>Previous</button>
        <button className="sla-gradient-button" onClick={submitStep5} disabled={!termsAccepted}>Next</button>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div>
      <h2>Step 6: Verification of Details</h2>
      <div className="sla-separator" />
      <div className="sla-review-section">
        <h3>
          Loan Product Information
          <button className="sla-edit-btn" onClick={() => setCurrentStep(1)}>Edit</button>
        </h3>
        <hr className="sla-separator" />
        <p><strong>Product:</strong> {selectedLoanProduct?.name || 'N/A'}</p>
        {selectedLoanProduct && (
          <>
            <p><strong>Description:</strong> {selectedLoanProduct.description}</p>
            <p>
              <strong>Amount:</strong> {selectedLoanProduct.currencyCode}{' '}
              {Number(selectedLoanProduct.minAmount).toLocaleString()} - {selectedLoanProduct.currencyCode}{' '}
              {Number(selectedLoanProduct.maxAmount).toLocaleString()}
            </p>
          </>
        )}
      </div>
      <div className="sla-review-section">
        <h3>
          Application Details
          <button className="sla-edit-btn" onClick={() => setCurrentStep(2)}>Edit</button>
        </h3>
        <hr className="sla-separator" />
        <p><strong>Loan Amount:</strong> {staffLoanData.loanAmount}</p>
        <p><strong>Tenure (Months):</strong> {staffLoanData.tenureDuration}</p>
        <p><strong>Repayment Account:</strong> {staffLoanData.repaymentAccount}</p>
        <p><strong>Disbursement Account:</strong> {staffLoanData.disbursementAccount}</p>
        <p><strong>Repayment Schedule:</strong> {staffLoanData.repaymentSchedule}</p>
        <p><strong>Currency ID:</strong> {staffLoanData.currencyId}</p>
      </div>
      <div className="sla-review-section">
        <h3>
          Guarantor & Approver Details
          <button className="sla-edit-btn" onClick={() => setCurrentStep(3)}>Edit</button>
        </h3>
        <hr className="sla-separator" />
        <p><strong>Purpose:</strong> {staffLoanData.purpose}</p>
        <p><strong>Guarantor Required:</strong> {staffLoanData.guarantorRequired ? 'Yes' : 'No'}</p>
        {staffLoanData.guarantorRequired && (
          <p>
            <strong>Guarantor:</strong>{' '}
            {guarantors.find(g => g.id === parseInt(staffLoanData.guarantorId, 10))
              ? `${guarantors.find(g => g.id === parseInt(staffLoanData.guarantorId, 10)).firstName} ${guarantors.find(g => g.id === parseInt(staffLoanData.guarantorId, 10)).lastName}`
              : ''}
          </p>
        )}
        <p><strong>Annual Basic Salary:</strong> {staffLoanData.annualBasicSalary}</p>
        <p>
          <strong>Approver:</strong>{' '}
          {approvers.find(a => a.id === parseInt(staffLoanData.approverId, 10))
            ? `${approvers.find(a => a.id === parseInt(staffLoanData.approverId, 10)).firstName} ${approvers.find(a => a.id === parseInt(staffLoanData.approverId, 10)).lastName}`
            : ''}
        </p>
      </div>
      <div className="sla-review-section">
        <h3>
          Supporting Documents
        </h3>
        <hr className="sla-separator" />
        <table>
          <thead>
            <tr>
              <th>Document Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(staffLoanData.supportingDocuments).map(key => (
              <tr key={key}>
                <td>{key}</td>
                <td>{staffLoanData.supportingDocuments[key] ? '✓' : '✗'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p><strong>Current/Savings Account:</strong> {staffLoanData.currentOrSavingsAccount}</p>
        <p><strong>Security Details:</strong> {staffLoanData.securityDetails}</p>
      </div>
      <div className="sla-navigation-buttons">
        <button className="sla-gradient-button" onClick={() => setCurrentStep(5)}>Previous</button>
        <button className="sla-gradient-button" onClick={finalizeSubmission}>Finalize Submission</button>
      </div>
    </div>
  );

  const renderStepsIndicator = () => {
    const steps = [
      'Select Loan Product',
      'Application Starts',
      'Guarantor & Approver',
      'Supporting Documents',
      'Terms & Conditions',
      'Verification'
    ];
    return (
      <div className="sla-steps-indicator" role="navigation" aria-label="Staff Loan Application Steps">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          return (
            <div
              key={index}
              className={`sla-step-circle ${isActive ? 'sla-active' : ''} ${isCompleted ? 'sla-completed' : ''}`}
              onClick={() => { if (stepNumber < currentStep) setCurrentStep(stepNumber); }}
              role="button"
              tabIndex={0}
              aria-label={`Step ${stepNumber}: ${step}`}
            >
              {stepNumber}
            </div>
          );
        })}
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return <p>Invalid Step</p>;
    }
  };

  return (
    <div className="sla-application-form">
      <h1 className="sla-application-title">Staff Loan Application</h1>
      <hr />
      <div className="sla-header-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {renderStepsIndicator()}
        {selectedLoanProduct && (
          <div className="sla-selected-product">
            <p><strong>Selected Product:</strong> {selectedLoanProduct.name}</p>
          </div>
        )}
      </div>
      <div className="sla-separator" />
      <div className="sla-form-content">
        {renderCurrentStep()}
      </div>
      {isUploadingDocuments && (
        <div className="sla-uploading-overlay">
          Uploading documents...
        </div>
      )}
      {showSuccessPopup && renderSuccessPopup()}
    </div>
  );
};

export default StaffLoanApplicationForm;
