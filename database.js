const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'leaderboard.db');
const db = new Database(dbPath);

// Initialize database
db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_name TEXT NOT NULL,
        guesses INTEGER NOT NULL,
        won BOOLEAN NOT NULL,
        guess_history TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_scores_won ON scores(won);
    CREATE INDEX IF NOT EXISTS idx_scores_guesses ON scores(guesses);
    CREATE INDEX IF NOT EXISTS idx_scores_created ON scores(created_at);
    CREATE INDEX IF NOT EXISTS idx_player_name ON scores(player_name);
`);

// Prepared statements
const addScoreStmt = db.prepare(`
    INSERT INTO scores (player_name, guesses, won, guess_history)
    VALUES (@playerName, @guesses, @won, @guessHistory)
`);

const getLeaderboardStmt = db.prepare(`
    SELECT 
        player_name as playerName,
        guesses,
        won,
        created_at as date,
        id
    FROM scores
    WHERE won = 1
    ORDER BY guesses ASC, created_at ASC
    LIMIT @limit
`);

const getTotalPlayersStmt = db.prepare(`
    SELECT COUNT(DISTINCT player_name) as count FROM scores
`);

const getPlayerStatsStmt = db.prepare(`
    SELECT 
        player_name as playerName,
        COUNT(*) as gamesPlayed,
        SUM(CASE WHEN won = 1 THEN 1 ELSE 0 END) as gamesWon,
        ROUND(AVG(CASE WHEN won = 1 THEN guesses END), 2) as averageGuesses,
        MIN(CASE WHEN won = 1 THEN guesses END) as bestGame,
        MAX(created_at) as lastPlayed
    FROM scores
    WHERE player_name = @playerName
    GROUP BY player_name
`);

const getRankStmt = db.prepare(`
    SELECT COUNT(*) + 1 as rank
    FROM scores
    WHERE won = 1 
    AND (
        guesses < (SELECT guesses FROM scores WHERE id = @id)
        OR (
            guesses = (SELECT guesses FROM scores WHERE id = @id)
            AND created_at < (SELECT created_at FROM scores WHERE id = @id)
        )
    )
`);

// Database functions
const database = {
    addScore({ playerName, guesses, won, guessHistory }) {
        const result = addScoreStmt.run({
            playerName,
            guesses,
            won: won ? 1 : 0,
            guessHistory
        });
        return result.lastInsertRowid;
    },

    getLeaderboard(limit = 10) {
        return getLeaderboardStmt.all({ limit });
    },

    getTotalPlayers() {
        const result = getTotalPlayersStmt.get();
        return result ? result.count : 0;
    },

    getPlayerStats(playerName) {
        return getPlayerStatsStmt.get({ playerName });
    },

    getPlayerRank(scoreId) {
        const result = getRankStmt.get({ id: scoreId });
        return result ? result.rank : null;
    },

    // Cleanup old scores (keep last 90 days)
    cleanup() {
        const stmt = db.prepare(`
            DELETE FROM scores 
            WHERE created_at < datetime('now', '-90 days')
        `);
        const result = stmt.run();
        console.log(`Cleaned up ${result.changes} old scores`);
        return result.changes;
    }
};

// Cleanup old scores on startup (run once per day)
const lastCleanupFile = path.join(dataDir, '.last-cleanup');
const today = new Date().toDateString();
if (!fs.existsSync(lastCleanupFile) || fs.readFileSync(lastCleanupFile, 'utf8') !== today) {
    database.cleanup();
    fs.writeFileSync(lastCleanupFile, today);
}

module.exports = database;