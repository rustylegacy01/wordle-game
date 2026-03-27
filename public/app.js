// Wordle Game Logic
class WordleGame {
    constructor() {
        this.currentRow = 0;
        this.currentTile = 0;
        this.guesses = [];
        this.gameOver = false;
        this.won = false;
        this.wordHash = null;
        this.hardMode = false;
        
        // Keyboard layout
        this.keyboardLayout = [
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
        ];
        
        // Letter states for keyboard
        this.letterStates = {};
        
        this.init();
    }
    
    async init() {
        this.loadSettings();
        this.createBoard();
        this.createKeyboard();
        this.attachEventListeners();
        this.loadStats();
        
        // Get today's word hash from server
        try {
            const response = await fetch('/api/word');
            const data = await response.json();
            this.wordHash = data.hash;
        } catch (err) {
            console.error('Failed to fetch word hash:', err);
        }
        
        // Check for saved game state
        this.loadGameState();
    }
    
    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('wordle-settings') || '{}');
        this.hardMode = settings.hardMode || false;
        
        if (settings.darkTheme !== false) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        
        if (settings.colorBlind) {
            document.documentElement.setAttribute('data-color-blind', 'true');
        }
        
        // Update toggle states
        document.getElementById('hard-mode').checked = this.hardMode;
        document.getElementById('dark-theme').checked = settings.darkTheme !== false;
        document.getElementById('color-blind').checked = settings.colorBlind || false;
    }
    
    saveSettings() {
        const settings = {
            hardMode: document.getElementById('hard-mode').checked,
            darkTheme: document.getElementById('dark-theme').checked,
            colorBlind: document.getElementById('color-blind').checked
        };
        localStorage.setItem('wordle-settings', JSON.stringify(settings));
    }
    
    createBoard() {
        const board = document.getElementById('board');
        board.innerHTML = '';
        
        for (let i = 0; i < 6; i++) {
            const row = document.createElement('div');
            row.className = 'row';
            row.dataset.row = i;
            
            for (let j = 0; j < 5; j++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.row = i;
                tile.dataset.col = j;
                row.appendChild(tile);
            }
            
            board.appendChild(row);
        }
    }
    
    createKeyboard() {
        const keyboard = document.getElementById('keyboard');
        keyboard.innerHTML = '';
        
        this.keyboardLayout.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'keyboard-row';
            
            row.forEach(key => {
                const keyBtn = document.createElement('button');
                keyBtn.className = 'key';
                keyBtn.textContent = key;
                keyBtn.dataset.key = key;
                
                if (key === 'ENTER' || key === 'BACKSPACE') {
                    keyBtn.classList.add('wide');
                }
                
                keyBtn.addEventListener('click', () => this.handleKeyPress(key));
                rowDiv.appendChild(keyBtn);
            });
            
            keyboard.appendChild(rowDiv);
        });
    }
    
    attachEventListeners() {
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleKeyPress('ENTER');
            } else if (e.key === 'Backspace') {
                this.handleKeyPress('BACKSPACE');
            } else if (/^[a-zA-Z]$/.test(e.key)) {
                this.handleKeyPress(e.key.toUpperCase());
            }
        });
        
        // Modal buttons
        document.getElementById('help-btn').addEventListener('click', () => this.openModal('help-modal'));
        document.getElementById('stats-btn').addEventListener('click', () => this.openModal('game-over-modal'));
        document.getElementById('leaderboard-btn').addEventListener('click', () => this.openLeaderboard());
        document.getElementById('settings-btn').addEventListener('click', () => this.openModal('settings-modal'));
        
        // Close buttons
        document.getElementById('close-help').addEventListener('click', () => this.closeModal('help-modal'));
        document.getElementById('close-leaderboard').addEventListener('click', () => this.closeModal('leaderboard-modal'));
        document.getElementById('close-settings').addEventListener('click', () => this.closeModal('settings-modal'));
        
        // Close on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        // Settings toggles
        document.getElementById('dark-theme').addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            this.saveSettings();
        });
        
        document.getElementById('color-blind').addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.setAttribute('data-color-blind', 'true');
            } else {
                document.documentElement.removeAttribute('data-color-blind');
            }
            this.saveSettings();
        });
        
        document.getElementById('hard-mode').addEventListener('change', (e) => {
            this.hardMode = e.target.checked;
            this.saveSettings();
        });
        
        // Reset stats
        document.getElementById('reset-stats').addEventListener('click', () => {
            if (confirm('Are you sure you want to reset your statistics?')) {
                localStorage.removeItem('wordle-stats');
                this.loadStats();
                this.showMessage('Statistics reset');
            }
        });
        
        // Share button
        document.getElementById('share-btn').addEventListener('click', () => this.shareResults());
        
        // Play again button
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.closeModal('game-over-modal');
            this.restartGame();
        });
        
        // Submit score
        document.getElementById('submit-score-btn').addEventListener('click', () => this.submitScore());
    }
    
    handleKeyPress(key) {
        if (this.gameOver) return;
        
        if (key === 'ENTER') {
            this.submitGuess();
        } else if (key === 'BACKSPACE') {
            this.deleteLetter();
        } else if (this.currentTile < 5) {
            this.addLetter(key);
        }
    }
    
    addLetter(letter) {
        const tile = this.getTile(this.currentRow, this.currentTile);
        tile.textContent = letter;
        tile.classList.add('filled');
        
        // Add animation
        tile.style.animation = 'none';
        setTimeout(() => {
            tile.style.animation = '';
        }, 10);
        
        this.currentTile++;
    }
    
    deleteLetter() {
        if (this.currentTile > 0) {
            this.currentTile--;
            const tile = this.getTile(this.currentRow, this.currentTile);
            tile.textContent = '';
            tile.classList.remove('filled');
        }
    }
    
    getTile(row, col) {
        return document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
    }
    
    async submitGuess() {
        if (this.currentTile < 5) {
            this.shakeRow();
            this.showMessage('Not enough letters');
            return;
        }
        
        const guess = this.getCurrentGuess();
        console.log('Submitting guess:', guess, 'Length:', guess.length);
        
        // Hard mode validation
        if (this.hardMode && this.currentRow > 0) {
            const previousGuess = this.guesses[this.guesses.length - 1];
            const valid = this.validateHardMode(guess, previousGuess);
            if (!valid) {
                this.shakeRow();
                this.showMessage('Must use revealed hints');
                return;
            }
        }
        
        try {
            const response = await fetch('/api/guess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guess })
            });
            
            const data = await response.json();
            console.log('Response:', data);
            
            if (!response.ok) {
                this.shakeRow();
                this.showMessage(data.error || 'Invalid word');
                return;
            }
            
            // Animate tiles
            await this.animateTiles(data.result);
            
            // Update keyboard
            this.updateKeyboard(guess, data.result);
            
            // Store guess
            this.guesses.push({ guess, result: data.result });
            
            // Check win/lose
            if (data.correct) {
                this.won = true;
                this.gameOver = true;
                setTimeout(() => this.endGame(), 1500);
            } else if (this.currentRow === 5) {
                this.gameOver = true;
                setTimeout(() => this.endGame(), 1500);
            } else {
                this.currentRow++;
                this.currentTile = 0;
            }
            
            this.saveGameState();
            
        } catch (err) {
            console.error('Error submitting guess:', err);
            this.showMessage('Network error. Please try again.');
        }
    }
    
    getCurrentGuess() {
        let guess = '';
        for (let i = 0; i < 5; i++) {
            guess += this.getTile(this.currentRow, i).textContent;
        }
        return guess.toLowerCase();
    }
    
    validateHardMode(guess, previous) {
        // Must use all correct letters in same position
        // Must use all present letters somewhere
        const guessLetters = guess.split('');
        
        for (let i = 0; i < 5; i++) {
            if (previous.result[i] === 'correct' && guessLetters[i] !== previous.guess[i]) {
                return false;
            }
        }
        
        return true;
    }
    
    async animateTiles(results) {
        for (let i = 0; i < 5; i++) {
            const tile = this.getTile(this.currentRow, i);
            
            await new Promise(resolve => setTimeout(resolve, 300));
            
            tile.classList.add('flip');
            
            await new Promise(resolve => setTimeout(resolve, 250));
            
            tile.classList.add(results[i]);
        }
    }
    
    updateKeyboard(guess, results) {
        const letters = guess.split('');
        
        letters.forEach((letter, i) => {
            const upperLetter = letter.toUpperCase();
            const result = results[i];
            const currentState = this.letterStates[upperLetter];
            
            // Priority: correct > present > absent
            if (result === 'correct' || 
                (result === 'present' && currentState !== 'correct') ||
                (result === 'absent' && !currentState)) {
                this.letterStates[upperLetter] = result;
            }
        });
        
        // Update keyboard UI
        Object.entries(this.letterStates).forEach(([letter, state]) => {
            const key = document.querySelector(`.key[data-key="${letter}"]`);
            if (key) {
                key.className = `key ${state}`;
                if (letter === 'ENTER' || letter === 'BACKSPACE') {
                    key.classList.add('wide');
                }
            }
        });
    }
    
    shakeRow() {
        const row = document.querySelector(`.row[data-row="${this.currentRow}"]`);
        row.classList.add('shake');
        setTimeout(() => row.classList.remove('shake'), 500);
    }
    
    showMessage(text, duration = 2000) {
        const container = document.getElementById('message-container');
        container.innerHTML = `<div class="message">${text}</div>`;
        
        setTimeout(() => {
            container.innerHTML = '';
        }, duration);
    }
    
    endGame() {
        this.updateStats();
        this.showGameOverModal();
    }
    
    updateStats() {
        const stats = JSON.parse(localStorage.getItem('wordle-stats') || '{}');
        
        stats.played = (stats.played || 0) + 1;
        
        if (this.won) {
            stats.won = (stats.won || 0) + 1;
            stats.currentStreak = (stats.currentStreak || 0) + 1;
            stats.maxStreak = Math.max(stats.maxStreak || 0, stats.currentStreak);
            
            // Guess distribution
            stats.guessDistribution = stats.guessDistribution || {};
            const guessCount = this.currentRow + 1;
            stats.guessDistribution[guessCount] = (stats.guessDistribution[guessCount] || 0) + 1;
        } else {
            stats.currentStreak = 0;
        }
        
        localStorage.setItem('wordle-stats', JSON.stringify(stats));
    }
    
    loadStats() {
        const stats = JSON.parse(localStorage.getItem('wordle-stats') || '{}');
        
        document.getElementById('stat-played').textContent = stats.played || 0;
        document.getElementById('stat-win').textContent = stats.played 
            ? Math.round((stats.won || 0) / stats.played * 100) 
            : 0;
        document.getElementById('stat-streak').textContent = stats.currentStreak || 0;
        document.getElementById('stat-max').textContent = stats.maxStreak || 0;
        
        // Guess distribution
        const distribution = stats.guessDistribution || {};
        const maxCount = Math.max(...Object.values(distribution), 1);
        
        const container = document.getElementById('guess-distribution');
        container.innerHTML = '';
        
        for (let i = 1; i <= 6; i++) {
            const count = distribution[i] || 0;
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const isCurrent = this.won && this.currentRow + 1 === i;
            
            const bar = document.createElement('div');
            bar.className = 'guess-bar';
            bar.innerHTML = `
                <div class="guess-label">${i}</div>
                <div class="guess-progress ${isCurrent ? 'current' : ''}" style="width: ${Math.max(percentage, 5)}%">
                    ${count}
                </div>
            `;
            container.appendChild(bar);
        }
    }
    
    showGameOverModal() {
        const modal = document.getElementById('game-over-modal');
        const title = document.getElementById('game-over-title');
        const message = document.getElementById('game-over-message');
        
        if (this.won) {
            title.textContent = this.getWinMessage(this.currentRow);
            message.textContent = `You guessed the word in ${this.currentRow + 1} ${this.currentRow === 0 ? 'try' : 'tries'}!`;
        } else {
            title.textContent = 'Better luck next time!';
            message.textContent = 'You ran out of guesses.';
        }
        
        this.loadStats();
        this.startCountdown();
        this.openModal('game-over-modal');
    }
    
    getWinMessage(row) {
        const messages = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];
        return messages[row] || 'Congratulations!';
    }
    
    startCountdown() {
        const updateCountdown = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setUTCHours(24, 0, 0, 0);
            
            const diff = tomorrow - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            document.getElementById('countdown').textContent = 
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };
        
        updateCountdown();
        this.countdownInterval = setInterval(updateCountdown, 1000);
    }
    
    async shareResults() {
        const stats = JSON.parse(localStorage.getItem('wordle-stats') || '{}');
        const today = new Date().toISOString().split('T')[0];
        
        let shareText = `Wordle ${today}\n`;
        
        if (this.won) {
            shareText += `${this.currentRow + 1}/6\n\n`;
        } else {
            shareText += `X/6\n\n`;
        }
        
        // Add emoji grid
        this.guesses.forEach(guess => {
            let row = '';
            guess.result.forEach(result => {
                if (result === 'correct') row += '🟩';
                else if (result === 'present') row += '🟨';
                else row += '⬜';
            });
            shareText += row + '\n';
        });
        
        shareText += '\nPlay at: your-domain.com';
        
        try {
            await navigator.clipboard.writeText(shareText);
            this.showMessage('Copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
            this.showMessage('Failed to copy');
        }
    }
    
    async openLeaderboard() {
        this.openModal('leaderboard-modal');
        
        try {
            const response = await fetch('/api/leaderboard');
            const data = await response.json();
            
            const list = document.getElementById('leaderboard-list');
            list.innerHTML = '';
            
            if (data.leaderboard.length === 0) {
                list.innerHTML = '<div class="loading">No scores yet. Be the first!</div>';
                return;
            }
            
            data.leaderboard.forEach((entry, index) => {
                const item = document.createElement('div');
                item.className = 'leaderboard-item';
                item.innerHTML = `
                    <div class="leaderboard-rank ${index < 3 ? 'top-3' : ''}">${index + 1}</div>
                    <div class="leaderboard-name">${this.escapeHtml(entry.playerName)}</div>
                    <div class="leaderboard-guesses">${entry.guesses} guesses</div>
                `;
                list.appendChild(item);
            });
            
        } catch (err) {
            console.error('Failed to load leaderboard:', err);
            document.getElementById('leaderboard-list').innerHTML = 
                '<div class="loading">Failed to load leaderboard</div>';
        }
    }
    
    async submitScore() {
        const nameInput = document.getElementById('player-name');
        const name = nameInput.value.trim();
        
        if (!name) {
            this.showMessage('Please enter your name');
            return;
        }
        
        if (!this.gameOver) {
            this.showMessage('Finish the game first!');
            return;
        }
        
        const guessHistory = this.guesses.map(g => g.guess);
        
        try {
            const response = await fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerName: name,
                    guesses: this.won ? this.currentRow + 1 : 7,
                    won: this.won,
                    guessHistory,
                    wordHash: this.wordHash
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showMessage(`Score submitted! Rank: #${data.rank}`);
                document.getElementById('submit-score-section').style.display = 'none';
                this.openLeaderboard();
            } else {
                this.showMessage(data.error || 'Failed to submit score');
            }
        } catch (err) {
            console.error('Error submitting score:', err);
            this.showMessage('Network error. Please try again.');
        }
    }
    
    openModal(id) {
        document.getElementById(id).classList.add('active');
    }
    
    closeModal(id) {
        document.getElementById(id).classList.remove('active');
        if (id === 'game-over-modal' && this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }
    
    saveGameState() {
        const state = {
            currentRow: this.currentRow,
            currentTile: this.currentTile,
            guesses: this.guesses,
            gameOver: this.gameOver,
            won: this.won,
            letterStates: this.letterStates,
            date: new Date().toDateString()
        };
        localStorage.setItem('wordle-game-state', JSON.stringify(state));
    }
    
    loadGameState() {
        const saved = localStorage.getItem('wordle-game-state');
        if (!saved) return;
        
        const state = JSON.parse(saved);
        
        // Check if it's from today
        if (state.date !== new Date().toDateString()) {
            localStorage.removeItem('wordle-game-state');
            return;
        }
        
        // Restore state
        this.currentRow = state.currentRow;
        this.currentTile = state.currentTile;
        this.guesses = state.guesses || [];
        this.gameOver = state.gameOver;
        this.won = state.won;
        this.letterStates = state.letterStates || {};
        
        // Restore board
        this.guesses.forEach((guess, rowIndex) => {
            const letters = guess.guess.split('');
            letters.forEach((letter, colIndex) => {
                const tile = this.getTile(rowIndex, colIndex);
                tile.textContent = letter.toUpperCase();
                tile.classList.add('filled', guess.result[colIndex]);
            });
        });
        
        // Restore current row
        if (!this.gameOver && this.currentRow < 6) {
            const currentGuess = this.guesses[this.currentRow];
            if (currentGuess) {
                const letters = currentGuess.guess.split('');
                letters.forEach((letter, colIndex) => {
                    const tile = this.getTile(this.currentRow, colIndex);
                    tile.textContent = letter.toUpperCase();
                    tile.classList.add('filled');
                });
            }
        }
        
        // Restore keyboard
        Object.entries(this.letterStates).forEach(([letter, state]) => {
            const key = document.querySelector(`.key[data-key="${letter}"]`);
            if (key) {
                key.className = `key ${state}`;
                if (letter === 'ENTER' || letter === 'BACKSPACE') {
                    key.classList.add('wide');
                }
            }
        });
        
        if (this.gameOver) {
            setTimeout(() => this.showGameOverModal(), 500);
        }
    }
    
    restartGame() {
        this.currentRow = 0;
        this.currentTile = 0;
        this.guesses = [];
        this.gameOver = false;
        this.won = false;
        this.letterStates = {};
        
        localStorage.removeItem('wordle-game-state');
        
        this.createBoard();
        this.createKeyboard();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WordleGame();
});