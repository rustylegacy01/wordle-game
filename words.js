const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load word lists - check multiple possible locations
function findWordsFile(filename) {
    const possiblePaths = [
        path.join(__dirname, 'words', filename),
        path.join(process.cwd(), 'words', filename),
        path.join(__dirname, '..', 'words', filename),
    ];
    
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }
    return possiblePaths[0]; // Return default if not found
}

const answersPath = findWordsFile('answers.json');
const validPath = findWordsFile('valid.json');

let ANSWERS = [];
let VALID_GUESSES = new Set();

try {
    console.log(`📂 Looking for words at: ${answersPath}`);
    ANSWERS = JSON.parse(fs.readFileSync(answersPath, 'utf8'));
    const validWords = JSON.parse(fs.readFileSync(validPath, 'utf8'));
    VALID_GUESSES = new Set([...validWords, ...ANSWERS]);
    console.log(`📚 Loaded ${ANSWERS.length} answer words and ${VALID_GUESSES.size} valid guesses`);
} catch (err) {
    console.error('❌ Error loading word lists:', err.message);
    console.log('📂 Current directory:', process.cwd());
    console.log('📂 __dirname:', __dirname);
    // Fallback minimal word list
    ANSWERS = ['crane', 'slate', 'apple', 'beach', 'dance', 'eagle', 'flame', 'grape', 'house', 'image', 'judge', 'knife', 'lemon', 'money', 'night', 'ocean', 'paint', 'queen', 'radio', 'scale', 'table', 'uncle', 'voice', 'water', 'youth'];
    VALID_GUESSES = new Set(ANSWERS);
    console.log(`⚠️ Using fallback word list with ${ANSWERS.length} words`);
}

// Epoch for daily word rotation (January 1, 2024)
const EPOCH = new Date('2024-01-01T00:00:00Z').getTime();

// Get today's date as YYYY-MM-DD
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

// Get day number since epoch
function getDayNumber() {
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const epoch = new Date(EPOCH);
    const diffTime = today.getTime() - epoch.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}

// Get today's word
function getDailyWord() {
    // Allow override via environment variable for testing
    if (process.env.DAILY_WORD) {
        return process.env.DAILY_WORD.toLowerCase();
    }
    
    const dayNumber = getDayNumber();
    const index = dayNumber % ANSWERS.length;
    return ANSWERS[index];
}

// Get hash of today's word (for client verification without exposing word)
function getWordHash() {
    const word = getDailyWord();
    const date = getTodayString();
    return crypto.createHash('sha256').update(word + date).digest('hex').substring(0, 16);
}

// Check if a word is valid (in answer list or valid guesses)
function isValidWord(word) {
    if (!word || typeof word !== 'string') return false;
    return VALID_GUESSES.has(word.toLowerCase());
}

// Evaluate a guess against the target word
// Returns: { feedback: string[], correct: boolean }
// feedback: 'correct' (green), 'present' (yellow), 'absent' (gray)
function evaluateGuess(guess, target) {
    guess = guess.toLowerCase();
    target = target.toLowerCase();
    
    const feedback = new Array(5).fill('absent');
    const targetLetters = target.split('');
    const guessLetters = guess.split('');
    
    // First pass: mark correct positions
    for (let i = 0; i < 5; i++) {
        if (guessLetters[i] === targetLetters[i]) {
            feedback[i] = 'correct';
            targetLetters[i] = null; // Mark as used
            guessLetters[i] = null;  // Mark as processed
        }
    }
    
    // Second pass: mark present but wrong position
    for (let i = 0; i < 5; i++) {
        if (guessLetters[i] !== null) {
            const targetIndex = targetLetters.indexOf(guessLetters[i]);
            if (targetIndex !== -1) {
                feedback[i] = 'present';
                targetLetters[targetIndex] = null; // Mark as used
            }
        }
    }
    
    return {
        feedback,
        correct: guess === target
    };
}

// Get a random word (for testing/development)
function getRandomWord() {
    const index = Math.floor(Math.random() * ANSWERS.length);
    return ANSWERS[index];
}

module.exports = {
    ANSWERS,
    VALID_GUESSES,
    getDailyWord,
    getWordHash,
    isValidWord,
    evaluateGuess,
    getRandomWord,
    getDayNumber
};