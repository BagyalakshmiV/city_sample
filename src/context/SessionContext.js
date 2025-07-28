import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest, tokenRequest } from '../config/authConfig';

const SessionContext = createContext();

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export const SessionProvider = ({ children }) => {
  const { instance, accounts, inProgress } = useMsal();
  const [sessionData, setSessionData] = useState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
    sessionExpiry: null,
  });
  const [tokenRefreshTimer, setTokenRefreshTimer] = useState(null);

  // Check if user is authenticated
  const isAuthenticated = accounts && accounts.length > 0;

  // Get access token with automatic refresh
  const getAccessToken = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated) {
      return null;
    }

    try {
      const request = {
        ...tokenRequest,
        account: accounts[0],
        forceRefresh
      };

      const response = await instance.acquireTokenSilent(request);
      
      // Update session data
      setSessionData(prev => ({
        ...prev,
        accessToken: response.accessToken,
        sessionExpiry: new Date(response.expiresOn),
      }));

      return response.accessToken;
    } catch (error) {
      console.error('Token acquisition failed:', error);
      
      // If silent token acquisition fails, try interactive
      try {
        const response = await instance.acquireTokenPopup(loginRequest);
        setSessionData(prev => ({
          ...prev,
          accessToken: response.accessToken,
          sessionExpiry: new Date(response.expiresOn),
        }));
        return response.accessToken;
      } catch (interactiveError) {
        console.error('Interactive token acquisition failed:', interactiveError);
        return null;
      }
    }
  }, [instance, accounts, isAuthenticated]);

  // Refresh token before expiry
  const scheduleTokenRefresh = useCallback((expiryTime) => {
    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer);
    }

    // Refresh 5 minutes before expiry
    const refreshTime = expiryTime.getTime() - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      const timer = setTimeout(async () => {
        console.log('Refreshing token...');
        await getAccessToken(true);
      }, refreshTime);
      
      setTokenRefreshTimer(timer);
    }
  }, [getAccessToken, tokenRefreshTimer]);

  // Fetch user information
  const fetchUserInfo = useCallback(async () => {
    if (!isAuthenticated) {
      return null;
    }

    try {
      const token = await getAccessToken();
      if (!token) return null;

      const response = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setSessionData(prev => ({
          ...prev,
          user: userData,
        }));
        return userData;
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
    return null;
  }, [isAuthenticated, getAccessToken]);

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      setSessionData(prev => ({ ...prev, isLoading: true }));
      
      if (isAuthenticated) {
        const token = await getAccessToken();
        const user = await fetchUserInfo();
        
        setSessionData(prev => ({
          ...prev,
          isAuthenticated: true,
          user,
          accessToken: token,
          isLoading: false,
        }));

        // Schedule token refresh if we have expiry time
        if (prev.sessionExpiry) {
          scheduleTokenRefresh(prev.sessionExpiry);
        }
      } else {
        setSessionData(prev => ({
          ...prev,
          isAuthenticated: false,
          user: null,
          accessToken: null,
          isLoading: false,
          sessionExpiry: null,
        }));
      }
    };

    if (inProgress === 'none') {
      initializeSession();
    }
  }, [isAuthenticated, inProgress, getAccessToken, fetchUserInfo, scheduleTokenRefresh]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer);
      }
    };
  }, [tokenRefreshTimer]);

  // Login function
  const login = useCallback(async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [instance]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer);
        setTokenRefreshTimer(null);
      }
      
      setSessionData({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        sessionExpiry: null,
      });

      await instance.logoutPopup({
        postLogoutRedirectUri: window.location.origin,
        mainWindowRedirectUri: window.location.origin
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [instance, tokenRefreshTimer]);

  // Make authenticated API request
  const makeAuthenticatedRequest = useCallback(async (url, options = {}) => {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }, [getAccessToken]);

  const value = {
    ...sessionData,
    login,
    logout,
    getAccessToken,
    makeAuthenticatedRequest,
    refreshToken: () => getAccessToken(true),
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};