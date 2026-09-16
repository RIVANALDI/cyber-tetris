/**
 * Core Tetris Engine
 * Complies with Tetris Guideline mechanics:
 * - 7-Bag Random Generator
 * - Super Rotation System (SRS) Wall Kicks
 * - Hold Piece Slot
 * - Ghost Piece Projection
 * - Standard Scoring & Level Progression
 */

// Tetromino Shapes Definition (4x4 matrix for I/O, 3x3 for others)
const TETROMINOES = {
    I: {
        id: 'I',
        name: 'Cyan Line',
        color: '#00f0ff',
        glow: 'rgba(0, 240, 255, 0.7)',
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ]
    },
    J: {
        id: 'J',
        name: 'Blue J',
        color: '#0066ff',
        glow: 'rgba(0, 102, 255, 0.7)',
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ]
    },
    L: {
        id: 'L',
        name: 'Orange L',
        color: '#ff9900',
        glow: 'rgba(255, 153, 0, 0.7)',
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ]
    },
    O: {
        id: 'O',
        name: 'Yellow Square',
        color: '#ffea00',
        glow: 'rgba(255, 234, 0, 0.7)',
        shape: [
            [1, 1],
            [1, 1]
        ]
    },
    S: {
        id: 'S',
        name: 'Green S',
        color: '#00ff66',
        glow: 'rgba(0, 255, 102, 0.7)',
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ]
    },
    T: {
        id: 'T',
        name: 'Purple T',
        color: '#b000ff',
        glow: 'rgba(176, 0, 255, 0.7)',
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ]
    },
    Z: {
        id: 'Z',
        name: 'Red Z',
        color: '#ff0055',
        glow: 'rgba(255, 0, 85, 0.7)',
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ]
    }
};

// SRS Kick Tables (Standard Tetris Guideline)
// 0: Initial, 1: Right (90 deg), 2: 180 deg, 3: Left (270 deg)
const WALL_KICKS_NORMAL = {
    '0->1': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    '1->0': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
    '1->2': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
    '2->1': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    '2->3': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
    '3->2': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    '3->0': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    '0->3': [[0,0], [1,0], [1,1], [0,-2], [1,-2]]
};

const WALL_KICKS_I = {
    '0->1': [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
    '1->0': [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
    '1->2': [[0,0], [-1,0], [2,0], [-1,2], [2,-1]],
    '2->1': [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
    '2->3': [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
    '3->2': [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
    '3->0': [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
    '0->3': [[0,0], [-1,0], [2,0], [-1,2], [2,-1]]
};

class TetrisGame {
    constructor(cols = 10, rows = 20) {
        this.cols = cols;
        this.rows = rows;
        this.hiddenRows = 2; // Buffer above visible grid
        this.totalRows = this.rows + this.hiddenRows;

        this.grid = this.createGrid();
        this.bag = [];
        this.nextQueue = [];
        this.currentPiece = null;
        this.holdPiece = null;
        this.canHold = true;

        this.score = 0;
        this.highScore = this.loadHighScore();
        this.lines = 0;
        this.level = 1;
        this.combo = -1;
        this.backToBack = false;

        this.isGameOver = false;
        this.isPaused = false;
        this.isLocked = false;
        this.unlimitedHold = true; // Allow flexible piece swapping

        // Statistics
        this.stats = { I: 0, J: 0, L: 0, O: 0, S: 0, T: 0, Z: 0 };
    }

    createGrid() {
        return Array.from({ length: this.totalRows }, () => Array(this.cols).fill(0));
    }

    reset() {
        this.grid = this.createGrid();
        this.bag = [];
        this.nextQueue = [];
        this.currentPiece = null;
        this.holdPiece = null;
        this.canHold = true;

        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.combo = -1;
        this.backToBack = false;
        this.isGameOver = false;
        this.isPaused = false;
        this.isLocked = false;
        this.stats = { I: 0, J: 0, L: 0, O: 0, S: 0, T: 0, Z: 0 };

        this.fillNextQueue();
        this.spawnPiece();
    }

    loadHighScore() {
        try {
            return parseInt(localStorage.getItem('tetris_high_score') || '0', 10);
        } catch (e) {
            return 0;
        }
    }

    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try {
                localStorage.setItem('tetris_high_score', this.highScore.toString());
            } catch (e) {}
            return true;
        }
        return false;
    }

    // 7-Bag Randomizer
    refillBag() {
        const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
        // Fisher-Yates shuffle
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }
        this.bag.push(...types);
    }

    getNextPieceType() {
        if (this.bag.length <= 7) {
            this.refillBag();
        }
        return this.bag.shift();
    }

    fillNextQueue() {
        while (this.nextQueue.length < 4) {
            this.nextQueue.push(this.getNextPieceType());
        }
    }

    createPieceInstance(type, customX = null, customY = null) {
        const data = TETROMINOES[type];
        return {
            type: type,
            shape: data.shape.map(row => [...row]),
            color: data.color,
            glow: data.glow,
            rotation: 0, // 0, 1, 2, 3
            x: customX !== null ? customX : Math.floor((this.cols - data.shape[0].length) / 2),
            y: customY !== null ? customY : this.hiddenRows - 1
        };
    }

    spawnPiece() {
        this.fillNextQueue();
        const nextType = this.nextQueue.shift();
        this.currentPiece = this.createPieceInstance(nextType);
        this.stats[nextType]++;
        this.canHold = true;

        // Check if spawn collision (Game Over)
        if (this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y)) {
            this.isGameOver = true;
            this.saveHighScore();
            return false;
        }
        return true;
    }

    hold() {
        if (this.isGameOver || this.isPaused || !this.currentPiece) return false;
        if (!this.unlimitedHold && !this.canHold) return false;

        const currentType = this.currentPiece.type;
        const currentX = this.currentPiece.x;
        const currentY = this.currentPiece.y;

        let newPieceType;
        if (this.holdPiece === null) {
            this.holdPiece = currentType;
            this.fillNextQueue();
            newPieceType = this.nextQueue.shift();
            this.stats[newPieceType]++;
        } else {
            newPieceType = this.holdPiece;
            this.holdPiece = currentType;
        }

        // Spawn new piece preserving current X and Y coordinates
        const newPiece = this.createPieceInstance(newPieceType, currentX, currentY);

        // Adjust boundaries so piece fits horizontally
        const shapeWidth = newPiece.shape[0].length;
        if (newPiece.x + shapeWidth > this.cols) {
            newPiece.x = this.cols - shapeWidth;
        }
        if (newPiece.x < 0) {
            newPiece.x = 0;
        }

        // If colliding with floor or blocks below at current Y, nudge up smoothly
        while (newPiece.y > 0 && this.checkCollision(newPiece.shape, newPiece.x, newPiece.y)) {
            newPiece.y--;
        }

        // If still colliding at top, fallback check
        if (this.checkCollision(newPiece.shape, newPiece.x, newPiece.y)) {
            newPiece.x = Math.floor((this.cols - shapeWidth) / 2);
            newPiece.y = this.hiddenRows - 1;
            if (this.checkCollision(newPiece.shape, newPiece.x, newPiece.y)) {
                this.isGameOver = true;
                this.saveHighScore();
                return false;
            }
        }

        this.currentPiece = newPiece;
        this.canHold = false;
        return true;
    }

    checkCollision(shape, posX, posY) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] !== 0) {
                    const boardX = posX + c;
                    const boardY = posY + r;

                    // Bounds check
                    if (boardX < 0 || boardX >= this.cols || boardY >= this.totalRows) {
                        return true;
                    }

                    // Existing block check (ignore top buffer zone beyond grid)
                    if (boardY >= 0 && this.grid[boardY][boardX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    moveLeft() {
        if (!this.currentPiece || this.isGameOver || this.isPaused) return false;
        if (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x - 1, this.currentPiece.y)) {
            this.currentPiece.x--;
            return true;
        }
        return false;
    }

    moveRight() {
        if (!this.currentPiece || this.isGameOver || this.isPaused) return false;
        if (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x + 1, this.currentPiece.y)) {
            this.currentPiece.x++;
            return true;
        }
        return false;
    }

    softDrop() {
        if (!this.currentPiece || this.isGameOver || this.isPaused) return false;
        if (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.currentPiece.y++;
            this.score += 1; // Soft drop bonus
            return true;
        }
        return false;
    }

    hardDrop() {
        if (!this.currentPiece || this.isGameOver || this.isPaused) return 0;
        let dropDistance = 0;
        while (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.currentPiece.y++;
            dropDistance++;
        }
        this.score += dropDistance * 2; // Hard drop bonus
        return dropDistance;
    }

    rotateMatrix(matrix, dir = 1) {
        const N = matrix.length;
        const result = Array.from({ length: N }, () => Array(N).fill(0));
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                if (dir === 1) {
                    // Clockwise
                    result[c][N - 1 - r] = matrix[r][c];
                } else {
                    // Counter-clockwise
                    result[N - 1 - c][r] = matrix[r][c];
                }
            }
        }
        return result;
    }

    rotate(dir = 1) {
        if (!this.currentPiece || this.isGameOver || this.isPaused) return false;
        if (this.currentPiece.type === 'O') return true; // O doesn't rotate

        const fromRot = this.currentPiece.rotation;
        const toRot = (fromRot + (dir === 1 ? 1 : 3)) % 4;
        const rotatedShape = this.rotateMatrix(this.currentPiece.shape, dir);

        const kickKey = `${fromRot}->${toRot}`;
        const kickTable = this.currentPiece.type === 'I' ? WALL_KICKS_I : WALL_KICKS_NORMAL;
        const kicks = kickTable[kickKey] || [[0, 0]];

        for (const [kx, ky] of kicks) {
            // SRS coordinate inversion for Y (kicks use mathematical +Y = UP, canvas uses +Y = DOWN)
            const targetX = this.currentPiece.x + kx;
            const targetY = this.currentPiece.y - ky;

            if (!this.checkCollision(rotatedShape, targetX, targetY)) {
                this.currentPiece.shape = rotatedShape;
                this.currentPiece.x = targetX;
                this.currentPiece.y = targetY;
                this.currentPiece.rotation = toRot;
                return true;
            }
        }
        return false;
    }

    getGhostY() {
        if (!this.currentPiece) return 0;
        let ghostY = this.currentPiece.y;
        while (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x, ghostY + 1)) {
            ghostY++;
        }
        return ghostY;
    }

    lockPiece() {
        if (!this.currentPiece) return [];
        const shape = this.currentPiece.shape;
        const color = this.currentPiece.color;
        const glow = this.currentPiece.glow;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] !== 0) {
                    const boardX = this.currentPiece.x + c;
                    const boardY = this.currentPiece.y + r;
                    if (boardY >= 0 && boardY < this.totalRows && boardX >= 0 && boardX < this.cols) {
                        this.grid[boardY][boardX] = { color, glow };
                    }
                }
            }
        }

        // Clear completed lines
        return this.clearLines();
    }

    clearLines() {
        const clearedRowIndices = [];

        for (let r = this.totalRows - 1; r >= 0; r--) {
            const isFull = this.grid[r].every(cell => cell !== 0);
            if (isFull) {
                clearedRowIndices.push(r);
            }
        }

        const linesCleared = clearedRowIndices.length;
        if (linesCleared > 0) {
            // Rebuild grid cleanly by filtering out full rows and prepending new blank rows
            const remainingRows = this.grid.filter(row => !row.every(cell => cell !== 0));
            while (remainingRows.length < this.totalRows) {
                remainingRows.unshift(Array(this.cols).fill(0));
            }
            this.grid = remainingRows;

            this.lines += linesCleared;
            this.combo++;

            // Scoring (Tetris Guideline Standard)
            let baseScore = 0;
            let isTetris = false;

            switch (linesCleared) {
                case 1: baseScore = 100 * this.level; this.backToBack = false; break;
                case 2: baseScore = 300 * this.level; this.backToBack = false; break;
                case 3: baseScore = 500 * this.level; this.backToBack = false; break;
                case 4:
                    baseScore = 800 * this.level;
                    if (this.backToBack) {
                        baseScore = Math.floor(baseScore * 1.5); // Back-to-Back Tetris 1.5x
                    }
                    this.backToBack = true;
                    isTetris = true;
                    break;
            }

            // Combo bonus
            if (this.combo > 0) {
                baseScore += 50 * this.combo * this.level;
            }

            this.score += baseScore;

            // Level progression: 10 lines per level
            const newLevel = Math.floor(this.lines / 10) + 1;
            const leveledUp = newLevel > this.level;
            this.level = newLevel;

            this.saveHighScore();

            return {
                count: linesCleared,
                rows: clearedRowIndices,
                isTetris,
                combo: this.combo,
                leveledUp,
                scoreAdded: baseScore
            };
        } else {
            this.combo = -1; // Reset combo if no line cleared
            return { count: 0, rows: [], isTetris: false, combo: -1, leveledUp: false, scoreAdded: 0 };
        }
    }

    getDropInterval() {
        // Drop delay in ms based on standard Guideline speed curve
        // Level 1: 800ms, Level 15+: ~50ms
        const framesPerGrid = Math.max(1, Math.pow(0.8 - ((this.level - 1) * 0.007), this.level - 1) * 60);
        return Math.max(50, Math.floor(framesPerGrid * (1000 / 60)));
    }
}

window.TetrisGame = TetrisGame;
window.TETROMINOES = TETROMINOES;
