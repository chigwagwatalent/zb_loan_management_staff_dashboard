// src/components/LoanChat.js
import React, { useState, useEffect, useRef, useContext } from 'react';
import { FaPaperPlane, FaQuestionCircle, FaTimes, FaCheck, FaPencilAlt } from 'react-icons/fa';
import './LoanChat.css';
import axios from 'axios';
import { UserContext } from '../contexts/UserContext';

const initialConversations = [
  {
    id: 1,
    name: 'Support',
    active: true,
    notifications: ['New loan update available'],
    messages: [
      {
        id: 1,
        sender: 'support',
        text: 'Welcome to LoanChat! How can we help you today?',
        timestamp: new Date().toLocaleTimeString(),
      },
    ],
  },
  {
    id: 2,
    name: 'Loan Updates',
    active: false,
    notifications: [],
    messages: [
      {
        id: 1,
        sender: 'system',
        text: 'Your loan application updates will appear here.',
        timestamp: new Date().toLocaleTimeString(),
      },
    ],
  },
];

const LoanChat = () => {
  const { user } = useContext(UserContext);
  const [conversations, setConversations] = useState(initialConversations);
  const [activeChat, setActiveChat] = useState(
    initialConversations.find((conv) => conv.active)
  );
  const [newMsg, setNewMsg] = useState('');
  const [faqOpen, setFaqOpen] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  const messagesEndRef = useRef(null);
  // Ref to store previous loan status for comparison
  const loanStatusPrevRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat]);

  // Fetch client details for personalization
  useEffect(() => {
    if (!user || !user.clientId) return;
    const fetchClientDetails = async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:8080/v1/api/clients/${user.clientId}/details`
        );
        setClientDetails(data);
      } catch (error) {
        console.error('Error fetching client details:', error);
      }
    };
    fetchClientDetails();
  }, [user]);

  // Poll the loan status endpoint to fetch updates.
  // When the status changes, if the status is APPROVED then fetch the loan schedule info
  // from the loan schedule endpoint and generate a full system message.
  // Otherwise, generate a message from the status endpoint.
  useEffect(() => {
    const pollLoanStatus = async () => {
      if (!user || !user.applicationId) return;
      try {
        const { data } = await axios.get(
          `http://localhost:8080/v1/api/loan-applications/status/${user.applicationId}`
        );
        // If status has changed compared to last poll...
        if (loanStatusPrevRef.current !== data.status) {
          loanStatusPrevRef.current = data.status;
          let messageText = '';
          // If approved, fetch the loan schedule details
          if (data.status === 'APPROVED') {
            try {
              const { data: scheduleData } = await axios.get(
                `http://localhost:8080/v1/api/loan-applications/loan-schedule/${user.clientId}`
              );
              messageText = generateNotificationMessage(scheduleData);
            } catch (error) {
              console.error('Error fetching loan schedule in LoanChat:', error);
              messageText = generateNotificationMessage(data);
            }
          } else {
            messageText = generateNotificationMessage(data);
          }
          const newMessage = {
            id: Date.now(),
            sender: 'system',
            text: messageText,
            timestamp: new Date().toLocaleTimeString(),
          };
          // Update the "Loan Updates" conversation (id: 2) by appending the system message and notification.
          setConversations((prevConversations) =>
            prevConversations.map((conv) => {
              if (conv.id === 2) {
                return {
                  ...conv,
                  messages: [...conv.messages, newMessage],
                  notifications: [...conv.notifications, messageText],
                };
              }
              return conv;
            })
          );
        }
      } catch (error) {
        console.error('Error fetching loan status in LoanChat:', error);
      }
    };

    const intervalId = setInterval(pollLoanStatus, 10000); // Poll every 10 seconds
    return () => clearInterval(intervalId);
  }, [user, clientDetails]);

  // Generate a full message based on the returned loan information.
  // For schedule responses (approved loans) the data is expected to include schedule details.
  const generateNotificationMessage = (data) => {
    const clientName = clientDetails?.name || 'Client';
    // Check if schedule data is present (loanNumber exists)
    if (data.loanNumber) {
      return `Dear ${clientName}, congratulations! Your loan (${data.loanNumber}) is approved. Your next payment of $${data.scheduledPayment.toFixed(2)} is scheduled for ${new Date(data.paymentDate).toLocaleDateString()}.`;
    }
    // Otherwise, use the status update message as before
    // Use loan information from the endpoint, or fallback to user details
    const loanProduct = data.loanProduct || user?.loanProduct || 'Personal Loan';
    const amount = data.requestedAmount
      ? `$${data.requestedAmount}`
      : user?.loanAmount
      ? `$${user.loanAmount}`
      : '$000';
    const tenure = data.tenure || user?.tenure || '';
    const comments = data.comments || '';

    switch (data.status) {
      case 'SUBMITTED':
        return `Dear ${clientName}, your application for a ${loanProduct} of ${amount}${
          tenure ? ` (Tenure: ${tenure})` : ''
        } has been submitted. We are processing your application.`;
      case 'UNDER_REVIEW':
        return `Dear ${clientName}, your application for a ${loanProduct} of ${amount}${
          tenure ? ` (Tenure: ${tenure})` : ''
        } is under review. Please await further updates.`;
      case 'ESCALATE':
        return `Dear ${clientName}, your application for a ${loanProduct} of ${amount}${
          tenure ? ` (Tenure: ${tenure})` : ''
        } has been escalated for further evaluation. ${comments ? `Comments: ${comments}` : ''}`;
      case 'APPROVED':
        // In case schedule info wasn't fetched, fallback:
        return `Dear ${clientName}, congratulations! Your application for a ${loanProduct} of ${amount}${
          tenure ? ` (Tenure: ${tenure})` : ''
        } has been approved. ${comments ? `Comments: ${comments}` : ''}`;
      case 'REJECTED':
        return `Dear ${clientName}, we regret to inform you that your application for a ${loanProduct} of ${amount}${
          tenure ? ` (Tenure: ${tenure})` : ''
        } has been rejected. ${comments ? `Comments: ${comments}` : ''}`;
      case 'DISBURSED':
        return `Dear ${clientName}, your loan amount of ${amount} for the ${loanProduct}${
          tenure ? ` (Tenure: ${tenure})` : ''
        } has been disbursed successfully.`;
      case 'ON_HOLD':
        return `Dear ${clientName}, your application for a ${loanProduct} of ${amount}${
          tenure ? ` (Tenure: ${tenure})` : ''
        } is currently on hold. ${comments ? `Comments: ${comments}` : ''}`;
      case 'CLOSED':
        return `Dear ${clientName}, your application for a ${loanProduct} of ${amount}${
          tenure ? ` (Tenure: ${tenure})` : ''
        } is now closed. Thank you for choosing our services.`;
      default:
        return `Dear ${clientName}, there is an update on your application for a ${loanProduct} of ${amount}. ${comments ? `Comments: ${comments}` : ''}`;
    }
  };

  // Simulate a reply from support after a short delay.
  const simulateReply = () => {
    setTimeout(() => {
      const reply = {
        id: Date.now(),
        sender: activeChat.name === 'Support' ? 'support' : 'system',
        text:
          activeChat.name === 'Support'
            ? 'Thank you for your message. We are here to help.'
            : 'Your loan update has been received.',
        timestamp: new Date().toLocaleTimeString(),
      };
      setConversations((prevConversations) =>
        prevConversations.map((conv) =>
          conv.id === activeChat.id
            ? { ...conv, messages: [...conv.messages, reply] }
            : conv
        )
      );
    }, 1500);
  };

  // Handle sending a message from the user
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMsg.trim() === '') return;
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: newMsg,
      timestamp: new Date().toLocaleTimeString(),
    };
    setConversations((prevConversations) =>
      prevConversations.map((conv) =>
        conv.id === activeChat.id
          ? { ...conv, messages: [...conv.messages, userMsg] }
          : conv
      )
    );
    setNewMsg('');
    simulateReply();
  };

  const handleSelectConversation = (conv) => {
    setActiveChat(conv);
  };

  const faqs = [
    {
      question: 'What are the steps to complete my loan application?',
      answer: 'The steps are: Loan Details, Next of Kin, Assets, KYC & Terms Acceptance.',
    },
    {
      question: 'How can I check my loan status?',
      answer: 'You can view your running loans and application status from your dashboard.',
    },
    {
      question: 'When is my next payment due?',
      answer: 'The next payment due date is displayed on your dashboard calendar.',
    },
  ];

  return (
    <div className="lc-container">
      <header className="lc-header">
        <h1>LoanChat</h1>
        <FaQuestionCircle className="lc-header-icon" />
      </header>

      <div className="lc-content">
        <div className="lc-sidebar">
          <div className="lc-chat-list">
            <h2>Chats</h2>
            <ul>
              {conversations.map((conv) => (
                <li
                  key={conv.id}
                  className={activeChat.id === conv.id ? 'lc-active' : ''}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <span className="lc-chat-name">{conv.name}</span>
                  {conv.notifications && conv.notifications.length > 0 && (
                    <span className="lc-notification-count">
                      {conv.notifications.length}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Replace "Step Updates" with "Loan Updates" */}
          <div className="lc-notifications-panel">
            <h2>Loan Updates</h2>
            <ul>
              {activeChat.notifications && activeChat.notifications.length > 0 ? (
                activeChat.notifications.map((note, idx) => (
                  <li key={idx} className="notification-item">
                    {note}
                  </li>
                ))
              ) : (
                <li>No new updates</li>
              )}
            </ul>
          </div>
        </div>

        <div className="lc-window">
          <div className="lc-messages">
            {activeChat.messages.map((msg) => (
              <div key={msg.id} className={`lc-message lc-${msg.sender}`}>
                <div className="message-content">
                  <p>{msg.text}</p>
                  <span className="lc-timestamp">{msg.timestamp}</span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form className="lc-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Type your message here..."
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
            />
            <button type="submit">
              <FaPaperPlane />
            </button>
          </form>
        </div>
      </div>

      <section className="lc-faq-section">
        <h2>Frequently Asked Questions</h2>
        {faqs.map((faq, index) => (
          <div className="lc-faq-item" key={index}>
            <div
              className="lc-faq-question"
              onClick={() => setFaqOpen(faqOpen === index ? null : index)}
            >
              <h3>{faq.question}</h3>
            </div>
            {faqOpen === index && <p className="lc-faq-answer">{faq.answer}</p>}
          </div>
        ))}
      </section>
    </div>
  );
};

export default LoanChat;
