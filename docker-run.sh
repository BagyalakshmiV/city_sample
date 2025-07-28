#!/bin/bash

# SQLBot Docker Runner Script

echo "🐳 SQLBot Docker Environment"
echo "============================="

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  dev       Start development environment with hot reload"
    echo "  prod      Start production environment"
    echo "  build     Build all Docker images"
    echo "  stop      Stop all running containers"
    echo "  clean     Stop containers and remove volumes"
    echo "  logs      Show logs from all services"
    echo "  status    Show status of all services"
    echo ""
    echo "Options:"
    echo "  --detach  Run in detached mode (background)"
    echo "  --build   Force rebuild of images"
    echo ""
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Function to check if .env file exists
check_env_file() {
    if [ ! -f "backend/.env" ]; then
        echo "⚠️  backend/.env file not found."
        if [ -f "backend/.env.example" ]; then
            echo "📋 Copying .env.example to .env..."
            cp backend/.env.example backend/.env
            echo "✏️  Please edit backend/.env with your actual configuration"
        else
            echo "❌ No .env.example file found. Please create backend/.env manually."
            exit 1
        fi
    fi
}

# Function to start development environment
start_dev() {
    echo "🚀 Starting development environment..."
    check_env_file
    
    local COMPOSE_CMD="docker-compose -f docker-compose.dev.yml"
    
    if [[ "$*" == *"--build"* ]]; then
        COMPOSE_CMD="$COMPOSE_CMD --build"
    fi
    
    if [[ "$*" == *"--detach"* ]]; then
        $COMPOSE_CMD up -d
    else
        $COMPOSE_CMD up
    fi
}

# Function to start production environment
start_prod() {
    echo "🚀 Starting production environment..."
    check_env_file
    
    local COMPOSE_CMD="docker-compose"
    
    if [[ "$*" == *"--build"* ]]; then
        COMPOSE_CMD="$COMPOSE_CMD --build"
    fi
    
    if [[ "$*" == *"--detach"* ]]; then
        $COMPOSE_CMD up -d
    else
        $COMPOSE_CMD up
    fi
}

# Function to build images
build_images() {
    echo "🔨 Building Docker images..."
    docker-compose build
    docker-compose -f docker-compose.dev.yml build
}

# Function to stop containers
stop_containers() {
    echo "🛑 Stopping containers..."
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
}

# Function to clean up
clean_up() {
    echo "🧹 Cleaning up containers and volumes..."
    docker-compose down -v --remove-orphans
    docker-compose -f docker-compose.dev.yml down -v --remove-orphans
    docker system prune -f
}

# Function to show logs
show_logs() {
    echo "📋 Showing logs..."
    if docker-compose ps -q | grep -q .; then
        docker-compose logs -f
    elif docker-compose -f docker-compose.dev.yml ps -q | grep -q .; then
        docker-compose -f docker-compose.dev.yml logs -f
    else
        echo "No running containers found."
    fi
}

# Function to show status
show_status() {
    echo "📊 Container Status:"
    echo "==================="
    echo "Production:"
    docker-compose ps
    echo ""
    echo "Development:"
    docker-compose -f docker-compose.dev.yml ps
}

# Main script logic
check_docker

case "$1" in
    "dev")
        start_dev "$@"
        ;;
    "prod")
        start_prod "$@"
        ;;
    "build")
        build_images
        ;;
    "stop")
        stop_containers
        ;;
    "clean")
        clean_up
        ;;
    "logs")
        show_logs
        ;;
    "status")
        show_status
        ;;
    *)
        show_usage
        exit 1
        ;;
esac