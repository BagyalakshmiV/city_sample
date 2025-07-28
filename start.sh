#!/bin/bash

# SQLBot Application Startup Script with Session Management

echo "🚀 Starting SQLBot Application with Enhanced Session Management"
echo "=============================================================="

# Check if required files exist
if [ ! -f "./backend/requirements.txt" ]; then
    echo "❌ Backend requirements.txt not found!"
    exit 1
fi

if [ ! -f "./package.json" ]; then
    echo "❌ Frontend package.json not found!"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f "./backend/.env" ]; then
    echo "⚠️  Creating .env file from example..."
    cp ./backend/.env.example ./backend/.env
    echo "✅ Please edit ./backend/.env with your actual configuration"
fi

# Function to start backend
start_backend() {
    echo "🔧 Starting Backend Server..."
    cd backend
    
    # Install dependencies if needed
    if [ ! -d "./venv" ]; then
        echo "📦 Creating virtual environment..."
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    pip install -r requirements.txt
    
    echo "🌐 Starting FastAPI server on http://localhost:8000"
    python main.py &
    BACKEND_PID=$!
    cd ..
}

# Function to start frontend
start_frontend() {
    echo "🎨 Starting Frontend Server..."
    
    # Install dependencies if needed
    if [ ! -d "./node_modules" ]; then
        echo "📦 Installing npm dependencies..."
        npm install
    fi
    
    echo "🌐 Starting React app on http://localhost:3000"
    npm start &
    FRONTEND_PID=$!
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    echo "✅ Cleanup complete"
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Start servers
start_backend
sleep 3
start_frontend

echo ""
echo "✅ Both servers are starting up!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:8000"
echo "📊 Health:   http://localhost:8000/api/health"
echo ""
echo "💡 Features:"
echo "   - Persistent sessions across browser restarts"
echo "   - Automatic token refresh"
echo "   - Redis session storage (with memory fallback)"
echo "   - Session monitoring and cleanup"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for processes
wait