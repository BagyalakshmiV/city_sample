import os
import json
import time
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
import redis
from itsdangerous import URLSafeTimedSerializer
import logging

logger = logging.getLogger(__name__)

class SessionManager:
    def __init__(self):
        # Try to connect to Redis, fallback to in-memory if not available
        try:
            self.redis_client = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', 6379)),
                db=0,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            self.use_redis = True
            logger.info("Connected to Redis for session storage")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Using in-memory storage.")
            self.use_redis = False
            self.memory_store = {}
        
        # Session serializer for secure session data
        self.serializer = URLSafeTimedSerializer(
            os.getenv('SESSION_SECRET_KEY', 'your-secret-key-change-in-production')
        )
        
        # Session configuration
        self.session_timeout = int(os.getenv('SESSION_TIMEOUT_HOURS', 8)) * 3600  # 8 hours default
        self.token_refresh_threshold = 300  # 5 minutes before expiry
    
    def _get_session_key(self, user_id: str) -> str:
        """Generate session key for user"""
        return f"session:{user_id}"
    
    def create_session(self, user_id: str, user_data: Dict[str, Any], access_token: str, expires_at: datetime) -> str:
        """Create a new session for user"""
        session_id = self.serializer.dumps({
            'user_id': user_id,
            'created_at': time.time()
        })
        
        session_data = {
            'session_id': session_id,
            'user_id': user_id,
            'user_data': user_data,
            'access_token': access_token,
            'expires_at': expires_at.isoformat(),
            'created_at': datetime.utcnow().isoformat(),
            'last_activity': datetime.utcnow().isoformat(),
            'active': True
        }
        
        key = self._get_session_key(user_id)
        
        if self.use_redis:
            try:
                self.redis_client.setex(
                    key, 
                    self.session_timeout, 
                    json.dumps(session_data, default=str)
                )
            except Exception as e:
                logger.error(f"Failed to store session in Redis: {e}")
                return None
        else:
            self.memory_store[key] = {
                'data': session_data,
                'expires_at': time.time() + self.session_timeout
            }
        
        logger.info(f"Created session for user {user_id}")
        return session_id
    
    def get_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get session data for user"""
        key = self._get_session_key(user_id)
        
        if self.use_redis:
            try:
                data = self.redis_client.get(key)
                if data:
                    session_data = json.loads(data)
                    # Update last activity
                    session_data['last_activity'] = datetime.utcnow().isoformat()
                    self.redis_client.setex(key, self.session_timeout, json.dumps(session_data, default=str))
                    return session_data
            except Exception as e:
                logger.error(f"Failed to get session from Redis: {e}")
                return None
        else:
            if key in self.memory_store:
                stored = self.memory_store[key]
                if time.time() < stored['expires_at']:
                    # Update last activity and expiry
                    stored['data']['last_activity'] = datetime.utcnow().isoformat()
                    stored['expires_at'] = time.time() + self.session_timeout
                    return stored['data']
                else:
                    # Session expired
                    del self.memory_store[key]
        
        return None
    
    def update_session(self, user_id: str, updates: Dict[str, Any]) -> bool:
        """Update session data"""
        session_data = self.get_session(user_id)
        if not session_data:
            return False
        
        session_data.update(updates)
        session_data['last_activity'] = datetime.utcnow().isoformat()
        
        key = self._get_session_key(user_id)
        
        if self.use_redis:
            try:
                self.redis_client.setex(key, self.session_timeout, json.dumps(session_data, default=str))
                return True
            except Exception as e:
                logger.error(f"Failed to update session in Redis: {e}")
                return False
        else:
            if key in self.memory_store:
                self.memory_store[key]['data'] = session_data
                self.memory_store[key]['expires_at'] = time.time() + self.session_timeout
                return True
        
        return False
    
    def delete_session(self, user_id: str) -> bool:
        """Delete session for user"""
        key = self._get_session_key(user_id)
        
        if self.use_redis:
            try:
                self.redis_client.delete(key)
                logger.info(f"Deleted session for user {user_id}")
                return True
            except Exception as e:
                logger.error(f"Failed to delete session from Redis: {e}")
                return False
        else:
            if key in self.memory_store:
                del self.memory_store[key]
                logger.info(f"Deleted session for user {user_id}")
                return True
        
        return False
    
    def is_token_expired(self, session_data: Dict[str, Any]) -> bool:
        """Check if token is expired or needs refresh"""
        if not session_data or 'expires_at' not in session_data:
            return True
        
        try:
            expires_at = datetime.fromisoformat(session_data['expires_at'].replace('Z', '+00:00'))
            now = datetime.utcnow()
            
            # Check if token expires within threshold
            time_until_expiry = (expires_at - now).total_seconds()
            return time_until_expiry <= self.token_refresh_threshold
        except Exception as e:
            logger.error(f"Error checking token expiry: {e}")
            return True
    
    def validate_session_id(self, session_id: str) -> Optional[str]:
        """Validate session ID and return user_id"""
        try:
            data = self.serializer.loads(session_id, max_age=self.session_timeout)
            return data.get('user_id')
        except Exception as e:
            logger.warning(f"Invalid session ID: {e}")
            return None
    
    def cleanup_expired_sessions(self):
        """Clean up expired sessions (for memory store)"""
        if not self.use_redis:
            current_time = time.time()
            expired_keys = [
                key for key, value in self.memory_store.items()
                if current_time >= value['expires_at']
            ]
            
            for key in expired_keys:
                del self.memory_store[key]
            
            if expired_keys:
                logger.info(f"Cleaned up {len(expired_keys)} expired sessions")
    
    def get_active_sessions_count(self) -> int:
        """Get count of active sessions"""
        if self.use_redis:
            try:
                keys = self.redis_client.keys("session:*")
                return len(keys)
            except Exception:
                return 0
        else:
            self.cleanup_expired_sessions()
            return len(self.memory_store)
    
    def get_user_session_data(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user data from session"""
        session_data = self.get_session(user_id)
        if session_data and session_data.get('active'):
            return session_data.get('user_data')
        return None

# Global session manager instance
session_manager = SessionManager()