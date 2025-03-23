// src/data/loanProductsData.js

const loanProducts = {
    INDIVIDUAL: [
      {
        title: 'Personal Loan',
        description: 'Flexible personal loans to meet your individual needs.',
        terms: 'Terms and conditions for Personal Loan...',
        creditScoreRequired: 650,
      },
      {
        title: 'Overdrafts',
        description: 'Access extra funds when you need them most.',
        terms: 'Terms and conditions for Overdrafts...',
        creditScoreRequired: 600,
      },
      {
        title: 'Lease Hire Facility',
        description: 'Affordable leasing options for your personal assets.',
        terms: 'Terms and conditions for Lease Hire Facility...',
        creditScoreRequired: 620,
      },
      {
        title: 'Mortgage',
        description: 'Secure mortgage options for your dream home.',
        terms: 'Terms and conditions for Mortgage...',
        creditScoreRequired: 700,
        subProducts: [
          'Fixed Rate Mortgage',
          'Adjustable Rate Mortgage',
          'Interest-Only Mortgage',
        ],
      },
      {
        title: 'Nano Loans',
        description: 'Small loans designed for quick financial needs.',
        terms: 'Terms and conditions for Nano Loans...',
        creditScoreRequired: 580,
      },
      {
        title: 'Microfinance',
        description: 'Support for small-scale financial activities.',
        terms: 'Terms and conditions for Microfinance...',
        creditScoreRequired: 600,
      },
    ],
    SME: [
      {
        title: 'Overdrafts',
        description: 'Flexible overdraft solutions for your business.',
        terms: 'Terms and conditions for SME Overdrafts...',
        creditScoreRequired: 680,
      },
      {
        title: 'Lease Hire Facility',
        description: 'Leasing options tailored for SMEs.',
        terms: 'Terms and conditions for SME Lease Hire Facility...',
        creditScoreRequired: 670,
      },
      {
        title: 'Guarantees',
        description: 'Protect your business with our guarantee services.',
        terms: 'Terms and conditions for Guarantees...',
        creditScoreRequired: 700,
        subProducts: [
          'General Bank Guarantee',
          'Advance Payment Guarantee',
          'Performance Guarantee',
          'Bid Bonds',
        ],
      },
      {
        title: 'Mortgage',
        description: 'Commercial mortgage solutions for your business premises.',
        terms: 'Terms and conditions for SME Mortgage...',
        creditScoreRequired: 720,
      },
      {
        title: 'Order Financing',
        description: 'Finance your orders with ease.',
        terms: 'Terms and conditions for Order Financing...',
        creditScoreRequired: 650,
      },
      {
        title: 'Invoice Discounting',
        description: 'Improve cash flow by discounting your invoices.',
        terms: 'Terms and conditions for Invoice Discounting...',
        creditScoreRequired: 660,
      },
    ],
    CORPORATE: [
      {
        title: 'Business Loan',
        description: 'Comprehensive loans to fuel your corporate growth.',
        terms: 'Terms and conditions for Business Loan...',
        creditScoreRequired: 750,
      },
      {
        title: 'Revolving Loan',
        description: 'Flexible revolving credit facilities for ongoing needs.',
        terms: 'Terms and conditions for Revolving Loan...',
        creditScoreRequired: 730,
      },
      {
        title: 'Overdrafts',
        description: 'Enhanced overdraft options for large-scale operations.',
        terms: 'Terms and conditions for Corporate Overdrafts...',
        creditScoreRequired: 720,
      },
      {
        title: 'Lease Hire Facility',
        description: 'Corporate leasing solutions for business assets.',
        terms: 'Terms and conditions for Corporate Lease Hire Facility...',
        creditScoreRequired: 710,
      },
      {
        title: 'Guarantees',
        description: 'Robust guarantee services for corporate security.',
        terms: 'Terms and conditions for Corporate Guarantees...',
        creditScoreRequired: 740,
        subProducts: [
          'General Bank Guarantee',
          'Advance Payment Guarantee',
          'Performance Guarantee',
          'Bid Bonds',
        ],
      },
      {
        title: 'Mortgage',
        description: 'Corporate mortgage options for expansive business needs.',
        terms: 'Terms and conditions for Corporate Mortgage...',
        creditScoreRequired: 760,
      },
      {
        title: 'Order Financing',
        description: 'Streamline your order processes with our financing options.',
        terms: 'Terms and conditions for Corporate Order Financing...',
        creditScoreRequired: 720,
      },
      {
        title: 'Invoice Discounting',
        description: 'Optimize your cash flow with invoice discounting.',
        terms: 'Terms and conditions for Corporate Invoice Discounting...',
        creditScoreRequired: 730,
      },
    ],
  };
  
  export default loanProducts;
  