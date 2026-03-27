#!/bin/bash

# Wordle Game Deployment Script
# Usage: ./deploy.sh [user@host] [deploy-path]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
REMOTE_HOST="${1:-}"
DEPLOY_PATH="${2:-/var/www/wordle}"

# Show usage if no host provided
if [ -z "$REMOTE_HOST" ]; then
    echo -e "${YELLOW}Usage: ./deploy.sh user@your-vps-ip [/var/www/wordle]${NC}"
    echo ""
    echo "Example:"
    echo "  ./deploy.sh root@192.168.1.100 /var/www/wordle"
    echo ""
    exit 1
fi

echo -e "${GREEN}🚀 Starting deployment to $REMOTE_HOST...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the wordle directory?${NC}"
    exit 1
fi

# Create deployment archive
echo -e "${YELLOW}📦 Creating deployment archive...${NC}"
tar -czf /tmp/wordle-deploy.tar.gz \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='data/*.db' \
    --exclude='*.tar.gz' \
    .

# Get project name from package.json
PROJECT_NAME=$(cat package.json | grep '"name"' | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[:space:]')
if [ -z "$PROJECT_NAME" ]; then
    PROJECT_NAME="wordle-game"
fi

echo -e "${YELLOW}📤 Uploading to server...${NC}"

# Create remote directory and upload
ssh $REMOTE_HOST "mkdir -p $DEPLOY_PATH"
scp /tmp/wordle-deploy.tar.gz $REMOTE_HOST:$DEPLOY_PATH/

# Execute deployment on remote server
echo -e "${YELLOW}🔧 Installing on remote server...${NC}"

ssh $REMOTE_HOST << EOF
    set -e
    
    cd $DEPLOY_PATH
    
    echo "Backing up database if exists..."
    if [ -f data/leaderboard.db ]; then
        cp data/leaderboard.db data/leaderboard.db.backup.$(date +%Y%m%d_%H%M%S)
        cp data/leaderboard.db data/leaderboard.db.backup
    fi
    
    echo "Extracting files..."
    tar -xzf wordle-deploy.tar.gz
    rm wordle-deploy.tar.gz
    
    echo "Restoring database..."
    if [ -f data/leaderboard.db.backup ]; then
        mv data/leaderboard.db.backup data/leaderboard.db
    fi
    
    echo "Installing dependencies..."
    if ! command -v npm &> /dev/null; then
        echo "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    
    npm ci --production
    
    echo "Setting up PM2..."
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
    
    # Ensure data directory exists with proper permissions
    mkdir -p data
    
    # Start or restart the application
    if pm2 list | grep -q "$PROJECT_NAME"; then
        echo "Restarting existing process..."
        pm2 restart $PROJECT_NAME
    else
        echo "Starting new process..."
        pm2 start server.js --name $PROJECT_NAME
        pm2 save
        pm2 startup systemd -u \$(whoami) --hp \$HOME
    fi
    
    echo "Cleaning up..."
    pm2 flush $PROJECT_NAME 2>/dev/null || true
    
    # Keep only last 5 backups
    ls -t data/leaderboard.db.backup.* 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
    
    echo "Deployment complete!"
EOF

# Clean up local archive
rm -f /tmp/wordle-deploy.tar.gz

# Health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
sleep 2

if ssh $REMOTE_HOST "curl -sf http://localhost:3000/api/health > /dev/null"; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo -e "${GREEN}🎮 Your Wordle game is running at:${NC}"
    echo "  - Local: http://localhost:3000"
    echo "  - Server: http://$REMOTE_HOST:3000"
    echo ""
    echo -e "${YELLOW}Useful commands:${NC}"
    echo "  ssh $REMOTE_HOST 'pm2 logs $PROJECT_NAME'     # View logs"
    echo "  ssh $REMOTE_HOST 'pm2 status'                  # Check status"
    echo "  ssh $REMOTE_HOST 'pm2 restart $PROJECT_NAME'   # Restart app"
else
    echo -e "${RED}⚠️  Health check failed. Check logs with:${NC}"
    echo "  ssh $REMOTE_HOST 'pm2 logs $PROJECT_NAME'"
    exit 1
fi