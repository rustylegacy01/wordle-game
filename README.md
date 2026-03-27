# Wordle Game with Leaderboard

A complete Wordle game with backend API, SQLite leaderboard, and daily word rotation. Built with Node.js, Express, and vanilla JavaScript. Just clone and run with npm.

![Wordle Game](screenshot.png)

## Features

- 🎮 **Classic Wordle Gameplay**: 6 attempts to guess a 5-letter word
- 📱 **Responsive Design**: Works beautifully on mobile and desktop
- 🏆 **Global Leaderboard**: Track top players and their streaks
- 🔄 **Daily Word Rotation**: Same word for all players each day
- 🔒 **Anti-Cheat Protection**: Server-side validation, rate limiting, replay attack prevention
- 🚀 **Simple Setup**: Just clone, install, and run

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/RustyLegacy01/wordle-game.git
cd wordle-game

# Install dependencies
npm install

# Start the server
npm start
```

Visit `http://localhost:9010` to play!

### Development Mode (with auto-reload)

```bash
npm run dev
```

## Environment Variables

Optional `.env` file (created automatically on first run):

```env
PORT=9010
NODE_ENV=development
# Optional: Set a specific daily word for testing
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
curl -X POST http://localhost:9010/api/guess \
  -H "Content-Type: application/json" \
  -d '{"guess":"crane"}'

# Get leaderboard
curl http://localhost:9010/api/leaderboard

# Submit score
curl -X POST http://localhost:9010/api/score \
  -H "Content-Type: application/json" \
  -d '{"playerName":"Player1","guesses":4,"won":true,"guessHistory":["crane","slate","crate","water"]}'
```

## Project Structure

```
wordle/
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