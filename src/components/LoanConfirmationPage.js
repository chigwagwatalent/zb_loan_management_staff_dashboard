// src/components/LoanConfirmationPage.js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas';
import { useParams } from 'react-router-dom';
import './LoanConfirmationPage.css';

const LoanConfirmationPage = () => {
  // Capture the loanId from the URL (e.g. /director-confirmation/33)
  const { loanId } = useParams();

  // State for loan details
  const [loanDetails, setLoanDetails] = useState(null);

  // State for director confirmation data
  const [directorData, setDirectorData] = useState({
    position: '',
    directorName: '',
    directorEmail: '',
  });

  // Reference for the signature canvas
  const sigCanvas = useRef(null);

  // Fetch loan details using the loanId from the route
  const fetchLoanDetails = async () => {
    if (!loanId) {
      alert("No loan ID provided in the URL.");
      return;
    }
    try {
      const response = await axios.get(`http://localhost:8080/v1/api/corporate-loans/loan-details/by-loan/${loanId}`);
      setLoanDetails(response.data);
    } catch (error) {
      console.error('Error fetching loan details:', error);
      alert('Error fetching loan details.');
    }
  };

  // Fetch the loan details when the component mounts
  useEffect(() => {
    fetchLoanDetails();
  }, [loanId]);

  // Submit the director confirmation
  const handleSubmit = async () => {
    // Capture signature as Data URL (simulated signature file path)
    const signaturePath = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
    const payload = {
      companyDetailsId:
        loanDetails &&
        loanDetails.companyDetails &&
        loanDetails.companyDetails[0] &&
        loanDetails.companyDetails[0].id
          ? loanDetails.companyDetails[0].id
          : 0,
      loanApplicationId: Number(loanId),
      position: directorData.position,
      directorName: directorData.directorName,
      directorEmail: directorData.directorEmail,
      signaturePath: signaturePath,
      applicant: false,
    };

    try {
      await axios.post('http://localhost:8080/v1/api/corporate-loans/director-signature/add', payload);
      alert('Confirmation submitted successfully.');
    } catch (error) {
      console.error('Error submitting director confirmation:', error);
      alert('Error submitting confirmation.');
    }
  };

  // Auto-scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="loan-confirmation-page">
      <div className="loan-details-container">
        {loanDetails ? (
          <div className="loan-info">
            <h2>Loan Details</h2>
            <p><strong>Loan ID:</strong> {loanDetails.loanId}</p>
            <p><strong>Business Account Number:</strong> {loanDetails.businessAccountNumber}</p>
            <p><strong>Requested Loan Amount:</strong> {loanDetails.requestedLoanAmount}</p>
            <p><strong>Purpose of Loan:</strong> {loanDetails.purposeOfLoan}</p>
            <p><strong>Loan Product Code:</strong> {loanDetails.loanProductCode}</p>
            <p><strong>Status:</strong> {loanDetails.status}</p>
            {loanDetails.companyDetails && loanDetails.companyDetails.length > 0 && (
              <div className="company-info">
                <h3>Company Details</h3>
                <p><strong>Company Name:</strong> {loanDetails.companyDetails[0].companyName}</p>
                <p><strong>Registration Number:</strong> {loanDetails.companyDetails[0].registrationNumber}</p>
                <p><strong>Tax ID:</strong> {loanDetails.companyDetails[0].taxId}</p>
                <p><strong>Industry:</strong> {loanDetails.companyDetails[0].industry}</p>
                <p><strong>Website:</strong> {loanDetails.companyDetails[0].website}</p>
                <p><strong>Address:</strong> {loanDetails.companyDetails[0].address}</p>
                <p><strong>Contact Person:</strong> {loanDetails.companyDetails[0].contactPerson}</p>
                <p><strong>Contact Email:</strong> {loanDetails.companyDetails[0].contactEmail}</p>
                <p><strong>Contact Phone:</strong> {loanDetails.companyDetails[0].contactPhone}</p>
              </div>
            )}
          </div>
        ) : (
          <p>Loading loan details...</p>
        )}
        <div className="director-response">
          <h2>Confirm Loan Details</h2>
          <div className="form-group">
            <label>Position:</label>
            <input
              type="text"
              value={directorData.position}
              onChange={(e) => setDirectorData({ ...directorData, position: e.target.value })}
              placeholder="Your Position"
            />
          </div>
          <div className="form-group">
            <label>Director Name:</label>
            <input
              type="text"
              value={directorData.directorName}
              onChange={(e) => setDirectorData({ ...directorData, directorName: e.target.value })}
              placeholder="Your Name"
            />
          </div>
          <div className="form-group">
            <label>Director Email:</label>
            <input
              type="email"
              value={directorData.directorEmail}
              onChange={(e) => setDirectorData({ ...directorData, directorEmail: e.target.value })}
              placeholder="Your Email"
            />
          </div>
          <div className="form-group">
            <label>Signature:</label>
            <SignatureCanvas penColor="black" canvasProps={{ className: 'signature-canvas' }} ref={sigCanvas} />
            <button type="button" onClick={() => sigCanvas.current.clear()}>
              Clear Signature
            </button>
          </div>
          <button className="submit-button" onClick={handleSubmit}>
            Submit Confirmation
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoanConfirmationPage;
