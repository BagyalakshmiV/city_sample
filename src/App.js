import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MsalProvider, useMsal } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './config/authConfig';
import LoginPage from './components/LoginPage';
import ChatPage from './components/ChatPage';

const msalInstance = new PublicClientApplication(msalConfig);

function ProtectedRoute({ children }) {
  const { accounts } = useMsal();
  const isSignedIn = accounts && accounts.length > 0;

  return isSignedIn ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { accounts } = useMsal();
  const isSignedIn = accounts && accounts.length > 0;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to={isSignedIn ? "/chat" : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <Router>
        <AppRoutes />
      </Router>
    </MsalProvider>
  );
}

export default App;
