import os
import pandas as pd
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pyodbc
import struct
import re
from datetime import datetime
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, LLM
import openai
from vector_schema import get_schema_info_from_vector, initialize_vector_store
from authlib.jose import jwt, JsonWebKey
import httpx
from session_manager import session_manager
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

initialize_vector_store() 

app = FastAPI(title="SQLBot API", description="Agentic RAG for Structured Data")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# OpenAI LLM Setup
openai.api_key = os.getenv("OPENAI_API_KEY")
llm = LLM(
    model="openai/gpt-4o-mini",
    api_key=openai.api_key,
    temperature=0.7,
    max_tokens=200
)

SERVER = 'poc-dataengg.database.windows.net'
DATABASE = 'POC'
DRIVER = '{ODBC Driver 18 for SQL Server}'
TENANT_ID = "d7ff7ab9-6f08-4232-aa65-e965312488e4"
CLIENT_ID = "5c3d31be-b8d1-4ce5-bf4d-31b850ebc7b2"

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    sql_query: str = None
    table_data: Optional[Dict[str, Any]] = None
    error: str = None

class UserInfo(BaseModel):
    name: str
    email: str
    role: str

class SessionInfo(BaseModel):
    user: UserInfo
    session_expiry: str
    active_sessions: int

# ✅ Enhanced JWT token validation with session management
async def validate_token_and_session(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        logger.info("🔐 Validating JWT token and session...")
        
        # Validate JWT token
        async with httpx.AsyncClient() as client:
            jwks_uri = f"https://login.microsoftonline.com/{TENANT_ID}/discovery/v2.0/keys"
            response = await client.get(jwks_uri)
            jwks = response.json()

        claims = jwt.decode(
            token,
            JsonWebKey.import_key_set(jwks),
            claims_params={
                "iss": f"https://login.microsoftonline.com/{TENANT_ID}/v2.0",
                "aud": CLIENT_ID,
            }
        )
        claims.validate()

        # Extract user information
        user_id = claims.get("sub") or claims.get("oid")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing user ID")

        # Check existing session
        session_data = session_manager.get_session(user_id)
        
        if session_data:
            # Check if token needs refresh
            if session_manager.is_token_expired(session_data):
                logger.info(f"Token expired for user {user_id}, updating session...")
                # Update session with new token
                token_expiry = datetime.fromtimestamp(claims.get('exp', 0))
                session_manager.update_session(user_id, {
                    'access_token': token,
                    'expires_at': token_expiry.isoformat()
                })
        else:
            # Create new session
            logger.info(f"Creating new session for user {user_id}")
            name = claims.get("name", "Unknown User")
            email = claims.get("preferred_username", "")
            
            user_roles = {
                "mathu": "Marketing",
                "baghya": "Finance", 
                "vivek": "Analyst",
                "dhivakar": "Admin"
            }
            username = name.lower() if name else ""
            role = user_roles.get(username, "User")
            
            user_data = {
                "name": name,
                "email": email,
                "role": role
            }
            
            token_expiry = datetime.fromtimestamp(claims.get('exp', 0))
            session_manager.create_session(user_id, user_data, token, token_expiry)

        logger.info("✅ JWT validation and session management completed.")
        return {
            "claims": claims,
            "user_id": user_id,
            "access_token": token
        }
        
    except Exception as e:
        logger.error(f"❌ Token validation error: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# ✅ Get SQL Server connection with session-cached token
def get_sql_server_connection(user_id: str):
    try:
        # Get token from session
        session_data = session_manager.get_session(user_id)
        if not session_data:
            raise HTTPException(status_code=401, detail="Session not found")
        
        access_token = session_data.get('access_token')
        if not access_token:
            raise HTTPException(status_code=401, detail="Access token not found in session")

        logger.info(f"🔑 Using cached token for user {user_id}")
        token_bytes = access_token.encode("utf-16-le")
        token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)

        logger.info("📡 Attempting SQL Server connection...")
        conn = pyodbc.connect(
            f"DRIVER={DRIVER};SERVER={SERVER};DATABASE={DATABASE};Encrypt=yes;TrustServerCertificate=no;",
            attrs_before={1256: token_struct}
        )
        logger.info("✅ SQL Server connection established.")
        return conn
    except Exception as e:
        logger.error(f"❌ Database connection error: {e}")
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

# SQL Generator Agent
def get_sql_agent(dynamic_schema_info):
    return Agent(
        role='Senior SQL Generator',
        goal=f'Generate accurate SQL server queries based on: {dynamic_schema_info}',
        backstory='Expert SQL analyst for a retail database.',
        verbose=True,
        allow_delegation=False,
        llm=llm
    )

def extract_sql(text):
    matches = re.findall(r"```sql\s*(.*?)```", text, re.DOTALL)
    return matches[0].strip() if matches else None

def run_query(sql: str, user_id: str):
    try:
        conn = get_sql_server_connection(user_id)
        df = pd.read_sql(sql, conn)
        conn.close()

        if df.empty:
            return {
                "error": "✅ Query ran successfully but returned no results.",
                "table_data": {
                    "columns": df.columns.tolist(),
                    "rows": []
                }
            }

        return {
            "markdown": df.to_markdown(),
            "table_data": {
                "columns": df.columns.tolist(),
                "rows": df.to_dict(orient="records")
            }
        }

    except Exception as e:
        error_message = str(e)
        if "permission" in error_message.lower():
            return {
                "error": "❌ Sorry, you don't have access to that information.",
                "table_data": None
            }
        return {
            "error": f"❌ Error running SQL: {e}",
            "table_data": None
        }

# Background task to clean up expired sessions
async def cleanup_sessions():
    session_manager.cleanup_expired_sessions()

@app.get("/")
async def root():
    return {"message": "SQLBot API is running"}

@app.get("/api/user", response_model=UserInfo)
async def get_user_info(token_data: dict = Depends(validate_token_and_session)):
    user_id = token_data["user_id"]
    
    # Get user data from session
    user_data = session_manager.get_user_session_data(user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User session not found")
    
    logger.info(f"👤 Retrieved user info for: {user_data['name']}, role: {user_data['role']}")
    return UserInfo(**user_data)

@app.get("/api/session", response_model=SessionInfo)
async def get_session_info(token_data: dict = Depends(validate_token_and_session)):
    user_id = token_data["user_id"]
    
    session_data = session_manager.get_session(user_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    user_data = session_data.get('user_data', {})
    active_sessions = session_manager.get_active_sessions_count()
    
    return SessionInfo(
        user=UserInfo(**user_data),
        session_expiry=session_data.get('expires_at', ''),
        active_sessions=active_sessions
    )

@app.delete("/api/session")
async def logout_user(token_data: dict = Depends(validate_token_and_session)):
    user_id = token_data["user_id"]
    
    success = session_manager.delete_session(user_id)
    if success:
        return {"message": "Session terminated successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to terminate session")

@app.post("/api/chat", response_model=ChatResponse)
async def process_chat_message(
    chat_message: ChatMessage,
    background_tasks: BackgroundTasks,
    token_data: dict = Depends(validate_token_and_session)
):
    try:
        user_id = token_data["user_id"]
        claims = token_data["claims"]
        logger.info(f"📩 User message: {chat_message.message}")
        logger.info(f"👤 Token subject: {claims.get('sub')}")

        # Schedule session cleanup
        background_tasks.add_task(cleanup_sessions)

        dynamic_schema_info = get_schema_info_from_vector(chat_message.message)
        sql_agent = get_sql_agent(dynamic_schema_info)

        task = Task(
            description=(
                "Your job is to generate a valid SQL Server query (T-SQL) based on the user's question.\n"
                f"Here is the database schema:\n{dynamic_schema_info}\n"
                "User question: {question}\n\n"
                "Multi-word columns MUST be wrapped in double quotes.\n"
                "Use **T-SQL syntax**. Don't qualify tables with schema/database names.\n"
                "Use OFFSET...FETCH or TOP 1, not FETCH FIRST ROW.\n"
                "Only include 'ProjectCost' if explicitly asked.\n"
                "Return only the SQL query in a ```sql ... ``` block."
            ),
            expected_output="Valid T-SQL query inside a code block.",
            agent=sql_agent,
            llm=llm
        )

        crew = Crew(agents=[sql_agent], tasks=[task])
        inputs = {"question": chat_message.message}
        result = crew.kickoff(inputs=inputs)
        raw = result.raw if hasattr(result, 'raw') else result

        sql = extract_sql(str(raw))
        if not sql:
            return ChatResponse(response="⚠️ Could not find a SQL query in the output.", error="No SQL query generated")

        logger.info(f"🧠 Generated SQL:\n{sql}")
        query_result = run_query(sql, user_id)
        logger.info(query_result)
        
        response_text = f"🔍 **Generated SQL:**\n```sql\n{sql}\n```"
        if query_result.get("table_data"):
            response_text += "\n\n📊 **Query Result:**"
        
        error = query_result.get("error", "")
        return ChatResponse(
            response=response_text,
            sql_query=sql,
            table_data=query_result.get("table_data"),
            error=error
        )

    except Exception as e:
        logger.error(f"❌ Chat processing error: {e}")
        return ChatResponse(response=f"❌ Error processing your query: {str(e)}", error=str(e))

@app.get("/api/health")
async def health_check():
    active_sessions = session_manager.get_active_sessions_count()
    return {
        "status": "healthy", 
        "service": "SQLBot API",
        "active_sessions": active_sessions,
        "session_storage": "Redis" if session_manager.use_redis else "Memory"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
