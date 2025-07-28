import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(-45deg, #0f2027, #203a43, #2c5364);
  background-size: 400% 400%;
  animation: gradientBG 15s ease infinite;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  position: relative;
  color: #ffffff;

  @keyframes gradientBG {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

const SignInTopRight = styled.button`
  position: absolute;
  top: 30px;
  right: 30px;
  background: linear-gradient(135deg, #203a43, #2c5364);
  color: #ffffff;
  border: 2px solid transparent;
  padding: 12px 28px;
  font-size: 1em;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(44, 83, 100, 0.35);
  transition: all 0.4s ease;
  animation: pulseZoom 2.5s ease-in-out infinite, borderGlow 3s ease-in-out infinite;

  &:hover {
    background: linear-gradient(135deg, #243e4d, #324c5e);
    box-shadow: 0 6px 20px rgba(50, 90, 110, 0.55);
    transform: scale(1.05);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 4px rgba(76, 158, 217, 0.25);
  }

  &:active {
    transform: scale(0.98);
    box-shadow: 0 3px 10px rgba(44, 83, 100, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  @keyframes pulseZoom {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.03); }
  }

  @keyframes borderGlow {
    0% {
      border-color: rgba(76, 158, 217, 0.2);
      box-shadow: 0 0 4px rgba(76, 158, 217, 0.4);
    }
    50% {
      border-color: rgba(76, 158, 217, 0.5);
      box-shadow: 0 0 8px rgba(76, 158, 217, 0.8);
    }
    100% {
      border-color: rgba(76, 158, 217, 0.2);
      box-shadow: 0 0 4px rgba(76, 158, 217, 0.4);
    }
  }
`;

const LogoContainer = styled.div`
  width: 260px;
  height: 160px;
  margin-bottom: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LogoImage = styled.img`
  max-width: 300%;
  max-height: 200%;
  object-fit: contain;
  filter: brightness(1.4);
`;

const Title = styled.h1`
  font-size: 2.4em;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 20px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

const TitleGif = styled.img`
  width: 50px;
  height: 50px;
`;

const Subtitle = styled.p`
  font-size: 1.2em;
  color: #cccccc;
  margin-bottom: 10px;
  line-height: 1.6;
  text-align: center;
`;

const ErrorMessage = styled.div`
  background-color: rgba(255, 92, 92, 0.1);
  border: 1px solid #ff5c5c;
  color: #ff5c5c;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
  text-align: center;
  max-width: 400px;
`;

const LoginPage = () => {
  const { login, isAuthenticated, isLoading } = useSession();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/chat');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    
    try {
      await login();
      // Navigation will be handled by the useEffect above
    } catch (error) {
      console.error('Login failed:', error);
      setLoginError(
        error.message || 'Login failed. Please try again.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Show loading state during initial authentication check
  if (isLoading) {
    return null; // Let the App component handle the loading spinner
  }

  return (
    <PageWrapper>
      <SignInTopRight 
        onClick={handleLogin} 
        disabled={isLoggingIn}
      >
        {isLoggingIn ? '🔄 Signing in...' : '🔐 Sign in'}
      </SignInTopRight>

      <LogoContainer>
        <LogoImage src="/images/city-logo.png" alt="City Holding Logo" />
      </LogoContainer>

      <Title>
        Agentic RAG for Structured Data
        <TitleGif
          src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWdzdm4wbDBhZTV4bjlpd3ZlZ29hZjZpN3praTNrNGNuemRyeGw2MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/nNOAPjUdo4mpZFkDf8/giphy.gif"
          alt="Chart Animation"
      />
      </Title>

      <Subtitle>
        Empowering your enterprise insights with precision.
        <br />
        Build smarter decisions using SQLBot.
      </Subtitle>

      {loginError && (
        <ErrorMessage>
          {loginError}
        </ErrorMessage>
      )}
    </PageWrapper>
  );
};

export default LoginPage;
