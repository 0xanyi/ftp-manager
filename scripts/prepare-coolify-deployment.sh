#!/bin/bash

# ToovyDrop Coolify Deployment Preparation Script
# This script prepares your local environment for Coolify deployment

set -e

echo "🚀 ToovyDrop Coolify Deployment Preparation"
echo "============================================"

# Check if we're in the right directory
if [ ! -f "docker-compose.coolify.yml" ]; then
    echo "❌ Error: docker-compose.coolify.yml not found. Run this script from the project root."
    exit 1
fi

# Generate secure JWT secrets
echo "🔐 Generating secure JWT secrets..."
JWT_ACCESS_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)

echo "✅ Generated JWT secrets (save these for Coolify environment):"
echo "JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}"
echo "JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}"
echo ""

# Validate Docker setup
echo "🐳 Validating Docker setup..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed or not in PATH"
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Test build locally (optional)
read -p "🔨 Do you want to test build the Docker images locally? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔨 Testing Docker builds..."
    
    # Test backend build
    echo "Building backend..."
    cd backend
    docker build -f Dockerfile.production -t toovydrop-backend-test .
    cd ..
    
    # Test frontend build
    echo "Building frontend..."
    cd frontend
    docker build -f Dockerfile.production -t toovydrop-frontend-test . \
        --build-arg VITE_API_URL=https://yourdomain.com/api \
        --build-arg VITE_WS_URL=wss://yourdomain.com
    cd ..
    
    echo "✅ Docker builds completed successfully"
    
    # Cleanup test images
    docker rmi toovydrop-backend-test toovydrop-frontend-test
fi

# Validate Coolify deployment configuration
echo "📋 Validating Coolify configuration..."

# Check required files
REQUIRED_FILES=(
    "docker-compose.coolify.yml"
    ".env.coolify"
    "backend/Dockerfile.production"
    "frontend/Dockerfile.production"
    "docs/coolify-deployment-guide.md"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ Missing: $file"
        exit 1
    fi
done

# Check Git status
echo "📝 Checking Git status..."
if git diff --quiet && git diff --staged --quiet; then
    echo "✅ Working directory is clean"
else
    echo "⚠️  Working directory has uncommitted changes"
    echo "   Make sure to commit and push all changes before deploying to Coolify"
fi

# Display pre-deployment checklist
echo ""
echo "📋 PRE-DEPLOYMENT CHECKLIST"
echo "============================"
echo "Before deploying to Coolify, ensure you have:"
echo ""
echo "🌐 Infrastructure:"
echo "  □ Coolify instance running and accessible"
echo "  □ Domain name configured and DNS pointing to Coolify server"
echo "  □ SSL certificate setup (automatic with Let's Encrypt)"
echo ""
echo "🔧 Configuration:"
echo "  □ FTP server details ready (host, credentials, etc.)"
echo "  □ JWT secrets generated (shown above)"
echo "  □ Database name decided (default: toovydrop)"
echo ""
echo "📦 Repository:"
echo "  □ All changes committed and pushed to Git"
echo "  □ Repository accessible from your Coolify instance"
echo "  □ docker-compose.coolify.yml in repository root"
echo ""
echo "🛡️  Security:"
echo "  □ Strong passwords for all services"
echo "  □ FTP credentials secured"
echo "  □ Rate limiting configured"
echo "  □ CSRF protection enabled"
echo ""

# Display next steps
echo "🎯 NEXT STEPS"
echo "============="
echo "1. Commit and push any remaining changes:"
echo "   git add ."
echo "   git commit -m 'feat: add Coolify deployment configuration'"
echo "   git push origin main"
echo ""
echo "2. Follow the deployment guide:"
echo "   cat docs/coolify-deployment-guide.md"
echo ""
echo "3. In Coolify:"
echo "   - Create new project"
echo "   - Add Docker Compose resource from Git"
echo "   - Use: docker-compose.coolify.yml"
echo "   - Configure environment variables from .env.coolify"
echo "   - Deploy!"
echo ""

echo "✨ Ready for Coolify deployment!"
echo ""
echo "📖 For detailed instructions, see: docs/coolify-deployment-guide.md"