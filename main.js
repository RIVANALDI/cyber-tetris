/**
 * Main Controller & Canvas 2D Renderer for Modern Tetris
 * Manages game loop, particle animations, input with DAS/ARR, audio, and UI modals.
 */

// Configuration & Globals
const BLOCK_SIZE = 28; // Pixels per block cell on desktop
const COLS = 10;
const ROWS = 20;

class TetrisApp {
    constructor() {
        this.game = new TetrisGame(COLS, ROWS);
        this.audio = window.tetrisAudio;

        // Canvases & Contexts (Desktop panels)
        this.canvas = document.getElementById('tetrisCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.holdCanvas = document.getElementById('holdCanvas');
        this.holdCtx = this.holdCanvas.getContext('2d');
        this.nextCanvas1 = document.getElementById('nextCanvas1');
        this.nextCtx1 = this.nextCanvas1.getContext('2d');
        this.nextCanvas2 = document.getElementById('nextCanvas2');
        this.nextCtx2 = this.nextCanvas2.getContext('2d');
        this.nextCanvas3 = document.getElementById('nextCanvas3');
        this.nextCtx3 = this.nextCanvas3.getContext('2d');

        // Mobile HUD Canvases
        this.hudHoldCanvas = document.getElementById('hudHoldCanvas');
        this.hudHoldCtx = this.hudHoldCanvas ? this.hudHoldCanvas.getContext('2d') : null;
        this.hudNextCanvas = document.getElementById('hudNextCanvas');
        this.hudNextCtx = this.hudNextCanvas ? this.hudNextCanvas.getContext('2d') : null;
        this.isMobile = window.matchMedia('(max-width: 768px)').matches;

        // Particle System
        this.particles = [];

        // Game Loop Timers
        this.lastTime = 0;
        this.dropCounter = 0;
        this.isLoopRunning = false;

        // Settings
        this.showGhost = true;
        this.enableShake = true;
        this.bgmEnabled = true;

        // Input DAS (Delayed Auto Shift) State
        this.keys = {};
        this.dasTimers = {};
        this.arrTimers = {};

        // Countdown State
        this.isCountingDown = false;
        this.countdownTimer = null;
        this.countdownOverlay = document.getElementById('countdownOverlay');
        this.countdownText = document.getElementById('countdownText');

        // Adjust canvas resolution
        this.initCanvasSize();

        // Bind events & UI
        this.initEventListeners();
        this.loadSettings();
        this.updateUI();

        // Show Start Screen initially
        this.showModal('startModal');
    }

    initCanvasSize() {
        this.canvas.width = COLS * BLOCK_SIZE;
        this.canvas.height = ROWS * BLOCK_SIZE;

        [this.holdCanvas, this.nextCanvas1, this.nextCanvas2, this.nextCanvas3].forEach(c => {
            if (c) {
                c.width = 4 * 20;
                c.height = 4 * 20;
            }
        });

        // Init mobile HUD canvases (40x40 display px)
        if (this.hudHoldCanvas) { this.hudHoldCanvas.width = 80; this.hudHoldCanvas.height = 80; }
        if (this.hudNextCanvas) { this.hudNextCanvas.width = 80; this.hudNextCanvas.height = 80; }
    }

    loadSettings() {
        try {
            const savedGhost = localStorage.getItem('tetris_ghost');
            if (savedGhost !== null) this.showGhost = savedGhost === 'true';
            const savedShake = localStorage.getItem('tetris_shake');
            if (savedShake !== null) this.enableShake = savedShake === 'true';
            const savedTheme = localStorage.getItem('tetris_theme') || 'cyberpunk';
            document.body.setAttribute('data-theme', savedTheme);
            const themeSelect = document.getElementById('themeSelect');
            if (themeSelect) themeSelect.value = savedTheme;

            const ghostToggle = document.getElementById('ghostToggle');
            if (ghostToggle) ghostToggle.checked = this.showGhost;
            const shakeToggle = document.getElementById('shakeToggle');
            if (shakeToggle) shakeToggle.checked = this.enableShake;

            const savedUnlimitedHold = localStorage.getItem('tetris_unlimited_hold');
            if (savedUnlimitedHold !== null) this.game.unlimitedHold = savedUnlimitedHold === 'true';
            const unlimitedHoldToggle = document.getElementById('unlimitedHoldToggle');
            if (unlimitedHoldToggle) unlimitedHoldToggle.checked = this.game.unlimitedHold;
        } catch (e) {}
    }

    triggerHold() {
        if (this.game.isPaused || this.game.isGameOver || this.isCountingDown) return;
        if (this.game.hold()) {
            this.dropCounter = 0; // Reset drop counter for fair response
            this.audio.playHold();
            const holdCard = document.getElementById('holdCard');
            if (holdCard) {
                holdCard.classList.remove('pulse');
                void holdCard.offsetWidth; // Force reflow
                holdCard.classList.add('pulse');
            }
            this.updateUI();
            this.render();
        }
    }

    startCountdown(onComplete) {
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
            this.countdownTimer = null;
        }

        this.isCountingDown = true;
        if (this.countdownOverlay) this.countdownOverlay.classList.add('active');

        const steps = ['3', '2', '1', 'GO!'];
        let stepIdx = 0;

        const runStep = () => {
            if (stepIdx >= steps.length) {
                if (this.countdownOverlay) this.countdownOverlay.classList.remove('active');
                if (this.countdownText) {
                    this.countdownText.className = 'countdown-text';
                }
                this.isCountingDown = false;
                if (onComplete) onComplete();
                return;
            }

            const current = steps[stepIdx];
            if (this.countdownText) {
                this.countdownText.textContent = current;
                this.countdownText.className = 'countdown-text'; // Reset classes
                void this.countdownText.offsetWidth; // Force reflow

                if (current === 'GO!') {
                    this.countdownText.classList.add('pop', 'go');
                    this.audio.playCountdownBeep(true);
                    stepIdx++;
                    this.countdownTimer = setTimeout(runStep, 550);
                } else {
                    this.countdownText.classList.add('pop');
                    this.audio.playCountdownBeep(false);
                    stepIdx++;
                    this.countdownTimer = setTimeout(runStep, 750);
                }
            }
        };

        runStep();
    }

    startNewGame() {
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
            this.countdownTimer = null;
        }
        this.game.reset();
        this.particles = [];
        this.dropCounter = 0;
        this.isLoopRunning = true;
        this.game.isPaused = true; // Wait during countdown

        this.hideModals();
        this.updateUI();
        this.render();

        // Show gesture hint on first play (mobile only)
        this.showGestureHint();

        this.startCountdown(() => {
            this.game.isPaused = false;
            this.lastTime = performance.now();
            if (this.bgmEnabled) {
                this.audio.startBGM();
            }
            requestAnimationFrame(this.gameLoop.bind(this));
        });
    }

    pauseGame(showModalName = 'pauseModal') {
        if (this.game.isGameOver) return;
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
            this.countdownTimer = null;
            this.isCountingDown = false;
            if (this.countdownOverlay) this.countdownOverlay.classList.remove('active');
        }
        this.game.isPaused = true;
        this.audio.stopBGM();
        if (showModalName) {
            this.showModal(showModalName);
        }
    }

    resumeGame() {
        if (this.game.isGameOver) return;
        this.hideModals();
        this.render();

        this.startCountdown(() => {
            this.game.isPaused = false;
            this.lastTime = performance.now();
            if (this.bgmEnabled) this.audio.startBGM();
        });
    }

    togglePause() {
        if (this.game.isGameOver) return;
        if (this.game.isPaused || this.isCountingDown) {
            this.resumeGame();
        } else {
            this.pauseGame('pauseModal');
        }
    }

    gameLoop(time = 0) {
        if (!this.isLoopRunning) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        if (!this.game.isPaused && !this.game.isGameOver) {
            this.dropCounter += deltaTime;
            const interval = this.game.getDropInterval();

            if (this.dropCounter > interval) {
                this.dropCounter = 0;
                if (!this.game.softDrop()) {
                    // Lock piece
                    this.handlePieceLock();
                }
            }
        }

        // Update particles
        this.updateParticles(deltaTime);

        // Render Frame
        this.render();

        if (this.game.isGameOver) {
            this.isLoopRunning = false;
            this.audio.stopBGM();
            this.audio.playGameOver();
            this.showGameOverModal();
            return;
        }

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    handlePieceLock() {
        const clearResult = this.game.lockPiece();
        
        if (clearResult.count > 0) {
            // Screen shake
            if (this.enableShake) {
                this.triggerShake(clearResult.isTetris ? 12 : 5);
            }

            // Spawn glowing explosion particles
            this.spawnClearParticles(clearResult.rows);

            // Play sound
            this.audio.playLineClear(clearResult.count);

            // Floating banner
            if (clearResult.isTetris) {
                this.showFloatingAlert('TETRIS! +1200');
            } else if (clearResult.combo > 1) {
                this.showFloatingAlert(`COMBO x${clearResult.combo}!`);
            }

            if (clearResult.leveledUp) {
                this.audio.playLevelUp();
                setTimeout(() => this.showFloatingAlert(`LEVEL ${this.game.level}!`), 600);
            }
        } else {
            this.audio.playSoftDrop();
        }

        this.game.spawnPiece();
        this.updateUI();
    }

    // --- Particle System ---

    spawnClearParticles(rows) {
        rows.forEach(r => {
            const boardY = (r - this.game.hiddenRows) * BLOCK_SIZE + BLOCK_SIZE / 2;
            for (let c = 0; c < COLS; c++) {
                const boardX = c * BLOCK_SIZE + BLOCK_SIZE / 2;
                for (let i = 0; i < 6; i++) {
                    this.particles.push({
                        x: boardX + (Math.random() - 0.5) * BLOCK_SIZE,
                        y: boardY + (Math.random() - 0.5) * BLOCK_SIZE,
                        vx: (Math.random() - 0.5) * 8,
                        vy: (Math.random() - 1.2) * 6,
                        size: Math.random() * 4 + 2,
                        color: ['#00f0ff', '#ff007f', '#ffea00', '#00ff66', '#ffffff'][Math.floor(Math.random() * 5)],
                        alpha: 1,
                        decay: Math.random() * 0.02 + 0.015
                    });
                }
            }
        });
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15; // Gravity
            p.alpha -= p.decay;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    // --- Rendering Engine ---

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Board Background Grid Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let c = 0; c <= COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * BLOCK_SIZE, 0);
            ctx.lineTo(c * BLOCK_SIZE, this.canvas.height);
            ctx.stroke();
        }
        for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * BLOCK_SIZE);
            ctx.lineTo(this.canvas.width, r * BLOCK_SIZE);
            ctx.stroke();
        }

        // Draw Locked Blocks on Matrix
        for (let r = this.game.hiddenRows; r < this.game.totalRows; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = this.game.grid[r][c];
                if (cell !== 0) {
                    const drawY = (r - this.game.hiddenRows) * BLOCK_SIZE;
                    const drawX = c * BLOCK_SIZE;
                    this.drawBlock(ctx, drawX, drawY, cell.color, cell.glow);
                }
            }
        }

        // Draw Ghost Piece Projection
        if (this.showGhost && this.game.currentPiece) {
            const ghostY = this.game.getGhostY();
            const shape = this.game.currentPiece.shape;
            const pieceX = this.game.currentPiece.x;

            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c] !== 0) {
                        const boardY = ghostY + r;
                        if (boardY >= this.game.hiddenRows) {
                            const drawX = (pieceX + c) * BLOCK_SIZE;
                            const drawY = (boardY - this.game.hiddenRows) * BLOCK_SIZE;
                            this.drawGhostBlock(ctx, drawX, drawY, this.game.currentPiece.color);
                        }
                    }
                }
            }
        }

        // Draw Current Active Piece
        if (this.game.currentPiece) {
            const shape = this.game.currentPiece.shape;
            const pieceX = this.game.currentPiece.x;
            const pieceY = this.game.currentPiece.y;
            const color = this.game.currentPiece.color;
            const glow = this.game.currentPiece.glow;

            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c] !== 0) {
                        const boardY = pieceY + r;
                        if (boardY >= this.game.hiddenRows) {
                            const drawX = (pieceX + c) * BLOCK_SIZE;
                            const drawY = (boardY - this.game.hiddenRows) * BLOCK_SIZE;
                            this.drawBlock(ctx, drawX, drawY, color, glow);
                        }
                    }
                }
            }
        }

        // Draw Glowing Particles
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Render Mini Preview Panels
        this.renderMiniPreviews();
    }

    drawBlock(ctx, x, y, color, glow) {
        const padding = 1.5;
        const size = BLOCK_SIZE - padding * 2;
        const radius = 4;

        ctx.save();
        ctx.shadowColor = glow || color;
        ctx.shadowBlur = 8;

        // Base rounded rect
        ctx.fillStyle = color;
        this.roundRect(ctx, x + padding, y + padding, size, size, radius);
        ctx.fill();

        // Inner Bevel Highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        this.roundRect(ctx, x + padding + 2, y + padding + 2, size - 4, (size - 4) / 3, 2);
        ctx.fill();

        // Outer crisp border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        this.roundRect(ctx, x + padding, y + padding, size, size, radius);
        ctx.stroke();

        ctx.restore();
    }

    drawGhostBlock(ctx, x, y, color) {
        const padding = 2;
        const size = BLOCK_SIZE - padding * 2;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        this.roundRect(ctx, x + padding, y + padding, size, size, 4);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.12;
        this.roundRect(ctx, x + padding, y + padding, size, size, 4);
        ctx.fill();
        ctx.restore();
    }

    roundRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    renderMiniPiece(ctx, type, canvasWidth, canvasHeight) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        if (!type) return;

        const data = TETROMINOES[type];
        const shape = data.shape;
        const miniSize = 16;
        const startX = (canvasWidth - shape[0].length * miniSize) / 2;
        const startY = (canvasHeight - shape.length * miniSize) / 2;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] !== 0) {
                    const x = startX + c * miniSize;
                    const y = startY + r * miniSize;
                    ctx.save();
                    ctx.fillStyle = data.color;
                    ctx.shadowColor = data.glow;
                    ctx.shadowBlur = 6;
                    this.roundRect(ctx, x + 1, y + 1, miniSize - 2, miniSize - 2, 3);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }
    }

    renderMiniPreviews() {
        // Hold
        this.renderMiniPiece(this.holdCtx, this.game.holdPiece, this.holdCanvas.width, this.holdCanvas.height);

        // Next 3 Pieces
        const nexts = this.game.nextQueue;
        if (nexts[0]) this.renderMiniPiece(this.nextCtx1, nexts[0], this.nextCanvas1.width, this.nextCanvas1.height);
        if (nexts[1]) this.renderMiniPiece(this.nextCtx2, nexts[1], this.nextCanvas2.width, this.nextCanvas2.height);
        if (nexts[2]) this.renderMiniPiece(this.nextCtx3, nexts[2], this.nextCanvas3.width, this.nextCanvas3.height);
    }

    // --- UI Helpers ---

    updateUI() {
        // Desktop panel updates
        document.getElementById('scoreDisplay').textContent = this.game.score.toLocaleString();
        document.getElementById('highScoreDisplay').textContent = this.game.highScore.toLocaleString();
        document.getElementById('levelDisplay').textContent = this.game.level;
        document.getElementById('linesDisplay').textContent = this.game.lines;

        // Mobile HUD updates
        const hudScore = document.getElementById('hudScore');
        const hudBest = document.getElementById('hudBest');
        const hudLevel = document.getElementById('hudLevel');
        const hudLines = document.getElementById('hudLines');
        if (hudScore) hudScore.textContent = this.game.score.toLocaleString();
        if (hudBest) hudBest.textContent = this.game.highScore.toLocaleString();
        if (hudLevel) hudLevel.textContent = this.game.level;
        if (hudLines) hudLines.textContent = this.game.lines;

        // Draw mobile HUD hold canvas
        if (this.hudHoldCtx && this.hudHoldCanvas) {
            this.hudHoldCtx.clearRect(0, 0, this.hudHoldCanvas.width, this.hudHoldCanvas.height);
            if (this.game.holdPiece) {
                this.renderMiniPiece(this.hudHoldCtx, this.game.holdPiece, this.hudHoldCanvas.width, this.hudHoldCanvas.height);
            }
        }

        // Draw mobile HUD next canvas
        if (this.hudNextCtx && this.hudNextCanvas) {
            this.hudNextCtx.clearRect(0, 0, this.hudNextCanvas.width, this.hudNextCanvas.height);
            if (this.game.nextQueue && this.game.nextQueue.length > 0) {
                this.renderMiniPiece(this.hudNextCtx, this.game.nextQueue[0], this.hudNextCanvas.width, this.hudNextCanvas.height);
            }
        }
    }

    triggerShake(intensity = 6) {
        const board = document.querySelector('.board-container');
        board.classList.remove('shake');
        void board.offsetWidth; // Force reflow
        board.classList.add('shake');
    }

    showFloatingAlert(text) {
        const alertEl = document.getElementById('floatingAlert');
        alertEl.textContent = text;
        alertEl.classList.add('active');
        setTimeout(() => alertEl.classList.remove('active'), 1200);
    }

    showModal(modalId) {
        this.hideModals();
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    hideModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    }

    showGameOverModal() {
        document.getElementById('finalScore').textContent = this.game.score.toLocaleString();
        document.getElementById('finalLines').textContent = this.game.lines;
        document.getElementById('finalLevel').textContent = this.game.level;
        this.showModal('gameOverModal');
    }

    // --- Input Handling ---

    initEventListeners() {
        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault(); // Prevent page scroll
            }

            if (this.game.isGameOver) {
                if (e.key === ' ' || e.key === 'Enter') this.startNewGame();
                return;
            }

            if (this.isCountingDown) return; // Ignore movement during countdown

            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                this.togglePause();
                return;
            }

            if (this.game.isPaused) return;

            switch (e.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (this.game.moveLeft()) this.audio.playMove();
                    this.updateUI();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (this.game.moveRight()) this.audio.playMove();
                    this.updateUI();
                    break;
                case 'ArrowUp':
                case 'w':
                case 'W':
                case 'x':
                case 'X':
                    if (this.game.rotate(1)) this.audio.playRotate();
                    this.updateUI();
                    break;
                case 'z':
                case 'Z':
                    if (this.game.rotate(-1)) this.audio.playRotate();
                    this.updateUI();
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (this.game.softDrop()) this.audio.playSoftDrop();
                    this.updateUI();
                    break;
                case ' ':
                    this.game.hardDrop();
                    this.audio.playHardDrop();
                    this.handlePieceLock();
                    break;
                case 'c':
                case 'C':
                case 'Shift':
                    this.triggerHold();
                    break;
                case 'r':
                case 'R':
                    this.startNewGame();
                    break;
            }
        });

        // Click directly on HOLD Card Panel to swap (desktop)
        const holdCard = document.getElementById('holdCard');
        if (holdCard) {
            holdCard.addEventListener('click', () => {
                this.triggerHold();
            });
        }

        // Mobile HUD Hold card tap to swap
        const hudHoldCard = document.getElementById('hudHoldCard');
        if (hudHoldCard) {
            hudHoldCard.addEventListener('click', () => {
                this.audio.playButtonClick();
                this.triggerHold();
            });
            hudHoldCard.addEventListener('touchstart', (e) => {
                e.stopPropagation(); // Don't pass to canvas
            }, { passive: true });
        }

        // Touch / Mobile D-Pad & Actions
        this.bindTouchButton('btnTouchLeft', () => {
            if (this.game.moveLeft()) this.audio.playMove();
            this.updateUI();
        });
        this.bindTouchButton('btnTouchRight', () => {
            if (this.game.moveRight()) this.audio.playMove();
            this.updateUI();
        });
        this.bindTouchButton('btnTouchDown', () => {
            if (this.game.softDrop()) this.audio.playSoftDrop();
            this.updateUI();
        });
        this.bindTouchButton('btnTouchHardDrop', () => {
            this.game.hardDrop();
            this.audio.playHardDrop();
            this.handlePieceLock();
        });
        // D-Pad up button also rotates CW (same as ArrowUp)
        this.bindTouchButton('btnTouchUp', () => {
            if (this.game.rotate(1)) this.audio.playRotate();
            this.updateUI();
        });
        this.bindTouchButton('btnTouchRotateCW', () => {
            if (this.game.rotate(1)) this.audio.playRotate();
            this.updateUI();
        });
        this.bindTouchButton('btnTouchRotateCCW', () => {
            if (this.game.rotate(-1)) this.audio.playRotate();
            this.updateUI();
        });
        this.bindTouchButton('btnTouchHold', () => {
            this.triggerHold();
        });

        // Top Navigation Buttons
        document.getElementById('btnPause').addEventListener('click', () => {
            this.audio.playButtonClick();
            this.togglePause();
        });
        document.getElementById('btnSettings').addEventListener('click', () => {
            this.audio.playButtonClick();
            if (this.isLoopRunning && !this.game.isGameOver) {
                this.pauseGame('settingsModal');
            } else {
                this.showModal('settingsModal');
            }
        });
        document.getElementById('btnHelp').addEventListener('click', () => {
            this.audio.playButtonClick();
            if (this.isLoopRunning && !this.game.isGameOver) {
                this.pauseGame('helpModal');
            } else {
                this.showModal('helpModal');
            }
        });

        // Modal Action Buttons
        document.getElementById('btnStartGame').addEventListener('click', () => {
            this.audio.playButtonClick();
            this.startNewGame();
        });
        document.getElementById('btnResume').addEventListener('click', () => {
            this.audio.playButtonClick();
            this.resumeGame();
        });
        document.getElementById('btnRestartPause').addEventListener('click', () => {
            this.audio.playButtonClick();
            this.startNewGame();
        });
        document.getElementById('btnRestartGameOver').addEventListener('click', () => {
            this.audio.playButtonClick();
            this.startNewGame();
        });
        document.getElementById('btnCloseSettings').addEventListener('click', () => {
            this.audio.playButtonClick();
            if (this.isLoopRunning && !this.game.isGameOver) {
                this.resumeGame();
            } else {
                this.hideModals();
            }
        });
        document.getElementById('btnCloseHelp').addEventListener('click', () => {
            this.audio.playButtonClick();
            if (this.isLoopRunning && !this.game.isGameOver) {
                this.resumeGame();
            } else {
                this.hideModals();
            }
        });

        // Click outside modal dialog to resume
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay && overlay.id !== 'startModal' && overlay.id !== 'gameOverModal') {
                    this.audio.playButtonClick();
                    if (this.isLoopRunning && !this.game.isGameOver) {
                        this.resumeGame();
                    } else {
                        this.hideModals();
                    }
                }
            });
        });

        // Settings Controls
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                document.body.setAttribute('data-theme', e.target.value);
                try {
                    localStorage.setItem('tetris_theme', e.target.value);
                } catch (err) {}
            });
        }

        const ghostToggle = document.getElementById('ghostToggle');
        if (ghostToggle) {
            ghostToggle.addEventListener('change', (e) => {
                this.showGhost = e.target.checked;
                try {
                    localStorage.setItem('tetris_ghost', this.showGhost);
                } catch (err) {}
            });
        }

        const shakeToggle = document.getElementById('shakeToggle');
        if (shakeToggle) {
            shakeToggle.addEventListener('change', (e) => {
                this.enableShake = e.target.checked;
                try {
                    localStorage.setItem('tetris_shake', this.enableShake);
                } catch (err) {}
            });
        }

        const unlimitedHoldToggle = document.getElementById('unlimitedHoldToggle');
        if (unlimitedHoldToggle) {
            unlimitedHoldToggle.addEventListener('change', (e) => {
                this.game.unlimitedHold = e.target.checked;
                try {
                    localStorage.setItem('tetris_unlimited_hold', this.game.unlimitedHold);
                } catch (err) {}
            });
        }

        const bgmToggle = document.getElementById('bgmToggle');
        if (bgmToggle) {
            bgmToggle.addEventListener('change', (e) => {
                this.bgmEnabled = e.target.checked;
                if (!this.bgmEnabled) {
                    this.audio.stopBGM();
                } else if (this.isLoopRunning && !this.game.isPaused) {
                    this.audio.startBGM();
                }
            });
        }

        const sfxVolume = document.getElementById('sfxVolume');
        if (sfxVolume) {
            sfxVolume.value = this.audio.sfxVolume;
            sfxVolume.addEventListener('input', (e) => {
                this.audio.setSfxVolume(parseFloat(e.target.value));
            });
        }

        const bgmVolume = document.getElementById('bgmVolume');
        if (bgmVolume) {
            bgmVolume.value = this.audio.bgmVolume;
            bgmVolume.addEventListener('input', (e) => {
                this.audio.setBgmVolume(parseFloat(e.target.value));
            });
        }
    }

    triggerHaptic(ms = 15) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                navigator.vibrate(ms);
            } catch (e) {}
        }
    }

    showGestureHint() {
        const hint = document.getElementById('gestureHint');
        if (!hint) return;
        // Only show on mobile
        if (!window.matchMedia('(max-width: 768px)').matches) return;
        // Only show first time
        try { if (localStorage.getItem('tetris_hint_shown')) return; } catch(e){}
        hint.classList.add('show');
        // Auto-dismiss after 3.5s or on tap
        const dismiss = () => {
            hint.classList.remove('show');
            try { localStorage.setItem('tetris_hint_shown', '1'); } catch(e){}
        };
        this._hintTimer = setTimeout(dismiss, 3500);
        hint.addEventListener('click', () => { clearTimeout(this._hintTimer); dismiss(); }, { once: true });
    }

    initTouchGestures() {
        if (!this.canvas) return;

        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let isSwiping = false;
        let lastTapTime = 0;       // For double-tap detection
        let longPressTimer = null;  // For hold-piece long press
        const LONG_PRESS_MS = 450;
        const DBL_TAP_MS   = 280;

        const cancelLongPress = () => {
            if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        };

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                touchStartTime = performance.now();
                isSwiping = false;

                // Start long-press timer for Hold
                longPressTimer = setTimeout(() => {
                    if (!isSwiping && !this.game.isPaused && !this.game.isGameOver && !this.isCountingDown) {
                        this.triggerHold();
                        this.triggerHaptic(40);
                        isSwiping = true; // Prevent tap action after
                    }
                }, LONG_PRESS_MS);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length !== 1 || this.game.isPaused || this.game.isGameOver || this.isCountingDown) {
                cancelLongPress();
                return;
            }
            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            const thresholdX = 22;
            const thresholdY = 24;

            if (Math.abs(deltaX) > thresholdX && Math.abs(deltaX) > Math.abs(deltaY)) {
                cancelLongPress();
                isSwiping = true;
                if (deltaX > 0) {
                    if (this.game.moveRight()) this.audio.playMove();
                } else {
                    if (this.game.moveLeft()) this.audio.playMove();
                }
                this.triggerHaptic(10);
                this.updateUI();
                this.render();
                touchStartX = touch.clientX;
            } else if (deltaY > thresholdY && Math.abs(deltaY) > Math.abs(deltaX)) {
                // Swipe DOWN → soft drop
                cancelLongPress();
                isSwiping = true;
                if (this.game.softDrop()) this.audio.playSoftDrop();
                this.triggerHaptic(8);
                this.updateUI();
                this.render();
                touchStartY = touch.clientY;
            } else if (deltaY < -thresholdY && Math.abs(deltaY) > Math.abs(deltaX)) {
                // Swipe UP → rotate CCW
                cancelLongPress();
                isSwiping = true;
                if (this.game.rotate(-1)) {
                    this.audio.playRotate();
                    this.triggerHaptic(15);
                    this.updateUI();
                    this.render();
                }
                touchStartY = touch.clientY;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            cancelLongPress();
            if (this.game.isPaused || this.game.isGameOver || this.isCountingDown) return;
            const touchDuration = performance.now() - touchStartTime;
            const now = performance.now();

            if (!isSwiping && touchDuration < 250) {
                // Check double-tap → Hard Drop
                if (now - lastTapTime < DBL_TAP_MS) {
                    lastTapTime = 0;
                    this.game.hardDrop();
                    this.audio.playHardDrop();
                    this.triggerHaptic(30);
                    this.handlePieceLock();
                } else {
                    // Single tap → Rotate CW
                    lastTapTime = now;
                    if (this.game.rotate(1)) {
                        this.audio.playRotate();
                        this.triggerHaptic(15);
                        this.updateUI();
                        this.render();
                    }
                }
            }
        }, { passive: false });
    }

    bindTouchButton(id, action) {
        const el = document.getElementById(id);
        if (!el) return;

        let interval = null;
        let timeout = null;

        const start = (e) => {
            e.preventDefault();
            if (this.isCountingDown) return;
            this.triggerHaptic(15);
            action();
            timeout = setTimeout(() => {
                interval = setInterval(() => {
                    if (!this.isCountingDown) {
                        this.triggerHaptic(10);
                        action();
                    }
                }, 75);
            }, 200);
        };

        const stop = (e) => {
            e.preventDefault();
            clearTimeout(timeout);
            clearInterval(interval);
        };

        el.addEventListener('touchstart', start, { passive: false });
        el.addEventListener('touchend', stop, { passive: false });
        el.addEventListener('mousedown', start);
        el.addEventListener('mouseup', stop);
        el.addEventListener('mouseleave', stop);
    }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
    window.app = new TetrisApp();
    if (window.app.initTouchGestures) {
        window.app.initTouchGestures();
    }
});
