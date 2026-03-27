const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const { getDailyWord, getWordHash, isValidWord, evaluateGuess } = require('./words');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:"],
        },
    },
}));

app.use(cors());
app.use(express.json());

// Rate limiting
const guessLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per minute
    message: { error: 'Too many guesses, please slow down' },
    standardHeaders: true,
    legacyHeaders: false,
});

const scoreLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // limit each IP to 10 score submissions per 5 minutes
    message: { error: 'Too many score submissions, please slow down' },
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Get today's word hash (for client-side validation consistency)
app.get('/api/word', (req, res) => {
    const wordHash = getWordHash();
    const today = new Date().toISOString().split('T')[0];
    
    res.json({
        date: today,
        hash: wordHash,
        wordLength: 5,
        maxGuesses: 6
    });
});

// Submit a guess
app.post('/api/guess', guessLimiter, (req, res) => {
    const { guess } = req.body;
    
    if (!guess || typeof guess !== 'string') {
        return res.status(400).json({ error: 'Guess is required' });
    }
    
    const cleanGuess = guess.toLowerCase().trim();
    
    if (cleanGuess.length !== 5) {
        return res.status(400).json({ error: 'Guess must be 5 letters' });
    }
    
    if (!/^[a-z]+$/.test(cleanGuess)) {
        return res.status(400).json({ error: 'Guess must contain only letters' });
    }
    
    // Check if word is valid
    if (!isValidWord(cleanGuess)) {
        return res.status(400).json({ error: 'Not in word list' });
    }
    
    const dailyWord = getDailyWord();
    const result = evaluateGuess(cleanGuess, dailyWord);
    
    res.json({
        guess: cleanGuess,
        result: result.feedback,
        correct: result.correct,
        dailyWordHash: getWordHash()
    });
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const leaderboard = db.getLeaderboard(limit);
    
    res.json({
        leaderboard,
        total: db.getTotalPlayers()
    });
});

// Submit score
app.post('/api/score', scoreLimiter, (req, res) => {
    const { playerName, guesses, won, guessHistory, wordHash } = req.body;
    
    // Validation
    if (!playerName || typeof playerName !== 'string') {
        return res.status(400).json({ error: 'Player name is required' });
    }
    
    if (typeof guesses !== 'number' || guesses < 1 || guesses > 6) {
        return res.status(400).json({ error: 'Invalid guess count' });
    }
    
    if (typeof won !== 'boolean') {
        return res.status(400).json({ error: 'Win status is required' });
    }
    
    if (!Array.isArray(guessHistory) || guessHistory.length === 0) {
        return res.status(400).json({ error: 'Guess history is required' });
    }
    
    // Verify word hash matches today's word
    if (wordHash !== getWordHash()) {
        return res.status(400).json({ error: 'Invalid word hash' });
    }
    
    // Anti-cheat: Verify guess history
    const dailyWord = getDailyWord();
    
    // Check if last guess matches the daily word (if won)
    if (won) {
        const lastGuess = guessHistory[guessHistory.length - 1].toLowerCase();
        if (lastGuess !== dailyWord) {
            return res.status(400).json({ error: 'Invalid game result' });
        }
        
        // Verify all guesses are valid words
        for (const g of guessHistory) {
            if (!isValidWord(g.toLowerCase())) {
                return res.status(400).json({ error: 'Invalid guess in history' });
            }
        }
        
        // Verify guess count matches
        if (guessHistory.length !== guesses) {
            return res.status(400).json({ error: 'Guess count mismatch' });
        }
    }
    
    // Clean player name
    const cleanName = playerName.trim().slice(0, 20).replace(/[<>\"']/g, '');
    
    // Save score
    const scoreId = db.addScore({
        playerName: cleanName,
        guesses,
        won,
        guessHistory: JSON.stringify(guessHistory)
    });
    
    // Get player's rank
    const rank = db.getPlayerRank(scoreId);
    
    res.json({
        success: true,
        id: scoreId,
        rank,
        playerName: cleanName,
        guesses,
        won
    });
});

// Get player's stats
app.get('/api/stats/:playerName', (req, res) => {
    const playerName = req.params.playerName;
    const stats = db.getPlayerStats(playerName);
    
    if (!stats) {
        return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json(stats);
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎮 Wordle server running on port ${PORT}`);
    console.log(`📅 Today's word hash: ${getWordHash()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;