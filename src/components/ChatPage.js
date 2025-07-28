import React, { useState, useEffect, useRef } from 'react';
import { useMsal } from '@azure/msal-react';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';
import { loginRequest } from '../config/authConfig';
import { TailSpin } from 'react-loader-spinner';

// === Styled Components ===
// ✨ Updated Styles for Dark Theme ✨

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #121212;
  color: #e0e0e0;
`;

const Header = styled.div`
  background: #1e1e1e;
  padding: 15px 20px;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h1`
  margin: 0;
  color: #ffffff;
  font-size: 1.6em;
  text-align: center;
  flex: 1;
`;

const UserMenu = styled.div`
  position: relative;
`;

const UserButton = styled.button`
  background: linear-gradient(135deg, #2d2d2d, #3a3a3a);
  color: #ffffff;
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 10px 18px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.4s ease;
  animation: pulseZoom 2.5s ease-in-out infinite, borderGlow 3s ease-in-out infinite;
  box-shadow: 0 0 4px rgba(76, 158, 217, 0.3);

  &:hover {
    background: linear-gradient(135deg, #3a3a3a, #4a4a4a);
    transform: scale(1.05);
    box-shadow: 0 0 10px rgba(76, 158, 217, 0.5);
  }

  @keyframes borderGlow {
    0% {
      border-color: rgba(76, 158, 217, 0.2);
      box-shadow: 0 0 4px rgba(76, 158, 217, 0.3);
    }
    50% {
      border-color: rgba(76, 158, 217, 0.5);
      box-shadow: 0 0 10px rgba(76, 158, 217, 0.6);
    }
    100% {
      border-color: rgba(76, 158, 217, 0.2);
      box-shadow: 0 0 4px rgba(76, 158, 217, 0.3);
    }
  }
`;


const DropdownPanel = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 20;
  background-color: #1f1f1f;
  padding: 16px;
  border-radius: 10px;
  width: 280px;
  box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.6);
  display: ${props => props.visible ? 'block' : 'none'};
`;

const UserInfo = styled.div`
  text-align: center;
  margin-bottom: 15px;
`;

const Avatar = styled.div`
  width: 60px;
  height: 60px;
  background-color: #333;
  border-radius: 50%;
  margin: 0 auto 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`;

const LogoutButton = styled.button`
  background-color: #ff5c5c;
  color: white;
  border: none;
  width: 100%;
  padding: 12px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;

  &:hover {
    background-color: #ff3b3b;
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;


const Message = styled.div`
  margin: 15px 0;
  padding: 15px;
  border-radius: 10px;
  line-height: 1.6;
  word-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
  max-width: 80%;
  display: inline-block;

  ${props => props.isUser ? `
    background-color: #0078D4;
    color: white;
    margin-left: auto;
    text-align: right;
    align-self: flex-end;
  ` : `
    background-color: #1e1e1e;
    color: #ddd;
    border: 1px solid #333;
    align-self: flex-start;
  `}
`;


const MarkdownTableWrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
  }

  th, td {
    border: 1px solid #444;
    padding: 10px;
    text-align: left;
  }

  th {
    background-color: #2c2c2c;
    color: #fff;
  }

  td {
    background-color: #1c1c1c;
  }
`;

const InputContainer = styled.div`
  background: #1a1a1a;
  padding: 20px;
  border-top: 1px solid #333;
  display: flex;
  gap: 10px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 12px;
  border: 1px solid #444;
  border-radius: 8px;
  font-size: 16px;
  background-color: #262626;
  color: #fff;
  outline: none;

  &::placeholder {
    color: #aaa;
  }

  &:focus {
    border-color: #0078D4;
  }
`;

const SendButton = styled.button`
  padding: 12px 24px;
  background-color: #0078D4;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;

  &:hover {
    background-color: #106ebe;
  }

  &:disabled {
    background-color: #444;
    cursor: not-allowed;
  }
`;

const Description = styled.div`
  text-align: center;
  padding: 20px;
  color: #999;
  background: #1a1a1a;
  margin: 20px auto;
  border-radius: 8px;
  max-width: 1200px;
  font-size: 15px;
`;


// === ChatPage Component ===
const ChatPage = () => {
  const { instance, accounts } = useMsal();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchUserInfo = async () => {
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0]
      });

      const apiResponse = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${response.accessToken}`
        }
      });

      if (apiResponse.ok) {
        const userData = await apiResponse.json();
        setUserInfo(userData);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      text: inputValue.trim(),
      isUser: true,
      timestamp: new Date().toISOString()
    };

    setInputValue('');
    setIsLoading(true);
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0]
      });

      const apiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${response.accessToken}`
        },
        body: JSON.stringify({ message: userMessage.text })
      });

      if (apiResponse.ok) {
        const data = await apiResponse.json();
        // 🔍 Debug logs
        console.log("📨 Server Response:");
        console.log("Response text:", data.response);
        console.log("SQL Query:", data.sql_query);
        console.log("Table Data:", data.table_data);
        console.log("Error:", data.error);
        setMessages(prev => [...prev, {
          text: data.response,
          table_data: data.table_data || null,
          sql_query: data.sql_query || null,
          error: data.error || null,
          isUser: false,
          timestamp: new Date().toISOString()
        }]);
      } else {
        setMessages(prev => [...prev, {
          text: '❌ Error: Unable to process your request. Please try again.',
          isUser: false,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        text: '❌ Error: Unable to connect to the server. Please try again.',
        isUser: false,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const handleLogout = () => {
    instance.logoutPopup();
  };

  const formatTimestamp = (iso) => {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ChatContainer>
      <Header>
        <Title style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
  SQLBot
  <img
    src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMm43YWM2cGJoOW5tMnlyaXU4OWI1am9id3l4cHF0bjJ0Zjd5bW5qcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/dzBLyjVBCtWgGPiXCJ/giphy.gif"
    alt="Robot"
    style={{
      width: '32px',
      height: '32px',
      borderRadius: '4px',
      objectFit: 'cover',
      animation: 'float 3s ease-in-out infinite'
    }}
  />
</Title>

        <UserMenu>
          <UserButton onClick={() => setDropdownVisible(!dropdownVisible)}>
            My Account ⚙️
          </UserButton>
          <DropdownPanel visible={dropdownVisible}>
            <UserInfo>
              <Avatar>👤</Avatar>
              {userInfo && (
                <>
                  <div><strong>{userInfo.name}</strong></div>
                  <div style={{ fontSize: '14px', color: '#aaa' }}>
                    Role: {userInfo.role}
                  </div>
                </>
              )}
            </UserInfo>
            <LogoutButton onClick={handleLogout}>
              🔓 Sign out
            </LogoutButton>
          </DropdownPanel>
        </UserMenu>
      </Header>

      <Description>
        Bot runs SQL Server queries based on user privileges.<br />
        <strong>Sample Prompts:</strong> Marketing: <strong>'Available Brands'</strong>, Finance: <strong>'Top Discounted Products'</strong>, Analytics: <strong>'Which products had the highest ratings?'</strong>
      </Description>

      <MessagesContainer>
        {messages.map((message, index) => (
          <Message key={index} isUser={message.isUser}>
            <MarkdownTableWrapper>
              {/* ✅ Always show the SQL / explanation text */}
              <ReactMarkdown>{message.text}</ReactMarkdown>

              {/* ✅ Then optionally show the table or error */}
              {message.table_data ? (
                <table className="result-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
                  <thead>
                    <tr>
                      {message.table_data.columns.map((col, i) => (
                        <th key={i} style={{
                          border: '1px solid #444',
                          padding: '10px',
                          backgroundColor: '#2c2c2c',
                          color: '#fff'
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {message.table_data.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {message.table_data.columns.map((col, colIndex) => (
                          <td key={colIndex} style={{
                            border: '1px solid #444',
                            padding: '10px',
                            backgroundColor: '#1c1c1c',
                            color: '#ddd'
                          }}>{row[col]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : message.error ? (
                <div style={{ marginTop: '12px', color: '#ff5c5c' }}>
                  {message.error}
                </div>
              ) : null}
            </MarkdownTableWrapper>

            <div style={{
              fontSize: '12px',
              color: '#888',
              marginTop: '5px',
              textAlign: message.isUser ? 'right' : 'left'
            }}>
              {formatTimestamp(message.timestamp)}
            </div>
          </Message>

        ))}

        {isLoading && (
          <Message isUser={false}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TailSpin height="20" width="20" color="#0A84FF" />
              <span>Processing...</span>
            </div>
          </Message>
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>


      <InputContainer>
        <MessageInput
          type="text"
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me about your data..."
          disabled={isLoading}
        />
        <SendButton onClick={sendMessage} disabled={isLoading || !inputValue.trim()}>
          {isLoading ? '...' : 'Send'}
        </SendButton>
      </InputContainer>
    </ChatContainer>
  );
};

export default ChatPage;
