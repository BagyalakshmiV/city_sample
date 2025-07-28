import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './config/authConfig';
import { SessionProvider, useSession } from './context/SessionContext';
import LoginPage from './components/LoginPage';
import ChatPage from './components/ChatPage';
import LoadingSpinner from './components/LoadingSpinner';

const msalInstance = new PublicClientApplication(msalConfig);

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useSession();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useSession();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/chat" : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <SessionProvider>
        <Router>
          <AppRoutes />
        </Router>
      </SessionProvider>
    </MsalProvider>
  );
}

export default App;
