import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Create the UserContext
export const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {
  const navigate = useNavigate();

  // Initialize user state from localStorage if available
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // State to track sessionToken
  const [sessionToken, setSessionToken] = useState(() => {
    const storedToken = localStorage.getItem('sessionToken');
    return storedToken ? storedToken : null;
  });

  // State to track if the popup has been seen in the current session
  const [hasSeenPopup, setHasSeenPopup] = useState(() => {
    const seenPopup = sessionStorage.getItem('hasSeenPopup');
    return seenPopup ? JSON.parse(seenPopup) : false;
  });

  // Fetch the current user when the component mounts or sessionToken changes
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!sessionToken || user) {
        return;
      }

      try {
        // Set the Authorization header for axios with 'Bearer ' prefix
        axios.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`;

        // Fetch the current user data from the API
        const response = await axios.get(
          'http://localhost:8080/v1/api/clients/current-user'
        );

        // Update the user state with the fetched data
        setUser(response.data);

        // Store the user data in localStorage
        localStorage.setItem('user', JSON.stringify(response.data));

        // Reset hasSeenPopup to false on initial fetch
        setHasSeenPopup(false);

        // Remove hasSeenPopup from sessionStorage to ensure popup shows on Dashboard
        sessionStorage.removeItem('hasSeenPopup');
      } catch (error) {
        console.error('Error fetching current user:', error);
        // Handle error, e.g., clear the user data and token
        setUser(null);
        setSessionToken(null);
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('user');
        // Remove Authorization header
        delete axios.defaults.headers.common['Authorization'];
        // Optionally, navigate to login if unauthorized
        if (error.response && error.response.status === 401) {
          navigate('/login');
        }
      }
    };

    fetchCurrentUser();
  }, [sessionToken, user, navigate]);

  // Function to handle user login
  const loginUser = (userData, token) => {
    try {
      // Set the token in localStorage
      localStorage.setItem('sessionToken', token);
      setSessionToken(token);

      // Set the Authorization header for axios with 'Bearer ' prefix
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Update the user state
      setUser(userData);

      // Store the user data in localStorage
      localStorage.setItem('user', JSON.stringify(userData));

      // Reset hasSeenPopup to false on login
      setHasSeenPopup(false);

      // Remove hasSeenPopup from sessionStorage to show popup on Dashboard
      sessionStorage.removeItem('hasSeenPopup');
    } catch (error) {
      console.error('Error during login:', error);
      // Optionally, handle login errors here
    }
  };

  // Function to handle user logout
  const logoutUser = async () => {
    try {
      if (!sessionToken) {
        console.error('No session token available for logout.');
        setUser(null);
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }

      // Send POST request to logout endpoint with Authorization header
      await axios.post(
        'http://localhost:8080/v1/api/client-logout',
        {},
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        }
      );

      console.log('Logout successful.');

      // Remove token and user data from localStorage
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('user');

      // Remove the Authorization header
      delete axios.defaults.headers.common['Authorization'];

      // Set user state to null and sessionToken to null
      setUser(null);
      setSessionToken(null);

      // Reset hasSeenPopup on logout
      setHasSeenPopup(false);

      // Clear sessionStorage to remove any session-specific flags
      sessionStorage.clear();

      // Redirect to login page
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still perform the logout locally to ensure state is cleared
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setSessionToken(null);
      setHasSeenPopup(false);
      navigate('/login');
    }
  };

  // Function to handle setting hasSeenPopup
  const setHasSeenPopupFlag = () => {
    setHasSeenPopup(true);
    sessionStorage.setItem('hasSeenPopup', 'true');
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        loginUser,
        logoutUser,
        sessionToken,
        hasSeenPopup,
        setHasSeenPopup,
        setHasSeenPopupFlag,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
