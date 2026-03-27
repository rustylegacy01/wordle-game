# Wordle Game with Leaderboard

A complete, production-ready Wordle game with backend API, SQLite leaderboard, and daily word rotation. Built with Node.js, Express, and vanilla JavaScript.

![Wordle Game](screenshot.png)

## Features

- 🎮 **Classic Wordle Gameplay**: 6 attempts to guess a 5-letter word
- 📱 **Responsive Design**: Works beautifully on mobile and desktop
- 🏆 **Global Leaderboard**: Track top players and their streaks
- 🔄 **Daily Word Rotation**: Same word for all players each day
- 🔒 **Anti-Cheat Protection**: Server-side validation, rate limiting, replay attack prevention
- 🚀 **Production Ready**: VPS deployment with GitHub Actions CI/CD

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- SQLite3

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/wordle-game.git
cd wordle-game

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start the server
npm start
```

Visit `http://localhost:3000` to play!

### Development Mode

```bash
npm run dev
```

## Environment Variables

Create a `.env` file:

```env
PORT=3000
NODE_ENV=production
# Optional: Set a specific daily word (defaults to auto-rotation)
# DAILY_WORD=crane
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/word` | Get today's word hash (for validation) |
| POST | `/api/guess` | Submit a guess, get feedback |
| GET | `/api/leaderboard` | Get top 10 scores |
| POST | `/api/score` | Submit a completed game score |

### Example API Usage

```bash
# Submit a guess
curl -X POST http://localhost:3000/api/guess \
  -H "Content-Type: application/json" \
  -d '{"guess":"crane"}'

# Get leaderboard
curl http://localhost:3000/api/leaderboard

# Submit score
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"playerName":"Player1","guesses":4,"won":true,"guessHistory":["crane","slate","crate","water"]}'
```

## Deployment

### VPS Deployment (Manual)

1. **Setup your VPS** (Ubuntu/Debian recommended):

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone repo
git clone https://github.com/yourusername/wordle-game.git
cd wordle-game
npm install

# Setup environment
cp .env.example .env
nano .env  # Edit as needed

# Start with PM2
pm2 start server.js --name wordle-game
pm2 save
pm2 startup
```

2. **Setup Nginx** (optional, for reverse proxy):

```bash
sudo apt install nginx
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

```bash
sudo ln -s /etc/nginx/sites-available/wordle /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### GitHub Actions Auto-Deployment

This repo includes a GitHub Actions workflow for automatic deployment on push to main.

#### Setup

1. **Add GitHub Secrets** (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | Your VPS IP or domain |
| `VPS_USER` | SSH username |
| `VPS_SSH_KEY` | Private SSH key (contents of `~/.ssh/id_rsa`) |
| `VPS_DEPLOY_PATH` | Path on VPS (e.g., `/var/www/wordle`) |

2. **Generate SSH Key** (on your local machine):

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
# Add public key to VPS authorized_keys
cat ~/.ssh/github_actions.pub | ssh user@your-vps "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
# Copy private key for GitHub secret
cat ~/.ssh/github_actions
```

3. **Prepare VPS**:

```bash
# Create deploy directory
sudo mkdir -p /var/www/wordle
sudo chown $USER:$USER /var/www/wordle

# Install PM2 globally if not already
sudo npm install -g pm2
```

4. **Push to main branch** - deployment happens automatically!

### Manual Deploy Script

Use the included deploy script:

```bash
# Local - run from repo root
./deploy.sh user@your-vps-ip /var/www/wordle
```

## Project Structure

```
wordle/
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions deployment
├── data/
│   └── .gitkeep            # Leaderboard database location
├── public/
│   ├── index.html          # Main game UI
│   ├── style.css           # Styles
│   └── app.js              # Frontend logic
├── words/
│   ├── answers.json        # Possible answer words
│   └── valid.json          # All valid guess words
├── server.js               # Express backend
├── database.js             # SQLite database layer
├── words.js                # Word list management
├── package.json
├── deploy.sh               # Manual deployment script
├── .env.example
├── .gitignore
└── README.md
```

## Security Features

- ✅ **Server-side word validation**: No client-side cheating
- ✅ **Rate limiting**: Prevents brute force attacks
- ✅ **Anti-replay**: Score submissions include verified guess history
- ✅ **Word hash verification**: Ensures consistent daily word
- ✅ **Helmet.js**: Security headers
- ✅ **CORS protection**: Configurable origin restrictions

## Game Rules

1. Guess the 5-letter word in 6 tries
2. Each guess must be a valid 5-letter word
3. Color feedback after each guess:
   - 🟩 **Green**: Letter is correct and in right position
   - 🟨 **Yellow**: Letter is in the word but wrong position
   - ⬜ **Gray**: Letter is not in the word
4. New word every day at midnight UTC

## Customization

### Adding Custom Words

Edit `words/answers.json` for possible answers and `words/valid.json` for valid guesses:

```json
["apple", "beach", "crane", "dance", ...]
```

### Changing Daily Word Schedule

Modify the word rotation logic in `words.js`:

```javascript
// Change epoch date for different rotation schedule
const EPOCH = new Date('2024-01-01').getTime();
```

## License

MIT License - feel free to use this for personal or commercial projects.

## Credits

Built with ❤️ using Node.js, Express, SQLite, and vanilla JavaScript.

Inspired by the original [Wordle](https://www.nytimes.com/games/wordle/index.html) by Josh Wardle.