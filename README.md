# SQLBot - Agentic RAG for Structured Data

A modern web application that converts natural language queries into SQL queries using AI agents. The application features Microsoft Azure AD authentication and supports role-based access to database queries.

## Architecture

- **Frontend**: React.js with Microsoft Authentication Library (MSAL)
- **Backend**: FastAPI with Azure AD token validation
- **Database**: Azure SQL Server with token-based authentication
- **AI**: CrewAI agents with OpenAI GPT models
- **Vector Store**: ChromaDB for database schema embeddings

## Features

- 🔐 Microsoft Azure AD authentication
- 🤖 Natural language to SQL conversion using AI agents
- 📊 Real-time SQL query execution and results display
- 👥 Role-based access control (Marketing, Finance, Analyst, Admin)
- 🔍 Vector-based schema retrieval for context-aware queries
- 💬 Modern chat interface with markdown support

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Azure SQL Server access
- OpenAI API key
- Azure AD App Registration

## Setup Instructions

### 1. Backend Setup (FastAPI)

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the backend directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

5. Initialize the vector store (run once):
```python
from vector_schema import initialize_vector_store
initialize_vector_store()
```

6. Start the FastAPI server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### 2. Frontend Setup (React.js)

1. Navigate to the project root and install dependencies:
```bash
npm install
```

2. Update the Azure AD configuration in `src/config/authConfig.js`:
```javascript
export const msalConfig = {
  auth: {
    clientId: "your-client-id",
    authority: "https://login.microsoftonline.com/your-tenant-id",
    redirectUri: window.location.origin,
  },
  // ...
};
```

3. Start the React development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Authentication Required Endpoints

- `GET /api/user` - Get current user information
- `POST /api/chat` - Process chat message and return SQL results

### Public Endpoints

- `GET /` - API status
- `GET /api/health` - Health check

## Usage

1. **Login**: Click "Sign in with Microsoft" and authenticate with your Azure AD account
2. **Chat**: Type natural language queries like:
   - "Show me all available brands"
   - "What are the top discounted products?"
   - "Which products had the highest ratings?"
3. **Results**: View the generated SQL query and execution results
4. **Logout**: Use the account menu to sign out

## Role-Based Access

The application supports different user roles with varying database permissions:

- **Marketing**: Access to brand and product information
- **Finance**: Access to financial and pricing data
- **Analyst**: Access to analytics and reporting data
- **Admin**: Full database access

## Configuration

### Azure AD App Registration

1. Register a new application in Azure AD
2. Configure redirect URIs for your domain
3. Grant necessary API permissions for SQL Server access
4. Update the client ID and tenant ID in the configuration files

### Database Configuration

Update the database connection settings in both:
- `backend/main.py`
- `backend/vector_schema.py`

## Development

### Running in Development Mode

1. Start the backend:
```bash
cd backend
uvicorn main:app --reload --port 8000
```

2. Start the frontend:
```bash
npm start
```

### Building for Production

1. Build the React app:
```bash
npm run build
```

2. Deploy the FastAPI backend with a production WSGI server like Gunicorn

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the FastAPI CORS configuration includes your frontend URL
2. **Authentication Failures**: Verify Azure AD configuration and redirect URIs
3. **Database Connection Issues**: Check SQL Server firewall settings and authentication tokens
4. **Vector Store Errors**: Ensure ChromaDB is properly initialized

### Environment Variables

Make sure these environment variables are set:
- `OPENAI_API_KEY`: Your OpenAI API key
- Database connection strings and credentials

## Security Notes

- Never commit API keys or credentials to version control
- Use environment variables for sensitive configuration
- Implement proper token validation in production
- Consider implementing rate limiting for API endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.