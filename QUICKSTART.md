# Wordle Game - Quick Start Guide

## Project Structure

```
wordle/
├── .github/workflows/deploy.yml  # GitHub Actions auto-deployment
├── data/                         # SQLite database (auto-created)
├── public/                       # Frontend files
│   ├── index.html               # Main game UI
│   ├── style.css                # Styles
│   └── app.js                   # Game logic
├── words/                        # Word lists
│   ├── answers.json             # Possible answers (524 words)
│   └── valid.json               # Valid guesses (768 words)
├── server.js                     # Express backend
├── database.js                   # SQLite database layer
├── words.js                      # Word management
├── deploy.sh                     # Manual deployment script
├── package.json                  # Dependencies
├── .env.example                  # Environment template
└── README.md                     # Full documentation
```

## Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or start production server
npm start
```

Visit `http://localhost:3000`

## VPS Deployment (Manual)

### 1. Prepare Your VPS

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Create deployment directory
sudo mkdir -p /var/www/wordle
sudo chown $USER:$USER /var/www/wordle
```

### 2. Deploy Using Script

From your local machine:

```bash
cd wordle
./deploy.sh user@your-vps-ip /var/www/wordle
```

### 3. Setup Nginx (Optional but Recommended)

```bash
sudo apt install nginx

# Create site config
sudo nano /etc/nginx/sites-available/wordle
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/wordle /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## GitHub Actions Auto-Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/wordle-game.git
git push -u origin main
```

### 2. Add GitHub Secrets

Go to Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Your VPS IP or domain |
| `VPS_USER` | SSH username |
| `VPS_SSH_KEY` | Private SSH key contents |
| `VPS_DEPLOY_PATH` | `/var/www/wordle` |

### 3. Generate SSH Key

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Add public key to VPS
ssh-copy-id -i ~/.ssh/github_actions.pub user@your-vps

# Copy private key for GitHub secret
cat ~/.ssh/github_actions
```

### 4. Auto-Deploy

Every push to `main` branch will now automatically deploy!

## Environment Variables

Create `.env` file:

```env
PORT=3000
NODE_ENV=production
# Optional: Override daily word for testing
# DAILY_WORD=crane
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/word` | GET | Get today's word hash |
| `/api/guess` | POST | Submit a guess |
| `/api/leaderboard` | GET | Get top scores |
| `/api/score` | POST | Submit score |
| `/api/health` | GET | Health check |

## Features

- ✅ Daily word rotation (same word for all players)
- ✅ Server-side validation (anti-cheat)
- ✅ Rate limiting (30 guesses/min, 10 scores/5min)
- ✅ SQLite leaderboard with persistence
- ✅ Responsive design (mobile + desktop)
- ✅ Dark/light theme toggle
- ✅ Hard mode option
- ✅ Color blind mode
- ✅ Share results (emoji grid)
- ✅ Game state persistence

## Security

- Words validated server-side
- Score submissions verified against guess history
- Rate limiting on all endpoints
- Word hash prevents client-side cheating
- Helmet.js for security headers

## Troubleshooting

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
# Or use different port
PORT=3001 npm start
```

### PM2 issues
```bash
# View logs
pm2 logs wordle-game

# Restart
pm2 restart wordle-game

# List processes
pm2 list
```

### Database locked
```bash
# Stop server, remove lock file
rm data/leaderboard.db-journal
# Restart server
```

## Customization

### Add More Words

Edit `words/answers.json` and `words/valid.json`:

```json
["apple", "beach", "crane", "dance", ...]
```

### Change Word Rotation Date

Edit `words.js`:
```javascript
const EPOCH = new Date('2024-01-01T00:00:00Z').getTime();
```

### Change Colors

Edit CSS variables in `public/style.css`:
```css
:root {
    --color-correct: #6aaa64;
    --color-present: #c9b458;
    --color-absent: #787c7e;
}
```

## License

MIT - Feel free to use for personal or commercial projects!