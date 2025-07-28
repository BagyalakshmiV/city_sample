# SQLBot Docker Documentation

This document provides comprehensive instructions for running SQLBot using Docker containers.

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB of available RAM
- At least 2GB of free disk space

## 🚀 Quick Start

### Using the Docker Runner Script (Recommended)

The easiest way to run SQLBot with Docker is using the provided `docker-run.sh` script:

```bash
# Start development environment
./docker-run.sh dev

# Start production environment  
./docker-run.sh prod

# Build all images
./docker-run.sh build

# Stop all containers
./docker-run.sh stop

# Clean up everything
./docker-run.sh clean
```

### Manual Docker Compose Commands

If you prefer to use docker-compose directly:

```bash
# Development environment
docker-compose -f docker-compose.dev.yml up

# Production environment
docker-compose up

# Run in background
docker-compose up -d
```

## 🏗️ Architecture

The Docker setup includes the following services:

- **Frontend**: React.js application (nginx in production, webpack-dev-server in development)
- **Backend**: FastAPI Python application
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Network**: Custom bridge network for service communication

## 📁 File Structure

```
├── Dockerfile                 # Production frontend Dockerfile
├── Dockerfile.dev            # Development frontend Dockerfile
├── backend/
│   ├── Dockerfile            # Backend Dockerfile
│   ├── .dockerignore         # Backend Docker ignore file
│   └── .env.example          # Environment variables template
├── docker-compose.yml        # Production compose file
├── docker-compose.dev.yml    # Development compose file
├── docker-run.sh            # Docker runner script
├── nginx.conf               # Nginx configuration for production
├── .dockerignore            # Frontend Docker ignore file
└── DOCKER.md               # This documentation
```

## ⚙️ Configuration

### Environment Variables

Copy the example environment file and configure it:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your actual values:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=postgresql://sqlbot:sqlbot_password@database:5432/sqlbot

# Optional
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=your_azure_tenant_id
```

### Port Configuration

Default ports used:
- **Frontend**: 3000 (development), 80 (production)
- **Backend**: 8000
- **Database**: 5432
- **Redis**: 6379

To change ports, modify the `docker-compose.yml` files.

## 🔧 Development vs Production

### Development Environment

Features:
- Hot reload for both frontend and backend
- Volume mounts for live code changes
- Development dependencies included
- Debug logging enabled

```bash
./docker-run.sh dev
```

### Production Environment

Features:
- Optimized builds with multi-stage Dockerfiles
- Nginx serving static files
- Production-ready configurations
- Minimal image sizes
- Health checks enabled

```bash
./docker-run.sh prod
```

## 🏥 Health Checks

Health checks are configured for all services:

- **Frontend**: `GET /health`
- **Backend**: `GET /api/health`
- **Database**: `pg_isready`
- **Redis**: `redis-cli ping`

Check service health:
```bash
docker-compose ps
```

## 📊 Monitoring and Logs

### View Logs

```bash
# All services
./docker-run.sh logs

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Service Status

```bash
./docker-run.sh status
```

## 🔍 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find process using port
   lsof -i :3000
   # Kill process or change port in docker-compose.yml
   ```

2. **Permission denied errors**
   ```bash
   # Fix script permissions
   chmod +x docker-run.sh
   ```

3. **Out of disk space**
   ```bash
   # Clean up Docker
   docker system prune -a
   ```

4. **Environment variables not loaded**
   ```bash
   # Ensure .env file exists
   ls -la backend/.env
   # Check file format (no spaces around =)
   ```

### Reset Everything

```bash
# Complete cleanup
./docker-run.sh clean
docker system prune -a --volumes
```

## 🚀 Deployment

### Production Deployment

1. **Set up environment variables**:
   ```bash
   cp backend/.env.example backend/.env
   # Edit with production values
   ```

2. **Build and start**:
   ```bash
   ./docker-run.sh prod --detach
   ```

3. **Verify deployment**:
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:8000/api/health
   ```

### Using Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml sqlbot
```

### Using Kubernetes

Convert docker-compose to Kubernetes manifests:
```bash
# Install kompose
curl -L https://github.com/kubernetes/kompose/releases/latest/download/kompose-linux-amd64 -o kompose
chmod +x kompose

# Convert
./kompose convert -f docker-compose.yml
```

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **Network**: Services communicate through isolated Docker network
3. **User Permissions**: Backend runs as non-root user
4. **Secrets**: Use Docker secrets for production deployments

## 📈 Performance Tuning

### Resource Limits

Add resource limits to docker-compose.yml:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Volume Optimization

Use named volumes for better performance:
```yaml
volumes:
  node_modules:
  postgres_data:
```

## 🆘 Support

If you encounter issues:

1. Check the logs: `./docker-run.sh logs`
2. Verify environment configuration
3. Ensure all required ports are available
4. Check Docker and Docker Compose versions
5. Review this documentation

For additional help, please check the main README.md or create an issue in the project repository.