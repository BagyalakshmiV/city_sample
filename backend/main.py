import os
import pandas as pd
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Any,Optional
import pyodbc
import struct
import re
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, LLM
import openai
from vector_schema import get_schema_info_from_vector,initialize_vector_store
from authlib.jose import jwt, JsonWebKey
import httpx

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

# ✅ JWT token validation (return claims + token)
async def validate_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        print("🔐 Validating JWT token...")
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

        print("✅ JWT validation passed.")
        return {"claims": claims, "access_token": token}
    except Exception as e:
        print(f"❌ Token validation error: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# ✅ Get SQL Server connection
def get_sql_server_connection(access_token: str):
    try:
        print(f"🔑 Access token length: {len(access_token)}")
        token_bytes = access_token.encode("utf-16-le")
        token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)

        print("📡 Attempting SQL Server connection...")
        conn = pyodbc.connect(
            f"DRIVER={DRIVER};SERVER={SERVER};DATABASE={DATABASE};Encrypt=yes;TrustServerCertificate=no;",
            attrs_before={1256: token_struct}
        )
        print("✅ SQL Server connection established.")
        return conn
    except Exception as e:
        print(f"❌ Database connection error: {e}")
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

def run_query(sql: str, access_token: str):
    try:
        conn = get_sql_server_connection(access_token)
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


@app.get("/")
async def root():
    return {"message": "SQLBot API is running"}

@app.get("/api/user", response_model=UserInfo)
async def get_user_info(token_data: dict = Depends(validate_token)):
    claims = token_data["claims"]
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

    print(f"👤 Authenticated user: {name}, role: {role}")
    return UserInfo(name=name, email=email, role=role)

@app.post("/api/chat", response_model=ChatResponse)
async def process_chat_message(
    chat_message: ChatMessage,
    token_data: dict = Depends(validate_token)
):
    try:
        access_token = token_data["access_token"]
        claims = token_data["claims"]
        print(f"📩 User message: {chat_message.message}")
        print(f"👤 Token subject: {claims.get('sub')}")

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

        print(f"🧠 Generated SQL:\n{sql}")
        query_result = run_query(sql, access_token)
        print(query_result)
        response_text = f"🔍 **Generated SQL:**\n```sql\n{sql}\n```"
        if query_result["table_data"]:
            response_text += "\n\n📊 **Query Result:**"
        error = query_result.get("error", "")
        return ChatResponse(
            response=response_text,
            sql_query=sql,
            table_data=query_result["table_data"],
            error=error
        )


    except Exception as e:
        print(f"❌ Chat processing error: {e}")
        return ChatResponse(response=f"❌ Error processing your query: {str(e)}", error=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "SQLBot API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
