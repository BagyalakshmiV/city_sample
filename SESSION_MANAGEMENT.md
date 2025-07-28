# Session Management Implementation

This document describes the comprehensive session management implementation for the SQLBot application.

## Overview

The application now implements proper session management with the following features:

### Frontend Session Management

1. **Session Context Provider** (`src/context/SessionContext.js`)
   - Centralized session state management
   - Automatic token refresh before expiry
   - Persistent storage using localStorage
   - Session expiry tracking and display

2. **Enhanced Authentication**
   - Automatic redirect on session expiry
   - Better error handling for authentication failures
   - Loading states during authentication processes

3. **Improved User Experience**
   - Session status display in user menu
   - Automatic session cleanup
   - Connection error handling

### Backend Session Management

1. **Session Manager** (`backend/session_manager.py`)
   - Redis-based session storage (with in-memory fallback)
   - Secure session serialization
   - Automatic session cleanup
   - Token caching and refresh management

2. **Enhanced API Security**
   - Session-aware token validation
   - Automatic token refresh detection
   - Session-based database connections
   - Background session cleanup tasks

## Key Features

### 1. Persistent Sessions
- Sessions persist across browser restarts using localStorage
- Redis storage on backend for scalability
- Configurable session timeout (default: 8 hours)

### 2. Automatic Token Refresh
- Frontend automatically refreshes tokens 5 minutes before expiry
- Backend detects expired tokens and updates sessions
- Seamless user experience without interruption

### 3. Session Security
- Secure session serialization using `itsdangerous`
- JWT token validation with Azure AD
- Session-based access control

### 4. Error Handling
- Graceful handling of network errors
- Clear error messages for users
- Automatic fallback mechanisms

### 5. Monitoring and Cleanup
- Session activity tracking
- Automatic cleanup of expired sessions
- Health check endpoint with session statistics

## Configuration

### Environment Variables

Create a `.env` file in the backend directory with:

```env
# Session Management
SESSION_SECRET_KEY=your-super-secret-session-key-change-in-production
SESSION_TIMEOUT_HOURS=8

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Other existing configuration...
```

### Frontend Configuration

The MSAL configuration has been updated in `src/config/authConfig.js`:

- Uses `localStorage` instead of `sessionStorage` for persistence
- Enables cookie storage for better session handling
- Includes proper logout redirect configuration

## API Endpoints

### New Session Endpoints

1. **GET /api/session** - Get current session information
2. **DELETE /api/session** - Logout and terminate session
3. **GET /api/health** - Health check with session statistics

### Enhanced Existing Endpoints

- All protected endpoints now use session-aware authentication
- Automatic session updates on token refresh
- Better error handling for expired sessions

## Usage

### Starting the Application

1. **Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```

2. **Frontend:**
   ```bash
   npm install
   npm start
   ```

### Session Flow

1. User logs in through Azure AD
2. Frontend stores token in localStorage and creates session context
3. Backend validates token and creates server-side session
4. Subsequent requests use cached session data
5. Tokens are automatically refreshed before expiry
6. Sessions are cleaned up on logout or expiry

## Benefits

1. **Better Performance**: Token caching reduces API calls
2. **Improved UX**: Persistent sessions across browser restarts
3. **Enhanced Security**: Proper session management and cleanup
4. **Scalability**: Redis support for multiple server instances
5. **Monitoring**: Session statistics and health checks
6. **Reliability**: Automatic error handling and recovery

## Migration Notes

- Existing users will need to log in again after the update
- Old sessionStorage data will be migrated to localStorage
- No database changes required
- Redis is optional - system works with in-memory storage

## Troubleshooting

### Common Issues

1. **Session Not Persisting**: Check localStorage permissions
2. **Token Refresh Failures**: Verify Azure AD configuration
3. **Redis Connection Issues**: System will fallback to memory storage
4. **Session Timeout**: Adjust `SESSION_TIMEOUT_HOURS` environment variable

### Debug Information

- Check browser console for session-related logs
- Backend logs include detailed session management information
- Use `/api/health` endpoint to check session statistics